# hello-mcp

Minimal reference server built with mcpster. Demonstrates all three primitives (tool, resource, prompt) and the full local → hosted migration path.

## What it exposes

| Primitive | Name / URI | Description |
|-----------|-----------|-------------|
| Tool | `echo` | Echoes back the input message |
| Resource | `info://status` | Reports server status and active transport |
| Prompt | `greeting` | Returns a simple greeting string |

## Run locally (stdio)

```bash
# From the mcpster root
npx ts-node examples/minimal/index.ts
```

Register with Claude:

```bash
claude mcp add hello-mcp -- npx ts-node /path/to/mcpster/examples/minimal/index.ts
```

## Run locally (HTTP/SSE)

```bash
TRANSPORT=http npx ts-node examples/minimal/index.ts
# Listening on http://localhost:3000/mcp

# Custom port
PORT=8080 TRANSPORT=http npx ts-node examples/minimal/index.ts
```

## Deploy to a hosted platform

Build first, then use `mcpster-deploy`:

```bash
# From the mcpster root
npm run build

# Dry-run — print the manifest without deploying
npx mcpster-deploy --target railway --dry-run
npx mcpster-deploy --target fly --dry-run
npx mcpster-deploy --target cloudflare --dry-run

# Live deploy
npx mcpster-deploy --target railway
npx mcpster-deploy --target fly --region lhr
npx mcpster-deploy --target cloudflare
```

Prerequisites per target:

| Target | CLI | Auth |
|--------|-----|------|
| Railway | `railway` | `railway login` |
| Fly.io | `flyctl` | `fly auth login` |
| Cloudflare Workers | `wrangler` | `wrangler login` |

## Migration path

| Stage | Transport | Command |
|-------|-----------|---------|
| 1 — Local stdio | stdio | `npx ts-node index.ts` |
| 2 — Local HTTP/SSE | http | `TRANSPORT=http npx ts-node index.ts` |
| 3 — Hosted | http (remote) | `npx mcpster-deploy --target <target>` |

No code changes required between stages — only the environment variable and deploy command change.
