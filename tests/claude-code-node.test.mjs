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

test('Code targets preserve the Linux pin and reject unknown or wrong-target input', async () => {
  const { selectNodeDistribution, nodeDistribution } = await import('../scripts/claude-code-node.mjs');
  assert.deepEqual(selectNodeDistribution(), nodeDistribution);
  assert.throws(() => selectNodeDistribution('linux-arm64'), /Unsupported/);
  assert.throws(() => selectNodeDistribution('__proto__'), /Unsupported/);
  for (const target of ['linux-x64', 'darwin-arm64', 'darwin-x64', 'win32-x64']) {
    const pin = selectNodeDistribution(target);
    assert.equal(`${pin.platform}-${pin.arch}`, target);
    assert.match(pin.sha256, /^[a-f0-9]{64}$/);
    assert.equal(new URL(pin.url).hostname, 'nodejs.org');
    await assert.rejects(verifyNodeDistribution(process.execPath, pin), /SHA-256 mismatch/);
  }
});
