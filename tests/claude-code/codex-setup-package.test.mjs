// Linux execution with a simulated WSL environment; NOT native WSL/Windows acceptance.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, rm, access } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

test('packaged Codex setup: fresh install, real stdio, stable-path update, saved data and uninstall retention (simulated WSL)', { timeout: 90000 }, async () => {
  const archive=resolve('release/editor-platform-claude-code-0.1.5-linux-x64.tar.gz');
  assert.equal(createHash('sha256').update(await readFile(archive)).digest('hex'),(await readFile(archive+'.sha256','utf8')).split(' ')[0]);
  const temp=await mkdtemp(join(tmpdir(),'codex-install-'));
  try {
    const extract=join(temp,'extracted 日本語');await mkdir(extract);
    execFileSync('tar',['-xzf',archive,'-C',extract]);
    const plugin=join(extract,'plugins/editor-platform');
    const env={PATH:'',HOME:temp,XDG_DATA_HOME:join(temp,'user data'),WSL_DISTRO_NAME:'test-fixture'};
    const run=(action,...args)=>JSON.parse(execFileSync(join(plugin,'runtime/node'),[join(plugin,'server/codex-setup.mjs'),action,'--channel','wsl-cli',...args],{env,cwd:temp,encoding:'utf8'}));
    const plan=run('plan');await assert.rejects(access(plan.root));
    const installed=run('install','--stopped');assert.deepEqual(installed.connection,plan.connection);
    const info=JSON.parse(await readFile(join(installed.root,'build-info.json')));
    assert.equal(createHash('sha256').update(await readFile(join(installed.root,'server/codex-setup.mjs'))).digest('hex'),info.codexSetupSha256);
    let id;
    for(let restart=0;restart<2;restart++) {
      const client=new Client({name:'codex-installed-check',version:'1'});
      await client.connect(new StdioClientTransport({command:plan.connection.command,args:plan.connection.args,env:{PATH:'',...plan.connection.env},cwd:temp,stderr:'pipe'}));
      try {
        const call=async(name,args={})=>{const r=await client.callTool({name,arguments:args});assert.ok(!r.isError);return r.structuredContent;};
        if(!restart) {const guide=await call('get_editor_guide',{kind:'document'});id=(await call('create_artifact',{kind:'document',title:'Fictional installed Codex data',content:guide.exampleContent})).artifact.id;}
        else assert.equal((await call('read_artifact',{artifactId:id})).artifact.title,'Fictional installed Codex data');
      } finally {await client.close();}
      if(!restart) {const updated=run('update','--stopped');assert.deepEqual(updated.connection,plan.connection);await access(updated.previousInstall);}
    }
    run('uninstall','--stopped','--registration-removed');await assert.rejects(access(plan.root));await access(plan.dataDir);
    assert.equal(plan.configModified,false);
  } finally {await rm(temp,{recursive:true,force:true});}
});
