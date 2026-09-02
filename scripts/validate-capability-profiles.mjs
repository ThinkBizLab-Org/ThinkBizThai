import { readFile, readdir } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const requiredProfileFields = [
  'schema_version',
  'agent_run_id',
  'vendor',
  'model',
  'protocol_version',
  'capabilities',
];
const requiredCapabilityFields = [
  'can_edit_files',
  'can_run_shell',
  'can_run_tests',
  'can_access_network',
  'can_access_external_secrets',
  'can_create_branch_or_worktree',
];
const readyOrLater = new Set(['ready', 'in_progress', 'in_review', 'review_approved', 'test_verified', 'integration_verified', 'done']);

export class CapabilityProfileValidationError extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
  }
}

export function validateCapabilityProfile(profile) {
  const missing = requiredProfileFields.filter((field) => !(field in profile));
  if (missing.length > 0 || profile.protocol_version !== '1.0.0') {
    throw new CapabilityProfileValidationError(66, `invalid capability profile fields or protocol version: ${missing.join(', ') || profile.protocol_version}`);
  }

  if (typeof profile.agent_run_id !== 'string' || profile.agent_run_id.length === 0 || typeof profile.vendor !== 'string' || profile.vendor.length === 0 || typeof profile.model !== 'string' || profile.model.length === 0) {
    throw new CapabilityProfileValidationError(66, 'capability profile requires non-empty agent_run_id, vendor, and model');
  }

  const missingCapabilities = requiredCapabilityFields.filter((field) => typeof profile.capabilities[field] !== 'boolean');
  if (missingCapabilities.length > 0) {
    throw new CapabilityProfileValidationError(66, `invalid capability booleans: ${missingCapabilities.join(', ')}`);
  }

  if (profile.capabilities.can_access_external_secrets !== false) {
    throw new CapabilityProfileValidationError(67, 'capability profiles must deny external-secret access');
  }
}

async function discoverJsonFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile() && entry.name.endsWith('.json'))
    .map((entry) => join(directory, entry.name))
    .sort();
}

export async function loadCapabilityProfiles(directory) {
  const files = await discoverJsonFiles(directory);
  if (files.length === 0) {
    throw new CapabilityProfileValidationError(69, `no capability profiles found in ${directory}`);
  }

  const profiles = [];
  for (const file of files) {
    let profile;
    try {
      profile = JSON.parse(await readFile(file, 'utf8'));
    } catch (error) {
      throw new CapabilityProfileValidationError(65, `${file}: invalid JSON: ${error.message}`);
    }
    try {
      validateCapabilityProfile(profile);
    } catch (error) {
      throw new CapabilityProfileValidationError(error.code ?? 66, `${file}: ${error.message}`);
    }
    profiles.push(profile);
  }

  const runIds = profiles.map((profile) => profile.agent_run_id);
  if (new Set(runIds).size !== runIds.length) {
    throw new CapabilityProfileValidationError(68, 'capability profiles must use unique agent_run_id values');
  }
  return profiles;
}

export function validateManifestCapabilityReferences(manifest, profiles) {
  if (!readyOrLater.has(manifest.status)) return;
  const declaredRuns = new Set(profiles.map((profile) => profile.agent_run_id));
  const missing = Object.entries(manifest.role_assignments ?? {})
    .filter(([key, runId]) => key.endsWith('_agent_run_id') && runId !== null)
    .map(([, runId]) => runId)
    .filter((runId) => !declaredRuns.has(runId));
  if (missing.length > 0) {
    throw new CapabilityProfileValidationError(68, `work package ${manifest.work_package_id ?? '<unknown>'} references role runs without capability declarations: ${missing.join(', ')}`);
  }
}

export async function validateCapabilityProfiles(profileDirectory, manifestDirectory) {
  const profiles = await loadCapabilityProfiles(profileDirectory);
  const manifestFiles = await discoverJsonFiles(manifestDirectory);
  for (const file of manifestFiles) {
    let manifest;
    try {
      manifest = JSON.parse(await readFile(file, 'utf8'));
    } catch (error) {
      throw new CapabilityProfileValidationError(65, `${file}: invalid JSON: ${error.message}`);
    }
    validateManifestCapabilityReferences(manifest, profiles);
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [profileDirectory = '.agents/capability-profiles', manifestDirectory = 'work-packages'] = process.argv.slice(2);
  try {
    await validateCapabilityProfiles(profileDirectory, manifestDirectory);
  } catch (error) {
    console.error(error.message);
    process.exit(error.code ?? 65);
  }
}
