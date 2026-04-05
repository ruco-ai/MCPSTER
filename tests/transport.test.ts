import { describe, it, expect, vi, beforeEach } from 'vitest'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'

vi.mock('@modelcontextprotocol/sdk/server/streamableHttp.js', () => {
  class StreamableHTTPServerTransport {
    handleRequest = vi.fn()
  }
  return { StreamableHTTPServerTransport }
})

vi.mock('@modelcontextprotocol/sdk/server/stdio.js', () => {
  class StdioServerTransport {}
  return { StdioServerTransport }
})

let capturedRequestHandler: ((req: unknown, res: unknown) => Promise<void>) | undefined

vi.mock('node:http', () => {
  const fakeServer = {
    listen: vi.fn().mockImplementation((_port: number, cb: () => void) => cb()),
    once: vi.fn().mockImplementation(function (this: unknown, event: string, cb: () => void) {
      if (event !== 'error') cb()
      return this
    }),
    close: vi.fn().mockImplementation((cb: () => void) => cb()),
  }
  return {
    createServer: vi.fn().mockImplementation((handler: (req: unknown, res: unknown) => Promise<void>) => {
      capturedRequestHandler = handler
      return fakeServer
    }),
  }
})

describe('connectHttp', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('listens on default port 3000', async () => {
    const { connectHttp } = await import('../src/transport/http.js')
    const { createServer: nodeCreateServer } = await import('node:http')
    const mockServer = { connect: vi.fn().mockResolvedValue(undefined) }

    await connectHttp(mockServer as unknown as McpServer)

    const fakeServer = (nodeCreateServer as ReturnType<typeof vi.fn>).mock.results[0]?.value
    expect(fakeServer.listen).toHaveBeenCalledWith(3000, expect.any(Function))
  })

  it('connects server to a new transport per request', async () => {
    const { connectHttp } = await import('../src/transport/http.js')
    const { StreamableHTTPServerTransport } = await import('@modelcontextprotocol/sdk/server/streamableHttp.js')
    const mockServer = { connect: vi.fn().mockResolvedValue(undefined) }

    await connectHttp(mockServer as unknown as McpServer)

    // Simulate a request to /mcp
    const fakeReq = { url: '/mcp', on: vi.fn() }
    const fakeRes = { writeHead: vi.fn(), end: vi.fn(), headersSent: false, on: vi.fn() }
    await capturedRequestHandler!(fakeReq, fakeRes)

    expect(mockServer.connect).toHaveBeenCalledOnce()
    expect(mockServer.connect).toHaveBeenCalledWith(expect.any(StreamableHTTPServerTransport))
  })

  it('listens on custom port', async () => {
    const { connectHttp } = await import('../src/transport/http.js')
    const { createServer: nodeCreateServer } = await import('node:http')
    const mockServer = { connect: vi.fn().mockResolvedValue(undefined) }

    await connectHttp(mockServer as unknown as McpServer, { port: 4000, path: '/api/mcp' })

    const fakeServer = (nodeCreateServer as ReturnType<typeof vi.fn>).mock.results[0]?.value
    expect(fakeServer.listen).toHaveBeenCalledWith(4000, expect.any(Function))
  })

  it('returns a stop function that closes the HTTP server', async () => {
    const { connectHttp } = await import('../src/transport/http.js')
    const { createServer: nodeCreateServer } = await import('node:http')
    const mockServer = { connect: vi.fn().mockResolvedValue(undefined) }

    const stop = await connectHttp(mockServer as unknown as McpServer)
    await stop()

    const fakeServer = (nodeCreateServer as ReturnType<typeof vi.fn>).mock.results[0]?.value
    expect(fakeServer.close).toHaveBeenCalledOnce()
  })
})

describe('createServer transport selection', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('start() uses stdio transport by default', async () => {
    const { StdioServerTransport } = await import('@modelcontextprotocol/sdk/server/stdio.js')
    const constructorSpy = vi.spyOn(StdioServerTransport.prototype, 'constructor' as never)
    const { createServer } = await import('../src/server.js')
    const server = createServer({ name: 'test', version: '1.0.0' })
    const sdk: McpServer = (server as unknown as { sdk: McpServer }).sdk
    vi.spyOn(sdk, 'connect').mockResolvedValue(undefined)

    await server.start()

    // StdioServerTransport was instantiated (sdk.connect called with an instance of it)
    const arg = (sdk.connect as ReturnType<typeof vi.fn>).mock.calls[0][0]
    expect(arg).toBeInstanceOf(StdioServerTransport)
  })

  it('start() uses HTTP transport when transport is "http"', async () => {
    const { StreamableHTTPServerTransport } = await import('@modelcontextprotocol/sdk/server/streamableHttp.js')
    const { createServer } = await import('../src/server.js')
    const server = createServer({ name: 'test', version: '1.0.0', transport: 'http', http: { port: 3001 } })
    const sdk: McpServer = (server as unknown as { sdk: McpServer }).sdk
    vi.spyOn(sdk, 'connect').mockResolvedValue(undefined)

    await server.start()

    // connect() is called per request — simulate one to verify the transport type
    const fakeReq = { url: '/mcp', on: vi.fn() }
    const fakeRes = { writeHead: vi.fn(), end: vi.fn(), headersSent: false, on: vi.fn() }
    await capturedRequestHandler!(fakeReq, fakeRes)

    const arg = (sdk.connect as ReturnType<typeof vi.fn>).mock.calls[0][0]
    expect(arg).toBeInstanceOf(StreamableHTTPServerTransport)
  })

  it('stop() closes the HTTP server after start()', async () => {
    const { createServer: nodeCreateServer } = await import('node:http')
    const { createServer } = await import('../src/server.js')
    const server = createServer({ name: 'test', version: '1.0.0', transport: 'http', http: { port: 3002 } })
    const sdk: McpServer = (server as unknown as { sdk: McpServer }).sdk
    vi.spyOn(sdk, 'connect').mockResolvedValue(undefined)

    await server.start()
    await server.stop()

    const fakeServer = (nodeCreateServer as ReturnType<typeof vi.fn>).mock.results[0]?.value
    expect(fakeServer.close).toHaveBeenCalledOnce()
  })
})
