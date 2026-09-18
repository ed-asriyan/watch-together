# `src/legacy/` — frozen reference implementation

This is the application exactly as it was at commit `6f71a2b`, moved wholesale
out of `src/` so the new `domain/` and `application/` trees can be built beside
it without name or concept collisions.

**It is still the code that runs.** `index.html` points at
`src/legacy/main.ts`. Nothing here has been modified — only relocated — so the
build, the deploy and the behaviour are unchanged.

## Why it is kept

It is the only written record of several rules that exist nowhere else:

| Rule | Where |
|---|---|
| Remote position applied only if divergence > 0.5s | `stores/room/bound-current-time.ts:9` |
| LWW tolerance band on remote values | `stores/room/bound-timed-store.ts:21` |
| Force-pause after 60s of silence | `stores/room/index.ts:59` |
| Online if `lastSeen + 13s > now` (and `+10s` in the sweeper) | `stores/room/bound-users.ts:35`, `:53` |
| Feed items live 10s, swept every 3s | `stores/room/bound-messages.ts:9`, `:10` |
| Seek/play/pause post a system notice | `components/video-player/index.svelte:70,79,83` |
| Watch-time accrues a minute at a time | `stores/room/bound-minutes-watched.ts:26` |
| Source classification regexes | `normalize-source.ts` |
| Proxy / extractor probing order | `components/video-player/explore-url.ts` |

Migration step 2 ("characterization") replays these against the new pure
functions and records, per behaviour, whether the legacy result is the intended
one or a bug being deliberately fixed. Until that is done, this directory is
the specification.

## Known defects in here — do not port them forward

1. `paused` and `currentTime` are two independent LWW registers on two RTDB
   nodes; they can be applied out of order relative to each other.
2. `get(store)` attaches and detaches a Firebase `onValue` listener, because
   `BoundStore` registers it in the `writable` start function.
   `analytics.svelte` does this three times per tracked event.
3. `bound-users.ts:32` captures `now()` outside its subscription callback, so
   the presence cut-off is frozen at subscription time.
4. `bound-store.ts:27` calls Firebase `set()` without awaiting or handling
   rejection — a failed write diverges silently.
5. `bind:paused` / `bind:currentTime` make the media element and the
   Firebase-backed store two masters of one value; the loop is damped by three
   booleans in view scope.
6. `randomStr(6)` (~31 bits) is used for activity ids; a collision silently
   overwrites a message.

## Lifetime

Deleted in migration step 6, once the new engine is live and the old one has no
callers. Nothing new should import from this directory.
