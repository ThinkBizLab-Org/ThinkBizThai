# WP-0A-CON-003: A1 Security/Privacy re-verification at `e5fa682`

Run: `/claude/a1_bastion`
Role: independent Security/Privacy reviewer for `WP-0A-CON-003`
Subject: branch `agent/claude/WP-0A-CON-003-stale-blockers` (Draft PR ThinkBizLab-Org/ThinkBizThai#195),
head `e5fa682` (the handoff alone) over `9931f91` (the Author's increment), base `origin/main` `8c089cc`.
Author: `/claude/a0_atlas`
Previous A1 verdict on this package: `review-security.md`, at `2649401` (2026-09-01),
`security_approved_with_conditions`, conditions CS-1 to CS-5 (CS-6 withdrawn) and standing C1.
Date written: 2026-10-06 (file name keeps the date the brief assigned).
Scope: NARROW. Are my 2026-09-01 conditions closed at this head, does the increment `8c089cc..e5fa682`
open anything new, and is there a stop-the-line risk. Not a fresh review of the two contracts.

**This document records findings. It advances no package status, signs nothing on anyone's behalf,
and repairs nothing it found.** It is Security/Privacy evidence only: not contract review, not test
verification, not integration, not merge authorization, and it does not move Gate G0.

---

## 0. What I am

I am a subagent of `/claude/a0_atlas`, the Author of the change under review. I ran in a worktree of
A0's repository, under a brief A0's workflow wrote, and I am the same vendor and model family as A0.
RFC-2026-024 withdrew the cross-vendor condition (and the Owner's 2026-10-05 step 2 item 1 extended
that to this package, which `9931f91` records), so that fact does not by itself disqualify this
re-verification. It does mean the Author chose what to point me at. **Whether this file is accepted as
the Security/Privacy role's signature is for the Integration Owner (`/claude/r0_steward`) and the
Product Owner to decide.** Neither A0 nor I can decide it.

## 1. What I read

- `CONTRIBUTING_AGENTS.md` (in full).
- My own earlier verdict, `evidence/WP-0A-CON-003/review-security.md` (in full).
- The Author's `evidence/WP-0A-CON-003/author-conditions-closure-2026-10-06.md` (in full). I treated
  its probe table as claims to re-measure, not as results.
- `git diff 8c089cc0..e5fa682` in full: four paths (one fixture, the manifest, the handoff, the new
  closure record).
- The two shipped schemas and their `valid-` fixtures; `ctr-sec-001/schema.json` `handle`.
- `evidence/WP-0A-A0-001/product-owner-disposition-2026-10-05-g0-step2.md` §3 row 1 and the Owner's
  reply line; `RFC-2026-004` line 3; `RFC-2026-010` line 3.
- `scripts/scan-repository-secrets.mjs` header (fail-closed note) and its `catch` sites.

## 2. How I measured, and which claims are measured and which are read

**Private clone on the branch name.** `git clone --no-hardlinks` of the local repository into
`.../scratchpad/a1-WP-0A-CON-003/clone`, local branch `agent/claude/WP-0A-CON-003-stale-blockers`
forced to `e5fa682dbff206040d6cd908887bde468eb560e1` (not detached, so the handoff guard runs),
`origin/main` set to the real remote `main` `fa10229`. Node `v24.20.0`, npm `11.19.0`.
No database was started by me; no network was used.

| # | Command (in the clone, on the branch name) | Exit | Result |
|---|---|---|---|
| 2.1 | `npm run check` | **0** | tests 692, pass 692, fail 0, cancelled 0, skipped 0, todo 0 |
| 2.2 | `node --test test-kits/contracts/shared-kernel-schema-conformance.test.mjs` (package_evidence) | **0** | 6/6 |
| 2.3 | `node scripts/validate-work-package-ownership.mjs work-packages` (package_evidence) | **0** | clean |
| 2.4 | `node scripts/validate-work-package-role-separation.mjs work-packages/WP-0A-CON-003.json` | **0** | four distinct role ids |
| 2.5 | `node scripts/scan-repository-secrets.mjs` | **0** | no findings |
| 2.6 | `node scripts/verify-branch-scope.mjs 8c089cc0 WP-0A-CON-003` | **0** | "all 4 changed path(s) are declared, and every amendment explains one" |
| 2.7 | `node --test test-kits/contracts/*.test.mjs` (unmutated clone) | **0** | 79/79 |
| 2.8 | same, in an `rsync` copy with `secret_handles.items.pattern` deleted from CTR-MOD-001 | **1** | 75/79; mutation-coverage floor, protected-constraint deletion, constraint ratchet and fixture-agreement tests fail |
| 2.9 | `node probe.mjs <clone>` (34 in-memory probes, script outside the repository) | **0** | §3 |
| 2.10 | `git merge-tree --write-tree origin/main e5fa682d` (in my worktree) | **0** | merges cleanly onto `fa10229`; neither #187 nor #188 touches this package's paths |

The probes import the repository's own `test-kits/contracts/json-schema-subset.mjs` `validate()` and
the shipped `schema.json` files, read-only; each probe is one `valid-` fixture with one change. All
values are synthetic (repeated `ab`, `0123456789abcdef`, `a`).

**Measured:** everything in §3 and §2. **Read, not measured:** the Author's nested-required-member
counts (31/20, 23/13 → only the one member this branch moved is re-measured, §4 N0), the Author's
mutations m2-m4 (I re-ran only m1, the secret-handle one), and the scanner's 12/15 reach figure, which
is A1's own earlier measurement carried in CTR-SEC-001 and not re-run today.

## 3. My conditions, re-measured at `e5fa682`

`ACCEPT` means the shipped schema admits the document.

| Probe (finding) | Change | Result |
|---|---|---|
| S-1 length | `secret_handles: ["secret:" + 400 chars]` (407) | **ACCEPT** |
| S-1 / CS-2 vs CTR-SEC-001 | 129-char handle: CTR-MOD-001 / CTR-SEC-001 `handle` | **ACCEPT** / REJECT (`maxLength 128`) |
| S-1 lowercase body | 32-hex body | **ACCEPT** |
| S-1 mixed case | `secret:AbC` | REJECT |
| S-4 M2 | `ready`, `activated: true`, `missing: [secret_handle, entitlement]` | **ACCEPT** |
| S-4 M3-M5 | `initializing` / `registered` / `draining`, no `readiness` | **ACCEPT** ×3 |
| S-4 M4 | `draining`, `activated: false` | **ACCEPT** |
| S-4 M6 | `blocked`, `missing: []` | REJECT (`minItems 1`) |
| S-4 | `blocked`, `activated: true` | REJECT (`const false`) |
| S-7 M12 | `permissioned-data`, `tenant_scoped: true`, nothing else | REJECT (`retention_reference` required) |
| S-7 M13 | `permissioned-data`, `tenant_scoped: false`, all three references | REJECT (`const true`) |
| S-7 control | `permissioned-data`, tenant-scoped, all three references | ACCEPT (as intended) |
| CS-5 | `tenant-data` without `retention_reference` | **ACCEPT** |
| S-3 | free-text `readiness.reason` | REJECT (pattern `^readiness\.[a-z_.]+$`) |
| S-5 F1 | `business`-scope `kill_switch` | REJECT |
| S-5 F2 | `business` `explicit_allow`, `allow`, `platform` evaluated | **ACCEPT** (unrepresentable, as before) |
| S-5 F6 / F7 | deciding scope absent / reversed order | REJECT / REJECT (prefix enum) |
| S-6 F4 | kill switch, `write_disabled` omitted, `historical_read_allowed: false` | **ACCEPT** |
| S-6 F5 | kill switch, both omitted | **ACCEPT** |
| S-8 F8 | `percentage: 0`, `allocated: true` | **ACCEPT** |
| S-8 F9 | `expires_at` years before `changed_at` | **ACCEPT** |

The Author's probe table agrees with every row I re-measured.

| Condition | State at `e5fa682` | Basis |
|---|---|---|
| **CS-1** (S-2, handle syntax belongs to CTR-SEC-001) | **OPEN, and its precondition was breached upstream.** | CTR-MOD-001 still defines `^secret:[a-z0-9._-]+$` itself. I wrote that CTR-MOD-001 "must not reach Candidate carrying a syntax owned by a contract it does not co-own"; it reached Candidate on 2026-09-02 (RFC-2026-010 line 3), and that RFC does not mention CS-1. The promotion is the Product Owner's decision; I do not ask this PR to reopen it. The Author's record of the breach (`open_blockers[1]`) is accurate. It remains blocking on **freeze**, as graded. Owed: A0 + A1, by RFC. |
| **CS-2** (S-1, `maxLength`; honest `x-source`) | **Half closed.** | The `x-source` now calls `secret:` a declared inference and points at CTR-SEC-001: closed. No `maxLength`: open (407 accepted). **New at this measurement:** CTR-SEC-001 `handle` caps at 128, so a CTR-MOD-001 entry can be a string no CTR-SEC-001 handle can equal (129 accepted vs rejected above). Recorded as N1. |
| **CS-3** (S-4, `activated: true` ⇒ no `missing`; `freeze_boundary` names available states) | **OPEN.** | M2 and M3-M5 accept. M6 and blocked-activated are now closed, so S-4 is narrower than in September. |
| **CS-4** (S-5, S-6) | **OPEN.** | F2 still accepts; the `x-rule` still carries the "no narrower scope may override" clause; `invalid-business-overrides-kill-switch.json` still tests a mis-scoped kill switch, not an override; F4/F5 accept. F6/F7 now reject: that part of S-5 (the `evaluated_scopes` annotation) is closed. |
| **CS-5** (S-7, S-3, `tenant-data` retention) | **Mostly closed.** | S-7 closed (M12, M13 reject; consent, retention and redaction required). S-3 closed (key pattern). `tenant-data` retention: open. |
| CS-6 | Withdrawn 2026-09-01. | `review-security.md` §7. |
| **S-8** (Low) | **OPEN.** | F8, F9 accept. |
| **C1** (standing, scanner) | **Not this package's; partly moved.** | The scanner header now records fail-closed on unreadable files (the `.catch(() => null)` I cited is superseded). The reach limitation is carried verbatim in CTR-SEC-001 `x-opacity-limitation`. Owned by WP-0A-A0-003 / CTR-SEC-001. |

**Why the open items are not charged to this PR.** Every open condition above is a requiredness or
meaning change on a Candidate contract. `CONTRIBUTING_AGENTS.md` § Ownership and change control requires
an RFC for that, and the Author's `open_blockers[11]` routes them there (A0, with A1 for the
secret-handle and data-classification items). I agree with that routing. None of them is worse at this
head than at `8c089cc`, and several are better than at `2649401`.

## 4. The increment `8c089cc..e5fa682`, judged on its own

- **N0, the fixture change (closes Q0 T-7; security-neutral, positive).**
  `invalid-temporary-without-expiry.json` gains `"owner_role":"A0"` and nothing else. As shipped it
  is rejected for `audit.expires_at` missing; adding `expires_at` to it makes it valid, so it now
  violates exactly one obligation. Synthetic: `usr_synthetic_0001`, fixed 2026 timestamps, a role
  code. No credential, PII, URL or customer content.
- **Manifest.** `prefer_cross_vendor_review: false` and the withdrawal sentence cite the Owner's
  reply (`บืนยันขั้น 2`, disposition line 83) and §3 row 1, which names this package's
  `open_blockers[8]`; I read both and they say what the manifest says. The disposition marked the
  per-package change as owed by each package, so making it here is in scope. `product_reviewer_note`,
  the `required_human_authorities` rewording (RFC-2026-004 line 3 does read "Approved 2026-09-02"),
  and emptying `amends_without_owning.paths` (2.6 passes) have no security effect. **No independence
  rule is weakened:** four distinct role ids (2.4), Security reviewer still assigned, no self-approval.
- **Handoff and closure record.** `git diff` additions contain no URL, DSN, local path or long
  token-shaped string other than two commit SHAs. Scanner exit 0 (2.5).
- **Blast radius.** No schema, no test file, no script, no CI, no `db/` or `migrations/`, no lockfile,
  no dependency, no network, no RLS. Rollback is a revert.

### New findings (all pre-existing at `8c089cc`, none introduced by this PR)

| Id | Severity | Finding | Measured |
|---|---|---|---|
| N1 | Medium | CTR-MOD-001 `secret_handles` and CTR-SEC-001 `handle` no longer compose on length: 129-char handle accepted by the manifest contract, rejected by the handle contract. A manifest can declare a handle the registry can never issue. Folds into CS-1/CS-2; the Author already recorded it. | §3 |
| N2 | Medium | `classification: "tenant-data"` with `tenant_scoped: false` is accepted. M13's fix binds `tenant_scoped: true` to `permissioned-data` only; the tenant-data class, by its name tenant data, can declare itself not tenant-scoped. Tenant isolation is the guide's first non-negotiable rule. Same Candidate change path as CS-5 (A0 with A1). | `NEW tenant-data tenant_scoped:false` → ACCEPT |
| N3 | Low | `readiness.reason` has a key pattern but no `maxLength`: a 5,010-char `readiness.aaa…` is accepted. The charset `[a-z_.]` blocks the leakage S-3 was about, so this is a log-size nit only. | → ACCEPT |
| N4 | Low | The three permissioned-data references are `minLength: 1` with no pattern: a single space satisfies consent, retention and redaction. Declaration is structural only; nothing says it resolves. | → ACCEPT |

N2 to N4 should be added to `open_blockers[11]` by the Author; I do not edit the manifest.

## 5. Stop-the-line verdict

**No stop-the-line risk found.**

- **No secret exposure.** Scanner exit 0; every changed byte read; the one fixture change is synthetic.
- **No tenant leakage.** N2 is a contract-expressiveness gap on paper; no module, registry or data
  path consumes CTR-MOD-001 today, and this PR does not change it.
- **No duplicate external side effect, lost job, migration divergence or irreversible deletion.** The
  PR touches none of those surfaces.
- **No contract mismatch introduced.** The PR changes no schema; it makes one fixture test exactly
  the obligation its name claims. N1 is a pre-existing cross-contract mismatch at Candidate/Draft
  level, owed by RFC and blocking on freeze, not live.

**Does anything block the merge?** From Security/Privacy, **no**. Every open condition predates
this PR, is no worse at this head, and is routed to the Candidate RFC path, which this PR cannot
legitimately take. That is a recommendation. The merge also needs C0, Q0 and `/claude/r0_steward`
at this head and green CI on `e5fa682` (or its refresh after the evidence commits land); whether to
merge is the Owner's decision, or the Author's under the Owner's standing delegation where that
applies. Note for the Integration Owner: `main` is now `fa10229`, two merges past the branch point;
the merge is clean (2.10) and `npm run check` passes on the branch name with `origin/main` at `fa10229`
(2.1).

## 6. Limits

- **Same vendor and model family as the Author, and spawned by the Author** (§0). The brief was A0's;
  the probes N2-N4 were my own choice.
- **Probes are single-document.** The kill-switch override (F2), registry admission (CS-3) and handle
  entitlement remain evaluator or runtime properties no schema probe can test.
- **I did not re-run** the Author's mutations m2-m4, the member-by-member nested-required census, or
  the scanner's reach measurement (§2, "Read, not measured").
- **No CI observed.** I did not read the CI run for `e5fa682`.
- The clone took its objects from the local repository; I confirmed the head SHA by `git rev-parse`
  (`e5fa682dbff206040d6cd908887bde468eb560e1`) and `origin/main` by `git log` (`fa10229`).

VERDICT: security_approved_with_conditions
