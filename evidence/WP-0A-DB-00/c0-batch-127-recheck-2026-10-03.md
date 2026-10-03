# C0 re-check: batch 127's review round

- **Reviewer run:** `/claude/c0_contract_reviewer`
- **Package:** `WP-0A-DB-00`
- **Subject:** branch `agent/claude/WP-0A-DB-00-batch-127`, PR #166 (Draft), head `55a1f72e00b08c01c7ba8151dbd04965cbdc4a21` (handoff only). The record is `dc5a7ce`, the code `610b2d3`, the previously reviewed head `75dae71`, and the base `3f80599` (main).
- **Author:** `/claude/a0_atlas`
- **Re-check branch:** I checked the head out into my own branch, `recheck/c0-batch-127-r2`, in an isolated worktree.
- **My earlier evidence:** `evidence/WP-0A-DB-00/c0-batch-127-contract-review-2026-10-03.md` (F1–F7).
- **Date:** 2026-10-03
- **Status effect:** this file records findings. It does not approve, test-verify or integrate anything, and it does not advance any status.

## §0 What I am

I am a subagent that `/claude/a0_atlas`'s workflow launched. I share the Author's vendor and model family. Under RFC-2026-024, my run is the C0 role's evidence. Accepting it as that role's signature is for the Integration Owner and the Product Owner to decide. I did not write or edit any of the subject's files, and I fixed nothing. This is a narrow re-check: my F1–F7, the three new rules, and the round's claims.

## §1 Measured vs read

**Measured (M).** I used a private PostgreSQL 17.11 cluster (`/opt/homebrew/bin`) at `127.0.0.1:5505`, TCP only (`-c unix_socket_directories=''`). Setup:
- `initdb --locale=C -A trust -U postgres` and `LC_ALL=C`;
- the shim first;
- a fresh initdb every round;
- Node `v24.20.0`, checked by the round script before every measured run (it refuses any other version).

Drifts were appended to `140_audit.sql`. After every round I restored that file and compared it byte for byte with a saved copy (sha1 `2ac2fc2c…3093b782`). It matched after every round and at the end. At the end I stopped the cluster, removed its data directory and checked that port 5505 had no listener.

| Round | Input (appended to 140) | migrate-clean | rls-smoke |
|---|---|---|---|
| B0 | head as committed | **0**: 21 catalog probes, each refused its drifts and was clean again; client privilege probe 3 of 3, policy helper probe 2 of 2; pinned policy probe "the 36 restrictive policies"; post-migrate pass 49 blocks (37 as written, 12 replaced) | **0**: 1078 of 1078 |
| D7 (A0's) | `alter policy user_profiles_update_own … using (true) with check (true)` | **2**: permissive probe, naming `app.user_profiles.user_profiles_update_own` | **2**: 1 of 1078, exactly `user-a-cannot-update-user-b-profile` |
| X6 (my F1) | `grant truncate on app.content_items to authenticated` | **2**: client privilege probe, "authenticated TRUNCATE on app.content_items" | 0 |
| X1 (my F4) | `member_scope_covers_business` and `member_scope_admits_business` replaced by `select true` | **2**: policy helper probe, both named "[body differs from the pinned digest]" | **2**: 40 of 1078 |
| X2b (my F3) | `industry_assignments_scope_narrows_member`, both halves `… or true` | **2**: pinned policy probe, named | **2**: 1 of 1078 |
| G1 (new) | `create schema api; grant usage on schema api to authenticated; create view api.ideas as select * from app.content_ideas; grant select, insert on api.ideas to authenticated;` | **0** | **0** (N1) |
| G2 (new) | the same schema with a plain table, no RLS, all of SELECT, INSERT, UPDATE, DELETE and TRUNCATE granted to authenticated | **0** | **0** (N1) |
| E1 (new) | `set U&"client\005fencoding" to 'SQL_ASCII';` | **0** | 0 (N2) |
| E2 (new) | a DO block, `execute E'set\x20names ''SQL_ASCII''';` | **0** | 0 (N2) |

My first E2 attempt put the DO block on one line. The post-migrate pass refused that for its layout, not its content, so I re-ran it in the multi-line form. The table records that re-run.

**Direct checks on the cluster (M):**
- **G1 leak.** In a rolled-back transaction I created G1's schema and view. Workspace B's owner, as `authenticated` with B's claims:
  - read 1 row from `app.content_ideas` directly (1 workspace);
  - read 2 rows through `api.ideas` (2 workspaces);
  - read 1 row of another workspace through `api.ideas`.
- **Encoding through escapes.** I fed each statement below through `psql -f` (17.11), and after each `\echo :ENCODING` printed the new encoding:

  | Statement | `:ENCODING` after |
  |---|---|
  | `set U&"client\005fencoding" to 'SJIS'` | `SJIS` |
  | `do $$ begin execute E'set\x20names ''SJIS'''; end $$` | `SJIS` |
  | `do $$ begin execute E'set client\x5fencoding to ''BIG5'''; end $$` | `BIG5` |
- **Lexer shapes** (`psqlLex`, Node 24.20.0):
  - **1 finding each:** my F6 literal (`do $$ begin execute 'set names ''SJIS'''; end $$;`), a bare `set names`, a nested comment between the words at a head and inside a DO literal, and `set "client_encoding"`.
  - **0 findings each:** the three escape spellings above, the declared computed shape `'set ' || 'names …'`, and the innocent `offset_names`.
- **Source scan.** Of the 87 `.sql` files under `db/` and `tests/`:
  - 0 match `SET_NAMES`;
  - 0 contain a `U&'` or `U&"` token;
  - 0 contain an `E'` or `e'` string.

**The catalog on B0** (`search_path = pg_catalog`):
- **Narrowings.** 33 restrictive `*_scope_narrow*` policies, all FOR ALL, all `TO authenticated`, all with both halves.
- **Restrictive policies by family.** 55 `*_is_caller` closures (14 + 2 + 19 + 1 + 19 in the closure probes), 33 narrowings, 26 `*_service_path_closed` and 3 others: `approval_requests_settled_is_immutable`, `calendar_items_deleted_is_final` and `content_schedules_client_transition_is_bounded`. 33 + 3 = the 36 pinned.
- **Functions policies depend on** (`pg_depend`): exactly
  - `auth.uid()`;
  - `app.is_active_member` and `app.workspace_member_role` (SECURITY DEFINER);
  - the four `member_scope_admits_*` / `member_scope_covers_*` (invoker).
- **Relations.** No view, materialized view or foreign table exists in any non-system schema, and `public` holds no relation.
- **Client privileges.** No client role holds a privilege on any sequence, or on any table outside `app`.
- **Schema privileges.** Client USAGE is held on `app` (authenticated) and on `public` (anon, authenticated, PUBLIC). Client CREATE is held on no schema.
- **Client EXECUTE on SECURITY DEFINER functions.** Only `app.is_active_member` and `app.workspace_member_role`.

**Commands on a fresh GitHub clone** (private dir), on the branch **name** `agent/claude/WP-0A-DB-00-batch-127` at `55a1f72`, not detached, with `origin/HEAD` set to `main`, Node `v24.20.0`:
- `node scripts/verify-branch-scope.mjs 3f80599 WP-0A-DB-00` exited 0: "all 28 changed path(s) are declared, and every amendment explains one" (plan §7.2 says 28).
- `npm run check:handoff` exited 0: "describes the branch: nothing substantive after its cited head". The handoff's `head_revision_or_patch_checksum` is `dc5a7ce…`, and `55a1f72` touches only the handoff.
- `npm run verify` exited 0: "tests 677, pass 677, fail 0".

**Other checks (M):**
- **Cherry-picks.** Each pair has the same stable patch-id:
  - `a86c9ff` and `8902322` (`030a31a2…`);
  - `eea39f3` and `474a579` (`4cc7b83a…`);
  - `2f97b5e` and `e97b168` (`a1502fb7…`);
  - `a5a5eea` and `6e94078` (`faa22e7a…`).

  "Cherry-picked unchanged" is true.
- **CI.** `gh run view 37119566871` shows "Bootstrap validation", `pull_request`, head `55a1f72…`: completed, **success**. A0 had listed this as not seen. `gh pr view 166` shows it open, a Draft and not merged.

**Read (R):**
- `CONTRIBUTING_AGENTS.md`;
- the code diff `6e94078..610b2d3`: `run.mjs` (CLIENT_PRIVILEGE_PROBE_SQL, the 31 added PINNED_POLICIES, POLICY_HELPER_PROBE_SQL and their CATALOG_RULE_PROBES entries), `psql-driver.mjs` (SET_NAMES), `test-suite-contract.mjs`, and the new isolation case;
- the record diff `554a9c3..dc5a7ce`: plan §2, §5 and §7, the disposition, the README, and blocker 186's "REVIEW ROUND ON 127" text;
- the handoff's `known_limitations` and its wording on #165;
- §3.1 and line 413 of `docs/sprint-0a/sprint-0a-core-erd-rls-retention-th.md`.

Not re-run:
- A0's mutations (MA–ME, MB + L-F6, MC + D7) and its V0–V3 / P1 drifts. Where I rely on them they are **(A0's)**.
- A0's D1–D6 and L1–L3.

## §2 My findings on 75dae71, re-measured

| Mine | Disposition | Verdict |
|---|---|---|
| **F1** TRUNCATE etc. to a client | Client privilege probe, rule 1 | **Closed.** X6 fails migrate-clean by name. Rule 1 reads all four privileges for anon, authenticated and PUBLIC on every relkind in app, private and public. The self-test drift exercises three of the four, one role each; MAINTAIN is A0's X6b. |
| **F2** a permissive SELECT sibling on a read-only table fails rls-smoke only | Folded into A1 F3's row in plan §7.1: "rls-smoke holds the SELECT-only tables" | **Accepted as a disclosed edge, not named** (N3). |
| **F3** narrowings pinned by token only | 31 added to `PINNED_POLICIES`, 36 in all | **Closed.** X2b fails migrate-clean by name. 33 narrowings measured, matching the code comment. Plan §5.5 is reworded truthfully and names 122's service-path closures as not pinned. |
| **F4** helper bodies | Policy helper probe | **Closed.** X1 fails migrate-clean, both named. The set of called functions equals my catalog measurement. |
| **F5** no case for another user's profile | `user-a-cannot-update-user-b-profile` | **Closed.** D7 fails rls-smoke at exactly that case, 1 of 1078. The bare-UPDATE shape and its stated reason (a WHERE or a column RETURNING would also apply the SELECT policy) hold for this measurement. |
| **F6** SET NAMES read at a head only | SET_NAMES read anywhere | **Closed for the shape I measured** (my DO literal, and nested comments). The limit's new wording is still wider than the rule (N2). |
| **F7** a reading stated as fact | Disposition §3 and the handoff now read "On A0's reading of those words" | **Closed.** |

**Conventions.**
- **One self-test drift per rule.** The client privilege probe has three raises and three drifts. The policy helper probe has two and two. Each drift names what it must name, and each probe reports "refused each of its N drifts; clean again after every drift" on B0.
- **Digests and floors.** Probe digests and the 464 → 480 floor are held by the static suite, which `npm run verify` passed (677/677). I did not re-derive the digest values by hand.

**Consistency with the governing documents.**
- §3.1 says an exposed view uses security invoker and `private` has no direct grant. Rule 2 (a pin plus `security_invoker`) and rule 3 (no client privilege in `private`) match it, and are stricter in requiring a pin.
- §3.1 lists no `public` zone, so refusing client privileges there is consistent.
- §5.2's "closed for client privileges" is true as measured for `public`.
- The SECURITY-4 "safe view" that the same document's classification table envisages stays possible: a later batch would add it to `CLIENT_VIEWS` as `security_invoker`, which is a reviewed change.

## §3 New findings

Grades: HIGH, MEDIUM, LOW, INFO. None is a regression from 127 and none is reachable by a client on the clean set. Each needs a later migration.

- **N1, LOW (the fail-closed rule is scoped by schema name).**
  - *What.* `CLIENT_PRIVILEGE_PROBE_SQL` reads only `nspname in ('app', 'private', 'public')`, and no probe reads which schemas a client may USAGE.
  - *Measured.* A later file that creates a schema, grants USAGE to authenticated and puts a plain (definer-rights) view or an RLS-less table in it passes every layer: G1 and G2 gave migrate-clean 0 and rls-smoke 0. Through G1's view, workspace B's owner read workspace A's row (rolled back). That is the class A1 F1, Q0 F1 and A1 F2 named, one schema over.
  - *The over-statement.* Plan §7.1 says "a client cannot use a view at all, so nothing reaches past those checks through one", and blocker 186 and README rule 11 call the rule fail closed. Both are true only for the three named schemas.
  - *Remedy.* Either rule fits §3.1, which names no other client zone:
    - add a rule, with its own drift, that client USAGE and CREATE are exactly the pinned pairs (today `app`: authenticated; `public`: anon, authenticated, PUBLIC);
    - or derive the probe's schema set from the catalog (every schema a client role may USAGE).
- **N2, LOW (the encoding limit is worded as "computed", but escape spellings pass).**
  - *What.* Three statements pass `psqlLex` with no finding, and each moved psql's `:ENCODING` (measured):
    - `set U&"client\005fencoding" to …`, at a top-level statement head;
    - `execute E'set\x20names …'` in a DO body;
    - `execute E'set client\x5fencoding …'` in a DO body.

    E1 and E2 pass migrate-clean.
  - *Why it is not the declared limit.* None of these is computed at run time. The README, the plan (§5.1, §7.4), blocker 186 and the handoff all say only a name or SET words "computed at run time" stay outside.
  - *Remedy.* Refuse `U&` identifiers and literals, and `E'` strings, outright. None of the 87 `.sql` files uses either (measured), so nothing integrated is refused. Or reword the limit to "any spelling other than the plain words".
- **N3, INFO (F2 not named).**
  - *What.* Plan §7.1 maps every other finding by name, but my F2 on 127 appears only through A1 F3's row. The README's rule 1 and the handoff's `known_limitations` do not state that a permissive SELECT sibling on a client-readable, non-writable table is held by rls-smoke alone.
  - *Remedy.* Name C0 F2 in §7.1 and add one line to `known_limitations`.
- **N4, INFO.**
  - *What.* The policy helper probe's first rule reports five conditions: missing, SECURITY DEFINER, proconfig, owner and body. Its drift exercises only the body.
  - *Why INFO.* This meets the one-drift-per-raise convention, and the security definer probe has the same shape. I record it only so that no one reads it as five tested conditions.

## §4 Stop-the-line verdict

**No stop-the-line.** Nothing here is a live secret exposure, tenant leak, lost job, migration divergence, irreversible deletion or contract mismatch on the clean set:
- N1's leak needs a later migration that creates a schema and grants it to a client;
- N2 needs a later migration or drift written by someone who already runs SQL as the migration role.

**Nothing here blocks the Owner's merge.** CI run 37119566871 on head `55a1f72` is green, and `verify-branch-scope`, `check:handoff` and `npm run verify` exit 0 on the branch name. What remains before a merge:
- the A1 and Q0 re-checks of this round;
- the Integration Owner evidence gap already recorded in the blockers;
- the Owner's own decision on #166.

N1 and N2 can be taken in this PR or recorded on blocker 186 as owed. That is the Author's and the Owner's choice, not a precondition.

## §5 Limits

- I did not re-run A0's mutations (MA–ME), its V0–V3 / P1 drifts, D1–D6 or L1–L3. Where I rely on them they are **(A0's)**. In particular, I did not reproduce "MC + D7" (the pin loosened and the digest refreshed).
- I measured N2's effect on psql's encoding variable only. I built no end-to-end exploit through a multibyte encoding.
- I measured N1 with one view and one table in one new schema, and the leak with one table (`content_ideas`).
- I did not re-derive the probe digests or the 480 floor. The static suite holds them, and it passed.
- I share the Author's vendor and model family (RFC-2026-024).
- My private artefacts are in my private scratchpad directory `c0-127r2/` and are not in the repository: `cl.sh`, `drift.sh`, the drift files, `g1-leak.sql`, `enc.sql`, `lex.mjs`, `scan.mjs`, `cat.sql` and `cat.out`, the per-round logs, and the clone with its `vbs.log`, `handoff.log` and `verify.log`.
