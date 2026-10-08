// THE REVIEW-TIER CLASSIFIER (RFC-2026-030 §4, APPROVED IN PRINCIPLE 2026-10-08, final text approved at merge).
//
// Why it exists. RFC-2026-030 keeps separation of duties absolute and varies only how DEEP the independent review of a
// pull request is: H (every role on every PR, as today), M (Reviewer + Tester per PR, the Integration Owner at the end
// of the work package), L (one independent Reviewer, the Tester reading CI/Playwright artifacts), and `records`
// (RFC-2026-025 §6, unchanged). The tier is decided by this script, not by the Author. It is a classifier, not an
// approver: it says which path a PR takes and nothing about whether the change is right.
//
// It FAILS CLOSED, and only ever UPWARD. A path it does not know, a module not on the reviewed module allowlist, a
// sensitive word or word stem in a path, a secret/data-path/injection signal in an added line, a removed guard line,
// more than one module or package, a module change with no test, a rename, a deletion outside a module, a symlink or
// executable, a manifest it cannot parse, a change to a classifier -- each makes the PR H. A git or usage error exits 2,
// and RFC-2026-030 treats exit 2 as H. No rule here can lower a tier below what another rule set.
//
// Its denylists (path words, line signals) are NOT the fail-closed part: a denylist misses the next synonym. The
// fail-closed parts are the module allowlist (M_ELIGIBLE_MODULES, EMPTY until a governance PR names each module after
// RFC-2026-029's layout lands, so every module path is H today), the L path allowlist, and L's import allowlist. The
// RFC (§4.2, §4.3) leaves "no data path" and "behind a feature flag" for the Reviewer to confirm in writing as well.
//
// The tier that counts is the one printed by the copy of this script ON THE BASE (RFC-2026-030 §4, A1-4): a PR can
// edit its own copy. The CLI says whether the copy running is the base's; a PR touching either classifier is H.
//
// Today the repository has no application paths (`apps/`, `src/modules/` do not exist; RFC-2026-029 proposes the
// layout), so every PR on it is H or `records`. The L and M rules are proved here on synthetic diffs only.
//
// Usage:
//   node scripts/db/classify-review-tier.mjs [<base>=origin/main] [<head>=HEAD]
//       prints `tier: <records|L|M|H>` and every reason that raised it; exit 0. Exit 2 = not classified = H.
//
// Node built-ins only (RFC-2026-001: no dependency).
import { execFileSync } from 'node:child_process';
import { realpathSync } from 'node:fs';
import { dirname, join, posix } from 'node:path';
import { fileURLToPath } from 'node:url';
import { STATUS_FLOW, classifyDiff, manifestDelta, parseRawDiff } from './classify-records-only.mjs';

export const TIERS = ['records', 'L', 'M', 'H'];
const rank = (t) => TIERS.indexOf(t);
export const maxTier = (...ts) => ts.reduce((a, b) => (rank(b) > rank(a) ? b : a), 'records');

// The two classifiers. A PR that touches either is H, whatever any copy prints (A1-4).
export const CLASSIFIERS = ['scripts/db/classify-review-tier.mjs', 'scripts/db/classify-records-only.mjs'];

// The reviewed module allowlist (A1-1). A module key is M- or L-eligible only when it is named here, by a governance
// PR, after RFC-2026-029's module layout exists; a module that owns identity, tenancy, IAM, sessions, secrets, billing,
// entitlement, publishing, connectors, uploads, jobs or provider calls is never named. EMPTY today: every module path is H.
export const M_ELIGIBLE_MODULES = Object.freeze([]);

// Words of a path (split on every non-alphanumeric character, camel case and acronym runs) that name an H domain of
// RFC-2026-030 §3. Matched exactly, and against each pair of adjacent words joined (`sign`+`in` = `signin`).
export const H_PATH_WORDS = [
  'auth', 'authn', 'authz', 'iam', 'login', 'logon', 'logout', 'signin', 'signup', 'signout', 'session', 'sessions', 'password',
  'passwords', 'secret', 'secrets', 'oauth', 'token', 'tokens', 'credential', 'credentials', 'vault', 'key', 'keys', 'apikey',
  'crypto', 'jwt', 'csrf', 'xsrf', 'cookie', 'cookies', 'mfa', 'otp', 'totp', 'sso', 'pii', 'publish', 'publishing', 'publisher',
  'billing', 'payment', 'payments', 'stripe', 'checkout', 'entitlement', 'entitlements', 'webhook', 'webhooks', 'rls', 'policy',
  'policies', 'migration', 'migrations', 'sql', 'supabase', 'db', 'database', 'schema', 'schemas', 'contract', 'contracts',
  'middleware', 'admin', 'tenant', 'tenants', 'permission', 'permissions', 'role', 'roles', 'env', 'ci', 'workflow', 'workflows',
  'gate', 'gates', 'meta', 'connector', 'connectors', 'server', 'api', 'package', 'lock', 'lockfile',
];
// Stems: a word (or joined pair) that STARTS with one of these is H (R-1, F2, Q3, A1-1, R-2, F4, F5). The list errs wide.
export const H_PATH_STEMS = [
  'auth', 'tenan', 'ident', 'crypt', 'encrypt', 'decrypt', 'oauth', 'oidc', 'saml', 'passkey', 'webauthn', 'session', 'credential',
  'password', 'secret', 'token', 'permission', 'entitle', 'webhook', 'publish', 'migrat', 'subscri', 'invoic', 'refund', 'payout',
  'payment', 'billing', 'checkout', 'charge', 'member', 'invit', 'consent', 'privacy', 'gdpr', 'pdpa', 'account', 'admin', 'upload',
  'storage', 'bucket', 'purge', 'delet', 'erase', 'queue', 'cron', 'schedul', 'worker', 'job', 'retry', 'provider', 'adapter',
  'integrat', 'notif', 'mail', 'email', 'smtp', 'sms', 'config', 'tsconfig', 'jsconfig', 'eslint', 'babel', 'npmrc', 'yarn', 'pnpm',
];

// Added-line signals that put a file in H wherever it sits: the environment, secrets, SQL that changes schema or grants,
// payment and provider calls, and the browser's code-injection sinks.
export const H_LINE_SIGNALS = [
  [/\bprocess\.env\b|\bimport\.meta\.env\b|\bprocess\s*[.[]|\bDeno\s*\.\s*env\b|\bBun\s*\.\s*env\b/, 'reads the environment (a secret path)'],
  [/service_role|\bSUPABASE_[A-Z_]+/i, 'names a privileged database credential'],
  [/\b(?:secret|password|passwd|api[_-]?key|private[_-]?key|access[_-]?token|refresh[_-]?token|client[_-]?secret|bearer)\b/i, 'names a secret'],
  [/\b(?:create|alter|drop)\s+(?:table|policy|function|role|schema|trigger|view|index|extension)\b/i, 'SQL that changes schema'],
  [/\b(?:grant|revoke)\s+(?:select|insert|update|delete|all|usage|execute|references|trigger)\b/i, 'SQL that changes a grant'],
  [/row\s+level\s+security|\bbypassrls\b|\bsecurity\s+definer\b/i, 'RLS or definer rights'],
  [/\bstripe\b|\bwebhook\b|\boauth\b/i, 'a payment, webhook or OAuth path'],
  [/\bdangerouslySetInnerHTML\b|\beval\s*\(|\bnew\s+Function\s*\(|<script\b|\binnerHTML\b|\bouterHTML\b|\binsertAdjacentHTML\b|\bdocument\s*\.\s*write(?:ln)?\b|javascript\s*:|<\s*foreignObject\b|\bsrcdoc\b|\bset(?:Timeout|Interval)\s*\(\s*['"`]/i, 'a code-injection sink'],
  // An HTML event-handler attribute (`onload=`, `onerror=`) in markup, SVG or copy: lower case only, so JSX's camel-case
  // `onClick={...}` is not one; a handler written as a string is.
  [/\bon[a-z]+\s*=(?!\s*\{|=)/, 'a code-injection sink (an HTML event-handler attribute)'],
];
// Identifiers in an added line, split into sub-words the way paths are (A1-2): `hashPassword`, `DB_PASSWORD`,
// `userApiKey`, `webhookSecret`, `getAccessToken`, `stripeClient`, `oauth_client_id`, `process["env"]`.
export const H_IDENT_WORDS = [
  'password', 'passwords', 'passwd', 'secret', 'secrets', 'credential', 'credentials', 'bearer', 'jwt', 'stripe', 'webhook',
  'webhooks', 'oauth', 'apikey', 'privatekey', 'accesstoken', 'refreshtoken', 'clientsecret', 'servicerole', 'env',
];
const IDENT = /[A-Za-z_$][A-Za-z0-9_$]*/g;
export function identWords(line) {
  const out = [];
  for (const id of line.match(IDENT) ?? []) {
    const ws = pathWords(id);
    out.push(...ws);
    for (let i = 0; i + 1 < ws.length; i += 1) out.push(ws[i] + ws[i + 1]);
  }
  return out;
}

// Added-line signals that a file has a data path. L requires none (RFC-2026-030 §3, "no data path"); M may have them.
// A denylist: L's fail-closed part is the import allowlist (lImportProblems) and the Reviewer's written confirmation.
export const DATA_LINE_SIGNALS = [
  [/\bfetch\s*\(|\bXMLHttpRequest\b|\bWebSocket\b|\bEventSource\b|\baxios\b|\bsendBeacon\b/, 'a network call'],
  [/['"]use server['"]|\bserver-only\b|\bcookies\s*\(|\bheaders\s*\(/, 'server code'],
  [/@supabase\/|\bcreateClient\s*\(|\.rpc\s*\(|(?<!\bArray)\.from\s*\(/, 'a database client'],
  [/['"`][^'"`]*\/api\//, 'an API route'],
  [/\blocalStorage\b|\bsessionStorage\b|\bindexedDB\b|\bdocument\.cookie\b/, 'browser storage'],
  [/(?:https?:)?\/\/(?!www\.w3\.org\/)[a-z0-9-]+(?:\.[a-z0-9-]+)+/i, 'an absolute URL (a request to another host)'],
  [/\baction\s*=|\bformAction\b/, 'a form action (a server-action write)'],
  [/\bnavigator\s*\.|\bpostMessage\b|\blocation\s*\.\s*(?:href|assign|replace)\b|\bwindow\s*\.\s*location\b|\b(?:window|globalThis|self)\s*\[|\bnew\s+Image\s*\(|<\s*iframe\b/i, 'a browser channel out of the page'],
  [/\bimport\s*\(|\brequire\s*\(/, 'a dynamic import or require'],
];

// Removed lines that look like a guard (A1-6, F6): a flag check, a permission or tenant condition, an escape or a
// sanitizer, a throw, a negated early exit. Removing one from module logic is H.
export const GUARD_LINE = /\b(?:flags?|feature\w*|isEnabled|enabled|guard\w*|permission\w*|can[A-Z]\w*|tenant\w*|sanitiz\w*|escape\w*|auth\w*|roles?|allow\w*|deny\w*|forbid\w*|throw)\b|\bif\s*\(\s*!/;

const TEST_FILE = /(?:\.(?:test|spec)\.[cm]?[jt]sx?$)|(?:^|\/)__tests__\/.+\.[cm]?[jt]sx?$/;
const CODE_OR_TEXT = /\.(?:[cm]?[jt]sx?|json|css|scss|md|mdx|svg|html)$/;
const MODULE_PATH = /^src\/modules\/([a-z0-9][a-z0-9-]*)\/(.+)$/;
// L: presentational paths only. A module's `ui/` (or `components/`), the web app's components, its copy catalogues,
// stylesheets in those trees, and raster images. Route files, layouts, server actions, `lib/`, a public SVG are not L.
export const L_PATHS = [
  /^src\/modules\/[a-z0-9][a-z0-9-]*\/(?:ui|components)\/.+\.(?:[jt]sx|css|scss|svg)$/,
  /^apps\/web\/(?:src\/)?components\/.+\.(?:[jt]sx|css|scss|svg)$/,
  /^apps\/web\/(?:src\/)?(?:messages|locales)\/[^/]+\.json$/,
  /^apps\/web\/(?:src\/)?styles\/.+\.(?:css|scss)$/,
  /^apps\/web\/public\/.+\.(?:png|jpe?g|webp|avif|ico)$/,
];
// The only packages an L file may import (F1, A1-3, Q2, R-3). Everything else -- a data hook, a server action, an
// alias into `lib/` -- is a data path until a reader shows otherwise.
export const L_IMPORT_PACKAGES = ['react'];
// M: code inside exactly one module, `src/modules/<key>/**`, with a test in the same module in the diff.
const M_PATH = /^src\/modules\/[a-z0-9][a-z0-9-]*\/.+\.(?:[cm]?[jt]sx?|json|css|scss)$/;
// Paths that accompany a PR of any tier and add none of their own (§4.2): a Markdown record directly under one
// package's evidence, ADDED or APPENDED to (Q1, A1-8); the package's handoff; the recorded verification counts. A
// work-package manifest is neutral only when its change is records-shaped plus the branch slot, with no status move
// past `in_review` (R-4).
const NEUTRAL_EVIDENCE = /^evidence\/([^/]+)\/[^/]+\.md$/;
const NEUTRAL_HANDOFF = /^handoffs\/(.+?)-[a-z0-9]+-handoff\.json$/;
const VERIFICATION = 'evidence/VERIFICATION.md';
const IN_REVIEW = STATUS_FLOW.indexOf('in_review');

export const pathWords = (path) => path
  .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
  .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
  .toLowerCase()
  .split(/[^a-z0-9]+/)
  .filter(Boolean);

// The H words and stems a path carries, each pair of adjacent words also tried joined.
export function hPathHits(path) {
  const ws = pathWords(path);
  const cands = [...ws];
  for (let i = 0; i + 1 < ws.length; i += 1) cands.push(ws[i] + ws[i + 1]);
  return [...new Set(cands.filter((w) => H_PATH_WORDS.includes(w) || H_PATH_STEMS.some((s) => w.startsWith(s))))];
}

export function lineSignals(lines, table) {
  const found = [];
  for (const [re, what] of table) if (lines.some((l) => re.test(l))) found.push(what);
  return found;
}

// Every H signal of a set of added lines: the regex table and the identifier sub-words.
export function hSignals(lines) {
  const found = lineSignals(lines, H_LINE_SIGNALS);
  const words = new Set(lines.flatMap(identWords).filter((w) => H_IDENT_WORDS.includes(w)));
  if (words.size > 0) found.push(`names a secret, payment, webhook or environment identifier (${[...words].sort().join(', ')})`);
  return found;
}

// A manifest change is neutral when, the branch slot set aside, it is a records change under RFC-2026-025 §6.1 and it
// moves the status no further than `in_review`. Every status move is pushed onto `moves` for the reader.
export function manifestNeutral(beforeText, afterText, moves = []) {
  let after;
  let before;
  try { before = JSON.parse(beforeText); after = JSON.parse(afterText); } catch { return ['the manifest does not parse as JSON on both sides']; }
  if (before?.ownership && after?.ownership && typeof before.ownership === 'object' && typeof after.ownership === 'object') {
    after = { ...after, ownership: { ...after.ownership, branch: before.ownership.branch } };
  }
  const mine = [];
  const reasons = manifestDelta(JSON.stringify(before), JSON.stringify(after), mine);
  for (const m of mine) {
    moves.push(m);
    const to = m.split(' -> ')[1];
    if (STATUS_FLOW.indexOf(to) > IN_REVIEW) reasons.push(`status: ${m} (a move past in_review is not part of an M or L PR: RFC-2026-030 §3.2)`);
  }
  return reasons;
}

const IMPORT_SPECS = [
  /\b(?:import|export)\b[^'"`;]*?\bfrom\s*['"]([^'"]+)['"]/g,
  /\bimport\s*['"]([^'"]+)['"]/g,
  /@import\s+(?:url\(\s*)?['"]?([^'")\s;]+)/g,
];
export function importSpecs(lines) {
  const out = [];
  for (const l of lines) for (const re of IMPORT_SPECS) for (const m of l.matchAll(re)) out.push(m[1]);
  return out;
}
const LEXT = ['', '.tsx', '.jsx', '.ts', '.js', '.mjs', '.cjs', '.css', '.scss', '.json', '.svg', '/index.tsx', '/index.jsx', '/index.ts', '/index.js'];
const resolveRel = (from, spec) => posix.normalize(posix.join(posix.dirname(from), spec));

// L's import allowlist: an L file may import only L files that exist at the head (resolved from a relative specifier)
// and L_IMPORT_PACKAGES. `files` is the set of paths at the head; without it no relative import resolves.
export function lImportProblems(path, lines, files) {
  const problems = [];
  for (const spec of importSpecs(lines)) {
    if (L_IMPORT_PACKAGES.includes(spec)) continue;
    if (!spec.startsWith('.')) { problems.push(`imports ${spec} (an L file imports only L files and ${L_IMPORT_PACKAGES.join(', ')})`); continue; }
    const target = resolveRel(path, spec);
    const hits = LEXT.map((e) => target + e).filter((p) => files?.has(p));
    if (hits.length === 0) problems.push(`imports ${spec}, which resolves to no file at the head`);
    else if (!hits.every((p) => L_PATHS.some((re) => re.test(p)))) problems.push(`imports ${spec} (${hits.join(', ')}: not an L path)`);
  }
  return problems;
}

// A module file's imports of another module (F5): a relative path into `src/modules/<other>/`, or an alias naming
// `modules/<other>`.
export function crossModuleImports(path, mod, lines) {
  const out = new Set();
  for (const spec of importSpecs(lines)) {
    const where = spec.startsWith('.') ? resolveRel(path, spec) : spec;
    const m = /(?:^|[/@~])modules\/([a-z0-9][a-z0-9-]*)(?:\/|$)/.exec(where);
    if (m && m[1] !== mod) out.add(m[1]);
  }
  return [...out];
}

// One changed path. `added` / `ctx.removed` are its added / removed lines (for a text file), `text` reads a blob.
// `ctx.mEligible` is the module allowlist, `ctx.files` the set of paths at the head, `ctx.moves` collects status moves.
// Returns { tier, reasons, module, test, pkg } where tier is null for a neutral path.
export function classifyPath(change, added, text, ctx = {}) {
  const { removed = [], mEligible = M_ELIGIBLE_MODULES, files = null, moves = [] } = ctx;
  const { status, path, oldMode, newMode, oldBlob, newBlob } = change;
  const H = (why) => ({ tier: 'H', reasons: [`${path}: ${why}`] });
  if (CLASSIFIERS.includes(path)) return H('changes a tier classifier (the base\'s copy decides the tier: RFC-2026-030 §4)');
  if (!['A', 'M', 'D'].includes(status)) return H(`status ${status} (a rename, copy or type change is H)`);
  const modeOk = (m) => m === '100644' || (status === 'A' && m === '000000') || (status === 'D' && m === '000000');
  if (!modeOk(oldMode) || !modeOk(newMode)) return H(`mode ${oldMode} -> ${newMode} (only a regular, non-executable file is below H)`);
  if (path === VERIFICATION) {
    if (status === 'D') return H('a deleted record (records are appended to, never removed)');
    return { tier: null, reasons: [] };
  }
  const ev = NEUTRAL_EVIDENCE.exec(path);
  if (ev) {
    if (status === 'D') return H('a deleted record (records are appended to, never removed)');
    if (status === 'M' && removed.length > 0) return H('rewrites an existing record (evidence below H is added or appended to, never rewritten)');
    return { tier: null, reasons: [], pkg: ev[1] };
  }
  const ho = NEUTRAL_HANDOFF.exec(path);
  if (ho) {
    if (status === 'D') return H('a deleted record (records are appended to, never removed)');
    return { tier: null, reasons: [], pkg: ho[1] };
  }
  if (/^work-packages\/[^/]+\.json$/.test(path)) {
    if (status !== 'M') return H('a work-package manifest added or removed');
    const r = manifestNeutral(text(oldBlob), text(newBlob), moves);
    return r.length === 0 ? { tier: null, reasons: [], pkg: path.slice('work-packages/'.length, -'.json'.length) } : { tier: 'H', reasons: r.map((x) => `${path}: ${x}`) };
  }
  const sensitive = hPathHits(path);
  if (sensitive.length > 0) return H(`an H word in the path (${sensitive.join(', ')})`);
  const isL = L_PATHS.some((re) => re.test(path));
  const isM = M_PATH.test(path);
  if (!isL && !isM) return H('not an L or M path (anything the classifier cannot place is H)');
  const mod = MODULE_PATH.exec(path)?.[1] ?? null;
  if (mod && !mEligible.includes(mod)) return H(`module ${mod} is not on the reviewed module allowlist (M_ELIGIBLE_MODULES; RFC-2026-030 §4.2)`);
  const test = isM && TEST_FILE.test(path);
  if (status === 'D') {
    // A deletion inside a module is that module's logic (M); a deleted presentational file outside one is L only if
    // nothing reads it, which the classifier cannot see, so it is M's question and M needs a module: H.
    // A deleted test is not "with tests": it never satisfies M's test condition.
    return mod ? { tier: 'M', reasons: [`${path}: deleted (M at least)`], module: mod, test: false } : H('a deletion outside a module');
  }
  const lines = CODE_OR_TEXT.test(path) ? added : [];
  const gone = CODE_OR_TEXT.test(path) ? removed : [];
  const hs = hSignals(lines);
  if (hs.length > 0) return H(`an added line ${hs.join('; ')}`);
  if (mod) {
    const other = crossModuleImports(path, mod, lines);
    if (other.length > 0) return H(`imports module ${other.join(', ')} (a cross-module change is H)`);
  }
  if (isL && !test) {
    const ds = [...lineSignals(lines, DATA_LINE_SIGNALS), ...lImportProblems(path, lines, files)];
    if (gone.length > 0) ds.push('removes lines (a flag guard or an escape could go; an L change only adds)');
    if (ds.length === 0) return { tier: 'L', reasons: [], module: mod, test: false };
    if (!mod) return H(`a presentational file that is not L outside a module (${ds.join('; ')})`);
    return { tier: 'M', reasons: [`${path}: not L (${ds.join('; ')})`], module: mod, test: false };
  }
  const guards = gone.filter((l) => GUARD_LINE.test(l) || hSignals([l]).length > 0);
  if (guards.length > 0) return H(`removes a guard-shaped line (${guards.length}): a removed check is H`);
  return { tier: 'M', reasons: [], module: mod, test };
}

// The whole diff. `changes` are parsed `git diff --raw` entries; `addedOf(change)` returns its added lines; `text`
// reads a blob; `opts.removedOf(change)` its removed lines, `opts.mEligible` the module allowlist, `opts.files` the
// paths at the head. Returns { tier, reasons, recordsOnly, module, paths, statusMoves }.
export function classifyTier(changes, addedOf, text, opts = {}) {
  if (!Array.isArray(changes) || changes.length === 0) {
    return { tier: 'H', reasons: ['an empty diff is not classified (H)'], recordsOnly: false, module: null, paths: [], statusMoves: [] };
  }
  const { removedOf = () => [], mEligible = M_ELIGIBLE_MODULES, files = null } = opts;
  const paths = changes.map((c) => c.path);
  const records = classifyDiff(changes, text);
  if (records.recordsOnly) return { tier: 'records', reasons: [], recordsOnly: true, module: null, paths, statusMoves: records.statusMoves };
  let tier = 'records';
  const reasons = [];
  const modules = new Set();
  const packages = new Set();
  const statusMoves = [];
  let moduleCode = false;
  let moduleTest = false;
  let bearing = 0;
  for (const c of changes) {
    const r = classifyPath(c, addedOf(c), text, { removed: removedOf(c), mEligible, files, moves: statusMoves });
    reasons.push(...r.reasons);
    if (r.pkg) packages.add(r.pkg);
    if (r.tier === null) continue;
    bearing += 1;
    tier = maxTier(tier, r.tier);
    if (r.module) modules.add(r.module);
    if (r.tier === 'M' && r.module && !r.test) moduleCode = true;
    if (r.test) moduleTest = true;
  }
  if (bearing === 0) {
    reasons.push('only evidence, handoff or manifest paths, and not records-only under RFC-2026-025 §6.1 (H)');
    tier = 'H';
  }
  if (modules.size > 1) {
    reasons.push(`more than one module (${[...modules].sort().join(', ')}): a cross-module change is H`);
    tier = 'H';
  }
  if (packages.size > 1) {
    reasons.push(`records of more than one package (${[...packages].sort().join(', ')}): H`);
    tier = 'H';
  }
  if (tier === 'M' && moduleCode && !moduleTest) {
    reasons.push('module logic changed with no test file of that module in the diff: M needs its tests (H)');
    tier = 'H';
  }
  return { tier, reasons, recordsOnly: false, module: modules.size === 1 ? [...modules][0] : null, paths, statusMoves };
}

// `git diff -U0` output for one path -> its added and removed lines (without the leading sign). Only lines inside a
// hunk count, so an added line whose own text starts with `++` is read (Q5) and the `+++ b/` header is not.
export function patchLines(patch) {
  const added = [];
  const removed = [];
  let inHunk = false;
  for (const l of patch.split('\n')) {
    if (l.startsWith('@@')) { inHunk = true; continue; }
    if (!inHunk) continue;
    if (l.startsWith('diff --git ')) { inHunk = false; continue; }
    if (l.startsWith('+')) added.push(l.slice(1));
    else if (l.startsWith('-')) removed.push(l.slice(1));
  }
  return { added, removed };
}
export const addedLines = (patch) => patchLines(patch).added;

// What the CLI prints, as lines.
export function formatReport(r) {
  const out = [`tier: ${r.tier} (${r.paths.length} path(s), ${String(r.mergeBase ?? '').slice(0, 7)}..${String(r.head ?? '').slice(0, 7)}${r.module ? `, module ${r.module}` : ''})`];
  for (const why of r.reasons) out.push(`  ${why}`);
  if (r.tier === 'L') out.push('  L holds only if every changed component is behind a feature flag AND has no data path: the Reviewer confirms both in writing, or raises the tier (RFC-2026-030 §4.3).');
  for (const m of r.statusMoves ?? []) out.push(`  status move for the reader to check against its role verdict: ${m}`);
  if (r.copy) out.push(`  ${r.copy}`);
  return out;
}

// ---- the git side ---------------------------------------------------------------------------------------------

const git = (args) => execFileSync('git', args, {
  encoding: 'utf8',
  maxBuffer: 256 * 1024 * 1024,
  env: { ...process.env, GIT_LITERAL_PATHSPECS: '1' },
  stdio: ['ignore', 'pipe', 'pipe'],
});
const rev = (ref) => git(['rev-parse', '--verify', '--quiet', `${ref}^{commit}`]).trim();

// Whether the copy running is the base's (A1-4). It changes no tier; it says whether a tier printed here counts.
export function copyNote(baseCommit) {
  const here = dirname(fileURLToPath(import.meta.url));
  const same = CLASSIFIERS.every((p) => {
    let baseBlob;
    try { baseBlob = git(['rev-parse', '--verify', '--quiet', `${baseCommit}:${p}`]).trim(); } catch { return false; }
    return git(['hash-object', join(here, posix.basename(p))]).trim() === baseBlob;
  });
  return same
    ? 'classifier copy: the base\'s (both classifiers equal the base\'s blobs)'
    : 'classifier copy: NOT the base\'s -- under RFC-2026-030 §4 only the base\'s copy decides the tier; run that copy';
}

export function classifyTierRange(base, head) {
  const b = rev(base);
  const h = rev(head);
  const mb = git(['merge-base', b, h]).trim();
  const raw = git(['diff', '--raw', '-z', '--no-abbrev', '--no-renames', '--no-ext-diff', mb, h]);
  const text = (blob) => git(['cat-file', 'blob', blob]);
  const files = new Set(git(['ls-tree', '-r', '-z', '--name-only', h]).split('\0').filter(Boolean));
  const cache = new Map();
  const lines = (c) => {
    if (c.status === 'D') return { added: [], removed: [] };
    if (!cache.has(c.path)) cache.set(c.path, patchLines(git(['diff', '-U0', '--no-renames', '--no-ext-diff', '--text', mb, h, '--', c.path])));
    return cache.get(c.path);
  };
  const r = classifyTier(parseRawDiff(raw), (c) => lines(c).added, text, { removedOf: (c) => lines(c).removed, files });
  return { mergeBase: mb, head: h, copy: copyNote(b), ...r };
}

function main(argv) {
  if (argv.length > 2 || argv.some((a) => a.startsWith('-'))) {
    console.error('usage: classify-review-tier.mjs [<base>=origin/main] [<head>=HEAD]');
    return 2;
  }
  const [base = 'origin/main', head = 'HEAD'] = argv;
  for (const line of formatReport(classifyTierRange(base, head))) console.log(line);
  return 0;
}

if (process.argv[1] && realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url))) {
  try {
    process.exitCode = main(process.argv.slice(2));
  } catch (error) {
    console.error(`classify-review-tier: ${error.message.split('\n')[0]} -- not classified, which is H (fail closed).`);
    process.exitCode = 2;
  }
}
