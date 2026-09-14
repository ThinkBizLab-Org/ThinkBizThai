# Session record — 2026-09-15, third pass: the social key, the loader on stdin, `updated_by` at INSERT, and a map for the pre-080 decision

Author run: `/claude/a0_atlas` (Anthropic). Package: `WP-0A-DB-00`. Written at the close of the third
overnight pass, which the Product Owner opened with "มีอะไรลุยต่อได้บ้าง" and "อะไรลุยได้ ไล่ทำให้หมด".
This file is a STATE RECORD and approves nothing. It supersedes
[`session-2026-09-15-second-pass.md`](session-2026-09-15-second-pass.md) for STATE; that file's
§2–§4 remain the account of the second pass and are not repeated here.

## 1. Where `main` is

`main` = `__MAIN__` = merge of [PR #142](https://github.com/ThinkBizLab-Org/ThinkBizThai/pull/142).
No force-push, no direct push; every merge a merge commit of a Draft PR marked ready under the
Owner's 2026-09-15 instruction, after a green required CI run on its head, measured on the branch name.

| Measure | Value |
|---|---|
| `npm run verify` on `main` | **clean: exit 0 — tests 643, pass 643, fail 0, skipped 0, todo 0** |
| Isolation cases | **847** (844 after the second pass; +1 111 cross-tenant destination, +2 102 forged `updated_by`) — CI and the scratch 17.11 agree on every step (845, 845, 847) |
| Migrations added this pass | 111 (social foreign key), 102 (`updated_by` at INSERT is the caller) |
| Driver | fixtures and the auth-context helper on stdin (`feed`), cases still on `--command` |
| Decision records in review | RFC-2026-023, RFC-2026-024 (unchanged) |
| Open Draft PRs for this package | none |

## 2. What merged, in order

| PR | What | Cases | Signatures |
|---|---|---|---|
| #140 | **batch 111** — `content_targets_social_scope_fk (workspace_id, social_account_id) → social_accounts (workspace_id, id)`, the key 081 withheld by §6; the three destination symbols retired for `social_account_a1/a2/b1` with fixed ids; the cross-tenant aim refused 23503 in both directions | 845 | A1 `43e536e`, C0 `ffc9324`, Q0 `fec2929` — the first batch authored by A0 itself, with three role runs on it (A1 F1–F3, C0 M1–M3/L3/L4, Q0 F1/F2 applied) |
| #141 | **fixture loader on stdin** — the second half of #131; `feed()` beside `script()`; one contract rule; `\! echo` measured running on stdin before the rule was relied on | 845 | — (plumbing) |
| #142 | **batch 102** — `updated_by`, when a client writes it at INSERT, is the caller, on thirteen tables (the LOW siblings of A1-090 S13); NULL admitted because a row never updated has no updater; both forgeries measured landing without it and refused with it | 847 | — (forward fix in 094's shape, apply-time rule) |
| this PR | this record; the S8 map of the pre-080 families; the assertion-strength findings closed by reading | — | — |

## 3. Things measured this pass that the records did not know

1. **The old argv ceiling is Linux's, not this machine's.** A 141,425-byte script passed through `--command` on macOS; `MAX_ARG_STRLEN` is where CI runs. #131 and #141's evidence say so instead of claiming a local refusal.
2. **On stdin psql executes `\!`.** Fed a fixture-shaped script with `\! echo PWNED`, the rows came back headed `PWNED`. That is the reason the meta-command rule now covers every fixture and the helper, and the reason cases stay on `--command`.
3. **Batch 111's key refuses both directions** (A1-111 measured B→A), and a case id may not contain another family's control word — three renames this pass (`…-destination`, not `…-social-account`).
4. **The assertion-strength findings mostly no longer need a batch**: two moot (111 wrote the key 081's absence assertion guarded), two covered by 083/092's five-role claims, two standing as text with their controls elsewhere — `a0-assertion-strength-findings-2026-09-15.md`.

## 4. Where this session was wrong

- The 102 evidence first recorded 846 = 844 + 2, measured before 111 merged; replayed on the post-111 base (847 = 845 + 2, and `2 of 847` without the file) and corrected before the PR.
- The A3 assertion floor was set from a `grep` count (245); the guard counts 243. Set to what the guard prints.
- Two verify runs were red for the second-pass reason (a non-exempt file in the commit after the handoff refresh); the same rule fixed both.

## 5. What is owed, and to whom

**Decisions only the Product Owner can make:**

1. **RFC-2026-023** (shape B) and **RFC-2026-024** (cross-vendor) — dispose.
2. **The pre-080 families' narrowings** — now a per-family map: business/page, industry and knowledge are closable in 082's shape tonight with no new decision; metering and research pre-empt RFC-2026-022 and need a row of the map's §3 chosen (`a0-pre-080-families-s8-map-2026-09-15.md`).
3. **A1-100 S2** (PII-2 filename in the client SELECT grant), **A1-100 S4** (worker grants on asset tables), **A1-090 S14** (the `approval_events.comment` projection — RFC-2026-021's five objects and registry row, countersigned by A1; not draftable by A0 alone, which is why no view was written this pass).
4. **Batch 111's two new blockers**: `ON DELETE` semantics for the social key (NO ACTION today), and the FK supporting-index lint (21 keys lack one). And §6 row 120 should list 111 (docs/** is read-only to this package).
5. **The channel-binding table** (§4 invariant 2's business half), declined by 020, 110 and 111 in turn; needs an owner in §6.

**Owed to A0:** nothing from the three passes remains unpaid. Batch 120 (Publisher) is the next §6 row.

## 6. Housekeeping

The scratch PostgreSQL cluster on `127.0.0.1:5499` is stopped; the user's server on `/tmp:5432` was never touched. Local branches for every merged PR of this pass are 0 ahead of `main` and deleted.
