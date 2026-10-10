# A5 owner assessment of CTR-NTF-001 (WP-0A-CON-006 `open_blockers[1]`, `[2]`, `[19]`, `[22]`), 2026-10-10

- **Assessor:** `/claude/a5_loom`, acting as A5 (Loom), owner of CTR-NTF-001, under
  `.agents/capability-profiles/cc-a5-loom.json` and
  `evidence/WP-0A-A0-001/product-owner-disposition-2026-10-09-ntf-a5.md`.
- **Base read:** `origin/main` `9d0751ece9ba71c6bb7812f55dd04ab3c4b96c4b` (PR #242).
- **Text assessed (SHA-256, [measured] `shasum -a 256` at the base):**
  `ctr-ntf-001/schema.json` `925c502d5cf2608327b79d91733ba06e7d49f4e6c5d6fdf1c7177738dfac014e`;
  `ctr-ntf-001/manifest.json` `4177c792b764531d0d8d3a5f5d297abece48a1fc863a1be76335c44728f94675`;
  both last changed by `56ff27a27058957cc21b3ec5c29d10c292067558` [measured: `git log -1 origin/main -- <path>`].
- **Validator used for every probe:** `test-kits/contracts/json-schema-subset.mjs`, SHA-256 `9037cc0a…5632`
  [measured], the same hash Q0 recorded for the benchmark. Node v24.20.0 [measured].

## Disposition

**RATIFY WITH CONDITIONS, for Candidate only.** I adopt the CTR-NTF-001 text at the hashes above as A5's own
proposal, with the owner decisions OD-1 to OD-6 in §4, on the conditions C-1 to C-3 in §5. Nothing here moves a
status, freezes the contract, or is the Frozen-stage signature (RFC-2026-031 §3.2 item 2), which is out of my scope.
Items owed before Frozen are listed separately (§6); they are not Candidate conditions.

## §0. Who I am (disposition Q4)

- I am `/claude/a5_loom`, a Claude Code subagent, vendor Anthropic, model `claude-opus-5-5` [read: my own system
  context]. I was spawned by `/claude/a0_atlas` (A0) [read: the brief, line 3: "From A0 (`/claude/a0_atlas`), who
  dispatches you and who wrote CTR-NTF-001"].
- **Same lineage.** A0 is the author of the work I assess: `open_blockers[1]` records that A0 wrote the CTR-NTF-001
  proposal A5 owns, and that ratification after the fact "is a weaker and different control" [read:
  `work-packages/WP-0A-CON-006.json` `open_blockers[1]`]. I share A0's vendor and model. The Product Owner accepted
  same-lineage ratification on condition of this disclosure and of A1, C0 and Q0 re-reading the result [read:
  disposition Q4]. I disclose it; I do not claim it is cured.
- I hold no Author, Reviewer, Tester, Integration Owner, Product Owner, merge or Gate G0 authority. I edited no
  contract, test, schema, fixture or manifest. I wrote one file, this one, in my own worktree.
- An earlier, undeclared use of the id `/claude/a5_loom` (WP-0A-DB-00 batch 090) carries no A5 signature, and
  nothing here gives it one [read: `cc-a5-loom.json` `limitations.declaration_origin`].
- **The benchmark is on main.** Q0's scoring and the profile's `benchmark_outcome` are on `origin/main`
  [measured: `git log -1 origin/main -- evidence/WP-0A-CON-006/q0-a5-benchmark-2026-10-10.md` → `c9016ca4`;
  `cc-a5-loom.json` last changed in `56ff27a2`], so the profile's rule "until then this run does not sign as A5" is
  satisfied.
- **SC-2 is in the manifest before I ratify**, as `role_scope` requires: `untestable_by_schema` item (4) [read:
  manifest at the base], and A1 confirmed it meets SC-2 [read: `evidence/WP-0A-CON-006/a1-review-2026-10-10-ntf2a.md`
  §3].

### §0.1 Capability values in `cc-a5-loom.json`, confirmed or corrected

| Field | Declared | Mine | Basis |
|---|---|---|---|
| `agent_run_id` | `/claude/a5_loom` | **confirm** | [read] the brief names me so |
| `vendor` / `model` | Anthropic / `claude-opus-5-5` | **confirm** | [read] my system context |
| `can_edit_files` | true | **confirm** | [measured] I wrote this file and two probe files |
| `can_run_shell` | true | **confirm** | [measured] every command in this file |
| `can_run_tests` | true | **confirm** | [measured] `node --test test-kits/contracts/schema-mutation-coverage.test.mjs test-kits/contracts/shared-kernel-envelope-contracts.test.mjs test-kits/contracts/catalog-registry.test.mjs` → 44 pass, 0 fail |
| `can_access_network` | true | **confirm** | [measured] `git fetch -q origin` exit 0 |
| `can_use_browser` | true | **confirm, not exercised** | [read] browser tools are in my tool list; I did not use them |
| `can_create_branch_or_worktree` | true | **confirm** | [measured] `git worktree add -q -b a5/WP-0A-CON-006-ntf-assessment-2026-10-10 …` exit 0 |
| `supported_languages` | javascript, json, markdown, thai | **confirm** | [measured] probes in JavaScript over JSON; Thai source lines read and quoted below |
| `can_access_external_secrets` | false | **CORRECT → true (present, not exercised)** | see below |
| `unavailable_tools` | includes "any production database or provider credential" and "external notification provider accounts (LINE, email, SMS, push)" | **CORRECT** | see below |

**The correction, measured.** `session_connectors_status` (the harness's own connector listing, read-only) printed
these connectors as `connected` in my session: Vercel (238 tools), Supabase (29), Microsoft 365 (50), Gmail (30),
Cloudflare Developer Platform (23), Notion (49), Figma (41), Claude Docs (8), visualize (2), scheduled-tasks (6)
[measured]. By name, those tool sets include reading a hosting project's environment variables (Vercel
`get_project_env`, `filter_project_envs`, `get_shared_env_var`), running SQL on a database project (Supabase
`execute_sql`), and sending mail and chat (Microsoft 365 `outlook_send_mail`, `teams_send_chat_message`; Gmail
`send_message`) [read: my tool list]. I called none of them except the status listing, and this assessment needs
none. Whether the Supabase projects are production, and whether the Vercel variables hold secrets, is **not
determined**. The profile's own rule (`network_note`: tools present in the harness are "declared true rather than
understated") then requires:

- `capabilities.can_access_external_secrets`: `false` → `true`, with a note: "Connectors able to read external
  environment variables and run SQL on database projects are present in the harness (measured 2026-10-10 by
  /claude/a5_loom). The A5 assessment used none of them."
- `limitations.unavailable_tools`: remove "external notification provider accounts (LINE, email, SMS, push)" and
  replace it with "LINE, SMS and push provider accounts (email and chat connectors ARE present: Microsoft 365, Gmail;
  not used for A5 work)"; replace "any production database or provider credential" with "production database or
  provider credential: not determined (a Supabase connector is present; not used for A5 work)".

This is **condition C-2**: the brief and the disposition require the correction in the profile before my signature
is cited.

## §1. Sources read

| Source | Location | Used for |
|---|---|---|
| ID-005 | `docs/plans/module-contracts-events-jobs-workstream-th.md:273` — "Notification dedupe strategy … job/event notification … dedupe key policy … completed/retried event ไม่แจ้งผู้ใช้ซ้ำเกิน policy" | OD-4 |
| ID-002 | same file `:270` — "redelivery N ครั้ง commit side effectครั้งเดียว", keyed by "consumer key/event id" | OD-4 (what ID-005 must add) |
| PT-007 | same file `:286` — "dedupe/deep-link/locale supported" | scope |
| Register §4.1 | `docs/sprint-0a/sprint-0a-decision-register-contract-catalog-th.md:138` — "Owner มีสิทธิ์เสนอ Contract แต่ A0 freeze/version shared contract" | OD-1 |
| Register §4.3 | same file `:173` (contract-catalog: producer proposal, A0 version) and `:177` — "UX message catalog \| A5 \| Domain ownerเสนอ stable message key" | OD-1, OD-3 `message_key` |
| Register §5.2 row | same file `:211` — CTR-NTF-001, owner A5, "locale, dedupe, permission-checked deep link" | the `required_before_freeze` phrase |
| Register §5.5 | same file `:271` — "Payload ห้ามมี secret … หรือ customer content เกินจำเป็น" | OD-4 (no raw ids in a key) |
| RFC-2026-009 R-2 | `architecture/decisions/RFC-2026-009-reference-bounds.md:169-188` — "128 on the ids and `dedupe_key` … 256 on the `scheme:path` references"; 256 enforced as CHECK in the database | OD-3 |
| RFC-2026-009 R-5 | same file `:236-240` — "an id must be opaque. These fields constrain length, not content." | OD-3 `notification_id` |
| RFC-2026-031 | `architecture/decisions/RFC-2026-031-first-slice-contract-freeze.md:99`, `:142-145` | scope of this signature |
| CTR-EVT-001 | `contract-catalog/shared-kernel/ctr-evt-001/schema.json`: `subject` required `type` (≤64), `id` (≤128), `version` (integer ≥1); `event_type` pattern `^[a-z0-9]+\.[a-z0-9]+\.[a-z0-9]+$` ≤128 [read] | OD-4 inputs |
| Batch 051 | `db/foundation/migrations/051_notification.sql:505` (`user_id`), `:525` ("No maximum, because the contract states none"), `:576-577` (`unique (workspace_id, user_id, dedupe_key)`), `:597` ("nothing can write a notification row today"), `:598-601` (`notification_id` stored as the uuid `id`) | OD-4, F-1 |
| CTR-USG-001 | Candidate; its `dedupe_key` keeps `minLength: 1` under a pattern [read] | OD-5 |
| A1 review | `evidence/WP-0A-CON-006/a1-review-2026-10-10-ntf2a.md` §3, §4 | OD-2 |

## §2. Probes (C-T3 (b) and (c))

Probes live outside the repository, in `$SP/a5-assess-probes/` (`probe.mjs` SHA-256
`8a98e2e6fcc9824c5f03d5a3011de08a9561fb1cb0221d61fbde2712a66abd3c`, `probe2.mjs`
`9d21cd6321fa075fe9f961dacb44b8f122267bb7ae8a8733c5598cba4fa6f995`). Their full source is in Appendix B so
anyone can re-run them. Each takes the worktree path, loads the shipped schema, resolves `tenant_context`'s `$ref`
to the shipped CTR-TEN-001, validates with `json-schema-subset.mjs`, and for each fixture prints the result with
the rule **present** and with **that rule alone deleted** (one keyword, or one name from one `required` array).

**Command:** `node probe.mjs <worktree>` [measured], output verbatim:

```text
## (b)/(c) fixture probes
invalid-deep-link-without-permission.json | present: INVALID ["$.deep_link.requires_permission: expected const true"]
invalid-deep-link-without-permission.json | deleted properties.deep_link.properties.requires_permission.const: VALID
invalid-deep-link-omits-permission-flag.json | present: INVALID ["$.deep_link: missing required property 'requires_permission'"]
invalid-deep-link-omits-permission-flag.json | deleted properties.deep_link.required.requires_permission: VALID
invalid-command-without-deep-link.json | present: INVALID ["$: missing required property 'deep_link'"]
invalid-command-without-deep-link.json | deleted allOf.0.then.required.deep_link: VALID
invalid-deep-link-public-url.json | present: INVALID ["$.deep_link.target_ref: does not match pattern ^(app|content|asset|job):[A-Za-z0-9_-]+(?:\\.[A-Za-z0-9_-]+)*(?:/[A-Za-z0-9_-]+(?:\\.[A-Za-z0-9_-]+)*)*$"]
invalid-deep-link-public-url.json | deleted properties.deep_link.properties.target_ref.pattern: VALID
invalid-deep-link-additionalproperties.json | present: INVALID ["$.deep_link: additional property 'zz_undeclared' is not permitted"]
invalid-deep-link-additionalproperties.json | deleted properties.deep_link.additionalProperties: VALID
invalid-notification-id-too-long.json | present: INVALID ["$.notification_id: longer than maxLength 128"]
invalid-notification-id-too-long.json | deleted properties.notification_id.maxLength: VALID
invalid-notification-id-minlength.json | present: INVALID ["$.notification_id: shorter than minLength 1"]
invalid-notification-id-minlength.json | deleted properties.notification_id.minLength: VALID
invalid-message-key-too-long.json | present: INVALID ["$.message_key: longer than maxLength 128"]
invalid-message-key-too-long.json | deleted properties.message_key.maxLength: VALID
invalid-message-free-text.json | present: INVALID ["$.message_key: does not match pattern ^notification\\.[a-z_.]+$"]
invalid-message-free-text.json | deleted properties.message_key.pattern: VALID
invalid-deep-link-target-ref-too-long.json | present: INVALID ["$.deep_link.target_ref: longer than maxLength 256"]
invalid-deep-link-target-ref-too-long.json | deleted properties.deep_link.properties.target_ref.maxLength: VALID
invalid-dedupe-key-too-long.json | present: INVALID ["$.dedupe_key: longer than maxLength 128"]
invalid-dedupe-key-too-long.json | deleted properties.dedupe_key.maxLength: VALID
invalid-dedupe-key-contact-detail.json | present: INVALID ["$.dedupe_key: does not match pattern ^ntf:[A-Za-z0-9_-]+(?::[A-Za-z0-9_.-]+)*$"]
invalid-dedupe-key-contact-detail.json | deleted properties.dedupe_key.pattern: VALID
invalid-dedupe-key-minlength.json | present: INVALID ["$.dedupe_key: shorter than minLength 1","$.dedupe_key: does not match pattern ^ntf:[A-Za-z0-9_-]+(?::[A-Za-z0-9_.-]+)*$"]
invalid-dedupe-key-minlength.json | deleted properties.dedupe_key.minLength: INVALID ["$.dedupe_key: does not match pattern ^ntf:[A-Za-z0-9_-]+(?::[A-Za-z0-9_.-]+)*$"]
## valid fixtures
valid-command.json: VALID
valid-result-delivered.json: VALID
valid-result-failed-transient.json: VALID
valid-result-suppressed-duplicate.json: VALID
## lengths of the too-long fixtures (code points)
invalid-notification-id-too-long.json: 129
invalid-message-key-too-long.json: 129
invalid-deep-link-target-ref-too-long.json: 257
invalid-dedupe-key-too-long.json: 129
## (c) const-selected consts: absent `kind`
valid-command minus kind | present: INVALID ["$: missing required property 'kind'"]
valid-command minus kind | deleted required.kind: VALID
## dedupe_key class, constructed (not fixtures)
dedupe_key email-shaped: INVALID ["$.dedupe_key: does not match pattern ^ntf:[A-Za-z0-9_-]+(?::[A-Za-z0-9_.-]+)*$"]
dedupe_key space: INVALID ["$.dedupe_key: does not match pattern ^ntf:[A-Za-z0-9_-]+(?::[A-Za-z0-9_.-]+)*$"]
dedupe_key slash: INVALID ["$.dedupe_key: does not match pattern ^ntf:[A-Za-z0-9_-]+(?::[A-Za-z0-9_.-]+)*$"]
dedupe_key bare digits (residual): VALID
dedupe_key dotted id in FIRST segment (shipped shape): INVALID ["$.dedupe_key: does not match pattern ^ntf:[A-Za-z0-9_-]+(?::[A-Za-z0-9_.-]+)*$"]
dedupe_key dotted id in SECOND segment: VALID
## A5 composition decision D-K: ntf:v1:<sha256 hex of netstring tuple>
ordinary: length 71
D-K ordinary: VALID
every input at its CTR-EVT-001 bound: length 71
D-K every input at its CTR-EVT-001 bound: VALID
id with @ / + space: length 71
D-K id with @ / + space: VALID
determinism: true
version separates: true
netstring unambiguous ('a:b','c') vs ('a','b:c'): true
```

**Command:** `node probe2.mjs <worktree>` [measured], output verbatim:

```text
invalid-required.json | present: INVALID ["$: missing required property 'delivery'"]
invalid-required.json | deleted allOf.1.then.required.delivery: VALID
invalid-delivery-required.json | present: INVALID ["$.delivery: missing required property 'state'"]
invalid-delivery-required.json | deleted properties.delivery.required.state: VALID
invalid-failure-without-class.json | present: INVALID ["$.delivery: missing required property 'failure_class'"]
invalid-failure-without-class.json | deleted allOf.2.then.properties.delivery.required.failure_class: VALID
invalid-delivered-with-failure-class.json | present: INVALID ["$.delivery: matches a schema it must not match"]
invalid-delivered-with-failure-class.json | deleted allOf.3.then.properties.delivery.not: VALID
invalid-command-carrying-delivery.json | present: INVALID ["$: matches a schema it must not match"]
invalid-command-carrying-delivery.json | deleted allOf.0.then.not: VALID
```

**What the probes show.**

1. Every fixture I cite below fails with its rule present and validates with that rule alone deleted, **except
   `invalid-dedupe-key-minlength.json`**: with `dedupe_key.minLength` deleted it still fails the pattern. I do not
   cite it as evidence for `minLength`; I cite it as evidence that `minLength` is dead (OD-5).
2. The four too-long fixtures are each exactly one past their bound (129, 129, 257, 129 code points) and each is
   shape-valid, so each isolates its bound.
3. `dedupe_key`'s class rejects an email-shaped key, a spaced key and a `/` key (constructed values, not fixtures),
   and admits a bare run of digits (the declared residual). The only **fixture** for the class is
   `invalid-dedupe-key-contact-detail.json`, which isolates the `+` case only; the manifest's "an email address, an
   E.164 number and a spaced name are rejected (fixture invalid-dedupe-key-contact-detail.json)" cites one fixture
   for three cases. The other two are shown here by constructed values, not by a fixture.
4. The shipped readable shape breaks on a dotted id in the first segment (`ntf:content.v2:approved` INVALID), as the
   `x-bound-note` declares. Under OD-4 no conforming key has that shape.

### §2.1 C-T3 (c): `const` rules I rely on, and the absent case

| Rule | Present value rejected by | Absent property rejected? | Fixture isolating the absent case |
|---|---|---|---|
| `deep_link.requires_permission: const true` (enforcing const) | `invalid-deep-link-without-permission.json` (`false`): INVALID present, VALID with the `const` deleted | **Yes**, by `deep_link.required` containing `requires_permission` | `invalid-deep-link-omits-permission-flag.json`: INVALID present, VALID with `requires_permission` alone removed from `deep_link.required` |
| `allOf[0].if` `kind: const "command"` (selector const) | n/a: a selector picks the rule, it does not reject | **Yes**, by top-level `required` `kind`; with it absent, neither `allOf[0]` nor `allOf[1]` applies, so the top-level `required` is the only guard (constructed probe: `valid-command` minus `kind` is INVALID present, VALID with `kind` alone removed from `required`) | **None.** No fixture omits `kind` [measured: `grep -L '"kind"' examples/*.json` printed nothing]. Shown only by a constructed value. |
| `allOf[1].if` `kind: const "result"` | as above | as above | as above; `invalid-required.json` isolates a result without `delivery` (VALID with `delivery` alone removed from `allOf[1].then.required`) |
| `allOf[2].if` `delivery.state: const "failed"` and `allOf[3].if` `const "delivered"` | n/a (selectors) | **Yes**, by `delivery.required` `state` | `invalid-delivery-required.json`: INVALID present, VALID with `state` alone removed from `delivery.required` |

## §3. The four blockers, assessed

### `open_blockers[1]` — A0 authored an A5 contract

[read] Register §4.1 (`:138`) gives the owner the right to propose and A0 the freeze; §4.3 (`:173`) makes A0's part
"Producer ส่ง proposal+fixture; A0 assign version". The blocker's account is correct: A0 wrote what A5 should have
proposed. Ratification after the fact cannot undo that order. What it can do is make the text A5's from now on.
**OD-1** does so. The blocker's operative sentence stays true: the "14 of 14 materialized" figure, wherever cited
for dates before this ratification, carries the qualification; after it, it may read "ratified by A5 after the
fact, same lineage, 2026-10-10".

### `open_blockers[2]` — A5 ratification before freeze

Met for **ratification** by this file, on C-1 to C-3. Not met for **freeze**: the Frozen-stage owner signature is a
separate act under RFC-2026-031 §3.2 item 2 (`:99`), and my profile excludes it. It needs its own Product Owner
disposition.

### `open_blockers[19]` — SC-2

[read] Item (4) states: the RECIPIENT, at OPEN time, identity from MOD-100 / the serving application, never from the
document. A1 confirmed it meets SC-2 (§3 of A1's file). I adopt item (4) **unchanged** (OD-2), so A1's
confirmation is not disturbed. I answer A1's three advisories in a **new item (5)**, not by rewording (4). The rules
I rely on are shown in §2: a command must carry `deep_link` (`invalid-command-without-deep-link.json`), the link must
demand a check whether the flag is `false` or absent (§2.1), the target is a closed-scheme reference and never a URL
(`invalid-deep-link-public-url.json`), and `deep_link` admits no other key
(`invalid-deep-link-additionalproperties.json`), each isolated per C-T3 (b).

### `open_blockers[22]` — bounds, class, composition, declarations (2) and (3)

Each value, labelled per C-T3 (a):

| Item | Value | Label | Rests on |
|---|---|---|---|
| `notification_id.maxLength` | 128 | **owner decision** | RFC-2026-009 R-2 (`:172-173`, "128 on the ids"); CTR-EVT-001.`event_id`, CTR-JOB-001.`job_id` carry 128 [read]. The number itself has no baseline source (R-2: "No baseline document states a length limit"), so its basis is an **inference** from that class. Fixture `invalid-notification-id-too-long.json` (§2). |
| `notification_id` character class | none | **owner decision** | RFC-2026-009 R-5 (`:236-240`, "an id must be opaque"). The A1-S3 residual (a name or email address ≤128 validates) is accepted and stays declared in item (2). |
| `message_key.maxLength` | 128 | **owner decision** | Register §4.3 `:177`: A5 owns the UX message catalog, so the size of a key into it is A5's to set. The number is an **inference** (R-2 id class); the longest fixture key is 29 characters [read: manifest/schema note]. Fixture `invalid-message-key-too-long.json` (§2). |
| `message_key` pattern | `^notification\.[a-z_.]+$` | **owner decision** | same line `:177`; CTR-ERR-001 precedent of a key, not prose. Fixture `invalid-message-free-text.json` (§2). |
| `deep_link.target_ref.maxLength` | 256 | **owner decision** | RFC-2026-009 R-2 `:173` ("256 on the `scheme:path` references") and `:181-183` (256 is a database CHECK on those references). Fixture `invalid-deep-link-target-ref-too-long.json` (§2). |
| `deep_link.target_ref` pattern | closed scheme list `app|content|asset|job` | **owner decision** | the §5.2 row `:211` ("permission-checked deep link"); grammar adopted from CTR-IDM-001 `result_ref` [read]. Fixture `invalid-deep-link-public-url.json` (§2). |
| `dedupe_key.maxLength` | 128 | **owner decision** | R-2 `:172-173` ("128 on … `dedupe_key`"), and OD-4: a conforming key is 71 characters for every input (§2, "every input at its CTR-EVT-001 bound: length 71"). Fixture `invalid-dedupe-key-too-long.json` (§2). |
| `dedupe_key` character class | `^ntf:[A-Za-z0-9_-]+(?::[A-Za-z0-9_.-]+)*$` | **owner decision**, kept as shipped | A1-S3 / SC-3 (no contact detail in a key held for the whole window); Register §5.5 `:271`. OD-4's form fits it (§2). The `ntf:` namespace: **inference**, following CTR-USG-001's `usg:`. Fixture `invalid-dedupe-key-contact-detail.json` isolates `+` only (§2 point 3). |
| `dedupe_key` composition | OD-4 | **owner decision** | ID-005 `:273`, ID-002 `:270`, 051 `:576-577`, Register §5.5 `:271`; the hash encoding is an **inference** forced by the bounds (OD-4 basis). |
| `dedupe_key.minLength` | 1, dead | **owner decision** (keep, declared) | CTR-USG-001 precedent; OD-5. |
| Declaration (2) | — | **ratified with the amendment in OD-4** | — |
| Declaration (3) | — | **ratified**; the "OWED … until it is recorded they are A0's" sentence is replaced (OD-4 text) | — |

## §4. Owner decisions

**OD-1. Adoption.** A5 adopts CTR-NTF-001 at schema `925c502d…014e` / manifest `4177c792…4675`, as amended by OD-2 and
OD-4, as A5's own proposal under Register §4.1. A0 keeps the version and the freeze (`:138`).

**OD-2. Deep-link principal (A1-NTF2A-1, -2, -3).** Item (4) is adopted unchanged. A0 appends to the manifest's
`untestable_by_schema`, after item (4), exactly:

> (5) A5'S STATEMENT OF THE OPEN-TIME CHECK, 2026-10-10 (A1-NTF2A-1 to -3). `requires_permission: true` is a flag
> that a check must run; it does not name a permission. The permission checked is the opener's permission to read
> the target that `target_ref` names, under that target's own access rule. The check runs in the workspace that
> owns the target, which for a conforming notification is `tenant_context.workspace_id`; an opener who is not an
> active member of that workspace is denied, whatever other workspace they belong to. The opener's identity is the
> serving application's authenticated session and nothing else. A delivered link, in any channel, carries no
> credential, token, session or user identifier, and an adapter must not add one when it builds a URL from
> `target_ref`; a link that grants access by being possessed is outside this contract and is refused. These are
> runtime obligations on MOD-100 and on every adapter; no field of this document can show them.

**OD-3. Bounds and classes.** The values in the §3 `[22]` table are A5's decisions, as labelled there.

**OD-4. Dedupe key composition (ID-005's "dedupe key policy").**

- **What a key identifies.** The domain occurrence that triggers the notification: the CTR-EVT-001 event's
  `subject.type`, `subject.id`, `subject.version` and `event_type`. It is the same across job retries and event
  redelivery.
- **What it leaves out.** The recipient and the workspace (the store already scopes the key by `workspace_id` and
  `user_id`, 051 `:576-577`); the channel (051's reasoning: one occurrence must not reach a person once per
  channel); the message key, `event_id`, attempt number and every timestamp. `event_id` is left out because ID-002
  (`:270`) already deduplicates redelivery of one event, so ID-005 must catch what an event id cannot: a second
  event for the same occurrence.
- **Encoding.** `dedupe_key = "ntf:v1:" + lowercase hex SHA-256 of the concatenation of four netstrings` —
  `<UTF-8 byte length in decimal>:<UTF-8 bytes>,` — of `subject.type`, `subject.id`, `subject.version` (decimal) and
  `event_type`, in that order. Every key is 71 characters and fits the shipped bound and class (§2).
- **Basis.** A raw form cannot fit: `subject.type` ≤64 + `subject.id` ≤128 + `event_type` ≤128 exceeds 128, and
  `subject.id` has no character class, so it would break the class too [read: CTR-EVT-001]. A digest fits both and
  carries no raw id, which Register §5.5 `:271` asks of a payload. That the encoding is a digest is my **inference**
  from those constraints. The `v1` segment lets a later policy change its inputs without colliding with old keys.
- **Not covered.** A notification triggered without a CTR-EVT-001 event. Its producer brings a composition to A5
  before it ships. The dedupe **window** stays MOD-100's (`freeze_boundary`). Until it is decided, 051's unique
  constraint suppresses a repeat of the same `(subject, version, event_type)` for good; a new `subject.version`
  notifies again.
- **Exact text A0 applies.** In `untestable_by_schema` item (2), replace "The key's full COMPOSITION is ID-005's
  `dedupe key policy` and A5's decision; it is not stated here and is OWED by A5 before this contract leaves Draft.
  A character class for `notification_id` is left to A5 with it." with "The key's full COMPOSITION, ID-005's
  `dedupe key policy`, is A5's decision of 2026-10-10, stated in item (6). `notification_id` takes no character
  class (A5, 2026-10-10; RFC-2026-009 R-5)." In item (3), replace "A5's ratification of the bounds, the class and
  this declaration is OWED; until it is recorded they are A0's." with "A5 ratified the bounds, the class and this
  declaration on 2026-10-10 (evidence/WP-0A-CON-006/a5-ntf-assessment-2026-10-10.md)." Append, after item (5):

  > (6) DEDUPE KEY COMPOSITION, A5's decision of 2026-10-10 (ID-005). A conforming key is `ntf:v1:` followed by the
  > lowercase hex SHA-256 of four netstrings (`<UTF-8 byte length>:<bytes>,`) of the triggering CTR-EVT-001 event's
  > `subject.type`, `subject.id`, `subject.version` (decimal) and `event_type`, in that order: 71 characters for
  > every input. It contains no recipient, workspace, channel, message key, event id, attempt or time; the store
  > scopes it by workspace and recipient. The schema admits other shapes, including the readable ones the fixtures
  > use; conformance to this composition is a producer obligation the schema cannot show. A notification with no
  > triggering event is not covered and needs A5's composition before it ships. The dedupe window remains MOD-100's.

  In `schema.json`, which constrains nothing through `x-` keys: in `dedupe_key.x-pii-shape`, replace "it is NOT stated
  here, and the manifest's untestable_by_schema records it as owed." with "A5 stated it on 2026-10-10 in the
  manifest's untestable_by_schema item (6)."; append to `dedupe_key.x-bound-note` "A5's composition (manifest
  untestable_by_schema item (6), 2026-10-10) is 71 characters for every input and fits this bound and class; the
  limit above binds only the readable shape the fixtures use."; in `notification_id.x-bound-note`, replace "a
  character class for the id is left to A5." with "A5 decided on 2026-10-10 that the id takes no character
  class."

**OD-5. `dedupe_key.minLength: 1`.** Kept, declared dead, as on CTR-USG-001 (Candidate), and left in
`UNKILLED_SITES`. Removing it changes nothing a validator accepts (§2), so it is not worth a schema change at
Candidate.

**OD-6. No pattern tightening now.** I considered narrowing `dedupe_key` to `^ntf:v1:[0-9a-f]{64}$`, which would
close the bare-digit residual in the schema. It would invalidate every fixture's key, so I defer it to Frozen with
F-2. The residual stays declared.

## §5. Conditions, before this signature is cited for the Candidate move

- **C-1.** A0 applies OD-2 and OD-4's texts exactly, in a later commit. I, A1, C0 and Q0 re-read the result
  (disposition Q4). A1 re-reads because item (5) concerns the deep link, even though item (4) is unchanged.
- **C-2.** A0 makes the `cc-a5-loom.json` corrections in §0.1.
- **C-3.** Q0 re-reads this file against C-T3 (a)–(c) (`benchmark_outcome`).

The disposition's own conditions stand: A1's SC-2 confirmation (already given) and the Owner's Q3 approval.

## §6. Owed before Frozen (not Candidate conditions)

- **F-1. `notification_id` against batch 051.** 051 stores `notification_id` as the uuid primary key of a
  per-recipient row (`:598-601`, `:505`). The contract admits any 1–128 string, and one command, which has no
  recipient, may reach several recipients. Both cannot hold: the contract is wider than the store, and one id cannot
  key several rows. This needs reconciling (contract, 051, or both) before Frozen. 051 is outside my scope.
- **F-2.** Align the fixtures' `dedupe_key` values with OD-4, then decide OD-6's tightening.
- **F-3.** MOD-100's dedupe window (`freeze_boundary`), and with it 051's permanent unique constraint.
- **F-4.** The Frozen-stage owner signature (RFC-2026-031 §3.2 item 2), which needs a new Product Owner disposition
  naming a run for it.
- **F-5.** A composition for notifications that no CTR-EVT-001 event triggers (OD-4).
- **Observation, not decided here:** `schema-mutation-coverage.test.mjs` lists `properties.tenant_context.$ref`
  among CTR-NTF-001's unkilled sites [read]. No NTF fixture shows a malformed `tenant_context` rejected. Whether
  CTR-TEN-001's own fixtures are enough for a consumer of this contract is **not determined**.

## §7. A1's advisories (PR #242)

- **A1-NTF2A-1** (which permission): answered in OD-2, item (5), first two sentences.
- **A1-NTF2A-2** (tenant scope of the check): answered in OD-2, item (5), third sentence.
- **A1-NTF2A-3** (authenticated identity, no credential in the link): answered in OD-2, item (5), fourth and fifth
  sentences. Adapter URL shapes stay out of scope (`freeze_boundary`); item (5) binds every adapter anyway.

## Appendix A. The brief, verbatim

~~~~text
# Brief to `/claude/a5_loom`: A5 owner assessment of CTR-NTF-001 (2026-10-10)

From A0 (`/claude/a0_atlas`), who dispatches you and who wrote CTR-NTF-001. Reproduce this brief verbatim in your file
(A1 R-1, `evidence/WP-0A-A0-001/a1-review-2026-10-09-pr238.md`).

Repository: /Users/bank/ThinkBizThai. Base: `origin/main` at `9d0751ece9ba71c6bb7812f55dd04ab3c4b96c4b` (`git fetch -q origin` first and check).
SP=/private/tmp/claude-501/-Users-bank-ThinkBizThai/c2816eec-82b3-4110-8890-b01c02e5fd0b/scratchpad
Never edit the main checkout or any `$SP/wt-*` worktree; those are A0's.

## Your authority, and its limits

Read `.agents/capability-profiles/cc-a5-loom.json` and
`evidence/WP-0A-A0-001/product-owner-disposition-2026-10-09-ntf-a5.md`. You act as A5 (Loom), owner of CTR-NTF-001,
for the owner assessment and ratification of CTR-NTF-001 only. Your assessment moves no status. You hold no Author,
Reviewer, Tester, Integration Owner, Product Owner, merge or Gate G0 authority. The Frozen-stage signature is out of
scope.

## The task

Assess, as owner, `work-packages/WP-0A-CON-006.json` `open_blockers[1]`, `[2]`, `[19]` and `[22]`, against
`contract-catalog/shared-kernel/ctr-ntf-001/` (manifest, schema, examples) on the base. Then give your disposition of
CTR-NTF-001 as owner: ratify, ratify with conditions, or refuse, with what is owed.

Your conclusion is yours. Ratification is not expected, and refusing, or ratifying only part, is an acceptable result.
If you decide something should change in the contract, state the change exactly in your file as your owner decision;
do not edit any contract, test or manifest file yourself. A0 applies an owner change in a later commit, and you and
the reviewers re-read it.

Your file must meet:
- **§0, the disposition's Q4:** who you are, who spawned you, the same lineage as the author of the work you assess,
  and your confirmation or correction of each capability value in `cc-a5-loom.json` (a correction is made in the
  profile before your signature is cited).
- **Q0's condition C-T3**, as recorded in `cc-a5-loom.json` `limitations.benchmark_outcome` (a), (b) and (c).
- Every factual claim marked **[measured]** (command and result) or **[read]** (location); "not determined" rather
  than a guess.
- Advisories addressed to you by A1 on PR #242: `evidence/WP-0A-CON-006/a1-review-2026-10-10-ntf2a.md`
  (A1-NTF2A-1 to -3). Address them or say why not; they are A1's, not conditions.

## Where to write

`git worktree add -q -b a5/WP-0A-CON-006-ntf-assessment-2026-10-10 $SP/a5-assess origin/main`. Write
`evidence/WP-0A-CON-006/a5-ntf-assessment-2026-10-10.md` there. Probes go outside the repository (for example
`$SP/a5-assess-probes/`). Plain `git commit` of only that file, message
`docs(evidence): A5 owner assessment of CTR-NTF-001`, trailer
`Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Do not push. Remove the worktree afterwards and keep the
branch.

## Report

Your final message: the commit SHA, your disposition in one line, and each owner decision or owed item in one line.
~~~~

## Appendix B. Probe sources, verbatim

`probe.mjs`:

```javascript
// A5 owner-assessment probes for CTR-NTF-001. Read-only against the worktree given as argv[2].
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
const ROOT = process.argv[2];
const { validate, assertSchemaSupported } = await import(join(ROOT, 'test-kits/contracts/json-schema-subset.mjs'));
const DIR = join(ROOT, 'contract-catalog/shared-kernel/ctr-ntf-001');
const json = async (p) => JSON.parse(await readFile(p, 'utf8'));
const schema = await json(join(DIR, 'schema.json'));
const ten = await json(join(ROOT, 'contract-catalog/shared-kernel/ctr-ten-001/schema.json'));
const resolve = (ref) => (ref === '../ctr-ten-001/schema.json' ? ten : null);
assertSchemaSupported(schema);
const fx = async (name) => json(join(DIR, 'examples', name));
const clone = (o) => JSON.parse(JSON.stringify(o));
const at = (o, path) => path.reduce((x, k) => x[k], o);
// delete one keyword (path ends in key) or one element of a `required` array (path ends in ['required', name])
const without = (s, path) => {
  const c = clone(s);
  const last = path[path.length - 1];
  const parent = at(c, path.slice(0, -1));
  if (Array.isArray(parent)) parent.splice(parent.indexOf(last), 1);
  else delete parent[last];
  return c;
};
const show = (errs) => (errs.length ? `INVALID ${JSON.stringify(errs)}` : 'VALID');
const run = (label, s, doc) => console.log(`${label}: ${show(validate(s, doc, { resolve }))}`);

// (b)/(c): fixture, rule path; "present" then "rule alone deleted"
const CASES = [
  ['invalid-deep-link-without-permission.json', ['properties', 'deep_link', 'properties', 'requires_permission', 'const']],
  ['invalid-deep-link-omits-permission-flag.json', ['properties', 'deep_link', 'required', 'requires_permission']],
  ['invalid-command-without-deep-link.json', ['allOf', 0, 'then', 'required', 'deep_link']],
  ['invalid-deep-link-public-url.json', ['properties', 'deep_link', 'properties', 'target_ref', 'pattern']],
  ['invalid-deep-link-additionalproperties.json', ['properties', 'deep_link', 'additionalProperties']],
  ['invalid-notification-id-too-long.json', ['properties', 'notification_id', 'maxLength']],
  ['invalid-notification-id-minlength.json', ['properties', 'notification_id', 'minLength']],
  ['invalid-message-key-too-long.json', ['properties', 'message_key', 'maxLength']],
  ['invalid-message-free-text.json', ['properties', 'message_key', 'pattern']],
  ['invalid-deep-link-target-ref-too-long.json', ['properties', 'deep_link', 'properties', 'target_ref', 'maxLength']],
  ['invalid-dedupe-key-too-long.json', ['properties', 'dedupe_key', 'maxLength']],
  ['invalid-dedupe-key-contact-detail.json', ['properties', 'dedupe_key', 'pattern']],
  ['invalid-dedupe-key-minlength.json', ['properties', 'dedupe_key', 'minLength']],
];
console.log('## (b)/(c) fixture probes');
for (const [name, path] of CASES) {
  const doc = await fx(name);
  run(`${name} | present`, schema, doc);
  run(`${name} | deleted ${path.join('.')}`, without(schema, path), doc);
}
console.log('## valid fixtures');
for (const n of ['valid-command.json', 'valid-result-delivered.json', 'valid-result-failed-transient.json', 'valid-result-suppressed-duplicate.json']) run(n, schema, await fx(n));

console.log('## lengths of the too-long fixtures (code points)');
for (const [n, p] of [['invalid-notification-id-too-long.json', ['notification_id']], ['invalid-message-key-too-long.json', ['message_key']], ['invalid-deep-link-target-ref-too-long.json', ['deep_link', 'target_ref']], ['invalid-dedupe-key-too-long.json', ['dedupe_key']]]) {
  console.log(`${n}: ${[...at(await fx(n), p)].length}`);
}

const base = await fx('valid-command.json');
const withKey = (k) => ({ ...clone(base), dedupe_key: k });
console.log('## (c) const-selected consts: absent `kind`');
const noKind = clone(base); delete noKind.kind;
run('valid-command minus kind | present', schema, noKind);
run('valid-command minus kind | deleted required.kind', without(schema, ['required', 'kind']), noKind);
console.log('## dedupe_key class, constructed (not fixtures)');
for (const [label, k] of [
  ['email-shaped', 'ntf:someone@example.invalid:approved'],
  ['space', 'ntf:first last:approved'],
  ['slash', 'ntf:content/x:approved'],
  ['bare digits (residual)', 'ntf:0000000000:approved'],
  ['dotted id in FIRST segment (shipped shape)', 'ntf:content.v2:approved'],
  ['dotted id in SECOND segment', 'ntf:content:content.v2:approved'],
]) run(`dedupe_key ${label}`, schema, withKey(k));

console.log('## A5 composition decision D-K: ntf:v1:<sha256 hex of netstring tuple>');
const ns = (v) => { const b = Buffer.from(String(v), 'utf8'); return Buffer.concat([Buffer.from(`${b.length}:`), b, Buffer.from(',')]); };
const keyOf = (type, id, version, eventType) => `ntf:v1:${createHash('sha256').update(Buffer.concat([ns(type), ns(id), ns(version), ns(eventType)])).digest('hex')}`;
const k1 = keyOf('content', 'content_synthetic_0001', 3, 'content.approval.approved');
const kLong = keyOf('x'.repeat(64), 'y'.repeat(128), 2147483647, 'a'.repeat(62) + '.b.' + 'c'.repeat(62));
const kOdd = keyOf('content', 'someone@example.invalid / +000', 1, 'content.approval.approved');
for (const [l, k] of [['ordinary', k1], ['every input at its CTR-EVT-001 bound', kLong], ['id with @ / + space', kOdd]]) {
  console.log(`${l}: length ${k.length}`); run(`D-K ${l}`, schema, withKey(k));
}
console.log(`determinism: ${k1 === keyOf('content', 'content_synthetic_0001', 3, 'content.approval.approved')}`);
console.log(`version separates: ${k1 !== keyOf('content', 'content_synthetic_0001', 4, 'content.approval.approved')}`);
console.log(`netstring unambiguous ('a:b','c') vs ('a','b:c'): ${keyOf('a:b','c',1,'e.f.g') !== keyOf('a','b:c',1,'e.f.g')}`);
```

`probe2.mjs`:

```javascript
// Selector-const absent cases for CTR-NTF-001 (C-T3 (c)). Read-only against argv[2].
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
const ROOT = process.argv[2];
const { validate } = await import(join(ROOT, 'test-kits/contracts/json-schema-subset.mjs'));
const DIR = join(ROOT, 'contract-catalog/shared-kernel/ctr-ntf-001');
const json = async (p) => JSON.parse(await readFile(p, 'utf8'));
const schema = await json(join(DIR, 'schema.json'));
const ten = await json(join(ROOT, 'contract-catalog/shared-kernel/ctr-ten-001/schema.json'));
const resolve = (ref) => (ref === '../ctr-ten-001/schema.json' ? ten : null);
const clone = (o) => JSON.parse(JSON.stringify(o));
const at = (o, path) => path.reduce((x, k) => x[k], o);
const without = (s, path) => { const c = clone(s); const last = path.at(-1); const parent = at(c, path.slice(0, -1)); if (Array.isArray(parent)) parent.splice(parent.indexOf(last), 1); else delete parent[last]; return c; };
const show = (e) => (e.length ? `INVALID ${JSON.stringify(e)}` : 'VALID');
for (const [name, path] of [
  ['invalid-required.json', ['allOf', 1, 'then', 'required', 'delivery']],
  ['invalid-delivery-required.json', ['properties', 'delivery', 'required', 'state']],
  ['invalid-failure-without-class.json', ['allOf', 2, 'then', 'properties', 'delivery', 'required', 'failure_class']],
  ['invalid-delivered-with-failure-class.json', ['allOf', 3, 'then', 'properties', 'delivery', 'not']],
  ['invalid-command-carrying-delivery.json', ['allOf', 0, 'then', 'not']],
]) {
  const doc = await json(join(DIR, 'examples', name));
  console.log(`${name} | present: ${show(validate(schema, doc, { resolve }))}`);
  console.log(`${name} | deleted ${path.join('.')}: ${show(validate(without(schema, path), doc, { resolve }))}`);
}
```
