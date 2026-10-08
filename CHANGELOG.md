# Changelog

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
