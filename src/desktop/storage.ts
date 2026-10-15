import { homedir } from 'node:os';
import { posix, win32 } from 'node:path';

// Keep user data outside the extension: upgrades replace its installation folder.
export function desktopDataDirectory(
  env: NodeJS.ProcessEnv = process.env,
  platform: NodeJS.Platform = process.platform,
  home = homedir(),
): string {
  const path = platform === 'win32' ? win32 : posix;
  if (env.EDITOR_DATA_DIR) {
    if (!path.isAbsolute(env.EDITOR_DATA_DIR)) throw Error('EDITOR_DATA_DIR must be an absolute path for the desktop extension.');
    return path.normalize(env.EDITOR_DATA_DIR);
  }
  const base = platform === 'win32'
    ? env.LOCALAPPDATA || path.join(home, 'AppData', 'Local')
    : platform === 'darwin'
      ? path.join(home, 'Library', 'Application Support')
      : env.XDG_DATA_HOME || path.join(home, '.local', 'share');
  if (!path.isAbsolute(base)) throw Error('The local application data directory must be absolute.');
  return path.join(base, 'EditorPlatform', 'ClaudeDesktop');
}
