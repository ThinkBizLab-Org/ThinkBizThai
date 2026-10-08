# RFC-2026-030: risk-tiered review -- the same separation of duties, a depth that follows the risk

Status: **Approved in principle 2026-10-08 by the Product Owner; the final text is approved at merge.** The Owner's words,
in chat on 2026-10-08, were `รับตามแนะนำทั้งหมด รวม RFC-030 ด้วย ลุยเลย` ("accept everything as recommended, RFC-030 included;
go ahead"), answering A0's G1-G2 plan, which proposed this RFC (§1). They are transcribed in
`evidence/WP-0A-DB-00/product-owner-disposition-2026-10-08-rfc-030.md`. Approval in principle is not approval of this text:
**nothing here applies until the Owner merges it**, and the Owner may narrow or refuse any part at merge. This is a
governance PR, so under RFC-2026-025 §5 item 6 the Owner merges it personally, never A0 by delegation.
Date: 2026-10-08
Author: `/claude/a0_atlas` (A0 Integration / DB-00)
Amends, once merged: the sentence of `CONTRIBUTING_AGENTS.md` "Separation of duties" quoted in §7 (the text change itself is
owed to WP-0A-A0-001, which owns that file); the first bullet of RFC-2026-025 §6.4 ("Four-role review ... for every PR that
changes code ..."), for tiers M and L only; and, for those tiers, the per-merge Integration Owner evidence that
RFC-2026-002 and RFC-2026-025 §5 item 3 require. Nothing else in RFC-2026-002 or RFC-2026-025 changes.
Classifier: `scripts/db/classify-review-tier.mjs` (§4), with its test in `test-kits/db/foundation-contract.test.mjs`.

---

## 1. Background

On 2026-10-08 A0 put a G1-G2 plan to the Owner. Its §7.2, "needs an RFC (governance the Owner merges personally)", item 7
proposed this RFC. The paragraph, verbatim (A0's working file `.claude/g1-g2-plan-2026-10-08.md`, which is not in the
repository; the copy below is the record):

> 7. **[อนุมาน] RFC-2026-030 "risk-tiered review":** คงหลัก separation of duties ไว้ทั้งหมด เพราะ Author ไม่มีวันอนุมัติงานตัวเอง แต่ปรับ *ความลึก* ตาม tier
>
> | Tier | ครอบคลุม | Review ที่ต้องมี |
> |---|---|---|
> | H | migration/RLS, auth, secret/OAuth, publish, billing, CI/gate | 4 role เต็มพร้อม A1 security และ re-check |
> | M | logic ภายใน module เดียวที่มีเทสต์ และไม่แตะ schema/secret | Reviewer + Tester ส่วน R0 ตรวจตอนจบ WP ไม่ใช่ทุก PR |
> | L | UI component, copy, style หลัง feature flag ที่ไม่มี data path | Reviewer อิสระหนึ่งคน (A5 คนละ run) + CI/Playwright ส่วน Tester อ่าน artifact |
>
>    การเปลี่ยนนี้แตะ `CONTRIBUTING_AGENTS.md` ("Every implementation package has distinct Author, Independent Reviewer, Independent Tester, and Integration Owner") จึงต้องให้ Owner ตัดสิน และ classifier ควรตัดสิน tier แบบ fail-closed เหมือน §6.1

In English: `[inferred]` RFC-2026-030 keeps separation of duties whole, because an Author never approves its own work, and
varies only the *depth* of review by tier -- H: migrations/RLS, auth, secrets/OAuth, publishing, billing, CI/gates, with all
four roles, A1 security and a re-check; M: logic inside one module that has tests and touches no schema or secret, with
Reviewer and Tester, and R0 at the end of the work package rather than on every PR; L: UI components, copy and style behind a
feature flag with no data path, with one independent Reviewer (a different run) and CI/Playwright, the Tester reading the
artifacts. The change touches the quoted sentence of `CONTRIBUTING_AGENTS.md`, so the Owner decides it, and a classifier
should decide the tier fail-closed, as RFC-2026-025 §6.1 does.

**Why now.** Every PR so far has been G0 foundation: migrations, RLS, gates, contracts and the records about them. All of that
is H, and the four-role review it gets is what this repository's record of caught defects rests on. G1 brings application
code (RFC-2026-029 proposes `apps/web` and `src/modules/<key>`), and most of it will be one module's logic or a screen. Giving
a button's copy the review a migration gets would spend the role runs where they find least, and the plan's G1-G2 schedule
does not fit that.

The "[inferred]" tag is the plan's own: the tier list was A0's proposal, not something the Owner had asked for. The Owner's
words of 2026-10-08 accept it in principle.

## 2. The principle, unchanged and absolute

- **An Author never approves, test-verifies, integrates or gate-approves its own work, at any tier.** No tier removes the
  independent Reviewer. Every tier below H still has at least one independent reading by a run that is not the Author's.
- **The four role IDs stay distinct** in every manifest, as `scripts/validate-work-package-role-separation.mjs` checks today.
  A tier changes which role runs read a given PR, never who may hold a role.
- **The tier is decided by a script, fail closed** (§4), never by the Author's judgement. A reader may raise a PR's tier;
  nobody may lower it below what the classifier printed.
- **Governance PRs** (an RFC, `CONTRIBUTING_AGENTS.md`, CI or a gate) are H and are merged by the Owner personally
  (RFC-2026-025 §5 item 6). This PR is one.

## 3. The tiers, and what each PR needs

| Tier | What it covers (decided by §4, not by this column) | Per-PR review | Integration Owner (R0) |
|---|---|---|---|
| **H** | migrations, RLS, grants, schema; auth, sessions, IAM, tenancy, roles; secrets, OAuth, tokens, credentials; publishing; billing, payments, entitlement, webhooks; CI, gates, guards, scripts, test kits, the integrity manifest; contracts, RFCs, `CONTRIBUTING_AGENTS.md`, `package.json`, the lockfile; work-package scope or roles; **and anything the classifier cannot place** | Reviewer (C0), Tester (Q0), Security/Privacy (A1) where the package requires it or a signal of §4.2 fired, and a re-check round on fix commits (RFC-2026-025 §5 item 2) -- **as today** | per PR, as today |
| **M** | code inside **one** module, `src/modules/<key>/**`, with a test of that module in the diff, and no H path or signal | independent Reviewer + independent Tester, each recording a verdict on the head; a fix commit is re-read by the role whose finding it answers | **at the end of the work package** (§3.2), not per PR |
| **L** | presentational files only: a module's `ui/` or `components/`, `apps/web` components, copy catalogues, stylesheets, static images; **no data path**, no H signal; **behind a feature flag** (§4.3) | **one** independent Reviewer (a run that is not the Author's); the Tester reads the CI and Playwright artifacts of the head and records a short verdict, without re-running | at the end of the work package (§3.2) |
| **records** | RFC-2026-025 §6.1, unchanged | RFC-2026-025 §6.2, unchanged: one independent reading | as RFC-2026-025 §6.2 says |

### 3.1 What every tier keeps

- Green required CI on the head; a merge commit pinned with `--match-head-commit`; the head contains current `main`; the
  handoff last and alone; no open security finding of any grade; the next state record quotes the delegation
  (RFC-2026-025 §2 item 1 and §5 item 6). A0 may press the merge of an M, L or records PR under the standing delegation;
  an H PR as today.
- The PR records its tier: the classifier's command, its exit code and its full output, in the Author's evidence for the PR,
  and each reader repeats the command on the head it reads.
- **A PR never drops tier during its life.** Its tier is the highest the classifier printed on any head a role read, or on
  the final head. A PR that wants a lighter tier is split, and each part is classified on its own.

### 3.2 R0 at the end of the work package (M and L)

The Integration Owner's verdict for M and L PRs is given once over the package's merged M and L work, not on each PR:

1. **When.** Before the package moves past `test_verified`, and in any case after **10** merged M or L PRs or **7 days**
   since the last such verdict, whichever comes first (Q-030-2). Until that verdict exists, the package cannot move to
   `integration_verified`, and an eleventh M or L PR is classified as if it were H for its R0 reading.
2. **What R0 reads.** The cumulative diff, on `main`, of the package's paths from the head of R0's last verdict to now; each
   PR's tier record and role verdicts; and CI on `main`. R0's file names the range it read.
3. **If R0 finds a problem.** A forward fix in a new PR, classified on its own; a stop-the-line finding follows §6.

### 3.3 The Tester on L

The Tester reads the head's CI run: the test report, and the Playwright traces and screenshots, and records which ones it read.
**Until CI produces Playwright artifacts** (owed, §10 item 3), there is nothing to read, so the Tester runs the tests itself,
as for M. L never has fewer than one independent reading plus a Tester verdict.

## 4. The classifier

`node scripts/db/classify-review-tier.mjs [<base>=origin/main] [<head>=HEAD]` reads the PR's own diff,
`merge-base(base, head)..head`, renames off, and prints `tier: <records|L|M|H>` with every reason that raised it. It exits 0
when it classified; **exit 2 is "not classified", and RFC-2026-030 treats it as H.** Node built-ins only.

### 4.1 Order of the rules

1. If `classify-records-only.mjs` (RFC-2026-025 §6.1) says records-only, the tier is `records`.
2. Otherwise each changed path is classified alone (§4.2). The PR's tier is the **highest** path tier.
3. Then three whole-PR rules can only raise it:
   - no tier-bearing path at all (only evidence, handoffs or the manifest, and not records-only): **H**;
   - paths in more than one module: **H** (a cross-module change goes through a port or event and its contract, which is H);
   - M with module logic changed and no test file of that module added or modified in the diff: **H** (a deleted test does not
     count).

### 4.2 One path

In this order; the first rule that fires decides:

1. **Shape.** Only an addition, a modification or a deletion of a regular file (`100644`). A rename, copy, type change,
   symlink or executable is **H**.
2. **Neutral paths** add no tier: `evidence/<package>/**`, `handoffs/*.json`, `evidence/VERIFICATION.md` (added or modified;
   a deleted record is H), and `work-packages/*.json` when its change, with `ownership.branch` set aside, is a records change
   under RFC-2026-025 §6.1. Any other manifest change (scope, roles, criteria) is **H**.
3. **H words in the path.** The path is split on `/ . - _` and case changes. Any word from the list in the script -- among them
   `auth`, `iam`, `login`, `session`, `secret`, `oauth`, `token`, `credential`, `key`, `publish`, `billing`, `payment`, `stripe`,
   `entitlement`, `webhook`, `rls`, `policy`, `migration`, `sql`, `supabase`, `db`, `schema`, `contract`, `middleware`, `admin`,
   `tenant`, `role`, `permission`, `env`, `ci`, `workflow`, `gate`, `meta`, `connector`, `server`, `api` -- makes it **H**.
   The list errs wide: a false hit costs a heavier review, a miss a lighter one.
4. **Unplaced.** A path that is neither L (§4.3) nor M (`src/modules/<key>/**` code, JSON or style) is **H**. Today that is
   every path in the repository, because `apps/` and `src/` do not exist yet.
5. **H line signals.** In an added line of a text file: the environment (`process.env`, `import.meta.env`); a privileged
   database credential (`service_role`, `SUPABASE_*`); a secret's name (`secret`, `password`, `api_key`, `access_token`,
   `client_secret`, `bearer`, ...); SQL that changes schema or a grant; RLS or definer rights; `stripe`, `webhook`, `oauth`; a
   code-injection sink (`dangerouslySetInnerHTML`, `eval(`, `new Function(`, `<script`). Any one is **H**.
6. **A deletion** inside a module is M at least; outside one it is **H** (the classifier cannot see who still reads it).
7. **L, if no data path.** An L path whose added lines carry no data-path signal -- a network call (`fetch(`, `XMLHttpRequest`,
   `WebSocket`, `EventSource`, `axios`, `sendBeacon`), server code (`'use server'`, `server-only`, `cookies(`, `headers(`), a
   database client (`@supabase/`, `createClient(`, `.rpc(`, `.from('...')`), an `/api/` route, or browser storage -- is **L**.
   With a data path it is **M** inside a module (and M's test rule then applies) and **H** outside one.
8. Otherwise, a module path is **M**.

A binary file is not scanned for line signals; its path must still be L (images under `apps/web/public/` only).

### 4.3 L's paths, and the feature flag

L paths: `src/modules/<key>/(ui|components)/**/*.{jsx,tsx,css,scss,svg}`, `apps/web/[src/]components/**/*.{jsx,tsx,css,scss,svg}`,
`apps/web/[src/]{messages,locales}/*.json`, `apps/web/[src/]styles/**/*.{css,scss}`, and
`apps/web/public/**/*.{png,jpg,jpeg,webp,avif,svg,ico}`. Route files, layouts, `lib/`, server actions and configuration are not
L.

**"Behind a feature flag" is not mechanical today**: no flag registry exists. The classifier prints, for every L result, that
the Reviewer confirms each changed component is reachable only behind a flag. A Reviewer who cannot confirm it raises the PR
to M, which under §4.1 needs a module and a test, and otherwise is H. When a flag registry exists, its check belongs in the
classifier (§10 item 4).

### 4.4 What it was measured against

Run read-only over the 29 first-parent merges on `origin/main` since 2026-10-05T12:00 (+07:00), each PR as
`<first parent>..<second parent>`: **24 H and 5 records** (#198, #199, #201, #205, #206, the same five RFC-2026-025 §6.5
measured), **0 M and 0 L**. That is the expected answer for a repository with no application paths: RFC-2026-030 changes
nothing for any PR that exists today. The command and the per-PR output are in
`evidence/WP-0A-DB-00/a0-batch-rfc-030-risk-tiered-review-plan-2026-10-08.md` §3. The M and L rules are proved only on
synthetic diffs in the test; their first real PR is their first real measurement.

## 5. Misclassification

1. **Found before the merge** (by any reader, or by a re-run on a later head): the PR takes the higher tier at once. Verdicts
   already given stand for what they read; the roles the higher tier adds run on the head. A reader who finds the classifier
   wrong records the path, the rule that should have fired and the tier it should have given.
2. **Found after the merge**: the merged PR gets the role runs its true tier needed, on its merge commit, before the package's
   next R0 verdict and before any later PR of that package merges under the delegation. A finding those runs make is handled as
   if it had been found before the merge, including stop-the-line.
3. **Every miss is fixed in the classifier**, with a test case that reproduces it, in a governance PR (the classifier is a
   gate). Until that fix merges, the paths involved are treated as H by hand, and the reader records it.
4. **A miss that let an H change through as M or L** -- a migration, an RLS or grant change, a secret path, a publishing or
   billing path, a CI or gate change -- is a **security finding**: A1 reads the merged change at once, and if the change is a
   stop-the-line class (`CONTRIBUTING_AGENTS.md`: secret exposure, tenant leakage, duplicate external side effects, lost jobs,
   migration divergence, irreversible deletion, contract mismatch) it is a stop-the-line incident.

## 6. Stop-the-line and security findings at any tier

- **Any reader at any tier may stop the line.** A stop-the-line finding halts the merge and revokes the delegation for that PR
  (RFC-2026-025 §2 item 2), whatever the tier.
- **A security finding of any grade, by any reader, raises the PR to H** for the rest of its life: A1 reads it, R0 reads it
  per PR, and the re-check round applies. An open security finding blocks a delegated merge (RFC-2026-025 §5 item 6).
- **A reader at M or L who is unsure** whether something is a security matter raises the PR to H. Raising costs a role run;
  not raising could cost a leak.

## 7. The `CONTRIBUTING_AGENTS.md` sentence it amends

Today, under "Separation of duties":

> Every implementation package has distinct Author, Independent Reviewer, Independent Tester, and Integration Owner.

Proposed replacement, word for word (the rest of the paragraph is unchanged):

> Every implementation package has distinct Author, Independent Reviewer, Independent Tester, and Integration Owner, and no
> role is ever held by the Author's run. How many of them read each pull request follows its risk tier under
> [`RFC-2026-030`](architecture/decisions/RFC-2026-030-risk-tiered-review.md), decided by
> `scripts/db/classify-review-tier.mjs` and never lowered by hand: tier H (migrations and RLS, auth, secrets and OAuth,
> publishing, billing, CI and gates, contracts, and anything the classifier cannot place) is read by every role on every pull
> request; tier M by the Reviewer and the Tester, and tier L by one Reviewer with the Tester reading CI artifacts, each with
> the Integration Owner's verdict at the end of the work package; records-only pull requests follow RFC-2026-025 §6. A
> stop-the-line or security finding raises any pull request to tier H.

`CONTRIBUTING_AGENTS.md` belongs to WP-0A-A0-001, so this PR does **not** edit it; the edit is owed there (§10 item 1), as a
governance PR of its own, after this RFC merges. **Until that edit merges, every PR is H**, because the canonical guide still
requires all four roles.

## 8. What does not change

- Separation of duties, the four distinct role IDs, and the role-separation validator.
- Everything H: every PR that exists today, every migration, contract, CI, gate, script and test-kit change.
- RFC-2026-025 §1-§6 except the one §6.4 bullet named in the header, for M and L only; RFC-2026-002 except the per-merge
  Integration Owner evidence for M and L; RFC-2026-024.
- Stop-the-line, the security rules of `CONTRIBUTING_AGENTS.md`, and the gates.
- Governance PRs merged by the Owner personally.

## 9. In effect

From the Owner's merge of this RFC, **and** only once both of these exist on `main`:

1. the `CONTRIBUTING_AGENTS.md` edit of §7 (WP-0A-A0-001); and
2. a CI step that prints the classifier's tier on every PR (WP-0A-A0-004), so the tier is not only something a reader reports.

Before both, every PR is H. With no application paths in the repository, the first M or L PR can only come after RFC-2026-029's
layout lands.

## 10. Owed if the Owner approves

1. **`CONTRIBUTING_AGENTS.md`** (WP-0A-A0-001): the §7 replacement, word for word, and a citation of RFC-2026-025 §6 in
   "Temporary manual merge control" (already owed there by RFC-2026-025 §6.6 item 3).
2. **CI** (WP-0A-A0-004, `.github/workflows/ci.yml`): a step that runs `classify-review-tier.mjs` on every PR and prints the
   tier, non-gating at first; together with RFC-2026-025 §6.6 item 1's records-only step, one step can print both.
3. **Playwright artifacts in CI** for L's Tester (§3.3), owned by whichever package lands the web app's test harness.
4. **A feature-flag registry** and its check in the classifier (§4.3), with the web app's layout (RFC-2026-029).
5. **The script's home.** It sits in `scripts/db/`, next to the records-only classifier, because WP-0A-DB-00 owns this RFC and
   that path. Moving both to a protocol path such as `scripts/` is a WP-0A-A0-001 or A0-002 change.
6. **Its digests.** The script is added to `test-kits/integrity-manifest.json` and to `DIGESTED_FLOOR` in
   `scripts/verify-test-coverage-floor.mjs` in this PR, declared as amendments of paths WP-0A-A0-002 owns; that owner's
   acknowledgement is owed on the merged head.

## 11. Questions for the Owner, at merge

- **Q-030-1.** Approve this text as the final text: yes or no. A0 recommends yes.
- **Q-030-2.** R0's end-of-package verdict for M and L: is "at the latest every 10 merged M/L PRs or 7 days" (§3.2) the right
  cap? A0 recommends yes; without a cap, "the end of the work package" could be weeks of unread integration.
- **Q-030-3.** Should L stay closed to anything not behind a flag until a flag registry exists, as §4.3 says (the Reviewer
  confirms the flag, or the PR is raised)? A0 recommends yes.
- **Q-030-4.** Should the H path-word list stay wide, accepting false H results such as `design-tokens.css`, over a narrower
  list that could miss? A0 recommends wide; a false H costs a role run, a miss costs the review the risk needed.

## 12. Rollback

Before the merge: close the PR. After it: revert this RFC in a reviewed governance PR; every PR is H again at once, which is
where every PR in the repository is today. The classifier adds a script and a test and changes nothing that exists.
