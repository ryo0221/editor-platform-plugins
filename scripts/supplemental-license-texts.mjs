import { retainFontkitEmbeddedNotices } from './fontkit-embedded-notices.mjs';
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

// Exact installed npm README bytes, verified against lockfile-integrity-checked
// official tarballs. Never synthesize a license from an SPDX label or generic MIT.
const reviewed = {
  fastdom: { version: '1.0.12', sha256: 'cc5669ab6f7741bb061c8a7244addc8e3af1f84ec7d2445744b59d0169a87d11', complete: true },
  '@pdf-lib/fontkit': { version: '1.1.1', sha256: '7315fcc54511f5ffc906969c39333f93cd47f5217ab014fe45acff14bd5ec4c0', complete: false },
};

export async function supplementLicenseTexts(pkg, packageRoot, destination, texts) {
  const review = reviewed[pkg.name];
  if (!review) return {};
  if (pkg.version !== review.version) throw Error(`Re-audit license evidence for ${pkg.name}@${pkg.version}`);
  const bytes = await readFile(join(packageRoot, 'README.md'));
  if (createHash('sha256').update(bytes).digest('hex') !== review.sha256) throw Error(`License evidence changed for ${pkg.name}`);
  await writeFile(join(destination, 'README.md'), bytes);
  const evidence = { path: 'README.md', sha256: review.sha256, source: `npm:${pkg.name}@${pkg.version}/README.md` };
  if (review.complete) {
    texts.push('README.md');
    return { licenseEvidence: { status: 'full-text-retained', ...evidence } };
  }
  const embeddedNotices = await retainFontkitEmbeddedNotices(packageRoot, destination, texts);
  return { embeddedNotices, licenseEvidence: { status: 'UNRESOLVED', ...evidence,
    reason: 'Official README contains only a generic MIT link, not the project-specific full notice. Prebundled third-party code also needs provenance review. This candidate is not cleared for publication.' } };
}
