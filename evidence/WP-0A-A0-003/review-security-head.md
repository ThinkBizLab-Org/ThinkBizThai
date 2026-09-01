# WP-0A-A0-003 — Independent Security/Privacy review at head

**This document is Security/Privacy evidence only.** It is not Reviewer, Tester, Integration
Owner, or Product Owner evidence, it does not dispose of RFC-2026-005, and it does not
approve Gate G0 or authorize a merge.

| Field | Value |
|---|---|
| Role | Independent Security/Privacy Reviewer |
| `agent_run_id` | `/claude/a1_bastion` |
| Package | WP-0A-A0-003 |
| Delta reviewed | `73d0770..4bcb5f1` (this is the second review of this package; the first reviewed `73d0770`) |
| Artifact under review | frozen extraction of `4bcb5f1` |
| Toolchain | Node `v24.20.0`, npm `11.19.0` (pinned; both confirmed by `node -v` / `npm -v` in the run below) |
| Prior disposition | `security_approved_with_conditions`, condition **C1a** open |

## Why there was a second review

The first review returned `security_approved_with_conditions` with **C1a** open: a bare Meta
page/system-user token and a Stripe restricted key both passed the scanner, and Meta and
Stripe are this project's own named G0 blockers. The Author changed the scanner in response.
Author-supplied changes made in response to a reviewer finding carry no independent evidence,
so the response is measured here rather than accepted.

## Scope of the change actually reviewed

Only one executable file in the delta is security-relevant:
`scripts/scan-repository-secrets.mjs` (+28/-… lines). Everything else in
`73d0770..4bcb5f1` is contract-catalog fixtures, evidence prose, and the RFC text. The
change adds ten credential rules (21 → 31), rewrites `secret-named-assignment`, and rewrites
the PEM armour header as a character class.

## Environment and method

All probing was done against a frozen extraction of `4bcb5f1` at
`…/scratchpad/head-a0003`. The scanner was imported as a module and driven directly, and
separately exercised on disk through `scanDirectory` and through the CLI, so that nothing
below depends on reading the regular expressions and reasoning about them.

Every credential-shaped probe value is generated at runtime from character-class fragments by
the probe scripts. **No literal credential-shaped string is written into this document**;
decoys are described, never quoted. This file was scanned with the scanner under review
before being finalized (§8), because an earlier independent security review in this project
tripped the scanner with its own evidence.

### Deviation to disclose

Before switching to the frozen copy I ran two **read-only** git commands
(`git log --oneline 73d0770..4bcb5f1` and `git diff --stat 73d0770 4bcb5f1`) with the working
directory defaulted to `/Users/bank/ThinkBizThai`. No write, checkout, or index operation was
performed there, and nothing else in this review reads that path. The commit list and the
file-level diff stat cited above and the lockfile claim in §8 come from those two commands;
everything else comes from the frozen copy.

## Commands, with real exit codes

| # | Command | Exit |
|---|---|---|
| 1 | `node -v` → `v24.20.0`; `npm -v` → `11.19.0` | 0 |
| 2 | `node scripts/scan-repository-secrets.mjs .` (frozen tree) | **0** |
| 3 | `npm run check` | **0** — `tests 116`, `pass 116`, `fail 0`, `cancelled 0`, `skipped 0`, `todo 0` |
| 4 | `node probe-new-rules.mjs` — 62 constructed probes across the ten new rules | 0 |
| 5 | `node probe-assign.mjs` — 42-case assignment matrix across three rule shapes | 0 |
| 6 | `node probe-corpus.mjs` — 68-decoy corpus (12 correlated + 56 fresh) | 0 |
| 7 | `node probe-fp.mjs` — 33 realistic-content false-positive cases + Monte-Carlo | 0 |
| 8 | `node selfscan.mjs` — scanner source, its test, the RFC, and two evidence files | 0 |
| 9 | `node spot.mjs` — fail-closed and PII policy spot-checks | 0 |
| 10 | `shasum -a 256` on the two guarded files vs `test-kits/integrity-manifest.json` | 0 — **both digests match** |

---

## 1. Per-rule probe results for the ten new rules

62 probes, values constructed at runtime, including realistic-length and realistic-charset
ones. `detected` means **that named rule** fired.

### `meta-access-token` — pattern is prefix + 20 or more alphanumerics

| Probe | Result |
|---|---|
| Page token, classic long-lived shape, 195 alphanumerics | **detected** |
| System-user token, 210 characters, trailing pad sequence | **detected** |
| Short-lived user token, ~110 characters | **detected** |
| Token as the value of a `META_PAGE_ACCESS_TOKEN` env line | **detected** (also `secret-named-assignment`) |
| Token as a JSON string value | **detected** |
| Token whose 4th character is a base64url `_` or `-` | **missed** |
| Token with `_`/`-` recurring every few characters throughout | **missed** |
| App access token in the `appid` pipe `appsecret` form | **missed** |
| Client token (32 hex, no prefix) | **missed** |
| Prefix plus only 19 characters (below the floor) | **missed** |

**Does it match the real format?** Yes. Meta page, user and system-user tokens as issued are
alphanumeric, and all five realistic-shape probes fired. The two `_`/`-` misses matter only
if Meta emits a token with a non-alphanumeric inside the first 20 characters after the
prefix, which the observed format does not; recorded as residual, not as a defect.

### `stripe-restricted-key` — prefix plus mode plus 20 or more alphanumerics

| Probe | Result |
|---|---|
| Modern restricted key, `live` mode, 107 characters | **detected** |
| Legacy restricted key, `test` mode, 32 characters | **detected** |
| Restricted key as an env assignment value | **detected** |
| Restricted key with only 19 characters after the mode | **missed** |
| A hypothetical third mode word (not `live`/`test`) | **missed** |
| Publishable key prefix | **missed** (not a secret; correct) |

**Does it match the real format?** Yes. Stripe restricted keys are issued only in `live` and
`test` modes and are far longer than the 20-character floor. Both real forms fired.

### `gcp-service-account-key`

| Probe | Result |
|---|---|
| Canonical service-account JSON, documented field order | **detected** (`pem-private-key` also fires) |
| Pretty-printed two-space service-account JSON | **detected** (`pem-private-key` also fires) |
| Same JSON with the private key field placed **before** the type field | **missed by this rule**; caught by `pem-private-key` |
| Type and private key separated by more than 400 characters | **missed by this rule**; caught by `pem-private-key` |
| Whole service-account JSON base64-encoded into one env value | **missed entirely** |

The rule works on the documented layout. It is close to redundant: every case it caught was
also caught by `pem-private-key`, and every case it missed was caught by `pem-private-key`
too — except the base64-encoded form, which nothing catches.

### `twilio-auth-pair`

| Probe | Result |
|---|---|
| Account SID and auth token on adjacent env lines | **detected** |
| Account SID and auth token in one JSON object | **detected** |
| SID and token separated by 250 characters | **missed** (span cap is 200) |
| Account SID alone | **missed** (not a secret; correct) |
| **Auth token alone, no SID nearby** | **missed** |
| SID with an uppercase-hex token | **missed** (Twilio emits lowercase; acceptable) |
| API-key SID form plus its secret | **missed** |

The pairing requirement is the weakness: the auth token is the secret, and it is invisible
unless an Account SID happens to sit within 200 characters of it. A `.env` that holds only
the token, or a rotation note that quotes only the new token, passes.

### `sendgrid-key`

| Probe | Result |
|---|---|
| Canonical `SG` dot 22 dot 43 key | **detected** |
| Same key as an env assignment value | **detected** |
| First segment only 19 characters | **missed** (below floor; the real format is 22) |
| Mailgun-style key (different vendor) | **missed** |

Matches the documented SendGrid format exactly.

### `cloudflare-api-token`

| Probe | Result |
|---|---|
| `CLOUDFLARE_API_TOKEN` named assignment, 40-character value | **detected** (also `secret-named-assignment`) |
| `CF_API_TOKEN` YAML colon form, 40-character value | **detected** |
| **Bare 40-character Cloudflare token with no variable name** | **missed** |
| Lowercase `cloudflare_api_token` assignment | **missed** |
| Cloudflare global API key (37 hex) under a `CF_API_KEY` name | missed by this rule; caught by `secret-named-assignment` |
| `CLOUDFLARE_API_TOKEN` with a 39-character value | missed by this rule; caught by `secret-named-assignment` |

This rule is the weakest of the ten. It only fires on a form that `secret-named-assignment`
already catches, and it misses the bare token — which is the form that actually leaks, since
a Cloudflare token is a fixed-length opaque string with no vendor prefix to anchor on. It
adds essentially no coverage over the rule that was already there.

### `npmrc-auth-token`

| Probe | Result |
|---|---|
| Real `.npmrc` registry auth line | **detected** (also `npm-access-token`) |
| Scoped registry auth line | **detected** |
| Auth line with spaces around the equals sign | **detected** |
| `.npmrc` basic-auth base64 line (different key name) | **missed** |
| Yarn `npmAuthToken` colon form | missed by this rule; caught by `npm-access-token` |
| Auth line whose value is a shell template reference | **missed** (correct — a reference, not a secret) |
| **Publish script reading the token from `process.env`** | **detected — FALSE POSITIVE, see §6** |

### `netrc-password`

| Probe | Result |
|---|---|
| Canonical three-line `.netrc` block | **detected** |
| Single unindented `.netrc` password line | **detected** |
| Password of 7 characters | **missed** (below floor) |
| `.pgpass` colon-delimited form | **missed** |
| Docker `config.json` base64 auth entry | **missed** |
| Kubernetes Secret `stringData` lowercase password key | **missed** |

Correct on the real `.netrc` format. It is also the single largest false-positive source in
the change — see §6.

### `kubernetes-service-account-token`

| Probe | Result |
|---|---|
| Real projected service-account token (`alg` then `kid` header) | **detected** (also `json-web-token`) |
| Legacy token with an empty `kid` | missed by this rule; caught by `json-web-token` |
| Header with `typ` between `alg` and `kid` | missed by this rule; caught by `json-web-token` |
| Token base64-encoded into a Secret `data:` field | **missed entirely** |

Every case this rule caught was already caught by `json-web-token`, and every case it missed
except the base64 one was caught by `json-web-token` too. Net new coverage in these probes: zero.

### `vault-token`

| Probe | Result |
|---|---|
| Modern service token (`hvs` prefix), 90 characters | **detected** |
| Batch token (`hvb` prefix), 80 characters | **detected** |
| Legacy single-letter-prefix token, 24 characters | **detected** |
| Legacy token, 23 characters | **missed** (below floor) |
| Modern token containing `-` and `_` | **detected** |
| Token as a `VAULT_TOKEN` assignment value | **detected** |
| Legacy root token in UUID form | **missed** |

Correct on both current Vault formats. The single-letter legacy alternative is a
false-positive source — see §6.

### Summary of §1

| Rule | Real vendor format detected? |
|---|---|
| `meta-access-token` | **yes** (5/5 realistic shapes) |
| `stripe-restricted-key` | **yes** (both issued modes) |
| `gcp-service-account-key` | yes, but fully shadowed by `pem-private-key` |
| `twilio-auth-pair` | partially — SID+token yes, token alone no |
| `sendgrid-key` | **yes** |
| `cloudflare-api-token` | no — bare token missed; named form already covered elsewhere |
| `npmrc-auth-token` | **yes**, with a false positive |
| `netrc-password` | **yes**, with a false-positive class |
| `kubernetes-service-account-token` | yes, but fully shadowed by `json-web-token` |
| `vault-token` | **yes**, with a false-positive class |

---

## 2. Disposition of C1a

**C1a is CLOSED.**

The two credentials the condition named are now detected in their real issued formats, and I
verified that against constructed values rather than against the Author's own test data —
which is necessary here, because **the Author's test suite contains no case for either rule**
(see §3, "what the tests do not cover"). Meta page, user and system-user tokens fired on all
five realistic shapes; Stripe restricted keys fired in both issued modes and at both legacy
and modern lengths. The rules are anchored on the true vendor prefixes, not on a guess at
them, and the length floors sit below the shortest real form of each.

C1a is closed on the merits. The conditions raised below (**C2**, **C3**) are new and do not
reopen it.

---

## 3. The two rule-shape fixes, and the regression check

### `secret-named-assignment`

The Author already introduced one regression here in the opposite direction (a bare
`API_KEY`-style assignment stopped matching) and caught it only because an existing test
failed. I therefore probed the rule as a three-way comparison across 42 cases: the pre-delta
shape **V0** (reconstructed from the in-file comment: optional prefix group had to end in an
underscore), the broken intermediate **V1** (prefix made mandatory), and the head shape **V2**.

**Result: no regression. V2 is a strict superset of V0 across all 42 cases.**

| Class | Cases | V0 | V1 | V2 |
|---|---|---|---|---|
| Should match | 25 | 19 | 9 | **25** |
| Documented misses (lowercase, mixed case, colon form, short value, spaced value) | 5 | 0 | 0 | 0 |
| Must-not-match (templates, references, placeholders, empty) | 6 | 0 | 0 | 0 |
| Known false-positive risk | 6 | 4 | 0 | 4 |

- Matched by V0 but not by V2: **none**.
- Newly matched by V2 and not by V0: glued identifiers (the `PGPASSWORD` family and two
  others), a digit-leading name, and an underscore-leading name — all intended widenings.
- The intermediate V1 lost 16 of 25 should-match cases. The head shape does not.
- Bare names, prefixed names, suffixed names, both-ends names, spaces around the separator,
  double- and single-quoted values, values followed by a trailing comment, and an exactly
  8-character value all match. Lowercase, mixed case, JSON colon style, 7-character values
  and values containing a space do not — consistent with what RFC-2026-005 declares.
- The four false-positive rows that fire under V2 **also fire under V0**. They are
  pre-existing behaviour, not introduced by this rewrite (§6).

### PEM armour header

Rewritten with a character class so the file no longer matches its own source. Verified in
§4. The rule still fires on the real header; the dead vendor alternative noted in the first
review was corrected.

### What the tests do not cover

`test-kits/secret-scan.test.mjs` contains **no test case for any of the ten new rules**. The
decoy table is pinned at 17 rows and none of them targets a new rule; the only count guard is
`CREDENTIAL_RULES.length >= 20` against an actual 31. Any one of the ten could be deleted,
mis-anchored, or have its length floor broken and the suite would still pass with
`fail 0`. The RFC's own Verification section states that every decoy row must be detected
"by a named rule" — the ten new rules are outside that guarantee. Raised as **C2**.

---

## 4. Does the scanner match its own source or its own test file?

No. Both are clean, as are the RFC and the two largest evidence files in the delta.

| File scanned with the rules under review | Result |
|---|---|
| `scripts/scan-repository-secrets.mjs` | **clean** |
| `test-kits/secret-scan.test.mjs` | **clean** |
| `architecture/decisions/RFC-2026-005-secret-scan-strengthening.md` | **clean** |
| `evidence/WP-0A-A0-003/author-self-check.md` | **clean** |
| `OVERNIGHT-SUMMARY.md` | **clean** |

The whole frozen tree also scans clean (command 2, exit 0), and
`test-kits/integrity-manifest.json` digests both guarded files and **both digests match the
files as extracted**.

---

## 5. Fresh uncorrelated corpus

I built a fresh 68-decoy corpus and split it deliberately, because a single number here would
be misleading.

**Group A — the twelve families this reviewer named last round.** Correlated with the fix by
construction; it measures whether the response landed.

> **12 / 12 detected.**

**Group B — 56 families this reviewer did *not* name last round**, chosen to be independent of
both the Author's decoy table and my previous corpus: Thai and South-East-Asian payment and
messaging vendors (Omise, 2C2P, LINE, SCB), Alibaba and Tencent Cloud, fifteen further SaaS
and infrastructure vendors, PCI cardholder data, Thai PII outside the three implemented rules,
and eleven encoding/layout evasion cases.

> **8 / 56 detected — 48 missed.**

And three of those eight are not real coverage:

- One (a LINE channel access token) fired on `meta-access-token` **by coincidence** — the
  random base64 body happened to contain the Meta prefix at a word boundary. That is the
  false-positive mechanism in §6 producing a lucky hit, not detection.
- Five are the same three pre-existing vendor prefixes (`sk_live_`, `ghp_`, the PEM header)
  re-detected inside a SQL insert, a diff line, a notebook cell, an XML value and a CSV
  column — they measure that the scanner is content-format-agnostic, which it is, not that it
  knows more credentials.

**Is the improvement real, or did it fix only the two families I named?**

The improvement is **real but narrow**. It closed exactly the families that were named, plus
eight adjacent ones the Author chose, and it closed them properly. It did not generalize:
against families nobody had named, detection is **8/56 (14%)**, which is in the same band as
the 19/56 the previous review measured on a different corpus. The two numbers are not directly
comparable — different corpora, and mine is deliberately harder — but the direction is
unambiguous. Every number in this scanner's history is a regression test against failures
somebody thought to look for, and this round is no different.

Concretely, the following are entirely undetected and are **not** listed in the RFC's "Not
detected, and why" section:

- **Cardholder data.** There is no PAN rule at all. A Luhn-valid card number, bare or
  space-grouped, and a PAN/CVV/expiry triple in a fixture all pass. This project's named G0
  blockers are payment providers, and the scanner already carries a privacy dimension for
  Thai national IDs and phone numbers — the omission of card data from that dimension is a
  gap in the same policy, not a separate concern. Raised as **C4**.
- **The Thai payment and messaging vendors this product actually integrates** — Omise, 2C2P,
  LINE channel tokens and secrets, SCB — none detected.
- **Encoding and layout evasion** — base64, hex, URL-encoding, and a header split across two
  lines all defeat every rule. Consistent with the RFC's stated limitation, but the RFC does
  not quantify it.

---

## 6. False positives

The tree is clean today (command 2, exit 0) and 25 of 33 realistic-content cases stay clean.
Four false-positive classes fire, all of them new to this delta except where noted. Each is a
**CI-breaking** failure, not a silent miss: a false positive exits 70 and fails `npm run check`.

### FP-1 — `netrc-password` fires on ordinary English prose (highest practical risk)

The pattern matches a `password` line-start followed by a single token of 8 or more
non-space characters, **in any file in the repository**. That is a common shape in reflowed
Markdown.

| Realistic content | Fires |
|---|---|
| A runbook sentence wrapped so that `password` starts a line and a single long word ends it | **yes** |
| A prose line where `password` is followed by one long word and a line break | **yes** |
| An indented line inside a fenced code block, same shape | **yes** |
| Markdown table row, list bullet, heading, YAML colon form, TOML form, two-word continuation | no |

This is not hypothetical here. This repository **already contains two committed lines that
begin with `password`**, both in prior security-review evidence:
`evidence/WP-0A-CON-003/review-security.md:266` and
`evidence/WP-0A-CON-002/review-security.md:349`. Neither fires today, and only because a
comma follows the word. The repository is overwhelmingly Markdown prose and accumulates more
of it every package; the edit distance between the committed text and a red CI run is one
reflow. There is also no `accept` filter, so a placeholder such as a documented stand-in
password fires as readily as a real one, unlike `secret-named-assignment`.

### FP-2 — `vault-token` fires on member-access chains in source code

The single-letter legacy alternative means the pattern matches a word-boundary `s`, a dot, and
24 or more alphanumerics.

| Realistic content | Fires |
|---|---|
| Minified JavaScript with `this.s.` and `x.s.` property chains | **yes** |
| Python attribute access through a short attribute named `s` | **yes** |
| A filename beginning with `s.` followed by a long identifier | **yes** |
| A UUID list, a CDN URL path segment, a sentence ending in `s.` | no |

The frozen tree contains no application source yet, so nothing fires today — I grepped for
the shape and found zero occurrences. WP-0A is the bootstrap for a product that will have a
`src/` tree, and any bundled or minified JavaScript is a strong candidate. The legacy
single-letter Vault prefix has been superseded by the three-letter prefixes, both of which
have their own alternative in the same rule, so this alternative buys little for its cost.

### FP-3 — `npmrc-auth-token` fires on ordinary publish-script code

A line assigning `process.env.NPM_TOKEN` to a variable whose name ends in `_auth` plus
`Token` matches: the value is 21 characters drawn entirely from the permitted class. This
rule, alone among the assignment-shaped rules, has no placeholder or reference filter — the
`secret-named-assignment` rule would correctly reject the same right-hand side. A template
reference in braces is correctly rejected, but only by accident of the character class.

### FP-4 — `meta-access-token` fires on arbitrary base64 blobs (measured, low)

Any base64 or base64url blob containing a non-word character followed by the Meta prefix and
20 alphanumerics matches. Measured by Monte-Carlo over 50,000 random blobs per length:

| Blob length | Fire rate |
|---|---|
| 64 | 0.002% |
| 256 | 0.002% |
| 1024 | 0.008% |
| 4096 | 0.018% |

Low enough to accept, and recorded because it is also what produced the one coincidental
"detection" in §5. The frozen tree contains no occurrence of the prefix at all.

### Pre-existing, not introduced by this delta

Four `secret-named-assignment` false positives fire at head — an env line assigning a
filesystem path to a `SECRETS`-named or `API_KEY`-named variable, a URL query parameter named
`TOKEN`, and a CI line assigning a secret's *name* to a `SECRET_NAME` variable. I verified
each against the reconstructed pre-delta shape V0 and **all four fire there too**. The
rewrite did not widen the false-positive surface of this rule.

---

## 7. Fail-closed and PII behaviour (spot-check)

Spot-checked rather than re-derived, as scoped. Unchanged from the first review.

| Case | Result |
|---|---|
| Unreadable file containing a credential | `unreadable-file` finding |
| Unlistable directory | `unreadable-directory` finding |
| Symbolic link | `unscannable-symlink` finding, not followed |
| Oversize file | `oversize-file` finding, not truncated |
| Combined exit code for the four above | **71**, correctly separated from 70 |
| Thai national ID under `evidence/` | reported (no exemption) |
| Thai mobile number under `docs/` | reported |
| Email under `evidence/` and `handoffs/` | exempt |
| Email under `docs/`, a sibling `evidenceX/`, and a nested `docs/evidence/` | reported — the prefix exemption is not exploitable by a sibling path |
| Credential under `evidence/` | reported — the exemption relaxes one PII rule only |

---

## 8. Toolchain, lockfile, dependencies, and self-check of this document

- `npm run check` exits **0** on pinned Node `24.20.0` / npm `11.19.0`:
  **`tests 116`, `pass 116`, `fail 0`, `cancelled 0`, `skipped 0`, `todo 0`.**
- `package-lock.json` is **not in the `73d0770..4bcb5f1` file list** — it is untouched.
- The lockfile at head declares **no dependencies at all**: `lockfileVersion 3` with a single
  root package stanza carrying only the engine pins. **No dependency was added**, and the
  scanner remains pure Node standard library (`node:fs/promises`, `node:path`, `node:url`).
- `test-kits/integrity-manifest.json` digests both guarded files and both digests match.
- **This file was scanned with the scanner under review before finalizing**, and
  `node scripts/scan-repository-secrets.mjs .` was re-run over the tree with this file present.
  Both clean; see the verification line at the end.

---

## 9. Conditions

**C1a — CLOSED.** Meta and Stripe restricted credentials are detected in their real issued
formats, verified independently against constructed values.

**C2 — the ten new rules have no test coverage (must fix before this package is closed).**
Nothing in `test-kits/secret-scan.test.mjs` exercises any of them, and the only structural
guard is a `>= 20` count against 31 actual rules. A rule that is asserted only by RFC prose is
not a control. Add one detected-decoy row per new rule, pinned to the rule id the way the
existing 17 rows are, and raise the count guard to the actual rule count. Two of the ten
(`gcp-service-account-key`, `kubernetes-service-account-token`) were shadowed by an older rule
in every probe I ran — pinning the expected rule id is what will reveal that.

**C3 — three false-positive classes should be narrowed (should fix; each breaks CI when it
fires).** `netrc-password` should be constrained to a credential-file context or require a
preceding `machine`/`login` line rather than matching any prose line in any file; `vault-token`
should drop the single-letter legacy alternative or require a non-member-access context; and
`npmrc-auth-token` should reuse the existing placeholder/reference filter that
`secret-named-assignment` already applies. FP-1 is the urgent one: this repository already
contains committed prose one reflow away from firing it.

**C4 — advisory, for the RFC rather than the code.** Two things should be recorded honestly in
RFC-2026-005 rather than fixed here: (a) there is no cardholder-data rule, which is a gap in
the stated privacy dimension for a product whose G0 blockers are payment providers; and (b) the
uncorrelated number should be updated — 8/56 against a fresh corpus, alongside the 12/12 on the
families that were named. The RFC currently reports "from 5 to 21 rules" while the file carries
31, and its D2 table predates this delta.

## Assessment

The response to C1a is genuine, correctly anchored on real vendor formats, and independently
verified here. Fail-closed behaviour, the PII policy and its prefix exemption are unchanged and
still sound. The assignment-rule rewrite is a strict improvement with no regression across 42
cases, and the scanner no longer matches its own source. The tree is clean and `npm run check`
is green with nothing skipped.

Against that: ten new security rules shipped with zero tests, three of them introduce
false-positive classes that fail CI on ordinary repository content, two add no coverage over
rules that already existed, and the scanner's coverage against credentials nobody thought to
name is materially unchanged. None of this makes the delta worse than what it replaced, and
none of it is a reason to withhold approval — but C2 and C3 are real and should not be carried
into Gate G0 unaddressed.

A pattern scanner cannot prove the absence of secrets. Nothing in this document should be read
as evidence that this repository contains none.

---

Verification of this document: scanned with `scripts/scan-repository-secrets.mjs` at
`4bcb5f1` — clean, and the full tree scan with this file present exits `0`.

VERDICT: security_approved_with_conditions
