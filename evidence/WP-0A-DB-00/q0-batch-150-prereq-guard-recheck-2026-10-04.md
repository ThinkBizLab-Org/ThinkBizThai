# Q0 re-check of batch 150-prereq's host guard fix (PR #172)

**Package:** `WP-0A-DB-00`. **Role:** Independent Tester, run `/claude/q0_sentinel`. **Subject:** branch
`agent/claude/WP-0A-DB-00-batch-150-prereq`, head `6cab312` (the handoff refresh, alone) over the code commit
`77a1f76` "fix(db): the test-instance host guard refuses # and reads query keys as libpq does", base `b5f53c3`
(main), Author `/claude/a0_atlas`. **My earlier record:** `q0-batch-150-prereq-recheck-2026-10-03.md`, finding
R-1 (cherry-picked on the branch as `65ff9d8`). **Re-checked on:** my own branch `recheck/q0-batch-150-guard`,
created at `6cab312`. **Date:** 2026-10-04.

This is a NARROW re-check of one fix. It records findings. It advances no status, approves nothing,
test-verifies nothing on anyone's behalf, and decides nothing the Integration Owner or the Product Owner holds
(including whether the shared guard is accepted for `db-reset-test`, blocker 194 (13)).

## 0. What I am

I am a subagent of `/claude/a0_atlas`, the Author's own run, and of the same vendor and model family. My
independence from the Author is the one RFC-2026-024 describes, and no more. Accepting this record as the
Tester role's signature is the Integration Owner's and the Product Owner's act, not mine. I fixed nothing:
every mutation below was made in a private export (`git archive 6cab312`) and the file was restored with an
equal sha256 (`6b82df487c23ff63…`) before the export was removed.

## 1. Measured versus read

**Measured.** Node `v24.20.0` (`node -v`; `/Users/bank/.local/node-v24.20.0/bin/node`). PostgreSQL 17.11 from
`/opt/homebrew/bin`. One fresh `initdb --locale=C -A trust -U postgres` on 127.0.0.1:5503 only, TCP only
(`-c unix_socket_directories=''`), `LC_ALL=C`. Private directory `scratchpad/q0-150g/`. Every probe ran with
`PGPORT=5598` (nothing listens there) and `PGCONNECT_TIMEOUT=2`, so that a URL libpq does not read as naming
a port could not fall through to this workstation's server on 5432. No probe named 5432 or 5499. The
"elsewhere" targets were `db.example.invalid`, `192.0.2.1` (TEST-NET-1), `[::ffff:192.0.2.1]`, and a missing
socket directory `scratchpad/q0-150g/nosock`.

For each of 81 URLs I recorded three things:

- the guard's verdict, from `testHostRefusal` imported from the branch;
- libpq's own reading, from `psql "$url" -Atc "select host(inet_server_addr())||':'||current_setting('port')"`
  with the driver's `scrubbedEnv`;
- for every refused crafted URL, the two real tools: `node scripts/db/explain-harness.mjs --scale 0.01` and
  `node scripts/db/run.mjs reset-test` (the command behind `make db-reset-test`).

| Command | Where | Exit | Output |
|---|---|---|---|
| probe, 81 URLs (§2, §3) | branch at `6cab312`, cluster 5503 | — | every refused URL: harness **2** "explain-harness refuses this host: …", reset-test **1** "db-reset-test refuses this host: …", each in milliseconds with no connection attempt |
| `make db-reset-test` with `#?host=db.example.invalid`, `#x?hostaddr=192.0.2.1`, `?%68ost=…`, `?%48OST=…`, `? host=…` | same | **2** each | "db-reset-test refuses this host: it contains a #, …" / "it carries a host parameter, …" |
| `make db-reset-test` with `127.0.0.1:5503/postgres`, `…?sslmode=disable`, `localhost:5503/postgres` | same | 0 each | "db-reset-test: ok in 15ms" (my empty cluster) |
| `explain-harness --scale 0.01` with the same three legitimate URLs | same | 1 each | "relation "app.workspaces" does not exist (42P01)": past the guard, failed on my unmigrated cluster, as it should |
| `make db-migrate-clean` (not a guarded target) with `…/postgres#?host=q0-probe.invalid` | same | 2 | stderr carries `could not translate host name "q0-probe.invalid"` unredacted. G-2 |
| 7 mutants of the guard, `node --test --test-name-pattern='refuses without one' test-kits/db/foundation-contract.test.mjs` | private export | §4 | — |
| `npm run check` (`DB_TEST_URL` unset) | branch NAME `agent/claude/WP-0A-DB-00-batch-150-prereq` checked out in my worktree with `--ignore-other-worktrees` (local = `origin/…` = `6cab312`; no commit made on it; then back to `recheck/q0-batch-150-guard`) | **0** | tests 684, pass 684, fail 0, skipped 0, todo 0 |
| `npm run check:handoff` | same | **0** | "describes the branch: nothing substantive after its cited head" |
| `node scripts/verify-branch-scope.mjs b5f53c3 WP-0A-DB-00` | same | **0** | "all 23 changed path(s) are declared, and every amendment explains one" |

**Read, not measured:** `git show 77a1f76` in full (the guard, the three crafted URLs added to the static
list, plan §11, the blocker 194 edit and the regenerated manifest digest), `redactConnection`, the two callers
(`run.mjs` reset-test, `explain-harness.mjs` main), the driver's psql invocation (the URL is psql's first
positional argument), and CI's `DB_TEST_URL` (`postgresql://postgres@localhost:5432/thinkbizthai_test`,
`.github/workflows/ci.yml:130,172`). libpq's URI rules I cite (case-sensitive `postgresql://` prefix; keywords
matched exactly; dbname runs to the first `?`; parameters split on `&`, then on the first `=`, then
percent-decoded) are confirmed by the libpq column in §2 and §3, not only read.

## 2. Question 1: is the `#?host=` bypass closed?

**Yes, measured.** Each URL below is refused by the guard, and both real tools refuse it before connecting.
libpq's column shows where it would have gone without the guard.

| Id | URL after `postgresql://postgres@127.0.0.1:5503/postgres` (unless shown) | Guard | libpq without the guard |
|---|---|---|---|
| A1 | `#?host=db.example.invalid` | refuse (`#`) | resolves `db.example.invalid` |
| A2 | `#x?hostaddr=192.0.2.1` | refuse (`#`) | timeout at 192.0.2.1:5503 |
| A3 | `#?host=<private>/nosock` | refuse (`#`) | tries that socket path |
| A4 | `%23?host=db.example.invalid` (encoded `#`) | refuse (host parameter) | resolves `db.example.invalid` |
| A5 | `?sslmode=disable#&host=db.example.invalid` | refuse (`#`) | "invalid sslmode value: "disable#"" |
| A6 | `…:5503#/postgres?host=db.example.invalid` | refuse (`#`) | "invalid integer value "5503#"" |

My R-1 is **closed**. Before the fix, A1-A3 were admitted and reached libpq (my 2026-10-03 record).

## 3. Question 2: other spellings of the same class

| Class | Ids and spellings | Guard | libpq |
|---|---|---|---|
| encoded keys | B1 `?%68ost=`, B5 `?%68%6F%73%74=`, B6 `?%68ost=<socket dir>`, B3 `?h%6Fstaddr=192.0.2.1`, B4 `?%73ervice=q0probe` | refuse, all | B1, B5 resolve `db.example.invalid`; B6 tries the socket; B3 times out at 192.0.2.1; B4 "definition of service not found". The fix catches these through the raw loop; the old parsed loop catches them too |
| encoded keys libpq rejects | B2 `?%48OST=`, B7 `?servicefil%65=`, B8 `?%ZZhost=` | refuse, all | "invalid URI query parameter" or "invalid percent-encoded token" |
| whitespace around keys | C1 `? host=`, C2 `?host =`, C3 `?%20host=`, C4 `?host%20=`, C5 `?ho<TAB>st=`, C6 `?<LF>host=`, C7 `?host<TAB>=` | refuse, all | "invalid URI query parameter" for each: libpq does not trim |
| duplicate `?` | D1 `?sslmode=disable?host=…`, D2 `??host=…`, D3 `?a=1&?host=…` | **admit** | parse error each: "extra key/value separator" or "invalid URI query parameter "?host"" |
| | D4 `?application_name=q0?&host=…` | refuse | resolves `db.example.invalid` |
| `;` separators | E1 `?sslmode=disable;host=…`, E3 `?application_name=q0;hostaddr=192.0.2.1` | **admit** | "extra key/value separator" |
| | E2 `/postgres;host=…` | **admit** | connects to 127.0.0.1:5503, FATAL database "postgres;host=…" does not exist |
| keys with no `=` | F1 `?host`, F2 `?host&sslmode=disable`, F3 `?sslmode=disable&host`, F4 `…&hostaddr` | refuse, all | "missing key/value separator" |
| `host` in the path | G1 `/host=db.example.invalid`, G2 `/host%3D…%20port%3D5503`, G3 `?dbname=host%3D…`, G4 `?dbname=postgresql%3A%2F%2F…`, G5 `/postgres%3Fhost%3D…`, G6 `/x/host=…` | **admit** | each connects to **127.0.0.1:5503** and fails "database … does not exist": a dbname inside a URI is not re-expanded |
| unicode lookalikes | H1 `?ｈost=` (U+FF48), H2 `?hoѕt=` (U+0455), H7 `?ho%C5%BFt=` (U+017F), H8 `?hostaddr<U+200B>=` | **admit** | "invalid URI query parameter" each |
| | H3 `@ｌocalhost` (U+FF4C), H4 `@localhost。example.invalid` | refuse | H3 libpq reached 127.0.0.1:5503 (macOS folds it); H4 fails to resolve |
| case | H5 `?HOST=`, H6 `?Host=` | refuse | "invalid URI query parameter" (libpq is case-sensitive) |
| other | I12 host list, I13 `127.0.0.1%2C192.0.2.1`, I14 `[::ffff:192.0.2.1]`, I15 `127.1`, I16 leading space, I8 `postgresql:///postgres?host=…`, I9 a socket dir as the authority host, I10/I19 `host=` after a legitimate parameter, I11 `?service=`, I18 `?ssl=true&hostaddr=192.0.2.1`, I6 `db.example.invalid?x=@127.0.0.1` | refuse, all | I14 times out at `::ffff:192.0.2.1`, I18 at 192.0.2.1, I8/I10/I19 resolve `db.example.invalid`, I9 tries the socket |
| other, admitted | I5 `?application_name=x%26host%3D…` | admit | connects to 127.0.0.1:5503: libpq splits on the raw `&` before decoding |
| | I7 `…:5503?@db.example.invalid/x` | admit | "missing key/value separator" |
| | I1 `POSTGRESQL://…` (upper-case scheme) | **admit** | **not read as a URI**: libpq went to the default socket `/tmp/.s.PGSQL.5598` with the whole string as the database name. G-3 |
| | I2 `Postgresql://…?sslmode=disable host=…` | admit | "invalid connection option" (read as key=value, first keyword invalid) |
| | I3 `@local<TAB>host`, I4 `@127.0.0.1<LF>:5503`, I17 a trailing LF | **admit** | I3 and I4 fail to resolve the raw name; I17 connects to 127.0.0.1:5503, FATAL database "postgres\n" does not exist. G-3 |

**Result.** No spelling I found reaches a host other than the authority's through a URI parameter or a
fragment. Every admitted crafted URL either fails inside libpq's own parser, or connects to the authority's
host (127.0.0.1:5503) and fails on a database name that does not exist, or (I1) is not a URI to libpq at all.

## 4. The fix under mutation

The static layer, `foundation-contract.test.mjs` test "a target needing a database refuses without one", run
on a private export after each single mutation of `psql-driver.mjs`:

| Id | Mutation | Exit | Verdict |
|---|---|---|---|
| M0 | none (control) | 0 | — |
| M1 | the `#` refusal removed | 0 | survives. **Equivalent today**: the raw loop reads past the `#` and refuses A1, A2 on `host=`/`hostaddr=` |
| M2 | the raw-text query loop removed | 0 | survives. **Equivalent today**: `#` is refused, and WHATWG's own `searchParams` decodes `%68ost` |
| M3 | the raw loop does not percent-decode | 0 | survives, equivalent (the parsed loop decodes) |
| M4 | the raw loop does not trim | 0 | survives, equivalent (trimming only adds refusals libpq would make itself) |
| M5 | both M1 and M2 | **1** | held: "`…#?host=db.example.invalid`: refused by the shared guard" |
| M6 | the raw query read from the last `?`, not the first | 0 | survives, equivalent (the `#` refusal catches the fragment forms) |

The two halves of the fix are each sufficient for every honoured spelling I found. The test holds only their
conjunction. G-1.

## 5. Question 3: does the fix refuse a legitimate test URL?

**No, with one harmless exception (L11).** Each URL is admitted by the guard; the column shows what
`run.mjs reset-test` did against my cluster.

| Id | URL | Guard | reset-test |
|---|---|---|---|
| L1 | `postgresql://postgres@localhost:5432/thinkbizthai_test` (CI's form) | admit | not run: port 5432 is another server |
| L2 | `postgresql://postgres@postgres:5432/thinkbizthai_test` (the service-name form) | admit | not run |
| L3, L9 | `postgresql://` and `postgres://` `postgres@127.0.0.1:5503/postgres` | admit | 0 |
| L4, L14 | `localhost:5503`, `LOCALHOST:5503` | admit | 0 |
| L5 | `[::1]:5503` | admit | 1, "Connection refused": my cluster listens on IPv4 only. Not the guard |
| L6, L7, L15 | `?sslmode=disable`, `?sslmode=prefer&connect_timeout=5`, `?target_session_attrs=any&sslmode=disable` | admit | 0 |
| L8 | `?sslmode=require` | admit | 1, "server does not support SSL": my cluster has none. Not the guard |
| L10 | password `pw%23x` (encoded `#`) | admit | 0 |
| L12, L13, L16 | `?application_name=q0&options=-c%20search_path%3Dpublic`, `/postgres?port=5503`, `?application_name=has%3Fquestion` | admit | 0 |
| L11 | password `pw#x` (raw `#`) | **refuse** (`#`) | 1 at the guard. libpq would connect. **Not a regression**: before the fix the authority regex `[^/?#]*` already stopped at `#`, saw no `@`, and refused it (read). An encoded `%23` (L10) works |

## 6. Findings

### G-1 LOW (test coverage): the tool-level loop skips the new URLs, and each half of the fix is unpinned

`test-kits/db/foundation-contract.test.mjs:148` runs only `crafted.slice(0, 10)` through the two real tools.
The three URLs this fix added (indices 15-17) are asserted only at the function. My R-1 remedy asked for them
in the both-tools loop. I measured them through both tools myself (§2, §3: harness 2, reset-test 1, make 2),
so this is coverage, not a defect. Separately, M1 and M2 each survive (§4). Either half of the fix can be
deleted with the suite green, and the comment's "fail closed: refuse any `#`, and read the query parameters
from the raw text" is pinned only as a pair.

**Remedy (A0):** run every `crafted` URL through both tools. If both halves are meant to hold on their own,
pin one case only each catches. For example, `…/postgres#frag` is refused only by the `#` rule, and
`…?%20host=x` only by the raw loop's trim.

### G-2 LOW: `redactConnection` still reads the fragment's `host=` as nothing

`scripts/db/psql-driver.mjs:80-94` still takes the values to redact from WHATWG `searchParams`. The fix closed
the guard, not redaction. The guarded targets now refuse before connecting, so they print no host. But
`make db-migrate-clean`, which is not guarded, with `…/postgres#?host=q0-probe.invalid` exited 2 printing
`could not translate host name "q0-probe.invalid"` unredacted (measured). My R-1 noted this ("S6's fix shares
the hole"). The fix does not mention it, and plan §11 does not list it as owed. A trivial sibling: with
`[::1]`, `parsed.hostname` is `[::1]`, so psql's `::1` passes unredacted (L5's output); it is loopback.

**Remedy (A0, A1 to accept):** collect the values from the raw query as the guard now does, or refuse `#` in
`connectionString` for every target. Otherwise record it on blocker 194 (13).

### G-3 INFO: four forms WHATWG normalises are admitted, and libpq reads them raw

- **I1, an upper-case scheme.** libpq's URI prefix test is case-sensitive, so `POSTGRESQL://…` is not a URI to
  libpq. Measured with `PGPORT=5598`: it went to the default socket `/tmp/.s.PGSQL.5598`, with the whole
  string as the database name. The guard, however, accepted the authority's `127.0.0.1` as the host.
- **I3, I4 and I17, a TAB or LF inside the host or after it.** WHATWG strips these, libpq does not. I3 and
  I4 fail to resolve, and I17 names a database that does not exist.

None reaches a host the URL names elsewhere. I1 reaches a local server other than the one named, and only a
database named after the whole URL string would let it proceed. On this workstation the default socket is a
live server on 5432. I did not run I1 there, and that reach is read, not measured.

My R-1 remedy also suggested refusing ASCII TAB, LF, CR and leading or trailing C0/space. The fix did not
adopt it, and I now measure that omission as harmless.

**Remedy (optional):** match the scheme case-sensitively, as libpq does. Refuse any C0 control or space in the
text.

### G-4 INFO: over-refusals, all harmless

- L11, a raw `#` in a password, is refused although libpq connects. It was refused before the fix too, and
  `%23` works.
- H5, H6, C1-C7, F1-F4, B2 and B7 are refused although libpq would reject each one itself.
- The refusal message's suffix ("it is not localhost, 127.0.0.1 or the CI service container") reads oddly
  after "it contains a #", which is no claim about the host. It is wording only.

### Claims checked

**True as measured or read:**

- The commit message and plan §11: the guard refuses any `#`, and reads query keys from the raw text,
  decoded. The three crafted URLs are in the static list.
- `npm run check` exits 0 with 684 tests.
- The blocker 194 (13) wording is unchanged where it states the four connect-by parameters.
- §11's statement that none of the three re-checks reported a stop-the-line or a merge blocker matches my own
  record.
- The fix adds only refusals: anything admitted now was admitted before (read from the diff).

**Not true as stated:** none found. "Reads … the way libpq does" is a slight overstatement, since the guard
trims and lower-cases where libpq does not. That direction only adds refusals.

## 7. Stop-the-line and merge

**No stop-the-line.** I found no secret exposure, no tenant leakage, no migration divergence and no contract
mismatch. The fix touches no migration, policy, index or grant. Every crafted URL I found that libpq would
connect elsewhere by is refused before connecting, by both tools.

**Nothing here blocks the merge on test grounds.** R-1 is closed as measured. G-1 and G-2 are LOW and can be
recorded on blocker 194 (13). The guard's acceptance for `db-reset-test` remains the Integration Owner's (194
(13)), and the merge remains subject to the C0 and A1 re-checks of this fix, the Integration Owner evidence
RFC-2026-025 §5 owes, and CI on `6cab312`. None of those is mine to judge.

## 8. Limits

- One PostgreSQL build (17.11, Homebrew, macOS). CI's `postgres:17` on Linux was not run by me. Name
  resolution of odd hosts (H3's fullwidth `ｌ` folding to `l`, TAB in a name) is the macOS resolver's, and
  glibc may differ. Either way the guard refuses H3 and admits only names that fail.
- The spelling list is mine (81 URLs) and not exhaustive. I did not fuzz.
- No real off-list host was contacted. The "elsewhere" targets were `.invalid` names, TEST-NET-1 addresses and
  a missing socket directory. Port 5432 (a live server on this workstation) and 5499 were never named. L1, L2
  and I1's default-socket reach were checked at the guard only.
- The harness was run only to show that legitimate URLs pass its guard. It failed on my unmigrated cluster,
  and nothing was loaded.
- I measured the three branch guards on the branch name with `--ignore-other-worktrees`, in my worktree,
  while `/Users/bank/ThinkBizThai` holds the same name. I made no commit there.
- Cleanup: the cluster on 5503 was stopped and its data directory removed. Port 5503 has no listener. The
  private export was removed. The probe scripts and logs remain in `scratchpad/q0-150g/`. Free space on
  `/System/Volumes/Data` was 10 GiB at the end.
