# R0 sync reading: PR #214 after `main` moved twice (efc0383c, then 09fb5630)

Date: 2026-10-08 (+07:00). PR: https://github.com/ThinkBizLab-Org/ThinkBizThai/pull/214 (title begins `GOVERNANCE:`,
no longer Draft), branch `agent/root/WP-0A-A0-001-repository-bootstrap-2026-10-07`, packages `WP-0A-A0-001` (the
record) and `WP-0A-A0-010`. Head read: A0's local merge `654ecd8462b23468f31d09a59c85e13362796ec5` (parents
`39ccaee6` and `origin/main` `09fb5630`, PR #213). It is not pushed. The remote branch is at `39ccaee6`, which
GitHub reports as `CONFLICTING` with `main`. My last verdict is `r0-recheck-2026-10-07.md` at `fde49f2c`
(`integration_verified` NOT given yet, seven conditions). This file reads everything that landed after it:

| Commit | What it is |
|---|---|
| `7808b0e`, `470aacc`, `4975432`, `6417854` | C0, Q0, A1 and R0 re-check files, cherry-picked. Byte-unchanged since (measured: no diff `6417854..654ecd8` on those four files) |
| `170d490` | merge of `main` `9de0483e` (PR #212) |
| `dfa1250` | handoff refresh. It is no longer last |
| `98d745d` | **A0's extra commit:** the Owner's three later answers (disposition §10), the §4.1/§4.2/§6/§7.1 edits that cite them, the tracker, the closure note |
| `39ccaee6` | merge of `main` `efc0383c` (PR #216, and #215 before it) |
| `654ecd8` | merge of `main` `09fb5630` (PR #213) |

## 0. What I am

- A subagent of `/claude/a0_atlas`, spawned by A0's workflow script, acting in the role `/claude/r0_steward`. That
  run is the declared Integration Owner of `WP-0A-A0-010`. For `WP-0A-A0-001`, whose manifest still names
  `/root/r0_steward`, I act as its named successor, as in my two earlier files. `/root/r0_steward` is a different
  run, and this file is not its verdict. I am also the Integration Owner of `WP-0A-CON-008`, whose test kit
  `test-kits/branch-identity.test.mjs` this PR amends.
- The run that spawned me is this PR's Author. The task text I was given is that script's output. It is not the
  Owner speaking, and I took no approval from it.
- I do not fix. My only change is this file. It is an integration reading. It approves no review, test or security
  gate. It decides nothing the Owner decides, and it authorises no merge by itself. I used synthetic data only,
  started no database, and touched no provider or credential.

## 1. Measured versus read

### Measured (by me, in this run)

These were run in a private clone checked out on the branch NAME (`git branch --show-current` =
`agent/root/WP-0A-A0-001-repository-bootstrap-2026-10-07`) at `654ecd8`, with Node `v24.20.0` first on `PATH` and
`origin/main` = `09fb5630` (`git ls-remote` agrees).

| Command | Result |
|---|---|
| `npm run check` | **exit 1; tests 735 / pass 733 / fail 2**: `the handoff for this branch describes this branch` and `the handoff ratchet fails when an author handoff claims another role approved something`. Both come from the stale handoff only (below) |
| `npm run -s check:handoff` | **exit 91**: cites base `9de0483`, which is not on this side of branch point `09fb563`; cites head `170d490` with 6 substantive changes after it (RFC-2026-029, `WP-1A-A0-001.json`, `verify-test-coverage-floor.mjs`, `branch-identity.test.mjs`, `repository-json.test.mjs`, `WP-0A-CON-008.json`) |
| `node scripts/verify-branch-scope.mjs origin/main WP-0A-A0-001` | exit 0, "all 16 changed path(s) are declared, and every amendment explains one" |
| `node scripts/verify-branch-identity.mjs <branch>` | exit 0, `WP-0A-A0-001` |
| `validate-work-package-role-separation.mjs` on `WP-0A-A0-010.json`, `WP-0A-A0-001.json` | exit 0, exit 0 |
| `npm run -s validate:protocol` | exit 0 |
| `npm run -s regenerate:manifest`, then `git diff --exit-code` | "rebuilt 108 digest(s)"; **cmp-clean** |
| `node scripts/db/classify-records-only.mjs origin/main HEAD` | exit 1 (not records-only, as before) |
| `node scripts/db/classify-review-tier.mjs origin/main HEAD` | **exit 0, `tier: H` (16 paths, `09fb563..654ecd8`)**. Reasons: `evidence/g0-tracker-th.md` and `test-kits/integrity-manifest.json` are not L/M paths; `branch-identity.test.mjs` has an H word; `WP-0A-A0-001.json` widens `amends_without_owning`; `WP-0A-A0-010.json` adds a manifest. Classifier copy: the base's |
| `classify-records-only.mjs --sync 6417854 170d490 9de0483` | exit 0, **mechanical** (no conflict in the PR's paths) |
| `classify-records-only.mjs --sync 98d745d 39ccaee6 efc0383` | **exit 1, NOT mechanical**: "main changed the PR's own path(s): `test-kits/branch-identity.test.mjs`" |
| `classify-records-only.mjs --sync 39ccaee6 654ecd8 09fb5630` | **exit 1, NOT mechanical**, same reason |
| PR diff before the first sync (`9de0483..98d745d`), after it (`efc0383..39ccaee6`) and after the second (`09fb5630..654ecd8`) | 16 files and 2311 `+`/`-` lines each. The three line sets are **identical except one line pair**: the manifest digest of `branch-identity.test.mjs` |
| `sha256` of `branch-identity.test.mjs` at `654ecd8` | `73559ca5…843a3`, equal to the committed manifest entry. Main's blob is `36383d56…`, and neither side's digest could be right for the merged file |
| Throwaway refresh in the same clone: `npm run refresh:handoff`, commit, `check:handoff`, `node --test` on `handoff-conformance` and `ratchets-bite` | refresh exit 0, "now cites `09fb563..654ecd8` — 11 added, 5 modified", 2-line diff; `check:handoff` exit 0; 19/19 and 19/19. Then `git reset --hard 654ecd8`, and nothing was kept |
| `gh pr view 214` | OPEN, not Draft, `CONFLICTING`, head `39ccaee6`; `bootstrap` SUCCESS on `39ccaee6` (run 37770977112). That head is not the one to merge (§3) |
| `gh pr view 213/215/216` | all MERGED: #215 `4b5dac8e` at 10:21:38Z, #216 `efc0383c` at 11:21:32Z, #213 `09fb5630` at 13:11:18Z |
| Session transcript `27edf3de` (`.jsonl`), the `AskUserQuestion` calls and their tool results at 09:51:40Z/10:16:36Z, 10:16:57Z/10:21:21Z, 10:22:05Z/11:02:53Z | every question, option label, option description and answer quoted in disposition §10 **matches byte for byte** |
| sha256 of `.claude/g1-g2-plan-2026-10-08.md` | `7cabce38…6e73e2`, unchanged since my first review |

### Read, not measured

- `98d745d` in full (diff of the disposition, the tracker and the closure note), and both merges' `--cc` diffs.
- The C0, Q0 and A1 re-check verdicts, for their conditions. I did not re-run their checks.
- A0's merge report for `654ecd8`. Every number in it that I could reproduce, I did (above). They agree.

## 2. The two syncs: does either change what my verdict rests on?

My verdict rests on three things: the package's own diff against `main`, the gates it must pass, and the paths it
may touch.

**The diff.** Neither sync changes it in substance. Before, between and after them, the PR is the same 16 files and
the same 2311 changed lines, except one manifest digest (§1). The only file both sides touched is
`test-kits/branch-identity.test.mjs`.

- `efc0383` sync (`39ccaee6`). `main` (PR #216's line, via #215) added the `WP-1A-A0-001-stack-rfc` row. This PR
  adds the `WP-0A-A0-010-g0-conditional-exit` row in the same place. A0 kept both rows (`--cc` shows it). Against
  `main`, the merged file differs by exactly this PR's three intended lines: the A0-001 branch rename (twice) and the
  A0-010 row.
- `09fb5630` sync (`654ecd8`). `main` (#213) repointed DB-00 from `-rfc-025-records-path` to
  `-rfc-030-risk-tiered-review` on both lists. Git merged it without a conflict. Against `main`, the merged file
  again differs by exactly the same three lines.
- In both, the manifest digest was regenerated rather than taken from either side. It matches the file, and a
  regeneration in my clone is cmp-clean.

**Neither sync was mechanical under RFC-2026-025 §6.3**, and the classifier says so for both (§1). So neither carries
the "voids no role verdict" protection. This file is the sync reading both need. I read them, and they void no
verdict: no role's subject matter changed. `39ccaee6`'s commit message says "Mechanical sync under RFC-2026-025
§6.3". That is wrong by the classifier's own output, and A0 should not repeat it in the handoff (R3-3).

**The gates.** `main` now has RFC-2026-030 and its classifier. They rate this PR **tier H**, and tier H is "as today":
C0, Q0, A1 where the package requires it, and a re-check round on fix commits (RFC-2026-025 §5 item 2). That is the
review this PR already gets. Nothing on `main` changed a validator this PR's records are judged by in a way that fails
them. Every test except the two handoff tests passes on the merged tree, both handoff tests pass after a throwaway
refresh, and `bootstrap` was green on `39ccaee6`.

**The paths.** No protected path is touched beyond what my first review read. The scope check passes. The two
test-kit amendments (`branch-identity.test.mjs`, the generated manifest) are declared and explained. A0 regenerated
the manifest rather than editing it by hand.

**R-6 is closed.** PR #213 merged first. This branch has merged it, the manifest is cmp-clean, and the refresh is
still owed (R2-1).

## 3. The extra commit `98d745d`, which my conditions did not list

`98d745d` is not a role file or the handoff. It changes the record after all four re-checks. Here is my ruling.

- **Content.** It adds disposition §10, three Owner answers, each with A0's question and options. I checked every
  quote against the transcript, and all match. It moves the record's wording to "G0 exit: decided, conditional",
  which was my rule. The only "G0 passed"/"G0 ผ่าน" strings left are inside the correction itself (disposition :166,
  :457, :461, :470-472, tracker :4, :221), the guide's own "Until G0 passes" quoted at :225 and :478, the generic
  pass-rule line at tracker :23, and the plan's D0 cell quoted verbatim at :94. None of them claims G0 passed.
  It also adds Q0's R1 row (OPEN-011) and two "still owed" rows (the gate-rule RFC, `WP-0A-CON-008`
  `open_blockers[6]`).
- **It is a fix commit** under RFC-2026-025 §5 item 2, because it answers A1-1, A1-R2, R0 R2-2, R0 R2-3, Q0 R1 and
  my wording rule. It is re-verified by the role whose finding it answers. For mine, this file does that:
  - **R2-2 is discharged.** The Owner was asked at 10:16:57Z in a question that names `#214 G0 exit`. That was after
    the PR existed (opened 07:29:18Z). He chose `ให้ A0 กดทุกตัวในแผน (Recommended)` at 10:21:21Z. That is the
    "direction that names PR #214" my §5 asked for. It is quoted the way #211's exception is quoted, and it is filed
    as an exception to RFC-2026-025 §5 item 6 that does not amend that RFC. A0's two earlier chat statements are
    overtaken by an answer the Owner gave with the PR named. That is enough for my condition 7.
  - **R2-3 is discharged.** The Owner confirmed at 11:02:53Z: `ยืนยัน ยังผูกพัน (Recommended)`. His end condition
    ("จนกว่า contract ชุด First Slice จะ freeze ครบและมี PR แก้ CONTRIBUTING") is stricter than A0's. §10.3 says
    that, and labels A0's "and merged" reading as A0's.
  - **My wording rule is met** (above).
  - A1-1 and A1-R2 are A1's to discharge. Q0 R1 is Q0's (§5).
- **Effect on my verdict:** none against it. The commit is records-only in content. It changes no path the scope check
  or classifier treats differently: the tier is H with or without it. It closes two of my findings.

## 4. A1-G1 (from PR #213): is disposition §10.2 the record, and do the handoff and manifest name the presser?

**§10.2 is the dedicated record of the standing words.** It quotes the question verbatim, including `#214 G0 exit`.
It gives the times (asked 10:16:57Z, answered 10:21:21Z). It quotes the chosen label with its description, which
sets the scope: "เฉพาะ governance PR ที่อยู่ในแผนที่อนุมัติแล้ว เรื่องใหม่นอกแผนยังถามก่อน". It states the
conditions (four roles pass, CI green on a head that contains current `main`). It files the answer as an RFC-2026-025
§5 item 6 exception without amending the RFC. I confirm that.

**The presser is not named as A1-G1 requires, and three texts contradict §10.2.** I measured these by `grep` at
`654ecd8`:

| Where | What it says now | Problem |
|---|---|---|
| disposition §10.2 | "PR #214 may be pressed by A0, or by the orchestrator that runs A0" | names no run id; only the file header maps A0 to `/claude/a0_atlas` |
| `handoffs/WP-0A-A0-001-author-handoff.json` :130 | "the Owner merges it personally … Neither A0 nor the orchestrator merges it (C0, Q0, A1 A1-R2, R0 R2-2)" | contradicts §10.2 |
| same file :133 | the interim-rule reading "awaits the Owner's confirmation (A1-1, R0 R2-3)" | answered in §10.3 |
| same file :138 | "The Owner merges this PR personally." | contradicts §10.2 |
| same file :125 | "RFC-2026-030 is Draft PR #213 and RFC-2026-029 is Draft PR #215 … Until they are approved and merged …" | both are merged (§1) |
| `work-packages/WP-0A-A0-010.json` :47 | "The Product Owner merges the PR carrying this record personally … A direction to A0 to press it must name the PR." | true until 10:21:21Z; it should now cite §10.2 |
| same file :150 | the `CONTRIBUTING_AGENTS.md` governance PR is "merged by the Owner" | conflicts with §10.2 if that PR is in the plan; the record does not say whether it is |
| `work-packages/WP-0A-A0-001.json` increment `rationale` | no presser | A1-G1 asks for one |

**The fix, in A0's hands, not mine.** I give the words so that A0 does not have to choose them:

1. **In one text commit before the refresh** (`R3-1`):
   - disposition §10.2: "pressed by A0, or by the orchestrator that runs A0" becomes "pressed by A0
     (`/claude/a0_atlas`), or by the orchestrator that runs A0 (`/claude/a0_atlas`'s workflow)".
   - `WP-0A-A0-010.json` :47: "Presser of PR #214: A0 (`/claude/a0_atlas`), under the Owner's standing direction of
     2026-10-08T10:21:21Z (`ให้ A0 กดทุกตัวในแผน (Recommended)`, to a question naming `#214 G0 exit`), recorded in
     evidence/WP-0A-A0-001/product-owner-disposition-2026-10-08-g0-exit-and-g1-decisions.md §10.2 as an exception to
     RFC-2026-025 §5 item 6. The Owner may still press it himself."
   - `WP-0A-A0-010.json` :150: either "governance PR owed; in the approved plan, so A0 (`/claude/a0_atlas`) may press
     it under disposition §10.2" or "governance PR owed; outside the approved plan, so the Owner is asked first
     (§10.2)". **Which one is the Owner's scope, not A0's.** If the record cannot show the PR is in the plan, use the
     second.
   - `WP-0A-A0-001.json` increment `rationale`: append "Presser of PR #214: A0 (`/claude/a0_atlas`), under the
     Owner's standing direction recorded in disposition §10.2."
2. **In the handoff refresh, last and alone** (`R2-1`, carried): fix :125, :130, :133 and :138 to match the table
   above. Name the presser in the same words as item 1. Cite §10.2 and §10.3. Say both syncs were NOT mechanical and
   cite this file (R3-3).

The text commit changes two manifests, so it is substantive for the guard. It is a fix commit answering A1's finding,
so A1 re-verifies it (§5 condition 2).

## 5. Verdict

**`integration_verified` is NOT given at `654ecd8`.** The head is not pushed, the handoff is stale (`npm run check`
exit 1, 733/735), and the presser text is not yet fixed. **My verdict of `r0-recheck-2026-10-07.md` stands** on the
points it rests on. Neither sync changed the package's diff, its gates or its protected paths (§2). The extra commit
`98d745d` is sound and discharges my R2-2 and R2-3 (§3).

- **Stop-the-line:** none. No secret, tenant, migration, data or contract risk. No runtime path changes.
- **RFC-2026-030 tier:** **H** (measured, §1). The full four-role review, with re-checks on fix commits.
- **Blocks the merge:** yes, until all of these hold on one final head:
  1. **A0's text commit (R3-1, §4 item 1)**, before the refresh.
  2. **A1 re-check note on that head.** It must (a) re-verify `98d745d` and the R3-1 commit, and (b) say whether
     A1-R2 is discharged by §10.2. A1's re-check says, in its own words, that "A merge by A0 or by the orchestrator
     is not authorized" on the `fde49f2` record. Only A1 can lift that. Until A1 does, the Owner's §10.2 condition
     ("ผ่าน 4 role") is not met for an A0 press. The Owner pressing it himself does not need this.
  3. **Q0 confirms its R1 row** (disposition §6, OPEN-011), as RFC-2026-025 §5 item 2 requires for a delegated
     merge. A one-line Q0 note is enough. C0 had no finding open that `98d745d` answers, and its verdict on
     `fde49f2` stands. C0's own text already anticipated "a later Owner direction that names PR #214".
  4. **`npm run refresh:handoff` on the branch NAME, last and alone**, with the prose of §4 item 2;
     `check:handoff` exit 0 there with nothing after it.
  5. **Push; `bootstrap` green on that exact head**, and that head contains the current `main`. If `main` moves
     again: merge it, `regenerate:manifest` cmp-clean, run `classify-records-only.mjs --sync`. If it is not
     mechanical, R0 reads it again. Then refresh.
  6. **A short R0 note on the final head.** If it differs from `654ecd8` only by the R3-1 text, the role notes and the
     handoff, a note that confirms the guards on the branch name and reads the R3-1 diff is enough.
- **Who presses:** A0 (`/claude/a0_atlas`), or the orchestrator that runs it, under disposition §10.2, once 1-6
  hold. Or the Owner himself, at any point after 4-5. Record the presser and the §10.2 words in the merge record,
  as the Owner's option asked ("บันทึกคำคุณทุกครั้ง").

**After the merge, in these words.** If conditions 1-6 hold on the merged head, A0 may record:

> `WP-0A-A0-001` increment (PR #214, head `<final head>`, merge `<merge sha>`, pressed by `<A0 (/claude/a0_atlas)
> under the Owner's direction of 2026-10-08T10:21:21Z, disposition §10.2 | the Owner>`): `integration_verified` by
> `/claude/r0_steward` (`r0-review-2026-10-07.md`, `r0-recheck-2026-10-07.md`, `r0-sync-reading-2026-10-08.md` and
> the final-head note). It records the Owner's G0 decision D0 as **G0 exit: decided, conditional** (approved
> fallback under readiness `:190` condition (c) only). The exit closes when the First-Slice contracts are frozen
> (Owner, §10.1; register §7.2 (2) not waived). It does not record G0 as passed against conditions (a), (b) or (d),
> or register §7.2. No external item is done. No production customer data until legal/PDPA passes. The guide's
> "Current gate constraint" and register line 373 bind until the First-Slice contracts are frozen and a PR amending
> `CONTRIBUTING_AGENTS.md` exists (Owner, §10.3; A0 reads "exists" as "is merged").

`WP-0A-A0-001`'s own status stays `integration_verified`. `WP-0A-A0-010` may move from `in_review` to
`integration_verified` in a follow-up status commit, citing the C0, Q0, A1 and R0 files under
`evidence/WP-0A-A0-001/`. Moving it to `done` is outside this verdict. **Never record "G0 passed".**

## 6. Findings at this head

- **R3-1** (blocks a merge by A0; owner A0). The presser is not named as `/claude/a0_atlas`, and the handoff and
  `WP-0A-A0-010` contradict §10.2 (§4).
- **R2-1** (carried, blocks; owner A0). Refresh the handoff last and alone. It is now stale on a base and a head (§1).
- **R3-2** (blocks a merge by A0; owners A1 and Q0). `98d745d` and the R3-1 commit are fix commits written after the
  re-checks. A1 and Q0 confirm them (§5, conditions 2-3).
- **R3-3** (advisory; owner A0). `39ccaee6`'s message calls a non-mechanical sync mechanical. Do not repeat that in the
  handoff. Cite this file instead.
- **R2-2, R2-3, R-6:** closed (§2, §3).
