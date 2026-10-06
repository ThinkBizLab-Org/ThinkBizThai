# C0 review of WP-0A-A0-004's CI increment (PR #197, head `6fa511f`)

Subject: PR https://github.com/ThinkBizLab-Org/ThinkBizThai/pull/197 (Draft, GOVERNANCE), branch
`agent/claude/WP-0A-A0-004-ci-independent-guard-step`, head `6fa511fdfe76a86937f92d839ecd493fd61fbf9e`,
base `main @ 9b34be7`. Two commits: `475fa3d` (the change) and `6fa511f` (the handoff, last and alone).
Nine paths: `.github/workflows/ci.yml`, RFC-2026-007, `evidence/VERIFICATION.md`, the Author record,
the handoff, `scripts/test-suite-contract.mjs`, `test-kits/branch-scope.test.mjs`,
`test-kits/integrity-manifest.json`, `work-packages/WP-0A-A0-004.json`. Reviewed 2026-10-06.

## 0. What I am

I am a subagent of `/claude/a0_atlas`, spawned by A0's workflow script to act as the independent
Reviewer run `/claude/c0_contract_reviewer` (RFC-2026-024). I share a vendor (Anthropic) and a parent
with the Author, and the Author's run wrote my brief. I wrote none of the PR's content and I fix
nothing. This file is a Reviewer verdict only. It is not a security review, a test verification, an
integration verdict, the Owner's disposition of the amendment, a merge authorisation or a G0
signature, and it moves no package status. The Owner's condition (A1 and Q0 confirm the skip cannot
let a pull request that should be checked slip through) is theirs to answer; F1 below is offered to
them as input, not as their confirmation.

## 1. Verdict

**`approved_with_conditions`.** The change is the rule the Owner was offered plus one owed fix, the
required check context is unchanged, and every measurement the Author reports reproduces. One defect
makes the decision step fail OPEN on its own (F1); in today's workflow another guard in the same job
turns the job red first, so no green can result, but the property the Owner made a condition of the
change rests on that coupling. Conditions before the Owner merges: C1 (F1 fixed, or accepted by the
Owner on record with the coupling named) and C2 (the Owner's disposition names §C as well as §A/§B).

## 2. Measured

Private clone in the scratchpad, checked out **by branch name** (`git rev-parse --abbrev-ref HEAD` =
the package branch, HEAD = `6fa511f`), `npm ci`, Node `v24.20.0`, npm `11.19.0`. No database.

| Command | Exit | Result |
|---|---|---|
| `npm run check` | 0 | `tests 698 / pass 698 / fail 0 / cancelled 0 / skipped 0 / todo 0` |
| `npm run check:handoff` | 0 | |
| `node scripts/verify-branch-scope.mjs origin/main WP-0A-A0-004` | 0 | "all 9 changed path(s) are declared, and every amendment explains one" |
| `node scripts/verify-test-coverage-floor.mjs` | 0 | |
| `node --test test-kits/branch-scope.test.mjs` | 0 | 16/16 |
| `node scripts/validate-work-package-ownership.mjs work-packages` | 0 | |
| `node scripts/validate-work-package-role-separation.mjs work-packages/WP-0A-A0-004.json` | 0 | |

I also cut the `Decide whether the negative control must run` body out of `ci.yml` at `6fa511f` and
ran it with `bash --noprofile --norc -eo pipefail`, `GITHUB_OUTPUT`, `BASE_SHA` and the workflow's
`DB_SURFACE`, against throwaway repositories:

| Change on the head | Output | Correct? |
|---|---|---|
| `docs/r.md` edited | `skip=true` | yes |
| `db/foundation/migrations/0002_b.sql` added | (none, control runs) | yes |
| `db/foundation/migrations/0002_ข้อมูล.sql` added | `skip=true` | **no** (F1) |
| `db/foundation/migrations/0002_a"q.sql` added | `skip=true` | **no** (F1) |
| `db/ฐาน/x.sql` added | `skip=true` | **no** (F1) |

## 3. Is the change what the Owner approved and the RFC states?

**§A, the skip rule: yes, as written.** The Owner's words (`ได้ทำตามที่คุณแนะนำ`) answer A0's option 1:
run the negative control only when the pull request touches the database surface. `ci.yml` matches
RFC-2026-007 Amendment §A item by item: the step id `db_surface`, `if: github.event_name ==
'pull_request'`, `git diff --no-renames --name-only "${BASE_SHA}" HEAD`, `skip=true` written at one
place only after the diff succeeded and grep exited 1, and `if: steps.db_surface.outputs.skip !=
'true'` on the control. `DB_SURFACE` in the workflow is byte-for-byte the pattern in the RFC and the
Author record. In single quotes YAML keeps `\.` literal, so grep receives the pattern as written.

The two-dot, tree-to-tree comparison against `base.sha` is the right one. The control tests the
head's tree (the branch is checked out, not the merge commit), so the question is whether the head's
surface equals the surface of a commit whose control already ran. A three-dot (merge-base) diff
would answer a different question. When `main` has moved ahead of the branch, the two-dot diff also
lists `main`'s own changes, which only makes the control run more often.

**§B, fail-closed: yes, except F1.** Push to `main` (step does not run, output unset, control runs),
empty/missing/non-commit base, a failed diff, a grep exit other than 0/1 and a surface path all leave
`skip` unset, and the step exits 0 in each case. An empty diff (identical trees) yields grep exit 1 and
skips, which is correct. A `printf` killed by SIGPIPE would surface as 141 under `pipefail` and run
the control.

**§C, the checkout assertion: correct, but beyond the Owner's literal words (F2).** It sits directly
after `actions/checkout`, compares `git rev-parse HEAD` with `github.event.pull_request.head.sha ||
github.sha`, and fails on a mismatch or an empty value. On a push, `ref` is empty, checkout takes
`github.sha`, and the assertion holds. I agree with the Author that removing the `-z` clause is an
equivalent mutant: an empty expectation never equals a 40-hex HEAD.

**§D/§E/§F.** The tests cover what §D lists; I re-ran them and they pass. §E records image drift, an
inherited red base and the static closure. It misses two cases (F3). §F's rollback is accurate.

## 4. Is the required check context unchanged?

**Yes.** `git diff 9b34be7 6fa511f -- .github/workflows/ci.yml` contains no line at job level or
above. The workflow `name: Bootstrap validation`, the `on:` block, `permissions`, the job id
`bootstrap` (no job `name:`), `runs-on` and `services` are untouched, and no job-level `if:` exists.
The diff adds two steps and one step-level `if:`. A skipped step leaves the job, and the check
context `bootstrap`, reporting on every pull request.

## 5. Findings

### F1 (MEDIUM): non-ASCII or quote-bearing paths escape `DB_SURFACE`, so the decision step fails open in isolation

`git diff --name-only` honours `core.quotePath`, which is on by default on the runner and is not
changed by `actions/checkout`. Any path with a byte above 0x7F, a `"`, a backslash or a control
character is printed C-quoted with a leading `"`, for example
`"db/foundation/migrations/0002_\340\270\202...sql"`. The pattern is anchored with `^(db/|...)`, so
the path matches nothing, grep exits 1, and the step writes `skip=true` (§2 table). That is not just
cosmetic. `scripts/db/run.mjs:49` applies every `*.sql` in `db/foundation/migrations/` through
`readdir`, and `:3106` does the same for `invariants/`. So a Thai-named migration is loaded by the
database steps, yet the control that proves each table family is detectable would be skipped. This
is a Thai-language repository, so the case is not exotic.

Why the job does not go green today. `Verify branch scope` runs earlier in the same job and reads
the diff the same quoted way (`scripts/verify-branch-scope.mjs:127`). No manifest's declared paths
accept a path beginning with `"`. I checked all of them with the module's own `undeclared()`. So the
guard exits 73 and the job fails first, and `verify-disposition-branch.mjs` likewise matches no
quoted path. The skip therefore cannot produce a green result at `6fa511f`. But that safety is a
coincidence: it comes from a second guard's identical quoting behaviour. If that guard is ever
corrected to read paths unquoted, this hole opens with no test going red. The new tests cover no
such path.

Fix (Author's, not mine): `git diff -z --no-renames --name-only "${BASE_SHA}" HEAD` piped to
`grep -z -E`, or at the least `git -c core.quotePath=false`. I measured that `quotePath=false` alone
still quotes a name containing `"`, while `-z` prints both test names raw. Add a test with a non-ASCII
path under `db/` and one with a `"`. Until it is fixed, Amendment §B's sentence "It writes nothing in
any other case" holds for the job and not for the step.

### F2 (LOW, process): the increment carries §C, which the Owner's words did not cover

The Owner's instruction answered option 1, the skip. The checkout assertion is A1 F1 from PR #189.
The manifest at `main` said its fix would be "a governance PR for the Product Owner". Bundling it
into this governance PR follows that route, and the amendment is written Proposed with §C named, so
nothing is presented as approved that is not. Condition C2: the Owner's disposition of the amendment
should name §C explicitly, so that "do as you recommend" is not read as covering it. Note one
behaviour change §C introduces. Re-running an older run after the branch has moved now fails the job
red on that older commit, where it used to go green on a commit it had not tested. That is the
intent, but it should be in the Owner's view.

### F3 (LOW): the skip's justification assumes the base is a `main` commit whose control ran

The workflow comment says the base's "push to main ran it". `on: pull_request:` has no branch
filter, though. For a pull request into another branch (a stacked PR), `base.sha` is a commit whose
control may never have run. A `main` commit whose push run was cancelled, is still running, or was
skipped (`[skip ci]` in a merge message) has no result to inherit either. §E covers only "base red
on main". The final pull request into `main` is still judged against `main`, so this cannot carry an
untested surface into `main` by itself. Recommend either adding `github.event.pull_request.base.ref
== 'main'` to the decision step's `if:`, which makes other bases run the control (fail-closed), or
recording both cases in §E. This is not a merge condition.

### Noted, no finding

- The Author's timing reproduces in the manifest and the RFC as two separate figures: the Owner was
  given 22 min / 12.4 min, and run 37395796828 measured 18 min 30 s / 10 min 18 s. Both are recorded
  and labelled.
- `amends_without_owning` declares exactly the two foreign paths changed (`evidence/VERIFICATION.md`,
  `scripts/test-suite-contract.mjs`), and the branch-scope guard confirms each explains a change.
  `test-kits/integrity-manifest.json` falls under `authorized_cross_package_amendments`.
- The A1 F1 blocker is moved to "addressed, not verified" rather than closed. That is correct for an
  Author.

## 6. What this review does not establish

No CI run exists for `6fa511f`'s new steps as I write this, and none can show a skip until a later
pull request that misses the surface. A1's and Q0's answers to the Owner's condition, R0's
integration, and the Owner's disposition and personal merge (RFC-2026-025 §5 item 6) are all still
owed.
