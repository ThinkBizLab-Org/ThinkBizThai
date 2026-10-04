# C0 contract review: batch rfc-026-static-rule (RFC-2026-026 §8.1/1 and Q-026-10, still Proposed)

| Field | Value |
|---|---|
| Package | `WP-0A-DB-00` |
| Role | Independent Reviewer run `/claude/c0_contract_reviewer` |
| Subject | branch `agent/claude/WP-0A-DB-00-batch-rfc-026-static-rule`, head `fb508e7` (handoff), evidence `3c82044`, code `16b839b`, base `dc6d481` (main); PR [#180](https://github.com/ThinkBizLab-Org/ThinkBizThai/pull/180), Draft, OPEN |
| Author | `/claude/a0_atlas` |
| Reviewed in | local branch `review/c0-batch-rfc-026-static-rule`, created at `fb508e7` in my own worktree (`wf_33e0e53c-af4-2`). For the branch-NAME guards I checked `agent/claude/WP-0A-DB-00-batch-rfc-026-static-rule` out by name (`git checkout --ignore-other-worktrees`; the local ref and `origin` both at `fb508e7`), ran the three guards, committed nothing on it, and switched back. Nothing was pushed. |
| Status | Records findings. **Advances no status, approves nothing.** |

## 0. What I am

- I am a subagent **spawned by the Author run `/claude/a0_atlas`**, in a worktree and under a brief its workflow
  computed. I am the same vendor and model family as the Author and as every other reviewer of this package.
  `RFC-2026-024` withdrew the cross-vendor condition; it did not remove the correlated-blind-spot risk, and a reader
  should discount my agreement with the Author accordingly.
- This file is evidence. **Accepting it as the C0 role's signature is the Integration Owner's and the Product
  Owner's act**, not mine and not the Author's.
- I do not fix. I approve no RFC, no batch and no merge.

## 1. Answer

- **Still Proposed, nothing approved.** RFC-2026-026's Status line (line 3) still reads "Proposed … NOT approved; NOT
  in effect", and the new `Revised:` line (line 14) says the revision "approves nothing, and Q-026-10 stays
  unanswered". RFC-2026-027 is not in the diff. The disposition, plan, handoff and `open_blockers[195]` record no
  approval and no answer.
- **Q-026-10's recommendation is clearly a recommendation.** The row (line 835) says "A0's recommendation — a
  recommendation, NOT an answer" and "Q-026-10 stays UNANSWERED"; §3.7 (lines 336-346), §10's intro and §11 say the
  same, and §11 asks the reader to weigh that (iii) asks least of the proposer's own batch. Option (i)'s cost is
  now stated (C0-RR-2 closed) and (iii)'s cost is stated honestly ("a loss of detection, not of isolation").
  **One costing lean is not honest enough (C0-SR-4, LOW):** (i) and (ii) are priced as going "against Q-026-9's
  accepted 'no store change before G1'", but the words the Owner accepted were narrower — a nullable *cause*
  column.
- **§8.1/1 is now consistent with itself on the points the re-checks raised, decidable, and executable by the
  repository's lexer.** I re-measured the counts and the refusal partition independently (§2.1 M4-M5). It matches
  batch 128's definer probe (extension members read, for the same reason) and the rewrite-rule probe (`_RETURN` on
  a view or materialized view only). **It is not yet complete as written:** (g)'s list of stored expressions
  misses a trigger's `WHEN` and a domain's default, and (c) does not see the producer reached through
  `query_to_xml` with a computed name. I measured all three migrating clean and calling a stand-in producer at run
  time, with A0's own prototype green on them (C0-SR-1, C0-SR-2, LOW). So the new sentence at line 584, "no
  trigger, rule or expression reaches a producer", is false as written. The drifts that "assert another probe's
  message" do not fit the repository's self-test harness (C0-SR-3, LOW).
- **The claims I checked are true** (§2.2): the commit messages, the plan, the disposition, the blocker append (old
  text a strict prefix, the other 196 entries byte-equal, 459 lines both sides), the 90 digests, the 14/18/36
  counts, and the handoff's file list.
- **Guards on the branch NAME:** `verify-branch-scope` 0 (8 paths), `check:handoff` 0, `npm run verify` 0
  (685/685). The required check `bootstrap` (run 37230733209) on `fb508e7` is **success**.
- **No stop-the-line.** None of my findings blocks the merge of this Draft: they are Proposed text, owed before
  RFC-2026-026's **approval**, and should join `open_blockers[195]`'s owed list. Approval also still waits on
  Q-026-10, A1 and the Owner.

## 2. Measured vs read

### 2.1 Measured

Node `v24.20.0` (from `/Users/bank/.local/node-v24.20.0/bin`; `node -v` printed before every run). PostgreSQL 17.11
from `/opt/homebrew/bin`. Port 5505 only, on 127.0.0.1, TCP only (`unix_socket_directories=''`), `initdb
--locale=C -A trust -U postgres`, `LC_ALL=C`, the shim first, a fresh `initdb` every round. Logs and scripts are in
my private dir `c0-rfc-026-static-rule/`. Both clusters were stopped and their data directories removed. No other
port was touched.

| # | Command | Where | Result |
|---|---|---|---|
| M1 | `node scripts/verify-branch-scope.mjs dc6d481 WP-0A-DB-00` | branch NAME at `fb508e7` | exit 0: "all 8 changed path(s) are declared, and every amendment explains one" |
| M2 | `npm run check:handoff` | branch NAME | exit 0: "describes the branch: nothing substantive after its cited head" |
| M3 | `npm run verify` | branch NAME | exit 0: "clean: exit 0 — tests 685, pass 685, fail 0, skipped 0, todo 0" |
| M4 | round c1, clean tree: `make db-migrate-clean`, then `make db-rls-smoke`; my own catalog dump (`pg_get_functiondef` over the `userObject` scope) through `walkLevels` | 5505 | migrate-clean 0 ("51 apply-time blocks, 39 re-run as written, 12 superseded"); rls-smoke 0 ("1087 isolation case(s) passed", "6 claim(s) discharged"). After migrate-clean: 50 functions, **36 extension members (all `c`) and 14 others (`app` 9, `private` 4, `auth` 1)**. After rls-smoke: 54, `private` 8, so 18 others. No function has a refusal at level 0 or in its dollar-quoted body, and none reaches `beyond`. Each member has 1 inner refusal; `private.as_anonymous`/`as_service` have 2, `as_user` 1, `as_suspended_user` 0 |
| M5 | `pg_get_functiondef` of `extensions.digest(text, text)` | 5505 | ends `AS '$libdir/pgcrypto', $function$pg_digest$function$`: the file string is single-quoted (the inner refusal), and the dollar-quoted "body" of a `c` function is its symbol, which lexes cleanly. The refusal partition is decidable from `walkLevels`' `at` (a depth-1 level whose `at` is the start of the level-0 dollar token) |
| M6 | round c2: `c2.sql` appended to `140_audit.sql` (sha256 `2ac596bb…37149` before and after, restored by copy); `make db-migrate-clean` | 5505 | **exit 0**. The drift: a stand-in producer `public.s_producer(uuid)` writing a scratch table; X1 a trigger on `public.s_t` with `WHEN (public.s_producer(null) is null)` running a no-op function; X2 a domain `public.s_dom` with `default public.s_producer(null)`, used by a column with no default of its own; X3 a domain `CHECK` calling it; X4 `public.s_qx()` doing `perform pg_catalog.query_to_xml('select public.s_' \|\| 'producer(null)', true, false, '')` |
| M7 | A0's prototype (`rule.mjs`, copied from `a0-rfc-026-static-ruler/`, only the port and the lexer path changed), producer pinned `public.s_producer` | c2 | exit 1, but **only for X3** ("(g) … constraint -.s_dchk_check names s_producer"). (a), (b), (c), (e), (f) and (g) are green on X1, X2 and X4 |
| M8 | at run time on c2: `insert into public.s_t …`; `insert into public.s_dt (a) …`; `select public.s_qx()` | 5505 | the stand-in's sink counted 1, 2, 3: **each of X1, X2 and X4 called the producer** |
| M9 | in a rolled-back transaction: two `BEGIN ATOMIC` functions with different bodies; `md5(prosrc)` | 5505 | both `d41d8cd98f00b204e9800998ecf8427e`, `prosrc = ''` |
| M10 | blocker comparison by script (base manifest from `git show dc6d481:…`) | — | 197 entries both sides; only index 195 differs; the old text is a strict prefix (27 700 → 31 443 chars); only `ownership.branch`, `ownership.amends_without_owning` and `open_blockers` changed; 459 lines both sides |
| M11 | `gh run view 37230733209` | — | `bootstrap` on `fb508e7`: completed, success |

### 2.2 Read, and checked against the tree

- `scripts/db/run.mjs:485-487` (`NON_SYSTEM_SCHEMA`, `FIRST_NORMAL_OID`, `userObject`), `:952-1012` (the
  definer probe and batch 128's third rule), `:1933-1946` (`REWRITE_RULE_PROBE_SQL`), `:2481-2510`
  (`catalogProbeJobs`, `probeJobScript`), `:2561-2563` (`decideCatalogProbes`).
- `scripts/db/sql-lexer.mjs:447-468` (`nestedText`, `NESTED_DEPTH = 8`, `walkLevels` and its `at` and `beyond`).
- `db/foundation/migrations/140_audit.sql:583-617` (`app.security_events`' columns: none names a target workspace)
  and `:594` (the "A GRAMMAR and not a vocabulary" comment): **true**. `:598-599`: the `event_type` CHECK
  (C0-SR-5).
- `product-owner-disposition-2026-10-03-batch-rfc-026-027.md:130`, Q-026-9's accepted recommendation (C0-SR-4).
- Commit messages of `16b839b`, `3c82044` and `fb508e7`: **true**. `16b839b` touches the four code paths
  (`git show --stat`). `fb508e7`'s "dc6d481..3c82044 (2 added, 5 modified)" matches the handoff's file lists, and
  `8fc8af2` is an ancestor of `HEAD`. One overstatement: `16b839b`'s body says drift 1b is "reshaped so (a)'s own
  text refuses it", which holds only for the pinned form; the RFC and plan say so correctly.
- The plan's §1 table and §2 rounds agree with the RFC text and with A0's private logs, which I read for r3.
- The disposition: the Owner's words are quoted verbatim, read as covering the §8.1/1 text fixes only, and nothing
  is approved or answered. I cannot verify the content of A0's test-point summary, which is in chat and not in the
  tree.
- The plan's "verify-branch-scope at `16b839b`: 4 paths" is consistent with `git show --stat 16b839b`. I did not
  re-run it detached.

## 3. Findings

| id | grade | where | finding | remedy |
|---|---|---|---|---|
| C0-SR-1 | LOW | `RFC-2026-026…md:504-505`, `:584`, `:618-626` | **(g)'s list of stored expressions is incomplete.** It reads `pg_attrdef`, `pg_constraint`, `pg_policy` and `pg_index`. A trigger's `WHEN` (`pg_trigger.tgqual`) and a domain's default (`pg_type.typdefaultbin`) are also stored expressions that run on a write with no trigger function naming anything. Measured (M6-M8): both migrate clean, both call the stand-in producer on an ordinary `INSERT`, and A0's prototype is green on both. (e) reads only the trigger's function. The text also does not say how a domain `CHECK` (`conrelid = 0`) is placed in "the same scope"; A0's prototype caught X3 only because its `pg_constraint` read is not scoped by relation. So line 584's "no trigger, rule or expression reaches a producer" is false as written | Add `pg_trigger.tgqual` and `pg_type.typdefaultbin` to (g) and to the catalog list at line 504. Scope a domain constraint by its type's namespace and OID. Add drifts for each to 11. Or state (g) as every stored expression in the scope and list the catalogs as an enumeration that a reviewer checks |
| C0-SR-2 | LOW | `RFC-2026-026…md:587-595` | **(c) does not keep (b) decidable.** A core function executes SQL text without an `execute` token. `perform pg_catalog.query_to_xml('select public.s_' \|\| 'producer(null)', …)` has neither an `execute` token nor the producer's name at any level. It migrated clean, A0's prototype is green, and it called the producer (M6-M8, X4). `query_to_xml` runs read-only SPI, so a direct write through it is refused, but a `SELECT` of a volatile producer is not. Line 594's "this rule is what keeps them decidable" therefore does not hold | Have (c) also refuse a call to any function that executes its text argument (in core: the `query_to_xml` family, `query_to_xmlschema`, `query_to_xml_and_xmlschema`, `ts_stat`; and any such extension function when an extension is added), as a pinned list that fails closed, with a drift. Or refuse every non-constant text argument to such a function |
| C0-SR-3 | LOW | `RFC-2026-026…md:629-641`, `:654`, `:660-661` | **The drifts that assert another probe's message do not fit the repository's self-test harness.** Under `run.mjs`'s convention, a probe's self-test job runs only the drift, the `pg_catalog` guard and **that probe** (`probeJobScript`, `run.mjs:2500-2510`). The job counts a refusal only if it begins with that probe's own `raises` (`run.mjs:2563`). A drift is SQL and cannot edit `SECURITY_DEFINER_FUNCTIONS`. So "1b is refused first by the SECURITY DEFINER probe … the self-test's drift also pins that function" and "without the pin, 1b asserts the probe's message, as drift 8 does" hold only in the working-tree / `migrate-clean` harness the preamble names (line 629). That is how A0 measured r2 and r4. In a `selfTests` job, unpinned 1b reaches (a) alone, and (a) refuses it by its own text. Drifts 8 and 11's policy arm cannot be self-tests of this rule there; they are the existing probes' own | Name the harness the rule's self-tests use. If it is `run.mjs` `selfTests` (the convention batch 126/128's probes follow), 1b needs no pin and asserts (a)'s text, and drifts 8 and 11's policy arm are cited as the trigger, policy helper and policy set probes' existing self-tests, not as this rule's |
| C0-SR-4 | LOW | `RFC-2026-026…md:338-339`, `:835`; source `:855` | **The cost of options (i) and (ii) leans on a broader paraphrase of the Owner's accepted answer.** The text prices (i)'s column and (ii)'s store as "against Q-026-9's accepted 'no store change before G1'", and makes that the main reason for (iii). The recommendation the Owner accepted says "**A forward migration adding a nullable cause column is not recommended before G1**" (`product-owner-disposition-2026-10-03-batch-rfc-026-027.md:130`). "No store change before G1" is A0's own summary in §10.1 (line 855, from `cdf6774`). A column naming the attempted workspace was never put to the Owner. The recommendation is still clearly marked as one, and I do not grade that part | Quote the accepted words. State that (i)'s column and (ii)'s store are new store questions that Q-026-9 did not decide, and price them on their merits (the forward migration, its ERD §9.1 classification, its owner). Keep (iii) as the recommendation if A0 still holds it |
| C0-SR-5 | INFO | `RFC-2026-026…md:340`, `:835`; `140_audit.sql:598-599` | "the id written into `event_type` as 32 hex digits … which the CHECK's grammar admits": the CHECK is `^[a-z0-9_]+(\.[a-z0-9_]+)+$`, which needs at least one dot. A bare 32-hex id is refused; it is admitted only as a segment (`kind.name.<hex>`) | Say "as a dotted segment of `event_type`" |
| C0-SR-6 | INFO | `RFC-2026-026…md:569`; `run.mjs:981` | (a) pins each producer in `SECURITY_DEFINER_FUNCTIONS` "so the SECURITY DEFINER probe and (a) agree". The probe pins a body as `md5(prosrc)`, and an SQL-standard body has an empty `prosrc`: two different `BEGIN ATOMIC` bodies share one digest (M9). A producer written that way would have no body pin. This is not this batch's code | In §8.1/1 or §9, require that a producer is not an SQL-standard body, or have the landing batch digest `pg_get_functiondef` or `prosqlbody` in the probe |
| C0-SR-7 | INFO | `handoffs/WP-0A-DB-00-author-handoff.json`, `tests`, last row | The last row records `exit_code: 0` for commands "run after this handoff's commit". A handoff cannot record the outcome of a run that came after it. The values are true (M1-M3) and the PR body carries them, so C0-RR-5's circularity is closed; this is a forward claim, not a false one | Record such a row without an exit code ("see PR body"), or leave it out |
| C0-SR-8 | INFO | `RFC-2026-026…md:535` | "`rls-smoke`'s `private.as_*` helpers give one or two each": there are four, and `as_suspended_user` gives none (M4) | "zero to two each" |

## 4. Stop-the-line verdict

**No stop-the-line.**

- No secret, tenant leakage, duplicate side effect, lost job, migration divergence, irreversible deletion or
  contract mismatch is introduced.
- The batch changes Proposed text, the branch slot, an appended blocker and evidence. Nothing a database layer
  reads changed.
- The gaps in C0-SR-1 and C0-SR-2 are in a rule that does not exist yet and enforces nothing today. They are owed
  before RFC-2026-026's approval, as `open_blockers[195]` already holds the rule itself.

**Does anything block the merge?** Nothing I found. The required check on `fb508e7` is green (M11). Under 127 §6's
bar, the merge still waits on the A1 and Q0 runs of this branch reporting no stop-the-line. C0-SR-1..4 should be
appended to `open_blockers[195]`'s "owed before approval" list, by A0 in a later batch, or by whoever carries this
file in.

## 5. Limits

- I measured on macOS with PostgreSQL 17.11 and Node 24.20.0 only. I used A0's prototype, not the rule, which does
  not exist. My own dump and lexer script are private and are not the rule.
- C0-SR-1 and C0-SR-2 were measured with a stand-in producer writing a scratch table, not `app.audit_logs`, and not
  `SECURITY DEFINER`, because an unpinned definer fails the definer probe first. The paths are what the finding is
  about. I did not measure X1-X4 as `app_command`.
- I did not look for every other stored-expression or text-executing path. Statistics-object expressions,
  publication row filters and extension functions are unexamined. C0-SR-1 and C0-SR-2 are what I found, not a
  proof that nothing else exists.
- I did not re-run A0's rounds r2-r4. I read their logs for r3.
- The content of A0's test-point summary, which the Owner's `เอาตามแนะนำ` answered, is not in the tree. I take its
  description from the disposition.
