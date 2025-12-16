import { ChangeEvent, ComponentType, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { nanoid } from 'nanoid';
import { BlockFunction, BlockParams, BlocksModel, Metrics, ScenarioOption } from '../../shared/types';
import { useBlocksStore } from '../../shared/stores/blocksStore';
import { useScenariosStore } from '../../shared/stores/scenariosStore';
import { useContextStore, ContextSnapshot } from '../../shared/stores/contextStore';
import { computeMetricsFromBlocksModel } from '../../shared/utils/metrics';
import { deepClone } from '../../shared/utils/clone';
import { RendererHost } from '../../shared/three/RendererHost';
import { formatArea, toMeters } from '../../shared/utils/units';
import { prepareContextPayload } from '../../shared/context/prepareContextPayload';
import { createTBKArchive, parseTBKFile } from '../../shared/utils/tbk';
import {
  AlignVerticalCenter,
  ArrowDownToLine,
  ArrowLeftRight,
  ArrowRight,
  ArrowUpDown,
  ChevronDown,
  ChevronUp,
  Copy as CopyIcon,
  Crosshair,
  Download,
  Layers,
  Plus,
  RefreshCw,
  RotateCcw,
  Trash2
} from '../../shared/ui/icons';

type PowerToolAction =
  | 'reset-position'
  | 'center-origin'
  | 'set-z-zero'
  | 'align-x'
  | 'align-y'
  | 'align-z'
  | 'stack';

export function BlocksPage() {
  const { blocks, units, addBlock, updateBlock, removeBlock, getModelSnapshot, resetBlocks, setUnits } =
    useBlocksStore();
  const selectedBlockIds = useBlocksStore((state) => state.selectedBlockIds);
  const selectBlock = useBlocksStore((state) => state.selectBlock);
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
  const blockRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [expandedCards, setExpandedCards] = useState<Record<string, boolean>>({});
  const [metricsOpen, setMetricsOpen] = useState(true);

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

  const selectionCount = selectedBlockIds.length;
  const referenceBlockId = selectedBlockIds[0] ?? null;
  const referenceBlock = useMemo(
    () => (referenceBlockId ? blocks.find((block) => block.id === referenceBlockId) ?? null : null),
    [blocks, referenceBlockId]
  );

  const blocksContextPayload = useMemo(() => {
    if (!contextCenter || contextBuildings.length === 0) {
      return null;
    }
    const { payload } = prepareContextPayload(
      contextCenter,
      contextBuildings,
      contextLastKey ?? '',
      contextRadius
    );
    return payload;
  }, [contextCenter, contextBuildings, contextLastKey, contextRadius]);

  const handleRendererPick = useCallback(
    (blockId: string | null, info?: { additive?: boolean }) => {
      if (blockId) {
        selectBlock(blockId, info?.additive ?? false);
      } else {
        selectBlock(null);
      }
    },
    [selectBlock]
  );

  const handlePowerTool = useCallback(
    (action: PowerToolAction) => {
      console.log('[Blocks][PowerTool]', {
        action,
        selectedBlockIds,
        referenceId: referenceBlockId
      });
    },
    [selectedBlockIds, referenceBlockId]
  );

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

  useEffect(() => {
    if (!blocks.length) {
      selectBlock(null);
    }
  }, [blocks.length, selectBlock]);

  const lastSelectedId = selectedBlockIds[selectedBlockIds.length - 1];

  useEffect(() => {
    if (lastSelectedId) {
      blockRefs.current[lastSelectedId]?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [lastSelectedId]);

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
            selectedBlockIds={selectedBlockIds}
            onPickBlock={handleRendererPick}
            className="h-full w-full min-h-[420px] rounded-[24px] bg-[#f4f6fb]"
          />
          <MetricsPanel
            open={metricsOpen}
            onToggle={() => setMetricsOpen((prev) => !prev)}
            metrics={workshopMetrics}
          />
          <PowerToolsHud
            selectionCount={selectionCount}
            referenceName={referenceBlock?.name ?? null}
            onAction={handlePowerTool}
          />
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
              <Plus className="text-[#4f6cd2]" />
              Add New Block
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-6 pb-8 space-y-4">
            {blocks.map((block, index) => {
              const isSelected = selectedBlockIds.includes(block.id);
              const isReference = referenceBlockId === block.id;
              return (
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
                  selected={isSelected}
                  isReference={isReference}
                  onSelect={(additive) => selectBlock(block.id, additive)}
                  registerRef={(node) => {
                    blockRefs.current[block.id] = node;
                  }}
                />
              );
            })}
          </div>

          <div className="sticky bottom-0 border-t border-slate-200 bg-[#f9fafc] px-6 py-4 flex flex-col gap-3">
            <button
              type="button"
              onClick={handleSend}
              disabled={!canSend}
              className="rounded-full bg-[#2f6dea] px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50 flex items-center justify-center gap-2 shadow-[0_10px_25px_rgba(37,99,235,0.35)] transition hover:bg-[#2256c8]"
            >
              Send to Scenarios
              <ArrowRight className="text-white" />
            </button>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleSave}
                className="flex-1 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-[#4b5566] flex items-center justify-center gap-2"
              >
                <Download />
                Save .TBK
              </button>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex-1 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-[#4b5566] flex items-center justify-center gap-2"
              >
                <RefreshCw />
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
  isReference: boolean;
  onSelect: (additive: boolean) => void;
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
  isReference,
  onSelect,
  registerRef
}: BlockCardProps) {
  const blockGfa = toMeters(block.xSize, units) * toMeters(block.ySize, units) * block.levels;
  const summary = `${formatArea(blockGfa, units)} \u00b7 ${block.levels} Levels`;
  const programColor = FUNCTION_COLORS[block.defaultFunction].color;
  const badge = PROGRAM_BADGES[block.defaultFunction];
  const cardClasses = [
    'relative rounded-[28px] border border-[#e0e6f4] bg-white shadow-[0_12px_30px_rgba(32,40,62,0.08)] transition focus-within:ring-2 focus-within:ring-[#4f6cd2]/40',
    selected ? 'border-[#4f6cd2] bg-[#edf1ff] ring-2 ring-offset-2 ring-offset-[#f6f8ff] ring-[#4f6cd2]/60' : ''
  ].join(' ');
  const contentId = `block-card-${block.id}`;

  return (
    <div
      ref={(node) => registerRef?.(node)}
      className={cardClasses}
      onMouseDown={(event) => onSelect(event.ctrlKey || event.metaKey)}
      onFocusCapture={() => onSelect(false)}
    >
      {isReference && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute left-0 top-3 bottom-3 w-1.5 rounded-full bg-[#4f6cd2]"
        />
      )}
      <div className="flex items-center justify-between gap-3 px-4 py-3">
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onSelect(event.ctrlKey || event.metaKey);
          }}
          className="flex flex-1 items-center gap-3 text-left"
        >
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
        </button>
        <button
          type="button"
          aria-expanded={expanded}
          aria-controls={contentId}
          onClick={(event) => {
            event.stopPropagation();
            onSelect(event.ctrlKey || event.metaKey);
            onToggle();
          }}
          className="inline-flex h-8 w-8 items-center justify-center rounded-full text-[#98a7c4] hover:bg-[#eef2ff]"
        >
          {expanded ? <ChevronUp className="text-[#98a7c4]" /> : <ChevronDown className="text-[#98a7c4]" />}
        </button>
      </div>

      {expanded && (
        <div id={contentId} className="px-4 pb-4 pt-1 space-y-4 text-sm text-slate-700">
          <div className="flex items-center justify-between text-xs font-medium text-[#95a2bf]">
            <button type="button" onClick={onDuplicate} className="flex items-center gap-1 hover:text-[#4f6cd2]">
              <CopyIcon className="h-4 w-4" />
              Duplicate
            </button>
            <button
              type="button"
              onClick={onRemove}
              disabled={disableRemove}
              className="flex items-center gap-1 hover:text-[#f17373] disabled:opacity-40"
            >
              <Trash2 className="h-4 w-4" />
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
          <AnglesRow block={block} />

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

type PowerToolsHudProps = {
  selectionCount: number;
  referenceName: string | null;
  onAction: (action: PowerToolAction) => void;
};

const POWER_TOOL_BUTTONS: Array<{
  id: PowerToolAction;
  label: string;
  icon: ComponentType<{ className?: string }>;
  minSelected: number;
}> = [
  { id: 'reset-position', label: 'Reset Position', icon: RotateCcw, minSelected: 1 },
  { id: 'center-origin', label: 'Center to Origin', icon: Crosshair, minSelected: 1 },
  { id: 'set-z-zero', label: 'Set Z = 0', icon: ArrowDownToLine, minSelected: 1 },
  { id: 'align-x', label: 'Align X', icon: ArrowLeftRight, minSelected: 2 },
  { id: 'align-y', label: 'Align Y', icon: ArrowUpDown, minSelected: 2 },
  { id: 'align-z', label: 'Align Z', icon: AlignVerticalCenter, minSelected: 2 },
  { id: 'stack', label: 'Stack on Ref', icon: Layers, minSelected: 2 }
];

function PowerToolsHud({ selectionCount, referenceName, onAction }: PowerToolsHudProps) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="pointer-events-none absolute bottom-4 left-4 z-30">
      <div className="pointer-events-auto rounded-[20px] border border-white/50 bg-white/90 px-4 py-2 shadow-[0_18px_45px_rgba(15,23,42,0.15)] backdrop-blur-md">
        <div className="flex items-center justify-between">
          <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-[#6d768f]">Power Tools</p>
          <button
            type="button"
            onClick={() => setCollapsed((prev) => !prev)}
            className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-white/70 text-[#4b5672] shadow hover:bg-white"
          >
            {collapsed ? <ChevronUp /> : <ChevronDown />}
          </button>
        </div>
        {!collapsed && (
          <>
            <div className="mt-2 flex items-center justify-between gap-1.5 w-[420px]">
              {POWER_TOOL_BUTTONS.map((btn) => {
                const enabled = selectionCount >= btn.minSelected;
                const Icon = btn.icon;
                return (
                  <button
                    type="button"
                    key={btn.id}
                    disabled={!enabled}
                    onClick={() => enabled && onAction(btn.id)}
                    className="group relative flex h-9 w-9 items-center justify-center rounded-lg text-[#1f2740] transition hover:bg-[#ecf0fb] disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <Icon className="h-4 w-4" />
                    <span className="pointer-events-none absolute bottom-full left-1/2 mb-1 -translate-x-1/2 rounded-md bg-[#1f2740] px-2 py-1 text-[10px] text-white opacity-0 transition-opacity group-hover:opacity-100">
                      {btn.label}
                    </span>
                  </button>
                );
              })}
            </div>
            {selectionCount >= 2 && (
              <p className="mt-1 text-[11px] text-[#5d6785]">
                Reference: <span className="font-semibold text-[#1f2740]">{referenceName ?? '—'}</span>
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}

type PositionRowProps = {
  block: BlockParams;
  onChange: (id: string, field: keyof BlockParams, value: string) => void;
};

const POSITION_FIELDS: Array<{ label: string; field: keyof BlockParams }> = [
  { label: 'X', field: 'posX' },
  { label: 'Y', field: 'posZ' },
  { label: 'Z', field: 'posY' }
];

function PositionRow({ block, onChange }: PositionRowProps) {
  return (
    <div className="flex flex-col gap-2">
      <label className="text-xs uppercase tracking-[0.2em] text-[#8a95ad]">Position (x, y, z)</label>
      <div className="grid grid-cols-3 gap-3">
        {POSITION_FIELDS.map(({ label, field }) => (
          <div key={field} className="flex flex-col gap-1">
            <span className="text-[11px] uppercase tracking-[0.2em] text-[#b3bcd3]">{label}</span>
            <input
              type="number"
              value={block[field] as number}
              onChange={(event) => onChange(block.id, field, event.target.value)}
              className="rounded-[14px] border border-[#d7deef] px-2 py-1 text-sm bg-white"
            />
          </div>
        ))}
      </div>
    </div>
  );
}

function AnglesRow({ block }: { block: BlockParams }) {
  const angles = {
    rotationX: block.rotationX ?? 0,
    rotationY: block.rotationY ?? 0,
    rotationZ: block.rotationZ ?? 0
  };
  return (
    <div className="flex flex-col gap-2">
      <label className="text-xs uppercase tracking-[0.2em] text-[#8a95ad]">Angles</label>
      <div className="grid grid-cols-3 gap-3">
        {(
          [
            { label: 'X', field: 'rotationX' },
            { label: 'Y', field: 'rotationZ' },
            { label: 'Z', field: 'rotationY' }
          ] as const
        ).map(({ label, field }) => (
          <AngleControl key={label} axis={label} field={field} value={angles[field]} blockId={block.id} />
        ))}
      </div>
    </div>
  );
}

function AngleControl({
  axis,
  field,
  value,
  blockId
}: {
  axis: 'X' | 'Y' | 'Z';
  field: 'rotationX' | 'rotationY' | 'rotationZ';
  value: number;
  blockId: string;
}) {
  const updateBlock = useBlocksStore((state) => state.updateBlock);
  const normalized = clampAngle(value);

  const handleChange = (next: number) => {
    const clamped = clampAngle(next);
    updateBlock(blockId, { [field]: clamped } as Partial<BlockParams>);
  };

  const displayValue = Number((Math.abs(normalized - Math.round(normalized)) < 1e-3 ? Math.round(normalized) : normalized).toFixed(1));

  return (
    <div className="flex flex-col gap-1">
      <span className="text-[11px] uppercase tracking-[0.2em] text-[#b3bcd3]">{axis}</span>
      <div className="rounded-[14px] border border-[#d7deef] bg-white p-1">
        <input
          type="number"
          step={0.1}
          value={displayValue}
          onClick={(event) => event.stopPropagation()}
          onChange={(event) => handleChange(Number(event.target.value))}
          className="w-full rounded-[10px] border border-[#e2e7f0] px-2 py-1 text-center text-sm"
        />
      </div>
    </div>
  );
}

function clampAngle(value: number) {
  let result = value;
  while (result > 180) result -= 360;
  while (result < -180) result += 360;
  return Number(result.toFixed(1));
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
          className="text-[#5f6d82] hover:text-[#1f2a38] inline-flex h-7 w-7 items-center justify-center rounded-full transition"
        >
          {open ? <ChevronUp className="text-inherit" /> : <ChevronDown className="text-inherit" />}
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
