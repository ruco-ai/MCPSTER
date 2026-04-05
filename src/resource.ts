import { McpServer, ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js'
import type { ResourceDefinition } from './types.js'

function parseUriParams(uri: string): string[] {
  return [...uri.matchAll(/\{(\w+)\}/g)].map(m => m[1])
}

export function registerResource(sdk: McpServer, def: ResourceDefinition): void {
  const params = parseUriParams(def.uri)

  if (params.length === 0) {
    sdk.registerResource(
      def.uri,
      def.uri,
      { description: def.description },
      async () => {
        const text = await def.resolver({})
        return { contents: [{ uri: def.uri, text }] }
      }
    )
  } else {
    const template = new ResourceTemplate(def.uri, { list: undefined })
    sdk.registerResource(
      def.uri,
      template,
      { description: def.description },
      async (uri, variables) => {
        const extracted: Record<string, string> = {}
        for (const [k, v] of Object.entries(variables)) {
          extracted[k] = Array.isArray(v) ? v[0] : String(v)
        }
        const text = await def.resolver(extracted)
        return { contents: [{ uri: uri.toString(), text }] }
      }
    )
  }
}
