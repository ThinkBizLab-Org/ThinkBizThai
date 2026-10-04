# C0 contract review re-check: batch rfc-026-static-rule's review round (RFC-2026-026 §8.1/1 and Q-026-10, still Proposed)

| Field | Value |
|---|---|
| Package | `WP-0A-DB-00` |
| Role | Independent Reviewer run `/claude/c0_contract_reviewer` |
| Subject | branch `agent/claude/WP-0A-DB-00-batch-rfc-026-static-rule`, head `2dc140c2cd3c31b08e162376dd1b0a802ca1f440` (handoff), evidence `bbfedbb`, code `9fd448b6d701155d46952a1e8d5cc940a60ca5b9`, base `dc6d481` (main); previous reviewed head `fb508e7`; PR [#180](https://github.com/ThinkBizLab-Org/ThinkBizThai/pull/180), Draft, OPEN, not merged |
| Author | `/claude/a0_atlas` |
| Reviewed in | local branch `recheck/c0-batch-rfc-026-static-rule`, created at `2dc140c` in my own worktree (`wf_33e0e53c-af4-6`). For the branch-NAME guards I checked `agent/claude/WP-0A-DB-00-batch-rfc-026-static-rule` out by name (`git checkout --ignore-other-worktrees`; the local ref and `origin` both at `2dc140c`), ran the three guards, committed nothing on it, and switched back. Nothing was pushed. |
| Scope | NARROW: my own findings C0-SR-1..8 first, then what the round's changes to §8.1/1, §3.7, Q-026-10 and §10.1 introduce, and the round's claims |
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

- **All eight of my findings are closed in the text** (§3.1). C0-SR-1 and C0-SR-2 are closed and I re-measured
  them on my own drift (R2): the new `pg_depend` arm selects the trigger `WHEN`, the domain default and the domain
  `CHECK`; (g)'s new reads see each one; and `query_to_xml` is named in the function the text-executing list
  refuses.
- **§8.1/1 is consistent, decidable and executable as written, with one harness gap left (C0-RR2-1, LOW).** The
  drifts now name `run.mjs`'s `selfTests` harness, and that matches `probeJobScript`/`decideCatalogProbes`
  (`run.mjs:2500-2580`). Drift 1b, the cited drifts 8, 11's policy arm, the PL and dblink shapes, and 20 are
  stated correctly for that harness. In that harness every drift must be refused by the rule's own raise, and a
  drift that passes fails the target (`run.mjs:2566`). Two things are therefore not expressible as `selfTests`:
  the two green **controls** (5b, and the first half of 13), and drift 12's "function **on the pinned reader
  list**", because a drift is SQL and cannot edit the list, which is empty today. This is the same class as
  C0-SR-3, one step further. The rule still matches batch 128's definer probe: extension members are read, for
  the same reason. It also matches the rewrite-rule probe: `_RETURN` only, on a view or materialized view. Two
  INFO items: "unless pinned" for an aggregate refers to a list the language rule does not declare (C0-RR2-2);
  and the round's statistics-object and window-function caveats can now be closed by measurement (C0-RR2-3).
- **Q-026-10's recommendation is clearly a recommendation**, and options (i)-(iii) are now costed honestly.
  The row says "A0's recommendation — a recommendation, NOT an answer" and "Q-026-10 stays UNANSWERED". The
  accepted Q-026-9 words are quoted verbatim, and I checked them against
  `product-owner-disposition-2026-10-03-batch-rfc-026-027.md:130`. (i)'s column and (ii)'s store are stated as
  new store questions that Q-026-9 did not decide. The "matches Q-026-9" reason is withdrawn. (iii)'s cost is
  stated as a loss of detection, conditional on §3.3's literal being executed.
- **Status lines still read Proposed, and no approval is recorded.** RFC-2026-026 line 3 reads "Proposed …
  NOT approved; NOT in effect", and the new `Revised:` line 9 says the same. RFC-2026-027 is not in the diff.
  The plan, the handoff and `open_blockers[195]`/`[197]` record no approval and no answer.
- **The claims I checked are true** (§2.2). These are the three commit messages, the cherry-pick map (each
  review byte-equal to its source), the blocker edits, the 90 digests and the handoff's file list.
- **Guards on the branch NAME** all exit 0: `verify-branch-scope` (11 paths), `check:handoff` and
  `npm run verify` (685/685). The required check `bootstrap` (run 37233876909) on `2dc140c` reports
  **success**.
- **There is no stop-the-line, and nothing I found blocks the merge of this Draft** (§4).

## 2. Measured vs read

### 2.1 Measured

Node `v24.20.0` (`node -v` printed before every measured run). PostgreSQL 17.11 from `/opt/homebrew/bin`. Port
5505 only, on 127.0.0.1, TCP only (`unix_socket_directories=''`). Each round used `initdb --locale=C -A trust -U
postgres`, `LC_ALL=C`, the shim first, and a fresh `initdb`. Scripts and logs are in my private dir
`c0-rfc-026-static-ruler2/`. Both clusters were stopped and their data directories removed, and nothing listens on
5505 afterwards. No other port was touched.

| # | Command | Where | Result |
|---|---|---|---|
| M1 | `node scripts/verify-branch-scope.mjs dc6d481 WP-0A-DB-00` | branch NAME at `2dc140c` | exit 0: "all 11 changed path(s) are declared, and every amendment explains one" |
| M2 | `npm run check:handoff` | branch NAME | exit 0: "describes the branch: nothing substantive after its cited head" (the handoff cites `bbfedbb`; `2dc140c` touches the handoff only) |
| M3 | `npm run verify` | branch NAME | exit 0: "clean: exit 0 — tests 685, pass 685, fail 0, skipped 0, todo 0" |
| M4 | `gh run view 37233876909`; `gh pr view 180` | — | `bootstrap` on `2dc140c`: completed, success. PR is Draft, OPEN, `mergedAt` null, head `2dc140c` |
| R1 | clean tree: `make db-migrate-clean`, a catalog census (`census.sql`), `make db-rls-smoke`, the census again | 5505 | migrate-clean 0 ("51 apply-time blocks, 39 re-run as written, 12 superseded"). rls-smoke 0 ("1087 isolation case(s) passed", "6 claim(s) discharged"). Within the `userObject` scope: after migrate-clean, `sql` 10, `plpgsql` 4 and `c` 36 (all pgcrypto members); after rls-smoke, `plpgsql` 8. **The language rule selects nothing.** `pg_extension` is `pgcrypto` and `plpgsql`, and the four foreign-data catalogs have 0 rows each, so **(h) is green**. There are no aggregates or window functions in scope, and no definition names `query_to_xml`, `ts_stat` or `ts_rewrite` |
| R2 | my `c2.sql` from the first review, appended to `140_audit.sql` (sha256 `2ac596bb…37149` before, and after restoring by copy; `git status` clean), then `make db-migrate-clean` and `r2q.sql` | 5505 | migrate-clean **exit 0**. **(b)'s `pg_depend` read** returns exactly `constraint s_dchk_check`, `trigger s_when on table s_t` and `type s_dom` as dependents of `public.s_producer(uuid)`, all `deptype n`, and nothing else. `s_qx`, a plpgsql function, records no dependency, as the text says. **(g)**: `pg_get_triggerdef` of `s_when` names the producer; `s_dom.typdefaultbin` deparses to `s_producer(NULL::uuid)`; the domain `CHECK` is found by `connamespace` with `conrelid = 0`. **(c)'s list**: `s_qx`'s definition names `query_to_xml` |
| R2b | the same cluster, in one rolled-back transaction | 5505 | an aggregate over the producer has `prokind a`, **`prolang internal`**, and `pg_get_functiondef` raises "is an aggregate function", as the text says. `create function … window language sql` and `… window language plpgsql` **are both accepted**. `create statistics … on (public.s_producer(null) is null), a` is accepted, and **`pg_depend` records `statistics object s_st` as dependent on the producer**. A publication row filter calling it is refused at creation: "User-defined or built-in mutable functions are not allowed" |
| R3 | blocker comparison by script (`blk.mjs`, `fb508e7` against `2dc140c`) | — | 197 → 198 entries; only indexes 195 and 197 differ. `[195]`'s old text is a strict prefix (31 443 → 34 725 chars), and `[197]` is new at the end. Only `ownership` and `open_blockers` changed. 459 → 460 lines. The only other changed line is a trailing comma on the former last entry; its string value is byte-equal |
| R4 | `git diff <source> <cherry-pick>` on each review file | — | 0 lines each: `6d0c27f`→`32adffc`, `c1e48a0`→`c033a29`, `1665deb`→`3df23a8`. Each carries "(cherry picked from commit …)" |

### 2.2 Read, and checked against the tree

- `git diff fb508e7..2dc140c` (8 files) and `git diff dc6d481..2dc140c` (11 files). The handoff's
  `files_added` (5) and `files_modified` (6) match the second.
- `scripts/db/run.mjs:485-487` (`userObject`), `:1970-1990` (`PG_CATALOG_GUARD_SQL`: refuses every
  `pg_cast` row at or above 16384, so **drift 20's citation is true**), `:2439-2444` (the guard's self-test
  drift creates two functions and a view and no cast: **true**), `:2480-2580` (`catalogProbeJobs`,
  `probeJobScript`, `decideCatalogProbes`: the job runs the drift, the guard, then the probe alone; it counts
  only P0001, the probe's own prefix, and every named object; a drift that passes fails, `:2566`).
- `scripts/db/psql-driver.mjs:449-450, :503-504` (`APPROVED_EXTENSIONS = ['pgcrypto']`,
  `REFUSED_LANGUAGES`, and the "can alias any built-in (a server-file function included)" text that
  `[197]` quotes: **true**).
- `/opt/homebrew/share/postgresql@17/extension/dblink--1.2.sql`: `dblink_connect_u` is `LANGUAGE C …
  SECURITY DEFINER`, so the citation of batch 128's extension-member rule for dblink is **true**.
- The commit messages of `9fd448b`, `bbfedbb` and `2dc140c` are **true** against the diff (`git show
  --stat`: 3, 1 and 1 files; 90 digests; only the RFC's digest changed in the integrity manifest).
- The plan's §6: the finding → change table matches the RFC text, line by line, for C0-SR-1..8.
- I did not re-run A0's s2-s6 or the A1 and Q0 drift files. I re-ran my own (R2).

## 3. Findings

### 3.1 My earlier findings

| id | was | now | evidence |
|---|---|---|---|
| C0-SR-1 | LOW | **closed** | (g) reads `tgqual` and `typdefaultbin` and scopes `pg_constraint` by `connamespace` (`RFC…:705-722`), and the catalog list at `:509-513` is extended. (b)'s `pg_depend` arm (`:619-635`) covers the same shapes by OID. R2 |
| C0-SR-2 | LOW | **closed** | (c)'s pinned text-executing list (`:653-664`), failing closed, with drift 17. R2. My `pg_proc` scan by name finds no other core function that runs a text argument as a query (the `*_to_tsquery` hits parse, they do not execute) |
| C0-SR-3 | LOW | **closed**, with a residue (C0-RR2-1) | the harness is named (`:742-754`). 1b needs no pin (`:756-760`). 8, 11's policy arm, 18's PL/dblink shapes and 20 are cited, not claimed, and (d) and (g)'s policy arm say they have no self-test of their own |
| C0-SR-4 | LOW | **closed** | the accepted words are quoted at `:320-325`, `:992` and `:1012`. (i)/(ii) are new store questions, and the reason is withdrawn |
| C0-SR-5 | INFO | **closed** | "dotted segment … (`kind.name.<hex>`)" (`:345-346`, `:992`) |
| C0-SR-6 | INFO | **closed** | no `BEGIN ATOMIC` producer, or the landing batch pins `md5(pg_get_functiondef(oid))`; (a) refuses a non-null `prosqlbody` meanwhile (`:601-605`) |
| C0-SR-7 | INFO | **closed** | the handoff's last `tests` row has no `exit_code` and points to the PR body |
| C0-SR-8 | INFO | **closed** | "zero to two each (`as_suspended_user` none)" (`:559-560`) |

### 3.2 New in this re-check

| id | grade | where | finding | remedy |
|---|---|---|---|---|
| C0-RR2-1 | LOW | `RFC-2026-026…md:742-754` against `:766-770`, `:784-787`, `:788-791`; `scripts/db/run.mjs:2560-2572` | **Three of the drifts the text lists cannot be `selfTests` in the harness it now names.** `decideCatalogProbes` counts a drift only when the probe refuses it with its own raise. A drift that passes is a failure ("its self-test … passed … a rule that cannot fail asserts nothing"). (1) **5b** and (2) **the first half of 13** are green *controls*, so as `selfTests` they would fail the target. (3) **Drift 12's** "function on the pinned reader list made `VOLATILE`" needs the drift to pin a reader. The text itself says a drift is SQL and cannot edit a JS list (`:749-750`), and the reader list is empty today. A volatile reader that is not on the list is refused by (a)'s naming arm, not by the reader rule, so the reader rule would have no self-test of its own. The same holds for drift 12's updatable-view half | Say where the controls are carried: 5b by the rule's "as built" job once the command half's producers are in the catalog, and 13's control by a unit test of the rule's decision function over a fixture definition (the lexer partition is pure JS), or by a function in the tree that has a non-lexing inner literal. For drift 12, either alter a reader that is pinned when one exists, or record the reader rule's self-test as owed until the reader list is non-empty. Append this to `open_blockers[195]`'s owed list |
| C0-RR2-2 | INFO | `RFC…:541-547`; `:665-666` | An aggregate, or a window function in `c`/`internal`, "fails closed under (c)'s language rule **unless pinned**". The language rule (`:665-666`) declares no pinned exemption list, though (c)'s `execute` part, (h) and `open_blockers[197]`'s probe each do. So "pinned" names no list | Give the language rule a pinned exemption list, empty today, in a diff a reviewer reads; or drop "unless pinned" |
| C0-RR2-3 | INFO | `RFC…:513-517`, `:546-547` | Two caveats can now be closed by measurement (R2b). (i) A **statistics object**'s expression calling a volatile producer is accepted, and `pg_depend` records it, so (b)'s read selects it; ANALYZE evaluates such expressions. A **publication** row filter cannot call a user-defined function at all. (ii) A window function **can** be created in `sql` and in `plpgsql`, so "read like any other function" is the case that occurs | Replace "neither was measured" and "not measured" with these results, or cite this file |
| C0-RR2-4 | INFO | `handoffs/WP-0A-DB-00-author-handoff.json:179-181` | The row "review round s2-s6 … the arms" carries `exit_code: 0` while its result says "the arms exit 1 each". The 0 is `migrate-clean`'s. That is true but ambiguous | Split it into two rows, or name which command the code belongs to |
| C0-RR2-5 | INFO (not this round) | `RFC…:3` | The Status line quotes the Owner's 2026-10-04 words as `เิาตามแนะนำ` (a stray vowel mark), not `เอาตามแนะนำ`. The typo is already present at `dc6d481`, so this round did not introduce it, but it is a misquote of the Owner's words | Correct the quotation in a later batch that touches the Status line |

## 4. Stop-the-line verdict

**No stop-the-line.**

- No secret, tenant leakage, duplicate side effect, lost job, migration divergence, irreversible deletion or
  contract mismatch is introduced. The round changes Proposed text, two blockers, evidence and the handoff.
  Nothing a database layer reads changed: `140_audit.sql`'s digest equals the base's, and `migrate-clean` and
  `rls-smoke` on the clean tree are green (R1).
- `open_blockers[197]` records a **present** gap: a migration that computes its statement text can create an
  `internal`/`c` function or a foreign table with every probe green. No migration in the tree does this, and
  doing it needs a migration written to evade the driver. That is a recorded, owned blocker, not an incident.
- C0-RR2-1..5 are LOW/INFO findings in Proposed text and the handoff. They are owed before RFC-2026-026's
  **approval**, not before this Draft's merge.

**Does anything block the merge?** Nothing I found. The required check on `2dc140c` is green (M4). Under 127 §6's
bar the merge still waits on the A1 and Q0 re-checks of this round reporting no stop-the-line. C0-RR2-1 (and the
INFO items, at the Author's discretion) should be appended to `open_blockers[195]`'s owed list in a later batch.

## 5. Limits

- I measured on macOS with PostgreSQL 17.11 and Node 24.20.0 only. My census and `r2q.sql` are private SQL, not
  the rule, which does not exist.
- I re-ran only my own drift (C0-SR-1's X1-X3 and C0-SR-2's X4). I did not re-run A1's r3/r7, Q0's q0-r3 or A0's
  `d-lang.sql`, and I did not measure (h) or the language rule on a drift. For those I rely on A0's s3-s6 and the
  reviewers' own records.
- I did not measure that ANALYZE actually calls a producer through a statistics object. I measured only that the
  object is accepted and that `pg_depend` records it.
- I did not search for further routes, such as a server-side program, `COPY … PROGRAM`, or untrusted procedural
  languages beyond those cited. The enumeration remains, as the text says, one a reviewer checks.
- The content of the Owner's chat answers is not in the tree. I rely on the dispositions as transcribed.
