import fs from 'node:fs';
import vm from 'node:vm';
import zlib from 'node:zlib';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
const sha = x => crypto.createHash('sha256').update(x).digest('hex');
// Run from repository root with the documented, already downloaded evidence.
const root=process.argv[2];
if(!root) throw Error('Supply directory with use.machine, compile.js, hb-use-machine.txt, use-precompression.json and hb-use-machine-HEADER.txt');
const expected=JSON.parse(fs.readFileSync('docs/license-audits/fontkit-use-evidence.json'));
const bundle=fs.readFileSync('node_modules/@pdf-lib/fontkit/dist/fontkit.es.js','utf8');
assert.equal(sha(bundle),'62ad9c769e6a7a9028b0c711504908f0a231955b39619aaabd56dd4eabe800be');
const b64=bundle.match(/var base64DeflatedUseData = "([^"]+)"/)[1];
const historicalData=JSON.parse(fs.readFileSync(root+'/use-precompression.json','utf8'));
const data=JSON.parse(zlib.inflateSync(Buffer.from(b64,'base64')));
const historicalDifferences = data.categories.filter(x=>!historicalData.categories.includes(x));
assert.deepEqual(historicalDifferences,['null','M']);
assert.deepEqual(data.accepting,historicalData.accepting);
assert.deepEqual(data.tags,historicalData.tags);
assert.deepEqual(data.decompositions,historicalData.decompositions);
assert.deepEqual(data.stateTable.map(row=>historicalData.categories.map(cat=>row[data.categories.indexOf(cat)])),historicalData.stateTable);
const grammar=fs.readFileSync(root+'/use.machine','utf8');
const hb=fs.readFileSync(root+'/hb-use-machine.txt','utf8');
const rules = x => Object.fromEntries([...x.matchAll(/^([a-z][a-z_]+)\s*=\s*([^;]+);/gm)].map(m=>[m[1],m[2].replace(/\s/g,'')]));
assert.equal(sha(grammar),'fb1ec6f50006241999ef2faa83b198860ef023249d5509bbec3bdb7159c5a318');
assert.equal(sha(hb),'dd71c83eca553527f716054eb7d7f2c853bb216f0b8d60b57b65a901bf8e6a9e');
const jsrules=rules(grammar), crules=rules(hb);
const exact=[], changed=[];
for(const [name,rule] of Object.entries(jsrules)) if(name!=='main') (rule===crules[name]?exact:changed).push(name);
assert.equal(exact.length,11);
assert.deepEqual(changed,['independent_cluster']);
assert.equal(jsrules.independent_cluster,crules.independent_cluster.replace('|Rsv',''));
// Exact official compiler evidence was downloaded earlier, not installed. Its
// standalone source has no imports/require/eval, reviewed before use. Execute only
// within a fresh VM context without filesystem/network/process bindings.
// Node VM is not a security boundary; execution relies on reviewed hash-pinned source.
const compiler=fs.readFileSync(root+'/compile.js','utf8');
assert.equal(sha(compiler),'fc1362901ed557e189957f374d1550bc771b10738d16133d7ce7fdeba9de19a2');
const sandbox={exports:{},inputGrammar:grammar,inputSymbols:Object.fromEntries(data.categories.map((s,i)=>[s,i]))};
vm.createContext(sandbox,{codeGeneration:{strings:false,wasm:false}});
vm.runInContext(compiler,sandbox,{timeout:5000});
vm.runInContext('result=exports.default(inputGrammar,inputSymbols)',sandbox,{timeout:5000});
const generated=JSON.parse(JSON.stringify(sandbox.result));
for(const key of ['stateTable','accepting','tags']) assert.deepEqual(generated[key],data[key]);
const output={historicalDifferences,bundleSha256:sha(bundle),sourceUseJsonSha256:sha(fs.readFileSync(root+'/use-precompression.json')),decodedUseDataSha256:sha(JSON.stringify(data)),grammarSha256:sha(grammar),compilerSha256:sha(compiler),harfbuzzSourceSha256:sha(hb),exactRules:exact,modifiedRule:{name:changed[0],fontkit:jsrules.independent_cluster,harfbuzz:crules.independent_cluster},generatedKeys:Object.keys(generated),stateRows:data.stateTable.length,categories:data.categories.length,generatedFields:['stateTable','accepting','tags'],tableSha256:sha(JSON.stringify(data.stateTable)),noticeSha256:sha(fs.readFileSync(root+'/hb-use-machine-HEADER.txt'))};
assert.deepEqual(output,expected);console.log('USE grammar, generated table and historical comparison: PASS');
