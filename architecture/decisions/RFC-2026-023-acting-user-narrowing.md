# RFC-2026-023 — The acting-user narrowing: how a command function is bounded by the scope of the user it serves

Status: **In review** — proposed 2026-09-15 by `/claude/a0_atlas` (A0). Not approved. Nothing in this document changes a migration, a policy or a grant; the Product Owner disposes it, and the batch that writes the first content command function implements what is approved.
Date: 2026-09-15
Author: `/claude/a0_atlas` (A0 Integration / DB-00), the run that wrote batches 082, 083, 092 and 101
Reviewer sought: `/claude/a1_bastion` (A1 Security), whose finding S8 this answers, and whose review must say whether §4's threat model is stated honestly
Depends on: `RFC-2026-017` §3 (service roles hold no `BYPASSRLS`; `app_command` is not the table owner), `RFC-2026-020` (`app_authz`, the role that owns authorization helpers and holds pinned grants), `RFC-2026-022` §5/4 (a GUC bounds nothing on the service path), and Product Owner decision Q3 of 2026-09-15 ("C แล้วค่อย B")
Measurements: `evidence/WP-0A-DB-00/a1-security-batch-081-2026-09-15.md` §S1 (the exploit, live), `evidence/WP-0A-DB-00/a0-batch-083-integration-2026-09-15.md` §3 (the exploit refused by the closure, live), and §2 below

---

## 1. What is open

Every scope narrowing in this schema is written `for all to authenticated` (batches 020, 021, 030, 040, 070, 080, 081, 090, 100 — `grep -n 'for all to authenticated' db/foundation/migrations/`). A policy applies to the roles its `TO` clause names, so none of them binds `app_command`, the role `RFC-2026-017` §3 gives the `SECURITY DEFINER` command functions that will perform user-initiated writes. A1's finding S8 (batch 080) is that the migrations *say* the narrowings bound that writer, and they do not; A1-081 measured it: with a permissive INSERT policy naming `app_command`, the role wrote a content target under tenant B's item.

Batches 082, 083, 092 and 101 — **shape C** — close the path: one RESTRICTIVE policy per table, `TO PUBLIC`, `using (current_user = 'authenticated')`. Every role that is not `authenticated` is refused every row. That is correct today, because no command function exists (`RFC-2026-021` §10), and it is a decision rather than a fix: **the first command function cannot work until a batch amends a closure, and nothing yet says what it may amend it to.** This RFC says.

## 2. What was measured, and why the obvious shape is vacuous

The obvious shape — name `app_command` in the existing narrowings — was measured before shape C was chosen and is recorded in `082_content_service_path_closed.sql`'s header. `app.member_scope_admits_business` resolves through `app.member_scope_is_narrowed` (`021_member_scope.sql:389-400`), a `SECURITY INVOKER` function that reads `app.workspace_member_scopes`. Evaluated for `app_command`:

1. EXECUTE on the helpers is revoked from PUBLIC and granted to `authenticated` alone (`021:505-507`) — a permission error, not a refusal;
2. granted, the helper reads a table `app_command` holds no SELECT on — another error;
3. granted, `workspace_member_scopes_select_own` names `authenticated` only, so `app_command` sees zero rows, `is_narrowed` is false, and `admits_business` is **true for every row**.

The helpers answer about the **caller**. Under a `SECURITY DEFINER` function the caller is the function's owner, which holds no membership anywhere. A narrowing that binds `app_command` with the caller's scope is a control that always passes.

What the policy needs is the scope of the **acting user** — the person on whose behalf the command runs — and that is a different question with a different answer.

## 3. Decision proposed

**Shape B: a second family of scope helpers that answer about the ACTING USER, owned by `app_authz`, and a closure amendment that admits `app_command` only through them.**

### 3.1 The acting user is what the request's claims say, and nothing else

The acting user is `auth.uid()` — the `sub` of `request.jwt.claims` — exactly as it is for `authenticated` today. A `SECURITY DEFINER` function changes `current_user` to its owner and changes **nothing** about the session's settings, so inside a command function `auth.uid()` still names the user who called it. No new setting is introduced: `RFC-2026-022` §5/4 measured that a service role can set the setting a policy reads, and a second identity channel would be a second thing to get wrong.

**Fail closed.** When `auth.uid()` is null — a command reached with no claims — every acting-user helper returns `false`, and the closure refuses. A command function has no anonymous mode.

### 3.2 The helpers, and who owns them

Two functions beside the five in batch 021, same signatures, same reading of §7 (a member with no scope row is not narrowed):

```
app.acting_user_admits_business(workspace uuid, business uuid) returns boolean
app.acting_user_admits_page(workspace uuid, business uuid, page_context uuid) returns boolean
```

Both `SECURITY DEFINER`, `STABLE`, `set search_path = ''`, **owned by `app_authz`** — the role `RFC-2026-020` created for exactly this: helpers that must read authorization tables with a privilege the caller does not have, under grants pinned to named columns. They read `app.workspace_members` (already in `app_authz`'s pinned grant) and `app.workspace_member_scopes` (three columns to add to that grant: `workspace_id`, `business_profile_id`, `page_context_profile_id`, plus `user_id`), filtered by `auth.uid()`, and answer:

- `admits_business`: the acting user is an **active member** of `workspace` **and** (holds no scope row in it, or holds one covering `business`);
- `admits_page`: the same, with the page form of batch 021's `covers_page`.

Note the first conjunct. Batch 021's helpers are "NOT a membership test and must be ANDed with one" because the permissive policy already asked membership. On the command path there is no permissive policy for `authenticated` in the chain, so the acting-user helper asks both questions itself. **A helper that asked only the scope question would admit a non-member with no scope rows.**

EXECUTE: revoked from PUBLIC, granted to `app_command` and to nobody else. `authenticated` keeps batch 021's helpers; the two families are not interchangeable and a policy that used the wrong one is a finding.

### 3.3 The closure amendment, per table

The shape-C closure on a table becomes:

```
using (
  current_user = 'authenticated'
  or (current_user = 'app_command' and app.acting_user_admits_business(workspace_id, business_profile_id))
)
```

with the page form where the table carries `page_context_profile_id`, and the parent-resolved form (through the item, or the version and the item) on the tables whose narrowing resolves through a parent — the same predicate shape as the table's existing narrowing, with `member_scope_` replaced by `acting_user_`. Both halves, identical, as every narrowing in this schema.

Nothing else changes: the existing narrowings keep `TO authenticated`; `app_command` still holds no grant until the command batch grants exactly the verbs its function needs; `app_worker`, `app_maintenance`, `anon` and `app_authz` stay refused by the closure. **The closure is amended, never dropped**, and the static rule that holds every `*_service_path_closed.sql` to one shape is extended to accept exactly this form and no other.

### 3.4 What the command function itself must do

The closure bounds the *rows*. The function bounds the *act*: it validates its inputs, performs one command, and writes its audit row. It does not `SET ROLE`, does not touch `request.jwt.claims`, and holds no `BYPASSRLS`. Its body is reviewed code and is the trust boundary for what it does; the closure is the boundary for **where** it may do it.

## 4. Threat model, stated so the reviewer can disagree with it

Shape B is **containment against defects in command code, not tenant isolation of the command path** — the same sentence `RFC-2026-022` §5/4 uses for the GUC. A command function can call `set_config('request.jwt.claims', …)` before it writes; nothing in RLS stops the function's own body from lying about who is acting. What shape B guarantees is narrower and worth having: a command function that does **not** lie about the acting user — the only kind a reviewer should approve — cannot write a row the acting user could not reach as `authenticated`, whatever its inputs say and whatever bug it has. The exploit A1-081 measured (a permissive policy admitting `app_command` with `with check (true)`) is refused under shape B because the closure ANDs against the acting user's scope; the permissive policy alone admits nothing.

The residual, named: a command function that forges claims. That is a review question, not a policy question, and it is the same residual every `SECURITY DEFINER` function in every schema carries.

## 5. What this costs

- `app_authz` gains a pinned grant on four columns of `app.workspace_member_scopes`. `RFC-2026-020` §6.1/6 pins its grants to four columns of `workspace_members`; batch 080's apply-time block and `run.mjs` assert that pin. Both must be amended in the same batch, with the reason — a widening of a pinned grant in a diff a reviewer reads, which is what pinning is for.
- Two helpers whose EXECUTE is granted to a role that today holds nothing. The first grant to `app_command` in this schema.
- One more predicate shape the closure rule must recognise, and one more thing each closure file carries.
- The command batch cannot land shape B "on the side": it is a forward migration of its own, before or with the command function, tested by the case shape in §6.

## 6. How it is proven

Two isolation cases per closed table, in the batch that lands it, and they need what no case today has — a `SECURITY DEFINER` function owned by `app_command` to run under. So the batch also lands the **first** command function, or a test-only stub with the same ownership and a body that inserts what it is told; either way:

- as the acting user who **can** reach the parent row, the command inserts — `rows`;
- as the acting user who **cannot** (tenant B's item; a page-restricted item outside a page-scoped member's narrowing), the command is refused **by the closure by name** — `denied`, `deniedBy: 'rls'`;
- with no claims at all — `denied`.

And the negative control: with the closure's `app_command` arm removed, the second case must go **red**. A closure amendment that passes with its arm removed is shape A again.

## 7. What is not decided here

- Which batch writes the first command function, and for which family. `RFC-2026-021` §10 records that none exists; §6's registry gives "command surface" to nobody by name.
- Whether the families merged before 080 get shape-C closures first (the Owner's open question from the 2026-09-15 record) — shape B applies to whichever closures exist.
- `app_worker`. Shape B is for the command path. A worker acts for no user; its cells are `RFC-2026-022`'s, and its policies, when that decision is in effect, carry their workspace or discover it — not an acting user.
