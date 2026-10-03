# Q0 re-check: batch 127's review round (PR #166)

- **Package:** `WP-0A-DB-00`. **Role:** Independent Tester, run `/claude/q0_sentinel`. Narrow re-check.
- **Subject:** branch `agent/claude/WP-0A-DB-00-batch-127`
  (<https://github.com/ThinkBizLab-Org/ThinkBizThai/pull/166>). Head `55a1f72` (handoff alone) over the record
  `dc5a7ce` and the code `610b2d3`. Previous reviewed head `75dae71`, base `3f80599`. Author `/claude/a0_atlas`.
- **Checked out:** the head `55a1f72e00b08c01c7ba8151dbd04965cbdc4a21` on my own branch `recheck/q0-batch-127-r2`.
  Every command that reads the branch name, and every drift and mutation, ran in a private clone at `55a1f72`
  on a local branch named `agent/claude/WP-0A-DB-00-batch-127`. That name is checked out in another worktree.
- **My earlier record:** `q0-batch-127-test-review-2026-10-03.md` (F1, F2 on `75dae71`).
- **Status:** this file records findings. It advances no status, approves nothing and fixes nothing.

## 0. What I am

I am a subagent of `/claude/a0_atlas`, the Author's own workflow. I am the same vendor and model family as
the Author (RFC-2026-024). I am independent of the Author's run, but not of its vendor or its orchestration.
So this record is evidence for the Tester role. It is not that role's signature. Accepting it as the
signature is the act of the Integration Owner and the Product Owner.

## 1. Measured vs read

**Setup:** PostgreSQL 17 at /opt/homebrew/bin; `initdb --locale=C -A trust -U postgres`; 127.0.0.1:5503 only,
TCP only (`-c unix_socket_directories=''`); `LC_ALL=C`; `db/foundation/ci/supabase-shim.sql` first; Node
`v24.20.0`, checked before every measured run. Each round ran a fresh initdb, then `make db-migrate-clean`
(mc), `make db-schema-lint` (sl, which CI runs after mc) and `make db-rls-smoke` (rs). 80 rounds in all.
static = `node --test test-kits/db/foundation-contract.test.mjs tests/db/identity/identity-isolation.test.mjs`
with the drift or mutation in place (88 runs). Each drift was appended to `140_audit.sql` from a saved copy
(sha1 `2ac2fc2c592b…`). Each code mutation was applied to saved copies of `run.mjs`, `psql-driver.mjs`, the
foundation-contract test and `isolation-cases.mjs`. "Digests refreshed" means I recomputed the probe digests
the way the test does and wrote them into the test. Every file was restored and compared byte for byte
(`cmp`) after every round, every time `ok`. The private clone's `git status` is clean at the end.

| Command (on the branch name, at `55a1f72`) | Exit | Output |
|---|---|---|
| `npm run check:handoff` | 0 | "describes the branch: nothing substantive after its cited head" |
| `node scripts/verify-branch-scope.mjs 3f80599 WP-0A-DB-00` | 0 | "all 28 changed path(s) are declared, and every amendment explains one" |
| `npm run verify` | 0 | "clean: exit 0 — tests 677, pass 677, fail 0, skipped 0, todo 0" |
| `make db-migrate-clean` (baseline) | 0 | the ceiling probe plus 21 catalog probes, each refusing its drifts and clean again; post-migrate 49 blocks, 37 as written, 12 replaced |
| `make db-rls-smoke` (baseline) | 0 | 1078 isolation cases passed |
| `gh pr view 166`; `gh run view 37119566871` | -- | Draft, OPEN, head `55a1f72`; check `bootstrap` SUCCESS; run 37119566871 completed **success** on `55a1f72` at 11:31:39Z. A0's "not done" item 1 is now answered. |
| `git range-diff` source vs cherry-pick | -- | `a86c9ff`→`8902322`, `eea39f3`→`474a579`, `2f97b5e`→`e97b168`, `a5a5eea`→`6e94078`: only the `(cherry picked from …)` line differs |
| `git show --stat 55a1f72` | -- | the handoff alone; `head_revision_or_patch_checksum` = `dc5a7ce…` |

**Catalog, measured on the clean set:** `authenticated` has USAGE on `app` and `public` only, and `anon` on
`public` only. Neither has CREATE anywhere. **No role grants membership to `anon` or `authenticated`.** All
roles but `postgres` are NOINHERIT. Policies call exactly `auth.uid()`, the pinned definer lookups and the five
`member_scope_*` helpers. There are 33 `*_scope_narrow*` policies, all FOR ALL and all TO authenticated. Five
permissive own-row UPDATE policies use `auth.uid()`: `user_profiles_update_own`,
`notifications_update_own_read_state`, and the owner policies on workspaces, workspace_settings and
workspace_invitations. No `.sql` file under `db/` or `tests/` (87 files) contains `U&"` or `U&'`.

**Read, not measured:** plan §7's text beyond the claims tested below; the README; blocker 186 beyond the
REVIEW ROUND paragraph's claims; A0's D1–D6, L1–L3 and M1–M4 (not re-run by A0 either, as A0 says); any
lexer-bypass payload beyond an encoding change (I built no shell-escape payload).

## 2. My F1 and F2, re-run, per layer

| Id | Drift / mutation | static | mc | sl | rs | Verdict |
|---|---|---|---|---|---|---|
| **F1** (as filed) | `create view app.q0_ideas_v as select * from app.content_ideas; grant select, insert … to authenticated` | **1** | **2**: rule 2 names `app.q0_ideas_v` | **2** ("is not security_invoker — §8.5") | 0 | **Closed for `app`.** Held by three layers. |
| F1, correction to my record | the same drift on `75dae71` (read from that tree) | -- | -- | -- | -- | At `75dae71` this drift was **already held statically**: by identity-isolation's "no migration creates a view" (`/create\s+(?:or\s+replace\s+)?view\b/i`, present at `75dae71`) and by schema-lint's §8.5 text rule. My F1 reported only mc and rs. Its exploit stands, but "every layer green" was true only of the live layers. Both static guards read the migration's TEXT. |
| F1-af | the same view in `app`, built by an invoker function (`execute format('create %s …', 'view')`) and the function dropped | **0** | **2**: rule 2 names it | 0 | 0 | The text rules miss it. **Rule 2 alone holds it.** |
| F1-rv | `create recursive view app.q0_ideas_rv …`, SELECT to authenticated | **0** | **2**: rule 2 | 0 | 0 | As F1-af: held by rule 2 alone. |
| **F1-sf** | `create schema q0api; grant usage … to authenticated`; the view built by an invoker function; SELECT and INSERT granted | **0** | **0** | **0** | **0** (1078) | **Passes every layer: N1.** Exploit, measured and rolled back: a user who belongs to no workspace read every workspace's ideas through `q0api.ideas` (3 rows: both fixture workspaces' and a third workspace's), while a direct read returned 0. They then inserted a row into another workspace with `created_by` set to a third uuid, and it persisted. The same insert into the table was refused by RLS. |
| F1-s / F1-srv | the same, with a plain `create view` / a `create recursive view` in `q0api` | 1 / **0** | 0 / 0 | 0 / 0 | 0 / 0 | The plain spelling is held by the text rule alone. The recursive one (read-only) passes every layer. |
| F1-r | the view in `app` granted to a new role `q0_r`, and `grant q0_r to authenticated` | 1 | **0** | 2 | 0 | Rule 2 misses it. With rolinherit off, `has_*_privilege('authenticated', …)` is false, but SET ROLE is allowed. Held here only by the view text rules (see N2). |
| **F2** (P1 + D7) | `PERMISSIVE_POLICIES['user_profiles.user_profiles_update_own']` set to `true`/`true`, digests refreshed, plus `alter policy … using (true) with check (true)` in 140 | **0** | **0** | 0 | **2**: exactly `user-a-cannot-update-user-b-profile` ("1 row(s) were visible") | **Closed for user_profiles.** D7 alone: mc 2 and rs 2. |
| S1 + P1 + D7 | as above, and the new case's `having count(*) > 1` loosened to `> 100` | 0 | 0 | 0 | **2**: the witness ("display_name is 'renamed by another user'") | The case's witness holds even when its count is weakened. |
| **P5 + DP5** | the same class on `notifications_update_own_read_state`: pin and later file, the `user_id` half removed from both halves, digests refreshed | **0** | **0** | **0** | **0** (1078) | **Passes every layer: N3** (F2's class, another table). Measured, rolled back: owner A's bare `update app.notifications set read_at = now()` wrote 3 rows, marking two teammates' notifications read. DP5 alone: mc 2 (permissive probe). With only USING widened, the WITH CHECK `user_id = auth.uid()` still refused the write. |

## 3. Each new rule, weakened in code and in a later file

Exit codes as returned (2 = failed).

### 3a. Client privilege probe

| Id | Mutation (code, digests refreshed) / drift | static | mc | sl | rs | Verdict |
|---|---|---|---|---|---|---|
| R1d / R1m | drift: `grant truncate` / `grant maintain on app.content_ideas to authenticated` | 0 | **2**, named | 0 | 0 | Rule 1 holds both. |
| R1c | code: a line `and c.relname <> 'content_ideas'` added to the `rels` CTE; drift R1d | **0** | **0** | 0 | 0 | Passes every layer. The static pin reads the `where` line and then `[\s\S]*`, so an added line is unread. The digest is the only signal. |
| R1v | code: `… as p limit 3` (MAINTAIN dropped; the static regex's prefix is intact); drift R1m | **0** | **0** | 0 | 0 | Passes every layer. **Rule 1's self-test drift grants TRUNCATE, REFERENCES and TRIGGER but never MAINTAIN**, so a probe that stops reading MAINTAIN still passes its own self-test (N6). |
| R1w | code: the version gate `>= 170000` moved to `>= 180000` | **1** | -- | -- | -- | Held statically. |
| **R1r** | drift: `create role q0_t; grant truncate on app.content_ideas to q0_t; grant q0_t to authenticated` | 0 | **0** | 0 | 0 | **Passes every layer: N2.** Measured, rolled back: `has_table_privilege('authenticated', …, 'TRUNCATE')` = f, `pg_has_role(…, 'SET')` = t. As authenticated, `truncate` was refused; after `set role q0_t` it emptied every workspace's ideas (2 → 0). |
| **R0** | drift: `grant postgres to authenticated` | 0 | **0** | 0 | 0 | **Passes every layer: N2.** Measured, rolled back: an authenticated session ran `set role postgres` and became superuser (`is_superuser = on`). |

### 3b. Rule 2 (views) and rule 3 (tables in private and public)

| Id | Mutation / drift | static | mc | sl | rs | Verdict |
|---|---|---|---|---|---|---|
| R2c + F1 | code: `and c.relname !~ '^q0_'` on rule 2's FROM line (unpinned by static); drift F1 | 1 (view text rules) | **0** | 2 | 0 | Held only by the text rules. |
| **R2c + F1-af** | the same code; the function-built view in `app` | **0** | **0** | **0** | **0** | Passes every layer. The digest is the only signal. |
| R2p + F1 | code: `CLIENT_VIEWS` pins `app.q0_ideas_v` | **1** (allowlists must be empty) | **2** (not security_invoker) | 2 | 0 | Held. |
| R3p | drift: `public.q0_pub`, SELECT and INSERT to authenticated | 0 | **2**, named | 0 | 0 | Rule 3 holds it. |
| R3n + R3p | code: `public` removed from rule 3's schema list | **1** | **2** (self-test drift 3 not named) | 0 | 0 | Held by static and the self-test. |
| R3c + R3p | code: `and c.relname !~ '^q0_'` on rule 3's FROM line | **0** | **0** | 0 | 0 | Passes every layer; digest only. |
| **R3s** | drift: `create schema q0x; grant usage …`; a table there with all four DML grants to authenticated | 0 | **0** | 0 | 0 | Passes every layer (N1): rule 3 reads `private` and `public` only. |

### 3c. Policy helper probe

| Id | Mutation / drift | static | mc | sl | rs | Verdict |
|---|---|---|---|---|---|---|
| H1 | drift: `member_scope_covers_business` → `select true` | 0 | **2**, named "[body differs…]" | 0 | **2**: 40 | Held by mc and rs. |
| H1 + pin | code: the helper's digest set to md5 of ` select true `, plus drift H1 | 0 | **2**: the self-test drift 1 now "passed" | 0 | 2: 40 | Held by mc only by coincidence: my gutted body equals the self-test's. |
| **H1b + pin** | the same with ` select workspace is not null ` and its digest | **0** | **0** | 0 | **2**: 40 | Held by rs alone. This is the X1 situation with the pin moved in code. |
| H2 | code: the called-function rule restricted to `n.nspname = 'app'`; drift: a policy calls `public.q0_member(…)` | **1** | 2 (by 121's apply-time block, not the probe) | 0 | 0 | Held statically. |
| H2e | drift: `approval_events_select_active_member` calls `public.q0_member(…)` directly | 0 | **2**: "not pinned by body: public.q0_member" | 0 | 0 | The called-function rule holds a direct call. |
| **H3c** | drift: the same function reached through `create operator public.=== (… function = public.q0_member)`; the policy `using (workspace_id OPERATOR(public.===) workspace_id)` | 0 | **0** | 0 | 0 | **Passes every layer (N5).** `pg_depend` records the operator, not its function, so "every function a policy calls is pinned" does not hold. |
| H3d | the same with the function returning `true` | 0 | **0** | 0 | 0 | Every layer green. Measured, rolled back: a stranger still read **0** approval_events rows (3 exist), because the narrowing's EXISTS on its parent applies under the parent's RLS. Not exploitable on this table. On performance_snapshots the same drift is caught by 121's block (H3a: mc 2). |

### 3d. The 31 narrowings pinned by deparse

| Id | Mutation / drift | static | mc | rs | Verdict |
|---|---|---|---|---|---|
| NW-* (33 rounds) | drift: each of the 33 narrowings, both halves `(X) OR true` | 0 | **2 on 33 of 33**, each named by the pinned policy probe | 2 on 29; **0 on 4**: content_ideas, publish_target_assets, research_evidence, research_suggestions | Every later-file weakening is held by mc. |
| N2 | drift: `drop policy research_evidence_scope_narrows_member` | 1 | **2**, named | 0 | Held. |
| N1 + pin | code + drift on quota_buckets, digests refreshed | 0 | 0 | **2**: 1 | Held by rs. |
| **NWC research_evidence** | code: the pin rewritten to the measured weakened deparse, digests refreshed; plus the drift | **0** | **0** | **0** | **Passes every layer (N4).** The static check "calls a pinned helper or reads a parent table" matches `FROM app.research_sources ` with `OR true` appended. rs is silent because the fixture has no research_evidence row outside a narrowed member's scope: the only workspace A row is under business a1, which every narrowed fixture member covers (measured). Exploit not built. |

### 3e. The rls-smoke case and the SET NAMES rule

| Id | Mutation / drift | static | mc | rs | Verdict |
|---|---|---|---|---|---|
| S1 | see section 2: the count weakened; the witness holds | -- | -- | 2 | Held. |
| L1 | code: `SET_NAMES` narrowed to whitespace only (no comment between the words) | **1** | -- | -- | Held statically. |
| L1 + LN | the same, with a DO-body `execute 'set names ''UTF8'''` | 1 | 2 (refused before applying) | 2 (nothing applied) | Held. |
| LS (control) | `set client_encoding to 'SJIS'` | 1 | **2**, refused at 140 line 1019 | -- | Held. |
| **LU1** | `set U&"client\005fencoding" to 'SJIS';` | **0** | **0** | **0** | **Passes every layer (N7).** `psqlLex` reports 0 meta-commands. In a standalone psql on my cluster, `:ENCODING` went from SQL_ASCII to **SJIS** after this statement. |
| **LU2** | `set U&"standard\005fconforming\005fstrings" to off;` | **0** | **0** | **0** | Passes every layer. In psql, `standard_conforming_strings` became `off`. The name is spelled statically, not computed, so this falls outside the limit plan §7.4.1 and the driver comment state. |

## 4. Are the claims true?

- **Cherry-picks** are unchanged. The handoff commit touches the handoff alone and cites `dc5a7ce`.
  `check:handoff`, branch scope and `npm run verify` exit 0 on the branch name. CI is green on `55a1f72`.
- **Plan §7.3** (A0's table): every row I re-ran in its shape reproduced. X6 ran as R1d, V2 as F1, P1 as R3p,
  X1 as H1 (rs 40), X2b and X2c as NW-industry_assignments and NW-content_items (rs 1 and 3), and D7 and MC+D7
  as D7 and P1+D7. I did not re-run V1, V3 or V0. My static for F1 is 1 because of identity-isolation's view
  rule; A0's static column reads foundation-contract alone.
- **"Fail closed" (code comment, README, blocker 186 (a)):** true for **direct** grants in `app`, `private` and
  `public`. False via membership: R1r and R0 pass every layer, R0 to superuser. False via a new schema:
  F1-sf and R3s pass every layer. Plan §7.4 lists neither.
- **"Every function a policy calls must be pinned" (blocker 186 (c), README):** false for a function reached
  through an operator (H3c).
- **"Q0 F2 closed":** true for `user_profiles`. The class it named is still open on
  `notifications_update_own_read_state` (P5+DP5). My F2 remedy asked for "a case per user-scoped UPDATE
  policy without one, starting with user_profiles". Only the start was taken.
- **"The other thirty-one narrowings pinned … now fails it by name":** true. Every later-file weakening (33 of
  33) fails mc by name. A weakening in code plus a later file passes on 4 tables (N4, F2's class).
- **SET NAMES anywhere:** true for the shapes stated (L1, LN, the static shapes). The stated limit
  ("computed at run time") is too narrow: `U&` identifiers are static spellings (N7).
- **Floor 464 → 480, digests, manifest:** consistent. `npm run verify` is green with them.

## 5. Findings

| Id | Grade | Finding | Remedy |
|---|---|---|---|
| N2 | **MEDIUM** (latent: nothing live, since the clean set grants no role to a client; one later line; not introduced by 127) | **A client role made a member of another role passes every layer**, and every client privilege rule reads `has_*_privilege`, which follows only inherited privileges. `anon` and `authenticated` are NOINHERIT, so a plain `grant r to authenticated` gives SET without inheritance. R1r: TRUNCATE of every workspace's rows after `set role`. **R0: `grant postgres to authenticated` gives a client session superuser**, with static, mc, sl and rs all 0. | One rule with its own drift: `anon` and `authenticated` are members of no role (`pg_auth_members.member`), or of exactly a pinned list; PUBLIC cannot be a member. |
| N1 | LOW (later-edit hazard; nothing live; F1's residual) | **The client privilege rules read three schemas, and a client can be given USAGE on a fourth.** F1-sf: a function-built view in a new schema lets a stranger read every workspace's ideas and insert a forged-creator row into another workspace, with every layer green. F1-srv (recursive view) and R3s (a plain table) also pass. The static view guards read migration text, and a function-built or `recursive` view escapes them. | Read every schema a client role has USAGE on, not a fixed list. Or add a rule: no client role holds USAGE on any schema but `app` and `public`. Either needs one drift. |
| N3 | LOW (F2's class; within a workspace) | **`notifications_update_own_read_state` widened in its pin and in a later file passes every layer.** Owner A marked two teammates' notifications read (measured). No rls-smoke case runs a bare cross-user UPDATE there. | A case like `user-a-cannot-update-user-b-profile` for notifications, with a bare UPDATE and a teammate's `read_at` as witness. Also check the three owner-UPDATE policies. |
| N4 | LOW (F2's class; member scope within a workspace) | **A narrowing weakened in its pin and in a later file passes every layer on four tables**: content_ideas, publish_target_assets, research_evidence and research_suggestions (rs 0 on the later-file round; research_evidence measured through every layer). The static per-narrowing check is a prefix-or-substring match, so `… OR true` satisfies it. | Either a static rule that no pinned narrowing contains a disjunct `OR true` (or any constant-true branch), or rls-smoke fixtures and cases for those four tables: a narrowed member, a row outside the scope, and zero rows seen. |
| N5 | INFO | **The policy helper probe's called-function rule does not see a function behind an operator** (H3c, H3d: mc 0). Measured harmless on approval_events because of the parent EXISTS. The deparse pins already hold this on client-writable tables. | Add to the rule `pg_depend` rows with `refclassid = pg_operator`, mapped to `oprcode`. Or refuse any non-`pg_catalog` operator a policy depends on. |
| N6 | INFO | **Rule 1 has no self-test drift for MAINTAIN** (R1v: a probe that stops reading MAINTAIN passes its self-test, static and mc). Code mutations on unpinned lines of rules 1–3 (R1c, R2c, R3c) pass static; the digest is their only signal, by design. | Add MAINTAIN to rule 1's drift, named. Optionally pin each rule's whole SELECT text statically. |
| N7 | LOW (same class as C0 F6 on 127) | **A Unicode-escaped identifier changes psql's encoding, or `standard_conforming_strings`, with every layer green** (LU1, LU2). psqlLex reports nothing, and psql moved to SJIS and to scs off (measured). The limit as written (computed at run time) does not cover a static `U&` spelling. | A byte rule: refuse `U&"` and `U&'` (any case) anywhere. Measured: 0 of the 87 `.sql` files contain either, so nothing integrated is refused. Reword the limit. |
| N8 | INFO | **Correction to my own F1 on `75dae71`:** its plain `create view` drift was held by two static text rules there, which my record omitted (section 2). | None for A0. Recorded here. |

**Nothing found in 127's migration, closures or cases.** F1 as filed is closed for `app`, held by mc, sl and
static. F2 as filed is closed for `user_profiles`, held by rs, and the case's witness survives a weakened
count. Every later-file weakening of a narrowing, a helper body, a view, a TRUNCATE-class grant and a
non-app table is named by mc.

## 6. Stop-the-line verdict, and the Owner's merge

**No stop-the-line.** Every finding needs a later migration, and N3, N4 and N6's code halves also need an
edit to a pin. None is reachable on the clean set. Measured there: no client role is a member of any role,
clients have USAGE on `app` and `public` only, and no view, matview, foreign table or `U&` spelling exists.

**Nothing in this file blocks the Owner's merge of #166.** The required check is green on `55a1f72` (run
37119566871). N2 is graded MEDIUM because of its ceiling (superuser). It is latent and pre-existing, 127
neither introduced nor widened it, and one probe rule closes it. I would take it with N1 in the next
increment. That is a recommendation, not a condition. The C0 and A1 re-checks, the Integration Owner
evidence and the Owner's own decision (RFC-2026-025 §5) are outside this file.

## 7. Limits

- I did not re-run A0's D1–D6, L1–L3 or M1–M4, my own 57 closure rounds, or the CI negative control from my
  first record. This is a narrow re-check of the review round.
- I built no shell-escape or lexer-desync payload. LU1 and LU2 show the encoding and scs change in a
  standalone psql, and in mc only that the statement is fed unrefused. What follows from a desync was not
  measured here.
- The N4 exploit was not built: the fixture has no row outside a narrowed member's scope on those tables.
  The verdict is per layer only. N3's and N2's exploits were measured, on my own cluster, inside rolled-back
  transactions.
- The static layer here is two test files. `npm run verify` (all suites) ran only on the unmutated head.
- My earlier record's F1 omitted the static and schema-lint layers (N8).
- My cluster (port 5503) was stopped and its data directory removed. No other port was touched. Private
  artefacts (scripts `round.sh`, `drift.sh`, `mut.sh`, `mutate.mjs`, `refresh.mjs`, `narrow.mjs`, `nw.sh`,
  `nloop.sh`, `lex.mjs`; drift files; `x_*.sql` exploits; per-round logs) are in
  `/private/tmp/claude-501/-Users-bank-ThinkBizThai/27edf3de-b1b4-4cfe-a757-7d17332ec256/scratchpad/q0-127r2/`,
  not in the repository.
