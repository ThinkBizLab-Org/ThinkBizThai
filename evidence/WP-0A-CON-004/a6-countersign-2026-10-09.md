# WP-0A-CON-004 — A6 countersignature of the CTR-AUD-001 and CTR-OBS-001 bounds, and the `[18]` ruling

## 0. What I am

- `/claude/a6_relay`, declared in `.agents/capability-profiles/cc-a6-relay.json` (Anthropic Claude
  Code). I am **not** `/root/a6_relay` (`a6-relay.json`, the OpenAI Codex run); the dispatch named that
  file, and `cc-a6-relay.json` itself records why the two must not be confused.
- Observability co-owner of CTR-AUD-001 and CTR-OBS-001 (`contract-catalog/shared-kernel/*/manifest.json`:
  owner `A0+A6`). I hold no Contract Reviewer, Tester, Integration Owner, Product Owner, merge or Gate G0
  authority.
- A subagent spawned by `/claude/a0_atlas`, which authored the bounds under review. I record that so the
  reader can weigh what follows. I treated A0's task text as a list of claims and read every value from
  the shipped schemas myself.
- I countersign or refuse. I edit no contract, manifest or handoff; my only change is this file. I do not
  push or merge. Everything here is synthetic; no database was started or contacted.

| | |
|---|---|
| Head read | `origin/main` `9d0b3d23764cfe60b6fefb6b9688ff485f44fe33` (merge of PR #226), fetched 2026-10-09 |
| Worktree | private, branch `a6/WP-0A-CON-004-countersign-2026-10-09` from that head |
| Package status at that head | `WP-0A-CON-004` `integration_verified`; PR #210 (the 22 bounds) is merged |
| Contract status at that head | CTR-AUD-001 `Draft` (A0+A6), CTR-OBS-001 `Draft` (A0+A6) |
| Toolchain | `node` as on `PATH`; only the repository's `test-kits/contracts/json-schema-subset.mjs` was imported |

## 1. Measured versus read

**Measured** (my probe `scratchpad/a6-probe/probe.mjs`, outside the worktree, not committed; it imports the
repository validator and resolves `$ref` from disk). For each of the 14 bounds, starting from a shipped
`valid-*` fixture and changing only that field:

```
14 / 14: value of N code points  -> accepted (0 errors)
         value of N+1 code points -> rejected, exactly "<path>: longer than maxLength N"
ids (128), realistic values all accepted:
  UUID (36) · ULID (26) · W3C trace-id (32) · full traceparent (55) · Meta-style numeric pair (33)
  · prefixed ULID (32) · 128 Thai characters (128 code points, 384 UTF-8 bytes)
keys (64): meta-publisher (14), publish.meta.page (17), meta-graph-api (14), a 40-char dotted
  capability key; each accepted wherever its own pattern admits it (pattern rejections only)
module.implementation_version (no maxLength): a 100000-character value is ACCEPTED
```

Also measured by reading the head: `CTR-TEN-001` (embedded by CTR-AUD-001 as `tenant_context`) bounds none
of its seven strings (`minLength: 1` only); they sit in `KNOWN_UNBOUNDED` of
`test-kits/contracts/ctr-evt-001-schema-ref-bounds.test.mjs` with owner `WP-0A-CON-001`. CTR-EVT-001
`producer.implementation_version` is `maxLength: 64`, no pattern. CTR-MOD-001 `version` (semver pattern),
`capability_key` and `module_key` carry no `maxLength`.

**Read, not measured:** the 14 `x-bound-note` texts; `evidence/WP-0A-CON-004/r0-recheck-2026-10-07b.md`
(its list of the 22 bounds); `a1-review-2026-10-07.md` §4-§5 (A1's half and its N-5); the CTR-AUD-001 and
CTR-OBS-001 manifests (`untestable_by_schema`, `accepted_gaps`); my earlier co-owner record
`co-owner-review-sec-aud-obs-usg.md`. I did not run the full suite.

## 2. The four CTR-AUD-001 values

Lens: an audit id must hold every real identifier an audited system emits, and must bound the size of a
record that is kept for the retention period (`open_blockers[9]`), so it must be an identifier and never a
container. None of these is a metric label, so cardinality is not at stake here; storage is.

| # | Field | Value | Location | Decision | Reason |
|---|---|---:|---|---|---|
| A-1 | `audit_id` | 128 | `ctr-aud-001/schema.json` `properties.audit_id` | **Countersigned** | Holds UUID, ULID and any prefixed form with a wide margin; equals CTR-EVT-001 `event_id`, which an audit event is inferred from. Bounds one id at 128 code points, at most 512 UTF-8 bytes. |
| A-2 | `actor.id` | 128 | `properties.actor.properties.id` | **Countersigned with a note** (N-1) | Equals CTR-SEC-001 `revocation.actor.id` (A1 countersigned 128), so a revoking actor is audited without truncation. |
| A-3 | `correlation_id` | 128 | `properties.correlation_id` | **Countersigned with a note** (N-1) | Equals CTR-EVT-001, CTR-SEC-001 and CTR-OBS-001 `correlation_id`: one trace id joins audit, event, credential and health records (SEC-009, OB-001) only if every carrier accepts the same length. |
| A-4 | `causation_id` | 128 | `properties.causation_id` | **Countersigned with a note** (N-1) | Equals CTR-EVT-001 and CTR-OBS-001 `causation_id`; a causing command, event or job id fits. |

## 3. The ten CTR-OBS-001 values

Lens: the five correlation ids are not labels (the `sli_tags` name set is closed and excludes them), so they
are judged on fit and storage as above. The five keys name modules, capabilities and dependencies, three of
them in readiness/dependency reports and two as metric label values, so they are judged on fit, on equality
with the contract that declares the key, and on what a length can and cannot do for cardinality.

| # | Field | Value | Location | Decision | Reason |
|---|---|---:|---|---|---|
| O-1 | `correlation.correlation_id` | 128 | `ctr-obs-001/schema.json` `properties.correlation.properties.correlation_id` | **Countersigned** | Same value as A-3 and CTR-EVT-001; a health signal joins its workflow's trace. |
| O-2 | `correlation.request_id` | 128 | `…correlation.properties.request_id` | **Countersigned** | Edge/platform request ids are well under 64; 128 is ample. |
| O-3 | `correlation.causation_id` | 128 | `…correlation.properties.causation_id` | **Countersigned** | Same value as A-4. |
| O-4 | `correlation.trace_id` | 128 | `…correlation.properties.trace_id` | **Countersigned** | W3C trace-id is 32 hex; even a whole `traceparent` (55) fits, so no tracing format in use is truncated. |
| O-5 | `correlation.job_id` | 128 | `…correlation.properties.job_id` | **Countersigned** | Equals CTR-JOB-001 `job_id`. |
| O-6 | `module.module_key` | 64 | `properties.module.properties.module_key` | **Countersigned** | Equals CTR-EVT-001 `producer.module_key` and `sli_tags.module_key`, so a module named in a health signal can be named in an event and carried as a label without truncation. |
| O-7 | `readiness.capabilities[].capability_key` | 64 | `properties.readiness…items.properties.capability_key` | **Countersigned with a note** (N-2) | Equals `sli_tags.capability_key` and CTR-SEC-001 `scope.capability_key` (A1 countersigned 64): a capability reported as not ready can be tagged and scoped at the same length. |
| O-8 | `dependencies[].dependency_key` | 64 | `properties.dependencies.items.properties.dependency_key` | **Countersigned** | A dependency is a module or provider key; 64 equals the module-key bound. |
| O-9 | `sli_tags.module_key` | 64 | `properties.sli_tags.properties.module_key` | **Countersigned with a note** (N-3) | Equals O-6. Accept set unchanged from the old `{1,64}` quantifier (A1 Probe 2). 64 bytes per label value is an acceptable per-series storage cost. |
| O-10 | `sli_tags.capability_key` | 64 | `properties.sli_tags.properties.capability_key` | **Countersigned with a note** (N-3) | Equals O-7 and CTR-SEC-001 `scope.capability_key`. Same storage reading as O-9. |

**No value is refused.** Every bound holds the real values I could name with at least a 2x margin, and none
is so large that it lets an id or key become a container.

### Notes (each recorded, none a condition of the countersignature)

- **N-1 (A-2, A-3, A-4): the audit record's twin fields are still unbounded.** CTR-AUD-001 embeds a full
  CTR-TEN-001 `tenant_context`, whose `actor.id`, `correlation_id` and `causation_id` (and four more) carry
  no `maxLength`. So the root fields are bounded at 128 while their copies in the same record are not, and
  the size of an audit record is not yet bounded. Already tracked in `KNOWN_UNBOUNDED` with owner
  `WP-0A-CON-001`; my reading is that TEN-001 should take the same 128 so the pair can be checked equal
  (`untestable_by_schema` (3)). I do not own TEN-001 and this does not change my countersignature.
- **N-1 (all ids): 128 is code points, not bytes.** No id carries a charset pattern, so 128 code points can
  be up to 512 UTF-8 bytes. Storage and index sizing must use 512 bytes per id column, not 128. Not a
  change request.
- **N-2 (O-7): the declaring contract is unbounded.** CTR-MOD-001 `capabilities[].capability_key` has no
  `maxLength`, so a module could declare a capability longer than 64 that it then cannot report in
  readiness. This is `open_blockers[19]` (owner WP-0A-CON-003, MOD-001 keys at 64 or less); my
  countersignature assumes that lands at 64 or less.
- **N-3 (O-9, O-10): a length is not a cardinality bound.** 64 bounds the size of one label value, not the
  number of distinct values; OB-006's bounded cardinality still depends on the value budget owed under
  `open_blockers[4]` (§5). These two values are countersigned as lengths only.

## 4. Ruling on `open_blockers[18]` (`module.implementation_version`)

Bound it at maxLength: 64, with no pattern.

Reasons:

1. **One field, one length.** The manifest's own `x-source` says the pair `module_key` plus
   `implementation_version` is the Workstream 3.2 `producer`. CTR-EVT-001 bounds
   `producer.implementation_version` at 64. If a health signal accepts a version an event envelope rejects,
   the health of a build cannot be joined to that build's events. OBS must not accept more than EVT does.
2. **64 is enough.** Semver (`1.4.0`, 5), a 40-hex git SHA (40) and semver with prerelease and SHA build
   metadata (`1.4.0-rc.1+sha.<40 hex>`, 55) all fit (measured, §1).
3. **It is the one remaining container.** Measured: a 100000-character value is accepted today, in a
   payload every runtime module emits on every probe. Unbounded, it is where pasted content or a stack trace
   would land (A1 N-5).
4. **Cardinality is not the reason.** The field is not an `sli_tags` label (the name set is closed); if a
   consumer later promotes it to a build-info label, its cardinality is set by the number of deployments,
   which a length cannot bound either.
5. **No pattern, deliberately.** CTR-EVT-001 carries none; no source says the implementation version is the
   CTR-MOD-001 manifest `version` (semver), and a semver pattern would reject SHA-only builds. A pattern
   would be a new rule with no source and would have to land on EVT and OBS together.

What A6 asks of the landing (A0's to make, as Author; I do not edit the contract): `maxLength: 64` with an
`x-bound-note` citing CTR-EVT-001 `producer.implementation_version` and this ruling, stating it is not a
control; its own kill fixture `examples/invalid-module-implementation-version-too-long.json` (65 code
points) rejected with exactly the one maxLength error; and the role rounds that a rule change to a Draft
contract needs. I countersign the value 64 now: if the landing changes only that bound, its note and its
fixture, no further A6 run is needed. Any other value, or any pattern, comes back to me.

Related, for WP-0A-CON-003 (not mine to change): CTR-MOD-001 `version` is also unbounded; at 64 or less it
can always be reported as an implementation version.

## 5. Views (views only; I change nothing)

**`open_blockers[4]` — ERR code vocabulary vs the OBS cardinality budget.** The budget I recorded as SRE
co-owner on 2026-09-02 stands: `environment` 4, `outcome` 4, `error_code` 64, `capability_key` 16 per
module, `module_key` 32 (CTR-OBS-001 `untestable_by_schema`). The blocker is real: CTR-ERR-001 `code` is
`minLength: 1` with no vocabulary, so `error_code` cannot be closed by reference to it, and the shipped
accepted-gap fixture shows exactly the failure (attempt number and correlation id inside a label). My view:

- the label should not carry the fine-grained ERR `code` at all. The cheapest closure with a source is to
  make the `error_code` label value the CTR-ERR-001 `category` (a closed enum of 8, inside the 64 budget),
  and keep the fine-grained code in the structured log, which OBS-001 already makes linkable by
  correlation. That needs an RFC (it changes label meaning); I would sign it;
- if the Owner prefers a code vocabulary instead, it must be a registry with a published count under 64,
  owned by the CTR-ERR-001 owner, and `error_code` then becomes an enum of it;
- either way, at Frozen this is acceptable as a **declared gap** under the Owner's 2026-10-09 decision if it
  names owner A6 (budget) with A0 (ERR vocabulary) and the closing gate the manifest already states: **no
  consumer emits `sli_tags` to a real metric backend before the budget lands**. I would not accept a gate
  later than that.

**`open_blockers[5]` — AUD immutability.** I agree the gap is real and that the schema cannot close it:
immutability is a property of the store, not of one document. My view:

- the closing artifact is a database test, not a schema field: the audit table is append-only for every
  application role (UPDATE and DELETE fail, including `updated_by`-style forgery, the class of blocker 189),
  proven on the live test database the way the RLS tests are;
- tamper evidence (a hash chain or signature over records) is a second, separate step: it needs a source and
  key custody, which is A1's, and should not be invented into the schema at freeze;
- at Frozen this is acceptable as a declared gap with owners A0+A1+A6 and the closing gate **before the
  first production audit writer or the audit-store migration, whichever is first**. An audit trail written
  in production before that test passes is not one.

## 6. Wording A0 records on my behalf

**For `open_blockers[17]`** (closing text, index kept; it quotes this file):

> CLOSED 2026-10-09 BY A0 (/claude/a0_atlas) IN PLACE, RECORDING A6'S WORDS (index kept;
> evidence/WP-0A-CON-004/a6-countersign-2026-10-09.md, A6 /claude/a6_relay, read at main 9d0b3d23):
> the A6 half is given; the A1 half was given 2026-10-07 (a1-review-2026-10-07.md §4). A6's words: "As
> observability co-owner of CTR-AUD-001 and CTR-OBS-001, at Draft only, I countersign the four
> CTR-AUD-001 values and the ten CTR-OBS-001 values as A0 chose them"; "No value is refused." Four are
> countersigned with a note (AUD actor.id, correlation_id, causation_id: CTR-TEN-001 twins unbounded,
> tracked under WP-0A-CON-001; OBS readiness capability_key: depends on open_blockers[19]) and two more
> (OBS sli_tags.module_key and capability_key) as lengths only, cardinality remaining open_blockers[4]. The
> notes are recorded, not conditions.

**For `open_blockers[18]`** (it is closed as a ruling, not as a landed rule; under the Owner's 2026-10-09
decision it stays a declared item with an owner and a gate until the bound lands):

> RULED 2026-10-09 BY A6 (/claude/a6_relay; evidence/WP-0A-CON-004/a6-countersign-2026-10-09.md §4),
> RECORDED BY A0 (/claude/a0_atlas) IN PLACE, index kept: "Bound it at maxLength: 64, with no pattern",
> matching CTR-EVT-001 producer.implementation_version; "I countersign the value 64 now: if the landing
> changes only that bound, its note and its fixture, no further A6 run is needed." STILL OWED: the landing
> (maxLength 64, x-bound-note, invalid-module-implementation-version-too-long.json at 65 code points, and
> the C0, A1, Q0 and R0 rounds a rule change to a Draft contract needs). Owner: WP-0A-CON-004 (A0 as
> Author). Closing gate: before CTR-OBS-001 is Frozen.

Any other change to this wording is A0's, not mine.

## 7. Verdict

As observability co-owner of CTR-AUD-001 and CTR-OBS-001, at Draft only, I countersign the four CTR-AUD-001 values and the ten CTR-OBS-001 values as A0 chose them.

- **`open_blockers[17]`, A6 half: countersigned**, 14 of 14 values (8 plain, 6 with a recorded note), at
  Draft. This countersigns the values; it does not claim a length is a control, does not move either
  contract out of Draft, and does not sign `open_blockers[4]`, `[5]`, `[8]` or `[9]`.
- **`open_blockers[18]`: ruled, value 64 countersigned, landing owed.**
- Stop-the-line: none. No secret, tenant data, migration or external side effect is touched.

Attested by `/claude/a6_relay` against `origin/main` `9d0b3d23764cfe60b6fefb6b9688ff485f44fe33`, 2026-10-09.
