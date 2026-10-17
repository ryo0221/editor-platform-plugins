import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { spawn, type ChildProcess } from 'node:child_process';
import { mkdtemp, writeFile, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { isWsl, launchBrowser } from '../src/claude-code/browser-opener';

const url = 'http://127.0.0.1:49152/browser#' + 'a'.repeat(64);
const linux = { platform: 'linux' as const, kernel: '6.1-linux', env: {} };
const wsl = { ...linux, kernel: '5.15.167.4-microsoft-standard-WSL2' };
type Outcome = number | 'ENOENT' | 'EACCES' | 'signal' | 'timeout' | 'throw';
function harness(outcomes: Outcome[]) {
  const calls: { command: string; args: string[]; options: unknown }[] = [];
  let kills = 0;
  const launch = (command: string, args: string[], options: { shell: false; stdio: 'ignore' }) => {
    calls.push({ command, args, options });
    const result = outcomes.shift();
    if (result === 'throw') throw Error('sensitive child error ' + url);
    const child = new EventEmitter() as ChildProcess;
    child.kill = () => { kills++; return true; };
    queueMicrotask(() => {
      if (result === 'ENOENT' || result === 'EACCES') child.emit('error', Object.assign(Error(url), { code: result }));
      else if (result === 'signal') child.emit('exit', null, 'SIGTERM');
      else if (result !== 'timeout') child.emit('exit', result, null);
    });
    return child;
  };
  return { calls, launch, killed: () => kills };
}

test('WSL detection handles kernel and environment signals only on Linux', () => {
  assert.equal(isWsl(linux), false);
  for (const environment of [wsl, { ...linux, kernel: '4.4.0-Microsoft' }, { ...linux, env: { WSL_INTEROP: '/run/WSL/1_interop' } }, { ...linux, env: { WSL_DISTRO_NAME: 'Ubuntu' } }]) assert.equal(isWsl(environment), true);
  for (const platform of ['win32', 'darwin'] as const) assert.equal(isWsl({ ...wsl, platform, env: { WSL_DISTRO_NAME: 'Ubuntu' } }), false);
});

test('native Linux/macOS/Windows keep their opener and one opaque URL argument', async () => {
  for (const [platform, command] of [['linux', 'xdg-open'], ['darwin', 'open'], ['win32', 'explorer.exe']] as const) {
    const h = harness([0]);
    await launchBrowser(url, { environment: { ...linux, platform, env: { BROWSER: 'malicious --command' } }, launch: h.launch });
    assert.deepEqual(h.calls, [{ command, args: [url], options: { shell: false, stdio: 'ignore' } }]);
  }
});

test('WSL prefers existing wslview; only missing executable permits explorer fallback', async () => {
  for (const [outcomes, expected] of [[[0], ['wslview']], [['ENOENT', 0], ['wslview', 'explorer.exe']]] as [Outcome[], string[]][]) {
    const h = harness(outcomes);
    await launchBrowser(url, { environment: wsl, launch: h.launch });
    assert.deepEqual(h.calls.map(c => c.command), expected);
    for (const call of h.calls) { assert.deepEqual(call.args, [url]); assert.deepEqual(call.options, { shell: false, stdio: 'ignore' }); }
  }
});

test('missing WSL openers give actionable redacted error without xdg fallback', async () => {
  const h = harness(['ENOENT', 'ENOENT']);
  await assert.rejects(launchBrowser(url, { environment: wsl, launch: h.launch }), error => {
    assert.match(String(error), /neither wslview nor explorer.exe/); assert.match(String(error), /No manual URL fallback/);
    assert.ok(!String(error).includes(url)); return true;
  });
  assert.deepEqual(h.calls.map(c => c.command), ['wslview', 'explorer.exe']);
});

test('opener failure, signal, permission and timeout never leak URL or retry after launch', async () => {
  for (const outcome of [1, 'EACCES', 'signal', 'timeout', 'throw'] as Outcome[]) {
    const h = harness([outcome, 0]);
    await assert.rejects(launchBrowser(url, { environment: wsl, launch: h.launch, timeoutMs: 5 }), error => {
      assert.match(String(error), /WSL browser opener wslview/); assert.ok(!String(error).includes(url)); assert.ok(!String(error).includes('a'.repeat(64))); return true;
    });
    assert.equal(h.calls.length, 1); assert.equal(h.killed(), outcome === 'timeout' ? 1 : 0);
  }
  // Explorer status 1 is not silently called success; native semantics stay conservative.
  for (const platform of ['linux', 'darwin', 'win32'] as const) {
    const h = harness([1]); await assert.rejects(launchBrowser(url, { environment: { ...linux, platform }, launch: h.launch }), /did not report successful handoff/);
  }
});

test('noncanonical addresses and injection payloads are rejected before any process starts', async () => {
  const h = harness([]);
  for (const bad of [url + '\n', url + ';touch /tmp/no', url.replace('49152', '65536'), url.replace('49152', '0'), url.replace('127.0.0.1', 'localhost'), url.replace('/browser', '/browser?x=1'), url.replace('http:', 'file:'), '--help', '$(id)', url.replace('a'.repeat(64), "'&whoami")]) {
    await assert.rejects(launchBrowser(bad, { environment: wsl, launch: h.launch }), /Invalid local Editor browser address/);
  }
  assert.equal(h.calls.length, 0);
});

test('Linux subprocess fixture verifies WSL opener argv; this is not real WSL acceptance', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'wsl-opener-fixture-'));
  try {
    const capture = join(dir, 'argv');
    await writeFile(join(dir, 'wslview'), '#!/bin/sh\nprintf "%s\\n" "$#" "$1" > "$OPENER_CAPTURE"\n', { mode: 0o700 });
    await launchBrowser(url, { environment: wsl, launch: (command, args, options) => spawn(join(dir, command), args, { ...options, env: { ...process.env, OPENER_CAPTURE: capture } }) });
    assert.equal(await readFile(capture, 'utf8'), '1\n' + url + '\n');
  } finally { await rm(dir, { recursive: true, force: true }); }
});
