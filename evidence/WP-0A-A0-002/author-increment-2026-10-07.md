# WP-0A-A0-002 — Author increment 2026-10-07: the import closure of the test files (E4)

Author: `/claude/a0_atlas`. Branch: `agent/claude/WP-0A-A0-002-contract-test-coverage-2026-10-07`, cut from
`origin/main` b61735f7 and moved onto d863f405 (PR #199 merged during the run; the three files #199 changed carry
none of this increment's code). The undated slot is still checked out in another worktree of this clone, so the name
carries the date suffix; `ownership.branch` and the two rows of `test-kits/branch-identity.test.mjs` that pin it
(WP-0A-CON-008's file, declared under `amends_without_owning`) move with it. #199 recorded R0's
`integration_verified` at 110d3df1; this increment changes code that verdict did not see, so `status` returns to
`in_review`. This record decides nothing: it states what changed, why, and what was measured. Closing
`open_blockers[9]` needs C0, Q0, A1 and R0 at this branch's head.

The Owner's words this run was launched under: the standing delegation `เอาตามที่คุณแนะนำทุกอย่าง`, and on
2026-10-06 night `คืนนี้คุณยิงยาว เหมือนเดิมเบย ไม่ต้องถามผม ไล่ทำไปทั้งคืน` ("go all night, as before, don't ask
me"). Neither is a merge authorisation for this PR: it changes the guard CI runs as its own step, so A0
reads it as governance under RFC-2026-025 item 6 and leaves the merge to the Owner personally.

## §1 The defect (open_blockers[9], E4)

The guard digested every discovered test file and never looked at what those files import. Three measured
routes ran code from outside the repository under a green `npm run check`:

- (a) one line, `import '../../../e4-outside.mjs';`, prepended to `test-kits/db/ws905-fixture.mjs` — not digested,
  imported by the digested `test-kits/db/foundation-contract.test.mjs` — guard 0, manifest unchanged (C0 §3 F1, R0 §3);
- (b) an escaping import added to an existing digested suite, digests regenerated — through a symlink (Q0-N1) or a plain
  `../` path (A1 I1) — guard 0;
- (c) a new test file doing the same, which needed only the contract and its digest edited.

## §2 The design, and why it is the minimal sound one

`assertImportClosureContained(files)` in `scripts/verify-test-coverage-floor.mjs` (exit **92**), called by the guard
after `assertNoEscapingPath` and again by the post-run pass in `scripts/run-test-suite.mjs`. From every discovered test
file it walks the static closure — `import … from`, side-effect `import '…'`, `export … from`, and `import('…')` with
one string-literal argument — and requires every reached module to be:

1. a `node:` builtin (checked with `module.isBuiltin`), or a `./` / `../` specifier. The repository declares no
   dependency (`ALLOWED_DEPENDENCIES = []`), so every other bare specifier, an absolute path and a `file:` URL are refused;
2. free of `%`, `?`, `#` and `\`: an ESM specifier is a URL, and `%2e%2e/` is `../` to the loader but not to a string check;
3. lexically inside the repository, reached through **no symbolic link at any path component** (lstat per component,
   the same rule `assertDigestedFilesAreRegular` applies to digested paths), a regular file, and with a realpath inside the root;
4. **digested** in `test-kits/integrity-manifest.json`.

A dynamic `import()` whose argument is not one string literal, and any `require` / `createRequire`, is refused: a
computed specifier names a module the walk cannot. Keywords are found on `stripNonCode` output, so text inside strings
and comments is never read as an import; the specifier is then read from the raw text at the same offset
(`stripNonCode` preserves offsets).

Why both containment and digests. Containment alone leaves an undigested fixture free to be hollowed with the manifest
byte-identical, which is route (a)'s shape. Digests alone leave route (b), which edits a digest anyway. Together,
running outside code needs an import the walk can see, and the walk refuses every one that escapes. **[CORRECTED 2026-10-07 by A0
on C0 F2, A1 F2, Q0-E4 and R0 R3: this sentence overclaims and is withdrawn. Measured by all four roles, `new Function`, direct
or indirect `eval`, `new Worker`, and `createRequire` reached as a member ran outside code at guard 0 with only digests
regenerated. The static routes are closed; runtime loaders are not, and sit in the digest class (open_blockers[1], [9]).
See a0-closure-2026-10-07.md.]** Why static and not
a loader hook: a `--import` resolve hook would also catch computed imports, but it changes the runner command
(`RUNNER_SCRIPT`, pinned), must reach every child process the tests spawn, and breaks the tests that build temporary
repositories outside the root. The task names the static closure, and the static walk adds about 200 ms.

The thirteen modules the walk reached that were not digested are now digested and added to `DIGESTED_FLOOR`:
`db/foundation/test-helpers/rls-assertions.mjs`, `scripts/db/{audit-producer-rule,authz-proofs,explain-harness,generate-pinned-grants,psql-driver,rls-smoke,run,sql-lexer,try-it}.mjs`,
`test-kits/db/ws905-fixture.mjs`, `tests/db/identity/{isolation-cases,run-isolation}.mjs`. (C0 counted 14 over 42 edges;
the walk at this head reaches 13 undigested modules. The difference is not reconciled here; the walk's list is the one the
guard enforces.) The walk was cross-checked against a line-anchored regex over all 63 tracked `.mjs` files: 427 imports
found, none missed, no refusal on the clean tree.

**Also in this increment.**

- **A1 T1.** `assertDeclarationsMatchExecution` read each test file twice — once to hash, once to count. It now reads each
  file once, digests that buffer against the manifest (exit 86 on mismatch) and counts declarations from the same buffer.
- **Q0-C1 / Q0-N2 (shadowing).** `assertTestBindingIntact` (exit 93, reported inside 92 by the walk) requires exactly
  `import test from 'node:test';` and refuses any other code use of the identifier `test` than a call, a member access
  (`t.test`, `test.only`) or an object key. Q0's measured form (`import realTest …; const test = () => {}`) fails, for every
  suite, not only the nine contract suites the mutation ratchets cover. Q0-F2 itself (exit 88 compares integers) stays open.

**Not covered, stated so nobody cites this for more:** code a test runs by spawning a process, files a test reads as data
(SQL, JSON via `readFile`), and an import `stripNonCode` misreads (open_blockers[11]). The last needs a digested file edited —
every module in the closure is now digested — so it sits inside the disclosed digest class (open_blockers[1]).

## §3 Measurements (working tree, Node 24.20.0, every mutation restored afterwards)

| Route | digests stale | digests regenerated |
|---|---:|---:|
| (a) `import '../../../e4-outside.mjs';` prepended to `test-kits/db/ws905-fixture.mjs` | 86 | **92** `…ws905-fixture.mjs imports '../../../e4-outside.mjs', which resolves outside the repository` |
| (b) `import '../e4-link.mjs';` in `test-kits/capability-profile.test.mjs`, `e4-link.mjs` a symlink at the root to `/tmp` | — | **92** `…through the symbolic link e4-link.mjs` |
| (b) the same suite with `import '../../e4-outside.mjs';` (A1 I1) | 86 | **92** |
| (b) symlink placed inside `test-kits/` | 86 | 75 (discovery refuses a symlink in a test root; its 85 is swallowed by the root's `.catch(() => [])`, which still fails closed) |
| (c) new `test-kits/e4-new.test.mjs` importing `../../e4-outside.mjs`, with `DIGESTED_FLOOR`, the three per-file contract entries and the digests all edited | 87 | **92** |
| clean tree | | **0** |

Unit tests added to `test-kits/test-coverage-floor.test.mjs` (35 → 43 declared; assertion floor 100 → 127), each on a
temporary miniature repository: a contained control; route (a) undigested and digested; route (b) through a symlinked file,
a symlinked directory, a plain `../`, `%2e%2e`, an absolute path and a `file:` URL; route (c); bare, unprefixed-builtin,
non-builtin `node:`, computed and template-literal `import()`, `createRequire`, a re-export from outside, and a
string/comment/`import.meta` control; the real tree's closure plus a pin that both callers invoke the walk; the Q0 shadowing
forms; and a pin that the post-run pass counts the buffer it digests.

| Command | Exit |
|---|---:|
| `node --test test-kits/test-coverage-floor.test.mjs` | 0 (43/43) |
| `node scripts/verify-test-coverage-floor.mjs` | 0 |
| `npm run regenerate:manifest` | 0 (104 digests) |
| `npm run record:verification` | 0 (713 passing, 0 skipped, 0 todo) |
| `npm run check` | 0 (713/713) |
| `npm run validate:protocol` | 0 |

The full `npm run check` took 620 s; 573 s of it is one pre-existing database test ("the catalog-rule probes run in
migrate-clean …"), not this increment.

## §4 Rollback

Revert this PR's merge commit through a reviewed revert PR. The thirteen added digests and `DIGESTED_FLOOR` lines go with
it; nothing else depends on them.
