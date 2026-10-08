// THE REVIEW-TIER CLASSIFIER (RFC-2026-030 §4, APPROVED IN PRINCIPLE 2026-10-08, final text approved at merge).
//
// Why it exists. RFC-2026-030 keeps separation of duties absolute and varies only how DEEP the independent review of a
// pull request is: H (every role on every PR, as today), M (Reviewer + Tester per PR, the Integration Owner at the end
// of the work package), L (one independent Reviewer, the Tester reading CI/Playwright artifacts), and `records`
// (RFC-2026-025 §6, unchanged). The tier is decided by this script, not by the Author. It is a classifier, not an
// approver: it says which path a PR takes and nothing about whether the change is right.
//
// It FAILS CLOSED, and only ever UPWARD. A path it does not know, a sensitive word in a path, a data-path or secret
// signal in an added line, more than one module, a module change with no test, a rename, a deletion outside a module,
// a symlink or executable, a manifest it cannot parse -- each makes the PR H. A git or usage error exits 2, and RFC-2026-030
// treats exit 2 as H. No rule here can lower a tier below what another rule set; a reader may raise it, nobody lowers it.
//
// Today the repository has no application paths (`apps/`, `src/modules/` do not exist; RFC-2026-029 proposes the
// layout), so every PR on it is H or `records`. The L and M rules are written for that layout and are proved here on
// synthetic diffs only.
//
// Usage:
//   node scripts/db/classify-review-tier.mjs [<base>=origin/main] [<head>=HEAD]
//       prints `tier: <records|L|M|H>` and every reason that raised it; exit 0. Exit 2 = not classified = H.
//
// Node built-ins only (RFC-2026-001: no dependency).
import { execFileSync } from 'node:child_process';
import { realpathSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { classifyDiff, manifestDelta, parseRawDiff } from './classify-records-only.mjs';

export const TIERS = ['records', 'L', 'M', 'H'];
const rank = (t) => TIERS.indexOf(t);
export const maxTier = (...ts) => ts.reduce((a, b) => (rank(b) > rank(a) ? b : a), 'records');

// A word anywhere in a path (split on / . - _ and case changes) that names an H domain of RFC-2026-030 §3:
// migrations/RLS, auth, secrets/OAuth, publishing, billing, CI/gates, contracts. A false hit (`design-tokens.css`)
// costs a heavier review; a miss would cost a lighter one, so the list errs wide.
export const H_PATH_WORDS = [
  'auth', 'authn', 'authz', 'iam', 'login', 'session', 'sessions', 'password', 'passwords', 'secret', 'secrets', 'oauth',
  'token', 'tokens', 'credential', 'credentials', 'vault', 'key', 'keys', 'crypto', 'publish', 'publishing', 'publisher',
  'billing', 'payment', 'payments', 'stripe', 'checkout', 'entitlement', 'entitlements', 'webhook', 'webhooks', 'rls',
  'policy', 'policies', 'migration', 'migrations', 'sql', 'supabase', 'db', 'database', 'schema', 'schemas', 'contract',
  'contracts', 'middleware', 'admin', 'tenant', 'tenants', 'permission', 'permissions', 'role', 'roles', 'env', 'ci',
  'workflow', 'workflows', 'gate', 'gates', 'meta', 'connector', 'connectors', 'server', 'api',
];

// Added-line signals that put a file in H wherever it sits: secrets, SQL that changes schema or grants, payment and
// provider calls, and the browser's code-injection sinks.
export const H_LINE_SIGNALS = [
  [/\bprocess\.env\b|\bimport\.meta\.env\b/, 'reads the environment (a secret path)'],
  [/service_role|\bSUPABASE_[A-Z_]+/i, 'names a privileged database credential'],
  [/\b(?:secret|password|passwd|api[_-]?key|private[_-]?key|access[_-]?token|refresh[_-]?token|client[_-]?secret|bearer)\b/i, 'names a secret'],
  [/\b(?:create|alter|drop)\s+(?:table|policy|function|role|schema|trigger|view|index|extension)\b/i, 'SQL that changes schema'],
  [/\b(?:grant|revoke)\s+(?:select|insert|update|delete|all|usage|execute|references|trigger)\b/i, 'SQL that changes a grant'],
  [/row\s+level\s+security|\bbypassrls\b|\bsecurity\s+definer\b/i, 'RLS or definer rights'],
  [/\bstripe\b|\bwebhook\b|\boauth\b/i, 'a payment, webhook or OAuth path'],
  [/\bdangerouslySetInnerHTML\b|\beval\s*\(|\bnew\s+Function\s*\(|<script\b/i, 'a code-injection sink'],
];

// Added-line signals that a file has a data path. L requires none (RFC-2026-030 §3, "no data path"); M may have them.
export const DATA_LINE_SIGNALS = [
  [/\bfetch\s*\(|\bXMLHttpRequest\b|\bWebSocket\b|\bEventSource\b|\baxios\b|\bsendBeacon\b/, 'a network call'],
  [/['"]use server['"]|\bserver-only\b|\bcookies\s*\(|\bheaders\s*\(/, 'server code'],
  [/@supabase\/|\bcreateClient\s*\(|\.rpc\s*\(|\.from\s*\(\s*['"]/, 'a database client'],
  [/['"`][^'"`]*\/api\//, 'an API route'],
  [/\blocalStorage\b|\bsessionStorage\b|\bindexedDB\b|\bdocument\.cookie\b/, 'browser storage'],
];

const TEST_FILE = /(?:\.(?:test|spec)\.[cm]?[jt]sx?$)|(?:^|\/)__tests__\//;
const CODE_OR_TEXT = /\.(?:[cm]?[jt]sx?|json|css|scss|md|mdx|svg|html)$/;
const MODULE_PATH = /^src\/modules\/([a-z0-9][a-z0-9-]*)\/(.+)$/;
// L: presentational paths only. A module's `ui/` (or `components/`), the web app's components, its copy catalogues,
// stylesheets anywhere in those trees, and static images. Route files, layouts, server actions, `lib/` are not L.
export const L_PATHS = [
  /^src\/modules\/[a-z0-9][a-z0-9-]*\/(?:ui|components)\/.+\.(?:[jt]sx|css|scss|svg)$/,
  /^apps\/web\/(?:src\/)?components\/.+\.(?:[jt]sx|css|scss|svg)$/,
  /^apps\/web\/(?:src\/)?(?:messages|locales)\/[^/]+\.json$/,
  /^apps\/web\/(?:src\/)?styles\/.+\.(?:css|scss)$/,
  /^apps\/web\/public\/.+\.(?:png|jpe?g|webp|avif|svg|ico)$/,
];
// M: code inside exactly one module, `src/modules/<key>/**`, with a test in the same module in the diff.
const M_PATH = /^src\/modules\/[a-z0-9][a-z0-9-]*\/.+\.(?:[cm]?[jt]sx?|json|css|scss)$/;
// Paths that accompany a PR of any tier and add none of their own (§4.2): the package's evidence, its handoff, the
// recorded verification counts. A work-package manifest is neutral only when its change is records-shaped plus the
// branch slot; anything else in it (ownership, roles, scope) is H.
const NEUTRAL = [/^evidence\/[^/]+\/.+$/, /^handoffs\/[^/]+\.json$/, /^evidence\/VERIFICATION\.md$/];

export const pathWords = (path) => path
  .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
  .toLowerCase()
  .split(/[/._\-\s]+/)
  .filter(Boolean);

export function lineSignals(lines, table) {
  const found = [];
  for (const [re, what] of table) if (lines.some((l) => re.test(l))) found.push(what);
  return found;
}

// A manifest change is neutral when, the branch slot set aside, it is a records change under RFC-2026-025 §6.1.
export function manifestNeutral(beforeText, afterText) {
  let after;
  let before;
  try { before = JSON.parse(beforeText); after = JSON.parse(afterText); } catch { return ['the manifest does not parse as JSON on both sides']; }
  if (before?.ownership && after?.ownership && typeof before.ownership === 'object' && typeof after.ownership === 'object') {
    after = { ...after, ownership: { ...after.ownership, branch: before.ownership.branch } };
  }
  return manifestDelta(JSON.stringify(before), JSON.stringify(after));
}

// One changed path. `added` is the list of added lines (for a text file), `text` reads a blob. Returns
// { tier, reasons, module, test } where tier is null for a neutral path.
export function classifyPath(change, added, text) {
  const { status, path, oldMode, newMode, oldBlob, newBlob } = change;
  const H = (why) => ({ tier: 'H', reasons: [`${path}: ${why}`] });
  if (!['A', 'M', 'D'].includes(status)) return H(`status ${status} (a rename, copy or type change is H)`);
  const modeOk = (m) => m === '100644' || (status === 'A' && m === '000000') || (status === 'D' && m === '000000');
  if (!modeOk(oldMode) || !modeOk(newMode)) return H(`mode ${oldMode} -> ${newMode} (only a regular, non-executable file is below H)`);
  if (NEUTRAL.some((re) => re.test(path))) {
    if (status === 'D') return H('a deleted record (records are appended to, never removed)');
    return { tier: null, reasons: [] };
  }
  if (/^work-packages\/[^/]+\.json$/.test(path)) {
    if (status !== 'M') return H('a work-package manifest added or removed');
    const r = manifestNeutral(text(oldBlob), text(newBlob));
    return r.length === 0 ? { tier: null, reasons: [] } : { tier: 'H', reasons: r.map((x) => `${path}: ${x}`) };
  }
  const sensitive = pathWords(path).filter((w) => H_PATH_WORDS.includes(w));
  if (sensitive.length > 0) return H(`an H word in the path (${[...new Set(sensitive)].join(', ')})`);
  const isL = L_PATHS.some((re) => re.test(path));
  const isM = M_PATH.test(path);
  if (!isL && !isM) return H('not an L or M path (anything the classifier cannot place is H)');
  const mod = MODULE_PATH.exec(path)?.[1] ?? null;
  const test = isM && TEST_FILE.test(path);
  if (status === 'D') {
    // A deletion inside a module is that module's logic (M); a deleted presentational file outside one is L only if
    // nothing reads it, which the classifier cannot see, so it is M's question and M needs a module: H.
    // A deleted test is not "with tests": it never satisfies M's test condition.
    return mod ? { tier: 'M', reasons: [`${path}: deleted (M at least)`], module: mod, test: false } : H('a deletion outside a module');
  }
  const lines = CODE_OR_TEXT.test(path) ? added : [];
  const hs = lineSignals(lines, H_LINE_SIGNALS);
  if (hs.length > 0) return H(`an added line ${hs.join('; ')}`);
  if (isL && !test) {
    const ds = lineSignals(lines, DATA_LINE_SIGNALS);
    if (ds.length === 0) return { tier: 'L', reasons: [], module: mod, test: false };
    if (!mod) return H(`a presentational file with a data path outside a module (${ds.join('; ')})`);
    return { tier: 'M', reasons: [`${path}: a data path (${ds.join('; ')}), so not L`], module: mod, test: false };
  }
  return { tier: 'M', reasons: [], module: mod, test };
}

// The whole diff. `changes` are parsed `git diff --raw` entries; `addedOf(change)` returns its added lines; `text`
// reads a blob. Returns { tier, reasons, recordsOnly, module, paths }.
export function classifyTier(changes, addedOf, text) {
  if (!Array.isArray(changes) || changes.length === 0) {
    return { tier: 'H', reasons: ['an empty diff is not classified (H)'], recordsOnly: false, module: null, paths: [] };
  }
  const paths = changes.map((c) => c.path);
  const records = classifyDiff(changes, text);
  if (records.recordsOnly) return { tier: 'records', reasons: [], recordsOnly: true, module: null, paths, statusMoves: records.statusMoves };
  let tier = 'records';
  const reasons = [];
  const modules = new Set();
  let moduleCode = false;
  let moduleTest = false;
  let bearing = 0;
  for (const c of changes) {
    const r = classifyPath(c, addedOf(c), text);
    reasons.push(...r.reasons);
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
  if (tier === 'M' && moduleCode && !moduleTest) {
    reasons.push('module logic changed with no test file of that module in the diff: M needs its tests (H)');
    tier = 'H';
  }
  return { tier, reasons, recordsOnly: false, module: modules.size === 1 ? [...modules][0] : null, paths };
}

// `git diff -U0` output for one path -> its added lines (without the leading '+').
export function addedLines(patch) {
  return patch.split('\n').filter((l) => l.startsWith('+') && !l.startsWith('+++')).map((l) => l.slice(1));
}

// ---- the git side ---------------------------------------------------------------------------------------------

const git = (args) => execFileSync('git', args, {
  encoding: 'utf8',
  maxBuffer: 256 * 1024 * 1024,
  env: { ...process.env, GIT_LITERAL_PATHSPECS: '1' },
  stdio: ['ignore', 'pipe', 'pipe'],
});
const rev = (ref) => git(['rev-parse', '--verify', '--quiet', `${ref}^{commit}`]).trim();

export function classifyTierRange(base, head) {
  const b = rev(base);
  const h = rev(head);
  const mb = git(['merge-base', b, h]).trim();
  const raw = git(['diff', '--raw', '-z', '--no-abbrev', '--no-renames', '--no-ext-diff', mb, h]);
  const text = (blob) => git(['cat-file', 'blob', blob]);
  const addedOf = (c) => (c.status === 'D' ? [] : addedLines(git(['diff', '-U0', '--no-renames', '--no-ext-diff', '--text', mb, h, '--', c.path])));
  return { mergeBase: mb, head: h, ...classifyTier(parseRawDiff(raw), addedOf, text) };
}

function main(argv) {
  if (argv.length > 2 || argv.some((a) => a.startsWith('-'))) {
    console.error('usage: classify-review-tier.mjs [<base>=origin/main] [<head>=HEAD]');
    return 2;
  }
  const [base = 'origin/main', head = 'HEAD'] = argv;
  const r = classifyTierRange(base, head);
  console.log(`tier: ${r.tier} (${r.paths.length} path(s), ${r.mergeBase.slice(0, 7)}..${r.head.slice(0, 7)}${r.module ? `, module ${r.module}` : ''})`);
  for (const why of r.reasons) console.log(`  ${why}`);
  if (r.tier === 'L') console.log('  L holds only if every changed component is behind a feature flag: the Reviewer confirms it, or raises the tier (RFC-2026-030 §4.3).');
  for (const m of r.statusMoves ?? []) console.log(`  status move for the reader to check against its role verdict: ${m}`);
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
