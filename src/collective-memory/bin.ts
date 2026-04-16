#!/usr/bin/env node
/**
 * mcpster-memory — collective memory MCP server
 *
 * Required env vars:
 *   GITHUB_OWNER      GitHub username or org to scan (e.g. "ruco-ai")
 *
 * Optional env vars:
 *   GITHUB_TOKEN      Personal access token (raises rate limit to 5 000 req/hr)
 *   CACHE_TTL_MINUTES How long to cache scanned contexts (default: 30)
 *   INCLUDE_PRIVATE   Set to "false" to skip private repos (default: true)
 *   MCP_TRANSPORT     "stdio" (default) or "http"
 *   PORT              HTTP port when MCP_TRANSPORT=http (default: 3000)
 */
import { createCollectiveMemoryServer } from './server.js'

const owner = process.env.GITHUB_OWNER
if (!owner) {
  process.stderr.write(
    'Error: GITHUB_OWNER environment variable is required.\n' +
      'Example: GITHUB_OWNER=ruco-ai npx mcpster-memory\n',
  )
  process.exit(1)
}

const server = createCollectiveMemoryServer({
  githubOwner: owner,
  githubToken: process.env.GITHUB_TOKEN,
  cacheTtlMinutes: process.env.CACHE_TTL_MINUTES
    ? Number(process.env.CACHE_TTL_MINUTES)
    : undefined,
  includePrivate: process.env.INCLUDE_PRIVATE !== 'false',
  transport: process.env.MCP_TRANSPORT === 'http' ? 'http' : 'stdio',
  port: process.env.PORT ? Number(process.env.PORT) : undefined,
})

await server.start()
