import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useScenariosStore } from '../../shared/stores/scenariosStore';
import { createMassingRenderer } from '../../shared/three/massingRenderer';
import { ScenarioOption } from '../../shared/types';
import { formatArea } from '../../shared/utils/units';
import './scenarios.css';

export function ScenariosPage() {
  const canvasRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<ReturnType<typeof createMassingRenderer>>();
  const [autoSpin, setAutoSpin] = useState(false);

  const options = useScenariosStore((state) => state.options);
  const selectedId = useScenariosStore((state) => state.selectedOptionId);
  const selectOption = useScenariosStore((state) => state.selectOption);
  const seedIfEmpty = useScenariosStore((state) => state.seedIfEmpty);
  const navigate = useNavigate();

  useEffect(() => {
    seedIfEmpty();
  }, [seedIfEmpty]);

  const selectedOption = useMemo<ScenarioOption | undefined>(
    () => options.find((opt) => opt.id === selectedId) ?? options[0],
    [options, selectedId]
  );

  useEffect(() => {
    if (!canvasRef.current) return;
    rendererRef.current = createMassingRenderer(canvasRef.current);
    return () => rendererRef.current?.dispose();
  }, []);

  useEffect(() => {
    if (!rendererRef.current) return;
    rendererRef.current.setModel(selectedOption?.model);
  }, [selectedOption]);

  useEffect(() => {
    rendererRef.current?.setAutoSpin(autoSpin);
  }, [autoSpin]);

  const handleConfigure = () => navigate('/blocks');

  return (
    <div className="flex flex-col gap-6 pb-10">
      <div className="flex flex-col lg:flex-row gap-6">
        <section className="flex-1 rounded-[24px] border border-slate-200 bg-white shadow relative min-h-[480px]">
          <div ref={canvasRef} className="w-full h-[500px] rounded-[24px] overflow-hidden bg-[#f4f6fb]" />
          <button
            type="button"
            aria-pressed={autoSpin}
            onClick={() => setAutoSpin((prev) => !prev)}
            className="spin-toggle absolute bottom-5 right-5 rounded-full bg-white/90 px-4 py-2 text-sm font-semibold text-slate-800 shadow-lg"
          >
            {autoSpin ? 'Disable Spin' : 'Enable Spin'}
          </button>
        </section>

        <aside className="w-full lg:max-w-[420px] rounded-[24px] border border-slate-200 bg-white p-6 shadow flex flex-col gap-5">
          <div className="flex items-center justify-between">
            <p className="text-xs tracking-[0.2em] uppercase text-slate-500">Talvex Scenarios Board</p>
            <button
              type="button"
              onClick={handleConfigure}
              className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700"
            >
              Configure options
            </button>
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="scenarioSelect" className="text-xs text-slate-500">
              Select option
            </label>
            <select
              id="scenarioSelect"
              value={selectedOption?.id}
              onChange={(event) => selectOption(event.target.value)}
              className="rounded-full border border-slate-200 bg-[#eef2ff] px-4 py-3 text-base font-semibold"
            >
              {options.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.name}
                </option>
              ))}
            </select>
          </div>

          {selectedOption ? (
            <>
              <MetricsCard option={selectedOption} />
              <ProsCons option={selectedOption} />
            </>
          ) : (
            <p className="text-sm text-slate-500">No options yet. Create one from the Blocks workshop.</p>
          )}
        </aside>
      </div>
    </div>
  );
}

function MetricsCard({ option }: { option: ScenarioOption }) {
  return (
    <div className="rounded-[18px] border border-slate-200 bg-[#f9fafc] p-5">
      <dl className="flex flex-col gap-4 text-sm">
        <div className="flex justify-between">
          <dt>GFA</dt>
          <dd>{formatArea(option.metrics.totalGFA, option.metrics.units)}</dd>
        </div>
        <div className="flex justify-between">
          <dt>Levels</dt>
          <dd>{option.metrics.totalLevels}</dd>
        </div>
        <div className="flex flex-col gap-1">
          <dt className="text-xs uppercase tracking-wide text-slate-500">By program</dt>
          {Object.entries(option.metrics.gfaByFunction || {}).map(([fn, value]) => (
            <div key={fn} className="flex justify-between pl-2">
              <span>{fn}</span>
              <span>{formatArea(value ?? 0, option.metrics.units)}</span>
            </div>
          ))}
        </div>
      </dl>
    </div>
  );
}

function ProsCons({ option }: { option: ScenarioOption }) {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h3 className="text-xs uppercase tracking-[0.2em] text-slate-500 mb-2">Pros</h3>
        <ul className="list-disc pl-4 text-sm text-slate-700 flex flex-col gap-1">
          {option.metrics.totalLevels > 0 ? (
            <>
              <li>Good balance of program mix</li>
              <li>Uses Talvex Blocks snapshot</li>
            </>
          ) : (
            <li>Awaiting data</li>
          )}
        </ul>
      </div>
      <div>
        <h3 className="text-xs uppercase tracking-[0.2em] text-slate-500 mb-2">Cons</h3>
        <ul className="list-disc pl-4 text-sm text-slate-700 flex flex-col gap-1">
          <li>Detailed evaluation coming soon</li>
        </ul>
      </div>
    </div>
  );
}
