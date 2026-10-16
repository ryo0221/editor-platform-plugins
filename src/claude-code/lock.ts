import { open, readFile, unlink } from 'node:fs/promises';
import { join } from 'node:path';

// One Claude Code session owns a workspace. Never remove a live process's lock.
export async function lockWorkspace(directory: string) {
  const path = join(directory, '.claude-code.lock');
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const file = await open(path, 'wx', 0o600);
      await file.writeFile(String(process.pid)); await file.close();
      return async () => { await unlink(path).catch(() => undefined); };
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error;
      const pid = Number(await readFile(path, 'utf8'));
      if (!Number.isSafeInteger(pid) || pid <= 0) throw Error('Workspace lock is invalid. Close all Editor/Claude Code sessions, back up the data folder, and remove .claude-code.lock before restarting.');
      try { process.kill(pid, 0); }
      catch (error) {
        if ((error as NodeJS.ErrnoException).code === 'ESRCH') throw Error('The previous Editor session ended unexpectedly. Close all Editor/Claude Code sessions, back up the data folder, then remove .claude-code.lock and retry.');
        throw error;
      }
      throw Error('This Editor workspace is already open in another Claude Code session. Close that session before retrying. Data has not been changed.');
    }
  }
  throw Error('Unable to acquire the Editor workspace lock.');
}
