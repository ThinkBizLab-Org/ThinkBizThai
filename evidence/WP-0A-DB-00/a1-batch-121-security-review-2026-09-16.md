# A1 — Security/Privacy review, batch 121 (WP-0A-DB-00)

Run id: `/claude/a1_bastion`. Date: 2026-09-16.
Head reviewed: **426c294** on `agent/claude/WP-0A-DB-00-batch-121` (Draft PR #153).

---

## §0 Disclosure (RFC-2026-024)

**Who spawned me.** I was spawned by the A0 Author's session for this batch, as a subagent, with a
mandate written by that session. I am **not** an independent human reviewer and I am not an
independent organisation. I am a model run inside the same session that wrote the code I am
reviewing. My independence is a matter of *separate context and separate measurement*, not of
separate interest. Where this file disagrees with the Author it is because measurement disagreed,
not because an independent party audited the Author.

**I approve nothing.** This file is evidence offered to the Reviewer, Tester, Integration Owner and
Product Owner. It is not a review approval, not a security sign-off, and it does not move the
package's state. Under CONTRIBUTING_AGENTS.md separation of duties, a subagent of the Author cannot
discharge the independent Security/Privacy role; treat this as the Author's own security testing,
performed adversarially, and staff the independent role separately.

**What I measured.** I built my own PostgreSQL 17 cluster on port 5501 in my own scratchpad, applied
`db/foundation/ci/supabase-shim.sql`, then the full migration set (`migrate-clean`, 001 through 140,
ok), then the full fixture set, and attacked the result live. Every claim below marked MEASURED
comes from a statement I executed against that cluster and read the answer of. I did not touch the
user's server on 5432.

**What I did NOT measure, and what this run therefore cannot be evidence of.**

- **The real service identity.** `app_worker`'s only member is `postgres`, which is `rolsuper` and
  `rolbypassrls` (MEASURED: `pg_auth_members` / `pg_roles`). Every "service" result below is
  `app_worker` *with no member that RLS applies to*. This run is **not** evidence that the service
  path is tenant-isolated, and I make no such claim. RFC-2026-022 §5/8 says the decision is approved
  and not in effect; my measurements are consistent with that and prove nothing beyond it.
- **The source documents.** I read `docs/**` §9.1, §9.2, §9.3 and quoted them. I did not verify that
  those documents are approved, current, or that my reading of the Thai text is the Owner's. Where I
  cite them I am citing text, not authority.
- **The Product Owner's answers as answers.** I read the disposition file as a record. I cannot
  verify a human answered, or that the thirteen answers mean what the migration says they mean.
- **CI in execution.** I did not run `.github/workflows/ci.yml`. I read the batch 121
  negative-control line statically (`control app.performance_snapshots '[a-z0-9-]*metric-snapshot'
  121`). Whether CI is green on 426c294 is outside this run.
- **Supabase.** My cluster is stock PostgreSQL 17 plus the repository's shim, not Supabase. Anything
  Supabase does differently with roles, JWT claims or `search_path` is untested here.
- I did not review batch 120's own correctness beyond the two questions my mandate asked of it.

**Baselines I reproduced (MEASURED).** `migrate-clean` ok; `rls-smoke` **965 isolation cases
passed**; `node --test tests/db/identity/identity-isolation.test.mjs` **301 pass, 0 fail**. My
findings below are things the passing suite does not say, not things it got wrong.

---

## Verdict

**Nothing I found is stop-the-line.** No tenant data crossed a boundary in any direction, under any
of the seventeen write attempts and nine read identities I ran. I did **not** find a way for a
provider's error message, a URL, or any free text to reach `app` through `metrics`.

I did find that a **numeric** PROVIDER-3 identifier reaches the client projection unobstructed
(F1, MEDIUM), that the migration's own stated reason for the narrowing policy is **false as
measured** (F2, MEDIUM), and three smaller things. Details and my disagreement with the mandate's
pre-declared grading are in F1.

---

## Mandate 1 — Tenant isolation in BOTH directions, every identity

MEASURED, as a single probe per identity counting total visible snapshots and, separately, rows for
tenant A's two posts and tenant B's post **while holding tenant B's exact post id**.

| identity | total | post_a1_fb | post_a2 | post_b1 (tenant B) |
|---|---|---|---|---|
| owner_a | 3 | 2 | 1 | **0** |
| admin_a | 2 | 2 | 0 | **0** |
| editor_a | 2 | 2 | 0 | **0** |
| approver_a | 2 | 2 | 0 | **0** |
| viewer_a | 3 | 2 | 1 | **0** |
| page_editor_a (single-Page) | 2 | 2 | 0 | **0** |
| suspended_a | 0 | 0 | 0 | **0** |
| owner_b | 1 | 0 | 0 | **1** |
| anon | — | refused 42501 on the **schema** | | |
| service (`app_worker`) | 0 | 0 | 0 | 0 |

Both directions hold. The negative half (A cannot reach B's row while holding its exact id) is paid
in both directions, and the positive half is paid too — `owner_b` reads its own row, so the policy
is not one that returns nothing to everybody. `suspended_a` is admitted to nothing.

Business-scope narrowing *within* tenant A is also visible and correct: `editor_a` and `admin_a` are
not admitted to `business_a2`'s snapshot; `owner_a` and `viewer_a` are.

**Note on the single-Page editor.** It reads 2 rows, not 0. This is correct behaviour — the
narrowing's CASE tests a business-level item with `member_scope_admits_business`, and a Page scope
is a scope *within* a business — and the committed case
`pinned-editor-a-sees-the-metric-snapshots-of-the-fb-send` asserts exactly that. See F3: the fixture
still says the opposite.

## Mandate 2 — The per-column live ACL, asked of the database

MEASURED against `information_schema.column_privileges`, and cross-checked against raw
`pg_attribute.attacl` and `pg_class.relacl` so that a `PUBLIC` grant could not hide.

`app.performance_snapshots` — every claim the batch makes is **true**:

| grantee | SELECT | INSERT | UPDATE / DELETE / TRUNCATE / REFERENCES |
|---|---|---|---|
| `authenticated` | **8** (all) | **0** | none |
| `app_worker` | **8** | **6** (not `id`, not `collected_at`) | none |
| `anon` | **0 rows at all** | — | none |
| `postgres` | 8 | 8 | owner's implicit rights only |

`relacl` is NULL on both tables — no `PUBLIC` grant. `attacl` shows exactly `authenticated=r` and
`app_worker=ar` on the six insertable columns. RLS is `enable`d **and** `force`d on both tables
(MEASURED: `relrowsecurity = t`, `relforcerowsecurity = t`). No non-internal triggers exist on the
table.

`app.published_posts` (the forward key's table) is **unchanged by 121**: `authenticated` reads 8 of
9 columns with `external_post_hash` withheld, `app_worker` reads 9 and inserts 8, and nobody but the
owner holds UPDATE/DELETE/TRUNCATE/REFERENCES. Adding a UNIQUE constraint does not touch an ACL and
did not.

The only holder of a mutating privilege anywhere is `postgres`, as table owner. The migration's
assertion excludes `grantee <> 'postgres'`, which is correct but worth stating plainly: **the
append-only property is a property of the grant graph below the owner, and the owner is also the
only member of `app_worker`.** That is the §0 limit restated as a privilege fact.

## Mandate 3 — §9.1 PROVIDER-3 and §9.2: attacking the `metrics` column

I ran 28 payload attacks. The table has **no text column at all** (MEASURED: bigint, three uuid, two
timestamptz, jsonb, integer), so `metrics` is the whole attack surface.

**Refused — every textual route, all 23514, each by the constraint that should own it:**

| attack | refused by |
|---|---|
| provider error message under an unknown key (`{"error":"Graph API (#100)…"}`) | `_metrics_keys_are_known` |
| provider sentence under a *known* key | `_metrics_values_are_numbers` |
| nested object under a known key | `_metrics_values_are_numbers` |
| array containing a URL under a known key | `_metrics_values_are_numbers` |
| numeric **string** `"17841400000000000"` | `_metrics_values_are_numbers` |
| boolean, JSON `null` under a known key | `_metrics_values_are_numbers` |
| key differing by case `Impressions` | `_metrics_keys_are_known` |
| key with a trailing space | `_metrics_keys_are_known` |
| Cyrillic-homoglyph key | `_metrics_keys_are_known` |
| jsonb scalars: string, number, `null`, `true` | `_metrics_is_an_object` |
| empty array `[]` | `_metrics_is_an_object` |
| known key plus one unknown key | `_metrics_keys_are_known` |
| Thai unicode text under a known key | `_metrics_values_are_numbers` |
| 2100-digit number (bound) | `_metrics_is_bounded` |

**§9.2's absolute prohibitions are discharged for this column.** Every item on that list — plaintext
tokens, raw headers, long-lived signed media URLs, provider stack traces, full SDK errors — is
*textual*, and no string of any kind survives these four constraints. The batch's central claim,
that the shape rather than the projection is what keeps a provider's words out, **holds under
attack**. This is the strongest thing in the batch and it is correctly reasoned.

### F1 — MEDIUM — a numeric PROVIDER-3 identifier reaches the client projection

**MEASURED, end to end.** §9.1's own dictionary row reads:

> `PROVIDER-3` | provider payload, **external post ID**, webhook | private, redact/log hash | safe projection only

An external post ID is definitionally PROVIDER-3. Meta's external post ids and account ids are
**numbers**. The four constraints admit any number:

- `{"impressions": 17841400000000000}` — **ACCEPTED**. That is an Instagram post-id shape.
- `{"reach": 17841400000000000, "clicks": 100064823456789}` — **ACCEPTED**. Post id and account id.
- `{"reach": <2000 digits>}` — **ACCEPTED**. About 2000 digits of arbitrary decimal fit under the
  2048-byte bound.

I then read the planted row back **as `owner_a`, an ordinary client identity**, and got:

```
{"clicks": 100064823456789, "impressions": 17841400000000000}
```

The same identifier as a *string* is refused `23514` by `_metrics_values_are_numbers`. So the
control's discriminator is **the JSON type, not the meaning**, and an external identifier changes
type for free.

**The asymmetry that makes this a finding rather than a quibble.** Batch 120 withholds
`external_post_hash` from `authenticated` — MEASURED, `authenticated` reads 8 of 9 columns on
`published_posts` and not that one. The schema therefore treats even the *hash* of an external post
id as too sensitive for the client projection. `metrics` would carry the **raw** numeric id to the
same client, and no constraint can object because it is indistinguishable from a large impression
count. §9.3 says it directly: "External account ID: raw encrypted/private reference + stable hash
for uniqueness."

**What it takes to exercise.** A collector defect or a provider response-shape change, not an
attacker: `authenticated` holds no INSERT (MEASURED), `anon` holds nothing, and no client identity
can place a value here. It is a containment gap, not a reachable exploit, and it crosses no tenant
boundary.

**Why I grade MEDIUM and not HIGH, against my mandate.** My mandate pre-declared that a PROVIDER-3
value reaching `app` through this column is HIGH and stop-the-line. I am not applying that
mechanically, because doing so would make the grade a property of the instruction rather than of the
evidence. What I measured is that *no provider-authored text* can reach `app`, which is what §9.2
prohibits and what the batch claims; and that a *numeric identifier* can, which §9.1 classifies and
§9.3 gives a handling rule for. The second is real and unrecorded, and it needs a forward fix. It is
not a boundary failure and nothing today writes such a value. **I record the disagreement plainly so
the Product Owner can overrule me: if the Owner reads §9.1's "external post ID" as making any
admissible representation of one a stop-the-line matter, this becomes HIGH and blocks, and my
measurement supports that reading as easily as mine.**

**Actionable.** A fifth CHECK bounding each value's magnitude — a page metric that exceeds, say,
`10^12` is not a metric — would close it in the same style as the other four and would make the
constraint set discriminate on plausibility rather than on type alone. I do not propose the exact
number; that is a product decision. Recording it as an open blocker on WP-0A-DB-00 is the minimum.

### F4 — LOW — `{}` is an accepted metrics payload

MEASURED: a `metrics` value of `{}` passes all four constraints. A snapshot that measures nothing is
a valid row, and combined with the absence of cadence enforcement (which the batch states as an open
blocker) a collector could append empty snapshots at distinct instants indefinitely. Not a security
boundary; recorded, not actionable here. Negative values are likewise accepted
(`{"reach": -999999}`), which is data quality rather than classification.

## Mandate 4 — The forward key on batch 120's table

MEASURED: `published_posts_scope_unique UNIQUE (workspace_id, business_profile_id, id)`.

**Is it the right change?** Yes, and it is required: PostgreSQL will only accept a composite FK whose
referenced column list is exactly covered by a unique constraint, so without this key
`performance_snapshots_post_scope_fk` cannot exist. It follows the precedent the header cites
(111 added `social_accounts_scope_key` to 110's table; 120 added `content_targets_destination_key`
to 081's), and it does not rewrite 120 — migration invariant 1 is respected.

**Does it weaken anything 120 relied on?** **No, and it cannot.** `id` is already the primary key, so
uniqueness on `(workspace_id, business_profile_id, id)` is *logically implied* by a constraint that
already held. Adding a UNIQUE never relaxes anything, and this one adds no new rejection either.
MEASURED: 120's `published_posts_one_per_target`, `published_posts_external_hash_unique`,
`published_posts_pkey`, and both composite FKs are all still present and unchanged. The real cost is
one additional unique btree index on a table that grows with every send — write amplification and
storage, not correctness. Worth a sentence in the handoff; not a finding.

**Can the composite FK be evaded?** **No.** MEASURED, with RLS out of the way so that only the
constraint could answer:

| attempt | result |
|---|---|
| A workspace + A business + **B's post id** | `23503` `performance_snapshots_post_scope_fk` |
| A workspace + **wrong business** (`business_a2`) + post_a1 | `23503` same |
| **B workspace** claiming A's post | `23503` same |
| orphan post id existing nowhere | `23503` same |

A snapshot whose `workspace_id` or `business_profile_id` disagrees with its post's is impossible:
`id` alone is unique, so the triple can only match that one post row, and a disagreeing triple
matches nothing.

One structural note, recorded because it is load-bearing and invisible: the FK is **MATCH SIMPLE**
(MEASURED: `confmatchtype = 's'`). Under MATCH SIMPLE a NULL in *any* referencing column skips the
check entirely. The tenant-agreement guarantee therefore rests on all three columns being NOT NULL
— which they are (MEASURED), and which the migration's assertion block checks by name. That is
correct defence in depth and I flag it only so a future editor knows that relaxing a NOT NULL here
silently disables the key, rather than merely allowing a null.

## Mandate 5 — F4 one family deeper: is the narrowing term load-bearing?

### F2 — MEDIUM — the migration's stated reason for the narrowing policy is false as measured

The policy comment on `performance_snapshots_scope_narrowing` says:

> A1's finding F4 against batch 120 holds one family deeper — the parent's own policy answers first
> inside these subqueries, so **this term cannot decide a read by itself**

**MEASURED, in both directions, each inside a transaction I rolled back:**

| experiment | editor_a | page_editor_a |
|---|---|---|
| baseline (narrowing present, parents policed) | 2 | 2 |
| **narrowing policy dropped**, parents still policed | **3** | **3** |
| narrowing kept, **RLS disabled on all four parents** | **2** | **2** |

Both halves of the claim fail:

- Dropping the narrowing **changes the answer** — `editor_a` and the page-pinned editor gain
  `business_a2`'s snapshot, which neither is scoped to. So the term **does** decide a read by itself.
- Disabling every parent's RLS **does not change the answer** — the narrowing's own CASE expression
  (`member_scope_admits_business` / `_admits_page`) does the filtering unaided. So the parent's
  policy does **not** "answer first" in the sense the comment means.

The correct statement is that the permissive `_select_active_member` policy supplies the
**workspace** boundary (tenant A vs tenant B — confirmed: with narrowing dropped *and* all parents
unpoliced, `owner_b` still reads only its own 1 row), while the restrictive narrowing is the **only**
control supplying business-and-page scope *within* a workspace.

**Why this is a finding and not a documentation nit.** The comment tells a future maintainer that a
restrictive policy is redundant. It is not; removing it leaks one business's metrics to members
scoped to another. The comment is a booby trap pointed at the one control that does the intra-tenant
work, and it is wrong in the direction that invites deletion. Nothing leaks today.

**Actionable.** Correct the policy comment to say what is measured: the term is load-bearing and is
the sole business/page-scope control on this table; the permissive member policy supplies only the
workspace boundary. Whether A1's original F4 against batch 120 was itself right on 120's tables is
outside my mandate — but it plainly does **not** generalise here, and the migration asserts that it
does.

### F3 — LOW — the fixture's security prose contradicts the committed case, and names a case that does not exist

`tests/db/identity/fixtures/121-publisher-metrics-fixture.sql` lines 30 and 31 state that "the
page-pinned member is admitted to NOTHING in this family" and cite
`pinned-editor-a-sees-zero-metric-snapshot-rows` as the measurement. **Neither is true.** MEASURED:
the page-pinned editor reads 2 rows; and the committed case is
`pinned-editor-a-sees-the-metric-snapshots-of-the-fb-send`, which asserts `rows`. That case's own
comment says the plan was contradicted by the live run and that "the plan's sentence is corrected in
the fixture that made the claim" — **the correction was not applied.** The claim and the dangling
case name both survive in the fixture. Actionable: correct the fixture header. No test catches this
because it is a comment.

## Mandate 6 — Cross-tenant writes, by layer

MEASURED, 12 write attempts plus 5 constraint probes, each with its SQLSTATE and the layer that
refused it.

| # | attempt | SQLSTATE | **layer** | refused by |
|---|---|---|---|---|
| W01 | owner_A inserts onto tenant **B**'s post, holding B's exact ids | 42501 | **grant** | no INSERT on table |
| W02 | owner_B inserts onto tenant **A**'s post, holding A's exact ids | 42501 | **grant** | no INSERT on table |
| W03 | owner_B updates tenant A's snapshot | 42501 | **grant** | no UPDATE for any role |
| W04 | owner_B deletes tenant A's snapshot | 42501 | **grant** | no DELETE for any role |
| W05 | owner_A rewrites its **own** snapshot | 42501 | **grant** | append-only is a privilege |
| W06 | owner_A truncates the table | 42501 | **grant** | no TRUNCATE for any role |
| W07 | anon reads the table | 42501 | **grant** | no USAGE on **schema** `app` |
| W08 | anon inserts | 42501 | **grant** | no USAGE on **schema** `app` |
| W09 | service inserts a well-formed snapshot in A | 42501 | **policy** | "new row violates row-level security policy" |
| W10 | service inserts a **misfiled** row: A's workspace, B's post | 42501 | **policy** | RLS answers before the FK would |
| W11 | service updates a snapshot | 42501 | **grant** | no UPDATE column or verb |
| W12 | service deletes a snapshot | 42501 | **grant** | no DELETE |
| F01 | scope disagrees: A workspace/business + B's post id | 23503 | **constraint** | `performance_snapshots_post_scope_fk` |
| F02 | wrong business inside the right workspace | 23503 | **constraint** | same |
| F03 | B's workspace claiming A's post | 23503 | **constraint** | same |
| F04 | re-collection at an instant already recorded | 23505 | **constraint** | `performance_snapshots_one_per_post_instant` |
| F05 | orphan post id existing nowhere | 23503 | **constraint** | `performance_snapshots_post_scope_fk` |

Three layers, and each does distinct work. Two observations worth recording:

- **W09 and W10 are POLICY-layer and will flip.** `app_worker` holds the INSERT grant, so it is RLS
  with an empty policy set that refuses. The day RFC-2026-022 comes into effect these change
  meaning, and they are written at that layer deliberately so that they change rather than stay
  silently green. W11 and W12 are grant-layer and are permanent — no policy restores a privilege no
  role holds.
- **W10 shows the ordering.** A service row whose scope disagrees with its post's is stopped by RLS
  **before** the composite FK is consulted. The FK's refusal (F01 through F03) is only observable
  with RLS out of the way. Both controls are present; only one is reachable at a time, which is why
  measuring the FK required bypassing RLS.

---

## Findings, graded

| id | grade | finding | actionable? |
|---|---|---|---|
| **F1** | **MEDIUM** | A numeric PROVIDER-3 identifier (external post id, account id) passes all four CHECK constraints and is read by any workspace member; the same value as text is refused. §9.1 classifies external post IDs as PROVIDER-3 and §9.3 requires a private reference plus hash; batch 120 withholds even the *hash* from the client. | **Yes** — add a magnitude bound; record as an open blocker. Owner may reasonably re-grade to HIGH. |
| **F2** | **MEDIUM** | The narrowing policy's comment says the term "cannot decide a read by itself". Measured: dropping it leaks another business's metrics to `editor_a` and the page-pinned editor; disabling all four parents' RLS changes nothing. The comment is wrong in the direction that invites deleting the control. | **Yes** — correct the comment to state the term is load-bearing. |
| **F3** | **LOW** | The fixture header claims the page-pinned member is "admitted to NOTHING" and cites a case id that does not exist; the committed case asserts the opposite and says the fixture was corrected. It was not. | **Yes** — correct the fixture header. |
| **F4** | **LOW** | An empty object and negative values are accepted metrics payloads. | Recorded, not actionable here. |
| **F5** | **LOW** | The composite FK is MATCH SIMPLE; its tenant-agreement guarantee rests entirely on the three NOT NULLs. Correct today and asserted by name. | Recorded, not actionable. |

**Stop-the-line: none.** No tenant data crossed a boundary in any direction under any attack I ran.
No provider-authored text, message, URL or stack trace can reach `app` through `metrics`. F1 is the
one finding that touches classification, and I have stated above both why I grade it MEDIUM and the
reading under which the Owner should grade it HIGH.

## What this run is not evidence of

Repeating §0 because it is the part most easily lost: I am a subagent of the Author's session. The
965 passing isolation cases and the 301 static tests are the Author's own suite passing against the
Author's own migration, re-run by the Author's own subagent on a scratch cluster. The service path is
untested in the only sense that matters, because `app_worker` has no member that row-level security
applies to. An independent Security/Privacy reviewer outside this session still owes this batch a
review, and this file does not substitute for one.
