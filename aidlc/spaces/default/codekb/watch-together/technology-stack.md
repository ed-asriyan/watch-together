# Technology Stack

Versions are read verbatim from `package.json` (all under `devDependencies`;
there is **no runtime `dependencies` block** — everything is bundled at build
time by Vite). Package name is `movie-together`, version `0.0.1`, `"private": true`,
`"type": "module"`.

## Languages

| Language | Where | Notes |
|---|---|---|
| TypeScript | `src/**/*.ts`, `*.config.ts` | `typescript ^5.5.0`; `tsconfig.json` `checkJs: true`, strict via `@tsconfig/svelte` |
| Svelte 5 | `src/**/*.svelte` | runes (`$state`, `$derived`, `$props`, `$effect`, `$bindable`) |
| JavaScript (ESM) | `clean-db.js`, `stats.js` | Node admin scripts (`--experimental-json-modules`) |
| SCSS | `src/app.scss` | via `sass` |
| Dockerfile / shell | `Dockerfile`, `buildargs.sh`, `Makefile` | multi-stage build + ops |

## Frameworks & Core Libraries

| Package | Version | Purpose |
|---|---|---|
| `svelte` | `^5.34.3` | UI framework (Svelte 5 runes) |
| `vite` | `^7.1.9` | build tool / dev server |
| `@sveltejs/vite-plugin-svelte` | `^6.2.1` | Svelte compilation for Vite |
| `vite-plugin-pwa` | `^1.0.0` | PWA / service-worker + web manifest |
| `vidstack` | `^1.11.30` | media player web components (+ `vidstack/plugins` Vite plugin) |
| `firebase` | `^12.1.0` | Realtime Database client SDK |
| `firebase-admin` | `^14.3.0` | admin SDK for Node maintenance scripts |
| `svelte-i18n` | `^4.0.0` | localization (en/fr/ru) |
| `uikit` | `^3.24.2` | CSS/JS UI component framework |
| `sass` | `^1.93.2` | SCSS compilation |
| `@sentry/svelte` | `^10.23.0` | error/perf monitoring + session replay |
| `@amplitude/analytics-browser` | `^2.29.0` | product analytics |
| `prettier-bytes` | `^1.0.4` | human-readable byte formatting (torrent stats) |

## TypeScript Toolchain

| Package | Version | Purpose |
|---|---|---|
| `typescript` | `^5.5.0` | compiler / type system |
| `@tsconfig/svelte` | `^5.0.2` | base tsconfig (strict) |
| `svelte-check` | `^4.3.3` | type/diagnostics gate (the only static check) |
| `tslib` | `^2.6.2` | TS runtime helpers |

## Runtime-Loaded (not in `package.json`)

| Package | Version | Source | Purpose |
|---|---|---|---|
| `webtorrent` | `2.2.1` | `https://esm.sh` (dynamic ESM import) | P2P file streaming over WebRTC |

> Loading a load-bearing runtime dependency from an external CDN, unpinned in
> the lockfile, is a supply-chain and availability risk — tracked in
> [code-quality-assessment.md](code-quality-assessment.md).

## Platform & Delivery

| Concern | Technology |
|---|---|
| Backend / data | Firebase Realtime Database (BaaS; no first-party server) |
| P2P transport | WebRTC via WebTorrent; ICE servers + trackers configurable |
| Local media serving | Service Worker (`static/sw.min.js`) + WebTorrent `createServer` |
| External time source | `worldtimeapi.org` |
| Hosting | Static files on nginx image / GitHub Pages |
| Container | Docker multi-stage (`dev → base → builder → bundle → app/nginx`) |
| CI/CD | GitHub Actions → GitHub Pages |

Dependency relationships and supply-chain details are in
[dependencies.md](dependencies.md).
