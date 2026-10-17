# Partial embedded notice retention for fontkit 1.1.1

See [final scoped coverage](fontkit-final-coverage.md) for current applicability,
archive containment, and the correction of historical-provenance blocker language.

Historical PR #34 report. See [the follow-up reconciliation](fontkit-closure.md)
for added notices, bounded unknowns, and the correction separating source
reproducibility from notice obligations.

This follow-up retains identified original notices from the exact shipped
`@pdf-lib/fontkit@1.1.1` input. **It does not resolve fontkit's project-specific
full notice, release-source identity or complete embedded attribution. Publication
remains blocked.** PR #33's reviewed head was merged unchanged; this is a separate
patch on that integration, preserving #30's shell client and notice collection.

## Exact input and source-version boundary

The npm tarball in the committed lockfile is
`https://registry.npmjs.org/@pdf-lib/fontkit/-/fontkit-1.1.1.tgz`, integrity
`sha512-KjMd7grNapIWS/Dm0gvfHEilSyAmeLvrEGVcqLGi0VYebuqqzTbgF29efCx7tvx+IEbG3zQciRSWl3GkUSvjZg==`.
Its `dist/fontkit.es.js` has SHA-256
`62ad9c769e6a7a9028b0c711504908f0a231955b39619aaabd56dd4eabe800be`.
No newer installed version or latest-license substitution is used.

The official 1.1.0 and 1.1.1 npm tarballs have the same 17-file set. Only
`fontkit.d.ts` and `package.json` differ; all four distributed JS variants and
README are byte-identical. That comparison does **not** establish a release-source
commit. The public fork commit
[`72b8e42bd6a398d496a63a6d483eabeed43861fb`](https://github.com/Hopding/fontkit/tree/72b8e42bd6a398d496a63a6d483eabeed43861fb)
identifies itself as 1.1.0, and neither npm version supplied gitHead. The fork's
older upstream `v1.*` tags are not asserted to be `@pdf-lib/fontkit@1.1.1` tags.
Its Rollup configuration bundles dependencies and polyfills, leaving only pako
external for ESM. Therefore package.json's MIT label or runtime dependency list
cannot be treated as the entire bundle's notice inventory.

## Files now retained, verbatim

Source files and digests are committed in
[`licenses/fontkit-1.1.1/PROVENANCE.json`](../../licenses/fontkit-1.1.1/PROVENANCE.json).
During both Code and Desktop packaging they are copied to
`licenses/npm/@pdf-lib__fontkit@1.1.1/embedded/` and referenced from the package's
attribution metadata. The packager itself is unchanged by this follow-up.

| Retained file | Exact source and evidence |
| --- | --- |
| `string-decoder-MIT.txt` | Full Joyent notice extracted unchanged, including comment markers/indentation, from 1.1.1 `dist/fontkit.es.js` starting line 3349. This needs no inference about the original string_decoder package version. |
| `base64-arraybuffer-LICENSE-MIT.txt` | Complete Niklas von Hertzen notice from official `base64-arraybuffer@0.1.5` tarball `package/LICENSE-MIT`. The tarball shasum matches the above fork's yarn.lock; registry integrity is verified. The encode function is an AST match to 1.1.1 line 23710 and the copyright header matches. This is a component association, not complete fontkit build reproducibility. |
| `brotli-Google-HEADER.txt` | Original Google 2013 Apache-2.0 header extracted unchanged from the 1.1.1 input, starting line 34218. The adjacent BrotliBitReader constructor matches the AST of official `@pdf-lib/brotli@0.0.0` `dec/bit_reader.js`; its tarball integrity also matches the fork lock. |
| `Apache-2.0.txt` | Unchanged [Apache Software Foundation version 2.0 text](https://www.apache.org/licenses/LICENSE-2.0.txt), explicitly identified by that Google header. Original appendix placeholders remain as published; no new copyright holder or grant is invented. |

The matching exact base64 tarball is
[base64-arraybuffer-0.1.5.tgz](https://registry.npmjs.org/base64-arraybuffer/-/base64-arraybuffer-0.1.5.tgz),
and Brotli is
[brotli-0.0.0.tgz](https://registry.npmjs.org/@pdf-lib/brotli/-/brotli-0.0.0.tgz).
Their immutable integrity, SHA-256, source-file hashes and observed gitHead (if
present) are in PROVENANCE.json. The MIT package label on the Brotli wrapper does
not replace the Apache header for embedded Google decoder code. Wrapper notices
and other embedded components still need their own provenance audit.

These three copyright header strings were absent from the final minified Editor
HTML for the historical candidate. This patch preserves them as named readable
files independently of minifier comment handling. It does not claim no other
archive file already contained overlapping notices.

## Verification and maintenance

The helper checks the installed fontkit bundle's full SHA-256 and every retained
file's digest before copying. The existing helper still checks fontkit version
and README digest. A changed bundle/notice/version fails for re-audit. No network,
installation or license-generation step occurs during packaging.

`licenseEvidence.status` remains `UNRESOLVED`. The added `embeddedNotices.status`
is `PARTIAL`, with provenance digest and per-file hashes. Listing these files in
`texts` means those original notices are retained, not that every part of fontkit
is covered. The generic-link README is still evidence only, never a full notice.

Tests verify verbatim source excerpts and their line positions, file hashes,
changed-bundle rejection, both archive formats and preservation of the unresolved
marker. To repeat the two component AST comparisons with the already downloaded,
integrity-checked tarballs extracted to their named directories:

```sh
node scripts/verify-fontkit-notice-evidence.mjs /path/to/extracted-evidence
node --test tests/fontkit-embedded-notices.test.mjs tests/supplemental-license-texts.test.mjs
node --test tests/distribution-notices/package.test.mjs
```

The evidence directory must contain
`base64-arraybuffer/package/lib/base64-arraybuffer.js` and
`@pdf-lib_brotli/package/dec/bit_reader.js`. The verifier checks their exact hashes
and the installed 1.1.1 input hash, parses both using the pinned existing
TypeScript 5.9.2 dependency, removes only position/comment/parenthesis syntax
wrappers from its structural representation, compares the selected node trees
and checks the recorded normalized AST hashes. It does not execute the code.
Two function matches are deliberately not represented as a complete module map.

Still needed before publication: authoritative full fontkit core/fork notice,
version-corresponding release source/build lock or equivalent evidence, and the
remaining embedded-component/modified-source notices. No external inquiry or
upstream modification was made. Obtaining these materials or choosing an upstream
replacement is separate work; this patch cannot close #3/#4 or authorize Release.

## Prior integration verification

PR #33 head `f38389f82677651b40c475ab19e0339da8eb348a` was integrated with main
containing #30 and #32. Full checks: 52 unit/protocol + 26 browser PASS. Sequential
Code/Desktop builds and Code archive 2, Desktop archive 4, notice archive 2 and
packaged-browser 1 checks PASS. Remote merge
`a985ef32b339e5e3b21a1f88ba570446454282ea` has exactly the validated tree
`e387cfa0c2201ea8508b87a34c84c02d6033228a`; logs are under
`work/pr33-integration/`. No Issue or Release was closed/published by that merge.
