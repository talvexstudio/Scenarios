import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useScenariosStore } from '../../shared/stores/scenariosStore';
import { createMassingRenderer } from '../../shared/three/massingRenderer';
import { useContextStore } from '../../shared/stores/contextStore';
import { ScenarioOption } from '../../shared/types';
import { formatArea } from '../../shared/utils/units';
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import marker2x from 'leaflet/dist/images/marker-icon-2x.png';
import marker1x from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
import './scenarios.css';

L.Icon.Default.mergeOptions({
  iconRetinaUrl: marker2x,
  iconUrl: marker1x,
  shadowUrl: markerShadow
});

export function ScenariosPage() {
  const canvasRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<ReturnType<typeof createMassingRenderer>>();
  const [autoSpin, setAutoSpin] = useState(false);
  const [contextOpen, setContextOpen] = useState(false);
  const [latInput, setLatInput] = useState('');
  const [lonInput, setLonInput] = useState('');
  const [radiusChoice, setRadiusChoice] = useState<number>(100);
  const [contextError, setContextError] = useState('');

  const options = useScenariosStore((state) => state.options);
  const selectedId = useScenariosStore((state) => state.selectedOptionId);
  const selectOption = useScenariosStore((state) => state.selectOption);
  const seedIfEmpty = useScenariosStore((state) => state.seedIfEmpty);
  const navigate = useNavigate();
  const center = useContextStore((state) => state.center);
  const radiusM = useContextStore((state) => state.radiusM);
  const status = useContextStore((state) => state.status);
  const errorMessage = useContextStore((state) => state.error);
  const buildingsCount = useContextStore((state) => state.buildingsCount);
  const setCenter = useContextStore((state) => state.setCenter);
  const setRadiusM = useContextStore((state) => state.setRadiusM);
  const clearContext = useContextStore((state) => state.clearContext);
  const fetchContext = useContextStore((state) => state.fetchContext);
  const cancelFetch = useContextStore((state) => state.cancelFetch);
  const numericLat = Number(latInput);
  const numericLon = Number(lonInput);
  const hasPoint = Number.isFinite(numericLat) && Number.isFinite(numericLon);
  const defaultLat = hasPoint ? numericLat : center?.lat ?? 0;
  const defaultLon = hasPoint ? numericLon : center?.lon ?? 0;
  const fallbackCenter = useMemo<[number, number]>(() => [defaultLat, defaultLon], [defaultLat, defaultLon]);

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

  const openContextPanel = () => {
    setLatInput(center ? center.lat.toString() : '');
    setLonInput(center ? center.lon.toString() : '');
    setRadiusChoice(radiusM);
    setContextError('');
    setContextOpen(true);
  };

  const closeContextPanel = () => {
    setContextOpen(false);
    setContextError('');
  };

  const handleApplyContext = async () => {
    if (status === 'loading') {
      cancelFetch();
      return;
    }
    const lat = Number(latInput);
    const lon = Number(lonInput);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
      setContextError('Latitude and longitude are required.');
      return;
    }
    if (lat < -90 || lat > 90) {
      setContextError('Latitude must be between -90 and 90.');
      return;
    }
    if (lon < -180 || lon > 180) {
      setContextError('Longitude must be between -180 and 180.');
      return;
    }
    setCenter(lat, lon);
    setRadiusM(radiusChoice);
    setContextError('');
    await fetchContext();
  };

  const handleMapPick = (lat: number, lon: number) => {
    setLatInput(lat.toFixed(6));
    setLonInput(lon.toFixed(6));
    setContextError('');
  };

  const handleClearContext = () => {
    cancelFetch();
    clearContext();
    setLatInput('');
    setLonInput('');
    setRadiusChoice(100);
    setContextError('');
  };

  return (
    <div className="flex flex-col flex-1 min-h-0 gap-6">
      <div className="flex flex-1 min-h-0 flex-col lg:flex-row gap-6">
        <section className="flex-1 min-h-0 rounded-[24px] border border-slate-200 bg-white shadow relative">
          <div ref={canvasRef} className="w-full h-full rounded-[24px] overflow-hidden bg-[#f4f6fb]" />
          <button
            type="button"
            aria-pressed={autoSpin}
            onClick={() => setAutoSpin((prev) => !prev)}
            className="spin-toggle absolute bottom-5 right-5 rounded-full bg-white/90 px-4 py-2 text-sm font-semibold text-slate-800 shadow-lg"
          >
            {autoSpin ? 'Disable Spin' : 'Enable Spin'}
          </button>
        </section>

        <aside className="w-full lg:max-w-[420px] h-full rounded-[24px] border border-slate-200 bg-white shadow flex flex-col">
          <div className="flex-1 min-h-0 overflow-auto p-6 flex flex-col gap-5">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs tracking-[0.2em] uppercase text-slate-500">Talvex Scenarios Board</p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={openContextPanel}
                  className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700"
                >
                  Context
                </button>
                <button
                  type="button"
                  onClick={handleConfigure}
                  className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700"
                >
                  Configure options
                </button>
              </div>
            </div>
            <div className="flex flex-col text-xs text-slate-500">
              {center ? (
                <span>
                  Context: set ({center.lat.toFixed(4)}, {center.lon.toFixed(4)}) ƒ?› {radiusM} m
                </span>
              ) : (
                <span>Context: not set</span>
              )}
              {status === 'loading' && <span className="text-[#2563eb]">Fetching context buildings…</span>}
              {status === 'success' && <span className="text-green-600">Context loaded</span>}
              {status === 'error' && <span className="text-red-500">Context error: {errorMessage}</span>}
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
          </div>
          <div className="sticky bottom-0 border-t border-slate-200 bg-white p-4">
            <button
              type="button"
              className="w-full rounded-full bg-[#2563eb] px-4 py-2 text-sm font-semibold text-white shadow hover:bg-[#1d4ec9]"
              disabled
            >
              Export PDF report →
            </button>
          </div>
        </aside>
      </div>

      {contextOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4">
          <div className="w-full max-w-md rounded-[24px] bg-white p-6 shadow-[0_24px_60px_rgba(15,23,42,0.25)]">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-slate-900">Context settings</h2>
              <button
                type="button"
                onClick={closeContextPanel}
                className="text-slate-500 hover:text-slate-900 font-semibold"
                aria-label="Close"
              >
                ✕
              </button>
            </div>
            <div className="space-y-4 text-sm text-slate-800">
              <div>
                <ContextMap
                  lat={hasPoint ? numericLat : undefined}
                  lon={hasPoint ? numericLon : undefined}
                  fallback={fallbackCenter}
                  onPick={handleMapPick}
                />
                <p className="mt-2 text-xs text-slate-500">Click on the map to set the center point.</p>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-xs uppercase tracking-[0.2em] text-slate-500 mb-1">Latitude</label>
                  <input
                    type="number"
                    step="0.0001"
                    value={latInput}
                    onChange={(event) => setLatInput(event.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2"
                    placeholder="e.g. 40.7128"
                  />
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-[0.2em] text-slate-500 mb-1">Longitude</label>
                  <input
                    type="number"
                    step="0.0001"
                    value={lonInput}
                    onChange={(event) => setLonInput(event.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2"
                    placeholder="-74.0060"
                  />
                </div>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500 mb-2">Radius</p>
                <div className="flex flex-wrap gap-2">
                  {[50, 100, 200, 300, 500].map((value) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setRadiusChoice(value)}
                      className={`rounded-full px-3 py-1 text-sm font-semibold border ${
                        radiusChoice === value
                          ? 'bg-[#2563eb] text-white border-[#2563eb]'
                          : 'border-slate-200 text-slate-600 hover:border-slate-400'
                      }`}
                    >
                      {value} m
                    </button>
                  ))}
                </div>
              </div>
              {contextError && <p className="text-xs text-red-500">{contextError}</p>}
              {status === 'loading' && (
                <div className="flex flex-col gap-1 text-xs text-[#2563eb]">
                  <span>Fetching context buildings</span>
                  <div className="imagegen-progress">
                    <div className="imagegen-progress-bar" />
                  </div>
                </div>
              )}
              {status === 'success' && <p className="text-xs text-green-600">Context loaded</p>}
              {status === 'error' && <p className="text-xs text-red-500">{errorMessage}</p>}
            </div>
            <div className="mt-6 flex justify-between gap-2">
              <button
                type="button"
                onClick={handleClearContext}
                className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700"
              >
                Clear
              </button>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={closeContextPanel}
                  className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700"
                  disabled={status === 'loading'}
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={handleApplyContext}
                  className={`rounded-full px-4 py-2 text-sm font-semibold text-white ${
                    status === 'loading' ? 'bg-[#f97373]' : 'bg-[#2563eb]'
                  }`}
                >
                  {status === 'loading' ? 'Cancel' : 'Apply'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
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

type ContextMapProps = {
  lat?: number;
  lon?: number;
  fallback: [number, number];
  onPick: (lat: number, lon: number) => void;
};

function ContextMap({ lat, lon, fallback, onPick }: ContextMapProps) {
  return (
    <div className="w-full overflow-hidden rounded-2xl border border-slate-200 shadow-inner">
      <MapContainer center={fallback} zoom={15} scrollWheelZoom className="h-64 w-full">
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap contributors" />
        <MapCenterUpdater lat={lat} lon={lon} fallback={fallback} />
        <MapClickHandler onPick={onPick} />
        {typeof lat === 'number' && typeof lon === 'number' && <Marker position={[lat, lon]} />}
      </MapContainer>
    </div>
  );
}

function MapClickHandler({ onPick }: { onPick: (lat: number, lon: number) => void }) {
  useMapEvents({
    click(event) {
      const lat = Number(event.latlng.lat.toFixed(6));
      const lon = Number(event.latlng.lng.toFixed(6));
      onPick(lat, lon);
    }
  });
  return null;
}

function MapCenterUpdater({
  lat,
  lon,
  fallback
}: {
  lat?: number;
  lon?: number;
  fallback: [number, number];
}) {
  const map = useMap();
  useEffect(() => {
    if (typeof lat === 'number' && typeof lon === 'number') {
      map.setView([lat, lon]);
    } else {
      map.setView(fallback);
    }
  }, [lat, lon, fallback, map]);
  return null;
}
