# WP-0A-A0-003 — Independent contract and architecture review

**This document is Reviewer evidence only.** It is not Tester, Security/Privacy, Integration
Owner, or Product Owner evidence. It does not dispose of RFC-2026-005, does not advance the
package status, does not approve Gate G0, and does not authorize a merge.

| Field | Value |
|---|---|
| Role | Independent Reviewer (contract / architecture) |
| `agent_run_id` | `/claude/c0_contract_reviewer` |
| Capability profile | `.agents/capability-profiles/cc-c0-contract-reviewer.json` |
| Package | WP-0A-A0-003 — Repository secret-scan strengthening and privacy dimension |
| Author (not me) | `/claude/a0_atlas` |
| Revision reviewed | `1478f34edc8c61a5a004610e5cb9f298b5562e98` (current `main`) |
| Review branch | `agent/claude/WP-0A-A0-003-review-c0`, cut from that commit |
| Toolchain | Node `v24.20.0`, npm `11.19.0` |
| Date | 2026-09-04 |
| **Verdict** | **`changes_required`** — one blocking finding, R1. See §7. |

## 0. What this review is, and the two things that limit it

The package sits at `in_review` with its work already merged into `main`, carrying a
Security verdict from `/claude/a1_bastion` and **no Reviewer and no Tester verdict**. I
supply the Reviewer half. A separate run supplies the Tester half concurrently; I did not
do its job and this document makes no test-verification claim.

The reviewed head recorded in `handoffs/WP-0A-A0-003-author-handoff.json`
(`7cdd4198dfb43f6a51a49ca7482182f73c68d5c5`) is **211 commits behind `main`**:

```
$ git rev-list --count 7cdd4198dfb43f6a51a49ca7482182f73c68d5c5..HEAD
211
```

`scripts/scan-repository-secrets.mjs` has changed three times since that head (`dcb3ffc`,
`07ea626`, `de579f7`) and `test-kits/secret-scan.test.mjs` twice (`dcb3ffc`, `7981725`).
None of the three owned paths has *moved location* — all three are exactly where the
manifest declares them — but their contents are not the contents any prior verdict saw.
**This is therefore a review of the tree as it stands, not a delta check against an older
verdict.** I re-derived every number I report rather than inheriting one.

Two limits I have to state before anything else:

1. **`prefer_cross_vendor_review` is not satisfied, and I am part of why.** I am an
   Anthropic `claude-opus-5` run, the same vendor and model as the Author. The manifest
   records this as an exception rather than a waiver. It is worth as much as that: a
   reviewer sharing a vendor and a model with the author shares a correlated blind spot,
   and nothing in this document escapes that.
2. **`.agents/capability-profiles/cc-c0-contract-reviewer.json` records
   `accepted_work_package: "WP-0A-A0-002"`.** It is stale with respect to this acceptance.
   `.agents/**` is `read_only` for this package, so I did not touch it. Named, not fixed —
   see R7.

## 1. Environment, and one refusal to record plainly

`CONTRIBUTING_AGENTS.md` requires repository-declared commands on the pinned toolchain via a
login shell. **`zsh -lc` was refused by this worktree's harness**, exactly as the briefing
warned it had been twice before:

```
$ zsh -lc 'node --version; npm --version'
This agent is isolated in the worktree …; this command runs zsh in a plain command;
what it reads or is handed as shell text cannot be shown not to run git. Refusing to run it
```

I ran `node` and `npm` directly instead, and confirmed the toolchain is the pinned one before
running anything else. **I substituted nothing else** — no alternative package manager, no
system Node, no global tool, no network:

```
$ node --version
v24.20.0
$ npm --version
11.19.0
$ which node
/Users/bank/.local/node-v24.20.0/bin/node
$ which npm
/Users/bank/.local/node-v24.20.0/bin/npm
```

Every credential specimen in this review was **assembled from fragments at runtime**, inside
probe scripts held **outside the repository tree** (`…/scratchpad/probe/`). Nothing
credential-shaped is written literally anywhere in this file or anywhere else in the tree.
Gate G0 held throughout: synthetic only, no provider integration, no network, no real
credential.

### `npm run verify` — before

```
$ npm run verify
> thinkbizthai@0.0.0 verify
> node scripts/verify-clean-run.mjs

clean: exit 0 — tests 260, pass 260, fail 0, skipped 0, todo 0
```

### The package's own declared evidence commands

```
$ node scripts/scan-repository-secrets.mjs .
scan:secrets exit 0

$ node --test test-kits/secret-scan.test.mjs
ℹ tests 46
ℹ pass 46
ℹ fail 0
ℹ skipped 0
ℹ todo 0

$ node scripts/validate-work-package-ownership.mjs work-packages          → exit 0
$ node scripts/validate-work-package-role-separation.mjs work-packages/WP-0A-A0-003.json → exit 0
$ node scripts/validate-capability-profiles.mjs                            → exit 0
$ node scripts/verify-test-coverage-floor.mjs                              → exit 0
```

All declared commands pass at this revision. That is the starting point of the review, not
its conclusion.

## 2. Re-measuring the 12-of-15 figure

A Security disposition dated 2026-09-03
(`evidence/WP-0A-CON-004/security-disposition-handle-ownership-a1.md`, Probe 3) measured
this scanner against 15 credential bodies that `CTR-SEC-001`'s handle pattern
(`^secret:[a-z0-9._-]+$`, `maxLength` 128) admits, and reported **12 detected**. That
number now also stands inside
`contract-catalog/shared-kernel/ctr-sec-001/schema.json` (`x-opacity-limitation`), where it
replaced four sentences claiming the schema and the scanner "compose to zero coverage".

I did not inherit it. I rebuilt all fifteen bodies from fragments at runtime with a seeded
PRNG, embedded each in a JSON line as a contract fixture would carry it, and passed it to
the scanner's own `scanText`:

```
handle-body family                 SEC-001  len  scanner rule(s)
stripe secret key                  PASS     43   stripe-secret-key
stripe restricted key              PASS     45   stripe-restricted-key
stripe webhook secret              PASS     37   stripe-webhook-secret
github token                       PASS     47   github-token
github fine-grained pat            PASS     68   github-fine-grained-pat
npm access token                   PASS     47   npm-access-token
openai project key                 PASS     41   openai-project-key
anthropic api key                  PASS     56   anthropic-api-key
openai legacy key                  PASS     44   openai-legacy-key
slack bot token                    PASS     42   slack-token
slack app token                    PASS     44   slack-app-token
vault token                        PASS     43   vault-token
bare 32 lowercase hex              PASS     39   -
lowercase base32                   PASS     39   -
human passphrase                   PASS     40   -

admitted by CTR-SEC-001 handle pattern: 15; of those, scanner fired on: 12
```

**The figure reproduces exactly, and rule-for-rule.** Twelve of fifteen, each detected by
the specific rule the disposition names — not by a different rule that happens to overlap.
It is not wrong in either direction. The correction that landed on 2026-09-03 stands, and
the "compose to zero coverage" sentences it replaced were indeed false in the alarming
direction.

I also confirmed the residual three are the lowercase-canonical shapes the disposition
names: bare 32-hex, lowercase base32, and a human passphrase. Nothing in the current rule
set reaches any of them, and nothing should try to without a prefix to anchor on — the tree
holds 130+ hex strings of exactly those lengths.

**One defect in the corrected text itself, which nobody has named.** The correction landed
badly. `x-opacity-limitation` now reads:

> "…measured the repository secret scanner … against 15 credential bodies this pattern
> admits and it detected 12. excludes every format carrying a mandatory uppercase
> character…"

A sentence fragment beginning in lowercase with a dangling verb, and the 12-of-15 figure is
then stated a second time in the same property. The substance is right; the sentence is
broken. That file belongs to WP-0A-CON-004 and is not mine to edit. **Named, not fixed** —
R8.

## 3. Does the scanner detect what the RFC claims?

RFC-2026-005 decision 1 claims thirty credential rules; the delivered set is thirty
credential rules and four privacy rules. I built **one independently constructed specimen
per rule** — not the suite's decoys, mine — and required the **specific named rule** to
fire:

```
declared rules: 30 credential + 4 privacy = 34
…
34/34 rules fired on an independently constructed specimen.
```

Every rule the RFC claims is live and reachable, including the four rules
(`meta-access-token`, `stripe-restricted-key`, `gcp-service-account-key`, and the
`payment-card-number` privacy rule added later by WP-0A-A0-005) that matter most to this
project's own named G0 blockers. Only one specimen produced a second hit —
`gcp-service-account-key` also fires `pem-private-key`, which is correct, since the
specimen genuinely contains a PEM armour header.

**The RFC's own invited reproduction still holds.** RFC-2026-005 says a reviewer can empty
`PII_PROSE_PREFIXES` in one line and confirm the email exemption is load-bearing for zero
files. Two hundred and eleven commits later:

```
PII_PROSE_PREFIXES = []  ->  0 finding(s)
```

That claim has survived the intervening work. It is worth recording that it did.

### Where the boundary actually is

I probed seventeen credential families deliberately outside anything the RFC names, plus
five shapes the RFC explicitly declines:

```
lowercase json-style assignment (declined in the RFC)      not detected
private hostname (declined in the RFC)                     not detected
mailto: address (declined in the RFC)                      not detected
credential split across a line break (declared limitation) not detected
credential base64-encoded (declared limitation)            not detected
-- families outside any declared rule --
GitLab personal access token                               not detected
DigitalOcean personal access token                         not detected
Shopify admin API access token                             not detected
Mailgun private API key                                    not detected
Atlassian / Jira API token                                 not detected
Datadog API key                                            not detected
Square access token                                        DETECTED (meta-access-token)
PayPal client secret assignment (lowercase)                not detected
Heroku API key (a bare UUID)                               not detected
Algolia admin key (bare 32 lowercase hex)                  not detected
Docker config auths (base64 of user:password)              not detected
Kubernetes Secret stringData (lowercase key)               not detected
.pgpass line                                               not detected
SSH private key in OpenSSH new format, body only           not detected
Azure AD client secret (assignment, lowercase)             not detected
a generic 64-char lowercase-hex HMAC signing secret        not detected
Thai juristic-person tax ID (same 13-digit mod-11 form)    DETECTED (thai-national-id)
```

**One of seventeen new families detected, and it is not coverage.** A Square access token
begins with the same three characters as a Meta token, so `meta-access-token` fires on it
by coincidence — the exact "coincidental prefix hit" the manifest's first open blocker
already names. The other detection is a *false positive*: a Thai juristic-person tax ID
shares the identical 13-digit mod-11 form as a national ID and is reported as one.

This independently corroborates open blockers 1 and 3: **the improvement is real but
narrow.** Each round of measurement fixes the round before it. Every declined family above
is declined for a reason the RFC states and I agree with; the point is not that the
declines are wrong, it is that the *shape* of the coverage is "families somebody thought to
name", and no amount of widening changes that. RFC-2026-005's own limitation section says
so, correctly and without flattery, and evidence citing a green `scan:secrets` must not
claim more. That is a property of the approach, not a defect.

## 4. Does the suite test behaviour, or pin text?

This is the question the briefing puts most weight on, and it is the right one. I mutated
the scanner in **disposable copies** — never the worktree — and asked whether the suite
notices. A **control run against an unmutated copy passes**, so a failure below is the
mutation and not the copy.

### Batch 1 — detection. 14 of 15 caught.

| # | Mutation | Result |
|---|---|---|
| M1 | delete the `meta-access-token` rule | caught |
| M2 | gut `scanText`: return no hits, ever | caught |
| M3 | re-introduce the fail-open read | caught |
| M4 | disable the Thai national ID checksum | caught |
| M5 | add `evidence`, `handoffs`, `docs`, `contract-catalog` to the walk's skip list | caught |
| M6 | `exitCodeFor` always returns 0 | caught |
| M7 | follow symlinks silently | caught |
| M8 | loosen the `openai-legacy-key` entropy filter | caught |
| M9 | remove the oversize-file finding | caught |
| M10 | exempt every path from the prose-exempt rule | caught |
| M11 | widen `stripe-secret-key` from a 16-char floor to 1 | **survived** |
| M12 | stop reporting undecodable files | caught |
| M13 | drop the payment-card issuer-prefix test, keep Luhn | caught |
| M14 | delete the whole PII rule set | caught |
| M15 | stop reporting an unlistable directory | caught |

**This is a genuinely strong suite, and I want to say so plainly.** Fourteen of fifteen
attacks on detection were caught, including every one that would have re-opened a
previously recorded defect. M5 in particular was caught by the right test —
`every credential rule fires in every path shape, whatever the scanner has been told to
skip` — which is the outcome-pinning test the Author added after a prior review shipped a
credential through a one-line carve-out. It works. It is behaviour, not text.

### Batch 2 — precision, and carve-outs aimed elsewhere. 6 of 14 caught.

| # | Mutation | Result |
|---|---|---|
| P1 | `github-token` length floor 20 → 1 | **survived** |
| P2 | `google-api-key` length floor 35 → 4 | **survived** |
| P3 | `npm-access-token` exact 36 → 4+ | **survived** |
| P4 | accept a two-segment JWT shape | caught |
| P5 | database-URL password floor 8 → 1 | **survived** |
| P6 | drop the email lookbehind that keeps DSNs from reading as addresses | caught |
| P7 | secret-named-assignment value floor 8 → 1 | caught |
| P8 | `isPlaceholderValue` never excuses anything | caught |
| P9 | drop the Thai-phone length/prefix second stage | **survived** |
| C1 | skip `scripts/`, `architecture/`, `runbooks/`, `work-packages/`, `test-kits/` in the walk | **survived** |
| C2 | `scanText` carve-out for `architecture/` | **survived** |
| C3 | `scanText` carve-out for any `.json` file | caught |
| C4 | silently skip any file over 4 KB | **survived** |
| C5 | skip any directory nested three or more deep | caught |

The five surviving **precision** mutations (P1, P2, P3, P5, P9) are all *widenings*: they
make the scanner noisier, not blinder. The false-positive table pins shapes, not length
floors, so a floor can be loosened silently. The consequence is CI noise, which announces
itself the moment it happens, so I rate this **low** (R3).

The three surviving **carve-out** mutations are a different matter.

## 5. The blocking finding: the path-shape guard is enumerated, not general

`test-kits/secret-scan.test.mjs:744` is the test written to close this exact class. Its own
comment states the problem correctly:

> "Independent review twenty-two inserted ONE line into `scanText` … and shipped an AWS key
> pair with **no test file touched** … **Pinning which lines are load-bearing is not the
> same as pinning the outcome.**"

It then pins the outcome across a **hardcoded list of five path shapes**:

```js
const shapes = [
  'leak.txt',
  'evidence/WP-0A-CON-008/leak.txt',
  'handoffs/leak.txt',
  'docs/nested/deeper/leak.txt',
  'contract-catalog/shared-kernel/ctr-sec-001/leak.txt',
];
```

`architecture/` is not among them. Neither is `scripts/`, `runbooks/`, `work-packages/`,
`test-kits/`, `.github/`, or `.agents/`. The guard is an allowlist of five prefixes, so a
carve-out aimed at a sixth is invisible to it — which is the same shape of defect as the
one it was written to close, one level up.

I did not stop at "a mutation survived". I demonstrated it end to end.

**Step 1 — the carve-out survives the secret-scan suite:**
five words inserted into `scanText`,
`if (relativePath.startsWith('architecture/')) return [];` — 46/46 tests still pass.

**Step 2 — a credential planted under `architecture/` is then invisible:**

```
C2: planted an AWS-key-id-shaped value at architecture/decisions/notes.md (21 bytes)
   unmutated scanner -> 1 finding(s): architecture/decisions/notes.md:aws-access-key-id
   mutated scanner   -> 0 finding(s): NONE
```

**Step 3 — it survives the whole declared verification, not just this suite.** The
integrity manifest is a tripwire with no self-anchor (RFC-2026-003, and the manifest's own
open blocker 12), so the honest test regenerates the digest the way a real author does:

```
D  architecture/ carve-out, nothing planted
   -> npm run check EXIT 0
```

**Step 4 — with the credential actually planted in an existing file.** Adding a *new* file
under `architecture/decisions/` is caught, but by an unrelated guard that enumerates the set
of decision records, not by anything about secrets. So I appended the credential to an
existing decision record instead — the shape a real leak takes:

```
G  credential appended to an existing architecture/ file, scanner UNMUTATED
   -> npm run check exit 70
      credential: aws-access-key-id — architecture/decisions/RFC-2026-005-secret-scan-strengthening.md

H  the same, with the architecture/ carve-out in the scanner + digest regenerated
   -> npm run check EXIT 0  <-- the credential shipped
```

A five-word edit plus the `regenerate:manifest` step an author runs anyway ships an
AWS-key-shaped credential inside the directory that holds every decision record in this
repository, with `npm run check` green and every test passing. The ratchet in
`test-kits/ratchets-bite.test.mjs:326` does not help: it pins **two named source edits** to
the scanner, which is precisely the "pinning which lines are load-bearing" the path-shape
test's own comment rejects.

The size-based carve-out (C4) is worse in reach and needs no path at all:

```
C4: planted an AWS-key-id-shaped value at scripts/notes.txt (500 filler lines, 6021 bytes)
   unmutated scanner -> 1 finding(s): scripts/notes.txt:aws-access-key-id
   mutated scanner   -> 0 finding(s): NONE

repository files walked: 1002 (5140409 bytes)
files larger than 4 KB: 206 (20.6% of files, 87.6% of bytes)
```

A silent 4 KB skip hides **87.6% of the repository's bytes** and the suite stays green.

### The remedy, and proof that it works

Three assertions, all inside this package's own writable path
(`test-kits/secret-scan.test.mjs`), none of which enumerates a prefix. I wrote them, applied
them to disposable copies only, and re-ran the three surviving mutations:

- **A. No credential rule may depend on where the file is.** Derive the path shapes from
  the repository's actual top-level directories at run time and require `scanText` to
  return the rule id for every one of them.
- **B. A planted credential is reported whatever the file size or its offset.** Plant one
  at 0 / 8 / 64 / 512 KiB of padding, at the head and at the tail, and require a finding
  each time.
- **C. The walk reaches every directory this repository actually has.** Mirror the real
  top-level directory names into a temp tree, plant one credential under each, and require
  each to be reported.

```
C1 skip scripts/, architecture/, runbooks/ ... in the walk
   -> caught by: PROPOSED C: the walk reaches every directory this repository actually has

C2 scanText carve-out for architecture/
   -> caught by: PROPOSED A | PROPOSED C

C4 silent 4 KB size skip
   -> caught by: PROPOSED B: a planted credential is reported whatever the file size or its offset

CONTROL no mutation at all
   -> suite passes (as it must)
```

All three caught; the control stays green. The remedy is verified, cheap, and lives
entirely inside a path this package already owns. I have deliberately **not** applied it:
`test-kits/**` is outside `evidence/WP-0A-A0-003/**`, and a reviewer who edits the artifact
under review stops being a reviewer.

## 6. Path coverage and fail-closed behaviour

Executed against the real, unmutated scanner:

```
1 credential inside .git/ and a vendored node_modules/     exit 0  (no findings)
2 credential in .github/ and in a dotfile                  exit 70  .env.local:aws-access-key-id, .github/workflows/ci.yml:aws-access-key-id
3 unreadable file (chmod 000; really unreadable: true)     exit 71  locked.txt:unreadable-file
4 unlistable directory (chmod 000)                         exit 71  sealed:unreadable-directory
5 symlink out of the tree, and a dangling symlink          exit 71  dangling.txt:unscannable-symlink, link-out.txt:unscannable-symlink
6 undecodable (non-UTF-8) file carrying an ASCII credential exit 70  blob.dat:aws-access-key-id, blob.dat:undecodable-file
8 a 40 MB file against a 1 KB limit                        exit 71  big.txt:oversize-file
9 an AWS key id split across a line break                  exit 0  (no findings)
11 CLI on a clean tree -> exit 0
11 CLI on a tree with a credential -> exit 70
```

Fail-closed **holds**, in every case I could construct: unreadable file, unlistable
directory, symlink inside and outside the tree, dangling symlink, undecodable file,
oversize file. Each is a finding, each yields exit 71, and the undecodable file is reported
**and still scanned** — a credential inside it is reported as well. Hidden directories and
dotfiles other than `.git` are walked; `.github/workflows/ci.yml` and `.env.local` were
both reported. The two exit codes separate correctly. This is the part of the change that
is unambiguously good and I could not break it.

Binary media is scanned as `latin1`, as the source comment claims:

```
binary media, key separated by a non-word byte:
  a.png    aws-access-key-id
  b.pdf    NO FINDING
  c.zip    aws-access-key-id
```

`b.pdf` holds the same credential encoded UTF-16LE, which the RFC already records as a
declared miss. **A correction to my own work:** my first run of this probe reported `.png`
as a miss. That was my error — I had glued the specimen directly onto the `PNG` signature
bytes, which removes the word boundary the rule requires. The scanner was right and my
probe was wrong. I am recording that rather than quietly dropping it.

Silent skips confirmed: `.git/` and `node_modules/` are skipped with **no finding of any
kind** (exit 0 over a set never traversed), which is manifest open blocker 4 and
RFC-2026-005 D5 / "Recorded, not fixed", both accurate.

### One thing the walk gets wrong

```
8 a 40 MB file against a 1 KB limit  → exit 71  big.txt:oversize-file
   MAX_FILE_BYTES = 8388608; RSS grew 40.1 MB while "refusing" to read it
```

The source states the rationale:

> "Reading an arbitrarily large file into memory is a denial-of-service on CI, but silently
> truncating one is a coverage hole. An oversize file is therefore a finding."

The code reads the whole file **first** and checks the size **after**:

```js
bytes = await readFile(file);          // whole file into memory
…
if (bytes.length > maxFileBytes) {     // size checked here
```

The coverage half of that comment is delivered — an oversize file is a finding, not a
truncation. The denial-of-service half is not delivered at all: I measured resident memory
growing by 40.1 MB while the scanner "refused" to read a 40 MB file. `MAX_FILE_BYTES`
provides no protection against the failure mode it names. **R2**, medium-low: the remedy is
a `stat` before the `readFile`, one line, inside this package's own writable path.

## 7. Findings

| # | Severity | Finding |
|---|---|---|
| **R1** | **High — blocking** | The path-shape guard (`secret-scan.test.mjs:744`) pins the outcome across **five hardcoded prefixes**. A `scanText` carve-out aimed at a sixth (`architecture/`, `scripts/`, `runbooks/`, `work-packages/`, `.github/`, `.agents/`), or a silent size-based skip, survives the suite **and the whole of `npm run check`**, shipping a planted credential at exit 0 (§5, steps D and H). This is the defect class the test itself was written to close, one level up, and this repository has recorded it recurring. Remedy in §5, verified against all three surviving mutations. |
| R2 | Medium-low | `MAX_FILE_BYTES` is enforced **after** the whole file is read. The stated denial-of-service rationale is not delivered; RSS grew 40.1 MB while "refusing" a 40 MB file. Remedy: `stat` before `readFile`. |
| R3 | Low | Rule **length floors are unpinned**. `github-token` 20→1, `google-api-key` 35→4, `npm-access-token` 36→4+, the DSN password floor 8→1 and the Thai-phone second stage can all be loosened with the suite green. All are widenings, so the consequence is CI noise rather than a hidden secret. Remedy: add a "shape just below the floor" row per floored rule to the false-positive table. |
| R4 | Low | `work-packages/WP-0A-A0-003.json` `scope.include` still says **"21 credential rules and 3 privacy rules"**. The delivered set is **30 credential and 4 privacy** rules. The manifest's own scope statement no longer describes the artifact it scopes. Inside this package's writable paths. |
| R5 | Low | **Three open blockers are stale** and one pair is unreconciled. See §8. Carrying closed items as open is not conservative — it makes the open list unreadable, and blocker 5 in particular asserts an approval state that the RFC contradicts. |
| R6 | Informational | `handoffs/WP-0A-A0-003-author-handoff.json` records a head 211 commits behind `main`, and its own `assumptions` block already warns that this stack has been rebased and the SHAs should be re-derived. It was not re-derived. No verdict should cite that handoff's revision as the reviewed state. |
| R7 | Informational — **named, not fixed** | `.agents/capability-profiles/cc-c0-contract-reviewer.json` records `accepted_work_package: "WP-0A-A0-002"` and a `write_scope` naming only that package. Stale for this acceptance. `.agents/**` is read-only here. |
| R8 | Informational — **named, not fixed** | `contract-catalog/shared-kernel/ctr-sec-001/schema.json` `x-opacity-limitation` carries a corrupted sentence from the 2026-09-03 correction ("…and it detected 12. excludes every format carrying…") and states the 12-of-15 figure twice. Substance correct, prose broken. Owned by WP-0A-CON-004. |
| R9 | Informational — **named, not fixed** | `work-packages/WP-0A-A0-001.json` `ownership.amended_by_shape_note` says the array holds **"three amendments"**; it holds **five** (WP-0A-A0-002, -003, -004, WP-0A-CON-008, plus the note). Owned by WP-0A-A0-001. |

### What I tried that did not break it

Recording these matters as much as the findings. Fail-closed reads survived every case I
could build, including symlinks out of the tree and dangling ones. All thirty-four declared
rules fired on specimens I built without reference to the suite's decoys. The 12-of-15
figure reproduced exactly and rule-for-rule. The RFC's invited one-line reproduction of the
email exemption still returns zero findings 211 commits later. Fourteen of fifteen attacks
on detection were caught, including every previously recorded defect. The Thai national ID
checksum, the Luhn-plus-issuer card rule, the entropy second stage and the placeholder
anchoring all behaved as their comments claim. The scanner does not trip itself, and the
suite asserts that it does not.

## 8. Open blocker triage

The manifest carries sixteen. My reading:

**Stale — should be closed or rewritten:**

- **Blocker 2** (the coverage guard cannot constrain a check script that never invokes it) —
  **closed**. `.github/workflows/ci.yml` now runs `node scripts/verify-test-coverage-floor.mjs`
  as its own workflow step, before `npm run check`, with a comment citing RFC-2026-007. The
  referral this blocker asks for has landed.
- **Blocker 5** (RFC-2026-005 is Proposed, needs Product Owner disposition) — **stale**. The
  RFC reads `Status: Approved 2026-09-02 by the Product Owner`, dispositioned in `82aae60`.
  The ownership transfer and the cross-package amendments are no longer "staged, not
  authorized" on that ground.
- **Blocker 16** (no cardholder-data rule exists) — **closed**. `payment-card-number` is
  live, was added under RFC-2026-008 by WP-0A-A0-005, and I confirmed it fires on a
  runtime-constructed Luhn-valid issuer-prefixed number.

**Unreconciled:**

- **Blockers 1 and 3** both describe "a 56-decoy uncorrelated corpus" and report **8 of 56**
  and **19 of 56** respectively. RFC-2026-005's own table sums to 19. A reader cannot tell
  whether these are two rounds or one restated. One number, against one named corpus, with
  the round it belongs to.

**Genuinely open, and correctly stated:** 1 and 3 (narrow coverage — corroborated
independently in §3), 4 (juristic tax ID false positive, `.git`/`node_modules` skipped, git
history — all three confirmed in §6), 6 (a pattern scanner cannot prove absence — a property
of the approach, correctly recorded), 7 (git history), 8 (email exemption), 9 (lowercase and
JSON-style assignments — confirmed undetected), 10 (private hostnames — confirmed
undetected), 11 (vendor prefix drift), 12 (integrity manifest tripwire with no self-anchor —
I exercised this end to end in §5, step H), 13 (WP-0A-A0-001 amendment still
`acknowledgement_status: pending` from `/root/r0_steward`, verified in the file), 14
(cross-vendor review not satisfied — applies to me), 15 (Gate G0).

**Should any of them block this verdict?** No. Every genuinely open blocker is a declared
limitation of a pattern scanner, honestly recorded, or an external countersignature this
package cannot supply. Blocker 13 blocks the *merge* under RFC-2026-002, not the Reviewer
verdict. What blocks my verdict is R1, which is not on the list at all.

## 9. Verdict

**`changes_required`.**

Not because the artifact is poor. It is, on the evidence above, a careful and unusually
honest piece of work: fail-closed holds everywhere I pushed it, every claimed rule is live,
the RFC's limitations section understates nothing, and fourteen of fifteen attacks on
detection were caught by tests that check behaviour rather than pin text. I would have said
`review_approved` on §3, §4 batch 1, and §6 alone.

It is `changes_required` because of R1, and R1 is not a hypothetical. A five-word carve-out
plus the manifest regeneration an author performs anyway ships an AWS-key-shaped credential
inside `architecture/` with `npm run check` at exit 0 and 46/46 tests green — and the test
that exists specifically to prevent that outcome misses it because it enumerates five
prefixes instead of asserting the property. This repository has recorded this defect class
recurring, the Author has twice declared a class closed and been falsified, and I am not
willing to be the third verdict that accepts an enumeration as a property.

**Exactly what lifts this to `review_approved`:**

1. **R1 (blocking).** Add the three assertions in §5 — path-independence derived from the
   real tree, size-and-offset independence, and walk coverage over the real top-level
   directories — to `test-kits/secret-scan.test.mjs`, and confirm each fails against the
   corresponding gutted scanner. All three are verified working in §5. This is the only
   blocking item.
2. **R4.** Correct `scope.include` in `work-packages/WP-0A-A0-003.json` to the delivered
   rule counts (30 credential, 4 privacy).
3. **R5.** Close blockers 2, 5 and 16, and reconcile the 8-of-56 / 19-of-56 pair to one
   number against one named corpus.

**Recorded as conditions, not blocking:** R2 (the `stat`-before-`readFile` fix — correct and
cheap, but it changes only a resource property, not a detection property, and it can ride
the same or a later change); R3 (floor rows in the false-positive table); R6 (re-derive the
handoff revisions). **Referred, outside this package:** R7 (`.agents/**`), R8
(WP-0A-CON-004), R9 (WP-0A-A0-001).

## 10. Attestation

I am `/claude/c0_contract_reviewer`, the Independent Reviewer named in
`work-packages/WP-0A-A0-003.json`. I did not author this package, did not contribute to the
scanner, the suite or the RFC, and hold no Author, Tester, Security/Privacy, Integration
Owner, Product Owner, merge, or Gate G0 authority. I share a vendor and a model with the
Author, and that is a recorded exception, not an equivalence.

Every number above was produced by running the artifact on the pinned toolchain at
`1478f34edc8c61a5a004610e5cb9f298b5562e98`, not by reading regular expressions and reasoning
about them. Every credential specimen was assembled from fragments at runtime, in scripts
held outside the repository tree; no real credential, provider integration, network access
or customer data was involved, and no literal credential-shaped string was added to this
tree. Every mutation was applied to a disposable copy; **I changed no file under
`scripts/`, `test-kits/`, `architecture/`, `contract-catalog/`, `.agents/` or
`work-packages/`.** My only write is this file.

This verdict does not advance the package status, approve Gate G0, or authorize a merge.
