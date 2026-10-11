<p align="center">
  <img src="assets/logo-square.png" alt="ReelsFarm" width="128" />
</p>

# @reelsfarm/mcp-client

Typed TypeScript SDK and CLI for the ReelsFarm MCP server.

## Version 3.5

SDK `3.5.0` matches ReelsFarm MCP server `3.5.0` and contract
`2026-10-07.1`. It tracks all 110 public tools. Mutation and generation results
include explicit ReelsFarm provenance, execution state, and an `assetCreated`
completion signal.

Version 3.5 adds the Videos workbench, Product and Infographics image
templates, slideshow effort presets, the Nano Banana 2.1 avatar model, and the
dashboard gallery and video library filters.

Publishing aliases from MCP 2.x are removed. Read [MIGRATION.md](./MIGRATION.md)
before you update a publishing integration.

    npm install @reelsfarm/mcp-client

    import { ReelsFarmClient, ReelsFarmJob } from '@reelsfarm/mcp-client';

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
    } else if (avatar instanceof ReelsFarmJob) {
      const result = await avatar.wait();
    }

Review mode returns a `PreparedAction` by default. Trusted applications can set
`autoConfirm: true` to confirm Review actions automatically. Creator and
Autopilot connections execute the capabilities enabled by their server-owned
connection policy without an extra SDK approval step.

Use `nano-banana-2-1` for Nano Banana 2.1. The legacy `nano-banana-2-pro` key
also uses 2.1. Use `gpt-image-2.5-sunburst` as the public GPT Image 2.5 model
key. GPT Image 2 and GPT Image 2.5 accept `low`, `medium`, or `high` quality.
Seedream 5.0 Pro accepts `basic` or `high`. Omit `quality` for Nano Banana
models.

## Job waits and publishing discovery

All 13 generation, import, and export status methods accept `{ waitMs: 25000 }`.
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

For a native Instagram video, set `instagramShareToFeed: false` to keep the
Reel in the Reels tab only. Set it to `true` to also allow it on the profile
grid. New native Reels default to `false`. This field is not available for
Instagram integration accounts or photo posts. Check that the selected
account's `settingsSchema` includes it before sending it. `instagramTestReel`
is a separate setting.

Connected and social account lists mark an account `managed: true` when
ReelsFarm connected the Instagram or Facebook account through its managed
integration. Publish to it like any other integration account.

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

Slideshow text generation and revision accept the dashboard `effort` presets:
`light`, `low`, `medium`, `high`, and `extra_high`. Higher effort uses more
visual references (0, 2, 5, 10, or 20) and more model time. `extra_high` also
reviews the rendered text layout and is the dashboard default. Without `effort`,
Max mode accepts up to five visual references; with it, up to 20. Give each reference its slide
`aspectRatio`, because layout checks assume 1:1 when it is missing.

    const textJob = await rf.slideshows.generateText({
      prompt: '8 slides about cold brew at home',
      slideCount: 8,
      maxMode: true,
      effort: 'high',
      visualContext: slideImages.map((imageUrl, order) => ({ order, imageUrl, aspectRatio: '9:16' })),
    });

## Videos workbench

`rf.videos.generateVideo(...)` starts the same job as the dashboard Videos
workbench. It supports text-to-video, a start frame with an optional end frame,
or up to three reference images. Seedance models also accept one reference
video and one reference audio file. Do not combine frames with reference media.
Use owned ReelsFarm asset URLs for frames and references.

    const video = await rf.videos.generateVideo({
      prompt: 'Slow push-in on a latte on a sunny cafe table',
      model: 'seedance-2.5',
      durationSeconds: 8,
      aspectRatio: '9:16',
      category: 'product',
    });

    if (video instanceof ReelsFarmJob) {
      const status = await video.wait();
      console.log(status.video?.id); // Publish it with contentType UGC_VIDEO.
    }

The models are `seedance-2.5` (the default), `seedance-2`, `seedance-2-fast`,
`veo-3.1`, `veo-3.1-fast`, and `gemini-omni-1.1-flash`. Each model supports its
own durations, aspect ratios, and resolutions. `rf.account.getGenerationPricing()`
lists them with per-second prices under `videoGeneration`. Poll with
`rf.videos.getGenerationStatus(jobId, { waitMs: 25000 })`. A completed job
returns the finished library video in `video`.

One video job runs at a time per account, across hooks, AI Clone, and the
Videos workbench. Another request fails with code `VIDEO_JOB_IN_PROGRESS` and
names the active job. Wait for that job to finish, then retry with a new
idempotency key. For an avatar-led hook clip, use `rf.hooks.generate(...)`.

## Image templates

`rf.imageGenerations.listTemplates({ category })` returns the Product and
Infographics templates from the dashboard Images workbench. Each template has a
reference image, a prompt brief with `[PLACEHOLDER]` fields, and the generation
tool to call. Replace the placeholders, remove lines you cannot fill, and start
the prompt with the template `categoryLine`.

    const { templates } = await rf.imageGenerations.listTemplates({ category: 'infographics' });
    const [template] = templates;
    if (template && !template.requiresProduct) {
      await rf.avatars.generate({
        mode: 'reference',
        sourceImageUrl: template.referenceUrl,
        prompt: `${template.categoryLine}\n${filledBrief}`,
        model: template.model,
        aspectRatio: template.aspectRatio,
        quality: template.quality,
      });
    }

For a template with `requiresProduct: true`, call `rf.productScenes.generate(...)`
with `sourceImageUrl` set to `referenceUrl` and `productImageUrl` set to the
product photo. `peopleTemplate` gives the brief and settings for the people
reference images from `rf.avatars.listTemplates()`.

SDK 3.5.0 also maps the web content library workflows directly:

    const gallery = await rf.mediaCollections.listGallery({ kinds: ['COLLECTION', 'AVATAR'] });
    const collections = await rf.mediaCollections.list();
    const communityImages = await rf.community.listImages(collectionId, { random: true });
    const voices = await rf.aiClones.listVoices({ search: 'warm' });
    const importJob = await rf.hooks.importClips({
      items: [{ url: youtubeUrl, start: "0", length: "5" }],
    });
    const infographics = await rf.mediaCollections.listGallery({
      kinds: ['AVATAR', 'PRODUCT_PLACEMENT'],
      imageCategory: 'infographics',
      groupCollections: true,
    });
    const firstItems = await rf.mediaCollections.getItems(collectionId, 'all', { limit: 50 });
    const { totalCount } = await rf.videos.list({ category: 'people' });

`imageCategory` filters generated images only, so set `kinds` to return images
only. `groupCollections: true` returns each collection as one item, as the
dashboard gallery tabs do. Collection items arrive in one response unless you
set `limit` or `cursor`; then follow `nextCursor` until `hasMore` is false. Video
lists return `totalCount`, and the first asset page returns the category
`totalCount`. Use these totals instead of counting a page.

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
    reelsfarm image-generations templates --category product
    reelsfarm account pricing
    reelsfarm videos generate --prompt "Slow push-in on a latte" --model seedance-2.5 --duration 8 --aspect-ratio 9:16 --wait
    reelsfarm videos list --category product
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

SDK 3.5.0 generates one UUID for every logical mutation and reuses it if the
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
limits. A rejected automation request is a `ReelsFarmValidationError` with code
`INVALID_AUTOMATION`. An active video job conflict is a retryable
`ReelsFarmToolError` with code `VIDEO_JOB_IN_PROGRESS`. OAuth profiles retain
rotating refresh tokens in the existing protected profile token store until
revoked or a security event requires authorization.

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
out of the public SDK catalog. The manifest check compares the 110 public SDK
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

Edit a post before it publishes with `rf.posts.update(...)`. Name each existing
destination by `platform` and `connectionId` (`accountId` in
`rf.posts.list(...)`); omitted fields keep their saved values, and media and
accounts cannot change. Switching TikTok to `DIRECT` needs
`tiktokPrivacyLevel` and, for video, `tiktokIsAigc`. The edit fails once the
post has started publishing.

    await rf.posts.update(scheduledPostId, {
      caption: 'New caption',
      platforms: [{
        platform: 'TIKTOK',
        connectionId: tiktokConnectionId,
        tiktokPublishMode: 'DIRECT',
        tiktokPrivacyLevel: 'PUBLIC_TO_EVERYONE',
        tiktokIsAigc: true,
      }],
    });

On the CLI, use `reelsfarm posts update --id <id> --platforms-json <json>`.

## Automations

Automation `tiktokSettings` accept the same settings as a TikTok publishing
target, including `tiktokPublishMode`, `tiktokPrivacyLevel`, `tiktokTitle`, the
interaction and disclosure flags, and the cover settings. `tiktokPostMode`
remains a legacy alias; `tiktokPublishMode` and `tiktokPrivacyLevel` take
priority over it.

An `ACTIVE` automation needs a `tiktokTitle` of 1 to 90 characters and either
at least one image collection or a fixed image on every slide. Commercial
content needs `tiktokBrandOrganic`, `tiktokBrandedContent`, or both, and
branded content cannot use `SELF_ONLY` privacy. The server checks each request
before approval.

To rotate captions across runs, put each caption in square brackets, for
example `[First caption][Second caption]`. `rf.automations.update(...)` keeps
omitted top-level fields, replaces `images`, and merges `publishRules` field by
field. A new `caption` replaces a saved TikTok `captionOverride`.

    await rf.automations.update(automationId, {
      status: 'ACTIVE',
      publishRules: {
        caption: '[Morning tip][Evening tip]',
        tiktokSettings: {
          tiktokPublishMode: 'DIRECT',
          tiktokPrivacyLevel: 'PUBLIC_TO_EVERYONE',
          tiktokTitle: 'Daily skincare tip',
        },
      },
    });
