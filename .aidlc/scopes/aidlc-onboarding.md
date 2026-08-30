---
name: onboarding
depth: Standard
keywords: []
description: Seed durable context on an existing codebase for future AI-DLC runs
skeleton: off
review_cap: advisory
---

# onboarding scope

A brownfield context-seeding run. Its DONE is not shipped code but durable
context artifacts on disk, so that future feature/bugfix runs have the map,
the conventions, and the product memory they need. Composed the first time
AI-DLC is run on an existing project.

## Why these stages, why skip those

Onboarding answers "what is already here and how do I work with it?" so it
keeps only the discovery stages that produce durable context:
reverse-engineering (maps the existing codebase into the local artifact
store later runs read), practices-discovery (captures build/test/lint/CI
conventions into project/team memory), and requirements-analysis (seeds a
product/requirements memory of what the app does). The entire delivery arc
— design, units, code-generation, build-and-test, deployment, operations —
is SKIP because this run ships no feature; each future per-task run invokes
those itself.

## Membership

Composed scope, not keyword-inferable (`keywords: []`). Invoke explicitly
with `--scope onboarding`. Initialization plus the three discovery stages
execute; everything else is SKIP.
