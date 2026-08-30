# Business Overview

## Domain

**Watch-together / synchronized video co-viewing.** The product (package name
`movie-together`, repo `watch-together`) lets geographically separated people
watch the same video in a shared "room" with playback kept in lockstep across
every participant's browser. It is a consumer, real-time social-viewing app: no
accounts, no server-side application logic — a room is a shareable URL and a
slice of shared state in Firebase Realtime Database.

## Purpose

Recreate the experience of sitting on the same couch:

- One person opens a room, picks a video source, and shares the room link.
- Anyone with the link joins instantly (no sign-up).
- **Play, pause and seek are mirrored** to everyone in near-real-time.
- Viewers **chat, react, and see who else is online** while watching.

The design bias is zero-friction sharing over control: rooms are public and
ephemeral by construction (see the unauthenticated data model in
[api-documentation.md](api-documentation.md) and the security posture in
[code-quality-assessment.md](code-quality-assessment.md)).

## Key Functionality

| Capability | What the user experiences | Owning component (see [component-inventory.md](component-inventory.md)) |
|---|---|---|
| Room join by link | Paste/open a URL hash `#<roomId>`; state loads and syncs | Root UI Shell, Real-Time Sync Core |
| Playback sync | Play/pause/seek propagate to all viewers with drift correction | Real-Time Sync Core, Video Player Subsystem |
| Pluggable video sources | Direct URL, YouTube, Vimeo, HLS, or a local file shared P2P | Source Normalizer, Video Player Subsystem, WebTorrent Delivery |
| Local-file co-watch | Seed a local file over WebTorrent/WebRTC to other viewers | WebTorrent Delivery |
| Live chat | Short-lived text messages in the room | Chat, Reactions & Presence |
| Reactions | Ephemeral emoji reactions overlaid on the player | Chat, Reactions & Presence |
| Presence | "Who is online" and per-user identity/colour | Chat, Reactions & Presence, Device & Identity Stores |
| Localization | UI in English, French, Russian | Internationalization |
| Minutes-watched stats | Per-user watch-time accounting (admin export) | Real-Time Sync Core, Admin Scripts |

## Users & Value

- **End users**: friends/communities co-watching content that is not on a shared
  streaming platform (own files, arbitrary links, live streams).
- **Operator/maintainer**: runs the static SPA on GitHub Pages, owns the Firebase
  project, and periodically prunes stale rooms and exports engagement stats via
  the Node admin scripts.

## Business-Relevant Constraints

- **Anonymous & public by design** — frictionless join, but any room is world
  read/write; there is no tenancy or authorization model. This is the dominant
  product/security trade-off and is tracked as tech debt.
- **Client-only** — there is no first-party backend; correctness of "watch
  together" depends entirely on client-side timestamp reconciliation over
  Firebase plus an external clock source. See the sync design in
  [architecture.md](architecture.md).
- **Legal surface** — the app ships a jurisdictional-warning banner plus
  `privacy-policy.txt` and `terms-and-conditions.txt`, reflecting that
  user-supplied sources may carry content/copyright risk.
