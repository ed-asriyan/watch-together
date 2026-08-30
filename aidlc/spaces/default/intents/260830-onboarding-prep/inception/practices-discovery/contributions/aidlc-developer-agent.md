**Collaborator:** aidlc-developer-agent

## Contribution

Blind code-conventions review of the lead's `## Code Style` (and the boundary/error-handling
conventions that section implies). I inspected `package.json`, `tsconfig.json`, and a spread of
real source files (`src/stores/room/bound-store.ts`, `src/destructable.ts`, `src/utils.ts`,
`src/i18n/index.ts`, `src/settings.ts`) rather than relying on the CodeKB alone.

**Confirmed against source:**

- **No linter, no formatter.** `package.json` devDependencies contain no `eslint`, no `prettier`,
  no `eslint-config-*`; there is no `.eslintrc*`, `eslint.config.*`, `.prettierrc*`, or
  `.editorconfig`. The lead's correction that the earlier "ESLint present" assumption is **false**
  holds. The only static gate is `svelte-check ^4.3.3` (`check` / `check:watch` scripts) with TS
  strict via `@tsconfig/svelte` + `checkJs: true` (`tsconfig.json`). Confirmed.
- **Real style drift proves the "no formatter" claim.** Indentation is inconsistent *across* files
  and *within* one file: `bound-store.ts` and `destructable.ts` use 4-space; `i18n/index.ts` uses
  4-space; `utils.ts` mixes 2-space and deeper block indents; `tsconfig.json` mixes tab/odd-space.
  Space-before-paren is also inconsistent (`randomStr = function (…)` vs `sleep = function(…)`).
  This is direct evidence supporting the lead — nothing enforces style.
- **`svelte-kit sync` is genuinely vestigial.** `package.json` has no `@sveltejs/kit` dependency,
  yet `check`/`check:watch` both call `svelte-kit sync`. The lead's note is correct and worth
  flagging for the interview (safe to drop).

**Conventions actually present in the code (recommend recording, not merely "camelCase"):**
The lead's line "Language-idiomatic conventions apply (camelCase for TS/Svelte)" *understates* what
the codebase consistently does. The following are consistent enough across the tree to record as
team practice (they already appear in `code-structure.md` § Naming & Conventions):

- **Naming triad (consistent):** kebab-case filenames · PascalCase classes (`BoundStore`,
  `Destructable`, `SourceBuilder`) · camelCase functions/vars and module-level config objects
  (`firebaseConfig`, `webTorrentTrackers`, `defaultVideos`). Env keys are SCREAMING_SNAKE `VITE_*`
  (`settings.ts`). ES modules throughout (`"type": "module"`).
- **Function-declaration idiom (consistent):** logic modules use
  `export const name = function (…) { … }` (function expression bound to `const`), not
  `export function name()` and not arrow functions — see `utils.ts`, `i18n/index.ts`. Worth
  recording so generated code matches house style.
- **Module/layer boundaries (clean, confirmed):** `stores/**` own all reactive/remote state and
  expose the Svelte `Writable<T>` port (`bound-store.ts`); `components/**` bind to those stores and
  hold no persistence logic; `i18n/**` is self-contained; `settings.ts` is the single env-config
  choke point. The stores-vs-components-vs-i18n separation the lead relies on is real and
  well-observed.
- **Error-handling convention (observed):** boundary code uses **guard/early-return** checks
  (`if (value !== undefined)`, `if (snapshot.exists())`) with **no local `try/catch`**; failures
  propagate to the **global Sentry handler** wired in `main.ts`. This is a genuine, consistent
  convention — not an omission — but "global-only, no local recovery" is worth surfacing at the
  interview as a deliberate choice vs. a gap.

**Genuine open choices for the interview (do NOT record as team intent):**

- Adopt ESLint + Prettier (org default) vs. keep `svelte-check` as the sole gate. Truly open;
  evidence is silent on intent. Matches the lead's `NEEDS AFFIRMATION`.
- Whether to remove the vestigial `svelte-kit sync` step.
- Whether "global-Sentry-only" error handling is the intended standard for new code.

**Minor code-quality note (not a practice rule):** `settings.ts` annotates
`export const reactions: string = …split(',').map(…)` where the RHS is `string[]`, and several
config exports lean on `?.` producing looser-than-declared types. These type-annotation
inaccuracies are consistent with *no lint + loosely-applied return typing* and reinforce the
"style by convention only" finding; they belong in code-quality follow-up, not the practice set.

**Net:** the lead's `## Code Style` is accurate and I endorse it. My only substantive ask is to
promote the already-consistent naming triad, the `const`-function-expression idiom, and the clean
store/component/i18n boundary from implicit "camelCase" phrasing to **explicitly recorded team
conventions** (they are evidenced, not intent), while keeping linter/formatter adoption and the
error-handling standard as the open interview questions.

## Positions

- AGREE: No ESLint / no formatter; `svelte-check` + TS strict is the sole static gate — verified in
  `package.json` (no eslint/prettier deps) and confirmed by real cross-file indentation and
  spacing drift.
- AGREE: `svelte-kit sync` in the `check` script is vestigial — no `@sveltejs/kit` dependency
  exists; safe to flag for removal at the interview.
- AGREE: Deferring style enforcement to project config and flagging linter/formatter adoption as
  `NEEDS AFFIRMATION` — evidence is silent on team intent, so it is a genuine open choice.
- OBJECT: `## Code Style` under-specifies conventions that ARE consistently present. "camelCase for
  TS/Svelte" should be expanded to record the kebab-case-file / PascalCase-class / camelCase-member
  naming triad, the `export const x = function () {}` idiom, and the clean stores/components/i18n
  boundary as team practice — these are evidenced conventions, not invented intent, and generated
  code should conform to them.
