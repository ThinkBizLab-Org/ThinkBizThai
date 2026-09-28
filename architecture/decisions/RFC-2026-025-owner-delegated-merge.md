# RFC-2026-025: the Owner may delegate the merge button to the Author, and record-only PRs need no role runs

Status: **Approved 2026-09-28 by the Product Owner.** The answer was `อนุมัติ RFC-2026-025` (transcribed in `evidence/WP-0A-DB-00/product-owner-disposition-2026-09-28-rfc-025.md`). It was given after A0 summarised this RFC in session as "the merge button may be delegated to A0 under conditions, and a PR that only changes records needs no role runs". The approved text is this file as committed at `5856f0b`. A0 wrote it on the Owner's instruction of the same day (`คุณลุยงานทั้งหมด ตามที่คุณแนะนำ เลยได้ไหม ตอนนี้ delay แล้ว`). A change that NARROWS the delegation (a tightening a role run recommends) may be applied and reported to the Owner. A change that widens it needs the Owner again.
Date: 2026-09-28
Author: `/claude/a0_atlas` (A0 Integration / DB-00)
Amends: `RFC-2026-002` (temporary manual merge control), clause "the Product Owner may perform the final manual merge"
Origin: the one-page decision summary of 2026-09-28, item 4. The records this RFC reconciles are cited in §1.

---

## 1. Why

The repository records the same merges two ways.

- **The Owner's reading.** `evidence/WP-0A-DB-00/product-owner-disposition-2026-09-15-six-questions.md`
  (lines 186–188) records the Author's merges under the Owner's delegation as "the Owner's manual merges
  under RFC-2026-002 performed by delegation".
- **The Author's reading.** From the sixth pass on (`session-2026-09-16-sixth-pass.md` §1,
  `session-2026-09-27-seventh-pass.md` §1a, `session-2026-09-27-eighth-pass.md` §1), every state record
  says the literal sentence of RFC-2026-002 "is not satisfied".

Both cannot be right. Every future record would carry the same caveat, and a reader cannot tell whether
the practice is sanctioned. Between 2026-09-27 and 2026-09-28, A0 pressed the merges of #155, #156, #157,
#158, #159, #160 and #161 on the Owner's words.

Separately, each record-only increment (#154, #158, #160) cost a full PR cycle. Some of those cycles
included three role runs of about 200k tokens each. None of them changed schema, code, a test or a gate.

## 2. The rule proposed

1. **Delegated merge.** The Product Owner may delegate the merge of a named PR, or of a stated sequence
   of PRs, to the Author, in words, in session. A merge performed under that delegation **is** the
   Owner's manual merge under RFC-2026-002. It requires all of the following:
   - the required CI check is green on the PR's head;
   - the merge is a merge commit pinned to that head (`--match-head-commit`), with no squash, rebase or
     force;
   - every role run the package's gates require has run on that head, or on a head whose later commits
     are that role run's own findings, and no stop-the-line finding is unresolved;
   - the handoff is the last commit and touches only itself;
   - the next state record quotes the Owner's words verbatim and names who pressed the button.
2. **A stop-the-line finding revokes the delegation** for that PR. It goes back to the Owner.
3. **Record-only PRs need no role runs.** This covers a PR whose diff touches only `evidence/**`, the
   package's own handoff, the branch-slot lines in `test-kits/branch-identity.test.mjs` and
   `test-kits/integrity-manifest.json`, and open-blocker text in the package's own manifest. It may merge
   on green CI under a delegation. A PR that touches a migration, a script, a test, a fixture, a case,
   CI, or a contract or decision document is not record-only.
4. **The Author still never approves, test-verifies or integrates its own work.** The role runs and CI do
   that. This RFC moves the button, not the judgement.

## 3. What it does not change

- The separation of duties in `CONTRIBUTING_AGENTS.md`.
- The package gates.
- RFC-2026-024.
- The Integration Owner's ownership of `.github/workflows/ci.yml`.
- The requirement that a stop-the-line finding halts a merge.

## 4. In effect

From its approval, state records stop saying that RFC-2026-002's literal sentence is "not satisfied" for a
delegated merge that meets §2. They say "merged by delegation under RFC-2026-025" and quote the delegation.
Merges before the approval keep the caveat their own records gave them.
