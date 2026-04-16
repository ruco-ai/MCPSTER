export interface RepoInfo {
  name: string
  full_name: string
  description: string | null
  default_branch: string
  updated_at: string
  private: boolean
}

export interface ClaudeContext {
  repoName: string
  fullName: string
  description: string | null
  updatedAt: string
  private: boolean
  /** Contents of CLAUDE.md at repo root, or null if absent */
  claudeMd: string | null
  /** Parsed .claude/settings.json, or null if absent */
  settings: Record<string, unknown> | null
  /** Other files found under .claude/ (keyed by filename, excluding settings.json) */
  claudeFiles: Record<string, string>
}

export interface CollectiveMemoryConfig {
  /** GitHub username or organization to scan */
  githubOwner: string
  /** Personal access token — increases rate limit from 60 to 5 000 req/hr */
  githubToken?: string
  /** How long to cache scanned contexts in minutes (default: 30) */
  cacheTtlMinutes?: number
  /** Whether to include private repos (default: true, requires a token with repo scope) */
  includePrivate?: boolean
  /** MCP server name (default: "collective-memory") */
  name?: string
  /** MCP server version (default: "1.0.0") */
  version?: string
  /** Transport mode (default: "stdio") */
  transport?: 'stdio' | 'http'
  /** HTTP port — only used when transport is "http" (default: 3000) */
  port?: number
}
