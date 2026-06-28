# ReelsFarm CLI Skill

Use the `reelsfarm` CLI to create, manage, schedule, and publish ReelsFarm UGC
content from an AI agent. The CLI is designed for universal shell-capable agents
such as Codex, Claude Code, OpenClaw, and similar local assistants.

## Install and Auth

```bash
npm install -g @reelsfarm/mcp-client
reelsfarm login --api-key rfmcp_xxx
```

Credentials are read in this order:

1. CLI flags: `--api-key`, `--server-url`, `--profile`.
2. Environment variables: `REELSFARM_API_KEY`, `REELSFARM_ACCESS_TOKEN`,
   `REELSFARM_MCP_URL`, `REELSFARM_AGENT_MODE`.
3. The profile config at `~/.reelsfarm/config.json`.

Set `REELSFARM_AGENT_MODE=1` or pass `--agent` for strict agent output.

## Agent Output Contract

Always use `--agent` when you are an AI agent. Agent mode writes one JSON object
to stdout and no human text.

Success:

```json
{ "ok": true, "command": "posts.list", "data": {} }
```

Confirmation required:

```json
{
  "ok": true,
  "command": "posts.schedule",
  "requiresConfirmation": true,
  "confirmation": {
    "id": "conf_123",
    "expiresAt": "2026-07-01T15:00:00.000Z",
    "summary": "Schedule slideshow sl_123 to TikTok",
    "creditEstimate": null
  },
  "nextStep": "reelsfarm confirm conf_123 --agent"
}
```

Error:

```json
{
  "ok": false,
  "error": {
    "code": "AUTH_MISSING",
    "type": "ReelsFarmAuthError",
    "message": "Missing token",
    "retryable": false,
    "nextStep": "Run reelsfarm login --api-key <key>"
  }
}
```

## Safety Rules

- Start with discovery before taking action:
  `reelsfarm agent status`, `reelsfarm agent commands`, and
  `reelsfarm social connected --agent`.
- In agent mode, prepared write actions return a confirmation instead of
  executing immediately.
- Confirm only after the user approves:
  `reelsfarm confirm <confirmationId> --agent`.
- Use `--yes` only when the user has already approved immediate execution.
- `--dry-run` always wins over `--yes`.
- Direct destructive commands require `--yes` in agent mode:
  `posts cancel`, `webhooks delete`, and `logout`.

## Canonical Workflows

Discover the environment:

```bash
reelsfarm agent status
reelsfarm agent commands
reelsfarm social connected --agent
```

Generate an avatar:

```bash
reelsfarm avatars generate --prompt "Creator selfie style" --agent
reelsfarm confirm <confirmationId> --agent
```

Schedule existing content:

```bash
reelsfarm validate caption "Launch day" --platforms tiktok,instagram --agent
reelsfarm posts schedule \
  --content-type slideshow \
  --content-id sl_123 \
  --when 2026-07-01T15:00:00Z \
  --platforms tiktok:conn_123 \
  --caption "Launch day" \
  --agent
reelsfarm confirm <confirmationId> --agent
```

Publish now after explicit approval:

```bash
reelsfarm posts publish-now \
  --content-type video \
  --content-id vid_123 \
  --platforms tiktok:conn_123 \
  --caption "New drop" \
  --agent --yes
```

Inspect scheduled publishing:

```bash
reelsfarm posts list --agent
reelsfarm posts status --id post_123 --agent
reelsfarm posts optimal-times --platform tiktok --agent
```

## Important Boundaries

This CLI operates on ReelsFarm content and connected ReelsFarm publishing
accounts. It does not add new social platforms, perform local file upload, or
replace user approval. When uncertain, return a dry run or confirmation payload
and ask the user before executing.
