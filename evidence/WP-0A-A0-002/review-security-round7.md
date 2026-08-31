# WP-0A-A0-002 — Independent Security/Privacy Review, Round 7

**This document is Security/Privacy evidence only.** It is not a contract review, a test
verdict, or an integration verdict, and it does not speak to functional acceptance.

- **Role:** Independent Security/Privacy Reviewer (A1 Bastion)
- **agent_run_id:** `/claude/a1_bastion`
- **Branch:** `agent/claude/WP-0A-A0-002-contract-test-coverage`
- **Head reviewed:** `c631c0756be674866f4528faa185238f2ef2e2cc`
- **Toolchain:** Node v24.20.0 / npm 11.19.0 (verified via login shell)
- **Prior verdict:** `security_changes_requested` against `f55b8ff`

## Method and containment

All destructive probing was done in a sandbox copy outside the repository at
`/private/tmp/.../scratchpad/sec7/` (created with `rsync -a --exclude '.git'`). No tracked
file in `/Users/bank/ThinkBizThai` was modified at any point. Verified at start and end:

```
git status --short      -> (empty at start; at end shows only my own deliverable
                            plus evidence/WP-0A-A0-002/test-verdict-round7.md,
                            which was created by another agent and which I did not touch)
git diff --stat         -> (empty)
git rev-parse HEAD      -> c631c0756be674866f4528faa185238f2ef2e2cc
```

Baseline at head, real repository, read-only:

```
zsh -lc 'cd /Users/bank/ThinkBizThai && npm run check'
  EXIT=0    tests 56  pass 56  fail 0  skipped 0  todo 0
```

Credential-shaped scratch fixtures used for the C1 re-probe were deleted after use and
were never written inside the repository.

---

## Item 1 — Retest of my own two prior defeats

### Defeat A — whole-suite `{ skip: true }` placeholders: **CLOSED**

I regenerated the original attack rather than trusting the fix: every discovered test file
was overwritten with `{ skip: true }` placeholders whose bodies throw, with each file's
declared-test count preserved so that every static floor still clears.

| Probe | Command | Exit |
| --- | --- | --- |
| A1 — suite gutted with skips, manifest untouched | `npm run check` | **86** (digest drift on 9 files) |
| A2 — same, with all digests re-computed (the acknowledged "edit file + digest" class) | `npm run check` | **80** |

A2 output: `tests 56 / pass 0 / skipped 56`, then
`test runner reported 56 skipped and 0 todo tests… Skips must be removed, not tolerated.`

The defeat is closed at two independent layers. The load-bearing one is `assertExecuted`
being asserted on `pass` rather than `tests`, plus `assertNothingSkipped`. Even with the
digest tripwire fully satisfied, a skipped suite cannot report success. **Confirmed closed.**

### Defeat B — UTF-8 chunk-boundary inversion: **CLOSED**

I built a deterministic reproduction rather than relying on timing luck. A child emits a
forged `pass 9999` summary line first, then the real `pass 3` line with the three bytes of
the `U+2139` information-source character split across two separate writes.

```
node ../tools/utf8split.mjs                      EXIT=0
  OLD (per-chunk decode, the round-6 code path)  parsed pass = 9999
  NEW (setEncoding('utf8'), current code path)   parsed pass = 3
  OLD tail bytes: "99\n��� pass 3\n"
  NEW tail bytes: "9999\nℹ pass 3\n"
```

`child.stdout.setEncoding('utf8')` installs a `StringDecoder` that holds an incomplete
multi-byte sequence across chunk boundaries, so the real summary line can no longer be
corrupted into a non-match, and `lastCount` taking the final match means an earlier forged
line cannot win. **Confirmed closed.**

**Both of my prior defeats are closed.**

---

## Item 2 — `assertDeclarationsMatchExecution`: the post-run re-walk

This is the round-7 change I was asked to review as new code, and it is where my findings are.

### What the post-run walk actually verifies

`scripts/run-test-suite.mjs:60-70` re-walks the filesystem after the child exits, calling
only `discoverTestFiles('test-kits')` and `countDeclaredTests`. It does **not** re-run
`assertIntegrityManifest`, `assertEveryTestFileProtected`, or `assertNoEscapingPath`. The
number it reconciles against is therefore derived from files it has not verified, at a
moment after every verification has already happened.

Control probe — a non-executing declaration is caught as designed:

```
6 real assertions gated behind an env var that is never set
npm run check   EXIT=88
  "the suite declares 66 tests but the runner executed 60."
```

### S1 (NEW, Medium-High) — exit 88 is defeatable by TOCTOU. **Reproduced 4/4.**

A test file's module body has already been read by `node --test` by the time it runs.
Rewriting that file on disk during the run therefore changes nothing about what executed —
it changes only what the post-run walk will count.

The naive version (rewrite at module load) fails, because `test-coverage-floor.test.mjs`
itself calls `verifyTestCoverageFloor()` against the live tree during the run and trips the
digest check (observed: exit 1). That defence is real but **incidental**, not designed, and
it only narrows the window to "after that in-suite test completes, before the post-run walk".

Tuning a detached writer into that window succeeds:

```
payload: 4 real passing tests + 6 real assertions gated off (never executed),
         plus a detached child that guts the file at T+150ms and restores the
         digested bytes at T+3150ms

GUT_MS=150   npm run check  EXIT=0    tests 60  pass 60  skipped 0
GUT_MS=250   npm run check  EXIT=88
GUT_MS=350   npm run check  EXIT=88

repeatability at GUT_MS=150:  run1 EXIT=0  run2 EXIT=0  run3 EXIT=0  run4 EXIT=0
post-run state:  digest match: true     phantom block still on disk: true
```

The result is a fully green `npm run check` in which six declared assertions never ran,
`assertDeclarationsMatchExecution` reported agreement, the integrity manifest was satisfied,
and the working tree was left byte-identical to its recorded digests — so `git status` is
clean and the next run is green too.

Crucially, **this does not require the acknowledged unclosable class.** It does not edit any
guard script or any guard digest. It requires only adding a new test file together with its
digest, which is the routine, expected shape of an ordinary commit.

The fixed sleep is the weak part of my proof-of-concept, not of the attack: the window is
attacker-tunable and an attacker polling for a marker rather than sleeping a fixed interval
would not need to guess. I reproduced it 4/4; I am reporting it as a demonstrated defeat of
the control, with the caveat that it is timing-dependent.

**Assessment.** This does not make the repository less safe than before round 7 — there was
no reconciliation at all previously. What it means is that exit 88 is weaker than it reads,
and it must not be documented or relied upon as a guarantee that declarations equal
executions. The payload is glaring in a diff (a detached `spawn` that rewrites a test file),
which is consistent with the project's stated position that the anchor is human review.

### S1b — a test can write into `test-kits/` during execution. **Confirmed.**

```
a test drops an undigested, never-executed .test.mjs into test-kits/ at T+150ms
npm run check   EXIT=88   "declares 57 tests but the runner executed 56"
post-run check: injected file present on disk, in manifest: false
```

Fail-closed in this direction, but it confirms the shape of the problem: the post-run count
can be steered **upward** by creating a file and **downward** by rewriting one, and neither
path is subject to any manifest, digest, or path re-verification. A symlink created during
the run is caught by `discoverTestFiles` (code 85), which is the one post-run check that
does still apply.

### S5 (NEW, Low, correctness not security) — reconciliation rejects standard test idioms

`countDeclaredTests` counts textual occurrences of `test(` at line start. Any construct
where one textual declaration produces several executions breaks the equality:

```
for (const name of ['alpha','beta','gamma']) { test(`… ${name}`, …); }
npm run check   EXIT=88   "declares 57 tests but the runner executed 59"
```

Table-driven/parameterised tests and nested subtests (`t.test(...)`, which `pass` counts but
the regex does not match) are now unusable repository-wide. This fails closed, so it is not a
security hole, but it creates standing pressure on future authors to either avoid a normal
testing idiom or weaken the control — and weakening it under deadline is the realistic risk.

---

## Item 3 — `assertNoEscapingPath`: prefix logic and `process.cwd()`

**Ruling: the prefix logic is SOUND. No sibling-directory admission. No finding.**

The check is `actual.startsWith(`${realRoot}/`)`. The appended separator is what matters and
it is present, so an equal-prefix sibling is not admitted. Probed directly rather than
reasoned about, using real sibling directories `…/prefix/repo` and `…/prefix/repoX`:

| Probe | Result |
| --- | --- |
| 3a — file whose realpath is in sibling `…/repoX`, root `…/repo` | rejected, code **85** |
| 3b — file genuinely inside root | admitted (correct, no false positive) |
| 3c — the root itself passed as a file | rejected, code **85** |
| 3d — symlink inside the test root | rejected at discovery, code **85** |

`cwd` is not the repository root — verified rather than assumed:

```
cd <repo>/test-kits/contracts && npm run --silent cwdprobe
  -> /private/tmp/.../sec7          (the package root)
```

npm sets the working directory to the package root regardless of where `npm run` is invoked,
so the default `root = process.cwd()` is correct under every supported invocation. Running
the guard by hand from another directory makes `discoverTestFiles('test-kits')` fail with
ENOENT, which is converted to code 79 — fail-closed.

**Symlinked checkouts:** both sides are passed through `realpath`, so a checkout reached via
a symlinked path resolves consistently and a legitimate setup does **not** fail. A symlinked
checkout does not place a symlink inside `test-kits/`, so code 85 is not triggered spuriously.

Two non-blocking observations, both hardening rather than defects:

- Deriving the root from `import.meta.url` instead of `process.cwd()` would remove the
  residual case where a caller with a cwd *above* the repository would widen the accepted
  region. That case is not reachable under `npm run`.
- The `/` separator is hardcoded, so on Windows the check would reject everything. Fail-closed
  and irrelevant to the pinned Linux/macOS toolchain, but worth a comment.

---

## Item 4 — `test-kits/integrity-manifest.json` assessed as untrusted data

**Parsing is fail-closed in every malformed case I could construct.** All of the following
returned code **86**:

| Probe | Result |
| --- | --- |
| malformed JSON (`{ "files": { `) | 86 — "cannot read the integrity manifest" |
| truncated mid-digest | 86 |
| `files` key absent | 86 — "protects no file" |
| `files: null` | 86 — "protects no file" |
| `files` is an array | 86 |
| key names a directory (EISDIR) | 86 |
| digest value is a number, not a string | 86 |
| protected file missing on disk | 86 — reported as MISSING |

`JSON.parse` is used on trusted-position data with a `try`/`catch` that converts every parse
failure into a numbered guard error, and the second parse in
`assertEveryTestFileProtected` is unreachable while malformed because `assertIntegrityManifest`
runs first. Prototype-shaped keys are harmless: they become ordinary read attempts that fail
and surface as drift.

### S2 (NEW, Medium) — manifest keys are unconstrained filesystem paths

A key is passed straight to `readFile`. Nothing requires it to be repository-relative or
non-traversing. Confirmed:

```
{"files": {"../../../../../../etc/hosts": "<its real sha256>"}}
  -> ACCEPTED (1 entries)

{"files": {"../../../../../../etc/hosts": "deadbeef"}}
  -> rejected 86, and the error message prints:
       expected sha256 deadbeef
       actual   sha256 <the real sha256 of /etc/hosts>
```

Two consequences:

1. **Arbitrary file read by the guard.** Any file readable by the CI or developer user can be
   named in the manifest and will be opened on every `npm run check`.
2. **A content-fingerprint oracle that writes to build logs.** Because the failure message
   prints the *computed* digest, a manifest entry naming a private key, an npm config, or a
   CI environment file emits that file's sha256 into CI output. That is not plaintext
   disclosure, but against a guessable candidate set it confirms file contents, and it
   crosses a trust boundary the rest of this design is careful about.

Neither is reachable without committing a visibly odd manifest line, which is consistent with
the tripwire model — but the fix is cheap and I am making it a condition. Manifest keys
should be required to be repository-relative with no `..` segment and no absolute prefix, and
a key failing that constraint should be rejected *before* any digest is computed or printed.

### On self-coverage of the manifest

`assertEveryTestFileProtected` forces every discovered test file to be a key (code 87). The
guard scripts themselves are not forced by that function, but the in-suite test *the manifest
protects the guards, the contract, and the suites they defend* asserts that
`run-test-suite.mjs`, `verify-test-coverage-floor.mjs`, `test-suite-contract.mjs`, and the
contract suite are all present as keys. That is adequate.

I checked what is **not** digested:

```
UNPROTECTED  scripts/scan-repository-secrets.mjs
UNPROTECTED  scripts/toolchain-contract.mjs
UNPROTECTED  scripts/validate-capability-profiles.mjs
UNPROTECTED  scripts/validate-work-package-ownership.mjs
UNPROTECTED  scripts/validate-work-package-role-separation.mjs
UNPROTECTED  scripts/validate-work-packages.mjs
UNPROTECTED  scripts/verify-toolchain.mjs
```

I tested whether the undigested secret scanner can be silently neutered — replaced
`scanDirectory` with a function returning `[]` and planted a matching credential pattern:

```
npm run check   EXIT=1   (test "rejects a synthetic private-key pattern" failed)
```

**Not a finding.** The scanner is behaviourally pinned by `test-kits/secret-scan.test.mjs`,
which *is* digested and which exercises the scanner against a synthetic planted pattern. That
is a better anchor than a digest. I record the gap only so it is a deliberate decision rather
than an accident: the other validators rely on the same behavioural coverage.

---

## Item 5 — Digest algorithm and comparison

### Timing-safe comparison: **NOT REQUIRED. Ruling: `!==` is correct here.**

`timingSafeEqual` protects a secret compared against attacker-supplied input over a channel
where timing is observable. Here both operands are sha256 hex digests of files the attacker
already possesses in full — the manifest is in the repository and so is the file. There is no
secret, no remote attacker, and no measurable channel; a local attacker who could time this
loop can simply read both files. Adding `timingSafeEqual` would be cargo-cult and would add a
length-mismatch throw path. **No change recommended.**

### S3 (NEW, Low, latent) — reading protected files as `'utf8'` destroys digest fidelity

`createHash('sha256').update(await readFile(file, 'utf8'))` decodes before hashing. Invalid
UTF-8 bytes become the replacement character, so distinct files hash identically. Demonstrated:

```
file A = bytes FF 41 ; file B = bytes FE 41
sha256 over readFile(f,'utf8')   -> collide: true
sha256 over readFile(f)          -> collide: false
```

Every currently protected file is text, so this is latent, not live. But the manifest is
explicitly the artifact that makes tampering visible, and a hash that cannot distinguish two
different files is the wrong primitive for that job. The fix is to drop the encoding argument
and hash the `Buffer` — one character per call site, no behaviour change for text files.

### Missing file: **fails closed.** Confirmed above (code 86, reported as MISSING).

---

## Item 6 — Supply-chain re-assessment at this head

**My prior finding stands and is re-verified.** What protects secrets in CI is that the
workflow references no secrets at all:

```
grep -rn "secrets\." .github/    -> NO secrets.* reference in any workflow
permissions: contents: read
actions/checkout   pinned to 11d5960a326750d5838078e36cf38b85af677262, persist-credentials: false
actions/setup-node pinned to 49933ea5288caeca8642d1e84afbd3f7d6820020
npm ci --ignore-scripts
```

Dependency posture at head:

```
dependencies: none    devDependencies: none    optionalDependencies: none
package-lock.json     lock entries: 1  ([""] — root only)
last commit touching package-lock.json: 3c8e025 (bootstrap)  — untouched by this package
last commit touching .github/workflows/ci.yml: 3c8e025 (bootstrap) — untouched by this package
```

**Does `assertDeclarationsMatchExecution` re-reading every test file after the run change the
CI RCE posture? No.** The post-run walk performs `readdir` and `readFile` plus a regex count.
It does not import, evaluate, or execute anything it reads, and it introduces no new
attacker-controlled path into an execution sink. The RCE posture is unchanged and is what it
always was: `npm run check` runs repository-authored test code, so any contributor who can
land a test file already has arbitrary code execution in CI. That is inherent to running
tests, and it is contained by the fact that the job holds no credentials worth stealing.

One posture note rather than a finding: S1 demonstrates that repository test code writes to
the working tree during CI. That was always possible and does not expand the blast radius,
but it does mean the post-run walk reads state that the tests themselves can author — a trust
inversion inside the guard, which is the substance of S1.

---

## Item 7 — Secret scan, and standing finding C1

```
zsh -lc 'cd /Users/bank/ThinkBizThai && node scripts/scan-repository-secrets.mjs'
  EXIT=0   (no findings)
```

No new file at this head carries secret material. `integrity-manifest.json` contains only
sha256 digests of repository files; the new code in `run-test-suite.mjs` and
`verify-test-coverage-floor.mjs` contains no credential-shaped literal.

### C1 (standing, High) — the scanner is materially weak. **Status: OPEN, unchanged at head.**

Re-probed at this head rather than carried forward on trust. I assembled eight realistic live
credential formats from split fragments (so no matching literal is written anywhere in the
repository or in this file) into a scratch `.env.production` outside the repository and
scanned it. The formats covered a Google API key, a Slack bot token, an OpenAI project key,
an Anthropic API key, a signed JWT, a PostgreSQL connection URI with an inline password, an
Azure shared-access signature, and a GCP service-account JSON blob.

```
node scripts/scan-repository-secrets.mjs <scratch dir>
  EXIT=0    (0 = the scanner saw nothing)
```

**8 of 8 missed.** The scanner's five patterns cover PEM private-key headers, two Stripe-style
prefixes, an AWS access-key-id prefix, and GitHub token prefixes — and nothing else. A green
`scan:secrets` is therefore weak evidence of absence, not evidence of absence.

This is repository-level and out of scope for WP-0A-A0-002. **I am not blocking this package
on it**, but it must be carried as a tracked finding and must not be cited as assurance.

---

## Item 8 — Scope confirmation

**Confirmed: no credential, network call, migration, RLS, tenant-isolation, or
production-config change.**

- **Credentials:** none introduced. Every match for password/token/api-key/secret/credential/
  bearer across the changed scripts and test kits is either the `scan:secrets` wiring, the
  `can_access_external_secrets: false` capability denial and its test, the manifest's digest
  entry for `secret-scan.test.mjs`, or the assertion that CI sets `persist-credentials: false`.
- **Network:** no `fetch`, no URL literal, no `node:net`/`node:dns`/`node:tls` anywhere in
  `scripts/` or `test-kits/`. The only `child_process` uses are local Node spawns:
  `verify-toolchain.mjs` (`execFileSync`), `run-test-suite.mjs` (`spawn`, `process.execPath`,
  argv array, no shell), and two test kits invoking validators via `spawnSync`. No shell
  interpolation, no argument injection.
- **Migrations / SQL / RLS / tenant isolation:** no `.sql` file, no migration directory, no
  Supabase or Terraform config tracked anywhere in the repository. The only RLS matches are
  Thai-language planning documents under `docs/`.
- **Production config:** no `.env`, no IaC, no deployment configuration.
- **`package-lock.json`:** untouched by this package (last modified in the bootstrap commit
  `3c8e025`); one entry, root only. **Zero dependencies still declared.**

---

## Findings summary

| ID | Severity | Finding | Status |
| --- | --- | --- | --- |
| **S1** | Medium-High | **NEW.** TOCTOU between the guard's pre-run walk and the runner's post-run walk. A test that rewrites its own file mid-run defeats exit 88 and leaves the tree byte-identical to its digests. Reproduced 4/4, exit 0, with six declared assertions never executed. Does not require editing any guard or guard digest. | **Open — condition** |
| **S1b** | Medium | **NEW.** The post-run walk re-runs no digest, manifest-coverage, or escaping-path check, so its count is derived from unverified files; a test can create files in `test-kits/` during the run. Fails closed in the additive direction. | **Open — condition** |
| **S2** | Medium | **NEW.** Manifest keys are unconstrained paths: traversal outside the repository is accepted, and a wrong digest prints the real sha256 of any readable file into build logs (fingerprint oracle). | **Open — condition** |
| **S3** | Low (latent) | **NEW.** Protected files are hashed after `'utf8'` decoding; distinct binaries collide via replacement characters. Demonstrated. All protected files are currently text. | **Open — condition** |
| **S4** | Low | **NEW.** `run-test-suite.mjs` uses `process.exit(error.code ?? 80)`; a non-numeric code (e.g. `ENOENT` from the post-run walk) makes `process.exit` throw `ERR_INVALID_ARG_TYPE`. Still fails closed via unhandled rejection, but the guard's own `Number.isInteger(error.code) ? … : 65` pattern should be mirrored. | **Open — condition** |
| **S5** | Low (correctness) | **NEW.** Exit 88 rejects table-driven tests and nested subtests (demonstrated: 1 declaration / 3 executions → 88). Fails closed, but creates standing pressure to weaken the control. | **Open — condition** |
| **C1** | High | Standing. `scan:secrets` misses 8 of 8 realistic live-credential formats; re-probed and re-confirmed at this head. Repository-level, out of scope for this package. | **Open — tracked, not blocking** |

### Cleared at this head

- **My round-6 defeat A (`{ skip: true }` across the suite): CLOSED**, verified at two layers (86 and 80).
- **My round-6 defeat B (UTF-8 chunk-boundary inversion): CLOSED**, verified by deterministic reproduction (old path 9999, new path 3).
- **My round-6 symlink blind spot: CLOSED** — code 85 at discovery, confirmed.
- `assertNoEscapingPath` prefix logic: **sound**; no sibling-directory admission, no false positive on a legitimate or symlinked checkout.
- `process.cwd()` as root: **sound** under npm, verified empirically.
- Integrity-manifest parsing: **fail-closed in all eight malformed/type-confused cases probed**.
- Missing protected file: **fails closed**.
- Non-timing-safe digest comparison: **correct as written; no change recommended.**
- The undigested secret scanner is **behaviourally pinned** by a digested test — verified by neutering it (exit 1).
- Supply chain: no `secrets.*`, `contents: read`, `persist-credentials: false`, SHA-pinned actions, `--ignore-scripts`, zero dependencies, lock untouched.
- No credential, network, migration, RLS, tenant-isolation, or production-config change.

## Conditions

1. **Record S1 and S1b as a documented limitation of exit 88**, alongside the existing tripwire
   disclosure in `test-suite-contract.mjs`. `declared === executed` must not be described
   anywhere as a guarantee; it is defeatable by a test that mutates the tree while running.
2. **Constrain manifest keys** to repository-relative paths with no `..` segment and no
   absolute prefix, rejected *before* any digest is computed or printed (S2).
3. **Hash protected files as `Buffer`**, not `'utf8'` (S3) — remove the encoding argument.
4. **Mirror the guard's numeric-exit-code handling** in `run-test-suite.mjs` (S4).
5. **Carry C1** as a tracked repository-level finding; do not cite a green `scan:secrets` as
   assurance.

None of these conditions concerns runtime, credential, tenant, or data-handling risk — this
package ships no runtime code, no dependencies, no network calls, and no production
configuration. They concern the accuracy with which a self-declared tripwire describes its own
strength, plus three cheap correctness fixes.

VERDICT: security_approved_with_conditions
