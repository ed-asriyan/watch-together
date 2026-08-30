# Developer Code Scan — Reverse Engineering (link 1)

- **Intent**: `260830-onboarding-prep`
- **Repo root**: `/workspaces/watch-together/` (snapshot path `./`)
- **Breadth**: full rescan · **Depth**: Standard
- **Project type**: Brownfield
- **Commit**: `e5f1ca3` (branch `master`)
- **Conversation language**: English

## Developer Code Scan Results

### Scan Coverage

- **Analyzed deeply**:
  - `package.json`
  - `vite.config.ts`
  - `svelte.config.js`
  - `tsconfig.json`
  - `Dockerfile`
  - `Makefile`
  - `buildargs.sh`
  - `nginx.conf`
  - `README.md`
  - `clean-db.js`
  - `stats.js`
  - `.github/workflows/CI.yml`
  - `.github/workflows/CD.yml`
  - `.github/workflows/build.yml`
  - `.github/workflows/clean-db.yml`
  - `src/main.ts`
  - `src/settings.ts`
  - `src/App.svelte`
  - `src/analytics.svelte`
  - `src/destructable.ts`
  - `src/utils.ts`
  - `src/normalize-source.ts`
  - `src/i18n/index.ts`
  - `src/i18n/_.ts`
  - `src/stores/blob.ts`
  - `src/stores/clock.ts`
  - `src/stores/cursor.ts`
  - `src/stores/me.ts`
  - `src/stores/user.ts`
  - `src/stores/local-store.ts`
  - `src/stores/web-torrent.ts`
  - `src/stores/video-example.ts`
  - `src/stores/room/index.ts`
  - `src/stores/room/bound-store.ts`
  - `src/stores/room/bound-timed-store.ts`
  - `src/stores/room/bound-current-time.ts`
  - `src/stores/room/bound-minutes-watched.ts`
  - `src/stores/room/bound-users.ts`
  - `src/stores/room/bound-messages.ts`
  - `src/components/index.svelte`
  - `src/components/controls/index.svelte`
  - `src/components/video-player/index.svelte`
  - `src/components/video-player/video-player-vidstack.svelte`
  - `src/components/video-player/player-magnet.svelte`
  - `src/components/video-player/inplayer.svelte`
  - `src/components/video-player/explore-url.ts`
  - `src/components/video-player/chat/index.svelte`
- **Skimmed only**:
  - `src/components/` (remaining `.svelte` leaf views: `header.svelte`, `room.svelte`, `fullscreen.svelte`, `loader.svelte`, `scroll-icon.svelte`, `interpolator.svelte`, `jurisdictional-bullshit-banner.svelte`, `controls/card-*`, `controls/language-selector.svelte`, `controls/video-selector-btn.svelte`, `controls/card-users/**`, `video-player/lock.svelte`, `video-player/online/**`, `video-player/reactions/**`, `video-player/chat/message.svelte`) — enumerated by name/tree, not read line-by-line
  - `src/i18n/fr.ts`, `src/i18n/ru.ts` (translation dictionaries; structure mirrors `_.ts`)
  - `src/app.scss`, `src/app.d.ts`, `src/vite-env.d.ts` (styling/type shims)
  - `static/` (PWA assets, `sw.min.js` service worker, legal texts, `screenshots/`)
  - `index.html`, `tsconfig.node.json`, `clean-db.db`-style state (none present)

> All deeply analyzed paths are within the repo root `./`; nothing outside the snapshot boundary was analyzed.

### Packages Found

Single-package (non-monorepo) SPA. Logical modules within `src/`:

- `main.ts` — Application — TypeScript — Entry point: Sentry init, i18n init, clock time sync, mounts `App.svelte`.
- `settings.ts` — Configuration — TypeScript — Reads all `VITE_*` env vars (Firebase config, Sentry DSN, analytics IDs, ICE servers, WebTorrent trackers, usernames, reactions, default videos, API proxy URLs, version).
- `App.svelte` / `components/index.svelte` — UI (root) — Svelte 5 — Resolves `roomId` from URL hash / localStorage; instantiates and lifecycles a `Room`.
- `analytics.svelte` — Cross-cutting/Service — Svelte 5 (module context) — Typed event hierarchy (`ClickEvent`, `SeekedEvent`, `PausedEvent`, `PlayedEvent`, `UrlPasteEvent`, `MessageSentEvent`, `WatchedMinuteEvent`, `LocaleChangedEvent`); dual-sink to Google Analytics `dataLayer` and Amplitude.
- `stores/` — State/Domain — TypeScript — Svelte stores wrapping Firebase Realtime Database and local device state (`blob`, `clock`, `cursor`, `me`, `user`, `local-store`, `web-torrent`, `video-example`).
- `stores/room/` — Domain (real-time sync core) — TypeScript — `Room` aggregate plus `BoundStore`/`BoundTimedStore`/`BoundCurrentTime`/`BoundMinutesWatched`/`UsersBoundStore`/`MessagesBoundStore` two-way Firebase bindings.
- `normalize-source.ts` — Utility/Domain — TypeScript — Source recognizer (`SourceBuilder` hierarchy) classifying input into `blob`/`direct`/`magnet`/`YouTube`/`Vimeo`.
- `components/video-player/` — UI subsystem — Svelte 5 — vidstack player wrapper, WebTorrent magnet player, in-player overlay, URL exploration, chat, reactions, online presence.
- `components/controls/` — UI subsystem — Svelte 5 — Video source selector, invite/room switching, language selector, user cards.
- `i18n/` — Localization — TypeScript — `svelte-i18n` dictionaries for `en`/`fr`/`ru`.
- `destructable.ts` / `utils.ts` — Utility — TypeScript — Destructor-registration base class; `randomStr`, `sleep`, `stringToColor`, `groupConsecutiveElements`.
- `clean-db.js`, `stats.js` — Node admin scripts — JavaScript (ESM) — `firebase-admin` maintenance jobs (delete stale rooms; export room stats as TSV).

### Build System

- **Type**: npm (`package.json`, `"type": "module"`) driving Vite 7 builds; Docker multi-stage image build orchestrated by `Makefile`.
- **Config Files**: `package.json`, `vite.config.ts`, `svelte.config.js`, `tsconfig.json`, `tsconfig.node.json`, `Dockerfile`, `nginx.conf`, `Makefile`, `buildargs.sh`, `.npmrc` (referenced by `Dockerfile`, not present in tree), `.env` (referenced, not committed).
- **Build Dependencies / flow**:
  - `vite build` → static bundle in `dist/`; `svelte()` + `vidstack()` + `VitePWA()` plugins; `publicDir: ./static`.
  - `Dockerfile` stages: `dev` → `base` (`npm ci` + platform rollup binaries) → `builder` (`npm run build -- --mode $NODE_ENV`, consumes ~24 `VITE_*`/`NODE_ENV` build args) → `bundle` (scratch, exports `/dist`) → `app` (nginx serving `/var/www/html` with `nginx.conf`).
  - `Makefile` targets wrap Docker: `build_dev_image`, `build_staging_image`, `build_prod_bundle_image`, `dev_install`, `dev_serve`, `prod_build_bundle`, `dev_clean_db`, `ci_install`, `ci_clean_db`; `buildargs.sh` expands `.env` lines into `--build-arg` flags.
  - `check` script = `svelte-kit sync && svelte-check --tsconfig ./tsconfig.json` (type/diagnostics gate — note: `svelte-kit` is invoked but not a declared dependency; project is not SvelteKit).
  - nginx serves an SPA fallback (`try_files $uri /index.html`) with gzip enabled.

### APIs Discovered

This is a client SPA with no first-party HTTP server; "APIs" are external service surfaces and internal store contracts.

- **Firebase Realtime Database** — `src/stores/room/*`, `src/settings.ts` — real-time sync backend. Path model rooted at `room/{roomId}` with child refs: `url`, `currentTime` (`{value, updatedAt}`), `paused`, `createdAt`, `users/{userId}` (`{name, lastSeen}`), `messages/{msgId}` (`{userId, text, timestamp, type}`), `minutesWatched/{userId}`. Accessed via `firebase/database` (`ref`, `child`, `onValue`, `get`, `set`). DB rules (README) allow public read/write on `room/$room_id` — no auth.
- **Firebase Admin (`firebase-admin`)** — `clean-db.js`, `stats.js` — service-account (`service-account-key.json`) admin access for stale-room cleanup and stats export; targets `VITE_FIREBASE_DATABASE_URL`.
- **WebTorrent (P2P)** — `src/stores/web-torrent.ts` — dynamic ESM import of `webtorrent@2.2.1` from `https://esm.sh`; seeds/streams local files over WebRTC (`iceServers` from env, optional `webTorrentTrackers` announce list), served through a Service Worker (`/sw.min.js`). Exposes `sendFile`, `getStreamUrl`, and readable stats stores (`progress`, `peers`, `downloadSpeed`, `uploadSpeed`, `timeRemaining`, `isSeeding`).
- **worldtimeapi.org** — `src/stores/clock.ts` — external time source (`GET https://worldtimeapi.org/api/timezone/UTC`) for cross-device clock offset used by all timed sync.
- **Video proxy / extractor APIs** — `src/components/video-player/explore-url.ts`, `src/settings.ts` — optional external `hlsProxyUrl`, `httpProxyUrl`, `videoExtractorUrl` used to resolve/normalize direct video links (HLS `.m3u8`, HTTP proxy with base64 URL, browser fallback); `verifyUrl` does CORS `HEAD` content-type sniffing.
- **vidstack player** — `src/components/video-player/video-player-vidstack.svelte` — web-component (`<media-player>`) via `vidstack/bundle` and `defineCustomElement`; two-way bound `currentTime`/`paused`/`muted`.
- **Analytics sinks** — `src/analytics.svelte` — Google Analytics (`window.dataLayer`) and Amplitude (`@amplitude/analytics-browser`) event emission.
- **Sentry** — `src/main.ts` — browser tracing + session replay when `VITE_SENTRY_DSN` is set.
- **Internal store contract** — the `BoundStore<T>` / `BoundTimedStore<T>` family implements the Svelte `Writable<T>` interface as the internal "API" bridging UI ↔ Firebase, with timestamp-based conflict resolution (`updatedAt`, tolerance thresholds, `shouldUpdateCurrentTime` drift check).

### Frameworks & Libraries

Versions from `package.json` (all under `devDependencies`; no runtime `dependencies` block — bundled at build time):

- `svelte` — `^5.34.3` — UI framework (Svelte 5 runes: `$state`, `$derived`, `$props`, `$effect`, `$bindable`).
- `vite` — `^7.1.9` — build tool / dev server.
- `@sveltejs/vite-plugin-svelte` — `^6.2.1` — Svelte compilation for Vite.
- `vite-plugin-pwa` — `^1.0.0` — PWA/service-worker + web manifest generation.
- `vidstack` — `^1.11.30` — media player web components (+ `vidstack/plugins` Vite plugin).
- `firebase` — `^12.1.0` — Realtime Database client SDK.
- `firebase-admin` — `^14.3.0` — admin SDK for Node maintenance scripts.
- `svelte-i18n` — `^4.0.0` — localization.
- `uikit` — `^3.24.2` — CSS/JS UI component framework.
- `sass` — `^1.93.2` — SCSS styling.
- `@sentry/svelte` — `^10.23.0` — error/perf monitoring + replay.
- `@amplitude/analytics-browser` — `^2.29.0` — product analytics.
- `prettier-bytes` — `^1.0.4` — human-readable byte formatting (torrent speeds/sizes).
- `typescript` — `^5.5.0` · `@tsconfig/svelte` — `^5.0.2` · `svelte-check` — `^4.3.3` · `tslib` — `^2.6.2` — TypeScript toolchain.
- Runtime dynamic import (not in `package.json`): `webtorrent@2.2.1` via `https://esm.sh`.

### Test Coverage

- **Test Directories**: None. No `test/`, `tests/`, `__tests__/`, or `spec/` directories exist.
- **Test Frameworks**: None. No Vitest/Jest/Playwright/Cypress config or dependency; no `*.test.*` or `*.spec.*` files anywhere in the repo.
- **Coverage Config**: Absent. No coverage tooling or thresholds configured.
- The only quality gate is static: the `check` script (`svelte-check`). CI runs a build, not tests.

### Code Quality Indicators

- **Linting**: No ESLint configuration is present in the repo (no `.eslintrc*`, no `eslint.config.*`, no `eslint` dependency in `package.json`). Static verification is limited to `svelte-check` (`tsconfig.json` sets `checkJs: true`, `strict` inherited from `@tsconfig/svelte`). *(Steering context expected eslint; it is not evidenced in the codebase — recorded as a gap, see Technical Debt.)*
- **CI/CD**: GitHub Actions — `.github/workflows/build.yml` (reusable build → PWA sitemap → Pages artifact), `CI.yml` (build on `pull_request`), `CD.yml` (build + deploy to GitHub Pages on push to `master`), `clean-db.yml` (monthly + manual `firebase-admin` room cleanup). Deploy target is GitHub Pages; production build runs through the Docker `make prod_build_bundle` path.
- **Documentation**: `README.md` covers Firebase setup, DB rules, local dev via `make`, and deployment/CD. Inline doc comments are sparse; a few explanatory links (e.g. WebTorrent port workaround, PWA caching blog). Legal docs under `static/` (`privacy-policy.txt`, `terms-and-conditions.txt`).

### Technical Debt Signals

- **No automated tests** — entire repo; org policy treats tests as first-class, but none exist. Highest-value follow-up; do not invent tests, record as debt.
- **No linter configured** — repo root; only `svelte-check` gates. Naming/style consistency is unenforced.
- **`@ts-ignore` suppressions** — `src/analytics.svelte:12`, `src/analytics.svelte:142`, `src/normalize-source.ts:25`, `src/normalize-source.ts:40`, `src/stores/web-torrent.ts:5`, `src/stores/web-torrent.ts:56`; pervasive `any` typing throughout `src/stores/web-torrent.ts` (dynamic WebTorrent import is untyped).
- **Runtime dependency on a third-party CDN** — `src/stores/web-torrent.ts:52` imports `webtorrent@2.2.1` from `https://esm.sh` at runtime (supply-chain + offline/availability risk; not pinned in `package.json` lockfile).
- **Public, unauthenticated Firebase rules** — README DB rules grant `.read`/`.write: true` on any `room/$room_id`; anyone can read/write any room's state. No auth on the sync backend.
- **Hard-coded external endpoint** — `src/stores/clock.ts:4` calls `https://worldtimeapi.org` directly; single point of failure for time sync with a `try`-less failure path (unhandled rejection propagates).
- **Magic numbers / tuning constants** — timeouts and tolerances scattered as literals (`onlineTimeout=13`, `messageTimeout=10`, `CURRENT_TIME_SYNC_INTERVAL=60`, `maximumDelta=0.5`, WebTorrent `torrentPort=12318` with `// WTF??` comment at `web-torrent.ts:66`).
- **Busy-wait polling loops** — `web-torrent.ts` (`while (!__torrent.files.length)` 1s poll; service-worker readiness `while(true)` loop) and interval-based readable stores; acceptable but crude.
- **Typos in identifiers** — e.g. `attepmts`/`extenssion` (`explore-url.ts`), `defauleRaw` (`bound-timed-store.ts`), `isExaple` (referenced in `analytics.svelte`), `MEASHUREMENT`/`measurementId` env-name mismatch risk (`VITE_ANALYTICS_MEASHUREMENT_ID` build arg vs `VITE_ANALYTICS_MEASUREMENT_ID` read in `settings.ts`).
- **Env-var name drift build↔code** — `Dockerfile` declares `ARG VITE_VITE_FIREBASE_APP_ID` (double `VITE_`) and `VITE_ANALYTICS_MEASHUREMENT_ID`, while `settings.ts` reads `VITE_FIREBASE_APP_ID` and `VITE_ANALYTICS_MEASUREMENT_ID` — potential silent config breakage.
- **Branch naming mismatch** — CD triggers on `master`; README references `master`; org/team default is trunk `main`. Note for the architect, do not "fix".
- **Global mutable singletons** — `web-torrent.ts` module-level `__client`/`__torrent` and `window.WEBTORRENT_ANNOUNCE = null`.

## Handoff Summary

- **Intent-relevant finding**: The system's real-time "watch together" core is a timestamp-reconciled two-way binding layer over Firebase Realtime Database — `Room` (`src/stores/room/index.ts`) composes `BoundTimedStore`/`BoundCurrentTime`/`UsersBoundStore`/`MessagesBoundStore`, each syncing a `room/{roomId}` subtree and resolving conflicts via `updatedAt` deltas and drift tolerances (`bound-current-time.ts` `shouldUpdateCurrentTime`, `maximumDelta=0.5`). Video delivery is pluggable (`normalize-source.ts` → vidstack for YouTube/Vimeo/direct, WebTorrent for magnet). This binding pattern and the `room/{...}` data shape are the load-bearing concepts an onboarding engineer must understand first.
- **Risks / follow-up** (preserve into synthesis):
  - **No tests and no linter** in a repo whose org policy treats tests as first-class — record as the top code-quality gap; tests must not be invented.
  - **Steering said "eslint present"; the codebase shows none** — the only static gate is `svelte-check`. Flag this discrepancy rather than assuming eslint config.
  - **Security posture**: public unauthenticated Firebase rules + runtime CDN import of `webtorrent@2.2.1` from `esm.sh` are the two highest-signal risks for the security/architecture pass.
  - **Config drift**: `VITE_VITE_FIREBASE_APP_ID` (Dockerfile) and `MEASHUREMENT`/`MEASUREMENT` spelling mismatches between build args and `settings.ts` reads may cause silent misconfiguration.
  - **Not SvelteKit** despite `check` invoking `svelte-kit sync` and `svelte-kit` not being a declared dependency — a plain Vite + Svelte 5 SPA deployed as static files to GitHub Pages.
  - **Branch is `master`** (CD trigger + README) vs the org/team trunk default `main`; noted, not modified.
