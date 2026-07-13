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

    if ('confirmationId' in avatar) {
      console.log('Review mode requires confirmation:', avatar);
    } else if ('wait' in avatar) {
      const result = await avatar.wait();
    }

Review mode returns a `PreparedAction` by default. Trusted applications can set
`autoConfirm: true` to confirm Review actions automatically. Creator and
Autopilot connections execute the capabilities enabled by their server-owned
connection policy without an extra SDK approval step.

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
    reelsfarm posts schedule --content-type SLIDESHOW --content-id sl_123 --when 2026-07-01T15:00:00Z --platforms tiktok:conn_123 --agent
    reelsfarm confirm conf_123 --agent

Use `--agent` or set `REELSFARM_AGENT_MODE=1` to receive strict JSON envelopes
on stdout. Agent mode never mixes tables or human narration into command output.
Errors are also JSON on stdout and use a non-zero exit code.

Prepared actions such as generation, scheduling, publishing, updating, and
deleting return a confirmation payload by default in agent mode. Review the
summary, then run `reelsfarm confirm <confirmationId> --agent`. Pass `--yes` only
when the application should automatically confirm Review-mode actions.
`--dry-run` is sent to the server and cannot mutate in Review, Creator, or
Autopilot, even when combined with `--yes`.

The server connection policy is authoritative for direct writes. Creator may
create and edit content but cannot publish or activate automations. Autopilot
may publish and manage automations subject to account limits. Credential,
connection-mode, webhook-security, and permanent-delete actions are
dashboard-only and are not exposed by this package.

## Idempotency and operation recovery

SDK 0.2.0 generates one UUID for every logical mutation and reuses it if the
transport response is ambiguous. Supply `idempotencyKey` on a mutation input,
or `--idempotency-key <key>` in the CLI, when retries must also survive process
restarts. Never reuse a key with different arguments.

The SDK never automatically re-prepares an action after confirmation. It safely
replays the same request once after an ambiguous transport failure and polls the
original durable operation when the server returns one:

    reelsfarm operations get --id op_123 --agent
    reelsfarm operations wait --id op_123 --timeout 30000 --agent

Structured errors distinguish authentication, insufficient scope, policy
denial, rate limiting, idempotency conflict, operation-in-progress, and plan
limits. OAuth profiles retain rotating refresh tokens in the existing protected
profile token store until revoked or a security event requires authorization.

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
