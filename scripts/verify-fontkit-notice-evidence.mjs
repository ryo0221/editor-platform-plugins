// Optional offline verification against already-downloaded official tarball
// contents. No install, network or execution of the dependency source occurs.
import ts from 'typescript';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { createHash } from 'node:crypto';

const root = process.argv[2];
if (!root) throw Error('Supply the directory containing extracted base64-arraybuffer/package and @pdf-lib_brotli/package');
const manifest = JSON.parse(await readFile(new URL('../licenses/fontkit-1.1.1/PROVENANCE.json', import.meta.url)));
const digest = bytes => createHash('sha256').update(bytes).digest('hex');
const parse = text => ts.createSourceFile('input.js', text, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
function find(node, predicate) {
  if (predicate(node)) return node;
  return ts.forEachChild(node, child => find(child, predicate));
}
function normalized(node) {
  // Parentheses, positions and comments do not change the parsed expression tree.
  if (ts.isParenthesizedExpression(node)) return normalized(node.expression);
  const children = [];
  ts.forEachChild(node, child => { children.push(normalized(child)); });
  return { kind: ts.SyntaxKind[node.kind], ...('text' in node ? { text: node.text } : {}), children };
}
const bytes = await readFile('node_modules/@pdf-lib/fontkit/dist/fontkit.es.js');
assert.equal(digest(bytes), manifest.input.sha256);
const bundle = parse(bytes.toString());
for (const evidence of manifest.astEvidence) {
  const sourceBytes = await readFile(join(root, evidence.package.replaceAll('/', '_'), evidence.path));
  assert.equal(digest(sourceBytes), evidence.sourceSha256);
  const predicate = evidence.component === 'BrotliBitReader'
    ? node => ts.isFunctionDeclaration(node) && node.name?.text === 'BrotliBitReader'
    : node => ts.isBinaryExpression(node) && ts.isPropertyAccessExpression(node.left)
      && node.left.expression.getText() === 'exports' && node.left.name.text === 'encode';
  const sourceNode = find(parse(sourceBytes.toString()), predicate);
  const bundleNode = find(bundle, predicate);
  assert.ok(sourceNode && bundleNode);
  assert.deepEqual(normalized(sourceNode), normalized(bundleNode));
  assert.equal(digest(JSON.stringify(normalized(sourceNode))), evidence.normalizedAstSha256);
  console.log(`${evidence.component}: pinned source and normalized AST match`);
}
console.log('Two component matches only; complete fontkit provenance remains unresolved.');
