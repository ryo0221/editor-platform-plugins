import { useContext, useLayoutEffect, useMemo, useRef } from 'react';
import { AnimationControlledSurface } from '@editor-platform/animation/controlled';
import type { AnimationContent } from '@editor-platform/animation-core';
import { EditorSession, sameLocalRevision, type EditorCommand } from '@editor-platform/editor-core';
import { EditorInputsContext } from '@editor-platform/editor-ui';
import type { AtomicSurfaceInputs, ControlledSurfaceController, ControlledSurfaceSnapshot, SurfaceOperation } from '@editor-platform/extension-contract/controlled-surface';
import { animationPlayback } from './animation-playback';

type Props = { artifactId: string; content: unknown; session: EditorSession<unknown>; readOnly: boolean; execute(command: EditorCommand<unknown>): boolean; history(direction: 'undo' | 'redo'): void };
export function AnimationSurface(props: Props) {
  const current = useRef(props); current.current = props;
  const inputs = useContext(EditorInputsContext);
  // A saved boundary replaces the Host session and therefore revokes this scope.
  const adapter = useMemo(() => {
    const listeners = new Set<() => void>();
    let group: AtomicSurfaceInputs<AnimationContent> | undefined, unregister: (() => void) | undefined, revoked = false;
    const scope = { artifactId: props.artifactId, sessionId: crypto.randomUUID(), generation: '1' };
    const snapshot = () => ({ scope, revision: current.current.session.revision, content: current.current.content as AnimationContent });
    let view: ControlledSurfaceSnapshot<AnimationContent>;
    const player = animationPlayback(() => current.current.content as AnimationContent);
    const publish = () => { view = revoked ? { state: 'revoked', code: 'ScopeRevoked' } : { state: 'open', snapshot: snapshot(), canEdit: !current.current.readOnly, canSave: false, saving: false }; listeners.forEach((fn) => fn()); };
    const refuse = (message: string): SurfaceOperation => ({ state: 'refused', code: 'HostBoundary', message });
    function apply(): SurfaceOperation {
      if (revoked || current.current.readOnly) return refuse('Editing unavailable');
      try {
        if (group?.read().composing) throw Error('Finish composition before saving');
        const prepared = group?.prepare(snapshot());
        if (!prepared) return { state: 'unchanged' };
        if (!sameLocalRevision(prepared.baseRevision, current.current.session.revision)) throw Error('Stale input revision');
        player.port.pause();
        if (prepared.command && !current.current.execute(prepared.command as EditorCommand<unknown>)) throw Error('Host refused input');
        // execute mutates the shared session synchronously; React props update later.
        current.current = { ...current.current, content: current.current.session.content };
        group?.committed(snapshot()); publish(); void player.rebuild();
        return { state: prepared.command ? 'applied' : 'unchanged' };
      } catch (error) { group?.focus(); return refuse(String(error)); }
    }
    const controller: ControlledSurfaceController<AnimationContent> = {
      version: 'controlled-surface@0-experiment', getSnapshot: () => view,
      subscribe(fn) { listeners.add(fn); return () => { listeners.delete(fn); }; },
      bindInputs(value) {
        if (group) throw Error('Duplicate Animation input group');
        group = value;
        unregister = inputs?.register({ label: value.label, read: value.read, focus: value.focus, prepare: () => {
          const prepared = value.prepare(snapshot());
          if (!sameLocalRevision(prepared.baseRevision, current.current.session.revision)) throw Error('Stale input revision');
          return () => apply().state !== 'refused';
        } });
        return { changed: () => { inputs?.changed(); }, unregister: () => { unregister?.(); unregister = undefined; group = undefined; } };
      },
      applyInputs: apply,
      execute(prepared) {
        if (revoked || current.current.readOnly || group?.read().dirty || group?.read().composing) return refuse('Editing unavailable or pending input');
        if (!sameLocalRevision(prepared.baseRevision, current.current.session.revision)) return refuse('Stale revision');
        try {
          player.port.pause();
          if (prepared.command && !current.current.execute(prepared.command as EditorCommand<unknown>)) return refuse('Host refused command');
          current.current = { ...current.current, content: current.current.session.content };
          publish(); void player.rebuild(); return { state: prepared.command ? 'applied' : 'unchanged' };
        } catch (error) { return refuse(String(error)); }
      },
      undo: () => history('undo'), redo: () => history('redo'),
      async save() { return { state: 'refused', code: 'HostSave', message: 'Use the Editor toolbar Save; it flushes inputs and uses saved-revision preconditions.' }; },
    };
    function history(direction: 'undo' | 'redo'): SurfaceOperation {
      if (revoked || current.current.readOnly || group?.read().dirty || group?.read().composing) return refuse('Editing unavailable or pending input');
      player.port.pause(); current.current.history(direction);
      current.current = { ...current.current, content: current.current.session.content };
      publish(); void player.rebuild(); return { state: 'applied' };
    }
    publish();
    return { controller, player, update: publish, revoke() { revoked = true; unregister?.(); group = undefined; player.dispose(); publish(); } };
  }, [props.session, props.artifactId, inputs]);
  useLayoutEffect(() => { adapter.update(); void adapter.player.rebuild(); }, [adapter, props.content, props.readOnly]);
  useLayoutEffect(() => () => adapter.revoke(), [adapter]);
  return <><p>Animation：矩形・グループの編集と再生。保存は上部の「保存」、出力はネイティブ JSON を使用します。</p><AnimationControlledSurface editor={adapter.controller} playback={adapter.player.port} /></>;
}
