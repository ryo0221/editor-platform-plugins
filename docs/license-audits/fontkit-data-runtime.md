# Unicode data, polyfills and shaper follow-up

See [final scoped coverage](fontkit-final-coverage.md) for current applicability,
archive containment, and the correction of historical-provenance blocker language.

This completes the three requested bounded investigations following PR #35.
It adds four confirmed original notices (process, HarfBuzz USE, UCD8 and UCD12
ReadMe), one separately authored data-transformation disclosure, and four
**evidence-only** files (conflicting plugin declarations and two historical
Unicode terms texts). No evidence-only file is represented as a full applicable
license in the archive's `texts` list. Publication remains UNRESOLVED/PARTIAL.

## Unicode: represented data editions are now matched

The exact fontkit ES bundle SHA remains
`62ad9c769e6a7a9028b0c711504908f0a231955b39619aaabd56dd4eabe800be`.
Each comparison checks all 1,114,112 Unicode codepoints, not a sample or benchmark.

| Embedded data | Reconstructed inputs | Result |
| --- | --- | --- |
| properties, lines 23770–23778 | Unicode 8.0.0 from codepoints 1.2.0; category/combining-class/script/width/numeric packing | Zero differences; 260,253 assigned inputs. Both embedded strings match unicode-properties 0.0.1; decoded data and lookup arrays also match pre-2019 source commit `2b6f4a08cb88a16f5dcee7ba33620db739679b14`. |
| Arabic trie, 26317–26318 | Unicode 12.0.0 from codepoints 1.3.0; fontkit joining-class mapping | Zero differences. Unicode8 gives 158 differences; historical 2018 Arabic trie is not the final shipped data. |
| Indic trie, 27758–27760 | Unicode 12.0.0 and pinned `gen-indic.js`/`indic-data.js` | Zero differences. |
| USE trie, 28680–28683 | Unicode 12.0.0 and pinned `gen-use.js` | Zero differences; generated categories and decompositions also exactly match. |

All 11 codepoints1.2.0 data files and 13 codepoints1.3.0 files match the corresponding
[official Unicode8 archive](https://www.unicode.org/Public/zipped/8.0.0/UCD.zip) and
[Unicode12 archive](https://www.unicode.org/Public/zipped/12.0.0/UCD.zip) byte-for-byte.
The original archive ReadMe notices are retained. Results and decoded hashes are
in [fontkit-unicode-evidence.json](fontkit-unicode-evidence.json); every calculation
input is hash-pinned in [fontkit-unicode-input-hashes.json](fontkit-unicode-input-hashes.json).
This proves complete represented-property agreement with these editions, not
uniqueness among every possible historical/future edition or a whole upstream build.

Both UCD ReadMe files link mutable terms URLs and contain no full terms. We also
retain the unchanged same-year official Unicode data/software texts from
[2015 ICU source](https://github.com/unicode-org/icu/blob/dd8356c7545a570b56136d3e44c62f7efdf5495f/icu4c/license.html)
and [2019 ICU source](https://github.com/unicode-org/icu/blob/2f2aec5f91cffe49b7526d9b0d18a9acbdd0cc89/icu4c/LICENSE).
The complete relevant 2015 HTML section remains HTML inside a `.txt` evidence
file; the 2019 original heading `(ICU 58 and later)` is unchanged. These are
**historical terms evidence, not a claim that the UCD archives contained those
full texts or that the mutable URL at release time has been recovered**. We do
not claim ICU55 itself used Unicode8. Exact release-day terms history remains
unproved. The separate modification disclosure identifies upstream selection,
packing, compression and generator overrides without editing original notices.

## Fixed polyfill implementation and bounded earlier lineage

[Runtime evidence](fontkit-runtime-evidence.json) records 159 complete function
matches to the fork-lock-pinned `rollup-plugin-node-builtins@2.1.2`, grouped by
source file with bundle ranges. It covers events, util, stream/readable-stream,
string-decoder and supporting helpers. Generic matches outside the contiguous
region do not assign that whole region to this source. Nine process functions
match fixed `process-es6@0.11.6`; its original LICENSE was absent and is added.
The util source header matches the already-retained Joyent string-decoder notice
after removal of comment prefixes/whitespace, so it needs no duplicate.

The plugin's npm gitHead and annotated v2.1.2 tag resolve to
`385b27079d74dff17eaaff87215078b407f44946`. At that exact source commit,
package.json says ISC while README says MIT except ES6 ports retain original
library terms; no root full notice is present. Both original declarations are
retained as evidence, without inventing a grant or applying ISC to Node code.
Earlier readable-stream2.1.5 has 76 function matches (2.3.6 has 50), and Node
v6.3.0 events has 14: shared upstream lineage, not unique import-version proof.
No speculative version-specific notice is added for those earlier candidates.
Earlier events/stream revision and any additional author notices remain bounded
unknowns; exact plugin implementation matching does not resolve that history.

`regeneratorRuntime` occurs only twice, as `.mark`/`.wrap` calls at 27473/27475.
There is no identifier binding or runtime body in this exact fontkit input.
The generator region is a transformed dfa caller; lockfile presence alone does
not justify adding a regenerator runtime notice. This says nothing about other
application files outside this audited bundle.

## Shaper history and additional USE notice

[Path-scoped history](fontkit-shaper-history.json) records every non-merge commit
after each initial port through public source `72b8e42bd6a398d496a63a6d483eabeed43861fb`:
fallback 6, Arabic 10, Indic 30 and USE 15. Renamed CoffeeScript paths are included.
Arabic changes preserve the previously matched 42 state triples. Indic's final
May2017 semantic additions still correspond to HarfBuzz source `8563099`; its
existing Google2011/2012 header is unchanged. Nineteen meaningful contiguous
comment/code witnesses are recorded in [fontkit-indic-witnesses.json](fontkit-indic-witnesses.json).
No additional original notice was found for fallback/Arabic/Indic in these histories.

USE has a confirmed additional Mozilla Foundation/Google2015 original notice from
[HarfBuzz source 9b6312f](https://github.com/harfbuzz/harfbuzz/blob/9b6312f9451db790db00dc2c2e27a5a1db852e72/src/hb-ot-shape-complex-use-machine.rl).
Eleven grammar rules match; `independent_cluster` omits `Rsv`, and main action
syntax differs. Recompiling the original fontkit grammar with hash-pinned official
dfa1.2.0 yields all **55×38 state-table entries, accepting and tags exactly** as
shipped. [USE evidence](fontkit-use-evidence.json) records the complete chain.
The historical precompression table lacks final `null` and `M` columns; selecting
historical categories gives identical tables. Grammar tables and Unicode data
are independently verified, not conflated.

Fallback and surrounding shaper full cross-language revision identities remain
unproved. Hangul references a specification and a shaping PDF; the inspected
historical HarfBuzz candidate had insufficient meaningful matches, so its notice
is not presented as established. No holder/year is inferred from contributors.
Source reproducibility is not treated as an independent license obligation.

## Reproduction and maintenance

Run from repository root with the already downloaded official evidence. The
existing closure verifier takes an optional evidence JSON argument:

```sh
node scripts/verify-fontkit-closure-evidence.mjs work/polyfill-followup docs/license-audits/fontkit-runtime-evidence.json
node scripts/verify-fontkit-use-evidence.mjs work/fontkit-data-evidence
node scripts/verify-fontkit-unicode-evidence.cjs
python3 scripts/verify-fontkit-ucd-archives.py
```

Runtime evidence packages use `<directory>/<name-version>/package/` as documented
in their immutable metadata. USE evidence directory contains `use.machine` from
the pinned public fontkit source, `compile.js` from official dfa1.2.0,
`hb-use-machine.txt` from the linked source, its original header as
`hb-use-machine-HEADER.txt`, and `use-precompression.json` from fontkit
`bb0d29995b907e6d3b607f50236f83a041c34cdc^:src/opentype/shapers/use.json`.

Unicode uses fixed ignored paths listed exhaustively in its input hash manifest:
codepoints1.2.0 under `work/unicode-followup`, codepoints1.3.0 and
unicode-properties0.0.1 under `work/fontkit-closure`, and public fontkit source
under `work/license-audit/fontkit-followup/fontkit-72b8e42bd6a398d496a63a6d483eabeed43861fb`.
`2018-trie.json` and `2018-data.json` are the root files from the above
unicode-properties2018 commit. `fontkit-arabic-2018.json` comes from
`Hopding/fontkit` commit `7fc465e46142673e34f5469701cfb01c9be55426`,
`src/opentype/shapers/trie.json`. Official UCD zip files are named
`work/unicode-followup/UCD-{8.0.0,12.0.0}.zip`.

All executable/compiler/generator inputs are checked before use. The Unicode
parser is local read-only code; only reviewed generator calculation portions
run with imports removed and serialization/IO portions excluded. USE compilation
uses a pinned standalone compiler. VM contexts have no supplied IO/process
bindings and disable dynamic code generation; VM is not a security boundary,
so trust rests on reviewed, pinned inputs. No dependency is installed. Verifiers
assert agreement and fail on changed inputs. Generated comparison output stays
under ignored work paths. Packaging separately checks all retained bytes and
keeps unresolved markers; native/macOS/Windows/actual-host acceptance is NOT RUN.
