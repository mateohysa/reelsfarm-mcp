# @reelsfarm/mcp-client

Typed TypeScript SDK and CLI for the ReelsFarm MCP server.

    npm install @reelsfarm/mcp-client

    import { ReelsFarmClient } from '@reelsfarm/mcp-client';

    const rf = new ReelsFarmClient({
      apiKey: process.env.REELSFARM_API_KEY,
    });

    const avatar = await rf.avatars.generate({
      prompt: 'Woman in her 30s, casual outfit, smartphone selfie style',
      model: 'nano-banana-pro',
    });

    const result = await avatar.wait();

## CLI

    npm install -g @reelsfarm/mcp-client
    reelsfarm login --api-key rfmcp_xxx
    reelsfarm whoami
    reelsfarm avatars list
    reelsfarm avatars generate --prompt "Creator selfie style" --wait
    reelsfarm posts list --json

Credentials are resolved in this order: constructor options, environment
variables, then the CLI config file at ~/.reelsfarm/config.json. Set
REELSFARM_CONFIG_DIR to use a different config directory.

## Endpoint

The default MCP endpoint is https://reelsfarm.com/mcp. Pass serverUrl in the
SDK or --server-url in the CLI to target another deployment.

## Development

    npm install
    npm run typecheck
    npm test
    npm run build

The checked-in tool manifest intentionally reflects the current ReelsFarm MCP
tool surface. Use npm run generate:tools against an authenticated MCP endpoint
when the server adds or removes tools.
