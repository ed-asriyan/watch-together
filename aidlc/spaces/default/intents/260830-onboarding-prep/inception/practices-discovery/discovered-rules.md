# Discovered Rules

> Hard constraints only — each is either directly evidenced in the repository,
> org-mandated, or affirmed at the practices interview. Soft preferences and
> intent-based choices live in `team-practices.md`, not here. Nothing is
> invented.

## Mandated

- ALWAYS write every human-facing artifact and conversational output in the
  established conversation language (org-mandated in `memory/org.md`
  `## Mandated`; this session's language is English).
- ALWAYS keep the production build/type-check green in CI before merge:
  `CI.yml` runs `make prod_build_bundle` (→ `npm run build`) on every pull
  request, and `CD.yml` runs the same build before deploying — a failing build
  blocks the pipeline (evidenced in `.github/workflows/`).
- ALWAYS have the e2e (Playwright) suite pass in CI before merge or deploy
  (affirmed CI gate; the e2e stage is being added to CI for this purpose).

## Forbidden

- NEVER commit secrets or environment config to the repository. The `.env`
  content is injected at build time from the `ENV_FILE_CONTENT` CI variable and
  the Firebase service-account key from the `FIREBASE_SERVICE_ACCOUNT_KEY`
  secret; neither is checked in (evidenced in `build.yml`, `clean-db.yml`,
  `Makefile`, `README.md`).
