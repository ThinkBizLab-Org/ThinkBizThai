# A1 security/privacy re-verification: WP-0A-A0-007 at head 1509aef

- **Package:** `WP-0A-A0-007` (the RLS policy set denies every service operation). **Role:** independent
  Security/Privacy reviewer, run `/claude/a1_bastion`.
- **Subject:** PR <https://github.com/ThinkBizLab-Org/ThinkBizThai/pull/200> (Draft), branch
  `agent/claude/WP-0A-A0-007-amend-section-2`, head `1509aef`, branch point `main @ b61735f`; the PR's base
  is now `main @ d863f40` (PR #199). Author `/claude/a0_atlas`.
- **Review branch:** the head was checked out into `recheck/a1-WP-0A-A0-007`; this file is its only change.
- **File name:** the series name the other packages' A1 files use (`a1-security-reverify-2026-10-05.md`);
  this file was written on 2026-10-06.
- **Status:** this file records findings. It advances no status, approves nothing, and fixes nothing.

## 0. What I am

A subagent of `/claude/a0_atlas`, the Author's own run: the same vendor and the same model family, which
RFC-2026-024 records as the limit of this role's independence. Accepting this record as the A1 role's
signature is the Integration Owner's and the Product Owner's act, not mine. I measured in a private clone
and report; I did not and cannot approve, test-verify as an independent role, or integrate. I am also not
the A1 analysis that `RFC-2026-016` rests on (`open_blockers[2]`); that analysis was spawned from the A0
session and this file does not turn it into a role signature.

## 1. My earlier verdict, and its conditions

**There is no earlier A1 file for this package.** Before this PR there was no `evidence/WP-0A-A0-007/`
folder at all (the Author's `author-self-check-2026-10-06.md` §1 says so, and the tree at `b61735f`
confirms it). No A1 condition was ever set, so there is none to close. This is the package's **first**
`security_approved` verdict, and it reviews the whole package: the PR #200 diff and `RFC-2026-016` as it
stands on main.

## 2. Measured vs read

**Measured**, Node `v24.20.0` (`/Users/bank/.local/node-v24.20.0/bin/node`), in a private clone under
the session scratchpad (`.../scratchpad/a1-WP-0A-A0-007/repo`), cloned on the **branch name**
`agent/claude/WP-0A-A0-007-amend-section-2` (`.git/HEAD` = `ref: refs/heads/agent/claude/WP-0A-A0-007-amend-section-2`)
at `1509aef`, `origin/main` at `d863f40`. No database was needed or started; port 5631 was not used.

| Command | Exit | Result |
|---|---|---|
| `npm ci` | 0 | |
| `npm run check` | 0 | tests 705, pass 705, fail 0, skipped 0 (the handoff guard ran on the branch name and passed) |
| `node scripts/validate-work-packages.mjs` | 0 | |
| `node scripts/validate-work-package-ownership.mjs` | 0 | |
| `node scripts/validate-work-package-role-separation.mjs work-packages/WP-0A-A0-007.json` | 0 | |
| `node scripts/scan-repository-secrets.mjs` | 0 | no output |
| `node scripts/verify-branch-scope.mjs b61735f WP-0A-A0-007` | 0 | all 3 changed path(s) are declared |
| `node scripts/verify-branch-scope.mjs origin/main WP-0A-A0-007` (`d863f40`) | **73** | names the three WP-0A-A0-002 files PR #199 added to main |
| `gh pr view 200` / `gh run view 37475987264` | — | CI `bootstrap` on `1509aef`: **FAILURE** at "Verify branch scope" with `BASE_SHA: d863f40…`, exit 73, same three paths; "Validate repository bootstrap" succeeded; the database steps were skipped |
| `git show <c>:work-packages/WP-0A-A0-007.json \| grep -c root/r0_steward` for `53d7d2e`, `dd6c7ec`, `cff15d1`, `f3e0bce` | — | 1 each |

**Read:** `CONTRIBUTING_AGENTS.md`; `work-packages/WP-0A-A0-007.json` whole at `1509aef`; `git diff
b61735f..1509aef` whole (3 files); `evidence/WP-0A-A0-007/author-self-check-2026-10-06.md`;
`handoffs/WP-0A-A0-007-author-handoff.json`; `RFC-2026-016` status line, §3, §6, section list;
`RFC-2026-019` §4/4, §7; `RFC-2026-028` header (status, Implemented-in-part, Implemented Q-028-5);
`db/foundation/migrations/173_worker_login_identity.sql` (statements, comments stripped);
`.github/workflows/ci.yml` "Verify branch scope" step; `evidence/WP-0A-A0-005/a1-security-reverify-2026-10-05.md`
for this role's vocabulary.

## 3. The PR #200 diff itself

No security or privacy regression. Only the manifest, one evidence file and the handoff change; the tree
scan is clean; the diff adds no credential, private URL, connection string or personal data (grep of the
three files for `postgres://`, `password`, `token`, `secret` finds only the handoff's "no secrets"
sentence). Read for what a security reviewer owns:

- **`open_blockers[1]` (service path narrowed again): accurate, and the security tail is kept.**
  `RFC-2026-028`'s status line reads "Approved 2026-10-05"; `173_worker_login_identity.sql` is on main and
  creates `app_worker_login` `LOGIN NOSUPERUSER NOBYPASSRLS NOINHERIT … PASSWORD NULL` with one grant
  `app_worker … INHERIT FALSE, SET TRUE, ADMIN FALSE`, exactly as the blocker states. The items the blocker
  lists as still open (Q-028-13 / Q170-c, Q-028-3, Q-028-12, A1R-2, A1's co-owner acceptance) are each in
  RFC-2026-028's header, and the blocker keeps "declared not applied to the provisioned instance". The
  sentence that matters most is unchanged: no document may state that forced RLS constrains the service
  path. Its ground moved and is now the right one: not "the service path is undecided" (largely no longer
  true) but JWT custody, `RFC-2026-019` §7 ("The signing secret can still claim `service_role`, which
  bypasses RLS"). I agree DATA-DEC-03 does not close: as DATA-DEC-03's co-owner I have **not** accepted
  RFC-2026-028, and this file is not that acceptance.
- **`independence` (cross-vendor withdrawn):** same wording and the same limit as the siblings I have
  already read (WP-0A-A0-005); it keeps all of § Separation of duties, keeps `/claude/a1_bastion` as
  `security_reviewer_agent_run_id` and `security_approved` in `review_and_test_gates`, and adds that the
  A1 analysis is still not a role signature. Nothing is widened.
- **`open_blockers[2]`:** the removed clause is the cross-vendor one only; "does not satisfy
  no_self_approval" stays, and the blocker now says the analysis is not the `security_approved` gate. Correct.
- **`_run_id_disambiguation`:** measured; no manifest version names `/root/r0_steward` outside that field.
  The correction removes a false statement and grants nothing. `amends_without_owning.paths` stays empty.
- **`product_reviewer_note`:** not a security matter; left to C0 as the Author asks.
- **RFC-2026-016 not edited:** its status line and §4 still say "the service path remains undecided".
  From a security reading, a stale "undecided" errs on the safe side (it claims less control than
  exists), so leaving it to the governance path is acceptable.

## 4. Findings

### A1-007-1 (Medium, merge-blocking, not security): CI is red on the head; "a sync is not needed" is wrong

The Author's not-done list says a sync with `main @ d863f40` is not needed because branch scope "against
the branch point b61735f exits 0". CI does not measure against the branch point: the workflow passes the
PR event's `base.sha`, which is the **base branch tip** (`d863f40`), and `verify-branch-scope.mjs` diffs
from that commit, so PR #199's three WP-0A-A0-002 files read as changes this branch made. Measured
locally (exit 73) and in CI run `37475987264` (failure, exit 73, the same three paths). RFC-2026-002 and
the standing delegation both require a green required CI run on the head, so #200 cannot merge as is.
Remedy (the Author's, not mine): merge `main` into the branch (the handoff guard accepts a PR merge
commit) and re-run CI. Not a security defect; I record it because it blocks the merge.

### A1-007-2 (Low): the blocker's "still open" list is the status line's, not every open security item

`open_blockers[1]` says what is still open "as RFC-2026-028's own status line names it". Other open items
with a security edge sit in RFC-2026-028's "Implemented in part" paragraph, not its status line: §5/5's
secret-scan half is NOT implemented (the repository scan does not name a migration password or a
verifier literal, owed to the Integration Owner's path); A1-173-1 (the login role can set its own
credential and session defaults) is folded into A1R-2 there; Q-028-11 (connection limit) is open. The
blocker is accurate as worded, but a reader may take its list as exhaustive. Suggest the next increment
point to RFC-2026-028's header as a whole ("among them"). Not a condition on this verdict.

### A1-007-3 (Info, for C0): one commit in the self-check's list did not touch the manifest

`author-self-check-2026-10-06.md` §3 lists `93bbdb6` among "every commit that touched this manifest";
`git log -- work-packages/WP-0A-A0-007.json` at `b61735f` shows `53d7d2e`, `dd6c7ec`, `cff15d1`,
`f3e0bce` (`93bbdb6` changed only `RFC-2026-016` and `test-kits/integrity-manifest.json`). The conclusion
(each version names `/root/r0_steward` once, in the disambiguation field) holds; I measured it on the four.

### Carried, agreed, not re-litigated

`RFC-2026-016`'s substance (the `TO authenticated` / service-only contradiction, the carried/discovered
split as amended on RFC-2026-022, the GUC as containment not tenant isolation, refusing to claim the
service-path control) stands as previously disposed. On Supabase the `service_role` key bypasses RLS
(§3); the tail of `open_blockers[1]` keeps that boundary, and I would refuse any text that dropped it.

## 5. Verdict

**`security_approved`** for WP-0A-A0-007 at `1509aef`, on the record as it stands: no security or
privacy condition is set. A1-007-2 and A1-007-3 are suggestions, not conditions.

- **Stop-the-line:** no. No secret, credential or personal data is exposed, no tenant path changes, and
  the record keeps the one claim that must not be made (forced RLS constrains the service path).
- **Does anything block the merge?** Yes, but not from security: **A1-007-1**, CI is red on the head
  (branch scope against `d863f40`). Sync with `main` and get a green run; a sync that brings in only
  #199's WP-0A-A0-002 files does not need an A1 re-check, anything else in the branch's own diff does.
  The C0, Q0 and R0 first verdicts are also still owed, and the package stays at `in_review` until they
  exist.
- This verdict is not my acceptance of RFC-2026-028 as DATA-DEC-03's co-owner; that is owed separately.
