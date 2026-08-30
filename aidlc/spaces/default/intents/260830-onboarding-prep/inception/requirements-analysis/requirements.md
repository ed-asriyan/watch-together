# Requirements — watch-together (Existing-System Baseline)

> **Onboarding baseline.** This document captures what the existing application
> already does, as a traceable requirements baseline for future feature and
> bugfix runs. It is reverse-derived from the code knowledge base
> (`aidlc/spaces/default/codekb/watch-together/`), not a specification for new
> work. Requirement IDs (`FR{n}`, `NFR{n}`) are permanent traceability keys.
> Criticality: **Core** (must-keep) or **Peripheral**.

## Intent Analysis

**Goal.** Provide a serverless "watch together" experience where geographically
separated viewers watch the same video in near-perfect playback sync, with light
social presence (chat, reactions, who-is-online) layered on top. The product's
defining value is *shared synchronized playback with no backend server of its
own* — state is coordinated through Firebase Realtime Database and media is
delivered either from a URL or peer-to-peer via WebTorrent.

**System shape.** Client-only Svelte 5 SPA (Vite build) over Firebase Realtime
Database; video via vidstack player; optional peer-to-peer delivery via
WebTorrent. No first-party server or authority; the room subtree in RTDB is the
single source of shared truth.

## Functional Requirements

### FR1 — Rooms & session identity — *Core*
- FR1.1 A user can open/join a room identified by a room id carried in the URL hash.
- FR1.2 The last visited room is remembered locally and reopened on return.
- FR1.3 Each participant has a local identity (name) persisted client-side and published to the room.
- FR1.4 Room state (`url`, `currentTime`, `paused`, `users`, `messages`) is read as an initial snapshot and then kept live via subscriptions to the room subtree.

### FR2 — Synchronized playback — *Core*
- FR2.1 Play, pause, and seek actions by one viewer propagate to all other viewers in the room.
- FR2.2 Shared playback position and paused state are recorded so peers can reconcile against a common timeline.
- FR2.3 A receiving client reconciles only when divergence exceeds a tolerance band (to avoid jitter/feedback loops).
- FR2.4 An idle-pause guard pauses playback when it has been unpaused with no update beyond a timeout.
- FR2.5 A shared clock offset is computed from an external time source so drift math is consistent across clients.

### FR3 — Video source selection & playback — *Core*
- FR3.1 A viewer can set the room's video source by URL (mp4, HLS, YouTube, Vimeo, etc.) or by file.
- FR3.2 The player (vidstack) plays the shared source and exposes standard playback controls.
- FR3.3 A language/subtitle or source-variant selector is available where applicable.

### FR4 — Peer-to-peer co-watch (WebTorrent) — *Peripheral*
- FR4.1 A viewer can pick a local file to co-watch; it is seeded via WebTorrent and shared as a magnet URI through the room's `url`.
- FR4.2 Other viewers resolve the magnet URI, fetch the stream peer-to-peer, and play it through the player (served via a service worker).
- FR4.3 Media bytes flow peer-to-peer (WebRTC), never through Firebase.

### FR5 — Chat & reactions — *Peripheral*
- FR5.1 A viewer can send a text chat message to the room.
- FR5.2 A viewer can send an emoji reaction.
- FR5.3 Messages/reactions are ephemeral: they are pruned after a short lifetime and rendered as a transient overlay ordered by timestamp.

### FR6 — Presence — *Peripheral*
- FR6.1 The room shows who is currently online.
- FR6.2 A participant publishes liveness (e.g. `lastSeen`) so presence can be derived.

### FR7 — Internationalization — *Peripheral*
- FR7.1 The UI is available in multiple languages (currently English, French, Russian).
- FR7.2 Language selection is exposed to the user.

### FR8 — Settings & app shell — *Peripheral*
- FR8.1 User-facing settings (e.g. name, language) are persisted client-side.
- FR8.2 The app provides shell features present today: header, fullscreen, loader, scroll affordance, and jurisdictional/privacy banner.

### FR9 — Analytics & measurement — *Peripheral*
- FR9.1 The app emits typed product-analytics events to two external sinks — Google Analytics (via gtag/dataLayer) and Amplitude (with autocapture) — in production only; in non-production the events are logged to the console.
- FR9.2 The events currently tracked are: `click` (with a `target`), `watch_minute`, `seeked`, `paused`, `played`, `url_paste` (with the pasted `url`), `message_sent` (with `messageType`), `reaction_sent` (with `reactionEmoji`), and `locale_changed` (with `locale`). Every room-scoped event also carries room context: `roomId`, `paused`, source type, source URL/host, users count, and whether the source is an example.
- FR9.3 *(To define)* A deliberate measurement plan — which of these events map to success metrics/KPIs, and any privacy/consent constraints — is not yet formally specified and should be defined as a dedicated analytics requirements set in a future run.

### FR10 — Watch-time accounting — *Peripheral*
- FR10.1 Per-user minutes-watched is tracked during a session and contributes to engagement stats.

### FR11 — Admin / operations scripts — *Peripheral*
- FR11.1 An operator can export usage/stats via the `stats.js` script.
- FR11.2 Stale rooms are cleaned from the database on a schedule (`clean-db.js`, run via `clean-db.yml`).

## Non-Functional Requirements

- **NFR1 — Sync accuracy (Core).** Playback divergence between clients is kept within the reconciliation tolerance band during steady-state watching.
- **NFR2 — Serverless operation (Core).** The system runs with no first-party backend; all shared coordination goes through Firebase Realtime Database.
- **NFR3 — Real-time responsiveness (Core).** Control actions (play/pause/seek, chat, reactions) propagate with low perceived latency over RTDB subscriptions.
- **NFR4 — Client compatibility (Core).** Runs as a static SPA in modern browsers; peer-to-peer features require WebRTC and a registered service worker.
- **NFR5 — Localization (Peripheral).** Human-facing UI strings are localizable through the i18n layer.
- **NFR6 — Deployability (Core).** Ships as a static bundle deployed continuously to production (GitHub Pages) on push to trunk.
- **NFR7 — Observability (Core, current state).** Runtime errors are reported to Sentry. Product analytics is a separate concern, captured under FR9 (Analytics & measurement), not here.

## Constraints

- **C1.** Client-only architecture: no server-side authority, validation, or secrets enforcement — the RTDB security rules are the only access control.
- **C2.** Firebase Realtime Database is the coordination backbone; the shared room state it holds is the de-facto contract between clients.
- **C3.** Build/runtime stack is fixed for the baseline: TypeScript, Svelte 5, Vite, npm; deploy via GitHub Actions to GitHub Pages from trunk `master`.
- **C4.** Secrets and configuration are injected at build time from CI variables; nothing secret is committed to the repository.
- **C5.** Affirmed team practices apply (see `team.md`): squash-merge on `master`, custom BDD/acceptance-first testing methodology, `svelte-check` + e2e as CI gates, ESLint + Prettier.

## Assumptions

- **A1.** The baseline reflects the code at commit `e5f1ca34c861dfe1630968ce697e60e84d202204`; behavior described is what the code does, not necessarily what is desired.
- **A2.** Reconciliation tolerances and timeouts (drift band, idle-pause window, message lifetime) are as implemented; exact values live in the code and codekb, not restated here as hard targets.
- **A3.** WebTorrent co-watch and chat/reactions are treated as peripheral relative to the core synchronized-playback experience.

## Out of Scope (for this onboarding baseline)

- Designing or building any new feature — future per-task runs own that.
- Changing the existing behavior, schema, or deployment.
- Authentication/authorization redesign, backend introduction, or data-model migration.

## Open Questions / Known Issues (for future runs)

Captured from the reverse-engineering scan so future feature/bugfix/security runs can pick them up. These are **not** requirements to satisfy now — they are flagged risks and gaps.

- **OQ1 — Security (high).** Firebase Realtime Database rules are public/unauthenticated; any client can read/write the room subtree. A future security run should scope and lock these down.
- **OQ2 — Supply chain.** `webtorrent@2.2.1` is imported at runtime from `esm.sh` (unpinned CDN); a future run should pin/bundle it.
- **OQ3 — Config correctness.** Build-arg / setting name drift (`VITE_VITE_FIREBASE_APP_ID`, `MEASHUREMENT` vs `MEASUREMENT`) between `Dockerfile` and `settings.ts`.
- **OQ4 — Verification.** No automated tests exist and `svelte-check` is not enforced in CI; the affirmed testing posture (BDD/acceptance-first + e2e in CI) is not yet realized.
- **OQ5 — Testability seams.** Hard-coded external clock (`worldtimeapi.org`), global WebTorrent singletons, and the runtime CDN import make the highest-risk sync code hard to test as written.
- **OQ6 — Trunk/convention drift.** Deploy branch is `master` while the framework default is `main` (kept intentionally per affirmed practices).
- **OQ7 — Clock-source resilience.** The external time source (`worldtimeapi.org`) has no fallback or timeout and is a runtime single point of failure for all timed sync — a resilience risk distinct from the testability seam in OQ5.

## Review

**Reviewer:** aidlc-product-lead-agent
**Verdict:** READY
**Iteration:** 1

This advisory pass re-verified only FR9 (Analytics & measurement) against the actual source in src/analytics.svelte and src/settings.ts; prior findings R-01..R-05 remain resolved and R-06 was non-blocking. The FR9.2 revision now documents the real tracked event set and is accurate and complete against the code — no regression introduced. FR9.1 and FR9.3 are unchanged and still hold.

FR9.2 — Status: accurate. All ten events match the Event/RoomEvent subclasses exactly: click (target), watch_minute, seeked, paused, played, url_paste (url), message_sent (messageType), reaction_sent (reactionEmoji), and locale_changed (locale). The named params match each subclass's generic type parameter.
FR9.2 room-context claim — Status: accurate. The six RoomDetails fields (roomId, paused, srcType, srcUrl, usersCount, isExample) are correctly summarized, and the qualifier "room-scoped" correctly excludes locale_changed, which extends Event rather than RoomEvent and carries no room context.
FR9.1 sinks and gating — Status: accurate (unchanged). Google Analytics via gtag/dataLayer and Amplitude with autocapture, production-only, with console logging in non-production, matches track() and the settings gating.
No omissions or misstatements found in FR9.
