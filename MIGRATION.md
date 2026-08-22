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
