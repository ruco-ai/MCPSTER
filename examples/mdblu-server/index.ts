/**
 * mdblu-server — reference implementation
 *
 * Exposes the mdblu template registry to Claude instances.
 *
 * Tools:     get_template(name), list_templates()
 * Resources: templates://{name}
 */

import { createServer } from '../../src/index.js'
import { z } from 'zod'

// Stub registry — in a real implementation this reads from mdblu's store
const templates: Record<string, string> = {
  'daily-note': '# {{date}}\n\n## Tasks\n\n## Notes\n',
  'project-brief': '# {{project}}\n\n## Goal\n\n## Scope\n\n## Timeline\n',
  'retrospective': '# Retro — {{date}}\n\n## What went well\n\n## What to improve\n',
}

createServer({
  name: 'mdblu-server',
  version: '1.0.0',
  scope: process.cwd(),
})
  .defineTool({
    name: 'get_template',
    description: 'Retrieve a template by name',
    schema: z.object({ name: z.string() }),
    handler: async ({ name }) => {
      const template = templates[name]
      if (!template) throw new Error(`Template not found: ${name}`)
      return template
    },
  })
  .defineTool({
    name: 'list_templates',
    description: 'List all available template names',
    schema: z.object({}),
    handler: async () => Object.keys(templates),
  })
  .defineResource({
    uri: 'templates://{name}',
    description: 'Template content by name',
    resolver: async ({ name }) => {
      const template = templates[name]
      if (!template) throw new Error(`Template not found: ${name}`)
      return template
    },
  })
  .start()
