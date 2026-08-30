**Collaborator:** aidlc-devsecops-agent

## Contribution

Security / supply-chain / CI-controls review of the lead draft. Verified against
`.github/workflows/` (`CI.yml`, `CD.yml`, `build.yml`, `clean-db.yml`),
`.github/dependabot.yml`, `Dockerfile`, `package.json`, plus the codekb
`code-quality-assessment.md` and `dependencies.md`. Scope discipline: only
build-green and no-secrets-in-repo are **evidenced hard constraints**; every
proposed scanner/gate below is an **open team choice for the interview** or
**tech-debt owned by a later stage** — none is invented as current team intent.

### Evidenced security controls already in place (endorse, keep)

- **Secrets injected at runtime, never committed** — `FIREBASE_SERVICE_ACCOUNT_KEY`
  (`clean-db.yml`, GitHub *secret*) and `.env` from `ENV_FILE_CONTENT`
  (build.yml/CI.yml/CD.yml, repo *variable*). This directly substantiates the
  lead's existing FORBIDDEN rule. Confirmed: no key material in the tree.
- **Least-privilege deploy token + OIDC** — `CD.yml` scopes
  `permissions: contents: read / pages: write / id-token: write` and uses
  `actions/deploy-pages@v4` via OIDC (no long-lived deploy credential). This is a
  strong, deliberate control worth recording as a keep-practice.
- **Deterministic npm install** — `Dockerfile` uses `npm ci` against
  `package-lock.json`; direct + transitive npm deps are pinned by the lockfile.
- **Automated dependency updates** — `dependabot.yml` covers `npm`, `docker`, and
  `github-actions` weekly. This is a genuine, *practiced* supply-chain control and
  should be recorded as such (the lead's draft omits it).

### New security findings the lead's four artifacts do not yet capture

1. **Dependabot suppresses security patches** — all three ecosystems set
   `ignore: version-update:semver-patch` with `open-pull-requests-limit: 1`.
   Patch releases are where most CVE fixes ship; ignoring them means critical
   fixes never surface as PRs. Evidenced configuration weakness, not team intent —
   an interview question, not a silent default.
2. **Third-party GitHub Actions pinned to mutable tags** — `cicirello/generate-sitemap@v1`
   (and `actions/*@vN`) are pinned to moving major tags, not commit SHAs. A
   compromised or retagged action runs in the deploy pipeline that holds
   `id-token: write`. Supply-chain risk in CI itself.
3. **Docker base images unpinned** — `FROM node:25` and `FROM nginx` (implicit
   `latest`) are not digest-pinned; the `node:25` full image is a large attack
   surface vs a `slim`/distroless base. Reproducibility + supply-chain exposure.
4. **`clean-db.yml` has no `permissions:` block** — it runs with the default broad
   `GITHUB_TOKEN` while handling the Firebase service-account key. Least-privilege
   gap; should mirror the explicit scoping `CD.yml` already models.
5. **No SAST, secret-scanning, or dependency-vulnerability gate in CI** — `CI.yml`
   builds PRs only; there is no `npm audit`/Snyk gate, no Gitleaks/git-secrets, no
   Semgrep/ESLint-security. Absence is evidenced; adoption is an **open choice**,
   so these are interview candidates, not evidenced MANDATED rules.

### Classification of the three scan-known risks (MANDATED/FORBIDDEN vs tech-debt)

| Risk | Recommendation | Owning stage / interview |
|---|---|---|
| **Public unauthenticated Firebase rules** (`.read`/`.write: true`) | **Tech-debt, not a practice rule now.** It is a concrete app-security defect in the running system, not a way-of-working. Do **not** mandate a code change during practices-discovery. | Carry to `threat-modelling` + `nfr-requirements` for remediation; raise as interview question "should a data-store-authz guardrail become a FORBIDDEN rule?" — **NEEDS AFFIRMATION**, do not assert team intent. |
| **Unpinned `webtorrent@2.2.1` runtime import from esm.sh CDN** (`stores/web-torrent.ts:52`) | **Tech-debt for remediation.** A forward guardrail ("no unpinned third-party CDN imports at runtime; pin + SRI or bundle") is defensible but contradicts current code, so it is an affirmation candidate, not an evidenced rule. | `code-generation`/hardening to bundle-or-pin; interview candidate for a forward supply-chain FORBIDDEN rule — **NEEDS AFFIRMATION**. |
| **Build-arg config drift** (`VITE_VITE_FIREBASE_APP_ID`, `MEASHUREMENT` typo) | **Tech-debt, correctness bug — not security, not a practice rule.** | `bugfix`/`code-generation`; no practice rule. |

### Net effect on the lead's Discovered Rules

The two existing rules (build-green, no-secrets) are correct and I endorse both.
No *additional* MANDATED/FORBIDDEN rule is evidenced as current practice from the
security side — the scanners and the three risks above are either open team
choices (interview) or later-stage tech-debt. My one integration ask: the
"Cross-cutting risks noted … not practice rules" list in `evidence.md` should be
handed forward with **named owning stages** so it is tracked, not dropped, and
the four new CI findings above should join it.

## Positions

- AGREE: existing FORBIDDEN rule "NEVER commit secrets or environment config" — directly evidenced by secret/variable injection in `build.yml` and `clean-db.yml`; the tree is clean. Endorsed from the security view.
- AGREE: existing MANDATED rule "keep the production build green before merge" — `CI.yml`/`CD.yml` gate on `make prod_build_bundle`; a sound and evidenced hard constraint.
- AGREE: treating public Firebase rules, the esm.sh CDN import, and build-arg drift as later-stage items rather than practice rules — correct scope discipline; they are defects/choices, not evidenced ways-of-working.
- OBJECT: the draft omits evidenced supply-chain controls and weaknesses — Dependabot (a *practiced* control) is absent from the artifacts, and its `ignore: semver-patch` suppression, mutable-tag GitHub Actions, unpinned Docker bases, and `clean-db.yml`'s missing `permissions:` block are not recorded. Add Dependabot as a keep-practice and surface the four weaknesses as interview questions / later-stage tech-debt.
- OBJECT: the three cross-cutting risks in `evidence.md` are deferred without an owning stage — they risk being dropped. Recommend the lead attach explicit hand-off targets (`threat-modelling`, `nfr-requirements`, `code-generation`/`bugfix`) so deferral is tracked, not silent.
