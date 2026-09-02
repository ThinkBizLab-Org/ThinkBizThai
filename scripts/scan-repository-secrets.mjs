import { readdir, readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ignoredDirectories = new Set(['.git', 'node_modules']);
const patterns = [
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
  /\bsk_(?:live|test)_[A-Za-z0-9]{16,}\b/,
  /\bwhsec_[A-Za-z0-9]{16,}\b/,
  /\bAKIA[0-9A-Z]{16}\b/,
  /\bgh[pousr]_[A-Za-z0-9]{20,}\b/,
];

export async function scanDirectory(directory) {
  const findings = [];
  const entries = await readdir(directory, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.isDirectory() && !ignoredDirectories.has(entry.name)) {
      findings.push(...await scanDirectory(join(directory, entry.name)));
    } else if (entry.isFile()) {
      const file = join(directory, entry.name);
      const content = await readFile(file, 'utf8').catch(() => null);
      if (content && patterns.some((pattern) => pattern.test(content))) findings.push(file);
    }
  }
  return findings;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const directory = process.argv[2] ?? '.';
  const findings = await scanDirectory(directory);
  if (findings.length > 0) {
    console.error(`potential secret pattern found in: ${findings.join(', ')}`);
    process.exit(70);
  }
}
