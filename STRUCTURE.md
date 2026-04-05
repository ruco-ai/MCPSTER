# mcpster — Project Structure

## Package

```
mcpster/
├── src/
│   ├── index.ts              # public API — re-exports createServer and types
│   ├── server.ts             # McpsterServer class — core orchestrator
│   ├── tool.ts               # defineTool — schema validation + handler wiring
│   ├── resource.ts           # defineResource — URI pattern matching + resolver
│   ├── prompt.ts             # definePrompt — prompt template registration
│   ├── transport/
│   │   └── stdio.ts          # stdio transport adapter (wraps @modelcontextprotocol/sdk)
│   └── types.ts              # shared TypeScript types and interfaces
├── tests/
│   ├── server.test.ts
│   ├── tool.test.ts
│   ├── resource.test.ts
│   └── prompt.test.ts
├── examples/
│   ├── minimal/              # createServer + one tool, runnable reference
│   └── mdblu-server/         # reference implementation: mdblu MCP server
├── package.json
├── tsconfig.json
└── README.md
```

## Public API surface (src/index.ts exports)

```typescript
export { createServer } from './server'
export type { McpsterServer, ServerConfig } from './types'
export type { ToolDefinition, ResourceDefinition, PromptDefinition } from './types'
```

## Key types (src/types.ts)

```typescript
interface ServerConfig {
  name: string
  version: string
  scope?: string  // defaults to process.cwd()
}

interface ToolDefinition<T extends ZodSchema> {
  name: string
  description: string
  schema: T
  handler: (input: z.infer<T>) => Promise<unknown>
}

interface ResourceDefinition {
  uri: string           // URI template e.g. 'templates://{name}'
  description: string
  resolver: (params: Record<string, string>) => Promise<string>
}

interface PromptDefinition {
  name: string
  description?: string
  handler: (args: Record<string, string>) => Promise<string>
}

interface McpsterServer {
  defineTool<T extends ZodSchema>(def: ToolDefinition<T>): McpsterServer
  defineResource(def: ResourceDefinition): McpsterServer
  definePrompt(def: PromptDefinition): McpsterServer
  start(): Promise<void>  // stdio transport
}
```

## Dependencies

```json
{
  "dependencies": {
    "@modelcontextprotocol/sdk": "latest",
    "zod": "^3"
  },
  "devDependencies": {
    "typescript": "^5",
    "vitest": "latest",
    "@types/node": "latest"
  }
}
```

## Transport wiring (how it maps to @modelcontextprotocol/sdk)

mcpster wraps the official SDK. The mapping:

| mcpster | @modelcontextprotocol/sdk |
|---|---|
| `createServer()` | `new McpServer({ name, version })` |
| `defineTool()` | `server.tool(name, schema, handler)` |
| `defineResource()` | `server.resource(uri, handler)` |
| `definePrompt()` | `server.prompt(name, handler)` |
| `server.start()` | `server.connect(new StdioServerTransport())` |

The value mcpster adds over raw SDK usage:
- Fluent chainable API
- Zod schema validation enforced at registration time
- URI template parsing for resources (extracts `{param}` into resolver args)
- Consistent error wrapping
- Scope-aware server naming
