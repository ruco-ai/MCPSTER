import { McpServer, ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js';
import { connectStdio } from './transport/stdio.js';
function parseUriParams(template) {
    return [...template.matchAll(/\{(\w+)\}/g)].map(m => m[1]);
}
class McpsterServerImpl {
    sdk;
    constructor(config) {
        this.sdk = new McpServer({
            name: config.name,
            version: config.version,
        });
    }
    defineTool(def) {
        const shape = def.schema.shape;
        this.sdk.registerTool(def.name, {
            description: def.description,
            inputSchema: shape,
        }, async (args) => {
            try {
                const result = await def.handler(args);
                const text = typeof result === 'string' ? result : JSON.stringify(result);
                return { content: [{ type: 'text', text }] };
            }
            catch (err) {
                const message = err instanceof Error ? err.message : String(err);
                return { content: [{ type: 'text', text: message }], isError: true };
            }
        });
        return this;
    }
    defineResource(def) {
        const params = parseUriParams(def.uri);
        if (params.length === 0) {
            // Static resource
            this.sdk.registerResource(def.uri, def.uri, { description: def.description }, async () => {
                const text = await def.resolver({});
                return { contents: [{ uri: def.uri, text }] };
            });
        }
        else {
            // Templated resource
            const template = new ResourceTemplate(def.uri, { list: undefined });
            this.sdk.registerResource(def.uri, template, { description: def.description }, async (uri, variables) => {
                const params = {};
                for (const [k, v] of Object.entries(variables)) {
                    params[k] = Array.isArray(v) ? v[0] : String(v);
                }
                const text = await def.resolver(params);
                return { contents: [{ uri: uri.toString(), text }] };
            });
        }
        return this;
    }
    definePrompt(def) {
        this.sdk.registerPrompt(def.name, { description: def.description }, async () => {
            const text = await def.handler({});
            return {
                messages: [{ role: 'user', content: { type: 'text', text } }],
            };
        });
        return this;
    }
    async start() {
        await connectStdio(this.sdk);
    }
}
export function createServer(config) {
    return new McpsterServerImpl(config);
}
