# A1 security re-check: batch 141's review round (head 8fe0c31 over code 3c50ba8)

- **Package:** `WP-0A-DB-00`. **Role:** independent Security/Privacy reviewer, run `/claude/a1_bastion`.
- **Subject:** branch `agent/claude/WP-0A-DB-00-batch-141` (PR #183, Draft, OPEN, not merged; required check
  `bootstrap` IN_PROGRESS on the head when read at the end of this run), head `8fe0c31`
  (`8fe0c3137f4d793e64c1e0181d8d623b4878967d`) over code `3c50ba8` (`3c50ba87f1f95d35db56cab5b004e0a44ea94f9a`),
  base `e92b896` (main). Author `/claude/a0_atlas`. Previous reviewed head `ad97cde`; my earlier record is
  `a1-batch-141-security-review-2026-10-03.md` (cherry-picked into the branch as `20ae784`).
- **Scope:** NARROW. The review round's corrections (`git diff ad97cde..8fe0c31`, 18 paths), my own findings F1-F5
  first, then the questions asked, re-measured on fresh clusters.
- **Checked out as:** local branch `recheck/a1-batch-141` at `8fe0c31`, in this run's own worktree
  (`wf_ddbaaead-e61-7`). For `verify-branch-scope`, `check:handoff` and `verify` I checked out the branch NAME
  `agent/claude/WP-0A-DB-00-batch-141` in the same worktree (`--ignore-other-worktrees`; `git rev-parse
  --abbrev-ref HEAD` printed that name; the local and origin refs were both `8fe0c31`), committed nothing there, and
  switched back to `recheck/a1-batch-141` before writing this file.
- **Status:** this file records findings. It advances no status and approves nothing: not batch 141, not D1-D11 of
  the disposition, not the number 172, not D6's deviation (which `open_blockers[200]` (9) names as A1's to accept),
  not RFC-2026-023 or RFC-2026-026. It fixes nothing.

## 0. What I am

I am a subagent started by a workflow of `/claude/a0_atlas`, the Author of this batch, of the same vendor and model
family as the Author and as the drafter of RFC-2026-023 and RFC-2026-026. Under RFC-2026-024 that is the stated
independence limit of this role run. Accepting this re-check as the A1 role's signature is the Integration Owner's and
the Product Owner's act, not mine. Where `open_blockers[200]` names an acceptance owed by A1 ((9) D6, (11), (12),
(13)), this file is a findings record about it, not that acceptance.

## 1. Read and measured

**Read:** `CONTRIBUTING_AGENTS.md`; the plan `a0-batch-141-plan-2026-10-03.md` (§7 in full); the disposition's
review-round additions (§4 D6 correction, D8-D11, §5); both review-round commit messages (`3c50ba8`, `8fe0c31`);
`git diff ad97cde..8fe0c31` for `172_acting_user_and_closing_command.sql`, `scripts/db/audit-producer-rule.mjs`,
`scripts/db/run.mjs`, `scripts/db/try-it.mjs`, `test-kits/db/foundation-contract.test.mjs`, the new isolation cases;
RFC-2026-026's "Implemented, review round" line; `open_blockers[200]` compared field by field with `ad97cde`'s; the
handoff's corrected sentences.

**Measured** (Node `v24.20.0` checked before every run; PostgreSQL 17.11 on `127.0.0.1:5501`, TCP only,
`unix_socket_directories=''`, `initdb --locale=C -A trust -U postgres`, `LC_ALL=C`, the shim first, re-initdb every
round; private directory `scratchpad/a1-141r2/`; drifts appended to `140_audit.sql` and restored byte for byte —
sha1 `2ac2fc2c…b782a502`, sha256 `2ac596bb…c1ad37149`, before, after every drift and at the end, and `git diff
e92b896 HEAD -- 140_audit.sql` empty at the end):

| Round | What | Result |
|---|---|---|
| r1 | `make db-migrate-clean`, `make db-rls-smoke` | exit 0, exit 0; post-migrate pass 53/37/16; producer rule "decided each of its 23 drifts and controls"; **1200** isolation cases; `db-authz-proofs` **10** claims |
| r4 | same, fresh cluster | exit 0, exit 0; same counts |
| r2 | migrate-clean, then my earlier attack script P1-P12 unchanged, the literal-id blocked-state script, and a new bounds script B1-B5 (§2) | as §2 |
| dC2 | my drift C2 (a `public` view over `app.workspaces`, SELECT and UPDATE to `app_command`, no function) | **exit 2**, at 172's apply time: "app_command holds a privilege … public.probe_ws SELECT, public.probe_ws UPDATE, …" (was exit 0 on `ad97cde`) |
| dB | my drift B (`create subscription … connect = false`) | **exit 2**: "(h) subscription probe_sub: a logical-replication apply worker writes audit rows past every policy and trigger" (was exit 0) |
| dK | new: a plain `public.probe_k` table, SELECT to `app_command`, nothing names `workspaces` | **exit 2** at 172's check 3: "public.probe_k SELECT, public.probe_k.x SELECT" |
| dG | new: `grant pg_create_subscription to authenticated` | **exit 2**: client membership probe and pinned grant probe, "authenticated -> pg_create_subscription" |
| dG2 | new: a fresh login role `probe_subber`, member of `pg_create_subscription` | **exit 2**: pinned grant probe, "probe_subber -> pg_create_subscription" |
| dT | new: an invoker trigger function on `app.audit_logs` (fires as `app_command` when a producer inserts) that updates `app.workspaces` | **exit 2**: pinned trigger probe ("unpinned: CREATE TRIGGER probe_t AFTER INSERT ON app.audit_logs …"); part (i) also refuses its function (r3) |
| dW | new: a BEFORE UPDATE trigger on `app.workspaces` whose body never names the table (`new.lifecycle_state := 'active'`) | **exit 2**: pinned trigger probe ("unpinned: CREATE TRIGGER probe_w BEFORE UPDATE ON app.workspaces …"); part (i) does not see it, and need not |
| dE | new: a `security_invoker` view in `app` over `app.workspaces`, granted to no one | **exit 2**: pinned grant probe first ("not a table: app.probe_e (relkind v)"); part (i) also refuses it (r3) |
| dU | new: an invoker helper naming the table only as `app.U&"workspace\0073"`, called from a third `app_command` definer | appended to 140: **exit 2, by the migration driver** ("a U& escape spelling"), before any probe; so on r3 (fresh, clean) I decided part (i) on the live catalog after the drift inside a rolled-back transaction, with the repository's own `AUDIT_PRODUCER_READ_SQL` and `decideAuditProducerRule` and the definer pins: **refused**, "(i) public.probe_u(uuid) names app.workspaces and is neither a lifecycle writer … nor a pinned reader" |
| r3 | same in-transaction decision: as built; dU2 (a plpgsql helper with `set search_path = app` and `update "workspaces"`); dT; dW; dE; dK | as built clean; dU2, dT, dE refused by (i); dW and dK not by (i) (held by the trigger probe and 172's check 3 above) |
| — | `node scripts/verify-branch-scope.mjs e92b896 WP-0A-DB-00` on the branch name | exit 0, "all 37 changed path(s) are declared, and every amendment explains one" |
| — | `npm run check:handoff` on the branch name | exit 0, "nothing substantive after its cited head" |
| — | `npm run verify` on the branch name | exit 0, "tests 688, pass 688, fail 0" |

The cluster was stopped and its data directory removed at the end; nothing listened on 5501 afterwards. Ports 5432
and 5499 were not touched.

## 2. My findings on ad97cde, re-checked

| Finding | Change (where) | Re-measured | Verdict |
|---|---|---|---|
| **F1** MEDIUM, caller-chosen unbounded text in the append-only log | both bodies: `172:259` and `172:354`, `^[A-Za-z0-9._:-]{1,128}$` on both identifiers, else `22023` | **B1** (editor at `aal1`, so a passing shape writes a refusal row): 128 characters run; 129 (either identifier), empty, blank, leading or trailing newline, an e-mail address, a spaced phone number, `null` each **raise 22023**; a uuid, a W3C traceparent and `a.b:c-d_e` run. In a UTF8 database the same pattern refuses Arabic-Indic numerals, fullwidth letters, Thai and `İ` (my cluster is SQL_ASCII, so this was measured on the operator alone). **B2**: my P11 flood (200 calls, 100,000-character `request_id`, an e-mail as `correlation_id`): all 200 raise 22023, **0 rows** with `request_id` over 128. **B3**: the cancel raises 22023 on 129 characters and on `a@b.c`, state unchanged. The two new cases are green in r1 and r4 | **Resolved in the command path.** Residual R1 below |
| **F2** MEDIUM, a subscription writes past every control | `audit-producer-rule.mjs:141` reads `pg_subscription`; `:265` refuses any row; drift B in-harness; comment `run.mjs:1126` | dB exit 2 (was 0); dG, dG2: membership in `pg_create_subscription` refused for a client role and for a fresh role (no membership is pinned) | **Resolved** as a probe. RFC-2026-026 §8.1/1's text owes `pg_subscription` (`[200]` (12)), recorded, not rewritten — correct for approved text. Platform `postgres`'s right to create a subscription still unmeasured |
| **F3** LOW, part (i) and 172's block 3 see only `app`/`private` | `172:519`, `:529` (every non-system schema, `run.mjs`'s userObject reading); part (i) over every function and view, any owner or security (`audit-producer-rule.mjs:224`), and no view may name the table (`:256`); `WORKSPACES_READERS` held to DEFINER / `app_authz` / STABLE (`:82`, i4) | dC2 exit 2 (was 0); dK exit 2; dE refused; dU, dU2, dT refused by (i). 172's do-block is re-run by the post-migrate pass (53 blocks), so a later migration's grant to `app_command` is held after every migration, not only at 172's apply | **Resolved for `app_command`.** The pinned grant probe's reach for other roles outside `app`/`private` stays owed (`[200]` (15)), as A0 states |
| **F4** INFO, "four app_authz helpers" | handoff: "EXECUTE on six functions owned by app_authz: jwt_subject, is_active_member, workspace_member_role, acting_user_admits_business, acting_user_admits_page and jwt_aal" | read; matches my earlier measured list | **Resolved** |
| **F5** INFO, the cancel asks no step-up | `[200]` (14), owner DATA-DEC-04's owners; D2 unchanged | P12 again: an `aal1` owner cancels (`succeeded`) | **Recorded as I recommended.** Not an acceptance of D2 |

## 3. The questions asked, re-measured (r2)

### 3.1 Can any client call the closing command for another tenant's workspace, as a non-owner, on a blocked workspace, or move a workspace to any state other than closing/active?

No, unchanged from `ad97cde`. P1/P1b cross-tenant close and cancel: `denied / not_permitted`, B unchanged, 0 rows
in B. P2 editor and suspended owner: `denied`; one row under the editor, none for the suspended owner. P3 (literal
ids) close and cancel in each of the six blocked states: `denied`, state unchanged, 0 rows. P4 `aal1`, `["aal2"]`,
`"AAL2"`: `step_up_required`. P10: a stranger on A and on a random uuid gets the same answer, 0 rows. P7: as
`app_command`, `lifecycle_state = 'purging'` and a foreign `updated_by` are refused by row level security, `name`
by the grant, B's row is invisible (0 updated). B5: no client role holds UPDATE on `lifecycle_state`
(`has_column_privilege('public', …)` false); its non-superuser holders are `app_command`, `app_worker` (since
`010_identity.sql:427`, not this batch) and the predefined `pg_write_all_data` (no member, measured).

### 3.2 Can the audit row be forged, suppressed (rollback), misattributed or written cross-tenant?

Through the request path, no (P5 rollback leaves no row; P6 the row commits with the action, actor `a1`, workspace
A, business and page null; P8 a foreign actor and a row in B are refused by the producer policy). The subscription
path of F2 is now refused at migrate-clean (dB, dG, dG2). Unchanged and not re-measured: RFC-2026-026 §3.3/1's
residual (a session that can set `request.jwt.claims` and execute a command writes as anyone it names; `aal` is read
from the same claims).

### 3.3 Does app_command or the definer function leak rows or widen app_authz?

No. P7: `app_command` sees one workspace and is `permission denied` on `audit_logs` and `workspace_members`. P9:
`authenticated` is refused EXECUTE on `acting_user_admits_business` and `jwt_aal`; `app_authz` reads 0 scope rows for
`a1` and is refused `created_by`; neither `app_authz` nor `app_command` has a member but `postgres`. B5: `app_authz`
holds no table-level privilege and no column UPDATE on `app.workspaces` (so the pinned reader cannot write at two
layers: its STABLE shape and its owner's grants); `app_command` holds nothing on any relation outside `app`/`private`;
the functions whose definition names `workspaces` are exactly `cancel_workspace_closing`, `close_workspace` and
`workspace_member_role`, which is `LIFECYCLE_WRITERS` plus `WORKSPACES_READERS`. The review round's only change to the
function bodies is the input check, which raises before any read or write.

### 3.4 Does the §8.1/1 probe catch an unpinned producer, an extension member, a rewrite rule?

The in-harness self-test decided **23** drifts and controls (19 + i2, i3, i4, B), clean before and after, in r1 and
r4; drifts 1-3, 9 and 10 are unchanged in the diff and still among them. The new parts hold against my own drifts
(§1): a subscription (dB), a view anywhere over `app.workspaces` (dC2 via 172, dE), an invoker helper or trigger
function naming the table plainly, quoted, through its own `search_path`, or as a `U&""` spelling (dU, dU2, dT).

### 3.5 Anything newly opened?

Nothing that reaches a tenant, the audit log or a lifecycle state. Two residuals and one note, §4.

## 4. Findings

### R1 — LOW (residual of F1, carried, owner named). A refusal row is still caller-triggerable without a rate bound, and the bound admits ID-shaped digit strings

- **Where:** `172:259`, `:354`; `work-packages/WP-0A-DB-00.json` `open_blockers[200]` (11); disposition §4 D9.
- **Measured:** B4 — the editor at `aal1` committed **1000** `denied` rows in one transaction with 128-character
  identifiers. B1 — `0812345678` and `1234567890123` (a phone number and a national-ID shape) are admitted and would
  be stored in a row flagged `pii_redacted = true`.
- **Reading:** the per-row size is now bounded (~256 characters of an id alphabet) and free text, e-mail and spaced
  numbers are refused, which is what F1 asked of the command. What is left is volume and a digit string: both are
  stated by A0 in `[200]` (11) with owners (CTR-AUD-001's owner for a table CHECK; A1 with DATA-DEC-06's owners for
  the rate decision). I agree a CHECK on `app.audit_logs` is a contract change and not A0's to make here.
- **Remedy (not in this batch):** decide the server tier's per-actor rate limit on command refusals before any client
  route exposes the commands; when CTR-AUD-001 is next revised, consider narrowing `request_id`/`correlation_id` to a
  server-minted shape (a uuid or a W3C trace id), which would also close the digit-string residual. Owner: A1 with
  DATA-DEC-06's owners; A6 / CTR-AUD-001's owner.
- **Not blocking**, in my reading: no tenant crossing, bounded per row, and recorded with owners.

### R2 — INFO. The command's bound is narrower than CTR-AUD-001's `correlation_id`

- **Where:** `172:259`, `:354`; D9's sentence "a CHECK … would narrow CTR-AUD-001's correlation_id".
- **Reading:** the same argument applies, at one remove, to the command bound itself: a caller carrying a
  contract-valid `correlation_id` containing `/`, `@` or more than 128 characters is refused `22023` and nothing is
  done or recorded. Today the two commands are the only producers, so the effective audit vocabulary is already the
  narrower one. This is a security-positive narrowing and I do not ask it undone; I record it so that C0/A6, who own
  the contract question in `[200]` (10)-(11), see that the narrowing has in effect happened at the producer.
- **Remedy:** name it in `[200]` (11) or D9 at the next touch ("the command already admits only this shape"). Owner: A0,
  for C0/A6 to read.

### Not findings (checked and holding)

- D11's "stricter than before, never looser": the new part (i) reads the header-skipped tokens, so an
  `app_command`-owned function merely NAMED `workspaces` is no longer refused by its own name; a name reaches no table,
  and every body token is still read. I find no route the old rule refused and the new one admits.
- `open_blockers[200]` was rewritten in (3) and (8), not only appended (first difference at character 1610 of the
  string). [200] was created in this same unmerged batch, so this is an edit of the Author's own unintegrated text,
  and A0's report says so; every other blocker string is identical to `ad97cde`'s.
- Check 7 (`172:575`): A0's statement that no drift appended to 140 reaches it first (170's block holds the PUBLIC
  grant; 170 revokes the `authenticated` one) is consistent with my B5 reading; not separately re-measured.
- The handoff's rollback sentence ("drops the three app_authz helpers") counts the three 172 adds; correct.

## 5. Claims checked

| Claim (where) | Verdict |
|---|---|
| Producer rule decides 23 drifts and controls; 1200 cases (1187 + 13); 10 proofs; 53/37/16 (plan §7.3, commit `3c50ba8`, handoff) | **True**, measured twice (r1, r4) |
| 688 tests; `npm run verify` and `check:handoff` exit 0 on the branch name; `verify-branch-scope` 37 paths (plan §7.3, A0's report) | **True**, measured on the name |
| Drift C2 exits 2 at 172's apply time, naming `public.probe_ws …` (plan §7.2 A1 F3) | **True** (dC2) |
| Drift B appended to 140 exits 2 by part (h); `pg_create_subscription` membership already refused (plan §7.2 A1 F2, RFC-2026-026 review-round line (5), `[200]` (12)) | **True** (dB; dG, dG2: refused for `authenticated` and for a fresh role) |
| Both bodies bound the identifiers and raise 22023; two cases (plan §7.2 A1 F1, D9, `[200]` (11)) | **True** (B1-B3; both cases green) |
| `[200]` (11)'s residual "a digit string of an ID number's shape fits the bound" | **True** (B1) |
| Handoff: six functions owned by `app_authz` (A1 F4) | **True** |
| `refresh:handoff` e92b896..3c50ba8: 10 added, 27 modified, 0 deleted (commit `8fe0c31`) | **True** (`git diff --name-status e92b896 3c50ba8`: 10 A, 27 M) |
| The handoff cites base `e92b896` and head `3c50ba8`; `8fe0c31` touches only the handoff (commit `8fe0c31`) | **True** |
| 140 restored byte for byte, sha256 `2ac596bb…c1ad37149` (plan §7.3) | **True** (same digest here, equal to `e92b896`'s) |
| Disposition D9-D11 claim no new Owner words | True as far as this run can see: no quote is added |
| "Stricter than before, never looser" (D11) | True in substance (§4, not findings) |
| Draft PR #183 open, not merged | **True**; head `8fe0c31`; `bootstrap` IN_PROGRESS at the end of this run |

## 6. Stop-the-line and merge

**Stop-the-line: none.** No tenant leakage, secret exposure, forgeable or suppressible audit row on the request path,
or migration divergence was found; F1-F3 are closed as probes and command checks, and nothing new opens a path.

**What blocks the merge, in my reading:** (1) the required check `bootstrap` was IN_PROGRESS on `8fe0c31` at the end
of this run — it must be green on that head; (2) the C0 and Q0 re-checks of the review round and the Integration
Owner's evidence (`[200]` (8)); (3) the acceptances `[200]` names as owed AT OR BEFORE the merge — the number 172
((1), (13)) — and those owed before integration, A6's on D8 ((10)). A1's acceptance of D6's deviation ((9)) is a
named-role act this file does not perform. From my side as security reviewer: **my findings no longer block the
merge**; R1 and R2 are carried with owners and do not block.

## 7. Limits

- Same vendor and model family as the Author (§0). Not an acceptance of any RFC, decision, deviation or number.
- Local PostgreSQL 17.11 with the repository's shim, `SQL_ASCII` database (initdb `--locale=C`); the non-ASCII arm of
  the bound was measured on the operator in a separate UTF8 database, not through the command. Not measured on the
  platform: the `aal` claim (Q-023-5), function ownership under a non-superuser applier (Q170-c), whether the
  platform's `postgres` may create a subscription, PostgREST's exposure of `app`.
- The attack scripts run as `postgres` setting `role` and claims per transaction; they model the request tier.
- Drift dU could not be appended to 140 (the driver refuses a `U&` spelling in a migration file, itself a control);
  part (i) was decided on it in a rolled-back transaction with the repository's own read and decision functions,
  not by migrate-clean's harness.
- Narrow re-check: I did not re-review Q0's new proofs (`authz-proofs.mjs`) or the cancel cases one by one beyond
  their passing in r1 and r4, nor RFC-2026-023 §5.1's quotations (C0's finding).
- `try-it demo` was not run (A0's stated limit, port policy).
