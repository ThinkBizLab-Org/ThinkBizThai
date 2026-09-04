# Re-audit of the 36 recorded blockers

Checked on `main @ 963990f`. Every verdict below came from opening the file or running the
claim. None came from reading the recorded text, because that text is what is under test:
nothing in this repository binds a recorded blocker to whether it is still true, so a
blocker closed by a later increment stays on the list looking open.

Suite at the time of audit: `clean: exit 0 — tests 266, pass 266, fail 0, skipped 0, todo 0`.

Verdicts: **CLOSED** (fixed, line never removed) · **AUTHORITY** (true; needs a named human
or agent) · **SYSTEM** (true; needs a system that does not exist yet) · **REMEASURE** (the
recorded figure no longer describes the current population).

## WP-0A-CON-002 — 13 recorded, 4 closed

| # | verdict | evidence |
|---|---|---|
| 01 | CLOSED | RFC-2026-004 is `Status: Approved 2026-09-02 by the Product Owner`. |
| 02 | AUTHORITY | Three catalog schemas still carry `acknowledgement_status: pending`. |
| 03 | AUTHORITY | `ctr-pag-001` `cursor` is `{type: string, minLength: 1}`. Specifying a MAC is the contract owner's act. |
| 04 | AUTHORITY | `ctr-pag-001` `page_size` carries `minimum: 1` and no maximum. An upper bound is an enumeration-risk control for the owner to set. |
| 05 | SYSTEM | `ctr-api-001` requires `data` on the success branch and constrains nothing inside it. Per-command response schemas must; the envelope cannot. |
| 06 | AUTHORITY | `ctr-idm-001` `payload_hash` pins the shape `^[a-z0-9-]+:[0-9a-f]{32,128}$` and not the algorithm. Choosing it is a Security decision. |
| 07 | SYSTEM | No-duplicate-and-no-missing across pages needs a real dataset and a paging harness. |
| 08 | AUTHORITY | Half closed: RFC-2026-003 is `Approved 2026-09-02`. Half true: `WP-0A-A0-002` is still `in_review`. |
| 09 | AUTHORITY | Every assigned run is `claude-opus-5`. Only a non-Anthropic review run closes it. |
| 10 | AUTHORITY | Gate G0 is still `External Verification Pending`. |
| 11 | CLOSED | `input_ref` and `result_ref` now carry the allow-list `^(job\|status\|result\|app\|asset\|content):…` with every demonstrated bypass recorded beside it. |
| 12 | CLOSED | The subset validator fails closed: a `format` it cannot enforce is rejected, not passed. |
| 13 | CLOSED | Probed directly — a JWT in `tenant_context.actor.id` is caught by the scanner's `json-web-token` rule. |

## WP-0A-CON-003 — 10 recorded, 2 closed

| # | verdict | evidence |
|---|---|---|
| 01 | CLOSED | RFC-2026-004 approved. |
| 02 | AUTHORITY | No RFC among the fourteen charters secret-handle syntax. A1 is a required co-owner. |
| 03 | AUTHORITY | True, and the mechanism is sharper than recorded. Probed schema and scanner together: the grammar `^secret:[a-z0-9._-]+$` forces lowercase, which defeats every case-sensitive scanner rule. `secret:akiaiosfodnn7example` and a lowercased JWT are both admitted by the schema and missed by the scanner; `secret:sk_live_…` is admitted and caught, so coverage is not literally zero as recorded. The grammar's own restriction is what blinds the scanner. The fix belongs to CTR-SEC-001's owners. |
| 04 | CLOSED | Closed by PR #44. Of 101 root `required` keys across 14 contracts, 8 were isolated by a fixture; all 101 are now proven enforced by a property generated from the catalog, shown to fail both when a key leaves a `required` list and when the validator's own check is gutted. |
| 05 | SYSTEM | The enforcement half of FP-002 needs a policy evaluator that does not exist. The ordering half is enforced. |
| 06 | SYSTEM | MR-002, MR-003 and FP-003 are properties across many manifests or repeated evaluations. Declared untestable and not claimed as materialized. |
| 07 | SYSTEM | Dependency-range grammar, drain timing, bucket allocation, circuit state machine and admin APIs are deliberately not inferred. |
| 08 | AUTHORITY | `WP-0A-CON-002` and `WP-0A-A0-002` are both `in_review`. |
| 09 | AUTHORITY | As CON-002 #09. |
| 10 | AUTHORITY | As CON-002 #10. |

## WP-0A-CON-006 — 13 recorded, 3 closed

| # | verdict | evidence |
|---|---|---|
| 01 | CLOSED | RFC-2026-004 approved. |
| 02 | AUTHORITY | Stands. The Decision Register reserves proposing a contract to its owner; ratification after the fact is a weaker, different control. |
| 03 | AUTHORITY | `ctr-ntf-001` manifest reads `owner: A5`, `status: Draft`, with no ratification field present. |
| 04 | AUTHORITY | `ctr-usg-001` reads `owner: A0+A6`, `status: Draft`. A6 has supplied no reviewed benchmark. |
| 05 | SYSTEM | OB-008 reconciliation and ID-005 dedupe are ledger properties across many events. |
| 06 | CLOSED | `metric_labels` no longer exists in any schema. It was removed outright: bounded cardinality belongs to the CTR-OBS-001 row, which already implements it in `sli_tags`. |
| 07 | SYSTEM | Arithmetic correctness of a cost figure is checkable only by OB-008. |
| 08 | AUTHORITY | Dependency half true — five packages `in_review`. Both named guard defects are closed: the coverage-floor guard has a self-anchor, and the `.npmrc` neutering of `npm run check` is pinned by behaviour since PR #43. |
| 09 | AUTHORITY | As CON-002 #09. |
| 10 | AUTHORITY | As CON-002 #10. |
| 11 | CLOSED | `COVERAGE_FLOOR` is `0.70`, not the recorded 30%, and every contract clears it. |
| 12 | REMEASURE | The counterexample population is 632, not the recorded 441, and the floor moved 30% → 70%, so the recorded 71% does not describe the current set under any definition. A proxy measure here returned 12.8%, but under this author's own definition of "mechanical", not the owner's. The two numbers measure different things and the proxy is **not** offered as a replacement. |
| 13 | REMEASURE | Needs the owner's own instrument. Re-implementing the conditional-versus-leaf split risks producing a number whose definition silently disagrees with the recorded one — the same defect this audit exists to catch. Recorded as unknown, not as closed. |

## Totals

| verdict | count |
|---|---|
| CLOSED | 9 |
| AUTHORITY | 18 |
| SYSTEM | 7 |
| REMEASURE | 2 |
| **recorded** | **36** |

**Not one of the 27 still-true blockers can be closed by writing code.**

## What this audit does not claim

It does not clear the stale nine from their manifests. Each belongs to the package that
recorded it, and removing a line from `WP-0A-CON-002` is CON-002's act, not this package's.
They are reported here so the count is known; clearing them is separate work by their owners.

It does not re-measure #12 and #13. They are reported as unknown. A number produced by a
different definition and presented as an update would be the same class of defect as a
stale blocker: something that looks like evidence with nothing binding it to what is true.
