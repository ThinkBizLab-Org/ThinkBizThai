# A0 integration record: the catalog-rule probes, what three role runs found, and what changed

Author run: `/claude/a0_atlas`. Package `WP-0A-DB-00`, branch `agent/claude/WP-0A-DB-00-catalog-rule-probes`.
The work was built at `055b977`. All three role runs reviewed that head, and their files were
cherry-picked with `-x` (`190fb17` C0, `62596ce` A1, `b0cafcb` Q0). The corrections are the commit
that follows. This file approves nothing.

## 1. In one line each

- **C0:** no stop-the-line. Two MEDIUM findings in the trigger probe, both measured:
  - `WHEN (false)` or `UPDATE OF` on an append-only trigger kept its name and type, and let a
    `security_events` row be updated and deleted;
  - `not tgisinternal` hid `disable trigger all`, which stops FK enforcement.
- **A1:** no stop-the-line. Three MEDIUM findings:
  - **F1:** `updated_by` can be forged through UPDATE on seven tables **on the clean set today**.
    This existed before the probes;
  - **F2:** the audit tables could still be made mutable (a `WHEN`, a replaced body, a child table);
  - **F3:** the SECURITY DEFINER rule covered only `app` and `private`, and only `proconfig`.

  Two of the seven plan questions (F, and C's exemption path) should not have been delegated in
  advance on security grounds.
- **Q0:** no stop-the-line. Seventy-five mutations produced 23 survivors, two HIGH findings, and one
  hand-demonstrated breach per probe class. The HIGH findings:
  - **F1:** the trigger probe, as C0 found;
  - **F2:** the probes were guarded only by regexes over their own text, and eleven evasive edits
    passed.

  Also MEDIUM F3 (definer scope), F4 (NOT VALID and disabled RI triggers), LOW F5
  (`session_replication_role`) and F6 (exemption keying).

Each role run disclosed in its §0 that it is a same-vendor subagent working under the Author's brief.

## 2. Acted on in the corrections commit

| Finding | What changed | Measured |
|---|---|---|
| C0 M1, Q0 F1, A1 F2 (`WHEN`, `UPDATE OF`, moved trigger) | The four append-only triggers are compared by exact `pg_get_triggerdef` text | `WHEN (false)`, `UPDATE OF id` and a moved trigger each fail |
| C0 M2, Q0 F1/F4 (internal triggers) | The enabled check reads every trigger outside the system schemas, internal ones included (395 of 395 enabled on the clean set, 348 of them internal) | `disable trigger all` and `enable replica trigger` fail |
| A1 F2 (child table, partitions) | Neither append-only table may be partitioned, inherit or be inherited from | a child of `audit_logs` fails |
| A1 F2 (replaced body), A1 F3, Q0 F3 | SECURITY DEFINER in every schema but the system ones: the set of 5 is pinned with owner and body digest, `proconfig` must be exactly `search_path=""`, and PUBLIC may not EXECUTE. A new definer function must be added to the list | definer in `public`, owner changed, `refuse_mutation` body replaced, PUBLIC granted EXECUTE: each fails |
| A1 F5 | The definer probe compares settings and never prints their values | test |
| Q0 F4, F07 | The FK rule reads every schema but the system ones and requires `convalidated` | NOT VALID, and a cascading FK from `public`: each fails |
| Q0 F5 | No role or database may default `session_replication_role` | `alter database … set session_replication_role = replica` fails |
| Q0 F6 | FK exemptions are keyed `schema.table.constraint` | test |
| **Q0 F2 HIGH** | **Each probe proves on every run that it can fail.** In a rolled-back transaction a known drift is applied, and the probe must refuse it with its own raise (P0001). The verdict is a pure exported `decideCatalogProbes`, tested with eight wrong outcome shapes and a control. The executor is matched whole. Each probe (SQL, pinned lists, drift, raise) is pinned by digest | Q0's R01, R02, R03 and R04, and a verdict that ignores the self-test, each fail the suite. **With the static test bypassed as well, a silenced FK predicate fails `migrate-clean` live through its self-test** |
| C0 LOW 3 | The digest pin covers both halves C0 deleted undetected | test |
| C0 LOW 4 | Blocker attributions corrected (D38 and D15 measured by C0; a moved trigger now measured) | — |
| A1 F6 | README: an FK action exemption that cascades through tenant data is the irreversible-deletion stop-the-line class, and goes to Security and the Owner | — |

**The full battery on the corrected tree:** 23 drifts, each appended to `140_audit.sql` on a fresh
private cluster (`127.0.0.1:5499`; `:5432` untouched). Every one fails `migrate-clean`, caught by
the probe responsible:
- the original ten;
- NOT VALID, a cascading FK from `public`, a closure made TO PUBLIC;
- a definer in `public`, a changed owner, a replaced body, PUBLIC EXECUTE;
- `WHEN (false)`, `UPDATE OF`, `disable trigger all`, `enable replica trigger`;
- a moved trigger, a child table, `session_replication_role`.

The clean set passes, and `rls-smoke` is green.

## 3. Not acted on here, and why

- **A1 F1 (MEDIUM, pre-existing, exploitable today): `updated_by` forged through UPDATE on seven
  tables.** Fixing it needs a migration (UPDATE policies, or the column removed from the grant),
  which is beyond a probes PR. It is a **new blocker (189)**. A1 recommends it ahead of the eleven
  INSERT forging cases. The grade (A1: MEDIUM, and the Owner may read it as LOW) and the choice of
  remedy are the Owner's.
- **A1 F4 (LOW).** `authenticated` given BYPASSRLS is caught only by rls-smoke. Rewriting
  `auth.uid()` is caught by nothing in the CI shim, and A1 believes the platform forbids it but did
  not measure that. Recorded.
- **A1 on the delegation.** Questions F and C should not be delegated in advance on security
  grounds. F: the blockers are narrowed and not closed, and blocker 189 is new; the Owner may undo
  any narrowing. C: the exemption list is empty, and the README makes any cascade exemption a
  stop-the-line matter for Security and the Owner. **This goes to the Owner in §4.**
- **The deparse-version limit.** The closure and trigger pins compare PostgreSQL 17's text. If CI
  changes major version, the probes fail by name, and the fix is to re-measure. Recorded in the
  README.

## 4. For the Owner

1. **Blocker 189:** the grade of A1 F1, and its remedy. The options are UPDATE policies binding
   `updated_by` to the caller in 102's shape, or `updated_by` removed from the client UPDATE grant
   and maintained by the database.
2. **A1's objection to advance delegation for questions F and C.** Confirm or overrule the
   narrowing of the two blockers, and the exemption path as the README now states it.
3. Still open from before: the two questions in the post-migrate pass's integration record §4, and
   the three from batch 121.
