import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { connectStdio } from './transport/stdio.js';
import { registerTool } from './tool.js';
import { registerResource } from './resource.js';
import { registerPrompt } from './prompt.js';
import { applySetup } from './setup.js';
class McpsterServerImpl {
    sdk;
    config;
    toolNames = [];
    constructor(config) {
        this.config = config;
        this.sdk = new McpServer({
            name: config.name,
            version: config.version,
        });
    }
    defineTool(def) {
        registerTool(this.sdk, def);
        this.toolNames.push(def.name);
        return this;
    }
    defineResource(def) {
        registerResource(this.sdk, def);
        return this;
    }
    definePrompt(def) {
        registerPrompt(this.sdk, def);
        return this;
    }
    async setup(options) {
        applySetup(this.config.name, this.toolNames, options);
        return this;
    }
    async start() {
        await connectStdio(this.sdk);
    }
}
export function createServer(config) {
    return new McpsterServerImpl(config);
}
