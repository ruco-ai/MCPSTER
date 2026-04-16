import { z } from 'zod'
import { createServer } from '../server.js'
import { GithubClient } from './github.js'
import { scanRepo, hasAnyClaudeContext } from './scanner.js'
import { TTLCache } from './cache.js'
import type { ClaudeContext, CollectiveMemoryConfig } from './types.js'
import type { McpsterServer } from '../types.js'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatContext(ctx: ClaudeContext): string {
  const parts: string[] = [`# ${ctx.fullName}`, '']
  if (ctx.description) parts.push(`> ${ctx.description}`, '')
  parts.push(`Last updated: ${ctx.updatedAt}`, '')

  if (ctx.claudeMd) {
    parts.push('## CLAUDE.md', '', ctx.claudeMd.trimEnd(), '')
  }
  if (ctx.settings) {
    parts.push(
      '## .claude/settings.json',
      '',
      '```json',
      JSON.stringify(ctx.settings, null, 2),
      '```',
      '',
    )
  }
  for (const [name, content] of Object.entries(ctx.claudeFiles)) {
    parts.push(`## .claude/${name}`, '', content.trimEnd(), '')
  }

  return parts.join('\n')
}

/** Return a short snippet from whichever source contains the query. */
function excerptFor(ctx: ClaudeContext, query: string): string {
  const q = query.toLowerCase()
  const sources = [
    ctx.claudeMd ?? '',
    JSON.stringify(ctx.settings ?? {}),
    ...Object.values(ctx.claudeFiles),
  ]
  for (const src of sources) {
    const idx = src.toLowerCase().indexOf(q)
    if (idx < 0) continue
    const start = Math.max(0, idx - 80)
    const end = Math.min(src.length, idx + 200)
    return '…' + src.slice(start, end).replace(/\s+/g, ' ').trim() + '…'
  }
  return ''
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

/**
 * Create an MCP server that exposes collective Claude context for every repo
 * under a GitHub account as tools and resources.
 *
 * Tools
 *   list_projects        — discover repos that have CLAUDE.md / .claude config
 *   get_project_context  — retrieve the full context for one repo
 *   search_context       — full-text search across all project contexts
 *   refresh_context      — invalidate the cache and re-fetch from GitHub
 *
 * Resources
 *   claude-memory://projects               — index of all projects
 *   claude-memory://projects/{owner}/{repo} — full context for one project
 */
export function createCollectiveMemoryServer(config: CollectiveMemoryConfig): McpsterServer {
  const client = new GithubClient(config.githubToken)
  const cache = new TTLCache<ClaudeContext[]>(config.cacheTtlMinutes ?? 30)

  /** Return cached contexts or fetch + filter all repos. */
  const fetchAllContexts = async (): Promise<ClaudeContext[]> => {
    const hit = cache.get('all')
    if (hit) return hit

    const repos = await client.listRepos(config.githubOwner)
    const filtered = config.includePrivate === false ? repos.filter(r => !r.private) : repos

    const settled = await Promise.allSettled(
      filtered.map(r => scanRepo(client, config.githubOwner, r)),
    )

    const result = settled
      .filter((r): r is PromiseFulfilledResult<ClaudeContext> => r.status === 'fulfilled')
      .map(r => r.value)
      .filter(hasAnyClaudeContext)

    cache.set('all', result)
    return result
  }

  return createServer({
    name: config.name ?? 'collective-memory',
    version: config.version ?? '1.0.0',
    transport: config.transport ?? 'stdio',
    http: config.port ? { port: config.port } : undefined,
  })

    // ------------------------------------------------------------------
    // Tools
    // ------------------------------------------------------------------

    .defineTool({
      name: 'list_projects',
      description:
        'List all GitHub repos that have Claude context (CLAUDE.md or .claude/ config). ' +
        'Use this to discover which projects have documentation before diving in.',
      schema: z.object({}),
      handler: async () => {
        const contexts = await fetchAllContexts()
        return contexts.map(ctx => ({
          repo: ctx.fullName,
          description: ctx.description,
          hasCLAUDEmd: ctx.claudeMd !== null,
          hasSettings: ctx.settings !== null,
          extraFiles: Object.keys(ctx.claudeFiles),
          lastUpdated: ctx.updatedAt,
        }))
      },
    })

    .defineTool({
      name: 'get_project_context',
      description:
        'Get the full Claude context (CLAUDE.md + .claude/ config) for a specific project. ' +
        'Call this before starting any work on a repo to load its conventions and notes.',
      schema: z.object({
        repo: z
          .string()
          .describe('Repo name (e.g. "mcpster") or full name (e.g. "ruco-ai/mcpster")'),
      }),
      handler: async ({ repo }) => {
        const contexts = await fetchAllContexts()
        const repoName = repo.includes('/') ? repo.split('/')[1] : repo
        const ctx =
          contexts.find(c => c.fullName === repo) ??
          contexts.find(c => c.repoName === repoName)
        if (!ctx) {
          throw new Error(`No Claude context found for "${repo}". Try list_projects first.`)
        }
        return formatContext(ctx)
      },
    })

    .defineTool({
      name: 'search_context',
      description:
        'Full-text search across all project CLAUDE.md files and .claude/ settings. ' +
        'Useful for finding which projects mention a technology, pattern, or convention.',
      schema: z.object({
        query: z.string().describe('Keyword or phrase to search for'),
      }),
      handler: async ({ query }) => {
        const contexts = await fetchAllContexts()
        const q = query.toLowerCase()
        const matches = contexts.filter(ctx => {
          const haystack = [
            ctx.claudeMd ?? '',
            JSON.stringify(ctx.settings ?? {}),
            ...Object.values(ctx.claudeFiles),
          ].join('\n')
          return haystack.toLowerCase().includes(q)
        })
        return matches.map(ctx => ({
          repo: ctx.fullName,
          description: ctx.description,
          excerpt: excerptFor(ctx, query),
        }))
      },
    })

    .defineTool({
      name: 'refresh_context',
      description:
        'Force a cache refresh — re-fetch all project contexts from GitHub. ' +
        'Use when you know a CLAUDE.md has recently been updated.',
      schema: z.object({}),
      handler: async () => {
        cache.clear()
        const contexts = await fetchAllContexts()
        return { refreshed: true, projectsWithContext: contexts.length }
      },
    })

    // ------------------------------------------------------------------
    // Resources
    // ------------------------------------------------------------------

    .defineResource({
      uri: 'claude-memory://projects',
      description: 'Index of all repos with Claude context under the configured GitHub account',
      resolver: async () => {
        const contexts = await fetchAllContexts()
        if (contexts.length === 0) {
          return `# Collective Memory — ${config.githubOwner}\n\n_No repos with Claude context found._`
        }
        const lines = contexts.map(ctx => {
          const badges = [ctx.claudeMd && 'CLAUDE.md', ctx.settings && 'settings.json']
            .filter(Boolean)
            .join(', ')
          const desc = ctx.description ? `: ${ctx.description}` : ''
          return `- **${ctx.fullName}**${desc} [${badges}]`
        })
        return `# Collective Memory — ${config.githubOwner}\n\n${lines.join('\n')}`
      },
    })

    .defineResource({
      uri: 'claude-memory://projects/{owner}/{repo}',
      description: 'Full Claude context (CLAUDE.md + .claude/ files) for a specific project',
      resolver: async ({ owner, repo }) => {
        const contexts = await fetchAllContexts()
        const ctx = contexts.find(c => c.fullName === `${owner}/${repo}`)
        if (!ctx) return `No Claude context found for ${owner}/${repo}`
        return formatContext(ctx)
      },
    })
}
