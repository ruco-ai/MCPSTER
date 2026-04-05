import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js'
import { createServer } from '../src/index.js'

export async function buildTestServer(setup: (server: ReturnType<typeof createServer>) => void) {
  const server = createServer({ name: 'test', version: '0.0.0' })
  setup(server)

  const [serverTransport, clientTransport] = InMemoryTransport.createLinkedPair()
  const sdk: McpServer = (server as unknown as { sdk: McpServer }).sdk
  await sdk.connect(serverTransport)

  const client = new Client({ name: 'test-client', version: '0.0.0' })
  await client.connect(clientTransport)

  return { client }
}
