# A5 re-read of C-1 and C-2 for CTR-NTF-001 (WP-0A-CON-006), 2026-10-10

- **Reader:** `/claude/a5_loom`, acting as A5 (Loom), owner of CTR-NTF-001, with the authority and limits of my
  assessment (`evidence/WP-0A-CON-006/a5-ntf-assessment-2026-10-10.md`, carried on this branch as `dce27479`, a
  cherry-pick of `96d08f35`; `git diff 96d08f35 dce27479` is empty [measured]).
- **Head read:** `agent/claude/WP-0A-CON-006-stale-blockers` at `936812a3a700e2273c01c6bf6b35e04ec388add7`, local
  [measured: `git rev-parse` gives that SHA; `git ls-remote --heads origin` prints nothing for the branch]. Base
  `origin/main` `9d0751ec`. Commits between them: `dce27479` (my assessment), `aab9a165` (C-1 applied), `936812a3`
  (Vercel disclosure) [measured: `git log --oneline 9d0751ec..936812a3`].
- **Probes:** outside the repository, in `$SP/a5-reread-probes/`: `c1.mjs` SHA-256
  `f388f6520a493e87c8958550558777c87493235d2a6a1308833e5278b5ea44b3`, its output `c1.out`
  `e549867012c2a1ac02c8ccbed9f1d8ebfa2e168362c1145aeebf0a8df5830ae4` [measured]. Source and output in Appendix B.
  Node v24.20.0 [measured].

## Result

| Item | Finding |
|---|---|
| **C-1** | **Met** for A0's application and for my re-read. Every changed text is mine, word for word, and nothing else in the contract's parsed content changed [measured, §2]. One byte-level re-encoding outside my texts, with the same value, is recorded as O-1. A1's, C0's and Q0's re-reads, which C-1 also names, are not on this branch [measured, §4]. |
| **C-2** | **Met** for my part. I re-measured: Supabase, Microsoft 365, Gmail and Cloudflare read `disabled`; Vercel reads `connected` [measured, §3]. I **accept** the Vercel disclosure as meeting C-2, for this session only (§3.2). A1's acceptance, which the Owner's second answer also requires, is not mine to give. |
| **C-3** | **Not met** on this head: no Q0 re-read of my assessment is on the branch [measured, §4]. It is Q0's to meet. |
| **Signature** | **Stands** on this head, as given: RATIFY WITH CONDITIONS, for Candidate only (§4). |

## §0. Who I am (same lineage)

- I am `/claude/a5_loom`, a Claude Code subagent, vendor Anthropic, model `claude-opus-5-5` [read: my own system
  context]. I was spawned by `/claude/a0_atlas` (A0) [read: the brief, line 3: "From A0 (`/claude/a0_atlas`), who
  dispatches you and who wrote CTR-NTF-001"].
- **Same lineage.** A0 wrote CTR-NTF-001 and, in `aab9a165` and `936812a3`, applied my decisions and wrote the profile
  disclosure I am asked to accept. I share A0's vendor and model. The Product Owner accepted same-lineage
  ratification on condition of this disclosure and of A1, C0 and Q0 re-reading the result [read:
  `evidence/WP-0A-A0-001/product-owner-disposition-2026-10-09-ntf-a5.md` Q4, as cited in my assessment §0]. I disclose
  it; I do not claim it is cured. In particular, a same-lineage reader accepting a disclosure written by the author is
  the weaker control the disposition names, which is why A1's acceptance of it is required too.
- I hold no Author, Reviewer, Tester, Integration Owner, Product Owner, merge or Gate G0 authority. I edited no
  contract, test, schema, fixture, manifest or profile. I wrote one file, this one, in my own worktree.
- Tools I called in this run: shell and file reads, and one read-only connector status listing
  (`session_connectors_status`). I called no Vercel, Notion, Figma, Claude Docs or other connector tool [measured:
  my own tool calls in this run].

## §1. Sources read

| Source | Used for |
|---|---|
| The brief, verbatim in Appendix A | scope |
| My assessment at head, SHA-256 `54f11874…cd1c` [measured, `c1.out` line 1] | the texts C-1 must carry; C-2 as I set it (§0.1, §5) |
| `contract-catalog/shared-kernel/ctr-ntf-001/{manifest,schema}.json` at `9d0751ec` and `936812a3` | C-1 |
| `test-kits/contracts/catalog-registry.test.mjs` diff and `annotationsOf` (`:481-493`) | the pins |
| `evidence/WP-0A-CON-006/product-owner-disposition-2026-10-10-a5-c2-connectors.md` | C-2 |
| `.agents/capability-profiles/cc-a5-loom.json` diff `9d0751ec..936812a3` | C-2 |

## §2. C-1, measured

**Scope of the change.** `git diff --stat 9d0751ec 936812a3 -- contract-catalog/` lists two files,
`ctr-ntf-001/manifest.json` and `ctr-ntf-001/schema.json`, one line each [measured]. No fixture, no other contract.
`936812a3` does not touch the contract: manifest and schema hash the same at `aab9a165` and `936812a3` [measured]:

| File | `9d0751ec` (what I assessed) | `aab9a165` = `936812a3` |
|---|---|---|
| `manifest.json` | `4177c792…4675` | `09b16677a4be8d62e7ba98870cf23fd7483c23142f4fd156e9bf49d1d7a434b7` |
| `schema.json` | `925c502d…014e` | `8abf309579cdf14cae9c404c62fe57a2d9df2e670f49068ea256a38d4e3f86e3` |

**Method.** `c1.mjs` takes my texts **from my assessment file at the head**, mechanically (the quoted item (5) at
`:264-272`, item (6) at `:305-311`, the four quoted replacement strings at `:297-303` and the five at `:313-319`),
not retyped. It applies them to the **base** contract to build the expected head, then compares the expected head
with the actual head. Each "old" text must occur exactly once in the base, or the probe stops. Output, Appendix B.

**What it shows** [measured, `c1.out`]:

1. **Manifest.** The only field that differs base → head is `untestable_by_schema`. Expected → head: no field
   differs. Item (2)'s and item (3)'s old texts each occur once in the base and are replaced by my words. Items (5)
   and (6) appear verbatim, each after a single space, after item (4), which was the last item at the base (the base
   field contains no "(5) "). Key order is unchanged, and the head file's bytes equal the compact serialisation of
   the expected manifest plus a newline, as the base's did.
2. **Schema.** Leaf paths that differ base → head: exactly `properties.notification_id.x-bound-note`,
   `properties.dedupe_key.x-bound-note` and `properties.dedupe_key.x-pii-shape`. Expected → head: none. My appended
   sentence in `dedupe_key.x-bound-note` follows the base text after a single space. With every `x-` key removed,
   base and head are deep-equal: no constraint moved.
3. **Pins.** Recomputed independently: `untestable_by_schema` digest `78c774aedcb5bdbc` → `dfe65f16b2f36949`, and
   annotations (the test's own definition: `x-` keys plus `description`/`title`) count 20 → 20, digest
   `6676c9e55382b076` → `d41ba1c066871f44`. These are the "was" and new values in `catalog-registry.test.mjs`
   [read: head `:325`, `:460`]. `node --test test-kits/contracts/catalog-registry.test.mjs
   test-kits/contracts/schema-mutation-coverage.test.mjs test-kits/contracts/shared-kernel-envelope-contracts.test.mjs`
   → 44 pass, 0 fail [measured].
4. **My assessment probes still hold.** `probe.mjs` and `probe2.mjs` (hashes as in my assessment, unchanged
   [measured]) run against this head print output byte-identical to the output recorded in my assessment §2
   [measured: `diff` of the recorded blocks, extracted from the file, against the new output: no difference, 57 and 10
   lines].

**O-1 (observation, not a C-1 failure).** The schema file's **bytes** changed in one place outside my three
annotations. At the base, the six Thai characters in `properties.delivery.x-source` were written as `\uXXXX`
escapes; at the head they are written as raw UTF-8 (6 escapes at base, 0 at head) [measured]. The base with its
escapes decoded equals the compact serialisation of the base, and the head equals the compact serialisation of the
expected head [measured], so this is a re-serialisation, and the **value** of `delivery.x-source` is unchanged (it is
not among the differing leaf paths). I accept it: no consumer of the parsed document can see it, and the annotation
digest, which reads parsed values, is unaffected by it. I record it because "nothing else changed" holds for content,
not for bytes.

**C-1 verdict.** A0 applied OD-2 and OD-4 exactly. My re-read is done. **Met** as to A0 and A5.

## §3. C-2, re-measured

### §3.1 The session's connectors

`session_connectors_status`, the harness's read-only connector listing, at about 2026-10-10T12:14Z (`date -u` run
straight after read `12:15:16Z`) [measured]:

| Connector | Status | Tools |
|---|---|---|
| Supabase | `disabled` | — |
| Microsoft 365 | `disabled` | — |
| Gmail | `disabled` | — |
| Cloudflare Developer Platform | `disabled` | — |
| **Vercel** | **`connected`** | 238 |
| Notion | `connected` | 49 |
| Figma | `connected` | 41 |
| Claude Docs | `connected` | 8 |
| visualize | `connected` | 2 |
| scheduled-tasks | `connected` | 6 |

Consistent with it, my tool list in this run names Vercel tools including `get_project_env`, `filter_project_envs`
and `get_shared_env_var`, and no Supabase, Microsoft 365 or Gmail tool [read: my tool list]. I called none of them.
Whether the Vercel tools return secret values, and whether the Vercel projects hold any, is **not determined**.

So, against the two halves of my C-2 (assessment §0.1):

- `unavailable_tools` "external notification provider accounts (LINE, email, SMS, push)": with Microsoft 365 and Gmail
  off, the email and chat connectors I measured are gone from this session, so the entry is true as written for this
  session. No profile change is needed for it.
- `unavailable_tools` "any production database or provider credential" and `can_access_external_secrets: false`: with
  Supabase off, the SQL connector is gone. Vercel remains, so for Vercel these are not facts of the tools. That is
  what the disclosure addresses.

### §3.2 The Vercel disclosure: accepted, for this session

I read `limitations.external_connectors_disclosure` in `cc-a5-loom.json` at the head [read]. It states that the
Vercel connector is present in the harness, that this run is forbidden to use it and did not use it for the A5
assessment, that `can_access_external_secrets: false` is "for Vercel, a policy prohibition rather than a fact of the
tools", and that `unavailable_tools`' credential entry is read the same way. No capability value changes.
`node scripts/validate-capability-profiles.mjs` exits 0 at the head [measured]. Each factual sentence in it about my
run is correct: I did not use Vercel in the assessment [read: assessment §0.1] or in this re-read [measured, §0].

**I accept it as meeting C-2.** My reasons:

1. What C-2 sought was that the profile my signature rests on not tell a reader that something is unavailable when
   it is present. The disclosure says, in the same file and naming the field, that the Vercel connector is present
   and that `false` is a prohibition for it. A careful reader of the profile is no longer misled.
2. The route I asked for (`false` → `true`) is barred by the capability schema's `const: false` and the validator
   (exit 67) [read: the Owner's disposition, "Context put to the Owner"]. Changing that rule needs an RFC, which the
   Owner declined; it is not mine to override.
3. The other four connectors were turned off, so the disclosure covers one connector, not five, and the one it
   covers was not used.

**Limits on this acceptance**, which I state rather than turn into new conditions:

- **This session only** (`c2816eec`), as measured above. The Owner's answer "covers this session" [read: the
  disposition, last section]. The disclosure's sentence "Supabase, Microsoft 365, Gmail and Cloudflare are turned off
  for the session" will read as current in any later session where they are on; a later A5 run must re-measure
  before relying on the profile.
- A reader of the boolean alone is still misled for Vercel. That residual is the cost of option (ก), shown to the
  Owner, and I accept it.
- **Not raised before, observed now:** Notion (49 tools) and Figma are connected and can write to external
  workspaces. They are not secret, database or notification-provider access in the sense of the profile's fields,
  and they were connected when I set C-2 [read: assessment §0.1], so I do not add them to C-2. Whether any profile
  field should mention them is **not determined**.

**C-2 verdict.** Supabase, Microsoft 365, Gmail and Cloudflare are not connected [measured], and I accept the Vercel
disclosure. **Met** for my part. A1's acceptance of the same reading is owed to the Owner's second answer, not to
me.

## §4. My signature on this head, and C-1 to C-3

My assessment ratified CTR-NTF-001 at schema `925c502d…014e` / manifest `4177c792…4675`, "as amended by OD-2 and
OD-4" (OD-1). The head's schema `8abf3095…86e3` and manifest `09b16677…34b7` are exactly those files with exactly
those amendments (§2), and no constraint moved. The probes my OD-3 bounds rest on reproduce unchanged (§2 point 4).
**My signature stands on this head as given: RATIFY WITH CONDITIONS, for Candidate only.** It is not the Frozen-stage
signature, and nothing in this file moves a status. The items owed before Frozen (my assessment §6, F-1 to F-5) are
unchanged.

| Condition | Met on `936812a3`? |
|---|---|
| **C-1** A0 applies OD-2 and OD-4 exactly; A5, A1, C0 and Q0 re-read | A0's application: **met** [measured, §2]. A5's re-read: **met** (this file). A1, C0, Q0 re-reads: **not on this branch** [measured: `git diff --name-status 9d0751ec 936812a3 -- evidence/` adds only my assessment and the Owner's C-2 disposition; the A1, C0 and Q0 files dated 2026-10-10 are the `*-ntf2a.md` reviews of PR #242 and Q0's benchmark files, all already on the base]. |
| **C-2** the `cc-a5-loom.json` correction | **Met** for my part, by the Owner's route rather than mine (§3). A1's acceptance is owed under the Owner's answer. |
| **C-3** Q0 re-reads my assessment against C-T3 (a)–(c) | **Not met**: no such Q0 file on this branch [measured, same `git diff --name-status`]. Q0's to meet. |

The disposition's own conditions (A1's SC-2 confirmation, already given; the Owner's Q3 approval) are as my assessment
§5 records them; I did not re-measure them.

## Appendix A. The brief, verbatim

~~~~text
# Brief to `/claude/a5_loom`: A5 re-read of C-1 and C-2 (2026-10-10)

From A0 (`/claude/a0_atlas`), who dispatches you and who wrote CTR-NTF-001. Reproduce this brief verbatim in your file
(A1 R-1).

Repository: /Users/bank/ThinkBizThai. Branch under read: `agent/claude/WP-0A-CON-006-stale-blockers` at `936812a3a700e2273c01c6bf6b35e04ec388add7`
(local, not pushed yet; `git -C /Users/bank/ThinkBizThai log -1 936812a3a700e2273c01c6bf6b35e04ec388add7`). Base `origin/main` `9d0751ec`.
SP=/private/tmp/claude-501/-Users-bank-ThinkBizThai/c2816eec-82b3-4110-8890-b01c02e5fd0b/scratchpad
Never edit the main checkout or any `$SP/wt-*` worktree; those are A0's.

Your authority and its limits are unchanged from your assessment
(`evidence/WP-0A-CON-006/a5-ntf-assessment-2026-10-10.md`, which is on the branch, carried with `-x`).

## What to re-read

1. **C-1.** A0 applied your OD-2 and OD-4 texts in `aab9a165`: `contract-catalog/shared-kernel/ctr-ntf-001/manifest.json`
   (`untestable_by_schema` items (2), (3) reworded, (5) and (6) appended) and `schema.json` (three `x-` annotations),
   with the caveat and annotation pins in `test-kits/contracts/catalog-registry.test.mjs`. Check, by script, that every
   text is yours word for word and that nothing else in the contract changed (`git diff 9d0751ec <head> --
   contract-catalog/`).
2. **C-2.** The Product Owner answered twice on 2026-10-10:
   `evidence/WP-0A-CON-006/product-owner-disposition-2026-10-10-a5-c2-connectors.md`. In short: Supabase, Microsoft
   365, Gmail and Cloudflare are turned off for the session; for Vercel only, `can_access_external_secrets` stays
   `false` with a disclosure, `limitations.external_connectors_disclosure` in `cc-a5-loom.json` (commit after
   `aab9a165`). Re-measure the session's connectors yourself (read-only status listing only) and record what you
   find. Then say whether you accept the Vercel disclosure as meeting your C-2, or refuse it and why. Your answer is
   yours; refusing is acceptable.
3. Say whether your signature as given in your assessment stands on this head, and which of your conditions C-1, C-2
   and C-3 are now met (C-3 is Q0's re-read; it is not yours to meet).

Mark every claim [measured] or [read]; "not determined" rather than a guess. Include the §0 disclosure (same lineage).

## Where to write

`git worktree add -q -b a5/WP-0A-CON-006-ntf-reread-2026-10-10 $SP/a5-reread 936812a3a700e2273c01c6bf6b35e04ec388add7`. Write
`evidence/WP-0A-CON-006/a5-ntf-reread-2026-10-10.md`. Probes outside the repository. Plain `git commit` of only that
file, message `docs(evidence): A5 re-read of C-1 and C-2`, trailer
`Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Do not push. Remove the worktree and keep the branch.

## Report

Your final message: commit SHA, whether your signature stands, C-1 and C-2 each met or not, in one line each.
~~~~

## Appendix B. `c1.mjs` and its output, verbatim

`c1.mjs` (run as `node c1.mjs <worktree> 9d0751ec 936812a3a700e2273c01c6bf6b35e04ec388add7`):

```javascript
// A5 re-read of C-1. Read-only. argv[2] = worktree, argv[3] = base rev, argv[4] = head rev.
// Builds the EXPECTED head contract by applying A5's OD-2/OD-4 texts, extracted mechanically from
// the assessment file, to the BASE contract; then compares with the ACTUAL head contract.
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
const [ROOT, BASE, HEAD] = process.argv.slice(2);
const show = (rev, p) => execFileSync('git', ['-C', ROOT, 'show', `${rev}:${p}`], { encoding: 'utf8' });
const sha = (s) => createHash('sha256').update(s).digest('hex');
const D = 'contract-catalog/shared-kernel/ctr-ntf-001/';
const A = 'evidence/WP-0A-CON-006/a5-ntf-assessment-2026-10-10.md';
const md = show(HEAD, A).split('\n');
console.log(`assessment at head sha256 ${sha(show(HEAD, A))}`);
// --- extract A5's texts from the assessment (1-based line numbers from the file)
const lines = (a, b) => md.slice(a - 1, b);
const unquote = (ls) => ls.map((l) => l.replace(/^\s*> ?/, '')).join(' ');
const item5 = unquote(lines(264, 272));
const item6 = unquote(lines(305, 311));
const para = (a, b) => lines(a, b).map((l) => l.trim()).join(' ');
const quoted = (s) => [...s.matchAll(/"([^"]+)"/g)].map((m) => m[1]);
const odm = quoted(para(297, 303)); // [old2, new2, old3, new3]
const ods = quoted(para(313, 319)); // [old pii, new pii, append bound, old nid, new nid]
console.log(`extracted: item5 ${item5.length} chars, item6 ${item6.length} chars, manifest quotes ${odm.length}, schema quotes ${ods.length}`);
if (!item5.startsWith('(5) A5') || !item6.startsWith('(6) DEDUPE') || odm.length !== 4 || ods.length !== 5) throw new Error('extraction failed');
// --- expected manifest
const baseM = JSON.parse(show(BASE, D + 'manifest.json'));
const headMraw = show(HEAD, D + 'manifest.json');
const headM = JSON.parse(headMraw);
const exp = structuredClone(baseM);
let u = exp.untestable_by_schema;
const rep = (s, from, to, label) => {
  const n = s.split(from).length - 1;
  console.log(`  ${label}: old text occurs ${n} time(s) in base`);
  if (n !== 1) throw new Error(label);
  return s.replace(from, to);
};
u = rep(u, odm[0], odm[1], 'item (2) replacement');
u = rep(u, odm[2], odm[3], 'item (3) replacement');
// insertion point: "after item (4)", i.e. at the end of the field (base has items (1)-(4) only)
console.log(`  base untestable_by_schema contains "(5)": ${baseM.untestable_by_schema.includes('(5) ')}, ends with: ${JSON.stringify(baseM.untestable_by_schema.slice(-60))}`);
const headU = headM.untestable_by_schema;
// Determine separator the head used before (5) and (6)
const i5 = headU.indexOf(item5), i6 = headU.indexOf(item6);
console.log(`  head contains item (5) verbatim: ${i5 >= 0}; item (6) verbatim: ${i6 >= 0}`);
const sep5 = headU.slice(u.length, i5), sep6 = headU.slice(i5 + item5.length, i6);
console.log(`  separators used: before (5) ${JSON.stringify(sep5)}, before (6) ${JSON.stringify(sep6)}`);
exp.untestable_by_schema = u + sep5 + item5 + sep6 + item6;
// --- compare manifest field by field
const keys = new Set([...Object.keys(exp), ...Object.keys(headM)]);
const changedM = [...keys].filter((k) => JSON.stringify(exp[k]) !== JSON.stringify(headM[k]));
const changedFromBase = [...new Set([...Object.keys(baseM), ...Object.keys(headM)])].filter((k) => JSON.stringify(baseM[k]) !== JSON.stringify(headM[k]));
console.log(`manifest: fields differing base->head: ${JSON.stringify(changedFromBase)}`);
console.log(`manifest: fields differing expected->head: ${JSON.stringify(changedM)}`);
console.log(`manifest: key order base == head: ${JSON.stringify(Object.keys(baseM)) === JSON.stringify(Object.keys(headM))}`);
console.log(`manifest: head bytes == JSON.stringify(expected)+"\\n": ${headMraw === JSON.stringify(exp) + '\n'} (base bytes == JSON.stringify(base)+"\\n": ${show(BASE, D + 'manifest.json') === JSON.stringify(baseM) + '\n'})`);
// --- expected schema
const baseSraw = show(BASE, D + 'schema.json'), headSraw = show(HEAD, D + 'schema.json');
const baseS = JSON.parse(baseSraw), headS = JSON.parse(headSraw);
const expS = structuredClone(baseS);
const dk = expS.properties.dedupe_key, nid = expS.properties.notification_id;
dk['x-pii-shape'] = rep(dk['x-pii-shape'], ods[0], ods[1], 'dedupe_key.x-pii-shape replacement');
const hb = headS.properties.dedupe_key['x-bound-note'];
const sepB = hb.slice(dk['x-bound-note'].length, hb.length - ods[2].length);
console.log(`  dedupe_key.x-bound-note: head starts with base text: ${hb.startsWith(dk['x-bound-note'])}; ends with A5 text: ${hb.endsWith(ods[2])}; separator ${JSON.stringify(sepB)}`);
dk['x-bound-note'] = dk['x-bound-note'] + sepB + ods[2];
nid['x-bound-note'] = rep(nid['x-bound-note'], ods[3], ods[4], 'notification_id.x-bound-note replacement');
// deep diff of every leaf path
const leaves = (o, p = '$', out = {}) => {
  if (o && typeof o === 'object') { for (const k of Object.keys(o)) leaves(o[k], `${p}.${k}`, out); if (!Object.keys(o).length) out[p] = JSON.stringify(o); }
  else out[p] = JSON.stringify(o);
  return out;
};
const diffPaths = (a, b) => { const la = leaves(a), lb = leaves(b); return [...new Set([...Object.keys(la), ...Object.keys(lb)])].filter((k) => la[k] !== lb[k]); };
console.log(`schema: leaf paths differing base->head: ${JSON.stringify(diffPaths(baseS, headS))}`);
console.log(`schema: leaf paths differing expected->head: ${JSON.stringify(diffPaths(expS, headS))}`);
const fmt = (raw, obj) => [JSON.stringify(obj) + '\n', JSON.stringify(obj, null, 2) + '\n'].findIndex((x) => x === raw);
console.log(`schema: serialization style index base ${fmt(baseSraw, baseS)}, head ${fmt(headSraw, headS)}; head bytes == serialized expected: ${headSraw === [JSON.stringify(expS) + '\n', JSON.stringify(expS, null, 2) + '\n'][fmt(baseSraw, baseS)]}`);
// --- byte-level: which raw spans differ beyond the three edited annotations
const unesc = (r) => r.replace(/\\u([0-9a-fA-F]{4})/g, (_, h) => String.fromCharCode(parseInt(h, 16)));
console.log(`schema: base \\u-escapes ${[...baseSraw.matchAll(/\\u[0-9a-fA-F]{4}/g)].length}, head ${[...headSraw.matchAll(/\\u[0-9a-fA-F]{4}/g)].length}; base with escapes decoded == compact serialisation of base: ${unesc(baseSraw) === JSON.stringify(baseS) + '\n'}; head bytes == compact serialisation of expected: ${headSraw === JSON.stringify(expS) + '\n'}`);
// --- non-x- keywords untouched
const strip = (o) => (Array.isArray(o) ? o.map(strip) : o && typeof o === 'object' ? Object.fromEntries(Object.entries(o).filter(([k]) => !k.startsWith('x-')).map(([k, v]) => [k, strip(v)])) : o);
console.log(`schema: with every x- key removed, base deep-equals head: ${JSON.stringify(strip(baseS)) === JSON.stringify(strip(headS))}`);
// --- pins in catalog-registry recomputed independently
const h16 = (s) => sha(s).slice(0, 16);
console.log(`pin: untestable_by_schema digest head ${h16(headM.untestable_by_schema)} (base ${h16(baseM.untestable_by_schema)})`);
// mirrors catalog-registry's annotationsOf: x- keys plus description/title, arrays indexed as [i]
const ann = (o, p = '', f = {}) => { if (Array.isArray(o)) { o.forEach((v, i) => ann(v, `${p}[${i}]`, f)); return f; } if (o === null || typeof o !== 'object') return f; for (const [k, v] of Object.entries(o)) { if (k.startsWith('x-') || k === 'description' || k === 'title') f[`${p}.${k}`] = v; else ann(v, `${p}.${k}`, f); } return f; };
for (const [l, s] of [['base', baseS], ['head', headS]]) { const a = ann(s); const blob = Object.keys(a).sort().map((k) => `${k} = ${JSON.stringify(a[k])}`).join('\n'); console.log(`pin: annotations ${l} count ${Object.keys(a).length} digest ${h16(blob)}`); }
console.log('--- A5 texts as extracted (for the record)');
for (const [l, t] of [['item (5)', item5], ['item (6)', item6], ['(2) old', odm[0]], ['(2) new', odm[1]], ['(3) old', odm[2]], ['(3) new', odm[3]], ['pii old', ods[0]], ['pii new', ods[1]], ['bound append', ods[2]], ['nid old', ods[3]], ['nid new', ods[4]]]) console.log(`${l}: sha256 ${sha(t).slice(0, 16)} ${JSON.stringify(t.slice(0, 50))}…`);
```

Output (`c1.out`):

```text
assessment at head sha256 54f1187449bbbbf0e0a26a20f00ab53f48552f4feec848497b6c55749fbdcd1c
extracted: item5 973 chars, item6 774 chars, manifest quotes 4, schema quotes 5
  item (2) replacement: old text occurs 1 time(s) in base
  item (3) replacement: old text occurs 1 time(s) in base
  base untestable_by_schema contains "(5)": false, ends with: "e recipient is checked for that person, under the same rule."
  head contains item (5) verbatim: true; item (6) verbatim: true
  separators used: before (5) " ", before (6) " "
manifest: fields differing base->head: ["untestable_by_schema"]
manifest: fields differing expected->head: []
manifest: key order base == head: true
manifest: head bytes == JSON.stringify(expected)+"\n": true (base bytes == JSON.stringify(base)+"\n": true)
  dedupe_key.x-pii-shape replacement: old text occurs 1 time(s) in base
  dedupe_key.x-bound-note: head starts with base text: true; ends with A5 text: true; separator " "
  notification_id.x-bound-note replacement: old text occurs 1 time(s) in base
schema: leaf paths differing base->head: ["$.properties.notification_id.x-bound-note","$.properties.dedupe_key.x-bound-note","$.properties.dedupe_key.x-pii-shape"]
schema: leaf paths differing expected->head: []
schema: serialization style index base -1, head 0; head bytes == serialized expected: false
schema: base \u-escapes 6, head 0; base with escapes decoded == compact serialisation of base: true; head bytes == compact serialisation of expected: true
schema: with every x- key removed, base deep-equals head: true
pin: untestable_by_schema digest head dfe65f16b2f36949 (base 78c774aedcb5bdbc)
pin: annotations base count 20 digest 6676c9e55382b076
pin: annotations head count 20 digest d41ba1c066871f44
--- A5 texts as extracted (for the record)
item (5): sha256 6a415c05a1989181 "(5) A5'S STATEMENT OF THE OPEN-TIME CHECK, 2026-10"…
item (6): sha256 32173bbb72c38533 "(6) DEDUPE KEY COMPOSITION, A5's decision of 2026-"…
(2) old: sha256 0661740407d7ab32 "The key's full COMPOSITION is ID-005's `dedupe key"…
(2) new: sha256 f98156e13c636541 "The key's full COMPOSITION, ID-005's `dedupe key p"…
(3) old: sha256 ca19becffc460aa7 "A5's ratification of the bounds, the class and thi"…
(3) new: sha256 d42e4a28afc151c5 "A5 ratified the bounds, the class and this declara"…
pii old: sha256 4b7a3c78f56d27de "it is NOT stated here, and the manifest's untestab"…
pii new: sha256 10e2f52bad54a01b "A5 stated it on 2026-10-10 in the manifest's untes"…
bound append: sha256 143a492f841c4aba "A5's composition (manifest untestable_by_schema it"…
nid old: sha256 36f5924f682b66ee "a character class for the id is left to A5."…
nid new: sha256 7a0d0cbf1332690d "A5 decided on 2026-10-10 that the id takes no char"…
```
