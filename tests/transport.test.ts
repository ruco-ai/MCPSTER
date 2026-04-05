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

vi.mock('node:http', () => {
  const fakeServer = {
    listen: vi.fn().mockImplementation((_port: number, cb: () => void) => cb()),
    once: vi.fn().mockImplementation(function (this: unknown, event: string, cb: () => void) {
      if (event !== 'error') cb()
      return this
    }),
  }
  return { createServer: vi.fn().mockReturnValue(fakeServer) }
})

describe('connectHttp', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('connects to server with default port and path', async () => {
    const { connectHttp } = await import('../src/transport/http.js')
    const { StreamableHTTPServerTransport } = await import('@modelcontextprotocol/sdk/server/streamableHttp.js')
    const mockServer = { connect: vi.fn().mockResolvedValue(undefined) }

    await connectHttp(mockServer as unknown as McpServer)

    expect(mockServer.connect).toHaveBeenCalledOnce()
  })

  it('listens on custom port', async () => {
    const { connectHttp } = await import('../src/transport/http.js')
    const { createServer: nodeCreateServer } = await import('node:http')
    const mockServer = { connect: vi.fn().mockResolvedValue(undefined) }

    await connectHttp(mockServer as unknown as McpServer, { port: 4000, path: '/api/mcp' })

    const fakeServer = (nodeCreateServer as ReturnType<typeof vi.fn>).mock.results[0]?.value
    expect(fakeServer.listen).toHaveBeenCalledWith(4000, expect.any(Function))
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

    const arg = (sdk.connect as ReturnType<typeof vi.fn>).mock.calls[0][0]
    expect(arg).toBeInstanceOf(StreamableHTTPServerTransport)
  })
})
