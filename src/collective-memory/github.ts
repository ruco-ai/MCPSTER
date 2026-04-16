import type { RepoInfo } from './types.js'

interface RawFileContent {
  type: string
  content: string
  encoding: string
}

interface RawDirEntry {
  name: string
  type: string
}

export class GithubClient {
  private readonly headers: Record<string, string>
  private readonly baseUrl = 'https://api.github.com'

  constructor(token?: string) {
    this.headers = {
      Accept: 'application/vnd.github.v3+json',
      'User-Agent': 'mcpster-collective-memory/1.0',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    }
  }

  private async request<T>(path: string): Promise<T | null> {
    const res = await fetch(`${this.baseUrl}${path}`, { headers: this.headers })
    if (res.status === 404) return null
    if (!res.ok) {
      const body = await res.text().catch(() => '')
      throw new Error(`GitHub API ${res.status} for ${path}: ${body}`)
    }
    return res.json() as Promise<T>
  }

  /** List all public repos for an owner, paginating automatically. */
  async listRepos(owner: string): Promise<RepoInfo[]> {
    const all: RepoInfo[] = []
    let page = 1
    while (true) {
      const batch = await this.request<RepoInfo[]>(
        `/users/${owner}/repos?per_page=100&page=${page}&sort=updated`,
      )
      if (!batch || batch.length === 0) break
      all.push(...batch)
      if (batch.length < 100) break
      page++
    }
    return all
  }

  /** Fetch the decoded text content of a file, or null if not found. */
  async getFileText(owner: string, repo: string, path: string): Promise<string | null> {
    const data = await this.request<RawFileContent>(`/repos/${owner}/${repo}/contents/${path}`)
    if (!data || data.type !== 'file') return null
    return Buffer.from(data.content, 'base64').toString('utf-8')
  }

  /** List filenames (not dirs) inside a directory path. Returns [] if path doesn't exist. */
  async listDirFiles(owner: string, repo: string, dirPath: string): Promise<string[]> {
    const entries = await this.request<RawDirEntry[]>(
      `/repos/${owner}/${repo}/contents/${dirPath}`,
    )
    if (!entries || !Array.isArray(entries)) return []
    return entries.filter(e => e.type === 'file').map(e => e.name)
  }
}
