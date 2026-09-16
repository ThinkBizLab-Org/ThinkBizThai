# Session record — 2026-09-15, fifth pass: batch 120 planned, approved in one sentence, built and merged

Author run: `/claude/a0_atlas` (Anthropic). Package: `WP-0A-DB-00`. Written at the close of the fifth
pass of 2026-09-15 and committed on 2026-09-16. This file is a STATE RECORD and approves nothing. It
supersedes [`session-2026-09-15-fourth-pass.md`](session-2026-09-15-fourth-pass.md) for STATE. The
Product Owner's words are transcribed verbatim in the disposition file named in §2 before they are
read here.

## 1. Where `main` is

| Measure | Value |
|---|---|
| `main` | **`b61c634`** = merge of [PR #151](https://github.com/ThinkBizLab-Org/ThinkBizThai/pull/151) |
| `npm run verify` on `main` | **clean: exit 0 — tests 658, pass 658, fail 0, skipped 0, todo 0** (647 before) |
| Isolation cases | **941** (857 before: +84) |
| Migrations added | `120_publisher.sql`, `122_publisher_service_path_closed.sql` |
| CI on the merged head | run `34959292661`, **success** on `723c340` |
| Open Draft PRs for this package | none |
| `open_blockers` | **175** (164 before: +11, none closed) |

No force-push, no direct push to `main`, and every merge a merge commit.

## 2. What merged, and on whose word

| PR | What | Owner's word |
|---|---|---|
| [#151](https://github.com/ThinkBizLab-Org/ThinkBizThai/pull/151) | batch 120 (publisher.meta, five tables) + 122 (the closure), three role runs, the plan and the disposition | `ไล่ทำทุกอย่างตามที่คุณแนะนำเลยได้ไหม` |

That one sentence is the authority for the whole batch. It was put as fourteen lettered questions in
[`a0-batch-120-plan-2026-09-15.md`](a0-batch-120-plan-2026-09-15.md) §11, each with A0's recommendation
named as a recommendation, and it is read as taking the recommended option on every one. The reading is
transcribed and enumerated in
[`product-owner-disposition-2026-09-15-batch-120.md`](product-owner-disposition-2026-09-15-batch-120.md)
§3, question by question, so the mapping is checkable rather than plausible.

## 3. The shape of the batch, in three sentences

§8.3 gives `publisher.meta` two rows and they do not fall one per table: the INTENT is `Y` for the
owner and the admin and `P` for the editor with no capability defined anywhere, and everything below it
— the delivery, the post, the metric — is `N` in every client column and `S` for the service. So one
table of five is client-writable and the person who asked for a publication may not write the delivery
record for it. The `S` cell is CLASSIFIED AND NOT ENFORCED, because RFC-2026-022 is approved and NOT IN
EFFECT: three CARRIED rows in `service-policy-map.json`, `app_worker` holding grants and no policy, and
four service INSERT cases refused at the POLICY layer that flip when the negative control disables row
level security.

## 4. Things measured this pass that the records did not know

1. **The service cannot compose the fan-out §8.3 marks `S` for it.** `app_worker` is refused
   `app.content_targets` and `app.content_variants` outright, and a send copies an aim and a variant
   from both. The server must resolve the two ids before the statement is formed — which is exactly
   what RFC-2026-022 §3 calls CARRIED, and is why four cases hold those ids as PARAMETERS rather than
   resolving them by subselect. New blocker.
2. **An apply-time guard failed for the wrong reason, and only a live apply could say so.** The
   narrowing loop selected every RESTRICTIVE policy on a publisher table, which includes the two
   `FOR INSERT` policies that have no `USING` half. It reported "the publish_intents narrowing does not
   resolve through the intent's item" against a policy that is not the narrowing.
3. **A fixture row added to another batch's table can steal a pair that batch's own cases need.** Every
   free (item, destination) pair in workspace A is already the subject of one of batch 081's insert
   cases, whose `why` says the pair is one no fixture row holds SO THAT the insert lands with row level
   security off. Adding a seventh aim turned two of them `23505`. Batch 120 fixes 081's six ids instead.
4. **The author handoff's NARRATIVE fields go stale silently.** `refresh-author-handoff.mjs` regenerates
   the mechanical fields only; the narrative is the Author's. C0 found every one of them still describing
   the fourth pass and graded it stop-the-line — see §5.
5. **Amending a commit after refreshing the handoff breaks the citation** and the script refuses to
   guess ("on no path to this branch"). Recovery is to reset the cited head to the branch point and
   re-run; the discipline is a substantive commit first and a handoff-only commit last.

## 5. What the three role runs found, and what changed because of them

Three distinct runs, each in its own isolation worktree, each opening with the §0 disclosure
RFC-2026-024 made a rule. All reviewed head `bd732a0`. The corrections are `42244d6` and `99e05e0`,
and the full table of findings — acted on and recorded-but-not-acted-on — is
[`a0-batch-120-integration-2026-09-15.md`](a0-batch-120-integration-2026-09-15.md) §6A.

| Run | Findings | Stop-the-line | Measured live |
|---|---|---|---|
| C0 `/claude/c0_contract_reviewer` | 1 HIGH, 7 MEDIUM, 5 LOW | **yes** | no, and its §0 says so |
| A1 `/claude/a1_bastion` | 1 MEDIUM, 4 LOW | no | yes, own cluster |
| Q0 `/claude/q0_sentinel` | 1 HIGH, 1 MEDIUM, 1 LOW | no | yes, 25 mutations |

The three that changed the schema or the record:

- **C0 H1** — the handoff (§4/4 above). Rewritten.
- **A1 F1** — `publish_targets.failure_class` was the only PROVIDER-3 column inside the client SELECT
  with neither a bound nor a shape, so §9.2's "never a provider's message" was a comment ON the column
  rather than a control OVER it. Now a code shape, with an apply-time probe that writes a provider
  sentence with a post id in it and is refused `23514` by name.
- **Q0 F3** — `publish_jobs_provider_request_key_unique`, the key that stops one provider request key
  standing for two sends, could be dropped with every layer green. Eleven uniqueness rules and
  thirty-four NOT NULL columns are now asserted against the live catalog; Q0's own mutations are caught
  by name.

**Two reviewers independently found the same class of defect**: the migration header named blockers
that did not exist. Both are now entries.

## 6. What is owed, and to whom

**Owner:** RFC-2026-023 (shape B) is still In review at the Owner's own request ("รอ + ขอรายละเอียดเพิ่มเติม",
2026-09-15). Nothing blocks on it until a batch needs a command function. The connector contract
(`docs/**`, read-only to this package) still owes itself the ON DELETE sentence from blocker 161's
disposition.

**A0, next:** batch 121 (metric snapshots) is the other half of the same §8.3 `S` cell and is the
natural successor; batch 091 (calendar/schedules) is the alternative and owes the schedule row that
`request_kind = 'scheduled'` implies. Either one repoints `ownership.branch`, which this record's own
branch holds.

**S8:** unchanged by this pass on the pre-existing families. Batch 122 closes the two publisher tables
that are not `S` cells; the three that are stay open by name, so the CARRIED policy RFC-2026-022 §7 will
one day put beside their narrowings is not pre-empted.

**Nothing from five passes is unpaid by A0.**

## 7. Housekeeping

Scratch clusters stopped and removed — the Author's on `127.0.0.1:5499` and the one an interrupted role
run left listening on `5503`. The user's own server on port 5432 was never touched. Role worktrees
pruned; the merged branch deleted on both sides; memory file current.
