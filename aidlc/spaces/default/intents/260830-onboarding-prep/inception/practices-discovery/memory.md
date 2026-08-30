<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is kept up to date automatically while the stage runs. Add observations at the review step, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->

- 2026-08-30 — Tradeoff: team chose a custom BDD/acceptance-first testing methodology (Given/When/Then → HTML anchors → Playwright e2e → implementation → run after), despite the repo having zero tests today. Adoption is forward-looking.
- 2026-08-30 — Deviation: kept trunk `master` (not migrated to org default `main`); kept continuous deploy-to-prod (no staging/manual gate, contra org default).
- 2026-08-30 — Interpretation: CI currently enforces only the build; svelte-check is local-only. Team affirmed adding svelte-check + e2e as CI gates.
