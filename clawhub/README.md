# ClawHub skills

Agent skills for the `reelsfarm` CLI, published on [ClawHub](https://clawhub.ai) under `@mateohysa`. Each folder is one skill.

| Skill | Covers |
| --- | --- |
| `reelsfarm` | Setup, discovery, connection modes, errors |
| `reelsfarm-tiktok-slideshows` | Slide text, Looks, proven formats, Recreate, photo search, render and MP4 |
| `reelsfarm-ai-avatars` | Avatar images, templates, follow-up edits |
| `reelsfarm-product-photos` | Product imports, product scenes, product and infographic templates |
| `reelsfarm-ai-videos` | Videos workbench and avatar hook clips |
| `reelsfarm-social-scheduler` | Caption checks, preflight, scheduling and publishing |

The Setup, Running actions, and Results sections are the same in every skill. Change them in all six.

ClawHub publishes every skill as MIT-0 and keeps a release hidden until its security scan passes. Its [acceptable usage policy](https://github.com/openclaw/clawhub/blob/main/docs/acceptable-usage.md) bans face swap, cloned influencers, and mass posting, so Face Swap, AI Clone, and hook imports stay out of these skills.

## Publish a change

```bash
npx -y clawhub@0.24.1 login
npx -y clawhub@0.24.1 skill publish ./reelsfarm-tiktok-slideshows --slug reelsfarm-tiktok-slideshows --changelog "What changed"
```

Run it from this folder. A changed skill gets the next patch version. Categories and topics stay as stored unless you pass `--categories` or `--topics` again.
