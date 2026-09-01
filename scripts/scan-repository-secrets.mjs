import { readdir, readFile } from 'node:fs/promises';
import { extname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// A pattern scanner CANNOT prove that a repository contains no secret. It proves that the
// declared patterns did not match the declared files at this commit. RFC-2026-005 records
// what that is and is not evidence of. Everything below is written to make the boundary
// explicit rather than to imply coverage the tool does not have.
//
// Two properties are load-bearing and were absent before RFC-2026-005:
//   * FAIL CLOSED. The superseded scanner did `readFile(...).catch(() => null)`, so a file
//     it could not read was indistinguishable from a file with no secret in it. A file the
//     scanner cannot read or cannot decode is now a FINDING, never a pass.
//   * A PRIVACY DIMENSION. CONTRIBUTING_AGENTS.md forbids customer PII in this repository
//     and the superseded scanner had no PII rule at all.

export const IGNORED_DIRECTORIES = new Set(['.git', 'node_modules']);

// Files under these repository-relative prefixes are the audit trail: handoffs and the
// canonical per-package evidence that CONTRIBUTING_AGENTS.md requires. An address in the
// form `Name <local@example>` legitimately appears there in pasted git author metadata and
// in role-run attribution. The EMAIL rule alone is relaxed for them; see PII_RULES.
export const PII_PROSE_PREFIXES = ['evidence/', 'handoffs/'];

// Binary media cannot be UTF-8 and must not be treated as a decode failure. It is still
// scanned, as latin1, so an ASCII-shaped credential embedded in one is still caught.
// Nothing is skipped: this list changes how a file is decoded, never whether it is read.
export const BINARY_EXTENSIONS = new Set([
  '.png', '.jpg', '.jpeg', '.gif', '.webp', '.avif', '.ico', '.bmp', '.tiff',
  '.pdf', '.woff', '.woff2', '.ttf', '.otf', '.eot',
  '.zip', '.gz', '.tgz', '.bz2', '.xz', '.7z', '.jar',
  '.mp3', '.mp4', '.m4a', '.wav', '.mov', '.webm', '.ogg',
]);

// Reading an arbitrarily large file into memory is a denial-of-service on CI, but silently
// truncating one is a coverage hole. An oversize file is therefore a finding.
export const MAX_FILE_BYTES = 8 * 1024 * 1024;

export const EXIT_PATTERN_FINDING = 70;
export const EXIT_UNSCANNABLE = 71;

/** Shannon entropy in bits per character. Used only to reject a low-information match that
 *  a prefix rule alone would accept, never as a standalone detector: this repository holds
 *  130 distinct 40- and 64-character hex strings (git SHAs and sha256 integrity digests),
 *  and an unanchored entropy rule fires on every one of them. */
export function shannonEntropy(value) {
  if (value.length === 0) return 0;
  const counts = new Map();
  for (const character of value) counts.set(character, (counts.get(character) ?? 0) + 1);
  let bits = 0;
  for (const count of counts.values()) {
    const probability = count / value.length;
    bits -= probability * Math.log2(probability);
  }
  return bits;
}

/** Thai national identification number: 13 digits whose last digit is a mod-11 check digit
 *  over the first 12 weighted 13..2. Without the checksum, any 13-digit run is a match and
 *  the rule is unusable; with it, roughly nine in ten accidental runs are rejected. */
export function isThaiNationalId(value) {
  const digits = value.replace(/-/g, '');
  if (!/^[0-9]{13}$/.test(digits)) return false;
  // A repeated single digit is a filler, not an identifier.
  if (/^([0-9])\1{12}$/.test(digits)) return false;
  let sum = 0;
  for (let index = 0; index < 12; index += 1) sum += Number(digits[index]) * (13 - index);
  return (11 - (sum % 11)) % 10 === Number(digits[12]);
}

/** A primary account number is customer PII, and CONTRIBUTING_AGENTS.md forbids customer PII
 *  repository-wide with no carve-out. Detecting one needs BOTH tests, never either alone.
 *
 *  Luhn alone is far too weak: one in ten arbitrary digit runs of the right length passes it,
 *  so a rule built on Luhn reports correlation ids, hash prefixes and timestamps until someone
 *  turns it off. An issuer prefix alone is weaker still -- every 16-digit run starting with 4
 *  would be a card. Together they are strict enough to run unattended.
 *
 *  Deliberately NOT exempted: the published provider test cards. At rest a scanner cannot tell
 *  a test number from a live one, Gate G0 permits no provider integration that would need one,
 *  and an allowlist of "safe" card numbers is the shape a real leak hides in. When a payment
 *  sandbox is authorized, the exemption belongs in a reviewed decision with a named owner, not
 *  here. No card number, valid or otherwise, is written literally in this file: a rule that
 *  cannot be stated without tripping itself would have to exempt its own source, and a
 *  scanner blind to one file is a scanner with a place to hide things. */
// Issuer ranges paired with the lengths that issuer actually uses. Independent security
// review found the first version covered five families and four lengths, omitting UnionPay
// (BIN 62) entirely -- the highest-volume network globally and widely accepted in Thai
// e-commerce, which for this product is the wrong one to miss -- and omitting the 14-digit
// length altogether, which made Diners Club structurally unreachable.
const ISSUER_RANGES = [
  [/^4/, [13, 16, 19]],                       // Visa
  [/^(5[1-5]|2[2-7])/, [16]],                 // Mastercard
  [/^3[47]/, [15]],                           // American Express
  [/^(6011|64[4-9]|65)/, [16, 19]],           // Discover
  [/^35(2[89]|[3-8][0-9])/, [16]],            // JCB
  [/^62/, [16, 19]],                          // UnionPay
  [/^(30[0-5]|3095|3[689][0-9])/, [14]],      // Diners Club
  [/^(50|5[6-8]|6304|6759|676[1-3])/, [16, 19]], // Maestro
  [/^(60|81|82)/, [16]],                      // RuPay
];

function luhnHolds(digits) {
  let sum = 0;
  let double = false;
  for (let index = digits.length - 1; index >= 0; index -= 1) {
    let digit = Number(digits[index]);
    if (double) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
    double = !double;
  }
  return sum % 10 === 0;
}

/** A primary account number is customer PII, and CONTRIBUTING_AGENTS.md forbids customer PII
 *  repository-wide with no carve-out. Detecting one needs BOTH tests, never either alone.
 *
 *  Luhn alone is far too weak: one in ten arbitrary digit runs of the right length passes it,
 *  so a rule built on Luhn reports correlation ids, hash prefixes and timestamps until someone
 *  turns it off. An issuer prefix alone is weaker still -- every 16-digit run starting with 4
 *  would be a card. Together they are strict enough to run unattended.
 *
 *  Deliberately NOT exempted: the published provider test cards. At rest a scanner cannot tell
 *  a test number from a live one, Gate G0 permits no provider integration that would need one,
 *  and an allowlist of "safe" card numbers is the shape a real leak hides in. When a payment
 *  sandbox is authorized, the exemption belongs in a reviewed decision with a named owner, not
 *  here. No card number, valid or otherwise, is written literally in this file: a rule that
 *  cannot be stated without tripping itself would have to exempt its own source, and a
 *  scanner blind to one file is a scanner with a place to hide things. */
// A digit is not always U+0030..U+0039. Independent security review found the rule blind to
// FULLWIDTH digits and to THAI digits -- on a Thai-market product, in a rule whose own comment
// claims to cover what a Thai IME produces. It had widened the SEPARATORS for that scenario and
// never the DIGITS, so a bare sixteen-digit fullwidth card number, the plainest representation
// there is, was invisible.
const DIGIT_RANGES = [[0x0030, '0'], [0xff10, '0'], [0x0e50, '0'], [0x0660, '0'], [0x06f0, '0']];
export function foldDigits(value) {
  let out = '';
  for (const char of value) {
    const code = char.codePointAt(0);
    const range = DIGIT_RANGES.find(([base]) => code >= base && code <= base + 9);
    if (range) out += String(code - range[0]);
  }
  return out;
}

export function isPaymentCardNumber(value) {
  // `foldDigits` rather than a strip: this is exported and called directly by the tests, so it
  // must handle a non-ASCII number on its own. The scanner folds the run before it gets here,
  // which makes the call redundant on that path and correct on this one.
  const digits = foldDigits(value);
  if (!/^[0-9]{13,19}$/.test(digits)) return false;
  if (!ISSUER_RANGES.some(([prefix, lengths]) => prefix.test(digits) && lengths.includes(digits.length))) return false;
  return luhnHolds(digits);
}

// Group sizes a card is actually written in. Independent security review measured the
// unrestricted rule reporting 2.6% of rows of small integers, and this repository's evidence
// files are full of numeric tables. A row of five 3-digit latencies is not a card no matter
// what Luhn says about its concatenation.
//
// Independent testing then found the first version of this list too narrow in the way that
// mattered most: it rejected 4-6-4, which is exactly how a Diners Club card is printed -- and
// the 14-digit length had just been added SPECIFICALLY so Diners would be reachable. The
// Amex 4-6-5 case was special-cased and its Diners neighbour was not.
const PRINTED_LAYOUTS = [[4, 6, 5], [4, 6, 4], [4, 4, 5]];

function groupingIsCardLike(sizes) {
  if (sizes.length <= 2) return true;
  if (PRINTED_LAYOUTS.some((layout) => layout.length === sizes.length && layout.every((n, i) => n === sizes[i]))) return true;
  const body = sizes.slice(0, -1);
  const last = sizes.at(-1);
  return body.every((size) => size === 4) && last >= 1 && last <= 6;
}

export function containsPaymentCardNumber(run) {
  // Two kinds of separator, and they mean different things. A SPACE or hyphen is how someone
  // GROUPS a number, so the grouping has to look like a card. A LINE BREAK is where the
  // medium ran out of width.
  //
  // But a line break is AMBIGUOUS in a way the first version missed: it may have split a
  // group in two, or it may have replaced the space between two groups. Independent review
  // found a Luhn-valid card written 4-4-4-4 and wrapped before its final group going
  // unreported, because merging across the wrap turned [4,4,4,4] into [4,4,8] and 8 is not a
  // card-like tail. The medium does not say which happened, so BOTH readings are tried.
  // A list is not a wrapped card. Independent security review measured the widened
  // continuation set turning an ordinary markdown bullet list of four-digit build numbers into
  // a finding -- 15% of bullet lists and 34% of JSDoc number blocks -- and this rule has no
  // prose exemption, so every one of those fails the whole build on the evidence and runbook
  // files this repository is made of.
  //
  // The distinguishing shape: three or more lines each carrying exactly ONE group is a list.
  // A wrapped card leaves at least one line carrying more than one group, or fits in two lines.
  // The cost is stated rather than hidden: a card written one group per line down three or more
  // lines is no longer detected. That case is speculative; breaking CI on ordinary documents is
  // not, and a rule that fails on documentation is a rule someone deletes.
  // Fold non-ASCII digits before any of this: the grouping analysis counts digits, and a
  // fullwidth or Thai numeral is a digit.
  run = [...run].map((c) => foldDigits(c) || c).join('');
  const lines = run.split('\n');
  if (lines.length >= 3 && lines.every((line) => (line.match(/[0-9]+/g) ?? []).length === 1)) return false;

  const groups = [];
  const wrapped = [];
  let current = '';
  let pendingWrap = false;
  for (const char of run) {
    if (char >= '0' && char <= '9') { current += char; continue; }
    if (current) { groups.push(current); wrapped.push(pendingWrap); current = ''; pendingWrap = false; }
    if (char === '\n') pendingWrap = true;
  }
  if (current) { groups.push(current); wrapped.push(pendingWrap); }
  if (groups.length === 0) return false;

  // A card is 13 to 19 digits, and a wrapped one carries a little context at most. A run that
  // crosses a line break carrying FAR more digits than that is not one number split over lines
  // -- it is a table, and a window spanning two of its rows is two different numbers joined at
  // a row boundary.
  //
  // Independent security review measured this: eight rows of four 4-digit amounts reported at
  // 64%, an aligned numeric id column at 45%, on the kind of benchmark and evidence file this
  // repository is made of. Most of that came from cross-row windows, and none of those windows
  // is a card. Within a single line the arithmetic is irreducible -- four groups of four IS the
  // card layout -- but across rows there is a real signal and it was not being used.
  // A card that the medium wrapped is the WHOLE run: the line ran out of width in the middle
  // of one number and the rest continues below. Anything that spans a line break while being
  // only PART of the run is two different numbers meeting at a row boundary.
  //
  // Independent security review measured what the absence of that rule cost: eight rows of four
  // 4-digit amounts reported at 64%, an aligned numeric id column at 45%, on the benchmark and
  // evidence files this repository is made of, on a rule with no prose exemption. Every one of
  // those findings came from a window joining the tail of one row to the head of the next, and
  // not one of them was a card.
  //
  // Within a single line the arithmetic stays irreducible -- four groups of four IS how a card
  // is written -- so a row that is itself card-shaped is still reported. That is the cost of
  // the format, not of this rule.
  const spansLines = wrapped.some((w, index) => w && index > 0);
  if (spansLines) {
    // Reading 1: each line on its own. No window can cross a boundary.
    let line = [];
    for (let index = 0; index < groups.length; index += 1) {
      if (index > 0 && wrapped[index]) {
        if (scanReading(line)) return true;
        line = [];
      }
      line.push(groups[index]);
    }
    if (scanReading(line)) return true;

    // Reading 2: the whole run is one wrapped number. Only a window covering ALL of it counts.
    const merged = [];
    groups.forEach((group, index) => {
      if (index > 0 && wrapped[index]) merged[merged.length - 1] += group;
      else merged.push(group);
    });
    return scanReading(merged, { wholeRunOnly: true }) || scanReading(groups, { wholeRunOnly: true });
  }

  return scanReading(groups);
}

function scanReading(groups, { wholeRunOnly = false } = {}) {
  const sizes = groups.map((group) => group.length);
  const digits = groups.join('');
  const starts = [];
  let offset = 0;
  for (const size of sizes) { starts.push(offset); offset += size; }
  const ends = new Map(starts.map((start, index) => [start + sizes[index], index]));
  for (let index = 0; index < starts.length; index += 1) {
    for (const length of [13, 14, 15, 16, 19]) {
      const from = starts[index];
      const to = from + length;
      // A card does not start or stop in the middle of a written group.
      if (!ends.has(to)) continue;
      if (wholeRunOnly && (from !== 0 || to !== digits.length)) continue;
      const covered = sizes.slice(index, ends.get(to) + 1);
      if (!groupingIsCardLike(covered)) continue;
      if (isPaymentCardNumber(digits.slice(from, to))) return true;
    }
  }
  return false;
}


/** A value that is a template reference or a documented stand-in is not a leaked secret.
 *  Anchored end to end on purpose: a real credential that merely CONTAINS the word
 *  "synthetic" must still be reported. */
export function isPlaceholderValue(value) {
  if (/\$\{|\{\{|^\$|^</.test(value)) return true;
  if (/^[x*.\u2026_-]+$/i.test(value)) return true;
  return /^(?:change[-_]?me|placeholder|example|examples|redacted|synthetic|dummy|sample|fake|unset|none|null|undefined|true|false|todo|tbd|your[-_a-z0-9]*|[a-z0-9_-]*_here)$/i.test(value);
}

/** Credential rules. Each is anchored on a vendor prefix, a structural shape, or an
 *  explicit secret-named assignment. `accept` is a second-stage filter for the rules whose
 *  first stage is too loose on its own. */
export const CREDENTIAL_RULES = [
  // The armour header is written with a character class rather than as a literal so this
  // file does not match its own rule. A real PGP block reads `PGP PRIVATE KEY BLOCK`; the
  // previous `PGP ` alternative before `PRIVATE KEY-----` was dead, as security review found.
  { id: 'pem-private-key', pattern: /-{5}BEGIN (?:RSA |DSA |EC |OPENSSH |ENCRYPTED |PGP )?PRIVATE KEY(?: BLOCK)?-{5}/g },
  { id: 'putty-private-key', pattern: /PuTTY-User-Key-File-[0-9]/g },
  { id: 'stripe-secret-key', pattern: /\bsk_(?:live|test)_[A-Za-z0-9]{16,}\b/g },
  { id: 'stripe-webhook-secret', pattern: /\bwhsec_[A-Za-z0-9]{16,}\b/g },
  { id: 'aws-access-key-id', pattern: /\b(?:AKIA|ASIA|AGPA|AIDA|AROA|ANPA|ANVA|ABIA|ACCA)[0-9A-Z]{16}\b/g },
  { id: 'aws-secret-access-key', pattern: /\baws_secret_access_key["']?\s*[:=]\s*["']?([A-Za-z0-9/+=]{40})/gi },
  { id: 'github-token', pattern: /\bgh[pousr]_[A-Za-z0-9]{20,}\b/g },
  { id: 'github-fine-grained-pat', pattern: /\bgithub_pat_[A-Za-z0-9_]{50,}\b/g },
  { id: 'openai-project-key', pattern: /\bsk-proj-[A-Za-z0-9_-]{20,}/g },
  {
    id: 'openai-legacy-key',
    pattern: /\bsk-[A-Za-z0-9]{32,}\b/g,
    // A bare `sk-` prefix plus a length floor also matches a long repetitive token. The
    // entropy floor is what makes this rule usable rather than noisy.
    accept: (match) => shannonEntropy(match.slice(3)) >= 3,
  },
  { id: 'anthropic-api-key', pattern: /\bsk-ant-[A-Za-z0-9_-]{24,}/g },
  // Documented format is `AIza` + exactly 35 characters. Pinning the length exactly would
  // make the rule miss a longer future key entirely, so the floor is 35 and open above.
  { id: 'google-api-key', pattern: /\bAIza[A-Za-z0-9_-]{35,}/g },
  { id: 'slack-token', pattern: /\bxox[baprs]-[0-9A-Za-z]{8,}-[0-9A-Za-z]{8,}-[0-9A-Za-z]{12,}/g },
  { id: 'slack-app-token', pattern: /\bxapp-[0-9]-[A-Za-z0-9]{6,}-[0-9]{6,}-[A-Za-z0-9]{16,}/g },
  { id: 'npm-access-token', pattern: /\bnpm_[A-Za-z0-9]{36}\b/g },
  // Three base64url segments. Two segments -- the shape that appears in this repository's
  // own gap-finding prose -- is deliberately NOT a match.
  { id: 'json-web-token', pattern: /\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{16,}\.[A-Za-z0-9_-]{16,}/g },
  { id: 'authorization-header', pattern: /\bauthorization["']?\s*[:=]\s*["']?(?:Bearer|Basic)\s+[A-Za-z0-9._~+/=-]{20,}/gi },
  {
    id: 'database-url-inline-password',
    pattern: /\b(?:postgres(?:ql)?|mysql|mariadb|mongodb(?:\+srv)?|rediss?|amqps?|clickhouse):\/\/[^\s:/@'"`]{1,64}:([^\s:/@'"`]{8,})@[^\s/'"`]{4,}/g,
    // The 8-character floor on the password is what keeps the illustrative
    // `postgres://u:p@h/db` in this repository's contract-gap evidence from matching.
    accept: (match, groups) => !isPlaceholderValue(groups[0]),
  },
  { id: 'azure-storage-key', pattern: /\b(?:AccountKey|SharedAccessKey)=([A-Za-z0-9+/]{40,}={0,2})/g },
  { id: 'azure-sas-signature', pattern: /[?&]sig=[A-Za-z0-9%+/=]{40,}/g },
  // Independent security review probed 56 decoys deliberately outside the families the two
  // prior probes used and detected 19. The most consequential misses were a bare Meta page or
  // system-user token and a Stripe restricted key -- this project's own G0 blockers are Meta
  // and Stripe, so those are the two credentials most likely to reach this repository.
  { id: 'meta-access-token', pattern: /\bEAA[A-Za-z0-9]{20,}/g },
  { id: 'stripe-restricted-key', pattern: /\brk_(?:live|test)_[A-Za-z0-9]{20,}/g },
  { id: 'gcp-service-account-key', pattern: /"type"\s*:\s*"service_account"[\s\S]{0,400}?"private_key"\s*:\s*"-----BEGIN/g },
  { id: 'twilio-auth-pair', pattern: /\bAC[0-9a-f]{32}\b[\s\S]{0,200}?\b[0-9a-f]{32}\b/g },
  { id: 'sendgrid-key', pattern: /\bSG\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}/g },
  { id: 'npmrc-auth-token', pattern: /_authToken\s*=\s*["']?[A-Za-z0-9_%+./-]{16,}/g },
  // Anchored to a netrc block. The unanchored form matched any prose line beginning with
  // `password` and ending in one long token -- this repository already carries two such lines
  // in review evidence, one reflow away from a red CI. Independent security review found it.
  { id: 'netrc-password', pattern: /^[ \t]*machine[ \t]+\S+[\s\S]{0,200}?^[ \t]*password[ \t]+\S{8,}$/gm },
  { id: 'kubernetes-service-account-token', pattern: /\beyJhbGciOiJSUzI1NiIsImtpZCI6[A-Za-z0-9_-]{10,}\./g },
  // The single-letter legacy alternative matched ordinary member chains (`x.s.someLongName`)
  // and `s.`-prefixed filenames. Dropped: a service token issued today carries hvs./hvb.,
  // and a rule that fires on JavaScript is worth less than the format it misses.
  { id: 'vault-token', pattern: /\b(?:hvs|hvb)\.[A-Za-z0-9]{24,}/g },
  {
    id: 'secret-named-assignment',
    // Environment-variable style only: an UPPERCASE secret-named identifier, `=`, and a
    // non-trivial literal. Lowercase and JSON-style `api_key: "..."` are deliberately NOT
    // matched -- see RFC-2026-005 "Not detected, and why".
    // A glued uppercase identifier such as PGPASSWORD was unreachable: the optional prefix
    // group had to end in `_`, so only DB_PASSWORD-style names matched. Independent security
    // review found it. Any uppercase run ending in a secret word now matches.
    // `[A-Z][A-Z0-9_]*?` before the secret word made a prefix MANDATORY, so a bare
    // API_KEY= stopped matching -- a regression this Author introduced while fixing the
    // opposite one. The prefix is optional and need not end in `_`, so both API_KEY= and
    // the glued PGPASSWORD= match.
    pattern: /\b[A-Z0-9_]*?(?:PASSWORD|PASSWD|SECRET|TOKEN|APIKEY|API_KEY|ACCESSKEY|ACCESS_KEY|PRIVATEKEY|PRIVATE_KEY|CREDENTIALS?)[A-Z0-9_]*\s*=\s*["']?([^\s"'`#]{8,})/g,
    accept: (match, groups) => !isPlaceholderValue(groups[0]),
  },
];

/** Privacy rules. `proseExempt` marks the single rule relaxed under PII_PROSE_PREFIXES. */
export const PII_RULES = [
  {
    id: 'payment-card-number',
    // The run is matched generously -- digits joined by the separators a card is written or
    // pasted with, including a line break, because a wrapped log line or a quoted email is a
    // real artifact shape and a non-breaking space is what a paste from a rendered statement
    // carries. `accept` then does the real work over the windows inside the run.
    //
    // The continuation set covers `#`, `//` and ` * ` as well as `>` and `|`. Independent
    // security review pointed out that the first version handled quoted email and markdown
    // tables but not the comment leaders THIS repository is written in -- YAML, shell, JS and
    // JSDoc -- and this scanner's own source is a ` * ` block. A card wrapped inside one was
    // not reported; the same file with `# ` rewritten to `> ` was.
    //
    // The separator set covers U+2010 HYPHEN (the actual typographic hyphen), U+2012 FIGURE
    // DASH (defined by Unicode for use BETWEEN DIGITS), the em/en/hair spaces beside the ones
    // already listed, the soft hyphen and zero-width space a justified or HTML-rendered
    // statement carries, and the minus, fullwidth hyphen and ideographic space a CJK or Thai
    // IME produces. Each was demonstrated missing.
    //
    // `=` before a newline is the quoted-printable soft break a pasted email carries. U+200D is
    // a zero-width joiner, which has no business between digits at all.
    //
    // `|` was accepted here and is now WITHDRAWN. I measured its price against a markdown table
    // of three columns with mixed widths, which cannot produce sixteen digits and therefore
    // could never have tripped it -- a benign shape chosen, without meaning to, so that it could
    // not fail. Independent review measured the shape that matters: a markdown table of four
    // 4-digit columns over eight rows, which is the most common table in this repository's
    // evidence files. With `|`: 24.3%. Without: 0.00%.
    //
    // What it bought was a card SPLIT ACROSS FOUR TABLE CELLS. Nobody writes a card that way. A
    // card pasted into a table cell -- bare or grouped in fours -- is detected either way, and
    // that is the representation a real leak takes.
    //
    // The lesson is not about `|`. A price measured against a shape that cannot pay it is not a
    // measurement, and I made that error while building the very harness meant to prevent it.
    //
    // FOUR further separators were measured and REFUSED, because each buys one representation
    // and pays about a quarter of a common document shape. The numbers, 3000 trials each:
    //
    //   `.`  gains dot-separated groups, costs 0.0% -> 24.1% on semantic versions and dotted
    //        build ids -- `v1.02.003 build.4111.1111.1111.1111` is a version string
    //   `,`  gains comma-separated groups, costs 0.0% -> 24.2% on a CSV of numeric metrics,
    //        which is the single most common numeric document there is
    //   `/`  gains slash-separated groups, costs 0.0% -> 24.8% on file paths with numeric
    //        segments, e.g. /var/log/4111/1111/1111/1111.log
    //   `_`  gains underscore-separated groups, costs 24.2% -> 26.4% on numeric tables
    //
    // Twice before, a widening here shipped without its price being read, and both times it
    // broke the build on ordinary documents. These four are refused with the measurement
    // attached so the refusal can be argued with rather than rediscovered.
    pattern: /(?<![0-9\uFF10-\uFF19\u0E50-\u0E59\u0660-\u0669\u06F0-\u06F9])[0-9\uFF10-\uFF19\u0E50-\u0E59\u0660-\u0669\u06F0-\u06F9](?:(?:[ \t\u00A0\u2002\u2003\u2007\u2009\u200A\u202F\u3000\u00AD\u200B\u2010\u2011\u2012\u2013\u2014\u2212\uFF0D\u200D-]+|=?\r?\n[ \t>|#*/-]*)?[0-9\uFF10-\uFF19\u0E50-\u0E59\u0660-\u0669\u06F0-\u06F9])+(?![0-9\uFF10-\uFF19\u0E50-\u0E59\u0660-\u0669\u06F0-\u06F9])/g,
    accept: (match) => containsPaymentCardNumber(match),
    // NOT prose-exempt. A card number written into a comment, a runbook or an evidence file
    // is the same disclosure as one written into code, and the rule that already treats a
    // Thai national identity number that way must treat this one the same or it enforces
    // CONTRIBUTING_AGENTS.md selectively.
  },
  {
    id: 'thai-national-id',
    pattern: /\b[0-9](?:-?[0-9]){12}\b/g,
    accept: (match) => isThaiNationalId(match),
    // NOT prose-exempt. CONTRIBUTING_AGENTS.md forbids customer PII repository-wide with
    // no carve-out, and no legitimate artifact needs a checksum-valid Thai ID.
  },
  {
    id: 'thai-phone-number',
    pattern: /(?:\+66|\b0)[-. ]?[689][0-9]{1,2}[-. ]?[0-9]{3,4}[-. ]?[0-9]{4}\b/g,
    accept: (match) => {
      const digits = match.replace(/[^0-9]/g, '');
      if (digits.startsWith('66')) return digits.length === 11 && /^66[689]/.test(digits);
      return digits.length === 10 && /^0[689]/.test(digits);
    },
    // NOT prose-exempt, for the same reason.
  },
  {
    id: 'email-address',
    // The leading `(?<![:/])` stops `scheme://user:password@db.example.com` from being
    // reported as an email address. Without it, any documented connection string with a
    // dotted hostname is a false positive, which would make this rule unusable in a
    // repository whose database workstream documents exactly that. The cost is that an
    // address written as `mailto:name@host` is not matched; recorded in RFC-2026-005.
    pattern: /(?<![:/])\b[A-Za-z0-9._%+-]+@[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?)*\.[A-Za-z]{2,24}\b/g,
    proseExempt: true,
  },
];

export const ALL_RULES = [
  ...CREDENTIAL_RULES.map((rule) => ({ ...rule, kind: 'credential' })),
  ...PII_RULES.map((rule) => ({ ...rule, kind: 'pii' })),
];

function isProsePath(relativePath) {
  return PII_PROSE_PREFIXES.some((prefix) => relativePath.startsWith(prefix));
}

/** Apply every rule to one already-decoded file. Returns rule ids, deduplicated. */
export function scanText(text, { relativePath = '' } = {}) {
  const hits = new Set();
  const prose = isProsePath(relativePath);
  for (const rule of ALL_RULES) {
    if (rule.proseExempt && prose) continue;
    for (const match of text.matchAll(rule.pattern)) {
      if (rule.accept && !rule.accept(match[0], match.slice(1))) continue;
      hits.add(rule.id);
      break;
    }
  }
  return [...hits];
}

async function scanOneFile(file, relativePath, findings, maxFileBytes) {
  let bytes;
  try {
    bytes = await readFile(file);
  } catch (error) {
    // FAIL CLOSED. The superseded scanner swallowed this and reported the file as clean.
    findings.push({ file, relativePath, rule: 'unreadable-file', kind: 'unscannable', detail: error.code ?? error.message });
    return;
  }
  if (bytes.length > maxFileBytes) {
    findings.push({ file, relativePath, rule: 'oversize-file', kind: 'unscannable', detail: `${bytes.length} bytes` });
    return;
  }
  let text;
  if (BINARY_EXTENSIONS.has(extname(file).toLowerCase())) {
    text = bytes.toString('latin1');
  } else {
    try {
      text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
    } catch {
      // Not declared binary and not valid UTF-8: scan what can be scanned AND report it,
      // because nobody reviewing a green scan should assume this file was understood.
      findings.push({ file, relativePath, rule: 'undecodable-file', kind: 'unscannable', detail: 'not valid UTF-8' });
      text = bytes.toString('latin1');
    }
  }
  for (const rule of scanText(text, { relativePath })) {
    const kind = ALL_RULES.find((candidate) => candidate.id === rule).kind;
    findings.push({ file, relativePath, rule, kind });
  }
}

async function walk(directory, root, findings, maxFileBytes) {
  let entries;
  try {
    entries = await readdir(directory, { withFileTypes: true });
  } catch (error) {
    // FAIL CLOSED: a directory the scanner cannot list is not an empty directory.
    findings.push({
      file: directory,
      relativePath: relative(root, directory).split('\\').join('/'),
      rule: 'unreadable-directory',
      kind: 'unscannable',
      detail: error.code ?? error.message,
    });
    return;
  }
  for (const entry of entries) {
    const entryPath = join(directory, entry.name);
    const relativePath = relative(root, entryPath).split('\\').join('/');
    if (entry.isSymbolicLink()) {
      // Not followed: a link can leave the scan root entirely, and following one makes the
      // set of scanned bytes depend on state outside the commit. Reported, never ignored.
      findings.push({ file: entryPath, relativePath, rule: 'unscannable-symlink', kind: 'unscannable', detail: 'symbolic link' });
      continue;
    }
    if (entry.isDirectory()) {
      if (!IGNORED_DIRECTORIES.has(entry.name)) await walk(entryPath, root, findings, maxFileBytes);
      continue;
    }
    if (!entry.isFile()) {
      findings.push({ file: entryPath, relativePath, rule: 'unscannable-entry', kind: 'unscannable', detail: 'not a regular file' });
      continue;
    }
    await scanOneFile(entryPath, relativePath, findings, maxFileBytes);
  }
}

/** Scan a directory tree. Returns findings, deterministically ordered. An empty array is
 *  the ONLY clean result; any finding, including an unscannable input, fails the scan. */
export async function scanDirectory(directory, { maxFileBytes = MAX_FILE_BYTES } = {}) {
  const findings = [];
  await walk(directory, directory, findings, maxFileBytes);
  findings.sort((a, b) => (a.relativePath === b.relativePath
    ? a.rule.localeCompare(b.rule)
    : a.relativePath.localeCompare(b.relativePath)));
  return findings;
}

export function exitCodeFor(findings) {
  if (findings.length === 0) return 0;
  return findings.some((finding) => finding.kind !== 'unscannable') ? EXIT_PATTERN_FINDING : EXIT_UNSCANNABLE;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const directory = process.argv[2] ?? '.';
  const findings = await scanDirectory(directory);
  if (findings.length > 0) {
    for (const finding of findings) {
      const detail = finding.detail ? ` (${finding.detail})` : '';
      console.error(`${finding.kind}: ${finding.rule} — ${finding.relativePath || finding.file}${detail}`);
    }
    console.error(`${findings.length} finding(s). A pattern scan cannot prove absence of secrets; it can only fail on what it does match.`);
    process.exit(exitCodeFor(findings));
  }
}
