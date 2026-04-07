import { describe, it, expect } from 'vitest'
import { generateManifest as railwayManifest } from '../src/deploy/railway.js'
import { generateManifest as flyManifest, generateDockerfile } from '../src/deploy/fly.js'
import { generateManifest as cfManifest, manifestToToml, generateWorkerShim } from '../src/deploy/cloudflare.js'

const config = { name: 'test-server', version: '1.0.0', port: 3000 }

describe('railway adapter dry-run', () => {
  it('generates a valid railway manifest', () => {
    const manifest = railwayManifest(config)
    expect(manifest['$schema']).toContain('railway')
    expect(manifest.deploy.startCommand).toBeDefined()
    expect(manifest.deploy.healthcheckPath).toBe('/mcp')
    expect(manifest.environments.production.variables.PORT).toBe('3000')
    expect(manifest.environments.production.variables.SERVER_NAME).toBe('test-server')
  })

  it('sets default port 3000 when not specified', () => {
    const m = railwayManifest({ name: 'srv', version: '0.1.0' })
    expect(m.environments.production.variables.PORT).toBe('3000')
  })
})

describe('fly adapter dry-run', () => {
  it('generates a valid fly manifest', () => {
    const manifest = flyManifest(config)
    expect(manifest.app).toBe('test-server')
    expect(manifest.primary_region).toBe('iad')
    const env = manifest.env as Record<string, string>
    expect(env.SERVER_NAME).toBe('test-server')
    expect(env.MCP_TRANSPORT).toBe('http')
  })

  it('respects custom region', () => {
    const manifest = flyManifest({ ...config, region: 'lhr' })
    expect(manifest.primary_region).toBe('lhr')
  })

  it('generates a Dockerfile with node base image', () => {
    const dockerfile = generateDockerfile()
    expect(dockerfile).toContain('FROM node:')
    expect(dockerfile).toContain('EXPOSE 3000')
    expect(dockerfile).toContain('dist/index.js')
  })
})

describe('cloudflare adapter dry-run', () => {
  it('generates a valid wrangler manifest', () => {
    const manifest = cfManifest(config)
    expect(manifest.name).toBe('test-server')
    expect(manifest.main).toBe('worker.js')
    expect(manifest.compatibility_date).toBeDefined()
    expect(manifest.vars.SERVER_NAME).toBe('test-server')
  })

  it('serialises manifest to valid TOML', () => {
    const manifest = cfManifest(config)
    const toml = manifestToToml(manifest)
    expect(toml).toContain('name = "test-server"')
    expect(toml).toContain('main = "worker.js"')
    expect(toml).toContain('[vars]')
    expect(toml).toContain('SERVER_NAME = "test-server"')
  })

  it('generates a worker shim that references the server', () => {
    const shim = generateWorkerShim(config)
    expect(shim).toContain("createServer")
    expect(shim).toContain('test-server')
    expect(shim).toContain('export default')
  })
})
