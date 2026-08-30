import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const readyOrLater = new Set([
  'ready',
  'in_progress',
  'in_review',
  'review_approved',
  'test_verified',
  'integration_verified',
  'done',
]);
const knownStatuses = new Set([...readyOrLater, 'backlog', 'blocked']);
const roleKeys = [
  'author_agent_run_id',
  'reviewer_agent_run_id',
  'tester_agent_run_id',
  'integration_owner_agent_run_id',
];

export class ManifestValidationError extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
  }
}

export function validateManifest(manifest) {
  if (!knownStatuses.has(manifest.status)) {
    throw new ManifestValidationError(66, `unsupported work-package status: ${String(manifest.status)}`);
  }

  if (readyOrLater.has(manifest.status)) {
    const roleIds = roleKeys.map((key) => manifest.role_assignments?.[key]);
    const validIds = roleIds.every((value) => typeof value === 'string' && value.length > 0);
    if (!validIds || new Set(roleIds).size !== roleIds.length) {
      throw new ManifestValidationError(67, 'Ready-or-later work packages require four distinct non-empty role agent_run_ids.');
    }
  }
}

export async function validateManifestPath(manifestPath) {
  let manifest;
  try {
    manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
  } catch (error) {
    throw new ManifestValidationError(65, `invalid JSON manifest: ${error.message}`);
  }
  validateManifest(manifest);
}

const manifestPath = process.argv[2];
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (!manifestPath || process.argv.length !== 3) {
    console.error('usage: node scripts/validate-work-package-role-separation.mjs <manifest.json>');
    process.exit(64);
  }
  try {
    await validateManifestPath(manifestPath);
  } catch (error) {
    console.error(error.message);
    process.exit(error.code ?? 65);
  }
}
