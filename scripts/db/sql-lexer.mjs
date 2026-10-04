// ONE SQL LEXER FOR EVERY STATIC READER (the sql-lexer batch; the Owner's `ลุยต่อเลย เอาตามแนะนำ`, 2026-10-04,
// accepting A0's recommendation of "one real lexer shared by every static reader" over a parser RFC).
//
// Why it exists. Every static reader of SQL in this repository was a regex or a hand scanner of its own: psqlLex,
// the COPY and server-file patterns, the do-block blanker, sqlWithoutComments, the view pattern, the audit-table
// tripwire. Each review round found a spelling on which one of them read the text otherwise than PostgreSQL does
// -- a `'` inside a dollar body desynced a blanker, `--` inside a dollar body ate a line, `COPY ... TO $p$f$p$`
// passed a pattern that knew one quote kind -- and every fix was followed by the next spelling (blocker 186's
// OWED-TOOLING sentence). The convergent fix is one tokenizer that follows PostgreSQL's lexical rules as
// documented (sql-syntax-lexical, and src/backend/parser/scan.l for the edges the page leaves out), used by every
// reader, and that FAILS CLOSED on anything it cannot classify.
//
// What it follows, with standard_conforming_strings ON (any mention of that setting is refused by psqlLex, so the
// other reading never applies to a fed source):
//   * whitespace: space, tab, LF, CR, FF, VT (PostgreSQL 16+);
//   * `--` comments to the end of the line, ended by LF OR a bare CR (scan.l: non_newline is [^\n\r]);
//   * `/* */` comments, nested; an unterminated one is refused;
//   * plain '' strings with '' doubled; E'' strings with backslash escapes; U&'' strings (with UESCAPE); B'' and
//     X'' strings; N'' strings (a plain string); and the continuation of any of them across whitespace that holds
//     a newline (with `--` comments between), in the state the first segment opened, as scan.l's xqcat does;
//   * dollar quotes `$tag$ ... $tag$`, the tag an identifier without `$`, closed by the same tag only (a different
//     tag inside is body text); a `$` after an identifier character continues the identifier;
//   * identifiers (ASCII letters, `_`, any character from U+0080, then digits and `$`), folded to lower case;
//     double-quoted identifiers with "" doubled (a zero-length one refused); U&"" identifiers (with UESCAPE);
//   * numbers, with the PostgreSQL 15+ rule that a number followed at once by an identifier character is junk
//     (refused: `1.e'...'` is one), and `$n` parameters;
//   * operators of the operator characters, cut before an embedded `--` or `/*`, and the trailing +/- rule;
//   * the punctuation ( ) [ ] , ; : :: . and the psql-only shapes when `psql` is set: a backslash outside every
//     literal, body, identifier and comment is a META-COMMAND to the end of its line, and `:name`, `:'name'` and
//     `:"name"` are psql VARIABLE references psql would substitute (refused: fail closed).
// Statements split where psql splits them: at `;` outside parentheses. A SQL-standard `BEGIN ATOMIC` body, which
// psql 15+ keeps whole and this splitter would not, is refused rather than modelled.
//
// What it does NOT decide, and says so: what a statement MEANS (that is the parser's and the catalog's), and text
// COMPUTED at run time -- set_config('client_' || 'encoding', ...), EXECUTE of a concatenation, format(), chr(),
// convert_from() -- which no reader of the source text can see. Those stay held by the live catalog probes.
//
// Node built-ins only (RFC-2026-001: no dependency).

const IDENT_START = /[A-Za-z_\u0080-￿]/;
const IDENT_CONT = /[A-Za-z0-9_$\u0080-￿]/;
const DOLQ_CONT = /[A-Za-z0-9_\u0080-￿]/;
const SPACE = new Set([' ', '\t', '\n', '\r', '\f', '\v']);
const HORIZ_SPACE = new Set([' ', '\t', '\f', '\v']);
const OP_CHARS = new Set([...'~!@#^&|`?+-*/%<>=']);
const NON_TRAILING = new Set([...'~!@#^&|`?%']);
const PUNCT = new Set([...'()[],;']);

export const isIdentStart = (ch) => ch !== undefined && IDENT_START.test(ch);
export const isIdentCont = (ch) => ch !== undefined && IDENT_CONT.test(ch);
const isDigit = (ch) => ch !== undefined && ch >= '0' && ch <= '9';
const isHex = (ch) => ch !== undefined && /[0-9A-Fa-f]/.test(ch);

// The kinds a token can be. A reader switches on these, never on the text's first character.
export const KINDS = Object.freeze(['space', 'line_comment', 'block_comment', 'ident', 'qident', 'uident',
  'string', 'estring', 'ustring', 'bstring', 'xstring', 'dollar', 'number', 'param', 'op', 'punct', 'meta', 'psqlvar', 'unknown']);
export const STRING_KINDS = Object.freeze(['string', 'estring', 'ustring', 'bstring', 'xstring', 'dollar']);
export const COMMENT_KINDS = Object.freeze(['line_comment', 'block_comment']);

function decodeUnicodeEscapes(body, escape) {
  // U&'' / U&"": `<esc>XXXX`, `<esc>+XXXXXX`, `<esc><esc>`. Returns null on a malformed escape (refused by the caller).
  let out = '';
  for (let i = 0; i < body.length; i += 1) {
    if (body[i] !== escape) { out += body[i]; continue; }
    if (body[i + 1] === escape) { out += escape; i += 1; continue; }
    if (body[i + 1] === '+') {
      const hex = body.slice(i + 2, i + 8);
      if (!/^[0-9A-Fa-f]{6}$/.test(hex)) return null;
      const cp = Number.parseInt(hex, 16); if (cp > 0x10ffff) return null;
      out += String.fromCodePoint(cp); i += 7; continue;
    }
    const hex = body.slice(i + 1, i + 5);
    if (!/^[0-9A-Fa-f]{4}$/.test(hex)) return null;
    out += String.fromCodePoint(Number.parseInt(hex, 16)); i += 4;
  }
  return out;
}

function decodeEString(body) {
  // E'' body with '' already undoubled is NOT assumed: the caller passes the raw segment text between quotes.
  let out = '';
  for (let i = 0; i < body.length; i += 1) {
    const ch = body[i];
    if (ch === "'" && body[i + 1] === "'") { out += "'"; i += 1; continue; }
    if (ch !== '\\') { out += ch; continue; }
    const n = body[i + 1];
    if (n === undefined) return null;
    if (n === 'x' && isHex(body[i + 2])) {
      const len = isHex(body[i + 3]) ? 2 : 1;
      out += String.fromCharCode(Number.parseInt(body.slice(i + 2, i + 2 + len), 16)); i += 1 + len; continue;
    }
    if (n >= '0' && n <= '7') {
      let len = 1; while (len < 3 && body[i + 1 + len] >= '0' && body[i + 1 + len] <= '7') len += 1;
      out += String.fromCharCode(Number.parseInt(body.slice(i + 1, i + 1 + len), 8) & 0xff); i += len; continue;
    }
    if (n === 'u' || n === 'U') {
      const len = n === 'u' ? 4 : 8;
      const hex = body.slice(i + 2, i + 2 + len);
      if (!new RegExp(`^[0-9A-Fa-f]{${len}}$`).test(hex)) return null;
      const cp = Number.parseInt(hex, 16); if (cp > 0x10ffff) return null;
      out += String.fromCodePoint(cp); i += 1 + len; continue;
    }
    out += ({ b: '\b', f: '\f', n: '\n', r: '\r', t: '\t' })[n] ?? n; i += 1;
  }
  return out;
}

// LEX. `psql: true` reads the text as psql reads a script it is fed (meta-commands and variables); `psql: false`
// reads it as the server reads a string it parses (an EXECUTE text, a function body). Returns every token,
// whitespace and comments included, so the tokens' texts concatenate back to the input exactly, and every place
// the text could not be classified in `refusals` ({ at, line, reason }). A caller that refuses on a non-empty
// `refusals` fails closed.
export function lexSql(input, { psql = false } = {}) {
  const text = String(input);
  const tokens = [];
  const refusals = [];
  let line = 1;
  const lineAt = (() => {
    const starts = [0];
    for (let k = 0; k < text.length; k += 1) if (text[k] === '\n') starts.push(k + 1);
    return (pos) => { let lo = 0; let hi = starts.length - 1; while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (starts[mid] <= pos) lo = mid; else hi = mid - 1; } return lo + 1; };
  })();
  const refuse = (at, reason) => refusals.push({ at, line: lineAt(at), reason });
  const push = (kind, start, end, extra = {}) => { line = lineAt(start); tokens.push({ kind, start, end, line, text: text.slice(start, end), ...extra }); };

  // After a closing quote: whitespace that holds a newline (with `--` comments, never a block comment), then a
  // quote, continues the same literal (scan.l: quotecontinue). Returns the index of that quote, or -1.
  const continuation = (pos) => {
    let i = pos; let sawNewline = false;
    for (;;) {
      const ch = text[i];
      if (ch === '\n' || ch === '\r') { sawNewline = true; i += 1; continue; }
      if (HORIZ_SPACE.has(ch)) { i += 1; continue; }
      if (ch === '-' && text[i + 1] === '-') { while (i < text.length && text[i] !== '\n' && text[i] !== '\r') i += 1; continue; }
      break;
    }
    return sawNewline && text[i] === "'" ? i : -1;
  };
  // A quoted segment from the quote at `q`: returns { end (index after the closing quote) , raw (between) } or null.
  const segment = (q, escapes, doubling = true) => {
    let j = q + 1;
    for (; j < text.length; j += 1) {
      if (escapes && text[j] === '\\') { j += 1; continue; }
      if (text[j] === "'") { if (doubling && text[j + 1] === "'") { j += 1; continue; } return { end: j + 1, raw: text.slice(q + 1, j) }; }
    }
    return null;
  };
  // A literal: one or more segments joined by continuations. `odd` records a quote after an odd run of
  // backslashes in a plain literal (where turning standard_conforming_strings off would move its end).
  const literal = (start, q, kind) => {
    const escapes = kind === 'estring';
    const doubling = kind !== 'bstring' && kind !== 'xstring';
    const raws = [];
    let at = q; let end = -1; let odd = false;
    for (;;) {
      const seg = segment(at, escapes, doubling);
      if (!seg) { refuse(start, `an unterminated ${kind === 'string' ? 'quoted string' : kind}`); end = text.length; raws.push(text.slice(at + 1)); break; }
      if (kind === 'string' || kind === 'ustring') {
        for (let j = at + 1; j < seg.end; j += 1) {
          if (text[j] !== "'") continue;
          let run = 0; while (j - 1 - run > at && text[j - 1 - run] === '\\') run += 1;
          if (run % 2 === 1) odd = true;
        }
      }
      raws.push(seg.raw);
      const next = continuation(seg.end);
      if (next === -1) { end = seg.end; break; }
      at = next;
    }
    let value;
    if (kind === 'estring') value = raws.map(decodeEString).some((v) => v === null) ? null : raws.map(decodeEString).join('');
    else if (doubling) value = raws.map((r) => r.replace(/''/g, "'")).join('');
    else value = raws.join('');
    if (kind === 'estring' && value === null) refuse(start, 'an E\'\' string with a malformed escape');
    if (kind === 'bstring' && !/^[01]*$/.test(value ?? '')) refuse(start, 'a B\'\' string of other than 0 and 1');
    if (kind === 'xstring' && !/^[0-9A-Fa-f]*$/.test(value ?? '')) refuse(start, 'an X\'\' string of other than hex digits');
    return { end, value, odd };
  };
  // UESCAPE after a U& literal or identifier: whitespace or comments, the word, whitespace or comments, a
  // one-character plain literal that is not a hex digit, +, ', ", or whitespace.
  const uescape = (pos) => {
    const skip = (i) => {
      for (;;) {
        if (SPACE.has(text[i])) { i += 1; continue; }
        if (text[i] === '-' && text[i + 1] === '-') { while (i < text.length && text[i] !== '\n' && text[i] !== '\r') i += 1; continue; }
        if (text[i] === '/' && text[i + 1] === '*') { const c = blockComment(i); if (c < 0) return i; i = c; continue; }
        return i;
      }
    };
    const i = skip(pos);
    if (!/^uescape$/i.test(text.slice(i, i + 7)) || isIdentCont(text[i + 7])) return { end: pos, escape: '\\' };
    const k = skip(i + 7);
    const m = /^'([^']|'')'/.exec(text.slice(k));
    if (!m) return { end: pos, escape: null };
    const esc = m[1] === "''" ? "'" : m[1];
    if (/[0-9A-Fa-f+'"\s]/.test(esc)) return { end: k + m[0].length, escape: null };
    return { end: k + m[0].length, escape: esc };
  };
  // A block comment from `/*` at i; returns the index after its close, or -1 if unterminated.
  const blockComment = (i) => {
    let nest = 1; let j = i + 2;
    while (j < text.length && nest > 0) {
      if (text[j] === '/' && text[j + 1] === '*') { nest += 1; j += 2; continue; }
      if (text[j] === '*' && text[j + 1] === '/') { nest -= 1; j += 2; continue; }
      j += 1;
    }
    return nest === 0 ? j : -1;
  };

  let i = 0;
  while (i < text.length) {
    const start = i;
    const ch = text[i];
    const next = text[i + 1];
    if (SPACE.has(ch)) { while (i < text.length && SPACE.has(text[i])) i += 1; push('space', start, i); continue; }
    if (ch === '-' && next === '-') { while (i < text.length && text[i] !== '\n' && text[i] !== '\r') i += 1; push('line_comment', start, i); continue; }
    if (ch === '/' && next === '*') {
      const end = blockComment(i);
      if (end < 0) { refuse(start, 'an unterminated /* comment'); push('block_comment', start, text.length); i = text.length; continue; }
      push('block_comment', start, end); i = end; continue;
    }
    // Literals with a prefix, and identifiers. Longest match, as flex reads them: `x'` is a hex string, `ex'` is
    // the identifier `ex` then a plain string.
    if (isIdentStart(ch)) {
      const lower = ch.toLowerCase();
      if (next === "'" && 'bxen'.includes(lower)) {
        const kind = { b: 'bstring', x: 'xstring', e: 'estring', n: 'string' }[lower];
        const lit = literal(start, i + 1, kind);
        push(kind, start, lit.end, { value: lit.value, odd: lit.odd, prefix: ch });
        i = lit.end; continue;
      }
      if (lower === 'u' && next === '&' && (text[i + 2] === "'" || text[i + 2] === '"')) {
        if (text[i + 2] === "'") {
          const lit = literal(start, i + 2, 'ustring');
          const u = uescape(lit.end);
          const value = u.escape === null ? null : decodeUnicodeEscapes(lit.value ?? '', u.escape);
          if (value === null) refuse(start, 'a U&\'\' string with a malformed escape or UESCAPE');
          push('ustring', start, u.end, { value, odd: lit.odd }); i = u.end; continue;
        }
        let j = i + 3;
        for (; j < text.length; j += 1) { if (text[j] === '"') { if (text[j + 1] === '"') { j += 1; continue; } break; } }
        if (j >= text.length) { refuse(start, 'an unterminated quoted identifier'); push('uident', start, text.length, { value: '' }); i = text.length; continue; }
        const u = uescape(j + 1);
        const raw = text.slice(i + 3, j).replace(/""/g, '"');
        const value = u.escape === null ? null : decodeUnicodeEscapes(raw, u.escape);
        if (value === null || value === '') refuse(start, 'a U&"" identifier that is empty or has a malformed escape or UESCAPE');
        push('uident', start, u.end, { value: value ?? '' }); i = u.end; continue;
      }
      while (i < text.length && isIdentCont(text[i])) i += 1;
      const raw = text.slice(start, i);
      push('ident', start, i, { value: raw.replace(/[A-Z]+/g, (s) => s.toLowerCase()) });
      continue;
    }
    if (ch === '"') {
      let j = i + 1;
      for (; j < text.length; j += 1) { if (text[j] === '"') { if (text[j + 1] === '"') { j += 1; continue; } break; } }
      if (j >= text.length) { refuse(start, 'an unterminated quoted identifier'); push('qident', start, text.length, { value: text.slice(i + 1) }); i = text.length; continue; }
      const value = text.slice(i + 1, j).replace(/""/g, '"');
      if (value === '') refuse(start, 'a zero-length quoted identifier');
      push('qident', start, j + 1, { value }); i = j + 1; continue;
    }
    if (ch === "'") {
      const lit = literal(start, i, 'string');
      push('string', start, lit.end, { value: lit.value, odd: lit.odd }); i = lit.end; continue;
    }
    if (ch === '$') {
      if (isDigit(next)) {
        i += 1; while (isDigit(text[i])) i += 1;
        if (isIdentCont(text[i])) { while (isIdentCont(text[i])) i += 1; refuse(start, 'a parameter followed at once by an identifier character (junk)'); }
        push('param', start, i); continue;
      }
      let j = i + 1;
      if (isIdentStart(text[j])) { j += 1; while (DOLQ_CONT.test(text[j] ?? '')) j += 1; }
      if (text[j] === '$') {
        const tag = text.slice(i, j + 1);
        const close = text.indexOf(tag, j + 1);
        if (close < 0) { refuse(start, `an unterminated dollar-quoted string (${tag})`); push('dollar', start, text.length, { tag, value: text.slice(j + 1) }); i = text.length; continue; }
        push('dollar', start, close + tag.length, { tag, value: text.slice(j + 1, close) }); i = close + tag.length; continue;
      }
      refuse(start, 'a `$` that opens no dollar quote and no parameter');
      push('unknown', start, i + 1); i += 1; continue;
    }
    if (isDigit(ch) || (ch === '.' && isDigit(next))) {
      if (ch === '0' && /[xXoObB]/.test(next ?? '')) {
        const digit = { x: isHex, o: (c) => c >= '0' && c <= '7', b: (c) => c === '0' || c === '1' }[next.toLowerCase()];
        let j = i + 2; while (digit(text[j]) || (text[j] === '_' && digit(text[j + 1]))) j += 1;
        if (j > i + 2) { i = j; } else { i += 1; }
      } else {
        const digits = () => { while (isDigit(text[i]) || (text[i] === '_' && isDigit(text[i + 1]))) i += 1; };
        digits();
        if (text[i] === '.' && text[i + 1] !== '.') { i += 1; digits(); }
        if ((text[i] === 'e' || text[i] === 'E') && (isDigit(text[i + 1]) || ((text[i + 1] === '+' || text[i + 1] === '-') && isDigit(text[i + 2])))) {
          i += 2; digits();
        }
      }
      if (isIdentCont(text[i])) { while (isIdentCont(text[i])) i += 1; refuse(start, 'a number followed at once by an identifier character (trailing junk)'); }
      push('number', start, i); continue;
    }
    if (ch === ':') {
      if (next === ':') { push('punct', start, i + 2); i += 2; continue; }
      // psql reads `:` and a variable name (or `:'name'`, `:"name"`) as a reference it substitutes if the variable is
      // set. A name that begins with a digit (an array slice, `b[1:2]`) is admitted: psql sets no such variable and
      // nothing fed here can set one (`\set` is a meta-command, refused).
      if (psql && (isIdentStart(next) || next === "'" || next === '"')) {
        let j = i + 1;
        if (next === "'" || next === '"') { const close = text.indexOf(next, i + 2); j = close < 0 ? text.length : close + 1; } else { while (isIdentCont(text[j]) && text[j] !== '$') j += 1; }
        refuse(start, 'a psql variable reference, which psql substitutes before the server reads the text');
        push('psqlvar', start, j); i = j; continue;
      }
      push('punct', start, i + 1); i += 1; continue;
    }
    if (ch === '.') { push('punct', start, i + 1); i += 1; continue; }
    if (PUNCT.has(ch)) { push('punct', start, i + 1); i += 1; continue; }
    if (ch === '\\') {
      if (psql) {
        let j = i; while (j < text.length && text[j] !== '\n') j += 1;
        push('meta', start, j); i = j; continue;
      }
      refuse(start, 'a backslash outside every literal, which no SQL token holds');
      push('unknown', start, i + 1); i += 1; continue;
    }
    if (OP_CHARS.has(ch)) {
      let j = i;
      while (j < text.length && OP_CHARS.has(text[j])) {
        if (j > i && ((text[j] === '-' && text[j + 1] === '-') || (text[j] === '/' && text[j + 1] === '*'))) break;
        j += 1;
      }
      let op = text.slice(i, j);
      if (op.length > 1 && (op.endsWith('+') || op.endsWith('-')) && ![...op].some((c) => NON_TRAILING.has(c))) {
        while (op.length > 1 && (op.endsWith('+') || op.endsWith('-'))) op = op.slice(0, -1);
        j = i + op.length;
      }
      push('op', start, j); i = j; continue;
    }
    refuse(start, `a character no SQL token holds (U+${ch.codePointAt(0).toString(16).padStart(4, '0').toUpperCase()})`);
    push('unknown', start, i + 1); i += 1;
  }
  return { tokens, refusals };
}

export const isTrivia = (t) => t.kind === 'space' || t.kind === 'line_comment' || t.kind === 'block_comment';
// The keyword or name a token spells: an unquoted identifier folded to lower case, or a quoted one as written.
export const word = (t) => (t && (t.kind === 'ident' || t.kind === 'qident' || t.kind === 'uident') ? t.value : null);
// An unquoted identifier only: a keyword is never quoted.
export const keyword = (t) => (t && t.kind === 'ident' ? t.value : null);

// STATEMENTS, split as psql splits a script it is fed: at `;` outside parentheses. Each is its significant
// tokens (no whitespace, no comments), the line its first one is on, and its HEAD: its text with comments
// removed and whitespace collapsed, which is what the transaction-control and fixture rules read.
// `BEGIN ATOMIC` is refused by the caller (see psqlLex): psql 15+ does not split inside one.
export function splitStatements(tokens) {
  const statements = [];
  let current = [];
  let depth = 0;
  const end = () => {
    const sig = current.filter((t) => !isTrivia(t));
    if (sig.length) {
      const head = current.map((t) => (isTrivia(t) ? ' ' : t.text)).join('').replace(/\s+/g, ' ').trim();
      statements.push({ line: sig[0].line, start: sig[0].start, end: sig[sig.length - 1].end, tokens: sig, head });
    }
    current = [];
  };
  for (const t of tokens) {
    if (t.kind === 'punct' && t.text === '(') depth += 1;
    if (t.kind === 'punct' && t.text === ')') depth = Math.max(0, depth - 1);
    if (t.kind === 'punct' && t.text === ';' && depth === 0) { end(); continue; }
    current.push(t);
  }
  end();
  return statements;
}

// The text with every comment replaced (by one space unless told otherwise; `null` keeps that kind as written) and
// everything else -- literals, dollar bodies and quoted identifiers included -- byte for byte. With `bodies`, a
// dollar-quoted body that lexes is read as the code it is (a DO block's or a function's) and its comments are
// replaced too; one that does not lex is text and is kept. Throws on a text that does not lex, so a reader built
// on it fails closed instead of reading past what it cannot classify.
export function stripComments(text, { line = ' ', block = ' ', bodies = false } = {}) {
  const { tokens, refusals } = lexSql(text);
  if (refusals.length) throw new Error(`the SQL lexer cannot classify this text (${refusals[0].reason} at line ${refusals[0].line}), so no comment is stripped from it`);
  return tokens.map((t) => {
    if (t.kind === 'line_comment') return line === null ? t.text : line;
    if (t.kind === 'block_comment') return block === null ? t.text : block;
    if (bodies && t.kind === 'dollar' && lexSql(t.value).refusals.length === 0) return `${t.tag}${stripComments(t.value, { line, block, bodies })}${t.tag}`;
    return t.text;
  }).join('');
}

// The text with every quoted literal (plain, E'', U&'', B'', X'', N'') replaced by `replacement`, and inside every
// dollar-quoted body that lexes (read as the code it is) the same; comments, identifiers and everything else
// byte for byte. Throws on a text that does not lex.
export function blankLiterals(text, replacement = "''") {
  const { tokens, refusals } = lexSql(text);
  if (refusals.length) throw new Error(`the SQL lexer cannot classify this text (${refusals[0].reason} at line ${refusals[0].line}), so no literal is blanked in it`);
  return tokens.map((t) => {
    if (['string', 'estring', 'ustring', 'bstring', 'xstring'].includes(t.kind)) return replacement;
    if (t.kind === 'dollar' && lexSql(t.value).refusals.length === 0) return `${t.tag}${blankLiterals(t.value, replacement)}${t.tag}`;
    return t.text;
  }).join('');
}

// For the readers that were written `text.replace(/--[^\n]*/g, '')` and `.replace(/'(?:[^']|'')*'/g, "''")`:
// String.prototype.replace calls an object's Symbol.replace, so `text.replace(SQL_LINE_COMMENTS, '')` reads the
// text through this lexer instead -- a `--` inside a literal, a quoted identifier, a block comment or a dollar
// string is no longer taken for a comment, and a `'` inside a dollar body or a comment no longer opens a literal.
export const SQL_LINE_COMMENTS = Object.freeze({ [Symbol.replace]: (text, replacement) => stripComments(String(text), { line: replacement, block: null, bodies: true }) });
export const SQL_COMMENTS = Object.freeze({ [Symbol.replace]: (text, replacement) => stripComments(String(text), { line: replacement, block: replacement, bodies: true }) });
export const SQL_LITERALS = Object.freeze({ [Symbol.replace]: (text, replacement) => blankLiterals(String(text), replacement) });

// The text every string-like token carries, which EXECUTE, a DO block or a function body would read as SQL:
// a plain, E'' (decoded), U&'' (decoded) or N'' literal's value, and a dollar-quoted body.
export const nestedText = (t) => (['string', 'estring', 'ustring', 'dollar'].includes(t.kind) && typeof t.value === 'string' ? t.value : null);

// EVERY LEVEL. Lexes `text` (as psql would read it when `psql` is set), then every literal's and dollar body's
// text as the server would read it, to `maxDepth`. Calls visit({ tokens, refusals, depth, at }) per level, `at`
// being the offset in the outermost text of the token the level came from. A text the server would execute
// WHOLE lexes cleanly, or it is a syntax error and runs nothing; one that does not lex is still visited, with
// its refusals, so a reader may fail closed on it. Past `maxDepth` every non-empty text is reported through
// `beyond` rather than skipped, so a reader fails closed on it.
export const NESTED_DEPTH = 8;
export function walkLevels(text, visit, { psql = false, maxDepth = NESTED_DEPTH, beyond = () => {} } = {}) {
  const go = (src, depth, at, asPsql) => {
    const { tokens, refusals } = lexSql(src, { psql: asPsql });
    visit({ tokens, refusals, depth, at, text: src });
    for (const t of tokens) {
      const inner = nestedText(t);
      if (inner === null || inner === '') continue;
      const where = at === null ? t.start : at;
      if (depth + 1 > maxDepth) { beyond({ at: where, depth: depth + 1 }); continue; }
      go(inner, depth + 1, where, false);
    }
  };
  go(String(text), 0, null, psql);
}

// A statement's canonical text: its significant tokens joined by single spaces; an unquoted identifier folded
// to lower case; a quoted identifier that is a plain lower-case name written unquoted (`"app"` -> app), any
// other one as `"?"`; every literal and dollar body as `''`. Over this form a pattern reads words, never a
// quote, comment or `;` inside a token. The literal's own text is a level of its own (walkLevels).
export function canonical(tokens) {
  return tokens.filter((t) => !isTrivia(t)).map((t) => {
    if (t.kind === 'ident') return t.value;
    if (t.kind === 'qident' || t.kind === 'uident') return /^[a-z_][a-z0-9_$]*$/.test(t.value) ? t.value : '"?"';
    if (STRING_KINDS.includes(t.kind)) return "''";
    return t.text;
  }).join(' ');
}

// Every statement at every level, canonical: [{ depth, line, text }]. `line` is the line, in the outermost
// text, of the statement or of the literal or body that holds it. Throws if the outermost text does not lex.
export function canonicalStatements(text, { psql = false } = {}) {
  const out = [];
  const lineOf = (pos) => String(text).slice(0, pos).split('\n').length;
  walkLevels(text, ({ tokens, refusals, depth, at }) => {
    if (depth === 0 && refusals.length) throw new Error(`canonicalStatements: the text does not lex (${refusals[0].reason} at line ${refusals[0].line})`);
    for (const s of splitStatements(tokens)) out.push({ depth, line: at === null ? s.line : lineOf(at), text: canonical(s.tokens) });
  }, { psql });
  return out;
}
