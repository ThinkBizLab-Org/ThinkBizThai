# WP-0A-A0-003 — A1 Security/Privacy re-verification at PR #191's head

- **Package:** `WP-0A-A0-003` (repository secret-scan strengthening and privacy dimension). **Role:** independent
  Security/Privacy reviewer, run `/claude/a1_bastion`.
- **Subject:** PR #191 (Draft, OPEN), branch `agent/claude/WP-0A-A0-003-secret-scan`, head `1ad4515`
  (`1ad4515ba6aaa408c64f1862ce122cfc27822761`), base `main` `8c089cc`. Author `/claude/a0_atlas`.
- **My earlier verdict:** `review-security-head.md`, at `4bcb5f1`: `security_approved_with_conditions`, C1a closed,
  **C2**, **C3**, **C4** open.
- **Status:** this file records findings. It advances no status, signs no other role, approves no merge and no gate,
  and fixes nothing.
- **File name:** carries the phase's date (2026-10-05) as the brief asked; written 2026-10-06.

## 0. What I am

I am a subagent started by a workflow of `/claude/a0_atlas`, the Author of this package, of the same vendor and model
family as the Author. Under RFC-2026-024 that is the stated independence limit of this role run. This PR itself
records the Owner's 2026-10-05 extension of RFC-2026-024's cross-vendor withdrawal to this package; that withdrawal
does not remove the correlated-blind-spot property of a same-vendor review, it only stops recording it as an
exception. Accepting this re-check as the A1 role's signature is the Integration Owner's and the Product Owner's act,
not mine.

## 1. Read and measured

**Read:** `CONTRIBUTING_AGENTS.md`; my `review-security-head.md`; `author-reverify-2026-10-06.md`; the full
`8c089cc..1ad4515` diff of `work-packages/WP-0A-A0-003.json`; the security-relevant fields of the handoff diff;
`scripts/scan-repository-secrets.mjs` lines 301-460 at head; the decoy and false-positive tables of
`test-kits/secret-scan.test.mjs`; RFC-2026-005's status line and its `cloudflare-api-token` withdrawal section;
`evidence/WP-0A-A0-001/product-owner-disposition-2026-10-05-g0-step2.md` §1-§3 at `8c089cc`.

**Measured** (Node `v24.20.0`, npm `11.19.0`, pinned binaries):

- `git diff --name-only 8c089cc 1ad4515` lists three files: the author evidence file, the handoff and the manifest.
  `git diff --stat 8c089cc 1ad4515 -- scripts test-kits architecture package.json package-lock.json .github .agents
  .node-version` is empty. **This PR changes no executable, no test, no RFC, no lockfile and no CI.**
- sha256 of the scanner `fef5cd72…dfea5` and of the suite `8752c009…873e` at head; both equal the digests in
  `test-kits/integrity-manifest.json` and the digests the Author and Q0 recorded.
- Declared commands, run in a private clone of this worktree checked out **on the branch name**
  (`.git/HEAD` reads `ref: refs/heads/agent/claude/WP-0A-A0-003-secret-scan`, at `1ad4515`):

| Command | Exit | Result |
|---|---|---|
| `node scripts/scan-repository-secrets.mjs .` | 0 | no findings |
| `node --test test-kits/secret-scan.test.mjs` | 0 | tests 46, pass 46, fail 0, cancelled 0, skipped 0, todo 0 |
| `node scripts/validate-work-package-ownership.mjs work-packages` | 0 | |
| `node scripts/validate-work-package-role-separation.mjs work-packages/WP-0A-A0-003.json` | 0 | |
| `node scripts/validate-capability-profiles.mjs` | 0 | |
| `node scripts/verify-test-coverage-floor.mjs` | 0 | |
| `npm run check` | **0** | tests 692, pass 692, fail 0, cancelled 0, skipped 0, todo 0 |

- **Mutation probe (C2).** In a disposable copy of `scripts/`, `test-kits/` and `package.json`, each named rule's
  pattern was replaced by a never-matching pattern, one at a time, and the package suite run:

| Rule neutralised | Suite |
|---|---|
| `meta-access-token`, `stripe-restricted-key`, `twilio-auth-pair`, `sendgrid-key`, `netrc-password`, `vault-token` | exit 1, fail 2 each |
| `gcp-service-account-key`, `npmrc-auth-token`, `kubernetes-service-account-token` | exit 1, fail 1 each |
| controls: `pem-private-key`, `stripe-secret-key` (fail 3), `secret-named-assignment`, `thai-national-id` (fail 2), `payment-card-number` (fail 14) | exit 1 |
| baseline, unmutated | exit 0, 46/46 |

- **Reversion probe (C3).** Same disposable copy; each C3 narrowing reverted to its `4bcb5f1` shape:

| Reverted | Suite |
|---|---|
| `netrc-password` back to the unanchored line-start form | **exit 0, 46/46 — not detected by the suite** |
| `vault-token` with the single-letter legacy alternative restored | exit 1, fail 2 — detected |

- **Probe (C3, FP-1..3 and regressions)** through `scanText`, every credential-shaped value assembled at runtime from
  fragments; none is quoted here.

| Case | At `4bcb5f1` | At `1ad4515` |
|---|---|---|
| FP-1: prose line opening with the word and closing with one long token | fired | **clean** |
| FP-1: same shape inside an indented fenced code block | fired | **clean** |
| FP-1: prose line opening "machine …" and a password-shaped line within 200 characters | not probed | **fires** (residual, §3 N2) |
| `.netrc` canonical three-line block | detected | detected |
| `.netrc` single unindented password line with no `machine` line | detected | **missed** (accepted cost of the narrowing I asked for) |
| `.netrc` one-line form (`machine … login … password …` on one line) | not probed | **missed** (§3 N3) |
| `.netrc` `default` block | not probed | missed |
| FP-2: minified JS member chain through `s`, Python attribute through `s`, `s.`-prefixed filename | fired | **clean** (all three) |
| Vault `hvs.` / `hvb.` tokens | detected | detected |
| Vault legacy single-letter token, bare | detected | missed (accepted; caught by `secret-named-assignment` when assigned to a `VAULT_TOKEN` name) |
| FP-3: publish script assigning `process.env.NPM_TOKEN` to an `_authToken` variable | fired | **still fires** |
| FP-3: `.npmrc` line whose value is a documented placeholder | not probed | **fires** |
| FP-3: `.npmrc` line whose value is a `${…}` template | clean | clean |
| `.npmrc` real-shaped and opaque-token lines | detected | detected |
| C1a regression: Meta page token, Stripe restricted key in both modes | detected | detected |

- `gh pr view 191`: head `1ad4515…`, Draft, OPEN, MERGEABLE; the `bootstrap` check was **IN_PROGRESS** when read.
- The added lines of the PR diff contain no email address and no URL; one local toolchain path
  (`/Users/bank/.local/node-v24.20.0/bin/node`) in the author evidence, the same class prior evidence records.

## 2. My earlier conditions

| Condition | Earlier | Now | Basis |
|---|---|---|---|
| **C1a** Meta and Stripe restricted credentials | closed | **closed, holds** | probe, both rules fire on realistic shapes |
| **C2** the ten new rules have no tests | open, must fix | **CLOSED** | each surviving new rule has a decoy pinned to its own id (`expectedRule` must be among the hits, so the two shadowed rules are now asserted to fire themselves); the count guard is `CREDENTIAL_DECOYS.length >= CREDENTIAL_RULES.length`, not `>= 20`; neutralising any one of the nine fails the suite (§1). `cloudflare-api-token` was withdrawn rather than tested, which is the outcome I argued for; RFC-2026-005 records the withdrawal. |
| **C3** narrow three false-positive classes | open, should fix | **two of three closed; npmrc part OPEN** | FP-1 and FP-2 measured clean at head; FP-3 measured still firing, now also on documented placeholders. The netrc narrowing has no regression guard (§3 N1). |
| **C4(a)** no cardholder-data rule | advisory | **closed as to existence** | `payment-card-number` is live and suite-pinned (neutralising it fails 14 tests). Its open High finding A1-005-1 is WP-0A-A0-005's and is being fixed in PR #190; I did not re-review it here. |
| **C4(b)** RFC-2026-005 should record round 2 (8/56) | advisory | **OPEN** | the RFC still states 19/56 as its uncorrelated figure. Owed as a governance PR; the manifest records it as owed. |

The Author's account of my conditions in `author-reverify-2026-10-06.md` §1 ("C2 is met", "C3 is two-thirds met",
"C4(a) is met") is accurate, and I have now measured it rather than read it. It omits N1.

## 3. Findings

**N1 (Low, should fix with the next scanner increment).** The `netrc-password` narrowing that closed FP-1 is not
pinned by any test. Reverting the rule to the unanchored form that fired on prose leaves the suite at 46/46 and
`npm run check` would stay green. The false-positive table has no prose row of the shape that fired. Add one row: a
prose line opening with the word and ending in one long token, which must not fire. Without it, C3's FP-1 closure is a
property of today's source, not a control. Same class as C0 R3 (unpinned floors); belongs in the same increment.

**N2 (Info, residual).** The anchored rule still fires on prose where a line opening with `machine` is followed
within 200 characters by a line opening with the word and one long token. Far narrower than FP-1; recorded, not raised.

**N3 (Info, disclosure).** The anchored rule misses the one-line `.netrc` form that CI scripts commonly write with
`echo`, the `default` block, and now the bare single password line. RFC-2026-005's "Not detected, and why" should say
so in the same governance PR that carries C4(b). Not a regression of anything I recorded as covered except the bare
single line, which I traded away when I asked for the anchor.

**N4 (Info, record accuracy).** The Author's "not done" list for this run says the Owner's step-2 disposition file is
not yet on `main` and arrives with PR #186. It is on `main`: `git ls-tree 8c089cc` lists
`evidence/WP-0A-A0-001/product-owner-disposition-2026-10-05-g0-step2.md`, and its §1.2 and §3 rows 1-3 carry the
three items this PR applies, with WP-0A-A0-003 inside A0's stated mapping (WP-0A-A0-002..009). The manifest's citations
therefore resolve. No security effect.

**Checked and found sound** (security-relevant edits in this PR):

- `ownership.amended_by[0].acknowledgement_required_from` moved from `/claude/a0_atlas` (Author of the amending
  package) to `/claude/r0_steward`, status still `pending`. This removes a self-acknowledgement; correct.
- The `/root/r0_steward` → `/claude/r0_steward` succession is recorded as naming only; no acknowledgement is given or
  implied, and the WP-0A-A0-001 entry is left `pending` outside this package's paths. Correct.
- The three `CLOSED … IN PLACE` blockers (coverage-guard referral, RFC-2026-005 disposition, cardholder rule) keep their
  original text. I checked the facts they rest on that touch my role: the cardholder rule exists (above); RFC-2026-005's
  status line reads Approved 2026-09-02. I did not re-verify `ci.yml:69-77`; that is C0's R5.
- Q0 L4 (UTF-16 passes silently) and Q0 L5 (no LINE, Omise, 2C2P, SCB rule) are now disclosed as open blockers. Both
  agree with my round-2 corpus (§5 of my earlier review), where all four Thai vendors were missed.
- `handoffs/…security_privacy_cost_impact` says records only, no scanner or rule change; measured true (§1).

## 4. Stop-the-line

**No.** No secret, token, credential or personal data is introduced: the full-tree scan at head exits 0, the PR adds
no executable, and the added lines carry no email address or URL. No tenant path, external side effect, migration or
contract meaning is touched. The scanner's open weaknesses (C0 R1 path carve-out, Q0 L1 non-regular entry, UTF-16,
Thai vendors) pre-exist this PR at `main` and are recorded in `open_blockers`; none is made worse here.

## 5. Merge

Nothing in my role blocks PR #191. It is a records-only PR and every security-relevant statement in it that I could
measure is accurate. It does not need my conditions closed to merge, and it does not close them. What remains for my
role on this package is owed by the next scanner increment after PR #190: C3's `npmrc-auth-token` placeholder filter,
N1, and C4(b) with N3 in the RFC governance PR. The C0 `changes_required` and Q0 `test_failed` verdicts, CI on
`1ad4515` (in progress when read), and the Integration Owner's verdict are not mine to weigh.

## 6. Limits

A pattern scanner cannot prove the absence of secrets; nothing here says this repository contains none. My probes are
one reviewer's construction, and the mutation probe shows only that each rule's decoy is asserted, not that each
rule's floor or anchor is (C0 R3, N1). I did not re-review WP-0A-A0-005's `payment-card-number` beyond its presence.
This file was scanned with the scanner at `1ad4515` before commit (verification line below).

---

Verification of this document: scanned with `scripts/scan-repository-secrets.mjs` at `1ad4515`: the full-tree scan
(`node scripts/scan-repository-secrets.mjs .`) with this file present exits `0`. Committed with plain `git commit` in
this run's worktree (branch `worktree-wf_11143e4f-dd4-3` over `1ad4515`), not pushed; the handoff is now not the last
commit, and refreshing it is the Author's.

VERDICT: security_approved_with_conditions
