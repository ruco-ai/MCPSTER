import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z, ZodSchema } from 'zod'
import type { ToolDefinition } from './types.js'

export function registerTool<T extends ZodSchema>(sdk: McpServer, def: ToolDefinition<T>): void {
  const shape = (def.schema as unknown as z.ZodObject<z.ZodRawShape>).shape

  sdk.registerTool(
    def.name,
    {
      description: def.description,
      inputSchema: shape,
    },
    async (args) => {
      try {
        const result = await def.handler(args as z.infer<T>)
        const text = typeof result === 'string' ? result : JSON.stringify(result)
        return { content: [{ type: 'text', text }] }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        return { content: [{ type: 'text', text: message }], isError: true }
      }
    }
  )
}
