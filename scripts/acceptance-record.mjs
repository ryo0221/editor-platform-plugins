import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { writeFile } from 'node:fs/promises';
import { basename } from 'node:path';

// Packaging creates an empty record, never an actual-host PASS. No host commands,
// workspace reads, network requests or user/environment identifiers are collected.
export async function createAcceptanceRecord(archive, info) {
  if (!/^[a-f0-9]{40}$/.test(info.sourceCommit) || typeof info.sourceDirty !== 'boolean' ||
      !/^[a-f0-9]{40}$/.test(info.upstream?.commit) ||
      !/^[a-f0-9]{64}$/.test(info.sourceManifestSha256) ||
      !['linux-x64', 'darwin-arm64', 'darwin-x64', 'win32-x64'].includes(`${info.platform}-${info.arch}`) ||
      !/^\d+\.\d+\.\d+$/.test(info.version)) throw Error('Incomplete package provenance for acceptance record.');
  const hash = createHash('sha256');
  let bytes = 0;
  for await (const chunk of createReadStream(archive)) { hash.update(chunk); bytes += chunk.length; }
  const scenario = (id, description) => ({ id, description, result: 'NOT RUN', evidence: null });
  return {
    schemaVersion: 1,
    kind: 'actual-host-acceptance-template',
    package: { filename: basename(archive), sha256: hash.digest('hex'), bytes,
      version: info.version, sourceCommit: info.sourceCommit, sourceDirty: info.sourceDirty,
      sourceManifestSha256: info.sourceManifestSha256, publicUpstreamCommit: info.upstream.commit,
      target: `${info.platform}-${info.arch}` },
    environment: { osVersion: null, architecture: null, wslVersion: null,
      host: null, hostVersion: null, browserVersion: null, testedOn: null },
    scenarios: [
      scenario('C1', 'Fresh approved persistent install, permissions, host restart and plugin discovery'),
      scenario('C2', 'Actual host creates three fictional native slides including charts/figures'),
      scenario('C3', 'Real Editor title/layout edit, Undo/Redo and explicit Save'),
      scenario('C4', 'Host rereads saved changes; preview/reject preserves content; explicit apply changes it'),
      scenario('C5', 'Stale proposal and competing save refused without overwriting manual edits'),
      scenario('C6', 'Exit Editor/host; discover and edit in a new conversation; retain data through update'),
      scenario('C7', 'Export supported formats and inspect file contents; no unsupported Office claim'),
    ],
    additionalChecks: [
      scenario('OS1', 'Native OS browser handoff, visible Editor and default storage outside installation'),
      scenario('R1', 'Actual Claude Code: assemble registered React components, preview/interact, export TSX and inspect output'),
    ],
    release: { decision: 'NOT APPROVED', url: null, acceptedMinimumHostVersion: null },
    video: { short: null, long: null, recordedPackageSha256: null, privacyReview: 'NOT RUN' },
    instructions: 'Copy this generated template before editing. Record PASS/FAIL/NOT RUN with evidence per scenario. Package target is not tested OS. Local tests, source-build reports and temporary plugin loading do not establish fresh persistent-install acceptance. A dirty source commit is not exact source provenance; retain the manifest hash. Never include tokens, private artifact contents or local paths. This file neither approves a Release nor closes an Issue.',
  };
}

export async function writeAcceptanceTemplate(archive, info) {
  const record = await createAcceptanceRecord(archive, info);
  await writeFile(`${archive}.acceptance-template.json`, JSON.stringify(record, null, 2) + '\n');
  return record;
}
