# `src/` layout

This tree is mid-refactor. Two things live here at once:

| Directory | What it is |
|---|---|
| `domain/` | **New.** Pure TypeScript. Value objects, policies, the aggregate. Zero imports outside `domain/`. |
| `application/` | **New.** Ports (inbound + outbound), read models, the coordinator. May import `domain/`. May *declare* ports; may not import adapters. |
| `legacy/` | **Frozen.** The application as it is today. Still the only thing that runs. Deleted at the end of the refactor. |

Adapters (`adapters/driving`, `adapters/driven`) and the composition root
(`composition/`) do not exist yet — they arrive with the implementation.

Design: [`docs/architecture/001-ddd-hexagonal-design.md`](../docs/architecture/001-ddd-hexagonal-design.md).

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
