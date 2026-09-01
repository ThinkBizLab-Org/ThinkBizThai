import assert from 'node:assert/strict';
import { chmod, mkdir, mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import {
  ALL_RULES,
  CREDENTIAL_RULES,
  EXIT_PATTERN_FINDING,
  EXIT_UNSCANNABLE,
  exitCodeFor,
  isPlaceholderValue,
  isThaiNationalId,
  PII_RULES,
  scanDirectory,
  scanText,
  shannonEntropy,
} from '../scripts/scan-repository-secrets.mjs';

// EVERY credential-shaped value in this file is assembled from fragments AT RUNTIME.
// Nothing below is a literal that the scanner can match, because this file is itself inside
// the tree the scanner walks -- an earlier independent security review tripped the scanner
// with its own evidence, and that must not recur.
const A = (...parts) => parts.join('');

/** Build a checksum-valid Thai national ID from 12 chosen digits. Structurally valid,
 *  belongs to nobody, and never written to this file as a literal. */
function synthThaiId(first12) {
  let sum = 0;
  for (let index = 0; index < 12; index += 1) sum += Number(first12[index]) * (13 - index);
  return first12 + String((11 - (sum % 11)) % 10);
}

// The table the two independent security probes defeated the superseded scanner with.
// Every row MUST be detected. `rule` pins WHICH rule fires, so a row cannot be kept green
// by an unrelated pattern widening.
const CREDENTIAL_DECOYS = [
  ['openai project key', 'openai-project-key', A('sk-', 'proj-', 'T3BlbkFJ', 'a7Kd92LmQ4xR', 'nZ0pYv8CwE6t', 'HgJb5Ss1Uf')],
  ['openai legacy key', 'openai-legacy-key', A('sk-', 'a7Kd92LmQ4xRnZ0pYv8CwE6tHgJb5Ss1UfQ3')],
  ['anthropic api key', 'anthropic-api-key', A('sk-', 'ant-', 'api03-', 'r9TmQ2wZ', 'xK4vB7nL', 'pD1cJ6hY', 'sA8gF3eU')],
  ['google api key', 'google-api-key', A('AIza', 'Sy', 'C7n4Kd2LmQ9xR', 'zZ0pYv8CwE', '6tHgJb5Ss', 'q4Wz')],
  ['slack bot token', 'slack-token', A('xoxb-', '20481073152', '-', '30291847362', '-', 'k9Qm4Rt7Zx2Lp8Vb3Nd6Wc1Y')],
  ['json web token', 'json-web-token', A('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9', '.', 'eyJzdWIiOiI5OTk5OTkiLCJuIjoiU3ludGgifQ', '.', 'Qm4Rt7Zx2Lp8Vb3Nd6Wc1Yk9Jf5Hs0Ta')],
  ['postgres dsn with inline password', 'database-url-inline-password', A('postgres', '://', 'app_rw', ':', 'Hn7Qz2Lm9Rt4Vb', '@', 'db.synthetic-host.example', ':5432/appdb')],
  ['db password assignment', 'secret-named-assignment', A('DB_', 'PASSWORD', '=', 'Hn7Qz2Lm9Rt4Vb8Kd')],
  ['api key assignment', 'secret-named-assignment', A('API_', 'KEY', '=', 'k9Qm4Rt7Zx2Lp8Vb3Nd6Wc1Y')],
  ['azure storage connection string', 'azure-storage-key', A('AccountName=synthacct;', 'Account', 'Key', '=', 'Qm4Rt7Zx2Lp8Vb3Nd6Wc1Yk9Jf5Hs0TaGe2Uu7Ii4Oo1Pp8Aa5Ss3Dd6Ff9Gg2Hh==')],
  ['aws access key id', 'aws-access-key-id', A('AKIA', 'IOSFODNN7EXAMPLE')],
  ['github token', 'github-token', A('ghp_', 'k9Qm4Rt7Zx2Lp8Vb3Nd6Wc1Yj5Hs0TaGe2U')],
  ['stripe secret key', 'stripe-secret-key', A('sk_', 'live_', 'k9Qm4Rt7Zx2Lp8Vb3Nd6Wc1Y')],
  ['stripe webhook secret', 'stripe-webhook-secret', A('whsec_', 'k9Qm4Rt7Zx2Lp8Vb3Nd6Wc1Y')],
  ['npm access token', 'npm-access-token', A('npm_', 'k9Qm4Rt7Zx2Lp8Vb3Nd6Wc1Yj5Hs0TaGe2Uu')],
  ['bearer authorization header', 'authorization-header', A('Authorization', ': ', 'Bearer ', 'k9Qm4Rt7Zx2Lp8Vb3Nd6Wc1Yj5Hs0Ta')],
  ['pem private key', 'pem-private-key', A('-----BEGIN ', 'PRIVATE KEY-----')],

  // C2: the ten rules added after the first uncorrelated probe had NO test coverage at all --
  // the decoy table was pinned at 17 rows, none targeting a new rule, and the only guard was a
  // rule COUNT. Any of the ten could have been deleted or broken with the suite still green.
  // Independent security review found it. Every value is built by concatenation so this file
  // does not match its own scanner.
  ['meta page access token', 'meta-access-token', A('EAA', 'GZC1ZBk2xQBO4BA', 'M'.repeat(60))],
  ['stripe restricted key', 'stripe-restricted-key', A('rk_', 'live_', '51H8x9K2mNpQrStUvWxYz')],
  ['gcp service account private key', 'gcp-service-account-key', A('{"type"', ': "service_account", "private_key": "', '-----', 'BEGIN PRIVATE KEY', '-----')],
  ['twilio sid and auth token', 'twilio-auth-pair', A('AC', '0'.repeat(32), ' ', 'b'.repeat(32))],
  ['sendgrid key', 'sendgrid-key', A('SG', '.', 'A'.repeat(22), '.', 'B'.repeat(43))],
  ['npmrc auth token', 'npmrc-auth-token', A('//registry.npmjs.org/:', '_authToken', '=', 'npm', '_', 'x'.repeat(36))],
  ['netrc password block', 'netrc-password', A('machine registry.example\n  login bot\n  ', 'password', ' ', 'Zx9Zx9Zx9Zx9')],
  ['kubernetes service account token', 'kubernetes-service-account-token', A('eyJhbGciOiJSUzI1NiIsImtpZCI6', 'Ab3Cd5Ef7Gh', '.', 'eyJzdWIiOiJzYSJ9', '.', 'Z'.repeat(43))],
  ['vault service token', 'vault-token', A('hvs', '.', 'CAESIJ9xQm4Rt7Zx2Lp8Vb3Nd6Wc1Yk9Jf5Hs0Ta')],
  // The per-rule coverage assertion exposed five rules with no decoy that PREDATE the ten
  // added after the uncorrelated probe -- the hardcoded count of 17 had hidden them too.
  ['azure sas signature', 'azure-sas-signature', A('https://acct.blob.core.windows.net/c/b', '?sv=2021-01-01&', 'sig', '=', 'Qm4Rt7Zx2Lp8Vb3Nd6Wc1Yk9Jf5Hs0TaGe2Uu7Ii4Oo1Pp8Aa%3D')],
  ['putty private key', 'putty-private-key', A('PuTTY', '-User-Key-File-3', ': ssh-rsa')],
  ['aws secret access key', 'aws-secret-access-key', A('aws_secret_access_key', ' = ', 'wJalrXUtnFEMI', 'K7MDENG', 'bPxRfiCYEXAMPLEKEY', 'AA')],
  ['github fine-grained pat', 'github-fine-grained-pat', A('github_pat', '_', '11ABCDEFG0', '_', 'x'.repeat(59))],
  ['openai legacy key', 'openai-legacy-key', A('sk', '-', 'Qm4Rt7Zx2Lp8Vb3Nd6Wc1Yk9Jf5Hs0TaGe2Uu7Ii4O')],
  ['slack app token', 'slack-app-token', A('xapp', '-', '1', '-', 'A0123456789', '-', '2468013579246', '-', 'q'.repeat(64))],
];

// Values that MUST NOT fire. Several are verbatim shapes that already exist in this
// repository's committed prose and evidence; a rule that fires on them is unusable here.
const FALSE_POSITIVES = [
  ['a git commit sha', '03aebeef6932d4901ac8182b80908447bffd3fbf'],
  ['a sha256 integrity digest', '2c628e231359e70ed8097d79a306343d31912b49a32912922d1dbf017bf0946c'],
  ['the illustrative dsn in committed gap evidence', A('postgres', '://u:p@h/db')],
  ['a two-segment jwt-shaped string in committed gap evidence', A('eyJhbGciOiJIUzI1NiJ9', '.LEAK')],
  ['a truncated key mention in committed prose', A('api_key:"', 'sk-', 'live-abc"')],
  ['a lowercase json style assignment', A('api_key: "', 'redacted', '"')],
  ['an empty secret-named assignment as written in committed prose', A('DB_', 'PASSWORD', '=')],
  ['a templated env reference', A('API_', 'KEY', '=${', 'VAULT_REF', '}')],
  ['a handlebars templated env reference', A('DB_', 'PASSWORD', '={{', 'db_password', '}}')],
  ['a documented placeholder value', A('API_', 'KEY', '=', 'changeme')],
  ['an angle-bracket placeholder', A('API_', 'KEY', '=<', 'your-key-here', '>')],
  ['a pinned toolchain coordinate', 'npm@11.19.0 and node@24.20.0'],
  ['a work package identifier', 'WP-0A-A0-003 and RFC-2026-005'],
  ['an internal-sounding taxonomy id from committed docs', 'topic.wardrobe.internal-function'],
  ['a low-entropy repetitive sk- string', A('sk-', 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa')],
  ['a thirteen digit run with a wrong check digit', '1103701503450'],
  ['an iso timestamp', '2026-08-31T18:13:45Z'],
  ['a plain ten digit number that is not a thai mobile prefix', '0212345678'],
  ['a documented dsn whose short password keeps it below the dsn floor', A('mysql', '://', 'appuser', ':', 'pass', '@', 'db.example.com', '/app')],
];

async function withTempDir(body) {
  const directory = await mkdtemp(join(tmpdir(), 'thinkbizthai-secret-test-'));
  try {
    return await body(directory);
  } finally {
    await chmod(directory, 0o700).catch(() => {});
    await rm(directory, { recursive: true, force: true });
  }
}

/** True when this process really cannot read the path. Running as root defeats chmod, and
 *  a test that silently passes under root is exactly the class of defect this suite exists
 *  to prevent, so the fail-closed tests assert the weaker invariant in that case. */
async function trulyUnreadable(path) {
  try {
    await readFile(path);
    return false;
  } catch {
    return true;
  }
}

test('accepts synthetic safe content', async () => {
  await withTempDir(async (directory) => {
    await writeFile(join(directory, 'safe.txt'), 'synthetic fixture without credentials\n');
    assert.deepEqual(await scanDirectory(directory), []);
  });
});

test('rejects a synthetic private-key pattern', async () => {
  await withTempDir(async (directory) => {
    const file = join(directory, 'unsafe.txt');
    await writeFile(file, `${A('-----BEGIN ', 'PRIVATE KEY-----')}\nsynthetic only\n`);
    const findings = await scanDirectory(directory);
    assert.deepEqual(findings.map((finding) => finding.rule), ['pem-private-key']);
    assert.equal(findings[0].file, file);
  });
});

test('detects every synthetic credential decoy the earlier probes defeated', async () => {
  const missed = [];
  const wrongRule = [];
  for (const [name, expectedRule, value] of CREDENTIAL_DECOYS) {
    const hits = scanText(`# synthetic decoy\n${value}\n`, { relativePath: 'config/.env.production' });
    if (hits.length === 0) missed.push(name);
    else if (!hits.includes(expectedRule)) wrongRule.push(`${name} -> ${hits.join(',')}`);
  }
  assert.deepEqual(missed, [], `undetected credential decoys: ${missed.join(', ')}`);
  assert.deepEqual(wrongRule, [], `decoys matched by an unexpected rule: ${wrongRule.join('; ')}`);
  // A hardcoded count is exactly why ten rules shipped with no decoy at all: adding a rule
  // never broke this assertion. The table must instead grow with the rule set.
  assert.ok(CREDENTIAL_DECOYS.length >= CREDENTIAL_RULES.length,
    `${CREDENTIAL_RULES.length} credential rules but only ${CREDENTIAL_DECOYS.length} decoys`);
});

test('the credential decoy table is detected on disk, not only in memory', async () => {
  await withTempDir(async (directory) => {
    for (const [index, [, , value]] of CREDENTIAL_DECOYS.entries()) {
      await writeFile(join(directory, `decoy-${index}.env`), `${value}\n`);
    }
    const findings = await scanDirectory(directory);
    // At least one per decoy. A decoy may legitimately match two rules -- an npmrc line
    // carries both an npm token shape and an _authToken assignment -- so equality would
    // forbid overlapping coverage rather than measure it.
    assert.ok(findings.length >= CREDENTIAL_DECOYS.length,
      `${findings.length} findings for ${CREDENTIAL_DECOYS.length} decoys written to disk`);
    const byFile = new Set(findings.map((finding) => finding.relativePath ?? finding.file));
    assert.equal(byFile.size, CREDENTIAL_DECOYS.length, 'every decoy file must produce at least one finding');
    assert.ok(findings.every((finding) => finding.kind === 'credential'));
  });
});

test('detects a checksum-valid synthetic Thai national ID in plain and hyphenated form', () => {
  const plain = synthThaiId('110370150345');
  const hyphenated = `${plain.slice(0, 1)}-${plain.slice(1, 5)}-${plain.slice(5, 10)}-${plain.slice(10, 12)}-${plain.slice(12)}`;
  assert.deepEqual(scanText(`id: ${plain}`, { relativePath: 'fixtures/customer.json' }), ['thai-national-id']);
  assert.deepEqual(scanText(`id: ${hyphenated}`, { relativePath: 'fixtures/customer.json' }), ['thai-national-id']);
});

test('detects synthetic Thai phone numbers in several written formats', () => {
  const formats = [A('08', '12345678'), A('08', '1-234-5678'), A('+66', '81234567 8').replace(' ', ''), A('09', '87654321')];
  for (const value of formats) {
    assert.deepEqual(
      scanText(`phone: ${value}`, { relativePath: 'fixtures/customer.json' }),
      ['thai-phone-number'],
      `not detected: ${value}`,
    );
  }
});

test('detects an email address outside evidence prose', () => {
  const address = A('somchai.customer', '@', 'synthetic-example', '.co.th');
  assert.deepEqual(scanText(`contact: ${address}`, { relativePath: 'fixtures/customer.json' }), ['email-address']);
  assert.deepEqual(scanText(`contact: ${address}`, { relativePath: 'contract-catalog/x/examples/valid.json' }), ['email-address']);
});

test('exempts email addresses inside evidence and handoff prose only', () => {
  const address = A('maintainer', '@', 'synthetic-example', '.org');
  const line = `Author: Someone <${address}>`;
  assert.deepEqual(scanText(line, { relativePath: 'evidence/WP-0A-A0-003/author-self-check.md' }), []);
  assert.deepEqual(scanText(line, { relativePath: 'handoffs/WP-0A-A0-003-author-handoff.json' }), []);
  assert.deepEqual(scanText(line, { relativePath: 'docs/plans/some-plan.md' }), ['email-address']);
  assert.deepEqual(scanText(line, { relativePath: 'scripts/thing.mjs' }), ['email-address']);
});

test('does not exempt Thai national ID or phone numbers in evidence prose', () => {
  const id = synthThaiId('310120054321');
  assert.deepEqual(scanText(`id ${id}`, { relativePath: 'evidence/WP-0A-A0-003/note.md' }), ['thai-national-id']);
  assert.deepEqual(scanText(`tel ${A('08', '12345678')}`, { relativePath: 'handoffs/x.json' }), ['thai-phone-number']);
});

test('a credential inside evidence prose is still reported', () => {
  const value = A('AKIA', 'IOSFODNN7EXAMPLE');
  assert.deepEqual(scanText(value, { relativePath: 'evidence/WP-0A-A0-003/note.md' }), ['aws-access-key-id']);
});

test('fails closed on an unreadable file', async () => {
  await withTempDir(async (directory) => {
    const file = join(directory, 'unreadable.env');
    await writeFile(file, `${A('AKIA', 'IOSFODNN7EXAMPLE')}\n`);
    await chmod(file, 0o000);
    const unreadable = await trulyUnreadable(file);
    const findings = await scanDirectory(directory);
    await chmod(file, 0o600);
    // The superseded scanner returned [] here: a file it could not read was a clean file.
    assert.notDeepEqual(findings, [], 'an unreadable file containing a credential was reported clean');
    if (unreadable) {
      assert.deepEqual(findings.map((finding) => finding.rule), ['unreadable-file']);
      assert.equal(exitCodeFor(findings), EXIT_UNSCANNABLE);
    } else {
      assert.deepEqual(findings.map((finding) => finding.rule), ['aws-access-key-id']);
    }
  });
});

test('fails closed on a directory that cannot be listed', async () => {
  await withTempDir(async (directory) => {
    const nested = join(directory, 'locked');
    await mkdir(nested);
    await writeFile(join(nested, 'x.env'), `${A('AKIA', 'IOSFODNN7EXAMPLE')}\n`);
    await chmod(nested, 0o000);
    const findings = await scanDirectory(directory);
    await chmod(nested, 0o700);
    assert.notDeepEqual(findings, [], 'an unlistable directory was treated as an empty directory');
    assert.ok(['unreadable-directory', 'aws-access-key-id'].includes(findings[0].rule), findings[0].rule);
  });
});

test('fails closed on a file that is not valid UTF-8', async () => {
  await withTempDir(async (directory) => {
    await writeFile(join(directory, 'broken.txt'), Buffer.from([0x68, 0x69, 0xc3, 0x28, 0xff, 0xfe]));
    const findings = await scanDirectory(directory);
    assert.deepEqual(findings.map((finding) => finding.rule), ['undecodable-file']);
    assert.equal(exitCodeFor(findings), EXIT_UNSCANNABLE);
  });
});

test('an undecodable file is still pattern-scanned rather than skipped', async () => {
  await withTempDir(async (directory) => {
    const payload = Buffer.concat([Buffer.from([0xff, 0xfe]), Buffer.from(A('AKIA', 'IOSFODNN7EXAMPLE'))]);
    await writeFile(join(directory, 'broken.bin'), payload);
    const rules = (await scanDirectory(directory)).map((finding) => finding.rule).sort();
    assert.deepEqual(rules, ['aws-access-key-id', 'undecodable-file']);
  });
});

test('declared binary media is decoded without a finding but is still scanned', async () => {
  await withTempDir(async (directory) => {
    const payload = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0xff]), Buffer.from(A('AKIA', 'IOSFODNN7EXAMPLE'))]);
    await writeFile(join(directory, 'logo.png'), payload);
    assert.deepEqual((await scanDirectory(directory)).map((finding) => finding.rule), ['aws-access-key-id']);
  });
});

test('fails closed on an oversize file instead of truncating it', async () => {
  await withTempDir(async (directory) => {
    await writeFile(join(directory, 'big.txt'), 'x'.repeat(4096));
    const findings = await scanDirectory(directory, { maxFileBytes: 1024 });
    assert.deepEqual(findings.map((finding) => finding.rule), ['oversize-file']);
  });
});

test('reports a symbolic link instead of following it out of the scan root', async () => {
  await withTempDir(async (directory) => {
    const outside = join(directory, 'outside.txt');
    await writeFile(outside, 'synthetic\n');
    const inner = join(directory, 'tree');
    await mkdir(inner);
    await symlink(outside, join(inner, 'link.txt'));
    const findings = await scanDirectory(inner);
    assert.deepEqual(findings.map((finding) => finding.rule), ['unscannable-symlink']);
    assert.equal(exitCodeFor(findings), EXIT_UNSCANNABLE);
  });
});

test('does not fire on the false-positive table', () => {
  const fired = [];
  for (const [name, value] of FALSE_POSITIVES) {
    const hits = scanText(value, { relativePath: 'docs/plans/example.md' });
    if (hits.length > 0) fired.push(`${name} -> ${hits.join(',')}`);
  }
  assert.deepEqual(fired, [], `false positives: ${fired.join('; ')}`);
  assert.equal(FALSE_POSITIVES.length, 19);
});

test('exits clean on this repository as it stands', async () => {
  const findings = await scanDirectory('.');
  assert.deepEqual(findings, [], `the repository itself trips the scanner: ${findings.map((f) => `${f.relativePath}:${f.rule}`).join(', ')}`);
});

test('the Thai national ID checksum accepts a valid ID and rejects a wrong check digit', () => {
  const valid = synthThaiId('110370150345');
  assert.equal(isThaiNationalId(valid), true);
  const wrong = valid.slice(0, 12) + String((Number(valid[12]) + 1) % 10);
  assert.equal(isThaiNationalId(wrong), false);
  assert.equal(isThaiNationalId('1111111111111'), false, 'a repeated filler digit must not be treated as an identifier');
  assert.equal(isThaiNationalId('12345'), false);
});

test('the entropy and placeholder helpers behave as the rules assume', () => {
  assert.equal(shannonEntropy(''), 0);
  assert.equal(shannonEntropy('aaaaaaaa'), 0);
  assert.ok(shannonEntropy('a7Kd92LmQ4xRnZ0pYv8CwE6t') > 3);
  assert.ok(isPlaceholderValue('changeme'));
  assert.ok(isPlaceholderValue('${VAULT_REF}'));
  assert.ok(isPlaceholderValue('your-key-here'));
  assert.ok(isPlaceholderValue('xxxxxxxx'));
  // Anchored: a real credential that merely contains a placeholder word is NOT excused.
  assert.ok(!isPlaceholderValue('synthetic-Hn7Qz2Lm9Rt4Vb'));
});

test('every rule has a unique id and a global pattern', () => {
  const ids = ALL_RULES.map((rule) => rule.id);
  assert.equal(new Set(ids).size, ids.length, 'duplicate rule id');
  for (const rule of ALL_RULES) {
    assert.ok(rule.pattern.flags.includes('g'), `${rule.id} pattern must be global or matchAll throws`);
  }
  assert.equal(ALL_RULES.length, CREDENTIAL_RULES.length + PII_RULES.length);
  assert.ok(CREDENTIAL_RULES.length >= 20, `credential rule count regressed to ${CREDENTIAL_RULES.length}`);
  assert.equal(PII_RULES.filter((rule) => rule.proseExempt).length, 1, 'exactly one PII rule is prose-exempt');
});

test('exitCodeFor separates a pattern finding from an unscannable input', () => {
  assert.equal(exitCodeFor([]), 0);
  assert.equal(exitCodeFor([{ kind: 'unscannable' }]), EXIT_UNSCANNABLE);
  assert.equal(exitCodeFor([{ kind: 'credential' }]), EXIT_PATTERN_FINDING);
  assert.equal(exitCodeFor([{ kind: 'pii' }]), EXIT_PATTERN_FINDING);
  assert.equal(exitCodeFor([{ kind: 'unscannable' }, { kind: 'pii' }]), EXIT_PATTERN_FINDING);
});

// Independent security review found three CI-breaking false positives in the rules added
// after the first uncorrelated probe. Each is pinned so the fix cannot silently regress.
const NEW_RULE_FALSE_POSITIVES = [
  ['prose beginning with the word password', 'password reset flows are documented separately'],
  ['a member chain resembling a legacy vault token', 'const v = x.s.someVeryLongIdentifierName;'],
  ['a publish script referencing an env var', '//registry.npmjs.org/:_authToken=${NPM_TOKEN}'],
  ['a forty-character git object id', 'a3f5c9e1b7d2048f6a3c5e9b1d7f2048a6c3e5b9'],
];

test('the rules added after the uncorrelated probe do not fire on legitimate content', () => {
  for (const [label, content] of NEW_RULE_FALSE_POSITIVES) {
    const hits = scanText(content, 'sample.txt');
    assert.deepEqual(hits, [], `${label} must not be reported: ${JSON.stringify(hits)}`);
  }
});

test('every credential rule is exercised by at least one decoy', () => {
  const covered = new Set(CREDENTIAL_DECOYS.map(([, id]) => id));
  const uncovered = CREDENTIAL_RULES.map((rule) => rule.id).filter((id) => !covered.has(id));
  assert.deepEqual(uncovered, [], `credential rule(s) with no decoy — a rule nothing tests can be deleted silently:\n  ${uncovered.join('\n  ')}`);
});

// Built at runtime, never written down. A test that states a valid card number puts one in
// the repository, and the rule under test would report the file that tests it -- so the suite
// would have to exempt itself, which is the one thing a scanner must never do.
function synthCard(leadingDigits) {
  let sum = 0;
  let double = true;
  for (let index = leadingDigits.length - 1; index >= 0; index -= 1) {
    let digit = Number(leadingDigits[index]);
    if (double) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
    double = !double;
  }
  return leadingDigits + String((10 - (sum % 10)) % 10);
}

test('detects a Luhn-valid card number for each issuer family this rule claims', () => {
  // 15 digits + a check digit, 12 + check, 14 + check: the lengths each issuer actually uses.
  const families = {
    visa16: synthCard('401288888888188'),
    visa13: synthCard('401288888188'),
    mastercard: synthCard('555555555555444'),
    mastercard2: synthCard('222100000000000'),
    amex: synthCard('37828224631000'),
    discover: synthCard('601111111111111'),
    jcb: synthCard('353011133330000'),
    // 19 is a real card length and was accepted by the rule with nothing testing it, which
    // a per-branch mutation of the length checks surfaced.
    visa19: synthCard('401288888888188123'),
    discover19: synthCard('601111111111111123'),
  };
  for (const [family, number] of Object.entries(families)) {
    assert.deepEqual(scanText(`pan: ${number}`, { relativePath: 'fixtures/order.json' }), ['payment-card-number'],
      `${family} (${number.length} digits) must be reported`);
  }
});

test('detects a card number written with the separators a human would type', () => {
  const number = synthCard('401288888888188');
  const spaced = `${number.slice(0, 4)} ${number.slice(4, 8)} ${number.slice(8, 12)} ${number.slice(12)}`;
  const hyphenated = spaced.replaceAll(' ', '-');
  assert.deepEqual(scanText(`card ${spaced}`, { relativePath: 'fixtures/order.json' }), ['payment-card-number']);
  assert.deepEqual(scanText(`card ${hyphenated}`, { relativePath: 'fixtures/order.json' }), ['payment-card-number']);
});

test('reports a card number in prose, on the same footing as a national identity number', () => {
  const number = synthCard('401288888888188');
  assert.deepEqual(scanText(`The customer paid with ${number} last Tuesday.`, { relativePath: 'docs/runbook.md' }),
    ['payment-card-number']);
  assert.deepEqual(scanText(`pan ${number}`, { relativePath: 'evidence/WP-0A-A0-005/note.md' }), ['payment-card-number']);
});

test('reports a published provider test card rather than exempting it', () => {
  // The number a payment provider publishes for sandbox use. It is reported deliberately:
  // at rest nothing distinguishes it from a live number, and Gate G0 authorizes no
  // integration that would need one in the tree.
  const testCard = synthCard('424242424242424');
  assert.deepEqual(scanText(`card: ${testCard}`, { relativePath: 'fixtures/checkout.json' }), ['payment-card-number']);
});

test('does not report digit runs that only look like cards', () => {
  const quiet = [
    // Luhn-invalid: a correlation id, a counter, a truncated hash of digits. Built by
    // breaking a synthetic number's check digit. It used to be a published test PAN with one
    // digit changed -- one well-meaning "typo fix" from putting a real card in this file, in
    // a block whose whole point is that none is ever written down. Independent security
    // review caught it.
    (() => { const valid = synthCard('401288888888188'); return valid.slice(0, -1) + String((Number(valid.at(-1)) + 1) % 10); })(),
    // Luhn-VALID but no issuer prefix: roughly one arbitrary run in ten passes Luhn, and a
    // rule that fires on those reports noise until someone switches it off.
    synthCard('999999999999999'),
    synthCard('700000000000000'),
    // A repeated-digit filler. No such run is both Luhn-valid and issuer-prefixed at any
    // card length -- checked exhaustively over all ten digits and all four lengths -- so
    // this rule needs no separate filler guard, and one was removed after it turned out
    // deleting it failed no test.
    '4444444444444444',
    // Too short and too long for any issuer this rule claims.
    synthCard('40128888'),
    synthCard('40128888888818812345'),
  ];
  for (const value of quiet) {
    assert.deepEqual(scanText(`value: ${value}`, { relativePath: 'fixtures/order.json' }), [],
      `${value} must not be reported`);
  }
});

test('does not slice a card-shaped window out of a longer digit run', () => {
  const number = synthCard('401288888888188');
  assert.deepEqual(scanText(`id: 77${number}77`, { relativePath: 'fixtures/order.json' }), [],
    'a 20-digit run must not yield a card from its middle');
});

// Every case below is one independent security review demonstrated against the first version
// of this rule. Two were High: a card followed by an expiry and a CVV -- the shape cardholder
// data actually arrives in -- was swallowed by the greedy digit window and never reported,
// and whole issuer families were uncovered, including UnionPay, which for a Thai commerce
// product is the wrong network to omit, and every 14-digit length, which made Diners Club
// structurally unreachable.
test('reports a card that is followed by an expiry and a security code', () => {
  const pan = synthCard('401288888888188');
  const grouped = pan.replace(/(.{4})(?=.)/g, '$1 ');
  for (const trailing of [' 12 30 411', ' 411', ' 03 29']) {
    assert.deepEqual(scanText(`card ${grouped}${trailing}`, { relativePath: 'evidence/WP-X/ticket.md' }),
      ['payment-card-number'], `a card followed by ${trailing.trim()} must still be reported`);
  }
  const hyphenated = pan.replace(/(.{4})(?=.)/g, '$1-');
  assert.deepEqual(scanText(`card ${hyphenated}-12-30-411`, { relativePath: 'evidence/WP-X/ticket.md' }),
    ['payment-card-number']);
});

test('reports a card broken by a line wrap or grouped with the spaces a paste carries', () => {
  const pan = synthCard('401288888888188');
  const cases = {
    'wrapped by an 80-column log line': `pan=${pan.slice(0, 8)}\n     ${pan.slice(8)}`,
    'non-breaking spaces from a rendered statement': pan.replace(/(.{4})(?=.)/g, '$1\u00a0'),
    'thin spaces': pan.replace(/(.{4})(?=.)/g, '$1\u2009'),
  };
  for (const [why, text] of Object.entries(cases)) {
    assert.deepEqual(scanText(text, { relativePath: 'evidence/WP-X/note.md' }), ['payment-card-number'], why);
  }
});

test('reports the issuer families the first version of this rule could not see', () => {
  const families = {
    'UnionPay 16': synthCard('623074185296307'),
    'UnionPay 19': synthCard('623074185296307418'),
    'Diners Club 36, 14 digits': synthCard('3630741852963'),
    'Diners Club 30, 14 digits': synthCard('3053074185296'),
    'Maestro 6759': synthCard('675930741852963'),
    'Maestro 5018': synthCard('501830741852963'),
    'RuPay 60': synthCard('603074185296307'),
  };
  for (const [family, number] of Object.entries(families)) {
    assert.deepEqual(scanText(`pan: ${number}`, { relativePath: 'fixtures/order.json' }),
      ['payment-card-number'], `${family} (${number.length} digits) must be reported`);
  }
});

// Widening the separator set to catch a wrapped or NBSP-grouped card also widens what can be
// mistaken for one. Independent security review measured the unrestricted rule reporting 2.6%
// of rows of small integers -- and this repository's evidence directories are full of numeric
// tables, on a rule that is deliberately not prose-exempt. So a run is only a card when it is
// WRITTEN like one.
// Independent testing found this list too narrow in the way that mattered most: 4-6-4 is
// exactly how a Diners Club card is printed, and the 14-digit length had just been added so
// that Diners would be reachable at all. The Amex 4-6-5 case was special-cased and its
// neighbour was not.
test('reports a card in every layout the card is actually printed in', () => {
  const split = (number, sizes, separator) => {
    const out = []; let index = 0;
    for (const size of sizes) { out.push(number.slice(index, index + size)); index += size; }
    return out.join(separator);
  };
  const cases = {
    'Diners Club 4-6-4': [synthCard('3630741852963'), [4, 6, 4], ' '],
    'Diners Club 30xx 4-6-4': [synthCard('3056074185296'), [4, 6, 4], ' '],
    'Diners Club 4-6-4 hyphenated': [synthCard('3630741852963'), [4, 6, 4], '-'],
    'Visa 13-digit 4-4-5': [synthCard('401288888188'), [4, 4, 5], ' '],
    'American Express 4-6-5': [synthCard('37828224631000'), [4, 6, 5], ' '],
    'column-aligned in a fixed-width table': [synthCard('401288888888188'), [4, 4, 4, 4], '  '],
    'en dashes, as a word processor autocorrects a hyphen': [synthCard('401288888888188'), [4, 4, 4, 4], '\u2013'],
  };
  for (const [layout, [number, sizes, separator]] of Object.entries(cases)) {
    assert.deepEqual(scanText(`card ${split(number, sizes, separator)}`, { relativePath: 'evidence/WP-X/ticket.md' }),
      ['payment-card-number'], `${layout} must be reported`);
  }
});

// A space or a hyphen is how someone GROUPS a number, so the grouping has to look like a
// card. A line break is where the medium ran out of width: it can fall anywhere, any number
// of times, and says nothing about layout. Treating the two alike missed a card wrapped twice
// down a narrow column and a card wrapped into a quoted email reply.
// A line break is ambiguous: it may have split a group, or replaced the space between two.
// Independent review found a card written 4-4-4-4 and wrapped before its FINAL group going
// unreported, because merging across the wrap made the tail 8 digits and 8 is not a card-like
// tail. Both readings are tried now, so the wrap may fall at any group boundary.
test('reports a card however many times the medium wrapped it, and wherever the wrap falls', () => {
  const pan = synthCard('401288888888188');
  const g = pan.match(/.{4}/g);
  const cases = {
    'wrapped into a quoted email reply': `pan ${pan.slice(0, 8)}\n> ${pan.slice(8)}`,
    'wrapped inside a quoted markdown block': `pan ${pan.slice(0, 8)}\n| ${pan.slice(8)}`,
    'grouped in fours, wrapped before the final group': `${g[0]} ${g[1]} ${g[2]}\n${g[3]}`,
    'grouped in fours, wrapped in the middle': `${g[0]} ${g[1]}\n${g[2]} ${g[3]}`,
    'grouped in fours, wrapped after the first group': `${g[0]}\n${g[1]} ${g[2]} ${g[3]}`,
  };
  for (const [why, text] of Object.entries(cases)) {
    assert.deepEqual(scanText(text, { relativePath: 'evidence/WP-X/note.md' }), ['payment-card-number'], why);
  }
});

// A card written one group per line down three or more lines is deliberately NOT detected.
// Independent security review measured the widened continuation set turning an ordinary
// markdown bullet list of build numbers into a finding -- 15% of bullet lists, 34% of JSDoc
// number blocks -- and this rule has no prose exemption, so each one fails the whole build on
// exactly the evidence and runbook files this repository is made of. Three or more lines each
// carrying one group is a list. The trade is stated because it is a real loss, not because it
// is free: a rule that fails on documentation is a rule someone deletes.
test('does not treat a list of numbers, one per line, as a wrapped card', () => {
  const pan = synthCard('401288888888188');
  const g = pan.match(/.{4}/g);
  const lists = {
    'markdown bullet list': `- ${g[0]}\n- ${g[1]}\n- ${g[2]}\n- ${g[3]}`,
    'JSDoc number block': ` * ${g[0]}\n * ${g[1]}\n * ${g[2]}\n * ${g[3]}`,
    'YAML comment list': `# ${g[0]}\n# ${g[1]}\n# ${g[2]}\n# ${g[3]}`,
  };
  for (const [shape, text] of Object.entries(lists)) {
    assert.deepEqual(scanText(text, { relativePath: 'docs/build-numbers.md' }), [], shape);
  }
});

test('does not report a row of numbers that merely concatenates into a card', () => {
  const rows = [
    'p95 latency by run: 340 338 247 491 221',
    '| run | 340 338 247 491 221 |',
    'durations_ms: 44 47 85 77 94 92 56 65',
    'counts 241 240 816 141 235',
  ];
  for (const row of rows) {
    assert.deepEqual(scanText(row, { relativePath: 'evidence/WP-X/benchmark.md' }), [],
      `${row} is a table of measurements, not a card`);
  }
});

// Independent security review found the continuation set covered quoted email and markdown
// tables but not the comment leaders this repository is actually written in -- YAML, shell, JS
// and JSDoc. This scanner's own source is a ` * ` block. A card wrapped inside one went
// unreported while the same file with `# ` rewritten to `> ` was reported; only the leader
// differed.
test('reports a card wrapped inside the comment styles this repository is written in', () => {
  const pan = synthCard('401288888888188');
  const g = pan.match(/.{4}/g);
  const cases = {
    'YAML or shell comment': `# card ${g[0]} ${g[1]} ${g[2]}\n#   ${g[3]}`,
    'JS line comment': `// card ${g[0]} ${g[1]} ${g[2]}\n//  ${g[3]}`,
    'JSDoc block': ` * card ${g[0]} ${g[1]} ${g[2]}\n *  ${g[3]}`,
  };
  for (const [style, text] of Object.entries(cases)) {
    assert.deepEqual(scanText(text, { relativePath: 'evidence/WP-X/note.md' }), ['payment-card-number'], style);
  }
});

// Each of these was demonstrated missing while a neighbouring code point in the same family
// was already covered -- U+2011 was listed and U+2010, the actual typographic hyphen, was not.
test('reports a card grouped with the separators real documents and IMEs produce', () => {
  const pan = synthCard('401288888888188');
  const g = pan.match(/.{4}/g);
  const separators = {
    'U+2010 hyphen': '\u2010',
    'U+2012 figure dash, defined for use between digits': '\u2012',
    'U+2003 em space': '\u2003',
    'U+2002 en space': '\u2002',
    'U+200A hair space': '\u200a',
    'U+00AD soft hyphen, from justified text': '\u00ad',
    'U+200B zero-width space, from rendered HTML': '\u200b',
    'U+2212 minus': '\u2212',
    'U+FF0D fullwidth hyphen, from a CJK IME': '\uff0d',
    'U+3000 ideographic space': '\u3000',
  };
  for (const [name, separator] of Object.entries(separators)) {
    assert.deepEqual(scanText(`card ${g.join(separator)}`, { relativePath: 'fixtures/order.json' }),
      ['payment-card-number'], `grouped with ${name}`);
  }
});

// A digit is not always U+0030..U+0039. Independent security review found the rule blind to
// fullwidth and Thai digits -- on a Thai-market product, in a rule whose own comment claims to
// cover what a Thai IME produces. The separators had been widened for that scenario and the
// digits never were, so a bare sixteen-digit fullwidth card number -- the plainest
// representation there is -- was invisible.
test('reports a card written in digits that are not ASCII', () => {
  const pan = synthCard('401288888888188');
  const transcribe = (base) => [...pan].map((d) => String.fromCodePoint(base + Number(d))).join('');
  const scripts = {
    'fullwidth digits, bare': transcribe(0xff10),
    'fullwidth digits, grouped in fours': transcribe(0xff10).match(/.{4}/g).join(' '),
    'Thai digits, bare': transcribe(0x0e50),
    'Thai digits grouped with an ideographic space': transcribe(0x0e50).match(/.{4}/g).join('\u3000'),
    'Arabic-Indic digits': transcribe(0x0660),
    'Eastern Arabic-Indic digits': transcribe(0x06f0),
    'ASCII and Thai mixed in one number': pan.slice(0, 8) + transcribe(0x0e50).slice(8),
  };
  for (const [script, value] of Object.entries(scripts)) {
    assert.deepEqual(scanText(`card ${value}`, { relativePath: 'evidence/WP-X/note.md' }),
      ['payment-card-number'], script);
  }
});
