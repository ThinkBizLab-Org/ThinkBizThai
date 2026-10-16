# Q0 round audit, 2026-10-17: `main` from `2aef8182` (exclusive) to `01b49187` (inclusive), merges #262–#281

- **Role:** Q0, independent Tester (`/claude/q0_sentinel`). Second round audit under RFC-2026-034 §2.3.
- **Range:** `2aef8182..01b49187` on `main` (first parent), the merges of PR #262 to #281, fixed at `01b49187`
  [measured: `git log --first-parent --oneline 2aef8182..01b49187`, 20 merges].
- **Reading time:** 2026-10-16T19:15:27Z to 19:40Z UTC (2026-10-17 ICT) [measured: `date -u`].
- **Brief:** `.claude/ntf-session/brief-audit-1017.md`.
- **Verdicts:** `test_verified` for each risk-lane PR in range: **#262, #263, #264, #272, #273, #275, #276, #277**. No
  fast-lane PR is in range. On `01b49187`: the full suite passes 843 of 843 under the suite lock on the branch name
  `main`; `regenerate:manifest` and `record:verification` leave no diff; CI on `main` at `01b49187` is green on both
  required jobs, with `Type-check the application` and `Application tests` (8 files, 293 of 293) green.
- **Stop-the-line:** no. **Security finding:** none raised by Q0.
- **Findings:** Q0-AUD1017-1 (Low, a fourth carry-clause press error, on #268, not among the three recorded),
  Q0-AUD1017-2 (Info, sync records cite no `cmp`), Q0-AUD1017-3 (Info, coverage not re-measured locally). None blocks
  the verdicts above. The first round's Q0-AUD1015-1 to -5 are closed (§4).

## 0. Who I am

`/claude/q0_sentinel`, a Claude Code subagent (Anthropic, `claude-opus-5-5`) spawned by A0 (`/claude/a0_atlas`), who
authored every PR audited here; C0, A1 and R0 come from the same lineage, the same-lineage reading the Product Owner
accepted with disclosure. I disclose it and do not claim it is cured. I audit only: I fixed, pushed and merged nothing
and write no other role's verdict; I did not read the other auditors' files. One worktree in my scratchpad, branch
`q0/audit-2026-10-17` cut from `01b49187`; I checked out `main` in it (`--ignore-other-worktrees`) to measure on the
branch name, then this branch for this file alone. No `npm ci` and no `node_modules` (disk): `typecheck`, `test:app` and
any mutation of `src/**` are read from CI (§2, Q0-AUD1017-3). Every mutation was restored (`git status --porcelain`
empty after each batch). I created one temporary local branch for §3.3's measure and deleted it.

## 1. Commands on `01b49187` [measured: scratchpad `q0a/suite.out`, `suite.log`, `record.log`, `handoff.log`]

On branch `main` at `01b49187`, node v24.20.0, npm 11.19.0.

| Command | Result |
|---|---|
| `npm run check` (under `$P/suite.lock`, acquired 19:16:36Z, exit at 19:21:32Z) | exit 0; tests 843, pass 843, fail/cancelled/skipped/todo 0 |
| `npm run regenerate:manifest`, then `git diff --exit-code` | exit 0, no diff |
| `npm run record:verification`, then `git diff --exit-code` | exit 0 ("recorded 843 passing, 0 skipped, 0 todo"), no diff |
| `npm run check:handoff` | exit 75, "no work package declares ownership.branch "main"" — expected on `main`, not a defect |

Not run locally (need `node_modules` or CI's Postgres): `typecheck`, `test:app`, `verify-app-boundaries
--require-parser`, the web build and `Database foundation`; §2 reads them from CI.

## 2. CI on `main` [measured: `gh run view 38950430585 --json jobs` and `--log`; `gh run list --branch main --event push`]

Run 38950430585 (`push`, `main`, head `01b49187`): `bootstrap` success (both validations 843/843, `Database foundation`
and the negative control success); `application` success (vulnerability audit, dependencies, boundaries parsed,
**Type-check the application** and its negative control, **Application tests** 8 files 293 passed — 50 tenant-context,
161 contract-fixtures, 45 run, 7 stable-error, 9 idempotency, 17 envelope, 3 index, 1 web page — boundaries again,
build, build-graph check). Required checks on `main`: `bootstrap`, `application`, `strict: true` [measured: `gh api
…/branches/main/protection/required_status_checks`]. Every `main` push run in the range (`5e0eef47` … `01b49187`, 20
runs) concluded success.

## 3. Every merged PR: lane, readers, carries, CI, press

**Method.** Base = merge `^1`, final head = merge `^2` (equal to `headRefOid` for all 20; every head contains its base).
Classifier: the **base's** `classify-review-tier.mjs` and `classify-records-only.mjs` read with `git show <base>:…` into
a scratch directory and run as CI runs them (`<base> <head> --lane --head-ref=… --repo=… --head-repo=…`); every run
printed "classifier copy: the base's" [scratchpad `q0a/cls/<n>/out`]. "CI printed" is the `review tier and lane:` line of
the final head's `pull_request` run, whose `BASE_SHA` equals merge `^1` in all 20. Post-reading commits were classified
by script [`q0a/carry.py`]: role files (each `cherry-pick -x`, blob-equal to its source, one path), handoff-only
commits, and merges of `main` (main's side against the PR's own paths; `classify-records-only.mjs --sync <tip> <merge>
origin/main` with the merge's copy; `regenerate-integrity-manifest.mjs` at the merge, then `git diff --quiet`).

| PR | Lane (local = CI) | Final head | Q0's reading → final head | Final-head CI (both jobs) |
|---|---|---|---|---|
| #262 | risk (audit files + role files + handoff, so not audit) | `10dd575c` | `c579681d`; role files, handoff, C0/A1 re-reads, handoff | 38670962315, 827/827, app 224 |
| #263 | risk (role files make it not records-only) | `b590762d` | `fb551363`; role files, 2 merges (no overlap, no generated file), handoffs | 38678239408, 827/827 |
| #264 | risk | `d980fed1` | `86f3d767`; role files, merge `9ed86da1` (no overlap), handoff | 38673843811, 827/827 |
| #265 | governance | `38f5dd82` | `535e6b58`; role files, merges `e1bce345`, `cd8fcaa5` (none of the 19 paths; manifest round-trips) | 38681569474, 827/827, app 291 |
| #266 | governance | `a2d15306` | `f3ee0c1d`; role files, handoff | 38733379219, 831/831 |
| #267 | governance | `8ca23b1f` | re-read `e7c48160`; role files, merge `fdd6b583` (no overlap; manifest round-trips) | 38762107334, 835/835 |
| #268 | governance | `d8f02b36` | `0a873c2f`; role files, merge `649ef191` (overlap: manifest), handoff — **not carried (Q0-AUD1017-1)** | 38736697953, 831/831 |
| #269 | governance | `c9671c4c` | `d5a4c652`; merge `9f1c71e8` overlaps manifest — known, recorded in #277 | 38743854390, 831/831 |
| #270 | governance | `2389ed10` | `54d33c3e`; merge `7f1c93e4` overlaps manifest — known, recorded in #276 (Q0-276-1) | 38781107838, 836/836 |
| #271 | governance | `80958a8a` | `14db1f85`; merge `81b300a1` overlaps manifest only, clause (b) excepts it; regenerates clean, key set = main's | 38752303650, 831/831 |
| #272 | risk (manifest change); read by four roles | `c0ad81dd` | `382cb823`; merge `bd015a2d` (no overlap; manifest round-trips) | 38748160502, 831/831 |
| #273 | risk; treated as governance by A0 (stricter) | `d8d576c4` | `1abe629b`; merge `94ca9650` (no overlap) | 38759359687, 831/831 |
| #274 | governance | `7d07ebdb` | `67a60c33`; merge `789f7e2a` overlaps manifest; (b′) re-measure skipped — known, recorded in #277 | 38775514862, 835/835 |
| #275 | risk (tests in `src/`, "tenant" path) | `960207d8` | `a8656d04`; role files, merge `7f34adb5` (none of the 3 paths) | 38789797692, 836/836, app 293 |
| #276 | risk | `4da6ab0d` | `533c1b9f`; role files, merge `9d21bf6a` (no overlap, no generated file) | 38795886966, 836/836 |
| #277 | risk | `5e394ca4` | re-read `5f58bd17`; role files, handoff | 38837747283, 836/836 |
| #278 | governance | `0d773f6f` | re-read `2b50d10a`; role files, handoff | 38851087280, 841/841 |
| #279 | governance | `996b24d2` | re-read 4 `4754f394` (round 3 `test_failed` superseded); role files, handoff | 38905580106, 843/843 |
| #280 | governance | `b1768838` | `8fa33aa1`; role files, handoff | 38931759066, 843/843 |
| #281 | governance | `e3eaf3ce` | `34319ac8`; role files, handoff | 38947169060, 843/843, app 293 |

### 3.1 Lanes

My runs print exactly what CI printed for all 20. No lane error. #262 holds the four audit files plus six role files
and its handoff, so it is not the audit lane and risk is right (Q0-262-1, closed by #266). #263, #264, #276, #277 change
only evidence, handoffs and manifests but carry role files, so they are tier H and not records-only, hence risk. #272
(`ownership.amends_without_owning` changed) and #273 (`evidence/g0-tracker-th.md`) print risk; both were read by all
four roles and pressed under the governance bundle, which is stricter than their lane needs. #275 adds only test rows in
`src/modules/platform-kernel/**`, risk. The twelve governance PRs each touch a governance path.

### 3.2 Readers on the final head, CI, press

- **CI.** Every final head has a green `pull_request` run on both required jobs, completed before its merge [measured:
  run `updatedAt` < `mergedAt` for all 20].
- **Who pressed.** `gh` shows `workstationgroup` for all 20; the repository records A0 as presser. The authorities, each
  quote checked against the transcript by script (`q0a/quotes.py`; every Thai or "(Recommended)" quote in the 13
  dispositions added in range found at the cited user line and timestamp: 1632 at 02:13:35.293Z, 3463 at
  15:51:38.460Z, 4342 at 2026-10-16T02:40:07.764Z, 5268 at 17:10:27.643Z, 965 at 2026-10-14T13:01:02.884Z): risk lane
  #262–#264, #275–#277 by RFC-2026-034 §2.2 (Q-034-1); #265 by the kernel-surface disposition; #266–#273 by the
  2026-10-15T02:13:35Z answer (items 1–5); #274 by the 15:51:38Z answer; #278–#280 by the 2026-10-16T02:40:07Z answer;
  #281 by the 17:10:27Z answer ("ตาแนะนำ", A0's typo reading, judged fair by C0/A1/R0 before the press). Every press is
  after its authority. Who judges whether each answer reaches its PR is C0's and R0's.
- **Readers.** For 16 of 20 PRs every Q0 reading reaches the final head through its own carry clause (above). The
  three recorded exceptions (#269, #270, #274) check out as recorded: each merge's `--sync` exits 0, the manifest
  regenerates clean at the merge, and `evidence/VERIFICATION.md` is blob-equal between the merge and the final head,
  where CI's byte compare passed. The fourth, #268, is not recorded anywhere: Q0-AUD1017-1.

### 3.3 #268, measured after the fact

Between Q0's reading head `0a873c2f` and the final head `d8f02b36`: both RFCs, `db/foundation/lint/audit-coverage-map.json`,
the disposition and `work-packages/WP-0A-DB-00.json` are blob-equal; the integrity manifest differs by five digests of
main-side files (PR #266's guard, its test, the suite contract, `VERIFICATION.md`, WP-0A-CON-008's manifest); `--sync`
on `649ef191` exits 0 and names the manifest and `VERIFICATION.md` as involved; the manifest regenerates clean there;
`VERIFICATION.md` is unchanged to `d8f02b36`, where CI passed 831/831. On a temporary local branch named
`agent/claude/WP-0A-DB-00-batch-rfc-030-risk-tiered-review` at `d8f02b36`, under the lock (19:34:57Z), `npm run check`
passes 831 of 831; `check:handoff` exits 91 today only because `main` now contains that head (its branch point is the
head itself), which says nothing about the press-time state. Substance held; the press went outside my verdict's words.

## 4. Coverage of risk-lane code, and the first round's test gaps

- **Risk-lane code in range.** Only #275: two `it.each` rows in `application/tenant-context.test.ts` (Q0-265-1,
  A1-265-N4), no non-test file. CI runs them (tenant-context 50 tests at `01b49187`). The kernel's new code (`index.ts`,
  `run.ts`, changes in `envelope.ts`, `tenant-context.ts`, `stable-error.ts`, `idempotency.ts`, `ports.ts`, `fakes.ts`)
  came through #265, a governance PR Q0 read before merge with 43 mutations (its file: "41 killed, 1 equivalent") and an 800,000-case fuzz.
- **Q0-AUD1015-1, -2, -3: closed.** The owed tests are on `main` (by #265): `tenant-context.test.ts:325` refuses a
  numeric or null business id and a numeric or undefined page id with `tenant.selection.invalid` before the directory
  is asked (P1, P2); `envelope.test.ts:122` asserts a business- and page-scoped context's ids in `tenantContextRecordOf`
  and `successEnvelope` (P4, P4b); `:133` keeps `retry_after_seconds` through a re-issue and `deep_link_ref` in the
  receipt (P3, P5); `:144` and `idempotency.test.ts:76` answer `false` for non-objects (P6, P7). Read, not re-mutated
  here (Q0-AUD1017-3); #265's Q0 file records each mutant killed.
- **Q0-AUD1015-4 and -5: closed** [measured on `01b49187`, `node --test test-kits/app-stack.test.mjs`, baseline 21/21]:
  `runBuildControls` hollowed to `return []` (G200) fails 1; `"src/**/*.ts", "src/**/*.tsx"` removed from
  `tsconfig.json`'s `include` fails 1. Restored after each.
- **Merged without the tests its lane needed:** none found. Each code-bearing PR (#265, #266, #267, #270, #275, #278,
  #279, #281) carries tests Q0 measured before merge. Open from those readings: Q0-281-1 (Low, `job-store.ts`'s list
  entry not enforced), Q0-278-3 (Info, intent-to-add half), Q0-265-2 (Info, equivalent mutant); carried Q0-261-6, -7 (Info).

## 5. Findings

- **Q0-AUD1017-1 (Low, press against Q0's carry clause, unrecorded; #268).** Q0's #268 file (§7) says "This verdict
  holds for head `0a873c2f` only; any new commit on the PR branch needs a fresh Q0 reading". Six commits followed (four
  role files, the merge `649ef191` of `main` `9b3ffbd5`, the handoff `d8f02b36`), no Q0 re-read exists, and A0 pressed
  `d8f02b36` at 13:19:06Z under the 02:13:35Z answer, which asks that four roles pass. A1's clause (b) ("changes no path
  this PR changes") is tripped by the same merge's main-side manifest; that is A1's to grade. §3.3 measures no change of
  substance. It is the class of #269/#270/#274, but no file on `main` names it: `git grep` finds `d8f02b36`, `649ef191`
  and #268's merge `0d566c1f` in no record of WP-0A-DB-00. Owed: #268's post-merge records naming this (R0 lists them).
- **Q0-AUD1017-2 (Info, sync records).** RFC-2026-025 §6.3 item 1 asks a sync's record to cite the `cmp` of every
  generated file involved. The merges `e1bce345`, `cd8fcaa5` (#265), `fdd6b583` (#267), `649ef191` (#268), `81b300a1`
  (#271), `bd015a2d` (#272), `94ca9650` (#273), `7f34adb5` (#275) have `--sync` naming the manifest (and for `fdd6b583`,
  `649ef191`, `7f34adb5` also `VERIFICATION.md`) as involved, and their messages say only "integrity manifest
  regenerated"; R0-277-2 recorded this for #269 and #274 alone. Measured now, all of them round-trip (manifest regenerates
  clean at each merge; `VERIFICATION.md` is blob-equal to a final head whose CI byte compare passed), so each was
  mechanical in fact and my clauses for #265, #267, #271, #272, #273, #275 hold. Nothing owed beyond R0's call on records.
- **Q0-AUD1017-3 (Info, scope).** Without `node_modules` I did not re-run `typecheck`, `test:app`, line coverage or
  mutation of `src/**` on `01b49187`; CI's green application job (293/293) and #265's and #275's recorded mutations stand
  in for them. A coverage re-measure of the kernel can be done in the next round if disk allows.

## 6. What this audit covers and does not

It covers the tests and CI of the cumulative diff `2aef8182..01b49187`, the lane and Q0 carry of all 20 PRs, and the Q0
verdict on the risk-lane PRs (#262, #263, #264, #272, #273, #275, #276, #277). Governance PRs were read by Q0 on their
reading heads before merge and are not re-verdicted here; whether #268's, #269's, #270's and #274's presses stand is
R0's. It does not judge records, Owner-answer scope, or security grades (C0, R0, A1). WP-1A-A0-003 stays short of
`integration_verified` until its provider-bound increment, which is R0's call.
