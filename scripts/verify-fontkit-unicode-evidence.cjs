// Offline data provenance check; fixed input layout documented in fontkit-data-runtime.md.
const fs=require('fs'),z=require('zlib'),crypto=require('crypto'),vm=require('vm');
const root=process.cwd(),out=root+'/work/unicode-followup/',pkg=root+'/work/fontkit-closure/@pdf-lib_unicode-properties-0.0.1/package/';
for(const [path,digest] of Object.entries(JSON.parse(fs.readFileSync(root+'/docs/license-audits/fontkit-unicode-input-hashes.json')))){if(crypto.createHash('sha256').update(fs.readFileSync(root+'/'+path)).digest('hex')!==digest)throw Error('Input hash mismatch: '+path);}
const data=JSON.parse(z.inflateSync(Buffer.from(JSON.parse(fs.readFileSync(pkg+'es/data.json')),'base64')));
const buf=z.inflateSync(Buffer.from(JSON.parse(fs.readFileSync(pkg+'es/trie.json')),'base64'));
const raw=z.inflateRawSync(z.inflateRawSync(buf.subarray(12))),words=new Uint32Array(raw.buffer,raw.byteOffset,raw.length/4);
const high=buf.readUInt32BE(0);function get(c){let i;if(c<0xd800||(c>0xdbff&&c<=0xffff))i=(words[c>>5]<<2)+(c&31);else if(c<=0xffff)i=(words[2048+((c-0xd800)>>5)]<<2)+(c&31);else if(c<high){i=words[2112-32+(c>>11)];i=words[i+((c>>5)&63)];i=(i<<2)+(c&31);}else i=words.length-4;return words[i];}
const cps=require('./fontkit-unicode-parser.cjs')(out+'codepoints-1.2.0/package/data');
const bits=n=>(Math.log2(n)+1)|0,es=10,ss=es+bits(data.eaw.length-1),cs=ss+bits(data.scripts.length-1),gs=cs+bits(data.combiningClasses.length-1);
function numeric(n){if(!n)return 0;let m=n.match(/^(\-?\d+)\/(\d+)$/);if(m)return ((+m[1]+12)<<4)+(+m[2]-1);if(/^\d0+$/.test(n))return ((+n[0]+14)<<5)+(n.length-3);let v=parseInt(n);if(v<=50)return 1+v;let exp=0;while(v%60===0){v/=60;exp++;}return ((v+0xbf)<<2)+(exp-1);}
const diffs=[];let mismatches=0,assigned=0;const decoded=Buffer.alloc(0x110000*4),expected=Buffer.alloc(decoded.length);
for(let c=0;c<0x110000;c++){let p=cps[c],v=0;if(p){assigned++;v=(data.categories.indexOf(String(p.category))<<gs)|((data.combiningClasses.indexOf(String(p.combiningClassName))||0)<<cs)|((data.scripts.indexOf(String(p.script))||0)<<ss)|((data.eaw.indexOf(String(p.eastAsianWidth))||0)<<es)|numeric(p.numeric);}v>>>=0;const actual=get(c);decoded.writeUInt32LE(actual,c*4);expected.writeUInt32LE(v,c*4);if(actual!==v){mismatches++;if(diffs.length<30)diffs.push({code:c.toString(16),actual,expected:v,p});}}
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');const result={assigned,compared:0x110000,mismatches,decodedSha256:sha(decoded),expectedSha256:sha(expected),data,examples:diffs};fs.writeFileSync(out+'comparison.json',JSON.stringify(result,null,2));console.log(JSON.stringify({assigned,mismatches,decodedSha256:sha(decoded),expectedSha256:sha(expected),examples:diffs.slice(0,2)},null,2));

const bundle=fs.readFileSync(root+'/node_modules/@pdf-lib/fontkit/dist/fontkit.es.js','utf8');
const vars=Object.fromEntries([...bundle.matchAll(/var (base64Deflated\w*(?:\$\d+)?) = ("[^"\n]*");/g)].map(m=>[m[1],JSON.parse(m[2])]));
const baseDataExact=vars.base64DeflatedData===JSON.parse(fs.readFileSync(pkg+'es/data.json'));
const baseTrieExact=vars.base64DeflatedTrie===JSON.parse(fs.readFileSync(pkg+'es/trie.json'));
function expand(b){const r=z.inflateRawSync(z.inflateRawSync(b.subarray(12))),w=new Uint32Array(r.buffer,r.byteOffset,r.length/4),h=b.readUInt32BE(0),res=Buffer.alloc(0x110000*4);for(let c=0;c<0x110000;c++){let i;if(c<0xd800||(c>0xdbff&&c<=0xffff))i=(w[c>>5]<<2)+(c&31);else if(c<=0xffff)i=(w[2048+((c-0xd800)>>5)]<<2)+(c&31);else if(c<h){i=w[2080+(c>>11)];i=w[i+((c>>5)&63)];i=(i<<2)+(c&31);}else i=w.length-4;res.writeUInt32LE(w[i],c*4);}return res;}
const arabic=expand(z.inflateSync(Buffer.from(vars['base64DeflatedTrie$1'],'base64'))),arExpected=Buffer.alloc(arabic.length),classes={Non_Joining:0,Left_Joining:1,Right_Joining:2,Dual_Joining:3,Join_Causing:3,ALAPH:4,'DALATH RISH':5,Transparent:6};
for(const p of cps)if(p){let v=0;if(p.joiningGroup==='ALAPH'||p.joiningGroup==='DALATH RISH')v=classes[p.joiningGroup]+1;else if(p.joiningType)v=classes[p.joiningType]+1;arExpected.writeUInt32LE(v,p.code*4);}
let arDiff=0;for(let i=0;i<0x110000;i++)if(arabic.readUInt32LE(i*4)!==arExpected.readUInt32LE(i*4))arDiff++;
const hist=expand(Buffer.from(JSON.parse(fs.readFileSync(out+'2018-trie.json')).data));
const arHist=expand(Buffer.from(JSON.parse(fs.readFileSync(out+'fontkit-arabic-2018.json')).data));
const extra={baseDataExact,baseTrieExact,unicodeProperties2018DecodedExact:hist.equals(decoded),unicodeProperties2018DataExact:JSON.stringify(JSON.parse(fs.readFileSync(out+'2018-data.json')))===JSON.stringify(data),arabicMismatches:arDiff,arabicSha256:sha(arabic),arabicExpectedSha256:sha(arExpected),arabic2018DecodedExact:arHist.equals(arabic),variables:Object.keys(vars)};
fs.writeFileSync(out+'bundle-history-comparison.json',JSON.stringify(extra,null,2));console.log(extra);

const cp12=require('./fontkit-unicode-parser.cjs')(root+'/work/fontkit-closure/codepoints-1.3.0/package/data');const ar12=Buffer.alloc(arabic.length);for(const p of cp12)if(p){let v=0;if(p.joiningGroup==='ALAPH'||p.joiningGroup==='DALATH RISH')v=classes[p.joiningGroup]+1;else if(p.joiningType)v=classes[p.joiningType]+1;ar12.writeUInt32LE(v,p.code*4);}let d12=0;const examples=[];for(let c=0;c<0x110000;c++)if(ar12.readUInt32LE(c*4)!==arabic.readUInt32LE(c*4)){d12++;if(examples.length<10)examples.push({c:c.toString(16),actual:arabic.readUInt32LE(c*4),expected12:ar12.readUInt32LE(c*4)});}fs.writeFileSync(out+'arabic12.json',JSON.stringify({d12,sha256:sha(ar12),examples},null,2));console.log({d12,sha256:sha(ar12),examples});

// Audited generator computation only: remove imports, truncate all serialization,
// filesystem and DFA compilation. No require/process/fs supplied to VM context.
const src=root+'/work/license-audit/fontkit-followup/fontkit-72b8e42bd6a398d496a63a6d483eabeed43861fb/src/opentype/shapers/';
const shapers={};for(const [name,varname] of [['indic','base64DeflatedTrie$2'],['use','base64DeflatedTrie$3']]){
 let source=fs.readFileSync(src+'gen-'+name+'.js','utf8');source=source.split('// Trie is serialized')[0].replace(/^import .*;\n/gm,'');
 if(name==='indic')source=fs.readFileSync(src+'indic-data.js','utf8').replace(/export /g,'')+'\n'+source;
 const context={codepoints:cp12,result:null};vm.createContext(context,{codeGeneration:{strings:false,wasm:false}});
 const stub='class UnicodeTrieBuilder {constructor(){this.values=new Uint32Array(0x110000);} set(c,v){this.values[c]=v;}}\n';
 vm.runInContext(stub+source+'\nresult={values:Array.from(trie.values),symbols, decompositions:typeof decompositions===\"undefined\"?null:decompositions};',context,{timeout:10000});
 const actual=expand(z.inflateSync(Buffer.from(vars[varname],'base64'))),exp=Buffer.alloc(actual.length);context.result.values.forEach((v,c)=>exp.writeUInt32LE(v,c*4));let diffs=0,examples=[];for(let c=0;c<0x110000;c++)if(actual.readUInt32LE(c*4)!==exp.readUInt32LE(c*4)){diffs++;if(examples.length<100)examples.push({code:c.toString(16),actual:actual.readUInt32LE(c*4),expected:exp.readUInt32LE(c*4),properties:cp12[c]});}
 shapers[name]={compared:0x110000,diffs,examples,actualSha256:sha(actual),expectedSha256:sha(exp),generatorSha256:sha(fs.readFileSync(src+'gen-'+name+'.js'))};
 if(name==='use'){const use=JSON.parse(z.inflateSync(Buffer.from(vars.base64DeflatedUseData,'base64')));shapers[name].categoriesExact=JSON.stringify(use.categories)===JSON.stringify(Object.keys(context.result.symbols));shapers[name].decompositionsExact=JSON.stringify(use.decompositions)===JSON.stringify(context.result.decompositions);}
}fs.writeFileSync(out+'indic-use-comparison.json',JSON.stringify(shapers,null,2));console.log(shapers);

const assert=require('node:assert/strict');
assert.equal(mismatches,0);assert.equal(d12,0);
assert.equal(baseDataExact,true);assert.equal(baseTrieExact,true);
assert.equal(extra.unicodeProperties2018DecodedExact,true);
for(const shaper of Object.values(shapers)){assert.equal(shaper.diffs,0);assert.equal(shaper.actualSha256,shaper.expectedSha256);}
assert.equal(shapers.use.categoriesExact,true);assert.equal(shapers.use.decompositionsExact,true);
console.log('All four decoded tries match their documented editions at every codepoint.');
