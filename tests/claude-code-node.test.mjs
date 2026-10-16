import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, rm, access } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { installNodeDistribution, verifyNodeDistribution } from '../scripts/claude-code-node.mjs';

test('Code runtime rejects host Node, unpinned/repacked archives and missing input before extraction', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'node-pin-test-'));
  try {
    await assert.rejects(verifyNodeDistribution(undefined), /EDITOR_NODE_ARCHIVE/);
    // In particular, copying the currently running (potentially distro) Node is forbidden.
    await assert.rejects(verifyNodeDistribution(process.execPath), /SHA-256 mismatch/);
    const tampered = join(directory, 'node.tar.gz'); await writeFile(tampered, 'untrusted runtime');
    const target = join(directory, 'runtime');
    await assert.rejects(installNodeDistribution(tampered, target), /SHA-256 mismatch/);
    await assert.rejects(access(target));
  } finally { await rm(directory, { recursive: true, force: true }); }
});
