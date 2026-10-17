# Product Owner disposition — the CI test refuses `shell:` and writes to `$GITHUB_ENV`/`$GITHUB_PATH` in the application job (2026-10-17, session `325454ab`)

Recorded for A0 (`/claude/a0_atlas`, the Author), drafted by an author subagent of that run, on WP-0A-A0-004, the
package that owns `.github/workflows/ci.yml` (`ownership.writable_paths`) and that changed the application job's test,
`test-kits/app-stack.test.mjs` (WP-1A-A0-002's file), in PR #279 under `ownership.amends_without_owning`. A0's question and
the Owner's answers below are copied by script from the raw transcript of session `325454ab`
(`~/.claude/projects/-Users-bank-ThinkBizThai/325454ab-eb14-4597-afd3-75b6b8c78ee8.jsonl`, lines 6128, 6137 and 6355) and
checked byte for byte against them by script. Times are the transcript's stamps (UTC), not a clock read. Everything
marked "A0's reading" is A0's, not the Owner's. This is a record of the Owner's words and of A0's reading of them: it is
not a role verdict, approves nothing, and moves no status on A0's behalf. It is modelled on
`evidence/WP-0A-A0-004/product-owner-disposition-2026-10-17-rfc-007-f-note.md`, whose §6.2 first recorded question 2
for PR #283; this file records it again for the pull request that carries the item, as that §6.3 item 2 says each must.

## 1. Why it was asked

- **A1-279-3** (Info; `evidence/WP-0A-A0-004/a1-review-2026-10-16-pr279.md` §4): `shell: bash {0}` (no `-e`) on a
  multi-line step of the application job makes its first line's failure ignored, and no test refuses a `shell:` key; A1
  named the fix "refuse `shell:` (and job-level or workflow-level `defaults.run.shell`) in the `application` job".
- **Q0-279r2-2** (Info; `evidence/WP-0A-A0-004/q0-reread-2026-10-16-pr279.md` §2): the A1-279-2 pin reads YAML keys,
  not shell, so `echo "npm_config_workspace=apps/web" >> "$GITHUB_ENV"` in a `run: |` block before the audit passed
  every test, and npm reads that variable in every later step.
- Both were recorded as owed in PR #279's handoff `known_limitations`, outside the Owner's item for that pull request,
  and carried by C0, Q0 and R0 in rounds two to four. A change to the CI test is a governance pull request
  (RFC-2026-034 §2.2: CI and the guards and runners it uses), which RFC-2026-025 §5 item 6's last bullet has the Owner
  merge personally unless he directs otherwise. A0 asked who presses before the pull request existed.

## 2. A0's question and the Owner's answers (verbatim)

The question is the second of a two-question `AskUserQuestion` call at transcript line 6128 (tool use id
`toolu_01DZR9JF1Tc9J8FW2qMqvf7D`, stamped `2026-10-17T11:53:13.702Z`); its answer is the tool result at line 6137 (stamped
`2026-10-17T11:53:17.372Z`). Lines 6129 to 6136 are session metadata records; no message lies between. The chosen label is parsed from
the tool result's own text and agrees with its structured `answers` field.

Question 2, verbatim:

```text
ต่อจากนี้ PR governance ที่เหลือ (ปิดช่องว่างในเทสต์ CI: A1-279-3 `shell:` และ Q0-279r2-2 `$GITHUB_ENV` · แก้ถ้อยคำ `--omit=dev` ใน RFC-029 §4.6 และ WP-1A-A0-002) จะให้ใครกด?
```

Its header, verbatim:

```text
gov ที่เหลือ
```

Its three option labels, verbatim, in order:

```text
A0 กดทีละ PR เมื่อ 4 role ผ่าน (Recommended)
```

```text
ผมกดเองทุกตัว
```

```text
ยังไม่ต้องทำ
```

The label the Owner chose, verbatim, with its description verbatim:

```text
A0 กดทีละ PR เมื่อ 4 role ผ่าน (Recommended)
แต่ละ PR ต้องผ่าน C0, A1, Q0 และ R0 บน head สุดท้าย และ CI เขียวทั้ง 2 job · ถ้ามี security finding ค้างจะไม่กด
```

A0's translation of the question: "From now on, who presses the remaining governance PRs (closing the gaps in the CI
tests: A1-279-3 `shell:` and Q0-279r2-2 `$GITHUB_ENV`; fixing the `--omit=dev` wording in RFC-029 §4.6 and
WP-1A-A0-002)?" Of the header: "remaining gov". Of the options: "A0 presses one PR at a time when the 4 roles pass",
"I press every one myself", "Not yet". Of the chosen option's description: "each PR must pass C0, A1, Q0 and R0 on the
final head and CI green on both jobs; if a security finding is left open it is not pressed".

Later the same day A0 reported the state of PR #282 and PR #283 and listed its queue (transcript line 6351, stamped
2026-10-17T12:23:14.910Z, not quoted here); its item 3 named the two governance pull requests the Owner had allowed A0
to press, the CI test for `shell:` and `$GITHUB_ENV` among them. The Owner's next message, at transcript line 6355
(stamped `2026-10-17T12:24:40.564Z`), whole:

```text
ลุยต่อเลย ไม่ต้องหยุดถาม
```

A0's translation: "Press on, no need to stop and ask."

## 3. What it directs

A0's reading, bounded to the item A1-279-3 and Q0-279r2-2 name:

1. One governance pull request, on this package's branch `agent/claude/WP-0A-A0-004-ci-independent-guard-step`, that
   makes `test-kits/app-stack.test.mjs` fail when (a) the token `shell` or `defaults` appears on any line of the
   application job (its own lines, its steps' keys and its `run: |` bodies), when the workflow's top level holds a key
   other than `name`, `on`, `permissions` and `jobs`, or when the job uses a YAML form that could spell a key without
   its letters (A1-279-3); and (b) the token `GITHUB_ENV` or `GITHUB_PATH` (or the runner's `_runner_file_commands`,
   `::set-env`, `::add-path` or `ACTIONS_ALLOW_UNSECURE_COMMANDS`) appears on any line of the application job, in any
   letter case (Q0-279r2-2). Each is closed as a class, by token, not by listing spellings, with its residual stated
   in the test's comment in this first round, and with negative controls on crafted `ci.yml` variants beside the
   assertion that `main`'s `ci.yml` passes.
2. It changes no line of `ci.yml`, no classifier, no other guard and no other test, and no test name, so the test
   count, the name digest and `scripts/test-suite-contract.mjs` are untouched (the checks are added inside the two
   existing tests that hold the A1-279-2 environment pin and the A1-270-2 soft-failure reading). Besides the test it
   changes this package's records only: this file, the manifest (`required_human_authorities`, `acceptance_criteria`,
   `required_tests`, `ownership.amends_without_owning`), the author handoff, and the regenerated
   `test-kits/integrity-manifest.json` digests.
3. A0 presses it only after C0, A1, Q0 and R0 pass on its final head, CI is green on both jobs (`bootstrap`,
   `application`) there, no security finding is left open against it, and the head contains current `main`.

It is not a standing delegation. The `--omit=dev` wording (RFC-2026-029 §4.6, WP-1A-A0-002), the other item question 2
names, is not this pull request's.

## 4. RFC-2026-025 §5 item 6

RFC-2026-025 §5 item 6 reads, in its third bullet, "The delegation must be given after the PR it names exists, or must
name its sequence explicitly.", and in its last, that a PR changing governance (an RFC, `CONTRIBUTING_AGENTS.md`, CI or a
gate) is merged by the Owner personally, never by delegation. A0's reading of the answers against both:

1. **An exception to the last bullet, for this pull request only**, in the form PR #211, PR #212, the lane-walk fix,
   PR #270, PR #279, PR #280, PR #281 and PR #283 received one: the Owner was shown `ผมกดเองทุกตัว` ("I press every one
   myself") and chose the option in which A0 presses, one pull request at a time, after the four roles pass.
2. **The third bullet, by naming the item before the pull request existed.** The answer was given at
   2026-10-17T11:53:17Z, before this pull request existed, to a question that names its content: A1-279-3 `shell:` and
   Q0-279r2-2 `$GITHUB_ENV`, the CI-test gaps. A0 reads that as naming its sequence explicitly: one pull request for
   that item. The message of line 6355 adds no new authority; A0 reads it as the Owner's direction to carry the queue
   through without stopping to ask, the press conditions of the line 6137 answer unchanged.
3. **The other conditions are kept:** current `main` in the head when pressed (the first bullet), no security finding
   of any grade open (the second; the chosen description says the same), the Integration Owner's verdict (the fourth;
   R0 among the four roles), and green CI on both jobs on the final head.

## 5. What it does not decide

- Whether the checks are right and whether the residual is acceptable: C0's, A1's, Q0's and R0's reading.
- Any change to `ci.yml`, a classifier, `scripts/test-suite-contract.mjs` or any other guard or test.
- The bootstrap job's `shell:` or `$GITHUB_ENV`: A1-279-3 and Q0-279r2-2 named the application job, and a job's
  environment file reaches only that job's later steps.
- The `--omit=dev` wording item; the R0 acknowledgements owed for #270, #255, #260 and #279.
- WP-1A-A0-002's acknowledgement of this amendment to its test file, owed from its Integration Owner
  (`/claude/r0_steward`).

## 6. Records

`work-packages/WP-0A-A0-004.json` `required_human_authorities` gains one entry at the end, gov-a004g, citing this file;
every earlier entry, gov-a004f included, is kept byte for byte (the field is append-only under
`scripts/db/classify-records-only.mjs` `appendedEntriesOnly`). `acceptance_criteria` and `required_tests` each gain one
INCREMENT entry at the end; `ownership.amends_without_owning.paths` names `test-kits/app-stack.test.mjs` again, its
rationale prefixed with this increment and the earlier text kept after it.

## 7. Addendum 2026-10-17: round 2 after A1's reading of PR #287

Appended after A1's `changes_requested` at `069a537d` (`evidence/WP-0A-A0-004/a1-review-2026-10-17-pr287.md`, on A1's
role branch): A1-287-1 (Low; a `#`-led line inside a block-scalar body, or inside a quoted scalar that spans lines, is
content the line reading dropped), A1-287-2 (Low; `container:`, `services:` and env keys such as `BASH_ENV` and `PATH`
reach the same effects without either token), A1-287-3 (Info; a `${{ }}` expression can assemble the token). §1 to §6
stand as written. A0's reading: closing them is inside the item §3 bounds (the CI-test gaps A1-279-3 and Q0-279r2-2),
in the same two tests of `test-kits/app-stack.test.mjs`, with no `ci.yml`, classifier, other guard or other test change
and no test added or renamed. What §3 item 1 says is read is now stated exactly in the test's comments: the lines of the
application job as `ci.yml` lays them out, `#`-led block-body lines included, YAML comments outside block bodies left
out; quoted scalars spanning lines are refused, and the job's keys are held to allowlists pinned to `main`'s `ci.yml`.
The press authority (gov-a004g) and its conditions are unchanged; A1 re-reads.

## 8. Addendum 2026-10-17: round 3 after A1's round-2 reading of PR #287

Appended after A1's `changes_requested` at `f38db9c9` (`evidence/WP-0A-A0-004/a1-review-2026-10-17-pr287-r2.md`, on
A1's role branch): A1-287r2-1 (Low) found that a `run:` body line writing a file later steps or tools read (npm's user
or project configuration, a runtime `.npmrc`, an executable shadowing a command on `PATH`) reaches the env/PATH effect
naming neither token, and that the stated residual did not say so. A0 took A1's first option, inside the item §3
bounds: one residual sentence naming that class, in the test's comment, the PR body, the gov-a004g acceptance entry and
the handoff, held by the review of every `ci.yml` change and A1-257-4's step-list pin. No code changes in this round;
§1 to §7 stand as written. The press authority (gov-a004g) and its conditions are unchanged; A1 re-reads.
