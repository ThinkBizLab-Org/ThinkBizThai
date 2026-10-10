# C0 review of PR #243 (WP-0A-CON-006, NTF sequence item 2, second part: the A5 assessment), 2026-10-10

## 0. Who I am

- `/claude/c0_contract_reviewer` (C0, independent Reviewer), a Claude Code subagent, vendor Anthropic, model
  `claude-opus-5-5`, spawned in session `c2816eec` from the same lineage as A0 (`/claude/a0_atlas`), who wrote
  CTR-NTF-001 and applied A5's texts, and as `/claude/a5_loom`, whose assessment I read. **Same-lineage disclosure
  (disposition Q4):** this is the weaker control the Owner accepted on condition of disclosure; I do not claim it is
  cured.
- I hold no Author, Tester, Integration Owner, A5, Product Owner, merge or Gate G0 authority. I edited no file on the
  PR branch and pushed nothing. I wrote this file only, on `c0/WP-0A-CON-006-ntf2b-2026-10-10`.
- Connectors: my tool list names Vercel tools (including `get_project_env`, `filter_project_envs`,
  `get_shared_env_var`), Notion and Figma, and no Supabase, Microsoft 365, Gmail or Cloudflare tool [read: my tool
  list]. I called none of them. To check the Owner's verbatim words I read the local session transcript
  `~/.claude/projects/-Users-bank-ThinkBizThai/c2816eec-82b3-4110-8890-b01c02e5fd0b.jsonl` [read].

## 1. Head read

`gh pr view 243`: head `7ee39626d89e0d00ee32f91d782884805a64d9de`, branch `agent/claude/WP-0A-CON-006-stale-blockers`,
base `main`; `origin/main` = `9d0751ece9ba71c6bb7812f55dd04ab3c4b96c4b` [measured]. Commits `9d0751ec..7ee39626`:
`dce27479`, `aab9a165`, `936812a3`, `2d5db735`, `7ee39626`, as the brief lists [measured]. CI `bootstrap` on the
head was `IN_PROGRESS` when I finished (run `38051931420`) [measured]; green CI is not mine to certify.

## 2. Measured versus read

| Check | Result | How |
|---|---|---|
| A5 files carried unchanged | `git diff 96d08f35 dce27479` and `git diff 94328f1c 2d5db735` empty; each commit touches only its one file and carries `(cherry picked from commit …)` | [measured] |
| **C-1: contract texts are A5's word for word** | **Yes.** I took A5's texts mechanically from the assessment at the head (OD-2 item (5), OD-4 item (6), the four replacement pairs and the appended sentence), applied them to the base `manifest.json` / `schema.json` (each old text found exactly once), and compared with the head: parsed manifest equal, parsed schema equal, and both head files byte-equal to the compact UTF-8 serialisation of the expected documents | [measured] script `$SP/c0-c1check.py` |
| Nothing else in the contract changed | Structural diff base → head: manifest changes only `untestable_by_schema`; schema changes only `dedupe_key.x-bound-note`, `dedupe_key.x-pii-shape`, `notification_id.x-bound-note`. No fixture, status, version, constraint, requiredness or enum moves. `git diff --stat 9d0751ec 7ee39626 -- contract-catalog/` lists the two files only. Item (4) (A1's SC-2) is unchanged | [measured] `$SP/c0-jdiff.py` |
| Byte re-encoding outside A5's texts | Six `\uXXXX` escapes in `schema.json` (Thai, `delivery.x-source`) become raw UTF-8; value unchanged. Confirms A5's O-1 | [measured] |
| Pin moves | `CAVEAT_DIGESTS` `ctr-ntf-001.untestable_by_schema` `78c774aedcb5bdbc` → `dfe65f16b2f36949` recomputed at base and head; `freeze_boundary` and `untestable_by_fixture` digests unchanged. `ANNOTATION_DIGESTS` count 20 unchanged, digest → `d41ba1c066871f44`. `node --test test-kits/contracts/catalog-registry.test.mjs` 19 pass, 0 fail | [measured] |
| Each moved pin bites | One character changed in manifest item (6) → 1 fail ("was rewritten — digest dfe65f16b2f36949 became …"); one in `dedupe_key.x-bound-note` → 1 fail ("annotation text changed — digest d41ba1c066871f44 became …"); restored, tree clean | [measured] |
| Pin comments | Dated, name the increment and source file, give the old value. "reworded" covers the appended `x-bound-note` sentence loosely; not a finding | [read] |
| Integrity manifest | Only `catalog-registry.test.mjs` digest moves; it equals `shasum -a 256` of the head file; `npm run regenerate:manifest` then `git diff --exit-code` clean | [measured] |
| Amendment declarations | `ownership.amends_without_owning.paths` = the three changed paths outside `writable_paths` (`catalog-registry.test.mjs`, `integrity-manifest.json`, `cc-a5-loom.json`); the rationale is the base text kept as a prefix plus "A5 OWNER-DECISION INCREMENT" and "C-2 DISCLOSURE"; `recorded_on` lists WP-0A-CON-008, WP-0A-A0-002, WP-0A-A0-001. `verify-branch-scope.mjs origin/main WP-0A-CON-006` exit 0 ("all 10 changed path(s) are declared") | [measured] |
| `cc-a5-loom.json` | One key added, `limitations.external_connectors_disclosure`; no capability value, scope or authority sentence changes; `validate-capability-profiles.mjs` exit 0 | [measured] |
| `open_blockers` append-only | `[0]`–`[27]` unchanged; `[28]`, `[29]` added; `status` stays `in_review`. `[29]` was extended within this branch ("UPDATED THE SAME DAY BY A0") before any merge, which the append-only rule permits | [measured] |
| R0's `[28]` words | Match R0's template in `r0-review-2026-10-10-ntf2a.md` §5 exactly (regex over the quoted block, placeholders only). Fills checked: final head `423f2db7…` = #242 `headRefOid`; `26d77f52` is R0's commit on that file; run `38037578111` = "Bootstrap validation", success, on `423f2db7`; merge `9d0751ec` has parents `ecc6911b` and `423f2db7`; `mergedAt` 2026-10-10T08:32:26Z | [measured] `gh`, `git` |
| Owner disposition, C-2 | First question, the three options with descriptions, and the answer "ปิด connector ใน session (Recommended)" are verbatim from the `AskUserQuestion` call (08:42:20.057Z) and its result (10:03:03.254Z). The 12:00:08Z and 12:00:58Z Owner messages, A0's (ก)/(ข) text at 12:01:14Z and the answer "ก" at 12:03:15.923Z are verbatim and correctly timed | [read] transcript |
| A5 assessment, sources | Every cited line checked: workstream `:270` ID-002, `:273` ID-005, `:286` PT-007; Register `:138`, `:173`, `:177`, `:211`, `:271`; RFC-2026-009 R-2 `:169-188` and R-5 `:236-240`; RFC-2026-031 `:99` (§3.2 item 2), `:142-145`; 051 `:505`, `:525`, `:576-577`, `:597`, `:598-601`; CTR-EVT-001 `subject` (`type` ≤64, `id` ≤128, `version` integer ≥1) and `event_type` pattern ≤128; CTR-USG-001 Candidate with `minLength: 1` under a pattern; `UNKILLED_SITES` lists `properties.tenant_context.$ref`; A1 §3 confirmation and A1-NTF2A-1 to -3. All say what A5 says, except C0-243-1 | [read] |
| A5 assessment, hashes | Base `schema.json` `925c502d…014e`, `manifest.json` `4177c792…4675`, `json-schema-subset.mjs` `9037cc0a…5632` | [measured] `shasum -a 256` |
| A5 probes | `probe.mjs` and `probe2.mjs` extracted from Appendix B hash `8a98e2e6…bd3c` and `9d21cd63…a995`; run against the head, output byte-identical to the blocks in §2 | [measured] |
| `grep -L '"kind"' examples/*.json` | prints nothing | [measured] |
| Handoff (`7ee39626`) | Touches only the handoff; `head_revision_or_patch_checksum` `2d5db735`; files, contracts, limitations (O-1, Vercel) and owed reviews are true of the branch | [read] |

Not measured by me: the full suite, `check:handoff`, both classifiers and `record:verification` (Q0's run).

## 3. Findings

Stop-the-line: **no**. No blocking finding.

- **C0-243-1 (advisory, A5's file).** The assessment header says, as **[measured]**, that the base `schema.json` and
  `manifest.json` were "both last changed by `56ff27a2…`". For `schema.json` that is wrong: `git log -1 9d0751ec --
  …/schema.json` gives `de4b03eb`, an ancestor of `56ff27a2`; only the manifest was last changed in `56ff27a2`. The
  SHA-256 values, which bind the signature, are correct, so nothing turns on it. A later A5 file can correct it.
- **C0-243-2 (advisory, A5 and A1, before Frozen).** Item (5) says the check runs in the workspace that owns the
  target, "which for a conforming notification is `tenant_context.workspace_id`". No other text in the contract states
  that a deep link's target must belong to the notification's workspace, so "conforming" relies on a rule the contract
  does not write down. The failure is safe, because the check runs in the target's own workspace either way. A5 could
  state the rule outright, or drop the clause.
- **C0-243-3 (advisory, WP-0A-A0-001's next increment).** `external_connectors_disclosure` says the four connectors
  "are turned off for the session" without naming the session (`c2816eec`). In a later session it would read as a
  present fact. A5 states this limit (re-read §3.2), and the Owner's file names the session. The profile sentence
  should name it too.
- **C0-243-4 (advisory, concurs with A5 O-1).** The schema rewrite re-encoded six Thai escapes as UTF-8. The parsed
  value is unchanged, the handoff records it, and no pin reads bytes. No action is needed.
- **C0-243-5 (advisory, for F-2/F-3 at Frozen).** Two consequences of OD-4 that item (6) does not spell out:
  (a) leaving `message_key` out of the key means one triggering event yields at most one notification per recipient,
  so a second, different notification of the same event to the same person is suppressed; (b) "`subject.version`
  (decimal)" sets no canonical form for integers above 2^53, and CTR-EVT-001 sets no maximum, so producers in
  different languages could hash different strings (JavaScript writes 10^21 as `1e+21`). Neither affects the Candidate
  move.

## 4. On the checks the brief names

- A5's file stands against its sources, except the one misattribution in C0-243-1.
- C-1: the texts in the contract are A5's, word for word. The only other change in the contract is the byte
  re-encoding (C0-243-4).
- The pin moves are correct, bite when mutated, and carry dated comments.
- The amendments are declared, the paths match the diff, and the scope verifier exits 0.
- `open_blockers` is append-only. `[29]` was extended within the branch, before any merge.
- The Owner disposition's quotes, options and times are verbatim from the transcript.
- `[28]` is R0's §5 text with correct fills.

## 5. Verdict

**`review_approved`** for PR #243 at `7ee39626d89e0d00ee32f91d782884805a64d9de`, tier H. This verdict does not certify
CI. A1's acceptance of the Vercel disclosure, Q0's C-3 and R0's verdict are those roles' to give.

## 6. Carry clause

This verdict carries to a later head of this PR if every commit after `7ee39626d89e0d00ee32f91d782884805a64d9de` is
one of the following:
(a) another role's evidence file, carried with `cherry-pick -x` and touching only that file;
(b) a merge of `origin/main` that is mechanical under RFC-2026-025 §6.3: `classify-records-only.mjs --sync` exits 0,
`regenerate:manifest` and `record:verification` are cmp-clean, and the merge brings none of this PR's paths;
(c) the handoff refreshed last and alone, with prose that stays true.
Anything else needs this role again.
