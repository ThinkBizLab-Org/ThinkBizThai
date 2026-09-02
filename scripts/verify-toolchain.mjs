import { execFileSync } from 'node:child_process';
import { assertToolchain } from './toolchain-contract.mjs';

const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const npmVersion = execFileSync(npmCommand, ['--version'], { encoding: 'utf8' }).trim();

try {
  assertToolchain({ nodeVersion: process.version, npmVersion });
} catch (error) {
  console.error(error.message);
  process.exit(68);
}
