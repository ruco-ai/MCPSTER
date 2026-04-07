import { execSync } from 'node:child_process'
import type { DeployConfig, DeployResult } from './types.js'

export interface RailwayManifest {
  '$schema': string
  build: { builder: string }
  deploy: {
    startCommand: string
    healthcheckPath: string
    restartPolicyType: string
  }
  environments: {
    production: {
      variables: Record<string, string>
    }
  }
}

export function generateManifest(config: DeployConfig): RailwayManifest {
  const port = config.port ?? 3000
  return {
    '$schema': 'https://railway.app/railway.schema.json',
    build: { builder: 'NIXPACKS' },
    deploy: {
      startCommand: `node dist/index.js`,
      healthcheckPath: '/mcp',
      restartPolicyType: 'ON_FAILURE',
    },
    environments: {
      production: {
        variables: {
          PORT: String(port),
          MCP_TRANSPORT: 'http',
          SERVER_NAME: config.name,
          SERVER_VERSION: config.version,
        },
      },
    },
  }
}

export async function deploy(config: DeployConfig): Promise<DeployResult> {
  const manifest = generateManifest(config)
  const json = JSON.stringify(manifest, null, 2)
  // Write railway.json then invoke CLI
  const { writeFileSync } = await import('node:fs')
  writeFileSync('railway.json', json, 'utf8')
  const output = execSync('railway up --json', { encoding: 'utf8' })
  const result = JSON.parse(output) as { url?: string; deploymentUrl?: string }
  const url = result.url ?? result.deploymentUrl ?? ''
  return { url, target: 'railway', manifest }
}
