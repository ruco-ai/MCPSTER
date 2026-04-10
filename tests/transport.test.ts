import { describe, it, expect, vi, beforeEach } from 'vitest'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'

vi.mock('@modelcontextprotocol/sdk/server/stdio.js', () => {
  class StdioServerTransport {}
  return { StdioServerTransport }
})

describe('connectHttp', () => {
  it('listens on default port 3000', async () => {
    const { connectHttp } = await import('../src/transport/http.js')
    const mockServer = { connect: vi.fn().mockResolvedValue(undefined) } as unknown as McpServer
    const stop = await connectHttp(mockServer)
    const res = await fetch('http://localhost:3000/mcp', { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'ping', params: {} }) })
    expect(res.status).not.toBe(404)
    await stop()
  })

  it('listens on custom port', async () => {
    const { connectHttp } = await import('../src/transport/http.js')
    const mockServer = { connect: vi.fn().mockResolvedValue(undefined) } as unknown as McpServer
    const stop = await connectHttp(mockServer, { port: 4000, path: '/api/mcp' })
    const res = await fetch('http://localhost:4000/api/mcp', { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'ping', params: {} }) })
    expect(res.status).not.toBe(404)
    await stop()
  })

  it('connects server to a new transport per request', async () => {
    const { connectHttp } = await import('../src/transport/http.js')
    const { StreamableHTTPServerTransport } = await import('@modelcontextprotocol/sdk/server/streamableHttp.js')
    const mockServer = { connect: vi.fn().mockResolvedValue(undefined) } as unknown as McpServer
    const stop = await connectHttp(mockServer, { port: 3010 })
    await fetch('http://localhost:3010/mcp', { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'ping', params: {} }) })
    expect(mockServer.connect).toHaveBeenCalledOnce()
    expect(mockServer.connect).toHaveBeenCalledWith(expect.any(StreamableHTTPServerTransport))
    await stop()
  })

  it('returns a stop function that closes the HTTP server', async () => {
    const { connectHttp } = await import('../src/transport/http.js')
    const mockServer = { connect: vi.fn().mockResolvedValue(undefined) } as unknown as McpServer
    const stop = await connectHttp(mockServer, { port: 3020 })
    await stop()
    // After stop, connections should be refused
    await expect(fetch('http://localhost:3020/mcp')).rejects.toThrow()
  })
})

describe('createServer transport selection', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('start() uses stdio transport by default', async () => {
    const { StdioServerTransport } = await import('@modelcontextprotocol/sdk/server/stdio.js')
    const { createServer } = await import('../src/server.js')
    const server = createServer({ name: 'test', version: '1.0.0' })
    const sdk: McpServer = (server as unknown as { sdk: McpServer }).sdk
    vi.spyOn(sdk, 'connect').mockResolvedValue(undefined)

    await server.start()

    const arg = (sdk.connect as ReturnType<typeof vi.fn>).mock.calls[0][0]
    expect(arg).toBeInstanceOf(StdioServerTransport)
  })

  it('start() uses HTTP transport when transport is "http"', async () => {
    const { StreamableHTTPServerTransport } = await import('@modelcontextprotocol/sdk/server/streamableHttp.js')
    const { createServer } = await import('../src/server.js')
    const server = createServer({ name: 'test', version: '1.0.0', transport: 'http', http: { port: 3030 } })

    await server.start()
    await fetch('http://localhost:3030/mcp', { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'ping', params: {} }) })
    await server.stop()

    const sdk: McpServer = (server as unknown as { sdk: McpServer }).sdk
    const arg = (sdk.connect as ReturnType<typeof vi.fn>)?.mock?.calls[0]?.[0]
    if (arg) expect(arg).toBeInstanceOf(StreamableHTTPServerTransport)
  })

  it('stop() closes the HTTP server after start()', async () => {
    const { createServer } = await import('../src/server.js')
    const server = createServer({ name: 'test', version: '1.0.0', transport: 'http', http: { port: 3040 } })

    await server.start()
    await server.stop()

    await expect(fetch('http://localhost:3040/mcp')).rejects.toThrow()
  })
})
