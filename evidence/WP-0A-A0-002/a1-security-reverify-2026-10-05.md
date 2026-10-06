# WP-0A-A0-002 — A1 Security/Privacy re-verification at main, 2026-10-05

**This document is Security/Privacy evidence only.** It is not an Author, Reviewer, Tester,
Integration, Product/UX or Product Owner artifact. It approves no merge, moves no package status
and does not move Gate G0.

| Field | Value |
| --- | --- |
| Work package | WP-0A-A0-002 |
| Agent run id | `/claude/a1_bastion` |
| Role | Independent Security/Privacy reviewer |
| Subject | PR https://github.com/ThinkBizLab-Org/ThinkBizThai/pull/192 |
| Branch | `agent/claude/WP-0A-A0-002-contract-test-coverage` |
| Head reviewed | `6cff65c5de775d997da5734f7afc274805777494` |
| Base | `origin/main` `8c089cc0bf30a234efa61752c6054d670f85a2a8` |
| Diff | 3 files, records only: `work-packages/WP-0A-A0-002.json`, `evidence/WP-0A-A0-002/author-reverify-2026-10-06.md` (new), `handoffs/WP-0A-A0-002-author-handoff.json` |
| Toolchain | Node v24.20.0 / npm 11.19.0 (login shell) |
| My previous verdict | `security_approved_with_conditions` at `c631c07` (`review-security-round7.md`) |

## 0. What I am

I am a subagent of `/claude/a0_atlas`, spawned by A0's workflow script to act as the independent
Security/Privacy reviewer run `/claude/a1_bastion`. RFC-2026-024 §3/3 requires this disclosure. I share a
vendor and a parent with the Author. I wrote none of the PR's content and none of the code it describes.
I review; I fix nothing; this file is my only write, on my own branch, not pushed.

## 1. Method — measured vs read

**Measured** (commands run at this head, exit codes as observed):

- A private clone checked out **on the branch name** `agent/claude/WP-0A-A0-002-contract-test-coverage`
  at `6cff65c5`, never detached, with `origin/main` set to `8c089cc`. All declared commands ran there.
- All destructive probes ran in a separate copy of that clone (`sbx/`, no repository metadata), under
  the private scratch directory `.../scratchpad/a1-WP-0A-A0-002/`. Nothing in the repository or this
  worktree was modified by a probe. No database was started; no probe needed one.
- Synthetic credential decoys for the C1 re-probe were assembled from fragments at run time, written
  only to scratch, scanned, and deleted. No credential-shaped literal appears in this file.

**Read, not measured:** the three diffs line by line; `scripts/run-test-suite.mjs` (whole file);
`scripts/verify-test-coverage-floor.mjs` (manifest, regular-file and entry-point sections);
`author-reverify-2026-10-06.md`; `author-remediation-4.md` §S1–S4; my round-7 file.

### Declared commands, private clone on the branch name

| Command | Exit | Result |
| --- | --- | --- |
| `npm run check` | **0** | `tests 692 / pass 692 / fail 0 / skipped 0 / todo 0` |
| `npm run check:handoff` | **0** | "describes the branch: nothing substantive after its cited head" |
| `node scripts/verify-branch-scope.mjs origin/main WP-0A-A0-002` | **0** | "all 3 changed path(s) are declared, and every amendment explains one" |
| `node scripts/scan-repository-secrets.mjs` | **0** | no findings |
| `node scripts/validate-work-package-role-separation.mjs work-packages/WP-0A-A0-002.json` | **0** | clean |
| `npm run verify` | **0** | `clean: exit 0 — tests 692, pass 692, fail 0, skipped 0, todo 0` (§6) |

(`npm run check:scope` with no arguments exits 2 with its usage line; it was re-run with the base and
package id as above.)

## 2. My round-7 conditions, re-verified at this head

The code these conditions concern is unchanged by PR #192 (records only) and is what `main` carries.

| # | Condition | Ruling | Evidence |
| --- | --- | --- | --- |
| A1-1 | Record S1/S1b as a limitation of exit 88; never describe `declared === executed` as a guarantee | **CLOSED as a record.** `open_blockers[10]` now says the reconciliation "is approximate and must not be described as a guarantee". The Author also went further and changed the code (below); that change is accepted as hardening, but it does **not** fully close S1 — see new finding T1. | `work-packages/WP-0A-A0-002.json` `open_blockers[10]` |
| — S1 (as originally reproduced) | gut-at-post-run defeats exit 88 | **Closed for the reproduced shape.** Calling the post-run reconciliation with the file gutted and `pass` lowered to match: **exit 86** ("content does not match its recorded digest"). Control and restore: exit 0. | probe `probe-s1.mjs` |
| — S1b | a test drops an undigested `.test.mjs` mid-run | **Closed.** Post-run path now: **exit 87** ("not digested"), where round 7 reached 88 only by count. | probe `probe-s1.mjs` |
| A1-2 | S2: constrain manifest keys before any digest is computed or printed | **CLOSED.** Traversal key with the target's real digest: **86** "not a repository-relative path". Absolute key: **86**. Wrong digest on a real key: **86** and the observed digest is **not** in the message (checked by substring). | `verify-test-coverage-floor.mjs:30-33,382-398`; probe |
| A1-3 | S3: hash bytes, not `'utf8'` | **CLOSED** (read): `createHash('sha256').update(await readFile(file))`, no encoding argument. | `verify-test-coverage-floor.mjs:389` |
| A1-4 | S4: numeric exit-code handling in the runner | **CLOSED** (read): `process.exit(Number.isInteger(error.code) ? error.code : 80)`. | `run-test-suite.mjs:145` |
| A1-5 | C1: carry the weak scanner; do not cite a green scan as assurance | **CLOSED for my probe set; residual tracked.** Re-probed with the same eight formats as round 7 (Google API key, Slack bot token, OpenAI project key, Anthropic key, signed JWT, Postgres URI with password, Azure SAS, GCP service-account JSON): **8 of 8 caught, exit 70 each**; benign control exit 0. An unreadable file now fails closed (**exit 71**, `unreadable-file`). Residual: the scanner still reads only the working tree, never history, and is pattern-based (it says so itself). This is WP-0A-A0-003/-005's file, not this package's. | probe `probe-c1.mjs` |
| S5 | exit 88 rejects table-driven tests | Recorded (`open_blockers[10]`), not fixed. Fails closed. Accepted as recorded. | manifest |

**Every round-7 condition is closed.** C1 is closed as far as this package's tracking goes.

## 3. New findings at this head

### T1 (NEW, Low) — the S1 fix reads each file twice; a flipping writer still turns exit 88 green

`assertDeclarationsMatchExecution` (`run-test-suite.mjs:111-115`) hashes every file inside
`assertIntegrityManifest()` and then **reads every file again** to count declarations. The bytes that
were hashed are not the bytes that were counted. A detached writer that atomically flips one test file
between its digested bytes and a gutted copy (rename-swap every ~2 ms) can let the hash see the good
bytes and the count see the gutted ones.

Measured in the sandbox, calling the post-run function 60 times with `pass` set to the gutted count
(692 − 46 = 646) while the flipper ran:

```
outcomes: {"code 86":31, "code 88":23, "GREEN":6}
```

**6 of 60 green** (10%), and the tree ends byte-identical to its digests. That is the round-7 S1
shape — declared assertions that never ran, reported as reconciled — made probabilistic instead of
deterministic. The attacker can retry by re-running CI, and an attacker who keys the flip to the
runner's read order rather than a fixed period would do better.

**Severity Low, not blocking**, because: it still needs a malicious test in the diff (a detached spawn
that rewrites a test file), which is the disclosed digest/review class; exit 88 is now recorded as
approximate (`open_blockers[10]`); and Q0-F2's integer compensation already defeats exit 88
deterministically without any race. What T1 changes is the accuracy of the record:
`author-remediation-4.md` and `author-reverify-2026-10-06.md` §1.2 say S1 and S1b "were fixed", and the
comment at `run-test-suite.mjs:106-110` says the post-run checks "can" see the gutted file. S1b is fixed;
S1 is narrowed, not closed.

**Condition (non-blocking for this records PR):** either hash and count the **same buffer** (read each
file once, digest it, count it from that buffer — a few lines, removes T1 entirely), or correct the
record to say S1 is narrowed and add T1 beside Q0-F2 in `open_blockers[10]`. The code change belongs to
whichever package next touches the runner; the record correction is this package's.

### I1 (informational, for C0/Q0 who own E4) — `open_blockers[9]` overstates the bar for E4

The record says reaching a green run "needs `scripts/test-suite-contract.mjs` and its digest edited".
Measured at this head: editing an **existing** digested test plus its digest, with `DIGESTED_FLOOR`
untouched —

| Variant | Guard | `scan:secrets` | `node --test` that file | Post-run reconciliation |
| --- | --- | --- | --- | --- |
| import through a symlink at the root (the Author's shape) | **0** | **71** `unscannable-symlink` | 1 (the in-suite scanner test fails on the link) | 0 |
| import by a plain escaping relative path, no symlink | **0** | **0** | **0**, payload ran | **0** |

So a symlink is caught today — by the secret scanner, not by this package's guard — and the plain
relative-path variant needs neither a symlink nor a `DIGESTED_FLOOR` edit. **No security delta**: a
test file is already arbitrary code in CI, the job holds no secrets, and outside-the-checkout paths on a
fresh runner hold nothing the attacker placed. It is still inside "edit a digested file and its digest",
so the disposition (recorded, not fixed) stands; only the sentence about what it takes is wrong.

### I2 (informational) — `open_blockers[5]` describes a scanner that no longer exists

Its original text ("detected none of twelve… fails open on an unreadable file") is kept verbatim, which
is correct practice, and the UPDATED note says the scanner has since widened. With §2's measurements
(8/8 caught, unreadable → 71) the remaining true residual is "working tree only, no history; pattern
scan". Worth saying in the entry's update; not a condition.

## 4. The records diff, as security content

- **No secret, credential, private URL, local absolute path, e-mail or customer data** in the three
  files (scanned by regex over the added lines, and by `scan-repository-secrets.mjs` at head: exit 0).
- **`prefer_cross_vendor_review: false`** applies the Owner's step-2 item 1. Security-relevant
  remainder is stated correctly in `cross_vendor_exception`: distinct runs per role, no self-approval,
  §0 disclosure. This file carries that disclosure.
- **`amended_by` acknowledgers** corrected from `/claude/a0_atlas` (the amending Author) to
  `/claude/r0_steward`, all three still `pending`, and the correction itself gives no acknowledgement.
  That removes a self-acknowledgement path; I agree with it.
- **Successor naming** (`/claude/r0_steward` for `/root/r0_steward`) is recorded as naming only; the
  acknowledgements stay open. Correct.
- **Closed-in-place blockers keep their original text verbatim** (checked by parser: old entries 0–6
  each still contained in the same index). The old G0 entry moved from index 7 to 12; only the new
  handoff cites `[7]`, with its new meaning. Not a security matter; noted for C0.
- `open_blockers[2]` closed against `ci.yml:69-75`: read and confirmed that CI runs the guard as its own
  step. A neutered local `check` still exits 0, which the entry says. Q0 owns that ruling.
- **Scope:** no script, test, CI, lockfile, dependency, network, credential, migration, RLS, tenant or
  production-config change in this PR. `verify-branch-scope` exit 0.

## 5. Stop-the-line and merge

- **Stop-the-line: no.** No secret exposure, tenant leakage, duplicate side effect, lost job, migration
  divergence, irreversible deletion or contract mismatch. T1 is a weakness in a self-declared tripwire
  that needs malicious test code in a reviewed diff.
- **Does anything from Security block the merge of PR #192? No.** It changes records only, and T1, I1
  and I2 are all corrections or hardening that do not depend on this PR. The merge still needs the other
  roles' re-verdicts (C0, Q0, R0), which are not mine to give.

## 6. `npm run verify`

Private clone, on the branch name, at `6cff65c5`: **exit 0** —
`clean: exit 0 — tests 692, pass 692, fail 0, skipped 0, todo 0`. No probe touched the clone; every probe
ran in the separate `sbx/` copy.

## 7. Findings summary

| ID | Severity | Status |
| --- | --- | --- |
| A1-1 (S1/S1b record) | — | **Closed** (record present; S1b fixed; S1 narrowed — see T1) |
| A1-2 (S2) | — | **Closed**, measured |
| A1-3 (S3) | — | **Closed**, read |
| A1-4 (S4) | — | **Closed**, read |
| A1-5 (C1) | — | **Closed for the 8-format probe**; history-scan residual is repository-level |
| S5 | Low | Recorded, accepted |
| **T1** | Low | **NEW — condition, non-blocking:** hash and count one buffer, or correct the "S1 fixed" record |
| I1 | Info | NEW — `open_blockers[9]` overstates what E4 needs; disposition unaffected |
| I2 | Info | NEW — `open_blockers[5]` update could state the scanner's real residual |

VERDICT: security_approved_with_conditions
