import { describe, it, expect } from 'vitest'
import { buildTestServer } from './helpers.js'

describe('defineResource', () => {
  it('registers a static resource', async () => {
    const { client } = await buildTestServer(server => {
      server.defineResource({
        uri: 'info://status',
        description: 'status',
        resolver: async () => 'ok',
      })
    })

    const result = await client.readResource({ uri: 'info://status' })
    expect(result.contents[0].text).toBe('ok')
  })

  it('registers a templated resource and extracts params', async () => {
    const { client } = await buildTestServer(server => {
      server.defineResource({
        uri: 'templates://{name}',
        description: 'template by name',
        resolver: async ({ name }) => `template:${name}`,
      })
    })

    const result = await client.readResource({ uri: 'templates://hello' })
    expect(result.contents[0].text).toBe('template:hello')
  })

  it('extracts multiple URI params', async () => {
    const { client } = await buildTestServer(server => {
      server.defineResource({
        uri: 'insights://{type}/{scope}',
        description: 'insights by type and scope',
        resolver: async ({ type, scope }) => `${type}:${scope}`,
      })
    })

    const result = await client.readResource({ uri: 'insights://bug/project-a' })
    expect(result.contents[0].text).toBe('bug:project-a')
  })
})
