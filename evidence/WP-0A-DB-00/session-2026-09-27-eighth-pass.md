# Session record, 2026-09-27, eighth pass: the catalog-rule probes merged, and blocker 189 next

Author run: `/claude/a0_atlas` (Anthropic). Package: `WP-0A-DB-00`. This file is a STATE RECORD and
approves nothing. It supersedes
[`session-2026-09-27-seventh-pass.md`](session-2026-09-27-seventh-pass.md) for STATE; that file
predates PR #159. It was written on this record's own branch, before its own PR merged. **If `main`
has moved since, `git log` is the truth and this table is not.**

**READ THIS FIRST** if you are the next Author run on this package.

## 1. Where things stand

| Measure | Value |
|---|---|
| `main` | **`b798453`** (merge of [PR #159](https://github.com/ThinkBizLab-Org/ThinkBizThai/pull/159), head `130307e`). CI run `36317253284`: **success** |
| Merged on 2026-09-27, in order | #155 the post-migrate pass; #157 the fix for main's red CI; #156 the stray `.rej.orig`; #158 the seventh-pass correction and the survey; **#159 the four catalog-rule probes** |
| `npm run verify` | clean: exit 0, **tests 669** |
| Isolation cases | 965 (unmoved) |
| Migrations | unchanged, 000..140 |
| `open_blockers` | **189** |
| Open PRs | none except this record's own |

**Who merged #159.** A0 pressed the merge (account `workstationgroup`), on the Owner's advance
delegation `ทำเลยทุกอย่างตามคุณแนะนำไม่ต้องรอง`, after CI was green on its head. That is the same
footing and the same caveat as #155–#158, which the seventh-pass record §1a states in full.
RFC-2026-002's literal sentence, that the Product Owner merges, is not satisfied.

## 2. What #159 is

`migrate-clean` asserts four rules over the whole schema:

1. every FK is NO ACTION on delete and on update, not deferrable, and validated;
2. the 14 `updated_by` and 2 requester closures match their exact deparsed text;
3. SECURITY DEFINER functions are exactly the five pinned ones, with pinned owner, body digest,
   `search_path=""`, and no EXECUTE for PUBLIC;
4. every trigger is enabled, the four append-only trigger definitions are pinned, the audit tables
   have no child or partition, and no default `session_replication_role` is set.

**Each probe proves on every run that it can fail.** In a rolled-back transaction a known drift is
applied, and the probe must refuse it. C0, A1 and Q0 found no stop-the-line. Their findings and
what changed are in
[`a0-catalog-rule-probes-integration-2026-09-27.md`](a0-catalog-rule-probes-integration-2026-09-27.md).

## 3. What the Owner said next, and how A0 read it

After A0 listed what was owed, the Owner said: `เอาตามคุณแนะนำ` (verbatim).

A0 had made two explicit recommendations in that message:

- correct this record first;
- take **blocker 189** ahead of other work. A1 recommends the same, because it is exploitable on
  the clean set today: `updated_by` can be forged through UPDATE on seven tables.

A0 reads the answer as choosing those two. **It does not choose 189's remedy or grade.** A0 had
presented the remedy as two options without recommending either, and the grade as the Owner's. It
also does not answer A1's objection to delegating plan questions F and C in advance. A0 will put
189's remedy to the Owner with a recommendation before writing a migration.

## 4. Owed, in order

1. **Blocker 189.** A0 measures, then proposes a remedy to the Owner with a recommendation:
   (a) UPDATE policies in 102's shape, or (b) `updated_by` removed from the client UPDATE grant and
   maintained by the database. Then the batch, three role runs, and the closure-text probe extended
   to whatever the batch adds.
2. **The Owner:** 189's grade and remedy; A1's objection on questions F and C (the #159 integration
   record §4); the post-migrate pass's integration record §4; the three questions from batch 121.
3. **The Integration Owner:** the `ci.yml` control job (the post-migrate integration record §5).
4. **A0, after 189:** the eleven INSERT forging cases (survey item 3), then batch 150's own pins of
   121's objects (item 5).
