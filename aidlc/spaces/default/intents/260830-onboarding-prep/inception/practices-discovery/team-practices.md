# Team Practices

> Affirmed for the `onboarding` scope on this brownfield project. Values are
> either evidenced in the repository or set by the team at the practices
> interview. This is the team's way of working going forward.

## Way of Working

We work trunk-based on a single long-lived trunk. The trunk in this repository
is **`master`** — we keep it, we do not migrate to `main`. `CD.yml` triggers on
push to `master`, the README documents `master`, and `origin/HEAD` points at
`origin/master`.

Change lands through **short-lived branches merged by pull request**, and we
**squash-merge**: one commit per unit of work on the trunk. History today
carries `Merge pull request #NN …` merge commits; going forward we squash so the
trunk reads as one commit per landed change. Branches stay short-lived — topic
and automation branches only (`captions`, `terragon/*`, `dependabot/*`), no
long-lived release branches. Dependency bumps arrive automatically via
Dependabot (`.github/dependabot.yml`) and land as reviewed PRs.

## Walking Skeleton

**Off for this scope.** The active `onboarding` scope declares the skeleton
ceremony off, and the org rule skips the walking-skeleton Bolt when the scope
file sets `skeleton: off`. There is nothing to bootstrap for an onboarding pass
over an already-running application. No skeleton Bolt runs.

## Testing Posture

Tests are a first-class deliverable, but **this repository currently has no
automated tests** — verified in the code-quality scan (no `test/`/`spec/`
directories, no `*.test.*`/`*.spec.*` files, no Vitest/Jest/Playwright/Cypress
config or dependency, 0% coverage). Adoption is forward-looking: the posture
below is what future work adopts, not what the repo has today.

- **Methodology**: custom
- **Ordering**: Write Given/When/Then acceptance scenarios first, identify the
  HTML anchors/selectors the test framework (Playwright) will target, implement
  the e2e tests against them, then implement the feature, and run the tests
  after implementation.
- **CI gates**: both `svelte-check` **and** e2e (Playwright) run in CI before
  merge/deploy. Today `svelte-check` is local-only (the `check` script) and CI
  (`CI.yml` → `build.yml`) enforces only `make prod_build_bundle`; a
  `svelte-check` failure does not currently block a PR or deploy. Wiring both
  gates in closes that gap.
- **Coverage**: no coverage floor is set at a 0% baseline; when a suite exists we
  ratchet up from a low, honest baseline rather than assert an aspirational
  number.
- The highest-risk untested code is the real-time sync conflict-resolution logic
  (`src/stores/room/bound-current-time.ts`, `bound-timed-store.ts`); it is also
  the highest-ROI unit target once the clock is made injectable.
- The `check` script also invokes `svelte-kit sync` although this is a plain
  Vite + Svelte 5 SPA (not SvelteKit); that step is vestigial and should be
  removed before `check` is wired into CI.

## Deployment

**Continuous deploy to production on push to trunk.** `CD.yml` triggers on push
to `master`, reuses `build.yml` to produce the bundle via the Docker path
(`make prod_build_bundle`), generates a sitemap, and publishes to
**GitHub Pages** (`watchtogether.online`) with `actions/deploy-pages`. We keep
this: **no staging tier and no manual production approval gate**. `CI.yml` builds
every pull request (no deploy). A scheduled `clean-db.yml` runs monthly Firebase
stale-room cleanup. The CI quality gates above (`svelte-check` + e2e) are the
protection between a green build and production.

## Code Style

We adopt **ESLint + Prettier**, alongside the existing `svelte-check` (`^4.3.3`)
and TypeScript strict (`checkJs: true`, `strict` inherited from
`@tsconfig/svelte`) gates. Today there is no ESLint (no `.eslintrc*`, no
`eslint.config.*`, no `eslint` dependency) and no formatter config (no
Prettier/EditorConfig), and cross-file indentation/spacing drift confirms
nothing enforces style; ESLint + Prettier close that gap.

Alongside the tooling, generated and hand-written code follows the conventions
already consistent across the tree:

- **Naming triad**: kebab-case filenames · PascalCase classes (`BoundStore`,
  `Destructable`, `SourceBuilder`) · camelCase functions, vars, and module-level
  config members (`firebaseConfig`, `webTorrentTrackers`, `defaultVideos`). Env
  keys are SCREAMING_SNAKE `VITE_*`. ES modules throughout (`"type": "module"`).
- **Function-declaration idiom**: logic modules use
  `export const x = function () {}` (a function expression bound to `const`),
  not `export function name()` and not arrow functions.
- **Layer boundaries**: `stores/**` own all reactive/remote state and expose the
  Svelte `Writable<T>` port; `components/**` bind to those stores and hold no
  persistence logic; `i18n/**` is self-contained; `settings.ts` is the single
  env-config choke point.
- **Error handling**: boundary code uses guard/early-return checks
  (`if (value !== undefined)`, `if (snapshot.exists())`) with no local
  `try/catch`; failures propagate to the global Sentry handler wired in
  `main.ts`.

The `svelte-kit sync` step in the `check` script is vestigial (no
`@sveltejs/kit` dependency) and should be dropped.
