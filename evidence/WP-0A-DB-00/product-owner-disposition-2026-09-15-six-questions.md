# Product Owner disposition — 2026-09-15: six questions, and the whole package's missing signatures

**Recorded:** 2026-09-15
**Authority:** Product Owner
**Subject:** `WP-0A-DB-00` as it stands at `c5eb1b9` (`main` = merge of PR #113), the seven Draft
PRs open against it (#114–#120), the stop-the-line finding S8 recorded in PR #114, and every merge
this package has made into `main` since its first.
**Evidence origin:** Owner statements in the ThinkBizThai project conversation on 2026-09-15,
transcribed here as the repository evidence record. The transcription is the record; the
conversation is not.
**Transcribed by:** `/claude/a0_atlas`, the run the manifest names as Author. It decided nothing
below, and this file is none of the four role signatures RFC-2026-002 requires.

The questions were put one at a time, in the order below, each with the options the Author could
see and its own recommendation stated as a recommendation. The Owner's answer is quoted verbatim
under each. Where an answer is a letter, the lettered options are reproduced so the mapping is
checkable rather than plausible.

## Q5 — does the open stop-the-line block the whole queue?

**Put:** `CONTRIBUTING_AGENTS.md` says *"A manual merge cannot waive an unresolved stop-the-line
risk."* S8 (PR #114 §2A; the record's §3.1) is open and is on `main` already. Does that sentence
forbid merging **the whole queue** — #120, #114–#116, and batches 081/090/100 — until S8 is closed,
or only what touches content?

- (a) the whole queue — the most literal reading; 082 goes before everything, even #120
- (b) only what touches content — the queue moves; 082 goes after #120 and the role evidence
- (c) only the new batches (081/090/100); docs-only PRs (#120, #114–#116) may pass, because they add
  no risk and #114 is the file that *records* S8

**Disposition:**

> (c) docs-only ผ่านได้ batch ใหม่รอ 082

Read: **(c).** Documentation-only PRs may merge while S8 is open. Batches 081, 090 and 100 wait
until the S8 forward fix (migration 082) is on `main`.

## Q3 — which repair for S8

**Put:** the five RESTRICTIVE scope narrowings in `080_content.sql` are `for all to authenticated`
and so bind nothing the promised `app_command` writer does. `080` is integrated and may not be
rewritten. The three repairs A1 named as forbidden — `BYPASSRLS`, dropping `FORCE`, making
`app_command` the table owner — were excluded before the options were put. Three remained:

- **A** — re-create the narrowings naming `app_command` beside `authenticated` (A1's §2A.4
  remedy). The Author measured this against `021_member_scope.sql` and recommended **against** it:
  `app.member_scope_admits_business` resolves through `app.member_scope_is_narrowed`, a
  `security invoker` function that reads `app.workspace_member_scopes`. For `app_command` that is
  three refusals in a row — no EXECUTE (`021:505-507`), no SELECT on the table, and a
  `_select_own` policy that names `authenticated` only — and if every one were granted the helper
  would see zero rows, report "not narrowed", and the narrowing would admit **everything**. A
  control that reads as present and always passes.
- **B** — a narrowing that reads the *acting user* from a session setting through a
  `security definer` helper taking the user as a parameter, with a fail-closed rule when the
  setting is absent. The right long-term shape, but it changes the RLS semantics of a service
  path and needs a contract for how the command path carries the acting user — neither exists,
  and `CONTRIBUTING_AGENTS.md` requires an RFC before either.
- **C** — one RESTRICTIVE policy per content table, `for all` with no `TO` clause (so `PUBLIC`,
  every role including ones not yet created), `using (current_user = 'authenticated')` and the
  same `with check`. Changes nothing today — no role but `authenticated` holds a privilege on the
  five tables (`080:903-951` asserts it) — and refuses every future service writer until a batch
  amends this policy in a diff a reviewer reads. It also refuses a future `app_maintenance` sweep
  on content, deliberately: that becomes a decision rather than an omission.

The Author recommended **C now, B as an RFC owed to the batch that writes the command function**,
and said plainly that C does not decide how a command writer should be scoped; it only prevents
one arriving silently. None of §1.1's measurements has met PostgreSQL — this machine has none —
and all of them must be re-measured in CI before they are evidence.

**Disposition:**

> C แล้วค่อย B

Read: **C now; B afterwards.** Migration 082 takes shape C. Option B is recorded as an RFC owed to
whichever batch writes the first content command function, not to 082.

## Q4 — the CI/tree divergence

**Put:** `.github/workflows/ci.yml:36` checks out with no `ref:`, so a pull-request build is a
detached HEAD; `test-kits/handoff-conformance.test.mjs:233` reads `HEAD`, finds no claimant, and
returns early — reported as a pass. Reproduced at `ffd9cc3`: CI run 34753189118 success on every
step while `npm run verify` on the same commit reads `NOT clean: 584/586`. RFC-2026-002 has the
Owner merge on "a green required CI run"; that green does not cover the handoff guard.

- (a) fix `ci.yml` so CI measures on the branch name, **before** anything else merges. Immediate
  side effect: #114, #115 and #116 turn CI-red (their deliberate 584/586), and cannot merge under
  the rule until repositioned.
- (b) accept the gap for now, record it as a blocker, and have the Owner merge on CI green **plus**
  a verify line measured on the branch name and reported in every handoff.
- (c) fix `ci.yml` but merge #114–#116 first through the hole — using a guard known broken, once,
  then closing it. The Author did not recommend this.

`.github/**` is outside this package's `writable_paths` and CI is protected under
`CONTRIBUTING_AGENTS.md`; the fix is an amendment the Owner is here told of.

**Disposition:**

> a

Read: **(a).** `ci.yml` is fixed first, as an amendment outside this package's writable paths, and
nothing merges before it.

### Q4.1 — what becomes of #114, #115, #116 once CI measures on the branch

**Put:** they are red on the same two tests (`the handoff for this branch describes this branch`
and the ratchet) because the plumbing is not the last commit, and nothing short of a force-push —
forbidden — moves it.

- (a) open replacement PRs — cherry-pick each evidence file onto a new branch from the fixed
  `main`, plumbing as the final commit, close the originals with a pointer to the replacement.
  Nothing is rewritten; three branches, three PRs.
- (b) widen `WRITTEN_AFTERWARDS` in `refresh-author-handoff.mjs` to exempt
  `branch-identity.test.mjs` and `work-packages/**` so the three go green untouched — a weakening
  of a guard that has just been shown to work. Not recommended.
- (c) merge them red. Contrary to RFC-2026-002 on its face. Not recommended.

**Disposition:**

> a

Read: **(a).** Replacement PRs; the originals are closed, each pointing at its replacement.

## Q1 — the four signatures absent when #112 merged

**Put:** RFC-2026-002 requires Author, independent Reviewer, independent Tester, Security/Privacy
and Integration Owner before the Owner merges. When PR #112 (batch 080) merged, the Author's was
the only one. The only record of that is a paragraph inside a file that disclaims all authority,
written by the Author — the party forbidden to approve its own work. **Is #112 taken as having
proceeded with the Owner accepting this gap, or is it a debt to be closed retroactively?** If a
debt: does same-vendor evidence (PRs #114–#116) close it, or must it be a cross-vendor run?

**Disposition:**

> ยอมรับ  ขอถอดเงื่อนไข cross vendor ทั้งหมด  เพราะผมจะ dev ใน claude เป็นหลัก

Read: **Accepted.** PR #112's merge stands with the gap acknowledged by the Owner. **And the
cross-vendor condition is withdrawn entirely**, the Owner's reason being that development will be
Claude-primary.

What the Author read that withdrawal to cover, and put back to the Owner at the time (no
correction was made): only the *vendor* condition is withdrawn. The Author still may not approve,
test-verify, integrate or gate-approve its own work, and the four roles remain four distinct
`agent_run_id`s. A same-vendor run in a distinct role now counts as that role's signature.

## Q2 — scope of this disposition

**Put:** the same absence of signatures holds for *every* increment in this package's history, not
only #112. Does this disposition cover #112 alone, or the pattern across the whole package?

**Disposition:**

> ครอบทั้ง package list PR ให้ครบ

Read: **The whole package.** Every merge is listed in §Appendix, so what is accepted is
enumerated rather than assumed.

## Q6 — batches 081, 090 and 100 have no role runs of their own

**Put:** the three batches have an Author each and nothing else; #114–#116 are evidence about
**080**, not about them. With the vendor condition withdrawn, same-vendor role runs now count.

- (a) fan out role runs before merging — Reviewer, Tester and Security per batch, nine runs, each a
  distinct run because roles may not share one; launched **after** 082 lands so they branch from
  a settled `main`. Costs time and one more rebase; satisfies RFC-2026-002.
- (b) merge without role runs and add three rows to the §Appendix table.
- (c) Reviewer + Security only, six runs, on the argument that CI on PostgreSQL 17 does part of a
  tester's work — against which: Q0's hand-simulation of 080 found five right-for-the-wrong-reason
  cases CI could not.

The Author recommended **(a)**: with the vendor condition withdrawn this is the first time the rule
can be met without waiting on anyone outside.

**Disposition:**

> a

Read: **(a).** Nine role runs, after 082, before 081/090/100 merge.

## The Owner's instruction for the session that follows

> ผมจะนอนแล้ว คืนนี้คุณไล่ทำทั้ง 3 เฟส ได้เลย  ทยอย commit -> PR -> merge เป็นชุดๆไป

Read: the Owner authorised the Author run to carry out all three phases overnight —
commit → Draft PR → merge, one set at a time — in the order the Author had proposed and the Owner
had heard: this disposition → `ci.yml` fix → #120 → the 550/554 correction → replacement PRs for
#114–#116 → 082 → nine role runs → 081 → 090 → 100. **This is an instruction to merge, given by
the Owner, and the merges it produces are the Owner's manual merges under RFC-2026-002 performed
by delegation.** It does not waive any other clause of that RFC: every merge still needs a green
required CI run on its head and its handoff still records PR, head SHA, CI run and rollback.

## What this settles, and what it does not

**Settled.**

- Documentation-only PRs may merge while S8 is open; new batches may not until 082 is on `main`.
- 082 is shape C. Shape B is owed as an RFC to the first content command-function batch.
- `ci.yml` is fixed before any further merge. #114–#116 are replaced, not repaired.
- Every merge in the §Appendix table proceeded without the four independent signatures, and the
  Owner accepts each of them as it stands.
- The cross-vendor condition is withdrawn for this package. Role separation is not.
- 081/090/100 receive nine role runs before merging.

**Not settled, and each still owed to somebody:**

- **The withdrawal of the cross-vendor condition is recorded here and is not yet in the
  repository's rules.** It lives in `work-packages/WP-0A-DB-00.json` →
  `independence.prefer_cross_vendor_review: true` and `independence.cross_vendor_exception`, in
  the Sprint 0A Decision Register (read-only to this package), and in other packages' manifests.
  Changing a gate rule goes through the RFC/decision path under `CONTRIBUTING_AGENTS.md`; this
  disposition is the Owner's decision and the input to that record, not the record. Owed to the
  Integration Owner (`/claude/r0_steward`) as a decision document; the manifest fields are not
  edited by this increment.
- **Shape B**, the acting-user narrowing, as an RFC. Owed to the first content command-function
  batch, and to be written into 082's header and the manifest's blockers by 082.
- **Everything the previous records list as owed to A0** — the 550/554 correction, the driver stdin
  fix, the witness-type guard, the dead `docs/handoffs/db-00/**` entry — is unchanged by this.
- **The role runs for 081/090/100** do not exist yet. Nine runs are authorised; none has produced
  anything.

## Explicit limits

This disposition does **not**:

- pass Gate G0, which remains Specification Baseline Complete / External Verification Pending;
- move `WP-0A-DB-00` out of `in_progress`, or make any package `Ready`;
- fill `role_assignments.product_reviewer_agent_run_id`, for the reason the batch 070 disposition
  gives;
- substitute for the independent Reviewer, Tester, Security or Integration Owner evidence on any
  future merge — it accepts the past absence and authorises the mechanism (same-vendor role runs)
  by which future merges can carry it;
- waive S8. Shape C is a forward fix that closes the path; the finding stays open in the sense that
  matters — the command writer is still unbounded by design — until shape B lands;
- approve Meta or Stripe credentials, payment operations, legal/PDPA/accounting decisions, storage
  configuration, production data handling, or any production release.

## Appendix — every merge this package has made into `main`

Forty-two pull requests, every one from a branch under `agent/claude/WP-0A-DB-00-*`, every one
merged with a merge commit (never squashed, so cited revisions stay reachable). For each, the
Author's signature was present and **the independent Reviewer, Tester, Security/Privacy and
Integration Owner signatures were absent** — which is the fact the Owner accepts under Q1/Q2.

Two qualifications so the table does not overclaim:

- #57–#92 are already itemised clause by clause in
  [`rfc-002-compliance-2026-09-08.md`](rfc-002-compliance-2026-09-08.md) §2, with head SHAs; that
  record's verdict on clause 3 — "all four roles were held by one run" — is what this table
  repeats for them.
- Several merges carried *subagent* evidence (C0 reviews, A1 countersignatures, Q0 tests), and the
  compliance record's own words apply: "a second reading, not a second opinion". Under the
  condition withdrawn today those readings would have counted as signatures had they been by
  distinct runs in the named roles; whether each was is not re-audited here, and the table treats
  all forty-two alike.

The list was taken from `gh pr list --state merged` on 2026-09-15, filtered on the branch prefix;
the manifest's `status` has never left `in_progress`, which is the repository's own statement that
no gate after `author_complete` was ever passed.

| PR | merged | merge commit | branch (`agent/claude/WP-0A-DB-00-…`) |
|---|---|---|---|
| [#49](https://github.com/ThinkBizLab-Org/ThinkBizThai/pull/49) | 2026-09-05 | `c7ec21f` | `schema-foundation` |
| [#51](https://github.com/ThinkBizLab-Org/ThinkBizThai/pull/51) | 2026-09-05 | `8df25e8` | `catalog-truth` |
| [#54](https://github.com/ThinkBizLab-Org/ThinkBizThai/pull/54) | 2026-09-05 | `c2f2092` | `service-roles` |
| [#55](https://github.com/ThinkBizLab-Org/ThinkBizThai/pull/55) | 2026-09-05 | `d88b0ce` | `rls-helpers` |
| [#56](https://github.com/ThinkBizLab-Org/ThinkBizThai/pull/56) | 2026-09-05 | `2cee063` | `lint-targets-ddl` |
| [#57](https://github.com/ThinkBizLab-Org/ThinkBizThai/pull/57) | 2026-09-05 | `9e0c20c` | `ci-postgres` |
| [#58](https://github.com/ThinkBizLab-Org/ThinkBizThai/pull/58) | 2026-09-05 | `463cf97` | `blockers-measured` |
| [#60](https://github.com/ThinkBizLab-Org/ThinkBizThai/pull/60) | 2026-09-05 | `c7deac1` | `a1-countersignature` |
| [#64](https://github.com/ThinkBizLab-Org/ThinkBizThai/pull/64) | 2026-09-05 | `fc79045` | `reservations` |
| [#65](https://github.com/ThinkBizLab-Org/ThinkBizThai/pull/65) | 2026-09-05 | `becb963` | `exemption-register` |
| [#68](https://github.com/ThinkBizLab-Org/ThinkBizThai/pull/68) | 2026-09-05 | `ff592de` | `review-findings` |
| [#69](https://github.com/ThinkBizLab-Org/ThinkBizThai/pull/69) | 2026-09-05 | `3e51bd9` | `d4-behavioural` |
| [#74](https://github.com/ThinkBizLab-Org/ThinkBizThai/pull/74) | 2026-09-06 | `ba4e487` | `service-path-negatives` |
| [#75](https://github.com/ThinkBizLab-Org/ThinkBizThai/pull/75) | 2026-09-06 | `78fb818` | `rfc-020` |
| [#77](https://github.com/ThinkBizLab-Org/ThinkBizThai/pull/77) | 2026-09-06 | `381ede2` | `batch-011` |
| [#78](https://github.com/ThinkBizLab-Org/ThinkBizThai/pull/78) | 2026-09-06 | `6185f8e` | `batch-020` |
| [#79](https://github.com/ThinkBizLab-Org/ThinkBizThai/pull/79) | 2026-09-06 | `40d6660` | `control-020` |
| [#80](https://github.com/ThinkBizLab-Org/ThinkBizThai/pull/80) | 2026-09-06 | `07aa8f6` | `batch-021` |
| [#81](https://github.com/ThinkBizLab-Org/ThinkBizThai/pull/81) | 2026-09-06 | `ed1a4bb` | `batch-030` |
| [#82](https://github.com/ThinkBizLab-Org/ThinkBizThai/pull/82) | 2026-09-06 | `e2f71cd` | `control-count` |
| [#83](https://github.com/ThinkBizLab-Org/ThinkBizThai/pull/83) | 2026-09-06 | `db8b211` | `rfc-021` |
| [#85](https://github.com/ThinkBizLab-Org/ThinkBizThai/pull/85) | 2026-09-06 | `a622b7a` | `batch-040` |
| [#88](https://github.com/ThinkBizLab-Org/ThinkBizThai/pull/88) | 2026-09-06 | `b44e6cf` | `batch-041` |
| [#89](https://github.com/ThinkBizLab-Org/ThinkBizThai/pull/89) | 2026-09-07 | `49f693a` | `batch-140` |
| [#90](https://github.com/ThinkBizLab-Org/ThinkBizThai/pull/90) | 2026-09-07 | `3846fe2` | `batch-050` |
| [#91](https://github.com/ThinkBizLab-Org/ThinkBizThai/pull/91) | 2026-09-07 | `29a7a6b` | `batch-060` |
| [#92](https://github.com/ThinkBizLab-Org/ThinkBizThai/pull/92) | 2026-09-07 | `e716c80` | `batch-130` |
| [#93](https://github.com/ThinkBizLab-Org/ThinkBizThai/pull/93) | 2026-09-08 | `80438cc` | `parallel-integration` |
| [#94](https://github.com/ThinkBizLab-Org/ThinkBizThai/pull/94) | 2026-09-08 | `f4bd4e4` | `rfc-022` |
| [#97](https://github.com/ThinkBizLab-Org/ThinkBizThai/pull/97) | 2026-09-08 | `8c1a7d3` | `service-policy-map` |
| [#98](https://github.com/ThinkBizLab-Org/ThinkBizThai/pull/98) | 2026-09-08 | `0c56f9a` | `batch-110` |
| [#99](https://github.com/ThinkBizLab-Org/ThinkBizThai/pull/99) | 2026-09-08 | `01b7755` | `batch-061` |
| [#100](https://github.com/ThinkBizLab-Org/ThinkBizThai/pull/100) | 2026-09-08 | `82e610f` | `batch-131` |
| [#101](https://github.com/ThinkBizLab-Org/ThinkBizThai/pull/101) | 2026-09-08 | `e1b418b` | `batch-051` |
| [#102](https://github.com/ThinkBizLab-Org/ThinkBizThai/pull/102) | 2026-09-09 | `fd258f9` | `stale-position-claims` |
| [#103](https://github.com/ThinkBizLab-Org/ThinkBizThai/pull/103) | 2026-09-09 | `f3d3102` | `batch-132` |
| [#104](https://github.com/ThinkBizLab-Org/ThinkBizThai/pull/104) | 2026-09-10 | `ff12b8b` | `batch-070` |
| [#105](https://github.com/ThinkBizLab-Org/ThinkBizThai/pull/105) | 2026-09-10 | `80330c9` | `quadratic-strip` |
| [#106](https://github.com/ThinkBizLab-Org/ThinkBizThai/pull/106) | 2026-09-10 | `2e18f75` | `one-psql-session` |
| [#111](https://github.com/ThinkBizLab-Org/ThinkBizThai/pull/111) | 2026-09-10 | `101438a` | `disposition-generation-run` |
| [#112](https://github.com/ThinkBizLab-Org/ThinkBizThai/pull/112) | 2026-09-12 | `49830ad` | `batch-080` |
| [#113](https://github.com/ThinkBizLab-Org/ThinkBizThai/pull/113) | 2026-09-13 | `c5eb1b9` | `session-handoff-2026-09-13` |
