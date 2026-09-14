# Batch 111 — the social foreign key, the deliverable §6's registry gives A0 by name

Run: `/claude/a0_atlas` (Author, and the owner §6 names: "111 | A0 Integration | 110,020,081 | business-channel/social FK | A0 only"). Date: 2026-09-15. Closes batch 081's withheld-key blocker and A1-081 **S3** (the cross-tenant reference the database accepted).

## 1. What the batch is

`db/foundation/migrations/111_social_fk.sql`:
- `social_accounts_scope_key unique (workspace_id, id)` on `app.social_accounts` — the scope key 110 did not need and this key does, in the shape every scope key in the schema has;
- `content_targets_social_scope_idx (workspace_id, social_account_id)`, the supporting index;
- `content_targets_social_scope_fk (workspace_id, social_account_id) → app.social_accounts (workspace_id, id)`, added NOT VALID then validated (invariant 2's shape; the column has held values since 081, so there is nothing to backfill and a database with orphans fails here by name);
- an apply-time block: the key exists over exactly those columns, validated, referencing `social_accounts`; it is the only key involving `social_account_id`; the index leads with the key's columns.

Composite over `workspace_id` because a social account belongs to a Workspace (110's own comment) and a target to a Business inside one — a target may name only a destination its own Workspace discovered. No ON DELETE action, stated as the refusal that makes somebody decide.

## 2. What it costs, and what 081 said it would

081 fixed three destination symbols that named no row and wrote: "Batch 111 must repoint all three, and the fixture will refuse to load until it does." Done:
- catalog: `content_target_destination_a1/a2/b1` retired; `social_account_a1/a2/b1` added, uuids by the catalog's own recipe (`uuid5(DNS, 'thinkbizthai.fixture.<symbol>')`, checked against `workspace_a`);
- 110's fixture fixes the ids it used to let default and loads a second `workspace_a` account (`ig`, its own hash) so one item can hold two destinations; the a/b pair keeps the shared hash and the static rule that pinned "two accounts, one hash" now pins three with the pair shared;
- 081's fixture's three literals repointed (including the pin re-read block); 42 case references renamed; the two static suites' symbol lists renamed; the README paragraph continued; the manifest blocker marked CLOSED with the original kept.

One case: `editor-a-cannot-aim-a-content-target-at-another-tenants-destination` — every policy admits the row (editor, own workspace, own narrowing) and the destination is `workspace_b`'s account held by its exact id — `rejected`, `sqlstate 23503`. Named without the word `social-account` because that is 110's control pattern.

## 3. Measured on the scratch PostgreSQL 17.11 (fresh cluster each time)

| | Result |
|---|---|
| **without 111** (everything else applied) | the fixtures load — the repointed destinations are real rows now — and the new case fails: `the database accepted the row (1 returned) and had to refuse it with 23503` — A1-081 S3, reproduced |
| with 111 | `applied 111_social_fk.sql`, apply-time block passed; `schema-lint` ok; **`845 isolation case(s) passed.`** = 844 + 1 |
| static suites | contract 58/58 (111 declared in the tail), identity 285/285 |

## 4. What is not done

- **The business-channel half of §6's row is not delivered** (C0-111 M2). §4 relation invariant 2 binds a social account to one active Business at a time; the binding it constrains (the ERD's `CHANNEL_BINDING`) has no table — 020 and 110 declined it, and so does this batch. 111 delivers the social key, the strongest reference that can be written without the binding; the binding stays owed to A0, and the manifest blocker on invariant 2 now says three batches have declined it.
- No case that a target survives its social account's deletion or not: no client holds DELETE on `social_accounts`, so the question is about a service sweep; the default NO ACTION is recorded as an open blocker (C0-111 L4), not only here.
- §6 row 120 (Publisher, `intent/target/job/post`) lists `080,091,100,110,050` — **not 111** — as its dependencies; A1-081 S3's second half asked for exactly that ordering and it is still absent from the registry. This file first said the opposite (C0-111 L3); the registry is `docs/**` and read-only to this package, so the sentence is owed to the registry's owner, not fixed here.
- **No lint holds a foreign key to a supporting index** (C0-111 M1): `run.mjs:76-78` says the live targets assert it and none does; C0 counted twenty-one keys without one. This batch indexes its own key; the rule is a blocker.
- Role runs: this batch gets its Reviewer, Tester and Security run before it merges, as the Owner's Q6 requires of every new batch.
