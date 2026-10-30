# ReelsFarm MCP 3.11 migration

SDK `3.11.0` requires ReelsFarm MCP contract `2026-10-30.1`. Tool names are
unchanged, and most code needs no changes.

- Confirmation tools take only `confirmationId`, and the server rejects one sent
  with `dryRun`. A dry-run client now throws `ReelsFarmConfirmationError` with
  code `DRY_RUN_CONFIRMATION` instead of calling a confirmation tool. Confirm
  with a client that is not in dry-run mode.
- `rf.slideshows.list(...)` rows leave out `settings.revisionHistory`. Read one
  slideshow with `rf.slideshows.get(...)` for its revisions.
  `rf.slideshows.update(...)` keeps the saved history when `settings` leaves it
  out.
- `rf.posts.list(...)` returns 20 posts per page unless `limit` says otherwise
  (up to 100); it was 50. Rows no longer carry `createdAt` and `updatedAt`.
- Accounts without a plan or trial can connect and read. Anything that creates,
  changes, publishes, or deletes throws `ReelsFarmPlanLimitError` with code
  `SUBSCRIPTION_REQUIRED` and a `dashboardUrl` for choosing a plan.
- Result text is compact JSON. `structuredContent`, which the SDK returns, is
  unchanged.

# ReelsFarm MCP 3.9 migration

SDK `3.9.2` requires ReelsFarm MCP contract `2026-10-26.1`.

## Confirm each action with its own tool

Servers since MCP 3.7 confirm a prepared action only through the tool named for
it, such as `reelsfarm_confirm_generate_slideshow_text`. Clients can no longer
call `reelsfarm_confirm_action`. SDK 3.6 still called it, so its confirmations
fail, and `validateToolSurface: 'throw'` refuses to connect to the larger catalog.

- `prepareAndConfirm`, `autoConfirm`, and every domain method use the prepared
  result's `confirmationTool`. Nothing changes in code that only reads results.
- If you confirm by hand, call `result.confirmationTool` with
  `{ confirmationId: result.confirmationId }`, or use
  `getConfirmationToolName(sourceTool)`.
- The CLI takes the tool: `reelsfarm confirm <confirmationId> --tool <confirmationTool>`.
  Agent-mode output includes `confirmation.tool` and the full `nextStep` command.

## Other changes

- `rf.slideshows.update(...)` accepts only `status: 'DRAFT'`. Use `finalize(...)`
  to export.
- `rf.community.listCollections(...)` no longer filters by `source`; each
  collection still reports its own.
- Slide `imageUrl` is optional only on an iMessage slide. Classic, tweet,
  notebook, and magazine slides still need a photo.

# ReelsFarm MCP 3.0 migration

SDK `3.0.0` requires ReelsFarm MCP contract `2026-08-22.1`.

## Publishing targets

Use `connectionId` for every OAuth or integration account.

| MCP 2.x input | MCP 3.0 input |
| --- | --- |
| `socialConnectionId` | `connectionId` |
| `externalSocialAccountId` | `connectionId` |
| `tiktokPostMode: "DRAFT"` | `tiktokPublishMode: "DRAFT"` |
| `tiktokPostMode: "PRIVATE"` | `tiktokPublishMode: "DIRECT"` and `tiktokPrivacyLevel: "SELF_ONLY"` |
| `tiktokPostMode: "PUBLIC"` | `tiktokPublishMode: "DIRECT"` and `tiktokPrivacyLevel: "PUBLIC_TO_EVERYONE"` |

The public SDK types and the CLI `--platforms-json` validator reject the removed
aliases. Pending MCP 2.x confirmations can still use the server's internal
legacy decoder until they expire.

## Preflight

Call `rf.posts.preflight(...)` or `reelsfarm posts preflight` before a schedule
or publish action. The result contains typed media details and one readiness
row for each selected account.

## Complete settings

`PlatformTarget` now includes `captionOverride` and the complete TikTok,
YouTube, Instagram, and Facebook settings supported by MCP 3.0. Use
`--platforms-json` in the CLI for these fields.

## Slideshows and automations

Slideshow inputs now use `SlideshowSettings`, `SlideshowSlideInput`, and
`SlideshowTextItem`. Slides support `compositedImageUrl` and `imageOpacity`.

Automation inputs now use the nested `AutomationSchedule`,
`AutomationContent`, `AutomationImages`, and `AutomationPublishRules` types.
Unknown fields are rejected by the MCP server.

## Dashboard-only operations

Billing setup, OAuth setup, credentials, webhook management, and permanent
deletion remain in the ReelsFarm dashboard. They are not public SDK tools.
