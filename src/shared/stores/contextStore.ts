import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { MAX_CONTEXT_BUILDINGS } from '../three/massingRenderer';

export type BuildingFootprint = {
  id: string;
  footprint: Array<[number, number]>;
  heightM?: number;
  levels?: number;
};

export type ContextSource = 'overpass' | 'tbk';

export type ContextSnapshot = {
  center: { lat: number; lon: number };
  radiusM: number;
  buildings: BuildingFootprint[];
  fetchedAt?: string;
  source?: ContextSource;
};

export type ContextFileData = ContextSnapshot & {
  schemaVersion: number;
  fetchedAt: string;
  source: ContextSource;
};

type ContextState = {
  center: { lat: number; lon: number } | null;
  radiusM: number;
  status: 'idle' | 'loading' | 'success' | 'error';
  error?: string;
  buildingsCount: number;
  buildings: BuildingFootprint[];
  lastFetchedKey?: string;
  abortController?: AbortController | null;
  fetchedAt?: string;
  source?: ContextSource;
  hasHydrated: boolean;
  setCenter: (lat: number, lon: number) => void;
  setRadiusM: (radius: number) => void;
  clearContext: () => void;
  fetchContext: () => Promise<void>;
  cancelFetch: () => void;
  setSnapshot: (snapshot: ContextSnapshot | null) => void;
  getSnapshotForSave: () => ContextFileData | null;
};

const DEFAULT_RADIUS = 100;
const STORAGE_KEY = 'talvex_context_v1';
export const CONTEXT_SCHEMA_VERSION = 1;

export const useContextStore = create<ContextState>()(
  persist(
    (set, get) => ({
      center: null,
      radiusM: DEFAULT_RADIUS,
      status: 'idle',
      buildings: [],
      buildingsCount: 0,
      abortController: null,
      fetchedAt: undefined,
      source: undefined,
      error: undefined,
      lastFetchedKey: undefined,
      hasHydrated: typeof window === 'undefined',
      setCenter: (lat, lon) => set({ center: { lat, lon } }),
      setRadiusM: (radius) => set({ radiusM: radius }),
      clearContext: () =>
        set({
          center: null,
          radiusM: DEFAULT_RADIUS,
          status: 'idle',
          error: undefined,
          buildings: [],
          buildingsCount: 0,
          lastFetchedKey: undefined,
          abortController: null,
          fetchedAt: undefined,
          source: undefined
        }),
      cancelFetch: () => {
        const controller = get().abortController;
        controller?.abort();
        set({ abortController: null, status: 'idle', error: 'Cancelled' });
      },
      fetchContext: async () => {
        const { center, radiusM, abortController } = get();
        if (!center) return;
        abortController?.abort();
        const controller = new AbortController();
        const fetchKey = buildKey(center, radiusM);
        set({ status: 'loading', error: undefined, abortController: controller });
        try {
          const query = buildOverpassQuery(center.lat, center.lon, radiusM);
          const response = await fetch(OVERPASS_URL, {
            method: 'POST',
            body: query,
            signal: controller.signal,
            headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8' }
          });
          if (!response.ok) throw new Error(`Overpass error: ${response.status}`);
          const data = await response.json();
          const { buildings, count } = parseOverpassBuildings(data);
          set({
            status: 'success',
            buildings,
            buildingsCount: count,
            lastFetchedKey: fetchKey,
            abortController: null,
            fetchedAt: new Date().toISOString(),
            source: 'overpass'
          });
        } catch (error) {
          if ((error as Error).name === 'AbortError') {
            set({ status: 'idle', abortController: null, error: 'Request cancelled' });
            return;
          }
          set({
            status: 'error',
            error: (error as Error).message ?? 'Failed to fetch context',
            abortController: null
          });
        }
      },
      setSnapshot: (snapshot) => {
        if (!snapshot) {
          set({
            center: null,
            radiusM: DEFAULT_RADIUS,
            buildings: [],
            buildingsCount: 0,
            fetchedAt: undefined,
            source: undefined,
            status: 'idle',
            error: undefined,
            lastFetchedKey: undefined
          });
          return;
        }
        const normalized = normalizeSnapshot(snapshot);
        set({
          center: normalized.center,
          radiusM: normalized.radiusM,
          buildings: normalized.buildings,
          buildingsCount: normalized.buildings.length,
          fetchedAt: normalized.fetchedAt,
          source: normalized.source ?? 'tbk',
          status: normalized.buildings.length ? 'success' : 'idle',
          error: undefined,
          lastFetchedKey: buildKey(normalized.center, normalized.radiusM)
        });
      },
      getSnapshotForSave: () => {
        const { center, radiusM, buildings, fetchedAt, source } = get();
        if (!center) return null;
        return {
          schemaVersion: CONTEXT_SCHEMA_VERSION,
          center,
          radiusM,
          buildings: limitBuildings(buildings),
          fetchedAt: fetchedAt ?? new Date().toISOString(),
          source: source ?? 'tbk'
        };
      }
    }),
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        center: state.center,
        radiusM: state.radiusM,
        buildings: state.buildings,
        buildingsCount: state.buildingsCount,
        fetchedAt: state.fetchedAt,
        source: state.source,
        lastFetchedKey: state.lastFetchedKey
      }),
      onRehydrateStorage: () => (state) => {
        const hasContext = !!state?.center && (state?.buildings?.length ?? 0) > 0;
        useContextStore.setState({
          hasHydrated: true,
          status: hasContext ? 'success' : 'idle',
          error: undefined,
          abortController: null
        });
      }
    }
  )
);

const OVERPASS_URL = 'https://overpass-api.de/api/interpreter';

function buildOverpassQuery(lat: number, lon: number, radius: number) {
  return `
[out:json][timeout:25];
(
  way["building"](around:${radius},${lat},${lon});
  relation["building"](around:${radius},${lat},${lon});
);
out body geom;
`.trim();
}

function parseOverpassBuildings(data: any): { buildings: BuildingFootprint[]; count: number } {
  const buildings: BuildingFootprint[] = [];
  if (!data?.elements) return { buildings, count: 0 };
  for (const element of data.elements) {
    if (!element || !element.geometry) continue;
    if (element.type !== 'way' && element.type !== 'relation') continue;
    const footprint = parseGeometry(element.geometry);
    if (!footprint || footprint.length < 3) continue;
    const height = parseHeight(element.tags);
    const levels = parseLevels(element.tags);
    buildings.push({
      id: `${element.type}/${element.id}`,
      footprint,
      heightM: height,
      levels
    });
    if (buildings.length >= MAX_CONTEXT_BUILDINGS) break;
  }
  return { buildings, count: buildings.length };
}

function parseGeometry(geometry: any): Array<[number, number]> | null {
  if (!Array.isArray(geometry)) return null;
  const points: Array<[number, number]> = [];
  for (const node of geometry) {
    if (typeof node?.lat !== 'number' || typeof node?.lon !== 'number') continue;
    points.push([Number(node.lat.toFixed(6)), Number(node.lon.toFixed(6))]);
  }
  if (points.length < 3) return null;
  return points;
}

function parseHeight(tags: any): number | undefined {
  if (!tags) return undefined;
  if (tags.height) {
    const parsed = parseFloat(String(tags.height).replace(/[^0-9.]/g, ''));
    if (!Number.isNaN(parsed)) return parsed;
  }
  return undefined;
}

function parseLevels(tags: any): number | undefined {
  if (!tags) return undefined;
  if (tags.levels) {
    const parsed = parseInt(String(tags.levels), 10);
    if (!Number.isNaN(parsed)) return parsed;
  }
  return undefined;
}

function buildKey(center: { lat: number; lon: number }, radius: number) {
  return `${center.lat.toFixed(6)},${center.lon.toFixed(6)},${radius}`;
}

function normalizeSnapshot(snapshot: ContextSnapshot): ContextSnapshot {
  return {
    center: snapshot.center,
    radiusM: snapshot.radiusM ?? DEFAULT_RADIUS,
    fetchedAt: snapshot.fetchedAt ?? new Date().toISOString(),
    source: snapshot.source ?? 'tbk',
    buildings: limitBuildings(snapshot.buildings ?? [])
  };
}

function limitBuildings(buildings: BuildingFootprint[]): BuildingFootprint[] {
  return buildings.slice(0, MAX_CONTEXT_BUILDINGS).map((building) => ({
    id: building.id,
    footprint: (building.footprint || []).map(([lat, lon]) => [Number(lat), Number(lon)] as [number, number]),
    heightM: typeof building.heightM === 'number' ? Number(building.heightM) : undefined,
    levels: typeof building.levels === 'number' ? Number(building.levels) : undefined
  }));
}

// DEV-ONLY: expose store for console debugging
if (import.meta.env.DEV) {
  (window as any).contextStore = useContextStore;
}
