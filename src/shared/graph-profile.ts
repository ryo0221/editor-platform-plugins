import { canonicalJson } from '@editor-platform/artifact-core';
import { assertGraph, assertGraphProfile, guardGraphCommand, relationProfile, type GraphDocument, type GraphProfile } from '@editor-platform/structured-graph/model';

// Profiles are Host-owned alongside, not inside, the native GraphDocument.
export function validateGraphSource(content: unknown, profile: unknown = relationProfile): GraphProfile {
  assertGraphProfile(profile);
  assertGraph(content as GraphDocument, profile);
  return profile;
}

export function validateGraphCandidate(before: unknown, after: unknown, profile: GraphProfile) {
  if (canonicalJson(before) === canonicalJson(after)) return;
  guardGraphCommand({ type: 'plugin.graph-candidate', label: 'Reviewed Graph candidate', apply: () => structuredClone(after as GraphDocument) }, profile)
    .apply(before as GraphDocument);
}
