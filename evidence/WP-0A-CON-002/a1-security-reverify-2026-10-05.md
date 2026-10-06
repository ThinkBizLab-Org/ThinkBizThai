# WP-0A-CON-002 — A1 Security/Privacy re-verification at `568658c` (PR #193, Draft, not merged)

Run: `/claude/a1_bastion`.
Role: independent Security/Privacy reviewer for WP-0A-CON-002.
Subject: `agent/claude/WP-0A-CON-002-restore-rfc-002`, head `568658cf8639b85581ea0003d2f4844b36ae1424`,
PR https://github.com/ThinkBizLab-Org/ThinkBizThai/pull/193.
Base: `8c089cc` (`origin/main` at the time of this review; `git merge-base --is-ancestor` confirmed).
Previous A1 verdict on this package: `review-security-rework.md`, at `28d3142`, `security_changes_requested`.
Date measured: 2026-10-06 (the file name carries the date the brief assigned).

**This document records findings. It advances no package status, signs nothing on any other role's
behalf, repairs nothing it found, and is not a merge authorization.** This file is the only file this
run changes.

---

## 0. What I am

**I am a subagent spawned by the Author run `/claude/a0_atlas`** (RFC-2026-024 §3/4). A0 wrote the
brief, chose the subject and head, and listed what it believes is done and not done. I treated that
list as a claim to test, not as evidence.

**I am the same vendor (Anthropic) and the same model family as the Author.** RFC-2026-024 withdrew
the cross-vendor condition, and on 2026-10-05 the Owner applied that withdrawal to this package (step 2
item 1; this branch records it in `independence.cross_vendor_exception`). What remains is
`CONTRIBUTING_AGENTS.md` § Separation of duties: a distinct run in a named role is that role's
signature. This file is such a signature, in its weakest permitted form, and A0 may not count it as
its own approval.

A0 is both the Author of the work under review and the run that framed this review. I did not choose
my scope. To compensate, every closure claim below that a mutation can express was re-run by me, in my
own clone, with my own probes — I did not reuse A0's probe table.

---

## 1. Measured vs read

**Measured** (executed by this run, results below): everything in §2 and §3.

Environment: a private clone at
`/private/tmp/claude-501/-Users-bank-ThinkBizThai/27edf3de-b1b4-4cfe-a757-7d17332ec256/scratchpad/a1-WP-0A-CON-002/clone`,
checked out **on the branch name** `agent/claude/WP-0A-CON-002-restore-rfc-002` (not detached;
`git branch --show-current` printed it), reset to the GitHub head `568658c`. Node `v24.20.0`, npm
`11.19.0`, `.node-version` `24.20.0`. No database was used; no network beyond read-only `git fetch` and
read-only `gh` calls against this repository.

**Read, not measured:** RFC-2026-004 approval status, the Owner's step-2 disposition, the
WP-0A-CON-005 attributions, and branch-protection state are taken from the repository text and A0's
closure record (`author-conditions-closure-2026-10-06.md`), not re-derived. The `64d9c65` lookahead
removal's equivalence is argued from the grammar (§3.3) and supported by the 170-case battery, not
exhaustively proved.

---

## 2. Declared commands at the head, on the branch name

| # | Command | Exit | Result |
|---|---|---|---|
| 2.1 | `npm run check` | **0** | tests 692, pass 692, fail 0, cancelled 0, skipped 0, todo 0 |
| 2.2 | `node --test test-kits/contracts/catalog-reference-integrity.test.mjs` | **0** | 15/15 |
| 2.3 | `node --test test-kits/contracts/shared-kernel-envelope-contracts.test.mjs` | **0** | 6/6 |
| 2.4 | `node --test test-kits/contracts/shared-kernel-schema-conformance.test.mjs` | **0** | 6/6 |
| 2.5 | `node scripts/validate-work-package-ownership.mjs work-packages` | **0** | |
| 2.6 | `node scripts/validate-work-package-role-separation.mjs work-packages/WP-0A-CON-002.json` | **0** | |
| 2.7 | `node scripts/scan-repository-secrets.mjs` | **0** | |
| 2.8 | `node scripts/verify-branch-scope.mjs origin/main WP-0A-CON-002` | **0** | "all 7 changed path(s) are declared, and every amendment explains one" |
| 2.9 | `node scripts/refresh-author-handoff.mjs --check` | **0** | "nothing substantive after its cited head" |

The gate condition (`skipped` and `todo` both zero) holds. 692 matches the count A0 reports.

**CI at the head is not green.** `gh pr view 193` at review time: Draft, OPEN, `MERGEABLE`, head
`568658c`, one check `bootstrap` = **CANCELLED**. Run `37371252667` concluded `failure` after 15m02s
with the annotation "The job was not acquired by Runner of type hosted even after multiple attempts".
No step executed. This is a runner-capacity failure, not a code failure — but the required check has
not passed at this head, and nothing in §2 substitutes for it. I did not re-run it; that is not this
role's action.

---

## 3. My earlier conditions, re-verified

### 3.1 Mutation probes (my own harness)

Each probe: a fresh copy of the clone (working tree only; `.git` excluded, `.github` kept), one
mutation, then `node --test test-kits/contracts/*.test.mjs` and
`node scripts/verify-test-coverage-floor.mjs`. "Fails closed" = at least one exit non-zero.
Harness: `.../scratchpad/a1-WP-0A-CON-002/probes.mjs` (scratch, not committed).

| Probe | Mutation | Suites exit (fail/79) | Floor | Fails closed | First failing tests |
|---|---|---|---|---|---|
| baseline | none | 0 (0) | 0 | — | — |
| **S1** decoy file | `ctr-evt-001/tenant.json` claiming `$id: CTR-TEN-001`, `{type: object}`; `tenant_context.$ref` → `./tenant.json` | 1 (8) | 0 | **yes** | `no file under the catalog is undeclared…`, `every $ref points at a canonical contract schema whose $id matches its directory` |
| **S1b** decoy directory | copy `ctr-ten-001` to `ctr-tenx-001`, empty its properties, repoint `CTR-API-001.tenant_context` | 1 (10) | 0 | **yes** | `every $ref points at a canonical…`, `every contract directory on disk is in the pinned registry` |
| **S2** nested ref to non-schema | `ctr-pag-001` `items.items: {$ref: "../ctr-ten-001/manifest.json"}` | 1 (5) | 0 | **yes** | `every $ref points at a canonical…`, mutation-coverage floor |
| **S3** `status_ref` loosened | pattern → `^(job\|…\|content):.+$` | 1 (3) | 0 | **yes** | constraint-value ratchet, predicate/schema agreement, `a reference field rejects every scheme outside its allow-list` |
| **S3** `deep_link_ref` loosened | pattern admits `.` and `/` freely | 1 (3) | 0 | **yes** | same three |
| **S3** `CTR-IDM-001.result_ref` loosened | pattern admits `.`, `/`, `:` freely | 1 (3) | 0 | **yes** | same three |
| **M3** `deep_link_ref` pattern deleted | delete | 1 (6) | 0 | **yes** | allow-list acceptance, mutation-coverage, constraint-value ratchet |
| **S10** bound raised | `deep_link_ref.maxLength` 256 → 100000 | 1 (7) | 0 | **yes** | `a value at exactly the declared bound is accepted…` |
| **S10** bound deleted | delete `CTR-IDM-001.result_ref.maxLength` | 1 (6) | 0 | **yes** | `every reference-shaped field … carries an upper bound` |
| **V4** fix reverted | `[...value].length` → `value.length` | 1 (1) | **86** | **yes** | `every catalog schema uses only keywords this validator actually enforces` (+ digest guard) |
| **F6** predicate loosened | `PRIVATE_REF` → `…:.+$` in the envelope test | 1 (1) | **86** | **yes** | `the predicate and the shipped schema agree on every fixture` (+ digest guard) |
| **S6** nested close removed | delete `CTR-TEN-001.actor.additionalProperties` | 1 (4) | 0 | **yes** | mutation-coverage, constraint-value ratchet, Candidate fixture validator |
| **S6** nested close removed | delete `CTR-API-001.accepted.additionalProperties` | 1 (4) | 0 | **yes** | mutation-coverage, constraint-value ratchet, fixture acceptance |
| **S7** unresolvable `$ref` | `CTR-IDM-001` error `$ref` → `../ctr-err-001/missing.json` | 1 (12) | 0 | **yes** | `every external $ref … resolves to a FILE that exists` |
| **S8** self-reference | `ctr-pag-001.filter: {$ref: "../ctr-pag-001/schema.json"}` | 1 (9) | 0 | **yes** | annotation and mutation-coverage ratchets |
| suite deletion | delete `shared-kernel-schema-conformance.test.mjs` | 0 (0/73) | **91** | **yes** | coverage floor (digested path cannot be inspected) |

Sixteen mutations, sixteen fail closed. The two that touch this branch's own edits (V4, F6) are
caught twice: by the new assertion and by the integrity-manifest digest.

One harness error of my own, recorded because it would otherwise read as a finding: my first run
excluded every path containing `/.git`, which also dropped `.github/`, and the floor then exited 91
on the **baseline**. Corrected to exclude only `.git` itself; every row above is from the corrected
run.

### 3.2 Hostile reference battery (direct, against the shipped schemas)

`.../scratchpad/a1-WP-0A-CON-002/battery.mjs` validated 34 hostile strings against each of the five
reference fields — `CTR-API-001.accepted.status_ref`, `.deep_link_ref`, `CTR-IDM-001.result_ref`,
`CTR-JOB-001.input_ref`, `.result_ref` — using the repository's own `validate()`. The set includes both
S3 forms (`result:../../../etc/passwd`, `content://attacker.example.invalid/exfil`), a leading `/`,
`a/../b`, `a/./b`, `.a`, `a.`, `a//b`, trailing `/`, upper-case scheme, trailing `\n` and `\r`, an
embedded newline followed by a URL, percent-encoded dots, backslash traversal, a Cyrillic homoglyph,
U+2215, space, `?`, `#`, `@`, a second `:`, NUL, an astral character, leading/trailing space, an empty
body, a 307-character body, and the eight original foreign schemes.

**Accepted: 0 of 170.** Benign forms (`result:abc`, `content:x/y.z`, `job:01J-abc_1`) accepted on every
field. Every field carries `maxLength: 256`.

### 3.3 Per-condition disposition

| Earlier item | Severity then | State at `568658c` | Basis |
|---|---|---|---|
| Condition 1 / **S3** traversal and authority in an allowed scheme | High | **Closed** | §3.2 (0/170); §3.1 three loosening probes fail closed. The hostile-scheme test now names both S3 forms and covers `deep_link_ref` (this branch). |
| Condition 2 / **S1** decoy `$id` | High | **Closed** | §3.1 S1, S1b. Identity is now location-bound, and an undeclared schema-like file is refused. |
| Condition 2 / **S2** name-keyed identity, nested refs, refs to non-schemas | High | **Closed** | §3.1 S2: a nested `$ref` to a manifest fails the canonical-location test. |
| Condition 3 / **S4** `CTR-JOB-001` deny-list | High (escalated) | **Closed by its owner** (WP-0A-CON-005, RFC-2026-006) | §3.2: both `CTR-JOB-001` reference fields refuse all 34 hostile forms. |
| **S5** `filter`/`items` undeclared containers | Med | **Closed** | Both carry `x-leakage-boundary` in `ctr-pag-001/schema.json` (read). |
| **S6** nested `additionalProperties` unasserted | Med | **Closed** | §3.1 two nested-close deletions fail closed. |
| **S7** vacuous negative on unresolvable `$ref` | Low | **Closed** | §3.1 S7, 12 failures. |
| **S8** no cycle guard in `validate()` | Low | **Closed — accepted as fail-closed, no guard required** | Measured: `validate(s, {}, {resolve: () => s})` with `s = {$ref: 'x'}` throws `RangeError`. The validator is imported only by `test-kits/`, `scripts/verify-test-coverage-floor.mjs` and evidence probes — no runtime or production path — so a cycle is a loud test failure, not a denial of service. A depth limit would improve the message, not the verdict. I accept A0's disposition. |
| **S9** `required` via prototype chain | Low | **Closed** | `Object.hasOwn` at `json-schema-subset.mjs:162,165`; measured: `required: ['constructor','toString']` on `{}` reports both missing. |
| **S10** unbounded references | Low | **Closed** | `maxLength: 256` on all five fields; §3.1 two probes fail closed. |
| Condition 5 / **S11** cursor and page-size gaps not freeze-blocking | Low | **Open, owed, not merge-blocking** | Pinned present by the registry ratchet; no freeze gate reads them. Owed to the owner of `index.json` and the register (read-only here), recorded in `open_blockers[14](d)`. Carried to the `CTR-PAG-001` pre-freeze security gate, as my earlier condition 4 already said. |
| Standing **C1** JWT-shaped value in `actor.id` | — | **Scanner half closed; contract half owed** to WP-0A-CON-001 | Not this package's file; recorded in `open_blockers[12]`. Unchanged by this branch. |

Security decisions still owed **before freeze**, not before this merge, and unchanged by this branch:
cursor integrity (MAC or signature) for `CTR-PAG-001` (`open_blockers[2]`), a page-size upper bound
(`[3]`), and the `CTR-IDM-001` payload-hash algorithm (`[5]`, which A0 correctly names as a Security
decision). These are accepted gaps on Candidate contracts. They block freeze, and they must not be
read as approved by this file.

---

## 4. What this branch changes, reviewed as a security change

| File | Security reading |
|---|---|
| `test-kits/contracts/json-schema-subset.mjs` | `minLength`/`maxLength` now count code points. This is the JSON Schema definition and closes a permissive `minLength`. It makes `maxLength` **looser** for astral-plane text (one code point, two UTF-16 units): measured, 257 × U+1F600 is still rejected at `maxLength: 256`, and 256 is accepted. For the five reference fields this is moot — their patterns admit ASCII only. For free-text fields bounded by `maxLength`, the byte ceiling rises to at most 4 bytes per counted character, which is what any conforming validator would also allow; no consumer relies on the old count. All 692 repository tests, including the other `validate()` consumers (protocol, handoff, db foundation), pass. A lone surrogate counts as one, and is accepted at `maxLength: 1`, which is also standard. **No finding.** |
| `test-kits/contracts/shared-kernel-schema-conformance.test.mjs` | Strictly additive: two unit assertions, two hostile forms, one more target. Strengthens S3/M3 coverage. **No finding.** |
| `test-kits/contracts/shared-kernel-envelope-contracts.test.mjs` | `PRIVATE_REF` drops the `(?!\/)(?!.*\.\.)` lookaheads. Equivalent by construction: after the scheme colon the grammar requires `[A-Za-z0-9_-]+`, so no leading `/`; every `.` must be followed by `[A-Za-z0-9_-]+`, so `..` cannot occur. §3.2 found no divergence on 170 hostile cases; A0 reports 500,000 random agreements (read, not re-run). The new source-equality assertion binds the predicate to the schema text, so the predicate can no longer drift from the contract silently (§3.1 F6). Informational: the schemas are compiled with the `u` flag and `PRIVATE_REF` without it; for an ASCII-only character class this changes nothing. |
| `test-kits/integrity-manifest.json` | Three digests, regenerated. The digest guard bit in §3.1 V4 and F6 (floor exit 86), so the regenerated values are the ones the guard now enforces. Declared under `amends_without_owning`; the scope guard accepts it (2.8). |
| `work-packages/WP-0A-CON-002.json` | Records only. `security_privacy` unchanged (`synthetic-only`, `secrets_required: false`, `deny-unless-declared`). `security_reviewer_agent_run_id` unchanged. `prefer_cross_vendor_review: false` follows the Owner's step-2 decision, which I read and do not re-decide. Naming `/claude/r0_steward` successor is correctly recorded as **not** the acknowledgement. |
| `evidence/…/author-conditions-closure-2026-10-06.md`, `handoffs/…-author-handoff.json` | Synthetic data only. Hostnames used are under the reserved `.invalid` TLD. Secret scan exit 0 (2.7). No credentials, tokens, private URLs or customer data. |

No contract, schema, fixture, `index.json` entry, migration, RLS policy, CI file, RFC or production
configuration changes. No dependency added. No network or credential surface introduced.

---

## 5. Findings

New findings at this head:

| ID | Severity | Finding | Blocks merge? |
|---|---|---|---|
| R1 | Process (not a code defect) | The required `bootstrap` check at head `568658c` did not pass: run `37371252667` failed because no hosted runner was acquired; no step ran. `CONTRIBUTING_AGENTS.md` and RFC-2026-002 require a green required CI run at the head before merge. | **Yes, until a green run exists at this head** |
| R2 | Info | `required_tests` in the manifest still says "all eight hostile scheme forms"; the test now carries ten forms on three targets. Wording, not control. For the Reviewer (C0), not a security condition. | No |
| R3 | Info | The code-point change raises the effective byte ceiling of `maxLength` for astral text (§4). Correct per specification; noted so a future storage-size assumption does not rest on UTF-16 units. | No |

Owed items carried, none merge-blocking from a security standpoint: S11 (freeze gate), C1 contract
half (WP-0A-CON-001), cursor integrity, page-size bound, hash algorithm — all **before freeze**.

The `x-amended-by` record for the `64d9c65` lookahead removal on `ctr-api-001`/`ctr-idm-001`
(`open_blockers[14](f)`) is a record-keeping debt, not a security gap: §3.2 and §4 show the change was
behaviour-preserving.

---

## 6. Stop-the-line

**No.** No secret exposure, tenant leakage, duplicate external side effect, lost job, migration
divergence, irreversible deletion or contract mismatch was found. Every earlier High finding fails
closed at this head under my own mutations.

## 7. Does anything block the merge?

From Security/Privacy: **nothing.** Procedurally, outside this role:

1. No green required CI run at `568658c` (R1).
2. C0 and Q0 re-verification at this head, and a `/claude/r0_steward` Integration verdict, are not
   yet recorded (`open_blockers[13]`).
3. RFC-2026-002 still governs the manual merge (`open_blockers[0]` remainder).

---

## 8. Verdict

My merge-blocking conditions from `28d3142` (conditions 1, 2 and 3: S3, S1+S2, S4) are closed, and
measured closed by this run. Of condition 4, S5, S6, S7, S9 and S10 are closed, S8 is accepted as
fail-closed, and S11 remains owed to the `CTR-PAG-001` pre-freeze gate. The branch's own edits
strengthen the controls and introduce no security regression.

Conditions attached (pre-freeze, not pre-merge):

1. S11 and the cursor-integrity, page-size-bound and hash-algorithm decisions stay open and block
   freeze of `CTR-PAG-001` / `CTR-IDM-001`; this approval does not cover them.
2. The JWT-shaped `actor.id` contract half stays with WP-0A-CON-001.
3. Merge only on a green required `bootstrap` run at the merged head (R1).

VERDICT: security_approved_with_conditions
