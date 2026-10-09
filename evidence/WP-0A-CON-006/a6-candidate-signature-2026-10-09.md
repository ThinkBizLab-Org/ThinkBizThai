# WP-0A-CON-006 — A6 Candidate promotion signature on CTR-USG-001, and `open_blockers[18]` and `[23]`

## 0. What I am, and what this file is

- `/claude/a6_relay`, declared in `.agents/capability-profiles/cc-a6-relay.json` (Anthropic Claude Code), not
  `/root/a6_relay`. Billing/cost co-owner of CTR-USG-001 (index and manifest: owner `A0+A6`), and owner of the
  usage-ledger consumer (MOD-130) that the contract names as the enforcement owner of its tenant binding.
- An independent role run spawned by `/claude/a0_atlas`, the Author of the texts read here. I read every value from
  the files at the head below.
- I sign or refuse. I edit no contract, manifest, work package or handoff; my only change is this file. I do not push or
  merge. Everything measured is synthetic; no database was started or contacted. The full suite was not run.
- This is the **co-owner promotion signature** for `Draft` → `Candidate v1` (RFC-2026-010; RFC-2026-031 §4.1(1)), and
  the countersignatures owed under `WP-0A-CON-006` `open_blockers[18]` and `[23]`. It is not a freeze signature and not
  the Product Owner's disposition.

| | |
|---|---|
| Head read | `origin/main` `d17ff25606977b6e9135e9466e3606a7ccdc45da` (merge of PR #231), fetched 2026-10-09 |
| Worktree | private, branch `a6/candidate-signatures-2026-10-09` from that head |
| CTR-USG-001 text signed | `schema.json` blob `af83cccaf0621e9b90481a2fedd2c7c7c19cfdd3`, `manifest.json` blob `4d3e647c9da6c56663906952c71b072fe47b4627`, `examples/` tree `3074198fd4ac1e48db7fbdfa62dc5306e12a2c42` |
| Status at that head | `Draft` (manifest and `index.json`); `WP-0A-CON-006` `in_review` |
| Owner decisions in force | 2026-10-09: USG is **not** in the First Slice (RFC-2026-031 §2), and must reach Candidate before the G0 exit closes (§6, Q-031-1 `อนุมัติ รวม USG (Recommended)`); declared gaps are allowed with an owner and a gate (§5) |

Read: `CONTRIBUTING_AGENTS.md`; RFC-2026-010; RFC-2026-031 §2, §3.2, §4.1, §5, §6, §10; `work-packages/WP-0A-CON-006.json`
`open_blockers` (in particular `[13]`, `[18]`, `[23]`, `[24]`); my 2026-09-02 assessments in
`evidence/WP-0A-CON-004/co-owner-review-sec-aud-obs-usg.md`; `evidence/WP-0A-CON-006/a1-recheck-2026-10-07.md`
(A1 `security_approved_with_conditions`; A1-B1 met in record; A1-R2 is branch history of another fixture, not this
contract's text; no A1 finding open against USG's text).

## 1. What changed since my 2026-09-02 signature, read diff by diff

My third assessment signed the text as of `82a5c4b4` / `a2dc5148`. `git diff a2dc5148 d17ff256` over the directory:

| Commit | What it changed | Accept set | My reading |
|---|---|---|---|
| `a9916c07` (2026-10-06) | `quantity.amount` x-source declares why its fraction (0-8) differs from `cost.amount` (2-8); `cost.amount` x-source declares the 16-digit bound an inference (C0 H-2); `invalid-float-cost.json` now carries `basis: "estimated"` (my 2026-09-02 C5, second half, closed); `Decision Register 5.5` added to sources | unchanged | Correct. A token count has no minor unit; money does. Accepted. |
| `9b94f163` (2026-10-06) | Tenant binding of attribution: `x-rule` on `attribution` and `untestable_by_schema` (5) (A1 SC-1); every fixture's `attribution.workspace_id` and the matching `dedupe_key` segment move from `ws_synthetic_0001` to the tenant context's UUID | unchanged | This is `[18]`. Countersigned in §3. The fixture change was needed: the old fixtures themselves violated the rule. |
| `42549669` (2026-10-07) | Six `maxLength` bounds with `x-bound-note`s and six `invalid-*-too-long.json`; C0 F-5 rule `allOf[0]` and its fixture | narrowed | Bounds: `[23]`, §4. |
| `de4b03eb` (2026-10-07) | F-5 `allOf[0]` and its fixture **withdrawn**; `untestable_by_schema` (6) and (7) declared | `allOf[0]` gone: back to the bounds only | (7) is `[23]`, §4. |

Net: the schema today differs from what I signed only by the six bounds and annotations. It has no `allOf`. The manifest
gained (5), (6), (7) and the C5 half-closure.

## 2. Measured versus read

**Measured** (probe `scratchpad/a6-probe2/probe.mjs`, outside the worktree, not committed; imports the repository's
`test-kits/contracts/json-schema-subset.mjs`, resolves `$ref` from disk):

```
ctr-usg-001: 53 fixtures on disk, 53 listed, 53 reach their declared verdict
  invalid-*: 49 fail with exactly 1 error; invalid-dedupe-key-minlength.json fails with 2 (my 2026-09-02 C5, first half, still open)
six bounds, from valid-provider-reported.json, changing one field:
  usage_id, attribution.workspace_id, attribution.business_profile_id, attribution.job_id, cost.supersedes_usage_id:
    128 -> accepted; 129 -> exactly "<path>: longer than maxLength 128"
  attribution.provider_key: 64 -> accepted; 65 -> exactly "...: longer than maxLength 64"
realistic job ids (ULID 26, UUID 36, prefixed 30) -> accepted
dedupe_key composed from max-length parts (workspace 128, job 128, media_processing, provider_reported,
  instant with a 6-digit fraction) = 319 characters; dedupe_key maxLength 512 -> every valid composition fits
attribution.workspace_id != tenant_context.workspace_id -> ACCEPTED (0 errors)    [declared (5), not enforceable here]
attribution.business_profile_id != tenant_context's  -> ACCEPTED (0 errors)    [declared (5)]
estimated event carrying cost.supersedes_usage_id      -> ACCEPTED (0 errors)    [declared (7)]
attribution.job_id holding an email-shaped value       -> ACCEPTED (0 errors)    [declared (6)]
```

**Read, not measured:** every `x-source`, `x-bound-note`, `x-rule` and manifest field; the index entry
(`required_before_freeze`: "dimensions", "attribution", "decimal money", "dedupe").

## 3. `open_blockers[18]` — the tenant binding of attribution: **countersigned**

What I countersign: the `x-rule` on `attribution` and `untestable_by_schema` (5), as written at this head.

1. **The rule is right, and it is the only safe one.** `attribution.workspace_id` (and `business_profile_id` when
   present) must equal the same field of `tenant_context`, in the Trusted Tenant Context's identifier space, and a
   consumer must reject an event where they differ and must never bill the attribution value in place of the trusted
   one. Otherwise an event emitted under tenant A charges workspace B. I measured that the schema accepts the mismatch,
   which is exactly what (5) says.
2. **The enforcement owner is right.** The usage-ledger consumer (MOD-130, owner A6) at ingest, before any charge is
   recorded. As MOD-130's owner I accept that obligation. The producer takes both values from the Trusted Tenant
   Context it runs under.
3. **`dedupe_key` carries the attribution workspace too.** (3) already makes its agreement a resolver obligation, so a
   key built from a mismatched attribution is rejected by the same ingest check. No change needed.
4. **Condition of use at Candidate, not of the promotion.** Any fake ledger or consumer test built under Candidate
   CTR-USG-001 must include the mismatch-rejection test for both fields. Candidate is what lets that test be written;
   a fake that sums attribution without it would teach the wrong behaviour.
5. **For freeze (not now):** this is a tenant-isolation gap, so RFC-2026-031 §5.5(3) makes it **undeclarable**. Before
   CTR-USG-001 can be Frozen it must be closed by evidence: a MOD-130 ingest test (or a store-level check in
   `app.usage_events`) that rejects both mismatches, on `main`. The alternative, removing the duplicated fields and
   deriving attribution from `tenant_context`, is a breaking change and cheaper before the freeze than after.

## 4. `open_blockers[23]` — the six bounds and declarations (6) and (7): **countersigned**

**The six bounds, each countersigned:**

| # | Field | Value | Decision | Reason |
|---|---|---:|---|---|
| U-1 | `usage_id` | 128 | Countersigned | Equals CTR-EVT-001 `event_id`; it is ID-002's redelivery key, so it must hold any event id. |
| U-2 | `attribution.workspace_id` | 128 | Countersigned | Must equal `tenant_context.workspace_id` (§3), so it must not be narrower than any tenant identifier the catalog admits; equals CTR-IDM-001 `scope.workspace_id`. |
| U-3 | `attribution.business_profile_id` | 128 | Countersigned | Same as U-2. |
| U-4 | `attribution.job_id` | 128 | Countersigned | Equals CTR-JOB-001 `job_id`: every job that contract admits can be attributed, and no longer one. |
| U-5 | `cost.supersedes_usage_id` | 128 | Countersigned | Holds a `usage_id`; any other value either makes a valid id unreferenceable or admits a reference no id can equal. |
| U-6 | `attribution.provider_key` | 64 | Countersigned | A registry key of the `module_key` class (RFC-2026-009, 64); the longest fixture value is 10. |

No value is refused. Every composition of `dedupe_key` from maximal valid parts fits its 512 (measured 319).

**(6) "bounds bound length, not content": countersigned as an accurate declaration.** One note for the freeze, not a
condition: the ids carry no character class, while `dedupe_key`'s workspace and job segments are `[A-Za-z0-9_-]+`. So
an id that is valid in `attribution` (with a `.`, `@` or `+`) makes the event's own `dedupe_key` unconstructible. My
preferred closure before freeze is to give `attribution.workspace_id` and `attribution.job_id` that same class, so
every valid attribution composes to a valid key and a contact detail cannot sit in either id. That is a narrowing;
A0 authors it, A6 countersigns it.

**(7) "this contract does not decide whether an estimate may supersede": countersigned as an accurate declaration,
and A6's decision on adopting the rule is: not now, and only by RFC.**
- Whether an `estimated` event may carry `supersedes_usage_id` decides whether an estimate can revise an earlier
  estimate. With the instant in `dedupe_key`, two estimates for one job and dimension are summed. So forbidding
  supersession by an estimate also forbids re-estimation, and permitting it needs a rule for which estimate wins.
  Either answer is billing semantics: I read adopting the rule as a billing-semantics change, so it goes through an
  RFC (`CONTRIBUTING_AGENTS.md`; the RFC-2026-014 precedent; R0 I-1), not through a contract increment.
- The answer belongs with OB-008's reconciliation model, which is undelivered. Until then the declaration in (7) is
  the correct state, and a consumer must not treat an estimate's `supersedes_usage_id` as replacing anything.
- For the freeze it is declarable: `decision` / `A6` / `G2` (before the first usage producer; plan §3.1 puts
  `research_search` in W3).

## 5. CTR-USG-001 — **signed for Candidate, with notes and two conditions of use**

**Is it "schema + example พร้อม"?** Yes. Closed schema; six usage dimensions; required attribution with bounded ids;
money and quantity as decimal strings with no sign and bounded magnitude; a stated, pattern-enforced `dedupe_key`
composition with the instant in canonical form; 53 fixtures reaching their declared verdicts.

**`required_before_freeze` items, read as co-owner (§4.1(2)).** All four present and what the phrase meant to me:
dimensions (the six OB-004 values, closed); attribution (workspace, job, provider required; business profile
conditional, as in §3.1); decimal money (string, 2-8 scale, no sign, no float, parse-as-decimal stated); dedupe
(composition, uniqueness scope, both collision directions, redelivery separated onto `usage_id`).

**Conditions of use (restated with the signature; they bind consumers and fakes, not the promotion):**
1. Every consumer test or fake ledger implements the §3 mismatch rejection for both attribution fields.
2. No consumer parses `cost.amount` or `quantity.amount` into a binary float; `9999999999999999.99999999` must survive
   a round trip (the 2026-09-02 correction, unchanged).

**Notes (recorded, not conditions):**
- **N-U1.** My 2026-09-02 C5 first half is still open: `dedupe_key.minLength: 1` is dead (shortest valid key 44), so
  `invalid-dedupe-key-minlength.json` fails twice (measured 2 errors). Owner WP-0A-CON-003 (`SITE_FLOOR` pin). Hygiene.
- **N-U2.** `untestable_by_schema` (5) and (6) still read "A6's countersignature ... is OWED". After this file they
  are stale. See §7 for what A0 may change without voiding this signature.
- **N-U3.** `[24]`: `app.usage_events.provider_key` has no length bound in `061_metering.sql`. The database is wider
  than the wire, so no valid event is refused; owner WP-0A-DB-00. Not a contract matter.

## 6. What remains for FREEZE (not for Candidate)

USG is not in the First Slice. These are recorded so a later freeze review does not rediscover them.

| Item | Freeze position | kind / owner / closes_before |
|---|---|---|
| (5) tenant binding | **Undeclarable** (§5.5(3)); close by an ingest or store test on `main` (§3 item 5) | — |
| (7) estimate supersession | Declarable; adoption by RFC (§4) | `decision` / `A6` / `G2` |
| (6) id character class | Prefer closed before freeze (§4); else declarable | `schema` / `A0` / `G2` |
| (2) self-reference and supersession uniqueness, (3) dedupe-key agreement, (4) measurement identity | Declarable; resolver and producer obligations | `runtime` / `A6` / `G2` |
| (1) cost arithmetic; `untestable_by_fixture` OB-008 reconciliation, missing and duplicate detection | Declarable | `runtime` / `A6` / `G6` |
| `0.10` vs `0.10000000`: no canonical money spelling (in `cost.amount` x-source) | Declarable; matters to any equality check on amounts | `decision` / `A6` / `G6` |
| VAT treatment (OPEN-001) | Declarable | `decision` / `Accountant` / `G6` |
| N-U1 dead `minLength` | Hygiene; close in WP-0A-CON-003 | — |
| `freeze_boundary` | Restated (§4.1(4)) | — |

## 7. Wording A0 records on my behalf

**For WP-0A-CON-006 `open_blockers[18]`** (close in place, index kept):

> CLOSED 2026-10-09 BY A0 (/claude/a0_atlas) IN PLACE, RECORDING A6'S WORDS (index kept;
> evidence/WP-0A-CON-006/a6-candidate-signature-2026-10-09.md §3, A6 /claude/a6_relay, read at main d17ff256):
> A6's countersignature is given. A6's words: "What I countersign: the x-rule on attribution and untestable_by_schema
> (5), as written at this head"; "As MOD-130's owner I accept that obligation." Condition of use, not of any merge:
> every consumer test or fake ledger built under Candidate CTR-USG-001 implements the mismatch rejection for
> workspace_id and business_profile_id. For freeze: a tenant-isolation gap, undeclarable under RFC-2026-031 §5.5(3);
> it closes only by an ingest or store test on main that rejects both mismatches.

**For WP-0A-CON-006 `open_blockers[23]`** (close in place, index kept):

> CLOSED 2026-10-09 BY A0 (/claude/a0_atlas) IN PLACE, RECORDING A6'S WORDS (index kept;
> evidence/WP-0A-CON-006/a6-candidate-signature-2026-10-09.md §4, A6 /claude/a6_relay, read at main d17ff256):
> the six CTR-USG-001 bounds are countersigned (usage_id, attribution.workspace_id, attribution.business_profile_id,
> attribution.job_id, cost.supersedes_usage_id at 128; attribution.provider_key at 64); "No value is refused."
> untestable_by_schema (6) and (7) are countersigned as accurate declarations. On (7) A6 decides: "not now, and only
> by RFC" — A6 reads adopting the estimate-supersession rule as a billing-semantics change, owed with OB-008's
> reconciliation model; declarable at freeze as decision / A6 / G2. Note for freeze, not a condition: give
> attribution.workspace_id and attribution.job_id the dedupe_key segment class [A-Za-z0-9_-]+.

**For WP-0A-CON-006 `open_blockers[13]`**: A6's half (`[18]` and `[23]`) is given by this file; `[22]` (A5) stays open.

**New entry for WP-0A-CON-006** (appended, the next free index):

> ADDED 2026-10-09 BY A0 (/claude/a0_atlas), RECORDING A6'S WORDS (evidence/WP-0A-CON-006/a6-candidate-signature-2026-10-09.md,
> A6 /claude/a6_relay, read at main d17ff256): A6 SIGNS CTR-USG-001 FOR CANDIDATE. A6's words: "As billing co-owner,
> I sign CTR-USG-001 for Candidate v1 at main d17ff256, with notes and two conditions of use." The conditions bind
> consumers and fakes, not the promotion: (1) the attribution/tenant_context mismatch rejection; (2) no binary-float
> parsing of amounts. The Product Owner's disposition under RFC-2026-010 is still required before the status moves;
> it is the step RFC-2026-031 §6 (Q-031-1) requires before the G0 exit closes.

**For RFC-2026-010's status line:** the same sentence as in
`evidence/WP-0A-CON-004/a6-candidate-signature-2026-10-09.md` §7, which covers all three contracts.

## 8. What carries this signature, and what voids it

- The signature is on the blobs named in §0 and does not carry to a changed text (RFC-2026-031 §3.2(2)).
- **The promotion commit does not void it** if, in this directory, it changes only `"status"` in `manifest.json`
  (`Draft` → `Candidate`) and, outside it, only the index status, the registry pin, the census assertions and the
  integrity manifest.
- **A0 may also, without a fresh A6 run**, replace in `untestable_by_schema` (5) the sentence "A6's countersignature of
  this declaration is OWED (G0 step 5's A6 run); until it is recorded this is A0's declaration, not the co-owners'."
  and in (6) the sentence "A6's countersignature of the bounds is OWED; until it is recorded they are A0's." each with
  "Countersigned by A6 on 2026-10-09: evidence/WP-0A-CON-006/a6-candidate-signature-2026-10-09.md.", together with the
  digest pin that follows, and nothing else in the contract. Any other change to `schema.json`, `manifest.json` or
  `examples/` comes back to A6.

## 9. Verdict

As billing co-owner, I sign CTR-USG-001 for Candidate v1 at main d17ff256, with notes and two conditions of use.

- `open_blockers[18]`: **countersigned.** `open_blockers[23]`: **countersigned** (six bounds, (6), (7); the (7) rule not
  adopted, by RFC only).
- Not a freeze signature; no status moves until the Product Owner's disposition under RFC-2026-010, then the status
  change in the package that owns the path, with its role round.
- Stop-the-line: none. No secret, tenant data, migration or external side effect is touched.

Attested by `/claude/a6_relay` against `origin/main` `d17ff25606977b6e9135e9466e3606a7ccdc45da`, 2026-10-09.
