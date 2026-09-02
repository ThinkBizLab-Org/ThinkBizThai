# WP-0A-A0-003 — Author self-check

Package: WP-0A-A0-003 — Repository secret-scan strengthening and privacy dimension
Author run: `/claude/a0_atlas`
Decision record: `architecture/decisions/RFC-2026-005-secret-scan-strengthening.md` (Status: **Proposed**)
Status claimed by this document: **author_complete only.** This is not review, not
test verification, and not integration. The Author does not approve, test-verify,
or integrate their own work.

## Toolchain — disclosure

The machine this package was authored on had **no Node 24.20.0 installed**;
`node --version` on the system PATH reported `v26.7.0` (Homebrew), and no version
manager (`nvm`, `fnm`, `mise`, `asdf`, `volta`) was present. `npm run check`
would have exited `68` at `verify-toolchain`.

The pinned runtime was therefore obtained for this session only: the official
`node-v24.20.0-darwin-arm64.tar.gz` was downloaded from `nodejs.org/dist`, its
SHA-256 verified against the official `SHASUMS256.txt` for that release
(`shasum -a 256 -c` → `OK`, digest `40e5607e…`), unpacked into a scratchpad
directory outside the repository, and prepended to `PATH`. Nothing was installed
system-wide and nothing was added to the repository. Every command below ran
under that runtime:

```
node --version   -> v24.20.0
npm --version    -> 11.19.0
```

This is a deviation worth an independent tester's attention: the results below are
reproducible only on the pinned toolchain, and the tester should obtain it
independently rather than trusting this session's copy.

## What changed

| File | Change |
|---|---|
| `architecture/decisions/RFC-2026-005-secret-scan-strengthening.md` | New. Problem, decision, PII policy, declined scope, ownership transfer, verification, rollback, limitations. |
| `scripts/scan-repository-secrets.mjs` | Rewritten. 5 → **21** credential rules, **3** privacy rules, fail-closed reads, exit `70`/`71`. |
| `test-kits/secret-scan.test.mjs` | Rewritten. 2 → **23** tests: decoy table, false-positive table, fail-closed cases, PII policy cases. |
| `work-packages/WP-0A-A0-003.json` | New. Status `backlog`. |
| `work-packages/WP-0A-A0-001.json` | **Amended, minimally.** See below. |
| `test-kits/integrity-manifest.json` | Two digests recomputed. No entry added or removed. |
| `evidence/WP-0A-A0-003/author-self-check.md` | This file. |

## Measured before/after — the decoy probe

The probe harness lives **outside** the repository copy and was run against both
scanners with identical inputs. Each decoy was written to a `.env.production` in
its own directory and scanned alone.

**The "before" scanner is provably the committed one.** The repository was
supplied as a source extraction with no `.git`, so the superseded file was
reconstructed and then verified byte-identical to the committed artifact through
its recorded digest in `test-kits/integrity-manifest.json`:

```
reconstructed sha256 : 46bc22c3ba32dc4c07d0b3b4d2f4d3c43b79ce026f33855c40a2b58033a44a08
manifest  sha256     : 46bc22c3ba32dc4c07d0b3b4d2f4d3c43b79ce026f33855c40a2b58033a44a08
```

Result:

```
--- OLD scanner (as extracted, sha256 46bc22c3…) ---
detected 1/14
missed: openai-project-key, anthropic-api-key, google-api-key, slack-bot-token,
        json-web-token, postgres-dsn-inline-password, db-password-assignment,
        api-key-assignment, azure-connection-string, thai-national-id,
        thai-phone-number, private-internal-hostname, email-address
unreadable-file behaviour: FAILS OPEN (reported clean)

--- NEW scanner (WP-0A-A0-003) ---
detected 13/14
missed: private-internal-hostname
unreadable-file behaviour: FAILS CLOSED
```

**1/14 → 13/14.** The single remaining miss is declined deliberately, not
overlooked; see "What I chose not to detect". The only decoy the superseded
scanner caught was the AWS control, which is one of its five patterns.

The `unreadable-file` line is the D3 probe: a file whose contents **do** match a
pattern, made unreadable. The superseded scanner returned no findings and would
have exited `0`. This is the reason the rewrite exists.

## Commands and real exit codes

All under `node v24.20.0` / `npm 11.19.0`, from the repository root.

| Command | Exit |
|---|---|
| `node --version` (→ `v24.20.0`) | `0` |
| `npm --version` (→ `11.19.0`) | `0` |
| `node scripts/verify-toolchain.mjs` | `0` |
| `node scripts/scan-repository-secrets.mjs .` | `0` |
| `node scripts/validate-work-packages.mjs` | `0` |
| `node scripts/validate-capability-profiles.mjs` | `0` |
| `node scripts/validate-work-package-ownership.mjs work-packages` | `0` |
| `node scripts/validate-work-package-role-separation.mjs work-packages/WP-0A-A0-003.json` | `0` |
| `node scripts/validate-work-package-role-separation.mjs work-packages/WP-0A-A0-001.json` | `0` |
| `node scripts/verify-test-coverage-floor.mjs` | `0` |
| `node --test test-kits/secret-scan.test.mjs` | `0` |
| `npm run check` | `0` |

`npm run check` final summary, verbatim:

```
ℹ tests 106
ℹ suites 0
ℹ pass 106
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
```

**106 tests, 106 passing, skipped 0, todo 0.** Baseline before this package was
85 (2 of them the superseded secret-scan tests); 85 − 2 + 23 = 106, and the
runner's own declaration-versus-execution reconciliation agrees, so no test is
declared-but-unexecuted.

### Negative controls — the scan actually fails when it should

A green scan means nothing unless the scanner can be made to fail. Each of these
was run against a temporary directory:

| Injected condition | Output | Exit |
|---|---|---|
| Synthetic AWS access key id | `credential: aws-access-key-id` | `70` |
| Checksum-valid invented Thai national ID | `pii: thai-national-id` | `70` |
| Readable→unreadable file containing a matching pattern | `unscannable: unreadable-file (EACCES)` | `71` |
| File that is not valid UTF-8 | `unscannable: undecodable-file` | `71` |

### Integrity manifest

All 26 digests were recomputed over file **bytes**. Exactly two changed:

```
scripts/scan-repository-secrets.mjs -> 81334aa9584968b385efb7a3ed93e56f21208240fb5b3fd8aaac4a37e033b38b
test-kits/secret-scan.test.mjs      -> d1107a11ac154106d789b41ac0a4f52faf9deb887b6b790cb025af8ce5623cb9
```

That exactly two changed is itself evidence that no other protected file was
touched. Before the manifest was updated, `npm run check` failed at exit `86`
naming both files — the tripwire behaved as designed.

No test file was added, so no manifest entry was added; the exit-`87` "every
discovered test file must be digested" rule is already satisfied.

### Performance

`node scripts/scan-repository-secrets.mjs .` over 246 files / 2,682,562 bytes:
`real 0.06s`, `0.06s`, `0.06s` across three runs. The superseded scanner ran in
well under a second and so does this one; 24 rules over 2.6 MB is not a CI cost.

## The WP-0A-A0-001 amendment is minimal — proved, not asserted

Structural comparison of the manifest before and after the path removals reports
that the **only** fields that differ are the two intended ones:

```
fields differing: [ '.ownership.writable_paths', '.outputs.files' ]
writable_paths 45 -> 43   removed: scripts/scan-repository-secrets.mjs, test-kits/secret-scan.test.mjs
outputs.files  83 -> 81   removed: scripts/scan-repository-secrets.mjs, test-kits/secret-scan.test.mjs
```

The textual diff is exactly four deleted lines. `status` remains
`integration_verified`; no role, gate, acceptance criterion, or other output
changed, and the file was not reformatted.

One shape change was unavoidable and is flagged for the reviewer:
`ownership.amended_by` was a single object recording the WP-0A-A0-002 amendment.
JSON cannot carry a duplicate key, so it is now an **array** of two amendment
records; the first record's content is unchanged, and an `_amended_by_shape_note`
field states why. If the reviewer prefers a different representation, this is the
line to change.

`deterministic_commands.verify` in WP-0A-A0-001 still names
`node scripts/scan-repository-secrets.mjs`. That is a record of a command that
package ran, not an ownership declaration, so it was left alone.

## What I chose NOT to detect, and why

Every one of these is a decision measured against this repository's actual
contents. A rule that fires on the committed tree gets the whole step switched
off, which is worse than not having the rule.

1. **Bare high-entropy or long-random strings.** The tree contains **130 distinct
   40- and 64-character lowercase-hex strings** — git SHAs and the sha256 digests
   in the integrity manifest. An unanchored entropy or length rule fires on every
   one. Entropy is used **only** as a second-stage filter behind a vendor prefix.
2. **Private/internal hostnames and RFC1918 addresses.** The one decoy still
   missed. A `.internal`/`.local`/`.corp` rule matches
   `topic.wardrobe.internal-function`, a committed taxonomy identifier in
   `docs/sprint-0a/sprint-0a-industry-research-pack-th.md`. Surviving that means
   allowlisting one project's vocabulary, which is not a security control. A
   private hostname is also low-severity next to a live credential.
3. **Lowercase / JSON-style assignments** such as `api_key: "…"`. This
   repository's own contract-gap evidence contains that exact shape as prose
   (`evidence/WP-0A-CON-002/test-verdict.md`). Detecting it means firing on the
   audit trail that documents the gaps. Uppercase environment-variable style is
   matched instead. **This is a real gap**, recorded rather than papered over.
4. **`mailto:name@host`.** The email rule refuses a local part immediately
   preceded by `:` or `/`, which is what stops
   `scheme://user:password@db.example.com` from being reported as an email
   address. `mailto:` is collateral of that guard.
5. **Git history.** Unchanged: `.git` is not walked. A credential committed and
   later deleted is invisible. Closing this needs a history pass **and** a policy
   for what to do on a hit, since history cannot be rewritten under
   RFC-2026-002's no-force-push rule. Recorded as an open blocker.
6. **`node_modules`.** Not walked; gitignored and never committed.

## False-positive policy

The rule is: **a first stage that is a bare prefix plus a length floor does not
ship without a second stage.** Concretely —

- Entropy floor (≥ 3 bits/char) on the legacy OpenAI rule, so a long repetitive
  token does not match.
- Mod-11 check digit on Thai national IDs, which rejects roughly nine in ten
  accidental 13-digit runs, plus a repeated-digit filler check.
- Minimum 8-character password on the DSN rule. This is what keeps the
  illustrative `postgres://u:p@h/db` in committed gap evidence from matching.
- Three-segment requirement on JWTs, so the two-segment `eyJ…`-shaped string in
  committed evidence does not match.
- Placeholder and template rejection on assignment and DSN values (`${…}`,
  `{{…}}`, `<…>`, `changeme`, `your-…`, `…_here`, `xxxx`). Anchored end to end, so
  a real credential that merely *contains* the word "synthetic" is still reported.

The false-positive table in the suite contains **19 rows**, several lifted
verbatim from committed prose in this repository, and asserts that none fires. A
separate test scans **the repository itself** and asserts zero findings, so a
future commit that makes the tree trip its own scanner fails CI rather than
waiting for someone to run the step by hand.

Forward fix for a false positive: narrow the offending rule and add the case to
the table. Never disable the `scan:secrets` step.

## PII policy adopted

| Rule | Scope | Rationale |
|---|---|---|
| Thai national ID (mod-11 valid) | **Everywhere, no exemption** | `CONTRIBUTING_AGENTS.md` forbids customer PII repository-wide with no carve-out; no legitimate specification artifact needs a checksum-valid national ID. |
| Thai phone number | **Everywhere, no exemption** | Same. |
| Email address | Everywhere **except** `evidence/**` and `handoffs/**` | Those are the canonical audit trail; git author metadata and role-run attribution legitimately carry an address there. |

The exemption is one rule, two path prefixes, nothing else. A credential inside
evidence prose is still reported, and a Thai ID or phone number inside evidence
prose is still reported. All four properties are regression-tested.

**Why it does not fire on the existing tree — measured, not assumed.** The
strongest form of this claim is the one that was executed rather than argued:
with `PII_PROSE_PREFIXES` set to `[]` — the exemption entirely removed — a scan
of the final tree returns **0 findings**. The exemption is therefore doing **no
work at all** on this repository. It is a forward-looking allowance for evidence
the project will accumulate, not an adjustment made to get a green scan. An
independent reviewer can reproduce this in one line by emptying that constant and
re-running the scan.

The underlying counts, stated precisely rather than roundly:

- **The tree as extracted (243 files) contained no email address at all**, in
  `evidence/` or anywhere else, and no 13-digit run and no Thai-phone-shaped
  string of any kind. Verified by grep before the rules were written.
- **The final tree (246 files) is not literally at zero for a loose grep, and the
  difference is entirely my own new files.** A permissive email grep now matches
  three occurrences of one illustrative string,
  `scheme://user:password@db.example.com`, which appears once each in the
  scanner's own comment, the RFC, and this document to explain the `(?<![:/])`
  guard. The scanner deliberately does not match it — refusing that shape is the
  whole point of the guard — so it is a grep artifact, not an address. A grep for
  13-digit runs likewise matches two values in
  `test-kits/secret-scan.test.mjs`: the deliberate wrong-check-digit and
  repeated-filler fixtures in the false-positive table, both of which the mod-11
  rule correctly rejects.

No real or plausible email address, national ID, or phone number was introduced
by this package.

## Limitations — stated plainly

1. **A pattern scanner cannot prove the absence of secrets.** It proves that the
   declared patterns did not match the declared files at this commit. 13/14 on a
   decoy table I wrote is not a coverage measurement; it is a regression test
   against the specific failures two independent probes found. A credential in an
   unenumerated format, split across lines, encoded, or embedded in opaque bytes
   passes. Evidence citing a clean scan must not claim more than this, and
   `npm run check` exiting `0` is still **not** evidence of secret coverage.
2. **Git history is not scanned.**
3. **The email exemption is a real hole** in `evidence/` and `handoffs/`, anchored
   on human review of the diff under RFC-2026-002, not on tooling.
4. **Lowercase/JSON-style secret assignments are not matched.**
5. **Private and internal hostnames are not detected.**
6. **Vendor formats drift.** Prefixes and length floors are calibrated to formats
   published at the time of writing. A vendor that silently changes one defeats
   the corresponding rule and nothing here would notice.
7. **The decoy table is my own.** It was built from the families the two prior
   probes used, so it is biased toward known-past failures. An independent tester
   should probe with decoys I did not write — that is the point of the
   independent role, and it is the check this document cannot perform on itself.
8. **The integrity manifest remains a tripwire with no self-anchor**
   (RFC-2026-003). A commit that edits a guarded file and its digest together
   passes; this package does both and does not improve that property.
9. **The ownership transfer is staged, not authorized.** RFC-2026-005 is
   `Proposed`. WP-0A-A0-001's Integration Owner `/root/r0_steward` is an OpenAI
   Codex run that was not available in this session; both amendment records carry
   `acknowledgement_status: pending`.
10. **Single-vendor review.** Every assigned run is Anthropic `claude-opus-5`.
    Recorded as `independence.cross_vendor_exception`, not waived. Runs sharing a
    vendor and a model share a correlated blind spot — which is exactly the risk
    for a package whose subject is "what did the last review fail to notice".
11. **Gate G0** remains Specification Baseline Complete / External Verification
    Pending. Nothing here approves it, authorizes a merge, or substitutes for the
    independent Reviewer, Tester, Security, or Integration Owner evidence
    RFC-2026-002 requires.

## Recommended next step

Independent security review (`/claude/a1_bastion`) and independent test
(`/claude/q0_sentinel`), both instructed to probe the scanner with decoys **not**
present in `test-kits/secret-scan.test.mjs`, and to attempt to make the scanner
report clean on a file that contains a credential.
