# ReelsFarm CLI Skill

Use the `reelsfarm` CLI to create, manage, schedule, and publish ReelsFarm UGC
content from an AI agent. The CLI is designed for universal shell-capable agents
such as Codex, Claude Code, OpenClaw, and similar local assistants.

This skill targets SDK and server `3.3.0` with MCP contract `2026-09-24.1`.

## Install and Auth

```bash
npm install -g @reelsfarm/mcp-client
reelsfarm login --api-key rfmcp_xxx
```

Credentials are read in this order:

1. CLI flags: `--api-key`, `--server-url`, `--profile`.
2. Environment variables: `REELSFARM_API_KEY`, `REELSFARM_ACCESS_TOKEN`,
   `REELSFARM_MCP_URL`, `REELSFARM_AGENT_MODE`, and the development-only
   `REELSFARM_ALLOW_INSECURE_HTTP`.
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
    "code": "AUTHENTICATION_REQUIRED",
    "type": "ReelsFarmAuthError",
    "message": "Missing token",
    "retryable": false,
    "nextStep": "Run reelsfarm login --api-key <key>"
  }
}
```

## Connection Modes and Safety Rules

- Start with discovery before taking action:
  `reelsfarm agent status`, `reelsfarm agent commands`, and
  `reelsfarm social connected --agent`.
- Review returns prepared mutations for confirmation. Confirm only after the
  user approves:
  `reelsfarm confirm <confirmationId> --agent`.
- Creator executes allowed content creation and reversible changes immediately,
  but the server denies publishing and automation activation.
- Autopilot executes publishing and automation actions immediately, subject to
  credits, plan limits, provider limits, and connected-account health.
- Use `--yes` only to auto-confirm a Review-mode prepared action. It does not
  grant capabilities or override the server connection mode.
- `--dry-run` always prevents server execution, including in Creator or
  Autopilot and when combined with `--yes`.
- Every mutation gets a stable idempotency key. Reuse
  `--idempotency-key <key>` only when retrying the same logical action with the
  same arguments.
- Credential, mode, webhook-security, and permanent-delete actions are
  dashboard-only and are intentionally absent from the CLI.

## Result Integrity

- When the user chooses ReelsFarm, use only ReelsFarm commands for image and
  video generation. Do not substitute a native agent image or video generator.
- Treat `executionState` as authoritative. `NOT_STARTED` and `PREPARED` mean no
  action executed. `ENQUEUED` and `PROCESSING` mean no completed asset exists.
- Claim that ReelsFarm created media only when `provider` is `reelsfarm`,
  `executionState` is `COMPLETED`, `assetCreated` is `true`, and the response
  contains the ReelsFarm asset identifier and URL.
- After confirmation, poll the matching job. Do not present the preparation or
  confirmation response as the generated result.
- Product upload sessions accept product images only. Never use them for an
  avatar or an avatar-to-video handoff.

## Canonical Workflows

Discover the environment:

```bash
reelsfarm agent status
reelsfarm agent commands
reelsfarm social connected --agent
```

Generate an avatar:

```bash
reelsfarm avatars generate \
  --prompt "Creator selfie style" \
  --model gpt-image-2.5-sunburst \
  --aspect-ratio 9:16 \
  --quality high \
  --agent
reelsfarm confirm <confirmationId> --agent
```

To animate that avatar, wait for the avatar job to report `COMPLETED`. Pass its
returned ReelsFarm `avatar.imageUrl` to hook generation with a Seedance or Veo
model. Confirm that separate action and poll the hook job until it reports
`COMPLETED` and `assetCreated: true`.

Continue an image generation conversation:

```bash
reelsfarm avatars generate \
  --prompt "Keep the same person and use a tighter crop" \
  --model gpt-image-2.5-sunburst \
  --quality high \
  --reference-url /api/assets/user-generated?key=user-id/image.png \
  --conversation-id 11111111-1111-4111-8111-111111111111 \
  --parent-generation-id 22222222-2222-4222-8222-222222222222 \
  --agent
reelsfarm image-generations conversation \
  --conversation-id 11111111-1111-4111-8111-111111111111 \
  --agent
```

Revise current slideshow text through a conversational instruction:

```bash
reelsfarm slideshows revise-text \
  --instruction "Move the title away from the face" \
  --slides-json '[{"order":0,"textItems":[{"text":"Current title","fontSize":"24px","textStyle":"outline","textPosition":"middle","textAlign":"center"}]}]' \
  --agent
```

Use the same gallery and collection workflow as the web app:

```bash
reelsfarm media-collections gallery --kinds COLLECTION,AVATAR --agent
reelsfarm media-collections create --name "Launch assets" --agent
reelsfarm community collections --source pinterest --agent
```

Inspect and start hook imports:

```bash
reelsfarm hooks import-capabilities --agent
reelsfarm hooks import-clips \
  --items-json '[{"url":"https://youtube.com/shorts/example","start":"0","length":"5"}]' \
  --agent
```

Search AI Clone voices before generation:

```bash
reelsfarm ai-clones voices --search warm --category professional --agent
```

Schedule existing content:

```bash
reelsfarm validate caption "Launch day" --platforms tiktok,instagram --agent
reelsfarm posts preflight \
  --content-type slideshow \
  --content-id 11111111-1111-4111-8111-111111111111 \
  --publish-format video \
  --connection-ids 22222222-2222-4222-8222-222222222222 \
  --agent
reelsfarm posts schedule \
  --content-type slideshow \
  --content-id 11111111-1111-4111-8111-111111111111 \
  --when 2026-09-01T15:00:00Z \
  --publish-format video \
  --platforms tiktok:22222222-2222-4222-8222-222222222222 \
  --caption "Launch day" \
  --agent
reelsfarm confirm <confirmationId> --agent
```

Publish now after explicit approval:

```bash
reelsfarm posts publish-now \
  --content-type ugc-video \
  --content-id 11111111-1111-4111-8111-111111111111 \
  --platforms-json '[{"platform":"TIKTOK","connectionId":"22222222-2222-4222-8222-222222222222","captionOverride":"New drop","tiktokPublishMode":"DIRECT","tiktokPrivacyLevel":"PUBLIC_TO_EVERYONE","tiktokAllowComment":true}]' \
  --caption "New drop" \
  --agent --yes
```

Use only `connectionId`, `tiktokPublishMode`, and `tiktokPrivacyLevel` in MCP
3.0 publishing targets. Do not use `socialConnectionId`,
`externalSocialAccountId`, or `tiktokPostMode`.

Inspect scheduled publishing:

```bash
reelsfarm posts list --agent
reelsfarm posts status --id post_123 --agent
reelsfarm posts optimal-times --platform tiktok --agent
```

Recover an ambiguous mutation without preparing a replacement:

```bash
reelsfarm operations get --id op_123 --agent
reelsfarm operations wait --id op_123 --timeout 30000 --agent
```

## Important Boundaries

This CLI operates on ReelsFarm content and connected ReelsFarm publishing
accounts. It does not add new social platforms, perform local file upload, or
change connection policy. The dashboard-selected mode is authoritative. When
uncertain, use `--dry-run`; never automatically re-prepare after a confirmation
error, and inspect the original operation ID instead.

## Job waits and publishing discovery

All 12 generation, import, and export status methods accept `{ waitMs: 25000 }`.
Use an integer from 0 through 25000. Omit it or use 0 for an immediate snapshot.
The server returns when recorded progress changes, the job ends, or the wait budget expires.
This option does not apply to operation or publish status tools.

```ts
const snapshot = await rf.avatars.getJobStatus(jobId, { waitMs: 25000 });
// A ReelsFarmJob also supports job.getStatus({ waitMs: 25000 }).
console.log(snapshot.jobProgress);
```

`jobProgress` contains `step`, `terminal`, `nextPollAfterMs`, and available batch
counts. Inspect item results even when a batch completes; some items can fail.
The SDK preserves these fields when unwrapping job results. `job.wait()` follows
the server's suggested polling delay, with backoff for older responses.

Publishing preflight targets include `settingsSchema` (JSON Schema 2020-12 for
one `platforms` entry), `rules`, and `limits`. Build settings from the exact
account and media result. `ready` checks account and media readiness; required
settings still need values. Missing limits are unknown. Integration targets
can expose fewer settings than native connections. Run preflight again after
changing the content, format, or account.
