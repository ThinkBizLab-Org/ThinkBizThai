# RFC-2026-030: risk-tiered review -- the same separation of duties, a depth that follows the risk

Status: **Approved in principle 2026-10-08 by the Product Owner; the final text is approved at merge.** The Owner's words,
in chat on 2026-10-08, were `รับตามแนะนำทั้งหมด รวม RFC-030 ด้วย ลุยเลย` ("accept everything as recommended, RFC-030 included;
go ahead"), answering A0's G1-G2 plan, which proposed this RFC (§1). They are transcribed in
`evidence/WP-0A-DB-00/product-owner-disposition-2026-10-08-rfc-030.md`. Approval in principle is not approval of this text:
**nothing here applies until the Owner merges it**, and the Owner may narrow or refuse any part at merge. This is a
governance PR, so under RFC-2026-025 §5 item 6 the Owner merges it personally, never A0 by delegation.
Date: 2026-10-08
Author: `/claude/a0_atlas` (A0 Integration / DB-00)
Amends, once merged: the three passages of `CONTRIBUTING_AGENTS.md` quoted in §7 -- the "Separation of duties" sentence, the
"Verification and handoff" sentence on the Integration Owner, and the "Temporary manual merge control" bullet on linked
evidence (the text changes themselves are owed to WP-0A-A0-001, which owns that file); the first bullet of RFC-2026-025 §6.4
("Four-role review ... for every PR that changes code ..."), for tiers M and L only; and, for those tiers, the per-merge
Integration Owner evidence that RFC-2026-002 and RFC-2026-025 §5 item 3 require. Nothing else in RFC-2026-002 or
RFC-2026-025 changes.
Classifier: `scripts/db/classify-review-tier.mjs` (§4), with its test in `test-kits/db/foundation-contract.test.mjs`.
First review round: C0, A1, Q0 and R0 at `95f2d115`; what changed in answer is recorded finding by finding in
`evidence/WP-0A-DB-00/a0-batch-rfc-030-risk-tiered-review-closure-2026-10-08.md`.

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
code (RFC-2026-029, proposed and not yet in this repository, puts it in `apps/web` and `src/modules/<key>`), and most of it
will be one module's logic or a screen. Giving a button's copy the review a migration gets would spend the role runs where
they find least, and the plan's G1-G2 schedule does not fit that.

The "[inferred]" tag is the plan's own: the tier list was A0's proposal, not something the Owner had asked for. The Owner's
words of 2026-10-08 accept it in principle.

## 2. The principle, unchanged and absolute

- **An Author never approves, test-verifies, integrates or gate-approves its own work, at any tier.** No tier removes the
  independent Reviewer. Every tier below H still has at least one independent reading by a run that is not the Author's,
  and the merge of an M or L PR is pressed by a run that is not the Author's (§3.1).
- **The four role IDs stay distinct** in every manifest, as `scripts/validate-work-package-role-separation.mjs` checks today.
  A tier changes which role runs read a given PR, never who may hold a role.
- **The tier is decided by a script, fail closed** (§4), never by the Author's judgement, and by that script **as it is on
  the base**, never by the PR's own copy of it. A reader may raise a PR's tier; nobody may lower it below what the base's
  classifier printed.
- **What the script cannot decide, a reader confirms in writing.** Two of L's conditions (behind a feature flag, no data
  path) and M's "with tests" are not fully mechanical (§4.1, §4.3, §4.5). The reader named for each confirms it on the head,
  or raises the tier.
- **Governance PRs** (an RFC, `CONTRIBUTING_AGENTS.md`, CI, a gate, or either classifier) are H and are merged by the Owner
  personally (RFC-2026-025 §5 item 6). This PR is one.

## 3. The tiers, and what each PR needs

| Tier | What it covers (decided by §4, not by this column) | Per-PR review | Integration Owner (R0) |
|---|---|---|---|
| **H** | migrations, RLS, grants, schema; auth, sessions, IAM, identity, tenancy, roles; secrets, OAuth, tokens, credentials; publishing; billing, payments, subscriptions, entitlement, webhooks; jobs, queues, schedulers, storage and deletion, provider adapters, mail and notifications; CI, gates, guards, scripts, test kits, the integrity manifest, either classifier; contracts, RFCs, `CONTRIBUTING_AGENTS.md`, `package.json`, any lockfile or tool configuration wherever it sits; work-package scope or roles, or a status move past `in_review`; **any module not on the reviewed module allowlist (§4.2 item 6), which today is every module**; **and anything the classifier cannot place** | Reviewer (C0), Tester (Q0), Security/Privacy (A1) where the package requires it or a signal of §4.2 fired, and a re-check round on fix commits (RFC-2026-025 §5 item 2) -- **as today** | per PR, as today |
| **M** | code inside **one** module, `src/modules/<key>/**`, whose key is on the reviewed module allowlist, with a test of that module in the diff, and no H path or signal | independent Reviewer + independent Tester, each recording a verdict on the head; the Tester confirms the test exercises the changed code (§4.1); a fix commit is re-read by the role whose finding it answers | **at the end of the work package** (§3.2), not per PR |
| **L** | presentational files only: an allowlisted module's `ui/` or `components/`, `apps/web` components, copy catalogues, stylesheets, raster images; the diff only adds lines to them, they import only React and other L files, and carry no data-path or H signal; **behind a feature flag** and with **no data path**, both confirmed in writing by the Reviewer (§4.3) | **one** independent Reviewer (a run that is not the Author's); the Tester reads the CI and Playwright artifacts of the head and records a short verdict, without re-running | at the end of the work package (§3.2) |
| **records** | RFC-2026-025 §6.1, unchanged | RFC-2026-025 §6.2, unchanged: one independent reading | as RFC-2026-025 §6.2 says |

### 3.1 What every tier keeps

- Green required CI on the head; a merge commit pinned with `--match-head-commit`; the head contains current `main`; the
  handoff last and alone; no open security finding of any grade; the next state record quotes the delegation
  (RFC-2026-025 §2 item 1 and §5 item 6).
- **Who presses the merge.** The merge of an M or L PR is pressed by a run that is **not** the PR's Author: at M and L no
  Integration Owner reads the PR before it merges, so an Author pressing its own merge would integrate its own work, which §2
  forbids (A1-5, R0 R-6; put to the Owner as Q-030-5, with the alternative). Under the standing delegation that run may be an
  A0 run that did not author the PR. A records PR is pressed as RFC-2026-025 §6 says; an H PR as today.
- The PR records its tier: the command, run **from the base's copy of the classifier** (§4), its exit code and its full
  output, in the Author's evidence for the PR; each reader repeats it on the head it reads and checks the output says
  `classifier copy: the base's`.
- **A PR never drops tier during its life.** Its tier is the highest the classifier printed on any head a role read, or on
  the final head. A PR that wants a lighter tier is split, and each part is classified on its own.

### 3.2 R0 at the end of the work package (M and L)

The Integration Owner's verdict for M and L PRs is given once over the package's merged M and L work, not on each PR:

1. **When.** Before the package moves past `test_verified`, and in any case after **10** merged M or L PRs or **7 days**
   since the last such verdict, whichever comes first (Q-030-2). Until that verdict exists, the package cannot move to
   `integration_verified`, and an eleventh M or L PR is classified as if it were H for its R0 reading. An M or L PR cannot
   move the status past `in_review` itself: the classifier makes such a move H (§4.2 item 3).
2. **What R0 reads.** The cumulative diff, on `main`, of the package's paths from the head of R0's last verdict to now; each
   PR's tier record and role verdicts; and CI on `main`. R0's file names the range it read.
3. **If R0 finds a problem.** A forward fix in a new PR, classified on its own; a stop-the-line finding follows §6.

### 3.3 The Tester on L

The Tester reads the head's CI run: the test report, and the Playwright traces and screenshots, and records which ones it read.
**Until CI produces Playwright artifacts** (owed, §10 item 3), there is nothing to read, so the Tester runs the tests itself,
as for M. L never has fewer than one independent reading plus a Tester verdict.

## 4. The classifier

`node scripts/db/classify-review-tier.mjs [<base>=origin/main] [<head>=HEAD]` reads the PR's own diff,
`merge-base(base, head)..head`, renames off, and prints `tier: <records|L|M|H>` with every reason that raised it, every
status move in a manifest, and whether the copy running is the base's. It exits 0 when it classified; **exit 2 is "not
classified", and RFC-2026-030 treats it as H.** Node built-ins only.

**The base's copy decides** (A1-4). A PR can edit its own copy, and a copy edited to print L prints L for itself (A1
measured it). So the tier that counts is the one printed by the two classifier files as they are on the base,
`scripts/db/classify-review-tier.mjs` and the `scripts/db/classify-records-only.mjs` it imports, for example:

```
tmp=$(mktemp -d) && git archive <base> scripts/db/classify-review-tier.mjs scripts/db/classify-records-only.mjs | tar -x -C "$tmp"
node "$tmp/scripts/db/classify-review-tier.mjs" <base> <head>      # run inside the repository
```

The CLI prints `classifier copy: the base's` when both files it runs equal the base's blobs, and `NOT the base's` otherwise;
a tier printed by a copy that is not the base's is void. A PR that changes either file is H whatever any copy prints
(§4.2 item 1). The CI step owed by §10 item 2 runs the base's copy.

### 4.1 Order of the rules

1. If `classify-records-only.mjs` (RFC-2026-025 §6.1) says records-only, the tier is `records`.
2. Otherwise each changed path is classified alone (§4.2). The PR's tier is the **highest** path tier.
3. Then four whole-PR rules can only raise it:
   - no tier-bearing path at all (only evidence, handoffs or the manifest, and not records-only): **H**;
   - paths in more than one module: **H** (a cross-module change goes through a port or event and its contract, which is H);
   - records of more than one package (evidence, a handoff or a manifest of two packages): **H** (Q1);
   - M with module logic changed and no test file of that module (a `.test` or `.spec` code file, or a code file under
     `__tests__/`) added or modified in the diff: **H** (a deleted test does not count). **The rule checks only that a test
     file is touched, not that it tests anything** (Q6, R0 R-8 d, A1-7): a comment-only touch passes it. The M Tester
     confirms in writing that the test exercises the changed code, or raises the PR to H.

### 4.2 One path

In this order; the first rule that fires decides:

1. **A classifier.** A change of any kind to either classifier file is **H** (A1-4).
2. **Shape.** Only an addition, a modification or a deletion of a regular file (`100644`). A rename, copy, type change,
   symlink or executable is **H**.
3. **Neutral paths** add no tier: a Markdown file directly under `evidence/<package>/`, added, or modified by added lines
   only (any removed line is a rewrite of a record and **H**; another file type, or a file in a subdirectory, is not
   neutral) (Q1, A1-8); `handoffs/<package>-<role>-handoff.json`; `evidence/VERIFICATION.md` (added or modified; a deleted
   record is H); and `work-packages/*.json` when its change, with `ownership.branch` set aside, is a records change under
   RFC-2026-025 §6.1 **and moves the status no further than `in_review`** (R0 R-4). Every status move is printed for the
   reader. Any other manifest change (scope, roles, criteria, a later status) is **H**.
4. **H words in the path.** The path is split on every non-alphanumeric character, on case changes and on acronym runs
   (`APIClient` is `api client`), and each pair of adjacent words is also tried joined (`SignIn` gives `signin`). A word that
   is one of the exact words in the script, or **starts with** one of its stems, makes the path **H**. The exact words
   include `auth`, `iam`, `login`, `logout`, `signin`, `signup`, `session`, `secret`, `oauth`, `token`, `credential`, `key`,
   `jwt`, `csrf`, `cookie`, `mfa`, `otp`, `sso`, `publish`, `billing`, `payment`, `stripe`, `entitlement`, `webhook`, `rls`,
   `policy`, `migration`, `sql`, `supabase`, `db`, `schema`, `contract`, `middleware`, `admin`, `tenant`, `role`,
   `permission`, `env`, `ci`, `workflow`, `gate`, `meta`, `connector`, `server`, `api`, `package` and `lock`; the stems
   include `auth`, `tenan`, `ident`, `crypt`, `encrypt`, `oauth`, `passkey`, `webauthn`, `subscri`, `invoic`, `refund`,
   `payout`, `charge`, `member`, `invit`, `consent`, `account`, `upload`, `storage`, `bucket`, `purge`, `delet`, `queue`,
   `cron`, `schedul`, `worker`, `job`, `retry`, `provider`, `adapter`, `integrat`, `notif`, `mail`, `email`, `sms`,
   `config`, `tsconfig` and `eslint`. They cover each path the first round measured as too light (C0 F2, F4, F5; A1-1; Q0 Q3,
   Q4; R0 R-1, R-2), including `CONTRIBUTING_AGENTS.md`'s stop-the-line classes of lost jobs, irreversible deletion and
   duplicate external side effects. **The list is a denylist and can still miss** (§4.5); the module allowlist (item 6) is
   what fails closed.
5. **Unplaced.** A path that is neither L (§4.3) nor M (`src/modules/<key>/**` code, JSON or style) is **H**. Today that is
   every path in the repository, because `apps/` and `src/` do not exist yet.
6. **The module allowlist** (A1-1). A path in `src/modules/<key>/` is below H only when `<key>` is named in
   `M_ELIGIBLE_MODULES` in the script. **The list is empty**, so every module path is H. A module is added only by a
   governance PR to the classifier (§5 item 3), after RFC-2026-029's layout lands, with a test per module class; a module
   that owns identity, tenancy, IAM, sessions, secrets, billing, entitlement, publishing, connectors, uploads, jobs or
   provider calls is never added.
7. **H line signals.** In an added line of a text file: the environment (`process.env`, any `process.` or `process[`
   access, `import.meta.env`, `Deno.env`, `Bun.env`, or `env` as an identifier); a privileged database credential
   (`service_role`, `SUPABASE_*`); a secret, payment, webhook or OAuth name, matched as a whole word **and as an identifier
   sub-word** (`hashPassword`, `DB_PASSWORD`, `userApiKey`, `webhookSecret`, `getAccessToken`, `stripeClient`,
   `oauth_client_id`) (A1-2); SQL that changes schema or a grant; RLS or definer rights; a code-injection sink
   (`dangerouslySetInnerHTML`, `eval(`, `new Function(`, `<script`, `innerHTML`, `outerHTML`, `insertAdjacentHTML`,
   `document.write`, `javascript:`, `<foreignObject`, `srcdoc`, a timer given a string, and a lower-case HTML event-handler
   attribute such as `onload=` or `onerror=`, which JSX's `onClick={...}` is not) (C0 F3). Any one is **H**. Only lines
   inside a hunk are read, so an added line whose own text starts with `++` is read too (Q0 Q5).
8. **Cross-module imports** (C0 F5). A module file whose added lines import another module (a relative path into
   `src/modules/<other>/`, or an alias naming `modules/<other>`) is **H**.
9. **A deletion** inside a module is M at least; outside one it is **H** (the classifier cannot see who still reads it).
10. **L, only if every L condition holds** (C0 F1, A1-3, A1-6, Q0 Q2, R0 R-3). An L path is **L** only when (a) its added
    lines carry no data-path signal -- a network call (`fetch(`, `XMLHttpRequest`, `WebSocket`, `EventSource`, `axios`,
    `sendBeacon`), server code (`'use server'`, `server-only`, `cookies(`, `headers(`), a database client (`@supabase/`,
    `createClient(`, `.rpc(`, any `.from(` other than `Array.from(`), an `/api/` route, browser storage, an absolute URL
    other than an XML namespace, a form `action=` or `formAction`, a channel out of the page (`navigator.`, `postMessage`,
    `window.location`, `location.href`/`assign`/`replace`, `window[`, `globalThis[`, `new Image(`, `<iframe`), a dynamic
    `import(` or `require(`; (b) it imports only `react` and files that exist at the head and are themselves L paths (a
    relative import is resolved against the head's tree; a package, an alias such as `@/lib/data`, a hook in `ui/useX.ts`
    or a path that resolves to nothing is a data path); and (c) the diff removes no line from it (a removed line could be
    a flag guard or an escape: an L change only adds). Otherwise it is **M** inside a module (and M's test rule then
    applies) and **H** outside one. A module's test file under `ui/` counts as the module's test, not as L (Q0 Q7).
11. **Removed guards in M** (A1-6, C0 F6). A module file whose diff removes a guard-shaped line -- a flag or feature
    check, a permission, role or tenant condition, an `auth*`, `allow*`, `deny*`, `forbid*`, `sanitiz*` or `escape*` word,
    a `throw`, a negated `if (!` -- or a line that carries an H signal, is **H**.
12. Otherwise, an allowlisted module path is **M**.

A binary file is not scanned for line signals; its path must still be L (raster images under `apps/web/public/` only; a
public SVG is served same-origin and is H, A1-3).

### 4.3 L's paths, the feature flag and the data path

L paths: `src/modules/<key>/(ui|components)/**/*.{jsx,tsx,css,scss,svg}` for an allowlisted `<key>`,
`apps/web/[src/]components/**/*.{jsx,tsx,css,scss,svg}`, `apps/web/[src/]{messages,locales}/*.json`,
`apps/web/[src/]styles/**/*.{css,scss}`, and `apps/web/public/**/*.{png,jpg,jpeg,webp,avif,ico}`. Route files, layouts,
`lib/`, server actions, configuration and public SVGs are not L.

**Two of L's conditions are not mechanical, and the Reviewer confirms both in writing** (C0 F1, Q0 Q2 (b), R0 R-3).
"Behind a feature flag": no flag registry exists. "No data path": §4.2 item 10 catches the common shapes and refuses any
import but React and L files, but data can still reach a component through a prop, a context, or an L file reviewed
earlier, and the signal lists are denylists. For every L result the classifier prints that the Reviewer confirms, on the
head, that each changed component is reachable only behind a flag **and** has no data path. A Reviewer who cannot confirm
either raises the PR to M, which under §4.1 needs an allowlisted module and a test, and otherwise to H. When a flag
registry exists, its check belongs in the classifier (§10 item 4).

### 4.4 What it was measured against

Run read-only over the 29 first-parent merges on `origin/main` since 2026-10-05T12:00 (+07:00), each PR as
`<first parent>..<second parent>`: **24 H and 5 records** (#198, #199, #201, #205, #206, the same five RFC-2026-025 §6.5
measured), **0 M and 0 L**. The classifier as amended after the first review round gives the same 24 and 5 over the same 29
(closure note §3). That is the expected answer for a repository with no application paths: RFC-2026-030 changes nothing
for any PR that exists today. The command and the per-PR output of the first measurement are in
`evidence/WP-0A-DB-00/a0-batch-rfc-030-risk-tiered-review-plan-2026-10-08.md` §3. The M and L rules are proved only on
synthetic diffs in the test; their first real PR is their first real measurement.

### 4.5 What the classifier does not decide

The fail-closed parts are the allowlists: the module allowlist (§4.2 item 6), the L paths (§4.3), and L's imports (§4.2
item 10 (b)). Everything else -- the path words and stems, the line signals, the guard pattern for removed lines -- is a
denylist: it raises on what it names and misses what it does not, and an Author can phrase around it. The first review
round found such misses (C0 F2, F3; A1-2, A1-3; Q0 Q2, Q3, Q5; R0 R-1, R-3), and each is now pinned in the test; the next
will be found the same way and fixed under §5 item 3. That is why L's two conditions are the Reviewer's to confirm, M's
test is the Tester's to confirm, and §6 lets any unsure reader raise a PR to H.
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

## 7. The `CONTRIBUTING_AGENTS.md` passages it amends

Three passages of the guide require every role, or the Integration Owner, on every merge; all three are replaced (R0 R-5).
The rest of each paragraph is unchanged.

**(a) "Separation of duties"**, today:

> Every implementation package has distinct Author, Independent Reviewer, Independent Tester, and Integration Owner.

Proposed replacement, word for word:

> Every implementation package has distinct Author, Independent Reviewer, Independent Tester, and Integration Owner, and no
> role is ever held by the Author's run. How many of them read each pull request follows its risk tier under
> [`RFC-2026-030`](architecture/decisions/RFC-2026-030-risk-tiered-review.md), decided by the base's copy of
> `scripts/db/classify-review-tier.mjs` and never lowered by hand: tier H (migrations and RLS, auth, secrets and OAuth,
> publishing, billing, CI and gates, contracts, every module not on the reviewed module allowlist, and anything the
> classifier cannot place) is read by every role on every pull request; tier M by the Reviewer and the Tester, and tier L by
> one Reviewer with the Tester reading CI artifacts, each with the Integration Owner's verdict at the end of the work package
> and the merge pressed by a run that is not the Author's; records-only pull requests follow RFC-2026-025 §6. A
> stop-the-line or security finding raises any pull request to tier H.

**(b) "Verification and handoff"**, today:

> The Integration Owner verifies the final state and CI before merging.

Proposed replacement, word for word:

> The Integration Owner verifies the final state and CI before merging; for a tier M or L pull request under RFC-2026-030,
> the Integration Owner's verdict is given at the end of the work package instead (RFC-2026-030 §3.2), and the merge is
> pressed by a run that is not the Author's.

**(c) "Temporary manual merge control"**, today:

> - Before the Product Owner merges, the head commit must have a green required CI run and linked Author, independent
>   Reviewer, independent Tester, Security/Privacy (when required), and Integration Owner evidence.

Proposed replacement, word for word:

> - Before the Product Owner merges, the head commit must have a green required CI run and linked Author, independent
>   Reviewer, independent Tester, Security/Privacy (when required), and Integration Owner evidence; for a tier M or L pull
>   request under RFC-2026-030, the linked evidence is what RFC-2026-030 §3 names for its tier, and the Integration
>   Owner's verdict follows at the end of the work package (RFC-2026-030 §3.2).

`CONTRIBUTING_AGENTS.md` belongs to WP-0A-A0-001, so this PR does **not** edit it; the three edits are owed there (§10 item
1), as a governance PR of its own, after this RFC merges. **Until those edits merge, every PR is H**, because the canonical
guide still requires all four roles on every merge.
## 8. What does not change

- Separation of duties, the four distinct role IDs, and the role-separation validator.
- Everything H: every PR that exists today, every migration, contract, CI, gate, script and test-kit change.
- RFC-2026-025 §1-§6 except the one §6.4 bullet named in the header, for M and L only; RFC-2026-002 except the per-merge
  Integration Owner evidence for M and L; RFC-2026-024.
- Stop-the-line, the security rules of `CONTRIBUTING_AGENTS.md`, and the gates.
- Governance PRs merged by the Owner personally.

## 9. In effect

From the Owner's merge of this RFC, **and** only once these exist on `main`:

1. the three `CONTRIBUTING_AGENTS.md` edits of §7 (WP-0A-A0-001);
2. a CI step that runs the **base's copy** of the classifier (§4) and prints its tier on every PR (WP-0A-A0-004), so the tier
   is not only something a reader reports; and
3. for M, and for L inside a module: a governance PR that names the module in `M_ELIGIBLE_MODULES` (§4.2 item 6, A1-1).

Before 1 and 2, every PR is H. Before 3, every module path is H, so no PR is M, and L can only be a web-app path of §4.3.
With no application paths in the repository, the first M or L PR can only come after RFC-2026-029's layout lands.

The first round's preconditions A1-2 (secret, payment and OAuth identifiers matched on sub-words), A1-3 (L's import
allowlist, third-party URLs and the missing injection sinks) and A1-6 (removed lines read) are met by the classifier on this
PR and pinned in its test; they are not further conditions here. What stays a denylist is named in §4.5.

## 10. Owed if the Owner approves

1. **`CONTRIBUTING_AGENTS.md`** (WP-0A-A0-001): the three §7 replacements, word for word, and a citation of RFC-2026-025 §6
   in "Temporary manual merge control" (already owed there by RFC-2026-025 §6.6 item 3).
2. **CI** (WP-0A-A0-004, `.github/workflows/ci.yml`): a step that runs the base's copy of `classify-review-tier.mjs` (§4) on
   every PR and prints the tier, non-gating at first; together with RFC-2026-025 §6.6 item 1's records-only step, one step
   can print both.
3. **Playwright artifacts in CI** for L's Tester (§3.3), owned by whichever package lands the web app's test harness.
4. **A feature-flag registry** and its check in the classifier (§4.3), with the web app's layout (RFC-2026-029).
5. **The script's home.** It sits in `scripts/db/`, next to the records-only classifier, because WP-0A-DB-00 owns this RFC and
   that path. Moving both to a protocol path such as `scripts/` is a WP-0A-A0-001 or A0-002 change.
6. **Its digests.** The script is added to `test-kits/integrity-manifest.json` and to `DIGESTED_FLOOR` in
   `scripts/verify-test-coverage-floor.mjs` in this PR, declared as amendments of paths WP-0A-A0-002 owns; that owner's
   acknowledgement is owed on the merged head. The `DECISION_RECORDS` line in `test-kits/repository-json.test.mjs` is
   WP-0A-A0-001's, and its acknowledgement is owed by that package's Integration Owner (R0 R-8 c).
7. **The module allowlist** (A1-1): a governance PR to `scripts/db/classify-review-tier.mjs` (WP-0A-DB-00, which owns the
   classifier) naming each M-eligible module with a test per module class, after RFC-2026-029's layout lands.

## 11. Questions for the Owner, at merge

- **Q-030-1.** Approve this text as the final text: yes or no. A0 recommends yes.
- **Q-030-2.** R0's end-of-package verdict for M and L: is "at the latest every 10 merged M/L PRs or 7 days" (§3.2) the right
  cap? A0 recommends yes; without a cap, "the end of the work package" could be weeks of unread integration.
- **Q-030-3.** Should L stay closed to anything not behind a flag until a flag registry exists, with the Reviewer confirming
  in writing both the flag and that the change has no data path (§4.3)? A0 recommends yes.
- **Q-030-4.** The first review round showed the path-word list is a denylist and misses (R0 R-1, C0 F2, Q0 Q3, A1-1). This
  text answers with an **allowlist** of modules, empty until a governance PR names each (§4.2 item 6), and keeps the word
  list, widened with stems, as an extra raise that accepts false H results such as `design-tokens.css` or
  `AccountMenu.tsx`. Approve the allowlist plus the wide denylist? A0 recommends yes.
- **Q-030-5** (A1-5, R0 R-6). Who presses the merge of an M or L PR: (a) a run that is not the PR's Author, as §3.1 now says;
  or (b) the Author, on recorded Reviewer and Tester verdicts for the exact head, CI green and `--match-head-commit`, with
  §2 saying that pressing is not integration and §3.2's verdict named as the integration step. A0 recommends (a), as A1 does.
- **Q-030-6** (A1-6). An L file whose diff removes any line is not L (§4.2 item 10 (c)), so editing existing copy or an
  existing component is M inside an allowlisted module and H outside one; only additions are L. Accept? A0 recommends yes:
  removing a flag guard is the cheapest way around §4.3. A narrower rule, raising only on guard-shaped removed lines, can
  come later through §5 item 3.
## 12. Rollback

Before the merge: close the PR. After it: revert this RFC in a reviewed governance PR; every PR is H again at once, which is
where every PR in the repository is today. The classifier adds a script and a test and changes nothing that exists.
