# `content_targets_social_scope_fk` — what ON DELETE should say, laid out for the Owner (a memo, not a decision)

Run: `/claude/a0_atlas` (Author). Date: 2026-09-15. Answers blocker 161 (batch 111, C0-111 L4): the
key carries no ON DELETE action, so a target whose social account is deleted is refused by the
default NO ACTION — "the refusal that makes somebody decide rather than a decision". This file
changes nothing.

## 1. Who can delete a social account today

Nobody from the client: §8's matrices give no client DELETE on `app.social_accounts` (batch 110:
only `app_worker` and the owner hold anything, and the owner's is not DELETE). So the question is
about **a service sweep** — Meta disconnect (A6's connector), the retention batch (160), or a
workspace closure (§11.4) — not about a user pressing a button. Under NO ACTION every one of those
sweeps fails on the first account that still has a target, which is every account that was ever
used.

## 2. The four answers, against §4.6 and the target's own lifecycle

| Option | What a sweep sees | What the data says afterwards | Fits |
|---|---|---|---|
| **NO ACTION / RESTRICT** (today) | the account delete is refused while any target names it, deleted or not | nothing changes; the sweep must delete or repoint targets first, and there is no client DELETE on targets either (§8.5's `deleted_at` is the lifecycle) | honest, but it makes the disconnect sweep a three-table operation nobody has specified |
| **CASCADE** | the targets vanish with the account | the content item loses its publishing history silently; a target is the record that "this item was aimed at that account", and §4.6's "unique active target" is written over `deleted_at` precisely so that history survives | **does not fit**: it deletes what 081 made soft-deletable on purpose |
| **SET NULL** on `social_account_id` | the target stays, pointing at nothing | `social_account_id` is NOT NULL in 081 and every case addresses a target by `(content_item_id, social_account_id)` — SET NULL would need the column made nullable and the natural key rewritten | **does not fit** without rewriting 081, which invariant 1 forbids |
| **RESTRICT, and the sweep soft-deletes first** — the disconnect/retention batch sets `deleted_at` on the account's targets, *then* deletes the account, in one command | the account delete succeeds only after its targets are closed | the item keeps a `deleted_at` target as history (§4.6 over `deleted_at` still holds: no *active* duplicate); the account row goes; the key on a soft-deleted target still points at… a row that no longer exists — **so this option also does not work as stated** | — |

The last row is the honest finding of this memo: **a soft-deleted target still references the
account**, so any hard delete of an account is refused by RESTRICT/NO ACTION as long as the target
row exists at all, and the only shapes that let the account row go are CASCADE (loses history) or
SET NULL (needs the column nullable). Which means the real question is one level up:

## 3. The question under the question

**Are social accounts ever hard-deleted, or do they get `deleted_at` / a disconnected status like
everything else in this schema?** Batch 110 gives `social_accounts` a health/capability status
(INTEGRATION-2) and no `deleted_at`; RFC-2026-021/§5 retention treats disconnect as a state, not a
row removal, for the connector tables. If an account is never hard-deleted — disconnect is a status
change, retention purges *tokens* in `private`, and the row stays as the thing targets point at —
then **NO ACTION is not a gap, it is the correct answer**, and the blocker closes with a sentence in
110's or 160's contract: "a social account row is never deleted; disconnection is a status".

If the Owner wants accounts hard-deleted on workspace closure (§11.4), that closure already removes
the workspace's content items, versions and targets in a defined order; the key's action is
irrelevant there because the children go first by the closure's own plan, not by the key.

## 4. What A0 recommends the Owner say

**(a)** "A social account row is never hard-deleted except by workspace closure; disconnection is a
status. NO ACTION stands, and the sentence goes into the connector contract." — one line in a
document, no migration, and the blocker closes. This is A0's recommendation.

**(b)** "Accounts may be hard-deleted by the retention sweep." — then 160 must soft-delete targets
*and* the key must be SET NULL with `social_account_id` made nullable in a forward migration, and
the natural key of a target rewritten. That is a real batch and a real decision about what a
target *is*.

Either way, CASCADE is not on the table: it deletes the publishing history 081 preserved on purpose.
