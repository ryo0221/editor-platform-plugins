import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { cp, mkdir, mkdtemp, readFile, rm } from 'node:fs/promises';
import { dirname, join } from 'node:path';

export const nodeDistribution = Object.freeze(JSON.parse(await readFile(new URL('./claude-code-node.json', import.meta.url), 'utf8')));

// The trust anchor is the reviewed repository pin, never an environment-supplied
// checksum or the builder's Node executable. Verify before extracting/executing.
export async function verifyNodeDistribution(archive) {
  if (!archive) throw Error(`Set EDITOR_NODE_ARCHIVE to the official ${nodeDistribution.filename}; see docs/claude-code.md.`);
  const actual = createHash('sha256').update(await readFile(archive)).digest('hex');
  if (actual !== nodeDistribution.sha256) throw Error('Node distribution SHA-256 mismatch. Only the pinned official Node archive is accepted; a host executable or repacked/distro runtime is not supported.');
  return nodeDistribution;
}

export async function installNodeDistribution(archive, destination) {
  await verifyNodeDistribution(archive);
  await mkdir(dirname(destination), { recursive: true });
  const temporary = await mkdtemp(join(dirname(destination), 'node-extract-'));
  const folder = `node-v${nodeDistribution.version}-${nodeDistribution.platform}-${nodeDistribution.arch}`;
  try {
    const extracted = spawnSync('tar', ['-xzf', archive, '-C', temporary, `${folder}/bin/node`, `${folder}/LICENSE`], { encoding: 'utf8' });
    if (extracted.error) throw extracted.error;
    if (extracted.status !== 0) throw Error(`Unable to extract the verified Node distribution: ${extracted.stderr}`);
    await mkdir(destination, { recursive: true });
    await cp(join(temporary, folder, 'bin/node'), join(destination, 'node'));
    await cp(join(temporary, folder, 'LICENSE'), join(destination, 'LICENSE'));
    return nodeDistribution;
  } finally { await rm(temporary, { recursive: true, force: true }); }
}
