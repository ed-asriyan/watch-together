# Code Quality Assessment

## Test Coverage

**There are no automated tests in this repository.** Verified: no `test/`,
`tests/`, `__tests__/`, or `spec/` directories; no `*.test.*` / `*.spec.*` files;
no Vitest/Jest/Playwright/Cypress config or dependency; no coverage tooling or
thresholds.

- **Coverage**: 0% (structural — nothing to measure).
- **Only quality gate**: the static `check` script (`svelte-check`). CI runs a
  **build**, not tests.
- This is the **highest-value follow-up**. Tests are not invented here; the gap
  is recorded as the top code-quality debt. The riskiest untested code is the
  conflict-resolution logic in the Real-Time Sync Core (`bound-current-time.ts`,
  `bound-timed-store.ts`) — see [architecture.md](architecture.md).

## Linting & Static Analysis

- **ESLint: not present.** Reconciling the scan's flagged discrepancy — the
  steering context expected ESLint, but a direct repo search finds **no**
  `.eslintrc*`, no `eslint.config.*`, and no `eslint` dependency in
  `package.json`. Confirmed by the developer scan and re-verified in this pass.
  Treat "ESLint present" as an incorrect assumption; do not add config on that
  basis.
- **Actual static gate**: `svelte-check ^4.3.3` via the `check` script
  (`svelte-kit sync && svelte-check --tsconfig ./tsconfig.json`). `tsconfig.json`
  sets `checkJs: true` and inherits `strict` from `@tsconfig/svelte`.
- **No formatter config** (no Prettier/EditorConfig enforced); style is by
  convention only.
- **Note**: `check` invokes `svelte-kit sync`, but `svelte-kit` is **not** a
  declared dependency and this is **not** a SvelteKit project (plain Vite +
  Svelte 5 SPA). The `sync` step is effectively vestigial/at-risk.

## CI/CD

GitHub Actions (`.github/workflows/`):

| Workflow | Trigger | Purpose |
|---|---|---|
| `build.yml` | reusable/called | build → PWA sitemap → Pages artifact |
| `CI.yml` | `pull_request` | build on PRs (no tests) |
| `CD.yml` | push to `master` | build + deploy to GitHub Pages |
| `clean-db.yml` | monthly schedule + manual | `firebase-admin` stale-room cleanup |

- Production build runs through the Docker path (`make prod_build_bundle`);
  nginx serves the SPA with `try_files $uri /index.html` fallback + gzip.
- No test stage exists in any pipeline (consistent with the absence of tests).

## Documentation Quality

- **README.md**: covers Firebase setup, DB rules, local dev via `make`, and
  deployment/CD — adequate for onboarding the ops path.
- **Inline docs**: sparse; a few explanatory links (WebTorrent port workaround,
  PWA caching). No API/architecture docs in-repo (this CodeKB fills that gap).
- **Legal**: `static/privacy-policy.txt`, `static/terms-and-conditions.txt`, plus
  an in-app jurisdictional-warning banner.

## Technical Debt

Ordered by risk. Locations are file/line as reported by the developer scan.

### Security / supply chain (highest signal)

1. **Public, unauthenticated Firebase rules** — README DB rules grant
   `.read`/`.write: true` on any `room/$room_id`. Anyone can read or overwrite
   any room's state; there is no auth on the sync backend. This is the dominant
   security exposure. See the data model in
   [api-documentation.md](api-documentation.md).
2. **Runtime CDN import of `webtorrent@2.2.1` from `https://esm.sh`**
   (`stores/web-torrent.ts:52`) — a load-bearing dependency loaded at runtime,
   unpinned in the lockfile: supply-chain compromise, version drift, and
   offline/availability risk.

### Configuration drift (silent-breakage risk)

3. **`VITE_VITE_FIREBASE_APP_ID`** — `Dockerfile` declares a double-`VITE_`
   build arg while `settings.ts` reads `VITE_FIREBASE_APP_ID`.
4. **`MEASHUREMENT` vs `MEASUREMENT`** — `Dockerfile`/build arg
   `VITE_ANALYTICS_MEASHUREMENT_ID` vs `settings.ts` read
   `VITE_ANALYTICS_MEASUREMENT_ID`. Both mismatches can silently drop config at
   build time.
5. **Deploy branch `master` vs trunk `main`** — `CD.yml` triggers on `master`
   and README references `master`, while the org/team trunk default is `main`.
   Recorded, **not** modified (out of scope for RE).

### Reliability

6. **Hard-coded external time endpoint** — `stores/clock.ts:4` calls
   `https://worldtimeapi.org` directly with no timeout/fallback; an unhandled
   rejection can propagate. All timed sync depends on it (single point of
   failure).
7. **Busy-wait polling loops** — `web-torrent.ts` (`while (!__torrent.files.length)`
   1s poll; service-worker readiness `while(true)` loop) and interval-based
   readable stores. Functional but crude.

### Maintainability

8. **No tests, no linter** — see sections above; naming/style consistency is
   unenforced.
9. **`@ts-ignore` suppressions & pervasive `any`** — `analytics.svelte:12,142`,
   `normalize-source.ts:25,40`, `web-torrent.ts:5,56`; the entire dynamic
   WebTorrent surface is untyped.
10. **Magic numbers / tuning constants** — `onlineTimeout=13`,
    `messageTimeout=10`, `CURRENT_TIME_SYNC_INTERVAL=60`, `maximumDelta=0.5`,
    `syncInterval=10`, `torrentPort=12318` (with a `// WTF??` comment,
    `web-torrent.ts:66`).
11. **Global mutable singletons** — `web-torrent.ts` module-level
    `__client`/`__torrent` and `window.WEBTORRENT_ANNOUNCE = null`.
12. **Identifier typos** — `attepmts`/`extenssion` (`explore-url.ts`),
    `defauleRaw` (`bound-timed-store.ts`), `isExaple` (referenced in
    `analytics.svelte`), and the `MEASHUREMENT` env-name typo (see item 4).

## Overall

A compact, coherent SPA whose real-time core is well-factored around a single
strong pattern, but which carries **structural quality gaps** (zero tests, no
lint) and **two high-signal risks** (public RTDB rules, runtime CDN import) that
should lead any hardening effort. Component-level health ratings are in
[component-inventory.md](component-inventory.md).
