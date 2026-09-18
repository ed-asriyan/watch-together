# `src/` layout

This tree is mid-refactor. Two things live here at once:

| Directory | What it is |
|---|---|
| `domain/` | **New.** Pure TypeScript. Value objects, policies, the aggregate. Zero imports outside `domain/`. |
| `application/` | **New.** Ports (inbound + outbound), read models, the coordinator. May import `domain/`. May *declare* ports; may not import adapters. |
| `legacy/` | **Frozen.** The application as it is today. Still the only thing that runs. Deleted at the end of the refactor. |

## Layout

```
src/
├── domain/                     pure model: value objects, policies, aggregate
│   ├── shared/
│   └── room/
├── application/
│   ├── event-bus.ts            internal: synchronous domain-event fan-out
│   └── ports/
│       ├── index.ts            ← THE IMPLEMENTATION SIDE (`WatchSession`)
│       ├── inbound/            ports the application IMPLEMENTS, adapters CALL
│       │   ├── index.ts
│       │   ├── watch-session-commands.ts   site controls outside the player
│       │   ├── watch-session-view.ts       what the UI may observe
│       │   ├── views.ts                    the view-model shapes
│       │   ├── remote-room-listener.ts     signals from the remote store
│       │   ├── media-player-listener.ts    facts from the media element
│       │   └── session-ticks.ts            the scheduler
│       └── outbound/           ports adapters IMPLEMENT, the application CALLS
│           ├── index.ts
│           ├── room-gateway.ts    media-resolver.ts   telemetry.ts
│           ├── media-player.ts    profile-store.ts    error-reporter.ts
│           ├── clock.ts           id-generator.ts     location.ts
│           └── scheduler.ts
└── legacy/                     frozen; still the code that runs
```

`ports/index.ts` sits beside `inbound/` and `outbound/` on purpose: it is the
thing in the middle of the hexagon. It exports `WatchSession`, one object that
satisfies all four inbound ports, so each driving adapter needs a single
reference — the Svelte tree takes `commands` + `view`, the gateway adapter
takes it as a `RemoteRoomListener`, the player adapter as a
`MediaPlayerListener`, the scheduler as `SessionTicks`. Today it exports only
the contract and a declared factory; the class lands with the implementation.

Adapters (`adapters/driving`, `adapters/driven`) and the composition root
(`composition/`) do not exist yet — they arrive with the implementation.

Design: [`docs/architecture/001-ddd-hexagonal-design.md`](../docs/architecture/001-ddd-hexagonal-design.md).

## Command vs listener vs port command

Three things read as "play" and only two of them exist:

| | Direction | Caller | Implementer | Meaning |
|---|---|---|---|---|
| `MediaPlayerListener.onPlayed(at)` | inbound | Vidstack adapter | application | fact: the element *did* start |
| `MediaPlayerPort.play()` | outbound | application | Vidstack adapter | command: make the element play |
| ~~`WatchSessionCommands.requestPlay()`~~ | inbound | nobody | application | intent: "user asked to play" |

The app renders no transport controls of its own — `<media-video-layout>` owns
play, pause, scrub and volume and acts on the element directly. So every
playback intent originates *inside* the player and arrives as a listener fact,
never as a command. `requestPlay` / `requestPause` / `requestSeek` were
therefore removed from `WatchSessionCommands`; add them back the day custom
transport controls or keyboard shortcuts appear, since a custom button must not
poke `MediaPlayerPort` behind the domain's back.

"Did the user press play, or did we call `play()` ourselves?" is answered by
echo detection in `domain/room/echo.ts`, not by having two entry points.

## Current state: interfaces only

Everything under `domain/` and `application/` is **types and declared
signatures, with no implementation**. Function bodies are intentionally absent:

```ts
export declare function reconcile(...): Correction;
```

These are ambient declarations. They typecheck and they are reviewable, but
importing one at runtime would fail — nothing imports them yet, and nothing
should until the implementation phase begins.

Typecheck the skeleton on its own (no Svelte, no Firebase, no DOM framework
types — that is the point):

```console
npm run check:skeleton
```

It must stay at zero errors. If the skeleton ever needs a `svelte`, `firebase`
or `vidstack` import to compile, the boundary has been crossed and the design
is wrong.

## The dependency rule

1. `domain/**` imports only from `domain/**`. No `svelte`, `firebase`,
   `vidstack`, `import.meta.env`, `Date`, `Math.random`, `setTimeout`,
   `localStorage`, `fetch`.
2. `application/**` imports from `domain/**` and `application/**`.
3. `adapters/**` imports from `application/ports/**`, `domain/**`, and the
   library it adapts. Adapters never import each other.
4. Only `composition/**` imports everything.

Rule 1's ban on reading a clock is the load-bearing one: if the domain cannot
call `Date.now()`, every timestamp must be passed in, which is what makes the
synchronization logic testable at all.

These rules are not yet mechanically enforced — `dependency-cruiser` lands with
step 0 of the migration plan (§14 of the design doc).
