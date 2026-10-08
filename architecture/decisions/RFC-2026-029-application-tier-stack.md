# RFC-2026-029 — The application tier's stack: Next.js and TypeScript checked by `tsc`, the dependency allowlist, and where the code goes

Status: **In review** — drafted 2026-10-08 by `/claude/a0_atlas` (A0) under `WP-1A-A0-001`. The decisions it writes down (D1–D6, D9, D11 and D12 of A0's G1/G2 plan) were accepted by the Owner on 2026-10-08 in chat, verbatim `รับตามแนะนำทั้งหมด รวม RFC-030 ด้วย ลุยเลย` ("accept all as recommended, including RFC-030, go"), transcribed with its limits in `evidence/WP-1A-A0-001/product-owner-decision-2026-10-08-g1-plan.md`. Those words accepted recommendations; they did not approve this text, which did not exist yet. This RFC decides dependencies, the lockfile and the application tier's language, so it is a governance change: under `RFC-2026-025` §5 item 6 the Owner merges it personally, and that merge is its approval. **Not in effect until merged.** Nothing in this document installs a package, adds a lockfile entry, creates `apps/` or `src/`, changes CI, or provisions a provider.
Date: 2026-10-08
Author: `/claude/a0_atlas` (A0 Architecture/Integration; owner of root config, lockfile and composition root under the register's §4.3); drafted by a subagent of that run
Reviewer sought: `/claude/c0_contract_reviewer` (review), `/claude/a1_bastion` (Security: the request path, the worker credential, the service-role exclusion and the dependency supply chain), `/claude/q0_sentinel` (test), `/claude/r0_steward` (Integration Owner: CI and the lockfile)
Answers: the remaining half of `OPEN-018` (`docs/sprint-0a/sprint-0a-decision-register-contract-catalog-th.md:127`, "TypeScript/Node/Next.js assumption ห้าม lockfile จนประกาศ" — no lockfile until announced); `RFC-2026-011`'s deferral ("The application tier's language is NOT decided here … decided with the stack at G1"); the condition in `CONTRIBUTING_AGENTS.md` § Verification and handoff that no dependency is introduced "without a new approved RFC"
Depends on: `RFC-2026-001` (approved; Node `24.20.0`, npm `11.19.0`, `npm ci --ignore-scripts`), `RFC-2026-011` (approved; the tooling tier is JavaScript ESM), `RFC-2026-012` (approved; server-only mutation, Realtime unresolved at its §Limitations), `RFC-2026-017` (approved; `service_role` reserved for migration and platform administration), `RFC-2026-019` (approved; the request path is `authenticated`, command functions are owned by `app_command`), `RFC-2026-021` (approved; the client read allowlist starts empty), `RFC-2026-028` (approved; the worker's login role), `RFC-2026-025` (approved; who merges governance)
Does not answer: D0 (how G0 exits; `WP-0A-A0-010`), D7 (where Meta tokens are stored), D8 (email provider), D10 (storage provider), D13/D14 (package naming, legal entity and domain). Each is named in §11 so that silence here is not read as a decision.

---

## 1. What is open

The repository has a tooling tier and no application tier. The tooling tier is decided: Node `24.20.0`,
npm `11.19.0`, JavaScript ESM, the standard library only, no dependency (`RFC-2026-001`, `RFC-2026-011`).
`package-lock.json` lists the root package and nothing else.

Everything the application tier will be built from is still a **proposal**: the architecture document
calls its stack "Recommended" (`docs/plans/technical-architecture-meta-content-os-th.md:185-212`), and the
register's `OPEN-018` keeps the TypeScript/Node/Next.js assumption with the stop condition that no
lockfile exists until the choice is announced. `RFC-2026-011` said what the announcement must contain:
TypeScript is the expected answer only with real `tsc` checking, and that "requires accepting a
dependency and a lockfile, so it is its own decision at its own gate".

G1's first code package (`WP-1A-A0-002`, the empty skeleton) cannot start without this decision, because
installing the first package is exactly the act `RFC-2026-001` and `CONTRIBUTING_AGENTS.md` withhold.

## 2. The decisions

Each row is the Owner-accepted recommendation of the G1/G2 plan, stated as a rule a build or a reviewer can
check. Where the plan marked a point as A0's inference, the row says so.

### 2.1 Language and checking (D1)

1. The application tier is **TypeScript**, compiled by Next.js and **type-checked by `tsc --noEmit`** as a
   required CI step. A type error fails the build. Next.js's own build-time check does not replace the step,
   because a build can be configured to ignore type errors and the step cannot.
2. `tsconfig` for application code sets `"strict": true`, `"noUncheckedIndexedAccess": true`,
   `"noImplicitOverride": true`, `"noFallthroughCasesInSwitch": true`, `"isolatedModules": true` and
   `"allowJs": false`. `"skipLibCheck": true` is allowed: it skips checking third-party declaration files,
   not ours. Turning any of the listed flags off is a change to this RFC.
3. `@ts-ignore` is not used. `@ts-expect-error` is allowed only with a reason on the same line. `any` is a
   lint error in application code.
4. **The tooling tier is unchanged.** `scripts/`, `test-kits/` and the DB harness stay JavaScript ESM on the
   standard library (`RFC-2026-011`) and must keep running with no `node_modules` present. `npm run check`
   stays the dependency-free, offline tooling check it is today; the application checks (`tsc`, lint, unit
   tests, build) run as their own CI steps. The reason is containment: a broken or compromised dependency
   install must not be able to disable the governance guards, which are what would report it.

### 2.2 Framework (D1)

**Next.js with the App Router**, React, and route handlers on the **Node.js runtime** (not the Edge
runtime), because the worker path needs a Postgres driver (§2.7) and one runtime is simpler to secure than
two. Server Components and Server Actions are the default place for data access; client components hold
presentation state only.

### 2.3 UI (D12)

**Tailwind CSS with shadcn/ui.** shadcn/ui is not a package: its components are copied into the repository
as source, reviewed as source, and owned by A5 (MOD-900). Its CLI is not a dependency and never runs in CI.
The packages its components import are on the allowlist in §3. The Thai typeface is A5's proposal under
DS-002 (tone marks must not collide); this RFC does not choose it **[A0's inference in the plan]**.

### 2.4 Hosting (D2)

**Vercel, function region `sin1`** (Singapore), pinned in the repository's Vercel configuration rather than
left to a dashboard default. **No Preview deployment holds a credential for any Supabase project**: the
architecture document's "Vercel Preview ห้ามต่อ Production database" (`technical-architecture-…-th.md:941`)
is tightened to every environment's database in G1, because a Preview built from an unreviewed branch with a
staging credential is a route from unreviewed code to a shared database. Previews run on fake adapters and
synthetic data (§2.5). The plan's note stands that function duration must be measured against the worker's
work before D6 is relied on for long jobs.

### 2.5 Environments and Supabase (D3)

Two Supabase projects, **`staging` and `prod`, both in `ap-southeast-1`** **[A0's inference in the plan]**.
One application deployment per environment (`technical-architecture-…-th.md:994`). Supabase branching is not
enabled in G1, to hold cost. Local development and CI keep using the Postgres container with
`db/foundation/ci/supabase-shim.sql` as CI does today; a green run there still means "the policies still do
what they did", never "this works on Supabase" (the comment at the top of `.github/workflows/ci.yml`).
Accounts, projects and credentials are the Owner's to open; no agent creates them.

### 2.6 Sign-in (D4)

**Supabase Auth with Email OTP first.** Google sign-in is P1. LINE Login is not planned: no document asks
for it. The OTP request and verification run on the server (§2.7). Production email needs a real sender
(D8), which this RFC does not choose.

### 2.7 The data path (D5)

This closes, for the application tier, the choice recorded in `work-packages/WP-0A-DB-00.json`
`required_human_authorities` ("supabase-js with the service-role key, or a direct driver with per-request
SET LOCAL role"). The first half of that choice is refused.

1. **The request path uses the signed-in user's JWT.** Server code creates a Supabase client per request
   with the project's public (anon) key and the user's session from cookies (`@supabase/ssr`). The database
   therefore sees `authenticated`, and RLS decides what it reads. **Every mutation calls a command function**
   (`SECURITY DEFINER`, owned by `app_command`, `RFC-2026-019` §4/2); no table is written directly
   (`RFC-2026-012`). The browser holds no Supabase data client in G1/G2: it does not query PostgREST, so the
   read allowlist of `RFC-2026-021`, which starts empty, stays empty until an entry is approved there.
2. **The service-role key is never on the request path or the worker path.** It is not set in any Vercel
   environment, is not read by any file under `apps/` or `src/`, and is used only by the migration and
   administration path `RFC-2026-017` reserves it for, operated through the DATA-DEC-02 wrapper
   (`RFC-2026-015`) by its custodian (`WP-1A-A6-001`). `service_role` bypasses RLS; a request path that held
   it would make every policy in `db/foundation/migrations/` decorative.
3. **The worker uses `RFC-2026-028`'s login role.** The dispatcher (§2.8) connects with a Postgres driver
   (`pg`) as `app_worker_login`, issues `SET LOCAL ROLE app_worker` in every job transaction, and carries the
   session and start-of-transaction checks `RFC-2026-028` records as A1R-2. It connects directly or through
   a session-mode pooler until Q-028-12 (the platform pooler with a custom login role) is measured; the
   transaction-mode pooler is not used before then. The worker's credential exists only in the staging and
   production environments.

### 2.8 Jobs (D6)

**`app.jobs` is the queue**, with `app.outbox_events` and the consumer ledger (`050_async_kernel.sql`), as
built. Supabase Queues (pgmq) is not added in G1/G2 **[A0's inference in the plan]**: a second queue beside a
built and tested one is two sources of truth for "what is pending". A **once-a-minute Cron** calls a
dispatcher route handler, which authenticates the caller with a dedicated secret and nothing else, claims
jobs under a lease, and stops within a time budget below the function's maximum duration. Which Cron fires it
is Q-029-2. Moving workers out of Vercel is considered only when media or AI jobs outgrow the budget.

### 2.9 Status updates (D11)

**Polling, not Realtime.** Job and notification status reach the UI by polling server endpoints with
back-off. No `postgres_changes` subscription is opened until an RFC answers the question `RFC-2026-012`
recorded as unresolved (whether a subscription reads the base table under base-table RLS).

### 2.10 Errors (D9)

**Sentry** (`@sentry/nextjs`) with **`sendDefaultPii: false`**, server-side scrubbing before send (no request
bodies, cookies, authorization headers, query strings, e-mail addresses or IP addresses), and no Session
Replay. Sentry's entry in the subprocessor map (PRV-001) and where it stores data are owed before production
customer data; A0 has not measured which storage regions Sentry offers and states none here.

## 3. The dependency allowlist

This section is the approval `CONTRIBUTING_AGENTS.md` requires for each package it names. **A direct
dependency is allowed only if its exact name is in this table**, in the column it is listed under.
Transitive dependencies are not listed one by one; they are governed by §4.

### 3.1 Runtime (`dependencies`)

| Package | Why | Decision | Where it may be imported |
|---|---|---|---|
| `next` | framework | D1 | `apps/web` |
| `react` | framework | D1 | `apps/web`, presentation code |
| `react-dom` | framework | D1 | `apps/web` |
| `@supabase/supabase-js` | request-path client under the user's JWT | D3, D5 | module `adapters/` and `apps/web` server code only |
| `@supabase/ssr` | cookie session for the App Router | D4, D5 | `apps/web` server code only |
| `pg` | worker driver as `app_worker_login` | D5, D6 | the worker's adapter only |
| `zod` | validation at the API and form boundary (`technical-architecture-…-th.md:192`) | D1 | anywhere |
| `next-intl` | Thai message catalog (`technical-architecture-…-th.md:191`) | D12 | `apps/web` |
| `@sentry/nextjs` | error tracking | D9 | `apps/web` instrumentation only |
| `radix-ui` | primitives shadcn/ui components import | D12 | `apps/web` components |
| `class-variance-authority` | shadcn/ui variant helper | D12 | `apps/web` components |
| `clsx` | shadcn/ui class helper | D12 | `apps/web` components |
| `tailwind-merge` | shadcn/ui class helper | D12 | `apps/web` components |
| `lucide-react` | icons shadcn/ui components import | D12 | `apps/web` components |

### 3.2 Development (`devDependencies`)

| Package | Why | Decision |
|---|---|---|
| `typescript` | `tsc --noEmit` | D1 |
| `@types/node` | types | D1 |
| `@types/react` | types | D1 |
| `@types/react-dom` | types | D1 |
| `@types/pg` | types | D5 |
| `tailwindcss` | CSS build | D12 |
| `@tailwindcss/postcss` | Tailwind's PostCSS plugin | D12 |
| `postcss` | CSS build | D12 |
| `eslint` | lint, including the module-boundary rules (§6.3) with its core `no-restricted-imports` | D1 |
| `eslint-config-next` | Next.js and TypeScript lint rules | D1 |
| `vitest` | unit and integration tests (`technical-architecture-…-th.md:211`) | D1 |
| `@playwright/test` | end-to-end and mobile matrix (`WP-1A-Q0-001`) | D1 |
| `@axe-core/playwright` | accessibility baseline, WCAG 2.2 AA | D1 |

### 3.3 Named and refused, so a later reader sees they were considered

| Package | Why not |
|---|---|
| `shadcn` (the CLI) | generates source; components are copied and reviewed as source (§2.3) |
| `supabase` (the CLI) | `db/foundation/migrations/` is the only migration source (§6.4); the DATA-DEC-02 wrapper applies it |
| Prisma, Drizzle, Kysely or any ORM or query builder | a second schema description beside the migrations; the database's command functions are the write API |
| pgmq clients, Supabase Queues | D6 (§2.8) |
| a second package manager or its lockfile | `RFC-2026-001`; the test-integrity guard already fails on its configuration files (exit 90) |
| Vercel AI SDK, AI Gateway clients, Uppy/TUS, `pgvector` helpers | belong to later gates (W3–W6); each is added by its own amendment when its package needs it |

### 3.4 How a package is added

1. A direct dependency not in §3.1 or §3.2 is added **only by an approved RFC**: a new RFC, or a dated
   amendment section appended to this one. Either is a governance change the Owner merges personally
   (`RFC-2026-025` §5 item 6). The request states: the exact name; what it is for and why the standard
   library or an allowlisted package does not do it; which tier and module import it; its licence; whether it
   runs an install script; how many packages it adds to the lockfile; whether it sends anything off the
   machine at build or run time; and how it would be removed.
2. **Licences** accepted without further discussion: MIT, ISC, BSD-2-Clause, BSD-3-Clause, Apache-2.0, 0BSD.
   Anything else, including any copyleft licence, is named in the request and decided there.
3. A package that must run an **install script** to work is refused unless the request names the script and
   why `--ignore-scripts` cannot be kept (§4.4).
4. A package whose `engines` excludes Node `24.20.0` is refused.
5. A1 reviews any request for a package that handles authentication, cryptography, secrets, network calls to
   a provider, or user content.
6. **Version changes of an allowlisted name are not new dependencies.** They go through an ordinary pull
   request that touches the root config (A0-owned): a patch or minor change with the lockfile diff reviewed;
   a major change with the reviewer also reading the changelog. A version change never adds a direct
   dependency. Removing a dependency is an ordinary pull request.
7. **Moving a name between §3.1 and §3.2**, or widening "where it may be imported", is an amendment.

## 4. Lockfile and install policy

1. **One lockfile**: `package-lock.json` at the repository root, `lockfileVersion` 3, written only by npm
   `11.19.0`. `apps/web` is an npm workspace of the root package and has no lockfile of its own.
2. **Exact versions** in every `package.json`: no `^`, `~`, `*`, ranges, tags or `latest`. The installing
   package may add an `.npmrc` with `save-exact=true`, `ignore-scripts=true` and `engine-strict=true` and
   nothing else. Today any `.npmrc` fails the test-integrity guard with exit 90
   (`scripts/verify-test-coverage-floor.mjs`, `PACKAGE_MANAGER_CONFIG`), because one line in it
   (`script-shell=`) silences every `npm run`. The guard's own message names the way in: digest the file
   and add it to `DIGESTED_FLOOR` in the same commit. The installing package does that and also makes the
   guard reject any key outside those three; if it does not, the three settings are passed on the command
   line instead and no `.npmrc` exists.
3. **Registry only.** Every resolved entry comes from `https://registry.npmjs.org/` with a `sha512`
   integrity. No `git:`, `github:`, `file:`, `http:` or tarball-URL dependency, other than the workspace link.
4. **Install scripts never run.** CI installs with `npm ci --ignore-scripts`, exactly as
   `.github/workflows/ci.yml` does today ("Clean install"). CI never runs `npm install`; a lockfile that
   `npm ci` would have to change fails the run. Downloading Playwright's browsers is an explicit CI step of
   its own, added by `WP-1A-Q0-001`, not an install script.
5. **A lockfile change travels with its reason.** A pull request changes `package-lock.json` only together
   with the `package.json` change that requires it, or as a declared refresh whose description says so. The
   reviewer reads the list of packages added and removed, not only the direct ones.
6. **Vulnerability audit.** `npm audit` needs the network, so it is not part of `npm run check`. A separate
   CI step running `npm audit --omit=dev --audit-level=high` is proposed for `WP-1A-A0-002` and is a CI
   change, therefore governance.
7. **Framework telemetry is off** in CI (`NEXT_TELEMETRY_DISABLED=1`).

## 5. Toolchain, kept

Node `24.20.0` and npm `11.19.0` stay exactly as `RFC-2026-001` pins them, in `.node-version`,
`package.json` `engines` and `packageManager`, the CI setup step and `scripts/toolchain-contract.mjs`.
Nothing in this RFC changes any of them, and `test-kits/repository-json.test.mjs`'s toolchain assertion is
unaffected.

## 6. Repository layout

### 6.1 Directories

```
apps/web/                      Next.js App Router (MOD-900 product-web, owner A5)
  app/                         routes, layouts and route handlers, including the job dispatcher
  …                            the composition root, where modules are wired: A0-owned files
src/modules/<module-key>/      one directory per module key in the register's §4.2
  domain/                      pure TypeScript; no provider SDK (DEC-022)
  application/                 commands, queries and ports
  adapters/                    the only place a provider SDK is imported
  index.ts                     the module's public surface
spikes/<work-package-id>/      code that may not be imported by apps/ or src/ (§7)
db/foundation/migrations/      unchanged: the only migration source
contract-catalog/              unchanged
scripts/, test-kits/, tests/   unchanged tooling tier and DB tests; end-to-end tests are added under tests/e2e/
```

The module keys are the register's (`sprint-0a-decision-register-contract-catalog-th.md` §4.2):
`platform-kernel`, `identity-workspace`, `business-channel-context`, `industry-pack`, `business-knowledge`,
`research-suggestion`, `ai-router`, `content-quality`, `asset-media`, `approval-calendar`,
`notification-view`, `meta-connection`, `publishing-metrics`, `usage-billing-entitlement`,
`audit-observability-ops`. `product-web` is `apps/web`. A directory is created when its module's first code
lands, not ahead of time.

### 6.2 Ownership

`src/modules/<key>/` belongs to that module's owner in §4.2. `apps/web` belongs to A5, except the
composition-root files, which are A0's. The root `package.json`, `package-lock.json`, `.npmrc`, `tsconfig`
bases, lint configuration, Next.js and Vercel configuration and CI are A0-owned (A0+A6 for CI and deploy),
as the register's §4.3 already says.

### 6.3 Boundaries a build checks

1. A module imports another module only through that module's `index.ts`.
2. Nothing under `domain/` imports a provider SDK, Next.js, React or anything under `adapters/` (DEC-022).
3. Nothing under `apps/` or `src/` imports from `spikes/`.
4. Only allowlisted packages are imported, from the places §3.1 allows.

### 6.4 One migration source

`db/foundation/migrations/` remains the **single** source of schema. There is no `supabase/migrations/`
directory, no copy of a migration anywhere else, and no Supabase CLI `db push` against staging or production;
staging and production are migrated by the DATA-DEC-02 wrapper (`WP-1A-A1-001`). If a `supabase/` directory
is ever needed for local configuration, it holds no migrations, and a guard asserts so.

## 7. What stays a spike until its contracts freeze

The register is explicit about when implementation may be written against a contract: "Frozen v1 |
compatibility/security review + fixtures ผ่าน G0 | เขียน implementation ได้" — only a Frozen v1 contract may
be implemented (`sprint-0a-decision-register-contract-catalog-th.md:190`). On `main` today no shared-kernel
contract is Frozen (`contract-catalog/shared-kernel/index.json`), and `CONTRIBUTING_AGENTS.md` § Current gate
constraint limits work before G0 to spikes, prototypes, fixtures, fake adapters, contract tests and
reversible foundation.

So: **code that implements a contract enters `src/modules/` or `apps/` only when every contract it implements
or consumes is Frozen v1 in the catalog.** Until then it may exist on its branch, under
`spikes/<work-package-id>/` (never imported, §6.3), or as fakes, fixtures and contract tests.

| Package | Contracts it needs | Until they are Frozen v1 |
|---|---|---|
| `WP-1A-A0-002` skeleton, boundary lint, CI | none (CTR-MOD-001 is read as a registry, not implemented) | may land once this RFC is merged: an empty, reversible skeleton |
| `WP-1A-A5-002` design tokens and components | none | may land: no data path |
| `WP-1A-Q0-001` test foundation | PRT-BAS-001 (Draft) | fakes and contract tests only |
| `WP-1A-A0-003` tenant context and API envelope | CTR-TEN/API/ERR/IDM | spike |
| `WP-1A-A0-004` job worker and outbox relay | CTR-JOB-001, CTR-EVT-001 | spike |
| `WP-1A-A5-001` notification store | CTR-NTF-001 (Draft) | spike |
| `WP-1A-A6-002` observability | CTR-OBS-001, CTR-FLG-001, CTR-MOD-001 | spike |
| `WP-1A-A5-003` app shell | CTR-ERR-001, CTR-API-001 | the data-bound parts are a spike |

Provisioning (Supabase projects, Vercel, credentials: `WP-1A-A6-001`, `WP-1A-A1-001`) binds a provider and
waits for the G0 exit record (D0, `WP-0A-A0-010`), not for this RFC.

## 8. What a build must check once code exists

These are acceptance conditions for `WP-1A-A0-002`, the package that installs the first dependency. Until
they exist, this RFC is a rule held by review alone, and it says so.

1. A guard compares every `package.json`'s direct dependencies against a machine-readable copy of §3.1 and
   §3.2, and a test fails if that copy and §3's tables disagree.
2. Every version in every `package.json` is exact; every resolved lockfile entry is from the npm registry with
   a `sha512` integrity.
3. `tsc --noEmit` runs in CI with the §2.1 flags, and a negative control (a deliberately mistyped fixture)
   shows the step fails.
4. The §6.3 boundaries are lint errors, each with a negative control.
5. No path `supabase/migrations/**` exists; no file under `apps/` or `src/` names the service-role key or the
   `service_role` role.
6. `npm run check` still runs, and still passes, with no `node_modules` directory present.

## 9. What it costs

- **Supply chain.** Next.js alone brings in a large transitive tree; this repository has had none. §4
  narrows the risk (no install scripts, registry only, exact pins, lockfile review); it does not remove it.
- **Vendor concentration.** Hosting, database, auth and (by D7's recommendation) secrets sit with two
  vendors. The ports of DEC-017/DEC-022 keep the domain free of them; the deployment is not.
- **Sentry is a subprocessor** outside the data-location choice made for the database, until PRV-001 says
  otherwise.
- **Polling** costs requests that Realtime would not, accepted until `RFC-2026-012`'s question is answered.
- **Cron and function limits.** Minute granularity and the function's maximum duration bound the worker
  (plan §8); D6 is a G1/G2 answer, not a permanent one.
- **`--ignore-scripts` may break a package** that relies on an install script (native image or bundler
  binaries). `WP-1A-A0-002` measures it on a clean clone; a failure is answered by §3.4 item 3, not by
  dropping the flag.

## 10. Questions, with A0's recommendation

- **Q-029-1** How `apps/web` compiles `src/modules/` outside its own directory. *Recommendation:* TypeScript
  path aliases (`@modules/<key>`) with the Next.js project root set to the repository root, measured by
  `WP-1A-A0-002` on a clean clone; making each module its own workspace package is the fallback.
- **Q-029-2** Which Cron fires the dispatcher. *Recommendation:* Vercel Cron in the same deployment, so its
  secret lives in one place; Supabase Cron would need the secret stored in the database. Decided by
  `WP-1A-A0-004`.
- **Q-029-3** How staging is deployed (a Vercel custom environment or a protected branch deployment).
  Decided by `WP-1A-A6-001`.
- **Q-029-4** Sentry's data location and source-map upload (which needs a CI token, a secret). Decided by
  `WP-1A-A6-002` with PRV-001.
- **Q-029-5** Whether `next-intl` is installed by the skeleton or by the shell. *Recommendation:* the shell
  (`WP-1A-A5-003`), since the skeleton shows no text.

## 11. What this does not decide

D0 (G0 exit and whether `OPEN-018` is marked closed in the register: `WP-0A-A0-010`, which owns that
document's edit), D7 (secret store for Meta tokens), D8 (email provider and sender domain), D10 (storage
provider), D13 (work-package naming) and D14 (legal entity, domain, e-mail). The text of
`WP-0A-DB-00.required_human_authorities` that still offers the service-role key is that package's record to
close; §2.7 is what it should cite.

## 12. Rollback

Revert the merge commit through a reviewed revert pull request. Before `WP-1A-A0-002` lands, reverting
removes a decision and changes no file anything runs. After it lands, the skeleton's installation is
reverted with it, in the same revert or first; no data, schema or migration depends on either.
