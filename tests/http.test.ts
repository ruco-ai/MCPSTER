import { beforeAll, afterAll, test, expect } from 'vitest'
import { z } from 'zod'
import { createServer } from '../src/server.js'
import type { McpsterServer } from '../src/types.js'

const PORT = 3099
const URL = `http://localhost:${PORT}/mcp`

let server: McpsterServer

function rpc(method: string, params: unknown, id = 1) {
  return fetch(URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json, text/event-stream',
    },
    body: JSON.stringify({ jsonrpc: '2.0', id, method, params }),
  })
}

beforeAll(async () => {
  server = createServer({ name: 'test', version: '0.0.0', transport: 'http', http: { port: PORT, enableJsonResponse: true } })

  server.defineTool({
    name: 'greet',
    description: 'say hello',
    schema: z.object({ name: z.string() }),
    handler: async ({ name }) => `hello ${name}`,
  })

  server.defineTool({
    name: 'boom',
    description: 'always throws',
    schema: z.object({}),
    handler: async () => { throw new Error('tool exploded') },
  })

  server.defineResource({
    uri: 'data://static',
    description: 'static resource',
    resolver: async () => 'static content',
  })

  server.defineResource({
    uri: 'data://{id}',
    description: 'templated resource',
    resolver: async ({ id }) => `content for ${id}`,
  })

  server.defineResource({
    uri: 'data://error',
    description: 'resource that throws',
    resolver: async () => { throw new Error('resource exploded') },
  })

  server.definePrompt({
    name: 'ask',
    description: 'simple prompt',
    handler: async () => 'prompt content',
  })

  server.definePrompt({
    name: 'broken',
    description: 'prompt that throws',
    handler: async () => { throw new Error('prompt exploded') },
  })

  await server.start()
})

afterAll(async () => {
  await server.stop()
})

// --- tool tests ---

test('tool call returns result', async () => {
  const res = await rpc('tools/call', { name: 'greet', arguments: { name: 'world' } })
  expect(res.status).toBe(200)
  const body = await res.json()
  expect(body.result.content[0].text).toBe('hello world')
  expect(body.result.isError).toBeFalsy()
})

test('tool call — throwing handler returns isError response, not a crash', async () => {
  const res = await rpc('tools/call', { name: 'boom', arguments: {} })
  expect(res.status).toBe(200)
  const body = await res.json()
  expect(body.result.isError).toBe(true)
  expect(body.result.content[0].text).toBe('tool exploded')
})

// --- resource tests ---

test('static resource read returns content', async () => {
  const res = await rpc('resources/read', { uri: 'data://static' })
  expect(res.status).toBe(200)
  const body = await res.json()
  expect(body.result.contents[0].text).toBe('static content')
})

test('templated resource read returns content', async () => {
  const res = await rpc('resources/read', { uri: 'data://42' })
  expect(res.status).toBe(200)
  const body = await res.json()
  expect(body.result.contents[0].text).toBe('content for 42')
})

test('resource read — throwing resolver returns well-formed response, not a crash', async () => {
  const res = await rpc('resources/read', { uri: 'data://error' })
  expect(res.status).toBe(200)
  const body = await res.json()
  expect(body.result.contents[0].text).toBe('resource exploded')
})

// --- prompt tests ---

test('prompt get returns messages', async () => {
  const res = await rpc('prompts/get', { name: 'ask', arguments: {} })
  expect(res.status).toBe(200)
  const body = await res.json()
  expect(body.result.messages[0].content.text).toBe('prompt content')
})

test('prompt get — throwing handler returns well-formed response, not a crash', async () => {
  const res = await rpc('prompts/get', { name: 'broken', arguments: {} })
  expect(res.status).toBe(200)
  const body = await res.json()
  expect(body.result.messages[0].content.text).toBe('prompt exploded')
})

// --- transport tests ---

test('unknown path returns 404', async () => {
  const res = await fetch(`http://localhost:${PORT}/unknown`)
  expect(res.status).toBe(404)
})
