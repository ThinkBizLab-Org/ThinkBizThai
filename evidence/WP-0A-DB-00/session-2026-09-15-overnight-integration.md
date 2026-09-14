# Session record — 2026-09-15 overnight: the queue was run, three families were closed, nothing is left open on the queue

Author run: `/claude/a0_atlas` (Anthropic), the run the manifest names as Author. Package: `WP-0A-DB-00`.
Written at the close of the overnight run the Product Owner authorised in
[`product-owner-disposition-2026-09-15-six-questions.md`](product-owner-disposition-2026-09-15-six-questions.md)
("ผมจะนอนแล้ว คืนนี้คุณไล่ทำทั้ง 3 เฟส ได้เลย ทยอย commit -> PR -> merge เป็นชุดๆไป"). This file is a STATE
RECORD and approves nothing; it is the "read this first" for whoever opens the repository next, and it
supersedes [`session-2026-09-13-14-fanout-relaunched-six-draft-prs.md`](session-2026-09-13-14-fanout-relaunched-six-draft-prs.md)
for STATE.

## 1. Where `main` is

`main` = `9c2ab02` = merge of [PR #118](https://github.com/ThinkBizLab-Org/ThinkBizThai/pull/118).
**No force-push. No direct push. Every merge was a merge commit of a Draft PR marked ready under the
Owner's instruction, after a green required CI run on its head measured on the branch name.**

| Measure | Value | Where it comes from |
|---|---|---|
| `npm run verify` on `main` | **clean: exit 0 — tests 640, pass 640, fail 0, skipped 0, todo 0** | run locally at the close |
| Isolation cases on `main` | **837** | CI run 34891671336 on `c6199bf` (PR #118), and the scratch cluster on this machine read the same |
| Migrations added tonight | 082, 083, 092, 101 (closures); 081, 090, 100 (the three batches) | `db/foundation/migrations/` |
| `open_blockers` | 161 | manifest |
| Gate | G0 — Specification Baseline Complete / External Verification Pending | unchanged |
| Open Draft PRs for this package | **none** | `gh pr list` |

## 2. What merged, in order

| PR | What | Head | CI run | Cases |
|---|---|---|---|---|
| #121 | Owner disposition: Q1–Q6, cross-vendor withdrawn, 42 merges listed | `9668127` | 34881327440 | — |
| #122 | `ci.yml`: a PR is checked out as its branch (`ref: github.head_ref`) | `62664bb` | 34881948625 | — |
| #123 | relands #120's state record | `30fdf04` | 34882504465 | — |
| #124 | 550→554 / 79→75 corrected in the 2026-09-13 record | `dec24c1` | 34882996389 | — |
| #125 / #126 / #127 | reland #114 / #115 / #116 (A1, C0, Q0 on batch 080) | `21e1c3c` / `8eb1315` / `90a2cf0` | 34883520884 / 34883941712 / 34884377120 | — |
| #128 | **batch 082** — content service path closed (shape C) | `cdaf498` | 34885732643 | 634 |
| #117 | **batch 081** + its three signatures + **083** | `3e6a592` | 34888833999 | 671 |
| #119 | **batch 090** + its three signatures + **092** | `70e40ee` | 34890303551 | 757 |
| #118 | **batch 100** + its three signatures + **101** | `c6199bf` | 34891671336 | 837 |

#114, #115, #116 and #120 were closed, each pointing at its replacement (Q4.1 (a)).

## 3. The nine role runs, and what they all found

Nine subagent runs, three per batch, each a distinct run in a named role, each writing one evidence
file and nothing else — signatures under the withdrawn cross-vendor condition (Q1). All nine files
are on `main` in the PR of the batch they sign:

| Batch | Reviewer | Tester | Security/Privacy |
|---|---|---|---|
| 081 | `c0-review-batch-081-2026-09-15.md` — 2 HIGH, H1 stop-the-line | `q0-test-batch-081-2026-09-15.md` — 36 cases, 0 wrong, probes 10/1/9 | `a1-security-batch-081-2026-09-15.md` — S1 stop-the-line, **measured live** |
| 090 | `c0-review-batch-090-2026-09-15.md` — 3 HIGH, H2 stop-the-line | `q0-test-batch-090-2026-09-15.md` — 83 cases, 0 wrong, probes 13/4/9 | `a1-security-batch-090-2026-09-15.md` — S11 stop-the-line |
| 100 | `c0-review-batch-100-2026-09-15.md` — 2 HIGH, none stop-the-line | `q0-test-batch-100-2026-09-15.md` — 76 cases, 0 wrong, probes 12/2/10 | `a1-security-batch-100-2026-09-15.md` — 2 HIGH, none stop-the-line |

**All nine found the same thing: batch 080's S8 shape in their batch** — narrowings `for all to
authenticated` that bind no service role, with 082's closure stopping at 080's five tables. A1-081
measured it live on a scratch PostgreSQL: a permissive INSERT policy naming `app_command` wrote
targets under tenant B's item. So each batch integrated **with a closure file of its own** — 083,
092, 101 — of 082's exact shape, held to it by one static rule (`SERVICE_PATH_CLOSURES`), each with
catalog cases that fail against the batch alone. A1-081's exploit replayed with 083 applied is
refused by the closure by name (`a0-batch-083-integration-2026-09-15.md` §3).

Also acted on at integration, in every batch: the "exempt by ownership" sentence 082 declares false,
which each batch had copied from 080 (081 ×2, 090 ×4 including a stored table comment, 100 ×1) —
corrected in the unmerged text with the original kept beside each; and C0-090 H3, the fixture's false
reason for being able to write `approval_events`.

**Left standing in the files, for the Owner and for later increments** — every other finding. Two to
read first: **A1-100 S2**, `asset_versions.original_filename` (PII-2) is in the client SELECT grant
while its comment says it is withheld (A1 held it at HIGH and recorded the disagreement for the
Owner); and Q0-100 F1 / C0-100's MEDIUMs on the link narrowing.

## 4. Two things this session found out about the machine

- **There is a PostgreSQL here.** Homebrew `postgresql@17` 17.11, the user's own server on
  `/tmp:5432` (holds `workchat_dev`; untouched). Every earlier record said there was none. The A1-081
  run found it. A0 ran a scratch cluster of the same binaries (TCP-only on `127.0.0.1:5499`, shim
  applied, rebuilt fresh per run because 001 creates cluster roles) and measured every batch on it
  before pushing: 671, 757, 837 — each equal to what CI then read. The cluster is stopped at the
  close; `scratchpad/pg-fresh.sh` in the session scratchpad is the recipe and is not in the repository.
- **`make` on this machine fails with an Xcode licence prompt** part-way through the night (it had
  worked earlier). `node scripts/db/run.mjs <target>` is the same command without the wrapper and
  was used instead. Not a repository defect; recorded so the next agent does not chase it.

## 5. What is owed, and to whom

**Decisions only the Product Owner can make:**

1. **A1-100 S2** — the PII-2 filename in the client SELECT grant (§3).
2. **The families merged before 080** — research (070), knowledge (040/041), business/page
   (020/021), industry (030), and every other family whose narrowings are `to authenticated`
   (`grep -n 'for all to authenticated' db/foundation/migrations/`). They carry the S8 shape too.
   Closures of 082's shape, or wait for shape B? Not decided tonight.
3. **The decision record withdrawing the cross-vendor condition** (Q1) — recorded in #121, not yet
   in the rules; `independence.prefer_cross_vendor_review` is still `true` in the manifest, by
   design, until a decision record exists. Owed to `/claude/r0_steward` under the RFC path.

**Owed to A0:** shape B as one RFC for four families (blocker); the driver stdin fix (batch 100's
blocker 12; every migration is still capped at ~128 KiB; `131_billing_projection.sql` is 613 bytes
under the budget); the witness-type guard (blocker); the dead `docs/handoffs/db-00/**` entry; the
manifest's `outputs` block, which tonight's integrations set to each batch's own list in turn and
which should describe the package.

**Housekeeping:** nine `worktree-agent-*` / role-run worktrees under `.claude/worktrees/` from the
fan-out (removed at the close; the role branches `agent/claude/WP-0A-DB-00-{c0-review,q0-test,a1-security}-{081,090,100}`
remain as local refs and can be deleted — their commits are on `main` via the batch PRs); the
`.claude/worktrees/agent-*` for 090 and 100 were removed to integrate; local branches for every merged
PR (0 ahead) can be deleted.

## 6. Where this session was wrong, and what it cost

- The briefs to all nine role runs said "no PostgreSQL is available on this machine". Wrong (§4).
  A1-081 said so and measured; the others reasoned from documented semantics as instructed.
- The first resolution of the 090 merge joined git's minimal hunks with a regex and produced two suite
  files that did not parse; it was staged before it was checked. Reset and redone as "main's file plus
  the batch's own patch". The second resolver dropped batch 090's edits to the contract test by taking
  main's copy whole; the suite caught it (`every identity the data package names is in the catalog`),
  fixed in-branch (`278a406`). The third form handled 100, with six coverage-note hunks applied by hand.
  Every one of these is a merge-tooling defect, none reached `main` red, and all three are recorded in
  the integration evidence files rather than smoothed over.
- The 083 evidence file's probe tally was written before the two probes were run; they were then run
  and both noticed, so the record is true — but the order was wrong and is stated.
