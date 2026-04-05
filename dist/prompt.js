export function registerPrompt(sdk, def) {
    sdk.registerPrompt(def.name, { description: def.description }, async (args) => {
        const text = await def.handler(args);
        return {
            messages: [{ role: 'user', content: { type: 'text', text } }],
        };
    });
}
