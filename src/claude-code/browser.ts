import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { AppBridge, PostMessageTransport } from '@modelcontextprotocol/ext-apps/app-bridge';
import { CallToolResultSchema } from '@modelcontextprotocol/sdk/types.js';

async function connect() {
  const token = location.hash.slice(1) || sessionStorage.getItem('editor-browser-token');
  history.replaceState(null, '', location.pathname);
  if (!token || !/^[a-f0-9]{64}$/.test(token)) throw Error('Claude Codeから open_editor を実行して開いてください。');
  sessionStorage.setItem('editor-browser-token', token);
  const client = new Client({ name: 'editor-local-browser', version: '0.1.5' });
  await client.connect(new StreamableHTTPClientTransport(new URL('/mcp', location.href), {
    requestInit: { headers: { Authorization: `Bearer ${token}` } },
  }));
  const frame = document.querySelector<HTMLIFrameElement>('#editor')!;
  const bridge = new AppBridge(null, { name: 'Open Editor local browser', version: '0.1.5' },
    { serverTools: {} },
    { hostContext: { theme: 'light', displayMode: 'inline', availableDisplayModes: ['inline'], containerDimensions: { width: innerWidth, maxHeight: innerHeight } } });
  bridge.oncalltool = async (params) => CallToolResultSchema.parse(await client.callTool(params));
  // The separate stdio model channel cannot receive browser context updates.
  // Do not advertise updateModelContext; the Editor offers saved selection +
  // an explicit follow-up prompt/read instead of claiming automatic sharing.
  bridge.oninitialized = async () => {
    await bridge.sendToolInput({ arguments: {} });
    document.querySelector('#status')!.textContent = 'Claude Codeに接続中のローカルEditor。保存済みの成果物から開いてください。変更案の確認はEditorの再読込ボタンで行えます。';
  };
  await bridge.connect(new PostMessageTransport(frame.contentWindow!, frame.contentWindow!));
  frame.src = '/editor.html?initial=inventory';
}
void connect().catch(() => {
  document.querySelector('#status')!.textContent = '接続できません。Claude Codeを起動し、open_editor を再実行してください。終了後のブラウザURLは再利用できません。';
});
