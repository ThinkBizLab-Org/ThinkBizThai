import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { lstatSync, readdirSync, rmSync } from 'node:fs';
import { chmod, mkdir, mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import test from 'node:test';
import {
  ALL_RULES,
  CREDENTIAL_RULES,
  EXIT_PATTERN_FINDING,
  EXIT_UNSCANNABLE,
  exitCodeFor,
  IGNORED_DIRECTORIES,
  isEnvironmentReference,
  isPlaceholderValue,
  isThaiNationalId,
  MAX_FILE_BYTES,
  PII_PROSE_PREFIXES,
  PII_RULES,
  scanDirectory,
  scanText,
  scanTree,
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
  // Q0 L3 (2026-10-05): the secret words the assignment rule did not know. Each as the shape a
  // real .env line takes; the short words only as the last word of the name.
  ['passphrase assignment', 'secret-named-assignment', A('KEY_', 'PASSPHRASE', '=', 'Hn7Qz2Lm9Rt4Vb8Kd')],
  ['signing key assignment', 'secret-named-assignment', A('JWT_', 'SIGNING_KEY', '=', 'k9Qm4Rt7Zx2Lp8Vb3Nd6Wc1Y')],
  ['short pass assignment', 'secret-named-assignment', A('SMTP_', 'PASS', '=', 'Hn7Qz2Lm9Rt4Vb8Kd')],
  ['basic auth assignment', 'secret-named-assignment', A('HTTP_', 'AUTH', '=', 'bot:Hn7Qz2Lm9Rt4Vb8Kd')],
  ['hash salt assignment', 'secret-named-assignment', A('HASH_', 'SALT', '=', 'k9Qm4Rt7Zx2Lp8Vb3Nd6Wc1Y')],
  ['short pwd assignment', 'secret-named-assignment', A('DB_', 'PWD', '=', 'Hn7Qz2Lm9Rt4Vb8Kd')],
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
  // Q0 L3's short words, where they are not a secret: PASS inside BYPASS, AUTH at the head of a
  // name or inside AUTHOR, a bare PWD (the shell's working directory). The BYPASS_MODE row pins
  // the last-word anchor, not the lookbehind; the lookbehind's own row is the last in this table.
  ['PASS as the tail of another word', A('BYPASS', '_MODE', '=', 'enabled_always')],
  ['AUTH at the head of a constant naming a path', A('AUTH', '_CONTEXT_HELPERS', ' = ', "'db/foundation/test-helpers/auth-context.sql'")],
  ['AUTH inside AUTHOR', A('GIT_', 'AUTHOR', '_NAME', '=', 'Somebody_Synthetic')],
  ['a bare PWD, which is a directory', A('PWD', '=', '/home/runner/work/app')],
  ['a spaced thirteen digit run with a wrong check digit', '1 1037 01503 45 0'],
  // Q0 F3(b) / R0-F2 (2026-10-07): the BYPASS_MODE row above does NOT pin the `(?<![A-Z])`
  // lookbehind -- `_MODE` follows PASS, so the last-word anchor rejects it with or without the
  // lookbehind, and the only line that held it was an incidental one in another package's test.
  // This row ends the name IN `BYPASS`, directly before `=`, with a long non-placeholder value:
  // only the lookbehind keeps it quiet.
  ['PASS as the tail of a name that ends in BYPASS', A('PROXY_', 'BY', 'PASS', '=', 'enabled_always_on')],
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

test('detects a checksum-valid synthetic Thai national ID in plain, hyphenated and printed form', () => {
  const plain = synthThaiId('110370150345');
  const hyphenated = `${plain.slice(0, 1)}-${plain.slice(1, 5)}-${plain.slice(5, 10)}-${plain.slice(10, 12)}-${plain.slice(12)}`;
  assert.deepEqual(scanText(`id: ${plain}`, { relativePath: 'fixtures/customer.json' }), ['thai-national-id']);
  assert.deepEqual(scanText(`id: ${hyphenated}`, { relativePath: 'fixtures/customer.json' }), ['thai-national-id']);
  // Q0 L3: the 1-4-5-2-1 grouping with spaces, as the identity card prints it.
  assert.deepEqual(scanText(`id: ${hyphenated.replaceAll('-', ' ')}`, { relativePath: 'fixtures/customer.json' }), ['thai-national-id']);
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
  assert.equal(FALSE_POSITIVES.length, 25);
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
  // The same anchoring for an environment read: only a value that STARTS as one is excused.
  assert.ok(isEnvironmentReference(A('process.env.', 'NPM_TOKEN')));
  assert.ok(isEnvironmentReference(A('import.meta.env.', 'VITE_TOKEN')));
  assert.ok(!isEnvironmentReference(A('npm_', 'k9Qm4Rt7Zx2Lp8Vb3Nd6Wc1Yj5Hs0TaGe2Uu', 'process.env.')));
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
  // A1 N1 (2026-10-05): the prose shape that FIRED before netrc-password was anchored to a
  // `machine` block -- a line opening with the word and ending in one long token. Without this
  // row, reverting the anchor left the suite green.
  ['a prose line opening with the word password and ending in one long token', A('password', ' ', 'rotation-is-documented-in-the-runbook')],
  // A1 C3 (2026-10-05), FP-3: the npmrc rule had no placeholder or reference filter.
  ['a publish script reading the token from the environment', A('const npm', '_authToken', ' = ', 'process.env.', 'NPM_TOKEN', ';')],
  ['an npmrc line carrying a documented placeholder', A('//registry.npmjs.org/:', '_authToken', '=', 'your_npm_token_here')],
];

test('the rules added after the uncorrelated probe do not fire on legitimate content', () => {
  for (const [label, content] of NEW_RULE_FALSE_POSITIVES) {
    const hits = scanText(content, { relativePath: 'sample.txt' });
    assert.deepEqual(hits, [], `${label} must not be reported: ${JSON.stringify(hits)}`);
  }
});

test('every credential rule is exercised by at least one decoy', () => {
  const covered = new Set(CREDENTIAL_DECOYS.map(([, id]) => id));
  const uncovered = CREDENTIAL_RULES.map((rule) => rule.id).filter((id) => !covered.has(id));
  assert.deepEqual(uncovered, [], `credential rule(s) with no decoy — a rule nothing tests can be deleted silently:\n  ${uncovered.join('\n  ')}`);
});

// C0 N2 (2026-10-07): for every rule with an `accept` filter, a REJECTED match that comes first
// must not hide a real one after it. Turning the `continue` after a rejection into a `break` left
// the suite green: an `.env.example`-style placeholder on the first line would then mask every
// real value of that rule below it. Each row is [rule, rejected line, real line], built at run time.
const REJECTED_THEN_REAL = () => [
  ['openai-legacy-key', A('sk-', 'a'.repeat(36)), A('sk-', 'a7Kd92LmQ4xRnZ0pYv8CwE6tHgJb5Ss1UfQ3')],
  ['database-url-inline-password',
    A('postgres', '://', 'app_rw', ':', 'changeme', '@', 'db.synthetic-host.example', ':5432/appdb'),
    A('postgres', '://', 'app_rw', ':', 'Hn7Qz2Lm9Rt4Vb', '@', 'db.synthetic-host.example', ':5432/appdb')],
  ['npmrc-auth-token', A('//registry.npmjs.org/:', '_authToken', '=', 'your_npm_token_here'),
    A('//registry.npmjs.org/:', '_authToken', '=', 'k9Qm4Rt7Zx2Lp8Vb3Nd6Wc1Yj5Hs0TaGe2Uu')],
  ['secret-named-assignment', A('API_', 'KEY', '=', 'changeme'), A('API_', 'KEY', '=', 'k9Qm4Rt7Zx2Lp8Vb3Nd6Wc1Y')],
  ['payment-card-number', `pan ${synthCard('401288888888188').slice(0, 15)}${(Number(synthCard('401288888888188').slice(15)) + 1) % 10}`,
    `pan ${synthCard('401288888888188')}`],
  ['thai-national-id', `id ${synthThaiId('310120054321').slice(0, 12)}${(Number(synthThaiId('310120054321').slice(12)) + 1) % 10}`,
    `id ${synthThaiId('310120054321')}`],
  ['thai-phone-number', `tel ${A('08', '123456789')}`, `tel ${A('08', '12345678')}`],
];

test('a rejected match does not hide a real one after it, for every rule that filters its matches', () => {
  const filtered = ALL_RULES.filter((rule) => rule.accept).map((rule) => rule.id).sort();
  assert.deepEqual(REJECTED_THEN_REAL().map(([rule]) => rule).sort(), filtered,
    'every rule with an accept filter needs a rejected-then-real row');
  const wrong = [];
  for (const [rule, rejected, real] of REJECTED_THEN_REAL()) {
    if (scanText(`${rejected}\n`, { relativePath: 'config/app.env' }).includes(rule)) wrong.push(`${rule}: the rejected line alone fires`);
    if (!scanText(`${rejected}\n${real}\n`, { relativePath: 'config/app.env' }).includes(rule)) wrong.push(`${rule}: the real line is hidden`);
  }
  assertNone(wrong, 'rejected-then-real row(s) wrong');
});

// Q0 F3(a) (2026-10-07): the scanner says spaces are accepted in a Thai national ID "only in that
// grouping" (1-4-5-2-1). The only spaced row before had a wrong check digit, so free spacing was
// unpinned. A checksum-VALID ID in another grouping must not be reported as one.
test('a checksum-valid Thai ID is reported spaced only in the printed grouping', () => {
  const id = synthThaiId('310120054321');
  const printed = `${id[0]} ${id.slice(1, 5)} ${id.slice(5, 10)} ${id.slice(10, 12)} ${id[12]}`;
  assert.ok(scanText(`id ${printed}\n`).includes('thai-national-id'), 'the printed grouping must fire');
  for (const other of [`${id.slice(0, 4)} ${id.slice(4, 8)} ${id.slice(8)}`, `${id.slice(0, 3)} ${id.slice(3, 6)} ${id.slice(6, 9)} ${id.slice(9)}`]) {
    assert.ok(!scanText(`row ${other}\n`).includes('thai-national-id'), 'a free-spaced 13-digit run is not the printed grouping');
  }
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

// Q0 Q2 (2026-10-05): the required test asks for EACH issuer family in hyphen- and
// space-separated forms, and the suite pinned that for Visa and Diners only. A narrowing of the
// layouts or of one issuer's table entry would have passed unnoticed for the other six.
test('detects each issuer family written with spaces and with hyphens', () => {
  const families = {
    'Mastercard 51-55': synthCard('555555555555444'),
    'Mastercard 2-series': synthCard('222100000000000'),
    Discover: synthCard('601111111111111'),
    JCB: synthCard('353011133330000'),
    UnionPay: synthCard('623074185296307'),
    Maestro: synthCard('675930741852963'),
    RuPay: synthCard('603074185296307'),
  };
  for (const [family, number] of Object.entries(families)) {
    const groups = number.match(/.{4}/g);
    for (const separator of [' ', '-']) {
      assert.deepEqual(scanText(`card ${groups.join(separator)}`, { relativePath: 'fixtures/order.json' }),
        ['payment-card-number'], `${family} grouped with ${JSON.stringify(separator)} must be reported`);
    }
  }
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

// A1-005-1 (2026-10-05). The list guard above returned false for the WHOLE run, so a line that
// is itself a complete card was never read. A column of card numbers one per line -- a CSV
// export, a log dump, a pasted list -- is the plainest bulk-leak shape there is, and every shape
// below went unreported. Each line of a list is now still read on its own; no list of short
// numbers can satisfy that, which the three list tests above keep pinned.
test('reports a whole card standing on its own line inside a list of numbers', () => {
  const pan = synthCard('401288888888188');
  const mastercard = synthCard('555555555555444');
  const unionPay = synthCard('623074185296307');
  const shapes = {
    'bullet list': `- 1001\n- ${pan}\n- 1002`,
    'plain column of ids': `1001\n${pan}\n1002\n1003`,
    'the card last in a column': `1001\n1002\n${pan}`,
    'JSDoc block': ` * 1001\n * ${pan}\n * 1002`,
    'YAML list': `  - 1001\n  - ${pan}\n  - 1002`,
    'single-column CSV export': `id\n1001\n${pan}\n1002\n`,
    'a card followed by two short numbers': `${pan}\n12\n34`,
    'three cards, one per line': `${pan}\n${mastercard}\n${unionPay}`,
  };
  for (const [shape, text] of Object.entries(shapes)) {
    assert.deepEqual(scanText(text, { relativePath: 'evidence/WP-X/export.csv' }), ['payment-card-number'], shape);
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

// A run that crosses a line break carrying far more digits than a card is a TABLE, and a window
// spanning two of its rows joins two different numbers at a row boundary. Independent security
// review measured eight rows of four 4-digit amounts reporting at 64% and an aligned numeric id
// column at 45% -- on the benchmark and evidence files this repository is made of, on a rule
// with no prose exemption, so each one fails the whole build.
//
// The card in this test is built at run time, as everywhere else in this file: writing a
// Luhn-valid number into the source would put a card in the repository, and the scanner would
// report its own test. That is not hypothetical -- the first draft of this test did exactly
// that and `npm run scan:secrets` caught it.
test('does not join two rows of a table into a card', () => {
  const pan = synthCard('401288888888188');
  const g = pan.match(/.{4}/g);

  // A table whose rows carry no card, but whose ROWS CONCATENATE into one: the tail of row 1
  // plus the head of row 2 is the card. Reading rows independently is what stops this.
  const split = `9999 ${g[0]} ${g[1]}\n${g[2]} ${g[3]} 8888`;
  assert.deepEqual(scanText(split, { relativePath: 'evidence/WP-X/benchmark.md' }), [],
    'a window must not join the end of one row to the start of the next');

  // An aligned two-column table with nothing card-like in it.
  const clean = ['  1111  2222', '  3333  4444', '  5555  6666', '  7777  8888'].join('\n');
  assert.deepEqual(scanText(clean, { relativePath: 'evidence/WP-X/benchmark.md' }), [], 'aligned id column');

  // And the control: the same card on ONE line is still reported.
  assert.deepEqual(scanText(`card ${g.join(' ')}`, { relativePath: 'evidence/WP-X/ticket.md' }),
    ['payment-card-number'], 'a card on one line is still a card');
});

// Independent security review reported 18 of 46 realistic representations missed. Each
// candidate separator was measured in BOTH directions before being added -- what it detects,
// and what it costs on ordinary numeric documents -- because twice a widening here shipped
// without its price being read and both times it broke the build on documentation.
test('reports a card written with the separators that cost nothing to accept', () => {
  const pan = synthCard('401288888888188');
  const g = pan.match(/.{4}/g);
  const shapes = {
    'a card pasted bare into a markdown table cell': `| ${pan} |`,
    'a card pasted grouped into a markdown table cell': `| ${g.join(' ')} |`,
    'a quoted-printable soft break, as a pasted email carries': `${pan.slice(0, 10)}=\n${pan.slice(10)}`,
    'a zero-width joiner between groups': g.join('\u200d'),
  };
  for (const [shape, text] of Object.entries(shapes)) {
    assert.deepEqual(scanText(text, { relativePath: 'evidence/WP-X/note.md' }), ['payment-card-number'], shape);
  }
});

// The refusals, pinned so that adding one later is a deliberate act with a number to argue
// against. Each buys exactly one representation and pays about a quarter of a document shape
// this repository is full of; the measurements are in the scanner's own comment.
test('does not report the document shapes four refused separators would have caught', () => {
  const documents = {
    'a semantic version with a dotted build id': 'v1.02.003 build.4111.1111.1111.1111',
    'a CSV row of numeric metrics': '4111,1111,1111,1111',
    'a file path with numeric segments': '/var/log/4111/1111/1111/1111.log',
    'an identifier with underscores': 'run_4111_1111_1111_1111',
    'a markdown table row of four 4-digit values': '| 4111 | 1111 | 1111 | 1111 |',
  };
  for (const [shape, text] of Object.entries(documents)) {
    assert.deepEqual(scanText(text, { relativePath: 'docs/runbook.md' }), [], shape);
  }
});

// `|` was accepted as a separator and then withdrawn. It bought a card SPLIT ACROSS FOUR TABLE
// CELLS -- which nobody writes -- and cost 24.3% on a markdown table of four 4-digit columns
// over eight rows, the most common table in this repository's evidence files. I had measured
// its price against a three-column table with mixed widths, a shape that cannot produce sixteen
// digits and therefore could never have failed.
//
// A card pasted INTO a cell, bare or grouped, is what a real leak looks like, and both are
// detected without `|`. This pins the refusal so re-adding it is a deliberate act.
test('does not treat a markdown table of numbers as a card, however many rows', () => {
  const rows = Array.from({ length: 8 }, (_, i) => `| ${4000 + i} | ${1100 + i} | ${1200 + i} | ${1300 + i} |`);
  assert.deepEqual(scanText(rows.join('\n'), { relativePath: 'evidence/WP-X/benchmark.md' }), []);
});


test('every credential rule fires in every path shape, whatever the scanner has been told to skip', async () => {
  // Independent review twenty-two inserted ONE line into `scanText` --
  // `if (relativePath.startsWith('evidence/WP-0A-CON-008/')) return [...hits];` -- and shipped an
  // AWS key pair with **no test file touched**: the full secret-scan suite and the full behaviour
  // ratchet both passed, 59/59.
  //
  // `mustNoticeSourceEdit` pins two named reversals of this scanner. It proves those two lines
  // matter; it says nothing about a third carve-out somewhere else in the same function. **Pinning
  // which lines are load-bearing is not the same as pinning the outcome.**
  //
  // So: four planted credentials, in each of five named path shapes, and a hit required for
  // every combination. CORRECTED 2026-10-06 (C0 R1, Q0 L2): this comment used to end "A carve-out
  // cannot satisfy this; only scanning can." That was false. Five named shapes catch a carve-out
  // aimed at one of THOSE five and nothing else: one inserted line skipping `architecture/` left
  // this test, and the whole suite, green. This test is kept as a cheap first tripwire; the
  // property is asserted by the tests below that derive their paths and directories from the
  // real tree, plant at every offset and size, and compare what the scanner read with an
  // independent walk.
  const { mkdtemp, mkdir, writeFile } = await import('node:fs/promises');
  const { tmpdir } = await import('node:os');
  const { join, dirname } = await import('node:path');
  const { scanDirectory, CREDENTIAL_RULES } = await import('../scripts/scan-repository-secrets.mjs');

  const shapes = [
    'leak.txt',
    'evidence/WP-0A-CON-008/leak.txt',
    'handoffs/leak.txt',
    'docs/nested/deeper/leak.txt',
    'contract-catalog/shared-kernel/ctr-sec-001/leak.txt',
  ];
  const specimens = [
    ['aws-access-key-id', `AKIA${'IOSFODNN7EXAMPLE'}`],
    ['stripe-secret-key', `sk_live_${'0123456789abcdefghijklmn'}`],
    ['github-token', `ghp_${'0123456789abcdefghijklmnopqrstuvwxyz'.slice(0, 36)}`],
    ['secret-named-assignment', `AWS_SECRET_ACCESS_KEY=${'wJalrXUtnFEMI'}${'/K7MDENG/bPxRfiCYEXAMPLEKEY'}`],
  ];

  const missed = [];
  for (const shape of shapes) {
    for (const [label, body] of specimens) {
      const root = await mkdtemp(join(tmpdir(), 'scan-outcome-'));
      const target = join(root, shape);
      await mkdir(dirname(target), { recursive: true });
      await writeFile(target, `${body}\n`);
      const findings = await scanDirectory(root);
      if (findings.length === 0) missed.push(`${label} planted at ${shape} was not reported`);
    }
  }
  assert.deepEqual(missed, [], `credential(s) the scanner did not report:\n  ${missed.join('\n  ')}\n`
    + 'A path the scanner has been told to skip is a path an author can choose.');
  assert.ok(CREDENTIAL_RULES.length >= 25, `expected the full credential rule set, found ${CREDENTIAL_RULES.length}`);
});

// ---------------------------------------------------------------------------------------------
// C0 R1 (High) and Q0 L2 (2026-10-05): the suite could not notice the scanner reading LESS of the
// tree. One line skipping `architecture/`, a silent 4 KB size cap, skipping every `.md` and
// `.json` file, slicing each file to its first 512 bytes, or honouring a magic "exempt" string
// each left all 46 tests green, and each blinds the scanner to most of this repository. The
// tests below assert the property instead of naming shapes: every path, directory, offset and
// size the real tree has, and a count of what was read compared with an independent walk.
// ---------------------------------------------------------------------------------------------

// Written here, not imported, so that widening the scanner's own list cannot widen this one.
const INDEPENDENT_IGNORED_DIRECTORIES = ['.git', 'node_modules'];
const INDEPENDENT_PROSE_PREFIXES = ['evidence/', 'handoffs/'];

/** Every regular file under `root`, found WITHOUT the scanner: the yardstick the scanner's own
 *  account of what it read is compared with. */
function independentWalk(root) {
  const files = [];
  const visit = (relativeDirectory) => {
    for (const name of readdirSync(join(root, relativeDirectory))) {
      const relativePath = relativeDirectory ? `${relativeDirectory}/${name}` : name;
      const info = lstatSync(join(root, relativePath));
      if (info.isDirectory()) {
        if (!INDEPENDENT_IGNORED_DIRECTORIES.includes(name)) visit(relativePath);
      } else if (info.isFile()) {
        files.push({ relativePath, size: info.size });
      }
    }
  };
  visit('');
  return files.sort((a, b) => (a.relativePath < b.relativePath ? -1 : a.relativePath > b.relativePath ? 1 : 0));
}

/** Compare two sorted path lists and fail with a SHORT message. A thousand-entry deepEqual diff
 *  is megabytes of output, and the ratchet that runs this suite in a child process with a bounded
 *  buffer reads that as a child that never ran, not as a suite that failed. */
function assertSamePaths(actual, expected, what) {
  const missing = expected.filter((path) => !actual.includes(path));
  const extra = actual.filter((path) => !expected.includes(path));
  assert.ok(missing.length === 0 && extra.length === 0 && actual.length === expected.length,
    `${what}: ${missing.length} missing, ${extra.length} unexpected, ${actual.length} vs ${expected.length}\n`
    + `  missing: ${missing.slice(0, 10).join(', ')}\n  unexpected: ${extra.slice(0, 10).join(', ')}`);
}

/** Fail with a count and the first few entries, never the whole list (see assertSamePaths). */
function assertNone(list, what) {
  assert.ok(list.length === 0, `${list.length} ${what}:\n  ${list.slice(0, 20).join('\n  ')}`);
}

const PII_DECOYS = () => [
  ['thai-national-id', `id ${synthThaiId('310120054321')}`],
  ['thai-phone-number', `tel ${A('08', '12345678')}`],
  ['payment-card-number', `pan ${synthCard('401288888888188')}`],
];

test('the scanner reads every file an independent walk of this repository finds', async () => {
  assert.deepEqual([...IGNORED_DIRECTORIES].sort(), [...INDEPENDENT_IGNORED_DIRECTORIES].sort(),
    'the scanner skips a directory this test does not: every file under it is unscanned');
  // Other suites run in parallel; if the tree moved while it was being read, read it again.
  let attempt = 0;
  for (;;) {
    const before = independentWalk('.');
    const { findings, files, bytes } = await scanTree('.');
    const after = independentWalk('.');
    if (JSON.stringify(before) !== JSON.stringify(after) && attempt < 3) { attempt += 1; continue; }
    assertNone(findings.map((finding) => `${finding.relativePath}:${finding.rule}`), 'finding(s) on this repository');
    const expected = before.map((file) => file.relativePath).sort();
    assertSamePaths(files, expected, 'the files the scanner read are not the files an independent walk finds');
    assert.equal(bytes, before.reduce((sum, file) => sum + file.size, 0), 'the scanner read fewer bytes than the tree holds');
    assert.ok(expected.length > 500, `only ${expected.length} files: the walk is not looking at this repository`);
    return;
  }
});

test('every rule fires at every path this repository has, wherever a carve-out could aim', () => {
  assert.deepEqual([...PII_PROSE_PREFIXES].sort(), [...INDEPENDENT_PROSE_PREFIXES].sort(),
    'the email exemption covers a path this test does not');
  const paths = independentWalk('.').map((file) => file.relativePath);
  // A carve-out may aim at a directory that has no file yet, or at a new file in an existing one.
  const directories = [...new Set(paths.map((path) => dirname(path)).filter((path) => path !== '.'))];
  const targets = [...paths, ...directories.map((directory) => `${directory}/new-file.txt`), 'new-top-level/new-file.txt'];
  const missed = [];
  const email = A('somchai.customer', '@', 'synthetic-example', '.co.th');
  for (const relativePath of targets) {
    for (const [, rule, value] of CREDENTIAL_DECOYS) {
      if (!scanText(`${value}\n`, { relativePath }).includes(rule)) missed.push(`${rule} at ${relativePath}`);
    }
    for (const [rule, value] of PII_DECOYS()) {
      if (!scanText(`${value}\n`, { relativePath }).includes(rule)) missed.push(`${rule} at ${relativePath}`);
    }
    const exempt = INDEPENDENT_PROSE_PREFIXES.some((prefix) => relativePath.startsWith(prefix));
    if (scanText(`contact ${email}\n`, { relativePath }).includes('email-address') === exempt) {
      missed.push(`email-address at ${relativePath} (exempt: ${exempt})`);
    }
  }
  assertNone(missed, 'rule/path pair(s) not reported');
  assert.ok(targets.length > 500);
});

// Directory names this repository does not have yet but a project like it grows. A walk that
// skips a name it has never seen -- `src*`, a build or vendor tree, a dot-directory -- is as
// blind as one that skips a name it has.
const FUTURE_PATHS = ['src/index.mjs', 'src-internal/config.txt', 'packages/app/src/env.ts', 'apps/web/.env.local',
  'services/api/settings.yml', 'infra/terraform/main.tf', 'config/production.json', '.hidden/notes.txt',
  'build/output.js', 'dist/bundle.js', 'vendor/lib/readme.md', 'tmp/scratch.txt', 'deeply/nested/a/b/c/d/e/leak',
  // C0 N1 / Q0 F2 (2026-10-07): the file types that most often carry a credential, none of which
  // this tree has yet. A carve-out keyed to one of them (`.pem`, `.py`, `.toml`, `.sh`, ...) left
  // the suite green, because every path the property tests derive comes from today's tree.
  'keys/server.pem', 'keys/server.key', 'certs/client.p12', 'certs/client.pfx', 'home/.ssh/id_ed25519',
  '.npmrc', '.netrc', '.pypirc', '.dockercfg', 'config/app.toml', 'config/app.ini', 'config/app.properties',
  'config/app.yaml', 'config/app.xml', 'etc/app.conf', 'etc/app.cfg', 'infra/prod.tfvars', 'terraform.tfstate',
  'app/settings.py', 'scripts/deploy.sh', 'scripts/deploy.bash', 'scripts/deploy.zsh', 'scripts/deploy.ps1',
  'Dockerfile', 'docker-compose.yml', 'apps/web/.env',
  // ... and a path deeper than any this tree has (five components today); a walk capped at depth
  // nine or ten is blind past it.
  'a/b/c/d/e/f/g/h/i/j/k/l/deep.txt'];
// Q0 F2: no file in this tree has CRLF line endings, so a skip keyed to `\r\n` survived.
const CRLF_PATH = 'windows/notes-crlf.txt';
const CRLF_CONTENT = 'synthetic notes written on windows\r\nsecond line of them\r\n';

/** Q0 F1 (2026-10-07): put `value` into the middle of the LONGEST line of `content`, at an ASCII
 *  space (never inside a multi-byte sequence) or else at the end of that line. Every credential
 *  the copy test planted before sat on a line of its own, so a scanner dropping long lines -- 577
 *  lines over 1000 characters in 126 files of this tree -- kept the suite green. */
function spliceIntoLongestLine(content, value) {
  let best = [0, content.indexOf(10) === -1 ? content.length : content.indexOf(10)];
  for (let start = 0; start <= content.length;) {
    let end = content.indexOf(10, start);
    if (end === -1) end = content.length;
    if (end - start > best[1] - best[0]) best = [start, end];
    start = end + 1;
  }
  const [start, end] = best;
  let at = content.indexOf(32, start + ((end - start) >> 1));
  if (at === -1 || at >= end) at = end;
  return Buffer.concat([content.subarray(0, at), Buffer.from(` ${value} `), content.subarray(at)]);
}

/** A1 N6 / C0 N3 (2026-10-07): the appended-copy test copies every byte under the working
 *  directory, untracked files included, into the OS temporary directory. `withTempDir` removes it
 *  in a `finally`; a run interrupted by SIGINT, SIGTERM or SIGHUP never reaches the `finally`, so
 *  the copy is also removed from a signal handler, which then re-raises the signal. A SIGKILL
 *  still leaves it (0700, this user only); that residue is recorded in the package's
 *  open_blockers, with the advice to run `npm run check` from a clone or worktree. */
async function withSignalSafeTempDir(body) {
  return withTempDir(async (directory) => {
    const signals = ['SIGINT', 'SIGTERM', 'SIGHUP'];
    const handler = (signal) => {
      try { rmSync(directory, { recursive: true, force: true }); } catch { /* best effort */ }
      for (const name of signals) process.removeListener(name, handler);
      process.kill(process.pid, signal);
    };
    for (const name of signals) process.once(name, handler);
    try {
      return await body(directory);
    } finally {
      for (const name of signals) process.removeListener(name, handler);
    }
  });
}

test('a credential spliced into a copy of every file in this repository is reported, at that path', async () => {
  const real = independentWalk('.');
  await withSignalSafeTempDir(async (directory) => {
    const expected = [];
    // Each copy carries one credential, spliced into its longest line (Q0 F1) -- except the netrc
    // block, which is anchored to the start of a line and so goes on lines of its own -- and every
    // privacy decoy on lines of its own at the end (A1 N5: the PII half of the property was unpinned).
    const plant = async (index, relativePath, content) => {
      const [, rule, value] = CREDENTIAL_DECOYS[index % CREDENTIAL_DECOYS.length];
      const target = join(directory, relativePath);
      await mkdir(dirname(target), { recursive: true });
      const withCredential = rule === 'netrc-password'
        ? Buffer.concat([content, Buffer.from(`\n${value}\n`)])
        : spliceIntoLongestLine(content, value);
      const privacy = PII_DECOYS().map(([, decoy]) => `${decoy}\n`).join('');
      await writeFile(target, Buffer.concat([withCredential, Buffer.from(`\n${privacy}`)]));
      expected.push([relativePath, rule], ...PII_DECOYS().map(([piiRule]) => [relativePath, piiRule]));
    };
    for (const [index, { relativePath }] of real.entries()) await plant(index, relativePath, await readFile(relativePath));
    for (const [index, relativePath] of FUTURE_PATHS.entries()) await plant(index, relativePath, Buffer.from('synthetic\n'));
    await plant(FUTURE_PATHS.length, CRLF_PATH, Buffer.from(CRLF_CONTENT));
    const { files, findings } = await scanTree(directory);
    assertSamePaths(files, [...real.map((file) => file.relativePath), ...FUTURE_PATHS, CRLF_PATH].sort(), 'the scanner did not read every copied file');
    const reported = new Set(findings.map((finding) => `${finding.relativePath}\u0000${finding.rule}`));
    const missed = expected.filter(([path, rule]) => !reported.has(`${path}\u0000${rule}`)).map(([path, rule]) => `${rule} in ${path}`);
    assertNone(missed, 'planted credential(s) not reported');
  });
});

const PADDING_LINE = 'synthetic padding prose for the offset test, carrying no credential at all\n';
const padding = (length) => PADDING_LINE.repeat(Math.ceil(length / PADDING_LINE.length) + 1).slice(0, length);

test('a credential is reported whatever its offset in the file and whatever the file size', async () => {
  // Every rule, credential AND privacy (A1 N5), past 9 KiB and past 80 KiB: a per-rule truncation
  // is as blinding as a global one. And every rule inside one 64 KiB line with no line break in it
  // (Q0 F1): a scanner dropping long lines reads the same bytes and sees none of them.
  const everyRule = [...CREDENTIAL_DECOYS.map(([, rule, value]) => [rule, value]), ...PII_DECOYS()];
  const missed = [];
  for (const kib of [9, 80]) {
    const deep = padding(kib * 1024);
    for (const [rule, value] of everyRule) {
      if (!scanText(`${deep}\n${value}\n`, { relativePath: 'notes.txt' }).includes(rule)) missed.push(`${rule} past ${kib} KiB`);
    }
  }
  const oneLine = padding(32 * 1024).replace(/\n/g, ' ');
  for (const [rule, value] of everyRule) {
    if (rule === 'netrc-password') continue; // anchored to the start of a line by design
    if (!scanText(`${oneLine} ${value} ${oneLine}\n`, { relativePath: 'notes.txt' }).includes(rule)) missed.push(`${rule} inside a 64 KiB line`);
  }
  assertNone(missed, 'rule(s) not reported at depth');

  await withTempDir(async (directory) => {
    const credential = A('AKIA', 'IOSFODNN7EXAMPLE');
    const planted = [];
    for (const kib of [0, 1, 4, 8, 64, 512]) {
      const pad = padding(kib * 1024);
      for (const [where, content] of [
        ['head', `${credential}\n${pad}`],
        ['middle', `${pad.slice(0, pad.length >> 1)}\n${credential}\n${pad.slice(pad.length >> 1)}`],
        ['tail', `${pad}\n${credential}\n`],
      ]) {
        const name = `${where}-${kib}k.txt`;
        await writeFile(join(directory, name), content);
        planted.push(name);
      }
    }
    const { files, findings } = await scanTree(directory);
    assert.deepEqual(files, [...planted].sort(), 'a file was skipped');
    const reported = findings.filter((finding) => finding.rule === 'aws-access-key-id').map((finding) => finding.relativePath).sort();
    assert.deepEqual(reported, [...planted].sort(), 'a credential at some offset or size was not reported');
  });
});

test('a file of exactly the size limit is read to its last byte, and one byte more is reported', async () => {
  await withTempDir(async (directory) => {
    const tail = `\n${A('AKIA', 'IOSFODNN7EXAMPLE')}\n`;
    await writeFile(join(directory, 'at-limit.txt'), padding(MAX_FILE_BYTES - tail.length) + tail);
    let result = await scanTree(directory);
    assert.deepEqual(result.findings.map((finding) => finding.rule), ['aws-access-key-id'],
      'a credential in the last bytes of a file at the size limit was not reported');
    assert.equal(result.bytes, MAX_FILE_BYTES);
    await writeFile(join(directory, 'at-limit.txt'), padding(MAX_FILE_BYTES + 1 - tail.length) + tail);
    result = await scanTree(directory);
    assert.deepEqual(result.findings.map((finding) => finding.rule), ['oversize-file'],
      'a file over the limit must be a finding, never a silent skip');
    assert.deepEqual(result.files, []);
  });
});

// C0 R2: the size is checked before the file is read. Observable: a file this process cannot
// read but can stat is reported as oversize (stat first) rather than unreadable (read first).
// Q0 F6 (2026-10-07): under root `chmod 000` does not stop the read, the post-read size check
// fires instead, and the test cannot tell the two orders apart -- so it says so and skips rather
// than passing on a distinction it did not make.
test('the size limit is enforced before the file is read', async (t) => {
  await withTempDir(async (directory) => {
    const file = join(directory, 'big-and-locked.txt');
    await writeFile(file, padding(4096));
    await chmod(file, 0o000);
    if (!(await trulyUnreadable(file))) {
      await chmod(file, 0o600);
      t.skip('this process can read a chmod 000 file (root?): stat-first and read-first are indistinguishable here');
      return;
    }
    const findings = await scanDirectory(directory, { maxFileBytes: 1024 });
    await chmod(file, 0o600);
    assert.deepEqual(findings.map((finding) => finding.rule), ['oversize-file']);
  });
});

// Q0 L1 (2026-10-05): required_tests declared a fail-closed test for a non-regular entry and
// none existed; deleting the `unscannable-entry` finding left the suite green.
test('fails closed on a non-regular entry: a FIFO and a socket are findings, not passes', async () => {
  await withTempDir(async (directory) => {
    const nested = join(directory, 'tree');
    await mkdir(nested);
    execFileSync('mkfifo', [join(nested, 'pipe')]);
    const server = createServer();
    await new Promise((resolve, reject) => { server.once('error', reject); server.listen(join(nested, 'sock'), resolve); });
    try {
      const findings = await scanDirectory(directory);
      assert.deepEqual(findings.map((finding) => `${finding.relativePath}:${finding.rule}`),
        ['tree/pipe:unscannable-entry', 'tree/sock:unscannable-entry']);
      assert.equal(exitCodeFor(findings), EXIT_UNSCANNABLE);
    } finally {
      await new Promise((resolve) => server.close(resolve));
    }
  });
});

// Q0 M27: a magic "exempt" string honoured by the scanner. Other scanners honour suppression
// comments; this one must not, because a suppression comment is a carve-out an author chooses.
test('no suppression comment excuses a credential', async () => {
  const markers = ['scan-exempt', 'nosec', 'gitleaks:allow', 'pragma: allowlist secret', 'noqa',
    'trufflehog:ignore', 'detect-secrets: ignore', 'secret-scan: ignore', 'eslint-disable', 'SCAN_SKIP'];
  await withTempDir(async (directory) => {
    for (const [index, marker] of markers.entries()) {
      await writeFile(join(directory, `marker-${index}.txt`), `# ${marker}\n${A('AKIA', 'IOSFODNN7EXAMPLE')} # ${marker}\n`);
    }
    const findings = await scanDirectory(directory);
    assert.deepEqual(findings.map((finding) => finding.rule), markers.map(() => 'aws-access-key-id'));
  });
});

// C0 R3 (2026-10-05): rule length floors were unpinned. Each floored rule is built at its floor,
// which must fire, and one character below it, which must not -- so a floor raised until the
// rule matches nothing, or lowered until it is noise, fails here. Every value is assembled at run
// time from a deterministic alphabet walk; none is written down.
const ALNUM = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
const UPPER_DIGITS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
const HEX = '0123456789abcdef';
const B64 = `${ALNUM}+/`;
const body = (length, alphabet = ALNUM) => Array.from({ length }, (_, i) => alphabet[(i * 7 + 3) % alphabet.length]).join('');
const FLOORS = [
  ['stripe-secret-key', 16, (n) => A('sk_', 'live_', body(n))],
  ['stripe-webhook-secret', 16, (n) => A('whsec_', body(n))],
  ['aws-access-key-id', 16, (n) => A('AKIA', body(n, UPPER_DIGITS))],
  ['aws-secret-access-key', 40, (n) => A('aws_secret', '_access_key', ' = ', body(n, B64))],
  ['github-token', 20, (n) => A('ghp', '_', body(n))],
  ['github-fine-grained-pat', 50, (n) => A('github', '_pat_', body(n))],
  ['openai-project-key', 20, (n) => A('sk-', 'proj-', body(n))],
  ['openai-legacy-key', 32, (n) => A('sk-', body(n))],
  ['anthropic-api-key', 24, (n) => A('sk-', 'ant-', body(n))],
  ['google-api-key', 35, (n) => A('AI', 'za', body(n))],
  ['slack-token', 12, (n) => A('xoxb-', '20481073152', '-', '30291847362', '-', body(n))],
  ['slack-app-token', 16, (n) => A('xapp', '-1-', 'A0123456789', '-', '2468013579246', '-', body(n))],
  ['npm-access-token', 36, (n) => A('npm', '_', body(n))],
  ['json-web-token', 16, (n) => A('eyJ', 'hbGciOiJIUzI1NiJ9', '.', body(20), '.', body(n))],
  ['authorization-header', 20, (n) => A('Authorization', ': ', 'Bearer ', body(n))],
  ['database-url-inline-password', 8, (n) => A('postgres', '://', 'app_rw', ':', body(n), '@', 'db.synthetic-host.example', '/appdb')],
  ['azure-storage-key', 40, (n) => A('Account', 'Key', '=', body(n, B64))],
  ['azure-sas-signature', 40, (n) => A('https://acct.blob.core.windows.net/c/b?sv=1&', 'sig', '=', body(n))],
  ['meta-access-token', 20, (n) => A('EA', 'A', body(n))],
  ['stripe-restricted-key', 20, (n) => A('rk_', 'live_', body(n))],
  ['twilio-auth-pair', 32, (n) => A('AC', body(32, HEX), ' ', body(n, HEX))],
  ['sendgrid-key', 20, (n) => A('SG', '.', body(22), '.', body(n))],
  ['npmrc-auth-token', 16, (n) => A('//registry.npmjs.org/:', '_authToken', '=', body(n))],
  ['netrc-password', 8, (n) => A('machine registry.example\n  login bot\n  ', 'password', ' ', body(n))],
  ['kubernetes-service-account-token', 10, (n) => A('eyJhbGciOiJSUzI1NiIsImtpZCI6', body(n), '.', body(20), '.', body(43))],
  ['vault-token', 24, (n) => A('hvs', '.', body(n))],
  ['secret-named-assignment', 8, (n) => A('DB_', 'PASSWORD', '=', body(n))],
];
// Rules with no length floor to pin: each is a fixed header or a structural shape.
const UNFLOORED = ['pem-private-key', 'putty-private-key', 'gcp-service-account-key'];

test('every credential rule length floor is pinned from both sides', () => {
  const declared = [...FLOORS.map(([id]) => id), ...UNFLOORED].sort();
  assert.deepEqual(declared, CREDENTIAL_RULES.map((rule) => rule.id).sort(),
    'a credential rule is neither floor-pinned here nor declared unfloored');
  const wrong = [];
  for (const [rule, floor, build] of FLOORS) {
    if (!scanText(`${build(floor)}\n`, { relativePath: 'config/.env' }).includes(rule)) wrong.push(`${rule} did not fire at its floor of ${floor}`);
    if (scanText(`${build(floor - 1)}\n`, { relativePath: 'config/.env' }).includes(rule)) wrong.push(`${rule} fired one below its floor of ${floor}`);
  }
  assert.deepEqual(wrong, []);
});
