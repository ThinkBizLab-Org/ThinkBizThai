# A1 Security/Privacy review — batch 100 (`asset.core`), Draft PR #118, NOT merged

Run: `/claude/a1_bastion_100`
Role: independent Security/Privacy reviewer for batch 100, one of the nine role runs Product Owner
decision Q6 of `evidence/WP-0A-DB-00/product-owner-disposition-2026-09-15-six-questions.md`
authorises before batches 081/090/100 merge. Named role in `work-packages/WP-0A-DB-00.json`
`role_assignments.security_reviewer_agent_run_id` is `/claude/a1_bastion`; this is a distinct run
in that role, which Q1 of the same disposition now counts as the role's signature (the cross-vendor
condition withdrawn, role separation not).
Subject: `origin/agent/claude/WP-0A-DB-00-batch-100`, tip `131de6f`, eleven commits on base
`c5eb1b9` (`git merge-base main origin/agent/claude/WP-0A-DB-00-batch-100`). Read from the
remote-tracking ref with `git show` and `git diff main...`; never checked out.
Base of this review: `main` = `0dc640f` (merge of PR #128, batch 082).
Date: 2026-09-15.

**This document records findings. It advances no package status, signs nothing on any author's
behalf, writes `security_approved` nowhere, and repairs nothing it found.** One file is added by
this branch and nothing else changes: no migration, test, case, manifest, handoff or status field.

---

## 0. What I am, before anything else

**I am a subagent spawned by `/claude/a0_atlas`, the Author named in the manifest for the package
this batch belongs to, and I run in the same vendor and model family (Anthropic, Claude).** A0
wrote the two briefs I was handed, chose the subject, chose the base, and told me which question
to press hardest on — whether this batch has the same shape as finding S8 on batch 080, the one
batch 082 on `main` was written to close. A0 also chose the precedents I was told to match.

The batch itself is signed `/claude/a4_asset`, "authoring for the run the manifest names as
Author, `/claude/a0_atlas`" (`evidence/WP-0A-DB-00/a4-batch-100-probes-2026-09-13.md:3-4`). So
the Author of the subject and the coordinator of this review are the same run, and I am its
sibling.

What that does **not** weaken:

- Everything below that is a *measurement against the tree* stands on its own. Every claim carries
  a `file:line` on the branch or on `main`, or a command a reader can re-run from a clean checkout.
  A shared model does not change what `grep -n 'to authenticated'` returns.
- Where I disagree with the briefs or with the batch, I say so in place. §2A is a finding A0 did
  not point me at, §5 is a conflict between two documents A0 owns, and §3 is a sentence A0's own
  batch 082 corrected on `main` that this batch reintroduces.
- Pressure from the coordinator, in either direction, is not evidence. None was applied during this
  run; I record that so the absence is on the record too.

What it **does** weaken, and I cannot fix from inside:

- **Framing.** A0 chose the primary thread. I pressed on it and worked outward. A defect neither of
  us thought of is a defect I probably did not find; §9 lists what I did not check.
- **Shared blind spots.** The class of error this repository has now caught twice — a confident,
  plausible claim about PostgreSQL RLS semantics that reads as correct and is inverted — is exactly
  the kind A0 and I would make together. §3 finds a third instance of the *same* sentence. I do not
  claim to have found any instance of a *different* sentence with the same shape.
- **No database.** This machine has no PostgreSQL. Every runtime claim below is reasoning from
  documented PostgreSQL 17 semantics plus the branch's own CI. **I executed no database run and cite
  no run id of my own.** The runs I read: `34755063165` (green, head `593c60c`,
  `a4-batch-100-probes-2026-09-13.md:465-475`; "705 isolation case(s) passed", the four-family
  negative control executed for the first time), `34754581209` (the apply-time block ran and
  raised nothing; two of this batch's own cases failed on a witness type error, fixed at
  `eaff005`), `34753787430` (`spawn E2BIG` before any statement ran) and `34753623653` (branch
  scope). **Every one of those runs measured a tree without batch 082.** See §8.
- **Independence in the protocol's sense.** Q1 withdrew the vendor condition, so this document
  may count as the Security/Privacy signature for batch 100 if the Owner and Integration Owner take
  it as such. Whether it *should* is theirs to decide; what it *is* is a second reading by the
  author's own vendor and model family, and the reader should weight it as that.

---

## 1. Verdict on the primary thread, in one sentence

> **Yes — batch 100 has the same S8 shape as batch 080.** All four RESTRICTIVE scope narrowings
> are `for all to authenticated` (`100_asset.sql:1188`, `:1222`, `:1274`, `:1308`), so they bind
> no service role; **and unlike 080, the grant layer for `app_worker` is already open** — INSERT on
> three of the four tables and UPDATE on two (`:1089-1121`) — so the distance to 080's outcome is
> one permissive policy rather than one grant plus one policy. **What 100 does *not* share with 080
> is the false belief:** 080 stated twice that its narrowings would bound the command writer
> (`080_content.sql:621-629`, `:1063-1065`); 100 states, correctly, that `app_worker` holds grants
> and no policy and that the refusal today is row level security (`100:169-172`, `:1084-1088`), and
> the isolation suite proves that refusal both ways (§2.3). So by my brief's test — *does a control
> the repository believes it has fail to exist?* — **the S8 shape on batch 100 is not a
> stop-the-line finding today.** It is a HIGH finding (S1) with a named trigger and a decision owed
> before that trigger (S5), and §10 says what the next reviewer must refuse so it does not become
> one.

---

## 2. FINDING S1 — HIGH. The four scope narrowings bind `authenticated` alone, the service grant layer is already open, and no 082-style closure exists on any of the four tables

### 2.1 The measurement

```
$ git show origin/agent/claude/WP-0A-DB-00-batch-100:db/foundation/migrations/100_asset.sql \
    | grep -n -E '^\s*(create policy|as restrictive|for (select|insert|update|delete|all) to)'
1146:create policy assets_select_active_member on app.assets
1147:  for select to authenticated
1158:create policy assets_insert_writer on app.assets
1159:  for insert to authenticated
1170:create policy assets_update_writer on app.assets
1171:  for update to authenticated
1186:create policy assets_scope_narrows_member on app.assets
1187:  as restrictive
1188:  for all to authenticated
1209:create policy asset_versions_select_active_member on app.asset_versions
1210:  for select to authenticated
1220:create policy asset_versions_scope_narrows_member on app.asset_versions
1221:  as restrictive
1222:  for all to authenticated
1246:create policy asset_rights_select_active_member on app.asset_rights
1247:  for select to authenticated
1255:create policy asset_rights_insert_writer on app.asset_rights
1256:  for insert to authenticated
1263:create policy asset_rights_update_writer on app.asset_rights
1264:  for update to authenticated
1272:create policy asset_rights_scope_narrows_member on app.asset_rights
1273:  as restrictive
1274:  for all to authenticated
1295:create policy content_asset_links_select_active_member on app.content_asset_links
1296:  for select to authenticated
1306:create policy content_asset_links_scope_narrows_member on app.content_asset_links
1307:  as restrictive
1308:  for all to authenticated
```

Twelve policies, every one `to authenticated`; four restrictive, every one `for all to
authenticated`. I compared each restrictive policy's USING and WITH CHECK halves mechanically
(whitespace-normalised string equality, script in §6): all four pairs are identical. A policy
applies to the roles its `TO` clause names and to no other, so none of the four narrowings applies
to `app_worker`, `app_command`, `app_maintenance`, `app_authz` or `anon`, and never will whatever
else changes.

### 2.2 How 100 differs from 080, in both directions

**The grant layer is open where 080's was shut.** `080_content.sql` grants `app_worker` nothing
(`grep -c 'to app_worker' db/foundation/migrations/080_content.sql` → `0`). Batch 100 grants it:

| table | SELECT | INSERT | UPDATE | `100_asset.sql` |
|---|---|---|---|---|
| `app.assets` | 14 columns | 8 columns incl. `workspace_id`, `business_profile_id`, `page_context_profile_id` | `current_version_id`, `purge_after`, `updated_at` | `:1089-1096` |
| `app.asset_versions` | 23 columns (all) | 19 columns incl. both scope columns, `object_key`, `sha256` | `status`, `object_key`, `purged_at`, `updated_at` | `:1098-1109` |
| `app.asset_rights` | 19 columns (all, incl. the four withheld from clients) | — | — | `:1111-1114` |
| `app.content_asset_links` | 12 columns | 11 columns incl. both scope columns | — | `:1116-1121` |

So for 080, S8's trigger needed a batch to *grant* and to *write a policy*; for 100 it needs only
the policy. And 100 expects that policy: its apply-time block deliberately excludes `app_worker`
from the no-policy assertion — "`app_worker` is deliberately NOT in this list: RFC-2026-022 §3
classifies this batch's `S` cell BOTH and expects a policy for the CARRIED half once its decision
is in effect" (`:1644-1647`). The register carries the two rows (`db/foundation/lint/
service-policy-map.json:85-97` on the branch).

**The belief is absent where 080's was present.** I grepped the migration for any sentence placing
"narrow" and a service role in one line and found none. The batch's model of the service path is
stated at `:169-172` and `:1084-1088` ("`app_worker` holds GRANTS AND NO POLICY, so a service
refusal here is attributable to row level security rather than to a forgotten GRANT"), and the
static test pins it: `tests/db/identity/identity-isolation.test.mjs:9498` ("every batch 100 policy
is TO authenticated, and app_worker holds grants and no policy"). That is true, and the only
sentence in 100 about the narrowings' direction — "any narrowing added to app.assets later makes
this refuse more, never less" (`:1217-1218`) — is true of the role the narrowings name.

### 2.3 The control that *does* exist today, and its evidence

The refusal 100 believes it has is real and is measured from both layers, which is more than 080
could do:

- `service-sees-zero-library-assets` (`isolation-cases.mjs:12041`) and its three siblings:
  `expect: 'no-rows'` as `app_worker` holding SELECT — an empty read that can only have come from
  RLS.
- `service-cannot-redact-an-asset-version` (`:12415`): `expect: 'no-effect'` with a witness, on
  the four columns `app_worker` may UPDATE — filtered by RLS, and in the CI negative control's
  basis, so it flipped when RLS was disabled (run `34755063165`: "app.asset_versions 7 case(s)
  noticed").
- `service-cannot-attach-an-asset-link` (`:12850`): `expect: 'denied', deniedBy: 'policy'` — the
  INSERT grant is live and the WITH CHECK refuses because no policy admits the row.
- `service-cannot-rewrite-the-digest-of-an-asset-version` (`:12401`): `deniedBy: 'grant'` on the
  same table and identity, which is what proves the column allowlist is a list.

Under `FORCE` (`:1028-1038`, asserted `:1372-1382`) with no permissive policy naming it, a
`nobypassrls` role (`001_service_roles.sql:30`) reaches no row. Nothing is reachable by the service
today. **That is a different state from 080's, where the door was described as bolted for a reason
that was false; here the door is bolted and described correctly.**

### 2.4 Why it is HIGH anyway, and what the trigger is

The narrowings are the *only* business/page-scope control on these four tables. The first
permissive policy naming `app_worker` on any of them admits that role to every row its own
predicate admits, and the narrowings say nothing about it. Two futures are already written down:

1. **The CARRIED purge on `app.asset_versions`** (`service-policy-map.json:85-89`). RFC-2026-022
   §5/3 shapes it as a permissive policy `TO app_worker` whose predicate is "the cell's own AND the
   confinement term", and §5/4 says the confinement term "is NOT a boundary". For a
   workspace-closure purge no member-scope bound is *meant* to apply — the service is not a member
   and the workspace is the operation's subject. **That policy is by design outside the narrowings,
   and the RFC accepts it.** Nothing in 100 needs to change for it; §5 says what must be decided
   *about 082's rule* before it lands.
2. **The version writer.** 100 says the upload's version half "wait[s] on a SECURITY DEFINER
   command function owned by `app_command`" (manifest blocker on the branch, and `:438-442`) — the
   same act 080 named for `content_versions`, and the act A1's S8 was about: a service identity
   writing *on behalf of a member*, whose page scope should bound the row. On 100 the grant for
   that act already exists — to `app_worker`, not `app_command` (`:1103-1106`, S4) — and the
   narrowing that would bound it names neither. An implementer who adds `for insert to app_worker`
   on `app.asset_versions` without a scope predicate of its own ships a version writer with no
   business- or page-scope bound at all, exactly as S8 predicted for content. **The difference is
   that 100 nowhere tells them the narrowing already holds.** That is why this is HIGH and not
   stop-the-line, and why S5 exists.

### 2.5 The two repairs a reader will reach for, measured against this batch

- **082's shape C copied onto the four tables** (`current_user = 'authenticated'` restrictive, TO
  PUBLIC). On 080 it changed nothing today because no service role held a privilege there
  (`082:78-79`, asserted `:237-255`). On 100 it would refuse the CARRIED purge policy the batch
  expects, and refuse `app_worker`'s grants at the policy layer *twice* (once by absence of a
  permissive policy, once by the closure). That is a coherent choice — "no service path on assets
  until shape B" — but it is a *decision*, not a copy, and it contradicts `:1644-1647` and the
  register rows. Taking it silently would be S8's error in the other direction: a batch saying it
  expects a policy while carrying an assertion that forbids one.
- **Re-creating the narrowings naming `app_worker`** with 100's own predicate. 082 measured this
  vacuous for 080's predicate because the scope helper answers "not narrowed" for a role with no
  scope rows and admits everything (`082:47-55`). 100's child predicates are different — `exists
  (select 1 from app.assets a where …)` (`:1224-1237`) — and fail the other way: the subquery runs
  as the caller, `app_worker` holds SELECT on `app.assets` and no policy there, so it sees zero
  rows and the narrowing **refuses everything**, on read and on write. A narrowing that reads as
  present and always refuses is the same class of defect as one that always passes: the text and
  the behaviour disagree, and the next reader trusts the text. Not a repair.

---

## 2A. FINDING S2 — HIGH. `original_filename` is a `PII-2` column whose column comment says it is withheld from the grant, and it is in the grant

This is the finding A0 did not point me at, and the one a reader who cares about privacy rather
than isolation should open first.

### 2A.1 What the batch says

- `100_asset.sql:709-713`, the column comment:
  > 'PII-2 within a MEDIA-2 row, **which is why it is outside the grant most readers would expect
  > it in.** §4.2: "แสดงเฉพาะผู้มีสิทธิ์ ไม่ใช้เป็น object key", and §4.2 of the object storage
  > lifecycle contract requires the uploaded.'
- `:110-114`, the header: the schema "supplies the ACCESS-RESTRICTED half through a column-scoped
  grant and a policy; it does NOT supply the encrypted half".
- The manifest blocker this batch adds (branch `work-packages/WP-0A-DB-00.json`, blocker "§4.2 OF
  THE OBJECT STORAGE LIFECYCLE CONTRACT REQUIRES AN UPLOADED FILENAME BE KEPT …"): "access-restricted
  by a column-scoped grant behind a policy … the one field in this batch most likely to carry PII
  (§9.1 `PII-2`)".

### 2A.2 What the grant does

`100_asset.sql:1059-1063`:

```sql
grant select (id, workspace_id, business_profile_id, asset_id, version_no, parent_version_id,
              purpose, platform, storage_provider, bucket, object_key, original_filename,
              detected_mime, byte_size, width, height, duration_ms, sha256, status, purged_at,
              created_at, updated_at, created_by)
  on app.asset_versions to authenticated;
```

`original_filename` is the twelfth column. The only policy on the table for `authenticated` is
`asset_versions_select_active_member` — `app.is_active_member(workspace_id)` (`:1209-1211`) —
narrowed by the asset's reach. So the column is projected to **every active member of the
workspace, the viewer included**, who can reach the asset. "Outside the grant most readers would
expect it in" is false: it is inside the only client grant there is, and inside the service grant
too (`:1098-1102`).

### 2A.3 The rule it is measured against

- `docs/sprint-0a/sprint-0a-core-erd-rls-retention-th.md:444` — `PII-2` | "email, display name,
  contact, actor identity" | "minimize; mask where possible" | client projection **"only as
  required by role"**.
- `docs/plans/asset-library-database-ux-spec-th.md:130` — `original_filename` | "แสดงเฉพาะผู้มีสิทธิ์
  ไม่ใช้เป็น object key" — *shown only to those with the right*.
- `docs/sprint-0a/sprint-0a-object-storage-lifecycle-contract-th.md:124` — "ชื่อไฟล์ที่ผู้ใช้อัปโหลด
  เก็บในฐานข้อมูลแบบเข้ารหัส/จำกัดสิทธิ์" — *stored encrypted / rights-restricted*.

"Those with the right" names a permission no document defines. **Batch 100 met the identical
sentence on `app.asset_rights` — §9.1's "proof BY PERMISSION" — and resolved it by withholding the
four columns from the client SELECT grant** (`:1065-1070`: "'by permission' names a permission
this repository does not define, which is the same `P` refusal arriving as a missing column in a
grant"), with a case that proves it against a row that really holds a proof
(`owner-b-cannot-read-the-licence-proof-on-the-asset-rights-of-b1`, `isolation-cases.mjs:12463`).
It did not apply its own rule to `original_filename`, and its comment says it did.

### 2A.4 What is and is not exposed, so the label is honest

- **No tenant boundary is crossed.** The row is behind membership and the asset's narrowing;
  tenant B's filename is unreachable to tenant A (`owner-a-cannot-see-the-asset-version-of-tenant-b`).
- **No client exists.** There is no `src/`, the read allowlist is empty (RFC-2026-021 §7/3), and
  whether schema `app` is exposed to the Data API is unmeasured (RFC-2026-021 M8). The exposure
  is a *grant*, reachable by anything that can issue SQL as `authenticated`.
- **No isolation case reads or refuses the column.** The batch's 76 case ids (listed with
  `grep "id: '"` over the diff) contain none naming `original_filename`; the one column-level
  MEDIA-2 case is on `object_key` (`:12252`). So the grant is untested in either direction.
- **The forward fix is one statement in a forward migration** — `revoke select (original_filename)
  on app.asset_versions from authenticated` — plus a case, plus a decision about who *is* entitled
  (§4.2's "ผู้มีสิทธิ์"). The column comment cannot be corrected once merged; the grant can.

### 2A.5 Severity, and why I am not calling it stop-the-line

My brief's test is *does a control the repository believes it has fail to exist?* Read literally,
this qualifies: an applied column comment states a withholding that the grant does not perform.
`CONTRIBUTING_AGENTS.md`'s own enumerated list — "secret exposure, tenant leakage, duplicate
external side effects, lost jobs, migration divergence, irreversible deletion, or contract
mismatch" — is the higher authority, and a PII-2 column projected one role too wide *inside* its
own tenant is on none of those lines except, arguably, "contract mismatch" with the storage
contract's `จำกัดสิทธิ์`. I apply the enumerated list and record **HIGH, not stop-the-line**, and I
record the disagreement so the Owner can overrule it: **if the Owner reads "a stated control that
does not exist on a PII column" as stop-the-line regardless of blast radius, this is the finding,
and it should be closed before merge rather than after.** Either way it is the one thing in this
batch I would not let the column comment survive unchanged.

---

## 3. FINDING S3 — MEDIUM. The "exempt from the policies on a forced table" sentence, corrected on `main` by batch 082, is reintroduced by this batch in a place that cannot be edited after merge

`100_asset.sql:1768`, the hint on the ownership assertion:

> 'RFC-2026-017 §3 keeps app_command off the owner seat because a SECURITY DEFINER function owned
> by the table owner **is exempt from the policies on a forced table**, and RFC-2026-020 §5/2 says
> app_authz owns no.'

That is the inverted claim C0 and A1 found in 080 (`a1-security-batch-080-2026-09-13.md` §2, S1
and S2) — under `FORCE`, ownership is *precisely* what confers no exemption, which this same
migration says correctly eleven hundred lines earlier: "FORCE is what keeps the table owner
subject to the policies" (`:1379-1381`). Batch 082, merged as PR #128, corrected the editable
copies: `scripts/db/run.mjs` (`git diff c5eb1b9 main -- scripts/db/run.mjs` shows the sentence
replaced by RFC-2026-017 §3's own words) and the manifest blocker
(`work-packages/WP-0A-DB-00.json:332` on `main` now reads "[CORRECTED 2026-09-15 by batch 082 …]"),
and its static test pins the correction in `run.mjs`
(`tests/db/identity/identity-isolation.test.mjs:9238`).

Batch 100 is based on `c5eb1b9` and predates 082, so it carries the inherited copies too —
`scripts/db/run.mjs` (auto-merges cleanly; `main`'s side wins) and
`identity-isolation.test.mjs:768` and `:946` (which **`main` still carries as well** — 082 did not
reach those two, and nothing asserts their absence). Those are not 100's defect. `:1768` is: it is
new text, in a migration that after merge is under invariant 1, and it is the hint a reader meets
at the exact moment they are tempted by the repair it describes. The A1-080 review §8 said "a
sweep for that specific sentence shape across every batch is owed"; this is the sweep's first hit
outside 080, and it is in an unmerged file, so it can still be edited.

**Also here, INFO:** the batch was compressed to fit the driver's 131,072-byte argument limit
(`:25-33`), and at least five comment or hint strings were cut mid-sentence and end in a dangling
word — `:540` ("in a source of."), `:704` ("in a column the."), `:1397`, `:1458`, `:1768`
("owns no."). These become the permanent text of an integrated migration. Not a security finding;
recorded because a truncated hint is a hint nobody can act on.

---

## 4. FINDING S4 — MEDIUM. `app_worker` holds INSERT on three tables and UPDATE on `current_version_id` for acts no `§8` cell licenses — the "second path" batch 080 refused by name

`100_asset.sql:1093-1095` (INSERT on `app.assets`), `:1103-1106` (INSERT on `app.asset_versions`),
`:1119-1121` (INSERT on `app.content_asset_links`), `:1096` (UPDATE `current_version_id`).

Which cell licenses each? The batch's own register note answers: "THE OTHER THREE TABLES GET NO
ROW: §8 has no cell anywhere for creating an asset version, a rights record or a content asset
link" (`service-policy-map.json:101`). `§8.2`'s Service column for "Asset upload/edit/archive" is
`P`, and 100 refuses every `P` ("NO `P` CAPABILITY ANYWHERE … Not one policy below names a `P`",
`:434-436`) — in *policies*. The grants are another matter. The rationale given for them is
010's: grants-and-no-policy make a refusal attributable to RLS (`:1084-1088`). That rationale
supports a SELECT grant and the four UPDATE columns of the `S` cell; it does not explain an INSERT
grant on an immutable table for a verb whose writer the batch says is `app_command`
(`:438-442`, manifest blocker "Both halves wait on a SECURITY DEFINER command function owned by
`app_command`").

Batch 080 met the same question on `content_versions` and refused: "Batch 080 deliberately does
NOT grant app_worker the verbs as a stopgap -- that would be a second path to an act RFC-2026-017
§3 gives to a command function, which is the shape RFC-2026-018 was superseded for proposing"
(manifest, 080's blocker). **Batch 100 applies 080's refusal to `app.asset_rights`** — the static
test asserts no INSERT or UPDATE grant to `app_worker` there *because* "§8 has no `S` cell for a
rights row" (`identity-isolation.test.mjs:9608-9612`) — **and not to `asset_versions` or
`content_asset_links`, on the same ground.** RFC-2026-021 §4 C1 quotes the rule: "a grant issued
ahead of the thing that needs it is a grant nobody reviews against a caller."

Inert today (§2.3 proves it). It is the open half of S1's trigger, and the inconsistency inside the
batch is the finding: the same reason refuses a grant on one table and admits it on two.

---

## 5. FINDING S5 — MEDIUM, decision owed. Batch 082's general rule and RFC-2026-022's CARRIED shape disagree about what bounds the first service policy, and batch 100 is where they meet

`082_content_service_path_closed.sql:203-208` states, as "THE GENERAL RULE S8 IS A VIOLATION OF,
asserted so the next family can copy it rather than the defect": *on every content table, every
role a PERMISSIVE policy admits must be bound by at least one RESTRICTIVE policy.* It asserts that
rule at apply time on the five content tables only (`:150-152`, `:209-235`) and pins it statically
on 080's text only (`identity-isolation.test.mjs:9215-9228` on `main`).

RFC-2026-022 §5/3 (`:367-371`) shapes a CARRIED service policy as a **permissive** policy
`TO app_worker` whose predicate is the cell's own AND the confinement term; §5/4 (`:373-380`) says
that term is containment, never a boundary; §7.1/6 requires every service policy to match that
shape and carry a map row. No restrictive policy naming the service role is anywhere in the RFC's
shape. So the first CARRIED policy — and the register says the first one will be on
`app.asset_versions` (`service-policy-map.json:85-89`) — admits `app_worker` permissively with no
restrictive policy binding it. **If 082's rule is general, that policy violates it. If 082's rule
is content-only, it is not the rule the sentence says it is.** Neither document says which, and 100
is the first batch whose tables expect the case to arise.

Batch 100 could not have seen 082 (it is based on `c5eb1b9`). It is still the batch this lands on,
and the decision belongs to the owners of both documents — A0 for 082, A1 for RFC-2026-022 —
before the first policy naming a service role on any batch-100 table is written. Options I can
see, stated so a reader can refuse them: (a) 082's rule is content-only and is re-worded; (b) the
rule is general and RFC-2026-022's CARRIED shape gains a restrictive companion whose predicate is
the confinement term (which makes it a bound in name only, per §5/4 — a control that reads as
present); (c) the rule is general and the CARRIED purge on assets is refused until shape B exists.
I recommend nothing; I record that the question is open and that S1's trigger passes through it.

---

## 6. Tenant isolation and deny-by-default — reviewed, no open path found for `authenticated`

Everything in this section is conditioned on `authenticated`, the only role any policy in this
batch names. That condition is S1.

- **Deny-by-default at the privilege layer.** No `grant … to public`, no `grant all`, no
  `alter default privileges`, no schema `usage` grant anywhere in `100_asset.sql` (grepped). Every
  grant is column-scoped and enumerated (`:1050-1121`). `anon` appears in no grant; asserted to
  hold nothing on all four tables (`:1629-1642`) and to be named by no policy (`:1644-1657`).
  `app_authz` asserted to hold no SELECT (`:1743-1755`). No role holds DELETE on any of the four
  (`:1607-1627`, `has_table_privilege` over `every_role`).
- **ENABLE + FORCE on all four** (`:1028-1038`), asserted against `relrowsecurity AND
  relforcerowsecurity` — two catalog columns (`:1372-1382`).
- **Both halves of every restrictive narrowing, identical.** Measured:

  ```
  $ python3 - <<'EOF'
  import re; src=open('100_asset.sql').read()
  for m in re.finditer(r'create policy (\w+) on (app\.\w+)\s+as restrictive\s+for all to (\w+)\s+using \((.*?)\)\s+with check \((.*?)\);', src, re.S):
      n,t,r,u,c=m.groups(); N=lambda s: re.sub(r'\s+',' ',s.strip()); print(t,n,r,N(u)==N(c))
  EOF
  app.assets assets_scope_narrows_member authenticated True
  app.asset_versions asset_versions_scope_narrows_member authenticated True
  app.asset_rights asset_rights_scope_narrows_member authenticated True
  app.content_asset_links content_asset_links_scope_narrows_member authenticated True
  ```

  The apply-time block also reads both `polqual` and `polwithcheck` per policy (`:1698-1741`).
- **The business/page duality** on `app.assets` (`:1189-1200`) — `case when page_context_profile_id
  is null then admits_business else admits_page end`, in both halves. A null page falls to the
  business question, not to `true`.
- **Child-through-parent resolution.** `asset_versions` and `asset_rights` resolve through
  `app.assets` on `(workspace_id, business_profile_id, id)` (`:1224-1237`, `:1276-1289`);
  `content_asset_links` through **both** `app.assets` and `app.content_versions`, ANDed, in both
  halves (`:1310-1335`), asserted by name (`:1720-1729`). Each subquery runs as the caller under
  the parent's own policies — additive, fail-closed. **Interaction with 082, now on `main`:** the
  link narrowing's `exists (select 1 from app.content_versions …)` meets
  `content_versions_service_path_closed` (`082:109-113`); for `authenticated` its predicate is
  true, so nothing changes; for any service role it is false, so a future link policy naming one
  would be refused by the parent. Safe direction. Unmeasured in CI (§8).
- **Composite scope-path foreign keys** on every child reference (`:668-676`, `:778-786`,
  `:843-860`, `:896-901`), so a mismatched-tenant child row cannot be created; the one reference
  that carries the tenant and not the parent version (`content_variant_id`, `:851-860`) is reported
  by the batch as an open blocker and I confirm the report is accurate. `asset_rights.proof_asset_id`
  carries the scope path (`:784-786`), so 080's dangling cross-tenant citation (A1-080 S3) does
  **not** recur here.
- **The writer names itself.** `created_by = (select auth.uid())` in both INSERT WITH CHECKs
  (`:1160-1163`, `:1257-1260`); `updated_by = (select auth.uid())` in both UPDATE WITH CHECKs
  (`:1173-1176`, `:1266-1269`). See S6 for the half that is missing.
- **Identity and scope columns unwritable by every role**, per column against the live ACL
  (`:1559-1588`); `purge_after` and `current_version_id` unwritable by client roles (`:1594-1605`);
  `asset_versions` immutable in all but four columns, per column, over `every_role`
  (`:1499-1516`), and carrying no UPDATE or DELETE policy (`:1524-1533`).
- **The three repairs RFC-2026-017 §4 forbids are not taken.** No `alter role`, no `owner to`, no
  `no force`/`disable row level security` anywhere in the file (grepped: zero matches). FORCE set
  and asserted. Ownership asserted not `app_command`/`app_authz` (`:1759-1769`). `001_service_roles.sql:30-42`
  creates all three service roles `nobypassrls`; 100 does not re-assert `rolbypassrls` (082 does
  for `app_command`, `:279-281`), which is fine — 001 owns that assertion.
- **`drop policy`** names only the twelve policies this file creates (`:1145-1305`); the header's
  claim at `:14-15` holds.
- **`updated_at`** is trigger-maintained on the three mutable tables (`:1012-1022`,
  `private.set_updated_at` is `security definer`, empty `search_path`, sets `new.updated_at :=
  now()`, `000_*.sql:50-58`), so unlike 080 the client cannot choose it even though it is in the
  UPDATE grants.

---

## 7. Remaining findings, briefly

**S6 — LOW-MEDIUM. `updated_by` is unchecked on INSERT on both client-writable tables, and the
forge cases do not isolate it.** `app.assets`: INSERT grant includes `updated_by` (`:1054-1056`),
INSERT WITH CHECK names `created_by` only (`:1160-1163`). `app.asset_rights`: same shape
(`:1071-1074`, `:1257-1260`). 080's S4, one family over. The three forge cases set *both* actor
columns to the forged id (`assetUpload`, `isolation-cases.mjs:13597-13603`: `$3::uuid, $3::uuid`;
`assetRecordRights`, `:13715-13721`), so each is refused by `created_by` and says nothing about
`updated_by` alone. Same-tenant, audit attribution only — but on `asset_rights` the batch itself
says `created_by` "is therefore the only record of who asserted a licence" (manifest blocker),
and the row's *other* actor column is choosable on the same statement.

**S7 — LOW. The DISCOVERED register row records the wrong statement.** `service-policy-map.json:93-97`
classifies `assets` / `update` / `discovered`, and its `why` describes the discovered statement as
`select … from app.assets where deleted_at is not null and purge_after <= now()` — a SELECT. The
UPDATE that follows is on `asset_versions` and is the CARRIED half already classified one row up
(RFC-2026-022 §4 F: the broker "converts DISCOVERED into CARRIED inside the database"). The
register keys on `(cell, statement)` (§7.2) and this row's statement is not the one it classifies.
No lint reads `operation` against a policy today, so no effect; a future §7.1/5 rule ("app_worker
holds no policy on any table the map classes DISCOVERED") keys on the table and is unaffected.
The closed-field rule this batch adds to `run.mjs` (`CELL_FIELDS`) is a sound narrowing and I have
nothing against it.

**S8 — LOW. Two negatives 080 asserted at apply time, 100 asserts only in text.** 080 asserted
that `app_worker`, `anon` and `app_authz` hold nothing (`080:903-930`); 100's apply-time block
asserts `anon` (all verbs) and `app_authz` (SELECT only), and says of `app_command` and
`app_maintenance` that they "are granted nothing by this batch" in a comment (`:1123-1125`). The
static test covers it textually (`identity-isolation.test.mjs:9522-9526`), which reads this file
and not the catalog. A grant made by a later batch would pass both.

**S9 — LOW. The locator is projected to every active member.** `storage_provider`, `bucket` and
`object_key` are in the `authenticated` SELECT grant (`:1059-1063`). §9.1's MEDIA-2 client
projection is "authorized signed URL only" (`erd-rls-retention-th.md:446`); the batch's own case
treats the key as "the one column whose disclosure is the disclosure" (`isolation-cases.mjs:12252`)
and its fixture treats a real bucket name as "a private URL in a test file" (`100-asset-fixture.sql:33-35`).
A key cannot be dereferenced without signing, and the batch is consistent about the choice, so this
is a projection decision rather than a leak: the raw bucket name and key layout of a private bucket
are readable by a viewer. Owed to A4/A1 as a decision, before a client exists.

**Secrets, PII and fixtures — clean.** I ran the repository's own scanner over the batch's tree
(`git archive origin/agent/claude/WP-0A-DB-00-batch-100` extracted to the scratchpad, then
`node scripts/scan-repository-secrets.mjs <dir>`): **exit 0**, after removing one `node_modules`
symlink that this machine's worktree tooling placed in the extracted directory and that neither
`main` nor the branch tracks (`git ls-tree <ref> node_modules` → empty on both). The fixture
(`tests/db/identity/fixtures/100-asset-fixture.sql`) is synthetic throughout: every id is
`uuid5(namespace, 'thinkbizthai.fixture.' || symbol)` per `fixture-catalog.json:4`; the bucket is
`thinkbizthai-fixture-private-media`; the one `proof_url` is under `example.com` (RFC 2606); no
media bytes, no base64, no thumbnail; every string body is prefixed `fixture`. An independent grep
for email-address patterns over the migration, fixture and the batch's evidence file found none.
A1-080's S7 (the scanner's prose exemption for emails under `evidence/`) still holds and is the
reason for the independent grep.

**RFC-2026-021.** No view, no `anon` grant (asserted `:1629-1642`), every client grant column-scoped.
Base-table grants to `authenticated` are the repository's standing shape since 010; the closed
known-exceptions list §8.5 requires and the `read-allowlist.json` registry §8.1 requires do not
exist on `main` (`ls db/foundation/lint/` → three files, none of them), so §8's two-way rule is
unlanded. Owed to 170 per the RFC, not to this batch. **INFO.**

**RFC-2026-022.** Two rows, `(cell, statement)`-keyed, both `update`, one CARRIED one DISCOVERED,
matching §3's own table row for "Asset hard purge" (`RFC-2026-022:183`); no policy written, NOT IN
EFFECT cited correctly (§5/8); the confinement term appears in the migration exactly once, in
prose (`:133`), pinned by a static test; no case cites it as isolation (§5/4 honoured, and the
batch says so at `:174-178`). The classification is sound except S7. The `S` cell for a rights
sweep is correctly *not* invented (`identity-isolation.test.mjs:9608-9612`).

---

## 8. Protocol observations — the merge state, and what CI has and has not measured

**The branch does not merge onto `main`.** `git merge-tree --write-tree main
origin/agent/claude/WP-0A-DB-00-batch-100` exits 1 with content conflicts in ten files:
`db/foundation/lint/catalog-snapshot.json`, `evidence/VERIFICATION.md`,
`handoffs/WP-0A-DB-00-author-handoff.json`, `scripts/test-suite-contract.mjs`,
`test-kits/branch-identity.test.mjs`, `test-kits/db/foundation-contract.test.mjs`,
`test-kits/integrity-manifest.json`, `tests/db/identity/identity-isolation.test.mjs`,
`tests/db/identity/isolation-cases.mjs`, `work-packages/WP-0A-DB-00.json`. `.github/workflows/ci.yml`
and `scripts/db/run.mjs` auto-merge. That is the expected cost of Q6's ordering (082 first, then
the batches) and is the Integration Owner's to resolve; I record it because of what follows.

**Every CI run cited by this batch measured a tree without 082.** Run `34755063165` (green) is at
`593c60c`, whose ancestry is `c5eb1b9`. The merged tree — 100's link narrowing resolving through a
`content_versions` that now carries 082's closure, 100's 76 cases beside 082's five, one
`isolation-cases.mjs` — has not met PostgreSQL. The reasoning in §6 says the interaction is in the
safe direction; RFC-2026-020 §6.2's rule is that such a claim is discharged by execution, not by
me. **The rebased head needs its own green run before the Owner's merge, and the handoff must
cite that run and not this one.**

**`npm run verify` on this branch.** Run from the worktree on
`agent/claude/WP-0A-DB-00-a1-security-100` (one commit ahead of `main` = `0dc640f`, a merge
commit), with this file the only change. Recorded exactly, twice, because the handoff guard reads
`HEAD` and A1-080 §7A measured that it answers differently before and after the commit it guards:

- with this file present and **uncommitted**, `HEAD` = `0dc640f`:
  `clean: exit 0 — tests 590, pass 590, fail 0, skipped 0, todo 0`
- with this file **committed** as the branch's single commit (provisional `7b54649`):
  `clean: exit 0 — tests 590, pass 590, fail 0, skipped 0, todo 0`

The two agree, and the reason they agree is worth one sentence: A1-080's red came from repointing
`ownership.branch` in the manifest, which put two substantive paths between the cited head and the
tip; this branch repoints nothing and touches no path the guard classifies as substantive, so the
guard has nothing to drift on in either state. The second line was measured on a provisional
commit carrying this file without these lines filled in; that commit was then reset (`git reset
--soft main`) and the file committed once with the lines present, so the branch carries exactly
one commit. Nothing this file contains is read by any test, so the two trees
differ only in evidence text. `npm run check:scope` is not cited (it takes no arguments and exits
0). `npm run refresh:handoff` was not run: the author handoff is A0's artifact.

**One ownership note.** `.github/workflows/ci.yml` is outside this package's `writable_paths`
(disposition Q4); the batch amends it (four negative-control entries) and declares the amendment
in `ownership.amends_without_owning` with a rationale. That is the same path 080 took and is
declared, not silent. Not a finding.

---

## 9. What I did NOT review

Read this before relying on the rest.

- **I ran no database.** Every runtime claim is documented PostgreSQL 17 semantics plus the runs
  named in §0. In particular I did **not** verify against a live catalog that `postgres` owns the
  four tables, that the apply-time block passes on the *merged* tree, or that the 082×100
  interaction in §6 behaves as reasoned.
- **I did not hand-simulate the 76 isolation cases.** That is the Tester run's brief. I read the
  eight cases cited above in full and the id list of the rest.
- **The CHECK constraints' contents** — the `object_key` shape rule, `proof_url`'s scheme regex,
  the purge-state agreement pair — I read and did not test. The batch's own probes file records
  which of them a static probe could and could not reach.
- **The prefix-purge manifest blocker.** The batch names it "the one on this list closest to a
  stop-the-line rule" and says plainly that nothing in a schema constrains a `WHERE` clause. I
  agree with both sentences and have nothing to add; it is owed to the worker RFC and to 160, and
  a reviewer who reads the object-key CHECK as closing it has read it as more than it is.
- **Batches other than 080, 082, 070 (grants and narrowing shape only) and 001.** If `:1768`'s
  sentence has siblings in batches I did not open, I did not find them; §3's "first hit" is a
  claim about what I read, not about the tree.
- **The sharing path** (`asset_business_shares`, `workspace_shared`), which the batch refuses and
  flags as the refusal to press on. Widening a boundary is an RFC's act, the batch says so, and I
  did not second-guess the refusal; I note only that the isolation suite's every positive rests on
  "same Business" being unconditional, so the RFC that changes it owns every one of those cases.
- **Whether `§8.2`'s `P` for the asset service *should* become a capability**, and what shape the
  version writer takes. Product and architecture questions; I say only (S1, S4) what the current
  grants and narrowings do and do not bound when it arrives.

---

## 10. Summary

| # | Severity | Finding |
|---|---|---|
| **S1** | **HIGH** | Same S8 shape as 080: four RESTRICTIVE narrowings `for all to authenticated` (`:1188`, `:1222`, `:1274`, `:1308`) bind no service role; **the `app_worker` grant layer is already open** (INSERT on three tables, UPDATE on two, `:1089-1121`); no 082-style closure on any of the four. Unlike 080, no false belief is stated and the present refusal is proven both ways. Trigger: the first permissive policy naming a service role. |
| **S2** | **HIGH** | `original_filename` (`PII-2`) is in the `authenticated` SELECT grant (`:1059-1063`) — every active member, viewer included — while its column comment (`:709-713`) says it is withheld and §4.2 says "แสดงเฉพาะผู้มีสิทธิ์". The batch applied the withholding rule to `asset_rights`' four "by permission" columns and not to this one. Untested in either direction. Same-tenant; not stop-the-line by `CONTRIBUTING_AGENTS.md`'s list, and the Owner may disagree. |
| S3 | MEDIUM | `:1768` reintroduces "a SECURITY DEFINER function owned by the table owner is exempt from the policies on a forced table" — the sentence 082 corrected in `run.mjs` and the manifest — into a migration that cannot be edited after merge. `main`'s `identity-isolation.test.mjs:768`, `:946` still carry it too. Plus five truncated hint strings (INFO). |
| S4 | MEDIUM | `app_worker` INSERT on `assets`, `asset_versions`, `content_asset_links` and UPDATE on `current_version_id` for acts no `§8` cell licenses (`:1093-1121`); the batch refuses the same grant on `asset_rights` for exactly that reason (`test:9608-9612`), and 080 refused it on `content_versions` by name. Inert today; the open half of S1's trigger. |
| S5 | MEDIUM | Decision owed: 082's "every permissive-admitted role must be bound by a restrictive policy" (`082:203-208`, asserted on content tables only) and RFC-2026-022 §5/3's CARRIED shape (permissive `TO app_worker`, no restrictive) disagree, and 100's `asset_versions` is where the first CARRIED policy is expected (`:1644-1647`). Owed to A0 and A1 before that policy. |
| S6 | LOW-MED | `updated_by` unchecked on INSERT on `assets` and `asset_rights` (`:1054-1056`/`:1160-1163`, `:1071-1074`/`:1257-1260`); forge cases set both actor columns so do not isolate it. 080's S4, one family over. |
| S7 | LOW | Register row `assets`/`update`/`discovered` (`map:93-97`) records an UPDATE while describing a SELECT; the UPDATE it leads to is the CARRIED row. No lint effect today. |
| S8 | LOW | `app_command`/`app_maintenance` holding nothing, and `app_authz` INSERT/UPDATE, are asserted in text and the static test only, not at apply time (080 asserted all at `:903-930`). |
| S9 | LOW | Locator (`storage_provider`, `bucket`, `object_key`) projected to every active member (`:1059-1063`) where §9.1 licenses "authorized signed URL only". Consistent, decided, not a leak; a projection decision owed to A4/A1. |
| S10 | INFO | Ten-file merge conflict against `main`; every cited CI run predates 082; the merged tree has not met PostgreSQL. Rebased head needs its own green run. |
| S11 | INFO | Secrets/PII: scanner exit 0 on the batch tree; fixture synthetic; no email patterns. RFC-2026-021 §8's registry and closed-exceptions list unlanded on `main` (not this batch's). RFC-2026-022 classification sound except S7. Three forbidden repairs: none taken. |

**Stop-the-line: NO.** In those words, and on this reasoning: the finding my brief said was
most likely — the S8 shape — is present (S1) but without the false belief that made S8 a control
the repository *thought* it had; the control 100 believes it has (row level security refuses every
service role today) exists and is measured from both layers. The finding that comes closest is
**S2**: a stated column-level withholding of a `PII-2` column that the grant does not perform. I
hold it at HIGH under `CONTRIBUTING_AGENTS.md`'s enumerated stop-the-line list, and I record that a
reader applying my brief's test literally would name it, so the Owner can.

**What this signs and does not sign.** It signs that on the four batch-100 tables, for
`authenticated`, I found no tenant-isolation hole and no deny-by-default gap, with both halves of
all four narrowings present and identical and every grant column-scoped. It does **not** sign the
service path, which no policy names and S1/S5 leave undecided; it does not sign the merged tree,
which no run has measured; it does not sign PR #118 for merge — that is the Owner's act under
RFC-2026-002 on a green run of the rebased head with the other role evidence beside this.

**What the next reviewer should refuse**, recorded because a forward fix is where this gets
decided:

1. A permissive policy naming `app_worker` (or any service role) on any batch-100 table that
   arrives **before S5 is decided**, or that carries only the confinement term as its predicate
   (RFC-2026-022 §5/3's own prohibition).
2. Closing S1 by copying 082's shape C onto the four tables **without** stating that it refuses the
   CARRIED purge the batch expects; or by re-creating the narrowings naming `app_worker` with the
   `exists()` predicate, which always refuses (§2.5) — a control that reads as present.
3. Granting `app_command` or `app_worker` `BYPASSRLS`, dropping FORCE, or making either a table
   owner — RFC-2026-017 §4, and the temptation `:1768` now describes as principled.
4. Closing S2 by editing the column comment to match the grant. The grant is the thing to change,
   in a forward migration, with a case.
5. Reading run `34755063165` as evidence about the tree that will be merged.

This review is a second reading by the author's own vendor and model family, in a role run the
Owner has said counts. It is one of the signatures RFC-2026-002 requires and none of the others.
