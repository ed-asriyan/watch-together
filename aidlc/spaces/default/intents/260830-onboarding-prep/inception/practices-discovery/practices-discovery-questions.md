# Practices Discovery — Interview

> Answer each by filling the `[Answer]:` tag with an option letter (A-E) or `X` for Other.
> Recommended defaults are noted, but these are your team's calls.

## Way of Working

### Q1. Trunk branch name
Your repo currently uses `master` as the trunk (CI/CD deploy from it). The framework default is `main`.
- A. Keep `master`
- B. Migrate to `main`
- X. Other (please specify)

[Answer]: A

### Q2. Merge strategy
History shows merge commits; the framework default is squash-merge (one commit per unit of work on the trunk).
- A. Squash-merge (default)
- B. Keep merge commits (current)
- X. Other (please specify)

[Answer]: A

## Testing Posture

This repo currently has **no tests**; only `svelte-check` exists (and it runs locally, not in CI).

### Q3. Test adoption + methodology (what future runs should do)
- A. Adopt tests, **test-after** (implement, then write tests) — *recommended default*
- B. Adopt tests, **TDD** (tests first)
- C. Adopt tests, **BDD** (Given/When/Then scenarios first)
- D. No test suite — keep as-is, just keep the build green
- X. Other (please specify)

[Answer]: C: Given/When/Then scenarios, then idenify html anchors (which will be used by the test framework, likely playwright), then implement e2e tests and them implementation. after that run tests

### Q4. Enforce `svelte-check` as a CI gate before merge/deploy?
Currently type-checking is local-only; wiring it into CI is near-zero-cost.
- A. Yes — add `svelte-check` to CI
- B. No — keep it local-only
- X. Other (please specify)

[Answer]: A. also e2e should also be added to CI

## Deployment

Current pipeline: continuous deploy to production (GitHub Pages) on push to trunk — no staging, no manual gate.

### Q5. Deployment gating
- A. Keep continuous deploy-to-production (current)
- B. Add a staging tier + manual production approval gate (framework default)
- X. Other (please specify)

[Answer]: A

## Code Style

### Q6. Linting / formatting
Only `svelte-check` + TS strict gate today; no ESLint, no Prettier.
- A. Adopt ESLint + Prettier
- B. Keep `svelte-check` + TS strict as the sole gate (current)
- X. Other (please specify)

[Answer]: A

### Q7. Supply-chain rule — unpinned runtime CDN imports
The app imports `webtorrent@2.2.1` at runtime from `esm.sh` (CDN supply-chain risk).
- A. Record a FORBIDDEN rule against unpinned runtime CDN imports (prefer pinned/bundled deps)
- B. Leave as tech-debt for a later security run (no practice rule now)
- X. Other (please specify)

[Answer]: B


---

## Consolidated Summary Confirmation

Please confirm this consolidated reading of your practices before I finalize the artifacts.

- **Way of Working**: trunk-based on `master` (kept, not migrated); **squash-merge** (one commit per unit of work); short-lived branches.
- **Walking Skeleton**: off (onboarding scope).
- **Testing Posture** — Methodology: **custom** (BDD / acceptance-first). Ordering: write Given/When/Then acceptance scenarios first, identify the HTML anchors/selectors the test framework (Playwright) will target, implement the e2e tests, implement the feature, then run the tests after. Current state: no tests yet (adoption is forward-looking).
- **CI gates**: add **svelte-check** AND **e2e (Playwright)** to CI before merge/deploy.
- **Deployment**: keep **continuous deploy to production** on push to trunk (no staging, no manual gate).
- **Code Style**: adopt **ESLint + Prettier** (alongside svelte-check + TS strict).
- **Supply-chain**: unpinned runtime CDN import (webtorrent / esm.sh) recorded as **tech-debt** for a later security run (no practice rule now).

Reply `Looks correct` to finalize, or `Request changes` to adjust.

[Answer]: Looks correct
