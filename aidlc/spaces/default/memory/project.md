# Project-Level Rules

> Project-specific specialisation and corrections. Loaded after `org.md` and
> `team.md` as strict-additive guidance; contradictions with broader policy
> are rejected. Populated by practices-discovery and the self-learning loop.
>
> Use sparingly: most teams don't need a project layer. Reach for it
> only when this specific project needs stable, durable guidance beyond the
> team practice (for example, package-specific release checks or an additional
> regression suite for a legacy component).

## Way of Working

<!-- Project-specific specialisation. Example: -->
<!-- This monorepo requires package-scoped branch names and a package owner -->
<!-- review in addition to the team's normal merge policy. -->

## Walking Skeleton

<!-- Project-specific specialisation. Example: -->
<!-- The walking skeleton must exercise the legacy service adapter as well -->
<!-- as the new service boundary. -->

## Testing Posture

<!-- Project-specific specialisation. -->

## Deployment

<!-- Project-specific specialisation. -->

## Code Style

<!-- Project-specific specialisation. -->

## Tech Stack

<!-- Technology choices locked for this project. -->

## Decided

<!-- Decisions made in earlier stages that should not be re-asked. -->
<!-- Format: DECIDED: [decision] (Stage [slug], [date]) -->

## Scope Overrides

<!-- Custom scope rules for this project. -->

## Forbidden

<!-- Populated by practices-discovery affirmation gate. -->
<!-- Format: NEVER [behavior] (affirmed [date]) -->
<!-- Example: NEVER throw exceptions across service layer boundaries (affirmed 2026-05-17) -->

- NEVER commit secrets or environment config to the repository. The `.env` (affirmed 2026-08-30)
content is injected at build time from the `ENV_FILE_CONTENT` CI variable and (affirmed 2026-08-30)
the Firebase service-account key from the `FIREBASE_SERVICE_ACCOUNT_KEY` (affirmed 2026-08-30)
secret; neither is checked in (evidenced in `build.yml`, `clean-db.yml`, (affirmed 2026-08-30)
`Makefile`, `README.md`). (affirmed 2026-08-30)
## Mandated

<!-- Populated by practices-discovery affirmation gate. -->
<!-- Format: ALWAYS [behavior] (affirmed [date]) -->
<!-- Example: ALWAYS use Result<T,E> for fallible operations in service layer (affirmed 2026-05-17) -->

- ALWAYS write every human-facing artifact and conversational output in the (affirmed 2026-08-30)
established conversation language (org-mandated in `memory/org.md` (affirmed 2026-08-30)
`## Mandated`; this session's language is English). (affirmed 2026-08-30)
- ALWAYS keep the production build/type-check green in CI before merge: (affirmed 2026-08-30)
`CI.yml` runs `make prod_build_bundle` (→ `npm run build`) on every pull (affirmed 2026-08-30)
request, and `CD.yml` runs the same build before deploying — a failing build (affirmed 2026-08-30)
blocks the pipeline (evidenced in `.github/workflows/`). (affirmed 2026-08-30)
- ALWAYS have the e2e (Playwright) suite pass in CI before merge or deploy (affirmed 2026-08-30)
(affirmed CI gate; the e2e stage is being added to CI for this purpose). (affirmed 2026-08-30)
## Corrections

<!-- Project-specific corrections from human feedback. -->
<!-- Format: NEVER/ALWAYS [behavior] (learned [date]) -->
