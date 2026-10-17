// Read-only reconstruction of fields consumed by unicode-properties generator.
// Does not execute downloaded source. UnicodeData First/Last range handling and
// property defaults follow codepoints@1.2.0 parser, whose bytes are separately pinned.
const fs=require('fs');
module.exports=function(dir){
 const cps=[];let start;
 for(const line of fs.readFileSync(dir+'/UnicodeData.txt','utf8').split('\n')){if(!line)continue;const p=line.split(';'),cp=parseInt(p[0],16);if(/, First>/.test(p[1])){start=cp;continue;}const lo=/, Last>/.test(p[1])?start:cp;for(let c=lo;c<=cp;c++)cps[c]={code:c,category:p[2],combiningClass:+p[3],numeric:p[8],decomposition:p[5].split(' ').filter(x=>x&&!x.startsWith('<')).map(x=>parseInt(x,16)),script:null,eastAsianWidth:null,joiningGroup:null,joiningType:null};}
 function rows(file){return fs.readFileSync(dir+'/'+file,'utf8').split('\n').map(l=>l.replace(/\s*#.*$/,'').trim()).filter(Boolean).map(l=>l.split(/\s*;\s*/));}
 const ccc={},jt={};for(const p of rows('PropertyValueAliases.txt')){if(p[0]==='ccc')ccc[+p[1]]=p[3];if(p[0]==='jt')jt[p[1]]=p[2];}
 for(const p of cps)if(p)p.combiningClassName=ccc[p.combiningClass];
 for(const [file,prop] of [['Blocks.txt','block'],['Scripts.txt','script'],['EastAsianWidth.txt','eastAsianWidth']])for(const p of rows(file)){const [a,b=a]=p[0].split('..').map(s=>parseInt(s,16));for(let c=a;c<=b;c++)if(cps[c])cps[c][prop]=p[1];}
 for(const p of rows('ArabicShaping.txt')){const c=parseInt(p[0],16);if(cps[c]){cps[c].joiningType=jt[p[2]];cps[c].joiningGroup=p[3];}}
 for(const [file,prop] of [['IndicPositionalCategory.txt','indicPositionalCategory'],['IndicSyllabicCategory.txt','indicSyllabicCategory']])if(fs.existsSync(dir+'/'+file))for(const p of rows(file)){const [a,b=a]=p[0].split('..').map(s=>parseInt(s,16));for(let c=a;c<=b;c++)if(cps[c])cps[c][prop]=p[1];}
 return cps;
};
