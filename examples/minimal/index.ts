/**
 * hello-mcp — minimal mcpster reference server
 *
 * Demonstrates all three primitives (tool, resource, prompt) and the full
 * local → hosted migration path introduced in v3.
 *
 * Stage 1 — stdio (default, no infrastructure):
 *   npx ts-node examples/minimal/index.ts
 *   claude mcp add hello-mcp -- npx ts-node examples/minimal/index.ts
 *
 * Stage 2 — HTTP/SSE (set TRANSPORT=http):
 *   TRANSPORT=http npx ts-node examples/minimal/index.ts
 *
 * Stage 3 — hosted (after building: npm run build):
 *   npx mcpster-deploy --target railway --dry-run
 *   npx mcpster-deploy --target fly --dry-run
 *   npx mcpster-deploy --target cloudflare --dry-run
 */

import { createServer } from '../../src/index.js'
import { z } from 'zod'

const useHttp = process.env.TRANSPORT === 'http'
const port = Number(process.env.PORT ?? 3000)

createServer({
  name: 'hello-mcp',
  version: '1.0.0',
  transport: useHttp ? 'http' : 'stdio',
  http: useHttp ? { port, path: '/mcp' } : undefined,
})
  .defineTool({
    name: 'echo',
    description: 'Echoes back the input message',
    schema: z.object({ message: z.string() }),
    handler: async ({ message }) => message,
  })
  .defineResource({
    uri: 'info://status',
    description: 'Server status and transport mode',
    resolver: async () => `ok — transport: ${useHttp ? `http (port ${port})` : 'stdio'}`,
  })
  .definePrompt({
    name: 'greeting',
    description: 'A simple greeting prompt',
    handler: async () => 'Hello from mcpster!',
  })
  .start()
