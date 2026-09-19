# `src/` layout

Mid-refactor. Two things live here at once:

| Directory | What it is |
|---|---|
| `domains/` | **New.** One folder per bounded context. Currently one: `watch-session`. Interfaces only — no implementation yet. |
| `adapters/driving/svelte/` | **New.** The UI, rewritten against the ports. This is what runs. |
| `composition/` | **New.** The composition root. Currently wires the UI to a stub. |
| `i18n/` | **New.** Copied out of `legacy/`, plus the keys the new adapter needs. |
| `legacy/` | **Frozen.** The old application, kept as the written record of rules that exist nowhere else. Deleted at migration step 6. |

## Running it

`index.html` points at `src/composition/bootstrap.ts`. The app builds, renders
and navigates — and **nothing works**, on purpose: every command is a logged
no-op from `composition/stub-session.ts` and every view is a constant. Open the
console to watch the commands the UI actually issues.

To run the old application instead, point `index.html` back at
`/src/legacy/main.ts`.

```console
npm run check:skeleton   # domains/ typecheck in isolation + boundary guard
npm run check:ui         # svelte-check over domains + adapters + composition
npm test                 # the domain suite (currently all red, on purpose)
npm run check:all        # all of the above, then a production build
```

## Tests come before the implementation

The suite is written as a black box against the contracts. Right now every one
of its ~100 tests fails with `NotImplemented: <name> is not implemented yet`,
and that is the baseline: **the passing count is the progress bar.**

The function signatures used to be ambient declarations, which emit no
JavaScript — importing one from a test was a module-link error, not a
meaningful failure. They now have bodies that throw, so the suite is executable
and each unimplemented rule reports as one clear red test naming itself. Those
throws are placeholders, not implementation; deleting one is what implementing
looks like.

Two things are real code rather than stubs, because they are data and the tests
need concrete numbers: `DEFAULT_SYNC_POLICY` and `LEGACY_SYNC_POLICY` (the
legacy constants, for characterization at migration step 2), and `NO_DECISION`.

Nothing in the domain suite needs a clock, a timer, a DOM or a network mock —
every rule takes `now` as an argument, so `test-support/builders.ts` is plain
object factories. `test-support/fakes/` holds a `FakeClock` and a
`FakeScheduler` for the session-level tests that arrive with the coordinator.

Two files carry most of the weight:

- `model/desync.spec.ts` — the sync rules meeting each other.
- `ports/watch-session.spec.ts` — orchestration: which outbound calls an inbound
  call produces, in what ORDER, with what arguments, and which room they land
  in. Every outbound port is spied into one shared `CallLog`, so ordering across
  ports is assertable — "armed disconnect cleanup before announcing presence",
  "synchronized the clock before publishing", "closed the old room before
  opening the new one".

The rest: `model/feed.spec.ts` (chat and reactions — publish, arrive, notify,
expire), `model/shared-clock.spec.ts` ("earlier" always means the shared
reading, never a device clock), and one file per rule.

`model/desync.spec.ts` is the one to read first. The other files pin down each
rule on its own; that one is about the rules meeting each other — a local
playhead disagreeing with an incoming one, a player still buffering, updates
arriving late, twice, out of order, or from a peer whose clock is wrong. It is
the code the whole refactor exists to make testable.

Port contract suites live in `ports/outbound/__contracts__/`. They are exported,
parameterized functions with no runner yet, because no adapter exists — written
first so adapters are built against a spec instead of the spec being
reverse-engineered from whatever the first adapter happened to do.

## Layout

```
src/
├── domains/
│   └── watch-session/              the bounded context — everything it owns
│       ├── model/                  THE DOMAIN LAYER: pure, imports nothing outward
│       │   ├── shared/             Brand, EpochMs/Seconds, Observable, Stamped
│       │   ├── ids.ts              media-source.ts   playhead.ts   participant.ts
│       │   ├── activity.ts         connection.ts     events.ts     decision.ts
│       │   ├── sync-policy.ts      reconcile.ts      echo.ts
│       │   ├── presence-policy.ts  retention-policy.ts
│       │   └── room-state.ts       room-replica.ts
│       └── ports/
│           ├── index.ts            THE IMPLEMENTATION (`WatchSession`)
│           ├── event-bus.ts        internal: synchronous domain-event fan-out
│           ├── inbound/            ports the context IMPLEMENTS, adapters CALL
│           │   ├── index.ts
│           │   ├── watch-session-commands.ts   site controls outside the player
│           │   ├── watch-session-view.ts       what the UI may observe
│           │   ├── views.ts                    the view-model shapes
│           │   ├── remote-room-listener.ts     signals from the remote store
│           │   ├── media-player-listener.ts    facts from the media element
│           │   └── session-ticks.ts            the scheduler
│           └── outbound/           ports adapters IMPLEMENT, the context CALLS
│               ├── index.ts
│               ├── room-gateway.ts    media-resolver.ts   telemetry.ts
│               ├── media-player.ts    profile-store.ts    error-reporter.ts
│               ├── clock.ts           id-generator.ts     location.ts
│               └── scheduler.ts
└── legacy/
```

Grouping by context first and by layer second is the normal DDD / modular-monolith
shape: everything one context owns sits in one folder, so a change lands in one
place and a future second context (`media-delivery`, say) is a sibling rather
than four edits spread across four layer folders.

`ports/index.ts` sits beside `inbound/` and `outbound/` on purpose: it is the
thing in the middle of the hexagon. It exports `WatchSession`, one object that
satisfies all four inbound ports, so each driving adapter needs a single
reference — the Svelte tree takes `commands` + `view`, the gateway adapter takes
it as a `RemoteRoomListener`, the player adapter as a `MediaPlayerListener`, the
scheduler as `SessionTicks`. Today it exports the contract and a declared
factory; the class lands with the implementation.

Adapters (`adapters/driving`, `adapters/driven`) and the composition root
(`composition/`) do not exist yet — they arrive with the implementation.

Design: [`docs/architecture/001-ddd-hexagonal-design.md`](../docs/architecture/001-ddd-hexagonal-design.md).

## Why `model/` is separate from `ports/`

Because "domain" names two different things and only one of them may see a port.

`watch-session/` is the **bounded context** — the whole module, ports included.
`model/` is the **domain layer** — entities, value objects, policies, the
aggregate — and it must not know that `RoomGatewayPort` or `ClockPort` exist at
all. If the two shared a folder, nothing would stop `playhead.ts` from importing
`ports/outbound/clock.ts`, and the moment the model can read a clock, every
synchronization rule stops being a pure function of its arguments and the whole
reason for this refactor evaporates.

That is the only structural constraint here. Everything else is navigation.

## Boundaries

```console
npm run check:skeleton     # typecheck in isolation + boundary guard
```

The typecheck compiles `src/domains/**` with `types: []` — no Svelte, no
Firebase, no Vidstack in scope. If the skeleton ever needs one of those to
compile, a boundary has been crossed.

`scripts/check-boundaries.mjs` additionally fails the build when:

1. anything under `domains/` imports a framework or vendor SDK
   (`svelte`, `firebase`, `vidstack`, `webtorrent`, `@sentry`, `@amplitude`);
2. anything under `model/` imports from `ports/`;
3. anything under `model/` reads ambient state — `Date.now`, `Math.random`,
   `setTimeout`, `setInterval`, `localStorage`, `sessionStorage`, `fetch`.

Rule 3 is the load-bearing one. A model that cannot read a clock must be *given*
every timestamp, which is what makes drift, echo suppression, presence expiry
and the stale-playback guard testable by advancing a fake clock instead of
waiting sixty real seconds.

This is a grep, not a real analysis; `dependency-cruiser` replaces it at step 0
of the migration plan.

## Current state: implemented

The domain, the coordinator and the adapters are written. 278 of 280 tests
pass; the two failures are a limitation of a test double, not of the code, and
are described in `docs/architecture/001-ddd-hexagonal-design.md` §19.

`src/composition/container.ts` is the only file that names concrete classes.
Without a configured database it wires `InMemoryRoomGateway` and a plain
`SystemClock`, so `npm run dev` works with no credentials at all — the same
code path the contract tests take.

## Command vs listener vs port command

Three things read as "play" and only two of them exist:

| | Direction | Caller | Implementer | Meaning |
|---|---|---|---|---|
| `MediaPlayerListener.onPlayed(at)` | inbound | Vidstack adapter | the context | fact: the element *did* start |
| `MediaPlayerPort.play()` | outbound | the context | Vidstack adapter | command: make the element play |
| ~~`WatchSessionCommands.requestPlay()`~~ | inbound | nobody | the context | intent: "user asked to play" |

The app renders no transport controls of its own — `<media-video-layout>` owns
play, pause, scrub and volume and acts on the element directly. So every
playback intent originates *inside* the player and arrives as a listener fact,
never as a command. `requestPlay` / `requestPause` / `requestSeek` were
therefore removed from `WatchSessionCommands`; add them back the day custom
transport controls or keyboard shortcuts appear, since a custom button must not
poke `MediaPlayerPort` behind the domain's back.

"Did the user press play, or did we call `play()` ourselves?" is answered by
echo detection in `model/echo.ts`, not by having two entry points.
