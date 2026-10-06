# WP-0A-A0-003 — Author increment: the suite notices the scanner reading less (2026-10-07)

**Author evidence only.** Written by `/claude/a0_atlas`, the Author of this package, acting through a
subagent of the A0 run that wrote its brief, under the Product Owner's standing delegation
("เอาตามที่คุณแนะนำทุกอย่าง") and the Owner's words of 2026-10-06 night ("คืนนี้คุณยิงยาว เหมือนเดิมเบย
ไม่ต้องถามผม ไล่ทำไปทั้งคืน"). It is not a Reviewer, Tester, Security/Privacy or Integration Owner verdict,
it does not move the package past `in_review`, it closes no finding on a role's behalf, it does not
approve Gate G0 and it does not authorize a merge.

| Field | Value |
|---|---|
| Package | WP-0A-A0-003 — Repository secret-scan strengthening and privacy dimension |
| Branch | `agent/claude/WP-0A-A0-003-secret-scan-2026-10-07`, cut from `origin/main` at `b61735f`, fast-forwarded to `d863f40` (PR #199, WP-0A-A0-002 records only) before the first commit; measurements below were taken at `b61735f` |
| Contains PR #190? | Yes: merge `5debf57` is an ancestor of `b61735f` |
| Toolchain | Node `v24.20.0`, npm `11.19.0` |
| Status | `in_review` (unchanged) |

## 1. What changed, by finding

| Finding | Raised by | Change |
|---|---|---|
| **C0 R1** (High, blocking) / **Q0 L2** (blocking) | `review-contract-c0.md` §5, §9; `test-verdict-q0.md` §7 | Scanner exports `scanTree` → `{ findings, files, bytes }`: the files whose bytes it decoded and matched, and their total size. `scanDirectory` is unchanged in shape (it returns `scanTree(...).findings`). Seven new tests in the suite, §2. |
| §744 comment | Q0 L2, C0 §5 | Rewritten: it now says the five named shapes catch a carve-out aimed at those five only, records the old sentence as false, and points to the property tests. |
| **Q0 L1** (blocking) | `test-verdict-q0.md` §7 | Test: a FIFO (`mkfifo`) and a UNIX socket under a scanned directory each yield `unscannable-entry`; exit code 71. |
| C0 R2 | `review-contract-c0.md` | `stat` before `readFile`; the post-read size check stays for a file that grows in between. Test: a locked oversize file is `oversize-file`, not `unreadable-file`. |
| C0 R3 / A1 N1 | C0; `a1-security-reverify-2026-10-05.md` §3 | Every floored credential rule (27) built at its floor (must fire) and one character below (must not); the remaining three declared unfloored, and the two lists must cover the rule set. The prose line that fired before `netrc-password` was anchored is now a false-positive row. |
| A1 C3 (npmrc part) | `review-security-head.md` FP-3 | `npmrc-auth-token` gains `accept`: rejects `isPlaceholderValue` and the new `isEnvironmentReference` (`process.env.`, `import.meta.env.`, `os.environ`, `ENV[`, anchored at the start). Both FP-3 shapes are false-positive rows. |
| Q0 L3 | `test-verdict-q0.md` §7 | Re-measured at `b61735f` before taking anything. Two taken, two refused with the price, §3. |
| positional `scanText(content, 'sample.txt')` | Q0 note | Fixed to `{ relativePath: 'sample.txt' }`. |

Not in this increment (still open in `open_blockers`): Q0 L4 (UTF-16), Q0 L5 (Thai-market provider
rules), A1 C4(b)/N3 and C0 R5 on the RFC text (a governance PR), the history scan.

## 2. Each test shown to fail against the mutation it exists for

Harness: the worktree copied with `rsync` (no `.git`, no `node_modules`) into the session
scratchpad, one string replacement in `scripts/scan-repository-secrets.mjs` at a time, then
`node --test test-kits/secret-scan.test.mjs` in the copy. The copy was deleted afterwards; the
repository was not touched. Control first.

| Mutation | Result | Failing tests |
|---|---|---|
| CONTROL (none) | pass 57, fail 0 | — |
| M15 delete the `unscannable-entry` push | **killed**, fail 1 | FIFO and socket |
| M23 `architecture` added to `IGNORED_DIRECTORIES` | **killed**, fail 2 | read list = independent walk; appended copy of every file |
| M24 `scripts`, `work-packages`, `runbooks`, `ownership` ignored | **killed**, fail 2 | same two |
| M25 skip directories named `src*` | **killed**, fail 1 | appended copy (its thirteen not-yet-existing paths) |
| M26 skip every `.md` and `.json` | **killed**, fail 2 | read list; appended copy |
| M27 `if (text.includes('scan-exempt')) return [];` | **killed**, fail 2 | appended copy; suppression comments |
| M28 `text = text.slice(0, 512)` | **killed**, fail 3 | appended copy; offset/size; file at the size limit |
| C0 C2: `scanText` returns `[]` under `architecture/` | **killed**, fail 2 | every rule at every repository path; appended copy |
| C0 C4: silent skip of files over 4 KB | **killed**, fail 4 | read list; appended copy; offset/size; size limit |
| counts a `.md` file as read, matches nothing in it | **killed**, fail 1 | appended copy |
| R2 reverted (no `stat`, read first) | **killed**, fail 1 | size limit enforced before the read |
| C3 reverted (npmrc `accept` removed) | **killed**, fail 1 | rules added after the uncorrelated probe |
| N1 reverted (`netrc-password` unanchored) | **killed**, fail 1 | same |
| floor: `aws-access-key-id` 16 → 17 | **killed**, fail 12 | incl. length floors |
| floor: assignment 8 → 7 | **killed**, fail 3 | incl. length floors, repository clean |
| floor: `vault-token` 24 → 30 | **killed**, fail 1 | length floors |
| L3 taken words removed | **killed**, fail 5 | decoy table and the property tests |
| L3 spaced Thai ID removed | **killed**, fail 1 | Thai ID in plain, hyphenated and printed form |

Q0's shrink class M23–M28 and C0's three demonstrated survivors are all killed. The kill is
property-based, not name-based: the paths, directories and file contents come from the real tree
at run time (§4 explains the limits of that).

## 3. Q0 L3, re-measured before taking

Q0 measured four widenings free at `1478f34`. The tree has grown since (the database CI work), so
each was applied and the full-tree scan run at `b61735f`:

| Widening | Hits at `b61735f` | Outcome |
|---|---|---|
| `PASSPHRASE`, `SIGNING_KEY` anywhere in the name | 0 | **taken** |
| `PASS`, `AUTH`, `SALT`, `PWD` anywhere as an underscore word | 1 (`AUTH_CONTEXT_HELPERS = '<path>'`, `scripts/db/run.mjs:3072`) | **narrowed and taken**: the short word must END the name (`DB_PASS=`, `HTTP_AUTH=`, `HASH_SALT=`, `DB_PWD=`); `PASS` not after a letter (not `BYPASS`), `PWD` only with a prefix (a bare `PWD` is the shell's working directory). 0 hits as taken. |
| Thai national ID with spaces | 0 | **taken** in the printed 1-4-5-2-1 grouping only, not free spacing |
| `:` as well as `=` for the assignment rule | 7 lines in 4 files: three in `.github/workflows/ci.yml`, three in two `WP-0A-DB-00` evidence files, one in `test-kits/db/foundation-contract.test.mjs`; every one a throwaway CI database password or a test sentinel | **refused**: taking it means editing files of other packages or allowlisting default passwords |
| Thai phone: bare `66`, `(0)` trunk prefix, parenthesised prefix | 3, all in `evidence/WP-0A-A0-003/test-verdict-q0.md` §4, which quotes example numbers to name the gap | **refused**: taking it means editing another role's signed evidence or allowlisting example numbers |

Both refusals are written beside their rule in the scanner and in `open_blockers[18]`. Recording
them in RFC-2026-005 would make this a governance PR; that is left to the RFC correction already owed
(`open_blockers[21]`). False-positive rows pin the narrowing: `BYPASS_MODE=…`, the `AUTH_…` path
constant, `GIT_AUTHOR_NAME=…`, a bare `PWD=…`, and a spaced 13-digit run with a wrong check digit.

## 4. What these tests do and do not prove

- They compare the scanner's own read list with an **independent** walk written in the test, and
  the test's ignore list and email-exempt prefixes are written in the test and must equal the
  scanner's. A mutation that widens either list fails before anything is scanned.
- The read list is the scanner's account of itself. A scanner that records a file and then matches
  nothing in it is caught by the appended-copy test, not by the count (row "counts a `.md` file as
  read" above).
- The path and content sets are the repository's own, plus thirteen directory names it does not have
  yet. A carve-out keyed to a path or a magic string that appears nowhere in the tree and in none of
  the ten suppression markers tested would still survive; no finite test closes that, and the
  pattern-scanner limitation in `open_blockers[5]` stands.
- The new tests fail with a count and the first entries, never a whole-list `deepEqual` diff. The
  first version did diff whole lists, and `test-kits/ratchets-bite.test.mjs` ("the secret-scan
  ratchet notices a rule removed from the scanner") then reported "the child never ran (signal
  SIGTERM)": with every credential rule filtered out, the diff of a thousand paths overflowed the
  ratchet's `spawnSync` output buffer. Re-measured after the change on a disposable copy: both of
  the ratchet's edits now exit 1 with 12 KB and 37 KB of output.
- The suite takes about 6 s (it was about 1.5 s); the appended-copy test is about 2 s of it.

## 5. Guards and records touched outside this package's writable paths

Declared in `ownership.amends_without_owning` with the rationale:

- `scripts/test-suite-contract.mjs` (WP-0A-A0-002): `secret-scan.test.mjs` test floor 48 → 57,
  assertion floor 88 → 114, test-name digest `c2dc04486e768877` → `f6fd66445fe12614`, all as the
  coverage-floor guard reported them.
- `test-kits/integrity-manifest.json` (WP-0A-A0-002): regenerated with `npm run regenerate:manifest`.
- `test-kits/branch-identity.test.mjs` (WP-0A-CON-008): one row, this package's branch renamed.
  The earlier branch `agent/claude/WP-0A-A0-003-secret-scan` is merged into main (`1ebc849` is an
  ancestor of `b61735f`) and is still checked out in a finished workflow worktree on this machine,
  so git refuses to check the same name out again. Moving another worktree's branch was not an
  option; the suffixed name is recorded in `ownership.branch` and `ownership.branch_note`.
- `evidence/VERIFICATION.md` (WP-0A-CON-008): regenerated with `npm run record:verification`.

## 6. Commands

Recorded with exit codes in `handoffs/WP-0A-A0-003-author-handoff.json` (`tests`).
