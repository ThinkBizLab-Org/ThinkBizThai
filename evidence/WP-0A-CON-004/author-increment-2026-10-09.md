# WP-0A-CON-004 — the `[18]` increment: CTR-OBS-001 `module.implementation_version` bounded at 64 (2026-10-09)

Written by a subagent of `/claude/a0_atlas` (Author). A0 lands a ruling made by A6; it does not approve,
test-verify or integrate this increment, and it moves the package only back to `in_review`.

Base: `origin/main` `9d0b3d23764cfe60b6fefb6b9688ff485f44fe33` (PR #226 merged). Branch:
`agent/claude/WP-0A-CON-004-security-audit-observability-2026-10-09` (`ownership.branch` on main; its remote
was deleted after PR #222 merged, so it was re-created from `origin/main`).

This is **not a records-only PR**: it changes a rule in a Draft contract, so it takes the full path
(C0, A1, Q0 and R0 at this head). It is not a governance PR: no RFC, `CONTRIBUTING_AGENTS.md`, CI workflow
or gate file is touched.

## 1. Source

- A6's countersignature and ruling, `evidence/WP-0A-CON-004/a6-countersign-2026-10-09.md`, carried onto this
  branch first with `git cherry-pick -x fcb4b26bf65b917967f0db81e8a60af97289243e`, unchanged.
- §4 rules: "Bound it at maxLength: 64, with no pattern", matching CTR-EVT-001
  `producer.implementation_version` (`maxLength: 64`, no pattern, RFC-2026-009 R-2), and asks for an
  `x-bound-note` citing that field and the ruling, stating it is not a control, and a kill fixture
  `examples/invalid-module-implementation-version-too-long.json` at 65 code points rejected with exactly the
  one maxLength error. A6: "if the landing changes only that bound, its note and its fixture, no further A6
  run is needed."

## 2. What changed

| File | Owner | Change |
|---|---|---|
| `contract-catalog/shared-kernel/ctr-obs-001/schema.json` | WP-0A-CON-004 | `properties.module.properties.implementation_version` gains `maxLength: 64` and an `x-bound-note` in the style of the 2026-10-07 notes (DECLARED INFERENCE; cites RFC-2026-009 R-2 / CTR-EVT-001 `producer.implementation_version`, A6's file §4 and `open_blockers[18]`; states it is NOT a control). No pattern. `minLength: 1` and `type` unchanged. |
| `contract-catalog/shared-kernel/ctr-obs-001/examples/invalid-module-implementation-version-too-long.json` | WP-0A-CON-004 | New. `valid-ready.json` with only `module.implementation_version` changed to `1.4.0-` followed by 59 `a` (65 code points); minified with a trailing newline, like the other `invalid-*-too-long.json` fixtures. |
| `contract-catalog/shared-kernel/ctr-obs-001/manifest.json` | WP-0A-CON-004 | The fixture registered in `fixtures`, in sort order. No status change: CTR-OBS-001 stays `Draft`. |
| `test-kits/contracts/catalog-registry.test.mjs` | WP-0A-CON-008 (amended, not owned) | `ANNOTATION_DIGESTS['ctr-obs-001']` 31 -> 32, digest `ef75f1eda69f54c1` -> `e76885c679b414cd`; `FIXTURE_SET['ctr-obs-001'].names` gains the fixture. Dated comments name this increment. |
| `test-kits/contracts/schema-mutation-coverage.test.mjs` | WP-0A-CON-003 (amended, not owned) | `CONSTRAINT_SURFACE['ctr-obs-001']` gains `.properties.module.properties.implementation_version.maxLength = 64`, digest `0c4022038b11458e` -> `d97782175e546ec5`; `SITE_FLOOR['ctr-obs-001']` 93 -> 94 (the measured count). `UNKILLED_CEILING` unchanged: the new site is killed. Dated comments name this increment. |
| `test-kits/integrity-manifest.json` | WP-0A-A0-002 (amended, not owned) | The two test files' digests, rebuilt by `npm run regenerate:manifest` ("rebuilt 108 digest(s)"). |
| `work-packages/WP-0A-CON-004.json` | WP-0A-CON-004 | `status` integration_verified -> in_review; `open_blockers[17]` and `[18]` closed in place with A6's §6 words; a new `open_blockers[20]` gives the status rationale; `ownership.amends_without_owning.paths` re-declared to the three files above, with a dated rationale sentence. |
| `evidence/WP-0A-CON-004/a6-countersign-2026-10-09.md` | WP-0A-CON-004 (A6's file) | Carried by cherry-pick, unchanged. |
| `evidence/WP-0A-CON-004/author-increment-2026-10-09.md` | WP-0A-CON-004 | This file. |
| `handoffs/WP-0A-CON-004-author-handoff.json` | WP-0A-CON-004 | Prose rewritten for this increment; refreshed by `npm run -s refresh:handoff`. |

Not touched: `test-kits/contracts/ctr-evt-001-schema-ref-bounds.test.mjs`. `implementation_version` is not
reference-shaped under that guard's naming rule and was never in `KNOWN_UNBOUNDED`, so there is no entry to
remove. `test-kits/branch-identity.test.mjs` already maps this branch to WP-0A-CON-004 on main and is not
changed; it is dropped from `amends_without_owning.paths`.

## 3. Measured validator behaviour

Probe outside the worktree (`scratchpad/con004-probe/probe.mjs`, not committed). It imports only the
repository validator `test-kits/contracts/json-schema-subset.mjs` (`validate`), resolves `$ref` from disk,
starts from the shipped `valid-ready.json` and changes only `module.implementation_version`:

```
64 ascii [64 cp]: []
65 ascii [65 cp]: ["$.module.implementation_version: longer than maxLength 64"]
64 Thai code points [64 cp]: []
65 Thai code points [65 cp]: ["$.module.implementation_version: longer than maxLength 64"]
semver 1.4.0 [5 cp]: []
sha40 [40 cp]: []
semver+sha (55) [55 cp]: []
100000 [100000 cp]: ["$.module.implementation_version: longer than maxLength 64"]
fixture 65 cp: ["$.module.implementation_version: longer than maxLength 64"]
```

64 code points are accepted, 65 are rejected with only the one maxLength error, and the shipped fixture is
rejected with exactly that error. The realistic forms A6 named (semver, 40-hex SHA, semver with prerelease
and SHA build metadata at 55) are accepted. Before this change a 100000-character value was accepted (A6 §1).

`node --test test-kits/contracts/*.test.mjs`: 79 tests, 79 pass, 0 fail (after the pins above were moved;
before, three failed exactly on the annotation, fixture-set and constraint-surface pins this increment moves).

## 4. Blockers

- `open_blockers[17]`: closed in place. A6's §6 text for `[17]` is copied programmatically (the blockquote
  lines joined with single spaces), followed by "Text as recorded:" and the old entry whole.
- `open_blockers[18]`: A6's §6 text for `[18]` copied the same way, verbatim, including its "STILL OWED:
  the landing ..." clause; then one A0 sentence saying this pull request is that landing; then "Text as
  recorded:" and the old entry whole. The entry is not marked CLOSED by A0: the landing is closed only when
  the role rounds have run and the PR merges.
- `open_blockers[20]` (new): status moved back to `in_review`, as PR #204 and PR #210 did, because a rule
  change to a Draft contract is not covered by the integration_verified recorded for PR #210's head.

## 5. What is not done

- No role verdict is written or claimed. C0, A1, Q0 and R0 have not run at this head. A6 needs no further
  run if this landing stands as described in §2 (A6 §4); any change to the value or a pattern goes back to A6.
- No contract status moves: CTR-OBS-001 stays `Draft`; nothing is Frozen.
- A6's notes N-1 to N-3 and its views on `open_blockers[4]` and `[5]` (§3, §5) are not acted on here; they
  are recorded in A6's file and are not conditions.
- CTR-MOD-001 `version` (A6 §4, related, WP-0A-CON-003's) is not touched.
- The record of the amendments on the owners' manifests (WP-0A-CON-008, WP-0A-CON-003, WP-0A-A0-002) is
  owed by their next PRs, as for the earlier increments.
- Nothing is merged; the PR is a draft.
