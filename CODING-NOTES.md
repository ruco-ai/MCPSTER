# mcpster — Coding Notes

Notes and decisions to keep in mind while implementing.

---

## What mcpster IS and IS NOT

- IS: a thin, ergonomic wrapper over `@modelcontextprotocol/sdk`
- IS: opinionated about the API surface (fluent, chainable, Zod-first)
- IS NOT: a reimplementation of MCP protocol
- IS NOT: aware of xtage, mdblu, or navg8

If something can be delegated to the official SDK, delegate it.

---

## URI Template Parsing for defineResource

The official SDK handles resource URIs differently depending on whether they are static or templated. mcpster should detect `{param}` patterns and route accordingly:

```typescript
// static → server.resource(uri, handler)
// templated → server.resource(template, handler) with param extraction

function parseUriTemplate(uri: string): string[] {
  return [...uri.matchAll(/\{(\w+)\}/g)].map(m => m[1])
}
```

The resolver always receives a `Record<string, string>` — mcpster extracts params from the matched URI before calling it.

---

## Error Handling Convention

Handlers should throw — mcpster catches and wraps into MCP-compliant error responses. Do not require handlers to return error objects. Keep handlers clean.

```typescript
// handler throws → mcpster wraps into { error: { code, message } }
// handler returns → mcpster wraps into { result: value }
```

---

## Chainable API Pattern

`defineTool`, `defineResource`, `definePrompt` all return `this` so calls can chain:

```typescript
createServer({ name: 'my-server', version: '1.0.0' })
  .defineTool({ ... })
  .defineResource({ ... })
  .definePrompt({ ... })
  .start()
```

---

## start() is async

`start()` connects the stdio transport and keeps the process alive. It should return a Promise that never resolves under normal operation (process stays up). Callers can `await server.start()` at the bottom of their entry file.

---

## Testing Strategy

- Unit test each primitive (tool, resource, prompt) in isolation with a mock SDK server
- Integration test `start()` with a real stdio transport using the SDK's in-memory transport option
- Reference the mdblu-server example as an end-to-end test

---

## What NOT to build in v1

- HTTP/SSE transport (v2)
- `mcpster init` CLI scaffolder (deferred)
- Deploy adapters (v3)
- Authentication (non-goal)
- Real-time resource subscriptions (non-goal)

---

## First files to write

1. `package.json` + `tsconfig.json` — scaffold
2. `src/types.ts` — all interfaces, no logic
3. `src/server.ts` — `createServer()` + `McpsterServer` class skeleton
4. `src/transport/stdio.ts` — thin wrapper over SDK's StdioServerTransport
5. `src/tool.ts` — `defineTool` implementation
6. `src/resource.ts` — `defineResource` with URI template parsing
7. `src/prompt.ts` — `definePrompt`
8. `src/index.ts` — re-exports
9. `examples/minimal/` — smoke test
10. `tests/` — unit tests per primitive
