# C0 contract review — the night of 2026-09-05/06 on `main`

Run: `/claude/c0_contract_reviewer`
Role: independent Reviewer. This document records findings. It advances no package status, signs
nothing on any author's behalf, and repairs nothing it found.
Date: 2026-09-06.

---

## 0. What I am, before anything else

**I am a subagent spawned by `/claude/a0_atlas`, the author of every change reviewed here, and I run
in the same vendor and model family.** A0 wrote my task description, chose the seven threads I was
pointed at, and told me which of them to look hardest at. It also chose the range.

What that does **not** weaken:

- Everything below that is a *measurement against the tree* stands on its own. `git merge-base`,
  a line number, a JSON array length, an arithmetic sum — a reader can re-run each one, and I have
  written the command or the file:line for every claim so they can. A shared model does not make
  `UNKILLED_CEILING` sum to something other than 67.
- The findings that contradict A0's own record are, if anything, evidence against collusion rather
  than for it. Finding 1 rejects a sentence A0 wrote four times tonight.

What it **does** weaken, and I cannot fix from inside:

- **Framing.** A0 chose the seven threads. I looked hard at those and only glanced elsewhere; a
  defect A0 did not think to point me at is a defect I probably did not find. Section 7 lists what I
  did not check, but I cannot list what neither of us thought of.
- **Shared blind spots.** Where A0's reasoning is wrong for a reason characteristic of this model —
  a plausible-sounding claim about Postgres internals, say — I am the least likely reader to catch
  it. Finding 11 is one I caught only because it contradicted something I happened to know; there
  may be others of the same shape that read as correct to both of us.
- **Independence in the protocol's sense.** `CONTRIBUTING_AGENTS.md` §"Separation of duties"
  requires a distinct independent Reviewer. This is a second reading, not a second opinion. It does
  not satisfy `prefer_cross_vendor_review`, does not lift any `cross_vendor_exception`, and must not
  be counted as the independent review any of these packages owes.

---

## 1. Scope, and a correction to the range I was given

I was told to review `2cee063..HEAD`. I did. **That range is not everything merged into `main`
tonight.**

```
worktree HEAD : fc79045  (Merge PR #64 — WP-0A-DB-00-reservations)
main          : becb963  (Merge PR #65 — WP-0A-DB-00-exemption-register)
git log --oneline fc79045..main
  becb963 Merge pull request #65 …exemption-register
  0762369 chore(db): trim four amendments that describe the previous increment
  b5ec797 feat(db): the exemption register RFC-2026-016 made a control and nobody built
```

Thread 5 of my brief — the exemption register — is in `b5ec797`, which is **not** an ancestor of the
HEAD I was handed (`git merge-base --is-ancestor b5ec797 HEAD` → false). Reading it required going
to the object store directly. My brief also asserted the register file and the three test cases
existed at HEAD; at HEAD `db/foundation/lint/rls-exemption-register.json` does not exist at all.

I reviewed the register from `b5ec797` / `becb963` and say so at each finding. Everything else is
from `2cee063..fc79045`, 31 commits, 34 files, +2168/−864.

`npm run check` at `fc79045`, with a private `TMPDIR`: **exit 0, 316 tests, 316 pass, 0 fail, 0
skipped.** (`becb963` moves that to 319; I did not run it there.)

---

## 2. CONFIRMED DEFECTS

### D1 — HIGH. A blocker softened without cause, against two higher-authority documents

`work-packages/WP-0A-CON-002.json:240`, and the identical sentence twice in
`handoffs/WP-0A-CON-002-author-handoff.json:113` and `:128`.

The blocker was:

> "RFC-2026-004 is Proposed and requires Product Owner disposition before the RFC-2026-002 manual
> merge."

It is now:

> "**RFC-2026-002 manual merge is no longer the control.** Branch protection on main became real on
> 2026-09-02 -- required status check, admins included -- and RFC-2026-004 was approved the same
> day, so the disposition this blocker was waiting for has happened. What remains … is that no
> REQUIRED REVIEW exists…"

**What I checked.** The status line of every RFC named, the canonical guide, and the evidence for
the branch-protection fact.

**What I found.**

1. The half about RFC-2026-004 is true. `architecture/decisions/RFC-2026-004-catalog-reference-integrity.md:3`
   reads `Status: Approved 2026-09-02 by the Product Owner`. That part of the blocker had genuinely
   stopped being true and rewriting it was correct.

2. The branch-protection *fact* is supported. `evidence/g0-tracker-th.md:27` records a strict
   required check `bootstrap`, `enforce_admins: true`, no force push, no branch deletion, and a
   direct admin push rejected with `GH006`. Fine.

3. **The conclusion drawn from it is not supported and contradicts the tree.**
   `architecture/decisions/RFC-2026-002-manual-merge-control.md:3` still reads:

   > `Status: Approved — provisional manual control; native protection/G0 not satisfied`

   and `CONTRIBUTING_AGENTS.md` §"Temporary manual merge control" — the canonical guide, which
   ranks above a work-package manifest in its own conflict order — still opens:

   > "While native GitHub branch protection is unavailable, follow [`RFC-2026-002`] for **every**
   > proposed merge into `main`"

   Neither was amended tonight. A manifest cannot retire an approved RFC.

4. **The sentence refutes itself.** RFC-2026-002 is not a branch-protection substitute; it is a
   *separation-of-duties* rule ("The Author never approves, test-verifies, integrates, or authorizes
   their own work"; record the PR URL, head SHA, CI run, evidence links, rollback). The very next
   clause of the new blocker concedes "no REQUIRED REVIEW exists" — i.e. the automated control does
   **not** cover the thing the manual control existed for. It declares the manual control retired in
   the same breath as admitting nothing replaced it.

5. **A0 contradicted itself the same night, in the correct direction.**
   `work-packages/WP-0A-CON-003.json`, rewritten hours earlier on the same rule, says:

   > "…and RFC-2026-002, **itself only provisional manual control rather than native branch
   > protection, still reserves every merge into `main` for the Product Owner**, so nothing
   > dispositioned here lets this package merge itself."

   And CON-006, rewritten on the same fact, is careful too: it records the branch protection, keeps
   the tripwire finding, and never touches RFC-2026-002's standing. CON-002 is the outlier.

**Severity: HIGH.** `CONTRIBUTING_AGENTS.md` §"Ownership and change control" requires an RFC before
changing "CI/release policy, or gate rules". Declaring the standing merge-control RFC retired inside
a work-package manifest is exactly that change made outside the RFC path — and it is the one
rewrite tonight that removes a constraint on the author rather than on the tree. It is the finding
A0 told me to look hardest for, and it is in the file A0 named.

**This is not a fix, and I am not making one:** the surviving half of the blocker (RFC-2026-004 is
dispositioned) is real; the RFC-2026-002 clause is what does not survive contact with the tree.

---

### D2 — MEDIUM-HIGH. The exemption register's granularity is declared and not enforced

`scripts/db/run.mjs` (as of `b5ec797`), `db/foundation/lint/rls-exemption-register.json`.
Reviewed from the object store; not present at the HEAD I was given.

`RFC-2026-016` §4 (lines 68–72) specifies the register as:

> "a declared exemption register — **role × table × operation** × reason × owner × review date —
> that the schema lint reads **in both directions**"

The lint matches a row to a table by table name and nothing else:

```js
const exempt = (table) => (register.exemptions ?? []).filter((e) => e.table === table);
…
if (!t.rls_enabled && rows.length === 0) problems.push(`app.${t.table}: relrowsecurity is false and no exemption is registered`);
if (!t.rls_forced  && rows.length === 0) problems.push(`app.${t.table}: relforcerowsecurity is false and no exemption is registered — …`);
```

**Consequences, both confirmed by reading:**

1. A row scoped as narrowly as the shape allows — `{role: "app_worker", operation: "select"}` — buys
   the table a **blanket** pass. `role` and `operation` are validated for presence and vocabulary and
   are then never consulted. The register's own `_shape` block documents `role` as "the role the
   exemption is for … or `*` when the exemption is the table not being forced at all", so the file
   asserts a distinction the lint does not make.

2. The same row suppresses **`rls_enabled`** as well as `rls_forced`. §4 retired "force where
   compatible"; the register replaces the *FORCE* condition. Extending it to `relrowsecurity` means
   one register row can now excuse a tenant table having **no row level security at all** — a
   materially wider exemption than the RFC authorises, and the exact defect class
   `CONTRIBUTING_AGENTS.md` calls "deny-by-default RLS for every tenant data path".

3. The reverse direction checks the table's state, never the row's *role*. A row claiming
   `role: "app_worker"` is accepted on any table that is not (enabled AND forced), with no catalog
   evidence about `app_worker` at all.

**Do the three tests prove a non-empty register is checked?** Partly, and better than I expected:
they inject the register rather than asserting on the file, and the accept-direction case is
`assert.deepEqual(registered, [])` — a whole-array assertion, which cannot pass vacuously. So the
*existence* of checking is proven.

**What they do not prove, and this is the gap:** every accepted row in every test is
`role: '*', operation: 'all'` — the maximal exemption. No test constructs a narrow row and asserts
it fails to suppress a table-wide finding, and no test distinguishes `rls_enabled` from `rls_forced`.
The two dimensions the RFC names are untested precisely because the implementation ignores them.

---

### D3 — MEDIUM. `db-migrate-clean` is no longer self-sufficient; batch 004 depends on a CI-only file

`db/foundation/migrations/004_correct_the_batch_000_record.sql:42-48`,
`db/foundation/ci/supabase-shim.sql:35-36`, `scripts/db/run.mjs` `runLive('migrate-clean')`.

004 raises if `pg_extension.extnamespace` for `pgcrypto` is `public`. Batch 000 (unchanged, and
unchangeable under migration invariant 1) still contains
`create extension if not exists pgcrypto with schema public;`.

On the provisioned instance and in CI that statement is a no-op, because pgcrypto already exists in
`extensions` — on the instance by the platform, in CI because `.github/workflows/ci.yml:117` applies
the shim as a separate `psql -f` step before `make db-migrate-clean`.

**On any other database it is not a no-op.** Apply the migration set to a bare Postgres without the
shim and 000 installs pgcrypto into `public`, and then 004 raises. `make db-migrate-clean` iterates
`db/foundation/migrations/*.sql` and applies nothing else; nothing in the `Makefile` or
`scripts/db/run.mjs` applies `db/foundation/ci/supabase-shim.sql`. The prerequisite exists only as
one line inside a GitHub workflow.

The manifest frames this as the control working ("remove the shim line and this batch fails with the
reason", `WP-0A-DB-00.json` RESERVATION 3), and in CI it is. The cost is not recorded anywhere: the
migration set can no longer be applied to a clean Postgres by the repository's own declared command,
which is a real reduction in the environments the repository supports.

**Answering the brief's question directly — does 004 hold in every environment the repository claims
to support?** No: it holds in exactly two, and both reach that state by a path outside the migration
set.

---

### D4 — MEDIUM. The replacement auth-context guard is asserted by a regex over its own source, not by behaviour

`db/foundation/test-helpers/auth-context.sql` (each helper),
`test-kits/db/rls-assertions.test.mjs` first new test.

The `assert_in_transaction()` proxy was removed and replaced with an inline read-back in each helper:

```sql
perform set_config('role', 'anon', true);
if current_setting('role', true) is distinct from 'anon' then
  raise exception 'SET LOCAL role did not take effect' …
```

The file's stated property is: "Outside a transaction block SET LOCAL is a no-op with a warning, so
the read-back returns the previous value and this raises."

**What the test does.** It reads the `.sql` file as text and asserts the *string*
`SET LOCAL role did not take effect` appears within each function body, plus three
`assert.doesNotMatch` checks that the two old proxies are gone. That is a source-text assertion.
**No test calls a helper outside a transaction block and observes it raise.** The claimed property
is nowhere executed, in this suite or in the isolation suite (which always opens `begin;` first).

Two proxies have now been wrong in a row here, each discovered only when CI failed. The third
replacement is protected by a `grep`.

I could not settle the underlying Postgres question — whether `set_config(name, value, true)` inside
an implicit single-statement transaction applies the value (in which case the read-back in the same
call always succeeds and the guard is inert) or is skipped (in which case it works). This host has no
`psql` and no `docker`. **It is listed in §5 as unverified**; what is confirmed is that nothing in
the repository decides it either.

---

### D5 — MEDIUM. `refresh-author-handoff.mjs` blanks a handoff run on a branch already merged to `main`

`scripts/refresh-author-handoff.mjs`, `branchPointOf` / `baseFor`.

**The ordinary in-progress case is genuinely unaffected**, and I checked this rather than assuming
it: with `stored === branchPoint`, `isAncestor(resolved, head)` and `isAncestor(branchPoint, resolved)`
are both true (`--is-ancestor` holds for equal commits), so `recomputed` is false, `base_revision` is
not rewritten, and `--check` still exits 0. That half of the change is sound, and the field is
written only when it moved.

**The situation that loses information** is a branch whose tip has become an ancestor of `main`.
Then `git merge-base HEAD main` is `HEAD` itself, so `branchPoint === head`, `baseFor` recomputes,
and `changedIn(HEAD, HEAD)` is empty — the refresher rewrites `files_added`, `files_modified` and
`files_deleted` to `[]` and reports "0 added, 0 modified, 0 deleted".

Demonstrated in this worktree, no edits made:

```
$ git rev-parse HEAD          fc7904596e3b089e41185812961c21f2c069ac6e
$ git merge-base HEAD main    fc7904596e3b089e41185812961c21f2c069ac6e
```

The author names this in a comment ("the branch point moves onto the branch itself and the
recomputed range describes less than the branch did. Nothing here detects that") and then relies on
a convention — "this only ever rewrites the handoff of the branch it is run on, and never
regenerates a handoff whose branch has been merged." Nothing enforces the convention. This
repository's actual rhythm is merge-then-continue-on-the-same-branch (`5c12b02`, `c1ba3fd`,
`1c950bb`, `334cd9a` are all "rebase onto main and repoint what that orphaned"), so the hazardous
state is one `npm run refresh:handoff` away, and the refusal path (exit 93) does not cover it —
`main` resolves fine, it just resolves to the wrong answer.

Mitigating: `check:handoff` is not in `npm run check` (`package.json:12`), so this is a manual step,
not something CI does on its own.

---

### D6 — MEDIUM-LOW. `expectDeniedBy` attributes a layer without attributing an object

`db/foundation/test-helpers/rls-assertions.mjs:173-204`.

**Is the ordering sound?** Yes, but for a weaker reason than the comment gives. The comment says
"A policy refusal ALWAYS names the policy … so it is matched first". The two patterns are in fact
disjoint on every message Postgres emits for these paths, so order does not currently decide
anything. I could construct no message matching both.

**What classifies wrongly.** `permission denied` is a catch-all. Every one of these is 42501 and
every one classifies as `'grant'`:

- `permission denied for table workspace_invitations` — the intended case
- `permission denied for schema private` — **the exact failure this harness produced tonight**
  (`scripts/db/rls-smoke.mjs:55`, `auth-context.sql:39`)
- `permission denied for schema app`, `permission denied for function …`

So a case declaring `deniedBy: 'grant'` passes when the refusal came from a privilege problem in
scaffolding rather than on the object under test. The assertion checks *which layer*, never *which
object*, and the comment's framing ("a missing grant and a policy both raise 42501, so a case that
cannot tell them apart…") applies one level down to itself.

**What classifies as nothing, and does fail closed** — I checked this, and it does:
`query would be affected by row-level security policy for table "x"` (42501, raised when
`row_security = off`) matches neither pattern, `denialLayer` returns `null`, and `expectDeniedBy`
throws naming the unclassified message. `result.error.message` absent → `''` → also `null` → also
throws. Fail-closed is real.

**Live coverage.** All four cases carrying `deniedBy` declare `'grant'`
(`owner-a-cannot-read-a-token-digest`, `viewer-a-cannot-delete-an-invitation`,
`anonymous-cannot-read-workspaces`, `anonymous-cannot-read-members`). **No case declares
`'policy'`.** The `policy` branch — the strong half, the one that distinguishes a written policy from
an ungranted privilege — is exercised only by the unit test in
`test-kits/db/rls-assertions.test.mjs`. In the live suite, the discriminator only ever runs its
catch-all arm.

This does not make the suite silently green: a broken `app` schema grant would also fail every
positive case. But the four `deniedBy` assertions are weaker than the module's comment claims.

---

### D7 — LOW, but it is a data-steers-privilege path. `reset role;` is injected from a regex over inlined parameters

`scripts/db/rls-smoke.mjs:38-64`.

Parameters are inlined into the SQL first:

```js
const sql = await run(statement, params);   // params substituted into $1, $2 …
…
if (/\bprivate\.as_/.test(sql)) buffer.push('reset role;');
```

The regex is tested against the SQL **after** parameter substitution. A case whose parameter value
contains the literal text `private.as_` — e.g. `params: [A, 'renamed by private.as_service']`, and
the cases do pass free-text names like `'renamed by the service'` — causes `reset role;` to be
prepended to the prelude of the **statement under test**, which then runs as the administrative
connection role instead of the identity under test.

No current fixture value triggers it, and the escalation is confined to the rolled-back transaction.
But the control that decides "step back to the connection role" is driven by test data, and the
comment defending the injection ("the privilege boundary is untouched; the caller simply steps back
to its own role before asking to become someone else") is only true while no parameter says
otherwise. The check belongs on the *statement*, not on the statement-with-values.

---

### D8 — LOW today, latent. The result boundary can be moved by data

`scripts/db/psql-driver.mjs:164-171`.

**Can a header row still be counted as a row anywhere?** No — I checked all three paths.
`rowsFromCsv` takes `records[0]` as the header and maps only `rest`, so a header alone is `[]`;
`parseCsv('')` is `[]`; and `afterBoundary` skips past the boundary's own *data* line (the boundary
select prints header **and** value, and `lastIndexOf` lands on the second), so neither boundary line
survives into the tail. The tests pin all of this, including the boundary case. This is correct and
it is the fix the commit says it is.

**Can the marker be forged by data?** Yes, and `lastIndexOf` is what makes it so. The driver's own
comment concedes the risk and mitigates it with obscurity ("which is why it is not a word"). The
consequence is worse than the comment implies: because the search takes the *last* occurrence, a
marker appearing in the statement's own output moves the boundary **forward**, and the tail becomes a
suffix of the real result — whose first line is then eaten as a header. A single occurrence in the
final row yields **zero rows**, and zero rows is a **pass** for `expectNoRows` and for half one of
`expectNoEffect`.

Not reachable today: all values come from `010-identity-fixture.sql`. It becomes reachable the moment
an isolation case reads a column carrying user content — which `SMOKE_COVERAGE` says batches 020,
040 and 080 owe. The tests do not cover it: `test-kits/db/rls-assertions.test.mjs` constructs the
boundary case but never puts the marker in the data.

**Multiple result sets, or none.** `queryFinal` concatenates `epilogue` after the statement and
parses everything after the boundary, so any epilogue that prints rows would be parsed as extra rows
of the statement's result (its header read as a data row). Safe today only because the sole caller
passes `epilogue: ['rollback;']`, which prints nothing under `--quiet`. Nothing in the signature or a
test says the epilogue must be silent. Likewise a `statement` containing two statements would have
both outputs folded into one result. A statement returning **no** result set at all parses to `[]` —
indistinguishable from a header with no rows, which is why every mutation case carries `RETURNING`;
that is asserted statically in `identity-isolation.test.mjs`, so it holds, but by convention rather
than by the driver.

---

### D9 — LOW. `LC_ALL=C` does not guarantee the message text the layer discriminator matches

`db/foundation/test-helpers/rls-assertions.mjs:166`:

> "LC_ALL=C is set by the driver and by CI, so the English text is the text."

The driver does set it (`psql-driver.mjs:134`) and CI sets it on each `make` line
(`ci.yml:118-124`), so the claim about the *setting* is true. The inference is not.
`permission denied for table …` and `new row violates row-level security policy for table …` are
**server**-generated messages; their language is fixed by the server's `lc_messages` GUC, which the
client's environment does not change and which is `SUSET` (a non-superuser cannot set it via
`PGOPTIONS` either — and the driver's `PGOPTIONS` carries only `client_min_messages=warning`).
`LC_ALL=C` governs libpq's own client-side text, which is a different set of messages.

In CI this is harmless: the `postgres:17` image initdbs under `en_US.utf8`. Against a server with a
localised `lc_messages`, `denialLayer` returns `null` and `expectDeniedBy` throws — **it fails
closed**, and `expectDenied` is unaffected because SQLSTATE is locale-independent. So this is a wrong
guarantee, not an unsafe one. Recorded because the sentence is load-bearing in the module's argument
for why matching on message text is legitimate.

---

### D10 — LOW. "all five migration batches apply" — there are six

`work-packages/WP-0A-DB-00.json` `open_blockers[0]`, and the same sentence in
`handoffs/WP-0A-DB-00-author-handoff.json`.

```
$ ls -1 db/foundation/migrations/*.sql | wc -l
6      # 000, 001, 002, 003, 004, 010
```

The count was correct when the blocker was rewritten (`769ddfd`, PR #58) and stopped being correct
two commits later when `fd8e8a5` added batch 004 — in the same night, on the same package, in a
commit whose own blocker text says "Batch 004 exists". The count was not revisited.

---

### D11 — LOW. A1's countersignature now cites the wrong blocker index

`evidence/WP-0A-DB-00/a1-countersignature-role-topology.md:128`:

> "**10 of 28**, as `open_blockers[2]` states."

When A1 wrote that (`aaa35ef`, PR #60), the tenant-isolation blocker was at index 2. PR #64 inserted
five `RESERVATION` entries at indices 2–6, moving it to **index 7**. `open_blockers[2]` now reads
"RESERVATION 1 (A1 §5.1)…" — a different subject entirely.

The correct repair is not to edit A1's document (it is A1's), and I am not proposing one. It is
recorded because a positional citation into a mutable array is the same rot class this repository
has spent the night removing from blockers, arriving in the evidence layer.

---

### D12 — LOW. A test's stated reason is now false in both halves

`tests/db/identity/identity-isolation.test.mjs:89-92`:

```js
assert.doesNotMatch(fixture, /\b(public|extensions)\.digest\s*\(/,
  'the digest must not be taken through a schema-qualified pgcrypto call: `public.digest` does not '
  + 'exist on the provisioned instance and `extensions.digest` does not exist in the CI container. …');
```

`db/foundation/ci/supabase-shim.sql:36` — added in the same increment — is
`create extension if not exists pgcrypto with schema extensions;`. So `extensions.digest` **does**
exist in the CI container now, and `public.digest` no longer exists there either. Both clauses of
the message describe the arrangement the shim change replaced.

The assertion itself is fine and I would keep it (an unqualified `sha256()` is the portable call).
Only its justification is stale.

---

## 3. The CI negative control — what I could and could not break

`.github/workflows/ci.yml:138-158`. My brief asked what else could make it pass for the wrong reason.

**Paths I traced and found closed:**

- Fixture-reload failure on the second run. `010-identity-fixture.sql` is idempotent —
  `on conflict … do nothing` on all five inserts — so re-running `db-rls-smoke` after the first step
  does not fail at load. And if it did, `rls-smoke.mjs:103` writes "the fixture did not load", which
  does **not** contain `db-rls-smoke: FAILED`, so the grep catches it. Same for the auth-context
  install failure at `:95`.
- Missing `psql`. `NO_PSQL` propagates out of `main()` uncaught → non-zero, no `FAILED` line → the
  control fails loudly. Correct.
- The `alter table … disable row level security` failing. GitHub's default `bash -e` aborts the step.
- The grep string is really emitted: `run-isolation.mjs:172` formats
  `db-rls-smoke: FAILED — N of M case(s)` followed by one `id [covers] (phase): detail` line per
  failure, so "a NAMED failed case" is satisfied.

**What it still cannot distinguish, and this is a judgement call not a defect (§6).** The control
requires *some* named case to fail. It does not require a case that touches `app.workspaces` to
fail. It therefore proves "the suite can go red", which is a real and worthwhile claim, rather than
"the suite detects this regression". Pinning the count would be brittle; pinning the *table* would
not be, and is not done.

**Is "10 of 28" load-bearing where it should not be?** No — and that is the right call. The CI step
greps only for `db-rls-smoke: FAILED` and never reads the number, so the figure is narrative in
`WP-0A-DB-00.json` and the handoff and cannot break the build if policies legitimately change.

**I re-derived it independently** and it holds. Fourteen of the 28 cases run a statement against
`app.workspaces`; with RLS disabled there, exactly ten cannot pass —
`owner-a-cannot-see-workspace-b`, `owner-a-cannot-update-workspace-b`,
`viewer-a-cannot-update-workspace-a`, `approver-a-cannot-update-workspace-a`,
`editor-a-cannot-update-workspace-a`, `suspended-a-sees-zero-tenant-rows`,
`suspended-a-cannot-mutate`, and the three service cases. The four that survive
(`owner-a-sees-workspace-a`, `owner-b-sees-workspace-b`, `viewer-a-sees-workspace-a` are positive
reads; `anonymous-cannot-read-workspaces` is refused at the privilege layer, which disabling RLS does
not restore) survive for reasons I can name. **10 of 28.** This matches A1's list at
`a1-countersignature-role-topology.md:124-130` case for case, arrived at separately.

---

## 4. Blocker rewrites that I checked and that held

A0's stated rule was "rewrite only what has stopped being true, keep what survives". Beyond D1, the
rule was kept — often better than it had to be. Recording this because a review that reports only
findings misrepresents the work.

**WP-0A-CON-003.** Every checkable claim verified:

| claim | check | result |
|---|---|---|
| A1 remeasured at `e7b8c4b` | `git log -1 e7b8c4b` | "fix(contracts): the zero-coverage claim was measured and it was false" ✓ |
| carried verbatim in CTR-SEC-001 `x-opacity-limitation` | `ctr-sec-001/schema.json:25` | present, same wording ✓ |
| CON-008 merged as `963990f`, PR #44 | `git log -1 963990f` | "…8 of 101 keys had force (#44)" ✓ |
| floor of 101 keys | `catalog-registry.test.mjs:878` | `assert.ok(checked >= 101, …)` ✓ |
| `ctr-ntf-001 deep_link.required` is the single nested entry | `schema-mutation-coverage.test.mjs:54` | present ✓ |
| A0-002 at `41e47bf` (PR #3), CON-002 at `1eb31c2` (PR #4) | `git log -1` each | both resolve, both merge commits, right PR numbers ✓ |
| "13 on CON-002 and 8 on A0-002" | array lengths | **exactly 13 and 8** ✓ |

**WP-0A-CON-006.** The re-measured coverage numbers are internally consistent *and* corroborated by
the tree's own tables, which is more than the entry claims for itself:

- `COVERAGE_FLOOR = 0.70` at `schema-mutation-coverage.test.mjs:149` ✓
- claimed 654/721 = 90.7% ✓; 721 − 654 = **67** unkilled, and `UNKILLED_CEILING` sums to **exactly
  67** ✓
- claimed `ctr-ntf-001` 30 of 39 = 76.9%; `SITE_FLOOR['ctr-ntf-001'] = 39`,
  `UNKILLED_CEILING['ctr-ntf-001'] = 9`, 39 − 9 = 30 ✓
- the partition cross-check: 95 + 559 = 654 and 146 + 575 = 721 ✓; 146 − 95 = 51 conditional
  unkilled and 575 − 559 = 16 leaf, 51 + 16 = 67 ✓
- `SITE_FLOOR` sums to 716 against 721 measured — consistent, since it is a floor ✓

CON-006 also does the thing D1 fails to do: it distinguishes what the measurement closed from what
survives, labels one entry "SUPERSEDED IN PART", and explicitly refuses to re-verify the generator
claim it cannot run ("it stands as testimony, not as something this run measured"). It even flags a
contradiction it is not entitled to fix (`OVERNIGHT-SUMMARY.md` item 3).

**WP-0A-CON-002, the other rewrites.** Both non-D1 rewrites hold:

- CTR-JOB-001 `input_ref`/`result_ref` carry the allow-list pattern
  `^(job|status|result|app|asset|content):…` at `ctr-job-001/schema.json:79,86`, and RFC-2026-006 is
  `Approved 2026-09-02` ✓
- the subset validator fails closed on unenforced formats, and the cited line is exact:
  `test-kits/contracts/json-schema-subset.mjs:123` is the `if (schema.format !== undefined &&
  schema.format !== 'date-time')` ✓

**WP-0A-CON-008 / WP-0A-DB-00 declaration trims.** Both remove a previously declared cross-package
permission on the grounds that "a declaration matching none of the diff is a standing permission
nobody reviewed for this branch". I agree with the principle, and `scripts/verify-branch-scope.mjs:87,136`
and `scripts/validate-work-package-ownership.mjs:151` confirm the field is machine-read, so the trim
narrows rather than widens. No finding.

---

## 5. COULD NOT VERIFY

These are not findings against the work. They are places where I ran out of what this host can prove,
and a reader should not treat my silence as endorsement.

1. **That CI has ever run green with the database steps.** This is the largest gap and it bears on
   D1's neighbourhood. `handoffs/WP-0A-DB-00-author-handoff.json` records exactly one test entry —
   `npm run check`, exit 0 — and `package.json:12` shows that chain does **not** include any `db-*`
   target. No CI run id, no PR URL, no head SHA appears in the handoff, and
   `evidence/WP-0A-DB-00/` holds only A1's countersignature and a 2026-09-05 note. Meanwhile the
   blocker that replaced "Tenant isolation is NOT proven" asserts "In CI, **28 isolation cases pass
   on every run** … it reports 10 of 28". The arithmetic half I re-derived (§3). The "in CI, on every
   run" half is recorded nowhere in the tree, and A1 declined to vouch for it in its own §3.3:
   "That CI is green, and that it ran what `ci.yml` says. **I did not execute a CI round** … I read
   the workflow; I did not watch it run."
   RFC-2026-002 and `CONTRIBUTING_AGENTS.md` §"Verification and handoff" both require the CI run in
   the handoff. It is not there. **I am not calling the claim false — I am recording that the
   repository does not carry its evidence.**

2. **Whether the auth-context read-back guard actually raises** (D4). Needs a live server: call
   `select private.as_anonymous();` outside `begin`/`commit` and see whether it raises. No `psql`, no
   `docker` on this host (`command -v` for both returns nothing).

3. **Batch 004 against any real server.** I read the SQL; I did not execute it. In particular I did
   not confirm `to_regproc('pg_catalog.gen_random_uuid')` behaves as assumed, or that
   `extnamespace::regnamespace::text` compares equal to `'public'` on the platform.

4. **The 12-of-15 / "5 of 5" arithmetic** that CON-003 quotes from
   `ctr-sec-001/schema.json:25`: 15 bodies, 12 detected, residual described as "5 of 5
   lowercase-canonical shapes". 15 − 12 = 3, not 5. This is **pre-existing** — the text is in
   CTR-SEC-001, unchanged tonight, and CON-003 reproduces it faithfully — so it is not a defect of
   this night's work. Reconciling it needs A1's C4 measurement, which I did not locate.

5. **Whether the 004 assertion is reachable on the platform between migration runs.** Related, and I
   did check the negative half: `db/foundation/lint/catalog-snapshot.json` records **no** extension
   or pgcrypto field, so `db-schema-lint` cannot see pgcrypto's schema. 004 is therefore the only
   guard, and it fires only when the migration set is applied. Answering the brief's question —
   *is there any path where `public.digest` could return?* — yes, two: (a) an `ALTER EXTENSION
   pgcrypto SET SCHEMA public` on the instance would go unnoticed until migrations are next applied,
   and (b) 004 asserts about `pg_extension.extnamespace`, **not** about a function named
   `public.digest` existing, so a hand-written `public.digest(text, text)` wrapper passes 004
   entirely. Those are readings of the SQL; I could not run either.

---

## 6. Judgement calls — where I disagree but would not block

1. **The register's review date is compared against `snap.taken_at`, not `now()`**
   (`run.mjs`, register block). The author states the choice and I understand it: judge the register
   against the database state it is read with. The cost is that `taken_at` is a hand-maintained field
   in a checked-in JSON that only has to move when the migration digest changes, so an exemption with
   `review_date: '2099-01-01'` never expires, and one with a nearer date does not expire either while
   nobody re-measures. `b5ec797`'s commit message says "An exemption does not age into permanence."
   Against a still snapshot, it does exactly that. I would state the limitation rather than change the
   comparison. (Also worth noting the comparison is lexicographic on strings: it is correct for
   zero-padded `YYYY-MM-DD` on both sides, and would misjudge an unpadded date or a `taken_at`
   carrying a time component.)

2. **The negative control accepts any named failure, not a workspaces failure** (§3). I think the
   trade is right and pinning the count would be brittle. I would still have the manifest say what
   the control proves — "the suite can go red" — rather than implying it proves this regression is
   detected.

3. **`queryFinal`'s epilogue is inside the parsed region** (D8). Currently safe. I would rather the
   driver refuse a non-empty epilogue than rely on every future caller knowing it must be silent.

4. **`amends_without_owning` replacing `authorized_cross_package_amendments` on CON-006** removes four
   declared permissions and the prose that explained a merged increment. The rationale for the trim is
   good and the history does survive in the merged commits. I record only that a reader of the manifest
   alone now has less context than one who reads the git log — which the rationale itself says.

---

## 7. What I did NOT check, and why

Stated plainly, because a review that implies uniform depth it did not have is worse than a short one.

- **Anything requiring a database.** No `psql`, no `docker`. Every claim about runtime Postgres
  behaviour in this document is a reading of SQL or of documented semantics, not an execution. This
  covers batch 004, the auth-context guard, the shim, the 10-of-28 count, and the whole live half of
  `run.mjs`.
- **Any CI run.** I did not fetch, read, or verify a single GitHub Actions run. See §5.1.
- **`test-kits/handoff-conformance.test.mjs`** (+190 lines tonight). I did not read the new cases at
  all. Given D5 concerns the script those cases guard, this is the most conspicuous hole in my
  coverage.
- **`scripts/verify-branch-scope.mjs` and `verify-branch-identity.mjs`** beyond grepping for the two
  ownership field names. I did not review their logic.
- **`0762369`** ("trim four amendments that describe the previous increment"), on `main` past my
  range. Not read.
- **The contract catalog itself.** I checked the specific `ctr-job-001`, `ctr-sec-001` and
  `ctr-ntf-001` lines the blockers cite. I did not review any schema as a whole, and I did not
  independently re-run the mutation-coverage measurement CON-006 describes — I corroborated its
  numbers against the suite's own `SITE_FLOOR`/`UNKILLED_CEILING` tables, which is a cross-check, not
  a re-measurement.
- **RFC bodies**, except RFC-2026-016 §4 in full and the status line of 002, 003, 004, 006, 016.
- **`evidence/` narrative documents**, except `a1-countersignature-role-topology.md` §3.2/§3.3/§5.1,
  `g0-tracker-th.md:27`, and the head of `WP-0A-CON-008/handoff-base-revision.md`.
- **Secret-scan, toolchain, coverage-floor and manifest-integrity machinery.** Exercised only
  transitively by the `npm run check` run at `fc79045` (exit 0, 316/316).
- **`db/foundation/lint/catalog-snapshot.json`'s accuracy.** It claims a 2026-09-06 re-measurement of
  a live instance. I have no way to confirm any field in it, and A1's §3.3 records the same limit.

---

## 8. Summary

**Twelve confirmed defects: one HIGH, one MEDIUM-HIGH, three MEDIUM, one MEDIUM-LOW, six LOW.**

**The most serious:** `WP-0A-CON-002.json:240` (and twice in its handoff) rewrites a blocker to
declare "RFC-2026-002 manual merge is no longer the control", which retires an approved merge-control
RFC from inside a work-package manifest — contradicting RFC-2026-002's own unchanged status line,
contradicting `CONTRIBUTING_AGENTS.md`, contradicting `WP-0A-CON-003.json`'s rewrite of the same rule
the same night, and conceding in its own next clause that the automated control does not cover the
separation-of-duties requirement the manual one exists for.

No file was edited by this review except this one. No package status was advanced. No script,
ratchet, or manifest regeneration was run. `npm run check` was run once, read-only, under a private
`TMPDIR`.
