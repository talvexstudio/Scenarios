import { useEffect, useLayoutEffect, useRef } from 'react';
import { BlocksModel } from '../types';
import { createMassingRenderer, MassingRenderer, ContextMeshPayload, TransformMode, TransformCommit } from './massingRenderer';

type RendererHostProps = {
  model?: BlocksModel | null;
  context?: ContextMeshPayload[] | null;
  autoSpin?: boolean;
  onReady?: (renderer: MassingRenderer | null) => void;
  className?: string;
  selectedBlockIds?: string[];
  onPickBlock?: (id: string | null, info?: { additive?: boolean }) => void;
  gumballEnabled?: boolean;
  gumballMode?: TransformMode;
  referenceBlockId?: string | null;
  onTransformCommit?: (payload: TransformCommit) => void;
};

export function RendererHost({
  model,
  context,
  autoSpin = false,
  onReady,
  className,
  selectedBlockIds = [],
  onPickBlock,
  gumballEnabled = false,
  gumballMode = 'translate',
  referenceBlockId = null,
  onTransformCommit
}: RendererHostProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const rendererRef = useRef<MassingRenderer | null>(null);
  const readyCallbackRef = useRef(onReady);

  useEffect(() => {
    readyCallbackRef.current = onReady;
  }, [onReady]);

  useLayoutEffect(() => {
    if (!containerRef.current || rendererRef.current) return;
    const renderer = createMassingRenderer(containerRef.current);
    rendererRef.current = renderer;
    if (import.meta.env.DEV) {
      console.log('[RendererHost] mount', { instanceId: renderer.instanceId });
    }
    readyCallbackRef.current?.(renderer);
    return () => {
      if (import.meta.env.DEV) {
        console.log('[RendererHost] unmount', { instanceId: renderer.instanceId });
      }
      renderer.dispose();
      rendererRef.current = null;
      readyCallbackRef.current?.(null);
    };
  }, []);

  useEffect(() => {
    if (!rendererRef.current) return;
    if (import.meta.env.DEV) {
      console.log('[RendererHost] apply model', { hasModel: !!model });
    }
    rendererRef.current.setModel(model ?? undefined);
  }, [model]);

  useEffect(() => {
    if (!rendererRef.current) return;
    if (import.meta.env.DEV) {
      console.log('[RendererHost] setContext', { isNull: !context, count: context?.length ?? 0 });
    }
    rendererRef.current.setContext(context ?? null).catch(() => {});
  }, [context]);

  useEffect(() => {
    rendererRef.current?.setAutoSpin(!!autoSpin);
  }, [autoSpin]);

  useEffect(() => {
    rendererRef.current?.setSelectedBlocks(selectedBlockIds ?? []);
  }, [selectedBlockIds]);

  useEffect(() => {
    rendererRef.current?.setPickHandler(onPickBlock);
  }, [onPickBlock]);

  useEffect(() => {
    if (!rendererRef.current) return;
    rendererRef.current.setTransformOptions({
      enabled: gumballEnabled,
      mode: gumballMode,
      targetId: referenceBlockId,
      onCommit: onTransformCommit
    });
  }, [gumballEnabled, gumballMode, referenceBlockId, onTransformCommit]);

  return <div ref={containerRef} className={className ?? 'h-full w-full'} />;
}
