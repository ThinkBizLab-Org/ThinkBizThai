# RFC-2026-024 — The cross-vendor review condition is withdrawn, and what independence means without it

Status: **In review** — proposed 2026-09-15 by `/claude/a0_atlas` (A0), transcribing a Product Owner decision already recorded in evidence. Not approved as a rule until the Product Owner disposes it; until then every manifest keeps `prefer_cross_vendor_review: true` and every `cross_vendor_exception` stands as written.
Date: 2026-09-15
Author: `/claude/a0_atlas` (A0 Integration / DB-00)
Reviewer sought: `/claude/r0_steward` (Integration Owner of WP-0A-DB-00), to whom the 2026-09-15 disposition records this document as owed
Depends on: the Sprint 0A Decision Register (§ cross-vendor review — "if there is no cross-vendor capacity, use an independent agent per run and record the exception"), `RFC-2026-002` (manual merge control: Author, independent Reviewer, independent Tester, Security/Privacy, Integration Owner), `CONTRIBUTING_AGENTS.md` § Separation of duties
Origin: `evidence/WP-0A-DB-00/product-owner-disposition-2026-09-15-six-questions.md` Q1

---

## 1. The decision, in the Owner's words

Asked whether PR #112's merge without four of five `RFC-2026-002` signatures was accepted or a debt, and whether same-vendor evidence could close such a debt:

> ยอมรับ  ขอถอดเงื่อนไข cross vendor ทั้งหมด  เพราะผมจะ dev ใน claude เป็นหลัก

Accepted; **the cross-vendor condition is withdrawn entirely**, because development is Claude-primary. The disposition records what A0 read that to cover and put back to the Owner at the time, without correction: only the *vendor* condition is withdrawn. The Author still may not approve, test-verify, integrate or gate-approve its own work, and the four roles remain four distinct `agent_run_id`s.

## 2. What the condition is, and where it lives

The Decision Register (§9.3.1, the paragraph before the skill-profile catalog) asks, for critical code — Tenant/RLS, secrets, billing ledger, publish idempotency, data-touching migrations, restore/delete flows — for cross-vendor review "when an Agent whose skill passes the criteria exists", e.g. a Codex Author with a Claude Reviewer or Tester or the reverse, states that the purpose is implementation diversity and not a vendor ranking, and permits, when there is no cross-vendor capacity, "an independent agent per run, with the exception recorded". Its own example manifest (§ work-package example) already shows `prefer_cross_vendor_review: false` for a non-critical package; the field is a per-package preference, not a repository invariant. Every work-package manifest carries it as `independence.prefer_cross_vendor_review: true`, and WP-0A-DB-00 carries beside it a `cross_vendor_exception` stating that every assigned run is Anthropic and that the exception "is not waived and it is not equivalent to cross-vendor review". Three evidence records repeat the sentence: `rfc-002-compliance-2026-09-08.md` § clause 3 ("a second reading, not a second opinion"), `parallel-integration-2026-09-07.md`, and every role file of 2026-09-13 in its §0.

## 3. Decision proposed

1. **`prefer_cross_vendor_review` becomes `false`** in `work-packages/WP-0A-DB-00.json`, and in every other manifest the Owner names — this RFC proposes DB-00 only, because that is the package the disposition was given on; the Register's clause is the Owner's to amend and `docs/**` is read-only to every package.
2. **`cross_vendor_exception` is replaced**, not deleted, by a sentence that records the withdrawal and cites the disposition: the history of the exception is part of why the signatures on #49–#113 are recorded as absent.
3. **Independence is restated as what remains**, which is all of `CONTRIBUTING_AGENTS.md` § Separation of duties: four distinct `agent_run_id`s in the four roles; no run approves, test-verifies, integrates or gate-approves its own work; conditional reviewers where the package requires them. A distinct same-vendor run in a named role **is** that role's signature.
4. **The §0 disclosure stays.** Every role file written since 2026-09-13 opens by stating that it is a subagent of the Author's run in the same vendor and model family, that the Author wrote its brief, and that a measurement against the tree stands on its own regardless. That paragraph is not about the vendor condition; it is about the spawning relationship, which the withdrawal does not change, and it is the only thing that lets a reader weigh a same-vendor signature. It becomes a requirement of the role files rather than a courtesy of them.
5. **What a same-vendor signature does not do**: it does not pass Gate G0's "external verification", which the Register defines outside any agent; it does not lift `RFC-2026-002`'s green-CI requirement; it does not make the Owner's manual merge automatic.

## 4. What was measured, for the record

The nine role runs of 2026-09-15 — the first fan-out under the withdrawn condition — found the same defect (batch 080's S8 shape) independently in all three batches; one measured it live on a PostgreSQL the Author's brief said the machine did not have (A1-081), and another corrected the brief on a tool's behaviour (C0-100: `npm run check:scope` does take arguments). Three of the nine judged the shape stop-the-line and six did not, and said why. That is the evidence this RFC has that a distinct run in the same family produces a second opinion and not only a second reading; it is one night's evidence and is offered as such.

## 5. What this costs

- The Register's clause and this package's field disagree until the Owner disposes this RFC. The disagreement is visible, dated, and cited in both directions.
- Every future role file carries the §0 disclosure by rule.
- The "external verification" G0 requires is unchanged and is not satisfied by anything an agent in this repository can do.
