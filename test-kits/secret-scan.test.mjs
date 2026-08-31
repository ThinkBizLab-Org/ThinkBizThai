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
  assert.equal(CREDENTIAL_DECOYS.length, 17);
});

test('the credential decoy table is detected on disk, not only in memory', async () => {
  await withTempDir(async (directory) => {
    for (const [index, [, , value]] of CREDENTIAL_DECOYS.entries()) {
      await writeFile(join(directory, `decoy-${index}.env`), `${value}\n`);
    }
    const findings = await scanDirectory(directory);
    assert.equal(findings.length, CREDENTIAL_DECOYS.length);
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
