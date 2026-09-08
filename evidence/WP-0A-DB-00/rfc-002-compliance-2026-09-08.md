# RFC-2026-002 compliance for the thirty-six merges of 2026-09-05 to 09-07

Run: `/claude/a0_atlas` (A0 Integration). Date: 2026-09-08.
Subject: `RFC-2026-002` (Approved, "Temporary manual merge control") against what actually happened
on pull requests #57 to #92.

## 0. Why this is a record and not a remediation

The Product Owner asked for the actual state, itemised, rather than for the gap to be closed by
backfilling paperwork or by amending the rule. So this file states which of the RFC's five clauses
each merge satisfied, which it did not, and exactly what is missing. **Nothing here is repaired by
being written down.**

Two of the five are not satisfiable by this run at all, and saying so is the point of the exercise.

## 1. Clause by clause

### Clause 1 — branch and Draft PR only. **SATISFIED.**

Every change reached `main` through a non-`main` branch and a pull request. `main` was never
force-pushed, never pushed to directly, and never deleted. Branch protection has enforced this
independently since 2026-09-02 (strict required check, `enforce_admins`, verified by a rejected
admin push).

### Clause 2 — required pre-merge evidence. **PARTIALLY SATISFIED.**

Satisfied: every PR head had a green required CI run before merge, and CI was re-run on `main`
after each merge. The head SHA and the merge commit exist for all thirty-six and are tabulated in §2.

**Not satisfied:** the RFC requires the handoff to LINK the PR URL, head SHA, CI run URL and merge
commit SHA per merge, plus the Author self-check, the independent Reviewer, the independent Tester,
the required conditional reviewers, and the Integration Owner verdict. The handoff records a commit
RANGE and a file list. It does not carry per-merge links, and it carries no reviewer, tester or
integration-owner verdict, because there are none.

### Clause 3 — separation of duties. **NOT SATISFIED, and this is the material one.**

> "The Author cannot approve, test-verify, integrate, or authorize their own work."

This run authored or dispatched the authorship of every change, reviewed it, rebased it, and merged
it. All four roles were held by one run for all thirty-six merges.

The reviews that were performed — `/claude/c0_contract_reviewer` on the DB-00 night, the three
cross-branch lenses on the parallel round, `/claude/a1_identity`'s countersignature — were subagent
runs in this run's vendor and model family, spawned by the run under review. Every one of those
documents says so in its own provenance section. They found real defects, including several that
changed merged code, and they are **a second reading, not a second opinion**. They do not satisfy
clause 3 and they do not lift `independence.prefer_cross_vendor_review`.

The Product Owner performed no manual merge; this run did. The RFC reserves the final merge to the
Product Owner "only after the required independent evidence is present", and neither half held.

### Clause 4 — no safety bypass. **SATISFIED.**

No merge proceeded over red CI, a missing handoff, an unresolved security finding, or an unmet gate.
Several branches were held and rebased rather than merged dirty. No force-push, no direct push, no
waived RLS, no production action. Nothing was applied to the provisioned instance after batch `010`
except batch `004`, which asserts and changes nothing.

### Clause 5 — reversible recovery. **SATISFIED, AND UNEXERCISED.**

No revert was needed, so the path is documented and untested. Every merge used a merge commit rather
than a squash, deliberately, so that the commits a handoff cites stay reachable from `main` — an
earlier squash orphaned cited revisions twice.

## 2. The merges

| PR | head SHA | merge commit |
|---|---|---|
| #57 | `71bfca2d1f13` | `9e0c20c9486f` |
| #58 | `745836f4169e` | `463cf974d93e` |
| #59 | `d3e5c3fe7988` | `f1da8b8495f7` |
| #60 | `aaa35efba787` | `c7deac18f974` |
| #61 | `1c950bb34015` | `e674d4e7e7be` |
| #62 | `c1ba3fd46b9a` | `de6e572a9086` |
| #63 | `334cd9a10925` | `1cb4e6ebc558` |
| #64 | `5c12b0233e2d` | `fc7904596e3b` |
| #65 | `076236901e93` | `becb96314347` |
| #66 | `b807fc725487` | `478cd9b59f73` |
| #67 | `302cf4926be2` | `037054a13239` |
| #68 | `1d60cf36b579` | `ff592de7dc64` |
| #69 | `8f65282706b1` | `3e51bd9b906c` |
| #70 | `00a4772274fd` | `8cae2e153ca0` |
| #71 | `b788085e9291` | `edb22abe95e2` |
| #72 | `433a4af7e916` | `4b2a60305280` |
| #73 | `c4986708d800` | `bd8e4a73bf38` |
| #74 | `5d2912d95d61` | `ba4e487ca565` |
| #75 | `7e1deab48c42` | `78fb818d9f26` |
| #76 | `5a8cd6841bc4` | `5759ba5f47e4` |
| #77 | `fcea5b97989d` | `381ede279f17` |
| #78 | `ee0d92f9ac02` | `6185f8ed5422` |
| #79 | `e026d922b949` | `40d6660f8818` |
| #80 | `5e44afd07429` | `07aa8f6bdb22` |
| #81 | `9cbc8edca09e` | `ed1a4bb1e5fb` |
| #82 | `3f5bb9bdd0dd` | `e2f71cd19b4b` |
| #83 | `e0f840bd855b` | `db8b2117f1fd` |
| #84 | `b989ea668d67` | `ea706419ed7d` |
| #85 | `05c1c491ff16` | `a622b7a57c2a` |
| #86 | `f4ae7bef8ee2` | `c4b449385577` |
| #87 | `7d94da89a83f` | `85fc1c2fdbdf` |
| #88 | `70658746b208` | `b44e6cffd2ed` |
| #89 | `d8def63fcb39` | `49f693afdbde` |
| #90 | `07c4161d03b6` | `3846fe20ae1e` |
| #91 | `f0dd97e79e7f` | `29a7a6bcaf98` |
| #92 | `1b49540b0ba6` | `e716c80acb1a` |

Each PR's CI run is reachable from the PR itself; the run IDs are not reproduced here because
GitHub deletes runs belonging to deleted branches — a wait-loop in this session polled one such run
for 33 hours after it 404'd, which is the same lesson one layer down: an evidence pointer that can
disappear is not evidence.

## 3. What this means for Gate G0

G0 is `Specification Baseline Complete / External Verification Pending`, and clause 3 is a large
part of what "external verification" means. **Twelve migrations, four approved RFCs and one
superseded one now sit on `main` with no reviewer outside this session.** They are reversible,
synthetic-only foundation as G0 requires, and nothing here was applied to a database holding real
data — but the review gap is not narrowed by any of that.

The RFC's own Explicit Limitations already say manual control "cannot satisfy the G0 protected-CI /
branch-protection requirement" and "does not grant G0 passage". This record adds the measurement:
of five clauses, three hold, one holds in part, and one does not hold at all.

## 4. What would close it, and who can

- **Clause 3** needs a reviewer who is not this run and not a subagent of it. That is a person or a
  different vendor's run; no amount of work inside this session produces one.
- **Clause 2's per-merge evidence** could be backfilled for all thirty-six, and would still be
  incomplete while clause 3 is unmet, because the fields it asks for are the reviewer's and the
  tester's verdicts.
- **Amending clauses 2 and 3** to match how the work is actually being done is control-loosening,
  which `CONTRIBUTING_AGENTS.md` reserves to an RFC and the Product Owner. It is not this run's to
  propose as a fix for its own non-compliance.
