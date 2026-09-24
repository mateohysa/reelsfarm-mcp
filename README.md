<p align="center">
  <img src="assets/logo-square.png" alt="ReelsFarm" width="128" />
</p>

# @reelsfarm/mcp-client

Typed TypeScript SDK and CLI for the ReelsFarm MCP server.

## Version 3.3

SDK `3.3.0` matches ReelsFarm MCP server `3.3.0` and contract
`2026-09-24.1`. It tracks all 107 public tools. Mutation and generation results
now include explicit ReelsFarm provenance, execution state, and an
`assetCreated` completion signal.

Publishing aliases from MCP 2.x are removed. Read [MIGRATION.md](./MIGRATION.md)
before you update a publishing integration.

    npm install @reelsfarm/mcp-client

    import { ReelsFarmClient } from '@reelsfarm/mcp-client';

    const rf = new ReelsFarmClient({
      apiKey: process.env.REELSFARM_API_KEY,
      validateToolSurface: 'throw',
    });

    await rf.ready();

    const avatar = await rf.avatars.generate({
      prompt: 'Woman in her 30s, casual outfit, smartphone selfie style',
      model: 'gpt-image-2.5-sunburst',
      aspectRatio: '9:16',
      quality: 'high',
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

Use `gpt-image-2.5-sunburst` as the public GPT Image 2.5 model key. GPT Image 2
and GPT Image 2.5 accept `low`, `medium`, or `high` quality. Seedream 5.0 Pro
accepts `basic` or `high`. Omit `quality` for Nano Banana models.

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

## Conversational generation

Avatar and product-scene jobs return `conversationId`, `parentGenerationId`,
and `jobId`. Pass the conversation and parent IDs into the next generation to
continue the same branch. Read the complete branch through
`rf.imageGenerations.getConversation(conversationId)`.

    const nextAvatar = await rf.avatars.generate({
      prompt: 'Keep the same person and use a tighter crop',
      sourceImageUrl: previousImageUrl,
      conversationId,
      parentGenerationId: previousJobId,
    });

Hook generation accepts `customPrompt`, all current Veo and Seedance models,
duration, and optional spoken script settings. Slideshow generation accepts
Max mode visual context. Use `rf.slideshows.reviseText(...)` to apply a natural
language instruction to the complete current slide text state.

SDK 3.3.0 also maps the web content library workflows directly:

    const gallery = await rf.mediaCollections.listGallery({ kinds: ['COLLECTION', 'AVATAR'] });
    const collections = await rf.mediaCollections.list();
    const communityImages = await rf.community.listImages(collectionId, { random: true });
    const voices = await rf.aiClones.listVoices({ search: 'warm' });
    const importJob = await rf.hooks.importClips({
      items: [{ url: youtubeUrl, start: "0", length: "5" }],
    });

The same MCP contracts now cover the unified gallery, personal media
collections, community images, hook import health and jobs, AI Clone voice
search, product-context URL suggestions, saved character identity extraction,
and all eight creative Trash item types: avatars, product placements, videos,
slideshows, stored assets, saved characters, drafts, and product contexts. Use the
exact type and ID returned by `rf.trash.list()` when restoring. Permanent deletion
remains dashboard-only.

## Protocol and OAuth

The SDK uses the stable MCP TypeScript SDK v2. It probes for the 2026-07-28
protocol and falls back to the legacy 2025 handshake when required.

OAuth clients should request only the capabilities they need. The default
remains `mcp:full` for compatibility:

    const rf = new ReelsFarmClient({
      oauth: {
        redirectUri: 'http://127.0.0.1:3456/callback',
        scopes: ['content:read', 'content:generate'],
        onAuthorizationUrl: openInBrowser,
      },
    });

    await rf.raw.listTools();
    await rf.completeOAuthCallback(callbackUrl);

Pass the complete callback URL to `completeOAuthCallback`. The SDK validates
the redirect URL, OAuth state, and authorization-server issuer before it
redeems the code. The SDK does not expose a raw authorization-code completion
method because that form cannot validate state by itself.

## CLI

    npm install -g @reelsfarm/mcp-client
    reelsfarm login --api-key rfmcp_xxx
    reelsfarm whoami
    reelsfarm avatars list
    reelsfarm avatars generate --prompt "Creator selfie style" --model gpt-image-2.5-sunburst --aspect-ratio 9:16 --quality high --wait
    reelsfarm media-collections gallery --kinds COLLECTION,AVATAR
    reelsfarm ai-clones voices --search warm
    reelsfarm hooks import-capabilities
    reelsfarm posts preflight --content-type SLIDESHOW --content-id 11111111-1111-4111-8111-111111111111 --publish-format VIDEO --connection-ids 22222222-2222-4222-8222-222222222222 --agent
    reelsfarm posts list --json

Credentials are resolved in this order: constructor options, environment
variables, then the CLI config file at ~/.reelsfarm/config.json. Set
REELSFARM_CONFIG_DIR to use a different config directory.

## Using ReelsFarm with AI Agents

ReelsFarm is safe for shell-capable agents when invoked in agent mode:

    reelsfarm agent status
    reelsfarm agent commands
    reelsfarm social connected --agent
    reelsfarm posts schedule --content-type SLIDESHOW --content-id 11111111-1111-4111-8111-111111111111 --when 2026-09-01T15:00:00Z --platforms tiktok:22222222-2222-4222-8222-222222222222 --publish-format VIDEO --agent
    reelsfarm confirm conf_123 --agent

Use `--agent` or set `REELSFARM_AGENT_MODE=1` to receive strict JSON envelopes
on stdout. Agent mode never mixes tables or human narration into command output.
Errors are also JSON on stdout and use a non-zero exit code.

Prepared actions such as generation, scheduling, publishing, updating, and
deleting return a confirmation payload in Review mode. Creator and Autopilot
can execute allowed actions immediately; agent mode only controls output. When
a confirmation is returned, review the summary, then run `reelsfarm confirm <confirmationId> --agent`. Pass `--yes` only
when the application should automatically confirm Review-mode actions.
`--dry-run` is sent to the server and cannot mutate in Review, Creator, or
Autopilot, even when combined with `--yes`.

The server connection policy is authoritative for direct writes. Creator may
create and edit content but cannot publish or activate automations. Autopilot
may publish and manage automations subject to account limits. Credential,
connection-mode, webhook-security, and permanent-delete actions are
dashboard-only and are not exposed by this package.

## Idempotency and operation recovery

SDK 3.3.0 generates one UUID for every logical mutation and reuses it if the
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

The default MCP endpoint is https://mcp.reelsfarm.com/mcp. Pass `serverUrl` in
the SDK or `--server-url` in the CLI to target another deployment. The SDK
rejects non-loopback plaintext HTTP by default. Set `allowInsecureHttp: true`
or `REELSFARM_ALLOW_INSECURE_HTTP=1` only for a trusted private development
endpoint. The CLI also accepts `--allow-insecure-http`.

## Development

    npm install
    npm run typecheck
    npm test
    npm run check:manifest
    npm run build

The checked-in tool manifest reflects the current discoverable ReelsFarm MCP
surface. Dashboard-only credential, webhook, and permanent-delete tools stay
out of the public SDK catalog. The manifest check compares the 107 public SDK
tools, release version, and contract version with the local app MCP catalog
when both repositories are adjacent. Use
npm run generate:tools against an authenticated MCP endpoint when the server
adds or removes tools.

## Publishing preflight and platform settings

Run preflight before a schedule or publish call. The server repeats preflight
before it creates or executes the action.

    const readiness = await rf.posts.preflight({
      contentType: 'SLIDESHOW',
      contentId: slideshowId,
      publishFormat: 'VIDEO',
      connectionIds: [tiktokConnectionId, youtubeConnectionId],
    });

    const scheduled = await rf.posts.schedule({
      contentType: 'SLIDESHOW',
      contentId: slideshowId,
      publishFormat: 'VIDEO',
      scheduledFor: '2026-09-01T15:00:00.000Z',
      platforms: [{
        platform: 'TIKTOK',
        connectionId: tiktokConnectionId,
        captionOverride: 'TikTok caption',
        tiktokPublishMode: 'DIRECT',
        tiktokPrivacyLevel: 'PUBLIC_TO_EVERYONE',
        tiktokAllowComment: true,
        tiktokCommercialContentEnabled: false,
      }, {
        platform: 'YOUTUBE',
        connectionId: youtubeConnectionId,
        youtubeTitle: 'Launch Short',
        youtubePrivacyStatus: 'UNLISTED',
        youtubeMadeForKids: false,
        youtubeContainsSyntheticMedia: true,
      }],
    });

The CLI accepts simple `platform:connectionId` pairs. Use `--platforms-json`
when you need captions or platform settings.
