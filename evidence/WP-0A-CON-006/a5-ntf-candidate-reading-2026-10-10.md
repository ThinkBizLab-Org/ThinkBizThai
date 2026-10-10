# A5 reading of PR #244: CTR-NTF-001 Draft → Candidate (WP-0A-CON-006, NTF sequence item 3), 2026-10-10

- **Reader:** `/claude/a5_loom`, acting as A5 (Loom), owner of CTR-NTF-001, within
  `.agents/capability-profiles/cc-a5-loom.json` `limitations.role_scope` (owner assessment and ratification of
  CTR-NTF-001 only).
- **Head read:** PR #244, `agent/claude/WP-0A-CON-006-stale-blockers` at
  `00677af96394c2ab0e86d4cac029c804a7556b98` [measured: `gh pr view 244 --json headRefOid,headRefName` after
  `git fetch -q origin`]. Base `origin/main` `50d9dd8a8943bb958698cd153bddd47e6964214f` (PR #243 merged), contained in
  the head [measured: `git merge-base --is-ancestor`]. Commits read: `bc846f5e` (the Candidate move), `e07863b5` (the
  Owner's third answer on C-2), `00677af9` (handoff) [measured: `git log --oneline`].
- **Worktree:** `$P/a5-ntf3`, branch `a5/WP-0A-CON-006-ntf3-2026-10-10`, at the head. Probes outside the repository,
  in the session scratchpad `a5-ntf3-probes/`: `quotes.mjs` SHA-256
  `c52776ba49c0f62f9d9fc4c1980bd16b70ee6567cd10921547252deb929da707` (output `quotes.out` `782cfdd3…08da`),
  `line.mjs` `6d51b4e6255661b6151744bad391805f7f22f95699bf11d6bebae24273ac1f39` (output `line.out` `c69e310b…a79`),
  mutation log `mut.out` `f2474f64…8579` [measured]. Node v24.20.0 [measured].

## Result

| Question | Answer |
|---|---|
| Does the Candidate move match my ratification? | **Yes.** Candidate only, version `1.0.0`, and the contract is byte-for-byte the text I signed apart from `status` (§2). Every condition I set, and the disposition's own, is met on `main` (§3). |
| Do `[1]`, `[2]`, `[22]` and `[31]` record my words correctly? | **Yes** (§4). One wording observation on `[1]`, accepted (A5-NTF3-1). |
| Stop-the-line | **No.** |
| Verdict | **CONFIRMED as owner**: the Candidate move of CTR-NTF-001 on this head is the one I ratified. Not the Frozen-stage signature. |

## §0. Who I am (same lineage)

- I am `/claude/a5_loom`, a Claude Code subagent, vendor Anthropic, model `claude-opus-5-5` [read: my system
  context]. The brief that dispatches me (`$P/brief-ntf3.md`) does not name its author; the session directory, the
  worktrees it reserves (`$P/wt-*`, "A0's") and the PR are A0's [read: the brief]. I take my dispatcher to be A0
  (`/claude/a0_atlas`), as in my two earlier files; that is an **inference**.
- **Same lineage.** A0 wrote CTR-NTF-001, applied my owner decisions on PR #243, and wrote every change on this PR,
  including the `open_blockers` entries that record my words. I share A0's vendor and model. The Product Owner accepted
  same-lineage ratification on condition of this disclosure and of A1, C0 and Q0 re-reading the result
  (`evidence/WP-0A-A0-001/product-owner-disposition-2026-10-09-ntf-a5.md` Q4) [read]. A same-lineage owner confirming
  that the author recorded the owner's words faithfully is the weaker control `open_blockers[1]` names. I disclose it;
  I do not claim it is cured. C0 checks the same quotes independently (the brief's C0 item).
- I hold no Author, Reviewer, Tester, Integration Owner, Product Owner, merge or Gate G0 authority. I edited no
  contract, test, manifest, profile or work package. Mutations in §2 were made in my own worktree and restored with
  `git checkout -- contract-catalog/` before this file was written [measured: `git status --short` empty after each].
  I wrote one file, this one.
- **Connectors (C-2).** I did not re-measure; the Owner's third answer is recorded (§3). My tool list in this run has
  no Vercel, Supabase, Neon, Sentry, Gmail, Microsoft 365 or Cloudflare tool [read: my tool list]; Notion, Figma,
  Claude Docs, visualize and scheduled-tasks tools are listed, and I called none of them.

## §1. Sources read

| Source | Used for |
|---|---|
| `$P/brief-ntf3.md` (A5 item, general rules) | scope |
| `CONTRIBUTING_AGENTS.md`, `cc-a5-loom.json` | authority |
| `evidence/WP-0A-A0-001/product-owner-disposition-2026-10-09-ntf-a5.md` | Q3, Q4, sequence |
| `evidence/WP-0A-CON-006/r0-review-2026-10-10-ntf2b.md` §6, §7 | what this PR must satisfy |
| My `a5-ntf-assessment-2026-10-10.md` and `a5-ntf-reread-2026-10-10.md` at the head and on `origin/main` | my words |
| `c0-`, `a1-`, `q0-review-2026-10-10-ntf2b.md` on `origin/main` | C-1 to C-3 |
| `git diff origin/main HEAD` on the ten changed paths | the change set |
| `evidence/WP-0A-CON-006/product-owner-disposition-2026-10-10-a5-c2-connectors.md`, third answer | C-2 |
| `architecture/decisions/RFC-2026-010-shared-kernel-freeze-readiness.md` line 3; `evidence/WP-0A-A0-001/r0-reread-2026-10-09-pr238.md` R0-238R-1 | §6 |

## §2. The change to my contract, measured

- `git diff --stat origin/main HEAD -- contract-catalog/` lists two files, one line each:
  `ctr-ntf-001/manifest.json` and `index.json` [measured]. `schema.json` and `examples/` have no diff [measured:
  `git diff --quiet` exit 0].
- **Manifest.** Parsed base → head, the only differing key is `status`, `Draft` → `Candidate`; `version` `1.0.0` both
  sides; key order unchanged; the head bytes are the compact serialisation plus a newline, as before [measured].
- **Index.** The only differing leaf is `$.contracts.13.status` `"Draft"` → `"Candidate"` [measured].
- **Against what I signed.** My re-read (§4) confirmed my signature on manifest `09b16677…34b7` and schema
  `8abf3095…86e3`. On this head the schema hashes `8abf309579cdf14cae9c404c62fe57a2d9df2e670f49068ea256a38d4e3f86e3`,
  and the base manifest (the one before the status edit) hashes `09b16677a4be8d62e7ba98870cf23fd7483c23142f4fd156e9bf49d1d7a434b7`
  [measured: `shasum -a 256`]. So the contract that moves is exactly the text I ratified, with `status` changed and
  nothing else. Item (4), on which A1's SC-2 confirmation rests, is unchanged.
- **The pins catch a reversal and an overreach** [measured, `mut.out`; `node --test --test-reporter=tap` over
  `catalog-registry.test.mjs`, `shared-kernel-envelope-contracts.test.mjs`, `shared-kernel-contract-catalog.test.mjs`;
  unmutated 40 pass, 0 fail]:

  | Mutation (one file only) | Result |
  |---|---|
  | CTR-NTF-001 `Draft` in `index.json` | 3 fail: index agrees with manifests; baseline freeze levels (Draft count); census |
  | CTR-NTF-001 `Draft` in `manifest.json` | 2 fail: freeze level the Register defines; index agrees with manifests |
  | CTR-NTF-001 `Frozen` in `index.json` | 2 fail: index agrees with manifests; census |
  | CTR-NTF-001 `Frozen` in `manifest.json` | 3 fail: freeze level; index agrees; "a Frozen contract declares every gap and no longer reads Draft only" |

  `node --test --test-name-pattern='catalog ratchet' test-kits/ratchets-bite.test.mjs` → 1 pass, 0 fail [measured]:
  the replacement reversal ("a Candidate contract set back to Draft", on CTR-USG-001) bites. The full suite and the
  ratchet mutation are Q0's; I ran only these.

## §3. My ratification, and whether its conditions are met

My assessment: **RATIFY WITH CONDITIONS, for Candidate only**, on C-1 to C-3, plus the disposition's own conditions
(A1's SC-2 confirmation and the Owner's Q3) [read: assessment §5]. On `origin/main` `50d9dd8a` [measured:
`git cat-file -e` on each file]:

| Condition | Met? | Where |
|---|---|---|
| C-1, A0 applied OD-2/OD-4 exactly; A5, A1, C0, Q0 re-read | **Yes** | my re-read §2; C0 ntf2b table row "C-1" ("**Yes.**"); A1 ntf2b §2 rows on items (5)/(6) and the schema ("expected == head", "all True"); Q0 ntf2b "C-1, independently" [read] |
| C-2, the profile correction (by the Owner's route) | **Yes** | my re-read §3.2; A1 ntf2b §5 ("With A5's acceptance … and this one, C-2 is met") [read] |
| C-3, Q0 re-reads against C-T3 | **Yes** | Q0 ntf2b: "**C-T3 is met. C-3 is met.**" [read] |
| A1's SC-2 confirmation | **Yes**, standing | A1 ntf2b §4: "My confirmation … stands for the Candidate move on this head: **SC-2 is met**", provided item (4) is unchanged; it is (§2) [read, measured] |
| Owner's Q3 | **Yes** | disposition Q3, answer and option text, quoted verbatim in `[32]` [measured, `quotes.out`] |

**C-2 after the third answer.** My acceptance (re-read §3.2) was for session `c2816eec`, with Vercel connected and
Supabase, Microsoft 365, Gmail and Cloudflare off. The third answer is recorded in the same session: Neon and Sentry,
which appeared after a restart, were turned off at the Owner's choice, and Vercel then read `disabled` [read: the
disposition's third answer]. That is stricter than what I accepted, so my acceptance stands and needs no re-read. The
disclosure sentence about Vercel stays true (forbidden, unused); it no longer describes a connected tool. My earlier
limit holds: a later A5 act in another session measures again before relying on the profile.

Nothing on this PR moves CTR-NTF-001 past Candidate. The Frozen-stage owner signature (RFC-2026-031 §3.2 item 2) is
not given and is outside my scope (F-4).

## §4. My words in `open_blockers`

Measured by `quotes.mjs` against my files at the head (both byte-identical to `origin/main`: assessment
`54f11874…cd1c`, re-read `3811e47b…dea5`) [measured, `quotes.out`]:

- **Kept whole.** In `[1]`, `[2]`, `[19]`, `[22]`, the text after "THE TEXT THIS ENTRY CARRIED UNTIL 2026-10-10, KEPT
  WHOLE: " equals the `origin/main` entry exactly. No other entry 0–29 changed; three entries were appended (30 → 33).
- **`[1]`.** Quoted: "as A5's own proposal under Register §4.1" (OD-1), "Ratification after the fact cannot undo that
  order." (§3 `[1]`), "14 of 14 materialized", "ratified by A5 after the fact, same lineage, 2026-10-10": each occurs
  in my assessment. Correct. See A5-NTF3-1 on one verb.
- **`[2]`.** Quoted: "Not met for **freeze**: the Frozen-stage owner signature is a separate act under RFC-2026-031 §3.2
  item 2", a verbatim prefix of my §3 `[2]` sentence. "RATIFY WITH CONDITIONS, for Candidate only" is mine. "C-1 to C-3
  met on PR #243" with the three ntf2b files is correct (§3). F-4 is pointed to `[31]`, which carries it. Correct.
- **`[22]`.** Unquoted summary, which is R0's prescribed form: labels per C-T3 (a) "owner decision or inference with
  its source", composition = item (6), F-1/F-2/F-3/F-5 owed in `[31]`. It matches my §3 `[22]` table, OD-3, OD-4 and
  §6 [read]. Correct.
- **`[31]`.** After "A5's §6, verbatim apart from list markers: ", the text equals my §6 with the `- ` list markers
  removed and whitespace collapsed [measured: `true`]. F-1 is routed to WP-0A-DB-00 as R0 §6 item 8 requires.
  Correct.
- **`[32]`.** Q3's answer, option text and the question's own condition each occur verbatim in `[32]` and in the
  disposition file [measured]. Not my words; I record it because it is the approval my ratification waited on.

## §5. Findings

Stop-the-line: **no**. No finding is blocking.

- **A5-NTF3-1 (advisory, accepted, no change).** `[1]` says the figure "from that date … reads 'ratified by A5 after the
  fact, same lineage, 2026-10-10'". I wrote that after ratification it "may read" so. The stronger verb is R0's
  prescribed text and states the meaning I allowed. I accept it as written.
- **A5-NTF3-2 (advisory, answers Q0-NTF2B-1; no contract change).** Q0 noted that `notification_id.minLength: 1` and
  the enum value sets carry no label in my assessment. OD-1 adopted the whole schema; I label them now, from the
  schema's own `x-source` notes and the sources they cite [read]:

  | Item | Value | Label | Rests on |
  |---|---|---|---|
  | `notification_id.minLength` | 1 | **owner decision**; the number is an **inference** (the non-empty floor; no source states it) | RFC-2026-009 R-5 (opaque id); fixture `invalid-notification-id-minlength.json` isolates it (assessment §2) |
  | `kind` | `command`, `result` | **owner decision** | PT-007 "channel-neutral command/result" (workstream `:286`) |
  | `channel` | `in_app`, `email`, `line` | **owner decision**; listing the two future channels is an **inference** | PT-007 "in-app first; email/LINE future" (`:286`) |
  | `locale` | `th-TH` | **owner decision** | workstream `:110`, "Phase 1 default `th-TH`" |
  | `delivery.state` | `queued`, `delivered`, `failed`, `suppressed_duplicate` | **owner decision**; the names are an **inference** (PT-007 names no state machine; `suppressed_duplicate` from ID-005) | PT-007 `:286`; ID-005 `:273` |
  | `delivery.failure_class` | `transient`, `permanent` | **owner decision** | CT-007 "transient/permanent failure tested" (`:301`) |

  These labels change no text in the contract. If any is to appear in the schema, that is a text change with its own
  A5 re-read, before Frozen with F-2 (Q0-NTF2B-2 is the same tidy-up).
- **A5-NTF3-3 (advisory, observation).** With no Draft left, the ratchet no longer has a reversal that promotes
  CTR-NTF-001. I measured that a move to `Frozen` in either file alone still turns tests red (§2), so a freeze without
  the Frozen-stage signature cannot land silently. No action at Candidate.

## §6. The status line for RFC-2026-010 (sequence item 4)

RFC-2026-010 line 3 now ends its CTR-NTF-001 clause with "CTR-NTF-001 is A5's and remains unassessed." [read]. The
text I want in its place, in my words:

> CTR-NTF-001 is A5's: ratified by A5 after the fact, same lineage, 2026-10-10 — RATIFY WITH CONDITIONS, for Candidate
> only, adopting it as A5's own proposal under Register §4.1 (evidence/WP-0A-CON-006/a5-ntf-assessment-2026-10-10.md,
> re-read in a5-ntf-reread-2026-10-10.md); not the Frozen-stage signature: the Frozen-stage owner signature
> (RFC-2026-031 §3.2 item 2) and F-1 to F-5 are owed before Frozen.

- **R0-238R-1.** Every substantive phrase in it is a phrase I already signed: "ratified by A5 after the fact, same
  lineage, 2026-10-10", "as A5's own proposal under Register §4.1", "Frozen-stage owner signature (RFC-2026-031 §3.2
  item 2)" and "Owed before Frozen" occur in my assessment; "RATIFY WITH CONDITIONS, for Candidate only" in both
  files; "F-1 to F-5" and "not the Frozen-stage signature" in my re-read [measured, `line.out`]. The connecting words
  are mine in this file, which concerns CTR-NTF-001 only and is within `role_scope`. So step 4 is the first case
  R0-238R-1 names (words the run already signed), and needs no new disposition for my part.
- **Not my words.** The Owner's approval and the merge that made it Candidate are facts A0 adds, labelled as A0's in
  the form the line already uses for A6 ("A0's words, not A6's"): Q3 `ให้ A0 กดทั้งชุด (Recommended)`
  (evidence/WP-0A-A0-001/product-owner-disposition-2026-10-09-ntf-a5.md) and "Candidate by PR #244 (merge `<sha>`)".
- Whether A0 or the Owner presses that PR is R0's ruling, not mine.

## §7. Verdict

**CONFIRMED as owner** on `00677af96394c2ab0e86d4cac029c804a7556b98`: the Draft → Candidate move of CTR-NTF-001
matches my ratification (Candidate only; contract text unchanged apart from `status`; C-1 to C-3, A1's SC-2 and the
Owner's Q3 all met on `main`), and `[1]`, `[2]`, `[22]` and `[31]` record my words correctly. This is not the
Frozen-stage signature and moves no status by itself.

## §8. Carry clause

This verdict carries to a later head of this PR if every commit after `00677af96394c2ab0e86d4cac029c804a7556b98` is one
of the following:
(a) another role's evidence file, carried with `cherry-pick -x` and touching only that file;
(b) a merge of `origin/main` that is mechanical under RFC-2026-025 §6.3: `classify-records-only.mjs --sync` exits 0,
`regenerate:manifest` and `record:verification` are cmp-clean, and the merge brings none of this PR's paths;
(c) the handoff refreshed last and alone, with prose that stays true.
Anything else needs this role again, and in particular any change to `contract-catalog/shared-kernel/ctr-ntf-001/`,
to CTR-NTF-001's index entry, or to `open_blockers[1]`, `[2]`, `[22]` or `[31]`.
