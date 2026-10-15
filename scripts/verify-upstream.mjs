import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
const pin = JSON.parse(readFileSync(new URL('../upstream.json', import.meta.url)));
const root = new URL('../vendor/editor-platform/', import.meta.url);
const git = (...args) => execFileSync('git', ['-C', root.pathname, ...args], { encoding: 'utf8' }).trim();
if (git('rev-parse', 'HEAD') !== pin.commit || git('rev-parse', 'HEAD^{tree}') !== pin.tree)
  throw new Error('Upstream does not match upstream.json');
if (git('status', '--porcelain', '--untracked-files=no')) throw new Error('Upstream source is modified');
const digest = createHash('sha256').update(readFileSync(new URL('.open-editor-export.json', root))).digest('hex');
if (digest !== pin.manifestSha256) throw new Error('Upstream manifest mismatch');
console.log('Verified pinned public upstream.');
