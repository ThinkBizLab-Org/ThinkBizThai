# WP-0A-CON-005 — Independent Tester attestation at the final head, 2026-10-06

Package: CTR-JOB-001 reference-field hardening
Tester run: `/claude/q0_sentinel` (declared `role_assignments.tester_agent_run_id`)
Author run under test: `/claude/a0_atlas`, a different run, so role separation holds.
Subject: PR #187, branch `agent/claude/WP-0A-CON-005-job-reference-hardening`, head
`bab3d64d8bf986cbc3ef925d1d552cf57c2c4e66` (handoff commit; the handoff cites the merge of
`main` `80f151f`). The branch contains `origin/main` `8c089cc`, which is also its merge base.
Earlier attestation extended here: `evidence/WP-0A-CON-005/q0-test-reverify-2026-10-05.md`
(`test_verified_with_conditions` at `e7d5e6e`, content of `efbaf70`).
Protocol version: `1.0.0`.

## 0. What I am

I am a subagent spawned by a workflow script run under `/claude/a0_atlas`, the Author run of
this package, acting in the Tester role `/claude/q0_sentinel` under RFC-2026-024. The task text
was computed by that script. It asked two questions (does the attestation extend to this head,
are the earlier conditions lifted) and gave me no verdict to reach. I took none of the
Author's or R0's claims as given; every row below marked measured was run by me this session.
I share a vendor and a model with the Author (the cross-vendor condition was withdrawn by
RFC-2026-024 and applied to this package by the Owner on 2026-10-05). I am not the Reviewer,
the Security reviewer or the Integration Owner. This file authorizes no merge and no gate
movement, and I changed no file other than this one.

Toolchain: `node v24.20.0`, `npm 11.19.0` from `/Users/bank/.local/node-v24.20.0/bin`,
matching `.node-version`. Nothing was downloaded except the clone of this repository. No
database was started; the package declares no database test.

## 1. Measured vs read

**Measured:**

- A private clone checked out **on the branch name**
  (`git clone --branch agent/claude/WP-0A-CON-005-job-reference-hardening`) in
  `/private/tmp/claude-501/-Users-bank-ThinkBizThai/27edf3de-b1b4-4cfe-a757-7d17332ec256/scratchpad/q0-con005f/repo`.
  `HEAD` = `bab3d64…`, `git branch --show-current` = the branch name. Not detached.
- Every declared command, the handoff guard, branch identity, branch scope against
  `origin/main`, and role separation (§2).
- A mutation run of the tightened membership assertion in a disposable copy (§3).
- Integrity-manifest digests over file bytes, the PR state and the CI runs on the head.

**Read, not re-measured:** R0's confirmation (`r0-integration-confirmation-2026-10-06.md`) and
C0's re-check (`c0-recheck-2026-10-06.md`), for context only. The Author's mutation table in
`author-conditions-closure-2026-10-05.md` for N3 was not relied on; §3 is my own run.

## 2. Declared tests at the head (clone on the branch name)

| Command | Exit | Result |
|---|---|---|
| `npm run check` | **`0`** | **692 tests, 692 pass, 0 fail, cancelled 0, skipped 0, todo 0**; 0 `✖` lines |
| `node --test test-kits/contracts/ctr-job-001-reference-hardening.test.mjs` | `0` | 6 / 6, skipped 0, todo 0 |
| `node --test test-kits/contracts/shared-kernel-contract-catalog.test.mjs` | `0` | 6 / 6, skipped 0, todo 0 |
| `node --test test-kits/contracts/shared-kernel-schema-conformance.test.mjs` | `0` | 6 / 6, skipped 0, todo 0 |
| `node scripts/verify-test-coverage-floor.mjs` | `0` | |
| `node scripts/validate-work-package-ownership.mjs work-packages` | `0` | |
| `node scripts/validate-work-package-role-separation.mjs work-packages/WP-0A-CON-005.json` | `0` | |
| `npm run check:handoff` | `0` | "describes the branch: nothing substantive after its cited head" |
| `node scripts/verify-branch-identity.mjs agent/claude/WP-0A-CON-005-job-reference-hardening` | `0` | resolves `WP-0A-CON-005` |
| `node scripts/verify-branch-scope.mjs origin/main WP-0A-CON-005` (`8c089cc`) | **`0`** | "all 13 changed path(s) are declared, and every amendment explains one" |

692 equals `evidence/VERIFICATION.md` on this tree (692/692). The count moved from 691 at
`e7d5e6e` because of `main`'s own test changes merged in (`8c089cc`), not because of this
package: the branch adds no test, and cf39be3 changes one assertion inside an existing test.

Integrity manifest: 91 entries, 91 match the file bytes, 0 mismatch. Between `e7d5e6e` and
the head it moves 7 entries, of which this package's are the RFC-2026-006 and the guard-test
digests (cf39be3); the rest arrive with `main`.

The branch's diff against `main` (`git diff --name-status origin/main...HEAD`) is 13 paths:
RFC-2026-006, the handoff, the manifest, the guard test, the integrity manifest,
`author-self-check.md`, and seven evidence files under `evidence/WP-0A-CON-005/`. No
`contract-catalog/**`, script, CI or `docs/**` file. The `ctr-job-001/schema.json` the guard
reads is `main`'s, unchanged by this branch.

## 3. The tightened membership assertion (cf39be3, N3)

The assertion now enumerates `everyCaseSpelling(scheme)` for `http`, `https`, `ws`, `wss`,
`ftp`, `file`: 16 + 32 + 4 + 8 + 8 + 16 = **84 spellings, all distinct, × 2 fields = 168
probes**, each pairing the spelling with a body the grammar accepts
(`<spelling>:public.example.invalid/x`). I recomputed the 84 independently.

Disposable copy of the tree. Each mutant widens the scheme alternation `^(job|…` to
`^(<mutant>|job|…` on `ctr-job-001/schema.json`, then the guard file runs; schema and test are
restored after each run (`git status` clean at the end).

| Mutant (field) | Guard |
|---|---|
| control (no change), before and after the run | exit 0, 6 / 6 |
| `Https`, `hTTp`, `HTTP`, `hTtPs`, `wSs`, `Ws`, `FiLe`, `fTP`, `FTP` (both) | **exit 1**, 5 pass / 1 fail |
| `https`, `http`, `ws`, `wss`, `ftp`, `file` (both) | **exit 1**, 5 pass / 1 fail |
| `[Hh][Tt][Tt][Pp][Ss]?` (both) | **exit 1**, 5 pass / 1 fail |
| `Https` on `input_ref` only; on `result_ref` only | exit 1 (the pre-existing equality assertion fires first) |
| `data`, `javascript`, `blob`, `DATA` (both) | exit 0, 6 / 6, **not caught** (outside the set, disclosed) |
| `Https`, `hTTp`, `FiLe` (both) **with the assertion reverted to the `e7d5e6e` two-spelling loop** | **exit 0, 6 / 6, not caught** |

The failing test in every killed mutant is "neither reference field carries a deny-list, and
both carry the recorded rule", with the message naming each readmitted value, e.g.
`input_ref=Https:public.example.invalid/x, result_ref=Https:public.example.invalid/x`.

So the tightening is real: the three mixed-case mutants the `e7d5e6e` form let through are
now killed, and 16 of 16 in-set mutants are killed. The boundary is unchanged from my earlier
N3: schemes outside the WHATWG special list survive, which RFC-2026-006 Limitations state and
the scheme set's owner holds (blocker 8).

## 4. Earlier conditions and findings

| Earlier item (`q0-test-reverify-2026-10-05.md`) | Now | How I know |
|---|---|---|
| N1 CI red on the head, branch behind `main` | **Lifted** | The branch contains `main` (`merge-base HEAD origin/main` = `8c089cc` = `origin/main`); scope guard against `origin/main` exit 0. GitHub run `37356213562` (event `pull_request`, head `bab3d64`) concluded **success**; `mergeStateStatus: CLEAN`, PR open, Draft. |
| N2 cited Owner disposition absent from the branch | **Lifted** | `evidence/WP-0A-A0-001/product-owner-disposition-2026-10-05-g0-step2.md` is present in the tree at the head (arrived with `main`). |
| N3 membership assertion covers lowercase and uppercase only, 6 schemes | **Lifted as to letter case; boundary carried** | §3: every case variant is now enforced and observed to bite. Schemes outside the six remain uncovered by design and disclosed. Informational, not a condition. |
| N4 `x-amended-by[1].change` text vs the field's later state | **Carried, informational** | Not this package's file; for `/claude/r0_steward` when acknowledging. Both `x-amended-by` records still read `pending`. |
| §9(5)–(8) of the first verdict | **Carried, correctly owed elsewhere or to R0** | Unchanged; `open_blockers` count 15, status `in_review`. |

My earlier "conditions" were never conditions on the work's content: they were N1 (a red
required check from staleness) and N2 (a citation that resolves with N1). Both are now
resolved at this head by measurement.

## 5. Stop-the-line?

**No.** Nothing at this head is a secret exposure, tenant leak, duplicate side effect, lost
job, migration divergence, irreversible deletion or contract mismatch. The branch changes no
contract file.

## 6. What still blocks a merge (not mine to lift)

1. `/claude/r0_steward`: the two `pending` CTR-JOB-001 `x-amended-by` acknowledgements, the
   integrity-manifest acknowledgement, and moving its `integration_conditional` to a verdict at
   the final head. R0 should re-check that the head after this evidence commit still reads
   `check:handoff` green, because this commit sits after the handoff commit.
2. The PR changes an RFC, so under RFC-2026-025 §5 item 6 the Product Owner, or the Author
   under the Owner's standing delegation, merges it with a green CI run on the actual final
   head.

## 7. Verdict

My attestation **extends** to `bab3d64d8bf986cbc3ef925d1d552cf57c2c4e66`. The declared tests
pass on the branch name (692/692, skipped 0, todo 0), CI is green on that head, and the
tightened assertion (cf39be3) is observed to kill every in-set mixed-case mutant that the
earlier form missed, with control green. My earlier conditions N1 and N2 are **lifted**; N3 is
closed as to letter case with its disclosed scheme boundary carried; N4 and §9(5)–(8) remain
informational or owed elsewhere.

This is independent Tester evidence only. It does not review, security-approve, integrate,
approve Gate G0, or authorize a merge.

VERDICT: test_verified
