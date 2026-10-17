# Fontkit embedded component reconciliation

Historical PR #35 audit. The [data/runtime follow-up](fontkit-data-runtime.md)
resolves the represented Unicode editions and USE grammar chain, adds confirmed
notices, and narrows remaining terms/polyfill/shaper uncertainties.

This records the completed local investigation of the requested Buffer, iconv-lite,
restructure, Unicode, clone and HarfBuzz-derived shaper groups. It retains nine
additional original notices, confirms two already retained notices, and records
three explicit MIT declarations separately from full notices. It is **not a
complete clearance of the fontkit bundle**. Unresolved ranges are below; no
copyright holder, year, permission grant or source-release identity is invented.

This supersedes the earlier report's suggestion that missing release-source/build
identity is itself a publication requirement. Source reproducibility and license
notice obligations are separate questions. Fontkit's MIT declaration is explicit;
a missing root LICENSE does not establish missing permission. The candidate still
has unresolved attribution/data questions and remains a preview, without Release
or real-host acceptance.

## Evidence boundary

The exact npm 1.1.1 bundle and immutable source-package URLs, integrity values,
file hashes and selected function witnesses are in
[fontkit-closure-evidence.json](fontkit-closure-evidence.json). Original retained
files and their provenance are in
[PROVENANCE.json](../../licenses/fontkit-1.1.1/PROVENANCE.json).
The input `dist/fontkit.es.js` SHA-256 is
`62ad9c769e6a7a9028b0c711504908f0a231955b39619aaabd56dd4eabe800be`.
All bundle line numbers below refer to that file, not minified output.

Official npm tarballs were downloaded as evidence, with registry integrity and
SHA-1 checked; none was installed. Candidate versions are from the public fork's
lockfile at `72b8e42bd6a398d496a63a6d483eabeed43861fb`. Function AST matches remove
positions, comments and parentheses, preserving identifiers, literals and child
structure. They show code association, not unique release identity: unchanged
functions can occur in multiple releases. Counts include duplicate source/build
copies; they are not independent functions or percentage coverage. Two selected
witnesses per candidate are retained for reproducible checking.

| Component / exact candidate | Evidence in shipped bundle | Notice result |
| --- | --- | --- |
| buffer 5.6.0 | 99 matching function instances; utf8Slice 1184, utf8ToBytes 1899 | Original MIT LICENSE added. |
| base64-js 1.3.1 | 7; toByteArray 58, fromByteArray 106 | Original MIT LICENSE added. |
| ieee754 1.1.13 | 2; read/write 137, 171 | Original BSD-3-Clause LICENSE added. |
| iconv-lite 0.4.24 | 46; internal encoder 5411, DBCS codec 6789 | Exact original LICENSE already in archive at `licenses/npm/iconv-lite@0.4.24/LICENSE`; archive test verifies digest. |
| safer-buffer 2.1.2 | 2; 5176, 5190 | Exact original LICENSE already at `licenses/npm/safer-buffer@2.1.2/LICENSE`; archive test verifies digest. |
| @pdf-lib/restructure 0.0.1 | 91; VersionedStruct 17370, Bitfield 16839 | Tarball README and package.json explicitly say MIT. Original declaration and metadata retained as evidence only. No separate full notice found. |
| @pdf-lib/unicode-properties 0.0.1 | 32; getNumericValue 23820 | Original MIT LICENSE added verbatim, including its literal `Copyright 2018` without a holder name. This does not resolve underlying Unicode data attribution. |
| unicode-trie 0.3.1 | 3; constructor 23634 | Original MIT declaration/metadata retained as evidence only. The later 2018 upstream LICENSE is not silently assigned to this older release. |
| tiny-inflate 1.0.2 and 1.0.3 | 7 each; 23483, 23552; entire index.js bytes identical across these versions | Original 1.0.3 LICENSE added and labeled 1.0.3. No claim that 1.0.2 tarball contains it. |
| clone 1.0.4 | 5; regex helpers 32492, 32497 | Original MIT LICENSE added. |
| dfa 1.2.0 | Constructor 27456 matches two package files; transpiled generator is not fully matched | Original MIT declaration/metadata retained as evidence only. |

The six newly retained npm notices were absent as exact license-file bytes from
the previously built Desktop archive. The iconv-lite and safer-buffer bytes were
already present. This distinction is now checked against both archive formats;
it is not inferred from installed package names alone. Evidence-only files do not
appear in the attribution `texts` list. There are now 13 original notice/text
files (four previous plus nine new) and six declaration/metadata evidence files.

## HarfBuzz-derived shapers

The fontkit source explicitly credits HarfBuzz source filenames in fallback
(line 23909), Arabic (26353) and Indic (27764). The original port commits are
`6d221bd1c183cb01acf6b19ed32d4122c02b160e` (2015-04-07),
`44ac7ea7fae7dcee19349e8e18892531f936ee6b` (2015-07-27), and
`ef7e415b6970ae29a1fc9c49387354825f4e9dec` (2017-05-12).
The original leading copyright/permission/disclaimer comment from each of the
following official source files is retained unchanged. These are corresponding
source notices with graded evidence, not claims of byte-identical algorithms.

| Source snapshot before the port | Comparison / limitation |
| --- | --- |
| [Arabic 9daf2df](https://github.com/harfbuzz/harfbuzz/blob/9daf2dfb6bd5683fd951bdf166c8b87938257e52/src/hb-ot-shape-complex-arabic.cc) | All 42 state/action triples match bundle STATE_TABLE at 26339. This does not identify a unique revision of the whole shaper. |
| [Indic 8563099](https://github.com/harfbuzz/harfbuzz/blob/85630996b8afa699f7b5d19346cdf5c72fcd6e2d/src/hb-ot-shape-complex-indic.cc) | 10 configuration rows match INDIC_CONFIGS at 27630. Khmer reph position differs; Sinhala source row is absent in the JS configuration. |
| [Fallback 365576d](https://github.com/harfbuzz/harfbuzz/blob/365576d246949f9d587e90cf0539dc0381e4d0a3/src/hb-ot-shape-fallback.cc) | Weaker association: explicitly credited source filename and source snapshot preceding the port. Exact algorithm/revision correspondence is not established. |

## Bounded unresolved questions

These are outcomes of the available-source audit, not requests for secrets,
registration or an external inquiry. No permission text has been synthesized.

| Exact scope | What is established | What remains unknown |
| --- | --- | --- |
| Fontkit core/fork code outside identified embedded modules | Public history and npm metadata explicitly declare MIT. Full advertised fork history was searched; LICENSE paths found there concern test-font fixtures. | No separate authoritative core copyright notice was found. Do not infer holder/year from author metadata or infer no permission from missing filename. |
| restructure source represented at 16839/17370; unicode-trie 23615–23690; dfa constructor/generator 27456 onward | Version-specific original MIT declarations retained; code witnesses match. | Separate full original notices are absent from examined tarballs/history; declarations are not labeled full notices. |
| Unicode property compressed data at 23776–23778; Arabic trie 26317–26318; Indic trie 27758–27760; USE trie 28680–28683 | Generated data is embedded separately from MIT code. Fork inputs include `es/lib/opentype/shapers/trie*.json`, `use.json`; unicode-properties has `es/lib/data.json` and `trie.json`. | Exact Unicode dataset edition and associated original data terms have not been tied to these compressed bytes. The later codepoints 1.3.0 lock references Unicode 12.0.0 (2019), but fork data was committed in 2018. It cannot establish the shipped data edition. |
| `src/layout/Script.js` script mapping and the corresponding bundled mapping | Source references unversioned Unicode PropertyValueAliases and Microsoft script-tag references. | Exact input dataset snapshot and data attribution are unproven. Code package MIT does not answer that data question. |
| Fallback 23909 onward, Arabic 26353 onward, Indic 27764 onward | Original credited-source notices retained, tables checked as above. | Full algorithm revision/modified-source mapping outside those witnesses remains unproved. No claim that retained historical headers exhaust every later contribution. |
| Browser process/util/stream/events region approximately 2037–5155; generator calls around 27473–27540 | Joyent string-decoder notice in this region was retained in the previous patch. | Other polyfill/generator source versions and complete notice coverage are not established by this targeted audit. |

The official `codepoints@1.3.0` package's update script and ArabicShaping header
identify Unicode 12.0.0, but this is deliberately not copied as a proven notice
for older generated data. Earlier trie-data commits include `7fc465e46142673e34f5469701cfb01c9be55426`
(2018-01-15) and `bb0d29995b907e6d3b607f50236f83a041c34cdc` (2018-12-18).
The remaining lack of a unique full fontkit release-source commit is a source
reproducibility limitation, not an independently asserted legal obligation.
Publication review remains pending because of the concrete unresolved scopes.

## Repeat the comparisons

Use the immutable tarball URLs and integrity values in the evidence JSON. Extract
each into `<evidence>/<key>/package/`; keep downloaded material outside Git. The
HarfBuzz files at the linked commits must be named `hb-arabic.cc` and `hb-indic.cc`
in that directory. Verifiers check source and input hashes and parse data without
executing downloaded dependency code; no dependency installation is involved.

```sh
node scripts/verify-fontkit-closure-evidence.mjs /path/to/evidence
node scripts/verify-fontkit-shaper-evidence.mjs /path/to/evidence
node --test tests/fontkit-embedded-notices.test.mjs tests/supplemental-license-texts.test.mjs
# After sequential Code and Desktop package builds:
node --test tests/distribution-notices/package.test.mjs
```

Packaging fails on changed input or retained-file hashes. `licenseEvidence.status`
remains `UNRESOLVED` and `embeddedNotices.status` remains `PARTIAL`. Host behavior,
dependencies, upstream pin and editor source are unchanged. Native macOS/Windows
and actual Claude host acceptance remain NOT RUN; Linux packaging checks are not
native-host acceptance.
