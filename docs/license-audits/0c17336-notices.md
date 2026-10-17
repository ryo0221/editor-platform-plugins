# Audit of the 21 missing root-level notice texts

Scope: the four clean `0c17336a125659dda85af90153c9b84e651679ae` Code candidates
recorded in [PR #31's inventory](../release-candidates/0c17336-inventory.json).
This is a file/provenance audit, not a legal clearance. Publication remains blocked
by `@pdf-lib/fontkit@1.1.1` full-notice and embedded-dependency provenance.

## Method and reproducible evidence

[Machine evidence](0c17336-input-evidence.json) records each exact version,
lockfile role, immediate dependents, emitted module path/size and output hashes.
Run `node scripts/audit-candidate-license-inputs.mjs` with the checked-in lockfile's
installed dependencies to reproduce Rollup `chunk.modules` / esbuild
`outputs[*].inputs` evidence in `work/license-audit/trace.json`. This rebuild uses
`write:false`, performs no installation/network fetch and runs no foreign binary.
Positive rendered lengths prove an included module; these are not performance
measurements or a claim about runtime execution of every function.

The rebuilt `editor.html`, `browser.html`, `react-preview.html` and Code
`index.mjs` SHA-256 values exactly match the Linux candidate's `build-info.json`.
The same Editor HTML is shipped for every target and Desktop. A separate esbuild
trace also covers Desktop's runtime (rebuild evidence, not actual Desktop).
The archive's only application `node_modules` entry is the bundled runtime;
third-party installed package source directories are not copied into the
corresponding-source tree. Lockfiles/import declarations in that tree can mention
packages without shipping their implementations. Existing source-manifest and
archive-path checks establish that boundary.

**Limit:** Rollup sees `@pdf-lib/fontkit/dist/fontkit.es.js` as one input. Its
prebundled dependencies are not individually resolved by our build. Therefore
"not resolved" below is a direct-module conclusion, not proof that no similar or
embedded code exists anywhere in fontkit. A lockfile `dev` flag alone was never
used to decide whether code is distributed.

## All 21 findings

| Package/version | Dependency path / role | Direct emitted-code finding |
| --- | --- | --- |
| `@esbuild/linux-x64@0.25.12` | esbuild build executable | No input in the five traced builds |
| `@humanfs/types@0.15.0` | humanfs development types | No input |
| `@napi-rs/canvas-linux-x64-gnu@0.1.100` | canvas optional native implementation | No input; native binary not copied |
| `@napi-rs/canvas-linux-x64-musl@0.1.100` | canvas optional native implementation | No input; native binary not copied |
| `@napi-rs/lzma-linux-x64-gnu@1.5.1` | Rollup optional native implementation | No input; native binary not copied |
| `@pdf-lib/fontkit@1.1.1` | public Document `src/pdf-text.ts` import | **Included:** `dist/fontkit.es.js`, 1,001,597 rendered characters before final minification |
| `@resvg/resvg-wasm@2.6.2` | Office adapters/export UI | No input; Office UI is aliased to this host's unavailable adapter; dependency declaration is not a runtime contribution |
| `@rollup/rollup-linux-x64-gnu@4.64.7` | Rollup build executable | No input; native binary not copied |
| `@rollup/rollup-linux-x64-musl@4.64.7` | Rollup build executable | No input; native binary not copied |
| `esrecurse@4.3.0` | eslint-scope development dependency | No input |
| `fastdom@1.0.12` | Mermaid `rendering-util/fastdom` | **Included:** `fastdom.js` (5,353 characters), `extensions/fastdom-promised.js` (2,111), plus CommonJS wrappers |
| `flora-colossus@2.0.0` | galactus / packaging development dependency | No input |
| `hash.js@1.1.7` | docx export dependency | No independently resolved input |
| `https@1.0.0` | pptxgenjs declaration; npm package is metadata only | No npm-package input (Node builtin HTTPS is distinct) |
| `imurmurhash@0.1.4` | ESLint development dependency | No input |
| `isarray@1.0.0` | readable-stream dependency | No independently resolved input; do not infer fontkit's nested provenance from this |
| `keyv@4.5.4` | flat-cache development dependency | No input |
| `natural-compare@1.4.0` | ESLint development dependency | No input |
| `saxes@6.0.0` | Office import core | No independently resolved input |
| `stackback@0.0.2` | why-is-node-running development dependency | No input |
| `strictdom@1.0.1` | fastdom's strict-mode path | No input; Mermaid includes fastdom and its promised extension, not `fastdom-strict.js` |

Counts: 2 included direct Editor packages; 11 installed build/development packages
with no direct contribution; 8 export/optional paths with no direct contribution.
The two Node runtimes and the browser bridge/React preview have no direct
contribution from these 21. Do not relabel all 19 as build-only: several are
production/export/optional dependencies that this particular bundle excludes.

## Corrective change and exact text provenance

The packager's notice loop now calls `scripts/supplemental-license-texts.mjs`.
No runtime, #10 shell-client packaging block, vendor or private editor source is
changed. The helper is offline and pins the reviewed version and README SHA-256;
an upgrade or changed README fails for re-audit rather than silently reusing text.

For **fastdom**, the official npm `1.0.12` tarball's README lines 211–221 contain
the complete Wilson Page MIT notice. Downloaded tarball integrity matches the
committed lockfile, and the installed README is byte-identical. The helper copies
the **entire unchanged README**, records it in `texts`, and records its digest and
`full-text-retained` evidence. No new copyright statement is constructed. Source:
[official npm tarball](https://registry.npmjs.org/fastdom/-/fastdom-1.0.12.tgz),
[maintainer README](https://github.com/wilsonpage/fastdom/blob/master/README.md#license).
The exact immutable tarball integrity and README hash are in the machine evidence;
master is only a readable pointer, not the version identity.

For **fontkit**, the official npm `1.1.1` tarball's README is likewise verified
against the lockfile and copied intact as **evidence**, but is NOT added to
`texts`: its License section only links to a generic MIT template. Its package
metadata declares MIT; that does not identify the missing project-specific notice.
The metadata explicitly records `licenseEvidence.status: UNRESOLVED` with the
reason. The installed package and repository at commit
`72b8e42bd6a398d496a63a6d483eabeed43861fb` have no root LICENSE file. Sources:
[official npm tarball](https://registry.npmjs.org/@pdf-lib/fontkit/-/fontkit-1.1.1.tgz),
[maintainer source tree](https://github.com/Hopding/fontkit/tree/72b8e42bd6a398d496a63a6d483eabeed43861fb),
[README license declaration](https://github.com/Hopding/fontkit/blob/72b8e42bd6a398d496a63a6d483eabeed43861fb/README.md#license).
The registry did not supply a gitHead, so that repository commit is not asserted
to reproduce the npm release byte-for-byte.

Fontkit's distributed `dist/fontkit.es.js` also contains prebundled code and
notices (for example the Joyent notice around line 3349). The maintainer history
explicitly moved dependencies into devDependencies because release builds bundle
them. Their absence from this project's runtime lockfile does not establish
absence from the distribution. Existing bundler comment preservation alone has
not been audited for complete nested attribution.

Follow-up: [partial embedded notice retention](fontkit-1.1.1-embedded-notices.md)
preserves identified originals without clearing the fontkit publication blocker.

## Publication gate and next decision

The fastdom omission is repaired. The fontkit omission is **not** cleared by
copying the README, inventing a generic MIT notice, borrowing a current parent
repository's copyright, or labeling it a build dependency. Before publication:

1. Obtain authoritative version-corresponding full notice/provenance for fontkit
   and its embedded components, preserving their exact texts and source identity;
   alternatively select a reviewed upstream replacement/removal with the owning
   editor team. No maintainer message or upstream/editor change was sent/made here.
2. Add verified text/provenance, update the explicit unresolved marker only after
   review, rebuild the final candidate and inspect both Code/Desktop archives.
3. Regenerate the final distribution inventory and run the remaining actual-host
   acceptance. Historical PR #31 hashes still name the unfixed candidates.

This is a **blocked publication decision**, not a denied tool action. The missing
authoritative text/provenance is the blocker; no account, secret, purchase or
installation is needed to review the prepared patch. Actual release/publication
was not attempted. Keep #3/#4 open for their other acceptance conditions.

## Patch verification

- `npm run check`: 52 unit/protocol checks and 26 Chromium checks PASS.
- `node --test tests/distribution-notices/package.test.mjs`: 2 PASS. Both the
  Code tarball and Desktop MCPB contain byte-identical fastdom README text and
  fontkit evidence, matching the top-level inventory and per-package metadata;
  fontkit is explicitly unresolved and its generic-link README is not a full text.
- Existing archive protocol/source checks: Code 1 PASS, Desktop 2 PASS.
- `node scripts/audit-candidate-license-inputs.mjs`: final retained script
  reproduced every recorded output hash and all 21 package contribution lists.
- Helper tests reject an unreviewed version and changed README bytes.

The first Code packaging attempt collided with another build clearing `dist/`
and failed before producing a new archive; sequential Desktop then Code rebuilds
succeeded. The patch verification artifacts are dirty-development candidates,
not final reviewed release identities: Code SHA-256
`bdf968bf4515a9bbbfb5adcd789ac8ce3bd62ef8706d1b6518fa70805a7009a7`,
Desktop SHA-256
`e4a8364d7d632079db126d788a3d94d7fe50b85c567e3bdd8073570b980948f3`.
Logs are under `work/license-audit/`; generated archives/logs are not committed.
The original clean Linux archive/checksum/template were retained separately under
`work/license-audit/before/`. No actual host/OS acceptance was added by these tests.
