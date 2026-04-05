import { describe, it, expect } from 'vitest'
import { z } from 'zod'
import { buildTestServer } from './helpers.js'

describe('defineTool', () => {
  it('registers a tool that returns a string result', async () => {
    const { client } = await buildTestServer(server => {
      server.defineTool({
        name: 'echo',
        description: 'echoes input',
        schema: z.object({ message: z.string() }),
        handler: async ({ message }) => message,
      })
    })

    const result = await client.callTool({ name: 'echo', arguments: { message: 'hello' } })
    expect(result.content).toEqual([{ type: 'text', text: 'hello' }])
  })

  it('serializes non-string results as JSON', async () => {
    const { client } = await buildTestServer(server => {
      server.defineTool({
        name: 'obj',
        description: 'returns object',
        schema: z.object({}),
        handler: async () => ({ foo: 'bar' }),
      })
    })

    const result = await client.callTool({ name: 'obj', arguments: {} })
    expect((result.content as Array<{ text: string }>)[0].text).toBe('{"foo":"bar"}')
  })

  it('returns isError when handler throws', async () => {
    const { client } = await buildTestServer(server => {
      server.defineTool({
        name: 'fail',
        description: 'always fails',
        schema: z.object({}),
        handler: async () => { throw new Error('boom') },
      })
    })

    const result = await client.callTool({ name: 'fail', arguments: {} })
    expect(result.isError).toBe(true)
    expect((result.content as Array<{ text: string }>)[0].text).toBe('boom')
  })
})
