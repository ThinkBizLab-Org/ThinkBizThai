# RFC-2026-029 — The application tier's stack: Next.js and TypeScript checked by `tsc`, the dependency allowlist, and where the code goes

Status: **Approved 2026-10-11 UTC (2026-10-12 local) by the Product Owner; in effect when he merges this PR personally.** Asked through the session's question tool (session `c2816eec`, asked 18:42:55Z, answered 18:46:09Z), he chose `อนุมัติ RFC-029 ตามที่เขียน + ปรับ §7 ตาม RFC-034 (Recommended)`: this text is approved as written, with §7 aligned to `RFC-2026-034` §2.1. The question, its options and his answer are transcribed in `evidence/WP-1A-A0-001/product-owner-disposition-2026-10-12-rfc-029-approval.md`, with his direction, in the same answer, on who presses the skeleton pull request (§10). This RFC decides dependencies, the lockfile and the application tier's language, so it is a governance change: under `RFC-2026-025` §5 item 6 the Owner merges this PR personally, as the option he chose says (`คุณกด merge เอง`), and no delegation covers it. Nothing in this document installs a package, adds a lockfile entry, creates `apps/` or `src/`, changes CI, or provisions a provider.
History: drafted 2026-10-08 by `/claude/a0_atlas` (A0) under `WP-1A-A0-001`, status **In review**. The decisions it writes down (D1–D6, D9, D11 and D12 of A0's G1/G2 plan) were accepted by the Owner on 2026-10-08 in chat, verbatim `รับตามแนะนำทั้งหมด รวม RFC-030 ด้วย ลุยเลย` ("accept all as recommended, including RFC-030, go"), transcribed with its limits in `evidence/WP-1A-A0-001/product-owner-decision-2026-10-08-g1-plan.md`. Those words accepted recommendations; they did not approve this text, which did not exist yet. The draft said the Owner's personal merge would be its approval and that it was not in effect until merged. It reached `main` through PR #215 (`4b5dac8e`, 2026-10-08T10:21:38Z) with this line still reading In review, and was read as In review from then until the Owner's answer above, whose question names that state (`ตอนนี้อยู่บน main แต่สถานะ 'In review'`).
Revised: 2026-10-08, in the first review round at `7d2c430c` (`evidence/WP-1A-A0-001/a0-closure-2026-10-08.md` maps every finding to its line): §2.7/1 states the boundary as the database's grants and requires `HttpOnly` session cookies (A1 F2); §2.7/3, §2.8, §6.1 and Q-029-2 move the worker's credential and the dispatcher into a deployment of their own, `apps/worker`, so that no request-path runtime can read it (A1 F1, R0 R5; `RFC-2026-028` §3.3/2); §3.1 confines the provider SDKs to module `adapters/` and named composition-root files and keeps MOD-900's prohibition (C0 F1, R0 R2, Q0 Q2); §3.2 says where each development package may be imported (Q0 Q1); §3.4/6 routes version changes of security-relevant packages to A1 and §4.8 adds a release-age rule (A1 F3); §4.2 keeps `.npmrc` out and the exit-90 guard unchanged (C0 F2, R0 R4, A1 I3); §7 follows the register's four rungs and waits for the G0 exit record (C0 F3, R0 R1, R0 R3); §2.4 carries the plan's inference mark and its Pro plan (C0 F5, R0 R7); §2.10 extends scrubbing to the browser (A1 F5); §8 gains checks for the worker credential, cookies and each package's install-time behaviour (A1 F4); §9, §10 and §11 record the unmeasured points and the register edit no package can make yet (C0 F4, F6-F8). It was then still In review; that revision approved nothing.
Revised: 2026-10-12, on the Owner's answer: §7 is rewritten to `RFC-2026-034` §2.1, which answers the RFC-2026-029 half of A1-251r2-5 (whether it closes it is A1's reading) (`evidence/WP-0A-A0-001/a1-reread2-2026-10-11-pr251.md`). The status line, the note in §10 and the sentences in §7 and §11 that relied on the old §7 or on facts it dated (PR #214 open, Draft contracts) follow from it. Nothing else changes.
Date: 2026-10-08
Author: `/claude/a0_atlas` (A0 Architecture/Integration; owner of root config, lockfile and composition root under the register's §4.3); drafted by a subagent of that run
Reviewer sought: `/claude/c0_contract_reviewer` (review), `/claude/a1_bastion` (Security: the request path, the worker credential, the service-role exclusion and the dependency supply chain), `/claude/q0_sentinel` (test), `/claude/r0_steward` (Integration Owner: CI and the lockfile)
Answers: the remaining half of `OPEN-018` (`docs/sprint-0a/sprint-0a-decision-register-contract-catalog-th.md:127`, "TypeScript/Node/Next.js assumption ห้าม lockfile จนประกาศ" — no lockfile until announced); `RFC-2026-011`'s deferral ("The application tier's language is NOT decided here … decided with the stack at G1"); the condition in `CONTRIBUTING_AGENTS.md` § Verification and handoff that no dependency is introduced "without a new approved RFC"
Depends on: `RFC-2026-001` (approved; Node `24.20.0`, npm `11.19.0`, `npm ci --ignore-scripts`), `RFC-2026-011` (approved; the tooling tier is JavaScript ESM), `RFC-2026-012` (approved; server-only mutation, Realtime unresolved at its §Limitations), `RFC-2026-017` (approved; `service_role` reserved for migration and platform administration), `RFC-2026-019` (approved; the request path is `authenticated`, command functions are owned by `app_command`), `RFC-2026-021` (approved; the client read allowlist starts empty), `RFC-2026-028` (approved; the worker's login role), `RFC-2026-025` (approved; who merges governance); `RFC-2026-034` (approved 2026-10-11, PR #251; §7 rests on its §2.1)
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
   install must not be able to disable the governance guards, which are what would report it. The tooling
   tier's import allowlist, `ALLOWED_DEPENDENCIES` in `scripts/verify-test-coverage-floor.mjs` (`[]` today),
   stays empty: nothing in §3 is admitted to the tooling tier, and widening that list to let an application
   import pass is a change to this RFC.

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

**Vercel on the Pro plan, function region `sin1`** (Singapore), pinned in the repository's Vercel
configuration rather than left to a dashboard default. The plan marks D2 as **[A0's inference in the plan]**;
the mark follows its Preview clause, so it is read here as covering the whole row. **No Preview deployment
holds a credential for any Supabase project**, in either Vercel project (§2.7/3): the architecture
document's "Vercel Preview ห้ามต่อ Production database" (`technical-architecture-…-th.md:941`)
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
   (`RFC-2026-012`).

   **The boundary is the database's grants to `authenticated`, not the tier.** The project URL and the
   public key are public by design, and a browser holding the user's access token is the same
   `authenticated` session to PostgREST as the server's client: whatever the server can read or call as
   `authenticated`, the user, or script injected into the user's page, can read or call directly
   (`RFC-2026-012` §Context: "a convention, not a control"). So every request-path read is either an entry
   approved under `RFC-2026-021` (whose allowlist starts empty and `authenticated` holds no table grant on
   `app` outside it) or a database function written for that read and reviewed with A1 as a command function
   is; every mutation is a command function. Each is reachable by a browser holding the token, and is
   reviewed on that assumption. This RFC adds no entry and no function. A "server-only" read needs the same
   entry or function as any other; there is no server exemption.

   The browser holds no Supabase data client in G1/G2. That is not a control on what the token can reach;
   it is what lets the session cookies be **`HttpOnly`, `Secure` and `SameSite=Lax`**, so that an injected
   script cannot lift the access or refresh token. While the browser holds no Supabase client, the session
   cookies are set that way (§8/7). Whether `@supabase/ssr` sets them so by default or by option is not
   measured here; `WP-1A-A0-003`, which writes the session code, measures it.
2. **The service-role key is never on the request path or the worker path.** It is not set in any Vercel
   environment, is not read by any file under `apps/` or `src/`, and is used only by the migration and
   administration path `RFC-2026-017` reserves it for, operated through the DATA-DEC-02 wrapper
   (`RFC-2026-015`): the key is held in `WP-1A-A6-001`'s secret inventory, and the wrapper is run by
   `WP-1A-A1-001` when it applies the migrations (§6.4). `service_role` bypasses RLS; a request path that held
   it would make every policy in `db/foundation/migrations/` decorative.
3. **The worker uses `RFC-2026-028`'s login role, from a deployment of its own.** The dispatcher (§2.8)
   connects with a Postgres driver (`pg`) as `app_worker_login`, issues `SET LOCAL ROLE app_worker` in every
   job transaction, and carries the session and start-of-transaction checks `RFC-2026-028` records as A1R-2.
   **The credential's secret scope excludes every request-path runtime** (`RFC-2026-028` §3.3/2, first
   condition, and Q-028-3): the dispatcher runs in `apps/worker`, deployed as its **own Vercel project**,
   whose environment variables are the only place the worker credential is set. The web project
   (`apps/web`) holds neither that credential nor any route that uses it, and no code under `apps/web`
   names the variable (§8/5). On Vercel, environment variables are scoped per project and environment,
   not per function, so a dispatcher inside `apps/web` would put the credential within reach of every page,
   Server Action and route handler there; a separate project is what makes the scope a boundary.
   `apps/worker` serves the dispatcher route and nothing else. **[A0's addition in review, answering A1 F1;
   not in the plan, whose D6 does not say which deployment holds the dispatcher.]** The worker's credential
   exists only in the staging and production environments of that project, and is set only once Q-028-3's
   custody is answered with its three conditions; until then the worker is not provisioned.

   It connects directly or through a session-mode pooler until Q-028-12 (the platform pooler with a custom
   login role) is measured; the transaction-mode pooler is not used before then. **Neither route is
   measured.** Supabase's direct host may be reachable over IPv6 only unless an IPv4 add-on is bought, while
   Vercel Functions may egress over IPv4 only; both are general knowledge, not measured here (C0 F6). Until
   `WP-1A-A1-001` measures Q-028-12, or `WP-1A-A6-001` measures the direct route from the worker project, the
   worker has no measured way to connect, and `WP-1A-A0-004` does not rely on one.

### 2.8 Jobs (D6)

**`app.jobs` is the queue**, with `app.outbox_events` and the consumer ledger (`050_async_kernel.sql`), as
built. Supabase Queues (pgmq) is not added in G1/G2 **[A0's inference in the plan]**: a second queue beside a
built and tested one is two sources of truth for "what is pending". A **once-a-minute Cron** calls a
dispatcher route handler in `apps/worker` (§2.7/3), which authenticates the caller with a dedicated secret
and nothing else, claims jobs under a lease, and stops within a time budget below the function's maximum
duration. The secret is compared in constant time; an unset or empty secret refuses every call (fail
closed); the route refuses on any Preview deployment (A1 I2). The Cron's secret lives in the worker
project's environment beside the worker credential, not in the web project. Which Cron fires it is
Q-029-2. Moving workers out of Vercel is considered only when media or AI jobs outgrow the budget.

### 2.9 Status updates (D11)

**Polling, not Realtime.** Job and notification status reach the UI by polling server endpoints with
back-off. No `postgres_changes` subscription is opened until an RFC answers the question `RFC-2026-012`
recorded as unresolved (whether a subscription reads the base table under base-table RLS).

### 2.10 Errors (D9)

**Sentry** (`@sentry/nextjs`) with **`sendDefaultPii: false`**, scrubbing before send (no request
bodies, cookies, authorization headers, query strings, e-mail addresses or IP addresses), and no Session
Replay. The scrubbing applies **in the browser configuration as well as the server's** (`beforeSend` and
`beforeBreadcrumb` on both), and covers URLs in breadcrumbs and transaction names, because Email OTP sign-in
can put one-time tokens (`token_hash` and similar) in a URL. The browser's events reach Sentry from the
user's device, where the sender's IP is seen at ingestion whatever `sendDefaultPii` says; whether it is
stored is a Sentry project setting, which is set to not store it. `WP-1A-A6-002` shows both settings
(A1 F5). Sentry's entry in the subprocessor map (PRV-001) and where it stores data are owed before production
customer data; A0 has not measured which storage regions Sentry offers and states none here.

## 3. The dependency allowlist

This section is the approval `CONTRIBUTING_AGENTS.md` requires for each package it names. **A direct
dependency is allowed only if its exact name is in this table**, in the column it is listed under.
Transitive dependencies are not listed one by one; they are governed by §4.

### 3.1 Runtime (`dependencies`)

"Where it may be imported" is a path rule a build checks (§6.3/4, §8/1). Two names it uses:

- **Composition root** (A0-owned, §6.2): `apps/web/composition/**` and `apps/worker/composition/**`, where
  module adapters are instantiated and wired, plus the framework entry files that must name a provider:
  `apps/<app>/instrumentation.ts`, `apps/<app>/instrumentation-client.ts`, `apps/<app>/sentry.*.config.ts`
  and `apps/<app>/next.config.ts`. Nothing else under `apps/` is composition root.
- **Adapters**: `src/modules/<key>/adapters/**`.

**MOD-900's prohibition stands.** The register's `product-web` row forbids "direct private-table
write/provider SDK"; `apps/web` code outside its composition root (pages, layouts, components, route
handlers, Server Actions, view models, request middleware) imports no provider SDK. It reaches Supabase and
Sentry through functions the composition root exports. This RFC does not amend MOD-900.

| Package | Why | Decision | Where it may be imported |
|---|---|---|---|
| `next` | framework | D1 | `apps/**` |
| `react` | framework | D1 | `apps/**` |
| `react-dom` | framework | D1 | `apps/**` |
| `@supabase/supabase-js` | request-path client under the user's JWT | D3, D5 | adapters, and `apps/web/composition/**` |
| `@supabase/ssr` | cookie session for the App Router | D4, D5 | `apps/web/composition/**` only |
| `pg` | worker driver as `app_worker_login` | D5, D6 | `src/modules/platform-kernel/adapters/**` (the job store, MOD-000) only; never reachable from `apps/web` (§6.3/5) |
| `zod` | validation at the API and form boundary (`technical-architecture-…-th.md:192`) | D1 | anywhere under `apps/` and `src/` |
| `next-intl` | Thai message catalog (`technical-architecture-…-th.md:191`) | D12 | `apps/web/**` |
| `@sentry/nextjs` | error tracking | D9 | the composition root of `apps/web` and `apps/worker` only |
| `radix-ui` | primitives shadcn/ui components import | D12 | `apps/web/components/**` |
| `class-variance-authority` | shadcn/ui variant helper | D12 | `apps/web/components/**` |
| `clsx` | shadcn/ui class helper | D12 | `apps/web/components/**`, `apps/web/lib/utils.ts` |
| `tailwind-merge` | shadcn/ui class helper | D12 | `apps/web/components/**`, `apps/web/lib/utils.ts` |
| `lucide-react` | icons shadcn/ui components import | D12 | `apps/web/components/**` |

### 3.2 Development (`devDependencies`)

No development package is imported by code that runs in a deployment: nothing under `apps/**` other than
the files named in the last column, and nothing under `src/**` other than test files, imports one (§6.3/4).
The `@types/*` packages are never imported by name. `typescript` is imported by one file only,
`scripts/app-boundaries-parser.mjs`, for its parser API, which CI runs (Amendment 2026-10-12).

| Package | Why | Decision | Where it may be imported |
|---|---|---|---|
| `typescript` | `tsc --noEmit` | D1 | nowhere, except `scripts/app-boundaries-parser.mjs` (parser API; RFC amendment 2026-10-12) |
| `@types/node` | types | D1 | nowhere (ambient types) |
| `@types/react` | types | D1 | nowhere (ambient types) |
| `@types/react-dom` | types | D1 | nowhere (ambient types) |
| `@types/pg` | types | D5 | nowhere (ambient types) |
| `tailwindcss` | CSS build | D12 | `apps/web/**/*.css` (`@import`) only |
| `@tailwindcss/postcss` | Tailwind's PostCSS plugin | D12 | `apps/web/postcss.config.mjs` only |
| `postcss` | CSS build | D12 | `apps/web/postcss.config.mjs` only |
| `eslint` | lint, including the module-boundary rules (§6.3) with its core `no-restricted-imports` | D1 | `eslint.config.mjs` at the root only |
| `eslint-config-next` | Next.js and TypeScript lint rules | D1 | `eslint.config.mjs` at the root only |
| `vitest` | unit and integration tests (`technical-architecture-…-th.md:211`) | D1 | `**/*.test.ts`, `**/*.test.tsx` and `vitest.config.ts` only |
| `@playwright/test` | end-to-end and mobile matrix (`WP-1A-Q0-001`) | D1 | `tests/e2e/**` and `playwright.config.ts` only |
| `@axe-core/playwright` | accessibility baseline, WCAG 2.2 AA | D1 | `tests/e2e/**` only |

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
   dependency. Removing a dependency is an ordinary pull request. **A version change of a package item 5
   would route to A1 also goes to A1**: today `next`, `@supabase/supabase-js`, `@supabase/ssr`, `pg` and
   `@sentry/nextjs`, because a minor version of any of them can change the session cookie, the scrubbing
   default or the transitive tree (A1 F3). Every newly resolved version also meets §4.8's release age.
7. **Moving a name between §3.1 and §3.2**, or widening "where it may be imported", is an amendment. Moving a
   configuration file named in those columns to the file name or location the resolved framework version
   requires is not a widening, provided the file keeps the same role.

## 4. Lockfile and install policy

1. **One lockfile**: `package-lock.json` at the repository root, `lockfileVersion` 3, written only by npm
   `11.19.0`. `apps/web` and `apps/worker` are npm workspaces of the root package and have no lockfile
   of their own.
2. **Exact versions** in every `package.json`: no `^`, `~`, `*`, ranges, tags or `latest`. **No `.npmrc`
   exists in G1**, and the test-integrity guard stays as it is: any `.npmrc` fails it with exit 90
   (`scripts/verify-test-coverage-floor.mjs`, `PACKAGE_MANAGER_CONFIG` and `assertNoPackageManagerConfig`),
   because one line in it (`script-shell=`) silences every `npm run`. The guard throws on the file's
   presence whatever its digest; its message's "digest it and add it to `DIGESTED_FLOOR`" describes no
   path the code implements, so admitting an `.npmrc` would be an edit to a digested guard, a test-integrity
   change with its own negative control and a governance change of its own. It is not needed: the installing
   package passes the settings on the command line (`npm install --save-exact --ignore-scripts
   --engine-strict`, `npm ci --ignore-scripts`), and the exact-version check of §8/2 holds the result. An
   `.npmrc` with `ignore-scripts=true` would also silently drop every `pre*`/`post*` hook of an explicit
   `npm run` (measured by A1 on npm `11.19.0`, A1 I3), a trap if a verifier ever gains one. npm `11.19.0`
   does not read a workspace-level `apps/<app>/.npmrc` (measured by R0, R0 R4), so §4.1's layout adds no
   configuration surface.
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

   **Note 2026-10-17 (A1-270-1; the sentence above is kept as written and is not changed by this note).** What
   CI runs differs from the command the sentence above proposes. Measured on `main` at `6fd6aa0e`:
   `.github/workflows/ci.yml` line 1354, the step "Vulnerability audit (network)" of the `application` job,
   runs `npm audit --include=dev --audit-level=high`. The step was added with `--omit=dev` by `WP-1A-A0-002`
   (PR #257, merged as `40267ae9`) and moved before every step that runs package code by `WP-0A-A0-004`
   (PR #270, `047385f8`). A1's review of PR #270 found that `--omit=dev` leaves out every development
   dependency, while `typescript`, `vitest` and the Tailwind/PostCSS toolchain (§3.2) are the package code
   that job runs first (A1-270-1, Low, `evidence/WP-0A-A0-004/a1-review-2026-10-15-pr270.md`). PR #279
   (`WP-0A-A0-004`, merged 2026-10-16T13:45:28Z as `42b37f00`) changed the step to `--include=dev`, under
   the Product Owner's answer recorded in `evidence/WP-0A-A0-004/product-owner-disposition-2026-10-16-ci-audit.md`,
   whose record names this sentence among what that answer does not decide. Read this item as: CI runs
   `npm audit --include=dev --audit-level=high`, development dependencies included, at the same threshold.
   `work-packages/WP-1A-A0-002.json` still reads `--omit=dev` in `acceptance_criteria[7]` and
   `deterministic_commands.package_evidence[4]`; that manifest is `WP-1A-A0-002`'s, and a separate pull
   request of that package corrects them. This note changes no rule, threshold, CI step, guard or test; it
   is recorded under the Product Owner's direction of 2026-10-17T11:53:17Z
   (`evidence/WP-1A-A0-001/product-owner-disposition-2026-10-17-omit-dev-wording.md`).
7. **Telemetry is off** for every allowlisted package that has it: in CI and in every deployment
   (`NEXT_TELEMETRY_DISABLED=1` for Next.js; the Sentry build plugin's own telemetry switched off in its
   configuration, which `NEXT_TELEMETRY_DISABLED` does not cover). `WP-1A-A0-002` lists, per allowlisted
   name, whether it has telemetry and how it is switched off (§8/8).
8. **Release age.** A version, direct or transitive, enters the lockfile only once it has been published on
   the registry for at least **seven days**. The npm compromises of 2025 shipped as fresh patch releases
   that were pulled within hours (A1 F3); a short delay is a cheap control that `npm audit` does not give. The
   installing package resolves with `npm install --before=<a date at least seven days earlier>`, and a CI
   step outside `npm run check` (it reads the registry, so it needs the network) checks the publish time of
   every lockfile entry changed by the pull request. A security fix younger than seven days is admitted
   only with A1's recorded approval in that pull request. The step is `WP-1A-A0-002`'s, and is a CI change,
   therefore governance.

## 5. Toolchain, kept

Node `24.20.0` and npm `11.19.0` stay exactly as `RFC-2026-001` pins them, in `.node-version`,
`package.json` `engines` and `packageManager`, the CI setup step and `scripts/toolchain-contract.mjs`.
Nothing in this RFC changes any of them, and `test-kits/repository-json.test.mjs`'s toolchain assertion is
unaffected.

## 6. Repository layout

### 6.1 Directories

```
apps/web/                      Next.js App Router (MOD-900 product-web, owner A5); its own Vercel project
  app/                         routes, layouts, route handlers and Server Actions; no job dispatcher
  components/                  shadcn/ui source and product components
  composition/                 composition root: modules and adapters wired, A0-owned (§3.1, §6.2)
apps/worker/                   the job dispatcher (§2.7/3, §2.8), A0-owned; its own Vercel project
  app/                         the dispatcher route handler and nothing else
  composition/                 composition root: the job store adapter wired, A0-owned
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
`audit-observability-ops`. `product-web` is `apps/web`. `apps/worker` is not a module: it is a second
deployment of MOD-000's job runtime, holding only the dispatcher and its wiring, so that the worker's
credential has a secret scope no request-path runtime can read (§2.7/3). It is a minimal Next.js App Router
application, so it needs no package beyond §3.1. A directory is created when its module's first code lands,
not ahead of time.

### 6.2 Ownership

`src/modules/<key>/` belongs to that module's owner in §4.2. `apps/web` belongs to A5, except its
composition root (§3.1), which is A0's. `apps/worker` is A0's. The root `package.json`, `package-lock.json`, `.npmrc`, `tsconfig`
bases, lint configuration, Next.js and Vercel configuration and CI are A0-owned (A0+A6 for CI and deploy),
as the register's §4.3 already says.

### 6.3 Boundaries a build checks

1. A module imports another module only through that module's `index.ts`. Only a composition root
   imports a module's `adapters/` directly; nothing else does.
2. Nothing under `domain/` imports a provider SDK, Next.js, React or anything under `adapters/` (DEC-022).
3. Nothing under `apps/` or `src/` imports from `spikes/`.
4. Only allowlisted packages are imported, from the places §3.1 and §3.2 allow.
5. Nothing under `apps/web/` imports `pg` or `src/modules/platform-kernel/adapters/**`, directly or through
   its composition root, and `src/modules/platform-kernel/index.ts` does not re-export the job store
   adapter. This is a second line behind the secret scope of §2.7/3, not a replacement for it.

### 6.4 One migration source

`db/foundation/migrations/` remains the **single** source of schema. There is no `supabase/migrations/`
directory, no copy of a migration anywhere else, and no Supabase CLI `db push` against staging or production;
staging and production are migrated by the DATA-DEC-02 wrapper (`WP-1A-A1-001`). If a `supabase/` directory
is ever needed for local configuration, it holds no migrations, and a guard asserts so.

## 7. What may be merged, and what stays a spike

This section follows `RFC-2026-034` §2.1, which the Owner approved on 2026-10-11 and which is on `main` (PR #251).
The register sets what a consumer may do at each freeze level (`sprint-0a-decision-register-contract-catalog-th.md`
§5.1, `:186-191`). RFC-2026-034 §3 amends §5.1 lines 190–191 and the register's line 373 as to writing and merging
application code; this RFC reads the rungs as so amended and lowers none of them further:

| Level | What the register allows | Under RFC-2026-034 §2.1, for application code | Where that code may live here |
|---|---|---|---|
| Draft | "exploratory spike เท่านั้น" (an exploratory spike only) | unchanged | `spikes/<work-package-id>/` or its own branch; never imported (§6.3/3) |
| Candidate v1 | fakes, fixtures and consumer tests | application code, fakes and consumer tests may be written and merged, as reversible work | merged into `src/modules/` and `apps/`; fakes, fixtures and contract tests in the module's test files or `test-kits/` |
| Frozen v1 | "เขียน implementation ได้" (implementation may be written) | as Candidate v1; it is also the level every contract a deploy serving users needs first (below) | merged into `src/modules/` and `apps/` |
| Integrated v1 | "merge consumer ได้" (a consumer may be merged) | as Frozen v1 | merged into `src/modules/` and `apps/` |

So, **before the G0 exit closes** (RFC-2026-034 §2.1), **code that implements or consumes a contract may be merged into
`src/modules/` or `apps/` once every contract it implements or consumes is at `Candidate` or above**, and only as
reversible work:

- **Synthetic data only.** No real customer data.
- **Migrations on local and CI databases only.** Migrations run on local databases and on CI's throwaway
  service-container database. Nothing is applied to a hosted or production project.
- **No external provider bound.** Providers are faked. No provider account is bound, sandbox and test accounts
  included, and no credential of any provider is used. Hosted staging and provider sandboxes are a later decision
  (RFC-2026-034 §2.1).

Code that implements or consumes a contract still at `Draft` stays a spike under `spikes/<work-package-id>/` (or on its
own branch) and is never imported from `apps/` or `src/` (§6.3/3). Code that implements or consumes no contract, such as
the skeleton or components with no data path, is merged under the same reversibility; that follows from the rule
above and from `CONTRIBUTING_AGENTS.md` § Current gate constraint, not from new text in RFC-2026-034.

**`Frozen` before production use.** Before any paid beta, real customer data, or production deploy that serves users,
every contract that deploy uses is `Frozen` under `RFC-2026-031`. A breaking change to a `Candidate` contract follows
its owner and the RFC path. Freeze pull requests and changes to a `Frozen` contract keep RFC-2026-031's own role rules
(§4 there), whatever their lane (RFC-2026-034 §2.1).

Who reads each pull request of this code is set by RFC-2026-034 §2.2's lanes, not by this section. A merge under this
section does not move a contract's level. It does not close the G0 exit either, which stays "decided, conditional"
(RFC-2026-034 §2.1). On `main` at `3070d888` all fourteen shared-kernel contracts are `Candidate` and none is `Frozen`
(`contract-catalog/shared-kernel/index.json`). `CONTRIBUTING_AGENTS.md` § Current gate constraint states the same rule
as this section (RFC-2026-034 §7 (a)).

**The G0 exit record came first, as the plan ordered.** The plan the Owner accepted orders `WP-0A-A0-010` (D0) before
this package and this package before the skeleton. `WP-0A-A0-010` was merged by PR #214 (`56d97d7a`), so that order
holds. The skeleton also waits for the Owner to merge the pull request that approves this RFC.

The package ids are A0's proposed ids from the 2026-10-08 plan (`.claude/g1-g2-plan-2026-10-08.md`, outside
the repository). If D13 renames them, the rows follow the new names.

| Package | Contracts it needs (level on `main` at `3070d888`) | What may be merged |
|---|---|---|
| `WP-1A-A0-002` skeleton, boundary lint, CI | none (CTR-MOD-001 is read as a registry, not implemented) | an empty, reversible skeleton, once the Owner has merged the pull request that approves this RFC |
| `WP-1A-A5-002` design tokens and components | none | components with no data path |
| `WP-1A-Q0-001` test foundation | PRT-BAS-001 (Draft in the register, `:237`; not in `contract-catalog/`) | a spike until PRT-BAS-001 is `Candidate`; then fakes, contract tests and code, as reversible work |
| `WP-1A-A0-003` tenant context and API envelope | CTR-TEN/API/ERR/IDM (all Candidate) | code, fakes and consumer tests, as reversible work |
| `WP-1A-A0-004` job worker and outbox relay | CTR-JOB-001, CTR-EVT-001 (both Candidate) | code, fakes and consumer tests, as reversible work, run against local and CI databases only; the worker is not provisioned (§2.7/3) |
| `WP-1A-A5-001` notification store | CTR-NTF-001 (Candidate) | code, fakes and consumer tests, as reversible work |
| `WP-1A-A6-002` observability | CTR-OBS-001, CTR-FLG-001, CTR-MOD-001 (all Candidate) | code, fakes and consumer tests, as reversible work; Sentry is a provider, so no Sentry project is bound |
| `WP-1A-A5-003` app shell | CTR-ERR-001, CTR-API-001 (both Candidate) | the shell, its data-bound parts included, as reversible work |

Provisioning binds a provider: the Supabase projects, the two Vercel projects and their credentials (`WP-1A-A6-001`,
`WP-1A-A1-001`). RFC-2026-034 §2.1 keeps provider accounts, sandboxes included, and provider credentials out of
reversible work, so provisioning waits for the later decision that opens them. Production use also waits for the
`Frozen` rule above.

## 8. What a build must check once code exists

These are acceptance conditions for `WP-1A-A0-002`, the package that installs the first dependency. Until
they exist, this RFC is a rule held by review alone, and it says so.

1. A guard compares every `package.json`'s direct dependencies against a machine-readable copy of §3.1 and
   §3.2, including the "where it may be imported" columns, and a test fails if that copy and §3's tables
   disagree.
2. Every version in every `package.json` is exact; every resolved lockfile entry is from the npm registry with
   a `sha512` integrity.
3. `tsc --noEmit` runs in CI with the §2.1 flags, and a negative control (a deliberately mistyped fixture)
   shows the step fails.
4. The §6.3 boundaries are lint errors, each with a negative control.
5. No path `supabase/migrations/**` exists; no file under `apps/` or `src/` names the service-role key or the
   `service_role` role; no file under `apps/web/` names the worker credential's environment variable, and
   outside `apps/worker/composition/**` no file reads it. Each with a negative control (R0 R5).
6. `npm run check` still runs, and still passes, with no `node_modules` directory present.
7. The session cookies are `HttpOnly`, `Secure` and `SameSite=Lax` while the browser holds no Supabase
   client (§2.7/1), shown by a test on the code that sets them (`WP-1A-A0-003`, when it writes that code).
8. Before the first install lands, `WP-1A-A0-002` records, per allowlisted name and from the resolved
   lockfile on a clean clone, §3.4/1's answers: licence, install script, packages added, and whether it
   sends anything off the machine at build or run time (telemetry, source-map upload, fonts fetched at build
   such as `next/font/google`). Any "yes" to an install script or to network use at build time goes to A1
   before the install lands, and §4.7's telemetry switches follow from this list (A1 F4).
9. The release-age step of §4.8 runs on every pull request that changes `package-lock.json`.

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
  The first expected case is `@sentry/nextjs`'s dependency `@sentry/cli`, whose binary normally arrives by
  an install script, so source-map upload is the first thing likely to fail (C0 F8; general knowledge, not
  measured). It belongs with Q-029-4.
- **Two Vercel projects, not one** (§2.7/3). One more project to configure, deploy and keep in step, and a
  second environment-variable scope to inventory (`WP-1A-A6-001`). Accepted as the price of `RFC-2026-028`
  §3.3/2's first condition.
- **The worker's connection route is unmeasured** (§2.7/3, C0 F6). If neither the direct host nor a
  session-mode pooler works from the worker project, D6's placement on Vercel is revisited, not the
  worker's identity.

## 10. Questions, with A0's recommendation

- **Q-029-1** How `apps/web` compiles `src/modules/` outside its own directory. *Recommendation:* TypeScript
  path aliases (`@modules/<key>`) with the Next.js project root set to the repository root, measured by
  `WP-1A-A0-002` on a clean clone; making each module its own workspace package is the fallback.
- **Q-029-2** Which Cron fires the dispatcher. *Recommendation:* Vercel Cron in the **worker's** project
  (`apps/worker`, §2.7/3), so its secret lives beside the worker credential and outside the web project;
  Supabase Cron would need the secret stored in the database. The earlier recommendation, "the same
  deployment" as the web tier, is withdrawn (A1 F1). Decided by `WP-1A-A0-004`.
- **Q-029-3** How staging is deployed (a Vercel custom environment or a protected branch deployment).
  Decided by `WP-1A-A6-001`.
- **Q-029-4** Sentry's data location and source-map upload (which needs a CI token, a secret, and, under
  `--ignore-scripts`, a `@sentry/cli` binary that may not be installed; §9). Decided by `WP-1A-A6-002` with
  PRV-001.
- **Q-029-5** Whether `next-intl` is installed by the skeleton or by the shell. *Recommendation:* the shell
  (`WP-1A-A5-003`), since the skeleton shows no text.
- **Q-029-6** How the worker reaches the database from Vercel (§2.7/3): the direct host, over which IP
  family, or a session-mode pooler with the custom login role (Q-028-12). Measured by `WP-1A-A1-001` and
  `WP-1A-A6-001`; `WP-1A-A0-004` relies on neither until then.
- **Q-029-7** Packages the skeleton will probably also want, depending on the majors `WP-1A-A0-002`
  resolves (C0 F7, R0 R7; general knowledge, not measured): `server-only`, `tw-animate-css` (current
  shadcn/ui templates on Tailwind v4), `typescript-eslint` or `@eslint/eslintrc` for a flat lint config,
  and `@vitejs/plugin-react` with `jsdom` or Testing Library for component tests. *Recommendation:* not
  added now, because none has §3.4/1's answers; `WP-1A-A0-002` brings the ones it actually needs as one
  dated amendment with those answers, which is one governance merge rather than several.

**2026-10-11 UTC (2026-10-12 local).** The Owner approved this text as written (status line). He was not asked these
questions one by one: Q-029-1, Q-029-5 and Q-029-7 remain A0's recommendations, not his answers, and Q-029-2, Q-029-3,
Q-029-4 and Q-029-6 stay with the packages named above (C0-256-1, R0-256-1). **Who presses the skeleton (note).** In the same answer the Owner directed that A0 may press
the `WP-1A-A0-002` skeleton pull request once C0, A1, Q0 and R0 have passed on its final head and CI is green on it,
with `RFC-2026-025` §5 item 6's other conditions kept. The direction reaches that pull request only. It does not reach
this RFC or any amendment to its allowlist (§3.4/1), Q-029-7's dated amendment included. The words, and A0's reading of
their reach, are in `evidence/WP-1A-A0-001/product-owner-disposition-2026-10-12-rfc-029-approval.md` §3 (b). On
2026-10-12 the Owner extended it to Amendment 2026-10-12 as it travels in that pull request: the licence decision and,
by a second answer the same day, the widening of `typescript`'s §3.2 cell ("Who presses", below).

## 11. What this does not decide

D0 (G0 exit: `WP-0A-A0-010`). Marking `OPEN-018` closed in the register is owed once the Owner merges the
pull request that approves this RFC, and **no package can make that edit today**: at `3070d888` no manifest lists a
`docs/` path among its `writable_paths`, and `WP-0A-A0-010`, merged by PR #214, holds `docs/**` read-only (C0 F4).
A0 names the package that makes it when the register next needs an edit; until then the register reads OPEN-018 as
open and this RFC, once in effect, is what answers it. Also not decided here: D7 (secret store for Meta tokens),
D8 (email provider and sender domain), D10 (storage provider), D13 (work-package naming) and D14 (legal
entity, domain, e-mail). The text of
`WP-0A-DB-00.required_human_authorities` that still offers the service-role key is that package's record to
close; §2.7 is what it should cite.

## 12. Rollback

Revert the merge commit through a reviewed revert pull request. Before `WP-1A-A0-002` lands, reverting
removes a decision and changes no file anything runs. After it lands, the skeleton's installation is
reverted with it, in the same revert or first; no data, schema or migration depends on either.

## Amendment 2026-10-12 — licences of named transitive packages, and `typescript` in the boundary guard's parser, accepted by the Owner (WP-1A-A0-002)

Status of this amendment: the Product Owner's decisions, recorded here by `/claude/a0_atlas` (A0) under
`WP-1A-A0-002`, which installs the first packages. It amends §3.4/2. It also records, in the words of the Owner's ESLint
option of the same call, how §8/4 is held while ESLint is deferred, and A0's reading of what that holds for §2.1/3 and
§2.1/4's lint step (below, "ESLint deferred"). By the Owner's second answer of the same day it widens one "where it may
be imported" cell, `typescript`'s in §3.2, to one file (below, "`typescript` in the boundary guard's parser"). It also
gives A0's account, not the Owner's words, of how the guard holds §6.3 against build configuration and what CI checks
around the build (below, "Build configuration, and what the build included"). It admits no direct dependency, moves no
name between §3.1 and §3.2, widens no other cell and changes no other rule.

**What was found.** Resolving the skeleton's minimum set (`next`, `react`, `react-dom`, `typescript`, the three
`@types/*`, `tailwindcss`, `@tailwindcss/postcss`, `postcss`, `vitest`) with `npm install --ignore-scripts
--before=2026-10-05`, every direct dependency is MIT or Apache-2.0, but three licence families outside §3.4/2's list
arrive transitively: `CC-BY-4.0` (`caniuse-lite`, browser-support data `next` needs), `MPL-2.0` (`lightningcss` and its
per-platform binaries, the CSS compiler Tailwind CSS and Vite use) and `LGPL-3.0-or-later` (`@img/sharp-libvips-*`, and
the `@img/sharp-*` builds licensed `Apache-2.0 AND LGPL-3.0-or-later`, which reach the lockfile as optional packages
through `next` → `sharp`). §3.4/2 says anything outside its list "is named in the request and decided there".

**The question and the answer, verbatim.** Asked 2026-10-12T02:37:33Z and answered 02:39:15Z (UTC, the transcript's
stamps) through the question tool of session `c2816eec`. The question said that each is used unmodified, which
ordinarily does not oblige us to open our own code, and that A0 is not a lawyer (`ผมไม่ใช่ทนาย`) and a lawyer should be
asked for legal certainty. The Owner chose `ยอมรับ 3 license นี้สำหรับ transitive (Recommended)`, whose description
read:

`บันทึกคำตัดสินของคุณเป็น amendment สั้น ๆ ใน RFC-029 §3.4 (เฉพาะ CC-BY-4.0, MPL-2.0, LGPL-3.0 ของ package ที่ระบุ ใช้แบบไม่แก้ไข) + guard ที่ตรวจ license ทุกตัวใน lockfile ต่อจากนี้`

The questions, every option shown and the answers are transcribed in
`evidence/WP-1A-A0-002/product-owner-disposition-2026-10-12-skeleton-licences.md`.

**The rule it adds to §3.4/2.** These licences are accepted for these named **transitive** packages, used unmodified,
and for no other package:

| Licence | Packages |
|---|---|
| `CC-BY-4.0` | `caniuse-lite` |
| `MPL-2.0` | `lightningcss` and its per-platform binaries (`lightningcss-<platform>`) |
| `LGPL-3.0-or-later` | `@img/sharp-libvips-*`, and the `@img/sharp-*` builds whose licence is `Apache-2.0 AND LGPL-3.0-or-later` (with or without `MIT` beside them), optional through `next` → `sharp` |

Any other licence outside §3.4/2's list, anywhere in the lockfile, still needs its own decision under §3.4/1-2. A
direct dependency under one of these licences is not covered: it is a new decision. A package that patches or vendors
one of these is not "used unmodified" and is not covered either.

Three readings in this table are A0's, not the Owner's words, which named `caniuse-lite`, `lightningcss` and
`sharp/libvips`: that `lightningcss`'s per-platform binaries are part of the `lightningcss` he named (the guard reads
`<platform>` as an operating system npm names, `android`, `darwin`, `freebsd`, `linux` or `win32`, followed by its
architecture, so `lightningcss-plugin` is not one); that `@img/sharp-wasm32`, licensed
`Apache-2.0 AND LGPL-3.0-or-later AND MIT`, is one of the `@img/sharp-*` builds (MIT is on §3.4/2's list already); and
that "used unmodified" excludes a package that patches or vendors one of them. A reviewer who reads any of them
differently should say so.

**How it is held.** `scripts/verify-app-dependencies.mjs` reads every lockfile entry's `license` field and fails on any
licence that is neither in §3.4/2's list nor covered by a row above (a named package, transitive, under the exact
expression its row states), with tests and negative controls in `test-kits/app-dependencies.test.mjs`. Its machine
copy of the rows is
`scripts/app-dependency-allowlist.json`, held against this section's table by the same test: the table is read row by
row into each licence, its package spellings and the exact licence expressions it admits, and the copy must equal it
both ways, so a row deleted here, a pattern widened there or an expression the row does not state fails. The skeleton's
`next.config.ts` sets `images: { unoptimized: true }`, so `next build` does not need `sharp`; that was measured by
building with `sharp` and every `@img/*` package removed.

**ESLint deferred, and §8/4.** In the same call the Owner chose `ไม่ใส่ตอนนี้ (Recommended)` for ESLint, whose
description read `ตรวจขอบเขต import (§6.3) ด้วย guard script ที่ไม่มี dependency แทน — ESLint ค่อยพิจารณาทีหลัง` (check the
import boundaries of §6.3 with a guard script that has no dependency instead; ESLint to be considered later). So
`eslint` and `eslint-config-next` are not installed now, and §3.2's `eslint` rows stay on the allowlist unused. While
that holds, §8/4's "lint errors" are the errors of the guard `scripts/verify-app-boundaries.mjs` (its rules in
`scripts/app-boundaries.mjs`), each §6.3 boundary with a negative control in `test-kits/app-boundaries.test.mjs`.

The following is A0's reading of that answer, not the Owner's words. ESLint was also what §2.1/3 relied on (`any` "a
lint error in application code") and the lint step of §2.1/4's CI checks. While ESLint is deferred, the same guard holds
them: it refuses `@ts-ignore`, `@ts-nocheck`, an `@ts-expect-error` with no reason on its line, and any `any` type in
application code, and it runs as its own CI step where §2.1/4's lint step would run. The guard's rules other than
`any` need no dependency, and `npm run check` runs them with none; the `any` rule needs the parser (next paragraph), so
it is held only in CI's parsed run, not in `npm run check`.

In CI the guard also reads the sources with TypeScript's own parser, through the `typescript` package §3.2 lists
(nothing is installed for it), because a parser sees what a text scan misreads, and an `any` type cannot be told from
other text without one; that CI step fails if the parser cannot load. That import is not A0's reading of the ESLint
option: the Owner allowed it, by name and by file, in a second answer on 2026-10-12 (next paragraphs).

**Build configuration, and what the build included (§6.3, §8/4).** A0's account of how the guard holds §6.3 against
build configuration, not the Owner's words; it adds no rule and no dependency. Three review rounds on the skeleton pull
request (#257: A1-257-1, A1-257-5, A1-257-7, Q0-257r2-1, Q0-257r3-1, R0-257-8) each found a configuration route that
made the bundler or vitest load a module no import statement names. So the guard holds build configuration to
allowlisted shapes, not to a list of refused words: every `next.config.*`, `vitest.config.*` and `postcss.config.*` must
be, statement by statement and key by key, the shape `scripts/app-dependency-allowlist.json` states for its kind
(`configShapes`), read by the dependency-free text reader and, in CI, by TypeScript's parser as well, the two readings
required to agree; a Babel configuration, a PostCSS configuration other than `postcss.config.*` (every other name on
the search list Turbopack reads, taken from the installed Next.js 16.3.8), anything under a `.config/` directory, a
`vite.config.*` and a vitest workspace file are refused wherever they stand. What is admitted and what is refused, and
where the PostCSS list was read, is stated once, in that file's `configShapes.$comment` (and `resolutionAliases.$comment`
for compiler options and package.json maps), and is not restated here. The guard also refuses a tracked `.env*` file
under `apps/`, `src/` or at the root, `.env.example` excepted, because Next.js loads one into the build and a
`NODE_OPTIONS` in it preloads a module into every build worker (A1-257-9); CI's `application` job sets `NODE_OPTIONS`
to an empty value for every step (a root `.npmrc`, which could set it for `npm run`, is refused by the test-integrity
guard in the `bootstrap` job). Every workspace `package.json` declares exactly the `scripts` the same file's
`workspaceScripts` gives it (`apps/web`: `build` = `next build`), so no `prebuild` or `postbuild` hook and no changed
build command runs around `next build`; the root's scripts are pinned by the test-integrity tooling (A1-257-10). Names
are matched in any letter case. CI runs the guard a second time as the step immediately before `next build`. After
`next build`, that job also runs `scripts/verify-app-build-graph.mjs`, which reads what the build output names (its file
traces, its server and build source maps, its module ids) and fails on any repository file outside `apps/web/**` and
`src/modules/**`, a platform-kernel adapter, `pg`, or a package no allowlisted package depends on. It needs no
dependency and runs its negative controls first, A1-257-7's three routes among them as their builds showed them. It
reads what the output names, not what ran to make it. The shapes, the refusals, the pinned scripts and the empty
`NODE_OPTIONS` hold what configuration can make a build tool load (a loader, a PostCSS or Babel plugin, a preload, an
npm hook); they do not hold all code that runs. Code the repository itself runs in CI after the guard has read the
tree (a test under `npm run test:app`, a page's own code when `next build` prerenders it, build-time code it imports,
each with the Node builtins the guard admits) could still write files, a refused configuration file among them, or
change the build's output after the traces and maps are written. The guard's second run catches a refused file such
code has left on disk by then, not one written later or by a process still running. That residual is held by review of
every pull request, not by a check (A1-257-10).

**`typescript` in the boundary guard's parser (§3.2).** The first review round on the skeleton pull request (#257;
A1-257-1) showed that the dependency-free text reader can be made to miss an import, and that a guard that is much
harder to evade needs TypeScript's parser, through the `typescript` package already installed (no package is added). §3.2's cell
for `typescript` read "nowhere (a CLI)", and the ESLint option's description spoke of a guard "ที่ไม่มี dependency", so A0
asked. Asked 2026-10-12T07:08:30Z and answered 07:24:27Z (UTC, the transcript's stamps) through the question tool of
session `c2816eec`, the Owner chose `อนุญาตให้ guard import typescript (Recommended)`, whose description read:

`เพิ่ม amendment แคบ ๆ ใน RFC-029: typescript import ได้เฉพาะไฟล์ scripts/app-boundaries-parser.mjs (ใช้ parser API อย่างเดียว, รันใน CI) — ใน PR skeleton เดียวกัน และ A0 กดได้เมื่อ 4 role ผ่าน`

(add a narrow amendment to RFC-029: `typescript` may be imported only by the file `scripts/app-boundaries-parser.mjs`,
using the parser API only, run in CI; in the same skeleton pull request, and A0 may press once the four roles pass.)
The question, both options and the answer are transcribed in
`evidence/WP-1A-A0-002/product-owner-disposition-2026-10-12-skeleton-licences.md` §5.

So §3.2's `typescript` cell now reads "nowhere, except `scripts/app-boundaries-parser.mjs` (parser API; RFC amendment
2026-10-12)", and the sentence above that table says the same. Its exact reach:

- **One file, by its path.** `scripts/app-boundaries-parser.mjs` may import `typescript`. No other file, under
  `scripts/`, `test-kits/`, `tests/`, `db/`, `evidence/`, `apps/`, `src/` or anywhere else, imports `typescript` or any
  path inside it; a file of the same name in another directory is not this file.
- **Its parser API only.** The file imports `typescript`, `typescript/unstable/ast` and `typescript/unstable/sync`, and
  no other package, to read source files' syntax trees for the boundary guard. TypeScript 7's API does that by running
  the compiler's native binary, the one `tsc` runs in the same CI job, as a child process, and handing it the files
  from memory; the guard reads the trees it returns. It compiles, emits and runs nothing it reads, and it refuses to
  run under any `typescript` version but the one the root `package.json` pins (§4.2).
- **Run in CI.** The file is loaded only by `node scripts/verify-app-boundaries.mjs`, which CI runs with
  `--require-parser` in its `application` job. No test imports it, so `npm run check` still runs no dependency code
  (§2.1/4, §8/6).

Nothing else moves: `typescript` stays a §3.2 development dependency, no package is added, no name moves between §3.1
and §3.2, no other cell widens, and §3.2's rule that no development package is imported by code that runs in a
deployment stands. The copy in `scripts/app-dependency-allowlist.json` admits exactly that one path, read from the cell
by `parseWhereCell`'s "nowhere, except" form, which admits only backticked single files and refuses a glob or a
directory. `checkBoundaries` (`scripts/app-boundaries.mjs`) holds the cell over the application tree and
`checkRepositoryImports` over every other code file in the repository, so an import of `typescript` anywhere else
fails; the negative controls are in `test-kits/app-boundaries.test.mjs`, `test-kits/app-dependencies.test.mjs` and the
guard's own controls in `scripts/verify-app-boundaries.mjs`.

**Who presses.** The Owner's answer to the third question of the same call, `A0 กดได้เมื่อ 4 role ผ่าน (Recommended)`
(description: `ขยายสิทธิ์ที่ให้ไว้ให้ครอบคลุม amendment เรื่อง license นี้ใน PR skeleton เท่านั้น`), extends his
direction of 2026-10-11 (§10, note) to this amendment, travelling in the `WP-1A-A0-002` skeleton pull request only: A0 may
press that pull request once C0, A1, Q0 and R0 have passed on its final head and CI is green on it, with `RFC-2026-025`
§5 item 6's other conditions kept. The Owner's answer of 07:24:27Z says the same of the `typescript` widening above
(`ใน PR skeleton เดียวกัน และ A0 กดได้เมื่อ 4 role ผ่าน`), so the direction covers that widening too, as it travels in the
skeleton pull request only. It reaches no other amendment of this RFC.

## Note 2026-10-20 — Q-029-2 decided: Supabase Cron calls the dispatcher; who holds the caller's secret is open (WP-1A-A0-001)

Note 2026-10-20 (the text above, §2.8, §10 and Amendment 2026-10-12 included, is kept whole and is not changed by it).
Recorded by `/claude/a0_atlas` (A0) under `WP-1A-A0-001`, which owns this RFC. Measured on `main` at `0440c672`. The
Owner's words below are copied by script from the transcript of session `5ea77291`
(`~/.claude/projects/-Users-bank-ThinkBizThai/5ea77291-c263-4dfc-83e9-1d395eee5e51.jsonl`) and line-wrapped here; byte
for byte, with A0's reading, in `evidence/WP-1A-A0-001/product-owner-disposition-2026-10-20-rfc029-cron.md`.

**The decision.** Asked 2026-10-20T02:58:32Z (transcript record 913) and answered 03:00:37Z (record 914), header
`Q-029-2`, question `Q-029-2: dispatcher จะให้ Cron ตัวไหนเรียก?`; the Owner chose `Supabase Cron เรียก route ทุกนาที
(Recommended)`, described `ตาม D6 ในแผน 2026-10-08 Cron ระดับนาทีเรียก dispatcher route ที่ claim ด้วย lease
และจำกัดเวลาต่อรอบ`. Read Q-029-2 as **decided: a once-a-minute Supabase Cron calls the dispatcher route** in
`apps/worker`. The options he was shown and did not choose were `Vercel Cron` and `ยังไม่ตัดสิน`.

**What it supersedes, and what it leaves.**

1. **§10, Q-029-2.** The recommendation of Vercel Cron in the worker's project is not taken. "Decided by
   `WP-1A-A0-004`" is read as: decided by the Owner on 2026-10-20 and owed under `WP-1A-A0-006`, which writes the
   dispatcher route (`work-packages/WP-1A-A0-006.json` `open_blockers[9]` and `[14]`; C0-305-I4). `WP-1A-A0-004`'s own
   records still name it; correcting them is that package's record, not this note's. The 2026-10-11 paragraph's "Q-029-2
   … stay with the packages named above" is read the same way.
2. **§2.8, where the Cron's secret lives.** The sentence "The Cron's secret lives in the worker project's environment
   beside the worker credential, not in the web project" assumed a caller inside the worker's Vercel project. With
   Supabase Cron as the caller, the secret the caller presents is held outside that project, so the sentence is
   superseded by this note as far as the caller's copy goes; §10's remark that Supabase Cron "would need the secret
   stored in the database" is the open question below, not an answer to it.
3. **What stays.** The rest of §2.8 stands: `app.jobs` is the queue; the route is in `apps/worker`, its own Vercel
   project (§2.7/3); it authenticates the caller with a dedicated secret and nothing else, compared in constant time;
   an unset or empty secret refuses every call; it refuses on any Preview deployment; it claims jobs under a lease and
   stops within a time budget below the function's maximum duration. The secret stays apart from the worker credential:
   it authorises a call of the route, never a database login. The web project holds neither.

**Open: who holds the caller's secret.** Not decided by the Owner's answer and not decided here. The Owner's answer of
2026-10-20T07:20:50Z (header `RFC Cron`, below) has A1 propose it, and it is decided before the dispatcher increment
(the `WP-1A-A0-006` pull request that adds the route) begins. The realistic options, listed without a preference
(general knowledge, not measured):

- **Supabase Vault and a `pg_net` header.** The secret is stored in Vault; the `pg_cron` job reads it and sends it in a
  request header of a `pg_net` call to the route. To be answered: which database roles can read the decrypted secret,
  the job's command text and `pg_net`'s request and response records, and how it is rotated on both sides.
- **A Supabase Edge Function relay.** The Cron calls an Edge Function, which holds the route's secret among its own
  secrets and calls the route. To be answered: how the Cron authenticates to the relay (which is again a secret held by
  the caller), and what the relay adds to the path.
- **A signed short-lived token.** The caller presents a token minted per call (for example a signature over a
  timestamp) that the route verifies and refuses once expired, so a captured request replays only inside its window.
  To be answered: where the signing key is held, which is the same question for a different secret, and the clock
  window.

Each needs, for A1's reading: where the secret is kept, who can read it, how it is rotated, and what a reader of the
database learns. D6's per-round time budget and the lease length stay with `WP-1A-A0-006` (`open_blockers[9]`).

**Who presses.** Asked 2026-10-20T06:43:33Z (record 1341) and answered 07:20:50Z (record 1342), header `RFC Cron`,
question `RFC-029 ยังเขียนว่าใช้ Vercel Cron และเก็บ secret ไว้ใน env ของ worker แต่คุณเลือก Supabase Cron จะให้ทำ RFC
note อย่างไร?`; the Owner chose `A0 เขียน note ต่อท้าย RFC-029 แล้วกดเองเมื่อ 4 role ผ่าน (Recommended)`, described
`เพิ่ม note ต่อท้าย RFC แบบไม่แก้ข้อความเดิม บันทึกว่าใช้ Supabase Cron และให้ A1 เสนอว่าใครถือ secret ที่ใช้เรียก
dispatcher ทำก่อนเริ่ม increment ของ dispatcher`. A0 presses the pull request that carries this note once C0, A1, Q0
and R0 pass on its final head and CI is green on it, with `RFC-2026-025` §5 item 6's other conditions kept. It reaches
this note only, not any other amendment of this RFC.

**What it does not do.** It changes no rule, threshold, guard, test, CI step or allowlist entry, provisions nothing,
and binds no provider: the Cron job, the secret and the worker project are created only when the worker is provisioned
(§2.7/3, `WP-1A-A6-001`). **Rollback:** a reviewed revert removes the note; Q-029-2 then reads as §10 wrote it, and the
Owner's answer stays recorded in the disposition.
