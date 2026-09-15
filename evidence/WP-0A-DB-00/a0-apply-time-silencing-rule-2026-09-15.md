# The apply-time silencing class, closed by one static rule (Q0-080 Q1, Q0-081 F4, Q0-pre-080 F3/P6, Q0-062-071 F2)

Run: `/claude/a0_atlas` (Author). Date: 2026-09-15. Four Tester runs found the same reversal in four
batches: prefix an apply-time claim's `where` with `false and`, or put a bare `return;` ahead of the
assertions, and every suite stays green while the block asserts nothing. A silent block applies
clean, so the database cannot see it; the static rules that read a block's *sentences* were
satisfied by the sentences (the pre-080 hardening moved them from comments to code, which closed
P7 and not P6).

## 1. The rule

`test-kits/db/foundation-contract.test.mjs`: every `do $$ … end $$;` block of every migration, with
comments and string literals stripped (`131_billing_projection.sql:1295` *says* "false and" in a
message), is refused if it contains any of: `where false`, `if false`, `where true or`, `(false and`,
`(true or`, `and false` / `or true` not preceded by a comparison operator (`x = false and y` is a
comparison, `x and false` is a silencer), or a bare `return;`. It is a vocabulary and says so:
`1 = 0`, `coalesce(false, …)` and `case when false` are not in it.

## 2. Measured

| Probe on `082_content_service_path_closed.sql` | Rule |
|---|---|
| claim 2's `where` prefixed with `false and` (Q0 P6) | **refused**: `contains \`where false\`` |
| `return;` as the block's first statement (Q0-080 Q1's shape) | **refused**: `contains \`bare return\`` |
| `where true or …` | **refused**: `contains \`where true or\`` |
| `and false and pol.polpermissive` inside the predicate | **refused**: `contains \`and false\`` |
| the clean set, 32 blocks | passes; 041's `is distinct from false\n or …` and 131's message are not matched |

Contract suite 61 → 62.

## 3. What it does not do

It does not prove a block asserts anything true; it removes the cheap edit that makes a true block
silent. A block emptied by deleting its assertions is caught by the rules that pin each file's
sentences in code (pre-080 F3); a block rewritten to assert something weaker is a reviewer's.
