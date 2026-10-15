# A1 round audit, 2026-10-15 (RFC-2026-034 §2.3, §8 item 1): `main` `8086281b`..`2aef8182`, PRs #252–#261

| | |
|---|---|
| Role | A1, independent Security/Privacy reviewer, `/claude/a1_bastion` |
| Range | `8086281b` (merge of #251, RFC-2026-034) exclusive to `2aef8182` (merge of #261) inclusive; first-parent merges #252–#261, fixed even if `main` moves |
| Reading | 2026-10-15T00:23:10Z to 00:36:56Z UTC (`date -u` at start and before writing), plus the writing of this file |
| Worktree | one, in my scratchpad, branch `a1/audit-2026-10-15` cut from `2aef8182`; no `node_modules` installed; removed at the end |
| Findings | **A1-AUD1015-1 (Low)**; A1-AUD1015-2 to -5 (Info) |
| Stop-the-line | **No** |
| Blocks a risk-lane or fast-lane move? | **No.** The one Low is against governance work (#257's CI), not against #253, #254 or #261 (§4) |

## 0. Who I am

`/claude/a1_bastion`, A1, a subagent spawned by the Author's run (`/claude/a0_atlas`), same vendor and model
(Anthropic, `claude-opus-5-5`) as A0, C0, Q0 and R0: a same-lineage review, disclosed as the Owner's disposition of
2026-10-09 (Q4) requires. I hold no Author, Reviewer, Tester, Integration Owner, Product Owner, merge or gate
authority. I fixed nothing, pushed nothing, merged nothing and wrote no other role's verdict. Every `gh` call was a
read. I wrote A1's per-PR files for #253–#261 in earlier runs; this audit re-measures rather than relies on them, and
says where it relies on them.

## 1. Per pull request: tier, lane, press, readers

Measured: the base's two classifiers (`git show <merge>^1:scripts/db/classify-{review-tier,records-only}.mjs` into a
scratch directory), run as CI runs them, `node <copy> <merge>^1 <merge>^2 --lane --head-ref=<branch>
--repo=ThinkBizLab-Org/ThinkBizThai --head-repo=ThinkBizLab-Org/ThinkBizThai`; the CI log of each PR's final head
(`gh run view <id> --log`); `git merge-base --is-ancestor <merge>^1 <merge>^2` (all ten: the head contained `main`);
the presser from the session transcripts (`gh pr merge <n>` as an A0 tool call, or the Owner's own run).

| PR | Base classifier (tier; lane) | CI printed (final head run) | Lane I hold | A0's reading | Pressed by, authority | Readers on the final head |
|---|---|---|---|---|---|---|
| #252 | records; no `--lane` in base (exit 2); records-only exit 0 | `RECORDS-ONLY` (run 38115911976); lane not printed | records | records — agree | A0, RFC-2026-025 §6 | C0 light-path reading (R0 is the subject); CI green |
| #253 | H (`amended_by: changed shape`); no `--lane`; with #255's classifier: risk | `NOT RECORDS-ONLY` (38117607761) | risk | risk — agree | A0, Q-034-1 | A1 and Q0 at `c2a2b499`; after it only the two role files, a mechanical sync (`--sync` exit 0) and the handoff alone: carried. CI green on `40d674d6` |
| #254 | H (`amended_by: entries added`); no `--lane`; with #255's: risk | `NOT RECORDS-ONLY` (38118860882) | risk | risk — agree | A0, Q-034-1 | A1 and Q0 at `6e4f92ee`; carried as #253 (sync exit 0). CI green on `7f9b4be1` |
| #255 | H (`.github/workflows`, RFC); base lacks `--lane` | `H (not classified), governance (not classified)` (38162633761), fail-closed as designed | governance | governance — agree | A0, Q-034-6 (i) (§8 item 2) | C0, A1, Q0, R0 fourth re-reads at `b3e430e0`, then role files and the handoff alone. CI green on `5a17e0a4` |
| #256 | H; governance | H, governance (38172695119) | governance | governance — agree | **the Owner personally** (transcript, session `c2816eec` 02:31:13Z: "run แล้ว", then the `MERGED` line), RFC-2026-025 §5 item 6 | four roles' re-reads at `a0a76a8b`, carried. CI green on `309a93c8` |
| #257 | H; governance | H, governance (38269234433), both jobs green | governance | governance — agree | A0, the Owner's directions of 2026-10-11 §3 (b) and 2026-10-12 (`A0 กดได้เมื่อ 4 role ผ่าน`), and the press answer 15:19:55Z given after the final head existed | four roles' fifth re-reads at `f23dbba2`, carried. CI green on `bef3249e` |
| #258 | H ("not records-only"); **governance** (the string-rule defect of RFC-2026-007 Amendment 2026-10-13 §A) | H, governance (38307173517) | **governance** | records — **disagree** (§2) | A0, the Owner's 20:28:22Z answer naming #258 (R0's `r0-review-2026-10-13-pr258.md` §5; R0-258-1) | four roles at `6362ba68`, carried. CI green on `f0bcb870` |
| #259 | H; governance (tool configuration) | H, governance (38539239403) | governance | governance — agree | A0, the Owner's 19:38:08Z direction (`product-owner-disposition-2026-10-13-package-tool-config-press.md`); the diff holds only its (a) 1–3 | four roles' re-reads at `9dc4e813`, carried. CI green on `f723662b` |
| #260 | H; governance (classifier, RFC, guard test) | H, governance (38552329070) | governance | governance — agree | A0, the Owner's 20:28:22Z answer, an exception to §5 item 6's last bullet recorded in RFC-2026-007 Amendment 2026-10-13 | four roles' re-reads at `3d588bf6`, carried. CI green on `fc60f82d` |
| #261 | H; **risk** | H, risk (38564806352) | risk | risk — agree | A0, Q-034-1 | A1 and Q0 (and C0, R0) re-reads at `90eb8a77`, carried. CI green on `1c34880d` |

CI on `main` (push runs) is green on every merge commit in range, `2aef8182` included (run `38567631406`, `bootstrap`
and `application` both `success`). Required checks on `main` today (read-only `gh api`): `bootstrap` and
`application`, `strict: true`, `enforce_admins: true`, force pushes and deletions off; the `application` check was added
after #257 by A0 under the Owner's §5.2 answer, and its before/after is recorded in
`evidence/WP-1A-A0-002/product-owner-disposition-2026-10-12-skeleton-licences.md` §8 (d).

**Press while a security finding was open: none found.** Every final A1 reading in range says "no security finding of
any grade open against this PR" on the head carried to the merge. Two Lows remain open on RFC-2026-029's text from
2026-10-07 (A1 N1, N2: the worker's dependency tree inside its credential's scope; two words of RFC-2026-028's first
condition), owed by `WP-1A-A6-001` and `WP-1A-A0-004`. I concur with the earlier readings that they were not open
against #256 (pressed by the Owner, so §5 item 6's any-grade bullet for delegated merges did not apply) or #257 (which
creates no worker and binds no credential). They stay open and must close before any worker is provisioned.

## 2. Lane notes

- **#258 is not a records PR.** Its base classifier prints governance; even without the string-rule defect it is tier
  H and not records-only (`classify-records-only.mjs` exit 1: three role files and an appended Owner disposition are
  "not a record file"). Its own PR body says governance, it was read by all four roles, and R0 recorded the press
  authority. So A0's grouping of #258 with the records PRs is a label, not a lane error that lowered any reading. Not
  a finding.
- **#253 and #254** predate CI's lane printing. RFC-2026-034 §8 item 2 makes every non-governance, non-records,
  non-audit PR risk until CI prints the tier; both touch only evidence, a handoff and a manifest, no governance path.
  Risk is right.
- **#261's lane holds.** I probed the classifier at `2aef8182` with synthetic one-file commits on top of `2aef8182`
  (`git commit-tree`, nothing pushed): an edit of `application/tenant-context.ts`, of a platform-kernel test, a new
  unnamed `adapters/*.ts`, a new `apps/web` component and a new `src/modules/content/ui` file each print `tier: H`,
  `lane: risk`; creating `src/modules/platform-kernel/index.ts` or editing `vitest.config.ts` prints governance.
  Nothing in the tree can reach the fast lane yet (`M_ELIGIBLE_MODULES` names no module), so tenancy code cannot drop
  below the risk lane.

## 3. Security posture of the cumulative diff

**Tenant isolation, `src/modules/platform-kernel` (#261), read in full at `2aef8182`.** The resolver derives the actor
only from the principal port and refuses any client key but the three scope keys; it reads the selection's own
properties once each, under `try`; every non-admitted scope (absent, another tenant's, malformed id) gives the one
`tenant.scope.denied` definition; every port failure gives `platform.temporary` with nothing copied; contexts are
frozen and recognised only through a module-private `WeakSet`, so a cast, spread or JSON round trip does not make one;
the envelope builders refuse any other object and re-check CTR-API-001 before returning. No I/O, clock, randomness,
`any`, `@ts-ignore`, `process`, `globalThis` or dynamic import in the non-test files. I found no cross-tenant path. Four
Info notes in §4 are for the adapters and the runner, not defects of this code.

**The classifier's exception list (#260).** `STRING_NAME_EXCEPTIONS` (48 pairs, frozen) excuses only exact
`[namer, named]` mentions in the string rule. I listed the namers and grepped each for `spawn`, `exec`, `fork`,
`Worker`, `require(`, `import(` and `--import`: the only process a namer starts on a named file is
`scripts/verify-typecheck-control.mjs` handing `mistyped.ts` to `tsc` (compiles, runs nothing); the others read the
files as text or data. The three platform-kernel pairs whose files do not exist excuse nothing until a file appears,
and then the file itself is governance (probe above). No self-lowering found.

**CI and guards (#255, #257, #259, #260).** `permissions: contents: read`; no `pull_request_target`; every action
pinned by SHA; every `${{ }}` expression sits in `env:` or `with:`, none inside a `run:` script; both classifier steps
run the base's copies before `npm ci`. The bootstrap job runs no dependency code before its database guards (`npm ci
--ignore-scripts --no-bin-links`, A1-257-4 and -6 closed by the separate `application` job). One ordering gap remains
inside the `application` job: A1-AUD1015-1.

**Secrets and personal data.** `node scripts/scan-repository-secrets.mjs` at `2aef8182`: exit 0. Over every added line
of `git diff 8086281b 2aef8182`: no e-mail address but `git@github.com`; URL hosts only GitHub, the npm registry,
funding links in the lockfile and reserved example domains; the only key-shaped strings are guard rule names
(`SUPABASE_SERVICE_ROLE_KEY` as a refused name) and lockfile `sha512` integrities. One home-directory path
(`/Users/bank/...`) in a Q0 evidence file, as earlier evidence on `main` already has: not a secret.

**Dependencies and licences (#257).** `node scripts/verify-app-dependencies.mjs` at `2aef8182`: exit 0 (172 registry
tarballs with sha512, 6 bundled, licences accepted). My own count of `package-lock.json`: 179 entries, every
`resolved` on `https://registry.npmjs.org/` with `sha512`; licences MIT 95, Apache-2.0 38, MPL-2.0 24 (`lightningcss`
and its platform binaries), LGPL-3.0-or-later 10 (`@img/sharp-libvips-*`), `Apache-2.0 AND LGPL-3.0-or-later` 3 and
`… AND MIT` 1 (`@img/sharp-*`), ISC 3, 0BSD 2, BSD-3-Clause 1, CC-BY-4.0 1 (`caniuse-lite`): exactly the Owner's
2026-10-12 acceptance (§2.1 of the skeleton-licences disposition) and §3.4/2's list. One entry declares an install
script, `fsevents` (macOS-only, optional), already recorded at #257; CI installs with `--ignore-scripts`. No `.npmrc`
in the repository, so a local `npm ci` without `--ignore-scripts` would run it; recorded at #257, not new.

## 4. Findings

### A1-AUD1015-1 (Low): in the `application` job, the dependency guards run after dependency code

`.github/workflows/ci.yml` at `2aef8182`, job `application`, step order (read): `npm ci --ignore-scripts` →
`verify-app-dependencies` → boundaries → `npm run typecheck` (`tsc` from the `typescript` package) → typecheck
control → `npm run test:app` (`vitest`, `vite`, `rolldown`) → boundaries again → `next build` (SWC, `lightningcss`,
Tailwind's oxide) → build graph → **`npm audit --omit=dev --audit-level=high`** → **`node
scripts/verify-release-age.mjs "$BASE_SHA"`**.

The audit and the release-age check are the two checks that would report a compromised or freshly published package,
and they run last, after every step that executes installed package code with write access to the runner (the
parsed boundary guard loads `typescript`; then `tsc`, the typecheck control's `tsc`, `vitest` and `next build`). Any of those
packages can append a directory to `$GITHUB_PATH` (GitHub prepends it to `PATH` for every later step of the job) or
edit the checkout, and so make `npm` and `node` in the last two steps a shim that exits 0. That is the reason
RFC-2026-029 §2.1/4 gives for keeping application tooling out of `npm run check` ("a broken or compromised dependency
install must not be able to disable the governance guards, which are what would report it"), and the reason A1-257-4
moved the application steps out of the bootstrap job; inside the `application` job it is not yet applied to these two
guards. It is not the residual the Owner accepted on 2026-10-12 (§8 (a) of the skeleton-licences disposition), which
is about code *the repository itself* runs after the guard; this is code *a dependency* runs before the guard that
would report it.

Not exploited: nothing in range adds a package after #257, whose 172 entries were measured clean by A1 and Q0 outside
CI. Mitigated today by the four-role reading of any lockfile change (a governance path). **Fix (governance PR, owner
of `ci.yml` WP-0A-A0-004 with WP-1A-A0-002's step):** run `npm audit` and `verify-release-age` immediately after
`npm ci --ignore-scripts` and before any step that executes package code (neither needs a build), and pin that order in
`test-kits/app-stack.test.mjs` as the existing order assertions are pinned. This finding is against governance work
already fully read (#257); it does **not** attach to the risk-lane PRs #253, #254 or #261 and blocks none of their
moves.

### A1-AUD1015-2 (Info): membership in the fake directory ignores the actor's kind

`application/fakes.ts`, `tableTenantAccessDirectory`: a member row matches on `row.actor_id === principal.id` alone,
so a `system_actor` and a `user` with the same id string are the same member (read, not run). `ports.ts` does not say
that `TenantAccessDirectory.admits` must key on both `kind` and `id`. The resolver passes both, so nothing is wrong in
PR-1; the real directory adapter (provider-bound increment) must key membership on the pair, and the port's comment
should say so. For the adapter's readers, with A1-261-N2 and -N4.

### A1-AUD1015-3 (Info): the scope handed to the directory is not frozen

`application/tenant-context.ts`, `resolveTenantContext`: `read.scope` is passed by reference to
`directory.admits(actor, read.scope)` and, after the `await`, spread into the minted record. A directory adapter that
normalises ids in place (for example, lower-casing) would change the context after admitting the original; the record
still passes `checkTenantContext`. The directory is a trusted port, so this needs a second fault. Cheap: freeze the
scope (as `actorOf` freezes the actor) before the call.

### A1-AUD1015-4 (Info): idempotency replay is per workspace and operation, not per actor

`domain/idempotency.ts`, `idempotencyOutcome`: as CTR-IDM-001's scope says, the same key, workspace, operation and
payload hash replays the stored record, whoever presents it. Within a workspace, a second member presenting another
member's key and identical payload receives the first command's `result_ref`. Contract-conformant and not
cross-tenant; the runner PR (with CTR-IDM-001's owner) should decide whether replay must also match the actor, or
whether `result_ref` reads re-check access, and record it.

### A1-AUD1015-5 (Info): A1's own branches for #253–#258 are gone

For #259, #260 and #261 every A1 file on `main` is blob-equal to its file on my kept branch
(`a1/WP-1A-A0-003-pr259*`, `a1/WP-0A-A0-004-pr260*`, `a1/WP-1A-A0-003-pr261*`; six files compared with `git
rev-parse`). The branches for #253–#258 no longer exist, so their carried A1 files cannot be checked against A1's own
commits now. Nothing requires PR role branches to be kept (Q-034-5 asks it of audit files only); noted so the next
audit does not look for them.

### Carried, unchanged (open advisories and Lows, not raised again)

A1 N1, N2 (Low, RFC-2026-029 text, §1); A1-259-N1 (`verify-branch-scope` ignores `forbidden_paths`) and A1-259-N3 (no
guard refuses I/O in non-test platform-kernel code), held by review; A1-261-N1 (foreign errors through
`errorEnvelope`), -N2 (directory timing), -N3 (`data` by reference), -N4 (`actorOf` reads `kind`/`id` through the
prototype chain; still so at `2aef8182`), -N5 (dropped port failures unlogged). Each is for the adapters, the runner
or the provider-bound increment; none is a finding against a merged PR.

## 5. Verdict

**Findings:** one Low (A1-AUD1015-1, CI guard order in the `application` job), four Info. **Stop-the-line: no.** No
tenant leakage, secret exposure, unreviewed dependency or licence outside the Owner's acceptance was found in the
cumulative diff. Every press in range was made by the authority its lane names, on a head that contained `main`, with
green required CI and no security finding of any grade open against it. For the risk-lane PRs (#253, #254, #261) A1
has no open finding, so A1 blocks none of their packages' moves past `in_review`; WP-1A-A0-003 stays held by its own
last acceptance criterion, which is R0's to read. I agree with A0's lane reading for nine of the ten PRs and differ only
on #258's label (§2).

This file is A1's only output: no other role's verdict, no manifest status, no fix.
