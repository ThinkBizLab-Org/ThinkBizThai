# RFC-2026-029 §8/8 — what each installed package is, does and brings (WP-1A-A0-002, 2026-10-12)

Written by A0 (`/claude/a0_atlas`), drafted by a subagent of that run, before the first install lands. RFC-2026-029 §8/8
asks `WP-1A-A0-002` to record, per allowlisted name and from the resolved lockfile, §3.4/1's answers: licence, install
script, packages added, and whether it sends anything off the machine at build or run time (telemetry, source-map
upload, fonts fetched at build). "Any 'yes' to an install script or to network use at build time goes to A1 before the
install lands, and §4.7's telemetry switches follow from this list." This record is that list. It is the Author's
measurement, not a role verdict.

## 1. How the tree was resolved

- Toolchain: Node `24.20.0`, npm `11.19.0` (RFC-2026-001; `node --version`, `npm --version` checked first).
- The eleven names, and no other: `next`, `react`, `react-dom` in `apps/web/package.json` `dependencies` (§3.1);
  `tailwindcss`, `@tailwindcss/postcss`, `postcss` in `apps/web/package.json` `devDependencies` (the web build's
  inputs, §3.2); `typescript`, `@types/node`, `@types/react`, `@types/react-dom`, `vitest` in the root
  `package.json` `devDependencies` (repository-wide checks, §3.2). The root declares `workspaces: ["apps/web"]` and no
  runtime dependency. No provider SDK (`@supabase/*`, `pg`, `@sentry/nextjs`) and no other §3.1 name is installed.
- **ESLint and `eslint-config-next` are not installed: deferred by the Product Owner on 2026-10-12**
  (`ไม่ใส่ตอนนี้ (Recommended)`; `evidence/WP-1A-A0-002/product-owner-disposition-2026-10-12-skeleton-licences.md`
  §2.2). RFC-2026-029 §8/4's boundaries are a dependency-free guard instead (`scripts/verify-app-boundaries.mjs`).
- Resolution: `npm install --save-exact --ignore-scripts --engine-strict --before=2026-10-05` (seven days before
  2026-10-12, RFC-2026-029 §4.8). The committed `package-lock.json` is the lockfile npm writes for the two package.json
  files from a clean resolution, `npm install --package-lock-only --ignore-scripts --engine-strict --before=2026-10-05`
  in an empty directory: run twice, byte-identical both times. (Installing the three groups one after another wrote a
  lockfile that hoisted `lightningcss` differently and left out the six bundled entries below; the same 172 registry
  versions either way. The clean resolution is the one a reviewer reproduces from the package files alone, so it is the
  one kept.) `npm ci --ignore-scripts` on it installs the tree and leaves the lockfile byte-identical.
- Versions resolved: `next` 16.3.8, `react` 19.3.0, `react-dom` 19.3.0, `typescript` 7.0.2, `@types/node` 26.6.4,
  `@types/react` 19.3.0, `@types/react-dom` 19.3.0, `tailwindcss` 4.3.3, `@tailwindcss/postcss` 4.3.3, `postcss`
  8.5.28, `vitest` 5.0.3. The newest of all 172 registry versions in the lockfile is `@types/node` 26.6.4, published
  2026-10-01T22:39:22Z (`node scripts/verify-release-age.mjs 8c9a32ba`, exit 0).
- **TypeScript 7.0.2, not 6.0.3.** The earlier run held TypeScript below 6.1 only because `typescript-eslint` required
  it. Without ESLint, the newest TypeScript published before 2026-10-05 is 7.0.2 (2026-07-08), and it was measured to
  work: `tsc --noEmit` checks the skeleton, the negative control reports every marked error with the expected code at
  the expected line, and `next build` 16.3.8 runs its own type check with it ("Running TypeScript … Finished") and fails
  the build on a planted `TS2322`. TypeScript 7 runs a native compiler shipped as one optional package per platform
  (`@typescript/typescript-<platform>`), which is most of what it adds to the lockfile.
- The lockfile: `lockfileVersion` 3, 181 entries: the root, the `apps/web` workspace, the workspace link, and 178
  packages. 172 are registry tarballs with a sha512 integrity; 6 are `inBundle` entries inside
  `@tailwindcss/oxide-wasm32-wasi` (`@emnapi/core`, `@emnapi/runtime`, `@emnapi/wasi-threads`, `@napi-rs/wasm-runtime`,
  `@tybys/wasm-util`, `tslib`), which have no tarball of their own and arrived inside that registry tarball, whose
  `bundleDependencies` names all six (`scripts/verify-app-dependencies.mjs`, `checkLockfile`).
- `npm audit --omit=dev --audit-level=high`: 0 vulnerabilities; `npm audit` with development packages: 0.

## 2. Per name

"Adds" counts the lockfile entries reachable from the name through `dependencies`, `optionalDependencies` and
`peerDependencies` as the lockfile resolves them (the name itself excluded); "of which only through it" are the ones
no other installed name reaches. Every one of the 178 entries is reached from one of the eleven. Optional entries are
mostly per-platform native binaries of which npm installs only the host's.

| Name | Version | Licence | Install script | Adds (only through it; optional) | Network at build or run time | Telemetry, and how it is off |
|---|---|---|---|---|---|---|
| `next` | 16.3.8 | MIT | no | 53 (46; 38) — `@next/swc-*` ×8, `sharp` and 27 `@img/*` entries, `caniuse-lite`, `@swc/helpers`, `styled-jsx`, its own `postcss` 8.5.23, `react`/`react-dom` as peers | **Telemetry, at build and at run time, unless switched off; nothing else measured.** No font is fetched (`next/font/google` is refused by `scripts/verify-app-boundaries.mjs`); no image is optimised (`images.unoptimized`), so `sharp` is not needed; no source map is uploaded (no Sentry here). | **Yes.** `next build` tried 14 POSTs to `https://telemetry.nextjs.org/api/v1/record` with the switch off and none with `NEXT_TELEMETRY_DISABLED=1` in the environment, or with `apps/web/next.config.ts`'s `process.env.NEXT_TELEMETRY_DISABLED ??= '1'` alone (§3). Off in CI by the job-level `NEXT_TELEMETRY_DISABLED: '1'`, and by `next.config.ts` wherever the config is loaded. Deployments set the same variable in each Vercel project (WP-1A-A6-001). |
| `react` | 19.3.0 | MIT | no | 0 | none | none |
| `react-dom` | 19.3.0 | MIT | no | 2 (0; 0) — `scheduler`, `react` (peer) | none | none |
| `typescript` | 7.0.2 | Apache-2.0 | no | 20 (20; 20) — `@typescript/typescript-<platform>` native compilers | none known; not observable at the socket level by the probe of §3, because the CLI hands over to a native binary. `tsc --noEmit` succeeds with outbound network denied (§3). | none documented |
| `@types/node` | 26.6.4 | MIT | no | 1 (0; 0) — `undici-types` | none (declaration files) | none |
| `@types/react` | 19.3.0 | MIT | no | 1 (0; 0) — `csstype` | none (declaration files) | none |
| `@types/react-dom` | 19.3.0 | MIT | no | 2 (0; 0) — `@types/react` (peer), `csstype` | none (declaration files) | none |
| `tailwindcss` | 4.3.3 | MIT | no | 0 | none (runs inside `next build`; §3) | none |
| `@tailwindcss/postcss` | 4.3.3 | MIT | no | 49 (39; 29) — `@tailwindcss/node`, `@tailwindcss/oxide` and its 12 platform binaries (one, `oxide-wasm32-wasi`, bundling six packages), `lightningcss` 1.32.0 and its 11 platform binaries (MPL-2.0), `jiti`, `enhanced-resolve` | none (runs inside `next build`; §3) | none |
| `postcss` | 8.5.28 | MIT | no | 3 (0; 0) — `nanoid`, `picocolors`, `source-map-js` | none (runs inside `next build`; §3) | none |
| `vitest` | 5.0.3 | MIT | no; **one entry it reaches is flagged — `fsevents`, below** | 62 (51; 27) — `vite` 8.3.2 with `rolldown` and its 15 platform bindings, `lightningcss` 1.33.0 and its 11 platform binaries (MPL-2.0), `@vitest/*`, `chai`, `tinybench` | none: `vitest run` attempted no request under the probe and succeeds with outbound network denied (§3). | none |

**Licences outside §3.4/2's list**, all transitive, all accepted for the named packages by the Owner's decision of
2026-10-12 and recorded as RFC-2026-029 Amendment 2026-10-12: `caniuse-lite` (CC-BY-4.0, through `next`);
`lightningcss` and its platform binaries, two versions (MPL-2.0, 24 entries, through `@tailwindcss/postcss` and
`vitest`); `@img/sharp-libvips-*` (LGPL-3.0-or-later, 10 entries) and `@img/sharp-win32-*` (`Apache-2.0 AND
LGPL-3.0-or-later`, 3) and `@img/sharp-wasm32` (`Apache-2.0 AND LGPL-3.0-or-later AND MIT`, 1), optional through `next`
→ `sharp`. Every other entry is MIT (95), Apache-2.0 (38), ISC (3), 0BSD (2) or BSD-3-Clause (1).
`scripts/verify-app-dependencies.mjs` (`checkLicences`) holds this on every head.

**Install scripts.** No installed name has one. One lockfile entry carries npm's `hasInstallScript: true`: `fsevents`
2.3.3 (MIT), a macOS-only optional dependency of `vite` (through `vitest`). Its own `package.json` declares no
`preinstall`, `install` or `postinstall` script (its scripts are `clean`, `build`, `test` and `prepublishOnly`), and its
tarball ships the prebuilt `fsevents.node`; the flag comes from the registry metadata. Nothing runs under
`--ignore-scripts`, CI installs on Linux where npm skips it, and `vitest run` passes without it. **This is the one
"yes"-shaped answer, and goes to A1 as §8/8 says.**

## 3. How the network answers were measured

- **Telemetry probe.** A Node preload, outside the repository, replaced `fetch`, `http(s).request` and outbound TCP
  connects to anything but localhost with a function that logged the target to a file and refused the call, so
  nothing left the machine. `next build` in `apps/web` under it: with the `next.config.ts` line removed and
  `NEXT_TELEMETRY_DISABLED` unset (the control), 14 attempts, every one `fetch https://telemetry.nextjs.org/api/v1/record`
  and nothing else; with `NEXT_TELEMETRY_DISABLED=1`, 0; with the `next.config.ts` line and the variable unset, 0.
  (`NEXT_TELEMETRY_DEBUG=1` is not a usable probe: Next.js prints its events in debug mode before it checks whether
  telemetry is disabled.)
- **Offline runs.** Under `sandbox-exec` with outbound IP traffic denied except to localhost (control: `curl
  https://registry.npmjs.org/` exits 7 under the same profile), `tsc --noEmit` exits 0, `vitest run` exits 0 and
  `next build` (telemetry off) exits 0. Turbopack talks to its own worker over localhost, which is why localhost stays
  allowed.
- **Without `sharp`.** `next build` with `node_modules/sharp` and every `node_modules/@img/*` package moved aside exits 0
  (`images: { unoptimized: true }`).
- Not measured: run-time behaviour of a deployed `next start` beyond telemetry's switch, which is the same environment
  variable; Vercel's own build environment (WP-1A-A6-001).

## 4. What follows for §4.7

| Name | Has telemetry | Switch |
|---|---|---|
| `next` | yes | `NEXT_TELEMETRY_DISABLED=1`: job-level in `.github/workflows/ci.yml`; `apps/web/next.config.ts` sets it when unset; each Vercel project's environment (WP-1A-A6-001) |
| every other installed name | none found | — |

The Sentry build plugin's own telemetry (§4.7) does not apply: `@sentry/nextjs` is not installed.

## Appendix — the probe preload of §3

Run as `NODE_OPTIONS="--require <path>/block-net.cjs" NET_PROBE_LOG=<log> next build` from `apps/web`. It is kept here, not
in the repository's code, because it is a measurement aid and nothing runs it.

```js
// Preload for a measurement: every outgoing request is logged to a file and refused, so nothing
// leaves the machine. Used to see whether `next build` attempts to send telemetry.
const fs = require('node:fs');
const log = process.env.NET_PROBE_LOG;
const note = (what) => fs.appendFileSync(log, `${process.pid} ${what}\n`);
globalThis.fetch = async (input) => { note(`fetch ${typeof input === 'string' ? input : input?.url ?? String(input)}`); throw new Error('network blocked by probe'); };
for (const mod of ['http', 'https']) {
  const m = require(`node:${mod}`);
  for (const fn of ['request', 'get']) {
    const orig = m[fn];
    m[fn] = function (...args) { const a = args[0]; note(`${mod}.${fn} ${typeof a === 'string' ? a : a?.href ?? a?.hostname ?? a?.host}`); throw new Error('network blocked by probe'); };
  }
}
const net = require('node:net');
const origConnect = net.Socket.prototype.connect;
net.Socket.prototype.connect = function (...args) { const o = args[0]; if (o && typeof o === 'object' && (o.port || o.host) && !o.path && !['localhost','127.0.0.1','::1',undefined].includes(o.host)) { note(`net.connect ${o.host}:${o.port}`); this.destroy(new Error('network blocked by probe')); return this; } return origConnect.apply(this, args); };
```
