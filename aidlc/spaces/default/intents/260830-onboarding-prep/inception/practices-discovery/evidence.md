# Practices Discovery — Evidence

> What each participant inspected and inferred per practice area, the decisions
> taken at the interview, the testability blockers a test strategy must
> confront, and the security tech-debt carried forward as unresolved context.
> Brownfield project.

## Participants and what they inspected

- **Lead (release engineer)** — Git (`git log`, `git branch -a`, `git remote -v`,
  `git rev-parse HEAD`); CI/CD workflows (`CI.yml`, `CD.yml`, `build.yml`,
  `clean-db.yml`, `.github/dependabot.yml`); build/ops (`Dockerfile`, `Makefile`,
  `buildargs.sh`, `nginx.conf`, `package.json` scripts, `tsconfig.json`);
  reverse-engineering CodeKB under
  `aidlc/spaces/default/codekb/watch-together/`; rules (`memory/org.md`,
  `memory/team.md`, `.aidlc/knowledge/aidlc-shared/rules-reading.md`).
- **aidlc-quality-agent** — the workflows and `package.json` scripts for the
  actual CI gate shape; the source modules that are natural test targets and the
  blockers that make the highest-risk code untestable.
- **aidlc-developer-agent** — `package.json`, `tsconfig.json`, and real source
  (`src/stores/room/bound-store.ts`, `src/destructable.ts`, `src/utils.ts`,
  `src/i18n/index.ts`, `src/settings.ts`) for code conventions and layer
  boundaries.
- **aidlc-devsecops-agent** — `.github/workflows/`, `.github/dependabot.yml`,
  `Dockerfile`, `package.json`, and codekb `code-quality-assessment.md` /
  `dependencies.md` for supply-chain and CI controls.

## Way of Working

- Evidence: trunk is `master` (`origin/HEAD → origin/master`, `CD.yml` on
  `master`, README references `master`). Remote branches are all short-lived
  topic/automation branches (`captions`, `terragon/add-captions-file-selection`,
  `dependabot/*`); no long-lived release branches. History shows PR merges via
  `Merge pull request #NN` commits (merge-commit strategy) plus Dependabot bumps.
- Interview decisions: keep trunk `master` (do NOT migrate to `main`);
  **squash-merge** (one commit per unit of work) going forward; short-lived
  branches.

## Walking Skeleton

- Evidence: active scope is `onboarding`; org rule ties the skeleton ceremony to
  the scope's `skeleton:` field, which is off for this scope.
- Interview decision: skeleton off (onboarding scope) — deterministic from
  scope, not a judgement call.

## Testing Posture

- Evidence: no tests anywhere (0% coverage; no test dirs/files; no test runner
  dependency or config). The quality reviewer corrected the "only static gate"
  framing: `svelte-check` is **local-only and absent from every workflow** —
  `CI.yml` → `build.yml` runs only `make prod_build_bundle` (→ `vite build`),
  which compiles Svelte but does not run `svelte-check`'s TypeScript
  diagnostics, so a type error `svelte-check` would catch can still merge and
  deploy. The pipeline therefore enforces nothing beyond "the bundle builds."
  The `check` script also calls `svelte-kit sync` despite this being a plain
  Vite + Svelte 5 SPA (vestigial; a latent CI failure if `check` is wired in
  before it is removed).
- Interview decisions: Methodology = **custom**. Ordering = "Write
  Given/When/Then acceptance scenarios first, identify the HTML anchors/selectors
  the test framework (Playwright) will target, implement the e2e tests against
  them, then implement the feature, and run the tests after implementation."
  Adoption is forward-looking (the repo has NO tests today). Add both
  `svelte-check` and e2e (Playwright) to CI before merge/deploy — this closes the
  current gap where `svelte-check` is local-only and not in CI.
- Testability blockers (must be resolved before the highest-risk code is
  testable; noted as gaps, not rules):
  1. **Hard-coded external clock** — `src/stores/clock.ts` calls
     `worldtimeapi.org` directly with no injection point; all timed sync depends
     on it, so deterministic unit tests of the sync core need the clock made
     injectable.
  2. **Global WebTorrent singletons + runtime CDN import** — module-level
     `__client`/`__torrent` in `stores/web-torrent.ts` plus the dynamic
     `webtorrent@2.2.1` import from `https://esm.sh` (with `any`/`@ts-ignore`)
     are effectively untestable without an abstraction seam.
  3. **Vestigial `svelte-kit sync`** in the `check` script — remove before
     wiring `check` into CI.
- Stack-native tooling menu recorded by the quality reviewer (not affirmed
  choices): Vitest as runner, `@testing-library/svelte` + `jsdom`/`happy-dom`
  for components, `@vitest/coverage-v8` for coverage, `@playwright/test` for the
  two-client sync e2e; Firebase Emulator Suite vs mocked RTDB for integration.

## Deployment

- Evidence: `CD.yml` deploys to GitHub Pages on push to `master` via `build.yml`
  + `actions/deploy-pages` (least-privilege OIDC token:
  `contents: read` / `pages: write` / `id-token: write`); `CI.yml` builds PRs
  only; no staging environment and no manual approval gate exist in the pipeline;
  `clean-db.yml` runs monthly. Production build goes through the Docker path
  (`make prod_build_bundle`); nginx serves the SPA.
- Interview decision: keep **continuous deploy to production** on push to trunk —
  no staging tier, no manual gate.

## Code Style

- Evidence: no ESLint (no config, no dependency — earlier "ESLint present"
  assumption confirmed false); no Prettier/EditorConfig. Cross-file and
  in-file indentation/spacing drift (4-space vs 2-space, `function (…)` vs
  `function(…)`) confirms nothing enforces style. Only static gate is
  `svelte-check` with TS strict (`checkJs: true`, `@tsconfig/svelte`).
- Conventions the developer reviewer surfaced as consistently present (evidenced,
  recorded as team practice): kebab-case filenames, PascalCase classes
  (`BoundStore`, `Destructable`, `SourceBuilder`), camelCase functions/vars and
  module-level config members, SCREAMING_SNAKE `VITE_*` env keys; the
  `export const x = function () {}` function-expression idiom; the clean
  `stores/**` (state + `Writable<T>` port) vs `components/**` (bind only) vs
  `i18n/**` (self-contained) layer boundary with `settings.ts` as the single
  env-config choke point; guard/early-return checks with no local `try/catch`,
  failures propagating to the global Sentry handler in `main.ts`.
- Interview decision: adopt **ESLint + Prettier** alongside `svelte-check` +
  TS strict. `svelte-kit sync` is vestigial and should be dropped.

## Evidenced supply-chain controls to keep (from devsecops review)

- Secrets injected at runtime, never committed (`FIREBASE_SERVICE_ACCOUNT_KEY`
  secret, `.env` from `ENV_FILE_CONTENT` variable).
- Least-privilege deploy token + OIDC in `CD.yml` (`actions/deploy-pages@v4`, no
  long-lived credential).
- Deterministic install: `Dockerfile` uses `npm ci` against `package-lock.json`.
- Automated dependency updates: `dependabot.yml` covers npm, docker, and
  github-actions weekly (a practiced control).

## Security tech-debt carried forward (unresolved context, not practice rules)

Handed forward with owning stages so deferral is tracked, not dropped:

- **Unpinned runtime CDN import** — `webtorrent@2.2.1` from `esm.sh`
  (`stores/web-torrent.ts`). Human decision: tech-debt for a later security run;
  **no FORBIDDEN rule added now**. Owner: `code-generation`/hardening;
  affirmation candidate for a forward supply-chain rule.
- **Public unauthenticated Firebase RTDB rules** (`.read`/`.write: true`). Owner:
  `threat-modelling` + `nfr-requirements`.
- **Dependabot suppresses security patches** — all three ecosystems set
  `ignore: version-update:semver-patch` with `open-pull-requests-limit: 1`, so
  patch-level CVE fixes never surface as PRs.
- **Third-party GitHub Actions pinned to mutable tags** —
  `cicirello/generate-sitemap@v1` and `actions/*@vN` are pinned to moving major
  tags, not commit SHAs, in a pipeline that holds `id-token: write`.
- **Docker base images unpinned** — `FROM node:25` and `FROM nginx` (implicit
  `latest`) are not digest-pinned.
- **`clean-db.yml` has no `permissions:` block** — runs with the default broad
  `GITHUB_TOKEN` while handling the Firebase service-account key.
- **No SAST, secret-scanning, or dependency-vulnerability gate in CI** — no
  `npm audit`/Snyk, Gitleaks/git-secrets, or Semgrep gate today.
- **Build-arg config drift** — `VITE_VITE_FIREBASE_APP_ID`, `MEASHUREMENT` typo.
  Correctness bug. Owner: `bugfix`/`code-generation`.
