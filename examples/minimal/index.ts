import { createServer } from '../../src/index.js'
import { z } from 'zod'

const server = createServer({
  name: 'minimal-server',
  version: '1.0.0',
})

server
  .defineTool({
    name: 'echo',
    description: 'Echoes back the input message',
    schema: z.object({ message: z.string() }),
    handler: async ({ message }) => message,
  })
  .defineResource({
    uri: 'info://status',
    description: 'Server status',
    resolver: async () => 'ok',
  })
  .definePrompt({
    name: 'greeting',
    description: 'A simple greeting prompt',
    handler: async () => 'Hello from mcpster!',
  })
  .start()
