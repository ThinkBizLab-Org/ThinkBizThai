# A1 security/privacy verdict: WP-0A-A0-008 at head 25d449c

- **Package:** `WP-0A-A0-008` (the service path identity, measured rather than assumed; `RFC-2026-017`).
  **Role:** independent Security/Privacy reviewer, run `/claude/a1_bastion`
  (`role_assignments.security_reviewer_agent_run_id`).
- **Subject:** PR <https://github.com/ThinkBizLab-Org/ThinkBizThai/pull/208> (Draft), branch
  `agent/claude/WP-0A-A0-008-service-path`, head `25d449ca38b299d584fcfcb21af40c2be630af3b`; PR base
  `main @ 0955b32` (PR #203). Author `/claude/a0_atlas`. Branch commits: `e765cf9` (work), `3b685f8`
  (merge of `origin/main` 0955b32), `25d449c` (handoff, last and alone).
- **File name:** the series name the other packages' A1 files use (`a1-security-reverify-2026-10-05.md`);
  this file was written on 2026-10-07.
- **Status:** this file records findings. It advances no status, approves nothing as anyone but this
  role, and fixes nothing.

## 0. What I am

A subagent of `/claude/a0_atlas`, the Author's own run, spawned by its workflow: the same vendor and the
same model family, which `RFC-2026-024` records as the limit of this role's independence. Accepting this
record as the A1 role's signature is the Integration Owner's and the Product Owner's act, not mine. I
measured and report; I did not and cannot test-verify as an independent role, integrate, or merge. I am
also not `/claude/a1_identity`, the run that wrote the role-topology countersignature this package's
`required_human_authorities[1]` now cites (§4).

## 1. My earlier verdict, and its conditions

**There is no earlier A1 file for this package.** At `main @ 0955b32` there is no
`evidence/WP-0A-A0-008/` folder; `git log --all -- 'evidence/WP-0A-A0-008/*'` returns one commit, the
Author's `e765cf9`, which adds only `author-self-check-2026-10-07.md`. No A1 condition was ever set, so
none is closed or open. This is the package's **first** `security_approved` verdict, and it reviews the
whole package: the PR #208 diff and `RFC-2026-017` as it stands on main (Approved, `8c16c0d`).

## 2. Measured vs read

**Measured**, Node `v24.20.0` / npm `11.19.0` (`/Users/bank/.local/node-v24.20.0/bin` first on `PATH`).
The harness refused a `git clone` outside the assigned worktree, so the "private clone" was this
worktree with `HEAD` put on the **branch name** (`git switch --ignore-other-worktrees
agent/claude/WP-0A-A0-008-service-path`; `.git/HEAD` = `ref: refs/heads/agent/claude/WP-0A-A0-008-service-path`
at `25d449c`, `origin/main` = `0955b32`). Nothing was committed while on that name; this file is
committed on the worktree's own branch at `25d449c`. Scratch output under
`.../scratchpad/a1-WP-0A-A0-008/`. No database was started; port 5651 was not used (§2.1).

| Command | Exit | Result |
|---|---|---|
| `npm ci` | 0 | |
| `npm run check` (on the branch name) | 0 | tests 716, pass 716, fail 0, skipped 0; "the handoff for this branch describes this branch" ran on the branch name and passed |
| `node scripts/validate-work-packages.mjs` | 0 | |
| `node scripts/validate-work-package-ownership.mjs` | 0 | |
| `node scripts/validate-work-package-role-separation.mjs work-packages/WP-0A-A0-008.json` | 0 | |
| `node scripts/scan-repository-secrets.mjs` | 0 | no output |
| `node scripts/verify-branch-scope.mjs origin/main WP-0A-A0-008` (`0955b32`, the PR base) | 0 | "all 3 changed path(s) are declared, and every amendment explains one" |
| `buildCases((x) => x)` from `tests/db/identity/isolation-cases.mjs`, filtered on `covers` starting `RFC-2026-017§7` | — | 1200 cases; **61** §7-labelled: 20 `denied`, 39 `no-rows`, 2 `no-effect`. All 20 denials are `INSERT`s, all as `{ helper: 'as_service' }`, over 20 distinct `app.` tables; 19 declare `deniedBy: 'policy'`, 1 (`service-identity-is-denied-a-write-with-an-error`, `app.workspaces`) declares none. No case mentions `app_worker_login`. The Author's counts are reproduced exactly. |
| `gh pr view 208` / `gh run view 37508038445` | — | CI `bootstrap` on `25d449c`: **SUCCESS**. "Validate repository bootstrap", "Verify branch scope" and "Database foundation" succeeded; "Negative control" was skipped by its own decision step |
| `git diff 0955b32..25d449c` grep for `postgres://`, `password`, `token`, `secret`, `api_key`, `sk_live`, `eyJ`, `supabase.co`, e-mail shapes | — | only prose ("scan-repository-secrets", "credential is touched") |
| `git log --diff-filter=A` on `001_service_roles.sql`, `011_*.sql`, `173_worker_login_identity.sql`, the countersignature | — | `dab9637` 2026-09-05 22:07 (roles created); `aaa35ef` 2026-09-06 03:14 (countersignature); `273ff93` 2026-09-06 13:07 (`app_authz`); `eb413e9` 2026-10-05 (`app_worker_login`) |

### 2.1 What I did not run

The live isolation suite (`scripts/db/run.mjs`, `rls-smoke` / `test-foundation`). It is not among this
package's `required_tests` or `deterministic_commands`, and the package changes no SQL. That the 20
§7 denials **execute and pass** is read from CI run `37508038445`'s "Database foundation" step on this
head, not measured by me.

**Read:** `CONTRIBUTING_AGENTS.md`; `work-packages/WP-0A-A0-008.json` whole at `25d449c`; `git diff
0955b32..25d449c` (3 files); `evidence/WP-0A-A0-008/author-self-check-2026-10-07.md`;
`RFC-2026-017` whole; `evidence/WP-0A-DB-00/a1-countersignature-role-topology.md` whole;
`RFC-2026-028` header; `db/foundation/lint/service-policy-map.json` (`_not_in_effect`, `cells`);
`tests/db/identity/identity-isolation.test.mjs:301-315`; `tests/db/identity/run-isolation.mjs:519-530`;
`db/foundation/migrations/011_*.sql` role statements; `scripts/db/run.mjs:658`;
`evidence/WP-0A-A0-007/a1-security-reverify-2026-10-05.md` for this role's vocabulary.

## 3. The PR #208 diff itself

No security or privacy regression. Three files change, all in `writable_paths`: the manifest, the
Author's self-check and the handoff. No SQL, grant, policy, role, migration, CI or RFC is touched; the
tree scan is clean and the diff carries no credential, connection string, private URL or personal data.
Read for what a security reviewer owns:

- **`independence` (cross-vendor withdrawn):** the same wording and the same limit as WP-0A-A0-007 as
  merged in #200. It keeps all of § Separation of duties, keeps `/claude/a1_bastion` as
  `security_reviewer_agent_run_id` and `security_approved` in `review_and_test_gates`. Nothing widened.
- **`_run_id_disambiguation`:** removes a sentence that was false since creation; it grants nothing and
  `amends_without_owning.paths` stays empty. The Author's "0 of 6 versions" claim is C0's to re-measure;
  it carries no security weight either way.
- **`product_reviewer_note`:** not a security matter; left to C0 as the Author asks.
- **`open_blockers[1]` (service path narrowed):** accurate, and it keeps the sentence that matters: the
  production service path is unproven. It now cites RFC-2026-028's header "among them (not
  exhaustive)", which is the wording this role suggested on WP-0A-A0-007 (A1-007-2). It correctly keeps
  "173 is declared NOT applied to the provisioned instance" and "No case in the isolation suite
  connects AS app_worker_login" (measured: none does). What it does not say, and RFC-2026-017's
  countersignature §4.3 weighted highest, is that the bypassing path is still the one production could
  reach today (`authenticator` holds SET on `service_role`). That fact is unchanged by 173 and is the
  boundary of any claim here; see A1-008-3.
- **`open_blockers[3]` (no role verdict at any head):** true until this file; it stays true for C0, Q0
  and R0.
- **`required_human_authorities`:** the two "current state" tails are accurate as far as they go; §4
  gives this role's reading of item 2, which the Author put to me.

## 4. `required_human_authorities[1]`: does the existing countersignature discharge it for this package?

The item: *"A1 to countersign the role topology before the roles are created, since DATA-DEC-03 is owned
A0+A1 and this is a security surface."*

**Yes, for the three roles `RFC-2026-017` §3 names, with its reservations carried, and with one
condition of the item recorded as not met and not curable.**

- **What it covers.** The countersignature (`/claude/a1_identity`, DATA-DEC-03's A1 co-owner) signs, on
  the provisioned instance on 2026-09-06, that `app_worker`, `app_command` and `app_maintenance` exist
  with `rolbypassrls`, `rolsuper`, `rolcanlogin`, `rolinherit` all false and no password, are members of
  nothing, and that the bypassing set is exactly the five platform roles. That is precisely the topology
  §3 of this package's RFC decides. The item names "A1", not a run; a countersignature by A1's
  co-owner run on the same topology is the act the item asks for. It is not this verdict, and this
  verdict is not it.
- **"Before the roles are created": not met.** Measured: the roles were created in `dab9637`
  (2026-09-05 22:07 +0700) and the countersignature landed in `aaa35ef` (2026-09-06 03:14 +0700),
  about five hours later, against the roles as built. The ordering cannot be repaired after the fact.
  It did no harm that I can find: the countersigner measured the built roles and found them correct,
  which is a stronger statement than a pre-creation reading of a plan would have been. The manifest's
  "current state" tail should say the countersignature followed creation rather than leave the
  item's "before" unremarked (A1-008-2).
- **What it does not cover, and this package must not be read as covering:** (a) the two roles added
  after it, `app_authz` (`011`, RFC-2026-020) and `app_worker_login` (`173`, RFC-2026-028). Each was
  reviewed by A1 in its own batch (`a1-batch-011-execution-2026-09-06.md`;
  `a1-batch-173-worker-security-review-2026-10-03.md` and its recheck), and `011` pins `nobypassrls` and
  asserts it at apply time; they are outside RFC-2026-017 §3 and outside this item. (b) Its §4.2: it
  explicitly did **not** countersign "Isolation remains unproven until the negative assertion in §7
  exists" as satisfied. (c) Its §4.3: it did not countersign that the service path is safe.
- **Its defects, as they stand on main (read, not re-audited):** §5.1's exemption register now exists
  (`db/foundation/lint/rls-exemption-register.json`, read by `scripts/db/run.mjs`); §5.2's `rolsuper`
  half is in `CLIENT_ROLE_FALSE_ATTRIBUTES` (`run.mjs:658`); §5.6's `deniedBy` is now asserted
  (`run-isolation.mjs:529-530`). I did not trace the remaining defects; none of them is this package's.

## 5. `open_blockers[0]`: does what exists discharge RFC-2026-017 §7?

§7, quoted: *"the service identity attempting an operation the matrix marks `N` for service and being
**denied with an error, not an empty result**"*.

**Not as §7 is written. Its purpose is met in the analogous form A1 named on 2026-09-06, and that form is
now much wider. The blocker should stay open, reworded, until a denial against a matrix-`N` service cell
exists.**

- **What holds (security reading).** 20 cases make the service identity (`as_service`, a role measured
  in CI to be non-bypassing) attempt an `INSERT` on 20 forced tables and demand SQLSTATE `42501`; 19
  attribute the refusal to the policy layer and the runner now checks that attribution; the 20th is
  pinned to RLS by the static grant test (`identity-isolation.test.mjs:301-315`). A role that acquired
  `BYPASSRLS`, or a policy that admitted the service by mistake, would turn each of them red. That is
  the regression control §7 exists to provide, and CI ran it green on this head.
- **What does not hold.** Every one of the 20 is denial-by-absence-of-policy, not denial-against-a-matrix-
  `N`. At least **four** of them are operations the matrix marks **`S`** for service, not `N`:
  `service-cannot-write-an-audit-log` and `service-cannot-write-a-security-event` (§8.4 Audit/security
  INSERT), `service-cannot-write-a-usage-event` (§8.4 Usage ledger INSERT, the `S` half) and
  `service-cannot-write-a-notification-row` (§8.4 Notification insert). Each is a classified row of
  `db/foundation/lint/service-policy-map.json`, whose `_not_in_effect` says a service policy will be
  written there once RFC-2026-022 is in effect, and the suite's own comments say these cases "will have
  to" flip. So the §7 label on them means "denied today" rather than "must always be denied", and
  "20 denials" overstates what §7 asked for. The `UPDATE` / `DELETE` of an immutable version, the cell
  the countersignature identified as §8.1's `N`, carries no §7-labelled `denied` case. See A1-008-1.
- **What no case here can reach:** the production identity. No case connects as `app_worker_login`, and
  `173` is not applied to the provisioned instance; the countersignature's §4.3 (the bypassing path,
  `authenticator → service_role`, is one statement away and nothing in the database forbids application
  code using it) is unchanged.

The decision is the independent Reviewer's and the Integration Owner's to record; this is A1's input
to it.

## 6. Findings

### A1-008-1 (Medium, not merge-blocking): `open_blockers[0]`'s "20 denials" includes `S` cells, so §7 is not discharged as written

Measured in §2 and argued in §5: of the 20 §7-labelled `denied` cases, at least four target cells the
matrix marks `S` for service and are classified in `service-policy-map.json` as owed a service policy.
When those policies land, these cases must invert, and the §7 count will fall again for a reason other
than the one the blocker names. Suggest the next increment (a) state in `open_blockers[0]` that the 20
are denial-by-absence-of-policy and that at least four are pending `S` cells, and (b) leave the blocker
open until one service denial against a matrix-`N` cell exists. The relabelling, if any, is A1
Identity's (`tests/db/identity/**`), not this package's. Not a security defect in the code: the
assertion is fail-closed in both directions.

### A1-008-2 (Low): the countersignature followed the roles' creation; the manifest's current-state tail does not say so

`required_human_authorities[1]` asks for the countersignature "before the roles are created". Measured:
roles `dab9637` 2026-09-05 22:07, countersignature `aaa35ef` 2026-09-06 03:14. §4 accepts the
countersignature as discharging the item for RFC-2026-017 §3's three roles; the tail should record the
order so a reader does not take the "before" as met. Suggestion, not a condition.

### A1-008-3 (Low): `open_blockers[1]` drops the one sentence that says which path production could take today

The narrowed blocker lists what RFC-2026-028 still owes, but no longer says that the identity production
would reach for today is `service_role`, which bypasses, through `authenticator` (countersignature §4.3,
Q10; RFC-2026-019 §7 on JWT custody). Its conclusion ("production service path is still unproven") is
right; the reason a reader most needs is missing. Suggestion, not a condition.

### A1-008-4 (Info): `rollback_or_forward_fix` still calls RFC-2026-017 "a Proposed decision record"

The field is unchanged by this PR and stale since `8c16c0d`; `open_blockers[2]` was corrected for the same
reason. It errs on no security side (the rollback it describes is still right). For C0.

### Carried, agreed, not re-litigated

`RFC-2026-017`'s substance: `service_role` and `postgres` both bypass on the provisioned instance (§2,
reproduced by the countersignature's Q1/Q3); the service path runs under roles none of which holds
`BYPASSRLS`; `service_role` and `postgres` are reserved for migration and platform administration. I
would refuse any text that claimed forced RLS constrains the production service path today.

## 7. Verdict

**`security_approved`** for WP-0A-A0-008 at `25d449c`, on the record as it stands: no security or
privacy condition is set. A1-008-1 to A1-008-4 are suggestions for the next increment and inputs to
C0 and R0; none is a condition on this verdict.

- **`required_human_authorities[1]`:** discharged for this package by the existing countersignature,
  for the three roles of RFC-2026-017 §3, with its §4 reservations carried and the "before creation"
  ordering recorded as not met (§4, A1-008-2). This verdict is not that countersignature and does not
  replace it.
- **`open_blockers[0]`:** A1's input is that §7 is **not** discharged as written (§5, A1-008-1); the
  blocker should stay open.
- **Stop-the-line:** no. No secret, credential or personal data is exposed, no tenant path, role, grant
  or policy changes, and the record keeps the claim that must not be made (that the production service
  path is constrained by RLS) unmade.
- **Does anything block the merge?** Not from security. CI `bootstrap` is green on `25d449c`
  (`37508038445`), and `npm run check` is 716/716 on the branch name. The C0, Q0 and R0 first verdicts are still owed, and the
  package stays at `in_review` until they exist. A sync with `main` that brings in only other packages'
  files does not need an A1 re-check; anything else in this branch's own diff does.
- This verdict is not my acceptance of RFC-2026-028 as DATA-DEC-03's co-owner; that is owed separately.
