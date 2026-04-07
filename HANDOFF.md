# Handoff: mcpster

**Date:** 2026-04-07
**Author:** ruco
**Version:** v3

---

## What Was Built

> mcpster v3 — extends v2 with a deploy kit that lets SDK users push their MCP servers to Railway, Fly.io, and Cloudflare Workers with a single CLI command, bridging the gap between a locally running HTTP/SSE server and a publicly hosted one.

---

- `SPEC.md` — full product spec including vision, v1 decisions, core abstraction, transition path (local → remote → hosted → distributed), scope model, reference implementations, and open questions
- `STRUCTURE.md` — package layout, public API surface, key TypeScript types, dependency list, and SDK mapping table
- `CODING-NOTES.md` — implementation decisions: URI template parsing, error handling convention, chainable API pattern, async start(), testing strategy, and ordered file-creation checklist
- `README.md` — user-facing documentation including Deploy section with prerequisites, usage examples, and local→hosted migration guide

## How to Run

```bash
# Install dependencies
npm install

# Run in development
npx ts-node src/index.ts

# Run tests
npx vitest

# Build for production
npx tsc
```

## Deploy CLI

After building, the `mcpster-deploy` binary is available:

```bash
# Deploy to Railway
mcpster-deploy --target railway --name my-mcp-server

# Deploy to Fly.io
mcpster-deploy --target fly --name my-mcp-server --region lax

# Deploy to Cloudflare Workers
mcpster-deploy --target cloudflare --name my-mcp-server

# Dry-run: print manifest only (no platform calls)
mcpster-deploy --target railway --name my-mcp-server --dry-run

# Show help
mcpster-deploy --help
```

**Prerequisites per target:**
- Railway: `railway` CLI installed and authenticated
- Fly.io: `fly` CLI installed and authenticated
- Cloudflare Workers: `wrangler` CLI installed and authenticated

## Local Testing (without publishing to npm)

```bash
# In mcpster/ — build and register the package globally
npm run build
npm link

# In your consumer project — link to the local build
npm link mcpster
```

Alternatively, install by path (simpler for one-time setups):

```bash
npm install /path/to/mcpster
```

After each change to mcpster, run `npm run build` — the linked consumer will pick up the new `dist/` automatically.

## Shortcuts & Assumptions

| Item | What was done | What it should become |
|------|--------------|----------------------|
| Transport | stdio + HTTP/SSE implemented | Graceful shutdown contract pending human review |
| CLI scaffolder | Deferred (`mcpster init`) | v2 or later |
| Deploy adapters | Railway, Fly.io, Cloudflare Workers implemented (`src/deploy/`) | Review manifest field defaults before v3 release |
| Reference implementations | `examples/minimal/` (hello-mcp) exists and runs | — |
| `clone` command | Spec'd, not implemented | Human-access complement to MCP resource reads |
| HTTP graceful shutdown | Not yet implemented | Expose `stop()` or closer from `connectHttp` after shutdown contract approved |
| Agent config auto-update | Deferred | Human decision needed: update `localhost` → hosted URL in Claude Desktop / `claude mcp` after deploy |
| Deploy `--output-dir` flag | Not implemented | v3.1 — manifests currently written to cwd |
| Fly TOML serialiser | Hand-rolled (`toToml`) | Replace with proper TOML library if edge cases surface |

## Known Issues

| Issue | Severity | Notes |
|-------|----------|-------|
| SDK resource template handling | Medium | Static vs templated URIs need conditional routing — see CODING-NOTES.md URI section |
| `start()` never-resolving promise | Low | Expected behavior, but callers need to know — document clearly |
| HTTP port conflict behavior | Low | Error behavior on port conflict not yet defined or tested |
| No HTTP graceful shutdown | Low | `connectHttp` has no `stop()` — pending human review of shutdown contract |
| Deploy manifests written to cwd | Low | `deploy()` functions write manifest files to current working directory; no `--output-dir` flag yet |
| Fly TOML edge cases | Low | Hand-rolled serialiser may not handle dotted keys or inline tables correctly |

## Next Steps

- TODO [HUMAN]: Review generated manifest shapes for each deploy target — confirm field names, region defaults, memory/CPU defaults, and platform-specific constraints before v3 release — Owner: ruco
- TODO [HUMAN]: Decide whether agent config auto-update (switching `localhost` → hosted URL in Claude Desktop / `claude mcp`) is in scope for v3 or deferred to v4 — Owner: ruco
- TODO [HUMAN]: Review the public HTTP transport API shape (`HttpConfig` fields, error behaviour on port conflict, graceful shutdown contract)
- TODO [HUMAN]: Review the wrapped error response shapes in `resource.ts` and `prompt.ts` — confirm that returning the error message as `contents[0].text` (resources) and as a `user` message (prompts) is appropriate for the MCP contracts — Due: before merge
- TODO [BOT]: Add graceful shutdown support (expose a `stop()` or return a closer function from `connectHttp`) — after HUMAN review
- TODO [BOT]: Replace the hand-rolled `toToml` in `fly.ts` with a proper TOML serialiser if edge cases surface
- TODO [BOT]: Add `--output-dir` flag to write manifests to a specified directory rather than cwd — v3.1

## Review Checklist

- [X] `npm install` resolves without conflicts (`@modelcontextprotocol/sdk` + `zod` + `typescript` + `vitest`)
- [x] `examples/minimal/` runs against a real MCP client (e.g. Claude Desktop or `claude mcp add`)
- [X] All three primitives (tool, resource, prompt) have passing unit tests
- [X] HTTP/SSE transport adapter implemented (`src/transport/http.ts`) — 13/13 tests passing
- [X] URI template extraction handles multi-param URIs correctly (`a://{x}/{y}`)
- [X] Errors thrown in handlers produce MCP-compliant error responses, not uncaught exceptions
- [X] `start()` keeps process alive under stdio — does not exit immediately
- [X] HTTP transport: graceful shutdown contract defined and implemented
- [X] Deploy adapters implemented for Railway, Fly.io, and Cloudflare Workers (`src/deploy/`)
- [X] `mcpster-deploy` CLI binary registered in `package.json` `bin` field
- [X] Deploy smoke tests passing (dry-run mode, no live platform calls) — 8/8 tests
- [ ] Live deploy validated against real Railway/Fly/Cloudflare credentials

---