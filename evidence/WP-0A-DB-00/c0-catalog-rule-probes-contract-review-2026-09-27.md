# C0 contract review: the four catalog-rule probes

| | |
|---|---|
| Run | `/claude/c0_contract_reviewer` |
| Role | Independent Reviewer (contract), WP-0A-DB-00 |
| Subject | branch `agent/claude/WP-0A-DB-00-catalog-rule-probes`, head `055b977`, base `9039738` (main, merge of PR #158); Author `/claude/a0_atlas` |
| Date | 2026-09-27 |

This file records findings. It advances no status, approves nothing, and signs nothing on anyone's
behalf. Whether it counts as the Reviewer signature is for the Integration Owner and the Product
Owner to decide.

## §0 What I am, before anything else

- I am a subagent spawned by `/claude/a0_atlas`, the Author of the work under review.
- I ran in A0's worktree, under A0's brief.
- I am the same vendor and model family as the Author.
- RFC-2026-024 withdrew the cross-vendor condition. That removes one objection. It does not make me
  independent of the brief I was given.
- Accepting this file as the Reviewer signature is an act of the Integration Owner and the Product
  Owner, not mine.

## §1 How I measured

- **Branch name.** The subject branch name is checked out in the main worktree
  (`/Users/bank/ThinkBizThai`), so I could not take it here without forcing. I reviewed on a local
  branch `review/c0-catalog-probes` at `055b977`, as the brief allows. **Consequence:** the
  handoff-conformance test "the handoff for this branch describes this branch" returns early on an
  unclaimed branch name. My green `npm run verify` therefore does **not** cover the handoff guard.
  `verify-branch-scope.mjs` takes the package as an argument, so it is unaffected.
- **Static (measured):**
  - `npm run verify` exit 0: tests 668, pass 668.
  - `node scripts/verify-branch-scope.mjs 9039738 WP-0A-DB-00` exit 0: "all 11 changed path(s) are
    declared, and every amendment explains one".
  - `node scripts/validate-work-package-role-separation.mjs work-packages/WP-0A-DB-00.json` exit 0.
- **Live (measured):**
  - Private cluster in `scratchpad/c0-probes/`, `127.0.0.1:5505`, TCP only
    (`unix_socket_directories=''`), `initdb --locale=C -A trust -U postgres`, `LC_ALL=C TZ=UTC`,
    PostgreSQL 17.11 (Homebrew). Shim applied first. Fresh initdb for every round.
  - Each drift was APPENDED to `140_audit.sql` and the file restored byte for byte after
    (`cmp` checked each round, and `git diff 055b977 -- 140_audit.sql` is empty at the end).
  - `:5432` and `:5499` were not touched. The cluster was stopped and removed at the end.
- **Controls on the contract test (measured):** `run.mjs` was edited, one test was run, and the file
  was restored from a copy. `git status` was clean after each.

### Live rounds

| Round | Drift appended to 140 | migrate-clean | rls-smoke | Caught by |
|---|---|---|---|---|
| clean | none | **0** | **0** | n/a. All four probes print their claims. |
| m1 | social FK re-created `ON UPDATE CASCADE DEFERRABLE` | 2 | n/a | fk action probe, by name |
| r1 | approval_requests requester closure re-created PERMISSIVE, same name and text | 2 | n/a | closure text probe, by name |
| d6 | Q0 D38: business_profiles updated_by closure `or true` | 2 | n/a | closure text probe, by name |
| d7 | Q0 D15: `private.refuse_mutation` `reset search_path` | 2 | n/a | security definer probe (`proconfig=<none>`) |
| d4 | `app.knowledge_items` RLS disabled (closure keeps its pinned shape) | 2 | n/a | post-migrate pass (040.1, 042#1) |
| d10 | security_events' row refuse trigger dropped; a `public.security_events` carries one | 2 | n/a | post-migrate pass (140#1 counts 3 in app); **not** the trigger probe |
| d11 | `private.refuse_mutation` body replaced to return without raising | 2 | n/a | post-migrate pass (140#1, through a CHECK violation `23514`, not ZZ140) |
| **d1** | security_events `refuse_mutation` re-created `... for each row WHEN (false) ...` | **0** | **0** | **nothing** |
| **d2** | security_events `refuse_mutation` re-created `before update OF id or delete` | **0** | **0** | **nothing** |
| **d3** | `alter table app.approval_events disable trigger all` (no user trigger; its 2 internal RI triggers go to `D`) | **0** | **0** | **nothing** |

Also measured on the clean set, and each agrees with plan §2:

- 87 FKs in app and private, 87 NO ACTION on both sides and not deferrable. All are `confmatchtype s`,
  none NOT VALID, and no FK from another schema references app or private.
- 5 SECURITY DEFINER functions in app and private. None exists in any other non-system schema.
- 47 non-internal triggers, all `O`. There are also 348 internal triggers.
- The 4 refuse triggers: tgtype 27 / 34, `tgqual` null, `tgattr` empty, `tgnargs` 0.
- 16 closures.

## §2 Findings

No finding is stop-the-line. Nothing here is weaker than `main`. Every hole below is a hole that
already existed, which the probes leave open while their printed claims read as if they closed it.

### MEDIUM 1: the refuse-trigger set is pinned by (relname, tgname, tgtype), so a trigger that never fires passes. **Measured.**

`scripts/db/run.mjs:227-231` compares `format('%s/%s/%s', c.relname, t.tgname, t.tgtype)` only. It
does not read:

- `tgqual` (the WHEN clause);
- `tgattr` (UPDATE OF);
- `tgargs`;
- the table's schema.

What I measured:

- d1 (`WHEN (false)`) and d2 (`UPDATE OF id`) on `app.security_events` each passed migrate-clean and
  rls-smoke.
- The probe still printed "the 4 append-only triggers are exactly where they belong".
- On the d1 set I inserted a `security_events` row as postgres, then UPDATEd and DELETEd it. Both
  succeeded, inside a rolled-back transaction.
- On an unmodified set, the same UPDATE raises `ZZ140` ("app.security_events is append-only and
  refuses UPDATE").

Why nothing else catches it:

- 140's block probes only `audit_logs` behaviourally (Q0 F6).
- Nothing else probes `security_events`.
- So the append-only defence of `security_events`, the one mechanism that constrains the table owner
  (140's own comment on `private.refuse_mutation`), can be switched off by a later file while every
  layer stays green.

Claims that read stronger than the code:

- The run.mjs comment says "the append-only set is exactly four".
- README rule 4 says "The `private.refuse_mutation` triggers are exactly the four on `audit_logs`
  and `security_events`".
- Blocker 188 says "the refuse_mutation set is exactly four (D20b measured failing)".

Each is literally true of names and types. Each will be read as "the defence is intact". This is the
same class Q0 F6 graded MEDIUM, and I grade it the same.

Remedy, not applied. Either:

- add `t.tgqual is null`, `t.tgattr = ''::int2vector`, `t.tgnargs = 0` and `t.tgrelid::regclass` to
  the compared tuple; or
- add a behavioural probe of `security_events` in 140's final state.

### MEDIUM 2: "every trigger is enabled" excludes the internal (FK) triggers. **Measured.**

`run.mjs:223` filters `not t.tgisinternal`. d3 disables `app.approval_events`' two RI triggers
(`tgenabled D`, `tgisinternal t`). That table's FKs are then not enforced. migrate-clean and
rls-smoke both exit 0, and the probe prints "every trigger in app and private is enabled".

These claims are not true of the code:

- The printed claim at `run.mjs:241`: "every trigger in app and private is enabled".
- README rule 4: "**Every trigger is enabled.**"
- The run.mjs comment: "Every trigger in app and private is ENABLED".
- The commit message: "Every trigger is enabled (47 of 47)". The 47 excludes 348 internal triggers.

Plan §3.4 says "non-internal", which is correct.

What limits the exposure:

- Disabling a system trigger needs superuser.
- The provisioned instance's migration role is not superuser, so there the drift would fail at apply
  time.
- CI's postgres **is** superuser, so CI would accept it.
- The FK-action probe's value presumes the FKs are enforced.

Remedy, not applied: drop `not t.tgisinternal` from the enabled check, and keep it in the refuse-set
check. Or narrow every claim to "every non-internal trigger".

### LOW 3: the contract test does not hold two halves of the probes. **Measured.**

`foundation-contract.test.mjs:2233-2264` matches `t.tgenabled <> 'O'` in the trigger probe and the
`pg_get_expr` comparison in the closure probe. It does not match two other parts:

- the refuse-set comparison (`run.mjs:227-235`);
- the closure probe's "has no" half (`run.mjs:175-179`), which is the half that catches a dropped or
  renamed closure.

What I measured:

- I deleted both halves from `run.mjs`.
- The new test passed (1/1).
- A clean migrate-clean would pass as well, since both halves are silent on a clean set.

So both halves can be removed with every layer green. This is Q0 F9's lesson (a pin that can be
deleted unnoticed) arriving in the probe itself.

The two controls the commit names do hold. I measured both:

- an unordered `string_agg` fails the test with "security definer probe: a string_agg with no ORDER BY";
- a probe failure that does not `return 1` fails "each probe runs, a failing one fails the target…".

Remedy: assert on `refuse_mutation triggers are not exactly` and on `has no`.

### LOW 4: some "measured" statements are not backed by the Author's own list. **Read.**

The commit lists the ten drifts the Author measured: m1, m2, a deferrable FK, m3, a requester
or-true, a permissive closure, D14, D44, D20b, and a refuse trigger dropped. Against that list:

- **Blocker 186** (`work-packages/WP-0A-DB-00.json`, open_blockers[185]) says: "m1, m2 and m3, A1 F3
  and Q0 F5/D38 each measured failing migrate-clean by name". Neither A1 F3's tables
  (industry_assignments, assets, content_ideas) nor D38 (business_profiles) is in the list.
- **Blocker 188** (open_blockers[187]) says: "Q0 D14, D15, D44 measured failing". D15 is not in the
  list.
- **Plan §4** promised "a moved refuse trigger". The commit measured "a refuse trigger dropped"
  instead.

Two of these I measured myself. D38 (d6) and D15 (d7) each fail by name, so the **results** are true.
The **attribution** "measured" is unsupported for A1 F3. By reading, it would fail the same way as
d6. The "moved" case is true by reading, because relname is compared.

### LOW 5: the handoff at this head describes an empty range, and its test evidence is "see the commit". **Read.**

`handoffs/WP-0A-DB-00-author-handoff.json` at `055b977` has:

- `head_revision_or_patch_checksum` = base `9039738`;
- `files_added` and `files_modified` both `[]`, although the commit adds 2 files and modifies 9;
- `tests[0].result` "see the commit";
- the clean-set evidence given only as "fresh private cluster 127.0.0.1:5499", with no output.

This fits the repository's convention: the handoff cannot cite its own commit, and a later refresh
commit follows, "last and alone" (5022262). So it is not a guard failure. But it means:

- the handoff a Reviewer can read at this head lists nothing;
- a Reviewer signature should attach to the head **after** the refresh;
- the refresh should touch only the handoff.

I could not run the branch-name handoff guard (§1).

### NOTE 6: FK exemptions are keyed by constraint name alone. **Read.**

`run.mjs:140` exempts by `conname` in any app or private table. The stale-exemption check at
`run.mjs:145` searches `pg_constraint` in **every** schema. This is latent, because the list is
empty. It copies `FK_SUPPORT_EXEMPTIONS`' pattern (`run.mjs:109`). An exemption also waives every
action, not one named action.

### NOTE 7: the probes read only app and private. **Read, and measured zero today.**

The probe does not reach:

- a SECURITY DEFINER function in `public` or `auth`;
- an FK from another schema into app.

Neither exists today (measured). The claims are scoped to app and private, so none of them is false.

### NOTE 8: what the FK probe does not read. **Read.**

It does not read `confmatchtype` (all `s` today) or `convalidated` (none NOT VALID today). It does not
notice an FK that is dropped, which is left to the blocks that assert FKs by name.

### NOTE 9: the question "can a closure keep its pinned shape and be neutralised?"

- **Another policy on the same table:** no. A second permissive or restrictive policy cannot relax a
  restrictive one (read, PG semantics).
- **A second policy with a different name:** it is not selected unless it carries the suffix. If it
  does carry the suffix, the first half flags it on any table in any schema (read, `run.mjs:167`).
- **RLS disabled:** caught by 040.1 and 042#1 (d4, measured).
- **`auth.uid()` redefined:** keeps the text and is not probed here (read).
- **The closure governs INSERT only.** `private.set_updated_at` does not set `updated_by` (measured:
  its source has no `updated_by`). So UPDATE-time forging of `updated_by` is outside this rule. That
  is a design boundary, not a probe defect.
- **Pinned text interpolated unescaped into SQL** (`run.mjs:174`): a future text containing `'` would
  fail loudly, not silently.

### NOTE 10: the `proconfig is distinct from array['search_path=""']` question. **Read, plus d7 measured.**

The comparison handles all of these:

- NULL (d7 fails with `<none>`);
- extra settings;
- any other value.

`set search_path = ''` normalises to `search_path=""`, and `'', pg_temp` fails. That is stricter than
needed, and not a hole.

## §3 Answers to the brief's questions

1. **Build vs plan.** It matches plan §3 and the recommended option on each of §6 A–G. It implements
   survey §6 items 1, 2 and 4, and nothing of 3 or 5–9, as plan §5 says. Deviations:
   - The drift list differs from plan §4 (LOW 4).
   - Survey item 4 said the trigger probe "covers ... every `set_updated_at` trigger". The build
     asserts their enablement, not their presence (read). The plan does not claim presence.
2. **Probes correct and strict.**
   - FK: strict for what it states (m1 measured). See NOTE 6 and NOTE 8.
   - Closures: strict (r1, d6 measured). See NOTE 9.
   - Definer: strict (d7 measured). See NOTE 10.
   - Triggers: **not** strict (MEDIUM 1, MEDIUM 2).
3. **Claims vs code.**
   - The "every trigger is enabled" wording in README, commit, comment and printed claim (MEDIUM 2).
   - "Exactly the four" (MEDIUM 1).
   - "measured" for A1 F3 and D15 (LOW 4).
   - Everything else I checked is true: counts 87/5/47/16/4, "0 exempt", "every list a probe prints is
     ordered", both controls, and floors.
4. **Authority.** Honestly stated:
   - Plan §7, disposition §3, the commit and the handoff each say the Owner's words predate the seven
     questions, and that this is an advance delegation, not an answer.
   - The disposition keeps RFC-2026-002 and the stop-the-line halt intact.
   - The disposition states clearly what it is not.
5. **Ownership.**
   - `verify-branch-scope` exit 0 (11 paths). The four amended files are declared with reasons.
   - Floors: 67→68 tests, and 290→305 assertions. 305 is the guard's own regex over `stripNonCode`,
     measured. The name digest moved.
   - The branch-name guard could not be run (§1).
6. **Stop-the-line.** None.

## §4 My limits

- I am not independent of the brief (§0).
- I was not on the subject branch name (§1), so the handoff guard is unmeasured.
- I measured on local PG 17.11. CI's `postgres:17` deparsing identically is inferred.
- I reproduced three of the Author's drift classes (m1, r1, d6), not the Author's exact ten.
- I did not re-verify the survey's per-block classification.
- I did not examine whether each of the 14 updated_by tables also carries a service-path closure
  (role paths other than `authenticated`).
