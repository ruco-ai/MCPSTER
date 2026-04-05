# mcpster

> A TypeScript SDK for building MCP servers — removes the boilerplate so you focus on what you expose, not how.

**Author:** ruco | **Date:** 2026-04-05

---

## Overview

mcpster is an agnostic TypeScript SDK for building Model Context Protocol (MCP) servers. It wraps `@modelcontextprotocol/sdk` behind a fluent, chainable API with Zod-first schema validation, URI template parsing, and consistent error handling. Servers built with mcpster start as local stdio processes and have a clear migration path to remote hosting and public npm distribution — without rewriting any business logic.

## Features

- `createServer()` + chainable `defineTool` / `defineResource` / `definePrompt` API
- Zod schema validation enforced at tool registration time
- URI template parameter extraction for resources (`templates://{name}`)
- Automatic error wrapping — handlers throw, mcpster returns MCP-compliant error responses
- Scope-aware server naming (project, user, or public scope)
- stdio and HTTP/SSE transports — switch with a single config field
- Designed for progressive deployment: local stdio → remote HTTP/SSE → hosted → npm package

## Installation

```bash
npm install mcpster
```

## Usage

### stdio (default)

```typescript
import { createServer } from 'mcpster'
import { z } from 'zod'

createServer({ name: 'my-server', version: '1.0.0' })
  .defineTool({
    name: 'get_template',
    description: 'Retrieve a template by name',
    schema: z.object({ name: z.string() }),
    handler: async ({ name }) => { /* ... */ },
  })
  .defineResource({
    uri: 'templates://{name}',
    description: 'Template content by name',
    resolver: async ({ name }) => { /* ... */ },
  })
  .definePrompt({
    name: 'summarize',
    handler: async (args) => { /* ... */ },
  })
  .start() // stdio transport
```

Register the server per-project:

```bash
claude mcp add my-server -- npx mcpster start
```

### HTTP/SSE transport

```typescript
import { createServer } from 'mcpster'

createServer({
  name: 'my-server',
  version: '1.0.0',
  transport: 'http',
  http: { port: 3000, path: '/mcp' },
})
  .defineTool({ /* ... */ })
  .start() // listens on http://localhost:3000/mcp
```

## Configuration

| Option | Default | Description |
|--------|---------|-------------|
| `name` | required | Server name, used for MCP registration |
| `version` | required | Semver string |
| `scope` | `process.cwd()` | Project root; determines scope for naming and resource resolution |
| `transport` | `'stdio'` | Transport to use: `'stdio'` or `'http'` |
| `http.port` | `3000` | Port to listen on (HTTP transport only) |
| `http.path` | `'/mcp'` | Request path to handle (HTTP transport only) |

## Project Structure

```
mcpster/
├── src/
│   ├── index.ts              # Public API — re-exports createServer and types
│   ├── server.ts             # McpsterServer class — core orchestrator
│   ├── tool.ts               # defineTool — schema validation + handler wiring
│   ├── resource.ts           # defineResource — URI template matching + resolver
│   ├── prompt.ts             # definePrompt — prompt template registration
│   ├── transport/
│   │   ├── stdio.ts          # stdio transport adapter
│   │   └── http.ts           # HTTP/SSE transport adapter
│   └── types.ts              # Shared TypeScript types and interfaces
├── tests/
│   ├── server.test.ts
│   ├── tool.test.ts
│   ├── resource.test.ts
│   ├── prompt.test.ts
│   └── transport.test.ts
├── examples/
│   └── minimal/              # hello-mcp — tool + resource + prompt, runnable reference
├── package.json
└── tsconfig.json
```

## Development

See [DEV.md](DEV.md) for development setup and contribution guidelines.

## License

MIT

---