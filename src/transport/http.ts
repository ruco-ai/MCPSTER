import { createServer } from 'node:http'
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import type { HttpConfig } from '../types.js'

export async function connectHttp(server: McpServer, config?: HttpConfig): Promise<() => Promise<void>> {
  const port = config?.port ?? 3000
  const path = config?.path ?? '/mcp'

  const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined })
  await server.connect(transport)

  const httpServer = createServer(async (req, res) => {
    if (req.url === path) {
      await transport.handleRequest(req, res)
    } else {
      res.writeHead(404)
      res.end()
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
