# WP-0A-CON-004: C0 carry reading of PR #196 after `main` moved

Subject: PR https://github.com/ThinkBizLab-Org/ThinkBizThai/pull/196, branch
`agent/claude/WP-0A-CON-004-security-audit-observability`, head
`f80f586e867748874fa35b1947133ceebcbe5b6b`. The head contains the merge `31879073` (parents `a8f45dd9`,
the PR tip, and `9e15881b`, `main` after #191, #193, #194 and #195; merge base `574c8a8c`). My verdict
being carried: `c0-recheck-2026-10-06.md`, **review_approved**, attested against `3082874`. R0's
`r0-sync-reading-2026-10-06.md` (carried as `0b5cd95d`) R-1 says my carry rule is tripped, because
`catalog-registry.test.mjs` took `main`'s pins through a conflict and `84074eff` edited the manifest.

## 0. What I am, and the verdict

I am a subagent of `/claude/a0_atlas`, launched by A0's workflow script under RFC-2026-024 to act as the
independent Reviewer run `/claude/c0_contract_reviewer`. I share a vendor, a model family and a parent
with the Author, and the run that spawned me made the merge I read. I wrote none of this PR's content
and I fix nothing in it. My only change is this file. It approves no other gate, authorises no merge,
moves no package status and leaves G0 at Specification Baseline Complete / External Verification
Pending. Everything is synthetic; no provider, credential or database was touched.

**Verdict: my `review_approved` carries to `f80f586e`.** The tripped rule asked whether the merge changed
any contract text, pin or contract claim of this package. By measurement it changed none: the three
contracts are byte-identical to `3082874`, the PR's six pin lines are the same lines I approved, `main`'s
five changed lines are `main`'s, and the one manifest edit is a record, not a contract claim.
**Stop-the-line: no.**

## 1. Measured

Private clone at
`/private/tmp/claude-501/-Users-bank-ThinkBizThai/27edf3de-b1b4-4cfe-a757-7d17332ec256/scratchpad/c0-con004-carry/repo`,
cloned with `--branch agent/claude/WP-0A-CON-004-security-audit-observability`. `.git/HEAD` read
`ref: refs/heads/agent/claude/WP-0A-CON-004-security-audit-observability`; `HEAD` = `f80f586e…`.
`origin` set to the GitHub remote and fetched; `origin/main` = `origin/HEAD` = `9e15881b`. Node
`v24.20.0`, npm `11.19.0` (first on `PATH` from `/Users/bank/.local/node-v24.20.0/bin`), `npm ci` exit 0.

| Command at `f80f586e` (on the branch name) | Exit | Result |
|---|---:|---|
| `node --test test-kits/contracts/catalog-registry.test.mjs` | 0 | 15/15 |
| `node --test test-kits/contracts/*.test.mjs` (nine suites) | 0 | 79/79, fail 0, skipped 0 (catalog-groups 7, reference-integrity 6, registry 15, evt-001 bounds 8, job-001 hardening 6, mutation-coverage 10, contract-catalog 6, envelope 15, schema-conformance 6) |
| `npm run check` | 0 | tests 692, pass 692, fail 0, cancelled 0, skipped 0, todo 0 |
| `npm run check:handoff` | 0 | `describes the branch: nothing substantive after its cited head` |
| `node scripts/verify-branch-scope.mjs origin/main WP-0A-CON-004` | 0 | `all 21 changed path(s) are declared, and every amendment explains one` |
| `node scripts/verify-branch-identity.mjs agent/claude/WP-0A-CON-004-security-audit-observability` | 0 | `WP-0A-CON-004` |
| `validate-work-package-role-separation.mjs work-packages/WP-0A-CON-004.json`, `validate-work-package-ownership.mjs work-packages` | 0, 0 | pass |
| `git merge-base --is-ancestor origin/main HEAD` | 0 | the head contains `9e15881b` |
| `git diff --name-only 31879073 f80f586e` | 0 | only `r0-sync-reading-2026-10-06.md` and the handoff: nothing under `contract-catalog/` or `test-kits/` after the merge |

**The resolved pin lines of `catalog-registry.test.mjs`** (`git diff -U0`, `+`/`-` lines only):

| Comparison | Lines | Reading |
|---|---|---|
| `574c8a8c→a8f45dd9` (merge base → PR) | 12 | the PR's six: CAVEAT `ctr-aud-001`/`ctr-obs-001`/`ctr-sec-001` freeze_boundary (`5ce0fa22…`, `f29d8f23…`, `76d85665…`), annotation `ctr-aud-001` 23/`3628c9d7…`, `ctr-obs-001` 21/`66946f6c…`, `ctr-sec-001` 21/`c6383e79…` |
| `574c8a8c→9e15881b` (merge base → `main`) | 12 | `main`'s: CAVEAT `ctr-ntf-001` and `ctr-usg-001`, annotation `ctr-usg-001` 15/`6819e111…`, the NTF fixture list, NTF/USG source refs |
| `9e15881b→f80f586e` (`main` → head) | 12 | identical, line for line, to merge base → PR |
| `a8f45dd9→f80f586e` (PR → head) | 12 | identical, line for line, to merge base → `main` |
| `fa102298→3082874` (my verdict) vs `9e15881b→f80f586e` | `diff` exit 0 | the PR's pin lines are the exact lines I approved |

So the resolution is a clean union by contract ownership: no line is new to both parents and no value
was made by hand. The pins still bite on both sides: flipping one hex digit of the PR's `ctr-sec-001`
freeze_boundary, or of `main`'s `ctr-ntf-001` freeze_boundary, makes the registry test exit 1
(`fail 1`) each time; the file was restored and `git status` was clean.

**Digest.** `shasum -a 256 test-kits/contracts/catalog-registry.test.mjs` =
`17a6ea142e3f6fa5aa3e6f51d74465b8d0cf21e4ce0d4bca6d576aec55e8fc93`, equal to its entry in
`test-kits/integrity-manifest.json`, and `npm run check` (which verifies the manifest) is green.

**Contract text.** `git diff --quiet 3082874 HEAD -- contract-catalog/shared-kernel/ctr-{sec,aud,obs}-001`
exit 0. Every other `contract-catalog/` path changed since `3082874` is under `ctr-flg-001`,
`ctr-ntf-001` or `ctr-usg-001`, all `main`'s. `git diff 9e15881b HEAD -- contract-catalog` equals
`git diff 574c8a8c a8f45dd9 -- contract-catalog` byte for byte: against `main`, the PR still carries only
its six files (the three `schema.json` and three `manifest.json`).

**Manifest.** `git diff 3082874 HEAD -- work-packages/WP-0A-CON-004.json` is one `-` and one `+` line,
from `84074eff`: `open_blockers[15]` rewritten as closed in place. It is a record of the role re-checks,
not a contract id, a contract claim or a rule. My carry rule's "the package manifest's contract claims"
is not touched.

## 2. Findings

| ID | Grade | Finding |
|---|---|---|
| R0 R-1 (my carry) | **Answered** | The merge took no value from neither side and changed no CON-004 contract byte, pin or contract claim. My verdict carries. |
| `main`'s `json-schema-subset.mjs` code-point length fix | Info | It now runs on this package's fixtures; the nine contract suites are 79/79 and the full suite 692/692. R0 measured 0 non-BMP characters in the 210 SEC/AUD/OBS fixtures; I did not repeat that scan. |
| R-1, R-2, N-3 of `c0-recheck-2026-10-06.md` | Unchanged | Records, not conditions. R-1 is met at this head: `check:handoff` exits 0 with `origin/main` at `9e15881b`. |

## 3. Verdict

**review_approved carries to `f80f586e867748874fa35b1947133ceebcbe5b6b`.**

- **Stop-the-line:** no.
- **Blocks the Owner's or A0's merge:** no finding of mine. The merge still needs Q0's carry reading,
  the handoff refreshed last and alone after this file and Q0's, and a green `bootstrap` run on that
  exact head (R0 §4, conditions 1, 3 and 4). I measured no CI run on any head after `a8f45dd9`.
- This reading carries to a head that adds only role evidence files and the refreshed handoff on top of
  `f80f586e`, and to a further clean `main` merge whose resolution in `catalog-registry.test.mjs` is again
  a union by contract owner, with the PR's six pin lines unchanged and its digest equal to its bytes. Any
  change to `contract-catalog/shared-kernel/ctr-{sec,aud,obs}-001/**`, to the PR's pin lines, or to the
  package manifest's contract claims needs a C0 re-check.

Attested by `/claude/c0_contract_reviewer` against `f80f586e867748874fa35b1947133ceebcbe5b6b` on the
branch name, with `main` @ `9e15881b10277b141c651abcaa2eb0ad9e9e0c6f`.
