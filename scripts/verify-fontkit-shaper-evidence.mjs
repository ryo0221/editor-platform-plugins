// Offline, data-only comparison of retained HarfBuzz table witnesses.
import fs from 'node:fs';
import ts from 'typescript';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
const hash = s => createHash('sha256').update(s).digest('hex');
const root = process.argv[2];
if (!root)
    throw Error('Supply directory containing hb-arabic.cc and hb-indic.cc');
const record = JSON.parse(fs.readFileSync('docs/license-audits/fontkit-closure-evidence.json'));
const expected = record.harfbuzzTables;
const bundle = fs.readFileSync('node_modules/@pdf-lib/fontkit/dist/fontkit.es.js', 'utf8');
const c = fs.readFileSync(root + '/hb-arabic.cc', 'utf8');
const cs = c.slice(c.indexOf('arabic_state_table[][NUM_STATE_MACHINE_COLS] ='), c.indexOf('};', c.indexOf('arabic_state_table[][NUM_STATE_MACHINE_COLS] =')));
const js = bundle.slice(bundle.indexOf('var STATE_TABLE ='), bundle.indexOf(';', bundle.indexOf('var STATE_TABLE =')));
const triples = s => [...s.matchAll(/[\[{]\s*(NONE|ISOL|FINA|FIN2|FIN3|MEDI|MED2|INIT)\s*,\s*(NONE|ISOL|FINA|FIN2|FIN3|MEDI|MED2|INIT)\s*,\s*(\d+)\s*[\]}]/g)].map(x => x.slice(1));
assert.equal(triples(cs).length, 42);
assert.deepEqual(triples(cs), triples(js));
function obj(node) {
  if (ts.isObjectLiteralExpression(node)) {
    return Object.fromEntries(node.properties.map(property => [
      property.name.getText().replaceAll("'", ''), obj(property.initializer)
    ]));
  }
  if (node.kind === ts.SyntaxKind.TrueKeyword) return true;
  if (node.kind === ts.SyntaxKind.FalseKeyword) return false;
  if (ts.isNumericLiteral(node)) return Number(node.text);
  if (ts.isStringLiteral(node)) return node.text;
  if (ts.isPropertyAccessExpression(node)) return node.name.text;
  throw Error(node.getText());
}
function config(source) {
  const tree = ts.createSourceFile('evidence.js', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
  let result;
  function walk(node) {
    if (ts.isVariableDeclaration(node) && node.name.getText() === 'INDIC_CONFIGS') {
      result = obj(node.initializer);
    }
    ts.forEachChild(node, walk);
  }
  walk(tree);
  assert.ok(result, 'INDIC_CONFIGS must exist');
  return result;
}
const original = config(bundle);
assert.equal(hash(bundle), record.input.sha256);
assert.equal(hash(c), expected.arabicSourceSha256);
const ci = fs.readFileSync(root + '/hb-indic.cc', 'utf8');
const rows = [...ci.slice(ci.indexOf('indic_configs[] ='), ci.indexOf('};', ci.indexOf('indic_configs[] ='))).replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/\{\s*HB_SCRIPT_(\w+),\s*(true|false),\s*(0x[0-9A-F]+u?|0),\s*BASE_POS_(\w+),\s*REPH_POS_(\w+),\s*REPH_MODE_(\w+),\s*BLWF_MODE_(\w+)\s*\}/g)].map(x => ({ name: x[1], values: [x[2] === 'true', Number(x[3].replace('u', '')), ...x.slice(4).map(s => s.toLowerCase())] }));
assert.equal(rows.length, 12);
for (const row of rows.filter(r => r.name !== 'SINHALA')) {
    const key = Object.keys(original).find(k => (k === 'Default' ? 'INVALID' : k.toUpperCase()) === row.name);
    assert.ok(key, row.name + " " + Object.keys(original).join(","));
    const o = original[key];
    const actual = [o.hasOldSpec, o.virama, o.basePos.toLowerCase(), o.rephPos.toLowerCase(), o.rephMode.toLowerCase(), o.blwfMode.toLowerCase()];
    if (row.name === 'KHMER') {
        assert.equal(actual[3], 'ra_to_become_reph');
        assert.equal(row.values[3], 'dont_care');
    }
    else
        assert.deepEqual(actual, row.values);
}
const proof = { arabicTriples: 42, arabicTableSha256: hash(JSON.stringify(triples(cs))), indicMatchedRows: 10, indicModifiedRow: "KHMER reph position differs", indicOmittedSourceRow: "SINHALA (not present in bundled configuration)", indicConfigSha256: hash(JSON.stringify(original)), arabicSourceSha256: hash(c), indicSourceSha256: hash(ci), note: 'Exact table matches, not a complete proof of origin for every shaper algorithm.' };
assert.deepEqual(proof, expected);
console.log('HarfBuzz: 42 Arabic triples and 10 Indic configuration rows match; recorded differences preserved.');
