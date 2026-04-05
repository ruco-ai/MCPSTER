import { describe, it, expect } from 'vitest'
import { buildTestServer } from './helpers.js'

describe('definePrompt', () => {
  it('registers a prompt and returns its message', async () => {
    const { client } = await buildTestServer(server => {
      server.definePrompt({
        name: 'greeting',
        description: 'greets',
        handler: async () => 'Hello!',
      })
    })

    const result = await client.getPrompt({ name: 'greeting' })
    expect(result.messages[0].content.text).toBe('Hello!')
  })

  it('works without a description', async () => {
    const { client } = await buildTestServer(server => {
      server.definePrompt({
        name: 'minimal',
        handler: async () => 'minimal response',
      })
    })

    const result = await client.getPrompt({ name: 'minimal' })
    expect(result.messages[0].content.text).toBe('minimal response')
  })
})
