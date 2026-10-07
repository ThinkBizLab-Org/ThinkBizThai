# A1 security/privacy verdict: WP-0A-A0-009 at head 0cbdc3f4

- **Package:** `WP-0A-A0-009` (RFC-2026-018 and its correction, RFC-2026-019: how the service path
  connects). **Role:** independent Security/Privacy reviewer, run `/claude/a1_bastion`
  (`role_assignments.security_reviewer_agent_run_id`), gate `security_approved`.
- **Subject:** PR <https://github.com/ThinkBizLab-Org/ThinkBizThai/pull/207> (Draft, open), branch
  `agent/claude/WP-0A-A0-009-service-path-corrected`, head `0cbdc3f4782cbd64da810f78bb99fb4b21f7fb52`,
  which contains `origin/main` at `0955b32e` (PR #203). Author `/claude/a0_atlas`. The PR changes three
  paths: `work-packages/WP-0A-A0-009.json`, `handoffs/WP-0A-A0-009-author-handoff.json` and
  `evidence/WP-0A-A0-009/author-self-check-2026-10-07.md`.
- **Date written:** 2026-10-07. The file name carries `2026-10-05` because the brief that spawned this
  run named the path; the date in the name is not the date of the reading.
- **Status:** this file records findings and a verdict. It advances no status, transcribes nothing into
  the manifest, and fixes nothing.

## 0. What I am

A subagent of `/claude/a0_atlas`, the Author's own run: the same vendor and the same model family, on a
brief the Author's workflow wrote. RFC-2026-024 records that as the limit of this role's independence
(§3/3-4), and the manifest's `cross_vendor_exception` now records the condition withdrawn for this package.
A measurement against the tree stands regardless of who ran it; accepting this record as the A1 role's
signature is the Integration Owner's and the Product Owner's act, not mine. I measured in a private clone
and report. I am not `/claude/a1_identity`, the run that wrote the role-topology countersignature, and
this file is not my acceptance of RFC-2026-028 as DATA-DEC-03's co-owner.

## 1. There is no earlier verdict of mine on this package

The brief asks me to re-verify my earlier conditions. **There are none to re-verify.** At the head,
`evidence/WP-0A-A0-009/` holds one file, the Author's self-check; no A1 file has this package or
RFC-2026-019 as its subject (`open_blockers[0]`, `open_blockers[3]`). I checked the four A1-authored files
that cite RFC-2026-019 (`a1-rfc-022-measurements-2026-09-08.md`, `a1-security-batch-080-2026-09-13.md`
under WP-0A-DB-00; `a1-security-reverify-2026-10-05.md`, `a1-recheck-2026-10-07.md` under WP-0A-A0-007):
each uses it as a reference for another subject. **This is therefore the FIRST security verdict on the
package, and it takes RFC-2026-019 as its subject**, which is what `open_blockers[0]` says closes it.

## 2. Measured vs read

**Measured**, Node `v24.20.0` / npm `11.19.0` (`/Users/bank/.local/node-v24.20.0/bin`, first on `PATH`), in
a private clone under the session scratchpad (`.../scratchpad/a1-WP-0A-A0-009/repo`), cloned on the
**branch name** (`.git/HEAD` = `ref: refs/heads/agent/claude/WP-0A-A0-009-service-path-corrected`),
`HEAD` = `0cbdc3f4`, `origin/main` fetched from GitHub = `0955b32e`. No database was started; port 5661
was not needed.

| Command | Exit | Result |
|---|---|---|
| `npm ci` | 0 | |
| `npm run check` | 0 | tests 716, pass 716, fail 0, skipped 0 |
| `node scripts/validate-work-packages.mjs` | 0 | |
| `node scripts/validate-work-package-ownership.mjs` | 0 | |
| `node scripts/validate-work-package-role-separation.mjs work-packages/WP-0A-A0-009.json` | 0 | |
| `node scripts/scan-repository-secrets.mjs` | 0 | no output |
| `node scripts/verify-branch-scope.mjs origin/main WP-0A-A0-009` | 0 | "all 3 changed path(s) are declared, and every amendment explains one" |
| `npm run check:handoff` (with `origin/HEAD` -> `origin/main`) | 0 | "describes the branch: nothing substantive after its cited head" |
| `gh pr view 207` | — | head `0cbdc3f4`, Draft, OPEN, base `main`, the three paths above |
| `gh run view 37507939960` | — | `Bootstrap validation` on `0cbdc3f4` (pull_request): **success**; tests 716/716; `db-rls-smoke: 1200 isolation case(s) passed.` |

A clone artefact, recorded so nobody repeats it: a local clone's `origin/HEAD` first pointed at the
worktree's HEAD (`0cbdc3f4`), and `check:handoff` then complained that base `0955b32` is not on the branch's
side; pointing `origin/HEAD` at `origin/main`, as on GitHub, makes it pass. Not a defect in the PR.

**Read:** `CONTRIBUTING_AGENTS.md`; the manifest whole and `git diff 0955b32...0cbdc3f4` whole, grepped for
`postgres://`, `password`, `secret`, `token`, private-key headers and e-mail domains (one prose hit, the
handoff's "no ... credential is touched"); the self-check whole; `RFC-2026-019` whole; `scripts/db/run.mjs`
at every line the rewritten `open_blockers[1]` cites (977-991, 2349, 3628-3637, 4056-4102) and its role
membership rules (618-640, 1366-1400); `172_acting_user_and_closing_command.sql` lines 101-185 and 415-451;
`tests/db/identity/isolation-cases.mjs` 20070-20106 and 20280-20288; `catalog-snapshot.json`'s
`authenticator_memberships`, `security_definer_functions`, `taken_at` and its pending-migration note;
`.github/workflows/ci.yml:159`; `evidence/WP-0A-DB-00/a1-countersignature-role-topology.md` §0;
`git show <c>:work-packages/WP-0A-A0-009.json` for three of the seven commits the self-check counts
(`8701555f`, `69ed807e`, `066a469a`: one `/root/r0_steward` each, as it says).

## 3. RFC-2026-019, reviewed for security

| Clause | Reading | Where it is held today |
|---|---|---|
| §4/1: `authenticator` is a member of no service role | **Agreed.** A membership would make the role assumable by a `role` claim in any JWT signed with the project secret, which skips the function the role exists to own. §1's comparison table is the right one. | `run.mjs:4058-4071`, now naming `app_worker_login` too (batch 173), over the snapshot; an absent field is a finding. On the migrate-clean cluster `authenticator` does not exist (the shim does not create it), and the general membership rule (`PINNED_ROLE_MEMBERSHIPS`, `run.mjs:1384`) holds every non-superuser role's memberships to exactly `app_worker_login -> app_worker`. See A1-009-3. |
| §4/2: the request path runs as `authenticated`; work beyond its policies goes through a `SECURITY DEFINER` function owned by `app_command` | **Agreed, and the implementation is stricter than the RFC.** `172:446-451` revokes EXECUTE from PUBLIC **and from `app_command` itself** and grants it to `authenticated` alone, so the role reached by `SET ROLE` cannot call its own command with claims it set; the case `app-command-cannot-execute-its-own-closing-command` (`isolation-cases.mjs:20282`) asserts the refusal by grant. | `SECURITY_DEFINER_FUNCTIONS` (`run.mjs:977-991`) pins owner and body; the definer probe claims "exactly the pinned ones, each with its owner, body, an empty search_path and no EXECUTE for PUBLIC" (`:2349`). |
| §4/3: `app_worker`'s connection method undecided | Spent: RFC-2026-028 (Approved 2026-10-05) decided it. Its `SET LOCAL ROLE`, never `SET`, warning remains correct security advice and RFC-2026-028's pinned option row (`set true, inherit false`) is consistent with it. The dated line saying so is owed (self-check §5). | — |
| §4/4: `service_role` used by no application or worker path | Agreed. | — |
| §5 rule 2: no table in `app` owned by `app_command` | **The rule is right; the reason the RFC gives for it is wrong.** See A1-009-1. | `run.mjs:3632-3637` in `tenantTableLint` |
| §5 rule 3: every definer function has an empty `search_path` and a recorded owner | Agreed; now exact in both directions (completeness included). | `run.mjs:4091-4102`; `:977-991`; `:2349` |
| §5 rule 4: the first command function is owned by `app_command`, called as `authenticated`, refused where it should be | **Written.** `172:427-428` sets the owner; `run.mjs:983-984` pins it; three cases call `app.close_workspace` as an authenticated member and assert the denial, the unchanged state and the audit row (or its absence cross-tenant). See A1-009-4 for what they do not show. | `isolation-cases.mjs:20072`, `:20084`, `:20095` (each the case's `id` line); CI `db-rls-smoke`, 1200 cases, at this head |
| §7: JWT custody unchanged; the signing secret can still claim `service_role`, which bypasses RLS | **Agreed, and this sentence must stay** in any rewrite of the status line: it is the boundary that forced RLS does not move. | — |

The decision is sound for security. I have no objection to RFC-2026-019 as approved; the defects below are
in its text, not its decision.

## 4. The PR's own diff, read for security

- **`open_blockers[1]` rewrite.** Every line citation checks out against the head (the isolation-case
  numbers point at each case's `id` line, one or two lines below the opening brace). "All four rules are
  written" is accurate. It does not claim the provisioned instance holds 172; it does not claim rule 4 runs
  under `npm run check`; it names the CI run. No overclaim found beyond A1-009-3 and A1-009-4, which are
  precision, not error.
- **`open_blockers[0]` addendum and `open_blockers[3]`.** Accurate (§1). This file is what they wait for.
- **`independence`.** `prefer_cross_vendor_review: false` with the withdrawal text in the sibling packages'
  wording. The added sentence (A1's 2026-09-08 measurement of §4/1 is not a role signature) is correct and I
  would have asked for it.
- **`_run_id_disambiguation`.** The false claim that `/root/r0_steward` was named in `open_blockers` is
  removed; I sampled three of the seven commits and found one mention each, in that field. Naming a
  successor is correctly kept distinct from the successor acting.
- **`product_reviewer_note`.** C0's to accept or refuse; no security content.
- **Secrets and personal data.** None in the diff; the tree scan is clean. The PR touches no RFC,
  migration, lint, grant, role, CI or gate, so it is not a governance PR and moves no security boundary.

## 5. Findings

### A1-009-1 (Low, text, owed on the governance PR, not a merge condition for #207): §5 rule 2's stated reason is the sentence A1 already found false

RFC-2026-019 line 110-111 justifies rule 2 with "a `SECURITY DEFINER` function owned by the table owner would
be exempt from the policies on a forced table". Under `FORCE ROW LEVEL SECURITY` the owner is **subject** to
the policies; that is what FORCE is. This is the same sentence A1 reported on batch 080
(`a1-security-batch-080-2026-09-13.md` §2) and again as S3 on batch 100, and that batch 082 corrected in the
`run.mjs` comment (`run.mjs:3625-3631`, which says so). Two places still carry it: this RFC's §5, and the
**problem message** of the very rule (`run.mjs:3635-3636`), which the comment above it contradicts. The rule
is still right, for reasons that are true: the owner of a table can `ALTER TABLE ... NO FORCE`, disable row
level security and drop or replace its policies, and on a table the exemption register excuses from FORCE
(RFC-2026-016 §4) the owner **is** exempt. The remedy belongs with the RFC-2026-019 line A0 already owes
(self-check §5): a dated correction of §5's reason. The `run.mjs` message is not this package's path; it is
owed to whoever owns `scripts/db/**`, and I name it so it is not lost.

### A1-009-2 (Low, text, owed on the same governance PR): §8's last paragraph is false, and this file makes it more so

RFC-2026-019 line 147 says "A1 has not seen this RFC." The manifest's `open_blockers[0]` already records that
the same wording was false of the manifest (A1 measured §4/1 on 2026-09-08); the RFC itself still carries
it, and after this file A1 has reviewed it. The self-check's §5 list of owed RFC-2026-019 edits names the
status line, §4/3 and §4/5 but not §8 or §5. **Condition on the governance PR, not on #207:** the dated
line on RFC-2026-019 that A0 owes under this package also records A1-009-1 and A1-009-2, keeping the
original sentences and the §7 JWT-custody boundary.

### A1-009-3 (Info): rule 1 on the provisioned instance is a 2026-09-06 reading

`authenticator_memberships` in `catalog-snapshot.json` is `["anon","authenticated","service_role"]`, taken
2026-09-06; 172, 173 and 174 are declared not applied to that instance. So "authenticator is a member of no
service role" holds **as last measured**, before `app_worker_login` existed anywhere. On migrate-clean
clusters `authenticator` does not exist and the general membership pin holds the negative for every role
there. Nothing is wrong; the provisioned reading is owed with Q170-c's re-measure, already tracked. A
reader of `open_blockers[1]` should not take "RULE 1 ... holds" as a reading newer than the snapshot.

### A1-009-4 (Info): what rule 4's cases show and do not show

The three cases assert the **command's own** refusals (no step-up, not the owner, not a member) and their
audit consequences; the cross-tenant case also shows the audit policy admits no row in another tenant's
log. They do not measure the platform's real `aal` claim (the case's own `why` says so), and they do not
isolate whether the `app_command` row policies alone would refuse if the function's checks were removed.
RFC-2026-019 §5 asks for "refused where the policies say it should be"; the cases meet that as written. A
case that removes the function-level check to show the policy bound is a suggestion for RFC-2026-026's
owner, not a condition here.

### A1-009-5 (Info): `required_human_authorities[1]` is met in substance, not in order

"A1 to countersign the role topology before the roles are created": the countersignature
(`a1-countersignature-role-topology.md`, run `/claude/a1_identity`, 2026-09-06, commit `aaa35efb`) post-dates
`001_service_roles.sql` (commit `dab96378`, 2026-09-05), and its §0 discloses that it partly assesses its
author's own files. The self-check calls it "already met" and leaves the field as written; I agree it need
not block, and record that the honest marking is "met after the fact, by `/claude/a1_identity`".

## 6. Verdict

**`security_approved`** for WP-0A-A0-009 at `0cbdc3f4`. This is the first A1 verdict on the package and it
has RFC-2026-019 as its subject; it is what `open_blockers[0]` names as closing that blocker.

- **Conditions:** one, and it does **not** gate PR #207: the governance PR on which A0 owes a dated line on
  RFC-2026-019 (self-check §5) also records A1-009-1 (§5 rule 2's reason) and A1-009-2 (§8's "A1 has not
  seen this RFC"), keeping the original sentences and the §7 JWT-custody boundary. A change to this PR that
  stays inside the manifest's records and the handoff needs no A1 re-check; a change to either RFC does.
- **Stop-the-line:** no. No secret, credential, connection string or personal data is exposed; no tenant
  path, grant, policy, role, migration or CI changes; the one claim that must not be made (that forced RLS
  constrains the service-role key) is not made anywhere in the diff.
- **Does anything block the merge?** Not from security. CI is green on this exact head (run `37507939960`,
  716 tests, 1200 isolation cases). Still owed before merge, by others: `review_approved`
  (`/claude/c0_contract_reviewer`, including the `product_reviewer_note` mapping), `test_verified`
  (`/claude/q0_sentinel`) and `integration_verified` (`/claude/r0_steward`) at the final head.
- Suggested transcription line, for whoever transcribes verdicts into the manifest:
  `security_approved: /claude/a1_bastion, first verdict, at 0cbdc3f4 (evidence/WP-0A-A0-009/a1-security-reverify-2026-10-05.md): RFC-2026-019's decision agreed; all four §5 rules found written; condition on the owed RFC-2026-019 governance PR to correct §5 rule 2's reason and §8's "A1 has not seen this RFC" (A1-009-1, A1-009-2); nothing blocks #207 from security. Shared-origin run per RFC-2026-024.`
