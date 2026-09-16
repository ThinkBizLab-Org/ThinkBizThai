# Session record — 2026-09-16, sixth pass: batch 121 planned, approved in one sentence, built and reviewed

Author run: `/claude/a0_atlas` (Anthropic). Package: `WP-0A-DB-00`. Written at the close of the sixth
pass. This file is a STATE RECORD and approves nothing. It supersedes
[`session-2026-09-15-fifth-pass.md`](session-2026-09-15-fifth-pass.md) for STATE. The Product Owner's
words are transcribed verbatim in the disposition file named in §2 before they are read here.

**READ THIS FIRST** if you are the next Author run on this package.

## 1. Where things stand

| Measure | Value |
|---|---|
| `main` | **`2d75606`** = merge of [PR #153](https://github.com/ThinkBizLab-Org/ThinkBizThai/pull/153) (`0f3a08b` before) |
| Branch | `agent/claude/WP-0A-DB-00-batch-121`, 13 commits, merged and deleted on both sides |
| Pull request | [#153](https://github.com/ThinkBizLab-Org/ThinkBizThai/pull/153), **MERGED** |
| CI on the merged head | run `35057961176`, **success** on `0c86c7b` — every step, database and negative control included |
| `npm run verify` on the branch | **clean: exit 0 — tests 663, pass 663, fail 0, skipped 0, todo 0** (658 before) |
| Isolation cases | **965** (941 before: +24) |
| Migrations added | `121_publisher_metrics.sql` |
| `open_blockers` | **187** (175 before: +12, none closed) |
| Open Draft PRs for this package | one — #153 |

No force-push and no direct push to `main`; the merge is a merge commit.

**THE MERGE WAS THE PRODUCT OWNER'S INSTRUCTION AND WAS PERFORMED BY A0, AND THAT IS WRITTEN DOWN
RATHER THAN LEFT TO THE COMMIT AUTHOR FIELD.** A0 twice said it could not merge its own work, citing
`CONTRIBUTING_AGENTS.md` ("The Author never approves, test-verifies, integrates, or authorizes their
own work") and its own plan §10. The Owner then said `คุณ merge เลย`. A0 checked rather than assumed
before acting: PRs #149, #150, #151 and #152 were each authored AND merged through the same account
A0's `gh` is authenticated as, so the mechanical merge through the Owner's account under the Owner's
delegation is this repository's established practice and not a new thing.

WHAT THAT DOES AND DOES NOT CHANGE. A0 EXECUTED the Owner's decision; it did not MAKE it, and it did
not approve, review or test-verify its own work. The separation that carries the meaning held: three
independent role runs reviewed head `426c294`, two of C0's findings were graded stop-the-line and
were answered, and a green required CI run exists on the merged head. What is NOT satisfied is the
literal sentence of RFC-2026-002 that the Product Owner merges, and a reader should see that here
rather than infer it from a username.

## 2. What was decided, and on whose word

| What | Owner's word |
|---|---|
| Batch 121 over batch 091, and all thirteen questions taking A0's recommended option | `เอาตามคุณแนะนำ` |

That one sentence is the authority for the whole batch. It was put as thirteen lettered questions in
[`a0-batch-121-plan-2026-09-16.md`](a0-batch-121-plan-2026-09-16.md) §11, each with A0's
recommendation named as a recommendation, and it is read as taking the recommended option on every
one. The reading is transcribed question by question in
[`product-owner-disposition-2026-09-16-batch-121.md`](product-owner-disposition-2026-09-16-batch-121.md)
§3, so the mapping is checkable rather than plausible. It is the same form of answer the Owner gave
for batch 120 on 2026-09-15 and it is read the same way.

## 3. The shape of the batch, in three sentences

§8.3's "Publish delivery/post/metric INSERT" row has three nouns and batch 120 registered two of
them; this is the third and the last the publishing family has. One table, `app.performance_snapshots`,
`N` in every client column and `S` for the service, classified CARRIED in `service-policy-map.json`
beside the target, the job and the post — RFC-2026-022 §3 names `120` and `121` in ONE row, so the
cell is continued rather than re-argued, and no service policy is written because the decision is
approved and NOT IN EFFECT. The PROVIDER-3 payload sits INSIDE the client projection on purpose, so
what keeps a provider's sentence out is a shape rather than a projection — which is the whole of
what the role runs then attacked.

## 4. Things measured this pass that the records did not know

1. **The service cannot resolve the post whose metrics it would collect.** As `app_worker`,
   `app.published_posts`, `app.publish_targets` and `app.publish_intents` all return ZERO. RFC-2026-022
   §3 classifies this cell CARRIED because `published_post_id` is a PARAMETER — true of the statement,
   and silent about where the parameter comes from. There is no path in this database by which the
   service obtains one. This is the fifth pass's fan-out finding one table further down, and it now
   covers **every** statement of the publishing `S` cell: all four CARRIED classifications describe
   statements no service in this schema can form. New blocker.
2. **`app.published_posts` had no key to be a parent by.** No unique on
   `(workspace_id, business_profile_id, id)`, so the composite scope FK every other child in this
   schema carries could not be written. Reported to the Owner **before** the work as question H, not
   discovered during it. 121 adds the key as a forward fix in its own file.
3. **A page-pinned member is not excluded from their own business's rows.** The plan asserted the
   opposite; the live run returned 2 where the plan predicted 0. The narrowing's `CASE` tests
   `member_scope_admits_business` for an item with no page, so a single-Page scope is a scope
   *within* a business. The case was kept as the measurement and the plan's sentence corrected.
4. **§4.8 asks for two things that cannot both be had.** A "high-volume identity PK" and
   "partition-ready by month": a partitioned table requires the key to contain the partition column,
   and `primary key (id)` does not. Batch 150 must **rebuild** rather than alter. Blocker.
5. **A guard caught what review would not have.** The first id of the page-pinned case contained the
   word `business` and so matched batch 020's control pattern — this batch's own disjointness test
   found it, not a reviewer.

## 5. What the three role runs found, and what changed because of them

Three distinct runs, each in its own isolation worktree, each opening with the §0 disclosure
RFC-2026-024 made a rule. All reviewed head `426c294`. The corrections are `0c04008` and `df9d163`,
and the full table — acted on and recorded-but-not-acted-on — is
[`a0-batch-121-integration-2026-09-16.md`](a0-batch-121-integration-2026-09-16.md) §3.

| Run | Findings | Stop-the-line | Measured live |
|---|---|---|---|
| A1 `/claude/a1_bastion` | 2 MEDIUM, 3 LOW | no | yes, own cluster, 28 payload attacks |
| C0 `/claude/c0_contract_reviewer` | 2 HIGH, 3 MEDIUM | **yes, twice** | no, and its §0 says so |
| Q0 `/claude/q0_sentinel` | 1 HIGH, 1 MEDIUM-HIGH, 2 MEDIUM, 2 LOW | no | yes, 50 mutations over 58 runs |

The ones that changed the schema or the record:

- **C0 F1** — seven "recorded in the open blockers" claims were false at the head C0 read, two of them
  inside SQL comments that migration invariant 1 freezes after merge. **The third time in two batches
  a reviewer has caught this class.** The blockers now land in their own commit.
- **C0 F2** — the fixture asserted the opposite of the committed case and cited a case id that
  **exists nowhere**. A1 found the dangling id independently.
- **A1 F1** — the shape constraints discriminated on JSON *type*, not meaning, so a numeric external
  post id passed all four and A1 read it back as an ordinary client — while batch 120 withholds even
  the *hash* of one from the same role. Closed by a magnitude bound whose **number is A0's and not
  the Owner's**.
- **A1 F2** — the narrowing's own comment was false as measured, and invited deleting the only
  business-and-page-scope control the table has.
- **Q0 F1** — the apply-time block asserted the constraints *exist* and never what they *say*: widen
  the allowlist by one key and a Graph API error sentence inserts and is readable by every active
  member. "True of the code as written and false of the code as defended."
- **Q0 F2** — the table's own membership test could be replaced by `using (true)` with every layer
  green, because four parent tables answer first.

**Where the Author went past a finding:** Q0's remedy for its own drift case was to move the payload
probes into the fixture. A0 applied it, **then measured it, and it was not sufficient** — a probe
fires a fixed literal, so widening the allowlist with a key no probe sends left the suite green. The
key-set text assertion went into the fixture as well. The record says this rather than reporting the
recommendation as though following it had closed the hole.

## 6. What is owed, and to whom

**Owner, and this pass added three things that are genuinely yours:**
- **The magnitude threshold** on metric values is A0's `10^12`, chosen against A1's finding. A1
  declined to name a number, calling it a product decision.
- **A1's own disagreement with its brief.** Its mandate pre-declared a PROVIDER-3 value reaching
  `app` as HIGH and stop-the-line; A1 measured exactly that and graded MEDIUM on the evidence,
  writing the disagreement into its own file and saying the Owner may overrule. **The Author took no
  position** — an Author may not grade its own batch's severity. If you read §9.1's "external post
  ID" the stricter way, batch 121 was stop-the-line at `426c294`.
- **§3.3 versus §4.8.** §3.3 names `social_account_id` as required for metrics; §4.8's column list
  omits it. Not implemented, because it is a choice between two source documents and the tension was
  found after your answer.
- RFC-2026-023 (shape B) is still In review at your own request. The connector contract (`docs/**`,
  read-only to this package) still owes itself the ON DELETE sentence from blocker 161.

**A0, next:** batch 091 (calendar/schedules) is now the natural successor, and §6 assigns it to A5 —
so the first question for the next pass is whether A0 should write it at all. Blockers 138, 140 and
172 are its entry price. Batch 121 leaves **no debt of its own**.

**A0 Integration, separately:** Q0's D01h in general form — nothing re-runs any batch's apply-time
invariants after the full migration set, and every batch from 000 to 140 has this property. Batch 121
closed only its own case.

**S8:** unchanged on the pre-existing families. `app.performance_snapshots` is an `S`-cell table and
stays open by name, so the CARRIED policy RFC-2026-022 §7 will one day put beside its narrowing is not
pre-empted. No `123` closure file exists and a test asserts 122 has not been extended to cover it.

## 7. Housekeeping, including two things that went wrong

- **A role run's `initdb` landed in the shared scratchpad root** and replaced the Author's cluster
  data directory mid-session. Measurements were re-run on a rebuilt cluster in a private
  subdirectory. **The user's own server on port 5432 was never touched** — checked rather than
  assumed, still listening on the same pid afterwards. The next brief should say that the parent
  scratchpad directory is shared, not only that each run has its own port.
- **The secret scanner refused the tree twice**, both times correctly and neither time a secret: a
  regenerated digest of `scripts/test-suite-contract.mjs` contained a card-shaped digit run, and then
  the paragraph explaining that quoted the digits. The tree moved both times; the scanner was not
  changed to forgive either. **The digits remain in two commit messages in this branch's history**,
  which cannot be corrected without a history rewrite, and rewriting is forbidden. They are a sha256
  coincidence and not a payment instrument; recorded so that nobody later reads the history and
  believes a card number was committed.
- Scratch clusters: the Author's on `127.0.0.1:5499` stopped and removed; A1's on 5501 and Q0's on
  5503 stopped and removed by their own runs. The user's own server on port 5432 was checked
  afterwards and was reachable on the same pid.
- **This file was written before the merge and said "Nothing merged"**, which stopped being true the
  moment PR #153 landed. It is corrected by the increment that follows the merge rather than amended
  in place, because the handoff must be the last commit on a branch and amending after
  `refresh:handoff` breaks its citation. A read-this-first STATE record that is stale about `main` is
  the one kind of staleness that cannot be tolerated, so the correction is its own increment and not
  a line in the next batch's.
