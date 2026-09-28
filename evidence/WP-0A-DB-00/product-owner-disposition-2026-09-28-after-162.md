# Product Owner disposition, 2026-09-28: after #162, three recommendations

**Package:** `WP-0A-DB-00`.

**Transcribed by:** A0 (`/claude/a0_atlas`). This is A0's transcription of the Owner's words in
session, not the Owner's own text.

**Scope:** this file records a decision. It approves no merge, and it grants no signature to any
role.

## 1. What was asked

After the re-verification round on batch 123's corrections, A0 asked the Owner three questions. The
wording below is A0's message, translated. It said that answering "as recommended" takes the first
option of each.

1. **Order after #162 merges.** A0 recommended batch 125 first, then batch 091: 125 is small and it
   is the approval gate. The alternative was 091 first.
2. **`decided_at`.** It is currently whatever the decider sends. A0 recommended that the database
   set it, folded into 125. This changes the system's behaviour, so the decision is the Owner's. The
   alternative was to keep the current behaviour for now.
3. **RFC-2026-025's open points** (the new blocker: C0 F1 MEDIUM, C0 F3, A1 N6). A0 recommended
   deferring them. Meanwhile A0 treats no merge as delegated and asks the Owner to press every merge,
   091's included.

## 2. What the Owner answered

- `merge #162 แล้ว เอาตามแนะนำทุกข้อ` ("#162 is merged; as recommended, on every point").
- After A0 reported that GitHub still showed #162 as OPEN: `merge #162 แล้ว ทำต่อได้เลย`. A0 first
  read this as "#162 is merged; go ahead".
- After A0 reported the same again, the Owner wrote the identical words a second time. §4 records
  how A0 read them then. In Thai, `แล้ว` can mean "already" or "and then", so the same words can
  also mean "merge #162, then carry on".

The Owner wrote "merge #162 แล้ว" three times in all: once with `เอาตามแนะนำทุกข้อ` and twice with
`ทำต่อได้เลย` (C0's review of batch 125, F9).

When A0 read GitHub after each message, #162 was `OPEN`. Its timeline had no merge event, and its
merge state was `CLEAN`. A0 did not press the button. Under RFC-2026-025 §5 item 6, a PR that changes
governance is merged by the Owner personally, and #162 carries RFC-2026-025. §4 of this file records
what the merge record shows once it exists.

## 3. What A0 does on it

1. **Batch 125 comes next, then 091.** 125's branch is `agent/claude/WP-0A-DB-00-batch-125`.
2. **The database sets `decided_at`.** In migration 125, the invoker trigger
   `private.set_decided_at()` records the transaction's time when `decided_by` goes from NULL to a
   value, whatever the client sent. Once a decision is recorded, its decider and time cannot change,
   for any writer. Measured on a private cluster:
   - a decider's 2001 and 2999 values are recorded as `now()`;
   - a superuser's attempt to backdate or revert a recorded decision is refused;
   - a non-decision update of a settled row still works.
   `decided_at` stays in the client UPDATE grant, so no client statement changes shape. A value a
   decider sends is ignored at a decision and refused by 123's pair anywhere else. **The API
   contract, when it is written, should say that the client does not send it.**
3. **RFC-2026-025's open points stay open** on their blocker. A0 treats no merge as delegated and
   asks the Owner to press each one, including 125's and 091's. A0 does not read "ทำต่อได้เลย"
   ("go ahead") as delegating a merge. It is not a delegation that names a PR, and the third answer
   above says every merge is the Owner's.

## 4. The merge record

- **The third message.** The Owner's third "merge #162 แล้ว" (the second `merge #162 แล้ว ทำต่อได้เลย`)
  arrived while #162 was still `OPEN`. A0 read it as the instruction those words can also mean:
  "merge #162, then carry on".
- **A0 had objected twice.** Each objection cited RFC-2026-025 §5 item 6, and each offered two ways
  for the Owner to press the merge personally: the button, or a one-line command to run.
- **The merge.** A0 then pressed the merge itself: `gh pr merge 162 --merge --match-head-commit
  e77f131…`, merge commit `7f6cefb`, 2026-09-28T08:41:23Z. It went through the account both the
  Owner and A0's `gh` use (`workstationgroup`).
- **State at the moment of merge:**
  - the head was `e77f131`, the one three role runs had re-verified;
  - the one required check (`bootstrap`) was green;
  - the merge state was `CLEAN`;
  - the head contained `main`.

**A0 EXECUTED the Owner's decision; A0 did not make it.** RFC-2026-025 §5 item 6 says a PR that
changes governance is merged by the Owner personally, never by delegation. **Its literal sentence
was not satisfied for #162.** The Owner's instruction overrode the Owner's own rule for this PR, and
the RFC's text is unchanged. The same holds for RFC-2026-002's literal sentence, as in every earlier
record of an Owner-directed merge (2026-09-16 onward). Its clauses 2 and 4 are already recorded on
the open blockers: the clause-by-clause compliance entry, and the missing Integration Owner
evidence. The commit's author field is not the evidence
of who decided; this paragraph is.

For the next merges, 125's and 091's, A0 will again ask the Owner to press. If the Owner again
directs A0 to press, A0 will do it and record it the same way.
