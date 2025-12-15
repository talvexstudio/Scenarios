import type { Vector3 } from 'three';
import { ChangeEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { nanoid } from 'nanoid';
import { BlockFunction, BlockParams, BlocksModel, Metrics, ScenarioOption } from '../../shared/types';
import { useBlocksStore } from '../../shared/stores/blocksStore';
import { useScenariosStore } from '../../shared/stores/scenariosStore';
import { useContextStore, ContextSnapshot } from '../../shared/stores/contextStore';
import { computeMetricsFromBlocksModel } from '../../shared/utils/metrics';
import { deepClone } from '../../shared/utils/clone';
import type { MassingRenderer } from '../../shared/three/massingRenderer';
import { RendererHost } from '../../shared/three/RendererHost';
import { formatArea, fromMeters, toMeters } from '../../shared/utils/units';
import { prepareContextPayload } from '../../shared/context/prepareContextPayload';
import { createTBKArchive, parseTBKFile } from '../../shared/utils/tbk';

type TransformState = Pick<BlockParams, 'posX' | 'posY' | 'posZ' | 'rotationZ'>;

type TransformRecord = {
  id: string;
  prev: TransformState;
  next: TransformState;
};

const pickTransformState = (block: BlockParams): TransformState => ({
  posX: block.posX,
  posY: block.posY,
  posZ: block.posZ,
  rotationZ: block.rotationZ ?? 0
});

const hasTransformChanged = (a: TransformState, b: TransformState) =>
  a.posX !== b.posX || a.posY !== b.posY || a.posZ !== b.posZ || (a.rotationZ ?? 0) !== (b.rotationZ ?? 0);

const buildTransformState = (
  block: BlockParams,
  position: Vector3,
  rotationY: number,
  units: BlocksModel['units']
): TransformState => {
  const heightMeters = toMeters(block.levelHeight * block.levels, units);
  return {
    posX: Number(fromMeters(position.x, units).toFixed(2)),
    posY: Number(fromMeters(position.y - heightMeters / 2, units).toFixed(2)),
    posZ: Number(fromMeters(position.z, units).toFixed(2)),
    rotationZ: Number(((rotationY * 180) / Math.PI).toFixed(2))
  };
};

export function BlocksPage() {
  const { blocks, units, addBlock, updateBlock, removeBlock, getModelSnapshot, resetBlocks, setUnits } =
    useBlocksStore();
  const scenarios = useScenariosStore((state) => state.options);
  const addScenario = useScenariosStore((state) => state.addOption);
  const replaceScenario = useScenariosStore((state) => state.replaceOption);
  const selectScenario = useScenariosStore((state) => state.selectOption);
  const contextCenter = useContextStore((state) => state.center);
  const contextBuildings = useContextStore((state) => state.buildings);
  const contextRadius = useContextStore((state) => state.radiusM);
  const contextLastKey = useContextStore((state) => state.lastFetchedKey);
  const getContextSnapshotForSave = useContextStore((state) => state.getSnapshotForSave);
  const applyContextSnapshot = useContextStore((state) => state.setSnapshot);
  const navigate = useNavigate();

  const [replaceCandidate, setReplaceCandidate] = useState<ScenarioOption | null>(null);
  const [pendingLoad, setPendingLoad] = useState<BlocksModel | null>(null);
  const [pendingContextSnapshot, setPendingContextSnapshot] = useState<ContextSnapshot | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const rendererRef = useRef<MassingRenderer | null>(null);
  const [rendererReady, setRendererReady] = useState(false);
  const [expandedCards, setExpandedCards] = useState<Record<string, boolean>>({});
  const [metricsOpen, setMetricsOpen] = useState(true);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [transformMode, setTransformMode] = useState<'translate' | 'rotate'>('translate');
  const blockRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const blocksRef = useRef(blocks);
  const unitsRef = useRef(units);
  const undoStackRef = useRef<TransformRecord[]>([]);
  const redoStackRef = useRef<TransformRecord[]>([]);
  const activeTransformRef = useRef<{ id: string; prev: TransformState } | null>(null);
  const handleRendererReady = useCallback((renderer: MassingRenderer | null) => {
    rendererRef.current = renderer;
    setRendererReady(!!renderer);
  }, []);

  const handleSelectBlock = useCallback((id: string | null) => {
    setSelectedBlockId(id);
    rendererRef.current?.setSelectedBlock(id);
  }, []);

  const captureTransformStart = useCallback((block: BlockParams | undefined) => {
    if (!block) return;
    if (activeTransformRef.current && activeTransformRef.current.id === block.id) return;
    activeTransformRef.current = { id: block.id, prev: pickTransformState(block) };
  }, []);

  const finalizeTransformRecord = useCallback((id: string, nextState: TransformState) => {
    const start = activeTransformRef.current;
    if (!start || start.id !== id) {
      activeTransformRef.current = null;
      return;
    }
    if (hasTransformChanged(start.prev, nextState)) {
      undoStackRef.current.push({ id, prev: start.prev, next: nextState });
      redoStackRef.current = [];
    }
    activeTransformRef.current = null;
  }, []);

  const undoLast = useCallback(() => {
    const record = undoStackRef.current.pop();
    if (!record) return;
    redoStackRef.current.push(record);
    updateBlock(record.id, record.prev);
    handleSelectBlock(record.id);
  }, [handleSelectBlock, updateBlock]);

  const redoLast = useCallback(() => {
    const record = redoStackRef.current.pop();
    if (!record) return;
    undoStackRef.current.push(record);
    updateBlock(record.id, record.next);
    handleSelectBlock(record.id);
  }, [handleSelectBlock, updateBlock]);

  const canSend = blocks.length > 0;
  const liveModel = useMemo<BlocksModel>(
    () => ({
      schemaVersion: 1,
      units,
      blocks: deepClone(blocks),
      createdAt: new Date().toISOString()
    }),
    [blocks, units]
  );

  const blocksContextPayload = useMemo(() => {
    if (!contextCenter) {
      if (import.meta.env.DEV) {
        console.log('[Blocks] Stage A skip: no center', {
          count: contextBuildings.length
        });
      }
      return null;
    }
    if (contextBuildings.length === 0) {
      if (import.meta.env.DEV) {
        console.log('[Blocks] Stage A skip: buildings empty', {
          center: contextCenter,
          radius: contextRadius
        });
      }
      return null;
    }
    if (import.meta.env.DEV) {
      console.log('[Blocks] Stage A context input', {
        count: contextBuildings.length,
        center: contextCenter,
        radius: contextRadius
      });
    }
    const { payload, stats } = prepareContextPayload(
      contextCenter,
      contextBuildings,
      contextLastKey ?? '',
      contextRadius
    );
    if (import.meta.env.DEV) {
      console.log('[Blocks] Stage B context stats', stats);
    }
    return payload;
  }, [contextCenter, contextBuildings, contextLastKey, contextRadius]);

  useEffect(() => {
    if (blocksContextPayload && !rendererReady && import.meta.env.DEV) {
      console.log('[Blocks] Stage A note: renderer not ready', {
        count: contextBuildings.length
      });
    }
  }, [blocksContextPayload, contextBuildings.length, rendererReady]);

  useEffect(() => {
    blocksRef.current = blocks;
  }, [blocks]);

  useEffect(() => {
    const validIds = new Set(blocks.map((block) => block.id));
    undoStackRef.current = undoStackRef.current.filter((record) => validIds.has(record.id));
    redoStackRef.current = redoStackRef.current.filter((record) => validIds.has(record.id));
  }, [blocks]);

  useEffect(() => {
    unitsRef.current = units;
  }, [units]);

  useEffect(() => {
    if (!rendererReady) return;
    rendererRef.current?.setTransformMode(transformMode);
  }, [rendererReady, transformMode]);

  useEffect(() => {
    const renderer = rendererRef.current;
    if (!rendererReady || !renderer) return;
    renderer.setSelectionHandlers({
      enabled: true,
      onSelect: (id) => setSelectedBlockId(id),
      onDeselect: () => setSelectedBlockId(null),
      onTransformChange: ({ id }) => {
        const currentBlocks = blocksRef.current;
        const block = currentBlocks.find((b) => b.id === id);
        captureTransformStart(block);
      },
      onTransform: ({ id, position, rotationY }) => {
        const currentUnits = unitsRef.current;
        const block = blocksRef.current.find((b) => b.id === id);
        if (!block) return;
        const nextState = buildTransformState(block, position, rotationY, currentUnits);
        const start = activeTransformRef.current;
        if (start && start.id === id && hasTransformChanged(start.prev, nextState)) {
          finalizeTransformRecord(id, nextState);
        } else {
          activeTransformRef.current = null;
        }
        updateBlock(id, nextState);
      }
    });
    return () => renderer.setSelectionHandlers(undefined);
  }, [rendererReady, captureTransformStart, finalizeTransformRecord, updateBlock]);

  useEffect(() => {
    if (!blocks.length) {
      setSelectedBlockId(null);
      return;
    }
    if (selectedBlockId && !blocks.some((block) => block.id === selectedBlockId)) {
      setSelectedBlockId(blocks[0].id);
    }
  }, [blocks, selectedBlockId]);

  useEffect(() => {
    if (selectedBlockId) {
      blockRefs.current[selectedBlockId]?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
    rendererRef.current?.setSelectedBlock(selectedBlockId);
  }, [selectedBlockId, rendererReady]);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && ['INPUT', 'SELECT', 'TEXTAREA'].includes(target.tagName)) return;
      const isModifier = event.ctrlKey || event.metaKey;
      if (isModifier && (event.key === 'z' || event.key === 'Z')) {
        event.preventDefault();
        undoLast();
        return;
      }
      if (isModifier && (event.key === 'r' || event.key === 'R')) {
        event.preventDefault();
        redoLast();
        return;
      }
      if (event.key === 'g' || event.key === 'G') {
        setTransformMode('translate');
      } else if (!isModifier && (event.key === 'r' || event.key === 'R')) {
        setTransformMode('rotate');
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [redoLast, undoLast]);

  useEffect(() => {
    setExpandedCards((prev) => {
      const next = { ...prev };
      blocks.forEach((block, index) => {
        if (!(block.id in next)) {
          next[block.id] = index === 0;
        }
      });
      return next;
    });
  }, [blocks]);

  const workshopMetrics = useMemo(() => computeMetricsFromBlocksModel(liveModel), [liveModel]);

  const handleFieldChange = (id: string, field: keyof BlockParams, value: string) => {
    const numericFields: Array<keyof typeof blocks[number]> = [
      'xSize',
      'ySize',
      'levels',
      'levelHeight',
      'posX',
      'posY',
      'posZ'
    ];
    const parsedValue = numericFields.includes(field) ? Number(value) : value;
    updateBlock(id, { [field]: parsedValue } as any);
  };

  const handleSend = () => {
    if (!canSend) return;
    const model = getModelSnapshot();
    const option = buildScenarioOption(model);
    if (scenarios.length < 3) {
      addScenario(option);
      selectScenario(option.id);
      navigate('/scenarios');
    } else {
      setReplaceCandidate(option);
    }
  };

  const handleReplace = (targetId: string) => {
    if (!replaceCandidate) return;
    replaceScenario(targetId, replaceCandidate);
    selectScenario(replaceCandidate.id);
    setReplaceCandidate(null);
    navigate('/scenarios');
  };

  const handleSave = async () => {
    const model = getModelSnapshot();
    const contextSnapshot = getContextSnapshotForSave();
    try {
      const blob = await createTBKArchive(model, contextSnapshot);
      const timestamp = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${timestamp}_Talvex_block.TBK`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error(error);
      alert('Failed to save TBK file.');
    }
  };

  const handleLoad = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const { model, context } = await parseTBKFile(file);
      validateTBK(model);
      setPendingLoad(model);
      setPendingContextSnapshot(context);
    } catch (error) {
      console.error(error);
      alert('Invalid TBK file.');
    } finally {
      event.target.value = '';
    }
  };

  const confirmLoad = () => {
    if (pendingLoad) {
      resetBlocks(pendingLoad);
      applyContextSnapshot(pendingContextSnapshot);
      setPendingLoad(null);
      setPendingContextSnapshot(null);
    }
  };

  const cancelLoad = () => {
    setPendingLoad(null);
    setPendingContextSnapshot(null);
  };

  const duplicateBlock = (block: BlockParams) => {
    addBlock();
    const currentBlocks = useBlocksStore.getState().blocks;
    const newest = currentBlocks[currentBlocks.length - 1];
    if (newest) {
      updateBlock(newest.id, {
        ...block,
        id: newest.id,
        name: `${block.name} copy`,
        posX: block.posX + 2,
        posZ: block.posZ + 2,
        rotationZ: block.rotationZ ?? 0
      });
    }
  };

  const toggleCard = (id: string) => {
    setExpandedCards((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="flex h-full flex-1 min-h-0 flex-col gap-6 pb-6">
      <div className="flex flex-1 min-h-0 flex-col gap-6 lg:flex-row">
        <section className="relative flex-1 min-h-0 overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow">
          <RendererHost
            model={liveModel}
            context={blocksContextPayload}
            onReady={handleRendererReady}
            className="h-full w-full min-h-[420px] rounded-[24px] bg-[#f4f6fb]"
          />
          <MetricsPanel
            open={metricsOpen}
            onToggle={() => setMetricsOpen((prev) => !prev)}
            metrics={workshopMetrics}
          />
          {selectedBlockId && (
            <div className="absolute bottom-5 left-5 flex items-center gap-0 rounded-full border border-white/40 bg-white/90 p-0.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#6c788f] shadow-[0_10px_30px_rgba(12,18,32,0.25)] backdrop-blur-sm">
              <button
                type="button"
                onClick={() => setTransformMode('translate')}
                className={`px-4 py-1 rounded-full transition ${
                  transformMode === 'translate'
                    ? 'bg-[#111a2c] text-white'
                    : 'text-[#6c788f] hover:text-[#111a2c]'
                }`}
              >
                Move
              </button>
              <button
                type="button"
                onClick={() => setTransformMode('rotate')}
                className={`px-4 py-1 rounded-full transition ${
                  transformMode === 'rotate'
                    ? 'bg-[#111a2c] text-white'
                    : 'text-[#6c788f] hover:text-[#111a2c]'
                }`}
              >
                Rotate
              </button>
            </div>
          )}
        </section>

        <aside className="w-full lg:max-w-[400px] rounded-[32px] border border-[#dfe4ef] bg-[#f9fafc] shadow-[0_18px_45px_rgba(15,23,42,0.15)] flex flex-col lg:sticky lg:top-6 max-h-[calc(100vh-120px)] overflow-hidden">
          <div className="px-6 pt-7 pb-3 text-center">
            <p className="text-xs tracking-[0.3em] uppercase text-[#7b8ba3]">Talvex Workshop</p>
            <h1 className="text-2xl font-semibold text-[#2a3141]">Blocks</h1>
            <div className="mx-auto mt-4 h-[2px] w-20 rounded-full bg-[#d1d6e3]" />
          </div>

          <div className="px-6 pb-4">
            <button
              type="button"
              onClick={addBlock}
              className="w-full rounded-[20px] border border-dashed border-[#c4ccdc] bg-white px-4 py-3 text-sm font-semibold text-[#48608a] hover:border-[#9aa6bf] flex items-center justify-center gap-2 transition"
            >
              <span className="text-lg leading-none text-[#4f6cd2]">+</span>
              Add New Block
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-6 pb-8 space-y-4">
            {blocks.map((block, index) => (
              <BlockCard
                key={block.id}
                block={block}
                units={units}
                expanded={!!expandedCards[block.id]}
                onToggle={() => toggleCard(block.id)}
                onChange={handleFieldChange}
                onDuplicate={() => duplicateBlock(block)}
                onRemove={() => removeBlock(block.id)}
                disableRemove={blocks.length === 1}
                showUnitsSelector={index === 0}
                setUnits={setUnits}
                selected={block.id === selectedBlockId}
                onSelect={() => handleSelectBlock(block.id)}
                registerRef={(node) => {
                  blockRefs.current[block.id] = node;
                }}
              />
            ))}
          </div>

          <div className="sticky bottom-0 border-t border-slate-200 bg-[#f9fafc] px-6 py-4 flex flex-col gap-3">
            <button
              type="button"
              onClick={handleSend}
              disabled={!canSend}
              className="rounded-full bg-[#2f6dea] px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50 flex items-center justify-center gap-2 shadow-[0_10px_25px_rgba(37,99,235,0.35)] transition hover:bg-[#2256c8]"
            >
              Send to Scenarios <span className="text-lg leading-none">?</span>
            </button>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleSave}
                className="flex-1 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-[#4b5566] flex items-center justify-center gap-2"
              >
                <span role="img" aria-hidden="true">
                  ??
                </span>
                Save .TBK
              </button>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex-1 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-[#4b5566] flex items-center justify-center gap-2"
              >
                <span role="img" aria-hidden="true">
                  ??
                </span>
                Load .TBK
              </button>
            </div>
          </div>
        </aside>
      </div>

      <input
        type="file"
        accept=".TBK,application/json"
        ref={fileInputRef}
        onChange={handleLoad}
        className="hidden"
      />

      {replaceCandidate && (
        <div className="modal-overlay">
          <div className="modal-card">
            <h3 className="text-lg font-semibold mb-2">Replace an existing option?</h3>
            <p className="text-sm text-slate-600 mb-4">You already have three options. Choose one to replace.</p>
            <div className="flex flex-col gap-2 mb-4">
              {scenarios.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => handleReplace(option.id)}
                  className="rounded border border-slate-200 px-4 py-2 text-left hover:border-slate-400"
                >
                  <div className="text-sm font-semibold">{option.name}</div>
                  <div className="text-xs text-slate-500">{new Date(option.createdAt).toLocaleString()}</div>
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setReplaceCandidate(null)}
              className="rounded-full border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {pendingLoad && (
        <div className="modal-overlay">
          <div className="modal-card">
            <h3 className="text-lg font-semibold mb-2">Load option?</h3>
            <p className="text-sm text-slate-600 mb-4">Loading will overwrite the current workshop blocks.</p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={confirmLoad}
                className="rounded-full bg-[#2563eb] px-4 py-2 text-sm font-semibold text-white"
              >
                Load
              </button>
              <button
                type="button"
                onClick={cancelLoad}
                className="rounded-full border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function buildScenarioOption(model: BlocksModel): ScenarioOption {
  const name = `Workshop option ${new Date().toLocaleTimeString()}`;
  return {
    id: nanoid(),
    name,
    createdAt: new Date().toISOString(),
    source: 'blocks',
    model: {
      ...model,
      blocks: deepClone(model.blocks)
    },
    metrics: computeMetricsFromBlocksModel(model)
  };
}

function validateTBK(model: any): asserts model is BlocksModel {
  if (model.schemaVersion !== 1) throw new Error('Unsupported schema version');
  if (model.units !== 'metric' && model.units !== 'imperial') throw new Error('Invalid units');
  if (!Array.isArray(model.blocks)) throw new Error('Invalid blocks');
  model.blocks.forEach((block: any) => {
    if (!block.id || typeof block.name !== 'string') throw new Error('Invalid block');
  });
}

const FUNCTION_COLORS: Record<BlockFunction, { label: string; color: string }> = {
  Retail: { label: 'Retail', color: '#f17373' },
  Office: { label: 'Office', color: '#4f6cd2' },
  Residential: { label: 'Residential', color: '#f6c95a' },
  Mixed: { label: 'Mixed-use', color: '#73c6a2' },
  Others: { label: 'Others', color: '#c5ccd6' }
};

const PROGRAM_BADGES: Record<BlockFunction, { bg: string; icon: string }> = {
  Retail: { bg: 'bg-[#fde7e7]', icon: '🛍️' },
  Office: { bg: 'bg-[#e3e9ff]', icon: '🏢' },
  Residential: { bg: 'bg-[#fff3da]', icon: '🏘️' },
  Mixed: { bg: 'bg-[#e0f6ec]', icon: '🏗️' },
  Others: { bg: 'bg-[#e8ebf3]', icon: '⬚' }
};

type BlockCardProps = {
  block: BlockParams;
  units: BlocksModel['units'];
  expanded: boolean;
  onToggle: () => void;
  onChange: (id: string, field: keyof BlockParams, value: string) => void;
  onDuplicate: () => void;
  onRemove: () => void;
  disableRemove: boolean;
  showUnitsSelector: boolean;
  setUnits: (units: BlocksModel['units']) => void;
  selected: boolean;
  onSelect: () => void;
  registerRef?: (node: HTMLDivElement | null) => void;
};

function BlockCard({
  block,
  units,
  expanded,
  onToggle,
  onChange,
  onDuplicate,
  onRemove,
  disableRemove,
  showUnitsSelector,
  setUnits,
  selected,
  onSelect,
  registerRef
}: BlockCardProps) {
  const blockGfa = toMeters(block.xSize, units) * toMeters(block.ySize, units) * block.levels;
  const summary = `${formatArea(blockGfa, units)} \u00b7 ${block.levels} Levels`;
  const programColor = FUNCTION_COLORS[block.defaultFunction].color;
  const badge = PROGRAM_BADGES[block.defaultFunction];

  const cardClasses = [
    'rounded-[28px] border border-[#e0e6f4] bg-white shadow-[0_12px_30px_rgba(32,40,62,0.08)] transition focus-within:ring-2 focus-within:ring-[#4f6cd2]/40',
    selected ? 'border-[#4f6cd2] bg-[#edf1ff]' : ''
  ].join(' ');

  return (
    <div
      ref={(node) => registerRef?.(node)}
      className={cardClasses}
      onMouseDown={onSelect}
      onFocusCapture={onSelect}
    >
      <button
        type="button"
        onClick={() => {
          onSelect();
          onToggle();
        }}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
      >
        <div className="flex items-center gap-3">
          <span className={`flex h-10 w-10 items-center justify-center rounded-full ${badge.bg}`}>
            <span className="text-lg" role="img" aria-hidden="true">
              {badge.icon}
            </span>
          </span>
          <div>
            <div className="text-sm font-semibold" style={{ color: programColor }}>
              {block.name}
            </div>
            <div className="text-xs text-[#7f8aa4]">{summary}</div>
          </div>
        </div>
        <span className="text-lg text-[#98a7c4]">{expanded ? '▲' : '▼'}</span>
      </button>

      {expanded && (
        <div className="px-4 pb-4 pt-1 space-y-4 text-sm text-slate-700">
          <div className="flex items-center justify-between text-xs font-medium text-[#95a2bf]">
            <button type="button" onClick={onDuplicate} className="flex items-center gap-1 hover:text-[#4f6cd2]">
              <span role="img" aria-hidden="true">
                ⎘
              </span>
              Duplicate
            </button>
            <button
              type="button"
              onClick={onRemove}
              disabled={disableRemove}
              className="flex items-center gap-1 hover:text-[#f17373] disabled:opacity-40"
            >
              <span role="img" aria-hidden="true">
                🗑️
              </span>
              Remove
            </button>
          </div>

          {showUnitsSelector && (
            <div className="flex flex-col gap-1">
              <label className="text-xs uppercase tracking-[0.2em] text-[#8a95ad]">Units</label>
              <select
                value={units}
                onChange={(event) => setUnits(event.target.value as BlocksModel['units'])}
                className="rounded-[16px] border border-[#d7deef] px-3 py-2 text-sm bg-white"
              >
                <option value="metric">Metric (m)</option>
                <option value="imperial">Imperial (ft)</option>
              </select>
            </div>
          )}

          <SliderControl
            label="Width"
            value={block.xSize}
            min={5}
            max={80}
            step={0.5}
            onChange={(value) => onChange(block.id, 'xSize', value)}
          />
          <SliderControl
            label="Depth"
            value={block.ySize}
            min={5}
            max={80}
            step={0.5}
            onChange={(value) => onChange(block.id, 'ySize', value)}
          />

          <LevelsHeightRow
            levels={block.levels}
            levelHeight={block.levelHeight}
            units={units}
            onLevelsChange={(next) => onChange(block.id, 'levels', String(next))}
            onHeightChange={(value) => onChange(block.id, 'levelHeight', value)}
          />

          <PositionRow block={block} onChange={onChange} />

          <div className="flex flex-col gap-1">
            <label className="text-xs uppercase tracking-[0.2em] text-[#8a95ad]">Program</label>
            <select
              value={block.defaultFunction}
              onChange={(event) => onChange(block.id, 'defaultFunction', event.target.value)}
              className="rounded-[16px] border border-[#d7deef] px-3 py-2 text-sm bg-white"
            >
              {Object.entries(FUNCTION_COLORS).map(([key, meta]) => (
                <option key={key} value={key}>
                  {meta.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}
    </div>
  );
}

type SliderControlProps = {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: string) => void;
};

function SliderControl({ label, value, min, max, step, onChange }: SliderControlProps) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between text-xs uppercase tracking-[0.2em] text-[#8a95ad]">
        <span>{label}</span>
        <span className="text-[#111a2c] font-semibold">{Number(value).toFixed(2)}</span>
      </div>
      <div className="flex items-center gap-3">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="flex-1 accent-[#4f6cd2]"
        />
        <input
          type="number"
          min={min}
          max={max}
          step={step}
          value={Number(value).toFixed(2)}
          onChange={(event) => onChange(event.target.value)}
          className="w-24 rounded-[16px] border border-[#d7deef] px-2 py-1 text-sm text-right bg-white"
        />
      </div>
    </div>
  );
}

type LevelsHeightRowProps = {
  levels: number;
  levelHeight: number;
  units: BlocksModel['units'];
  onLevelsChange: (next: number) => void;
  onHeightChange: (value: string) => void;
};

function LevelsHeightRow({ levels, levelHeight, units, onLevelsChange, onHeightChange }: LevelsHeightRowProps) {
  const stepLevel = (delta: number) => {
    const next = Math.min(60, Math.max(1, levels + delta));
    onLevelsChange(next);
  };

  return (
    <div className="grid grid-cols-2 gap-4">
      <div className="flex flex-col gap-2">
        <label className="text-xs uppercase tracking-[0.2em] text-[#8a95ad]">Levels</label>
        <div className="flex items-center justify-between rounded-[16px] border border-[#d7deef] px-2 py-1 bg-white">
          <button type="button" onClick={() => stepLevel(-1)} className="px-2 text-lg text-[#4f6cd2]">
            -
          </button>
          <span className="text-base font-semibold">{levels}</span>
          <button type="button" onClick={() => stepLevel(1)} className="px-2 text-lg text-[#4f6cd2]">
            +
          </button>
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <label className="text-xs uppercase tracking-[0.2em] text-[#8a95ad]">Level Height (m)</label>
        <div className="flex items-center gap-2 rounded-[16px] border border-[#d7deef] px-3 py-2 bg-white">
          <input
            type="number"
            step={0.1}
            min={2.5}
            max={6}
            value={Number(levelHeight).toFixed(2)}
            onChange={(event) => onHeightChange(event.target.value)}
            className="w-full bg-transparent text-sm"
          />
          <span className="text-xs text-slate-500">{units === 'metric' ? 'm' : 'ft'}</span>
        </div>
      </div>
    </div>
  );
}

type PositionRowProps = {
  block: BlockParams;
  onChange: (id: string, field: keyof BlockParams, value: string) => void;
};

function PositionRow({ block, onChange }: PositionRowProps) {
  return (
    <div className="flex flex-col gap-2">
      <label className="text-xs uppercase tracking-[0.2em] text-[#8a95ad]">Position (x, y, z)</label>
      <div className="grid grid-cols-3 gap-3">
        {(['posX', 'posY', 'posZ'] as Array<keyof BlockParams>).map((axis) => (
          <div key={axis} className="flex flex-col gap-1">
            <span className="text-[11px] uppercase tracking-[0.2em] text-[#b3bcd3]">{axis.toUpperCase()}</span>
            <input
              type="number"
              value={block[axis] as number}
              onChange={(event) => onChange(block.id, axis, event.target.value)}
              className="rounded-[14px] border border-[#d7deef] px-2 py-1 text-sm bg-white"
            />
          </div>
        ))}
      </div>
    </div>
  );
}

type MetricsPanelProps = {
  open: boolean;
  onToggle: () => void;
  metrics: Metrics;
};

function MetricsPanel({ open, onToggle, metrics }: MetricsPanelProps) {
  const byFunction = Object.entries(FUNCTION_COLORS);
  const hasValue = (key: string) => (metrics.gfaByFunction[key as BlockFunction] || 0) > 0;

  return (
    <div className="absolute left-6 top-6 w-[265px] rounded-[28px] border border-[#203047] bg-[#edf0f4] text-[#232f3f] shadow-[0_18px_38px_rgba(12,20,33,0.35)]">
      <header className="flex items-center justify-between px-4 pt-4 pb-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.38em] text-[#5f6d82]">Metrics</p>
        <button
          type="button"
          onClick={onToggle}
          aria-label="Toggle metrics"
          className="text-[#5f6d82] text-lg leading-none hover:text-[#1f2a38]"
        >
          {open ? '−' : '+'}
        </button>
      </header>
      {open && (
        <div className="px-4 pb-4 text-[13px] leading-5">
          <div className="flex flex-col gap-1 border-b border-[#c5cad3] pb-3">
            <div className="flex items-center justify-between">
              <span>Total GFA</span>
              <span className="font-semibold text-[#101828]">{formatArea(metrics.totalGFA, metrics.units)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Total Levels</span>
              <span className="font-semibold text-[#101828]">{metrics.totalLevels}</span>
            </div>
          </div>

          <div className="pt-3 text-[11px] uppercase tracking-[0.32em] text-[#5f6d82]">By Function</div>
          <div className="mt-1 flex flex-col gap-1.5">
            {byFunction.map(([key, meta]) => (
              <div key={key} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: meta.color }} />
                  <span className={hasValue(key) ? 'text-[#2563eb] font-semibold' : ''}>{meta.label}</span>
                </div>
                <span className="font-semibold text-[#111927]">
                  {formatArea(metrics.gfaByFunction[key as BlockFunction] || 0, metrics.units)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
