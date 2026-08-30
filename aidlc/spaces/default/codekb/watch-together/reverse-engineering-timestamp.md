# Reverse Engineering Timestamp

- **Date performed**: 2026-08-30
- **Intent**: `260830-onboarding-prep`
- **Repo**: `watch-together` (root `./`)
- **Commit**: `e5f1ca34c861dfe1630968ce697e60e84d202204` (short `e5f1ca3`, branch `master`)
- **Breadth**: full rescan (no prior code knowledge store) · **Depth**: Standard
- **Project type**: Brownfield · **Conversation language**: English
- **Pipeline**: developer scan (link 1) → architect synthesis (link 2, final)

This run wholesale-produced all 9 CodeKB artifacts from a full deep scan; no
prior store was merged. The synthesis is grounded in the developer scan handoff
plus targeted reads of the real-time sync core, message/reaction stores, and the
WebTorrent delivery module to verify the interaction diagrams in
[architecture.md](architecture.md).

## Scope of Analysis

```yaml
scope_version: 1
kind: full
intent: 260830-onboarding-prep
fingerprint: f2d74df17089649aba4f39a11f85f8954464e0d3
analyzed:
  paths:
    - ./
    - package.json
    - vite.config.ts
    - svelte.config.js
    - tsconfig.json
    - Dockerfile
    - Makefile
    - buildargs.sh
    - nginx.conf
    - README.md
    - clean-db.js
    - stats.js
    - .github/workflows/
    - src/main.ts
    - src/settings.ts
    - src/App.svelte
    - src/analytics.svelte
    - src/destructable.ts
    - src/utils.ts
    - src/normalize-source.ts
    - src/i18n/
    - src/stores/
    - src/stores/room/
    - src/components/
    - src/components/controls/
    - src/components/video-player/
  components:
    - Application Bootstrap
    - Settings / Configuration
    - Root UI Shell
    - Real-Time Sync Core
    - Device & Identity Stores
    - WebTorrent Delivery
    - Source Normalizer
    - Video Player Subsystem
    - Controls Subsystem
    - Chat, Reactions & Presence
    - Analytics
    - Internationalization
    - Utilities
    - Admin Scripts
    - Build & Deploy Tooling
shallow:
  paths:
    - src/i18n/fr.ts
    - src/i18n/ru.ts
    - src/app.scss
    - src/app.d.ts
    - src/vite-env.d.ts
    - static/
```
