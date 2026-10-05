# WP-0A-CON-006: Security / Privacy verdict at the PR #194 head, 2026-10-05

Package: Usage/cost and notification contracts (CTR-USG-001, CTR-NTF-001)
Security reviewer run: `/claude/a1_bastion` (`role_assignments.security_reviewer_agent_run_id`)
Author run under review: `/claude/a0_atlas`
Subject: PR #194, branch `agent/claude/WP-0A-CON-006-stale-blockers`,
head `87bd60fb80ad69a0bd91c1b8b3a0a4e4b618b75e` (work commit `a9916c0`, merge of `origin/main`
`b5d21d5` as `6da7487`, handoff commit `87bd60f`). Branch cut from `main` `8c089cc`; merge-base
with current `main` is `b5d21d5`.
Earlier A1 verdict re-checked: **none exists.** `evidence/WP-0A-CON-006/` held no A1 file before
this one, and `open_blockers[16]` and `author-conditions-closure-2026-10-06.md` §1 say the same.
This is the package's **first** Security verdict, so §3 reviews both contracts as they stand at
the head, not only the increment.

## 0. What I am

I am a subagent spawned by `/claude/a0_atlas`'s workflow orchestration, running the
`/claude/a1_bastion` Security/Privacy role (RFC-2026-024 §3/4 spawning disclosure). I am the same
vendor and model as the Author. Since the Owner's step-2 decision of 2026-10-05,
`prefer_cross_vendor_review` is `false` for this package, so independence here means a distinct
run in a named role that did not author, does not fix, and does not approve its own work. I wrote
no file in this package except this one, and I fixed nothing.

This is Security/Privacy evidence only. It is not the Reviewer verdict, not Tester evidence, not
the Integration verdict, and it does not authorize any merge.

Gate G0: synthetic only. No network call except reading PR #194's metadata and check status with
`gh`, no credential, no provider, no dependency added. No database was started or used. Probes
ran against the shipped schemas with the repository's own subset validator. The declared tests
ran in a private clone under my scratchpad (`.../scratchpad/a1-WP-0A-CON-006/repo`), checked
out on the branch **name**, with `origin/main` and `origin/HEAD` pointing at `b5d21d5`.

## 1. Measured vs read

| Item | How I know it |
|---|---|
| Toolchain `node v24.20.0`, `npm 11.19.0` | **measured** |
| `git ls-remote`: branch = `87bd60f`, `main` = `b5d21d5` | **measured** |
| `npm run check` on the private clone, on the branch name | **measured**, §4 |
| Package evidence commands, `check:handoff`, `check:scope`, role separation, ownership, secret scan | **measured**, §4 |
| What the increment changes in the two contracts, parsed key by key against `b5d21d5` | **measured**, §2 |
| `catalog-registry.test.mjs` moves exactly six pinned tokens; `integrity-manifest.json` exactly one digest | **measured** by word diff, §2 |
| Increment fixtures fail once each, for their named reason | **measured**, subset validator, §2 |
| 32 security probes against both schemas, plus the two increment fixtures | **measured**, §3 |
| Owner step-2 mapping and the earlier C0/Q0 conditions | **read** from the manifest and `author-conditions-closure-2026-10-06.md`. Not my role; I note only where they touch security |
| The CTR-MOD-001 / CTR-SEC-001 disposition named in `required_human_authorities[1]` | **read**: `evidence/WP-0A-CON-004/security-disposition-handle-ownership-a1.md` §4 |
| GitHub CI on the head | **measured as not finished**: `bootstrap` was `IN_PROGRESS` (run 37378512942) when I last read it. A green result is owed before merge (RFC-2026-002) |

## 2. The increment (`b5d21d5..87bd60f`, 10 paths)

Parsed, key by key:

- `ctr-usg-001/schema.json`: **only two `x-source` strings change** (`cost.amount`,
  `quantity.amount`). No `pattern`, `enum`, `required`, `const`, `maxLength` or
  `additionalProperties` moves. The money pattern `^(0|[1-9][0-9]{0,15})\.[0-9]{2,8}$` and the
  quantity pattern are byte-equal before and after.
- `ctr-usg-001/manifest.json`: `untestable_by_fixture` only.
- `ctr-ntf-001/manifest.json`: `fixtures` loses one name, `source_references` loses `K MK-006`,
  `freeze_boundary` loses a duplicated clause, and `untestable_by_fixture` stops describing the
  removed const. `untestable_by_schema` is unchanged.
- `ctr-usg-001/examples/invalid-float-cost.json`: `cost.basis` `list_price` → `estimated`. It now
  fails with exactly 1 error, `$.cost.amount: does not match pattern ...`.
- `ctr-ntf-001/examples/invalid-failure-missing-class-only.json`: deleted. Its twin
  `invalid-failure-without-class.json` fails with exactly 1 error,
  `$.delivery: missing required property 'failure_class'`.
- `test-kits/contracts/catalog-registry.test.mjs`: the word diff shows **exactly six token
  changes**: four digests (NTF `freeze_boundary`, NTF `untestable_by_fixture`, USG
  `untestable_by_fixture`, USG annotation digest), one NTF `source_references` digest, and one
  removed `FIXTURE_SET` name. No assertion was removed, loosened or added. This matches
  `amends_without_owning.rationale`.
- `test-kits/integrity-manifest.json`: one digest, the one for `catalog-registry.test.mjs`.
- Manifest, handoff, and the Author's closure evidence: records only. The secret scan is green, and I
  read every changed line: no secret, credential, private URL, personal data or customer content.

**Security effect of the increment: none adverse.** Removing a duplicate negative fixture does not
weaken coverage, because its byte-identical twin remains and is pinned. Correcting
`invalid-float-cost.json` makes the floating-point-money negative case single-fault, which is a
small gain: before, a validator that ignored `cost.amount.pattern` would still have rejected
the fixture on `basis`. The increment opens no new acceptance path.

## 3. First Security review of the two contracts at the head

### What holds (measured)

| Probe on `deep_link.target_ref` | Result |
|---|---|
| `https://…`, `javascript:alert(1)`, `data:text/html,x`, `//host` | REJECT |
| `app:../admin`, `app:a/../b`, `app:a..b`, `app:%2e%2e` | REJECT |
| `content:x?y=1`, `content:x#f`, `APP:x` | REJECT |
| `content:ok/x.y` | ACCEPT (intended form) |

- The deep link cannot carry a URL, a script scheme, a path traversal, a query or a fragment. That
  closes the open-redirect and link-injection class at the contract.
- `deep_link.requires_permission: false` → REJECT (`expected const true`). The flag is also
  `required`, so omitting it fails too.
- `message_key` with free text (`notification.hello world`) → REJECT, so a notification cannot
  carry user prose. There is no parameters field, so no personal data can travel inside a
  notification body.
- An extra property such as `recipient_id` → REJECT (`additionalProperties: false`). This holds at every
  object level, which the conformance suite also asserts ("an extra property carrying a secret is
  rejected at every declared object level").
- Money: negative (`-1.00`), exponent (`1e3`) and past-ceiling values → REJECT.
- Both contracts `$ref` CTR-TEN-001 and require `tenant_context`.
- Neither schema mentions a secret or a handle (`grep secret` on both: no match).

### A1-S1 (Medium, new): usage attribution is not bound to the Trusted Tenant Context

CTR-USG-001 carries two workspace identities: `tenant_context.workspace_id` (the trusted one,
§3.1) and `attribution.workspace_id` (the one billing reads, OB-004). Nothing ties them together.
Measured:

```
ACCEPT | attribution.workspace_id names another workspace than tenant_context
ACCEPT | tenant_context.workspace_id changed, attribution unchanged
ACCEPT | attribution.business_profile_id differs from tenant_context
```

The shipped **valid** fixtures already disagree: `tenant_context.workspace_id` is
`00000000-0000-4000-8000-000000000001` (a UUID) and `attribution.workspace_id` is
`ws_synthetic_0001`. So the contract never says that the two fields name the same identifier, or
even that they use the same identifier space. A usage ledger that bills on `attribution` would
then accept an event emitted under tenant A that charges workspace B. That is cross-tenant
attribution: one tenant's usage on another tenant's bill, or usage moved off its own.

A schema in this subset cannot compare two fields, so the fix is a declaration, the same
treatment `untestable_by_schema` (3) already gives to dedupe-key agreement. That item covers the
dedupe key against `attribution`, but **not** `attribution` against `tenant_context`. That gap is
undeclared anywhere I searched: the USG manifest, the schema `x-source`s, the work package and
this package's evidence.

Not stop-the-line: the contract is Draft, nothing consumes it at runtime, and all data is
synthetic. But it is the tenant-isolation rule in `CONTRIBUTING_AGENTS.md`, so it must not reach freeze
undeclared.

### A1-S2 (Medium, new): the permission-checked deep link has no subject

The catalog row asks for a "permission-checked deep link", and `untestable_by_schema` says the
runtime must check "that the recipient actually holds the permission it demands". **The contract
has no recipient.** `additionalProperties: false` rejects one (measured above). The only principal
in a command is `tenant_context.actor`, and that is the party who *caused* the notification, not
the one who will open it. A consumer reading this contract literally can check the actor's
permission at send time. Then the actor can see the target, the recipient may not be able to,
and `requires_permission: true` reads as satisfied.

Who receives a notification may belong to MOD-100's preference model, which `scope.exclude` keeps out.
The contract does not have to model the recipient. It does have to say that the check runs for
the **recipient**, at **open time**, and where the recipient's identity comes from. Today the flag
promises a check whose subject is undefined.

Owner: A5 (CTR-NTF-001's owner, who has still to ratify it, B-7).

### A1-S3 (Low, sharpens an owed item): free-form identifiers carry personal data and unbounded size

Measured ACCEPT: an NTF `dedupe_key` holding an email address and a phone number; an NTF
`notification_id` holding a name and an email address; a USG `attribution.job_id` holding an
email address; 1,000,000-character `dedupe_key`, `message_key`, `usage_id` and `provider_key`;
and a 100,004-character `deep_link.target_ref`.

The size half is the Author's own owed item (`open_blockers[13]`, the ten unbounded fields), and I
accept that it waits for PR #188, for the reasons recorded there. My addition: **a `maxLength`
alone does not keep personal data out of a dedupe store or a log.** NTF `dedupe_key` and
`notification_id` have no pattern at all, while USG `dedupe_key` already has a composition and a
character class that cannot hold `@`, `+` or spaces. When the owed bounding change lands, NTF
`dedupe_key` should get a stated composition or at least a character class, so that
it cannot carry a contact detail. That is a privacy rule for a key that sits in a store and is
retained for the dedupe window.

### A1-S4 (Low, record): `required_human_authorities[1]` names an A1 disposition that exists and does not bear on this package's contracts

The entry asks for "A1 security owner disposition of the CTR-MOD-001 / CTR-SEC-001 secret-handle
syntax ownership conflict, and of the handle issuance format". That disposition was given on
2026-09-04 in `evidence/WP-0A-CON-004/security-disposition-handle-ownership-a1.md` §4:
ratified in part (the pattern at Draft, for CTR-SEC-001), refused in part (the precedent), an RFC
required from A0, and C2 for issuance format before freeze. Neither CTR-USG-001 nor CTR-NTF-001 carries a
secret handle (measured). The entry is inherited through `dependencies` (`open_blockers[7]`), so
it is not wrong to keep. As written, though, a reader would take it as an A1 disposition still owed
**by this package**. It should cite the CON-004 file and say what remains: the RFC and C2, both
owed under WP-0A-CON-004. I do not make that a condition.

### Note (not a finding, integrity rather than security)

An `estimated` event carrying `cost.supersedes_usage_id` → ACCEPT, and a self-reference
(`supersedes_usage_id == usage_id`) → ACCEPT. The second is declared in `untestable_by_schema`
(2). The first is not declared, but `supersedes_usage_id` is only meaningful on
`provider_reported` (its own `x-source`). Since the H-1 `allOf` was removed, nothing ties the two.
This is for C0 and A6, not for me.

## 4. Declared tests

Private clone, branch name `agent/claude/WP-0A-CON-006-stale-blockers` at `87bd60f`,
`origin/main` = `origin/HEAD` = `b5d21d5`:

| Command | Exit | Result |
|---|---|---|
| `node --version` / `npm --version` | 0 | `v24.20.0` / `11.19.0` |
| `npm ci --ignore-scripts` | 0 | |
| `npm run check` | 0 | 692 tests, 692 pass, 0 fail, cancelled 0, skipped 0, todo 0 (coverage floor, toolchain, secret scan, protocol validators, full suite) |
| `node --test test-kits/contracts/shared-kernel-schema-conformance.test.mjs` | 0 | 6 / 6, skipped 0, todo 0 |
| `node scripts/validate-work-package-ownership.mjs work-packages` | 0 | |
| `node scripts/validate-work-package-role-separation.mjs work-packages/WP-0A-CON-006.json` | 0 | |
| `npm run check:handoff` | 0 | "describes the branch: nothing substantive after its cited head" |
| `node scripts/verify-branch-scope.mjs b5d21d55 WP-0A-CON-006` | 0 | "all 10 changed path(s) are declared, and every amendment explains one" |

For the record: `verify-branch-scope.mjs 8c089cc WP-0A-CON-006` exits 73 and lists 14
WP-0A-CON-005 paths. Those arrived through the normal merge of `main` (PR #187). Against the
true merge-base `b5d21d5` the scope is clean. That run measured the wrong base, and it is not a finding.

The Author reported 692 tests at `8c089cc` with 2 failures from the stale handoff. At the head I
measure 692 / 692. That is consistent with the handoff refresh being the last commit.

## 5. Findings table at `87bd60f`

| ID | Severity | State | Owner |
|---|---|---|---|
| Increment | none | Security-neutral, measured | — |
| A1-S1 attribution not bound to tenant context | Medium | New, undeclared | A0 + A6 (CTR-USG-001) |
| A1-S2 deep-link permission has no subject | Medium | New, undeclared | A5 (CTR-NTF-001) |
| A1-S3 personal data / size in free-form identifiers | Low | Size half owed (`open_blockers[13]`); pattern half added here | this package, with A5 and A6, in the owed bounding change |
| A1-S4 `required_human_authorities[1]` reads as owed here | Low | Record only | A0 |

## 6. Verdict

**security_approved_with_conditions**

PR #194's own content is security-neutral. The increment changes annotations, single-faults one
negative fixture, removes a byte-identical duplicate, and moves exactly the six pins and one digest
it declares. No assertion keyword moves in either contract. As a first review of the two
contracts, the security-critical constraints hold under probe: the deep link rejects every URL and
traversal form, the permission flag is const and required, there is no free text, no signed or
float money, and `additionalProperties: false` holds throughout.

Conditions, attached to the **package**, not to merging PR #194. Each is a declaration that fits
inside this package's own `writable_paths`, with the matching `catalog-registry.test.mjs` pin
moving as an amendment:

- **SC-1 (A1-S1).** Before WP-0A-CON-006 reaches `integration_verified`, CTR-USG-001 must declare
  in `untestable_by_schema` that `attribution.workspace_id` (and `business_profile_id` when present)
  must equal the Trusted Tenant Context's value, in the same identifier space. It must also say a
  consumer rejects an event where they differ. If the owners decide the fields are deliberately
  different identifiers, the contract must say that, and say how one maps to the other.
  Silence is not acceptable. Countersigned by A6.
- **SC-2 (A1-S2).** Before CTR-NTF-001 is ratified by A5 or leaves Draft, its manifest must state
  that the deep-link permission check is evaluated for the **recipient**, at **open time**, and
  where the recipient's identity comes from (even if that is "MOD-100, outside this contract").
- **SC-3 (A1-S3).** The owed bounding change in `open_blockers[13]` must also give NTF
  `dedupe_key` a stated composition or a character class that cannot carry a contact detail.
  Otherwise it must record why not.

**Stop-the-line: no.** No secret exposure, tenant leak in running code, duplicate side effect,
lost job, migration divergence, irreversible deletion or contract mismatch. A1-S1 is a tenant-isolation
gap **in a Draft contract with no runtime consumer**. It must be declared before freeze, and it has
not leaked anything.

**Does anything I own block the merge of PR #194: no.** What does block it is outside my role:
a green `bootstrap` CI run on `87bd60f` (in progress when I read it), C0's re-verification at
this head (the C0 verdict on file is `changes_requested` at `337dfe7`), Q0's re-verification,
and `/claude/r0_steward`'s Integration verdict with its acknowledgement of the two
`amends_without_owning` paths.

— `/claude/a1_bastion`, Security / Privacy reviewer, WP-0A-CON-006
