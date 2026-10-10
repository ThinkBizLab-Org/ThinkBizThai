# A1 review of PR #242 (WP-0A-CON-006, NTF sequence item 2, first part), 2026-10-10

## 0. Who I am

I am `/claude/a1_bastion`, A1, the independent Security/Privacy reviewer, and the author of condition SC-2
(A1-S2, `evidence/WP-0A-CON-006/a1-security-reverify-2026-10-05.md` §5–§6). I am a subagent spawned by the
Author's run (`/claude/a0_atlas`) and share a vendor and a model (Anthropic, `claude-opus-5-5`) with A0, with
Q0 and with `/claude/a5_loom`, the run this PR benchmarks. That is a same-lineage review, disclosed as the
Product Owner's disposition of 2026-10-09 (Q4) requires. I hold no Author, Tester, Integration Owner, Product
Owner, merge or Gate G0 authority. I reviewed only; I fixed nothing, pushed nothing and wrote no other role's
verdict. This file is not A5's ratification and not the Candidate move.

## 1. Head read

- PR #242, branch `agent/claude/WP-0A-CON-006-stale-blockers`, state OPEN.
- `gh pr view 242 --json headRefOid` printed `d361f68bb1603380d184c82f3dcac1c308a72e0c`; my worktree was
  created at that commit on branch `a1/WP-0A-CON-006-ntf2a-2026-10-10`.
- Branch base (merge-base with `origin/main`): `92968774`. `origin/main` has since moved to `4a0a8bd6`
  (PR #240); see A1-NTF2A-5.

## 2. Measured versus read

| What | How | Result |
|---|---|---|
| Manifest change is one field, append-only | **measured**: JSON compare of `ctr-ntf-001/manifest.json` at `92968774` and head | only `untestable_by_schema` differs; main's text is an exact prefix of the new text |
| Schema and fixtures unchanged | **measured**: `git diff 92968774 HEAD -- …/ctr-ntf-001/schema.json …/examples` | 0 lines |
| `deep_link` shape | **read**: schema at head | `requires_permission` is `const true` and `required`; `target_ref` is a bounded `scheme:path` grammar, no URL |
| SC-2 text against my condition | **read**, quoted in §3 | meets it (§3) |
| Capability profile change | **measured**: `git diff origin/main...HEAD -- .agents` | one line: `limitations.benchmark_outcome`; capabilities, `role_scope`, `unavailable_tools` unchanged |
| PII-shaped strings in the 11 changed files | **measured**: `npm run scan:secrets` (exit 0); my own grep for Thai phone and e-mail shapes over the 11 paths | 0 hits; the one redaction is a marked placeholder (answer file line 238) |
| Sealed key hash | **measured**: `shasum -a 256 evidence/WP-0A-CON-006/q0-a5-benchmark-key-2026-10-10.md` | `94013cc8…b63a5b`, the value in the task sheet and in `benchmark_outcome` |
| Pin move | **measured**: `node --test test-kits/contracts/catalog-registry.test.mjs` | 19 pass, 0 fail |
| Branch scope | **measured**: `verify-branch-scope.mjs` against the merge-base `92968774` | exit 0, "all 11 changed path(s) are declared" |
| Branch scope against current `origin/main` | **measured** | fails on 7 WP-0A-A0-001 paths that PR #240 brought to main (A1-NTF2A-5) |
| Overlap of #240's paths with this PR's paths | **measured**: `comm` of the two name lists | empty |
| Key custody, transcript search, restart | **read**: task sheet §6, Q0 scoring §1 and §4, A0's answer transcription | not independently measurable by me (A1-NTF2A-4) |

I did not run the full suite; that is Q0's.

## 3. Does SC-2, as stated in the manifest, meet my condition?

**Yes.** My condition, verbatim from `open_blockers[19]`:

> Before CTR-NTF-001 is ratified by A5 or leaves Draft, its manifest must state that the deep-link permission
> check is evaluated for the **recipient**, at **open time**, and where the recipient's identity comes from
> (even if that is "MOD-100, outside this contract").

`untestable_by_schema` item (4) at `d361f68b`, element by element:

1. **For whom.** "evaluated for the RECIPIENT of the notification, the person who opens the link, and never
   for tenant_context.actor". This closes the defect A1-S2 named: a consumer checking the actor's permission
   at send time. The last sentence ("A deep link opened by someone other than the recipient is checked for
   that person") makes the rule, in effect, *the opener's own permission*. That is the safe reading: a
   forwarded link grants nothing the opener could not already reach.
2. **When.** "at OPEN time, when the recipient follows the link, and not when the notification is sent: a
   permission granted or revoked in between decides the open." Met, including revocation.
3. **Where the identity comes from.** "not from this contract, which has no recipient field. It comes from
   MOD-100, outside this contract … the open-time check takes the identity of whoever opens the link from the
   application that serves it, not from any field of this document." Met: it names MOD-100, the form my
   condition allowed, and it forbids taking identity from the document (so not from `target_ref`, nor from
   `tenant_context.actor`).

The item claims nothing the contract does: it sits under `untestable_by_schema`, says the check is a runtime
check outside the document, and adds no schema rule, field or fixture (measured, §2). It says it is A0's
statement before A5 ratifies, not A5's ratification.

**My confirmation for the Candidate move (disposition Q3).** SC-2 is met by item (4) as it reads at
`d361f68b`. This confirmation carries to the Candidate move only while item (4) keeps that meaning. If A5,
as owner, rewords item (4) in its ratification, I re-read the new words before the Candidate move; a wording
change that keeps all three elements needs only that re-read, not a new review of this PR.
`open_blockers[19]` may be closed citing this section once this PR is on main.

## 4. Findings

Stop-the-line: **no**. No blocking finding.

- **A1-NTF2A-1 (advisory, to A5's ratification; not part of SC-2).** "The permission that
  deep_link.requires_permission demands" names no permission: the field is `const true`, a flag that a check
  must happen, not which one. The intended reading is the opener's permission to open the target that
  `target_ref` names. The wording is inherited from item (1), already on main. A5 should say so in its own
  words when it ratifies.
- **A1-NTF2A-2 (advisory, to A5).** Item (4) does not say the open-time check runs in the notification's
  tenant scope (`tenant_context`'s workspace). A user who belongs to two workspaces must be checked in the one
  the target belongs to. Deny-by-default RLS on the target covers this in practice; A5 may state it.
- **A1-NTF2A-3 (advisory, to A5 and to MOD-100's adapter work).** "the identity of whoever opens the link from
  the application that serves it" does not say *authenticated*. It forbids identity from the document, but an
  adapter could still put a bearer token or user id into the URL it builds from `target_ref` (a magic-link
  pattern). A5 should state that the identity is the serving application's authenticated session and that
  the delivered link carries no credential or identity. The email and LINE adapter shapes are out of this
  contract's scope (`freeze_boundary`), so this is a forward note, not a gap in SC-2.
- **A1-NTF2A-4 (advisory, recorded limitation; no PII or secret involved).** Key custody. The sealed key sat
  in the dispatching session's scratch area, on the same filesystem and under the same user as the assessed
  run, which is of the same lineage. The controls are the verbatim dispatch prompt, the hash, and A0's search
  of the run's transcript for `q0-a5-benchmark-key` (0 hits), with A0's statement that no tool call touched
  the scratch area outside the run's probe directory and `a5-bench`. Those rest on A0's transcript, which A1
  cannot see. The sheet (§6.3) and Q0 (§4) state this rather than hide it, and Q0 cites weak positive
  evidence (a key element the answer missed). The residual affects the benchmark's validity, not security:
  the key holds no secret and no personal data (scan exit 0), and the benchmark grants no authority
  (A1-NTF2A-6). A future benchmark should keep the key where the assessed run's tools cannot list it, or have
  the transcript search covered by a run outside the dispatcher's lineage.
- **A1-NTF2A-5 (advisory, to A0 and R0).** `origin/main` moved to `4a0a8bd6` (PR #240) after this branch was
  cut. Against current `origin/main`, `verify-branch-scope.mjs` fails on #240's seven WP-0A-A0-001 paths;
  against the merge-base it passes. #240 touches none of this PR's 11 paths (measured). The sync merge A0
  needs before pressing is the kind the carry clause (b) below covers.
- **A1-NTF2A-6 (no finding; recorded).** No widened authority for `/claude/a5_loom`. Only
  `benchmark_outcome` changes. Its text restricts the run ("covers this run's role_scope only", "it is not
  that signature", "until then this run does not sign as A5") and grants nothing. `capabilities`,
  `role_scope` and `unavailable_tools` are unchanged, and the handoff claims no A1 approval.
- **A1-NTF2A-7 (no finding; recorded).** Redaction. The one synthetic ten-digit number in T3 (ii) row F-1 is
  replaced by a marked placeholder; no phone-shaped or e-mail-shaped string remains in the changed files. The
  answer's other example key carries a common Thai given name, used to show what the character class lets
  through; it is illustrative and synthetic, with no surname or other detail, and is acceptable. Local
  absolute paths in the transcription have hundreds of precedents in `evidence/` on main and disclose no
  secret.

## 5. Verdict

**security_approved**

The PR is security-neutral to positive: it adds the runtime-principal statement A1-S2 asked for, changes no
schema rule, widens no authority, and ships no PII-shaped string. **SC-2, as stated in the manifest at
`d361f68b`, meets my condition** (§3). The advisories in §4 are not conditions on this PR or on the
Candidate move.

## 6. Carry clause

This verdict carries to a later head of this PR if every commit after `d361f68b` is one of the following:
(a) another role's evidence file, carried with `cherry-pick -x` and touching only that file;
(b) a merge of `origin/main` that is mechanical under RFC-2026-025 §6.3: `classify-records-only.mjs --sync`
exits 0, `regenerate:manifest` and `record:verification` are cmp-clean, and the merge brings none of this
PR's paths;
(c) the handoff refreshed last and alone, with prose that stays true.
Anything else needs this role again, and any change to `untestable_by_schema` item (4) of the CTR-NTF-001
manifest or to `.agents/capability-profiles/cc-a5-loom.json` always does.
