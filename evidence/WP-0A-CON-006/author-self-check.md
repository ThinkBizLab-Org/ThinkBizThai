# WP-0A-CON-006 — Author self-check

Author run: `/claude/a0_atlas` (Anthropic, `claude-opus-5`)
Branch: `agent/claude/WP-0A-CON-006-usage-and-notification`
Date: 2026-09-01

Author self-evidence only. Not review, security, test, integration, Product Owner,
or merge approval, and it does not move Gate G0.

## The shared-kernel catalog is now complete

**14 of 14** contracts materialized. **115 fixtures** across the catalog are
validated against their own `schema.json`. The index is untouched and still reports
**4 Candidate / 10 Draft** — materializing a Draft does not promote it.

Both contracts passed conformance **without a correction round**, as CTR-MOD-001 and
CTR-FLG-001 did. That is now three packages in a row, and it is the method rather
than luck: rules go into the schema first, so the schema and the fixtures were never
two descriptions of the same rule that could drift apart. WP-0A-CON-002 was rejected
twice for exactly that drift.

## Sourcing

### CTR-USG-001 — Usage and Cost Event (owner A0+A6)

| Rule | Source |
|---|---|
| six `dimension` values | **OB-004 Inputs** names exactly token / search / bytes / egress / processing / publish. The enum is that list and nothing else. |
| `attribution` requires workspace, job, provider | **OB-004 acceptance**: "workspace/business/job/provider attribution ครบ". `business_profile_id` is conditional because §3.1 makes it conditional. |
| money as a **decimal string** with explicit scale | **OB-004** requires correct money precision; **Decision Register §4.2 MOD-130** forbids floating-point money. |
| quantity also a decimal string | **Declared inference**: the same prohibition extended to the number a cost is derived from. §4.2 does not say this. |
| `dedupe_key` | **OB-008** detects missing and **duplicate** usage; **ID-002** requires a dedupe record. |
| `cost.basis` | **Declared inference from OB-008**, which reconciles against provider statements and therefore must know whether a figure was reported or estimated. OB-004 does not name it. |
| `metric_labels` held empty | **OB-006**: no user content, token or page name in a metric label, cardinality bounded. Held at `maxProperties: 0` for the same reason CTR-EVT-001 holds `payload` empty. |

### CTR-NTF-001 — Notification Command and Result (owner **A5**)

| Rule | Source |
|---|---|
| command / result split | **PT-007**: channel-neutral **command and result**. |
| `deep_link.requires_permission: const true` | The catalog row requires a **"permission-checked deep link"**. A link that does not demand the check is the defect the row names, so the prohibition is a const rather than prose. |
| `domain_result_rolled_back: const false` | **PT-007 acceptance**: "delivery failure does not roll back domain result". Same treatment. |
| `failure_class` required on a failure | **CT-007** requires transient and permanent failure to be distinguishable. A failure stating neither is unusable to a retry policy. |
| `dedupe_key` | **ID-005** notification dedupe; **PT-007** requires dedupe support. |
| `message_key` pattern | **Declared inference** from CTR-ERR-001's Thai message-key precedent. PT-007 requires locale support and names no shape. |
| `channel` includes email and line | **Declared inference**: PT-007 names them as *future* channels, so a contract omitting them would have to change to add them. |

## Declared as not demonstrable

- **OB-008 reconciliation** and **ID-005 suppression** are properties of a ledger or
  a dedupe store across many events. A fixture can carry a `dedupe_key`; it cannot
  demonstrate that a second delivery was suppressed.
- **PT-007's non-rollback guarantee** spans two subsystems. The `const false`
  *records the prohibition*; it does not prove the domain result survived.
- **That a cost is arithmetically correct for its quantity.** The schema can require
  a decimal string with a scale; only OB-008 can check the multiplication.

## Author-declared limitations

- **CTR-NTF-001 is owned by A5, and CTR-USG-001 by A0+A6.** Neither owner is in this
  session. This is the same class of ownership irregularity that CTR-MOD-001 created
  for CTR-SEC-001, and independent review was right to grade that High. It is
  recorded in `open_blockers` and in both `freeze_boundary` fields as requiring owner
  ratification — **not** resolved here.
- A6 has not supplied an independently reviewed `billing-cost-ops` capability
  benchmark (WP-0A-A6-001's own blocker), so the cost semantics are materialized from
  the baseline text alone.
- This run authored the change and must not review, security-review, test-verify or
  integrate it.
- Conformance passing on the first run says the schema and the fixtures agree. It
  says nothing about how much of each schema any fixture exercises — independent
  review measured that at 10–19% on the previous two packages, and no one has
  measured it here.

## Verification

| Command | Exit | Result |
|---|---|---|
| `npm run check` | `0` | `tests 116 / pass 116 / fail 0 / skipped 0 / todo 0` |
| `node --test test-kits/contracts/shared-kernel-schema-conformance.test.mjs` | `0` | both new contracts validated against their own schemas |
| `node scripts/validate-work-package-ownership.mjs work-packages` | `0` | no output |
| `node scripts/scan-repository-secrets.mjs` | `0` | no output |

Catalog coverage measured directly: **14/14 materialized, 115 fixtures under
conformance, index unchanged at 4 Candidate / 10 Draft.**
