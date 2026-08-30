# Requirements Analysis — Clarifying Questions

> This is an onboarding run: the requirements baseline documents what the **existing** app already does, so future feature/bugfix runs have a traceable starting point.
> Fill each `[Answer]:` with an option letter (A-C) or `X` for Other.

### Q1. Scope of the requirements baseline
How much of the existing system should the baseline cover?
- A. Whole app — rooms + playback sync, video player, WebTorrent co-watch, chat, reactions, online presence, i18n, settings
- B. Core only — rooms + playback sync — with the rest noted briefly
- X. Other (please specify)

[Answer]: A

### Q2. Capture known issues as explicit items?
The scan found real tech-debt/risks (public Firebase rules, unpinned CDN import, config-name drift, no tests).
- A. Yes — record them as constraints / open questions so future runs can pick them up
- B. No — keep the baseline to current behavior only
- X. Other (please specify)

[Answer]: A

### Q3. Criticality tagging
Should each capability be tagged core (must-keep) vs peripheral, to guide future changes?
- A. Yes — tag criticality on requirements
- B. No — a flat list is fine
- X. Other (please specify)

[Answer]: A

---

## Consolidated Summary Confirmation

- **Scope**: whole-app requirements baseline — rooms + playback sync, video player, WebTorrent co-watch, chat, reactions, online presence, i18n, settings.
- **Known issues**: captured as explicit constraints / open questions (public Firebase rules, unpinned `webtorrent`/esm.sh CDN import, `VITE_VITE_`/`MEASHUREMENT` config drift, no test suite) so future runs can pick them up.
- **Criticality**: each capability tagged core (must-keep) vs peripheral.

Does this all look correct before I generate the requirements artifact?

- Looks correct
- Request changes

[Answer]: Looks correct
