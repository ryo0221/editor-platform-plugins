import { spawn, type ChildProcess } from 'node:child_process';
import { release } from 'node:os';
import { DomainError } from '../server/decks';

export type BrowserHandoff = 'handoff_requested' | 'unconfirmed';

type Environment = { platform: NodeJS.Platform; kernel: string; env: NodeJS.ProcessEnv };
type Launch = (command: string, args: string[], options: { shell: false; stdio: 'ignore' }) => Pick<ChildProcess, 'once' | 'kill'>;

export function isWsl({ platform, kernel, env }: Environment): boolean {
  return platform === 'linux' && (!!env.WSL_INTEROP || !!env.WSL_DISTRO_NAME || /microsoft|wsl/i.test(kernel));
}

// Do not interpret arbitrary URLs, shell commands, or BROWSER configuration. The
// capability is passed only to a trusted local opener as one opaque argument.
export async function launchBrowser(url: string, options: {
  environment?: Environment; launch?: Launch; timeoutMs?: number;
} = {}): Promise<BrowserHandoff> {
  const match = /^http:\/\/127\.0\.0\.1:([1-9][0-9]{0,4})\/browser#[a-f0-9]{64}$/.exec(url);
  if (!match || Number(match[1]) > 65535) throw new DomainError('BROWSER_UNAVAILABLE', 'Invalid local Editor browser address.');
  const environment = options.environment ?? { platform: process.platform, kernel: release(), env: process.env };
  const wsl = isWsl(environment);
  const commands = wsl ? ['wslview', 'explorer.exe']
    : [environment.platform === 'darwin' ? 'open' : environment.platform === 'win32' ? 'explorer.exe' : 'xdg-open'];
  const launch = options.launch ?? spawn;
  for (const command of commands) {
    const outcome = await new Promise<'ok' | 'unconfirmed' | 'missing' | 'failed' | 'timeout'>((resolve) => {
      let child: ReturnType<Launch>;
      let timer: ReturnType<typeof setTimeout> | undefined;
      let done = false;
      const finish = (result: 'ok' | 'unconfirmed' | 'missing' | 'failed' | 'timeout') => {
        if (done) return;
        done = true; clearTimeout(timer); resolve(result);
      };
      try {
        child = launch(command, [url], { shell: false, stdio: 'ignore' });
        child.once('error', (error: NodeJS.ErrnoException) => finish(error.code === 'ENOENT' ? 'missing' : 'failed'));
        child.once('exit', (code) => finish(code === 0 ? 'ok' : command === 'explorer.exe' && code === 1 ? 'unconfirmed' : 'failed'));
        timer = setTimeout(() => { finish('timeout'); try { child.kill(); } catch { /* Do not expose child errors or its arguments. */ } }, options.timeoutMs ?? 10_000);
      } catch { finish('failed'); }
    });
    if (outcome === 'ok') return 'handoff_requested';
    // Explorer may return 1 after opening a window. This is uncertainty, not
    // success or proof of browser connection. Never relaunch in response.
    if (outcome === 'unconfirmed') return 'unconfirmed';
    // Only ENOENT permits trying another opener: a failed/slow opener may have
    // already opened a window. Never produce duplicate windows or hide a denial.
    if (outcome === 'missing') continue;
    const detail = outcome === 'timeout' ? 'did not finish within the time limit' : 'did not report successful handoff';
    throw new DomainError('BROWSER_UNAVAILABLE', wsl
      ? `WSL browser opener ${command} ${detail}. A window may already have opened; check it before retrying. Check existing Windows interoperability and browser association. No settings were changed; native WSL acceptance is still required.`
      : `OS browser opener ${command} ${detail}. Check the graphical browser and its association before retrying open_editor.`);
  }
  throw new DomainError('BROWSER_UNAVAILABLE', wsl
    ? 'WSL detected, but neither wslview nor explorer.exe is available on PATH. Check whether Windows interoperability and an existing Windows URL opener are permitted. Ask the device administrator before installing tools or changing settings. No manual URL fallback is available.'
    : 'No OS browser opener is available. Check the graphical browser and OS URL opener, then retry open_editor. Headless/remote sessions are not supported.');
}

export function browserHandoffReport(result: BrowserHandoff | void) {
  return {
    status: result === 'unconfirmed' ? 'launch_unconfirmed' : 'launch_requested',
    browserVerified: false,
    message: result === 'unconfirmed'
      ? 'Explorer did not confirm the handoff; a browser window may already be open. Ask the user to check it. Do not automatically retry. Choose the intended artifact from Saved artifacts; the new-artifact kind selector does not select a saved artifact.'
      : 'The OS opener accepted the request; browser connection and visible content are not verified. Ask the user to check the local browser and choose the intended artifact from Saved artifacts. Do not automatically retry if a window is already open.',
  };
}
