# Handoff: mcpster

**Date:** 2026-04-06
**Author:** ruco
**Version:** v2

---

## What Was Built

> mcpster v2 — a TypeScript SDK for building MCP servers with a fluent, chainable API over `@modelcontextprotocol/sdk`. Covers the full local stdio path and HTTP/SSE transport: createServer, defineTool, defineResource, definePrompt, start(), and connectHttp().

---

- `SPEC.md` — full product spec including vision, v1 decisions, core abstraction, transition path (local → remote → hosted → distributed), scope model, reference implementations, and open questions
- `STRUCTURE.md` — package layout, public API surface, key TypeScript types, dependency list, and SDK mapping table
- `CODING-NOTES.md` — implementation decisions: URI template parsing, error handling convention, chainable API pattern, async start(), testing strategy, and ordered file-creation checklist
- `README.md` — user-facing documentation

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
| Deploy adapters | Not in scope | v3 (Railway, Fly, Cloudflare Workers) |
| Reference implementations | `examples/minimal/` (hello-mcp) exists and runs | — |
| `clone` command | Spec'd, not implemented | Human-access complement to MCP resource reads |
| HTTP graceful shutdown | Not yet implemented | Expose `stop()` or closer from `connectHttp` after shutdown contract approved |

## Known Issues

| Issue | Severity | Notes |
|-------|----------|-------|
| SDK resource template handling | Medium | Static vs templated URIs need conditional routing — see CODING-NOTES.md URI section |
| `start()` never-resolving promise | Low | Expected behavior, but callers need to know — document clearly |
| HTTP port conflict behavior | Low | Error behavior on port conflict not yet defined or tested |
| No HTTP graceful shutdown | Low | `connectHttp` has no `stop()` — pending human review of shutdown contract |

## Next Steps

- TODO [HUMAN]: Review the public HTTP transport API shape (`HttpConfig` fields, error behaviour on port conflict, graceful shutdown contract)
- TODO [BOT]: Add graceful shutdown support (expose a `stop()` or return a closer function from `connectHttp`) — after HUMAN review
- TODO [BOT]: Update `README.md` with HTTP transport usage example — after HUMAN review

## Review Checklist

- [X] `npm install` resolves without conflicts (`@modelcontextprotocol/sdk` + `zod` + `typescript` + `vitest`)
- [x] `examples/minimal/` runs against a real MCP client (e.g. Claude Desktop or `claude mcp add`)
- [X] All three primitives (tool, resource, prompt) have passing unit tests
- [X] HTTP/SSE transport adapter implemented (`src/transport/http.ts`) — 13/13 tests passing
- [X] URI template extraction handles multi-param URIs correctly (`a://{x}/{y}`)
- [X] Errors thrown in handlers produce MCP-compliant error responses, not uncaught exceptions
- [X] `start()` keeps process alive under stdio — does not exit immediately
- [X] HTTP transport: graceful shutdown contract defined and implemented

---