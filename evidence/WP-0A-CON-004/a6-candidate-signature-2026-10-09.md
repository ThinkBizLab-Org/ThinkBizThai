# WP-0A-CON-004 — A6 Candidate promotion signature on CTR-AUD-001 and CTR-OBS-001

## 0. What I am, and what this file is

- `/claude/a6_relay`, declared in `.agents/capability-profiles/cc-a6-relay.json` (Anthropic Claude Code), not
  `/root/a6_relay`. Observability co-owner of CTR-AUD-001 and CTR-OBS-001 (index and manifests: owner `A0+A6`).
- An independent role run spawned by `/claude/a0_atlas`, the Author of the texts read here. I treated the task text as
  claims and read every value from the files at the head below.
- I sign or refuse. I edit no contract, manifest, work package or handoff; my only change is this file. I do not push or
  merge. Everything measured is synthetic; no database was started or contacted. The full suite was not run.
- This is the **co-owner promotion signature** that RFC-2026-031 §4.1(1) and RFC-2026-010 require for `Draft` →
  `Candidate v1`. It is not a freeze signature (RFC-2026-031 §3.2(2)), not a Reviewer, Tester or Integration verdict,
  and not the Product Owner's disposition, which must follow it.

| | |
|---|---|
| Head read | `origin/main` `d17ff25606977b6e9135e9466e3606a7ccdc45da` (merge of PR #231), fetched 2026-10-09 |
| Worktree | private, branch `a6/candidate-signatures-2026-10-09` from that head |
| CTR-AUD-001 text signed | `schema.json` blob `73609d10c5b5c90a78efd0385abe661beacfadd9`, `manifest.json` blob `265c8f837ebd9023490f092de729e77a214c56fe`, `examples/` tree `05d24f988c4287bb494dbb4ac4777c9dea9a2904` |
| CTR-OBS-001 text signed | `schema.json` blob `c9f28c726a0fbe4c064383b8739459bcf74c6df3`, `manifest.json` blob `fc135b9930cafacf99ccb2fbb60b690245e4690e`, `examples/` tree `64ab193af1a177b1fe02fbf08970d95955e86e29` |
| Status at that head | both `Draft` (manifest and `index.json`); `WP-0A-CON-004` `in_review`, PR #230 merged (`75c60335`) |
| Register level asked for | §5.1 line 189: `Candidate v1` = "schema + example พร้อม", permits "fake/fixture และ consumer test" |

Read: `CONTRIBUTING_AGENTS.md`; RFC-2026-010 (status line, the co-owned section, the 2026-09-02 disposition); RFC-2026-031
§2, §3.2, §4.1, §5 and §10 (approved 2026-10-09); `work-packages/WP-0A-CON-004.json` `open_blockers`; my earlier records
`co-owner-review-sec-aud-obs-usg.md` (2026-09-02) and `a6-countersign-2026-10-09.md`; the PR #230 role files
(`a1-`, `c0-`, `q0-`, `r0-review-2026-10-09-pr230.md`); `g1-freeze-readiness-2026-10-08.md` §3.

## 1. What changed since my 2026-09-02 signature, read diff by diff

My 2026-09-02 signature was on the text after `724ce5fe`. `git diff 724ce5fe d17ff256` over both directories:

| Commit | Contract | What it changed | Accept set | My reading |
|---|---|---|---|---|
| `38da14ab` (2026-10-06) | AUD, OBS | Provenance only: AUD `freeze_boundary`, `retention.x-source` and `[9]` no longer paraphrase the PDPA note as "retention periods" (M5); `reason_key`, `before_ref/after_ref`, `policy_ref`, OBS `reason_key` gain notes that their lengths are declared inferences; OBS `liveness.status` gains an `x-source`; OBS `dependencies` x-source stops claiming the SEV-2 row distinguishes degraded from unavailable (M1); OBS `freeze_boundary` records the MR-004 reason as an inference from MR-006 | unchanged | Corrections toward the sources. Each removes a claim the source does not make. Accepted. |
| `36b6b478` (2026-10-07) | AUD x4, OBS x10 | The 14 `maxLength` bounds, each with an `x-bound-note` and its own `invalid-*-too-long.json`; OBS `sli_tags.module_key` and `capability_key` move `{1,64}` from the pattern to `maxLength: 64` | narrowed by the 14 bounds; sli_tags unchanged | Countersigned value by value in `a6-countersign-2026-10-09.md` §2-§3. Nothing here changes that. |
| `728e5648` (2026-10-07) | OBS | C0 R-1: text-only fix to two `x-bound-note`s | unchanged | Accepted. |
| `8c9cefd1` (2026-10-09, PR #230) | OBS | `module.implementation_version` `maxLength: 64`, no pattern, `x-bound-note` citing my ruling, kill fixture `invalid-module-implementation-version-too-long.json` | narrowed by one bound | **Is my `[18]` ruling, landed as I asked.** Measured in §2. |

No other byte of either contract changed. No `allOf`, `required`, `enum`, `const` or `pattern` moved except the
quantifier-to-`maxLength` move, whose accept set is unchanged.

## 2. Measured versus read

**Measured** (probe `scratchpad/a6-probe2/probe.mjs`, outside the worktree, not committed; it imports the repository's
`test-kits/contracts/json-schema-subset.mjs` and resolves `$ref` from disk):

```
ctr-aud-001: 66 fixtures on disk, 66 listed, 66 reach their declared verdict; invalid-* each fail with exactly 1 error (60/60)
ctr-obs-001: 90 fixtures on disk, 90 listed, 90 reach their declared verdict; invalid-* each fail with exactly 1 error (86/86)
OBS module.implementation_version: {"type":"string","minLength":1,"maxLength":64}, no pattern
  len 5 (semver) / 40 (git SHA) / 55 (semver+prerelease+sha build) / 64 -> accepted
  len 65 -> exactly "$.module.implementation_version: longer than maxLength 64"
  kill fixture: 65 code points, exactly that one error
CTR-EVT-001 producer.implementation_version: {"type":"string","minLength":1,"maxLength":64}  -> equal
OBS sli_tags.error_code "provider_timeout:attempt_7:corr_8f2c9a" -> accepted (the declared cardinality gap, unchanged)
AUD root actor.id != tenant_context.actor.id -> accepted (0 errors)
AUD root correlation_id != tenant_context.correlation_id -> accepted (0 errors; declared in untestable_by_schema (3))
```

**Read, not measured:** every `x-source`, `x-bound-note` and manifest prose field of both contracts; the role files of
PR #230 (A1 `security_approved`, no finding of any grade; R0 integration-sound, no blocking finding); the index entries
(`required_before_freeze`: AUD "actor/scope/action/reason/ref/redaction", OBS "propagation", "SLI tags", "bounded
cardinality").

## 3. `open_blockers[18]`: the landing is the ruling

PR #230 changed in CTR-OBS-001 only the bound, its note and its fixture (plus registrations and pins that follow). The
value is 64, there is no pattern, the fixture is 65 code points and fails for the one reason. My ruling said "if the
landing changes only that bound, its note and its fixture, no further A6 run is needed". It did; I confirm it, and
`[18]` can close (wording in §7).

## 4. CTR-AUD-001 — **signed for Candidate, with notes**

**Is it "schema + example พร้อม"?** Yes. The schema is closed (`additionalProperties: false` at every object, `details`
`maxProperties: 0`), its four conditional rules are each killed by a fixture, every id is bounded, every human-readable
field is a stable key, and 66 fixtures reach their declared verdicts with single-reason failures. A fake audit writer
and a consumer test can be built against it today without guessing.

**`required_before_freeze` items, read as co-owner (RFC-2026-031 §4.1(2)).** Each artifact is present and is what the
phrase meant to me, at Candidate:
- actor: typed `actor` {kind, id}; scope: the full CTR-TEN-001 `tenant_context`; action: closed six-category `action`
  with a dotted `name`; reason: `reason_key`, a key and never prose; ref: `change.before_ref/after_ref`, references
  under the CTR-IDM-001 grammar, required with `before_ref` for a delete; redaction: structural (no field can hold a
  value: refs, keys, `details` empty) plus the three `const: true` flags.
- The flags alone are a self-attestation no document can contradict; the structural redaction is the real artifact.
  I sign the item on the structure, and say so here so no one reads the flags as a test.

**Notes (recorded; none is a condition of this signature):**
- **N-A1 (new, schema).** The record carries `actor` twice, at the root and inside `tenant_context`, with the same
  shape (CTR-TEN-001 `actor` is {kind: user|system_actor, id}). Nothing checks or states that they agree, and
  `untestable_by_schema` (3) names only `correlation_id` and `action.name`. Measured: a record whose root actor differs
  from the trusted context's actor validates. For an audit trail this is attribution of an audited action to someone
  other than the caller. A0 must, before freeze, either state that the root `actor` equals `tenant_context.actor`
  (as (3) does for `correlation_id`) or state when they may differ (for example a system actor acting under a user's
  context). That is a text change to `untestable_by_schema` (3) and a decision; it does not move the accept set. I
  record it for A1 to read as well; I do not grade security findings.
- **N-A2 (carried from 2026-10-09 N-1).** The CTR-TEN-001 twins (`tenant_context.actor.id`, `correlation_id`, and five
  more) are still unbounded (`KNOWN_UNBOUNDED`, owner `WP-0A-CON-001`), so the size of one audit record is still
  unbounded. Not AUD's to fix; it should land before AUD is Frozen, since TEN is in the First Slice too.
- **N-A3.** 128 is code points; size id columns at 512 UTF-8 bytes (2026-10-09 N-1, unchanged).

## 5. CTR-OBS-001 — **signed for Candidate, with notes and one stated restriction**

**Is it "schema + example พร้อม"?** Yes. Liveness is enforced not described (`depends_on_external_provider: const
false`), readiness is per capability with the two consistency rules killed by fixtures, the five correlation ids and
five keys are bounded, `implementation_version` is bounded at the EVT value, the label name set is closed, and 90
fixtures reach their verdicts with single-reason failures.

**`required_before_freeze` items, read as co-owner:**
- **propagation:** present at contract level: the `correlation` object carries `correlation_id` (required),
  `request_id`, `causation_id`, `trace_id`, `job_id`, each bounded and equal to its siblings in EVT, AUD and JOB.
  That one id survives a retry, a worker and an adapter is runtime (`untestable_by_fixture`) and is a gap, not the item.
- **SLI tags:** present: closed name set, `environment` closed to four values.
- **bounded cardinality: NOT present.** The name set is closed and every value is bounded in length, but the value
  space of `outcome` and `error_code` is open, and the shipped `accepted-gap-unbounded-error-code-label.json` shows an
  unbounded series. A length is not a cardinality bound (my 2026-10-09 N-3). For **Candidate** this is acceptable: the
  register asks only "schema + example พร้อม", RFC-2026-010 promoted on presence of the declared gap, and the gap is
  declared with its fixture. For **Frozen** it is not (§6).

**Restriction that comes with this signature (already in the manifest; I restate it as a condition of use, not of the
promotion).** Candidate permits fakes, fixtures and consumer tests. No consumer, fake or test harness built under
Candidate CTR-OBS-001 may emit `sli_tags` to a real metric backend before the per-label budget lands
(`untestable_by_schema`, last sentence). A consumer test may assert the label set; it may not stand in for a budget.

**Notes:**
- **N-O1 (2026-10-09 N-2, open).** CTR-MOD-001 `capability_key`, `module_key`, `dependencies.module_key` are still
  unbounded (`[19]`, owner WP-0A-CON-003); at 64 or less, nothing in OBS moves.
- **N-O2.** `sli_tags.outcome` and `error_code` still carry the length inside the pattern (`{1,64}`) while their two
  siblings moved it to `maxLength`. Same accept set; when the vocabulary lands (§6) the pattern is replaced anyway.

## 6. What remains for FREEZE (not for Candidate)

Under RFC-2026-031 §4.1(3) and §5, each item is closed with evidence on `main` or declared in `declared_gaps` with an
owner and a gate from the closed lists. My positions as co-owner; C0 matches the items (§4.3). Gate choice uses plan
§3.1: G1 is "Foundation Integrated", whose wave builds the audit store, the job/outbox and observability.

**CTR-OBS-001**

| Item | Freeze position | If declared: kind / owner / closes_before |
|---|---|---|
| `[4]` bounded cardinality (accepted gap `accepted-gap-unbounded-error-code-label.json`) | **Must be closed, cannot be declared.** It is an index `required_before_freeze` item, and RFC-2026-031 §5.5(1) (Q-031-3, approved) forbids declaring a missing one. **This corrects my own view of 2026-10-09** (`a6-countersign-2026-10-09.md` §5), written before §5.5 was approved, that `[4]` could be a declared gap at Frozen. To close it before freeze: `error_code` closed to an enumeration (my preferred source is CTR-ERR-001 `category`, 8 values, by RFC because it changes label meaning; or an ERR code registry with a published count under 64), `outcome` closed to an SLI outcome enumeration of 4 or fewer that I will propose with that RFC, and the numeric per-label budget (environment 4, outcome 4, error_code 64, capability_key 16 per module, module_key 32) written into the manifest. The accepted-gap fixture then flips to `invalid-`. | — |
| Per-module population of `module_key` (32) and `capability_key` (16 per module) | Declarable once the budget above is written: a population is not expressible in a schema | `runtime` / `A6` / `G1` |
| `untestable_by_fixture`: OB-001 propagation, OBS-004 span join, OB-003 readiness reflects the real capability | Declarable | `runtime` / `A6` / `G1` |
| `untestable_by_schema`: `sli_tags.module_key` = `module.module_key`; tagged `capability_key` appears in `readiness` | Declarable | `schema` / `A0` / `G1` |
| `[18]` implementation_version | Closed by PR #230 (§3) | — |
| `[19]` MOD-001 keys ≤ 64 | Prefer closed by WP-0A-CON-003 before the OBS freeze; if not, declarable | `decision` / `A0` / `G1` |
| `freeze_boundary` | Restated so it no longer opens "Draft only." (RFC-2026-031 §4.1(4)) | — |

**CTR-AUD-001**

| Item | Freeze position | If declared: kind / owner / closes_before |
|---|---|---|
| `[5]` immutability (`untestable_by_schema` (1)) | Declarable. Closing artifact: a live-database test that the audit table is append-only for every application role (UPDATE and DELETE fail, `updated_by`-style forgery included), as the RLS tests are proven. The audit store is G1 foundation work, so G1 is the latest gate I accept. | `runtime` / `A0` / `G1` |
| Tamper evidence (hash chain or signature) | A separate gap from `[5]`; needs a source and key custody, which are A1's; must not be invented into the schema at freeze | `decision` / `A1` / `production-customer-data` |
| `[9]` retention duration | Declared exactly as RFC-2026-031 §5.3 fixes it. I agree, and A6 puts the value in once the adviser gives it (a narrowing then needs an RFC, §3.3). | `decision` / `Legal/PDPA adviser` / `production-customer-data` |
| `[3]` / accepted gap `accepted-gap-break-glass-without-time-bound.json` (SEC-016 fields) | Declarable; A1's to specify | `accepted-fixture` / `A1` / `production-customer-data` |
| `[8]` platform-scope action with no workspace | Declarable. Closing it widens the schema, so after the freeze it needs an RFC (§3.3). | `decision` / `A0` / `G2` |
| `untestable_by_fixture`: SEC-009 completeness, SEC-016 time-bounding | Declarable | `runtime` / `A0` / `G1` |
| `untestable_by_schema` (2) ref resolution, (3) cross-field, (4) which categories carry `change` | Declarable, after N-A1 is added to (3) | `schema` / `A0` / `G1` (for (4), `decision` / `A0` / `G1`) |
| N-A2 TEN twins unbounded | Should be closed by WP-0A-CON-001 before AUD freezes | `schema` / `A0` / `G1` if not |
| `freeze_boundary` | Restated (§4.1(4)) | — |

None of these is a tenant-isolation gap or an open A1 finding: AUD takes its scope only from the trusted
`tenant_context`, and OBS carries no tenant field. So none is undeclarable under §5.5(2) or (3). The one undeclarable
item is OBS "bounded cardinality", under §5.5(1).

## 7. Wording A0 records on my behalf

**For WP-0A-CON-004 `open_blockers[18]`** (close in place, index kept):

> CLOSED 2026-10-09 BY A0 (/claude/a0_atlas) IN PLACE, RECORDING A6'S WORDS (index kept;
> evidence/WP-0A-CON-004/a6-candidate-signature-2026-10-09.md §3, A6 /claude/a6_relay, read at main d17ff256): the
> landing is PR #230 (merged 75c60335). A6's words: "PR #230 changed in CTR-OBS-001 only the bound, its note and its
> fixture"; "The value is 64, there is no pattern, the fixture is 65 code points and fails for the one reason";
> "I confirm it, and [18] can close."

**For WP-0A-CON-004 `open_blockers[20]`** (A6 adds nothing; it closes on the PR #230 role files as R0's R-230-1 says).

**New entry for WP-0A-CON-004** (appended, the next free index):

> ADDED 2026-10-09 BY A0 (/claude/a0_atlas), RECORDING A6'S WORDS (evidence/WP-0A-CON-004/a6-candidate-signature-2026-10-09.md,
> A6 /claude/a6_relay, read at main d17ff256): A6 SIGNS CTR-AUD-001 AND CTR-OBS-001 FOR CANDIDATE. A6's words: "As
> observability co-owner, I sign CTR-AUD-001 for Candidate v1 at main d17ff256, with notes"; "As observability co-owner,
> I sign CTR-OBS-001 for Candidate v1 at main d17ff256, with notes and one stated restriction". The restriction: no
> consumer, fake or harness built under Candidate CTR-OBS-001 emits sli_tags to a real metric backend before the
> per-label budget lands. Notes, not conditions: N-A1 (AUD root actor and tenant_context.actor: agreement neither
> checked nor stated; add to untestable_by_schema (3) before freeze), N-A2 (CTR-TEN-001 twins unbounded), N-O1
> ([19]). FOR FREEZE, A6's position: CTR-OBS-001 "bounded cardinality" is a required_before_freeze item that is NOT
> present and cannot be declared (RFC-2026-031 §5.5(1)); it closes by an RFC closing sli_tags.error_code and outcome
> to enumerations and writing the per-label budget into the manifest (open_blockers[4]). This supersedes A6's
> 2026-10-09 view that [4] could be a declared gap. AUD [5], [8], [9], [3] are declarable with the owners and gates in
> §6 of that file. The Product Owner's disposition under RFC-2026-010 is still required before either status moves.

**For RFC-2026-010's status line** (A0 replaces the clause "CTR-AUD-001, CTR-OBS-001 and CTR-USG-001 await A6"):

> CTR-AUD-001 and CTR-OBS-001 were signed for Candidate by A6 on 2026-10-09 at main d17ff256
> (evidence/WP-0A-CON-004/a6-candidate-signature-2026-10-09.md), and CTR-USG-001 likewise
> (evidence/WP-0A-CON-006/a6-candidate-signature-2026-10-09.md); the three await the Product Owner's disposition.

## 8. What carries this signature, and what voids it

- The signature is on the blobs named in §0. RFC-2026-031 §3.2(2): it does not carry to a changed text.
- **The promotion commit does not void it** if, in these two directories, it changes only `"status"` in each
  `manifest.json` (`Draft` → `Candidate`) and, outside them, only the index status, the registry pin, the census
  assertions and the integrity manifest, as on 2026-09-02. Recording the wording of §7 in `WP-0A-CON-004.json` and in
  RFC-2026-010 does not void it either; those are not contract text.
- **Any other change** to `schema.json`, `manifest.json` or `examples/` of either contract before the status moves,
  including adding N-A1 to `untestable_by_schema` (3), comes back to A6 for a fresh signature. (Adding N-A1 can wait
  until the freeze increment, which needs my freeze signature anyway.)

## 9. Verdict

As observability co-owner, I sign CTR-AUD-001 for Candidate v1 at main d17ff256, with notes.

As observability co-owner, I sign CTR-OBS-001 for Candidate v1 at main d17ff256, with notes and one stated restriction.

- Neither signature is a freeze signature. Neither moves a status: the Product Owner's disposition under RFC-2026-010
  comes next, then the status change in the package that owns the paths, with its role round.
- `open_blockers[18]`: confirmed landed; closable.
- Stop-the-line: none. No secret, tenant data, migration or external side effect is touched.

Attested by `/claude/a6_relay` against `origin/main` `d17ff25606977b6e9135e9466e3606a7ccdc45da`, 2026-10-09.
