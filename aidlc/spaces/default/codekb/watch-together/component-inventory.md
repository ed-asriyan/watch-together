# Component Inventory

Complete list of logical components (code we own, not deployed infrastructure).
Each entry lists responsibility, key files, dependencies, and a health rating
(healthy / at-risk / degraded). Health reflects testability and coupling risk;
the underlying debt is detailed in
[code-quality-assessment.md](code-quality-assessment.md). Interaction flows are
in [architecture.md](architecture.md); contracts in
[api-documentation.md](api-documentation.md).

> Health note: **no component has automated tests** (repo-wide), so every rating
> is capped by that structural gap; ratings below are relative coupling/risk.

## Application Bootstrap

- **Responsibility**: entry point — initialize Sentry, `svelte-i18n`, clock time
  sync; mount `App.svelte`.
- **Files**: `src/main.ts`.
- **Depends on**: Settings, Internationalization, Device & Identity Stores
  (clock), Root UI Shell, Sentry.
- **Health**: healthy (thin, sequential bootstrap).

## Settings / Configuration

- **Responsibility**: read every `VITE_*` env var into typed config exports
  (Firebase config, Sentry DSN, analytics IDs, ICE servers, WebTorrent trackers,
  usernames, reactions, default videos, proxy URLs, version).
- **Files**: `src/settings.ts`.
- **Depends on**: build-time env only.
- **Health**: at-risk — env-name drift between `Dockerfile` build args and reads
  here can silently misconfigure (see debt).

## Root UI Shell

- **Responsibility**: resolve `roomId` from URL hash / localStorage; instantiate
  and lifecycle a `Room`; render the top-level layout.
- **Files**: `src/App.svelte`, `src/components/index.svelte`, `header.svelte`,
  `room.svelte`, `fullscreen.svelte`, `loader.svelte`, `scroll-icon.svelte`,
  `interpolator.svelte`, `jurisdictional-bullshit-banner.svelte`.
- **Depends on**: Real-Time Sync Core, Controls Subsystem, Video Player Subsystem.
- **Health**: healthy.

## Real-Time Sync Core

- **Responsibility**: the watch-together heart — two-way, timestamp-reconciled
  binding between UI stores and `room/{roomId}` RTDB subtrees; drift-corrected
  playback, presence, ephemeral chat, watch-time, idle-pause guard.
- **Files**: `src/stores/room/index.ts` (`Room` aggregate), `bound-store.ts`,
  `bound-timed-store.ts`, `bound-current-time.ts`, `bound-minutes-watched.ts`,
  `bound-users.ts`, `bound-messages.ts`.
- **Depends on**: Firebase RTDB, Device & Identity Stores (clock, me), Utilities.
- **Health**: at-risk — highest-value, highest-complexity logic (conflict
  resolution, magic-number tuning) with zero tests.

## Device & Identity Stores

- **Responsibility**: local/device and identity state — clock offset, current
  user (`me`), other users, local persistence, cursor, blob handling, example
  video.
- **Files**: `src/stores/clock.ts`, `me.ts`, `user.ts`, `local-store.ts`,
  `cursor.ts`, `blob.ts`, `video-example.ts`.
- **Depends on**: `worldtimeapi.org` (clock), browser localStorage, Utilities.
- **Health**: at-risk — `clock.ts` external endpoint has no fallback/timeout.

## WebTorrent Delivery

- **Responsibility**: P2P local-file co-watch — seed/stream files over WebRTC via
  a runtime-loaded WebTorrent client behind a Service Worker; expose transfer
  stat stores.
- **Files**: `src/stores/web-torrent.ts`, `static/sw.min.js`.
- **Depends on**: `esm.sh` (runtime import), Settings (ICE/trackers), Service
  Worker.
- **Health**: degraded — runtime CDN import, pervasive `any`/`@ts-ignore`,
  global mutable singletons, busy-wait loops.

## Source Normalizer

- **Responsibility**: classify a raw source string into
  `blob`/`direct`/`magnet`/`YouTube`/`Vimeo` and select the delivery strategy.
- **Files**: `src/normalize-source.ts`.
- **Depends on**: none (pure classification); consumed by player/controls.
- **Health**: at-risk — `@ts-ignore` usage; identifier typos; untested branching.

## Video Player Subsystem

- **Responsibility**: render playback — vidstack web-component wrapper, magnet
  player, in-player overlay, URL exploration/verification, lock control.
- **Files**: `src/components/video-player/index.svelte`,
  `video-player-vidstack.svelte`, `player-magnet.svelte`, `inplayer.svelte`,
  `lock.svelte`, `explore-url.ts`.
- **Depends on**: Source Normalizer, WebTorrent Delivery, vidstack, Real-Time
  Sync Core (currentTime/paused), Analytics, video proxies.
- **Health**: at-risk — dual delivery paths; `explore-url.ts` typos and CORS
  sniffing.

## Controls Subsystem

- **Responsibility**: source selection, invite / room switching, language
  selection, user cards.
- **Files**: `src/components/controls/index.svelte`, `card-video-selector.svelte`,
  `video-selector-btn.svelte`, `language-selector.svelte`, `card-users/**`.
- **Depends on**: Source Normalizer, Real-Time Sync Core (url), Internationalization,
  Analytics.
- **Health**: healthy.

## Chat, Reactions & Presence

- **Responsibility**: live chat, ephemeral emoji reactions overlay, and
  "who's online" presence UI.
- **Files**: `src/components/video-player/chat/index.svelte`, `chat/message.svelte`,
  `reactions/**`, `online/**`.
- **Depends on**: Real-Time Sync Core (`MessagesBoundStore`, `UsersBoundStore`),
  Device & Identity Stores (me), Analytics.
- **Health**: healthy.

## Analytics

- **Responsibility**: typed event hierarchy fanned out to Google Analytics
  (`dataLayer`) and Amplitude.
- **Files**: `src/analytics.svelte`.
- **Depends on**: `@amplitude/analytics-browser`, GA global, Settings.
- **Health**: at-risk — `@ts-ignore` on the global sinks; references a typo
  identifier (`isExaple`).

## Internationalization

- **Responsibility**: `svelte-i18n` dictionaries and locale wiring for `en`, `fr`,
  `ru`.
- **Files**: `src/i18n/index.ts`, `_.ts`, `fr.ts`, `ru.ts`.
- **Depends on**: `svelte-i18n`.
- **Health**: healthy.

## Utilities

- **Responsibility**: shared helpers — `Destructable` destructor-registration
  base; `randomStr`, `sleep`, `stringToColor`, `groupConsecutiveElements`.
- **Files**: `src/destructable.ts`, `src/utils.ts`.
- **Depends on**: none.
- **Health**: healthy.

## Admin Scripts

- **Responsibility**: Node `firebase-admin` maintenance — delete stale rooms
  (`clean-db.js`), export room stats as TSV (`stats.js`).
- **Files**: `clean-db.js`, `stats.js`.
- **Depends on**: `firebase-admin`, service account key, `VITE_FIREBASE_DATABASE_URL`.
- **Health**: at-risk — operate on public data with service-account authority;
  no tests.

## Build & Deploy Tooling

- **Responsibility**: reproducible build and static hosting — Vite build, Docker
  multi-stage image, nginx SPA serving, CI/CD workflows, DB-cleanup schedule.
- **Files**: `vite.config.ts`, `svelte.config.js`, `Dockerfile`, `Makefile`,
  `buildargs.sh`, `nginx.conf`, `.github/workflows/{CI,CD,build,clean-db}.yml`.
- **Depends on**: Vite plugins, Docker, GitHub Actions/Pages.
- **Health**: at-risk — CD triggers on `master` (org trunk is `main`); build-arg
  env-name drift.
