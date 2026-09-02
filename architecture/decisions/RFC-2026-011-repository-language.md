# RFC-2026-011 — The repository's language, and why type annotations would be a claim nothing checks

Status: Proposed
Decision needed by: `OPEN-018`, the remaining half of it
Owner: A0 Architecture/Integration
Protocol version: `1.0.0`

## Problem

`OPEN-018` asks three questions in one line — *"Repository language/runtime/package
manager"* — with A0 as sole owner and a due gate of *"ก่อนเริ่ม G1"*. Its safe default
while open is *"TypeScript/Node/Next.js assumption; ห้าม lockfile จนประกาศ"*.

**RFC-2026-001 answered two of the three and is silent on the first.** It pins Node
`24.20.0` and npm `11.19.0`, forbids a second package manager, a second lockfile and any
global package install. It does not contain the words TypeScript, JavaScript, or
language. Reading `OPEN-018` as closed by RFC-2026-001 would close a question nobody
answered.

**The repository as built contradicts the safe default it was assumed to follow.** There
are 44 `.mjs` files, **zero** `.ts` or `.tsx` files, no `tsconfig.json`, and zero
dependencies of any kind. Every validator, guard and test kit is plain JavaScript ESM
running on `node:test`. Whatever the assumption said, this is what exists.

## What was measured, not assumed

Two beliefs decide this question and both were tested against the pinned runtime rather
than recalled.

**"TypeScript needs a build step or a dependency" is false.** Node `24.20.0` runs a
`.ts` file directly through native type stripping — no `tsc`, no bundler, no
`tsconfig.json`, no entry in `package.json`. A file declaring a type alias and using it
ran and printed its result.

**"Therefore we could adopt TypeScript at no cost" is also false, and this is the one
that decides it.** Type stripping erases annotations; it does not check them. A file
containing three deliberate type errors —

```ts
type Handle = { id: string; resolvable: boolean };
const h: Handle = { id: 42, resolvable: 'yes', extra: null };
const n: number = h.id.toUpperCase();
```

— was **accepted by the runtime and executed**. Node reported nothing about `id: 42`,
nothing about `resolvable: 'yes'`, nothing about the undeclared `extra`, and nothing
about assigning a string method's result to a `number`. It failed where untyped
JavaScript would have failed, at run time, with `TypeError: h.id.toUpperCase is not a
function`.

Strip-only mode is also not all of TypeScript: `enum` is rejected outright with
`ERR_UNSUPPORTED_TYPESCRIPT_SYNTAX`, as are `namespace` and parameter properties.

## Decision

**The repository tooling tier is JavaScript ESM (`.mjs`) and stays that way.** Scripts
under `scripts/`, test kits under `test-kits/`, and any future validator are written in
JavaScript, run on the pinned Node with `node:test`, and take no dependency.

The reason is this repository's own discipline rather than a preference between
languages. Every ratchet here exists to stop a claim being made that nothing verifies —
a fixture count that a file doing nothing could reproduce, an annotation that says a rule
is enforced when it is not, a `4/4` for an artifact that does not exist. Type annotations
under strip-only execution are exactly that shape of claim: they read as a guarantee, and
the runtime that reads them throws them away. **Unchecked types would be the largest
unverified claim in the repository, written in a syntax that makes it look checked.**

Getting real checking means `tsc`, which means the first dependency, the first lockfile,
and a check step — a direct reversal of RFC-2026-001's posture and of the guard that
exits 90 on package-manager configuration. That is a decision worth making deliberately
if the benefit is there. It is not one to arrive at by writing `.ts` and hoping.

**The application tier's language is NOT decided here.** When application code exists at
G1, TypeScript with real `tsc` checking is the expected answer and remains the register's
assumption. It requires accepting a dependency and a lockfile, so it is its own decision
at its own gate, taken with the stack choice rather than before it.

## What this closes and what it leaves open

`OPEN-018` is **partially closed**, and the register should say so rather than record a
tick:

| Part of OPEN-018 | State | Where |
|---|---|---|
| Runtime | **Closed** — Node `24.20.0` | RFC-2026-001, Approved |
| Package manager | **Closed** — npm `11.19.0`, no second one | RFC-2026-001, Approved |
| Language, tooling tier | **Closed by this RFC** — JavaScript ESM | here |
| Language, application tier | **Open** — decided with the stack at G1 | — |

The stop condition — *"ห้ามหลาย Agent bootstrap คนละ stack"* — is satisfied for the
tooling tier the moment this is approved: there is one language, one runtime, one package
manager, and a guard that already fails the build on a second package manager's
configuration.

## What this does NOT do

It does not claim JavaScript is better than TypeScript. It claims that *unchecked*
TypeScript is worse than JavaScript for this repository, because it adds the appearance
of a guarantee without the guarantee, and this repository has spent twenty-two review
rounds removing exactly that.

It does not forbid revisiting the tooling tier. If a future package accepts a lockfile
for other reasons, the argument above loses its force and the tier can be reconsidered on
the merits — through an RFC, not through a file extension.

It does not decide the application stack, Next.js, or anything at G1.

## Limitations

Nothing in this repository enforces the tooling tier's language today. A `.ts` file added
under `scripts/` would run, and no guard would object. Writing that guard is cheap — the
digested-file set is already enumerated — but a guard is only worth adding once the rule
it enforces is approved, and adding one before approval would be the author enforcing his
own proposal. If this RFC is approved, the guard belongs in the same change as the
approval.

## Rollback

Delete this file and the register row that cites it. Nothing else in the tree depends on
it; no code changes with this decision, because the tree already matches what it decides.
