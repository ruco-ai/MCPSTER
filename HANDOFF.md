# Handoff: mcpster

**Date:** 2026-04-05
**Author:** ruco
**Version:** v1

---

## What Was Built

> mcpster v1 — a TypeScript SDK for building MCP servers with a fluent, chainable API over `@modelcontextprotocol/sdk`. Covers the full local stdio path: createServer, defineTool, defineResource, definePrompt, and start().

---

- `SPEC.md` — full product spec including vision, v1 decisions, core abstraction, transition path (local → remote → hosted → distributed), scope model, reference implementations, and open questions
- `STRUCTURE.md` — package layout, public API surface, key TypeScript types, dependency list, and SDK mapping table
- `CODING-NOTES.md` — implementation decisions: URI template parsing, error handling convention, chainable API pattern, async start(), testing strategy, and ordered file-creation checklist
- `README.md` — user-facing documentation

No source code has been written yet. This handoff covers the planning phase.

## How to Run

```bash
# Install dependencies (once src exists)
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
| No source files | Only spec and structure docs written | Implement per the order in CODING-NOTES.md |
| Transport | stdio only planned | HTTP/SSE transport in v2 |
| CLI scaffolder | Deferred (`mcpster init`) | v2 or later |
| Deploy adapters | Not in scope | v3 (Railway, Fly, Cloudflare Workers) |
| Reference implementations | `examples/minimal/` (hello-mcp) exists and runs | — |
| `clone` command | Spec'd, not implemented | Human-access complement to MCP resource reads |

## Known Issues

| Issue | Severity | Notes |
|-------|----------|-------|
| No implementation exists | High | All deliverables so far are planning docs |
| SDK resource template handling | Medium | Static vs templated URIs need conditional routing — see CODING-NOTES.md URI section |
| `start()` never-resolving promise | Low | Expected behavior, but callers need to know — document clearly |

## Next Steps

- TODO [BOT]: Scaffold `package.json` and `tsconfig.json` per STRUCTURE.md dependencies
- TODO [BOT]: Write `src/types.ts` — all interfaces, no logic
- TODO [BOT]: Write `src/server.ts` — `createServer()` + `McpsterServer` class
- TODO [BOT]: Write `src/transport/stdio.ts` — thin SDK wrapper
- TODO [BOT]: Write `src/tool.ts` — `defineTool` with Zod validation
- TODO [BOT]: Write `src/resource.ts` — `defineResource` with URI template parsing
- TODO [BOT]: Write `src/prompt.ts` — `definePrompt`
- TODO [BOT]: Write `src/index.ts` — re-exports only
- TODO [BOT]: Write `examples/minimal/` — smoke-test reference
- TODO [BOT]: Write unit tests per primitive (tool, resource, prompt, server)
- DONE[alexruco@ruco-todo:#2]: Decide versioning strategy for hosted servers (semver vs URL-versioned) — open question from SPEC.md
- DONE[alexruco@ruco-todo:#3]: Validate that `@modelcontextprotocol/sdk` in-memory transport works for integration tests before committing to the testing strategy
- DONE[alexruco@ruco-todo:#4]: Reference implementation scope resolved — hello-mcp (`examples/minimal/`) is the standard reference

## Review Checklist

- [X] `npm install` resolves without conflicts (`@modelcontextprotocol/sdk` + `zod` + `typescript` + `vitest`)
- [x] `examples/minimal/` runs against a real MCP client (e.g. Claude Desktop or `claude mcp add`)
- [ ] All three primitives (tool, resource, prompt) have passing unit tests
- [ ] URI template extraction handles multi-param URIs correctly (`a://{x}/{y}`)
- [ ] Errors thrown in handlers produce MCP-compliant error responses, not uncaught exceptions
- [ ] `start()` keeps process alive under stdio — does not exit immediately

---

