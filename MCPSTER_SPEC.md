# mcpster — SPEC

## Vision

mcpster is an agnostic TypeScript SDK for building MCP servers. It removes the boilerplate — stdio transport, JSON-RPC, tool/resource/prompt registration, error handling — so builders focus on what they expose, not how.

mcpster has no opinion about what you build with it. It does not presuppose xtage, mdblu, navg8, or any other project.

Two parallel evolution paths, both frictionless:

**Servers built with mcpster** start as local stdio processes, become remotely hosted services, and can be published as standalone npm packages — without rewriting business logic at any stage.

**mcpster itself** starts as a library, and eventually ships a deploy kit for hosting and distributing servers at scale.

---

## Problem

Every serious dev tool needs an MCP server. Building one today requires:
- Boilerplate: stdio transport, JSON-RPC, resource registration, error handling
- No standard pattern for project-scoped vs global servers
- No migration path from local → hosted → public
- No conventions for how tools expose their context to agents

Each team reinvents the same plumbing. mcpster eliminates that.

---

## v1 Decisions

- **Language:** TypeScript only
- **Transport:** stdio only (HTTP/SSE in v2)
- **Distribution:** library only — no CLI scaffolder (`mcpster init` deferred)
- **Primitives:** `defineTool`, `defineResource`, `definePrompt` all included in v1
- **Foundation:** wraps `@modelcontextprotocol/sdk` — stays spec-compliant, avoids reimplementing the protocol

---

## Core Abstraction

An mcpster server is a collection of **resources**, **tools**, and **prompts** bound to a **scope**.

```typescript
import { createServer } from 'mcpster'
import { z } from 'zod'

const server = createServer({
  name: 'my-server',
  version: '1.0.0',
  scope: process.cwd(), // project-scoped by default
})

server.defineTool({
  name: 'get_template',
  description: 'Retrieve a template by name',
  schema: z.object({ name: z.string() }),
  handler: async ({ name }) => { /* ... */ },
})

server.defineResource({
  uri: 'templates://{name}',
  description: 'Template content by name',
  resolver: async ({ name }) => { /* ... */ },
})

server.definePrompt({
  name: 'summarize',
  handler: async (args) => { /* ... */ },
})

server.start() // stdio transport
```

That is the entire surface for a local server. Everything else is progressive.

---

## The Transition Path

### Stage 1 — Local (stdio)
Runs as a subprocess on the developer's machine. Registered per-project via `claude mcp add`. Zero infrastructure.

```
mcpster start --stdio
```

### Stage 2 — Remote (HTTP/SSE)
Same server, different transport. One flag change:

```
mcpster start --http --port 3000
```

Resources and tools are unchanged. The agent calls the same names. The only difference is the wire protocol.

### Stage 3 — Hosted (deploy kit)
mcpster provides a deploy adapter per target:

```
mcpster deploy --target railway
mcpster deploy --target fly
mcpster deploy --target cloudflare-workers
```

Generates a deployment manifest, pushes the server, returns a public URL. The agent config updates from `stdio` to `https://project.fly.dev`.

### Stage 4 — Distributed (SDK)
A mcpster server can be published as a standalone npm package. Other projects `npm install my-project-context-server` and get a fully functional MCP server for that tool's context.

```
mcpster package --publish
```

At this stage, mcpster has become an SDK distribution kit. The business logic written in Stage 1 is now a public artifact, unchanged.

---

## Scope Model

Servers are scoped to avoid collision across projects:

- **Project scope** (default): reads from current working directory. Server name derived from `package.json` name or directory name. Registered locally via `claude mcp add {project-name} -- mcpster start`.
- **User scope**: reads from `~/.{toolname}/`. Registered globally.
- **Public scope**: hosted, accessible by any agent with the URL.

Scope is declared at server creation, not at registration time.

---

## Reference Implementations

mcpster ships two reference servers drawn from the xtage ecosystem:

**xtage-server**
Exposes the xtage knowledge store — insight ingest, query by type/scope/recency, and project context — to Claude instances.

```
Tools:     push_insight(type, content), curate_insights(scope)
Resources: insights://{type}/{scope}, context://{project}
```

**mdblu-server**
Exposes the mdblu template registry to Claude instances.

```
Tools:     get_template(name), list_templates()
Resources: templates://{name}
```

Both are usable independently of each other.

---

## Human Access — the `clone` command

MCP servers serve agents. But documents also serve humans — to read, edit, print, export, email, or submit elsewhere.

mcpster exposes a `clone` command that pulls any resource from a server and writes it locally:

```
mcpster clone spec --from my-project-context --out SPEC.md
```

This is the human-facing complement to MCP resource access. Same source of truth, two consumption paths: agent reads via MCP, human reads via clone.

---

## Non-Goals (v1)

- Authentication and authorization between agents
- Multi-agent coordination or shared state
- Real-time resource subscriptions (future)
- GUI or dashboard

---

## Evolution Path

```
mcpster v1    → SDK for local stdio servers
mcpster v2    → HTTP/SSE transport + deploy adapters
mcpster v3    → package command for public distribution
mcpster v4    → hosted registry of community servers
```

Each version is a strict superset of the previous. Code written for v1 runs unmodified on v4.

---

## Open Questions

1. **Hosted server versioning:** semver on the npm package (for distributed servers) or URL-versioned endpoints (for hosted servers)? Likely both — npm semver for packages, URL versioning for hosted. To be decided in v2.
2. **`clone` output:** writes to stdout by default (pipeable), with `--out <file>` flag for file output. Follows Unix conventions.