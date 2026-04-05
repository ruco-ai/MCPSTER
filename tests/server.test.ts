import { describe, it, expect } from 'vitest'
import { createServer } from '../src/index.js'
import { z } from 'zod'

describe('createServer', () => {
  it('returns a server with chainable define methods', () => {
    const server = createServer({ name: 'test', version: '1.0.0' })
    const result = server
      .defineTool({
        name: 'noop',
        description: 'no-op',
        schema: z.object({}),
        handler: async () => 'ok',
      })
      .defineResource({
        uri: 'test://static',
        description: 'static',
        resolver: async () => 'value',
      })
      .definePrompt({
        name: 'noop_prompt',
        handler: async () => 'prompt text',
      })
    expect(result).toBe(server)
  })
})
