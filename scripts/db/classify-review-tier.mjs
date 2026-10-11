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
// THE LANE (RFC-2026-034 §2.2, approved 2026-10-11; §8 item 2). `laneOf` maps the tier and the changed paths to one of
// the four lanes plus records: governance, records, audit, risk, fast. It too fails closed and only upward: a path it
// cannot place on the governance list is not thereby lowered (the tier still decides risk against fast), an import it
// cannot read makes the pull request governance, and a head branch, head repository or change mode it cannot check is
// not the audit lane. It decides nothing the lane's readers decide: whether an additive guard edit is additive is A1's
// and Q0's written confirmation, and `additiveEligible` only says that the pull request is governance solely through
// paths that confirmation can cover.
//
// Usage:
//   node scripts/db/classify-review-tier.mjs [<base>=origin/main] [<head>=HEAD]
//       prints `tier: <records|L|M|H>` and every reason that raised it; exit 0. Exit 2 = not classified = H.
//   node scripts/db/classify-review-tier.mjs [<base>] [<head>] --lane [--head-ref=<branch>] [--repo=<owner/name>]
//                                                                     [--head-repo=<owner/name>]
//       the same, then `lane: <governance|records|audit|risk|fast>` and its reasons, and `additive-eligible: yes` when
//       that applies. `--head-ref` names the pull request's head branch, `--repo` the base repository and `--head-repo`
//       the head's; the audit lane needs all three (the branch WP-0A-A0-001's, the two repositories equal), so without
//       them nothing is audit. Without `--lane` the output is byte-identical to the first form. Exit codes are the same.
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

// Specifiers are read from the lines JOINED, and keyed on the `from` / `import` keyword just before the string, not on a
// whole statement: an import a formatter splits over several lines, with comments (even ones holding a quote) between
// its braces, still yields its specifier (C0 N1, A1-R1, Q0 QR1, R0 R-9). Any `from '...'` counts, so copy text that
// happens to read like one only raises (fail closed).
//
// The scan is LINEAR in the length of the text (A1-255-3 on PR #255): the earlier form nested a lazy any-character run
// inside a star (`\s*(?:\/\*[\s\S]*?\*\/\s*)*`), and a line holding `from` and thirty-odd `/**/` with no closing quote
// backtracked exponentially. Here the whitespace and block comments after a keyword are stepped over by hand, each
// comment's end found by binary search in the one list of `*/` offsets, and each gap's end remembered, so no character
// is stepped over twice; the specifier then runs to the next quote, found in one precomputed table.
//
// `wide` is the import walk's backstop (A1-255r2-1 on PR #255, round two). Behind a scanner misread, an import named by
// a string could still hide from the narrow form in three shapes: a backtick specifier, a parenthesized one
// (`import(("..."))`), and one after a `//` comment. The wide form also steps over `//` comments (to the line's end, from
// one precomputed table), over any number of `(` after `import(` and `require(`, and takes a backtick specifier that
// holds no `${`. Each only adds modules to the walk. The tier's `importSpecs` keeps the narrow form.
const WS = /\s/;
function rawScanner(text, wide = false) {
  const n = text.length;
  const closes = [];
  for (let p = text.indexOf('*/'); p !== -1; p = text.indexOf('*/', p + 1)) closes.push(p);
  const nextClose = (from) => {
    let lo = 0;
    let hi = closes.length;
    while (lo < hi) { const mid = (lo + hi) >> 1; if (closes[mid] < from) lo = mid + 1; else hi = mid; }
    return lo < closes.length ? closes[lo] : -1;
  };
  const quote = new Int32Array(text.length + 1).fill(-1);
  for (let p = text.length - 1; p >= 0; p -= 1) quote[p] = (text[p] === "'" || text[p] === '"') ? p : quote[p + 1];
  // The wide form's tables: the next backtick, and the next line end (LF, CR, U+2028, U+2029, as `scanJs` ends a line
  // comment), at or after each offset.
  const tick = wide ? new Int32Array(n + 1).fill(-1) : null;
  const lineEnd = wide ? new Int32Array(n + 1).fill(n) : null;
  if (wide) {
    for (let p = n - 1; p >= 0; p -= 1) {
      tick[p] = text[p] === '`' ? p : tick[p + 1];
      lineEnd[p] = LINE_END.has(text[p]) ? p : lineEnd[p + 1];
    }
  }
  // A skipper: the first offset at or after `pos` that is neither whitespace nor inside a block comment (nor, in the wide
  // form, inside a `//` comment, nor, with `parens`, an opening parenthesis). Each element's start is remembered with
  // where its gap ends, so a run is stepped over once however many keywords stand inside it (Q0-255R-1 N26).
  const skipper = (parens) => {
    const memo = new Map();
    return (pos) => {
      const visited = [];
      let p = pos;
      for (;;) {
        while (p < n && WS.test(text[p])) p += 1;
        if (memo.has(p)) { p = memo.get(p); break; }
        let next;
        if (text.startsWith('/*', p)) { const c = nextClose(p + 2); next = c === -1 ? n : c + 2; }
        else if (wide && text.startsWith('//', p)) next = lineEnd[p];
        else if (parens && text[p] === '(') next = p + 1;
        else break;
        visited.push(p);
        p = next;
      }
      for (const v of visited) memo.set(v, p);
      return p;
    };
  };
  const skipGap = skipper(false);
  const skipCall = wide ? skipper(true) : skipGap;
  // A quoted specifier starting at `p` (a quote, one or more non-quote characters, a quote), or null. In the wide form
  // also a backtick, one or more characters other than a backtick, a backtick, holding no `${`.
  const specAt = (p) => {
    if (p >= n) return null;
    if (wide && text[p] === '`') {
      const end = tick[p + 1];
      const spec = end > p + 1 ? text.slice(p + 1, end) : null;
      return spec === null || spec.includes('${') ? null : spec;
    }
    if (text[p] !== "'" && text[p] !== '"') return null;
    const end = quote[p + 1];
    return end > p + 1 ? text.slice(p + 1, end) : null;
  };
  return { skipGap, skipCall, specAt };
}
const RAW_KEYWORD = /\b(from|import|require)\b/g;
const CSS_IMPORT = /@import\s+(?:url\(\s*)?['"]?([^'")\s;]+)/g;
// `calls` also reads `import(` and `require(` followed by a quoted specifier; `wide` is the walk's backstop (above).
function rawSpecs(text, { calls = false, wide = false } = {}) {
  const { skipGap, skipCall, specAt } = rawScanner(text, wide);
  // By keyword, in the order the earlier expressions returned them: every `from`, then every `import`, then calls.
  const found = [[], [], []];
  const slot = (word) => (word === 'from' ? 0 : word === 'import' ? 1 : 2);
  for (const m of text.matchAll(RAW_KEYWORD)) {
    if (slot(m[1]) === 2 && !calls) continue;
    let p = skipGap(m.index + m[1].length);
    if (slot(m[1]) !== 0 && text[p] === '(') {
      if (!calls) continue;
      p = skipCall(p + 1);
    } else if (slot(m[1]) === 2) continue;
    const spec = specAt(p);
    if (spec !== null) found[slot(m[1])].push(spec);
  }
  return found.flat();
}
export function importSpecs(lines) {
  const all = lines.join('\n');
  const out = rawSpecs(all);
  for (const m of all.matchAll(CSS_IMPORT)) out.push(m[1]);
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
// `ctx.mEligible` is the module allowlist, `ctx.files` the set of paths at the head, `ctx.moves` collects status moves,
// `ctx.head()` returns the file's lines at the head (its imports are read whole).
// Returns { tier, reasons, module, test, pkg } where tier is null for a neutral path.
export function classifyPath(change, added, text, ctx = {}) {
  const { removed = [], mEligible = M_ELIGIBLE_MODULES, files = null, moves = [], head = () => [] } = ctx;
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
  // Imports are read from the added lines AND the whole file at the head: a binding added inside an existing multi-line
  // import adds no line that names the module (C0 N1, A1-R1, Q0 QR1, R0 R-9).
  const importLines = CODE_OR_TEXT.test(path) ? [...lines, '', ...head()] : [];
  if (mod) {
    const other = crossModuleImports(path, mod, importLines);
    if (other.length > 0) return H(`imports module ${other.join(', ')} (a cross-module change is H)`);
  }
  if (isL && !test) {
    const ds = [...lineSignals(lines, DATA_LINE_SIGNALS), ...new Set(lImportProblems(path, importLines, files))];
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
// reads a blob; `opts.removedOf(change)` its removed lines, `opts.headOf(change)` its lines at the head (the CLI reads
// the blob; without it only added lines are read for imports), `opts.mEligible` the module allowlist, `opts.files` the
// paths at the head. Returns { tier, reasons, recordsOnly, module, paths, statusMoves }.
export function classifyTier(changes, addedOf, text, opts = {}) {
  if (!Array.isArray(changes) || changes.length === 0) {
    return { tier: 'H', reasons: ['an empty diff is not classified (H)'], recordsOnly: false, module: null, paths: [], statusMoves: [] };
  }
  const { removedOf = () => [], mEligible = M_ELIGIBLE_MODULES, files = null, headOf = () => [] } = opts;
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
    const r = classifyPath(c, addedOf(c), text, { removed: removedOf(c), mEligible, files, moves: statusMoves, head: () => headOf(c) });
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

// ---- the lane (RFC-2026-034 §2.2) -------------------------------------------------------------------------------

export const LANES = ['governance', 'records', 'audit', 'risk', 'fast'];

// THE GOVERNANCE ROW OF RFC-2026-034 §2.2, as paths. A pull request that changes any path matching one of these is
// governance; so is one that changes a module a governance code file imports (`governanceClosure`), a file the
// database harness names by a path literal, or a test whose subject is a governance path (`testSubject`). Each entry
// is a regular expression over the WHOLE repository path (case-insensitive: the list errs wide), what it names, and its
// kind for §2.2's "Additive guard edits take the risk lane" rule:
//   `never`    the rule never covers it (an RFC, the guide, `docs/**`, `.agents/**`, `.github/**`, package, lock and
//              tool files, a Makefile, a classifier, the three tests that pin CI or a classifier);
//   `guard`    a guard, runner or guard test the rule does not name (governance, and not additive-eligible);
//   `additive` a path the rule can cover once A1 and Q0 confirm in writing that every hunk only adds (`run.mjs` and the
//              modules it imports, the harness and the fixtures it loads, the guards' data, `branch-identity.test.mjs`,
//              the foundation contract test, the two registries and the manifest).
// A path matching any `never` entry is never additive-eligible, whatever else it matches; one matching a `guard` entry
// is additive-eligible only if an `additive` entry also names it. "If it is unclear whether a path is a guard or
// runner, it is governance": tool configuration, lockfiles and Makefiles are matched by base name anywhere in the
// tree, the agent adapters that point readers at the guide (`AGENTS.md`, `CLAUDE.md`, an agent tool's settings
// directory, or a file or symlink of that name) are counted with the guide, and a `test-kits/` directory other than
// `db/` and `contracts/` is governance. The tool-configuration entry is a DENYLIST: a tool file it does not name prints
// a lane no higher than the tier gives, and a reader who sees one raises it (RFC-2026-034 §2.3: a lane error is a
// finding).
const G = (re, what, kind) => Object.freeze({ re, what, kind });
const JS = String.raw`\.[cm]?js`;
export const GOVERNANCE_PATTERNS = Object.freeze([
  G(/^architecture\/decisions(?:\/|$)/i, 'an RFC or decision record (architecture/decisions/**)', 'never'),
  G(/^CONTRIBUTING_AGENTS\.md$/i, 'the guide (CONTRIBUTING_AGENTS.md)', 'never'),
  G(/^(?:AGENTS|CLAUDE)\.md$|^\.(?:claude|cursor|codex|gemini|windsurf)(?:\/|$)/i, 'an agent adapter or agent tool settings (read with the guide)', 'never'),
  G(/^docs(?:\/|$)/i, 'docs/**', 'never'),
  G(/^\.agents(?:\/|$)/i, '.agents/**', 'never'),
  G(/^\.github(?:\/|$)/i, '.github/**', 'never'),
  G(/(?:^|\/)package\.json$/i, 'a package file (package.json)', 'never'),
  G(/(?:^|\/)(?:package-lock\.json|npm-shrinkwrap\.json|yarn\.lock|pnpm-lock\.ya?ml|bun\.lockb?|deno\.lock|[^/]*\.lock|[^/]*-lock\.(?:json|ya?ml))$/i, 'a lockfile', 'never'),
  G(new RegExp(String.raw`(?:^|/)(?:\.npmrc|\.nvmrc|\.node-version|\.tool-versions|\.yarnrc(?:\.ya?ml)?|\.pnpmfile\.cjs|pnpm-workspace\.ya?ml|`
    + String.raw`\.gitattributes|\.gitignore|\.gitmodules|\.editorconfig|\.browserslistrc|\.npmignore|\.swcrc|bunfig\.toml|`
    + String.raw`\.?mise(?:\.[^/]*)?\.toml|\.envrc|CODEOWNERS|Dockerfile[^/]*|[^/]*\.dockerfile|\.dockerignore|`
    + String.raw`docker-compose[^/]*|compose[^/]*\.ya?ml|supabase/config\.toml|\.pre-commit-config\.ya?ml|renovate\.json5?|\.renovaterc[^/]*|`
    + String.raw`\.?lefthook\.ya?ml|Taskfile\.ya?ml|\.?justfile|`
    + String.raw`\.(?:eslint|prettier|babel|stylelint|lintstaged|mocha|c8|nyc)rc(?:\.[a-z]+)?|\.(?:eslint|prettier)ignore|`
    + String.raw`(?:eslint|prettier|babel|jest|vite|vitest|playwright|next|postcss|tailwind|webpack|rollup|svelte|astro|nuxt|remix|tsup|esbuild|commitlint|lint-staged|stylelint)\.config\.[a-z]+|`
    + String.raw`(?:vite|vitest)\.workspace\.[a-z]+|`
    + String.raw`[jt]sconfig(?:\.[^/]*)?\.json|biome\.jsonc?|deno\.jsonc?|turbo\.json|nx\.json|lerna\.json|wrangler\.(?:toml|jsonc?)|vercel\.json|netlify\.toml)$`
    + String.raw`|(?:^|/)\.(?:husky|devcontainer|vscode|idea|config)(?:/|$)`, 'i'), 'tool configuration', 'never'),
  G(/(?:^|\/)(?:GNU)?makefile$|\.mk$/i, 'a Makefile', 'never'),
  G(new RegExp(String.raw`^scripts/db/classify-[^/]*${JS}$`, 'i'), 'a classifier (scripts/db/classify-*.mjs)', 'never'),
  // Guards and runners CI uses that the additive rule does not name.
  G(new RegExp(String.raw`^scripts/(?:.*/)?verify-[^/]*${JS}$`, 'i'), 'a guard (scripts/verify-*.mjs)', 'guard'),
  G(new RegExp(String.raw`^scripts/(?:.*/)?validate-[^/]*${JS}$`, 'i'), 'a validator (scripts/validate-*.mjs)', 'guard'),
  G(new RegExp(String.raw`^scripts/(?:.*/)?[^/]*-contract${JS}$`, 'i'), 'a guard contract (scripts/*-contract.mjs)', 'guard'),
  G(new RegExp(String.raw`^scripts/(?:scan-repository-secrets|refresh-author-handoff|run-test-suite|record-verification|regenerate-integrity-manifest)${JS}$`, 'i'),
    'a runner or generator CI uses', 'guard'),
  // A test that pins CI or a classifier is never additive (RFC-2026-034 §2.2: "an edit to a classifier, to CI, or to a
  // test that pins them" is governance), even though the next entry also matches it.
  G(/^test-kits\/(?:branch-scope|repository-json|test-coverage-floor)\.test\.mjs$/i, 'a test that pins CI or a classifier (test-kits/branch-scope, repository-json, test-coverage-floor)', 'never'),
  // Every other top-level guard test pins a guard's own behaviour (R0-255-3, A1-255-4 on PR #255), so the additive rule
  // does not cover it; `branch-identity.test.mjs` is the one the rule names, and an `additive` entry below names it.
  G(/^test-kits\/[^/]+\.test\.mjs$/i, 'a top-level guard test (test-kits/*.test.mjs), which pins a guard\'s own behaviour', 'guard'),
  // What the additive rule can cover (RFC-2026-034 §2.2, its five bullets).
  G(/^test-kits\/branch-identity\.test\.mjs$/i, 'the branch-identity test the additive rule names (test-kits/branch-identity.test.mjs)', 'additive'),
  G(/^scripts\/db\/(?:run|rls-smoke|authz-proofs)\.mjs$/i, 'the database runner or harness (scripts/db/run.mjs, rls-smoke.mjs, authz-proofs.mjs)', 'additive'),
  G(/^db\/foundation\/(?:ci|test-helpers|seeds)\/|^db\/foundation\/prerequisites\.sql$/i, 'the database test harness (db/foundation/{ci,test-helpers,seeds}/**, prerequisites.sql)', 'additive'),
  // The fixtures the harness loads (C0-255-1, A1-255-1a, Q0-255-1 on PR #255): `tests/db/identity/fixtures/*.sql`, read
  // with readFile and so out of reach of the import walk, and any SQL under `tests/db/`.
  G(/^tests\/db\/(?:[^/]+\/)*fixtures\//i, 'a fixture the database harness loads (tests/db/**/fixtures/**)', 'additive'),
  G(/^tests\/db\/.*\.sql$/i, 'SQL under tests/db/, which the database harness loads', 'additive'),
  G(/^db\/foundation\/(?:lint|invariants)\//i, 'the data the database guards read (db/foundation/{lint,invariants}/**)', 'additive'),
  G(/^test-kits\/db\/foundation-contract\.test\.mjs$/i, 'the foundation contract test, which pins the classifier (test-kits/db/foundation-contract.test.mjs)', 'additive'),
  // RFC-2026-034 §2.2 calls `test-kits/db/**` and `test-kits/contracts/**` "not guards"; a directory beside them is
  // unclear, and so governance (Q0-255-4 on PR #255).
  G(/^test-kits\/(?!db\/|contracts\/)[^/]+\/./i, 'a test-kits directory other than db/ and contracts/ (unclear, so governance)', 'additive'),
  G(/^test-kits\/integrity-manifest\.json$/i, 'the integrity manifest (test-kits/integrity-manifest.json)', 'additive'),
  G(/^scripts\/(?:test-suite-contract|verify-test-coverage-floor)\.mjs$/i, 'a test registry (scripts/test-suite-contract.mjs, scripts/verify-test-coverage-floor.mjs)', 'additive'),
]);

// The database runner and harness: the roots whose imports are `additive` (RFC-2026-034 §2.2's first additive bullet,
// "`scripts/db/run.mjs` and every module it imports") and whose path literals name the fixtures the harness loads.
export const GOVERNANCE_IMPORT_ROOTS = Object.freeze(['scripts/db/run.mjs', 'scripts/db/rls-smoke.mjs', 'scripts/db/authz-proofs.mjs']);

// The round audit's files (RFC-2026-034 §2.3): added or modified regular files directly in one dated directory under
// evidence/audits/.
const AUDIT_PATH = /^evidence\/audits\/([^/]+)\/(.+)$/;
const AUDIT_DATE = /^\d{4}-\d{2}-\d{2}$/;
const calendarDate = (d) => AUDIT_DATE.test(d) && !Number.isNaN(Date.parse(`${d}T00:00:00Z`)) && new Date(`${d}T00:00:00Z`).toISOString().slice(0, 10) === d;
// Which package's branch carries the audit pull request (RFC-2026-034 §2.2, the Audit row).
export const AUDIT_PACKAGE_MANIFEST = 'work-packages/WP-0A-A0-001.json';

const CODE_MODULE = /\.[cm]?js$/i;
const TEST_MODULE = /\.test\.[cm]?js$/i;

// A LINEAR scanner of JavaScript source (A1-255-3): comments, string, template and regular-expression literals,
// identifiers, numbers and single-character punctuation, each read once. It is a scanner, not a parser, and it reads
// a regular expression after `)` or `]` (or after an identifier that is not a keyword such as `return`) as a division,
// and one after `}` as a regular expression; a misread can hide an import from `jsRefs`. That is why `importClosure`
// also follows every specifier the raw keyword scan finds (`backstopSpecs`), wherever it stands: after `from`, `import`,
// `import(` or `require(`, past whitespace, comments and parentheses, written with `'`, `"` or a backtick holding no `${`,
// read as written and with its escapes and percent-encoding decoded (A1-255r2-1 on PR #255, round two); and why every
// string in the module that names a code module at the head joins the walk too (`stringNames`, round three), so a misread
// cannot hide a module named by a literal path in the forms it models. The walk is a best-effort aid, not a parser, and
// it does not claim to find every module a guard can load. Known forms it misses include: a path computed at run time;
// a loading mechanism that names no repository-relative path literally (for example an absolute `file://` URL inside a
// `data:` module); a process a guard spawns (`execSync('node …')`, `--import`, `NODE_OPTIONS`, a shell or Python
// script); a CommonJS `require` of a file whose extension the walk treats as data (`.txt`, `.md`, none); a literal
// longer than the scanner's 4096-character cap; a backslash-separated path; a path held in data the guard reads (for example a JSON file); and a path where node and the walk pick different candidates (the walk
// takes the first of `.js`, `.mjs`, `.cjs`, `.json`, `.ts`, `.mts`, `.cts`, then the directory; CommonJS `require`
// tries `.js`, `.json`, `.node`, then the directory). Every such form is an accepted residual, not a finding: planting
// it in a guard is itself a governance edit that all four roles read, and a reader of a governance pull request checks
// whether a guard's module loading changed. (RFC-2026-007 Amendment 2026-10-11 §D.) Line comments and
// regular expressions end at LF, CR, U+2028 and U+2029, as V8 ends them; a string literal may hold U+2028 and U+2029
// (ES2019), and ends unterminated at LF or CR.
const LINE_END = new Set(['\n', '\r', '\u2028', '\u2029']);
const ID_START = /[A-Za-z_$\u0080-\uffff]/;
const ID_PART = /[\w$\u0080-\uffff]/;
const KEYWORDS_BEFORE_REGEX = new Set(['return', 'typeof', 'instanceof', 'in', 'of', 'new', 'delete', 'void', 'throw', 'case', 'do', 'else', 'yield', 'await']);
export function scanJs(text) {
  const tokens = [];
  const problems = [];
  const n = text.length;
  const holes = [];
  let depth = 0;
  let i = 0;
  let noRegexBefore = -1;
  const punct = (k, v) => k >= 0 && tokens[k]?.t === 'p' && tokens[k].v === v;
  const regexOk = () => {
    const k = tokens.length - 1;
    const p = tokens[k];
    if (!p) return true;
    if (p.t === 'id') return KEYWORDS_BEFORE_REGEX.has(p.v) && !(punct(k - 1, '.') && !punct(k - 2, '.'));
    if (p.t === 'p') return p.v !== ')' && p.v !== ']';
    return false;
  };
  // The rest of a template literal from `i`: up to its closing backtick, or to a `${`, which opens a hole of code.
  const template = (at, first) => {
    let j = i;
    while (j < n) {
      const c = text[j];
      if (c === '\\') { j += 2; continue; }
      if (c === '`') { tokens.push({ t: 'tpl', v: text.slice(i, j), subst: !first, at }); i = j + 1; return; }
      if (c === '$' && text[j + 1] === '{') { tokens.push({ t: 'tpl', v: text.slice(i, j), subst: true, at }); holes.push(depth); i = j + 2; return; }
      j += 1;
    }
    problems.push(`an unterminated template literal at offset ${at}`);
    tokens.push({ t: 'tpl', v: text.slice(i), subst: true, at });
    i = n;
  };
  while (i < n) {
    const c = text[i];
    if (WS.test(c)) { i += 1; continue; }
    if (c === '/' && text[i + 1] === '/') {
      while (i < n && !LINE_END.has(text[i])) i += 1;
      continue;
    }
    if (c === '/' && text[i + 1] === '*') {
      const end = text.indexOf('*/', i + 2);
      if (end === -1) { problems.push(`an unterminated block comment at offset ${i}`); i = n; continue; }
      i = end + 2;
      continue;
    }
    if (c === "'" || c === '"') {
      const at = i;
      let j = i + 1;
      while (j < n && text[j] !== c && text[j] !== '\n' && text[j] !== '\r') j += text[j] === '\\' ? 2 : 1;
      if (j >= n || text[j] !== c) problems.push(`an unterminated string literal at offset ${at}`);
      tokens.push({ t: 'str', v: text.slice(at + 1, Math.min(j, n)), at });
      i = Math.min(j + 1, n);
      continue;
    }
    if (c === '`') { const at = i; i += 1; template(at, true); continue; }
    if (c === '/' && i > noRegexBefore && regexOk()) {
      let j = i + 1;
      let inClass = false;
      while (j < n && !LINE_END.has(text[j])) {
        if (text[j] === '\\') { j += 2; continue; }
        if (text[j] === '[') inClass = true;
        else if (text[j] === ']') inClass = false;
        else if (text[j] === '/' && !inClass) break;
        j += 1;
      }
      if (j < n && text[j] === '/') {
        j += 1;
        while (j < n && ID_PART.test(text[j])) j += 1;
        tokens.push({ t: 're', v: text.slice(i, j), at: i });
        i = j;
        continue;
      }
      // Not a regular expression after all: a division. No slash before this line's end is read as one again, so a
      // line of slashes is scanned once.
      noRegexBefore = j;
    }
    if (/[0-9]/.test(c) || (c === '.' && /[0-9]/.test(text[i + 1] ?? ''))) {
      let j = i + 1;
      while (j < n && /[\w.]/.test(text[j])) j += 1;
      tokens.push({ t: 'num', v: text.slice(i, j), at: i });
      i = j;
      continue;
    }
    if (ID_START.test(c) || c === '\\') {
      let j = i;
      while (j < n && (ID_PART.test(text[j]) || text[j] === '\\')) j += text[j] === '\\' ? 2 : 1;
      const v = text.slice(i, Math.min(j, n));
      // An escaped identifier (`require`) is a name V8 reads and this scanner cannot: fail closed.
      if (v.includes('\\')) problems.push(`an escaped identifier at offset ${i}`);
      tokens.push({ t: 'id', v, at: i });
      i = Math.min(j, n);
      continue;
    }
    if (c === '{') depth += 1;
    if (c === '}') {
      if (holes.length > 0 && holes[holes.length - 1] === depth) { holes.pop(); const at = i; i += 1; template(at, false); continue; }
      depth -= 1;
    }
    tokens.push({ t: 'p', v: c, at: i });
    i += 1;
  }
  return { tokens, problems };
}

// What one module names, read from its code (not its strings or comments): `specs`, the quoted specifiers of its
// static imports, re-exports, and `import(...)` / `require(...)` calls; `opaque`, every module load it names by an
// expression (a call whose argument is not one string literal, `createRequire`, a bare `require` passed as a value);
// `literals`, every string literal in it (a template literal with no `${`); `problems`, what the scanner could not read.
export function jsRefs(text) {
  const { tokens, problems } = scanJs(text);
  const specs = [];
  const opaque = [];
  const literals = [];
  const isP = (t, v) => t?.t === 'p' && t.v === v;
  const isStr = (t) => t?.t === 'str' || (t?.t === 'tpl' && !t.subst);
  for (let k = 0; k < tokens.length; k += 1) {
    const tk = tokens[k];
    if (isStr(tk)) { literals.push(tk.v); continue; }
    if (tk.t !== 'id') continue;
    const member = isP(tokens[k - 1], '.') && !isP(tokens[k - 2], '.');
    const next = tokens[k + 1];
    const call = () => {
      if (isStr(tokens[k + 2]) && (isP(tokens[k + 3], ')') || isP(tokens[k + 3], ','))) specs.push(tokens[k + 2].v);
      else opaque.push(`${tk.v}(...) at offset ${tk.at}`);
    };
    if (tk.v === 'createRequire') opaque.push(`createRequire at offset ${tk.at}`);
    else if (tk.v === 'from' && !member) { if (isStr(next)) specs.push(next.v); }
    else if (tk.v === 'import' && !member) {
      if (isStr(next)) specs.push(next.v);
      else if (isP(next, '(')) call();
    } else if (tk.v === 'require') {
      if (isP(next, '(')) call();
      else if (!member && !isP(next, ':') && !(tokens[k - 1]?.t === 'id' && tokens[k - 1].v === 'typeof')) opaque.push(`require at offset ${tk.at}`);
    }
  }
  return { specs, opaque, literals, problems };
}

// The specifiers the walk's backstop reads from a module's text (A1-255r2-1 on PR #255, round two): the wide raw scan of
// the text as written and, when it holds a backslash, of the text with every escape decoded (`\u0069mport(`, a
// specifier spelled `'./\x65vil.mjs'` or `'.\/evil.mjs'`); each specifier also with tabs and line breaks removed and
// percent-encoding decoded, as a URL resolves an ES module specifier. Each only adds candidates; one that names no file is
// dropped.
const ESCAPE = /\\(?:u\{([0-9a-fA-F]{1,6})\}|u([0-9a-fA-F]{4})|x([0-9a-fA-F]{2})|(\r\n|[\n\r\u2028\u2029])|([\s\S]))/g;
const decodeEscapes = (text) => text.replace(ESCAPE, (_, cp, u, x, cont, ch) => {
  if (cont !== undefined) return '';
  if (ch !== undefined) return ch;
  const code = Number.parseInt(cp ?? u ?? x, 16);
  return code <= 0x10ffff ? String.fromCodePoint(code) : '';
});
export function backstopSpecs(text) {
  const raw = rawSpecs(text, { calls: true, wide: true });
  if (text.includes('\\')) raw.push(...rawSpecs(decodeEscapes(text), { calls: true, wide: true }));
  const out = new Set();
  for (const spec of raw) for (const v of spellings(spec)) out.add(v);
  return [...out];
}
// One specifier or string as written, with tabs and line breaks removed, and that percent-decoded, as a URL resolves an
// ES module specifier; the string rule (below) also reads each without a `?` query or `#` fragment.
function spellings(s, query = false) {
  const out = new Set([s]);
  const bare = s.replace(/[\t\n\r]/g, '');
  out.add(bare);
  try { out.add(decodeURIComponent(bare)); } catch { /* malformed percent-encoding: the other spellings stand */ }
  if (query) for (const v of [...out]) out.add(v.split(/[?#]/)[0]);
  return out;
}

// THE STRING RULE (PR #255, round three: C0-255r2-1, A1-255r3-1, R0-255r2-1, Q0-255R2-1). Every string in a module the
// walk reads that names a CODE module at the head (`.js`, `.mjs`, `.cjs`, resolved as `resolveModule` resolves it) joins
// the closure, whether or not the scanner reads it as an import, so a scanner misread cannot hide a module a guard names
// by a string; one that names code the walk cannot read (`.ts`, `.mts`, `.cts`, `.tsx`, `.jsx`, `.node`, `.wasm`) is a
// problem. A string that names a data file (JSON, SQL, Markdown, a manifest, anything else) adds nothing: what a data
// file holds runs nothing, and the harness's data is read by its own rule (`governanceClosure`), from what the harness
// imports only. It reads the RAW text, not the scanner's tokens: every
// span between two consecutive `'`, two consecutive `"`, or two consecutive backticks (one holding no `${`), in the text
// as written and, when it holds a backslash, with every escape decoded. Every literal is such a span whatever the scanner
// made of the text around it; so are spans in comments and between two literals, which only add candidates. Linear: the
// spans of one quote character do not overlap.
const STRING_MAX = 4096;
export function stringNames(text) {
  const out = new Set();
  const texts = text.includes('\\') ? [text, decodeEscapes(text)] : [text];
  for (const t of texts) {
    for (const q of ["'", '"', '`']) {
      let open = t.indexOf(q);
      while (open !== -1) {
        const close = t.indexOf(q, open + 1);
        if (close === -1) break;
        const s = t.slice(open + 1, close);
        if (s.length > 0 && s.length <= STRING_MAX && !(q === '`' && s.includes('${'))) out.add(s);
        open = close;
      }
    }
  }
  const all = new Set();
  for (const s of out) for (const v of spellings(s, true)) if (v.length > 0) all.add(v);
  return [...all];
}

// Every reading of one module, by path, for one classification: `readHead` is called once per path, and the scan once
// per text (`laneOfRange` also caches the text per blob).
function moduleReader(readHead) {
  const cache = new Map();
  return (path) => {
    if (!cache.has(path)) {
      let entry;
      try {
        const text = readHead(path);
        if (typeof text !== 'string') throw new Error('not text');
        entry = CODE_MODULE.test(path)
          ? { text, ...jsRefs(text), raw: backstopSpecs(text), strings: stringNames(text) }
          : { text, specs: [], opaque: [], literals: [], problems: [], raw: [], strings: [] };
      } catch {
        entry = null;
      }
      cache.set(path, entry);
    }
    return cache.get(path);
  };
}

const LOCAL_SPEC = /^\.\.?\//;
// A specifier that is a URL (any scheme but `node:`: `data:`, `file:`, `http:`, `https:`, `blob:`, ...) or an absolute
// path (POSIX, a drive letter, a UNC or backslash path) names nothing the walk can follow (A1-255r3-2 on PR #255).
const URL_OR_ABSOLUTE = /^(?:[a-z][a-z0-9+.-]*:|\/|\\)/i;
const outsideSpec = (spec) => URL_OR_ABSOLUTE.test(spec) && !/^node:/i.test(spec);
// The repository path a local specifier of `from` names, or null when it leaves the repository.
function localTarget(from, spec) {
  const target = resolveRel(from, spec.split(/[?#]/)[0]);
  return target.startsWith('../') || target === '..' ? null : target;
}

// What the walk reads (a JavaScript module) or need not read (JSON); anything else a module imports is a module it
// cannot read (Q0-255R2-1: fail closed, not scanned as JavaScript). A file named only by a string joins the walk only
// when it is code: a `.js`, `.mjs` or `.cjs` file is read in turn, code node can run that the walk cannot read is a
// problem, and a data file adds nothing.
const WALK_READS = /\.(?:[cm]?js|json)$/i;
const CODE_NOT_READ = /\.(?:[cm]?ts|tsx|jsx|node|wasm)$/i;
// Module resolution as node does it for the forms this repository can use (Q0-255R2-1 on PR #255): the exact path; the
// path with `.js`, `.mjs`, `.cjs`, `.json`, `.ts`, `.mts` or `.cts` added; a directory's `package.json` `main` (read the
// same way), then its `index.js`, `index.mjs` or `index.cjs`. Returns { path } or { problem } or null (nothing there).
// A `package.json` that is not JSON is a problem for an import read from code; for a candidate the backstop or the
// string rule finds (`candidate`), it is nothing there: node refuses to load such a directory (ERR_INVALID_PACKAGE_CONFIG),
// so nothing is hidden behind it, and any string that happens to name the directory (`.`) is not a load.
const RESOLVE_EXTS = ['.js', '.mjs', '.cjs', '.json', '.ts', '.mts', '.cts'];
const INDEX_FILES = ['index.js', 'index.mjs', 'index.cjs'];
const DIRS = new WeakMap();
function dirsOf(files) {
  if (!DIRS.has(files)) {
    const dirs = new Set(['.']);
    for (const f of files) for (let i = f.indexOf('/'); i !== -1; i = f.indexOf('/', i + 1)) dirs.add(f.slice(0, i));
    DIRS.set(files, dirs);
  }
  return DIRS.get(files);
}
function resolveModule(base, files, read, candidate = false) {
  if (files === null) return { path: base };
  const asFile = (b) => {
    if (b !== '.' && files.has(b)) return b;
    for (const ext of RESOLVE_EXTS) if (files.has(b + ext)) return b + ext;
    return null;
  };
  const file = asFile(base);
  if (file !== null) return { path: file };
  if (!dirsOf(files).has(base)) return null;
  const inDir = (name) => (base === '.' ? name : `${base}/${name}`);
  const indexOf = (dir) => INDEX_FILES.map((n) => (dir === '.' ? n : `${dir}/${n}`)).find((p) => files.has(p)) ?? null;
  const pkg = inDir('package.json');
  if (files.has(pkg)) {
    const m = read(pkg);
    let main;
    try { main = JSON.parse(m?.text ?? '')?.main; } catch { main = null; }
    if (m !== null && main === null && candidate) return null;
    if (m === null || main === null) return { problem: `${JSON.stringify(pkg)} could not be read as JSON, so what the directory resolves to is unknown` };
    if (typeof main === 'string' && main.length > 0) {
      const target = posix.normalize(posix.join(base, main));
      if (target.startsWith('../') || target === '..' || target.startsWith('/')) return { problem: `${JSON.stringify(pkg)} names a main outside the repository (${JSON.stringify(main)})` };
      const hit = asFile(target) ?? (dirsOf(files).has(target) ? indexOf(target) : null);
      if (hit !== null) return { path: hit };
    }
  }
  const index = indexOf(base);
  return index === null ? null : { path: index };
}

// The local modules `roots` import, transitively, read with `readHead(path)` (which throws when it cannot read).
// `files` is the set of paths at the head when known: a root absent from it imports nothing. Each module the walk reads
// is followed three ways:
//   - a specifier read from its code (`jsRefs`): resolved close to how node resolves it, not identically (`resolveModule`, RFC-2026-007 §D); one that resolves to
//     nothing, leaves the repository, is a URL or an absolute path, or resolves to a file the walk cannot read (not
//     `.js`, `.mjs`, `.cjs` or `.json`) is a problem;
//   - a specifier the raw keyword scan finds anywhere (`backstopSpecs`, in strings and comments too): followed when it
//     resolves to a file, and otherwise dropped, so it can only add modules;
//   - with `strings` (the default), a string that names a code module (`stringNames`), resolved from the module's
//     directory and from the repository root: a `.js`, `.mjs` or `.cjs` file joins the closure and is read in turn; one
//     node could run as code the walk cannot read (`.ts`, `.mts`, `.cts`, `.tsx`, `.jsx`, `.node`, `.wasm`) is a
//     problem; a data file adds nothing. The harness's walk for its path literals passes `strings: false`.
// `links` maps each path at the head that is a symbolic link or a gitlink to its mode: node loads what a link points at
// and the walk reads only the link's text, so a link the walk reaches is a problem (A1-255r2-1 on PR #255, round two);
// `governanceClosure` makes every other link at the head a problem too. Returns { modules: Map(path -> the root that
// reaches it), named: Set(the modules reached through a string on the way), problems: [...] }.
export function importClosure(roots, readHead, files = null, read = moduleReader(readHead), links = null, { strings = true } = {}) {
  const modules = new Map();
  const problems = [];
  const queue = [];
  for (const root of roots) {
    if (files && !files.has(root)) continue;
    queue.push([root, root]);
  }
  const seen = new Set();
  const named = new Set();
  const add = (target, root, byString) => { if (!seen.has(target)) queue.push([target, root, byString]); };
  for (let q = 0; q < queue.length; q += 1) {
    const [path, root, byString = false] = queue[q];
    if (seen.has(path)) continue;
    seen.add(path);
    if (path !== root) modules.set(path, root);
    if (byString) named.add(path);
    if (links?.has(path)) {
      problems.push(`${JSON.stringify(path)} is ${linkWhat(links.get(path))} the walk reaches from ${root}; what it stands for is not read, so the modules behind it are unknown`);
      continue;
    }
    if (!CODE_MODULE.test(path)) continue;
    const m = read(path);
    if (m === null) {
      problems.push(`${JSON.stringify(path)} could not be read at the head, so the modules it imports are unknown`);
      continue;
    }
    for (const why of m.problems) problems.push(`${JSON.stringify(path)} could not be read as JavaScript (${why}), so the modules it imports are unknown`);
    for (const what of m.opaque) problems.push(`${JSON.stringify(path)} imports or requires a module named by an expression (${what}), which cannot be followed`);
    for (const spec of m.specs) {
      if (outsideSpec(spec)) { problems.push(`${JSON.stringify(path)} imports ${JSON.stringify(spec)}, a URL or an absolute path: only node: built-ins and relative paths are followed`); continue; }
      if (!LOCAL_SPEC.test(spec)) continue;
      const base = localTarget(path, spec);
      if (base === null) { problems.push(`${JSON.stringify(path)} imports ${JSON.stringify(spec)}, outside the repository`); continue; }
      const r = resolveModule(base, files, read);
      if (r === null) { problems.push(`${JSON.stringify(path)} imports ${JSON.stringify(spec)}, which resolves to no file at the head`); continue; }
      if (r.problem) { problems.push(`${JSON.stringify(path)} imports ${JSON.stringify(spec)}: ${r.problem}`); continue; }
      if (!WALK_READS.test(r.path) && !links?.has(r.path)) problems.push(`${JSON.stringify(path)} imports ${JSON.stringify(spec)}, which resolves to ${JSON.stringify(r.path)}, a module the walk cannot read (only .js, .mjs, .cjs and .json)`);
      add(r.path, root, byString);
    }
    for (const spec of m.raw) {
      if (!LOCAL_SPEC.test(spec)) continue;
      const base = localTarget(path, spec);
      const r = base === null ? null : resolveModule(base, files, read, true);
      if (r === null) continue;
      if (r.problem) { problems.push(`${JSON.stringify(path)} imports ${JSON.stringify(spec)}: ${r.problem}`); continue; }
      if (CODE_NOT_READ.test(r.path)) problems.push(`${JSON.stringify(path)} imports ${JSON.stringify(spec)}, which resolves to ${JSON.stringify(r.path)}, a module the walk cannot read (only .js, .mjs, .cjs and .json)`);
      add(r.path, root, byString);
    }
    if (files === null || !strings) continue;
    for (const s of m.strings) {
      for (const base of new Set([resolveRel(path, s), posix.normalize(s)])) {
        if (base.startsWith('../') || base === '..' || base.startsWith('/') || base === path) continue;
        const r = resolveModule(base, files, read, true);
        if (r === null) continue;
        if (r.problem) { problems.push(`${JSON.stringify(path)} names ${JSON.stringify(s)}: ${r.problem}`); continue; }
        if (r.path === path) continue;
        if (CODE_NOT_READ.test(r.path)) problems.push(`${JSON.stringify(path)} names ${JSON.stringify(s)}, which resolves to ${JSON.stringify(r.path)}, code node can run and the walk cannot read`);
        else if (!CODE_MODULE.test(r.path)) continue;
        add(r.path, root, true);
      }
    }
  }
  return { modules, named, problems };
}

// A string literal that reads as a repository path: at least one `/`, no empty segment, every segment made of letters,
// digits and `_@~+.-`, and a last segment with an extension. Checked segment by segment, in linear time.
const PATH_SEGMENT = /^[\w@~+.-]+$/;
function pathLiteral(s) {
  if (s.length === 0 || s.length > 1024 || !s.includes('/')) return false;
  const segs = s.split('/');
  if (!segs.every((x) => PATH_SEGMENT.test(x))) return false;
  const last = segs[segs.length - 1];
  return !/^\.+$/.test(last) && /\.[A-Za-z0-9]+$/.test(last);
}
// The repository paths a module's string literal may name: as written from the repository root, and from the module.
function literalTargets(from, literal) {
  if (!pathLiteral(literal)) return [];
  const out = new Set();
  if (!literal.startsWith('.')) out.add(posix.normalize(literal));
  const rel = localTarget(from, literal.startsWith('.') ? literal : `./${literal}`);
  if (rel !== null) out.add(rel);
  return [...out].filter((p) => !p.startsWith('../'));
}

// A symbolic link (mode 120000) or a gitlink (160000) at the head: the lane reads neither what a link points at nor a
// submodule's tree, so EVERY link at the head is a problem (fail closed), named for the path and, where it applies, for
// the walk that reaches it, the pattern that names it or the harness that names it. A link to a directory hides every
// path beneath it from `git ls-tree`, so the rule does not model what a link resolves to (PR #255, round three:
// C0-255r2-1, A1-255r3-1a, R0-255r2-1). The repository holds no link today.
export const LINK_MODES = Object.freeze(['120000', '160000']);
const linkWhat = (mode) => `${mode === '160000' ? 'a gitlink (submodule)' : 'a symbolic link'} (mode ${mode})`;

const kindOfPatterns = (matched) => (matched.some((g) => g.kind === 'never') ? 'never' : matched.some((g) => g.kind === 'additive') ? 'additive' : 'guard');

// Everything that makes a path governance beyond the patterns, computed at the head (RFC-2026-034 §2.2):
//   - every module a governance code file imports, transitively (A1-255-1b, R0-255-2 on PR #255). The walk is rooted
//     at every JavaScript file at the head that a `never` or `guard` entry matches (the guards, validators, contracts,
//     runners, classifiers and top-level guard tests): a module reached from one of them is `guard`. It is also rooted
//     at the database runner and harness (GOVERNANCE_IMPORT_ROOTS) and every other JavaScript file only `additive`
//     entries match: a module reached only from those is `additive`. The closure holds the modules a root reaches by an
//     import or, for a code module, by a string that names it (`importClosure`), not the roots themselves;
//   - every file the database harness names by a path literal ending `.sql` or `.json` (the modules the harness reaches
//     by imports alone, each read whole: the string rule does not widen it), `additive` (C0-255-1, A1-255-1a, Q0-255-1
//     on PR #255);
//   - `problems`: what could not be read, which makes the pull request governance (fail closed), among them every
//     symbolic link or gitlink at the head (`links`, path -> mode), wherever it is (PR #255, round three).
// `paths` are the changed paths, used as the roots' universe when the files at the head are not known.
export function governanceClosure({ paths = [], files = null, readHead = null, read = null, links = null } = {}) {
  if (typeof readHead !== 'function' && typeof read !== 'function') {
    return { modules: new Map(), data: new Map(), problems: ['no reader of the head was given, so the modules the governance code files import are unknown'] };
  }
  const reader = read ?? moduleReader(readHead);
  const universe = [...(files ?? new Set(paths))].filter((p) => CODE_MODULE.test(p)).sort();
  const guardRoots = [];
  const additiveRoots = [...GOVERNANCE_IMPORT_ROOTS];
  for (const p of universe) {
    const matched = GOVERNANCE_PATTERNS.filter((g) => g.re.test(p));
    if (matched.length === 0) continue;
    if (matched.some((g) => g.kind !== 'additive')) guardRoots.push(p);
    else if (!additiveRoots.includes(p)) additiveRoots.push(p);
  }
  const guard = importClosure(guardRoots, null, files, reader, links);
  const additive = importClosure(additiveRoots, null, files, reader, links);
  const harness = importClosure(GOVERNANCE_IMPORT_ROOTS, null, files, reader, links, { strings: false });
  const linkProblems = [];
  for (const [p, mode] of links ?? []) {
    const named = GOVERNANCE_PATTERNS.filter((g) => g.re.test(p));
    if (named.length > 0) linkProblems.push(`${JSON.stringify(p)} is ${linkWhat(mode)} that a governance pattern names (${named[0].what}); what it stands for is not read`);
    else linkProblems.push(`${JSON.stringify(p)} is ${linkWhat(mode)} at the head; the lane does not read what a link stands for, so a link anywhere fails closed`);
  }
  const modules = new Map();
  for (const [p, root] of additive.modules) modules.set(p, { kind: 'additive', root, named: additive.named.has(p) });
  for (const [p, root] of guard.modules) modules.set(p, { kind: 'guard', root, named: guard.named.has(p) });
  const data = new Map();
  for (const p of [...GOVERNANCE_IMPORT_ROOTS, ...harness.modules.keys()]) {
    if ((files && !files.has(p)) || !CODE_MODULE.test(p)) continue;
    const m = reader(p);
    if (m === null) continue;
    for (const lit of m.literals) {
      for (const t of literalTargets(p, lit)) {
        if (!/\.(?:sql|json)$/i.test(t) || (files && !files.has(t)) || data.has(t)) continue;
        data.set(t, p);
        if (links?.has(t)) linkProblems.push(`${JSON.stringify(t)} is ${linkWhat(links.get(t))} that the database harness names (${p}); what it stands for is not read`);
      }
    }
  }
  return { modules, data, problems: [...new Set([...linkProblems, ...guard.problems, ...additive.problems])] };
}

// Whether a changed test file's subject is a governance path (C0-255-2, A1-255-1c on PR #255): a `*.test.mjs` (or
// `.test.js`, `.test.cjs`) anywhere that imports a governance path is governance; `never` if what it imports is `never`
// (a classifier, a package file), else `additive`. The classifier cannot know a test's subject; what the test imports
// is the observable proxy, and "if unclear, governance". `isGov(path)` returns the kind of a governance path or null.
// Returns { kind, names: [...] } or null; { problem } when the test cannot be read.
export function testSubject(path, read, isGov, files = null) {
  if (!TEST_MODULE.test(path) || (files && !files.has(path))) return null;
  const m = read(path);
  if (m === null) return { problem: `${JSON.stringify(path)} is a test that could not be read at the head, so its subject is unknown` };
  const named = new Map();
  for (const spec of [...m.specs, ...m.raw]) {
    if (!LOCAL_SPEC.test(spec)) continue;
    const t = localTarget(path, spec);
    if (t === null || t === path || (files && !files.has(t))) continue;
    const k = isGov(t);
    if (k) named.set(t, k);
  }
  if (named.size === 0) return null;
  const kind = [...named.values()].includes('never') ? 'never' : 'additive';
  return { kind, names: [...named.keys()].sort() };
}

// The lane of one pull request (RFC-2026-034 §2.2). `paths` are its changed paths, each tested whole (the diff is
// `--no-renames`, so no path carries a rename arrow; C0-255-5); `changes` the parsed raw diff (status and modes, which
// the audit lane needs); `tier` and `recordsOnly` are what `classifyTier` returned; `headRef` is its head branch,
// `repo` and `headRepo` the base and head repositories (`owner/name`), when known; `auditBranch` is WP-0A-A0-001's
// `ownership.branch` read at the base (undefined or null when it could not be read); `files` the set of paths at the
// head; `readHead(path)` reads a file at the head and throws when it cannot; `modes` maps paths at the head to their git
// modes, of which only a symbolic link's or a gitlink's matters (LINK_MODES): such a path is never read as a module.
// Returns { lane, reasons, additiveEligible }.
export function laneOf({ paths, tier, recordsOnly, headRef = undefined, auditBranch = undefined, files = null, readHead = null,
  changes = null, repo = undefined, headRepo = undefined, modes = null } = {}) {
  if (!Array.isArray(paths) || paths.length === 0 || !paths.every((p) => typeof p === 'string' && p.length > 0)) {
    return { lane: 'governance', reasons: ['no list of changed paths to place (fail closed: governance)'], additiveEligible: false };
  }
  const all = [...new Set(paths)];
  const reasons = [];
  let coverable = true;
  const links = new Map([...(modes ?? [])].filter(([, m]) => LINK_MODES.includes(m)));
  const read = typeof readHead === 'function'
    ? moduleReader((p) => { if (links.has(p)) throw new Error(`${p} is a link`); return readHead(p); })
    : null;
  const closure = governanceClosure({ paths: all, files, read, links });
  // The kind of a governance path, or null: the patterns decide for a path they name; otherwise the walk does.
  const govKind = (p) => {
    const matched = GOVERNANCE_PATTERNS.filter((g) => g.re.test(p));
    if (matched.length > 0) return kindOfPatterns(matched);
    if (closure.modules.has(p)) return closure.modules.get(p).kind;
    if (closure.data.has(p)) return 'additive';
    return null;
  };
  const problems = [...closure.problems];
  let hits = 0;
  for (const p of all) {
    // A path a pattern names takes the patterns' kind (the list says what it is: `foundation-contract.test.mjs` stays
    // additive though it imports a classifier). A path no pattern names takes the highest kind of what reaches it: a
    // test naming a `never` path is `never`, a guard's import is `guard`, anything else `additive`.
    const matched = GOVERNANCE_PATTERNS.filter((g) => g.re.test(p));
    const why = matched.map((g) => g.what);
    const found = [];
    const mod = closure.modules.get(p);
    if (mod) {
      why.push(`a module ${mod.root} ${mod.named ? 'imports or names by a string' : 'imports'}, read at the head${mod.kind === 'guard' ? ': reached from a guard, which the additive rule does not cover' : ''}`);
      found.push(mod.kind);
    }
    if (closure.data.has(p)) {
      why.push(`a file ${closure.data.get(p)} names, which the database harness loads`);
      found.push('additive');
    }
    if (read !== null) {
      const subject = testSubject(p, read, govKind, files);
      if (subject?.problem) problems.push(subject.problem);
      else if (subject) {
        why.push(`a test whose subject is a governance path (it imports ${subject.names.join(', ')})`);
        found.push(subject.kind);
      }
    }
    let kind = null;
    if (matched.length > 0) kind = kindOfPatterns(matched);
    else if (found.length > 0) kind = found.includes('never') ? 'never' : found.includes('guard') ? 'guard' : 'additive';
    if (kind === null) continue;
    hits += 1;
    reasons.push(`governance: ${JSON.stringify(p)} (${why.join('; ')})`);
    if (kind !== 'additive') coverable = false;
  }
  if (problems.length > 0) {
    for (const why of problems) reasons.push(`governance: ${why} (fail closed)`);
    coverable = false;
  }
  if (hits > 0 || problems.length > 0) {
    return { lane: 'governance', reasons, additiveEligible: coverable && hits > 0 };
  }
  // Audit (RFC-2026-034 §2.2, §2.3): only added or modified regular files directly in one dated directory under
  // evidence/audits/, on WP-0A-A0-001's branch, from the base repository. Anything it cannot check is not audit.
  const dirs = new Set(all.map((p) => AUDIT_PATH.exec(p)?.[1] ?? null));
  if (!dirs.has(null) && dirs.size === 1) {
    const dir = [...dirs][0];
    const where = `every changed path is under evidence/audits/${dir}/`;
    const not = [];
    if (!calendarDate(dir)) not.push(`${JSON.stringify(dir)} is not a calendar date (YYYY-MM-DD)`);
    const nested = all.filter((p) => AUDIT_PATH.exec(p)[2].includes('/'));
    if (nested.length > 0) not.push(`${nested.map((p) => JSON.stringify(p)).join(', ')} ${nested.length === 1 ? 'is' : 'are'} in a subdirectory`);
    if (!Array.isArray(changes)) not.push('the statuses and modes of the changes were not given, so they were not checked');
    else {
      for (const p of all) {
        const c = changes.find((x) => x?.path === p);
        if (!c) { not.push(`${JSON.stringify(p)} has no status or mode to check`); continue; }
        const regular = c.newMode === '100644' && ((c.status === 'A' && c.oldMode === '000000') || (c.status === 'M' && c.oldMode === '100644'));
        if (!regular) not.push(`${JSON.stringify(p)} is status ${c.status}, mode ${c.oldMode} -> ${c.newMode} (an audit adds or modifies regular files only)`);
      }
    }
    if (typeof headRef !== 'string' || headRef.length === 0) not.push(`no head branch was given (--head-ref), so it was not checked against ${AUDIT_PACKAGE_MANIFEST}`);
    else if (typeof auditBranch !== 'string' || auditBranch.length === 0) not.push('WP-0A-A0-001\'s ownership.branch could not be read at the base (fail closed)');
    else if (headRef !== auditBranch) not.push(`the head branch ${JSON.stringify(headRef)} is not WP-0A-A0-001's ownership.branch at the base (${JSON.stringify(auditBranch)})`);
    if (typeof repo !== 'string' || repo.length === 0 || typeof headRepo !== 'string' || headRepo.length === 0) {
      not.push('the base and head repositories were not both given (--repo, --head-repo), so a fork was not ruled out');
    } else if (repo !== headRepo) not.push(`the head repository ${JSON.stringify(headRepo)} is not the base repository ${JSON.stringify(repo)} (a fork)`);
    if (not.length === 0) {
      return { lane: 'audit', reasons: [`audit: ${where}, each an added or modified regular file, on ${JSON.stringify(headRef)}, WP-0A-A0-001's ownership.branch at the base, from ${JSON.stringify(repo)}`], additiveEligible: false };
    }
    reasons.push(`not audit: ${where}, but ${not.join('; ')}`);
  } else if (!dirs.has(null) && dirs.size > 1) {
    reasons.push(`not audit: the changed paths span more than one audit directory (${[...dirs].sort().join(', ')})`);
  }
  if (recordsOnly === true) {
    reasons.push('records: the records-only classifier says records-only (RFC-2026-025 §6.1)');
    return { lane: 'records', reasons, additiveEligible: false };
  }
  if (tier === 'H') {
    reasons.push('risk: tier H outside governance, records and audit (RFC-2026-034 §2.2)');
    return { lane: 'risk', reasons, additiveEligible: false };
  }
  if (tier === 'M' || tier === 'L') {
    reasons.push(`fast: tier ${tier} (RFC-2026-034 §2.2): one independent Reviewer confirms in writing what the classifier cannot`);
    return { lane: 'fast', reasons, additiveEligible: false };
  }
  reasons.push(`governance: tier ${JSON.stringify(tier)} is not a tier the lanes know (fail closed)`);
  return { lane: 'governance', reasons, additiveEligible: false };
}

// What `--lane` prints after the tier report, as lines.
export function formatLane(l) {
  const out = [`lane: ${l.lane}`];
  for (const why of l.reasons) out.push(`  ${why}`);
  if (l.additiveEligible) {
    out.push('additive-eligible: yes');
    out.push('  every governance path is one RFC-2026-034 §2.2\'s additive rule can cover; the pull request takes the risk lane only once A1 and Q0 each confirm in writing, on the final head, that every guard hunk only adds (a test that pins a classifier, CI or a guard\'s own behaviour is not additive). Until both have, it is governance.');
  }
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
  const changes = parseRawDiff(raw);
  const r = classifyTier(changes, (c) => lines(c).added, text, { removedOf: (c) => lines(c).removed, files,
    headOf: (c) => (c.status === 'D' ? [] : text(c.newBlob).split('\n')) });
  return { mergeBase: mb, head: h, copy: copyNote(b), changes, ...r };
}

// WP-0A-A0-001's `ownership.branch` as the base holds it, or null when it cannot be read (then nothing is audit).
export function auditBranchAt(baseCommit) {
  try {
    const branch = JSON.parse(git(['cat-file', 'blob', `${baseCommit}:${AUDIT_PACKAGE_MANIFEST}`]))?.ownership?.branch;
    return typeof branch === 'string' && branch.length > 0 ? branch : null;
  } catch {
    return null;
  }
}

// The text of each blob read for the lane, by blob id: a module the walk reaches from several roots, or a blob several
// paths share, is read from git once.
const BLOB_TEXT = new Map();

// The lane of the range a tier report `r` (from classifyTierRange) covers. The head is read by blob, never from the
// working tree. `opts` carries `headRef`, `repo` and `headRepo` as the CLI was given them.
export function laneOfRange(base, r, opts = {}) {
  const blobs = new Map();
  const modes = new Map();
  for (const entry of git(['ls-tree', '-r', '-z', '--full-tree', r.head]).split('\0')) {
    const m = /^(\d{6}) \w+ ([0-9a-f]{40,64})\t(.+)$/s.exec(entry);
    if (m) { blobs.set(m[3], m[2]); modes.set(m[3], m[1]); }
  }
  const readHead = (p) => {
    const blob = blobs.get(p);
    if (blob === undefined) throw new Error(`no ${p} at the head`);
    if (!BLOB_TEXT.has(blob)) BLOB_TEXT.set(blob, git(['cat-file', 'blob', blob]));
    return BLOB_TEXT.get(blob);
  };
  return laneOf({
    paths: r.paths, changes: r.changes, tier: r.tier, recordsOnly: r.recordsOnly, headRef: opts.headRef, repo: opts.repo,
    headRepo: opts.headRepo, auditBranch: auditBranchAt(rev(base)), files: new Set(blobs.keys()), readHead, modes,
  });
}

const USAGE = 'usage: classify-review-tier.mjs [<base>=origin/main] [<head>=HEAD] [--lane [--head-ref=<branch>] [--repo=<owner/name>] [--head-repo=<owner/name>]]';
const LANE_OPTIONS = { '--head-ref=': 'headRef', '--repo=': 'repo', '--head-repo=': 'headRepo' };

function main(argv) {
  const lane = argv.filter((a) => a === '--lane').length;
  const opts = {};
  const rest = [];
  for (const a of argv) {
    if (a === '--lane') continue;
    const flag = Object.keys(LANE_OPTIONS).find((f) => a.startsWith(f));
    if (flag === undefined) { rest.push(a); continue; }
    if (Object.hasOwn(opts, LANE_OPTIONS[flag])) { console.error(USAGE); return 2; }
    opts[LANE_OPTIONS[flag]] = a.slice(flag.length);
  }
  if (rest.length > 2 || rest.some((a) => a.startsWith('-')) || lane > 1 || (Object.keys(opts).length > 0 && lane === 0)) {
    console.error(USAGE);
    return 2;
  }
  const [base = 'origin/main', head = 'HEAD'] = rest;
  const r = classifyTierRange(base, head);
  const lines = formatReport(r);
  if (lane === 1) lines.push(...formatLane(laneOfRange(base, r, opts)));
  for (const line of lines) console.log(line);
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
