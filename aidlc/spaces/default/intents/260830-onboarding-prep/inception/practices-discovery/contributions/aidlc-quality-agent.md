**Collaborator:** aidlc-quality-agent

## Contribution

QA/testing assessment of the lead's draft. Scope limited to testing posture,
coverage tooling, CI quality gates, test/code patterns, and the interview gaps
those raise. I do not edit the four artifacts; integrate the below directly.

### Correction — the only static gate is NOT enforced in CI

The draft (`team-practices.md` → Testing Posture; `evidence.md` → Testing
Posture; `code-quality-assessment.md`) repeatedly frames `svelte-check` as
"the only static gate" and says "CI runs a build, not tests." That understates
the gap. Verified in the workflows: `CI.yml` calls `build.yml`, which runs
**only** `make prod_build_bundle` (→ `vite build`). **`svelte-check` is never
invoked in any workflow** — it exists solely as the local `check`/`check:watch`
npm scripts. `vite build` compiles Svelte but does **not** run `svelte-check`'s
TypeScript diagnostics, so a type error that `svelte-check` would catch can
still merge and deploy as long as the bundle compiles.

Net QA reality: **the pipeline has zero enforced quality gate beyond "the
bundle builds."** Suggested precise wording for the artifacts:

> The repository's only type/diagnostics gate, `svelte-check`, runs locally
> only (the `check` script). CI (`CI.yml` → `build.yml`) enforces just
> `make prod_build_bundle`; a `svelte-check` failure does not block a PR or a
> deploy. There is no automated test stage.

This is a cheap, high-value hardening item independent of adding a test suite:
wiring `npm run check` into `CI.yml` would enforce the gate the team already
maintains.

### Testing posture — what a sensible target looks like for this stack

Stack is a plain Vite + Svelte 5 (runes) SPA, TS strict, Firebase RTDB
backend, WebTorrent over WebRTC, no first-party server. A proportionate
test pyramid for that shape:

- **Unit (majority)** — pure/near-pure modules are the natural first targets
  and are already isolated: `src/normalize-source.ts`,
  `src/components/video-player/explore-url.ts`, `src/utils.ts`, and the
  bound-store timing/merge logic (`src/stores/room/bound-current-time.ts`,
  `bound-timed-store.ts`, `bound-minutes-watched.ts`). The lead correctly flags
  the sync conflict-resolution logic as highest-risk-untested; from a QA lens
  these are also the highest-ROI unit targets (deterministic given injected
  time/clock) and should be the first suite written.
- **Integration (fewer)** — store ↔ Firebase RTDB interactions. These require
  a test seam (see testability blockers below); realistic options are the
  **Firebase Emulator Suite** (higher fidelity, real RTDB semantics) or a
  mocked RTDB (faster, less faithful). This is a genuine team choice, not
  evidence-settled → interview.
- **E2E (minimal but important)** — the product's core promise is *two clients
  staying in sync*. That behaviour cannot be validated below the e2e layer.
  **Playwright** with two browser contexts driving one room is the smallest
  test that proves the actual value proposition. Whether the team wants e2e at
  all (given cost/flake) is theirs to decide → interview.

### Coverage & test tooling — concrete, stack-native options (not team intent)

Presented as the evidence-consistent *menu*; the selection is the team's:

- **Runner**: **Vitest** is the natural fit — it reuses the existing
  `vite.config.ts`/plugin pipeline and understands Svelte 5, so setup cost is
  low. (Jest would fight the ESM/Vite/runes setup.)
- **Component testing**: `@testing-library/svelte` (Svelte 5 compatible) +
  `jsdom` or `happy-dom` environment.
- **Coverage**: `@vitest/coverage-v8` (V8 provider) — no extra instrumentation,
  works with the Vite bundler.
- **E2E**: `@playwright/test` for the multi-client sync scenario.

None of these are currently present (confirmed: no runner/coverage dependency
or config). Recording the menu is safe; **do not record a chosen tool or a
coverage number as if affirmed** — surface both as interview gaps.

### Testability blockers that a test strategy must confront

These are QA-relevant because they make the highest-risk code hard to test as
written; they belong in the interview as "do we refactor for testability?"
questions, not as invented rules:

1. **Hard-coded external time source** — `src/stores/clock.ts` calls
   `worldtimeapi.org` directly with no injection point. All timed sync depends
   on it, so deterministic unit tests of the sync core need the clock/time
   source to be injectable.
2. **Global mutable singletons + runtime CDN import** — `web-torrent.ts`
   module-level `__client`/`__torrent` and the dynamic
   `webtorrent@2.2.1` import from `https://esm.sh` are effectively untestable
   without an abstraction seam, and the untyped `any`/`@ts-ignore` surface
   removes the compiler's help. Any P2P-path testing needs this boundary
   defined first.
3. **Vestigial `svelte-kit sync`** in the `check` script (not a SvelteKit
   project) is a latent CI/tooling failure risk if `check` is later wired into
   CI; removing it should precede adding `check` to the pipeline.

### CI quality-gate shape (target, for interview)

A proportionate gate set for this SPA, in cost order — each item is a team
decision, surfaced not imposed:

- **Now / free**: add `npm run check` (svelte-check) as a required CI job.
- **Cheap**: add a `vitest run` job once a unit suite exists; make it required
  on PRs.
- **Optional**: coverage reporting via `@vitest/coverage-v8`, with a **coverage
  floor** the team sets (ratchet-up from a low baseline is more honest than a
  large aspirational number given a 0% start).
- **Optional/expensive**: Playwright e2e for the two-client sync path, likely
  nightly or label-gated rather than on every PR to bound flake/cost.

### Interview gaps this assessment adds (QA-specific)

Beyond the lead's methodology/ordering gap, the interview should also resolve:

- Enforce `svelte-check` in CI now (yes/no)?
- Add a test suite at all this cycle, and if so which layers (unit only, or
  unit + e2e)?
- Test runner choice (Vitest assumed sensible — confirm) and coverage floor
  value + ratchet policy.
- Firebase test strategy: **Emulator Suite vs mocked RTDB** for integration.
- Appetite for refactoring `clock.ts`/`web-torrent.ts` for testability, or
  accept those paths as test-exempt for now.
- Whether e2e for multi-client sync is in scope (and cadence: per-PR vs
  nightly).

## Positions

- AGREE: Recording zero-test state as the top gap without inventing a suite —
  correct; evidence is silent on any practiced methodology, so seeding
  test-after and deferring to interview is the right call.
- AGREE: Flagging the sync conflict-resolution logic as highest-risk-untested —
  matches the QA ROI ranking; it is both the riskiest and the most
  unit-testable core.
- AGREE: Treating the vestigial `svelte-kit sync` in the `check` script as
  at-risk and interview-worthy.
- OBJECT: "svelte-check is the only static gate / CI runs a build not tests"
  understates it — `svelte-check` is **local-only and absent from CI**, so the
  pipeline enforces nothing beyond a successful `vite build`; the artifacts
  should say this explicitly and list "wire `svelte-check` into CI" as a
  near-zero-cost gate independent of adding tests.
- OBJECT: Testing Posture omits testability blockers — the hard-coded
  `worldtimeapi.org` clock, global WebTorrent singletons, and the runtime CDN
  import make the highest-risk code untestable as written; the interview must
  decide refactor-for-testability vs test-exempt, or a test strategy cannot be
  actioned.
