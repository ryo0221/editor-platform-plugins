import { prepareRectangleAnimationV1, readAnimationV1, type AnimationContent } from '@editor-platform/animation-core';
import { mountRectanglePlayerV1, type RectanglePlayerV1 } from '@editor-platform/animation-player/v1';
import type { AnimationPlaybackPort, AnimationPlaybackSnapshot } from '@editor-platform/animation/controlled-contract';
import type { SurfaceOperation } from '@editor-platform/extension-contract/controlled-surface';

export function animationPlayback(read: () => AnimationContent) {
  let container: HTMLElement | undefined, player: RectanglePlayerV1 | undefined, generation = 0, frame = 0, rate = 1;
  const listeners = new Set<() => void>();
  let snapshot: AnimationPlaybackSnapshot = { compositionId: readAnimationV1(read()).rootCompositionId, tick: 0, duration: 0, ticksPerSecond: 240000, playing: false, ready: false };
  const publish = (patch: Partial<AnimationPlaybackSnapshot>) => { snapshot = { ...snapshot, ...patch }; listeners.forEach((fn) => fn()); };
  const disposePlayer = () => { generation++; cancelAnimationFrame(frame); player?.dispose(); player = undefined; };
  async function rebuild() {
    disposePlayer();
    const current = generation;
    publish({ ready: false, playing: false, error: undefined });
    if (!container) return;
    try {
      const content = readAnimationV1(read());
      const composition = content.compositions.find((item) => item.id === snapshot.compositionId) ?? content.compositions.find((item) => item.id === content.rootCompositionId)!;
      const source = await prepareRectangleAnimationV1(content);
      if (current !== generation || !container) return;
      player = mountRectanglePlayerV1(container, { source, compositionId: composition.id, label: 'Animation preview' });
      player.seek(Math.min(snapshot.tick, composition.duration)); player.setRate(rate);
      publish({ compositionId: composition.id, duration: composition.duration, tick: player.tick, ready: true });
      const sync = () => { if (!player || generation !== current) return; if (snapshot.tick !== player.tick || snapshot.playing !== player.playing) publish({ tick: player.tick, playing: player.playing }); frame = requestAnimationFrame(sync); };
      frame = requestAnimationFrame(sync);
    } catch (error) { if (current === generation) publish({ error: String(error), ready: false }); }
  }
  const operation = (run: () => void): SurfaceOperation => { try { run(); return { state: 'applied' }; } catch (e) { return { state: 'refused', code: 'Playback', message: String(e) }; } };
  const port: AnimationPlaybackPort = {
    getSnapshot: () => snapshot,
    subscribe(fn) { listeners.add(fn); return () => { listeners.delete(fn); }; },
    attach(element) { container = element; void rebuild(); return () => { disposePlayer(); container = undefined; }; },
    selectComposition(id) { return operation(() => { if (!readAnimationV1(read()).compositions.some((c) => c.id === id)) throw Error('Unknown composition'); publish({ compositionId: id, tick: 0 }); void rebuild(); }); },
    play: () => operation(() => { if (!player) throw Error('Player not ready'); player.play(); publish({ playing: player.playing }); }),
    pause: () => operation(() => { player?.pause(); publish({ tick: player?.tick ?? snapshot.tick, playing: false }); }),
    seek: (tick) => operation(() => { if (!player) throw Error('Player not ready'); player.pause(); player.seek(tick); publish({ tick: player.tick, playing: false }); }),
    setRate: (value) => operation(() => { if (!player) throw Error('Player not ready'); player.setRate(value); rate = value; }),
  };
  return { port, rebuild, dispose: disposePlayer };
}
