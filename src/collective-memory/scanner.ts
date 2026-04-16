import type { GithubClient } from './github.js'
import type { RepoInfo, ClaudeContext } from './types.js'

/**
 * Fetch all Claude-related files for a single repo in parallel:
 *   - CLAUDE.md at repo root
 *   - .claude/settings.json
 *   - Any other files under .claude/
 */
export async function scanRepo(
  client: GithubClient,
  owner: string,
  repo: RepoInfo,
): Promise<ClaudeContext> {
  const [claudeMdRaw, settingsRaw, claudeFileNames] = await Promise.all([
    client.getFileText(owner, repo.name, 'CLAUDE.md'),
    client.getFileText(owner, repo.name, '.claude/settings.json'),
    client.listDirFiles(owner, repo.name, '.claude').catch(() => [] as string[]),
  ])

  let settings: Record<string, unknown> | null = null
  if (settingsRaw) {
    try {
      settings = JSON.parse(settingsRaw) as Record<string, unknown>
    } catch {
      // malformed JSON — treat as absent
    }
  }

  const extraNames = claudeFileNames.filter(n => n !== 'settings.json')
  const extraResults = await Promise.allSettled(
    extraNames.map(name => client.getFileText(owner, repo.name, `.claude/${name}`)),
  )

  const claudeFiles: Record<string, string> = {}
  for (let i = 0; i < extraNames.length; i++) {
    const r = extraResults[i]
    if (r.status === 'fulfilled' && r.value !== null) {
      claudeFiles[extraNames[i]] = r.value
    }
  }

  return {
    repoName: repo.name,
    fullName: repo.full_name,
    description: repo.description,
    updatedAt: repo.updated_at,
    private: repo.private,
    claudeMd: claudeMdRaw,
    settings,
    claudeFiles,
  }
}

/** True when a repo has at least one Claude-related file. */
export function hasAnyClaudeContext(ctx: ClaudeContext): boolean {
  return (
    ctx.claudeMd !== null ||
    ctx.settings !== null ||
    Object.keys(ctx.claudeFiles).length > 0
  )
}
