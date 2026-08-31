import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import {
  CapabilityProfileValidationError,
  validateCapabilityProfile,
  validateCapabilityProfiles,
} from '../scripts/validate-capability-profiles.mjs';

function profile(overrides = {}) {
  return {
    schema_version: '1.0.0',
    protocol_version: '1.0.0',
    agent_run_id: '/root/example',
    vendor: 'OpenAI',
    model: 'test-model',
    capabilities: {
      can_edit_files: true,
      can_run_shell: true,
      can_run_tests: true,
      can_access_network: false,
      can_access_external_secrets: false,
      can_create_branch_or_worktree: false,
    },
    accepted_work_package: null,
    ...overrides,
  };
}

test('accepts a conservative capability declaration', () => {
  assert.doesNotThrow(() => validateCapabilityProfile(profile()));
});

test('rejects a declaration that allows external secrets', () => {
  assert.throws(
    () => validateCapabilityProfile(profile({ capabilities: { ...profile().capabilities, can_access_external_secrets: true } })),
    (error) => error instanceof CapabilityProfileValidationError && error.code === 67,
  );
});

test('rejects a ready package that references an undeclared role run', async () => {
  const root = await mkdtemp(join(tmpdir(), 'thinkbizthai-capabilities-'));
  const profiles = join(root, 'profiles');
  const manifests = join(root, 'manifests');
  await mkdir(profiles);
  await mkdir(manifests);
  await writeFile(join(profiles, 'author.json'), JSON.stringify(profile()));
  await writeFile(join(manifests, 'ready.json'), JSON.stringify({
    work_package_id: 'WP-TEST-001',
    status: 'ready',
    role_assignments: {
      author_agent_run_id: '/root/example',
      reviewer_agent_run_id: '/root/missing-reviewer',
      tester_agent_run_id: '/root/missing-tester',
      integration_owner_agent_run_id: '/root/missing-integration',
    },
  }));

  await assert.rejects(
    () => validateCapabilityProfiles(profiles, manifests),
    (error) => error instanceof CapabilityProfileValidationError && error.code === 68,
  );
});

test('rejects a ready package with undeclared conditional reviewer runs', async () => {
  const root = await mkdtemp(join(tmpdir(), 'thinkbizthai-capabilities-'));
  const profiles = join(root, 'profiles');
  const manifests = join(root, 'manifests');
  await mkdir(profiles);
  await mkdir(manifests);
  const primaryRuns = ['/root/author', '/root/reviewer', '/root/tester', '/root/integration'];
  await Promise.all(primaryRuns.map((agentRunId, index) => writeFile(
    join(profiles, `${index}.json`),
    JSON.stringify(profile({ agent_run_id: agentRunId })),
  )));
  await writeFile(join(manifests, 'ready.json'), JSON.stringify({
    work_package_id: 'WP-TEST-002',
    status: 'ready',
    role_assignments: {
      author_agent_run_id: '/root/author',
      reviewer_agent_run_id: '/root/reviewer',
      tester_agent_run_id: '/root/tester',
      integration_owner_agent_run_id: '/root/integration',
      security_reviewer_agent_run_id: '/root/undeclared-security',
      product_reviewer_agent_run_id: '/root/undeclared-product',
    },
  }));

  await assert.rejects(
    () => validateCapabilityProfiles(profiles, manifests),
    (error) => error instanceof CapabilityProfileValidationError && error.code === 68,
  );
});
