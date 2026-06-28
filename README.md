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

## Using ReelsFarm with AI Agents

ReelsFarm is safe for shell-capable agents when invoked in agent mode:

    reelsfarm agent status
    reelsfarm agent commands
    reelsfarm social connected --agent
    reelsfarm posts schedule --content-type slideshow --content-id sl_123 --when 2026-07-01T15:00:00Z --platforms tiktok:conn_123 --agent
    reelsfarm confirm conf_123 --agent

Use `--agent` or set `REELSFARM_AGENT_MODE=1` to receive strict JSON envelopes
on stdout. Agent mode never mixes tables or human narration into command output.
Errors are also JSON on stdout and use a non-zero exit code.

Prepared actions such as generation, scheduling, publishing, updating, and
deleting return a confirmation payload by default in agent mode. Review the
summary, then run `reelsfarm confirm <confirmationId> --agent`. Pass `--yes` only
when the user has already approved immediate execution. `--dry-run` always wins
over `--yes`.

Direct destructive commands such as `posts cancel`, `webhooks delete`, and
`logout` require `--yes` in agent mode. Start every publishing workflow by
running discovery commands such as `reelsfarm agent status`,
`reelsfarm agent commands`, and `reelsfarm social connected --agent`.

## Endpoint

The default MCP endpoint is https://mcp.reelsfarm.com/mcp. Pass serverUrl in the
SDK or --server-url in the CLI to target another deployment.

## Development

    npm install
    npm run typecheck
    npm test
    npm run build

The checked-in tool manifest intentionally reflects the current ReelsFarm MCP
tool surface. Use npm run generate:tools against an authenticated MCP endpoint
when the server adds or removes tools.
