# A0 closure of the 58f70b8b re-check findings on WP-0A-A0-002

Run: `/claude/a0_atlas` (Author), through a subagent of its workflow. PR
https://github.com/ThinkBizLab-Org/ThinkBizThai/pull/204, branch
`agent/claude/WP-0A-A0-002-contract-test-coverage-2026-10-07`. All four re-checks were taken at head
`58f70b8b0797908f5bcc401bff272e0ad366c3f3`. Worked in a worktree checked out on the branch NAME (`git branch
--show-current` printed it; tree clean before the first step).

A0 executes here under the Product Owner's standing delegation `เอาตามที่คุณแนะนำทุกอย่าง`. A0 decides nothing below.
Each change applies the remedy the role itself measured, and the roles re-check it. This file approves nothing,
moves no status and is not a re-verification. The PR stays GOVERNANCE (test-integrity guard, RFC-2026-025 §5 item 6).
A0's brief relays that the Owner pre-authorised tonight's merges; that relay is recorded, not re-decided, and
`open_blockers[13]` is reconciled at the merge step, not here (R0 condition 5).

## 1. Role files carried onto the branch

Cherry-picked with `-x`, in this order: `f5d62d88` (C0, `changes_requested`, N3 blocking), `6089b2d3` (A1,
`security_approved`, N4 Low, records only), `0cfb0cb8` (Q0, `test_verified_with_conditions`, Q0-E9 / Q0-C13),
`46be0573` (R0, `integration_changes_requested`, R14-R16). They add only
`evidence/WP-0A-A0-002/{c0-recheck-2026-10-07c,a1-recheck-2026-10-06,q0-recheck-2026-10-06,r0-recheck-2026-10-07c}.md`.
The A1 and Q0 files carry `-10-06` in their names as their roles chose them; each is a re-check of `58f70b8b`.

## 2. Disposition

| Finding | Grade (as the role gave it) | Disposition |
|---|---|---|
| C0 N3 / Q0-E9 (Q0-C13): a non-ASCII identifier whose ASCII tail spells a keyword (`éreturn`, `ไทยin`, `πin`, `x<ZWJ>in`) is read as the keyword, so its `/` opens a regex that hides `import()` | blocking / non-blocking with condition | **Fixed in code**, C0's measured remedy: `if (/[\w$]/.test(source[i]) \|\| (source[i] > '\x7f' && source[i].trim() !== '')) {`. Any non-ASCII character that is not whitespace continues a word, so a non-ASCII space after `return` still ends it. |
| R0 R14: "a regex after `for (x of` is read as division, which fails closed" is false: a quote in that regex hides an import | blocking (correct the text) | **Text corrected** in the guard comment (both places), `open_blockers[11]` (inline marker plus a dated CORRECTED entry) and `a0-closure-recheck-2026-10-07b.md` §2 (inline CORRECTED marker). "A regex literal after `of`" is added to `[11]`'s STILL OPEN list. No code change, as R0 said none is needed for the merge. |
| R0 R15 / A1 N4 / Q0-N2 (literal half): a `/` after a string, template or regex literal is read as a regex start, hiding an import | blocking (fix or record) / Low / note | **Fixed in code**, R0's measured remedy: in the regex-literal branch and the string/template branch, `lastSignificant = '/'`, which `regexCanFollow` does not list, so division follows. The comment that called the incremental variable exact while ignoring literals (R0's "line 228") is rewritten to say why literals set it. |
| A1 N4 / Q0-N2 (the rest): a division after `++`/`--` or after `}` read as a regex | Low, records only / note | **Recorded OPEN** in `[11]` and the guard comment by name, as A1 asked; `[11]` now says its list is not claimed exhaustive. Not fixed: `}` ends a block as often as an object literal, so a one-character rule would trade one misread for another. |
| R0 R16 / C0 / Q0 / A1: handoff stale, CI red on it | process | **Owed.** Not refreshed here, by instruction; refreshed last and alone after the re-checks of this head. |

## 3. Cases and mutants

Added to the EXISTING test `a comment, a string and a whitespace run do not change where a regex may begin` (no new
test name, so the declared count and the name digest do not move; the suite stays 43):

- `const éreturn = 4; const q = éreturn / 2 + import('./x.mjs') / 1;` (division; C0 N3)
- `const ไทยin = 4; const q = ไทยin / 2 + import('./x.mjs') / 1;` (division; C0 N3, Thai-prefixed)
- `function f() { return /x/; }` (regex; pins the whitespace half of the condition)
- `const q = 'a' / 2 + import('./x.mjs') / 1;`, the same with `` `a` ``, and with `/a/` (division; R0 R15)

Each division case also requires `import(` to survive in code.

Mutants, `node --test --test-reporter=tap test-kits/test-coverage-floor.test.mjs`, the guard edited without
regenerating digests and restored byte-for-byte afterwards (`cmp` equal):

| Mutant | Fails beyond the five digest tests (the M0 baseline) | First message |
|---|---|---|
| M0 no-op comment | none (tests 1, 14, 20, 22, 23: the digest baseline) | — |
| N3 reverted (`\|\| (source[i] > '\x7f' && …)` removed) | test 34, `a comment, a string …` | `a non-ASCII identifier ending in a keyword: the division must survive as code …` |
| N3 whitespace check dropped (`&& source[i].trim() !== ''` removed) | test 34 | `a keyword, then a non-ASCII space: the regex literal must be blanked …` |
| R15 regex-literal assignment removed | test 34 | `a regex literal, then a division: the division must survive as code …` |
| R15 string/template assignment removed | test 34 | `a string literal, then a division: the division must survive as code …` |

All four are killed by the existing test.

## 4. Probes against the real guard

A private clone of this worktree, on the branch name, with this change committed locally. Each probe prepended one
line to `test-kits/db/ws905-fixture.mjs`, ran `node scripts/regenerate-integrity-manifest.mjs` (the attacker
regenerates digests), ran `node scripts/verify-test-coverage-floor.mjs`, imported the fixture only when the guard
said 0, and restored with `git checkout -- . && git clean -fdq`. The synthetic payload lived outside the clone and
only wrote a marker file. Clone and payload were removed afterwards.

| Probe | Guard | Payload ran |
|---|---:|---|
| Clean tree | 0 | — |
| Control `import '<o>';` | 92 | no |
| U1 `const éreturn = 4, __g = 1; const __q = éreturn / 2 + import('<o>') / __g;` | **92** | no |
| U2 `const ไทยin = 4, __g = 1; const __q = ไทยin / 2 + import('<o>') / __g;` | **92** | no |
| P1 `let of = 1, __g = 1; const __q = of / 2 + import('<o>') / __g;` | 92 | no |
| P2 `class __C { #return = 1; f() { return this.#return / 2 + import('<o>') / 1; } }` | 92 | no |
| P6 `const __f = () => { return 'a' / 2 + import('<o>') / 1; };` | 92 | no |
| R15 string / template / regex literal, then `/ 2 + import('<o>') / 1` | 92 / 92 / 92 | no |
| R15 static: `const r0s = 'a' / 2; import '<o>'; // /` | 92 | no |
| Q0-E9 ZWJ: `const x<U+200D>in = 4; … x<U+200D>in / 2 + import('<o>') / 1;` | 92 | no |
| R14 `for (const r0x of /'/.exec('a') ?? []) {} import '<o>'; // '` (recorded OPEN) | 0 | yes |
| A1 N4 `e4i++ / 1; await import('<o>'); … 1 / 1;` (recorded OPEN) | 0 | yes |

U1, U2, P1, P2 and P6 give 92, as the brief required. The last two rows are the residuals `[11]` now names as OPEN.

## 5. Commands

Node v24.20.0 (`/Users/bank/.local/node-v24.20.0/bin`, first on PATH), on the branch name.

- `npm run regenerate:manifest`: 104 digests rebuilt (the guard, its test and this package's records moved).
- `node --test test-kits/test-coverage-floor.test.mjs`: 43/43. `node scripts/verify-test-coverage-floor.mjs`: 0.
- `npm run check`: exit 1, 722/724. The two failures are `the handoff for this branch describes this branch` and
  `the handoff ratchet fails when an author handoff claims another role approved something`, both only because the
  handoff is deliberately stale, as at `58f70b8b`.
- `node scripts/commit-when-clean.mjs <message-file>`: exit 1, "refusing to commit: the tree is not clean" (`npm run
  verify`: 722/724, the same two stale-handoff tests). As in `a0-closure-recheck-2026-10-07b.md` §4, the commit is
  made with plain `git commit` and does not carry the handoff; `check:handoff` and a clean `npm run verify` are owed
  to the step that refreshes the handoff last and alone.
- `node scripts/verify-branch-scope.mjs origin/main WP-0A-A0-002`: exit 0, "all 30 changed path(s) are declared" at the commit (25 at `58f70b8b`, plus the four role files and this note).
- `npm run validate:protocol`: 0. `npm run scan:secrets`: 0.

## 6. A0's recommendation for a follow-up (owed, not in this PR)

The static tokenizer keeps yielding fail-open regressions of one class: C0 N1 (`of`, `#return`) and now C0 N3
(non-ASCII identifiers), each a word or literal that `stripNonCode` misreads around a `/`, each hiding an import
with the guard at 0. Every patch closes one spelling and the next round finds another; the OPEN list in `[11]` is
already admitted non-exhaustive. A runtime resolve hook would close the import routes without tokenizing at all:
`module.register` with a `resolve()` that refuses any URL outside the repository root or through a symbolic link,
installed for every test run. It sees what V8 actually resolves, so no spelling of an import can slip past it. It
is to be designed in the next increment, under its own work package and review; it is recorded here as owed, not
started, and it changes nothing in this PR.

## 7. What this run did not do

It moved no status, refreshed no handoff, closed no blocker and merged no PR. It edited no file outside the paths
this package already changes. It changed nothing in `db/**`, `migrations/**` or `.github/**`.
