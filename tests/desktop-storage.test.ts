import { test } from 'node:test';
import assert from 'node:assert/strict';
import { desktopDataDirectory } from '../src/desktop/storage';

test('desktop data survives extension relocation and uses each OS application-data directory', () => {
  assert.equal(desktopDataDirectory({ LOCALAPPDATA: 'C:\\Users\\亮\\AppData\\Local' }, 'win32', 'C:\\Users\\亮'),
    'C:\\Users\\亮\\AppData\\Local\\EditorPlatform\\ClaudeDesktop');
  assert.equal(desktopDataDirectory({}, 'win32', 'C:\\Users\\亮'),
    'C:\\Users\\亮\\AppData\\Local\\EditorPlatform\\ClaudeDesktop');
  assert.equal(desktopDataDirectory({}, 'darwin', '/Users/亮'),
    '/Users/亮/Library/Application Support/EditorPlatform/ClaudeDesktop');
  assert.equal(desktopDataDirectory({ XDG_DATA_HOME: '/tmp/editor-home' }, 'linux', '/home/test'),
    '/tmp/editor-home/EditorPlatform/ClaudeDesktop');
  assert.equal(desktopDataDirectory({ EDITOR_DATA_DIR: '/tmp/custom' }, 'linux', '/home/test'), '/tmp/custom');
  assert.throws(() => desktopDataDirectory({ EDITOR_DATA_DIR: './data' }, 'linux', '/home/test'), /absolute/);
  assert.throws(() => desktopDataDirectory({ LOCALAPPDATA: 'relative' }, 'win32', 'C:\\Users\\test'), /absolute/);
});
