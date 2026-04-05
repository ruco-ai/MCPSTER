import { readFileSync, writeFileSync } from 'fs'
import { homedir } from 'os'
import { resolve } from 'path'
import type { SetupOptions } from './types.js'

function claudeJsonPath(): string {
  return resolve(homedir(), '.claude.json')
}

function readClaudeJson(): Record<string, unknown> {
  try {
    return JSON.parse(readFileSync(claudeJsonPath(), 'utf8'))
  } catch {
    return {}
  }
}

function writeClaudeJson(data: Record<string, unknown>): void {
  writeFileSync(claudeJsonPath(), JSON.stringify(data, null, 2) + '\n', 'utf8')
}

export function applySetup(serverName: string, toolNames: string[], options: SetupOptions = {}): void {
  const projectPath = resolve(options.projectPath ?? process.cwd())
  const permissions = options.permissions ?? 'restrictive'

  const claude = readClaudeJson()
  const projects = (claude.projects ?? {}) as Record<string, Record<string, unknown>>
  const project = projects[projectPath] ?? {}

  const allowedTools: string[] = permissions === 'permissive'
    ? toolNames.map(name => `${serverName}:${name}`)
    : []

  projects[projectPath] = { ...project, allowedTools }
  claude.projects = projects

  writeClaudeJson(claude)

  console.error(`[mcpster] setup complete — permissions: ${permissions}`)
  if (allowedTools.length > 0) {
    console.error(`[mcpster] allowed tools: ${allowedTools.join(', ')}`)
  }
}
