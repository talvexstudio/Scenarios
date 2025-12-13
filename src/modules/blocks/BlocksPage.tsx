import { ChangeEvent, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { nanoid } from 'nanoid';
import { BlocksModel, ScenarioOption } from '../../shared/types';
import { useBlocksStore } from '../../shared/stores/blocksStore';
import { useScenariosStore } from '../../shared/stores/scenariosStore';
import { computeMetricsFromBlocksModel } from '../../shared/utils/metrics';
import { deepClone } from '../../shared/utils/clone';
import { createMassingRenderer } from '../../shared/three/massingRenderer';

export function BlocksPage() {
  const { blocks, units, addBlock, updateBlock, removeBlock, getModelSnapshot, resetBlocks, setUnits } =
    useBlocksStore();
  const scenarios = useScenariosStore((state) => state.options);
  const addScenario = useScenariosStore((state) => state.addOption);
  const replaceScenario = useScenariosStore((state) => state.replaceOption);
  const selectScenario = useScenariosStore((state) => state.selectOption);
  const navigate = useNavigate();

  const [replaceCandidate, setReplaceCandidate] = useState<ScenarioOption | null>(null);
  const [pendingLoad, setPendingLoad] = useState<BlocksModel | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<ReturnType<typeof createMassingRenderer>>();

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

  useEffect(() => {
    if (!previewRef.current) return;
    rendererRef.current = createMassingRenderer(previewRef.current);
    return () => rendererRef.current?.dispose();
  }, []);

  useEffect(() => {
    rendererRef.current?.setModel(liveModel);
  }, [liveModel]);

  const handleFieldChange = (id: string, field: keyof typeof blocks[number], value: string) => {
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

  const handleSave = () => {
    const model = getModelSnapshot();
    const blob = new Blob([JSON.stringify(model, null, 2)], { type: 'application/json' });
    const timestamp = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14);
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${timestamp}_Talvex_block.TBK`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleLoad = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const json = JSON.parse(String(reader.result));
        validateTBK(json);
        setPendingLoad(json);
      } catch (error) {
        alert('Invalid TBK file.');
      } finally {
        event.target.value = '';
      }
    };
    reader.readAsText(file);
  };

  const confirmLoad = () => {
    if (pendingLoad) {
      resetBlocks(pendingLoad);
      setPendingLoad(null);
    }
  };

  const cancelLoad = () => {
    setPendingLoad(null);
  };

  const blockRows = useMemo(
    () =>
      blocks.map((block, index) => (
        <tr key={block.id} className="border-b border-slate-100">
          <td className="p-2">{block.name}</td>
          <td className="p-2">
            <input
              type="number"
              value={block.xSize}
              onChange={(event) => handleFieldChange(block.id, 'xSize', event.target.value)}
              className="w-20 rounded border border-slate-200 px-2 py-1 text-sm"
            />
          </td>
          <td className="p-2">
            <input
              type="number"
              value={block.ySize}
              onChange={(event) => handleFieldChange(block.id, 'ySize', event.target.value)}
              className="w-20 rounded border border-slate-200 px-2 py-1 text-sm"
            />
          </td>
          <td className="p-2">
            <input
              type="number"
              value={block.levels}
              onChange={(event) => handleFieldChange(block.id, 'levels', event.target.value)}
              className="w-16 rounded border border-slate-200 px-2 py-1 text-sm"
            />
          </td>
          <td className="p-2">
            <input
              type="number"
              value={block.levelHeight}
              onChange={(event) => handleFieldChange(block.id, 'levelHeight', event.target.value)}
              className="w-20 rounded border border-slate-200 px-2 py-1 text-sm"
            />
          </td>
          <td className="p-2">
            <input
              type="number"
              value={block.posX}
              onChange={(event) => handleFieldChange(block.id, 'posX', event.target.value)}
              className="w-20 rounded border border-slate-200 px-2 py-1 text-sm"
            />
          </td>
          <td className="p-2">
            <input
              type="number"
              value={block.posZ}
              onChange={(event) => handleFieldChange(block.id, 'posZ', event.target.value)}
              className="w-20 rounded border border-slate-200 px-2 py-1 text-sm"
            />
          </td>
          <td className="p-2">
            <select
              value={block.defaultFunction}
              onChange={(event) => handleFieldChange(block.id, 'defaultFunction', event.target.value)}
              className="rounded border border-slate-200 px-2 py-1 text-sm"
            >
              {['Retail', 'Office', 'Residential', 'Mixed', 'Others'].map((fn) => (
                <option key={fn} value={fn}>
                  {fn}
                </option>
              ))}
            </select>
          </td>
          <td className="p-2">
            <button
              type="button"
              onClick={() => removeBlock(block.id)}
              disabled={blocks.length === 1}
              className="text-xs text-red-500 hover:text-red-700 disabled:opacity-50"
            >
              Remove
            </button>
          </td>
        </tr>
      )),
    [blocks, removeBlock]
  );

  return (
    <div className="flex flex-col gap-6 pb-10">
      <div className="flex flex-col gap-6 lg:flex-row">
        <section className="flex-1 rounded-[24px] border border-slate-200 bg-white shadow relative min-h-[420px]">
          <div ref={previewRef} className="w-full h-[440px] rounded-[24px] overflow-hidden bg-[#f4f6fb]" />
        </section>

        <aside className="w-full lg:max-w-[420px] rounded-[24px] border border-slate-200 bg-white p-6 shadow flex flex-col gap-5">
          <div>
            <p className="text-xs tracking-[0.2em] uppercase text-slate-500 mb-1">Talvex Blocks Workshop</p>
            <h1 className="text-2xl font-semibold mb-1">Build stacks &amp; export</h1>
            <p className="text-sm text-slate-500">
              Configure block footprints, heights, and program mix. Send immutable snapshots to the Scenarios board.
            </p>
          </div>

          <div className="flex flex-col gap-1 text-sm text-slate-600">
            <label htmlFor="unitsSelect" className="text-xs uppercase tracking-wide text-slate-500">
              Units
            </label>
            <select
              id="unitsSelect"
              value={units}
              onChange={(event) => setUnits(event.target.value as typeof units)}
              className="rounded-full border border-slate-200 px-4 py-2 text-sm"
            >
              <option value="metric">Metric (m)</option>
              <option value="imperial">Imperial (ft)</option>
            </select>
          </div>

          <div className="flex flex-col gap-3">
            <button
              type="button"
              onClick={handleSend}
              disabled={!canSend}
              className="rounded-full bg-[#2563eb] px-5 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              Send to Scenarios dashboard
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="rounded-full border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700"
            >
              Save Option (.TBK)
            </button>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="rounded-full border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700"
            >
              Load Option (.TBK)
            </button>
          </div>
        </aside>
      </div>

      <section className="rounded-[18px] border border-slate-200 bg-white shadow">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="p-2 text-left">Name</th>
              <th className="p-2 text-left">Width</th>
              <th className="p-2 text-left">Depth</th>
              <th className="p-2 text-left">Levels</th>
              <th className="p-2 text-left">Level H</th>
              <th className="p-2 text-left">Pos X</th>
              <th className="p-2 text-left">Pos Z</th>
              <th className="p-2 text-left">Function</th>
              <th />
            </tr>
          </thead>
          <tbody>{blockRows}</tbody>
        </table>
        <div className="flex justify-between px-4 py-3">
          <button
            type="button"
            onClick={addBlock}
            className="rounded-full border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700"
          >
            + Add block
          </button>
        </div>
      </section>

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
