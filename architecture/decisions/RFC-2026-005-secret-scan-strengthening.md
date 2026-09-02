# RFC-2026-005 — Secret-scan strengthening, fail-closed reads, and a privacy dimension

Status: Approved 2026-09-02 by the Product Owner — the thirty credential rules are live; entropy remains a second-stage filter and never a detector. Limitations and Rollback in this document stand unchanged.
Decision needed by: before any package handles permissioned data, a real credential, or customer content
Owner: A0 Architecture/Security tooling
Protocol version: `1.0.0`

## Problem

`scripts/scan-repository-secrets.mjs` is wired into `npm run check` as the
`scan:secrets` step, and every role's evidence in this repository cites a green
`npm run check` as part of its verdict. Two independent security reviews
established — by probing the scanner rather than by reading it — that a clean
result from it proves almost nothing.

### D1 — five pattern families, and nothing else

The scanner as committed matches exactly five regular expressions: a PEM private
key header, a Stripe secret-key prefix, a Stripe webhook prefix, an AWS
access-key-id prefix, and a GitHub token prefix. There is no other rule.

### D2 — measured miss rate against realistic decoys

The same probe was re-run for this RFC against the scanner exactly as extracted.
The reconstruction used for the probe is byte-identical to the committed file,
confirmed by its recorded digest `46bc22c3…` in `test-kits/integrity-manifest.json`.

Fourteen synthetic decoys, each written to a `.env.production` in its own
directory, one decoy per scan:

| Decoy family | Superseded scanner | This RFC |
|---|---|---|
| AWS access key id (control) | detected | detected |
| OpenAI project key | **missed** | detected |
| Anthropic API key | **missed** | detected |
| Google API key | **missed** | detected |
| Slack bot token | **missed** | detected |
| JSON Web Token | **missed** | detected |
| Postgres DSN with inline password | **missed** | detected |
| `DB_PASSWORD=` assignment | **missed** | detected |
| `API_KEY=` assignment | **missed** | detected |
| Azure storage connection string | **missed** | detected |
| Thai national ID (checksum-valid, invented) | **missed** | detected |
| Thai phone number | **missed** | detected |
| Email address | **missed** | detected |
| Private internal hostname | **missed** | **still not detected — see below** |
| **Total** | **1 / 14** | **13 / 14** |

### D3 — the scanner fails open

The read is `await readFile(file, 'utf8').catch(() => null)`, and the finding is
recorded only `if (content && …)`. A file the scanner cannot read is therefore
indistinguishable from a file with no secret in it. Probed directly: a file whose
contents match one of the five patterns exits `0` when the file is unreadable and
`70` when it is readable. **The failure mode of a secret scanner must not be
"reports clean".**

### D4 — no privacy dimension at all

`CONTRIBUTING_AGENTS.md` ("Non-negotiable security and data rules") forbids
committing customer PII. The scanner has no PII rule of any kind, so that rule is
asserted by documentation and by human review only, with no automated check —
even though the product is a Thai-market system whose domain documents describe
Thai customer records.

### D5 — git history is not inspected

The scanner walks the working tree and skips `.git` entirely. A credential
committed and then deleted in a later commit is invisible to it. This RFC does
not change that.

**Consequence.** A green `scan:secrets` step means "these declared patterns did
not match these declared files at this commit". It is not, and has never been,
evidence of secret coverage. Evidence artifacts that cite it should say so.

## Decision

1. **Broaden the credential rule set** from 5 to 30 rules, each anchored on a
   vendor prefix, a structural shape, or an explicit secret-named assignment —
   never on entropy alone. Added: PuTTY private keys, AWS secret access keys and
   the non-`AKIA` AWS key-id prefixes, GitHub fine-grained PATs, OpenAI project
   and legacy keys, Anthropic keys, Google API keys, Slack bot and app tokens,
   npm access tokens, three-segment JSON Web Tokens, `Bearer`/`Basic`
   authorization headers, database URLs carrying an inline password, Azure
   storage account keys and SAS signatures, and uppercase environment-style
   assignments to a secret-named identifier.

2. **Use entropy and structure only as a second-stage filter**, never as a
   detector. The legacy OpenAI rule requires a Shannon entropy of at least 3
   bits/character over the token body; the Thai national ID rule requires the
   official mod-11 check digit; the DSN and assignment rules reject template
   references and documented placeholders. A first stage that is a bare prefix
   plus a length floor is too loose to ship without one of these.

3. **Fail closed.** A file the scanner cannot read, cannot decode, is too large
   to read, or is not a regular file is now a **finding**, not a pass. So is a
   directory that cannot be listed, and so is a symbolic link — which is reported
   rather than followed, because following one makes the scanned byte set depend
   on state outside the commit. A file that is not valid UTF-8 and is not
   declared binary media is reported *and still pattern-scanned as latin1*, so
   nothing is silently skipped.

4. **Add a privacy dimension** — Thai national ID numbers, Thai phone numbers,
   and email addresses — under the policy in the next section.

5. **Distinguish the two failure classes by exit code.** `70` for a credential or
   PII match (unchanged from the superseded behaviour); `71` for an unscannable
   input. Both are non-zero and both fail `npm run check`.

## PII policy

The policy has to survive one specific tension: `evidence/` and `handoffs/` are
the audit trail this repository is largely made of, and an address in the form
`Name <local@host>` legitimately appears in pasted git author metadata and in
role-run attribution. A scanner that fires on its own audit trail would be
switched off.

| Rule | Where it applies | Rationale |
|---|---|---|
| Thai national ID (mod-11 valid) | **Everywhere. No exemption.** | `CONTRIBUTING_AGENTS.md` forbids customer PII repository-wide with no carve-out, and no legitimate artifact in a specification baseline needs a checksum-valid national ID. Synthetic fixtures must use structurally invalid values. |
| Thai phone number | **Everywhere. No exemption.** | Same reasoning. |
| Email address | Everywhere **except** paths under `evidence/` and `handoffs/` | Those two prefixes are the canonical audit trail named by `CONTRIBUTING_AGENTS.md`. Git author metadata and agent-run attribution legitimately carry an address there. |

The exemption is scoped as narrowly as it can be while remaining true: it applies
to **one rule**, in **two path prefixes**, and to nothing else. A credential in
an evidence file is still a finding, and PII other than an email address in an
evidence file is still a finding. Both are regression-tested.

**The exemption is honest about what it costs.** A customer email address pasted
into an evidence file will not be caught. The scanner does not attempt to tell a
maintainer address from a customer address, because any such test would be a
domain allowlist masquerading as a security control. The compensating control is
human review of the evidence diff under RFC-2026-002 — the same anchor the
integrity manifest relies on — not the scanner.

**Measured against the tree as it stands, the exemption is load-bearing for zero
files.** Executed rather than argued: with `PII_PROSE_PREFIXES` set to `[]` — the
exemption entirely removed — a scan of the repository returns 0 findings. The
exemption is therefore a forward-looking allowance for evidence the project will
accumulate, not an adjustment made to get a passing scan, and a reviewer can
reproduce that in one line by emptying the constant and re-running.

## Not detected, and why

Each of these was considered and **deliberately declined**. Every one is a
measured decision against this repository's actual contents, not an oversight.

- **Bare high-entropy strings.** The repository contains 130 distinct 40- and
  64-character lowercase-hex strings — git SHAs and the sha256 digests in
  `test-kits/integrity-manifest.json`. An unanchored entropy or length rule fires
  on every one of them. Entropy is therefore only ever a second-stage filter
  behind a prefix.
- **Private or internal hostnames, and RFC1918 addresses.** This is the one decoy
  family still missed, and it is missed on purpose. A `.internal` / `.local` /
  `.corp` hostname rule fires on `topic.wardrobe.internal-function`, a committed
  taxonomy identifier in `docs/sprint-0a/sprint-0a-industry-research-pack-th.md`.
  A rule that survives that becomes an allowlist of one project's vocabulary,
  which is not a security control. A private hostname is also low-severity
  relative to a live credential.
- **Lowercase and JSON-style assignments** such as `api_key: "…"`. This
  repository's own contract-gap evidence records findings whose text contains
  exactly that shape. Detecting it means either firing on the audit trail that
  documents the gaps, or maintaining a content allowlist. Uppercase
  environment-variable style is matched instead; the lowercase gap is real and
  recorded here rather than papered over.
- **Addresses written as `mailto:name@host`.** The email rule refuses a local
  part immediately preceded by `:` or `/`, which is what stops
  `scheme://user:password@db.example.com` from being reported as an email
  address. `mailto:` is collateral of that guard.
- **Git history.** Unchanged from the superseded scanner: `.git` is not walked. A
  credential that was committed and later deleted is not detected. Closing this
  needs a history-scanning pass and a decision about what to do when one is
  found, since history cannot be edited under RFC-2026-002's no-force-push rule.
  Out of scope here and recorded as an open blocker on WP-0A-A0-003.
- **`node_modules`.** Not walked. It is gitignored and never committed.

## Why the scanner is protected root tooling

`scripts/scan-repository-secrets.mjs` is invoked by the `scan:secrets` step of
`npm run check`, which is the command CI runs and the command every role's
evidence cites. `CONTRIBUTING_AGENTS.md` ("Ownership and change control") makes
root configuration and CI protected, and requires an RFC before changing
"data/secret classification" or "CI/release policy". Both apply:

- Changing what the scanner detects changes what a green `npm run check` asserts,
  and therefore what every role's evidence means.
- Adding a PII dimension **is** a data-classification decision: it declares where
  personal data may and may not appear in this repository.
- The file and its test are digested in `test-kits/integrity-manifest.json`, so
  they cannot be edited without a visible, reviewable manifest change.

This change therefore takes the Integration Owner/RFC path rather than being made
as ordinary package work, and it does not take effect as an approved decision
until the Product Owner disposes of this RFC.

## Ownership transfer

`scripts/scan-repository-secrets.mjs` and `test-kits/secret-scan.test.mjs` are
currently declared in both `writable_paths` and `outputs.files` of
**WP-0A-A0-001**, which authored them. `scripts/validate-work-package-ownership.mjs`
exits `70` while two packages hold the same path, so the two files must move
rather than be co-owned.

**Decision:** both files transfer from WP-0A-A0-001 to **WP-0A-A0-003**.

- WP-0A-A0-001 is amended **minimally**: the two paths are removed from
  `writable_paths` and from `outputs.files`, and an `ownership.amended_by` block
  is added in the same shape as the existing WP-0A-A0-002 block already in that
  file. No status, role, gate, acceptance criterion, or delivered output of
  WP-0A-A0-001 changes, and the file is not otherwise reformatted.
- WP-0A-A0-001 **did** author these files. The removal records a boundary change,
  not a claim that it did not deliver them.
- The amendment is declared in WP-0A-A0-003's
  `ownership.authorized_cross_package_amendments`, and records
  `acknowledgement_required_from: /root/r0_steward` — WP-0A-A0-001's Integration
  Owner — with `acknowledgement_status: pending`. That run is an OpenAI Codex run
  and was not available in this session.

This follows the precedent set by RFC-2026-003 decision 2 (`package.json` moving
from WP-0A-A0-001 to WP-0A-A0-002) and ruled sufficient by independent review
there: the Integration Owner/RFC path may amend another package's manifest
without re-opening the owning package, contingent on a countersigned
acknowledgement.

`test-kits/integrity-manifest.json` is **not** transferred. It remains a
WP-0A-A0-002 output; WP-0A-A0-003 amends it only to re-digest the two files it
now owns, and declares that amendment in the same list.

## Scope explicitly excluded

Git-history scanning; secret rotation, revocation, or remediation procedure;
`.github/workflows/ci.yml`; the coverage-floor guards and the integrity manifest's
own design; contract freeze-level advancement; any other package's status;
production schema, migrations, RLS implementation, provider SDKs, credentials,
customer data, network calls; native branch protection; merge authorization; and
Gate G0 approval.

## Verification

All on pinned Node `24.20.0` / npm `11.19.0`.

- `npm run check` — must exit `0` with `skipped 0` and `todo 0`.
- `node scripts/scan-repository-secrets.mjs .` — must exit `0` on the repository
  as it stands. Also asserted from inside the suite, so a future commit that
  makes the tree trip its own scanner fails CI rather than a manual step.
- `node --test test-kits/secret-scan.test.mjs` — the decoy table (every row must
  be detected, by a named rule), the false-positive table (no row may fire), the
  fail-closed cases, and the PII policy cases.
- `node scripts/validate-work-package-ownership.mjs work-packages` — must exit
  `0`, proving the transfer leaves no path co-owned and no output uncovered.
- The before/after decoy probe is recorded in
  `evidence/WP-0A-A0-003/author-self-check.md` with real numbers and exit codes.

Every credential-shaped value in the test suite is assembled from fragments at
runtime. No file in this repository contains a literal credential-shaped string,
which is a hard requirement here: the test file is itself inside the tree the
scanner walks, and an earlier independent security review tripped the scanner
with its own evidence.

## Rollback

Revert through a reviewed revert PR. Reverting restores the five-pattern
fail-open scanner, the two-test suite, the previous digests, and the previous
ownership boundaries exactly. No persisted data, provider state, credential,
migration, or customer-data effect exists. The forward fix for a false positive
is to narrow the offending rule and add the case to the false-positive table, not
to disable the step.

## Limitations

- **A pattern scanner cannot prove the absence of secrets.** It proves that the
  declared patterns did not match the declared files at this commit. A credential
  in a format not enumerated here, split across lines, encoded, or embedded in a
  format the scanner reads as opaque bytes, passes. This is a property of the
  approach, not a defect to be closed, and evidence citing a clean scan must not
  claim more.
- Git history is still not scanned (D5).
- The email exemption in `evidence/` and `handoffs/` is a real coverage hole,
  documented above and anchored on human review rather than on tooling.
- Lowercase and JSON-style secret assignments are not matched.
- Rule length and prefix floors are calibrated to vendor formats as published at
  the time of writing. A vendor that changes a prefix or length silently defeats
  the corresponding rule, and nothing in this repository would notice.
- The scanner and its test are digested in `test-kits/integrity-manifest.json`,
  which `RFC-2026-003` records as **a tripwire with no self-anchor**: a commit
  that edits a guarded file and its digest together passes. This change inherits
  that property and does not improve it.
- This RFC does not approve Gate G0, does not authorize a merge, and does not
  substitute for the independent Reviewer, Tester, Security, or Integration Owner
  evidence RFC-2026-002 requires.


---

## Independent security review, and what an uncorrelated corpus measured

The 12/12 and 17/17 figures recorded above were real but **sample-correlated**: both
decoy sets were derived from the same two earlier probes, so they measured whether
the known-past failures were fixed, not whether the scanner is good.

Independent security review built **56 decoys deliberately outside those families**
and measured **19 detected / 37 missed**:

| Group | Detected |
|---|---|
| Cloud and platform vendors (GCP, Firebase, Twilio, SendGrid, Mailgun, Shopify, Cloudflare, DigitalOcean, Vault, GitLab, Atlassian, K8s) | 4 / 19 |
| **Meta and Stripe — this project's own G0 blockers** | **3 / 8** |
| Private-key header variants | 7 / 9 |
| Credential-carrying file formats (`.npmrc`, `.netrc`, `.pgpass`, docker auths, K8s `stringData`) | 1 / 8 |
| Encoding and layout evasion | 4 / 12 |

That is the honest number, and it is recorded in place of the flattering one.

### Fixed in response

A bare Meta page or system-user token (`EAA…`) and a Stripe restricted key (`rk_…`)
both passed. Those are the two credentials most likely to reach *this* repository,
since Meta and Stripe are its named G0 blockers. Added, with GCP service-account
private keys, Twilio SID+token pairs, SendGrid, Cloudflare tokens, `.npmrc`
`_authToken`, `.netrc` passwords, Kubernetes service-account tokens and Vault
tokens.

Two rule-shape defects were also found and fixed: `secret-named-assignment` could
not match a **glued** uppercase identifier such as `PGPASSWORD`, because the
optional prefix group had to end in `_`; and the `PGP ` alternative in the
private-key rule was **dead**, since a real armoured block reads
`PGP PRIVATE KEY BLOCK`.

### Confirmed sound by that review

Fail-closed holds across twenty cases, including dangling symlinks, symlinks
outside the tree, character devices, unix sockets and hard links — the original
fail-open read is gone. The Thai national-ID mod-11 checksum is correct **in both
directions**, verified over 20,000 valid and 180,000 invalid numbers. The PII
exemption cannot be exploited by a sibling path (`evidence-of-nothing/`,
`evidenceX/`, `docs/evidence/`, `../evidence/` are all non-exempt) and no credential
rule is relaxed by it. False positives: **0 of 18** legitimate-content cases fired.

### Recorded, not fixed

- **A Thai juristic-person tax ID has the identical 13-digit mod-11 form** and is
  reported as `thai-national-id`. Roughly 9.45% of arbitrary 13-digit runs will
  fire. This is a false-positive class the earlier analysis omitted.
- `node_modules/` and `.git/` are skipped entirely, so a **vendored** `node_modules`
  at any depth is invisible to the scan.
- A declared-binary extension holding a non-ASCII-encoded credential is silently
  clean.
- **Git history is still unscanned.**

### The limitation that does not go away

A pattern scanner cannot prove absence of secrets. 19/56 against an uncorrelated
corpus is a more honest number than 12/12 against a correlated one, and it is still
a measurement of one reviewer's imagination, not of coverage. Every number in this
RFC is a regression test against failures somebody thought to look for.


### `cloudflare-api-token` was withdrawn, not weakened

Independent security review showed the rule detected nothing the scanner did not
already catch: its named form (`CF_API_TOKEN=…`) is matched by
`secret-named-assignment`, and a bare 40-character token is indistinguishable from
any other 40-character identifier without a false-positive rate this repository
cannot carry — the tree holds 130+ hex strings of that length. The catalog test
proved it directly: the decoy was matched by `secret-named-assignment`, not by the
rule written for it.

Adding it was a rule that fired only where another rule already fired. **That is not
coverage, and counting it as a family "detected" overstated the improvement.** It is
removed rather than kept for the count. A Cloudflare token in an unnamed position
remains undetected, and is recorded as such.
