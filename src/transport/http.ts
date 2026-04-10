import express, { type Request, type Response } from 'express'
import { randomUUID } from 'node:crypto'
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js'
import { mcpAuthRouter } from '@modelcontextprotocol/sdk/server/auth/router.js'
import { requireBearerAuth } from '@modelcontextprotocol/sdk/server/auth/middleware/bearerAuth.js'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import type { HttpConfig } from '../types.js'

// ---------------------------------------------------------------------------
// Client store — in-memory with optional file persistence
//
// When clientsFile is set, the store loads existing clients from disk on
// startup and writes through on every registration. This survives process
// restarts. Pair with a mounted volume on Fly / Railway for full durability.
// ---------------------------------------------------------------------------
interface StoredClient {
  client_id: string
  client_id_issued_at: number
  client_name?: string
  redirect_uris: string[]
  [key: string]: unknown
}

function createClientsStore(clientsFile?: string) {
  const clients = new Map<string, StoredClient>()

  if (clientsFile) {
    try {
      const raw = readFileSync(clientsFile, 'utf8')
      const stored: StoredClient[] = JSON.parse(raw)
      for (const c of stored) clients.set(c.client_id, c)
    } catch {
      // File doesn't exist yet — start empty
    }
  }

  function persist() {
    if (!clientsFile) return
    try {
      mkdirSync(dirname(clientsFile), { recursive: true })
      writeFileSync(clientsFile, JSON.stringify([...clients.values()], null, 2), 'utf8')
    } catch (err) {
      console.error('[mcpster] Failed to persist OAuth clients:', err)
    }
  }

  return {
    getClient: (id: string) => clients.get(id) ?? undefined,
    registerClient: (client: Omit<StoredClient, 'client_id' | 'client_id_issued_at'> & { redirect_uris?: string[] }) => {
      const full: StoredClient = {
        redirect_uris: [],
        ...client,
        client_id: randomUUID(),
        client_id_issued_at: Math.floor(Date.now() / 1000),
      }
      clients.set(full.client_id, full)
      persist()
      return full
    },
  }
}

// ---------------------------------------------------------------------------
// OAuth 2.1 provider (PKCE, dynamic client registration)
// ---------------------------------------------------------------------------
function createOAuthProvider(clientsFile?: string) {
  const clientsStore = createClientsStore(clientsFile)
  const authCodes = new Map<string, { clientId: string; codeChallenge: string; redirectUri: string; scopes: string[] }>()
  const tokens = new Map<string, { token: string; clientId: string; scopes: string[]; expiresAt: number; refreshToken: string }>()
  const refreshTokens = new Map<string, string>()

  const esc = (s: unknown) => String(s ?? '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;')

  return {
    get clientsStore() { return clientsStore },

    async authorize(client: StoredClient, params: { codeChallenge: string; redirectUri: string; scopes?: string[]; state?: string }, res: Response) {
      const code = randomUUID()
      authCodes.set(code, {
        clientId: client.client_id,
        codeChallenge: params.codeChallenge,
        redirectUri: params.redirectUri,
        scopes: params.scopes ?? [],
      })
      res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Authorize — ${esc(client.client_name ?? client.client_id)}</title>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 480px; margin: 80px auto; padding: 0 20px; }
    h2  { margin-bottom: 8px; }
    p   { color: #555; margin-bottom: 24px; }
    button { padding: 10px 20px; border-radius: 6px; font-size: 15px; cursor: pointer; border: 1px solid #ccc; }
    .approve { background: #0070f3; color: #fff; border-color: #0070f3; margin-right: 10px; }
  </style>
</head>
<body>
  <h2>Authorization Request</h2>
  <p><strong>${esc(client.client_name ?? client.client_id)}</strong> is requesting access to this MCP server.</p>
  <form method="POST" action="/approve">
    <input type="hidden" name="code"         value="${esc(code)}">
    <input type="hidden" name="redirect_uri" value="${esc(params.redirectUri)}">
    <input type="hidden" name="state"        value="${esc(params.state ?? '')}">
    <button class="approve" type="submit">Approve</button>
    <button type="button" onclick="history.back()">Deny</button>
  </form>
</body>
</html>`)
    },

    async challengeForAuthorizationCode(client: StoredClient, code: string) {
      const entry = authCodes.get(code)
      if (!entry || entry.clientId !== client.client_id) throw new Error('Invalid authorization code')
      return entry.codeChallenge
    },

    async exchangeAuthorizationCode(client: StoredClient, code: string) {
      const entry = authCodes.get(code)
      if (!entry || entry.clientId !== client.client_id) throw new Error('Invalid authorization code')
      authCodes.delete(code)

      const accessToken = randomUUID()
      const refreshToken = randomUUID()
      const expiresAt = Math.floor(Date.now() / 1000) + 3600

      tokens.set(accessToken, { token: accessToken, clientId: client.client_id, scopes: entry.scopes, expiresAt, refreshToken })
      refreshTokens.set(refreshToken, accessToken)

      return { access_token: accessToken, token_type: 'bearer', expires_in: 3600, refresh_token: refreshToken }
    },

    async exchangeRefreshToken(client: StoredClient, oldRefreshToken: string) {
      const oldAccess = refreshTokens.get(oldRefreshToken)
      if (!oldAccess) throw new Error('Invalid refresh token')
      const old = tokens.get(oldAccess)
      if (!old) throw new Error('Invalid refresh token')

      const accessToken = randomUUID()
      const newRefresh = randomUUID()
      const expiresAt = Math.floor(Date.now() / 1000) + 3600

      tokens.delete(oldAccess)
      refreshTokens.delete(oldRefreshToken)
      tokens.set(accessToken, { token: accessToken, clientId: client.client_id, scopes: old.scopes, expiresAt, refreshToken: newRefresh })
      refreshTokens.set(newRefresh, accessToken)

      return { access_token: accessToken, token_type: 'bearer', expires_in: 3600, refresh_token: newRefresh }
    },

    async verifyAccessToken(token: string) {
      const info = tokens.get(token)
      if (!info) throw new Error('Invalid token')
      if (info.expiresAt < Math.floor(Date.now() / 1000)) throw new Error('Token expired')
      return info
    },
  }
}

// ---------------------------------------------------------------------------
// HTTP transport with OAuth 2.1
// ---------------------------------------------------------------------------
export async function connectHttp(server: McpServer, config?: HttpConfig): Promise<() => Promise<void>> {
  const port = config?.port ?? 3000
  const path = config?.path ?? '/mcp'
  // baseUrl drives OAuth metadata (issuer, token endpoint, etc.).
  // Priority: config.baseUrl → BASE_URL env → http://localhost:<port>
  const envBaseUrl = process.env.BASE_URL
  const rawBaseUrl = config?.baseUrl || (envBaseUrl?.startsWith('http') ? envBaseUrl : undefined) || `http://localhost:${port}`
  const baseUrl = new URL(rawBaseUrl)

  const authEnabled = config?.auth ?? false
  const app = express()
  // Behind a reverse proxy (Fly.io, Railway, etc.) there is exactly one hop.
  app.set('trust proxy', 1)
  app.use(express.json())
  app.use(express.urlencoded({ extended: false }))

  if (authEnabled) {
    if (!config?.clientsFile && !process.env.MCPSTER_CLIENTS_FILE) {
      console.warn(
        '[mcpster] Warning: running HTTP transport without clientsFile — registered OAuth clients ' +
        'are stored in memory only and will be lost on restart. Set http.clientsFile in ' +
        'mcpster.config.json (e.g. "/data/oauth-clients.json") and mount a persistent volume.'
      )
    }

    const provider = createOAuthProvider(config?.clientsFile ?? process.env.MCPSTER_CLIENTS_FILE)

    // OAuth discovery + registration + token endpoints
    app.use(mcpAuthRouter({ provider, issuerUrl: baseUrl }))

    // Approve endpoint — browser page shown during the OAuth flow
    app.post('/approve', (req: Request, res: Response) => {
      const { code, redirect_uri, state } = req.body as Record<string, string>
      if (!code || !redirect_uri) { res.status(400).send('Missing code or redirect_uri'); return }
      const url = new URL(redirect_uri)
      url.searchParams.set('code', code)
      if (state) url.searchParams.set('state', state)
      res.redirect(url.toString())
    })

    // MCP endpoint — protected by bearer token
    app.all(path, requireBearerAuth({ verifier: provider }), async (req: Request, res: Response) => {
      const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: config?.enableJsonResponse })
      try {
        await server.connect(transport)
        await transport.handleRequest(req, res, req.body)
        res.on('close', () => transport.close())
      } catch {
        if (!res.headersSent) res.status(500).end()
        transport.close()
      }
    })
  } else {
    // No auth — MCP endpoint is open
    app.all(path, async (req: Request, res: Response) => {
      const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: config?.enableJsonResponse })
      try {
        await server.connect(transport)
        await transport.handleRequest(req, res, req.body)
        res.on('close', () => transport.close())
      } catch {
        if (!res.headersSent) res.status(500).end()
        transport.close()
      }
    })
  }

  const httpServer = app.listen(port)
  await new Promise<void>((resolve, reject) => {
    httpServer.once('listening', resolve)
    httpServer.once('error', reject)
  })

  return () => new Promise<void>((resolve, reject) => {
    httpServer.close((err?: Error) => (err ? reject(err) : resolve()))
  })
}
