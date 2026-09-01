# WP-0A-CON-008 — author self-check

Run: `/claude/a0_atlas` (author). AUTHOR's own record; **not** independent
verification. Review, security, test and integration verification are open.

Toolchain: Node 24.20.0 / npm 11.19.0 via `zsh -lc`. Nothing downloaded.

## Why this package exists

The catalog work reached a point where more polishing was the wrong answer. Nine
contracts carry a schema, a full fixture set and 80–100% mutation coverage, and all
ten remain `Draft` — a level the Decision Register says permits **exploratory spikes
only**. Every consumer package that wants to build a fake or a consumer test is
blocked by a status, not by missing work.

So the deliverable is the decision packet, not another test.

## What was checked, and how

Each contract's `required_before_freeze` list is the Decision Register's own, not a
standard I chose. A script checks each phrase against the shipped schema and fixture
list — a named property, a `$ref`, a pattern, a fixture whose name matches.

Result: **nine of nine assessable contracts have every item present.**

```
CTR-API-001  3/3   CTR-PAG-001  2/2   CTR-IDM-001  3/3
CTR-MOD-001  5/5   CTR-FLG-001  1/1   CTR-SEC-001  4/4
CTR-AUD-001  1/1   CTR-OBS-001  3/3   CTR-USG-001  4/4
```

## The part a reviewer should push on

**Presence is not sufficiency, and I have written the gap into the RFC rather than
letting the table imply otherwise.** Four items are where a script cannot see what
the phrase meant:

| Item | What the script checks | What it cannot establish |
|---|---|---|
| stable ordering tests | `sort` exists and a fixture uses it | that ordering is stable across pages — nothing here can, without a query engine |
| auth rules | `tenant_context` is referenced | any authorization policy; the contract carries context, not policy |
| decimal money | a money property with a decimal representation | that an accountant accepts it — OPEN-016 still requires that |
| bounded cardinality | `sli_tags` closes `additionalProperties` or constrains values | that the cardinality is operationally acceptable — an SRE judgement |

A reviewer who reads one of those rows and says the artifact is not what the phrase
meant has produced the useful outcome. That is why this is an RFC and not a status
change.

## Ownership, deliberately observed

- Five contracts are A0's outright and are proposed for promotion.
- Four have a co-owner — `CTR-SEC-001` with A1, and `CTR-AUD-001`, `CTR-OBS-001`,
  `CTR-USG-001` with A6 — and are **routed**, not proposed. A0 cannot promote a
  contract it half-owns.
- `CTR-NTF-001` belongs to A5 and is **not assessed at all**. Judging another role's
  contract ready is as much that role's decision as writing it, and this repository
  has already recorded one High finding against me for crossing that line.

## Verification

```
$ npm run check
ℹ tests 146   pass 146   fail 0   skipped 0   todo 0
```

**No status changed anywhere** — not in a manifest, not in `contract-catalog/shared-kernel/index.json`, not in the Decision Register. `git diff` touches one decision record, one manifest and this file.

## Open

- RFC-2026-010 is `Proposed`; until disposed of, every contract stays Draft.
- A1 and A6 sign-off cannot be represented by an agent.
- Cross-vendor review is **not** satisfied; carried as the recorded exception.
