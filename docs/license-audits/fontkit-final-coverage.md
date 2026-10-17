# Final scoped notice coverage

The identified components below have no concrete unmet notice condition remaining
after this patch. This is a bounded evidence-based notice reconciliation, **not a
universal legal guarantee, host acceptance, or permission to publish a Release**.
Missing historical revisions, a missing separately named LICENSE, or inability to
recreate an entire historical build do not independently establish a violation.
This supersedes earlier reports' automatic publication-block wording for those
provenance limitations.

## Applicable Unicode license

Reviewed on 2026-10-17: official [Unicode policy](https://www.unicode.org/copyright.html)
§2.2 includes computer data under `unicode.org/Public`; §3.3 supplies the default
[Unicode License v3](https://www.unicode.org/license.txt), subject to specific
exceptions. The 24 exact input files and both edition ReadMe files were inspected
for specific restrictions and alternative terms. None was found. These are data
files, not fonts, PDF code charts or technical reports. Technical property
exceptions and reserved codepoints are not license exceptions.

[Per-file evidence](fontkit-unicode-license-review.json) records hashes, original
headers and inspection results. The prior full property/official archive checks
establish the represented editions: properties Unicode8, Arabic/Indic/USE
Unicode12. We retain the current official v3 text unchanged, with its actual
1991–2026 notice, alongside original edition ReadMe notices, original headers in
the evidence, and the factual transformation disclosure. We do not present v3 as
the text published in 2015/2019. Recovering the mutable release-day terms URL is
not an unmet condition under this verified current default. Historical ICU terms
remain clearly labeled evidence-only; they are not used to invent a release-day grant.

## Coverage table

Paths below are relative to each package root. `E/` abbreviates
`licenses/npm/@pdf-lib__fontkit@1.1.1/embedded/`; `F/` abbreviates
`licenses/npm/@pdf-lib__fontkit@1.1.1/`. Code package root is
`plugins/editor-platform/`; Desktop uses archive root. The same inventory is
checked in both formats. Original MIT declarations are not mislabeled full texts.

| Component / reviewed scope | Applicable retained notice or declaration | Archive path | Concrete unmet condition identified |
| --- | --- | --- | --- |
| Fontkit core/fork | Explicit MIT declaration, original README and npm metadata | `F/README.md`, `F/package.json` | None demonstrated. No separately supplied core copyright notice found; no holder/year or grant invented. Root filename absence is not missing permission. |
| buffer5.6.0 | Original MIT | `E/buffer-5.6.0-LICENSE.txt` | None. |
| base64-js1.3.1 / base64-arraybuffer0.1.5 | Original MIT notices | `E/base64-js-1.3.1-LICENSE.txt`, `E/base64-arraybuffer-LICENSE-MIT.txt` | None. |
| ieee7541.1.13 | Original BSD-3-Clause | `E/ieee754-1.1.13-LICENSE.txt` | None. |
| iconv-lite / safer-buffer | Original MIT files, byte-verified | `licenses/npm/iconv-lite@0.4.24/LICENSE`, `licenses/npm/safer-buffer@2.1.2/LICENSE` | None. |
| restructure0.0.1 / unicode-trie0.3.1 / dfa1.2.0 | Explicit original MIT declarations/metadata | `E/pdf-lib-restructure-0.0.1-declaration.txt`, `E/unicode-trie-0.3.1-declaration.txt`, `E/dfa-1.2.0-declaration.txt` and respective metadata files | None demonstrated. No separate original notice supplied in examined sources; not treated as unknown permission merely for that reason. |
| unicode-properties0.0.1 code | Original MIT text, including literal original copyright line | `E/pdf-lib-unicode-properties-0.0.1-LICENSE.txt` | None. |
| Unicode8/12 represented data | Current official Unicode v3 default; original edition notices and modification disclosure | `E/Unicode-License-v3.txt`, `E/Unicode-8.0.0-ReadMe.txt`, `E/Unicode-12.0.0-ReadMe.txt`, `E/Unicode-data-modifications.txt` | None found after 26-file exception review. Historical URL recovery is not required by this scoped assessment. |
| tiny-inflate matched code / clone1.0.4 | Original MIT texts | `E/tiny-inflate-1.0.3-LICENSE.txt`, `E/clone-1.0.4-LICENSE.txt` | None. Identical tiny-inflate1.0.2/1.0.3 code does not require unique version attribution to compare the retained notice. |
| process-es6 | Original Roman Shtylman MIT | `E/process-es6-0.11.6-LICENSE.txt` | None. |
| matched events/stream/readable-stream ports | Complete Node.js contributors and Joyent MIT notices | `licenses/npm/readable-stream@2.3.8/LICENSE` | None: original readable-stream2.1.5 notice is an exact contained byte sequence; archived combined notice is exact prefix of official Node6.3.0 LICENSE. |
| util / string-decoder | Original Joyent MIT | `E/string-decoder-MIT.txt` | None; util header agrees apart from comment-prefix/whitespace formatting. |
| rollup builtins metadata | Original ISC package declaration and README deferral to original module terms | `E/rollup-node-builtins-2.1.2-metadata.txt`, `E/rollup-node-builtins-2.1.2-declaration.txt` | No unmet condition identified for matched emitted ports. Core metadata disagreement is separate from upstream port notices; no claim plugin build machinery is shipped in the runtime. |
| regenerator caller | Two property-access calls; no runtime body/binding in this input | No additional runtime text required by this observed scope | None demonstrated; lockfile presence alone is not shipped runtime code. |
| identified Google Brotli decoder | Original Apache2 header and full Apache2 text | `E/brotli-Google-HEADER.txt`, `E/Apache-2.0.txt` | None for identified decoder portions. |
| credited fallback / Arabic / Indic shapers | Original historical source permission/copyright/disclaimer headers | `E/harfbuzz-fallback-NOTICE.txt`, `E/harfbuzz-arabic-NOTICE.txt`, `E/harfbuzz-indic-NOTICE.txt` | No additional missing notice found in complete post-port path histories. Full cross-language revision identity is not required solely to retain these notices. |
| USE generated grammar | Confirmed Mozilla/Google2015 notice; exact generated-table agreement | `E/harfbuzz-use-NOTICE.txt` | None. |
| surrounding shaper / Hangul lineage question | Core MIT declaration; prior examined references and history retained | `F/README.md`, source audit documents | No specific additional copied-code notice or unmet notice condition established. Unknown lineage alone is not asserted as a legal blocker. |

## Correction: combined notices count

The previous whole-file digest search was too narrow for events/stream. The
applicable original notice is present inside a combined LICENSE; different
whole-file digests do not mean the original copyright/permission text is absent.
[Containment evidence](fontkit-polyfill-notice-coverage.json) records the archive
hash, exact original segment offset/length/hash and official Node source context.
Both archive tests now verify this containment. No duplicate or invented notice
is added. The build-plugin package's ISC versus README MIT metadata difference
is documented, but the README explicitly defers emitted ports to original-module
terms, and those identified notices are retained.

## Result and maintenance

The machine status is now `IDENTIFIED-NOTICES-RETAINED`, with the declared MIT
basis and no concrete remaining notice gap in this scope. It is not labeled
complete legal clearance. Provenance limitations remain in `PROVENANCE.json`
separately from unmet conditions. No true unresolved applicability question was
identified that requires a decision for these reviewed portions; new evidence
can reopen the corresponding row. This does not assert a proof about every
possible unexamined contribution.

Current Unicode license bytes, policy URL/hash/review date and file-exception
review are retained. Packaging uses pinned local text and does not silently fetch
new terms. Input or notice hash changes require re-audit. All prior source/data
witnesses remain available. Native/macOS/Windows/actual-host checks remain
NOT RUN and signing/release decisions remain separate. Issues #3/#4 include these
uncompleted acceptance/release conditions, so this notice review does not close them.
