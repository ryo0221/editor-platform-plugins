// Offline comparison against already extracted, integrity-checked official
// packages. No dependency code is executed; TypeScript parses it as data.
import ts from 'typescript';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
const root = process.argv[2];
if (!root) throw Error('Supply the evidence directory containing <package-key>/package/');
const record = JSON.parse(await readFile(new URL('../docs/license-audits/fontkit-closure-evidence.json', import.meta.url)));
const digest = bytes => createHash('sha256').update(bytes).digest('hex');
function normalize(node) {
  if (ts.isParenthesizedExpression(node)) return normalize(node.expression);
  const children = [];
  ts.forEachChild(node, child => { children.push(normalize(child)); });
  return { kind: ts.SyntaxKind[node.kind], ...('text' in node ? { text: node.text } : {}), children };
}
function functions(bytes) {
  const source = ts.createSourceFile('evidence.js', bytes.toString(), ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
  const result = [];
  function walk(node) {
    if ((ts.isFunctionDeclaration(node) || ts.isFunctionExpression(node)
      || ts.isMethodDeclaration(node) || ts.isConstructorDeclaration(node)) && node.body) {
      result.push({ line: source.getLineAndCharacterOfPosition(node.getStart()).line + 1,
        sha256: digest(JSON.stringify({ params: node.parameters.map(normalize), body: normalize(node.body) })) });
    }
    ts.forEachChild(node, walk);
  }
  walk(source); return result;
}
const input = await readFile('node_modules/@pdf-lib/fontkit/dist/fontkit.es.js');
assert.equal(digest(input), record.input.sha256);
const bundled = functions(input);
for (const component of record.matches) {
  const pkg = record.packages.find(p => p.name === component.name && p.version === component.version);
  for (const match of component.matches) {
    const bytes = await readFile(join(root, pkg.key, 'package', match.file));
    assert.equal(digest(bytes), match.fileSha256);
    assert.ok(functions(bytes).some(f => f.line === match.sourceLine && f.sha256 === match.astSha256));
    for (const line of match.bundleLines) assert.ok(bundled.some(f => f.line === line && f.sha256 === match.astSha256));
  }
  console.log(`${component.name}@${component.version}: recorded function witnesses match`);
}
console.log('Witnesses verify code association, not unique release identity or full-bundle clearance.');
