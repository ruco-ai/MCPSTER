import type { z, ZodSchema } from 'zod'

export interface ServerConfig {
  name: string
  version: string
  scope?: string // defaults to process.cwd()
}

export interface ToolDefinition<T extends ZodSchema = ZodSchema> {
  name: string
  description: string
  schema: T
  handler: (input: z.infer<T>) => Promise<unknown>
}

export interface ResourceDefinition {
  uri: string // URI template e.g. 'templates://{name}'
  description: string
  resolver: (params: Record<string, string>) => Promise<string>
}

export interface PromptDefinition {
  name: string
  description?: string
  handler: (args: Record<string, string>) => Promise<string>
}

export interface McpsterServer {
  defineTool<T extends ZodSchema>(def: ToolDefinition<T>): McpsterServer
  defineResource(def: ResourceDefinition): McpsterServer
  definePrompt(def: PromptDefinition): McpsterServer
  start(): Promise<void>
}
