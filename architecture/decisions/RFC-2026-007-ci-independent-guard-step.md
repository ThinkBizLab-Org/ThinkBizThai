# RFC-2026-007 — CI must invoke the test-integrity guard as its own step

Status: Approved 2026-09-02 by the Product Owner — CI invokes the guard as its own step; this is the step that survived the .npmrc bypass. Limitations and Rollback in this document stand unchanged.
Decision needed by: before any package relies on `npm run check` as evidence that tests ran
Owner: A0 Architecture/Integration
Protocol version: `1.0.0`

## Problem

`.github/workflows/ci.yml` runs exactly one validation step:

```yaml
      - name: Validate repository bootstrap
        run: npm run check
```

Every guard this repository has — the toolchain check, the secret scan, the
protocol validators, the coverage floor and the test suite itself — is invoked
*by that one command*, from a `scripts.check` string inside `package.json`.

**A guard invoked by a command cannot constrain the command that invokes it.**
Independent testing demonstrated two forms of this, and neither is closable from
inside the scripts:

| Injected `scripts.check` | Result |
|---|---|
| `… && npm run test:bootstrap &` | exit **0**. The trailing `&` backgrounds the whole chain, so the shell returns before any step's exit code matters. The guard *does* run and *does* print its rejection; the process status was already decided. |
| every `&&` replaced with `\|\|` | exit **0**. Step 1 succeeds and the chain short-circuits. **Correction, from independent review:** the guard IS invoked — WP-0A-A0-002's first-step rule puts it there, it runs, and it correctly rejects with exit `81`. `||` then **discards that exit code** and hands off to the next step, which succeeds. An earlier draft of this RFC said the guard was never invoked, which wrongly described A0-002's rule as ineffective when it is firing. The outcome is the same — a green job that ran no test — but the mechanism is discarded status, not absent execution, and that distinction is the whole reason the fix has to come from the caller. |

WP-0A-A0-002 closed everything it could reach from inside: the chain is parsed
structurally, `||`, `;`, `|`, `#` and a surviving `&` are rejected inside a step,
the guard is required to be the **first** step, and the chain must **end** with the
runner. Those close *demotion*. They cannot close *non-invocation*, because the
code that would reject it does not run.

The integrity manifest does not help either: in both cases the exit code is `0`
whether or not the digests match.

So today, **a one-character edit to `package.json` turns CI green while executing
no test at all**, and the repository's own controls are structurally unable to
notice.

## Decision

`.github/workflows/ci.yml` gains **one step, before the existing one**:

```yaml
      - name: Verify test-integrity guard
        run: node scripts/verify-test-coverage-floor.mjs
      - name: Validate repository bootstrap
        run: npm run check
```

The guard is then invoked **by the workflow**, not by the script it audits. A
`package.json` edited to skip or neuter it now fails at a step that edit cannot
reach, because the workflow file is a different artifact with a different owner and
a separate review path.

The guard now also requires **all five** gating steps in order, not merely the guard and the runner: independent review reduced `check` to `verify:coverage-floor && test:bootstrap`, recomputed the digest, and both the new workflow step and `npm run check` exited `0` — silently deleting the toolchain pin, the secret scan and all three protocol validators from CI. Verified after the fix: the same edit now exits `81`.

`.github/workflows/ci.yml` and `scripts/verify-test-coverage-floor.mjs` are both
already digested in `test-kits/integrity-manifest.json`, so editing either to
defeat this is a visible line in a diff.

## Ownership transfer

`.github/workflows/ci.yml` is a WP-0A-A0-001 output, and that package is
`integration_verified`. `CONTRIBUTING_AGENTS.md` protects CI configuration and
directs a change through the Integration Owner/RFC path, which is what this is.
The file transfers to WP-0A-A0-004 for this change; WP-0A-A0-001's manifest is
amended only to drop it from `writable_paths` and `outputs.files`, and records the
amendment in `ownership.amended_by` with an acknowledgement pending from
`/root/r0_steward`.

## What this does NOT do

- It does not make the guard unbypassable. Someone who can edit `ci.yml` can delete
  the step. **This moves the bypass from a place no control can see into a place a
  reviewer reads**, and no further than that.
- It does not close the digest class: a commit that edits a guarded file *and* its
  digest still passes. Independent review established that as a fixed-point
  property of a repository where one commit can change every file.
- It does not satisfy the Gate G0 protected-CI requirement. That needs native
  branch protection, which remains blocked on an external constraint recorded in
  `evidence/g0-tracker-th.md`.

## Verification

- `npm run check` on pinned Node `24.20.0` / npm `11.19.0` — exit `0`, 119 tests.
- `check` reduced to the guard plus the runner — exit `81`, naming the missing steps.
- With `scripts.check` neutered by a trailing `&`, the **workflow's guard step**
  must fail even though `npm run check` exits `0`. This cannot be observed locally,
  because the failure is a property of the workflow rather than of any command; it
  is verified by reading the workflow and by the guard's own exit code when invoked
  directly.
- `node scripts/verify-test-coverage-floor.mjs` — exit `0` standing alone.
- The ownership validator must accept the transfer with no cross-package overlap.

## Rollback

Revert through a reviewed revert PR. The change adds one workflow step and moves
one path between two manifests; it creates no persisted data, provider state,
credential, migration, or customer-data effect.

## Limitations

This RFC does not approve Gate G0, does not authorize a merge, and does not grant
native protected CI. It is a procedural improvement to a workflow file, and its
whole value is that it puts one guard outside the blast radius of the script it
guards.

## Amendment 2026-10-06 — the negative control runs only when the database surface changed; the checkout is asserted

Status of this amendment: Proposed 2026-10-06, for the Product Owner's disposition. The
decision above stays Approved and unchanged; this section adds two rules to the same workflow.
It changes CI, so under RFC-2026-025 §5 item 6 its pull request is merged by the Owner
personally, never by delegation.

Record 2026-10-08 (R0-5 on PR #212; the status above is not changed by it). PR #197, which carried
this amendment, was merged on 2026-10-06 as `3072e85`. A0 reports that the Owner, told of §5 item 6,
directed that merge with `คุณทำเลย` (`evidence/WP-0A-CON-005/records-transcription-2026-10-06.md`
line 41). No written Owner disposition of this amendment's content is on record, so it still reads
Proposed: the merge is recorded as a merge, not read as an approval. The manifest's
`required_human_authorities[2]` says the same.

Origin. A0 reported that one CI run takes about 22 minutes, of which the step `Negative
control - each table family must be detectable on its own` took 12.4 and `Validate repository
bootstrap` 8.4, and recommended option 1: run the negative control only when the pull request
touches the database surface. The Owner answered, verbatim, `ได้ทำตามที่คุณแนะนำ` ("yes, do as you
recommend"), on the condition that A1 (Security) and Q0 (Tester) confirm the skip cannot let a
pull request that should be checked slip through. Measured independently on main at `a5f6466`
(run 37395796828, push to main): the control took 10 min 18 s of an 18.5-minute job.

### A. The skip rule

1. A new step, `Decide whether the negative control must run` (`id: db_surface`), runs on
   `pull_request` events whose base branch is `main` only (`github.event.pull_request.base.ref
   == 'main'`), inside the existing `bootstrap` job. The skip inherits the base's result, and only
   a base on `main` is known to have run the control; a stacked pull request runs it (A1 F2, C0 F3,
   R0-F4 on PR #197). That `if:` is an Actions expression, and Actions compares strings ignoring
   case, so the step's first test, in bash, is the case-sensitive one (§B, A1 N1 on PR #197).
2. It computes `git -c core.quotePath=false diff -z --no-renames --name-only
   <pull_request.base.sha> HEAD`, a tree-to-tree (two-dot) diff, so a file moved off the surface
   still names its old path and a branch behind `main` is compared with what `main` holds now.
   Paths are NUL-terminated and matched with `grep -z`: without `-z`, git quotes a path holding a
   non-ASCII byte, `"`, `\`, TAB or newline, the anchored pattern misses it, and a Thai-named
   migration would skip the control (C0 F1, A1 F4, Q0 Q10, R0-F1 on PR #197).
   `core.quotePath=false` alone is not enough; TAB and `"` are quoted regardless.
3. It lists both trees (`git ls-tree -r -z`) and runs the control if either holds a symlink
   (mode `120000`). A link on the surface can read a file off it, and that file's change names
   no surface path (A1 F3 on PR #197). The repository holds none today, so this costs nothing.
4. If no changed path matches `DB_SURFACE` (below) and neither tree holds a symlink, it writes
   `skip=true` to the step output. It writes nothing in any other case.
5. The negative control carries `if: steps.db_surface.outputs.skip != 'true'`. It is skipped
   only on that exact value; unset, empty or any other value runs it.
6. Only the STEP is skipped. The job, and the required check context `bootstrap`, run and report
   on every pull request. `npm run check`, the database foundation step (shim, clean migrate,
   schema lint and one full `db-rls-smoke`) still run on every pull request.

`DB_SURFACE`, as written in the workflow:

```
^(db/|scripts/db/|tests/db/|test-kits/db/|\.github/|(GNUmakefile|makefile|Makefile)$|package\.json$|package-lock\.json$|\.node-version$|(.*/)?\.gitattributes$)
```

Changed 2026-10-06 after the role runs on PR #197: `GNUmakefile` and `makefile` added, because
GNU make reads either before `Makefile` (A1 F1); `.gitattributes` at any depth added, because an
`eol=` or `filter=` attribute changes the bytes checked out on the surface without changing a
path on it (A1 F3).

Why each entry is there, measured rather than assumed. The control runs `make db-rls-smoke`
against the database the previous step built. The import graph of `scripts/db/run.mjs`, the
Makefile's `DB` command, and every repository path those modules and the two database steps
name, is:

- `Makefile`
- `scripts/db/run.mjs`, `rls-smoke.mjs`, `authz-proofs.mjs`, `psql-driver.mjs`, `sql-lexer.mjs`,
  `audit-producer-rule.mjs`
- `tests/db/identity/run-isolation.mjs`, `isolation-cases.mjs`, and the 21 fixture files in
  `tests/db/identity/fixtures/`
- `db/foundation/test-helpers/rls-assertions.mjs` and `auth-context.sql`
- `db/foundation/ci/supabase-shim.sql`, `prerequisites.sql`, `migrations/`, `invariants/`
  (with `superseded.json`), `seeds/fixture-catalog.json`, and 13 of the 15 files in `lint/`
  (`purge-order.json` and `retention-map.json` are named by no module the control loads; the
  whole of `db/` is on the surface regardless)
- `.github/workflows/ci.yml` itself: the step's own entries, the service image and the earlier
  steps

All of it lies under `db/`, `scripts/db/`, `tests/db/`, `Makefile` or `.github/`. The
remaining entries are margin and not required by the measurement. `test-kits/db/` is the
static database suite; the control does not read it. `package.json`, `package-lock.json` and
`.node-version` are the toolchain and install. A test (below) recomputes the graph on every
`npm run check` and fails if any path it reaches falls outside the pattern.

### B. Fail-closed cases. In each of these the control RUNS

- A push to `main`: the decision step does not run, its output is unset, and the control runs.
- A pull request into any branch other than `main`: likewise.
- A pull request into a branch whose name equals `main` only when case is ignored (`MAIN`,
  `Main`). The step's `if:` is true for it, because GitHub's expressions compare strings ignoring
  case, so the `if:` alone does not keep it out (A1 N1 on PR #197). The case-sensitive check is
  bash's, the step's first test, fed the base branch through the step's environment
  (`BASE_REF: ${{ github.event.pull_request.base.ref }}`). As written in the workflow:

  ```
  if [ "${BASE_REF:-}" != main ]; then
    echo "negative control: the base branch '${BASE_REF:-}' is not exactly main; the control RUNS"
    exit 0
  fi
  ```

  An empty or unset `BASE_REF` fails the same test and runs the control.
- An empty `pull_request.base.sha`, or a base commit that is not in the clone (for example a
  shallower checkout).
- A `git diff` or `git ls-tree` that exits non-zero, including a base commit whose tree is
  not readable.
- A symlink in the base tree or the head tree.
- A `grep` that exits with anything other than 0 (matched) or 1 (matched nothing). Exit 2, a
  malformed pattern, runs the control; it is not read as "nothing matched".
- Any changed path on the surface, including a deletion or a move off it.
- The decision step never fails the job on these cases. A failure there would stop the control
  by failing the job rather than by running it, and the job would then report on an untested
  head.

### C. The checkout assertion (A1 F1 on PR #189)

Straight after `actions/checkout`, `Verify the checkout is the commit this run reports on`
compares `git rev-parse HEAD` with `github.event.pull_request.head.sha || github.sha`. It
fails the job if they differ, or if the expected value is empty. Checking out by `head_ref`
checks out the branch as it is when the job starts. If the branch moved after the event, the run
would otherwise test the newer tip and report on the older commit. On a push the checkout takes
`github.sha` and the assertion holds trivially.

### D. Tests

The tests are in `test-kits/branch-scope.test.mjs`. They cut the step bodies out of `ci.yml`
and run them with `bash -e`, as GitHub runs a `run:` that names no shell (the job log prints
`shell: /usr/bin/bash -e {0}`; corrected from `-eo pipefail` for Q0 Q13 on PR #197), against
throwaway repositories. They cover:

- the skip on a change off the surface;
- a run on a base branch that is not exactly `main` (`MAIN`, `Main`, `mAiN`, `main2`, `main `,
  `refs/heads/main`, empty, unset), the skip on `main` itself, and the guard's four lines quoted
  from the workflow as the step's first;
- a run on each surface entry (including `GNUmakefile`, `makefile` and `.gitattributes` at the
  root and below), on a move off it and on a deletion;
- a run on a surface path git would quote: Thai, `"`, `\`, TAB and newline;
- a run when either tree holds a symlink, including a link only in the base;
- a run on a branch behind `main` whose `main` changed `db/` (pins the two-dot diff);
- a run from the diff clause itself, on a base commit whose tree was removed;
- a run on an empty base, a missing base, a base that is not a commit, no repository, and a
  pattern grep cannot compile;
- the `!= 'true'` condition, the `base.ref == 'main'` condition, the single `skip=true` writer
  and the absence of a job-level `if`;
- the measured closure;
- the checkout assertion passing on the right commit and failing on a moved or empty one.

### E. What this does NOT do

- **Image drift.** It does not protect against an input no path names. `postgres:17` is a
  floating tag, and the `ubuntu-24.04` runner image supplies `psql`. A change there can alter the
  control's outcome on a pull request that skips it. The control still runs on every push to
  `main`, so such drift is caught at the next merge, not on the pull request.
- **Base red on main.** A pull request that skips the control inherits the base's result. If
  the control was red on `main` at that base, the pull request does not reveal it; `main`'s own
  run does.
- **A hostile author.** `npm run check` runs the pull request's own code before this step, and
  that code can write `GITHUB_PATH` or `GITHUB_ENV` (for example, a `git` that prints nothing), so
  the step would write `skip=true`. The same code can already make the control itself meaningless,
  so this adds no new class of attack: failing closed here protects against honest change, not
  against an author who intends to defeat it (A1 I1 on PR #197).
- **The SKIPPED branch has not yet run on the platform.** PR #197 touches `.github/`, so its own
  runs take the RUNS branch. The first pull request into `main` after the merge that touches no
  surface path should have its job log read once to confirm the step printed `the control is
  SKIPPED` and the control step shows as skipped (Q0 Q14 on PR #197).
- **Gaps in the measurement.** The measured closure is static. A module that builds a path at
  run time from pieces no literal names would escape the test. None does today: every file the
  walk reaches is named by a literal or an import.

### F. Rollback

Rollback is a reviewed revert of the two steps and the condition, which restores
"always run". No data, provider or credential effect.

## Amendment 2026-10-08 — CI prints the records-only classification, and gates nothing on it

Status of this amendment: implements a step the Product Owner already approved. RFC-2026-025 §6
was approved on 2026-10-08 (`evidence/WP-0A-DB-00/product-owner-disposition-2026-10-08-rfc-025-s6-answers.md`),
and its §6.6 item 1 names this step as owed by the owner of `.github/workflows/ci.yml`, before the
first delegated light-path merge: "a step that prints the classifier's verdict on every PR, without
gating on it". This section records how that step is built. It decides nothing new about the light
path, and the decision above and the Amendment 2026-10-06 stand unchanged.

Origin and who presses. Asked whether A0 may press this governance pull request, the Owner replied,
verbatim, on 2026-10-08: `ให้ A0 กดเอง ลุยตามแนะนำเลย` (A0's translation: "let A0 press it itself; go
ahead as recommended"). That is the Owner's exception to RFC-2026-025 §5 item 6 for this pull
request only, in the form PR #211 received one.

### A. The step

`Classify the pull request for the records-only light path (informational, gates nothing)` runs on
`pull_request` events only, straight after `Verify pinned toolchain` and before `Clean install`.

1. It prints `RECORDS-ONLY` only when the classifier exits 0 and its first line begins
   `records-only: `. It prints `NOT RECORDS-ONLY`, with the reason, in every other case: a base
   branch that is not exactly `main` (compared in bash, case-sensitively), an empty or missing base
   commit, a base holding no readable classifier, a classifier exit 1 whose first line begins
   `NOT records-only (` (its reasons follow), and any other outcome, including an exit 2 for a diff
   or blob git could not read, an exit 0 without the `records-only: ` first line, and an exit 1
   without the classifier's own first line, such as a crash before its guard (fail closed; the last
   is R0-1 on PR #212).
2. The verdict and the classifier's own output go to the job log and to the job summary
   (`GITHUB_STEP_SUMMARY`). The step writes no step output, no environment and no path, has no `id`,
   and no later step reads it. Its only `exit` is `exit 0`. It therefore cannot make a pull request
   pass anything it would otherwise fail, and it cannot fail one.
   The classifier's reasons name the pull request's paths, and a path name may hold a newline and
   `::`. The runner reads a workflow command after leading whitespace, so an indent does not stop
   one, and an `::add-mask::` registered mid-step masks the job summary written in the same step.
   Every log line of the step is therefore printed between `::stop-commands::<token>` and
   `::<token>::`, the token being 32 hex digits read from `/dev/urandom` at run time; with no such
   token, the reason and the output are left out of the log and only the verdict is printed. The
   job summary escapes `&`, `<` and `>` in the reason and in the output, and carries at most the
   first 64 KiB of the output with a note that it was cut, so a very large diff cannot push the
   summary past GitHub's 1 MiB limit; the log keeps all of it (C0 F1 and F3, A1-L1 and A1-L2,
   Q0 Q2, R0-2 and R0-3 on PR #212).
3. It runs the **base's** classifier: `git show <base.sha>:scripts/db/classify-records-only.mjs`
   into a scratch directory, then `node <copy> <base.sha> HEAD`. A pull request that edits the
   classifier is judged by the copy on `main`, which refuses the edit (a script is not a record).
4. It runs before `npm ci` and `npm run check`, the first steps that execute the pull request's own
   code, so the `GITHUB_PATH` route of §E "A hostile author" is not open to it.
5. The negative-control skip rule (Amendment 2026-10-06 §A) is unchanged. The decision step stays
   the workflow's only `GITHUB_OUTPUT` writer, and its test still pins that.

### B. Tests

Nine tests in `test-kits/branch-scope.test.mjs` (six from the first increment, three added
2026-10-08 for the role findings on PR #212) cut the step body out of `ci.yml` and run it with
`bash -e` against throwaway repositories whose base commit holds a copy of the real classifier:

- the step's shape: one `if:` (pull requests), no `id`, no `continue-on-error`, no write to
  `GITHUB_OUTPUT`/`GITHUB_ENV`/`GITHUB_PATH`, one `exit 0`, one path to `RECORDS-ONLY`, the base's
  classifier and not the head's, placed after the toolchain check and before `npm ci` and
  `npm run check`;
- a records-only diff (a new and an appended session record, a handoff) prints `RECORDS-ONLY`;
- a code change, a rewritten record and an Owner disposition print `NOT RECORDS-ONLY` with the
  classifier's reasons;
- a head that replaces the classifier with one that always says records-only still prints
  `NOT RECORDS-ONLY`;
- an empty, missing or non-commit base, no repository, a base with no classifier, an unrelated
  base (no merge base) and a missing blob print `NOT RECORDS-ONLY` and exit 0;
- a records-only diff into `MAIN`, `Main`, `main2`, `main `, `refs/heads/main`, `release`, an empty
  or an unset base branch prints `NOT RECORDS-ONLY`, the same diff into `main` prints
  `RECORDS-ONLY`, and with no job summary the log still carries the verdict;
- a path name holding newlines, `::warning` and `::add-mask::` reaches the log only inside one
  `::stop-commands::` window, read the way the runner reads it; the token is 32 hex digits and
  differs between runs; the summary heading is intact; with no token the injected lines are left out
  of the log (C0 F1);
- a stub classifier in the base: exit 0 without the `records-only: ` first line, exit 0 with it on
  a later line, and exit 1 without the classifier's first line print `NOT RECORDS-ONLY` as not a
  classification; exit 1 with it prints the reasons; exit 0 with it prints `RECORDS-ONLY`
  (C0 F2, Q0 Q1, R0-4, R0-1);
- a classifier output of 5,000 long lines is cut at 64 KiB in the summary, escaped, and kept whole
  in the log; a base ref holding `<` and `>` is escaped in the summary (A1-L2, R0-3).

### C. What this does NOT do

- It does not put a pull request on the light path. The reader of RFC-2026-025 §6.2 still runs the
  classifier on the head, records the command and exit code, and reads every line. The CI line is a
  second, independent print of the same exit code, not a substitute.
- It does not see a merge of `main` into the branch as a sync: `--sync` (§6.3) is not run in CI.
- Its verdict is for the commit CI tested, which the checkout assertion pins to the head the run
  reports on. A later commit needs a later run.
- It does not quote the path names the classifier prints. A path name holding a newline still shows
  in the log as an extra, indented line that may read like a verdict; it is never a command, never
  at column 0 and never the step's own verdict line. Quoting is the classifier's, owned by
  WP-0A-DB-00 (Q0 Q2 on PR #212).
  *Correction 2026-10-11 (A1-R1 on PR #212, `evidence/WP-0A-A0-004/a1-recheck-2026-10-07.md`; R0-255-5
  on PR #255):* "never at column 0" is false. The indent comes from `sed 's/^/  /'`, which starts a
  line only at a newline, and the runner's line reader also ends a line at a lone carriage return, so
  a path name holding `\r` shows its next part unindented, at column 0, and that part may read like a
  verdict. The rest of the sentence holds: that line is still inside the `::stop-commands::` window, so
  it is never a command, and it still comes after the step's own verdict line, so it is never that
  line; nothing reads the step, so nothing is gated on it. The sentence above is kept as written so the
  record of what was claimed stays readable.
- A base whose own classifier is wrong prints a wrong verdict. That classifier was reviewed and is
  digested on `main` (RFC-2026-025 §6.6 item 2).

### D. Rollback

A reviewed revert of the one step and its nine tests. Nothing reads the step, so removing it changes
no other step's outcome. No data, provider or credential effect.

## Amendment 2026-10-11 — CI prints the review tier and the lane, and gates nothing on them

Status of this amendment: implements a step the Product Owner already approved. RFC-2026-034 was
approved on 2026-10-11 (`evidence/WP-0A-A0-001/product-owner-disposition-2026-10-11-fast-lane.md`),
and its §8 item 2 names this step as owed: "CI prints the tier and the lane on every pull request",
by the owner of `.github/workflows/ci.yml` (this package) with the classifier's owner
(WP-0A-DB-00). It is also RFC-2026-030 §9 item 2 and §10 item 2: "a CI step that runs the base's copy
of the classifier and prints its tier on every PR". This section records how that step is built. It
decides nothing new about tiers or lanes, and the decision above and the Amendments 2026-10-06 and
2026-10-08 stand unchanged.

Who presses. RFC-2026-034 §2.2 ("Who presses governance", the Owner's answer to Q-034-6 on
2026-10-11, `ยืนยันทั้ง 6 ข้อ (Recommended)`) lets A0 press the governance pull request of §8 item 2
once C0, A1, Q0 and R0 pass on its final head and CI is green on it.

### A. The step

`Print the review tier and lane (informational, gates nothing)` runs on `pull_request` events only,
straight after the records-only step of the Amendment 2026-10-08 and before `Clean install`.

1. It runs the **base's** classifiers: `git show <base.sha>:scripts/db/classify-review-tier.mjs`
   and `git show <base.sha>:scripts/db/classify-records-only.mjs` into one scratch directory (the
   first imports the second), then `timeout 300 node <copy> <base.sha> HEAD --lane
   --head-ref=<head.ref> --repo=<repository> --head-repo=<head.repo.full_name>`. A pull request that
   edits either classifier is judged by the copies on `main`, which print it H and governance
   (RFC-2026-030 §4, A1-4). The two repositories let the audit lane rule out a fork whose branch
   carries WP-0A-A0-001's branch name (Q0-255-5, A1 I-1 on PR #255); the time limit keeps a head that
   makes the classifier slow from holding the job open (A1-255-3).
2. It prints a tier and a lane only when that classifier exits 0, its first line is
   `tier: <records|L|M|H> (`, exactly one line is `lane: <governance|records|audit|risk|fast>`, and the
   two agree (fast only with M or L, records only with records, risk only with H). In every other case
   it prints `tier: H (not classified)` and `lane: governance (not classified)` with the reason: a base
   branch that is not exactly `main`, an empty or missing base commit, a base holding either
   classifier unreadable, a classifier that runs past 300 seconds (`timeout` exits 124), a classifier
   exit other than 0, and an output that does not meet the rule above. A base classifier that does not understand `--lane` exits 2 with its usage line, so it
   prints not classified; that is the case on the pull request that adds this step, whose base has no
   `--lane`, and on every pull request until that one is merged. A path name that forges a second
   `lane:` line makes two, and so prints governance, not the forged lane.
3. The verdict and the classifier's output go to the job log and to the job summary, printed inert
   exactly as the records-only step prints its own (Amendment 2026-10-08 §A item 2): every log line
   between `::stop-commands::<token>` and `::<token>::` with a 32-hex-digit token from `/dev/urandom`,
   the reason and output left out of the log when there is no token, `&`, `<` and `>` escaped in the
   summary, and at most 64 KiB of output there. The step writes no step output, no environment and no
   path, has no `id`, and no later step reads it. Its only `exit` is `exit 0`.
4. It runs before `npm ci` and `npm run check`, the first steps that execute the pull request's own
   code, so the `GITHUB_PATH` route of §E "A hostile author" is not open to it. The negative-control
   decision stays the workflow's only `GITHUB_OUTPUT` writer.

### B. The lane, in the classifier

`scripts/db/classify-review-tier.mjs` (WP-0A-DB-00's, amended by this pull request) gains `laneOf`
and the `--lane`, `--head-ref`, `--repo` and `--head-repo` flags. The lane follows RFC-2026-034 §2.2,
each changed path tested whole (the diff is `--no-renames`, so no path carries a rename arrow):

- **governance** when any changed path
  - matches the governance row (`GOVERNANCE_PATTERNS`, matched case-insensitively). Tool
    configuration, lockfiles and Makefiles are matched by base name anywhere in the tree; the tool
    list is a denylist (`CODEOWNERS`, `mise.toml`, `.tool-versions`, `.envrc`, `.editorconfig`,
    `Dockerfile*`, `docker-compose*`, `compose*.y*ml`, `supabase/config.toml`, `.pre-commit-config.yaml`,
    Renovate's files, `lefthook.yml`, `Taskfile.yml`, `justfile` and the others it names), so a reader
    who sees a tool file it misses raises the lane (RFC-2026-034 §2.3). An agent tool's settings
    directory, `.github`, `.agents` and `docs` count as a bare file or symlink too. The fixtures the
    database harness loads are on it (`tests/db/**/fixtures/**` and any `.sql` under `tests/db/`), and
    so is a `test-kits/` directory other than `db/` and `contracts/`;
  - is a module a governance code file imports, transitively, read at the head. The walk is rooted at
    every JavaScript file at the head that a `never` or `guard` entry matches (the guards, validators,
    contracts, runners, classifiers and top-level guard tests) and at `scripts/db/run.mjs`,
    `scripts/db/rls-smoke.mjs`, `scripts/db/authz-proofs.mjs` and every other JavaScript file only
    `additive` entries match. It holds the modules they import, not the roots' directories. An import
    resolves close to how node resolves it, not identically (§D): the exact path; the path with `.js`, `.mjs`, `.cjs`, `.json`, `.ts`,
    `.mts` or `.cts` added; a directory's `package.json` `main`, then its `index.js`, `index.mjs` or
    `index.cjs` (Q0-255R2-1 on PR #255). A module it cannot read, an import read from code that resolves
    to nothing, leaves the repository, is a URL (any scheme but `node:`) or an absolute path
    (A1-255r3-2), or resolves to a file the walk does not read (anything but `.js`, `.mjs`, `.cjs` and
    `.json`: a TypeScript module is not scanned, it fails closed), an import named by an expression, or
    text the scanner cannot read makes the pull request governance;
  - is a code module a string in a module the walk reads names (round three on PR #255, A1-255r3-1):
    every string in such a module, whether or not the scanner reads it as an import, resolved from the
    module and from the repository root as above, that names a `.js`, `.mjs` or `.cjs` file at the head
    joins the walk; one that names code node can run and the walk cannot read (`.ts`, `.mts`, `.cts`,
    `.tsx`, `.jsx`, `.node`, `.wasm`) makes the pull request governance. A string that names data (JSON,
    SQL, Markdown, anything else) adds nothing. Because the classifier names the database roots and
    `scripts/test-suite-contract.mjs` names the tests the suite runs, both by strings, the database
    runner's imports and those tests are now reached from a guard root;
  - **any** symbolic link (mode `120000`) or gitlink (`160000`) at the head makes the pull request
    governance, wherever it is and whatever reaches or names it: the lane reads neither what a link
    points at nor a submodule's tree, and a link to a directory hides every path beneath it from
    `git ls-tree` (corrected 2026-10-11, round three on PR #255: C0-255r2-1, A1-255r3-1, R0-255r2-1; the
    earlier text counted only a link "that the walk reaches, that the harness names, or that a governance
    pattern names", and a link to a directory was none of those). While a link stands, every pull request
    prints governance; none stands today;
  - is a `.sql` or `.json` file that the database harness (the three database roots and what they
    reach by imports, not what they reach only by a string) names in a string literal, from the
    repository root or from the module;
  - is a test (`*.test.mjs`, anywhere) whose subject is a governance path: one that imports a path
    that is governance by any of the rules above. What a test imports is the observable proxy for its
    subject;
- else **audit** when every change is an added or modified regular file (status `A` or `M`, mode
  `100644`; no symlink, executable, deletion or type change) directly in one
  `evidence/audits/<YYYY-MM-DD>/` directory (a calendar date, no subdirectory), the head branch was
  given and is WP-0A-A0-001's `ownership.branch` read at the base, and the base and head repositories
  were both given and are the same. Anything not given is not checked, and so is not audit;
- else **records** when the records-only classifier says so; else **risk** for H and **fast** for M
  or L.

The import scan reads each module once, in time linear in its length (a scanner, not a parser; A1-255-3:
the regular expressions it replaces backtracked exponentially on a run of `/**/`). The same fix
rewrote `importSpecs`, which the **tier** uses for L's import allowlist and for cross-module imports, as
a linear keyword scan in place of the backtracking expression; the tier reads the same specifiers with
it on real code (R0-255r-2, Q0-255R-2). The scanner reads a regular expression after `)` as a division,
so on crafted text it can misread a stretch of code as a literal and miss an import there. Two readings
of the raw text stand behind it, whatever the scanner made of that text: a raw keyword scan that follows
every specifier naming a file at the head after `from`, `import`, `import(` or `require(` (past
whitespace and `/* */` and `//` comments, and past any number of opening parentheses after `import(` and
`require(`; A1-255r2-1, round two), and the string rule above (round three). The walk is a best-effort
aid, not a parser, and it does not claim to find every module a guard can load; §D says what it misses
and why that is accepted (corrected 2026-10-11 twice, rounds three and four on PR #255: each earlier text
said what alone could still hide, and a measured probe contradicted each).

`additive-eligible: yes` is printed when every governance path is of the `additive` kind and nothing
could not be read. A path the patterns name takes the patterns' kind: `never` for an RFC, the guide,
`docs/**`, `.agents/**`, `.github/**`, a package, lock or tool file, a Makefile, a classifier and the
three tests that pin CI or a classifier; `guard` for the guards, validators, contracts and runners
the additive rule does not name and for every top-level `test-kits/*.test.mjs` but
`branch-identity.test.mjs`, since those pin a guard's own behaviour; `additive` for the rest (the
database runner and harness, the harness's fixtures, the guards' data, `branch-identity.test.mjs`,
the foundation contract test, the two registries and the manifest). A path the patterns do not name
takes the highest kind of what reaches it: `never` for a test that imports a `never` path, `guard`
for a module any `never` or `guard` root imports or names by a string, else `additive`. The mark never lowers the lane,
and the pull request stays governance until A1 and Q0 confirm in writing. Without `--lane` the
classifier's exit codes are unchanged, and so is its output on real code: on the 60 most recent
merged pull requests the tier report is the same byte for byte, and over every file at the head the
rewritten `importSpecs` reads the same specifiers or more (Q0's measurement at `d50a6036`). Crafted
text that is not an import can read differently: `import a from /* x */ y /* z */ './a.mjs';` gave
`./a.mjs` before (a comment run stretched across code to a later `*/`) and gives nothing now
(Q0-255R-2).

### C. Tests

Nine tests in `test-kits/branch-scope.test.mjs` cut the step body out of `ci.yml` and run it with
`bash -e` against throwaway repositories whose base commit holds copies of both real classifiers or
a stub: the step's shape and place, its one `node` call under `timeout 300` with the head branch and
both repositories; each lane the real classifier gives (risk, governance with and without
`additive-eligible`, records, audit on WP-0A-A0-001's branch and risk on another or none); a fork, or
a missing repository, never audit; a `timeout` that reports exit 124 or fails printed not classified; a
pull request that edits both classifiers printed governance by the base copies; every fail-closed
base (empty, missing, not a commit, no repository, no classifier, only the records-only classifier,
not exactly `main`, unset, unrelated); stubs for a base without `--lane` (usage, exit 2), without a
lane line, with two lane lines, an unknown lane, no tier line first, a lane that disagrees with the
tier, and exit 1; a path name forging a lane line and workflow commands; and the 64 KiB cap and
escaping. Fifteen tests in `test-kits/db/foundation-contract.test.mjs` pin `laneOf` (each lane, one path
per governance pattern group, the transitive-import rule and its fail-closed cases, additive
eligibility both ways), the CLI (each lane; without `--lane` the report is the `--lane` output's
prefix with no lane line; the audit lane without the head branch, without both repositories, or from
a fork; the flags' usage errors exit 2), and, one test per group of the first review round on PR #255:
the harness's fixtures, every guard's imports and a test's subject; the tool configuration, bare
agent paths, case-insensitive matching, nested Makefiles, whole-path matching and the guard tests'
kind; the audit lane's statuses, modes, directory, date, branch and repositories; and the scanner's
linear time on A1's input (under 2 seconds) with what it reads and refuses. The second review round
adds four: A1's probes of a guard's import behind a misread (a backtick, a parenthesized and a
comment-preceded specifier, `require('…')`, escaped and percent-encoded spellings), each governance,
with the computed import that still hides and the tier's narrow scan (double quotes read, the wide
forms not); a symbolic link or gitlink the walk reaches, the harness names or a pattern names, in pure
form and through the CLI on A1's planted base; the raw scan's gap memo, timed (under 3 seconds on
input that takes the memo-less scan about 35 seconds); and the head branch compared case-sensitively
(Q0-255R-1: L9, N26, N27, N31, N33). The third review round adds five, each on the reviewers' own
probes: a link anywhere at the head, a link to a directory under C0's, A1's, R0's and Q0's guards in
pure form and C0's through the CLI (C0-255r2-1, A1-255r3-1, R0-255r2-1); an import of a URL or an
absolute path, A1's two `data:` rows among them, with the residual a `file://` URL inside a `data:`
module leaves (A1-255r3-2); the string rule, A1's `.cjs` rows among them, with data named by a string
adding nothing and the harness's literals kept to its imports (A1-255r3-1); resolution as node
resolves, Q0's R13 to R16 among them (Q0-255R2-1); and the three behaviours Q0 found unpinned
(Q0-255R2-2: B4, B10, B20).

### D. What this does NOT do

- It does not lower any pull request's readers. Until the classifier with `--lane` is on `main`,
  this step prints not classified, which is H and governance; RFC-2026-030 §9 item 2 is met only
  from the first pull request whose base carries it.
- It does not decide whether an additive guard edit is additive; A1's and Q0's written
  confirmations do (RFC-2026-034 §2.2).
- The audit lane's branch check reads the head branch's name and the two repositories' names; it
  does not check that the audit files are blob-equal to their auditors' commits, which stays A0's
  recorded reading (RFC-2026-034 Q-034-5 (a)).
- It does not compare one head's lane with an earlier head's; RFC-2026-034 §2.2's rule that a pull
  request never drops lane during its life stays the readers' (C0-255-9 on PR #255).
- It does not see every module a guard can load. The walk is a best-effort aid, not a parser, and it does not
  claim to find every module a guard can load. Known forms it misses include: a path computed at run time; a
  loading mechanism that names no repository-relative path literally (for example an absolute `file://` URL
  inside a `data:` module); a process a guard spawns (`execSync('node …')`, `--import`, `NODE_OPTIONS`, a shell
  or Python script); a CommonJS `require` of a file whose extension the walk treats as data (`.txt`, `.md`,
  none); a literal longer than the scanner's 4096-character cap; a backslash-separated path; a path held in data the guard reads (for example a JSON file); and a path where node and the walk pick
  different candidates (the walk takes the first of `.js`, `.mjs`, `.cjs`, `.json`, `.ts`, `.mts`, `.cts`, then
  the directory; CommonJS `require` tries `.js`, `.json`, `.node`, then the directory). Every such form is an
  accepted residual, not a finding: planting it in a guard is itself a governance edit that all four roles read,
  and a reader of a governance pull request checks whether a guard's module loading changed. (Corrected
  2026-10-11 twice, rounds three and four on PR #255: C0-255r2-1, A1-255r3-1, A1-255r3-2, R0-255r2-1,
  Q0-255R2-1, then A1-255r4-1 and C0-255r3-1. Each earlier text said what alone could still hide, the third that
  a module could hide "only if" its path was computed at run time or named no repository-relative path
  literally, and a measured probe contradicted each. This item no longer claims a complete list.) Nor does it see a file a governance
  code file other than the database harness reads as data. A tool file the denylist does not name
  prints the lane its tier gives. Each is a lane printed lower than §2.2 gives it, which a reader
  raises.
- It does not quote the tier report's path names (Amendment 2026-10-08 §C); the lane's own reasons
  quote each path.

### E. Rollback

A reviewed revert of the one step, the classifier's lane section and flags, and their twenty-four tests.
Nothing reads the step, so removing it changes no other step's outcome. No data, provider or
credential effect.
