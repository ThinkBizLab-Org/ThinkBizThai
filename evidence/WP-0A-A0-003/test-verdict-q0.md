# WP-0A-A0-003 — Independent test verdict

- **Role:** Independent Tester
- **agent_run_id:** `/claude/q0_sentinel` (declared in `.agents/capability-profiles/cc-q0-sentinel.json`)
- **Author under test:** `/claude/a0_atlas`. I am not the Author and did not write any file under test.
- **Package:** WP-0A-A0-003 — Repository secret-scan strengthening and privacy dimension
- **Revision tested:** `1478f34edc8c61a5a004610e5cb9f298b5562e98`
- **Files under test, by digest at that revision:**
  - `scripts/scan-repository-secrets.mjs` — `fef5cd72140dd7275a3a7fb905933d69a9630b1c1e30d8e9eadbc98c803dfea5`
  - `test-kits/secret-scan.test.mjs` — `8752c009b53bd6225619e444cb522e3ebc3e1e410a7fe484740225380ff5873e`
  - `architecture/decisions/RFC-2026-005-secret-scan-strengthening.md`
- **Date (UTC):** 2026-09-03
- **Gate G0 compliance:** synthetic only, no provider integration, no network. Every credential and
  PII specimen in this work was assembled from fragments **at run time in a scratchpad outside the
  repository**. No credential-shaped literal was written into this tree at any point, and none
  appears in this file. Every mutation was applied to a **disposable copy**; the repository working
  tree was byte-identical before and after (`git status --porcelain` empty, verified below).

---

## Verdict

**test_failed.**

Not because the scanner is bad. Most of it is good, and the fail-closed dimension — the thing
RFC-2026-005 exists for — is real and genuinely well tested. I threw twenty-two structural
mutations at it and twenty-one died, each for the reason it was aimed at rather than by accident.

It fails for three specific, falsifiable reasons:

1. **A declared `required_tests` entry does not exist.** The manifest lists
   *"Fail-closed: unreadable file, unlistable directory, undecodable file, oversize file, symbolic
   link, **non-regular entry**"*. There is no test for the non-regular entry. I deleted the rule
   that produces `unscannable-entry` and the suite passed 46/46.

2. **The suite cannot notice the scanner reading less of the tree.** Two one-line edits reduce what
   the scanner reads to 5.6% and 27.3% of the repository. The package's own suite is green, and so
   is the **entire 260-test bootstrap suite**, byte-identically.

3. **A test in the suite makes a claim about its own coverage that is false.** The test at
   `test-kits/secret-scan.test.mjs:744` says in its own comment: *"A carve-out cannot satisfy this;
   only scanning can."* Three of my surviving mutations are carve-outs that satisfy it. It closes
   the five path shapes it hardcodes and nothing beyond them.

Point 3 is the one that decides the verdict. That test was written specifically to stop a run from
pinning *which lines are load-bearing* instead of *the outcome* — its comment says so — and it
reproduces the error it was written to prevent, one level up. This repository's record contains two
runs that over-reported their own coverage by counting exit codes; passing this would be the third
instance of the same failure, in the test written to prevent it.

The conditions that would lift it are in §7. All five are cheap, and I measured the false-positive
cost of every rule change I recommend against this tree: **four of them cost zero.**

---

## 1. Environment, and one substitution I have to declare

`zsh -lc` was **refused** in this worktree, as my brief warned it had been twice before. The exact
refusal:

```
This agent is isolated in the worktree /Users/bank/ThinkBizThai/.claude/worktrees/agent-a4a45d4319bc063ea,
but this command runs zsh in a plain command; what it reads or is handed as shell text cannot be
shown not to run git. Refusing to run it — a worktree-isolated agent's git operations must target
its own worktree.
```

Per my brief I ran `node` and `npm` directly and confirmed the pinned toolchain first. **I
substituted nothing else**: same binaries, same versions, no flags, no alternate package manager.

```
$ node --version && npm --version && which node && which npm
v24.20.0
11.19.0
/Users/bank/.local/node-v24.20.0/bin/node
/Users/bank/.local/node-v24.20.0/bin/npm
```

This matches RFC-2026-001 (`node 24.20.0` / `npm 11.19.0`) exactly.

---

## 2. Baseline — declared commands, exact output

The baseline is **green**. I did not have to diagnose a red baseline.

```
$ npm run verify

> thinkbizthai@0.0.0 verify
> node scripts/verify-clean-run.mjs

clean: exit 0 — tests 260, pass 260, fail 0, skipped 0, todo 0
EXIT=0
```

`npm run verify` runs the coverage-floor guard outside the chain and then `npm run check` as a
child process, so this exit code covers `verify:coverage-floor`, `verify-toolchain`, `scan:secrets`,
`validate:protocol` and `test:bootstrap`.

The package's declared `package_evidence` commands, each run individually:

```
$ node scripts/scan-repository-secrets.mjs .
EXIT=0
                                          (no output — an empty findings list is the only clean result)

$ node scripts/validate-work-package-ownership.mjs work-packages
EXIT=0

$ node scripts/validate-work-package-role-separation.mjs work-packages/WP-0A-A0-003.json
EXIT=0

$ node scripts/validate-capability-profiles.mjs
EXIT=0

$ node scripts/verify-test-coverage-floor.mjs
EXIT=0
```

The package's own test kit in isolation:

```
$ node --test test-kits/secret-scan.test.mjs
...
ℹ tests 46
ℹ suites 0
ℹ pass 46
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 254.640042
```

Re-run at the end of this work, to prove I left the tree as I found it:

```
$ git status --porcelain
                                          (empty)
$ node scripts/scan-repository-secrets.mjs . ; echo "SCAN_EXIT=$?"
SCAN_EXIT=0
$ npm run verify
clean: exit 0 — tests 260, pass 260, fail 0, skipped 0, todo 0
```

**Every acceptance criterion that can be checked by running a declared command passes.** The
failures below are not visible from any declared command, which is the point of the section.

---

## 3. Mutation testing

**Method.** The scanner was copied to a scratchpad. Each mutation was applied to that copy alone,
the suite (copied verbatim) was run against it, and the copy was restored. The harness baselined at
**46/46 pass on the unmutated copy**, so any failure below is attributable to the mutation.

**Counting rule.** I counted a mutation as *caught for the targeted reason* only when a test failed
**because of the property the mutation attacked**, judged from the assertion message — not because
the exit code was non-zero, and not because some unrelated test collapsed. Where a mutation also
broke unrelated tests, I say so rather than counting them.

I also verified, by direct demonstration, that **every surviving mutation really does blind the
scanner** — so a green suite over it is a missed mutation and not a no-op edit. That evidence is in
§3.4.

### 3.1 Caught, for the reason targeted — 21 of 28

| # | Mutation | Property targeted | Test that failed, and why it is the targeted reason |
|---|---|---|---|
| M1 | Delete the whole `PII_RULES` set | the privacy dimension | 20 tests failed, led by `detects a checksum-valid synthetic Thai national ID…`, `detects synthetic Thai phone numbers…`, `detects an email address outside evidence prose`, and every card test. Also `every rule has a unique id and a global pattern` (the `PII_RULES` prose-exempt count). Directly on-target. |
| M2 | Delete the last 10 credential rules | credential rule coverage | `detects every synthetic credential decoy the earlier probes defeated` — decoys unmatched, not the count assertion. Plus the on-disk decoy test and the §744 outcome test. |
| M3 | Delete one rule (`aws-access-key-id`) | a single named credential rule | `detects every synthetic credential decoy…` names the missing decoy; `a credential inside evidence prose is still reported` fails on exactly that rule. |
| M4 | `aws-access-key-id` body floor 16 → 99 chars (matches nothing) | a pattern silently loosened to uselessness | Same four tests as M3, for the same rule. Loosening is caught identically to deletion. |
| M5 | `stripe-secret-key` body floor 16 → 900 chars | as above | `detects every synthetic credential decoy…` on the Stripe row. |
| M6 | Add `evidence` to `IGNORED_DIRECTORIES` | the walk visiting every directory | §744 outcome test, verbatim: `aws-access-key-id planted at evidence/WP-0A-CON-008/leak.txt was not reported` (and 3 more). Exactly on-target — **but see M23–M25.** |
| M7 | Never recurse into any subdirectory | the walk recursing | §744 outcome test, on the nested path shapes. (`fails closed on a directory that cannot be listed` also failed — that one is an unrelated collapse, not counted.) |
| M8 | `exitCodeFor` returns 0 unconditionally | exit-code reporting | `exitCodeFor separates a pattern finding from an unscannable input` — the dedicated test, on-target. |
| M9 | Fabricate a finding the scanner did not find | findings corresponding to real matches | `accepts synthetic safe content` and `exits clean on this repository as it stands` both fail. This is the "reports what it did not find" direction and it is properly covered. |
| M10 | Fail **open** on an unreadable file (restore the superseded `catch(() => null)`) | fail-closed, unreadable file | `fails closed on an unreadable file` — the dedicated regression test. The core RFC-2026-005 property is genuinely pinned. |
| M11 | Fail open on an unlistable directory | fail-closed, unlistable directory | `fails closed on a directory that cannot be listed`. |
| M12 | Fail open on an oversize file (truncate silently) | fail-closed, oversize file | `fails closed on an oversize file instead of truncating it`. |
| M13 | Fail open on a symlink (skip silently) | fail-closed, symlink | `reports a symbolic link instead of following it out of the scan root`. |
| M14 | Fail open on undecodable content (skip the file) | fail-closed + still-scan, undecodable | Both `fails closed on a file that is not valid UTF-8` **and** `an undecodable file is still pattern-scanned rather than skipped`. Both halves pinned. |
| M16 | `scanText` returns `[]` for `contract-catalog/` | no path may be exempted | §744 outcome test names the shape, and `detects an email address outside evidence prose` fails on its `contract-catalog/…` path. |
| M17 | Widen the prose exemption to the whole repository | the email exemption confined to `evidence/` + `handoffs/` | `detects an email address outside evidence prose` and `exempts email addresses inside evidence and handoff prose only`. Both directions pinned. |
| M18 | Thai ID checksum accepts everything | the mod-11 second stage | `the Thai national ID checksum accepts a valid ID and rejects a wrong check digit`, plus `does not fire on the false-positive table` (the wrong-check-digit row) and `exits clean on this repository as it stands`. |
| M19 | Drop the Luhn check from the card rule | the Luhn second stage | `does not report digit runs that only look like cards` — the dedicated negative test. |
| M20 | Drop the entropy floor on `openai-legacy-key` | the entropy second stage | `does not fire on the false-positive table` — specifically the low-entropy repetitive `sk-` row that exists for this. |
| M21 | `scanDirectory` returns `[]` unconditionally | the scan walking anything at all | 10 tests fail including every fail-closed test and §744. The *total* no-op is caught. (Partial no-ops are not — see §3.3.) |
| M22 | `isPlaceholderValue` returns `true` for everything | the placeholder filter not excusing real credentials | `the entropy and placeholder helpers behave as the rules assume` — the anchored assertion that a credential *containing* a placeholder word is not excused. |
| M29 | Drop the issuer-prefix stage of the card rule (keep Luhn) | the issuer-prefix second stage | `does not report digit runs that only look like cards` — the Luhn-valid-but-no-issuer-prefix rows exist precisely for this. |

### 3.2 Fired, but for an unrelated reason — 1

| # | Mutation | What fired | Why it does not count |
|---|---|---|---|
| M7 | Never recurse into any subdirectory | `fails closed on a directory that cannot be listed` | That test's nested `locked/` directory is never *visited*, so its expected `unreadable-directory` finding never appears. The test failed because its fixture became unreachable, not because it detects a non-recursing walk. M7 is still counted as **caught** — on the §744 outcome test, which fails for the right reason. Recorded here so the count is not inflated by it. |

### 3.3 MISSED — 7 of 28

These are the finding. **All seven leave the suite at 46/46 pass.**

| # | Mutation (one line each) | What it blinds the scanner to | Suite result |
|---|---|---|---|
| **M26** | Skip every file whose name ends `.md` or `.json` | **945 of 1001 files — 94.4% of the repository** | **46/46 pass** |
| **M28** | `text = text.slice(0, 512)` before matching | everything past byte 512 in **728 of 1001 files — 72.7%** | **46/46 pass** |
| M27 | `if (text.includes('scan-exempt')) return [];` | any file an author marks with a magic string | 46/46 pass |
| M23 | Add `architecture` to `IGNORED_DIRECTORIES` | the whole `architecture/` tree, incl. every RFC | 46/46 pass |
| M24 | Add `scripts`, `work-packages`, `runbooks`, `ownership` | four more whole trees, incl. `scripts/` itself | 46/46 pass |
| M25 | Skip any directory whose name starts `src` | any future source tree | 46/46 pass |
| **M15** | Delete the `unscannable-entry` finding | FIFOs, sockets, device nodes — **a declared `required_tests` entry** | 46/46 pass |
| M30 | `thai-phone-number` `accept` returns `true` always | the second stage of a rule with no exemption | 46/46 pass |

*(M30 listed as an eighth row; it is a weaker miss than the others because the first-stage pattern
still gates. Counted in the 7 as a half — I list it for completeness rather than to pad the total.
The seven that matter are M15 and M23–M28.)*

**Why M6 was caught and M23/M24/M25 were not.** The §744 outcome test hardcodes five path shapes:
`leak.txt`, `evidence/WP-0A-CON-008/leak.txt`, `handoffs/leak.txt`, `docs/nested/deeper/leak.txt`,
`contract-catalog/shared-kernel/ctr-sec-001/leak.txt`. Skipping `evidence` is caught because
`evidence` is one of the five. Skipping `architecture`, `scripts`, `work-packages`, `runbooks`,
`ownership`, or anything else is not. The test pins **five names**, not the property.

### 3.4 Proof that the survivors really blind the scanner

Run against the mutated copy with a synthetic AWS-key-shaped specimen (prefix + 16 uppercase
alphanumerics, built at run time) planted in a temporary tree. The unmutated scanner reports every
row; the control row is planted at `leak.txt` in every case.

```
### UNMUTATED baseline ###
REPORTED  credential in architecture/notes.txt          (M23)
REPORTED  credential in scripts/deploy.txt              (M24)
REPORTED  credential in src-internal/config.txt         (M25)
REPORTED  credential in notes.md                        (M26)
REPORTED  credential in config.json                     (M26)
REPORTED  credential in a file marked scan-exempt       (M27)
REPORTED  credential 4KB into a file                    (M28)
REPORTED  credential in leak.txt (control)

### M23 ###   MISSED  architecture/notes.txt      | REPORTED leak.txt (control)
### M24 ###   MISSED  scripts/deploy.txt          | REPORTED leak.txt (control)
### M25 ###   MISSED  src-internal/config.txt     | REPORTED leak.txt (control)
### M26 ###   MISSED  notes.md   MISSED config.json | REPORTED leak.txt (control)
### M27 ###   MISSED  a.txt (scan-exempt)         | REPORTED leak.txt (control)
### M28 ###   MISSED  deep.txt (4KB in)           | REPORTED leak.txt (control)
```

M15, against a real FIFO:

```
$ mkfifo fifotest/pipe
unmutated   -> ["pipe:unscannable-entry"]
M15 mutated -> []
$ grep -n "unscannable-entry\|not a regular\|mkfifo\|isFile" test-kits/secret-scan.test.mjs
NO OCCURRENCE IN SUITE
```

Blast radius, counted on this tree:

```
$ find . -path ./.git -prune -o -path ./node_modules -prune -o -type f -print | wc -l
    1001
$ find . ... \( -name '*.md' -o -name '*.json' \) -print | wc -l
     945          # M26 blinds 94.4%
$ find . ... -type f -size +512c -print | wc -l
     728          # M28 blinds the tail of 72.7%
```

### 3.5 The full 260-test suite is equally blind

The package suite missing a mutation would be forgivable if the wider ratchets caught it. They do
not. I took a complete copy of the repository, applied M26, regenerated the integrity manifest with
the repository's own documented one-liner, and ran the real `npm run check`.

First, the integrity tripwire does fire on an un-regenerated edit — worth recording, because it is
the only thing that fires at all:

```
$ npm run check
protected file(s) changed without updating test-kits/integrity-manifest.json:
  scripts/scan-repository-secrets.mjs — content does not match its recorded digest
This is a tripwire, not a security boundary: ... A commit that updates both still passes ...
```

Then, exactly as RFC-2026-003 already concedes ("a commit that edits a guarded file and its digest
together passes"):

```
$ npm run regenerate:manifest
rebuilt 74 digest(s)

$ npm run test:bootstrap        # with M26 applied
ℹ tests 260
ℹ pass 256
ℹ fail 4

$ npm run test:bootstrap        # UNMUTATED control, same copy
ℹ tests 260
ℹ pass 256
ℹ fail 4
```

**Identical.** The four failures are the same four in both runs
(`a handoff cites revisions that exist and a range that is real`, `the handoff for this branch
describes this branch`, `a range is never compared backwards`, `the handoff ratchet fails when an
author handoff claims another role approved something`) and are artifacts of my copy having no
`.git` directory — they fail on the unmutated control too, so they are **not** a catch of M26. I
checked this specifically rather than claiming the catch: an earlier reading of this run would have
let me record "the ratchets caught it", which would have been false. M28 produced the same
256/4 result.

**No test anywhere in this repository notices that the scanner stopped reading 94% of the tree.**

---

## 4. Trying to make the scanner miss a real credential

65 specimens, every one assembled from fragments at run time in the scratchpad, none written into
this tree. Scanned at a non-exempt path (`config/service.env`). **60 of 65 got through.**

I separate what is already disclosed from what is not, because the manifest's `open_blockers`
already concede a great deal and it would be dishonest to re-bill disclosed limitations as findings.

### 4.1 Already disclosed in `open_blockers` — not counted against the package

Splitting across lines, base64/percent/`\u` encoding, source-level string concatenation, gzip and
other opaque bytes, lowercase `api_key: "…"`, private hostnames, git history, `node_modules/`,
`.git/`. All of these got through, and all are named. The blocker text
*"A credential in an unenumerated format, split across lines, encoded, or embedded in opaque bytes
passes"* is accurate, and I confirm it rather than dispute it.

### 4.2 Not disclosed anywhere — these are findings

| Shape that got through | Why it is not covered by an existing disclosure |
|---|---|
| **UTF-16LE text.** A credential in a UTF-16 file is neither matched nor reported as `undecodable-file` — a **completely silent clean pass.** | The blocker names "opaque bytes". UTF-16 is not opaque bytes; it is ordinary text in an ordinary encoding, and it is what PowerShell's `>` redirect and many Windows editors produce by default. Mechanism confirmed: `Buffer.from(key,'utf16le')` is `41 00 4b 00 49 00 …`, NUL is a legal UTF-8 code point, so `TextDecoder('utf-8',{fatal:true})` **does not throw**, the file is never flagged, and every rule fails on the interleaved NULs. The scanner's own comment claims an undecodable file is "still pattern-scanned"; this file is neither flagged nor effectively scanned. |
| **An UPPERCASE secret name with a colon**: `API_KEY: value`, `"API_KEY": "value"` | The blocker discloses *"Lowercase and JSON-style secret assignments such as `api_key: "…"`"*, justified by this repository's prose containing that lowercase shape. **Uppercase-with-colon is a different shape** and the stated justification does not reach it — yet it is the single commonest way a secret appears in a YAML config or a JSON secrets file. Measured cost of adding it: **1 file, 1 match** (`SECRET:openai.default`, a handle reference in `evidence/WP-0A-CON-004/security-disposition-handle-ownership-a1.md`), trivially excluded by requiring a non-placeholder value. |
| **Secret-name vocabulary gaps**: `DB_PASS=`, `DB_PWD=`, `SERVICE_AUTH=`, `SESSION_SALT=`, `SIGNING_KEY=` | The word list is `PASSWORD\|PASSWD\|SECRET\|TOKEN\|APIKEY\|API_KEY\|ACCESSKEY\|ACCESS_KEY\|PRIVATEKEY\|PRIVATE_KEY\|CREDENTIALS?`. `PASS` and `PWD` are the two commonest abbreviations in real `.env` files and neither matches. Measured cost of adding `PASS\|PWD\|PASSPHRASE\|AUTH\|SALT\|SIGNING_KEY`: **0 false positives on this tree.** |
| **Thai-market provider families: LINE, Omise, 2C2P.** No rule for any of them. | The package added rules for Meta and Stripe on the stated grounds that they are *"this project's own G0 blockers … the two credentials most likely to reach this repository."* By that same reasoning LINE and the Thai payment gateways belong in the set: `docs/plans/technical-architecture-meta-content-os-th.md:896` names **LINE OA** as the pilot support channel and `:1113` names **PromptPay** in the payment-fee model. Not named in any blocker. |
| **Thai national ID written with SPACE separators.** The rule matches `\b[0-9](?:-?[0-9]){12}\b` — hyphens only. | This is the rule the package holds up as its strictest: *"NOT prose-exempt. CONTRIBUTING_AGENTS.md forbids customer PII repository-wide with no carve-out."* The tests cover plain and hyphenated only. Thai IDs are printed `1-1037-01503-45-0` and equally often written with spaces. Measured cost of allowing a space: **8 pattern hits, 0 of which survive the mod-11 `accept` stage — zero false positives.** |
| **Thai phone `+66 (0)81 234 5678`, `(081) 234-5678`, and bare `66812345678`.** | The separator class is `[-. ]?` and the anchor is `\+66` or `\b0`; parentheses, the `(0)` trunk-code convention, and a `66` prefix without a `+` all escape. `+66 (0)…` is the standard international rendering of a Thai mobile number. Measured cost of allowing them: **0 false positives on this tree.** |
| **A credential in the FILE NAME.** A file named for a key, with innocuous content, scans clean. | `scanOneFile` matches against content only; `relativePath` is used solely for the prose exemption. Cheap to close and named nowhere. |

### 4.3 One low-severity defect in the suite

`test-kits/secret-scan.test.mjs:365` calls `scanText(content, 'sample.txt')` — a **positional
string** where the signature is `scanText(text, { relativePath })`. Destructuring a string yields
`relativePath === ''`, so the path is silently discarded:

```
object form, evidence path   : []
STRING form (as line 365 uses): ["email-address"]
```

The effect at that call site is inert (none of its four specimens contains an email) and the
failure direction is fail-closed, so this is **not** part of the verdict. But the API accepts a
wrong-shaped argument silently, and the next caller may not be so lucky.

---

## 5. The walk itself

Beyond the five cases the suite covers. **Fails closed correctly** on:

```
FINDING exit=71  scan root does not exist                        -> unreadable-directory (ENOENT)
FINDING exit=71  scan root is a FILE containing a credential     -> unreadable-directory (ENOTDIR)
FINDING exit=70  a dotfile .env.production with a credential     -> (rule fired; dotfiles ARE walked)
FINDING exit=71  symlink to a DIRECTORY holding a credential     -> unscannable-symlink
FINDING exit=71  oversize file CONTAINING a credential           -> oversize-file
FINDING exit=70  a credential 8 directories deep                 -> (rule fired)
```

Good. A symlink to a directory, a nonexistent root, and a root that is a file are all handled
fail-closed and none of them is in the declared test list — the implementation is more careful than
its tests. (Cosmetic: a root that is a regular file is reported as `unreadable-directory`, which is
a confusing label for a file, but the *behaviour* is right.)

**Passes clean** on:

```
CLEAN   exit=0   a vendored node_modules holding a credential    (DISCLOSED in open_blockers)
CLEAN   exit=0   a .git directory holding a credential           (DISCLOSED in open_blockers)
CLEAN   exit=0   a gzip-compressed credential                    (DISCLOSED — "opaque bytes")
CLEAN   exit=0   a credential in the FILE NAME, not its content  (NOT DISCLOSED — §4.2)
CLEAN   exit=0   a UTF-16LE encoded credential                   (NOT DISCLOSED — §4.2)
CLEAN   exit=0   an empty directory                              (see §6)
```

---

## 6. Can the suite pass vacuously?

**Partly, and the structural reason matters more than the answer.**

The direct total no-op *is* covered: M21 (`scanDirectory` returns `[]` unconditionally) failed 10
tests, because several tests plant a file and require a finding. The test
`exits clean on this repository as it stands` would by itself pass over an empty set —
`assert.deepEqual(findings, [])` is satisfied by scanning nothing — but it is not the only guard.

The structural gap: **`scanDirectory` returns findings and nothing else.** It reports no count of
files read, bytes read, or directories entered. There is no value in the API that a test could
assert against to establish that the scan covered the tree. Every anti-vacuity guard in the suite is
therefore *indirect* — it plants a credential at a hardcoded path and checks it comes back. That
technique closes exactly the paths it enumerates, which is precisely why M23–M28 survive: the suite
can prove the scanner found what was planted where it was planted, and cannot prove anything about
everywhere else.

That is not a test-writing oversight so much as a missing affordance. It is why condition **L2**
below asks for a returned scan volume rather than more planted paths — adding a sixth hardcoded path
would fix M23 and leave M24 through M28 alive.

---

## 7. What would lift this verdict

Five conditions. None is speculative and none is expensive; the four rule changes were measured
against this tree and **all four cost zero false positives**.

- **L1 — Add the missing declared test.** A test that a non-regular entry (a FIFO via `mkfifo`)
  produces `unscannable-entry`. `required_tests` already claims this exists. Kills M15.

- **L2 — Assert scan volume, not path shapes.** Have `scanDirectory` return the number of files it
  actually read and decoded (alongside `findings`), and assert on it: build a synthetic tree of N
  files spanning several extensions (`.md`, `.json`, `.txt`, `.yml`), several depths, and several
  directory names *not* drawn from a fixed list, plant a credential in **every** file — with at
  least one placed **beyond byte 512** and one **beyond 8 KB** — and require N findings and N files
  read. This kills M23–M28 as a class. Adding a sixth hardcoded path to the §744 test does not; it
  kills M23 alone. While there, correct the comment at `test-kits/secret-scan.test.mjs:744` — as it
  stands, "A carve-out cannot satisfy this; only scanning can" is not true of the test beneath it.

- **L3 — Take the four free widenings, or record each as a priced refusal in RFC-2026-005.** All
  four measured on this tree at revision `1478f34`:
  - uppercase secret name with `:` as well as `=` → **1 excludable hit** (`SECRET:openai.default`)
  - `PASS`, `PWD`, `PASSPHRASE`, `AUTH`, `SALT`, `SIGNING_KEY` in the word list → **0**
  - Thai national ID with a space separator → **8 pattern hits, 0 survive the checksum**
  - Thai phone with parentheses / `(0)` trunk prefix / bare `66` → **0**

  The refusal path is equally acceptable — this package's culture of pricing a refusal is genuinely
  good — but silence is not, because these are not covered by any current blocker.

- **L4 — Handle or disclose UTF-16.** Either detect a UTF-16 BOM / NUL-interleaving and decode
  accordingly, or add an `open_blockers` entry saying plainly that UTF-16 text passes silently.
  Today it is neither detected nor disclosed, and the existing "opaque bytes" wording implies a
  coverage this case does not have.

- **L5 — Name the Thai-market provider gap.** Rules for LINE channel access tokens / channel
  secrets, Omise (`skey_`/`pkey_`) and 2C2P, **or** an `open_blockers` entry that names them. The
  package's own stated rationale for adding Meta and Stripe applies to these directly, and the
  repository's architecture document names LINE OA and PromptPay.

**Not blocking, worth doing:** fix the positional `scanText(content, 'sample.txt')` at
`test-kits/secret-scan.test.mjs:365`, and consider matching rules against `relativePath` so a
credential in a file *name* is seen.

**Out of my scope, named rather than made.** My writable path is `evidence/WP-0A-A0-003/**`. Every
change above lands in `scripts/scan-repository-secrets.mjs`,
`test-kits/secret-scan.test.mjs`, or `architecture/decisions/RFC-2026-005-…md`, which this package
owns and I do not. **I made no fix.**

---

## 8. What I threw at it that did not break it

Stated deliberately, because a verdict that only lists failures is not a measurement.

- The **fail-closed dimension is real and properly pinned.** I attacked all six fail-closed paths
  independently — unreadable file, unlistable directory, oversize file, symlink, undecodable file,
  and the still-scan-it-anyway property — and five of the six killed a test *named for that exact
  property*. Restoring the superseded `catch(() => null)` fails immediately. This is the core of
  RFC-2026-005 and it holds.
- **Every rule deletion and every pattern-loosening I tried was caught**, and caught by a test that
  named the specific rule — not by an unrelated widening. The per-rule decoy assertion and the
  `CREDENTIAL_DECOYS.length >= CREDENTIAL_RULES.length` ratchet do the job they were added for; I
  could not delete a rule silently.
- **Every second-stage filter is pinned.** Removing the Thai mod-11 checksum, the Luhn check, the
  issuer-prefix check, the entropy floor, or the placeholder anchor each killed a test written for
  that filter. The negative tables are doing real work, not decorating the file.
- **The "reports what it did not find" direction is covered**, which is the direction most suites
  forget.
- **The card rule is the best-tested thing here.** I did not find a false negative in it that its
  own tests had not already anticipated, and the refusals (the `|` separator, the four dotted/comma/
  slash/underscore separators, the one-group-per-line list) are each pinned by a test so that
  re-adding them is deliberate.
- **The prose exemption is tight in both directions** — widening it to the whole repository is
  caught, and a credential inside evidence prose is still reported.
- **No literal credential exists anywhere in the tree.** I checked this rather than assuming it: the
  suite builds every specimen at run time, and `node scripts/scan-repository-secrets.mjs .` exits 0
  on the repository including its own test kit.

The package's problem is not carelessness. It is that its coverage is pinned **by enumeration** —
of rules, of paths, of separators — and enumeration is exactly what a mutation that changes *how
much gets read* walks straight past.

---

## 9. Attestation

I am `/claude/q0_sentinel`, the Independent Tester named in
`work-packages/WP-0A-A0-003.json` → `role_assignments.tester_agent_run_id`. I am not the Author
(`/claude/a0_atlas`), the Reviewer (`/claude/c0_contract_reviewer`), the Security reviewer
(`/claude/a1_bastion`), or the Integration Owner (`/claude/r0_steward`). I did not author, review,
or integrate any file under test, and I coordinated with no other run on this package.

Every result above came from a command I ran at revision `1478f34` on Node 24.20.0 / npm 11.19.0,
and every claim about a result quotes that command's output. Where I could not run a command as
briefed (`zsh -lc`) I said so and named the substitution. Where a mutation fired for a reason other
than the one it targeted, I said so and did not count it. Where the repository already discloses a
gap I found, I credited the disclosure instead of re-billing it.

This verdict is **test_failed**, and §7 lists exactly what would lift it. I did not fail it to look
independent: twenty-one of twenty-eight mutations died on target and I have said so at length. I
failed it because a declared required test does not exist, because a test in the suite claims a
property it does not have, and because two one-line edits can blind this scanner to 94% of the
repository with all 260 tests green.

**This verdict does not approve Gate G0, authorize a merge, or change the package status.**
