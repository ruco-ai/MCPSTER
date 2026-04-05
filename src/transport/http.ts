import { createServer } from 'node:http'
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import type { HttpConfig } from '../types.js'

export async function connectHttp(server: McpServer, config?: HttpConfig): Promise<() => Promise<void>> {
  const port = config?.port ?? 3000
  const path = config?.path ?? '/mcp'
  const enableJsonResponse = config?.enableJsonResponse

  // Stateless mode: create a fresh transport per request and reconnect the server.
  // Each transport closes itself after the response, freeing the server for the next request.
  // Note: concurrent requests are not supported in this stateless mode.
  const httpServer = createServer(async (req, res) => {
    if (req.url !== path) {
      res.writeHead(404)
      res.end()
      return
    }
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
      enableJsonResponse,
    })
    try {
      await server.connect(transport)
      await transport.handleRequest(req, res)
      res.on('close', () => transport.close())
    } catch (err) {
      if (!res.headersSent) {
        res.writeHead(500)
        res.end()
      }
      transport.close()
    }
  })

  await new Promise<void>((resolve, reject) => {
    httpServer.once('error', reject)
    httpServer.listen(port, () => resolve())
  })

  return () => new Promise<void>((resolve, reject) => {
    httpServer.close((err) => (err ? reject(err) : resolve()))
  })
}
