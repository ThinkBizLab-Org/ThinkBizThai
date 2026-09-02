# Independent Contract Review — WP-0A-A0-002 — Round 7

**This document is independent Reviewer evidence only.** It is not an author self-check, not a
test verdict, and not an integration verdict. It records one reviewer's findings at one commit.
No approval recorded here advances any gate on its own.

| Field | Value |
|---|---|
| Work package | WP-0A-A0-002 |
| Role | Independent Reviewer (contract) |
| Reviewer run id | `/claude/c0_contract_reviewer` |
| Author run id | `/claude/a0_atlas` |
| Branch | `agent/claude/WP-0A-A0-002-contract-test-coverage` |
| Head reviewed | `ffe36fa` |
| Delta reviewed | `eefc747..ffe36fa` (round-7 delta) and `dcafcf8..ffe36fa` (whole branch, scope filter) |
| Toolchain | Node v24.20.0 / npm 11.19.0, login shell (`zsh -lc`) |
| Destructive probing | Sandbox copies under `scratchpad/rv7/`, outside the repository. Live tree verified clean before and after. |

---

## 0. Method and hygiene

Every destructive probe ran in a throwaway `cp -R` copy of the tree with `.git` removed. The live
working tree was checked at the start and end of the review:

```
$ git status --short            -> (empty)              exit 0
$ git rev-parse HEAD            -> ffe36fa…             exit 0
```

The live tree was never modified. The only file this review adds is this document.

**Baseline, sandbox copy of `ffe36fa`:**

```
$ npm run check                                  exit 0
  ℹ tests 54 / pass 54 / fail 0 / skipped 0 / todo 0
$ node scripts/verify-test-coverage-floor.mjs    exit 0
```

Declared tests per file at head (measured via the guard's own `countDeclaredTests`):

```
  4  test-kits/capability-profile.test.mjs
  6  test-kits/contracts/shared-kernel-contract-catalog.test.mjs
  2  test-kits/repository-json.test.mjs
  8  test-kits/role-separation.test.mjs
  2  test-kits/secret-scan.test.mjs
 22  test-kits/test-coverage-floor.test.mjs
  3  test-kits/toolchain-contract.test.mjs
  1  test-kits/work-package-discovery.test.mjs
  6  test-kits/work-package-ownership.test.mjs
TOTAL 54
```

---

## 1. Ruling — is the "no self-anchor" claim correct?

**The claim is correct, and it is sound engineering, not a rationalisation. I could not design an
in-repository control that survives an attacker who edits a guarded file and its digest together,
and I do not believe one exists.**

I want to be unambiguous about this because the Author has been defeated six times and the
temptation is to assume a seventh hole. On this specific proposition the Author is right.

The argument is a fixed-point argument, and it holds. Let `S` be the set of files one commit can
change. Any verifier `V` computed from `S` enforces some predicate `P(S)`. If `V ∈ S`, the attacker
substitutes `V' = accept-always` and `P` is gone. Redundancy does not help — `n` mutually-checking
copies are still all in `S`, and the attacker's cost grows linearly, not exponentially. A
self-referential digest is not merely hard but unconstructible: a file cannot contain its own
SHA-256. Anchoring on the git object store fails for the same reason — an actor who can commit can
rewrite. The only escape is a reference the attacker cannot write: a signing key, a protected
branch, or a CI runner outside the repository. That is exactly what the Author names
(RFC-2026-002 human diff review, protected CI) and exactly what Gate G0 has not yet delivered.

I considered and rejected: self-referential digests, digest cycles across the three scripts,
mutual attestation between the runner and the guard, git-blob pinning to a named ancestor commit,
and deriving the floors from a second in-tree representation. Each is defeated by the same
one-commit-changes-everything property. **On item 1 the Author's engineering conclusion stands.**

### But the conclusion is over-applied, and that is the substance of this review

Correctly identifying an unclosable class does not license stopping work on defects that are *not
in that class*. The Author's stopping point is drawn in the wrong place.

The manifest's stated bargain is: tampering with the test suite must appear as a deliberate,
reviewable digest line in a diff. **I demonstrated three separate exit-0 attacks in which the
integrity manifest is byte-identical — no digest line appears in the diff at all.** Those are not
"the attacker also edited the digest." They are holes in the tripwire itself, and every one of them
is closable inside the repository with plain Node and no dependencies.

Two controls the Author missed, both buildable today:

1. **Pin the file *set*, not only the contents of eight named files.** `assertIntegrityManifest`
   verifies the digests of whatever the manifest happens to list. It never asserts that every
   discovered `*.test.mjs` is *in* the manifest. Adding one line — every file returned by
   `discoverTestFiles` must appear as a manifest key — closes Rows D, G and J below in a single
   stroke. It does not close the digest-updating class, and it does not need to; it restores the
   property the manifest already claims to have.

2. **Compare the declared count to the runner's actual executed count, instead of to a literal.**
   `test-coverage-floor.test.mjs:215` is named *"the declaration count matches what the runner
   actually executes"* and then asserts `assert.equal(declared, 54)`. It never consults the runner.
   Row G below reaches a state where the guard reports `declared = 54`, the runner executes 48,
   this test passes, and `npm run check` exits 0. The control the test's own name describes does
   not exist. Building it — assert `declared === pass` from the runner's real summary — is
   straightforward and is not blocked by any anchoring problem.

**Ruling: the "no self-anchor" claim is CORRECT. The decision to stop patching because of it is
NOT justified, because the defects demonstrated in §2 and §3 lie outside the class it names.**

---

## 2. Ruling — is the attack matrix accurate?

**I cannot audit the attack matrix, because it does not exist in the repository.**

This is the most serious documentation finding of the round.

```
$ ls evidence/WP-0A-A0-002/author-remediation-4.md
  ls: No such file or directory                                        exit 1
$ git log --all --oneline -- '**/author-remediation-4.md'
  (no output)                                                          exit 0
$ (search every commit reachable from every ref for the filename)
  (no output)
$ grep -rln "attack matrix" . --exclude-dir=.git
  (no output)                                                          exit 1
$ git stash list
  (no output)
```

The file the Author's claim rests on **never existed in any commit on any ref.** The head commit
`ffe36fa` adds exactly one evidence file, and it is the *Tester's* round-6 verdict:

```
$ git diff --name-status eefc747 ffe36fa
A  evidence/WP-0A-A0-002/test-verdict-round6.md
M  scripts/run-test-suite.mjs
M  scripts/test-suite-contract.mjs
M  scripts/verify-test-coverage-floor.mjs
A  test-kits/integrity-manifest.json
M  test-kits/test-coverage-floor.test.mjs
```

The Author recorded no round-7 author evidence at all. Three specific claims in the commit message
are therefore unsupported or false:

| Commit-message claim | Status |
|---|---|
| "The attack matrix … is recorded in full INCLUDING the two rows that still pass" | **False.** No matrix exists in the tree or in history. |
| "the guard is recorded … as an open blocker on the package" | **False.** `work-packages/WP-0A-A0-002.json` was last modified at `f55b8ff`, two commits before head. Its six `open_blockers` entries cover RFC-2026-003 disposition, the `/root/r0_steward` countersignature, the WP-0A-CON-001 addendum, the weak secret scanner, the cross-vendor exception, and Gate G0. **None mentions the guard, the tripwire, or the self-anchor limitation.** |
| "No independent evidence exists at this head" | True at the time of writing; this document is now that evidence. |

The tripwire caveat *is* honestly recorded in two places — the `note` field of
`test-kits/integrity-manifest.json` and the block comment at `scripts/test-suite-contract.mjs:34-40`.
Both are candid and well-written. But a caveat in a JSON `note` is not a package blocker, and a
reader of the package manifest — the artifact the Integration Owner and the Product Owner actually
consult — sees no indication that the suite's integrity control is a tripwire with known passing
bypasses.

Because no matrix was published, I constructed and ran my own, including the two rows the Author
says still pass. **Every row below was executed. Exit codes are real.**

| Row | Attack | Digest edit needed? | Exit | Fires? |
|---|---|---|---|---|
| A | Edit a guarded file (`secret-scan.test.mjs`), leave digest stale | — | **86** | yes — `assertIntegrityManifest` |
| B | Gut the protected contract suite to 6 empty bodies **and update its digest** | yes | **0** | **no — Author's row, confirmed** |
| E | Remove `verify:coverage-floor` and `test:bootstrap` from `package.json` `check` | no | **0** | **no — 0 tests executed, silent** |
| F | Gut the contract suite and **delete its manifest entry** | no | **1** | yes — pinned key set in `test-coverage-floor.test.mjs:200` |
| D | Gut the **four unprotected suites**, preserving declared counts | **no** | **0** | **no — manifest byte-identical** |
| G | Replace the four unprotected suites with **phantom declarations** | **no** | **0** | **no — declared 54 vs executed 48** |
| J | Tester's **E4** out-of-root symlink import, count compensated | **no** | **0** | **no — payload outside the tree executed** |
| K | **Legitimate** edit: add one genuine test | no | **1** | false alarm — see §3 |

Rows A, B, E and F reproduce the Author's stated behaviour correctly where that behaviour is
stated. **Row B is accurate: the Author does not overstate the manifest's strength on that row.**

**Where the Author overstates:** the manifest is described as covering "the three scripts and the
suites they defend." It covers 3 scripts and 5 of 9 suites. Rows D, G and J show that the four
unprotected suites can be deleted, neutered or extended with the manifest byte-identical. The
claim that the manifest "converts tampering from invisible into reviewable" is therefore **true
only for the 8 files it lists**, and the package documents no reasoning for why the other four do
not matter. They do — see §4.

**Ruling: the attack matrix is unauditable because it was never published. The rows I could
reconstruct are accurate where stated, but the matrix as described in the commit message is
incomplete: it omits at least three exit-0 attacks that require no digest edit.**

---

## 3. Ruling — is `stripNonCode` correct?

**No. It is broken in both directions, and I broke it.** The rewrite from a regex chain to a
stateful scanner is a real improvement, but the scanner tracks four states — line comment, block
comment, string, template — and **has no state for regular-expression literals.** A regex is the
one JavaScript construct in which `/*`, a backtick, or an unbalanced quote can appear as ordinary
data, so the scanner mis-lexes exactly the construct that the old regex chain also mis-lexed. The
defect class was moved from string literals into regex literals, not eliminated.

Twelve adversarial cases, run against the shipped `countDeclaredTests`:

```
FAIL  want=2 got=0   regex containing /* (character class)
FAIL  want=2 got=0   regex containing a backtick
ok    want=2 got=2   regex containing a single quote
ok    want=1 got=1   regex containing //
ok    want=1 got=1   division then block comment   a / b /* c */
ok    want=1 got=1   nested template ${} containing a backtick-quoted string
ok    want=1 got=1   nested template ${} containing a quote
ok    want=1 got=1   escaped backslash at end of string
ok    want=1 got=1   unicode escape in string
ok    want=1 got=1   string containing //
ok    want=1 got=1   apostrophe inside a line comment
ok    want=1 got=1   apostrophe inside a block comment
2 failing case(s)
```

Eight of the twelve probes the review brief called for pass — escaped backslashes, unicode escapes,
nested `${}`, division-vs-comment and `//`-in-string are all handled correctly. The two failures
are decisive.

### 3a. Losing declarations

`const re = /[/*]/;` — the `/*` inside a character class opens a phantom block comment that runs to
the next `*/` **or to end of file**, erasing every declaration after it. `const re = /[`]/;` opens a
phantom template literal with the same effect. This is the round-6 bug (`/*` inside a glob string
erasing 11 declarations) in a new host.

### 3b. Inventing declarations — the exploitable direction

Losing declarations fails closed. Inventing them fails **open**. Two lines of entirely valid
JavaScript that execute **zero** tests:

```js
const a = /[`]/;
/* pad ` test('phantom', () => {}); */
```

The backtick in the regex opens a phantom template that consumes forward across the newline to the
backtick inside the comment. Everything consumed is blanked to spaces — but `keepNewlines`
preserves the newline, so the remainder of line 2 is emitted as code with only leading whitespace
before it, and `^\s*test\s*\(` matches:

```
stripNonCode -> "const a = /[    \n         test(         , () => {}); */\n"
countDeclaredTests(1 unit)   = 1
countDeclaredTests(20 units) = 20
```

Arbitrarily scalable. Node executes nothing from it.

### 3c. Weaponised — Row G

Replacing the four unprotected suites (10 real tests) with phantom declarations only:

```
$ diff -q base/test-kits/integrity-manifest.json rowG/test-kits/integrity-manifest.json
  (identical — no digest update was required)
$ npm run check                                                  exit 0
  ℹ tests 48 / pass 48 / fail 0
$ node -e "…verifyTestCoverageFloor()"  ->  guard says declared = 54
```

**Ten real assertions deleted. `npm run check` green. The integrity manifest byte-identical. The
guard reports 54 declared while the runner executed 48 — and the test named "the declaration count
matches what the runner actually executes" passes, because it compares to the literal `54`, never
to the runner.** The Author's headline "the count is now 54 = 54 executed, asserted" is false as
stated: only `declared === 54` is asserted.

A related discovery: **a test file that declares nothing still contributes 1 to `pass`**, because
node's runner counts the file itself. Each phantom file therefore yields one free unit of executed
count (4 files → `pass` 44 + 4 = 48), padding the `MIN_EXECUTED_TESTS = 40` floor.

### 3d. The `=== 54` assertion is brittle, and its failure message misleads

Row K — a contributor adds one genuine test to a suite:

```
$ npm run check                                                  exit 1
  AssertionError: stripNonCode must not lose or invent declarations;
                  counted 55, runner executes 54
```

Any honest future edit breaks the build, and the message **blames the scanner for a bug that is not
there.** A contributor who trusts it will go hunting in `stripNonCode`. The assertion should compare
`declared` against the runner's real `pass` count (§1, control 2), which is both correct and
self-maintaining; the literal `54` should not exist.

**Ruling: `stripNonCode` is not correct. It loses declarations on a regex containing `/*` or a
backtick, and it can be made to invent unlimited phantom declarations from valid, non-executing
JavaScript. The `=== 54` assertion is brittle against legitimate edits and misreports the cause.**

---

## 4. Ruling — is the manifest complete?

**No.** The manifest protects 8 files. The set of files whose modification can disable or mislead
the guards is materially larger.

**Not protected, and should be:**

| File | Why it matters | Demonstrated |
|---|---|---|
| `test-kits/capability-profile.test.mjs` | 4 real tests; can be neutered silently | Rows D, G, J |
| `test-kits/repository-json.test.mjs` | 2 real tests; can be neutered silently | Rows D, G |
| `test-kits/toolchain-contract.test.mjs` | 3 real tests; pins Node/npm versions | Rows D, G |
| `test-kits/work-package-discovery.test.mjs` | 1 real test; can be deleted | Rows D, G |
| **the file *set* itself** | a **new** `*.test.mjs` can be added with no digest | Rows H, J |

**Not protected, and arguably out of reach:**

- **`package.json`** — the root of trust for the entire chain. Row E: deleting
  `npm run verify:coverage-floor && npm run test:bootstrap` from `check` gives exit 0 with zero
  tests executed and no guard output. Adding it to the manifest would **not** help, because the
  guard never runs. This one genuinely is the unclosable class: the entry point must be trusted.
  It should nonetheless be named as such in the package, and it is not.
- **`.github/workflows/ci.yml`** — tracked, unmodified on this branch, and runs `npm run check`.
  Editing it disables enforcement in CI. Undigested. It is `read_only` for this package, so this is
  a scoping note rather than a defect of this delta, but the package should record it.
- **`scripts/verify-toolchain.mjs`, `scan-repository-secrets.mjs`, `validate-work-packages.mjs`,
  `validate-capability-profiles.mjs`, `validate-work-package-ownership.mjs`** — all five run inside
  `check` and none is digested. Weakening them does not disable the coverage floor, so this is
  lower severity, but the manifest's own `note` claims to cover "the files that enforce test
  integrity," and these enforce the rest of `check`.

The one thing the manifest does well and deserves credit for: the **required key set** is pinned in
`test-coverage-floor.test.mjs:200-211`, which is itself digested, so simply deleting an entry fails
(Row F, exit 1). That is good design. It is undermined by the set being only four names long and by
there being no check that discovered files are members of it.

**Ruling: the manifest is incomplete. Four live test suites and the file set itself are
unprotected, and three exit-0 attacks follow directly from that.**

---

## 5. Ruling — is the Tester's residual handled or honestly recorded?

**Neither. It is open, and it is recorded nowhere in the repository.**

The Tester's round-6 row E4: an in-root test that `import`s a symlink resolving outside `test-kits/`
executes and adds to `pass` without being flagged. Reproduced at head:

```
$ node scripts/verify-test-coverage-floor.mjs                    exit 0    (guard never flags it)
```

`discoverTestFiles` rejects symlinks *inside* the test root (exit 85 — that control works and I
confirmed it), but it never inspects what test files import. The symlink lives at the repository
root, outside the walked directory.

End-to-end, Row H tripped only incidentally, on the brittle `=== 54` constant — not on any symlink
control. Compensating the count inside an unprotected suite removes even that accident (Row J):

```
$ diff -q base/…/integrity-manifest.json rowJ/…/integrity-manifest.json   -> identical
$ npm run check                                                  exit 0
  PAYLOAD RAN: code outside test-kits/ executed by npm run check
  ℹ tests 55 / pass 55 / fail 0
```

Code from `/tmp`, outside the repository entirely, executed during a fully green `npm run check`,
with the integrity manifest byte-identical.

The Author's round-7 commit landed the Tester's verdict file but neither fixed E4 nor recorded it.
It is absent from `open_blockers`, absent from the manifest `note`, and absent from
`test-suite-contract.mjs`. Landing the verdict that reports a gap is not the same as recording the
gap.

**Ruling: the residual is unhandled and unrecorded.**

---

## 6. Ruling — whole-branch scope filter `dcafcf8..ffe36fa`

**Clean.**

```
$ git diff --name-only dcafcf8 ffe36fa | grep -Ei 'schema|migration|provider|credential|secret|\.env|^db/|^\.github/|package-lock\.json'
  (no matches)                                                    exit 1
```

31 paths changed: 5 capability profiles, RFC-2026-003, 14 evidence files, 2 handoffs, `package.json`,
4 scripts/test-kits sources, `test-kits/integrity-manifest.json`, and 3 work-package manifests
(`WP-0A-A0-001`, `WP-0A-A0-002`, `WP-0A-CON-001`).

- No schema, migration, provider, credential, or network change.
- `.github/**` untouched (`ci.yml` tracked and unmodified).
- `package-lock.json` untouched.
- The `package.json` diff is confined to the `scripts` block: the corrected `test:bootstrap` glob,
  the new `verify:coverage-floor` script, and its insertion into `check`. No dependency,
  `engines`, or `packageManager` change.
- The two cross-package manifest amendments match `authorized_cross_package_amendments`.

---

## 7. New issues introduced by this remediation

1. **Ownership boundary violation.** `test-kits/integrity-manifest.json` is created by `ffe36fa`
   but appears in **neither** `ownership.writable_paths` **nor** `outputs.files` of
   `work-packages/WP-0A-A0-002.json`. The package declares `test-kits/test-coverage-floor.test.mjs`
   individually — there is no `test-kits/**` glob to cover it. The Author wrote outside its declared
   writable set. `node scripts/validate-work-package-ownership.mjs work-packages` exits **0**,
   because that validator checks *declared* outputs against writable paths and never compares the
   actually-changed file set — so the violation is real and undetected. Fixing this requires
   amending the package manifest, which is itself writable, so it is a clean fix.

2. **Stale `outputs.files`.** Six artifacts now in the tree are undeclared:
   `author-remediation-3.md`, `review-contract-head.md`, `review-security-head.md`,
   `test-verdict-head.md`, `test-verdict-round6.md`, and `test-kits/integrity-manifest.json`.

3. **Stale acceptance criterion.** Criterion 1 still reads "reports 46 passing tests." The suite
   reports **54**. A criterion that no longer matches the artefact cannot be used to accept it.

4. **A test whose name does not describe its behaviour.** `test-coverage-floor.test.mjs:215`,
   "the declaration count matches what the runner actually executes," never consults the runner.
   Row G is green with `declared = 54` and `pass = 48`. This is worse than a missing control: a
   reader auditing the suite will believe the control exists.

5. **Misleading failure text**, §3d — `stripNonCode must not lose or invent declarations` is
   emitted for the ordinary case of a contributor adding a test.

6. **Undocumented free pass unit** — an empty test file contributes 1 to `pass` (§3c), quietly
   padding `MIN_EXECUTED_TESTS`.

---

## Is the "tripwire, not a control" characterisation honest and complete?

**Honest: yes. Complete: no.**

**Honest.** The Author is not hiding behind the phrase. The impossibility argument is correct (§1),
Row B is real and I reproduced it at exit 0, and the caveat is stated bluntly in the two places a
maintainer reading the code will hit it — the manifest `note` and
`test-suite-contract.mjs:34-40`, including the capitalised "THIS IS A TRIPWIRE, NOT A SECURITY
BOUNDARY, AND IT HAS NO SELF-ANCHOR." An author who wanted to conceal a weak control would not
write that. The decision to stop escalating rather than ship a seventh guard that would be
falsified again is defensible judgement, and the underlying diagnosis — that the anchor must be
external — is correct and is the right thing for this package to terminate on.

**Not complete, in four specific ways:**

1. **The characterisation is applied to defects that are not in the class.** Rows D, G and J are
   exit 0 with the integrity manifest **byte-identical**. No digest was edited. These are not
   instances of "an attacker who edits a file and its digest together"; they are gaps in the
   tripwire's coverage, and each is closable with the two controls in §1.

2. **The evidence does not exist.** `author-remediation-4.md` was never committed. The attack
   matrix the commit message says is "recorded in full" is recorded nowhere. A claim of the form
   "this defect class is not closable, here is my matrix" cannot be evaluated when the matrix is
   absent, and the reviewer instruction to read that file could not be satisfied.

3. **The blocker was not filed.** The commit message states the guard is recorded "as an open
   blocker on the package." `work-packages/WP-0A-A0-002.json` has not been touched since `f55b8ff`
   and none of its six blockers mentions the guard. The one artifact a downstream role reads for
   known limitations does not carry this one.

4. **Coverage is overstated.** "The three scripts and the suites they defend" is 3 scripts and 5 of
   9 suites, with the file set unpinned. The Tester's E4 residual is not mentioned at all.

The gap between the Author's characterisation and the artefact is not deception — it is a claim
written as though the accompanying evidence had been produced, when it was not.

---

## Required changes

**Blocking:**

1. Add regex-literal state to `stripNonCode`, with cases for `/[/*]/`, a backtick in a regex, and
   the two-line phantom-declaration payload in §3b.
2. Replace `assert.equal(declared, 54)` with an assertion comparing `declared` to the runner's
   actual `pass` count. Remove the literal.
3. Assert that every file returned by `discoverTestFiles` is a key in the integrity manifest, and
   add the four unprotected suites to it.
4. Publish the round-7 author evidence, including the attack matrix, and add Rows D, E, G and J
   with their real exit codes.
5. Record the tripwire limitation, the `package.json` entry-point exposure, and the E4 residual in
   `open_blockers` on `work-packages/WP-0A-A0-002.json`.
6. Add `test-kits/integrity-manifest.json` to `writable_paths` and `outputs.files`.

**Non-blocking:** correct acceptance criterion 1 to 54; rename the §7.4 test or make it do what its
name says; reconcile `outputs.files`; note the undigested `check`-chain validators and `ci.yml`.

**Explicitly not required:** a seventh attempt to close the digest-updating class. §1 finds the
Author correct on that point. Effort should go to the closable gaps above.

---

VERDICT: changes_requested
