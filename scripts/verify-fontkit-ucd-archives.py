"""Verify official archived UCD bytes against retained evidence; no downloads."""
import hashlib
import json
import pathlib
import zipfile

root = pathlib.Path(__file__).resolve().parents[1]
evidence = json.loads((root / 'docs/license-audits/fontkit-unicode-evidence.json').read_text())
manifest = json.loads((root / 'licenses/fontkit-1.1.1/PROVENANCE.json').read_text())
for version, key, package in [
    ('8.0.0', 'officialFiles8', 'work/unicode-followup/codepoints-1.2.0/package/data'),
    ('12.0.0', 'officialFiles12', 'work/fontkit-closure/codepoints-1.3.0/package/data'),
]:
    archive = root / f'work/unicode-followup/UCD-{version}.zip'
    notice = next(item for item in manifest['files'] if item['file'] == f'Unicode-{version}-ReadMe.txt')
    assert hashlib.sha256(archive.read_bytes()).hexdigest() == notice['source']['archiveSha256']
    with zipfile.ZipFile(archive) as source:
        for item in evidence[key]:
            data = (root / package / item['path']).read_bytes()
            assert hashlib.sha256(data).hexdigest() == item['sha256']
            assert source.read(item['path']) == data
        assert source.read('ReadMe.txt') == (root / 'licenses/fontkit-1.1.1' / notice['file']).read_bytes()
    print(f'Unicode {version}: {len(evidence[key])} source files and original ReadMe match')
