# Independent review #15

Four HIGH, five MEDIUM/LOW. One HIGH was already closed at the branch head by a commit made after
the reviewed revision; the other eight are closed here. The review also **falsified two claims in
this package's own evidence**, both corrected where they were written.

## HIGH 3 was already closed — recording it so the ledger is honest

The review's HIGH 3 (`scan:secrets` and `validate:protocol` rewritable to something harmless) is
the same defect I found by self-probing at `580a570`, one commit after the revision it reviewed.
Confirmed at head: rewriting both to inert commands now exits **74**. Two independent paths reached
the same hole within an hour of each other, which is the most useful evidence yet that the probing
habit and the review habit are not redundant.

## HIGH 1 — `description` and `title` were the same normative channel as `x-`, unpinned

`ANNOTATION_DIGESTS` hashed keys matching `x-` only. `surfaceOf` skips `description`/`title` as
METADATA, correctly, since neither constrains an instance — which is exactly why nothing else
watched them.

The review rewrote `CTR-SEC-001`'s `description` — *"It never carries credential material, and this
schema declares no property that could hold any"* → *"A handle MAY carry credential material inline
in its handle body … consumers MUST accept such a handle"* — and gave `CTR-API-001` a top-level
description exempting internal callers from tenant isolation. **exit 0, 214/214.**

`description` is the **standard** documentation channel: what a code generator, an OpenAPI render
and a reviewer read first, strictly more visible than an `x-` extension. Both are now in
`ANNOTATION_DIGESTS`: **174 entries** across 14 contracts, up from 157. Verified: the `CTR-SEC-001`
rewrite now exits 1.

## HIGH 2 — my own fix for review 14 tested an argument production never uses

The two process rows I added last wave invoked the CLI as `run(guard, [absolutePath])`. Production
runs `node scripts/validate-work-package-ownership.mjs` with **no argument**, defaulting to the
literal `'work-packages'` — which is what review 14's stub compares against. **The rows never
touched the branch**, and the whole ownership path was still removable at exit 0.

*A process row that runs the guard with an argument production never uses is a unit test wearing a
process row's clothes.* Both rows now run with `cwd` set to a temporary repository and no argv, and
a third asserts exit 68 for an output outside `writable_paths`. Verified: the stub now fails both.

## HIGH 4 — the two highest-authority documents were digested by nothing

`CONTRIBUTING_AGENTS.md` is the conflict-order authority for everything in this repository,
including the non-negotiable security rules. The Decision Register is authority level 2 and is the
exact string `INDEX_HEADER` pins as the catalog's provenance. **Neither was in the integrity
manifest.** `INDEX_HEADER` pinned the *citation* and nothing pinned the *cited document*.

The review rewrote *"enforce tenant isolation … for every tenant data path"* into *"for browser and
BFF paths; an internal service caller is exempt"*, declared four contracts FROZEN with no co-owner
sign-off, and appended a freeze-authority section to the Register. **exit 0, 214/214.** Every
catalog ratchet justifies itself by citing these two files; a rule reversed there survives all of
them, and they then enforce a status the amended source says is already frozen.

Both are digested and in `DIGESTED_FLOOR`. Verified: appending one line to `CONTRIBUTING_AGENTS.md`
now exits **86**.

## MEDIUM 5 — the index took invented fields

The key-set ratchet went to contract manifests and not to the index, the one file RFC-2026-010 and
every gate decision actually read. `INDEX_KEYS` and `INDEX_ENTRY_KEYS` close it. Verified: exit 1.

## MEDIUM 6 — a dead guard, and a false claim in my evidence

`if (Array.isArray(CATALOG_REGISTRY[dir]?.composes) && …)` — **no entry in `CATALOG_REGISTRY`
declares `composes`**, so the condition was `false && …` for all fourteen contracts and could never
fire. My fourteenth-review response said *"a `composes` list cannot vanish"*. **It could**, and the
review deleted one at exit 0.

The eight real `composes` lists are pinned by content, both directions. Verified: exit 1.

## MEDIUM 7 — and the larger thing underneath it

The review added `normative_rules` to a work package and flipped
`security_privacy.data_classification` to `permissioned-customer-content` with no consent,
retention or redaction declared: **exit 0**.

Underneath: **`.agents/work-package.schema.json` is digested, protected, listed in
`PROTECTED_KEYS`, parsed as JSON by a syntax test — and read by no validator at all.** So is
`.agents/capabilities.schema.json`. Only `handoff.schema.json` had a suite pointed at it, and only
because a review found the same thing about handoffs ten waves ago.

**A schema nothing validates against is a document, not a control.**

- `additionalProperties: false` at the top level, after declaring the **twelve keys every manifest
  already used and the schema never mentioned**.
- `security_privacy` constrained: a classification enum, and a conditional requiring
  `consent_basis`, `retention_policy`, `redaction_policy` and `pii_policy` when the classification
  is `permissioned-customer-content` — which is what `CONTRIBUTING_AGENTS.md` requires in prose and
  nothing enforced.
- `test-kits/protocol-schema-conformance.test.mjs` validates every work package and every
  capability profile against its schema, and asserts the schema is one this validator fully
  understands.

Writing it found a real disagreement immediately: the schema declared `review_and_test_gates` as an
object and **all thirteen manifests ship an array**. The schema had been wrong since it was
written, and nothing had ever compared them.

Verified: `normative_rules` on a work package now fails with *"additional property 'normative_rules'
is not permitted"*, and permissioned data with no consent basis is rejected while the fully declared
form is accepted.

## MEDIUM 8 — a file at the group root was in no guard's domain

`catalog-reference-integrity.test.mjs` iterates contract *directories* and only `.json`;
`catalog-groups.test.mjs` iterated directories only. So `contract-catalog/shared-kernel/
catalog-policy.json`, `CATALOG-RULES.md` and `ctr-sec-001/RULES.md` all passed at exit 0 —
**two guards each assuming the other covered it.**

The catalog is now walked whole: every file, every extension, against a declared set — `README.md`
at the root, `index.json` and `README.md` per group, `manifest.json` / `schema.json` per contract,
and fixtures the manifest declares. Verified: a rules `.md` at the group root exits 1.

*A rule does not become harmless by being written in a file no parser reads. A human reads it, and
a human is who a contract catalog is for.*

## Verification

`npm run check` — **225/225, fail 0, skipped 0, todo 0, exit 0**.

---

## The commit that closed all this shipped red, and I said it was green

`npm run check` exited **88** at `553823b` and at the commit after it:

```
the suite declares 224 tests but the runner executed 225. A declaration the runner does not
execute, or a test the counter cannot see, means the floors are measuring something other than
what runs.
```

**Cause.** `protocol-schema-conformance.test.mjs` generated its first two tests in a loop —
`for (const … of CASES) test(…)`. The declaration counter reads `test(` calls **statically**, so a
loop producing two tests declares one. The guard was right; the test file was written in a shape
it cannot count. Rewritten as two explicit `test()` calls.

**Why I did not see it.** I verified with `npm run check 2>&1 | grep -E "ℹ (pass|fail)"` and read
`pass 225, fail 0`. Every test passed. **The suite still exited 88**, because the failure is not a
failing test — it is the runner refusing a count it cannot reconcile.

This is the same error the machine-written verification record exists to prevent, made while
adding a test, four waves after I wrote *"nobody should type a fact the repository already knows"*.
The rule I had was **"regenerate every generated fact before committing"**; the rule I needed is
narrower and harder to get wrong:

> **Read the exit code. A summary line is not an exit code.**

CI caught it on the next push. It is recorded here rather than amended away, because the pattern —
verifying with a substring instead of a status — has now cost this package three separate defects.

### What was added so the mistake is not available next time

`npm run verify` (`scripts/verify-clean-run.mjs`) runs the check as a **child process** and reports
its **status**, so the fact I kept getting wrong is one a command produces rather than one I read
out of a stream:

```
clean: exit 0 — tests 226, pass 226, fail 0, skipped 0, todo 0
```

and on the exact shape that fooled me:

```
NOT clean: exit 88 — tests 227, pass 227, fail 0, skipped 0, todo 0
  the suite declares 226 tests but the runner executed 227. …
  Note: every test passed and the run still failed. The failure is not a failing test.
```

That last line exists because `pass 227, fail 0` is what I read and believed. The numbers look
clean; the run is not.

**And the test guarding it failed on its own first line.** I wrote
`assert.ok(!scripts.check.includes('npm run verify'))` to stop `check` recursing into `verify` — and
`check` contains `npm run verify:coverage-floor`, so the substring matched and the assertion failed
the moment it was written. **Substring instead of structure, in the test written to fix a defect
caused by substring instead of status.** Compared step by step now.
