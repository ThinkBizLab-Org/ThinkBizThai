# WP-0A-CON-007 — Independent Tester verdict

Package: Reference fields are named and bounded
Tester run: `/claude/q0_sentinel` (declared `role_assignments.tester_agent_run_id`)
Author run under test: `/claude/a0_atlas` — a different run; role separation holds and
`node scripts/validate-work-package-role-separation.mjs work-packages/WP-0A-CON-007.json`
exits `0`.
Revision tested: `03c584b2652c74219dabca15e39a2b9c0bd487b6`, which is the tip of `main`
(`git rev-parse main` returns the same SHA). The package's work is already merged there.
Protocol version: `1.0.0`. Gate: G0 — synthetic only, no provider, no credentials.

**This is independent Tester evidence only.** It is not the contract review, not the
security review, and not integration verification. It authorizes no merge and no gate
movement. Every number below was re-derived by this run against the shipped tree. No
figure was copied from `evidence/WP-0A-CON-007/author-self-check.md` or from
RFC-2026-009; where this file agrees with them it is because the probe was re-run.

## Toolchain and the shell substitution

| | |
|---|---|
| `node --version` | `v24.20.0` (exit `0`) |
| `npm --version` | `11.19.0` (exit `0`) |

`zsh -lc` is **refused in this agent worktree**, exactly as the briefing anticipated. The
verbatim refusal:

```
This agent is isolated in the worktree /Users/bank/ThinkBizThai/.claude/worktrees/agent-a977a154063cc2191,
but this command runs zsh in a plain command; what it reads or is handed as shell text cannot be shown
not to run git. Refusing to run it — a worktree-isolated agent's git operations must target its own
worktree. Run the plain command from /Users/bank/ThinkBizThai/.claude/worktrees/agent-a977a154063cc2191.
```

`node` and `npm` were therefore invoked directly. They resolve to the pinned versions above,
which are the exact versions `.node-version` and `package.json` declare, so **nothing else was
substituted**: no other Node, no other package manager, no dependency added, nothing downloaded,
no network. Destructive probes ran only against throwaway copies under
`/private/tmp/claude-501/-Users-bank-ThinkBizThai/cb23f394-422b-4ec3-b024-e2751f208eb9/scratchpad`.
The worktree itself was read-only apart from this one file.

---

## 1. Declared commands, exact output

### `npm run verify`

```
> thinkbizthai@0.0.0 verify
> node scripts/verify-clean-run.mjs

clean: exit 0 — tests 260, pass 260, fail 0, skipped 0, todo 0
```

exit `0`.

### `npm run check` — the manifest's declared `deterministic_commands.verify`

Tail of output:

```
ℹ tests 260
ℹ suites 0
ℹ pass 260
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 27327.934291
```

exit `0`. **0 skipped, 0 todo**, which is what acceptance criterion 6 requires.

### `npm run validate:protocol` — the protocol validators

```
> thinkbizthai@0.0.0 validate:protocol
> node scripts/validate-work-packages.mjs && node scripts/validate-capability-profiles.mjs && node scripts/validate-work-package-ownership.mjs
```

exit `0`, no diagnostic output. All three validators are silent on success.

### `node scripts/validate-work-package-role-separation.mjs work-packages/WP-0A-CON-007.json`

exit `0`, no output. (Called with no argument it exits `64` with
`usage: node scripts/validate-work-package-role-separation.mjs <manifest.json>`; that is the
usage path, not a failure.)

### `node --test test-kits/contracts/ctr-evt-001-schema-ref-bounds.test.mjs` — the package's own kit

```
✔ CTR-EVT-001 rejects every demonstrated hostile schema_ref (4.025875ms)
✔ CTR-EVT-001 bounds schema_ref length, so a well-formed name cannot be unbounded (0.651417ms)
✔ CTR-EVT-001 still accepts a well-formed contract name (0.680958ms)
✔ every reference-shaped field in the contracts this package touches carries an upper bound (0.852083ms)
✔ the discovery finds the reference fields it is meant to bound (0.490542ms)
✔ no pattern in the catalog uses a construct RE2 cannot compile (6.98625ms)
✔ every allow-listed reference scheme is still accepted, not only the hostile ones rejected (1.017083ms)
✔ a value at exactly the declared bound is accepted, so the bound cannot be quietly tightened (0.542375ms)
ℹ tests 8
ℹ pass 8
ℹ fail 0
ℹ skipped 0
ℹ todo 0
```

exit `0`.

### `node --test test-kits/contracts/schema-mutation-coverage.test.mjs`

exit `0`, `tests 10, pass 10, fail 0, skipped 0, todo 0`.

**The baseline is green.** Nothing needed diagnosing.

---

## 2. The central claim, reproduced independently

Acceptance criterion 1 requires that the sixteen hostile forms were probed against the schema
**before** the fix and were accepted. I did not take that on the Author's word. I reconstructed
`metadata.schema_ref` in its stated pre-fix form — `{"type":"string","minLength":1}` — inside a
throwaway copy, and ran the suite's own sixteen values plus a 100000-character string through
the repository's own validator:

```
ACCEPTED  "file:///etc/passwd"
ACCEPTED  "javascript:alert(1)"
ACCEPTED  "data:text/html;base64,PHN2Zz4="
ACCEPTED  "//evil.example"
ACCEPTED  "https://public.example.invalid/exfil"
ACCEPTED  "HTTPS://public.example.invalid/exfil"
ACCEPTED  "../../../../etc/shadow"
ACCEPTED  "http://169.254.169.254/latest/meta-data/"
ACCEPTED  "gopher://x"
ACCEPTED  "CTR-EVT-001@1.0.0/../../secret"
ACCEPTED  "ctr-evt-001@1.0.0"
ACCEPTED  "CTR-EVT-001@1.0.0 .evil"
ACCEPTED  "CTR-EVT-001@1.0.0<LF><script>"
ACCEPTED  "CTR-EVT-001@01.0.0"
ACCEPTED  "{{leak}}"
ACCEPTED  "${env.SECRET}"
ACCEPTED  <100000-character value>

pre-fix: 16 of 16 hostile forms accepted
```

(The newline inside form 13 is written here as `<LF>`; it is a literal newline in the suite.)

Against the **shipped** schema all sixteen are rejected and each rejection names `schema_ref`.
So the package's headline claim is true, and it is true for the right reason. The fix is a
contract-name pattern plus `maxLength: 32`, not the catalog's `scheme:path` reference pattern,
and RFC-2026-009's argument for that choice holds up under probing: a reference pattern would
have admitted the URL forms.

Acceptance criteria 2 and 3 also hold. `CTR-EVT-001@1.0.0`, `CTR-JOB-001@2.11.0` and
`CTR-TEN-001@10.0.3` are accepted, so the guard is not one that rejects everything. The overlong
probe `CTR-EVT-001@` + sixty-four `1`s + `.0.0` is genuinely shape-valid — I confirmed the pattern
matches it — so the bound is tested independently of the shape, which is what criterion 3 asks for.

---

## 3. Mutation results

Twenty mutations, each applied to a **fresh** disposable copy. A mutation is counted as caught
**only if the assertion message names what the mutation did**. I read every message; exit codes
alone are recorded separately below because they are exactly what over-reports coverage.

### Caught for the targeted reason — 11

| # | Mutation | Assertion message that fired |
|---|---|---|
| M01 | delete `maxLength` on `ctr-evt-001` `metadata.schema_ref` | `a schema_ref of the right shape and unbounded length must be rejected` **and** `reference-shaped field(s) with no upper bound: ctr-evt-001.metadata.schema_ref` |
| M02 | widen the pattern to `^.*$`, bound kept | `CTR-EVT-001 accepts hostile schema_ref(s): file:///etc/passwd, javascript:alert(1), data:text/html;base64,PHN2Zz4=, //evil.example, ../../../../etc/shadow, gopher://x, CTR-EVT-001@1.0.0/../../secret, ctr-evt-001@1.0.0, CTR-EVT-001@1.0.0 .evil, CTR-EVT-001@01.0.0, {{leak}}, ${env.SECRET}` |
| M03 | keyword present, gutted: `maxLength` 32 → 100000 | `a schema_ref of the right shape and unbounded length must be rejected` |
| M06 | bound moved to a keyword that does not constrain: `maxLength` → `maximum` | `a schema_ref of the right shape and unbounded length must be rejected` **and** `reference-shaped field(s) with no upper bound: ctr-evt-001.metadata.schema_ref` |
| M07 | test's own helper returns early: `stringBearer()` always `null` | `discovery missed event_id; it found ` |
| M08 | test's own helper returns early: `referenceFields()` always `[]` | `discovery missed event_id; it found ` |
| M09 | delete a fixture: `ctr-evt-001/examples/valid.json` | `Error: ENOENT: no such file or directory, open 'contract-catalog/shared-kernel/ctr-evt-001/examples/valid.json'` on three tests |
| M10 | delete `maxLength` on the pinned 256 field `ctr-job-001.input_ref` | `reference-shaped field(s) with no upper bound: ctr-job-001.input_ref` **and** `reference field(s) whose accepted range has moved` |
| M11 | **new** unbounded reference field in an **enumerated** contract (`ctr-job-001.callback_ref`) | `reference-shaped field(s) with no upper bound: ctr-job-001.callback_ref` |
| M13 | drop 4 of 6 allow-listed schemes from `ctr-api-001.accepted.status_ref` | `allow-listed scheme(s) the pattern no longer accepts:` |
| M14 | add an RE2-uncompilable lookahead to `ctr-err-001.message_key` | `pattern(s) an RE2-backed validator cannot compile:` |

Two of these deserve credit beyond the row. **M11** is the discovery working as advertised: a
reference field that did not exist when the suite was written is found and failed *inside* the four
enumerated contracts. **M06** is the "keyword that does not constrain" attack and the suite sees it
from two directions at once.

M09's mechanism is an unhandled `ENOENT`, not an assertion. It names the exact deleted file, so I
count it caught; a reader still sees a crash rather than a statement about bounds, which is weaker
diagnostics than the rest of the file.

### Fired, but for an unrelated reason — 2

These are the vacuity findings. In both cases the suite went red, so an exit-code tally would score
them as catches. **The test that was supposed to notice passed.**

| # | Mutation | What actually happened |
|---|---|---|
| M15 | empty `properties: {}` on all four enumerated contracts | `✔ every reference-shaped field in the contracts this package touches carries an upper bound (1.113291ms)` — **passed**, over zero discovered fields. The suite went red only from sibling tests: `additionalProperties` rejecting the whole valid fixture (`file:///etc/passwd was rejected, but not because of schema_ref: $: additional property 'event_id' is not permitted; …`), the canary (`discovery missed event_id`), and the stale-list guard (`ctr-api-001.accepted.status_ref does not exist or declares no pattern — this list is stale`). |
| M16 | point the catalog-wide sweep at an **empty** `shared-kernel` directory | `✔ no pattern in the catalog uses a construct RE2 cannot compile (0.468625ms)` — **passed**, over zero directories. Baseline for that same test is `6.98ms`; the timing alone says it examined nothing. The suite went red only from seven sibling `ENOENT`s. |

Both tests build a list of offenders by iteration and then `assert.deepEqual(list, [])`. Neither
asserts a non-zero count of what it examined. The suite is protected against this in exactly one
place — the `the discovery finds the reference fields it is meant to bound` canary — and that canary
pins seven field names in `ctr-evt-001` only. `ctr-api-001`, `ctr-idm-001` and `ctr-job-001` have
no canary, and the RE2 sweep has none at all.

### Missed — 4

| # | Mutation | Result |
|---|---|---|
| M04 | **bound raised** `maxLength` 32 → 79 | exit `0`, 8/8 pass |
| M05 | **bound tightened** `maxLength` 32 → 18 | exit `0`, 8/8 pass |
| M12 | new unbounded reference field in a **non**-enumerated contract (`ctr-sec-001.callback_ref`) | exit `0`, 8/8 pass |
| M17 | gut the **array branch** of `stringBearer` so an array-of-references is never discovered | exit `0`, 8/8 pass |

Each is a real change to what the contract accepts, not a cosmetic edit. Confirmed by re-running
the shipped pattern against both bounds:

```
--- M05 (tightened 32 -> 18): values the SHIPPED contract declares legal ---
  "CTR-EVT-001@10.10.10" len=20  shipped(32)=ACCEPT  mutated(18)=reject
  "CTR-EVT-001@100.0.0"  len=19  shipped(32)=ACCEPT  mutated(18)=reject
  "CTR-TEN-001@1.20.13"  len=19  shipped(32)=ACCEPT  mutated(18)=reject
  the suite's three accepted samples, which is all that pins this bound:
  "CTR-EVT-001@1.0.0"  len=17  mutated(18)=ACCEPT
  "CTR-JOB-001@2.11.0" len=18  mutated(18)=ACCEPT
  "CTR-TEN-001@10.0.3" len=18  mutated(18)=ACCEPT

--- M04 (raised 32 -> 79): values the SHIPPED contract REJECTS ---
  a 76-char schema_ref  shipped(32)=reject  mutated(79)=ACCEPT
  the suite's own overlong probe is exactly 80 chars, so any raise to <= 79 is invisible
```

### Caught, but only by a repository guard outside this package's suite — 3

| # | Mutation | Kit alone | `verify:coverage-floor` after `regenerate:manifest` |
|---|---|---|---|
| M18 | rename one test in the kit | exit `0`, survived | exit `84` — `renamed, added or removed tests — name digest d1304414d53dccd7 became b021491b26b254b7` |
| M19 | delete the kit outright | n/a | exit `87` — `1 file(s) were removed from test-kits/integrity-manifest.json` |
| M20 | delete two assertions, keeping all 8 test names | exit `0`, survived | exit `84` — `makes 9 assertion(s), floor 11` |

These are floors in `scripts/test-suite-contract.mjs`, and regenerating the integrity manifest does
**not** clear them. That is a genuinely strong ratchet and it is worth saying so plainly.

**Tally: 11 caught for the targeted reason, 2 fired for unrelated reasons while the targeted
assertion passed, 4 missed, 3 caught only by the repository-level floors.** A count of non-zero
exit codes would have read "16 of 20 caught". The honest figure for the package's own suite is
**11 of 20**.

---

## 4. Attacking the bound from the direction enumeration cannot see

The sibling reviewer's finding — that the bound ratchet enumerates four contracts instead of
discovering them — is correct, and it is worse than a style point. Applying the suite's **own**
`referenceFields` predicate across all fourteen shared-kernel contracts finds **43 reference-shaped
fields with no `maxLength` at all** in the ten contracts it does not enumerate. M12 confirms the
consequence directly: a brand-new unbounded `callback_ref` added to `ctr-sec-001` leaves the suite
at exit `0`.

RFC-2026-009 discloses this, and the disclosure is unusually honest — it names
`CTR-NTF-001.deep_link.target_ref`, names `CTR-TEN-001.workspace_id`, lists the ten untouched
contracts, and explicitly retracts an earlier draft's "every reference field in the catalog" claim
rather than widening the scope quietly. I want that on the record before the next paragraph.

**The disclosure understates one case.** RFC-2026-009 reports `CTR-TEN-001.workspace_id` as the
single unbounded tenant field. `CTR-TEN-001` is `$ref`'d into `CTR-EVT-001` as `tenant_context`,
and it carries **seven** unbounded reference-shaped fields, not one. Probing the shipped
`CTR-EVT-001` envelope through its own `$ref`:

```
ACCEPTED  CTR-EVT-001 tenant_context.workspace_id     <- 100000-character value
ACCEPTED  CTR-EVT-001 tenant_context.workspace_id     <- file:///etc/passwd
ACCEPTED  CTR-EVT-001 tenant_context.workspace_id     <- javascript:alert(1)
ACCEPTED  CTR-EVT-001 tenant_context.workspace_id     <- data: URI
ACCEPTED  CTR-EVT-001 tenant_context.workspace_id     <- protocol-relative //host
ACCEPTED  CTR-EVT-001 tenant_context.workspace_id     <- traversal
ACCEPTED  CTR-EVT-001 tenant_context.workspace_id     <- cloud metadata address
ACCEPTED  CTR-EVT-001 tenant_context.workspace_id     <- newline + script
... the same eight for tenant_context.request_id, tenant_context.correlation_id
    and tenant_context.actor.id ...

total accepted: 32 of 32
```

So the envelope this package hardened still accepts every hostile form and a 100000-character value
on four of its own fields, reachable through `metadata`'s sibling. The package's own bound test
cannot see this: `referenceFields` walks the raw `schema.json` and **does not follow `$ref`**, even
though `loadContract()` in the same file resolves `$ref`s correctly for the `schema_ref` tests. The
discovery and the validation disagree about what the contract is.

This is a scope question for the Reviewer, not a defect I am asserting the Author must fix here —
`ctr-ten-001` belongs to another package. But the manifest's `amends_without_owning` claims amend
rights over thirteen contract directories while `BOUNDED_CONTRACTS` lists four, and the test's title
says "the contracts this package touches". Those three numbers should be reconciled by whoever
dispositions RFC-2026-009.

**Bound raised rather than removed** (M04) is the finding nobody has named. The suite's overlong
probe is exactly 80 characters, so `maxLength` on `schema_ref` can be raised from 32 to anything up
to 79 — a 2.5x loosening — with the whole check green. `test-kits/ratchets-bite.test.mjs` has an
independent meta-ratchet over this suite (`the schema-ref ratchet notices two unrelated reversals`)
and it probes `maxLength = 4096` and `pattern = '^.*$'`, both of which my campaign confirms are
caught; neither covers the 33–79 window.

**Bound tightened** (M05) is the mirror image and is the sharper finding, because the suite's own
comment claims to have closed it. The file argues at length that narrowing `maxLength` is a real
contract change invisible to every presence-based mutation guard, and it writes the test that
closes it — `a value at exactly the declared bound is accepted, so the bound cannot be quietly
tightened`, pinning `maxLength === 256` by exact equality for seven fields across `ctr-api-001`,
`ctr-idm-001`, `ctr-job-001` and `ctr-aud-001`. **`metadata.schema_ref` is not in that list.** The
one field this package exists to fix is the one field whose bound is not pinned. Its bound is held
only by three accepted samples of length 17, 18 and 18, so it can be tightened to 18 — rejecting
`CTR-EVT-001@10.10.10`, which the shipped contract declares legal — with 8/8 green.

**Bound moved to a keyword that does not constrain** (M06) is caught, from two directions. That one
holds.

---

## 5. Can the suite pass vacuously

Yes, in two places, and M15/M16 above are the demonstration rather than an argument.

- `every reference-shaped field … carries an upper bound` reports success over an empty set. It also
  passed under **M07 and M08**, where the helper it depends on was gutted — the canary caught those,
  not this test.
- `no pattern in the catalog uses a construct RE2 cannot compile` reports success over an empty
  directory, in 0.47ms against a 6.98ms baseline.
- The one test that does assert it examined something, `the discovery finds the reference fields it
  is meant to bound`, is a good guard and it is the reason M07/M08 are catches rather than misses.
  It covers `ctr-evt-001` only.

**M17 is where these two weaknesses meet.** Removing the array branch of `stringBearer` — so an
array-of-references is never discovered — changes no test name and no assertion count, so the
declared floors do not see it; the canary pins only scalar fields in `ctr-evt-001`, so it does not
see it; and no contract in the catalog currently has an array-of-references, so the branch is
unexercised dead code. I ran M17 through the sanctioned repair path to be sure:

```
########## M17 + regenerate the integrity manifest, then run every declared guard
  [regenerate:manifest]     exit=0
  [verify:coverage-floor]   exit=0
  [verify-toolchain]        exit=0
  [scan:secrets]            exit=0
  [validate:work-packages]  exit=0
  [test:bootstrap]          exit=1  — pass 256, fail 4
```

The four failures are copy artifacts: the throwaway tree has no `.git`, so the handoff and
branch-identity tests cannot resolve revisions. An **unmutated control copy fails the identical four
tests with the identical names**, so M17 contributes nothing to them. Every guard that can run in a
copy passes. This matters because the suite's own comment names `related_event_ids` — an array of
references — as an escape that already happened once here. The regression guard for that specific
past escape has no test over it.

---

## 6. What I threw at it that did not break it

Stated plainly, because a tester who only lists failures is not reporting.

- The pre-fix probe reproduces exactly: **16 of 16 accepted before, 0 of 16 after**, each rejection
  naming `schema_ref`. The central claim is sound and independently confirmed.
- The guard is not a reject-everything guard. Three well-formed contract names are accepted, and
  M02 shows the acceptance test is load-bearing.
- The bound is tested independently of the shape. The overlong probe genuinely satisfies the pattern.
- The discovery is real **inside** its four contracts: M11 proves a reference field invented after
  the suite was written is found and failed.
- `maxLength` cannot be swapped for a keyword that does not constrain (M06), removed (M01, M10),
  or inflated to a large number (M03).
- The pattern cannot be widened to `^.*$` (M02) or narrowed by dropping allow-listed schemes (M13).
- An RE2-uncompilable lookahead anywhere in the catalog is caught (M14).
- Deleting the fixture, renaming a test, deleting assertions, or deleting the suite are all caught
  (M09, M18, M19, M20) — and the last three survive `regenerate:manifest`, which is the difference
  between a floor and a tripwire. That ratchet is the strongest thing in this package's neighbourhood.
- `npm run check` is green with **0 skipped and 0 todo**. No ceiling rose.

---

## 7. Verdict

**test_verified_with_conditions.**

The package does what it says at its centre. The defect it names was real, I reproduced it, the fix
closes it, and the guard over it bites hard against eleven of the twenty things I threw at it. The
RFC's reasoning for a name constraint rather than a reference pattern is correct and I could not
break it. Nothing here is a stop-the-line risk: everything is a Candidate-contract constraint under
G0, synthetic only, no persisted data, no provider, no credential, no migration.

I am not recording a plain `test_verified`, because the suite's own stated purpose — "the bound
cannot be quietly tightened" — is not met for the single field this package exists to bound, and
because two of its tests report success over an empty set.

### Exactly what would lift this to `test_verified`

1. **Pin `metadata.schema_ref`'s bound.** Add `ctr-evt-001` `['metadata','schema_ref']` to the
   `REFERENCE_FIELDS` list, or add an equivalent exact-equality assertion on `maxLength === 32`
   plus an at-the-bound accepted value. This kills M04 and M05 together. It is the one change I
   would insist on; it is a few lines in a file this package owns.
2. **Assert non-emptiness in the two discovery tests.** `every reference-shaped field …` should
   assert it discovered at least N fields; `no pattern in the catalog …` should assert it walked at
   least N directories. This kills M15 and M16, and it is the same defence the file already built
   once as the `the discovery finds …` canary — it simply was not applied to its siblings.
3. **Give the array branch of `stringBearer` a test**, or delete the branch and say in
   RFC-2026-009 that arrays-of-references do not exist in the catalog and will be caught by the
   `stringBearer` returning `null` on a shape it does not understand. Either kills M17. Leaving
   untested dead code as the guard against a named past escape is the weakest point in the file.

### Named, not fixed — these belong to other owners or to the Reviewer

4. **`CTR-TEN-001`'s seven unbounded reference fields reach the CTR-EVT-001 envelope through
   `tenant_context`**, and 32 of 32 hostile probes against four of them are accepted on the shipped
   schema. RFC-2026-009 discloses `workspace_id`; it should disclose all seven, and should say that
   `referenceFields` does not follow `$ref` while `loadContract` does. **I am not asking this
   package to bound them** — `ctr-ten-001` is another package's contract. I am asking for the
   disclosure to match the probe.
5. **Reconcile the three scope numbers**: `amends_without_owning` claims thirteen contract
   directories, `BOUNDED_CONTRACTS` lists four, and the test title says "the contracts this package
   touches". 43 reference-shaped fields sit in the gap. This is the Reviewer's call, not mine.
6. **M12 stands as designed and disclosed**: a new unbounded reference field in a non-enumerated
   contract is invisible. Discovering contracts rather than enumerating them would close it, and
   would also close 5. I do not make it a condition of *this* verdict, because bounding another
   owner's field is out of this package's charter and the RFC says so — but the sibling reviewer is
   right that a discovering ratchet is the correct end state.

None of 4, 5 or 6 blocks `test_verified` from my side; 1, 2 and 3 do.

---

## Reproduction

All probes are Node-only, no network, no credentials, synthetic values only. Mutations ran against
fresh copies of `contract-catalog/` + `test-kits/` (and, for the floor cases, a fuller copy) under
the scratchpad path named above; the worktree was never mutated. The probe scripts are throwaway
and are not committed — every one of them is a short reconstruction of the suite's own
`loadContract`/`referenceFields` logic plus the value lists quoted in this file, and each result
above is the verbatim stdout.

No control character was written into this file: literal newlines inside probe values are rendered
as `<LF>`.

Tester: `/claude/q0_sentinel`. Revision `03c584b2652c74219dabca15e39a2b9c0bd487b6`.
