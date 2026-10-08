# WP-1A-A0-001 — the Owner's words of 2026-10-08 on the G1/G2 plan, and what this package takes from them

Recorded 2026-10-08 by a subagent of `/claude/a0_atlas` (A0), the Author of `WP-1A-A0-001`. This is a
record of words and of A0's reading of them. It approves nothing and is not a role verdict.

## 1. The words

On 2026-10-08, in chat, the Owner answered A0's G1/G2 plan with, verbatim:

> รับตามแนะนำทั้งหมด รวม RFC-030 ด้วย ลุยเลย

A0's translation: "Accept everything as recommended, including RFC-030. Go."

**How this record got them.** This subagent did not see the chat. The words reached it quoted in the brief
the A0 run wrote for it, together with the plan's path. The plan is a file outside the repository,
`.claude/g1-g2-plan-2026-10-08.md` in the Owner's working copy. It was written against `origin/main` at
`bd019c9c` (PR #211). Because it is not in the repository, a reviewer cannot read it from a clone. §2 lists
the parts this package relies on, so that the reliance can be checked against the RFC itself.

The same brief relays two earlier delegations: `เอาตามที่คุณแนะนำทุกอย่าง` ("everything as you recommend")
and, on the night of 2026-10-06, `คืนนี้คุณยิงยาว เหมือนเดิมเบย ไม่ต้องถามผม ไล่ทำไปทั้งคืน` ("go long
tonight as before, don't ask me, work through the night"). Neither changes who merges a governance PR:
`RFC-2026-025` §5 item 6 reserves that to the Owner personally.

## 2. The recommendations accepted, as far as this package uses them

| Plan item | Recommendation (A0's summary of the plan's §1.3) | Where RFC-2026-029 states it |
|---|---|---|
| D1 | Next.js App Router + TypeScript `strict`, checked by `tsc --noEmit` in CI; RFC-2026-029 with a dependency allowlist, a lockfile policy and `npm ci --ignore-scripts` | §2.1, §2.2, §3, §4 |
| D2 | Vercel Pro, region `sin1`; no Preview connects to the production database; function duration measured before D6 is relied on (marked as A0's inference in the plan; the mark follows the Preview clause and is read as covering the row) | §2.4 (tightened to every environment's database) |
| D3 | Supabase `staging` and `prod`, both `ap-southeast-1`; Preview on the Postgres container and fakes; no branching in G1 (marked as A0's inference in the plan) | §2.5 |
| D4 | Email OTP first; Google is P1; no LINE Login | §2.6 |
| D5 | the service-role key is refused; the request path uses supabase-js with the user's JWT and command functions; the worker uses RFC-2026-028's login role through a direct or session-mode connection until Q-028-12 | §2.7 |
| D6 | `app.jobs`/`app.outbox_events` as the queue, no pgmq; a once-a-minute Cron calls a dispatcher route that claims under a lease (A0's inference in the plan) | §2.8 |
| D9 | Sentry with default PII off and server-side scrubbing; a PRV-001 subprocessor entry | §2.10 |
| D11 | polling in G1/G2, no `postgres_changes` until an RFC | §2.9 |
| D12 | Tailwind + shadcn/ui; A5 proposes the Thai typeface (A0's inference in the plan) | §2.3 |
| §3 row `WP-1A-A0-001` | RFC-2026-029: Next.js/TS strict/tsc, dependency allowlist, lockfile, layout `apps/web` + `src/modules/<key>` per the MOD registry, `db/foundation/migrations` kept as the source, no duplicate `supabase/migrations` (the last marked as A0's inference); acceptance "Owner อนุมัติ, `npm run check` ยังเขียว" (the Owner approves; `npm run check` stays green) | the whole RFC; §6 |

D0, D7, D8, D10, D13 and D14 were accepted in the same words and are **not** used here. RFC-2026-029 §11
names each one, so that its silence is not read as a decision.

## 3. What the words do and do not do here

1. They direct that RFC-2026-029 be written, and they settle its substance: each row above was a choice the
   Owner was asked to make, and the Owner made it.
2. They do not approve RFC-2026-029's text, which did not exist when they were given. The RFC is a
   governance change, because it decides dependencies, the lockfile and the application tier's language.
   Its approval is the Owner's personal merge of the pull request that carries it (`RFC-2026-025` §5 item 6).
   The A0 run was told to open that pull request as a Draft and not to merge it.
3. "รวม RFC-030 ด้วย" refers to the plan's §7.2 item 7, a proposed "risk-tiered review" RFC. That RFC is
   another package's work. Nothing here depends on it, and nothing here applies it.
4. The plan places `WP-0A-A0-010` (the G0 exit record, D0) before this package. That package does not exist
   on `main` at `bd019c9c`. This package goes ahead because writing an RFC binds no provider and installs
   nothing, so it is within CONTRIBUTING_AGENTS.md § Current gate constraint. The plan's ordering is kept
   where it matters: RFC-2026-029 §7 makes provisioning wait for the G0 exit record.

## 4. Corrections in the review round, 2026-10-08

Made by the A0 run in answer to the first role verdicts at `7d2c430c`; recorded in
`evidence/WP-1A-A0-001/a0-closure-2026-10-08.md`.

1. The D2 row above now carries the plan's **[อนุมาน]** mark and the plan's "Pro" tier, which the first
   version of this table left out although §2 of RFC-2026-029 promised to carry every such mark (C0 F5,
   Q0 Q4, R0 R7). The plan places the mark after D2's Preview clause; whether it covers the whole row or
   that clause alone is ambiguous in the plan itself, and the wider reading is the one recorded.
2. RFC-2026-029 §2.7/3 now puts the dispatcher and the worker credential in a separate deployment,
   `apps/worker`. The plan's D6 and §3 rows do not say which deployment holds the dispatcher, so this is
   A0's addition in review, answering A1 F1 against the approved condition of `RFC-2026-028` §3.3/2; it is
   marked as such in the RFC, and the Owner's merge is what approves it.
3. RFC-2026-029 §7 now waits for `WP-0A-A0-010` for every package it lists, which is the order the plan's
   §3 table gives (`WP-1A-A0-001` depends on "D1, A0-010"); §3 item 4 above, which kept the plan's order
   for provisioning only, is superseded by that (R0 R3).
