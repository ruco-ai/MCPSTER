# mcpster — SPEC

## Vision

mcpster is an SDK for building project-scoped MCP servers that expose tool context to Claude and other AI agents.

The core design principle: a server built with mcpster should start as a local stdio process, become a remotely hosted service, and optionally become a publicly distributed SDK — without rewriting business logic at any stage.

---

## Problem

Every serious dev tool needs an MCP server. Building one today requires:
- Boilerplate: stdio transport, JSON-RPC, resource registration, error handling
- No standard pattern for project-scoped vs global servers
- No migration path from local → hosted → public
- No conventions for how tools expose their context to agents

Each team reinvents the same plumbing. mcpster eliminates that.

---

## Core Abstraction

A mcpster server is a collection of **resources** and **tools** bound to a **scope**.

```typescript
import { createServer } from 'mcpster'

const server = createServer({
  name: 'my-project-context',
  scope: process.cwd(),         // project-scoped by default
})

server.resource('spec', () => readFile('.navg8/context/SPEC.md'))
server.resource('constraints', () => readFile('.navg8/context/CONSTRAINTS.md'))
server.tool('forge', (template, vars) => mdforge.fill(template, vars))

server.start()
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

mcpster ships two reference servers:

**navg8-context-server**
Exposes `.navg8/context/` docs, mission history, BUILD documents, and project summary to agents working inside a navg8-managed project.

```
Resources: spec, constraints, risks, personas, build, rebuild_history
Tools:     get_context(doc), list_context(), get_mission_summary(issue_n)
```

**mdforge-server**
Exposes mdforge template processing as MCP tools. Allows agents to forge, fill, and transform markdown documents mid-session without subprocess calls.

```
Tools: forge(template, context), fill(template, vars), list_templates()
```

Both are usable independently of each other and of navg8.

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

1. Should project-scope servers auto-register on `mcpster init`, or require an explicit `claude mcp add` call by the user?
2. How should versioning work for hosted public servers — semver on the npm package, or URL-versioned endpoints?
3. Should `clone` write to stdout by default (pipeable) or to a file?
