# Changelog

## 3.9.2 - 2026-10-26

- Match server 3.9.2 and contract `2026-10-26.1`. The tool list and inputs are
  unchanged; client code needs no changes.
- Server fixes since 3.9.0 that SDK calls now get:
  - `rf.avatars.generate(...)`, product scenes and hook clip imports no longer fail
    with "returned an invalid structured result" in Creator and Autopilot after
    the job had started and was charged. Their results now include `createdAt`
    (avatars, product scenes) or `total` (hook imports).
  - `rf.imageGenerations.getJob(...)`, `listActive()` and conversations no longer
    fail on GPT Image and Seedream jobs; `input.quality` is returned.
  - `saveFormat` accepts `content.recreateUrl`, `finalize` keeps a sent slide
    `design`, and `generateText` with a `format` and no `slideCount` uses the
    format's slide count.

## 3.9.0 - 2026-10-23

- Match server 3.9.0 and contract `2026-10-23.1`; track all 177 public tools.
- Confirm each prepared action with its own confirmation tool, named in the
  prepared result's `confirmationTool`. Servers since 3.7 reject
  `reelsfarm_confirm_action` from clients, so 3.6 confirmations failed.
  `reelsfarm confirm` now takes `--tool`, and agent output names it.
- Add `getConfirmationToolName(...)` and a `confirmation` flag in the tool manifest.
- Slideshows: `design` (the Look) and `format` on `generateText`; designed slides
  (`SlideDesign`) on create, update, revise, and finalize; iMessage slides with no
  `imageUrl`; TikTok `textFont`, `textEffect`, `textColor`, and free `textX`/`textY`.
- Add `rf.slideshows.recreate(...)`, `searchPhotos`, `savePhotos`, saved formats
  (`listFormats`, `saveFormat`, `archiveFormat`), and batches (`createBatch`,
  `listBatches`, `getBatch`, `retryBatchItem`, `excludeBatchItem`), with matching
  CLI commands.
- Automations: `slidesCountMax`, `textLooks`, `recreateUrl`, `provenFormat`,
  `design`, `photoSources`, and `generatedPhotos`.
- Videos: `motionPreset` and `naturalSpeech`. Hooks: the new reaction presets
  (`shocked`, `grateful`, `looks_up`, `fed_up`, `confident`).
- Product contexts: an optional `imageUrl` and `rf.productContexts.update(...)`.
  Add `rf.prompts.save(...)`.
- `slideshows.update` accepts only `status: 'DRAFT'`; community collections no
  longer filter by `source`.
- Includes the 3.6.1 CLI fix for starting through npm's bin link.

## 3.6.1 - 2026-10-11

- Fix the `reelsfarm` CLI doing nothing when started through npm's bin link, as
  with `npx reelsfarm`, a global install, or `node_modules/.bin/reelsfarm`. The
  entry check compared an unresolved symlink path with the module path.
- `SDK_VERSION` stays `3.6.0`, the MCP server release this client matches.

## 3.6.0 - 2026-10-11

- Match server 3.6.0 and contract `2026-10-11.1`; the 110 public tool names are unchanged.
- `rf.posts.update(...)` accepts `platforms` to change the settings of a scheduled
  post's existing destinations, such as TikTok delivery, privacy and disclosures.
  Omitted fields keep their saved values. Export `UpdateScheduledPostParams`.
- `reelsfarm posts update` accepts `--timezone` and `--platforms-json`.

## 3.5.0 - 2026-10-08

- Match server 3.5.0 and contract `2026-10-07.1`; track 110 public tools.
- Add `rf.videos.generateVideo(...)`, `rf.videos.getGenerationStatus(...)`, and
  `reelsfarm videos generate|status|list` for the Videos workbench.
- Add `reelsfarm account pricing` for credit costs and per-model video limits.
- Add `rf.imageGenerations.listTemplates(...)` and
  `reelsfarm image-generations templates` for Product and Infographics templates.
- Add the `nano-banana-2-1` avatar model.
- Add slideshow text `effort` presets and per-reference `aspectRatio`; Max mode
  accepts up to 20 visual references with `effort`.
- Add gallery `imageCategory` and `groupCollections`, collection item paging,
  and the video library `category` filter. Type video lists with `totalCount`.
- Type the complete automation TikTok settings, including `tiktokTitle`.
- Classify `INVALID_AUTOMATION` as a validation error and `VIDEO_JOB_IN_PROGRESS`
  as a retryable conflict with its own CLI agent code.
- Use `instanceof ReelsFarmJob` in the README job examples.

## 3.4.0 - 2026-09-27

- Match server 3.4.0 and contract `2026-09-27.1`.
- Add `instagramShareToFeed` to native Instagram Reel target types and runtime validation.
- Document the Reels tab default and account-specific preflight requirement.

## 3.3.0 - 2026-09-25

- Match server 3.3.0 and contract `2026-09-24.1`; the 107 public tool names are unchanged.
- Expose optional `waitMs` on all 12 generation, import, and export status methods and job handles.
- Preserve `jobProgress` and result provenance when unwrapping status and image conversation results.
- Recognize normalized terminal job states and use server polling guidance.
- Add the four newer creative Trash restore types and mark action confirmation as destructive.
- Type publishing preflight `settingsSchema`, `rules`, and `limits`.

## 3.2.0 - 2026-09-16

- Match ReelsFarm MCP server `3.2.0` and contract `2026-09-16.1`.
- Add typed ReelsFarm provider, execution-state, asset-created, and result-message fields.
- Document the safe avatar-to-Seedance handoff through completed ReelsFarm asset URLs.
- Prohibit using product upload sessions for avatar handoff.

## 3.1.0 - 2026-09-12

- Match ReelsFarm MCP server `3.1.0` and contract `2026-09-12.1`.
- Add `gpt-image-2.5-sunburst` to the typed avatar model contract.
- Add typed avatar quality controls for GPT Image and Seedream models.
- Add avatar `--aspect-ratio`, `--quality`, and `--style-mode` CLI flags.
- Include avatar quality in image-generation conversation snapshots.

## 3.0.0 - 2026-08-22

- Match ReelsFarm MCP server `3.0.0` and contract `2026-08-22.1`.
- Track all 107 public tools.
- Add `rf.posts.preflight(...)` and `reelsfarm posts preflight`.
- Add the complete canonical platform target contract.
- Remove public publishing aliases from SDK types and CLI JSON validation.
- Add canonical slideshow and automation input and output types.
- Add release, contract, manifest, and workflow parity checks.
- Keep dashboard-only administrative tools out of the public catalog.
