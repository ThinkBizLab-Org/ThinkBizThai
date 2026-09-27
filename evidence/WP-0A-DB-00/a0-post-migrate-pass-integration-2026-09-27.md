# A0 integration record: the post-migrate assertion pass, what three role runs found, and what changed

Author run: `/claude/a0_atlas`. Package `WP-0A-DB-00`, branch `agent/claude/WP-0A-DB-00-post-migrate-pass`.
The work was built at `d70d2d6`. The three role runs reviewed that head, and their files were
cherry-picked with `-x` (`749f9cd` C0, `5547d09` A1, `6879edf` Q0). The corrections are the commit
that follows. This file approves nothing and is none of the role signatures.

## 1. What the three runs found, in one line each

- **C0 (Reviewer)**
  - One HIGH, two MEDIUM, two LOW and two NOTE findings. No stop-the-line.
  - The HIGH: the branch failed its own branch-scope guard (exit 73 on the branch name), so a PR at
    that head would have been red.
- **A1 (Security)**
  - Three MEDIUM, two LOW and three NOTE findings. No stop-the-line.
  - It confirmed that no schema, policy or grant changed.
  - It demonstrated two things end to end: the register can be used to hide a security regression,
    and a replacement could carry psql meta-commands.
- **Q0 (Tester)**
  - Seventy-eight mutations. Two HIGH, five MEDIUM, two LOW and three NOTE findings. No stop-the-line.
  - It reproduced the Author's headline claim on both heads. On `b07a8d9`, a later drop of 061's
    `usage_events_dimension_known` left `migrate-clean` and `rls-smoke` green. On `d70d2d6`,
    `migrate-clean` failed naming `061_metering.sql#1`.

Every role run disclosed in its §0 that it is a subagent of the Author, working under the Author's
brief, from the same vendor and model family.

## 2. Findings, and what happened to each

### Acted on in the corrections commit

| Finding | What it said | What changed |
|---|---|---|
| **C0 HIGH** | `amends_without_owning` was the previous increment's; `evidence/VERIFICATION.md` and `scripts/test-suite-contract.mjs` undeclared | Declared with a reason each; `verify-branch-scope.mjs b07a8d9 WP-0A-DB-00` measured exit 0 on the branch name |
| **Q0 F1 HIGH** | The runner was guarded only by regexes over its own text; five evasive edits (skip superseded, feed `select 1`, never run a replacement, early return, `return 1` into a comment) survived with real drift present | The decision moved into a pure, exported `decidePostMigrate(plan, outcomes)`, driven in a test by synthetic outcomes: eleven wrong shapes each fail by name, and a control passes. The executor is now a single loop, `postMigrateJobs` → `rerun` → verdict. The wiring test strips comments first and matches that loop whole. All five survivors and a sixth (the replacement job removed) were re-applied, and each fails the suite |
| **Q0 F2 HIGH**, **A1 F1 MEDIUM** | Nothing tied a replacement to its original: a replacement cut to `null;` passed, as did one that dropped a FORCE ROW LEVEL SECURITY check | **Additive-only test**: every non-blank line of the original block appears in its replacement, in order, modulo a moved trailing semicolon. Re-applied: dropping the FORCE line from 030's replacement fails by name |
| **A1 F2 MEDIUM**, **C0 LOW 5** | Replacements are fed on stdin and were outside the meta-command rule; `end $$; commit; …` and a `\!` line passed | Enforced at **runtime** in `postMigratePlan`: a replacement must be exactly one block and nothing else, with no line beginning with a backslash. The static meta-command rule now covers `invariants/*.sql`. The tests refuse transaction control inside a replacement. Re-applied: a trailing `commit;` and a `\!` line are each refused |
| **C0 MEDIUM 2** | Two exclusions were bare names. A permissive `TO PUBLIC using (true)` policy named `publish_intents_service_path_closed` on `publish_jobs`, and a `social_accounts_scope_key` unique on `private.meta_webhook_inbox`, passed everything | Every exclusion in every replacement is now a **(table, name) pair**, and a test refuses a bare one. Both exploits were measured as caught |
| **C0 LOW 5**, **Q0 F3** | The opener check missed `do language plpgsql $$`, `do` with its `$$` on the next line, and a block opened mid-line; the README said such blocks were refused | All three are refused. Openers are counted over the text with comments and per-line literals removed; a message that mentions `do $$` is not counted. The first attempt stripped literals across lines, swallowed a block in 050, and was refused by the plan itself. The README sentence is true now |
| **C0 NOTE 6**, **A1 F5**, **Q0 F8** | The stale check accepted any P0001 | Each entry records `fails_with`, the raise it fails with at the recorded conflict. A block that starts failing earlier or for another reason is reported as stale |
| **C0 LOW 4**, **A1 F4** | "Every batch ends with a do-block" was false; `011#1` and `131#1` create rather than assert, yet counted among the 32; "each change carries a comment" was false for the templated replacements | The sentences are corrected in `run.mjs` and the README. Each changed line in a replacement now carries its own `SUPERSEDED BY` marker |
| **A1 F1**, the rule half | Security sign-off for register changes | Written into the README as the Author's guidance: a register diff that relaxes anything about RLS, policies, grants, role attributes or tenant keys goes to the Security reviewer as well. **It is guidance and not a gate; whether it becomes a gate is §4's first question** |
| **C0 MEDIUM 3** | The Owner's answer D was only partly built: no evidence file for the proofs, and no `ci.yml` proposal | §3 and §5 below |

### Recorded as blockers, not acted on here

- **A1 F3 (MEDIUM, pre-existing).** The closure policies are checked for tokens. Gutting one with
  `or true` keeps the tokens. Three of 102's `updated_by` closures were caught by neither layer.
  This is folded into the blocker this PR opens (the name-or-token survey owed before batch 150).
  A1-090 graded the underlying property LOW; A1 now grades it MEDIUM. A0 records the disagreement
  and does not resolve it.
- **Q0 F4, F6 and F7 (MEDIUM).** Drift in things no block names at all: twelve of Q0's fourteen
  surviving drifts. This covers SECURITY DEFINER search_path, which is checked live only for
  app_authz, and security_events triggers, where `tgenabled` is not read. This is a **new blocker**
  (188), naming the structural remedy Q0 gives: a live catalog snapshot covering 011–140.
- **Q0 F5 (MEDIUM).** 102's closures can be neutralised under their own names. This is the same
  class as A1 F3, in the same blocker.
- **Q0 F9 and F11 (LOW and NOTE).** A pin added in a replacement can be deleted unnoticed, because
  the additive test protects the original's lines and not the added ones. One `SUPERSEDED BY`
  mention per later file satisfies the test. Recorded here and not acted on. A reviewer reads a
  register diff, and the README now says that it is a security diff.
- **Q0 F12 (NOTE, out of scope).** `tests/db/identity/isolation-cases.mjs.rej.orig` has been
  tracked on main since `1385005`. It was offered to the Owner as a separate task and was not
  touched here.

### Not changed, and why

- **Q0 F10 and A1 F7 (NOTE).** The rollback is not load-bearing today: a committed run left the
  database identical. It stays, because two blocks carry DDL guards and two fire probe rows, and a
  future block may not be so tidy.
- **A1 F8 and Q0 F1 (the CI half).** No CI run yet shows that the pass can fail. That half needs
  `ci.yml`, which is the Integration Owner's file (§5).

## 3. Measured by the Author, on the corrected tree

Private cluster: `initdb --locale=C`, `127.0.0.1:5499`, TCP only, shim first, re-initdb every
round. The user's server on `:5432` was never touched. Each drift was appended to `140_audit.sql`,
which is Q0's honest form. A new file is a confound, because the static suite refuses an
unregistered file whatever it says. `140_audit.sql` was restored byte for byte afterwards.

| Round | `make db-migrate-clean` | Detail |
|---|---|---|
| clean set | **ok** | `post-migrate pass: 42 apply-time blocks, 32 re-run as written, 10 superseded and replaced`. `make db-rls-smoke` ok |
| drop 061 `usage_events_dimension_known` | **FAILED** | `061_metering.sql#1 (line 1106) no longer holds …: batch 061 declares six vocabulary CHECK constraints and the catalog holds 5`. On `b07a8d9` the same drift leaves every layer green (Q0 reproduced this independently) |
| drop 121 `performance_snapshots_metrics_keys_are_known` (D01h) | **FAILED** | `121_publisher_metrics.sql#1 (line 414)` |
| C0's exploit: permissive `publish_intents_service_path_closed` on `publish_jobs` | **FAILED** | `120_publisher.sql#1's replacement … not TO authenticated alone: publish_intents_service_path_closed on publish_jobs` |
| drop `industry_assignments_updated_by_is_caller` | **FAILED** | Four lines: 030's entry is stale at a new raise, 030's replacement fails its pin, 102's entry is stale, and 102's replacement counts 12. The verdict now reports every failure rather than stopping at the first |

Static: `node --test test-kits/db/foundation-contract.test.mjs`: 67 of 67. The floors moved to the
numbers the guard prints: tests 63 → 67, assertions 258 → 288, and the name digest.

## 4. For the Owner, and not decided by A0

1. **Should a register change that relaxes a security assertion require A1's sign-off as a gate,
   or stay README guidance?** A1 recommends a gate. A0 has written it as guidance only, because a
   gate is a change to review policy.
2. **A1 F3's grade (MEDIUM) against A1-090's (LOW)** on the `updated_by` closure property. It is
   recorded in the blocker and not resolved.

The three decisions already owed from batch 121 are unchanged by this PR: the `10^12` bound, A1's
grading against its brief, and §3.3 against §4.8.

## 5. The `ci.yml` line, proposed to the Integration Owner and not written by this package

The pass needs a CI control that proves it can fail, for the same reason each table family has
one. It cannot run inside the existing job. `migrate-clean` cannot run twice on one cluster,
because roles are cluster-wide and `001_service_roles.sql` refuses an existing `app_worker`, which
this Author measured. So it has to be its own job with its own service container:

```yaml
  post-migrate-negative-control:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:17
        env: { POSTGRES_PASSWORD: postgres, POSTGRES_DB: thinkbizthai_test }
        ports: ['5432:5432']
        options: >-
          --health-cmd pg_isready --health-interval 5s --health-timeout 5s --health-retries 10
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version-file: .node-version }
      - name: The post-migrate pass must fail on a later file that drops an earlier batch's CHECK
        env:
          PGPASSWORD: postgres
          DB_TEST_URL: postgresql://postgres@localhost:5432/thinkbizthai_test
        run: |
          psql "$DB_TEST_URL" -v ON_ERROR_STOP=1 -q -f db/foundation/ci/supabase-shim.sql
          printf '\nalter table app.usage_events drop constraint usage_events_dimension_known;\n' >> db/foundation/migrations/140_audit.sql
          if LC_ALL=C TZ=UTC make db-migrate-clean > control.log 2>&1; then
            cat control.log; echo "migrate-clean PASSED with 061's vocabulary CHECK dropped by a later file."; exit 1
          fi
          grep -q 'db-migrate-clean: FAILED' control.log || { cat control.log; echo 'a broken run, not a detected drift'; exit 1; }
          grep -q '061_metering.sql#1' control.log || { cat control.log; echo 'failed, but not on 061'\''s block'; exit 1; }
          echo "post-migrate control: the pass detected the drift, naming 061_metering.sql#1"
```

It edits a migration only inside the CI workspace, which is discarded with the job, and the
checkout is never pushed. Whether this job belongs to `ci.yml`, and in what form, is the
Integration Owner's decision.
