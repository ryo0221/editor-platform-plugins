import { identityTransform, readAnimationV1, type AnimationContentV1 } from '@editor-platform/animation-core';

// The public schema-1 contract is deliberately asset-free rectangle/group animation.
export function createAnimation(): AnimationContentV1 {
  return readAnimationV1({ schemaVersion: 1, ticksPerSecond: 240000, rootCompositionId: 'root', assets: [], compositions: [{
    id: 'root', width: 640, height: 360, duration: 960000, frameRate: { numerator: 30, denominator: 1 },
    layers: [{ id: 'rectangle', type: 'rect', parentId: null, start: 0, end: 960000, width: 120, height: 80, fill: '#5269c8', transform: { ...identityTransform(), x: 40, y: 100 } }],
    tracks: [{ id: 'move', layerId: 'rectangle', property: 'x', keys: [
      { id: 'start', tick: 0, value: 40, easing: { type: 'linear' } },
      { id: 'end', tick: 720000, value: 440, easing: { type: 'linear' } },
    ] }],
  }] });
}
export function validAnimation(value: unknown): boolean {
  try { readAnimationV1(value); return true; } catch { return false; }
}
