import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { ZodSchema } from 'zod'
import { connectStdio } from './transport/stdio.js'
import { registerTool } from './tool.js'
import { registerResource } from './resource.js'
import { registerPrompt } from './prompt.js'
import type { ServerConfig, McpsterServer, ToolDefinition, ResourceDefinition, PromptDefinition } from './types.js'

class McpsterServerImpl implements McpsterServer {
  readonly sdk: McpServer

  constructor(config: ServerConfig) {
    this.sdk = new McpServer({
      name: config.name,
      version: config.version,
    })
  }

  defineTool<T extends ZodSchema>(def: ToolDefinition<T>): McpsterServer {
    registerTool(this.sdk, def)
    return this
  }

  defineResource(def: ResourceDefinition): McpsterServer {
    registerResource(this.sdk, def)
    return this
  }

  definePrompt(def: PromptDefinition): McpsterServer {
    registerPrompt(this.sdk, def)
    return this
  }

  async start(): Promise<void> {
    await connectStdio(this.sdk)
  }
}

export function createServer(config: ServerConfig): McpsterServer {
  return new McpsterServerImpl(config)
}
