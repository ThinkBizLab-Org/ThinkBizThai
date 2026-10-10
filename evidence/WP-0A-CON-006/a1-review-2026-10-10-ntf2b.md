# A1 review of PR #243 (WP-0A-CON-006, NTF sequence item 2, second part: the A5 assessment), 2026-10-10

## 0. Who I am

I am `/claude/a1_bastion`, A1, the independent Security/Privacy reviewer, author of condition SC-2 (A1-S2,
`evidence/WP-0A-CON-006/a1-security-reverify-2026-10-05.md` §5–§6) and of the advisories A1-NTF2A-1 to -7 on PR #242
(`evidence/WP-0A-CON-006/a1-review-2026-10-10-ntf2a.md`). I am a subagent spawned by the Author's run
(`/claude/a0_atlas`) and share a vendor and a model (Anthropic, `claude-opus-5-5`) with A0, with C0, Q0 and R0, and
with `/claude/a5_loom`, whose assessment this PR carries. That is a same-lineage review, disclosed as the Product
Owner's disposition of 2026-10-09 (Q4) requires. I hold no Author, Tester, Integration Owner, Product Owner, merge or
Gate G0 authority. I reviewed only: I fixed nothing, pushed nothing, and wrote no other role's verdict. This file is
not A5's ratification and not the Candidate move.

**My own connectors.** The Vercel connector the C-2 disclosure concerns is present in my harness too (§2, measured).
I called no Vercel tool and no other connector tool except the read-only `session_connectors_status` listing. Every
statement in §2 about Vercel's tools is read from the tool names in my own tool list, not from calling them.

## 1. Head read

- PR #243, branch `agent/claude/WP-0A-CON-006-stale-blockers`, state OPEN, base `main` `9d0751ec`.
- `git fetch -q origin`, then `gh pr view 243 --json headRefOid` printed `7ee39626d89e0d00ee32f91d782884805a64d9de`;
  `origin/main` is `9d0751ece9ba71c6bb7812f55dd04ab3c4b96c4b` (the base; no sync needed). My worktree was created at
  that head on branch `a1/WP-0A-CON-006-ntf2b-2026-10-10`.
- Commits read: `dce27479` (A5 assessment, carried), `aab9a165` (C-1 applied), `936812a3` (Vercel disclosure),
  `2d5db735` (A5 re-read, carried), `7ee39626` (handoff).
- CI: `bootstrap` run `38051931420` was IN_PROGRESS on that head at 2026-10-10T12:29:45Z. I do not claim it green.

## 2. Measured versus read

| What | How | Result |
|---|---|---|
| Item (5) and item (6) are A5's words, items (2)/(3) replaced exactly, nothing else in the manifest moves | **measured**: Python, A5's quoted texts extracted from `a5-ntf-assessment-2026-10-10.md`, applied to the base manifest, compared to the head | expected == head; item (4) at the base occurs byte-identical in the head |
| Schema: only three `x-` annotations change, in A5's words; no constraint moves | **measured**: the three replacements applied to the base, compared; base and head deep-equal with every `x-` key removed | all True; `examples/` 0 lines of diff |
| OD-4 composition: no recipient, contact detail or raw id; fits bound and class | **measured**: my own probe `$SP/a1-ntf2b-probes/odk.mjs` (SHA-256 `bd1e10d6…6bf7`), written from item (6)'s text, not from A5's probe | four cases (ordinary; every input at its CTR-EVT-001 bound; an email-shaped id; a Thai id with a space): each 71 chars, matches the shipped pattern, ≤ 128, no `@`/`+`/space, raw id absent; netstring `(a:b,c)` ≠ `(a,b:c)` |
| Profile change scope | **measured**: JSON compare of `cc-a5-loom.json` base vs head | only `limitations.external_connectors_disclosure` added; `capabilities`, `role_scope`, `unavailable_tools` and every other key unchanged |
| Profile validator | **measured**: `node scripts/validate-capability-profiles.mjs` | exit 0 |
| Capability schema wording | **read**: `.agents/capabilities.schema.json` | `can_access_external_secrets` is `{"type":"boolean","const":false}`, no description: the schema states a rule every profile must carry, not a measurement |
| Session connectors | **measured**: `session_connectors_status` at ~12:28Z | Supabase, Microsoft 365, Gmail, Cloudflare Developer Platform `disabled`; Vercel `connected` (238 tools); Notion, Figma, Claude Docs, visualize, scheduled-tasks `connected`. Matches A5's re-read §3.1 |
| Vercel tool reach | **read**: tool names in my own tool list (not called) | beyond `get_project_env` / `filter_project_envs` / `get_shared_env_var`: `create_project_env`, `edit_project_env`, `create_deployment`, `request_promote`, `request_rollback`, `update_firewall_config`, `put_firewall_config`, `update_project_protection_bypass`, `buy_domain`, `buy_domains`, `create_or_transfer_domain` (A1-NTF2B-1) |
| A5's non-use of Vercel | **measured**: parsed the session's transcripts (`c2816eec…jsonl` and its 16 subagent transcripts, as they stood at ~12:27Z) for every `tool_use` block | 0 Vercel tool calls in the whole session. The two `/claude/a5_loom` runs (assessment `agent-a81a6624…`, re-read `agent-aa259e7a…`, identified by their first prompt) called only Bash, Read, Write, ToolSearch and `session_connectors_status` once each; no Bash input names `vercel`, `curl`, `wget`, a URL, `.env` or `psql` |
| Pin moves | **measured**: `node --test test-kits/contracts/catalog-registry.test.mjs` | 19 pass, 0 fail |
| Branch scope | **measured**: `node scripts/verify-branch-scope.mjs origin/main WP-0A-CON-006` | "all 10 changed path(s) are declared" |
| Secrets and PII-shaped strings | **measured**: `npm run scan:secrets` (exit 0); grep for email and Thai-phone shapes over the 10 changed paths | two hits, both `someone@example.invalid` in A5's probe source (a reserved, non-routable domain; synthetic) |
| Handoff claims | **read**: `handoffs/WP-0A-CON-006-author-handoff.json` | claims no A1 approval; states A1's acceptance of the Vercel disclosure as owed |

I did not run the full suite; that is Q0's.

## 3. OD-2, item (5), against A1-NTF2A-1 to -3

1. **A1-NTF2A-1 (which permission). Answered.** "`requires_permission: true` is a flag that a check must run; it does
   not name a permission. The permission checked is the opener's permission to read the target that `target_ref`
   names, under that target's own access rule."
2. **A1-NTF2A-2 (tenant scope). Answered.** "The check runs in the workspace that owns the target, which for a
   conforming notification is `tenant_context.workspace_id`; an opener who is not an active member of that workspace
   is denied, whatever other workspace they belong to." Keying the check to the target's owning workspace, not to the
   document, is the safe choice: a non-conforming notification whose target sits elsewhere is still checked where the
   target lives. "Active member" also covers a suspended or removed member.
3. **A1-NTF2A-3 (authenticated identity, no credential in the link). Answered.** "The opener's identity is the serving
   application's authenticated session and nothing else. A delivered link, in any channel, carries no credential,
   token, session or user identifier, and an adapter must not add one … a link that grants access by being possessed
   is outside this contract and is refused." This closes the magic-link pattern, and the ban on a user identifier also
   keeps recipient ids out of URLs. An unauthenticated opener has no identity under "nothing else" and so holds no
   permission.

Item (5) sits under `untestable_by_schema` and says it is a runtime obligation on MOD-100 and every adapter; it claims
nothing the schema enforces. It is consistent with item (4): (4)'s last sentence already made the rule the opener's
own permission, and (5) names the permission, the scope and the identity source without narrowing (4).

## 4. Does SC-2 (item (4)) still hold as I confirmed it on #242?

**Yes.** Item (4) is byte-identical to the text I confirmed at `d361f68b` (measured, §2), and A5 adopted it unchanged
(assessment OD-2). Nothing added in items (5) or (6) contradicts any of its three elements (recipient/opener, open
time, identity from MOD-100 and the serving application, never from the document); (5) reinforces the third by
naming the authenticated session. My confirmation in `a1-review-2026-10-10-ntf2a.md` §3 stands for the Candidate move
on this head: **SC-2 is met**. `open_blockers[19]` may be closed at the step-3 Candidate move citing that section and
this one, provided item (4) is unchanged there.

## 5. C-2: the Vercel disclosure reading

**I accept the reading**: for session `c2816eec`, `can_access_external_secrets: false` in `cc-a5-loom.json` is, for
the Vercel connector, a policy prohibition and not a fact of the tools, and `unavailable_tools`' "any production
database or provider credential" is read the same way. Reasons:

1. **The rule is total and the record is honest.** The disclosure forbids the run any use of the connector, not only
   reading environment variables, and says in the same file, naming the field, that `false` is a prohibition here. A
   reader of the profile is not misled about what is in the harness.
2. **Non-use is measured, not only asserted.** A5's two runs say they called no Vercel tool. I checked that against
   the session's transcripts myself: no Vercel tool call anywhere in the session, and no shell route to Vercel in the
   A5 runs (§2). That is stronger than the same-lineage self-report the disposition's option text relied on.
3. **The alternative route is closed by rule.** The capability schema's `const: false` (exit 67 in the validator)
   makes `true` unrepresentable; the Owner declined the RFC route. The schema's `false` carries no description, so
   reading it as the repository's prohibition is consistent with the schema itself.
4. **Exposure is narrowed.** Supabase (SQL), Microsoft 365 and Gmail (mail and chat) and Cloudflare are `disabled`
   (measured), so the remaining exposure is one connector, unused.

**Limits on this acceptance** (scope, not new conditions on this PR):

- It covers session `c2816eec` and the two A5 runs measured above. It does not cover a later session, a later A5 run,
  or any Vercel tool call: a single Vercel call by `/claude/a5_loom` in this session voids it for that run.
- It does not cover the other Claude profiles of this session (A0, C0, A1, Q0, R0, A6), whose `false` stands
  undisclosed while the same connector is present (A1-NTF2B-2). The Owner's answer left that undecided.
- It accepts the reading, not the disclosure's description of Vercel's reach, which understates it (A1-NTF2B-1).

With A5's acceptance (`a5-ntf-reread-2026-10-10.md` §3.2) and this one, C-2 is met as the Owner's second answer
defines it.

## 6. OD-4's composition

Measured in §2: a conforming key is `ntf:v1:` plus 64 hex characters, 71 characters for every input. It contains no
recipient, no workspace, no channel and no contact detail, and no raw id: an email-shaped or Thai-and-space `subject.id`
yields a key in the shipped class with the raw value absent. Leaving the recipient and workspace out is safe only
because the store scopes the key by `(workspace_id, user_id, dedupe_key)` (051 `:576-577`), and item (6) states that
scope as part of the rule ("the store scopes it by workspace and recipient"), so a consumer that deduplicates on the
key alone is non-conforming. Cross-tenant suppression would need two tenants to share a `(subject.type, subject.id,
subject.version, event_type)` and a store that ignores the workspace; the rule excludes the second.

## 7. Findings

Stop-the-line: **no**. No blocking finding.

- **A1-NTF2B-1 (advisory, to A0, at the profile's next amendment; not a press condition).** The disclosure's
  description of Vercel, "able to read hosting environment variables", understates the connector. By name its tools
  also create and edit environment variables, create, promote and roll back deployments, change the firewall and
  deployment-protection bypass, and buy or transfer domains (§2, read, not called): production-change and
  payment-bearing actions. The prohibition ("FORBIDDEN to use it") already covers all of them, so my acceptance in §5
  does not depend on the wording; but the profile should name write and production-change reach, so a later reader
  weighs the right residual.
- **A1-NTF2B-2 (advisory, to A0 for the Owner; recorded residual).** The same Vercel connector is present for every
  Claude run of this session, mine included, and their profiles keep `can_access_external_secrets: false` without a
  disclosure. The Owner's answer decided `cc-a5-loom.json` only. Either the session turns Vercel off, or the Owner
  extends the same reading (with a disclosure) to the other profiles. No Vercel tool was called in this session
  (measured), so this is a records gap, not an exposure.
- **A1-NTF2B-3 (advisory, to A5's F-2 and to MOD-100).** OD-4's digest is an unkeyed SHA-256 over enumerable inputs.
  It keeps raw ids out of the key and fixes its length, but it is not a confidentiality control: anyone holding a
  candidate `(subject.type, subject.id, subject.version, event_type)` can confirm a key. Since the inputs are opaque
  ids and event types, that is acceptable; a key should be handled with the classification of `subject.id`. If a
  producer ever put a contact detail in `subject.id` (CTR-EVT-001 gives it no class), the key would be pseudonymous
  personal data, not anonymous.
- **A1-NTF2B-4 (advisory, recorded; already declared).** Until F-2 and OD-6, the schema still admits the readable
  shape (`ntf:<id>:<event>`) and a bare run of digits, and the shipped fixtures still carry readable keys. Conformance
  to item (6) is a producer obligation the schema cannot show, as item (6) says. This is A1-S3's residual, unchanged
  and declared.
- **A1-NTF2B-5 (no finding; recorded).** No widened authority. `cc-a5-loom.json` gains one `limitations` key that
  restricts the run ("FORBIDDEN to use it") and grants nothing; `capabilities`, `role_scope` and `unavailable_tools`
  are unchanged, and the validator exits 0. A5's files move no status and claim no Frozen-stage signature.
- **A1-NTF2B-6 (no finding; recorded).** No secret, credential or personal data in the 10 changed paths: secret scan
  exit 0; the only email-shaped strings use `example.invalid`.

## 8. Verdict

**security_approved**

On head `7ee39626`: item (5) answers A1-NTF2A-1 to -3; **SC-2 (item (4)) still holds exactly as I confirmed it on
#242**; OD-4 puts no recipient, contact detail or raw id in a key; no authority widens; and **I accept the Vercel
disclosure reading for C-2** within the limits in §5. The advisories in §7 are not conditions on this PR or on the
Candidate move. This verdict does not cover CI, which was in progress when I read the head.

## 9. Carry clause

This verdict carries to a later head of this PR if every commit after `7ee39626d89e0d00ee32f91d782884805a64d9de` is
one of the following:
(a) another role's evidence file, carried with `cherry-pick -x` and touching only that file;
(b) a merge of `origin/main` that is mechanical under RFC-2026-025 §6.3: `classify-records-only.mjs --sync` exits 0,
`regenerate:manifest` and `record:verification` are cmp-clean, and the merge brings none of this PR's paths;
(c) the handoff refreshed last and alone, with prose that stays true.
Anything else needs this role again, and any change to `untestable_by_schema` items (4), (5) or (6) of the CTR-NTF-001
manifest, or to `.agents/capability-profiles/cc-a5-loom.json`, always does.
