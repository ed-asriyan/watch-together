# Code Structure

## Repository Organization

Single-package (non-monorepo) SPA. Application source lives under `src/`; the
repo root holds build, container, and ops tooling.

```
watch-together/
├── package.json            # npm scripts + deps (name: movie-together)
├── vite.config.ts          # svelte + vidstack + PWA plugins; publicDir ./static
├── svelte.config.js        # vitePreprocess
├── tsconfig.json           # extends @tsconfig/svelte; checkJs: true
├── Dockerfile              # multi-stage: dev→base→builder→bundle→app(nginx)
├── Makefile                # docker-wrapping build/dev/ci targets
├── buildargs.sh            # expands .env → --build-arg flags
├── nginx.conf              # SPA fallback + gzip
├── clean-db.js, stats.js   # Node firebase-admin admin scripts (ESM)
├── index.html              # SPA entry; loads src/main.ts
├── .github/workflows/      # CI.yml, CD.yml, build.yml, clean-db.yml
├── src/                    # application code (below)
└── static/                 # PWA assets, sw.min.js, legal texts, screenshots
```

### `src/` module map

```
src/
├── main.ts                 # bootstrap: Sentry, i18n, clock, mount App
├── settings.ts             # reads all VITE_* env → typed config exports
├── App.svelte              # root component
├── analytics.svelte        # typed event hierarchy → GA dataLayer + Amplitude
├── destructable.ts         # Destructable base (destructor registration)
├── utils.ts                # randomStr, sleep, stringToColor, groupConsecutive…
├── normalize-source.ts     # SourceBuilder hierarchy (source classification)
├── app.scss, app.d.ts, vite-env.d.ts   # styling + type shims
├── i18n/                   # svelte-i18n: index.ts, _.ts (en), fr.ts, ru.ts
├── stores/                 # reactive state layer
│   ├── blob, clock, cursor, me, user, local-store, video-example, web-torrent
│   └── room/               # real-time sync core (see below)
└── components/             # Svelte 5 UI tree
    ├── index.svelte, header, room, fullscreen, loader, scroll-icon,
    │   interpolator, jurisdictional-bullshit-banner
    ├── controls/           # card-video-selector, language-selector,
    │   │                   # video-selector-btn, card-users/**
    └── video-player/       # index, video-player-vidstack, inplayer,
        │                   # player-magnet, lock, explore-url.ts
        ├── chat/           # index, message
        ├── online/         # presence
        └── reactions/      # reaction overlay
```

### `stores/room/` — the sync core

```
stores/room/
├── index.ts                # Room aggregate: composes the bound stores
├── bound-store.ts          # BoundStore<T>: Writable<T> ↔ RTDB ref
├── bound-timed-store.ts    # BoundTimedStore<T>: {value,updatedAt} envelope
├── bound-current-time.ts   # BoundCurrentTime: drift-corrected playback pos
├── bound-minutes-watched.ts# BoundMinutesWatched: per-user watch time
├── bound-users.ts          # UsersBoundStore: presence subtree
└── bound-messages.ts       # MessagesBoundStore: ephemeral chat/reactions
```

## File Classification

| Class | Files / dirs |
|---|---|
| Entry / bootstrap | `index.html`, `src/main.ts` |
| Configuration | `settings.ts`, `vite.config.ts`, `svelte.config.js`, `tsconfig*.json`, `.env` (uncommitted) |
| Domain / state | `src/stores/**` (esp. `stores/room/**`), `normalize-source.ts` |
| UI (presentation) | `src/components/**`, `App.svelte` |
| Cross-cutting service | `analytics.svelte`, `main.ts` (Sentry), `i18n/**` |
| Utility | `destructable.ts`, `utils.ts`, `components/video-player/explore-url.ts` |
| Admin / ops scripts | `clean-db.js`, `stats.js` |
| Build / container / CI | `Dockerfile`, `Makefile`, `buildargs.sh`, `nginx.conf`, `.github/workflows/**` |
| Static assets | `static/**` (incl. `sw.min.js` service worker), `index.html` |
| Type shims | `app.d.ts`, `vite-env.d.ts` |

## Code Patterns

- **Reactive store as port** — the `BoundStore`/`BoundTimedStore` family
  implements Svelte's `Writable<T>` so the UI cannot tell local state from
  remote state. This is the dominant pattern; understand it first. Contract in
  [api-documentation.md](api-documentation.md).
- **Envelope + last-writer-wins** — timed stores wrap values as
  `{ value, updatedAt }` and gate remote acceptance on `updatedAt` deltas plus a
  tolerance band (`bound-timed-store.ts`, `bound-current-time.ts`).
- **Aggregate composition** — `Room` (`stores/room/index.ts`) is an aggregate
  that constructs child bound stores over `room/{roomId}` subrefs and drives
  their `init()` in parallel; it owns a periodic idle-pause guard.
- **Deterministic destruction** — `Destructable` (`destructable.ts`) centralizes
  cleanup: components/stores `registerDependency`/`onDestruct` and teardown
  cascades, preventing leaked RTDB `onValue` listeners and intervals.
- **Builder/strategy for sources** — `SourceBuilder` hierarchy in
  `normalize-source.ts` classifies a raw string into `blob`/`direct`/`magnet`/
  `YouTube`/`Vimeo`, selecting the delivery strategy (vidstack vs WebTorrent).
- **Svelte 5 runes** — UI uses `$state`, `$derived`, `$props`, `$effect`,
  `$bindable` (not the legacy `$:`/`export let` style).
- **Interval-backed readable stores** — WebTorrent stats (`progress`, `peers`,
  speeds) are `readable` stores polling on a 1s `setInterval` (crude but simple).
- **Typed analytics events** — a class hierarchy of event types in
  `analytics.svelte` fans out to two sinks (GA + Amplitude).

## Naming & Conventions (observed)

- ES modules throughout (`"type": "module"`); TypeScript for logic, `.svelte`
  for UI, plain JS (ESM) for the two admin scripts.
- kebab-case filenames; PascalCase classes; camelCase functions/vars.
- No enforced lint/format tooling — conventions are by convention only (see
  linting status and identifier typos in
  [code-quality-assessment.md](code-quality-assessment.md)).
