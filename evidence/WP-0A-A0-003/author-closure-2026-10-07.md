# WP-0A-A0-003 — Author closure of the first-review findings (2026-10-07)

**Author evidence only.** Written by `/claude/a0_atlas`, the Author, through a subagent of the A0 run,
under the Product Owner's standing delegation ("เอาตามที่คุณแนะนำทุกอย่าง") and the Owner's words of
2026-10-06 night ("คืนนี้คุณยิงยาว เหมือนเดิมเบย ไม่ต้องถามผม ไล่ทำไปทั้งคืน"). A0 executes and does not
decide: this note closes no role's finding, moves no status, approves no gate and authorizes no merge.
Each role re-checks its own findings at the new head.

Subject: PR #203, branch `agent/claude/WP-0A-A0-003-secret-scan-2026-10-07`. The findings are those of
`c0-review-2026-10-07.md` (`review_approved`), `a1-review-2026-10-07.md`
(`security_approved_with_conditions`), `q0-review-2026-10-07.md` (`test_verified`) and
`r0-review-2026-10-07.md` (`integration_not_verified`; not integrable at `6cc6c93` until D1-D6).

## 1. Sync with `main` (R0 D1, C0 N4, Q0 F4)

The worktree held an unfinished merge of `origin/main` `dd11c601`, which a disk-full stop (ENOSPC) had
interrupted. After the resume, `origin/main` was still `dd11c601`. The staged index equalled
`git merge-tree --write-tree HEAD dd11c601` (tree `c3744903`), with no conflicts and none of this PR's
paths involved. `npm run check` on the merged tree: exit 0, tests 714, pass 714, fail 0. The 35/714
failures before the stop were artifacts of the full disk. Merge commit `dfbf2fc3`.

## 2. Fixed in scope

All in `test-kits/secret-scan.test.mjs` unless stated. The scanner's only change is one comment (F5).

| Finding | Change |
|---|---|
| C0 N1 / Q0 F2 | `FUTURE_PATHS` gains the credential-bearing types the tree does not have yet: `.pem`, `.key`, `.p12`, `.pfx`, `id_ed25519`, `.npmrc`, `.netrc`, `.pypirc`, `.dockercfg`, `.toml`, `.ini`, `.properties`, `.yaml`, `.xml`, `.conf`, `.cfg`, `.tfvars`, `terraform.tfstate`, `.py`, `.sh`, `.bash`, `.zsh`, `.ps1`, `Dockerfile`, `docker-compose.yml`, `.env`, and a 13-component path. It also gains one CRLF file. |
| C0 N2 | New test: for each of the seven rules with an `accept` filter, a rejected line followed by a real one must still fire. The rejected line alone must not fire. The row set must equal the rules that have `accept`. |
| Q0 F1 | In the copy test, each copied file's credential is spliced into its **longest line**, at an ASCII space or at the line's end. The netrc block is line-anchored, so it goes on lines of its own. The offset test also plants every rule inside a single 64 KiB line. |
| A1 N5 | Every PII decoy is appended to every copied file. The offset test runs every credential **and** PII decoy past 9 KiB and past 80 KiB. |
| Q0 F3(a) | New test: a checksum-valid ID fires in the printed 1-4-5-2-1 grouping and does not fire as 4-4-5 or 3-3-3-4. |
| Q0 F3(b) / R0-F2 | New false-positive row with a name ending in `BYPASS` directly before `=` and a long value. The comment on the `BYPASS_MODE` row now says it pins the last-word anchor, not the lookbehind. This corrects the overstatement in `author-increment-2026-10-07.md` §3. |
| Q0 F5 / R0-F4 | `open_blockers[18]` and the scanner comment beside `secret-named-assignment` record the `:` refusal's price as a lower bound, name the pattern that produced it, and give the ten-lines-in-six-files figure measured at `6cc6c93`. |
| Q0 F6 | Under a process that can read a `chmod 000` file (root), the stat-before-read test skips and says why. It no longer passes on a distinction it did not make. |
| A1 N6 / C0 N3 (part) | The copy test's temporary directory is also removed from SIGINT, SIGTERM and SIGHUP handlers, which then re-raise the signal. |
| R0 §5 | `ownership.amended_by[0]` is transcribed as `acknowledged`, quoting R0's words and record. |

Guard records moved with the suite (declared `amends_without_owning`):

- `scripts/test-suite-contract.mjs`: test floor 57 → 59, assertion floor 114 → 116, name digest `29224e8a816a48e5`. The copy test is renamed from "appended" to "spliced".
- `test-kits/integrity-manifest.json`: regenerated.
- `evidence/VERIFICATION.md`: rewritten by `npm run record:verification`.

### Each new test shown to fail against the mutation it exists for

Harness: the worktree was `rsync`-copied without `.git` and `node_modules`. One string replacement was
made per copy, then `node --test test-kits/secret-scan.test.mjs` ran in it, and the copy was deleted. No
specimen was written to the repository.

| Mutation | Result | Killed by |
|---|---|---|
| control | 59/59 | — |
| X1 `scanText` → `[]` for `.pem/.key/.p12/.pfx` | killed | spliced copy |
| X2 … for `.py` | killed | spliced copy |
| X2b … for `.yaml/.xml` | killed | spliced copy |
| X3 … for `.toml/.ini/.properties/.conf/.cfg/.tfvars` | killed | spliced copy |
| X10 … for `.sh/.bash/.zsh/.ps1` | killed | spliced copy |
| X11 … for `.npmrc/.netrc/.pypirc/.dockercfg` | killed | spliced copy |
| X6 the walk stops below 9 components | killed | spliced copy |
| X9 `scanText` → `[]` when the text has CRLF | killed | spliced copy |
| X5 lines over 1000 characters dropped before matching | killed (2) | spliced copy; offset/size |
| X8 `continue` → `break` after a rejected match | killed (2) | rejected-then-real; spliced copy |
| S8b PII rules read only the first 64 KiB | killed (2) | spliced copy; offset/size |
| S8d `payment-card-number` reads only the first 16 KiB | killed (2) | spliced copy; offset/size |
| `(?<![A-Z])` removed, and the incidental `BYPASS=` line in another package's test renamed in the copy | killed | false-positive table |
| Thai ID with free spacing (`[- ]?` between digits) | killed | printed-grouping test |
| M15, M23, M26, M27, M28, C0's `architecture/` carve-out (re-run) | killed | as before |

The suite took about 13 s in this worktree, compared with about 6 s before. The full run is in the commit's
verifier output.

## 3. Owed, not fixed

- **A1 N6 / C0 N3, residue.** A SIGKILLed run still leaves the copy (mkdtemp 0700, this user only).
  A run from the main checkout walks and copies its untracked `.claude/` tree (about 1.5 GB). Until
  `IGNORED_DIRECTORIES` changes under RFC-2026-005 (a governance PR), run `npm run check` from a clone
  or worktree.
- **A1 N7, R0-F3.** Carve-outs keyed to a value or a name, and a path name that neither the tree nor
  `FUTURE_PATHS` has, remain the residual that `open_blockers[5]` names. Review of every `accept`
  change is the control.
- **A1 N8-N10.** Informational; no change.
- **A1 C4(b)/N3, N9.** These belong to the RFC-2026-005 correction (`open_blockers[21]`), a governance
  PR the Product Owner merges.
- **Q0 L4, L5.** Unchanged (`open_blockers[19]`, `[20]`).
- **The WP-0A-A0-001 acknowledgement (R0 §5, second item).** It is given, but that record belongs to
  WP-0A-A0-001, and this branch's scope guard may not write it.
- **R0 D2-D6.** The suite's digest changed, so the first-review verdicts do not carry to the new head
  (C0 N4 and Q0 F4 made carrying them conditional on unchanged digests). Still owed: re-checks by C0,
  Q0 and A1; a fresh R0 verdict; the handoff refreshed last and alone; a green `bootstrap` run on the
  final head; and the merger's record.

The handoff is deliberately **not** refreshed in this commit, so `check:handoff` may read red until
the refresh comes last and alone.
