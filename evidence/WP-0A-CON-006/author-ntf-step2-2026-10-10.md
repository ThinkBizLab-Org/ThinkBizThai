# Author note: NTF sequence item 2, first part — SC-2 in the CTR-NTF-001 manifest, and the A5 benchmark

Date: 2026-10-10. Author: `/claude/a0_atlas` (A0, this package's Author). Base: `main` `92968774`.

Source of the work: the Product Owner's disposition of 2026-10-09,
`evidence/WP-0A-A0-001/product-owner-disposition-2026-10-09-ntf-a5.md`, sequence item 2 ("WP-0A-CON-006: Q0's
forward-scoped benchmark, then A5's assessment of CTR-NTF-001"), and the limits PR #238 put on `/claude/a5_loom`
(`.agents/capability-profiles/cc-a5-loom.json` `limitations.role_scope`; R0's post-merge words, WP-0A-A0-001
`open_blockers[6]`).

## 1. Why this branch comes before the A5 assessment

Two preconditions must be true on `main` before `/claude/a5_loom` signs as A5:

1. The CTR-NTF-001 manifest states SC-2 ("SC-2's wording … must be in the CTR-NTF-001 manifest BEFORE this run
   ratifies", `role_scope`; WP-0A-CON-006 `open_blockers[19]`).
2. Q0's forward-scoped benchmark is on `main` and recommends the run (disposition Q2; `benchmark_outcome`).

So item 2 is split in two PRs. This branch is the first: SC-2 and the benchmark. The A5 assessment of
`open_blockers[1]`, `[2]`, `[19]` and `[22]` is the second, cut after this one merges.

## 2. SC-2, as stated

A1's condition, verbatim from `open_blockers[19]`:

> Before CTR-NTF-001 is ratified by A5 or leaves Draft, its manifest must state that the deep-link permission check is
> evaluated for the **recipient**, at **open time**, and where the recipient's identity comes from (even if that is
> "MOD-100, outside this contract").

The manifest's `untestable_by_schema` gains item (4). It states:

- **For whom:** the recipient, the person who opens the link. Never `tenant_context.actor`, who caused the notification
  and is the only principal the document carries.
- **When:** at open time, when the recipient follows the link, not at send time. A grant or revocation in between
  decides the open.
- **Where the identity comes from:** not this contract, which has no recipient field. MOD-100 resolves who is notified,
  outside this contract. The open-time check takes the identity of whoever opens the link from the application that
  serves it, not from any field of the document. A link opened by someone else is checked for that person.

Why `untestable_by_schema`: the existing item (1) already says that "the recipient actually holds the permission it
demands" is a runtime check. SC-2 says whose permission and when, which no schema can express. A new manifest key
would need a schema and registry change; this needs neither.

What this is not:

- It is A0's statement of A1's condition. It is not A5's ratification, and A5 may correct the wording as owner.
- It is not A1's confirmation that SC-2 is met. A1 gives that before the Candidate move (disposition Q3), so
  `open_blockers[19]` stays open.
- It adds no schema rule, no field, no fixture. The schema's `deep_link` is unchanged.

Consequences outside this package, each declared in `ownership.amends_without_owning`:

- `test-kits/contracts/catalog-registry.test.mjs` (WP-0A-CON-008): the `CAVEAT_DIGESTS` pin of
  `ctr-ntf-001.untestable_by_schema` moves from `7c05ce2b6365a50e` to `78c774aedcb5bdbc`, with a dated comment. The pin
  exists so that a caveat is edited only in a reviewed diff; this is that diff.
- `test-kits/integrity-manifest.json` (WP-0A-A0-002): rebuilt by `npm run regenerate:manifest`.

## 3. The benchmark

Q0 (`/claude/q0_sentinel`) designs and scores it, as the Owner directed. Unlike Q0's A6 benchmark of 2026-09-03
(a work sample, because the run could not be dispatched), this one asks the run fresh questions:

1. Q0 writes a task sheet on synthetic material, with a sealed answer key kept outside the repository. Its SHA-256 is
   in the sheet.
2. A0 dispatches a fresh `/claude/a5_loom` run with the sheet only. The run writes its answers with the §0
   same-lineage disclosure (disposition Q4).
3. Q0 reveals the key, checks its hash, scores, and gives the outcome: recommend, recommend with conditions, or do not
   recommend.

The benchmark is forward-scoped: it does not pre-do the real assessment of `[1]`, `[2]`, `[19]` and `[22]`.

Then `cc-a5-loom.json` `limitations.benchmark_outcome` records the outcome, as R0-238-4 requires: a declared amendment
on this package. If the outcome is "do not recommend", the run does not sign. The assessment then needs a new Owner
decision, and this branch records that instead.

### 3.1 Outcome (recorded after stage 3)

- Task sheet: `q0-a5-benchmark-tasks-2026-10-10.md` (Q0 `8cb37554`, carried with `-x`). Key published as
  `q0-a5-benchmark-key-2026-10-10.md`; its SHA-256 matches the sheet (Q0 §1).
- The run's answer: `a5-benchmark-answer-2026-10-10.md`, transcribed by A0 with the dispatch prompt, the one resume
  message after an application restart, the `git status` record, one disclosed redaction (a synthetic phone-shaped
  number the secret scan rejects), the hash check, and the key search (0 hits).
- Q0's scoring: `q0-a5-benchmark-2026-10-10.md` (Q0 `d4f6fb07`, carried with `-x`). **Recommend with conditions.**
  T1, T2, T4 and T5 pass; T3 passes with condition C-T3; nothing fails, nothing is fabricated. Q0 rules the restart
  does not affect validity.
- `cc-a5-loom.json` `limitations.benchmark_outcome` now records that outcome and C-T3 verbatim, as a declared
  amendment on this package (R0-238-4). Nothing else in the profile changes.

C-T3 binds the A5 assessment in the second PR: every bound and class labelled decision or inference, every cited
fixture shown by an executed probe to isolate its rule, and the absent-property case stated for every `const` rule
relied on. Q0 re-reads the A5 file against it before its signature is cited.

## 4. What stays as it is

- CTR-NTF-001 `status` stays `Draft`. This package's `status` stays `in_review`.
- No other contract is touched, and no test is added, removed or renamed.
- The run's §0 confirmation or correction of the capability values in `cc-a5-loom.json` belongs to its first A5 file,
  in the second PR.
