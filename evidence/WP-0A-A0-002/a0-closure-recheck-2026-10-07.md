# A0 closure of the cfabb292 re-check findings on WP-0A-A0-002

Run: `/claude/a0_atlas` (Author), through a subagent of its workflow. PR
https://github.com/ThinkBizLab-Org/ThinkBizThai/pull/204, branch
`agent/claude/WP-0A-A0-002-contract-test-coverage-2026-10-07`. All four re-checks were taken at head
`cfabb292ebf1206cfd33b862024656cead09eec2`.

A0 executes here under the Product Owner's standing delegation `เอาตามที่คุณแนะนำทุกอย่าง` and the night instruction
of 2026-10-06 `คืนนี้คุณยิงยาว เหมือนเดิมเบย ไม่ต้องถามผม ไล่ทำไปทั้งคืน`. A0 decides nothing below. Each change applies
a role's own recommendation, and that role re-checks it. This file approves nothing, moves no status and is not
a re-verification. Every role agrees the PR is GOVERNANCE under RFC-2026-025 §5 item 6, so the Product Owner
merges it personally.

## 1. Role files carried onto the branch

Cherry-picked with `-x`, in this order: `907198fa` (C0), `da57ed17` (A1), `4f974c49` (Q0), `34c3eff1` (R0). They add
only `evidence/WP-0A-A0-002/{c0,a1,q0,r0}-recheck-2026-10-07.md`.

`origin/main` had moved from `411dfa7e` to `4dd767df` (PR #200, WP-0A-A0-007 records only). It was merged with no
conflict. That merge touches no digested file and no generated record.

## 2. Disposition of every finding

| Finding | Grade (as the role gave it) | Disposition |
|---|---|---|
| Q0-E5: `{...import('<outside>')}` | blocking | **Fixed in code.** The keyword lookbehind treated any `.` as a member access. It is now `(?<![\w$])(?<!(?<!\.)\.)`: a `.` is a member only when no `.` precedes it, so a spread is read as code. The same rule is applied to the `test` binding check, so `[...test]` / `{...test}` is refused (exit 93). No role named that variant. |
| R0 R7: side-effect import, then `from` and a decoy on the next lines | blocking | **Fixed in code.** When a string literal stands right after `import` (whitespace and comments only between), that string is the specifier, and the import clause is not matched past it. |
| A1 N1 / R0 R8: `createRequire` written with a `\u` escape, as a named import or as a member | Medium / blocking (text or code) | **Fixed in code.** Any `\u` left in the stripped text is refused. Outside a literal, a backslash can only start an identifier escape. Measured: no walked module on the clean tree has one. |
| Q0-E6 / C0 R1 (CR, U+2028): a line terminator V8 honours and the scanners do not | non-blocking | **Fixed in code** (C0 R1 option b). Any CR, U+2028 or U+2029 in a walked module is refused. Measured: no walked module on the clean tree has one. |
| A1 N2 / Q0-E7 / R0 R9 / C0 R1 (template): nested template hides an `import()` | Low / non-blocking / advisory / non-blocking | **Records narrowed, not fixed in code**, which is the option each role offered. The guard comment no longer says every import in `${...}` is refused outright. It now says this holds for the span stripNonCode reads, and that a nested template ends that span early. `open_blockers[9]` and `[11]` name the form. Refusing nested templates outright would refuse the clean tree: `test-kits/db/foundation-contract.test.mjs` and `scripts/db/try-it.mjs` use them. Measured on this head: guard 0, as disclosed. |
| C0 R1 (regex after `)` or a keyword) | non-blocking | **Recorded** in `[11]` as still open. It is a stripNonCode misread inside the digest class. |
| R0 R7 / R8 consequence for the comment | blocking (text) | **Comment narrowed.** The guard comment said the two halves "close the STATIC routes". It now says they "refuse the static forms the walk READS", and it names what bounds that reading. |
| Q0 R-2 / R0 R10: 14 paths reported, 15 measured | non-blocking / advisory | **Corrected here.** The 14 was in A0's dispatch report, not in a repository record, and 15 is the right count at `cfabb292`. The count at the new head is in §3. |
| C0 N1 / R0 R6: the handoff is stale at the fix head | process | **Owed as before.** The handoff is deliberately not refreshed on this commit. It is refreshed last and alone after the re-checks. |
| C0 R2 / Q0 note: `BUILTIN_SPECIFIER_CHARACTERS` and the `literalAt` block-comment skip survive their mutants | info / note | **Unchanged.** Both fail closed, or have a second layer over them, as both roles found. |
| A1 F1–F5, C0 F1–F6, Q0-E1–E4, R0 R1–R5 | resolved / recorded | No change. |

## 3. Measurements (Node 24.20.0, this worktree, on the branch name)

`node --test test-kits/test-coverage-floor.test.mjs`: 43/43. No test was added. Cases were added to `E4: specifiers
the walk cannot name are refused, not skipped` and `Q0-C1: a shadowed or aliased test binding is refused`, so the
per-file floor, the test-name digest and the suite count are unchanged. `npm run regenerate:manifest` rebuilt the
digests of the guard and the suite.

Mutants of `scripts/verify-test-coverage-floor.mjs`, each reverting one fix (TAP). Every run also fails tests 1, 14
and 23, which are the digest checks reacting to the edited guard.

| Mutant | Targeted test that fails |
|---|---|
| Ma: keyword lookbehind restored to `(?<![\w$.])` | `E4: specifiers ...` |
| Mb: side-effect check removed (clause always matched) | `E4: specifiers ...` |
| Mc: `\u` refusal disabled | `E4: specifiers ...` |
| Md: CR / U+2028 / U+2029 refusal disabled | `E4: specifiers ...` |
| Me: `test` lookbehind restored to `(?<![\w$.])` | `Q0-C1: a shadowed or aliased test binding is refused` |

The roles' forms were run against the real guard on this tree. Each was prepended to `test-kits/db/ws905-fixture.mjs`,
digests were regenerated each time, and the tree was restored after every case.

| Form | Guard exit |
|---|---|
| Q0-E5 `const __s = {...import('../../../a0-outside.mjs')};` | 92 |
| R0 R7 `import '../../../a0-outside.mjs'` / `from` / `'./ws905-fixture.mjs'; var from;` | 92 |
| A1 N1 `import { create\u0052equire as __r } from 'node:module'` | 92 |
| R0 R8 `e4m.create\u0052equire(import.meta.url)(...)` | 92 |
| Q0-E6 `// x<CR>import '../../../a0-outside.mjs';` | 92 |
| Q0-E6 `// x<U+2028>import '../../../a0-outside.mjs';` | 92 |
| nested template `` `${`x` + (await import('../../../a0-outside.mjs'), '')}` `` | **0** (recorded residual, `[11]`) |
| clean tree | 0 |

`scripts/commit-when-clean.mjs` refused this commit: `npm run verify` gave exit 1, 711/713, and the two failures were
`handoff-conformance` (the handoff for this branch describes this branch) and `ratchets-bite` (the handoff ratchet).
Both fail only because the handoff is deliberately stale. With a throwaway `npm run refresh:handoff` on the branch
name, `npm run verify` gave exit 0, 713/713. The handoff was then restored with `git checkout` and this commit was
made with plain `git commit`, so it does not carry the handoff. `check:handoff` and the branch-scope count are owed
to the step that refreshes the handoff last and alone.

## 4. Second merge of main, and the code change it forced

After the fix commit `a217f2a2`, `origin/main` moved again to `0955b32e` (PR #203, WP-0A-A0-003 secret scan). The
merge conflicted only in generated or pinned tables. They were resolved mechanically:

- `scripts/test-suite-contract.mjs`: main's three `secret-scan.test.mjs` rows, and this branch's three
  `test-coverage-floor.test.mjs` rows.
- `test-kits/branch-identity.test.mjs`: both dated slots, this branch's for WP-0A-A0-002 and main's for WP-0A-A0-003.
- `evidence/VERIFICATION.md`: rewritten by `npm run record:verification`.
- `test-kits/integrity-manifest.json`: rebuilt by `npm run regenerate:manifest`.

The guard then refused the merged clean tree with exit 92. Main's `scripts/scan-repository-secrets.mjs` contains
`return /^(?:process\.env\.|import\.meta\.env\.|...)/`. stripNonCode read the slash after `return` as division
(the `[11]` keyword misread C0 measured earlier), the regex body became code, and the `import` inside it was
treated as an import with no specifier. That file belongs to WP-0A-A0-003 and is not edited here. The misread
was fixed in this package's guard instead:

- After a word, a slash now starts a regex when the word is a keyword that ends no expression (`return`, `typeof`,
  `case`, `in`, `of`, `instanceof`, `new`, `delete`, `void`, `throw`, `yield`, `await`, `do`, `else`).
  **[CORRECTED in `a0-closure-recheck-2026-10-07b.md`: `of` is an identifier, not a reserved word, and is removed
  from the set (C0 N1, A1 N3, Q0-E8, R0 R11).]**
- That rule does not apply to a member name (`x.return / 2`). **[CORRECTED: as written at `3545de1a` this held only
  after `.`; a private name such as `this.#return` was read as a keyword. A word after `#` is now a member too, so the
  sentence holds for both. See `a0-closure-recheck-2026-10-07b.md`.]**
- The last word is tracked incrementally, like `lastSignificant`, so the scan stays linear.

Cases were added to `a comment, a string and a whitespace run do not change where a regex may begin`.

| Mutant | Targeted test that fails |
|---|---|
| Mf: keyword rule removed | `a comment, a string and a whitespace run ...`, and `E4 on this repository: ...` |
| Mg: member exception removed | `a comment, a string and a whitespace run ...` |

This narrows `[11]` without closing it. A regex after `)` is still read as division, and nested templates are still
misread. The guard comment and `[11]` say so.

On the merged tree, with a throwaway `npm run refresh:handoff` on the branch name, `npm run record:verification`
recorded 724 passing, and `npm run verify` gave exit 0, 724/724. The suite is 713 from this branch plus 11 from
main's PR #203. The handoff was then restored. The merge commit does not carry it.

## 5. What this run did not do

It moved no status and refreshed no handoff. It edited no file outside `writable_paths`. It changed nothing in
`db/**`, `migrations/**` or `.github/**`. It merged nothing.
