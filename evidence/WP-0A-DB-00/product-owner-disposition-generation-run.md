# Product Owner disposition — `generation_run_id` points at a table no batch owns

**Recorded:** 2026-09-10
**Authority:** Product Owner
**Subject:** the two `generation_run_id` columns §4.6 gives batch 080 —
`content_versions.generation_run_id` and `quality_reviews.generation_run_id` — and the fact that
`app.generation_runs` exists nowhere and is assigned to nobody.
**Evidence origin:** Owner statement in the ThinkBizThai project conversation, transcribed here as
the repository evidence record.

## The question, and why it needed an owner

§4.6 of the data workstream gives `content_versions` and `quality_reviews` a `generation_run_id`
each. The table those columns name does not exist, and it is not merely unbuilt — it is
**unassigned**. Batch 060 says so in its own header, at `db/foundation/migrations/060_ai_gateway.sql`:

> `GENERATION RUNS ARE NOT CREATED HERE. §6's registry gives batch 060 "model/policy/credential
> reference" and stops there; no batch in the whole 000-180 registry is given a generation-run
> table, and 061 … is "quota/reservation/usage ledger", which is metering rather than run history.`

and it cites the precedent it is following:

> `Batch 021 refused to create workspace_member_scope_versions because "creating one would be
> reserving a table no registry row gives this batch"; this is the same refusal, and the gap is in
> the REGISTRY rather than in this file.`

Verified at `2e18f75`: no migration in `db/foundation/migrations/` mentions `generation_run` at all.

This differs from batch 070's `research_suggestion_id`, whose target exists. A column pointing at a
table nobody owns is a scope question — whether batch 080 may reserve, reference, or refuse a table
outside its registry row — and an agent must not settle its own scope.

## Three options were put

| | option | what it costs |
|---|---|---|
| **ก** | keep the column as a reference with **no foreign key** | referential integrity is unenforced until a command function exists; batch 131 set this precedent for a reference whose target was absent |
| ข | refuse the column and record the gap | `source = 'generated'` becomes unattributable; a later batch must add the column to an immutable table |
| ค | amend the registry to give `generation_runs` an owner first | blocks 080 on an A0 registry change and an RFC |

## Disposition

> 080 เอาข้อ ก

**Option ก.** Batch 080 keeps both `generation_run_id` columns as references carrying no foreign
key.

## What this settles

Batch 080 may write `generation_run_id` on `content_versions` and on `quality_reviews` as a
reference column with no `references` clause, and does not reserve `app.generation_runs`.

## What it does not settle, and each is owed to somebody

- **The registry gap stays open.** `generation_runs` still has no owner in 000–180. This disposition
  lets 080 reference it; it does not assign it, and batch 060's blocker on the subject stands.
- **Nothing enforces the reference.** Without a foreign key, a `generation_run_id` may name a run
  that never existed. The write path that would enforce it is a `SECURITY DEFINER` command function,
  and `RFC-2026-021` §10 records that none exists — the same absence batch 070's `used_at` rests on,
  which was accepted at G0 on 2026-09-10 under
  `evidence/WP-0A-DB-00/product-owner-disposition-batch-070.md`.
- **The column's type and nullability are not decided here.** Whether it is `uuid` and whether it
  may be null on a manual version are batch 080's to decide and to argue in its own diff.
- **`content_versions` is immutable**, so a column added now cannot be tightened later without a
  forward migration. That is a cost of ก over ข and it is accepted rather than unnoticed.

## Explicit limits

This disposition does **not**:

- pass Gate G0, which remains Specification Baseline Complete / External Verification Pending;
- authorise batch 080 to be written, merged, or declared ready — it answers one question the batch
  would otherwise have to escalate;
- permit batch 080 to create `app.generation_runs`, or any other table outside §6's registry row
  for it;
- extend to any other column whose target is absent. It is a disposition on these two columns;
- substitute for the independent Reviewer, Tester, Security or Integration Owner evidence
  `RFC-2026-002` requires, or fill `role_assignments.product_reviewer_agent_run_id`, which wants an
  independent Product/UX agent run.

## Recorded for batch 080's author, so it is not rediscovered

Three further facts were established while preparing this, at `2e18f75`:

- **§8.2 gives content no `S` cell.** The three content rows are `Content SELECT` (Y for all five
  client roles, `P` for service), `Content create/edit/version` (Y owner/admin/editor, N
  approver/viewer, `P` service) and `Approved/published version UPDATE/DELETE` (**N for every
  column including service**). So batch 080 classifies nothing in
  `db/foundation/lint/service-policy-map.json`, as batch 132 also did, and the third row is a
  harder immutability statement than anything in the research family.
- **`content_targets.social_account_id` is batch 081's**, not 080's — the registry gives 081 "content
  target placeholder/reference contract … deferred Social FK prepared".
- **`content_items.status` carries the same half-implemented shape batch 070 hit.** §4.6 says "state
  change ผ่าน domain command; ห้าม client update status อิสระ" while §8.2 marks
  `Content create/edit/version` `Y` for the editor. That is the tension already dispositioned for
  "Start/cancel Research" on 2026-09-10, and batch 080 should cite that disposition rather than
  re-ask it.
