import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import type { PromptDefinition } from './types.js'

export function registerPrompt(sdk: McpServer, def: PromptDefinition): void {
  sdk.registerPrompt(
    def.name,
    { description: def.description },
    async (args) => {
      const text = await def.handler(args as Record<string, string>)
      return {
        messages: [{ role: 'user', content: { type: 'text', text } }],
      }
    }
  )
}
