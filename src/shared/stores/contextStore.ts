import { create } from 'zustand';

export type BuildingFootprint = {
  id: string;
  footprint: Array<[number, number]>;
  heightM?: number;
  levels?: number;
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
  setCenter: (lat: number, lon: number) => void;
  setRadiusM: (radius: number) => void;
  clearContext: () => void;
  fetchContext: () => Promise<void>;
  cancelFetch: () => void;
};

const DEFAULT_RADIUS = 100;

const OVERPASS_URL = 'https://overpass-api.de/api/interpreter';

export const useContextStore = create<ContextState>((set, get) => ({
  center: null,
  radiusM: DEFAULT_RADIUS,
  status: 'idle',
  buildings: [],
  buildingsCount: 0,
  abortController: null,
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
      lastFetchedKey: undefined
    }),
  cancelFetch: () => {
    const controller = get().abortController;
    controller?.abort();
    set({ abortController: null, status: 'idle', error: 'Cancelled', lastFetchedKey: undefined });
  },
  fetchContext: async () => {
    const { center, radiusM, abortController } = get();
    if (!center) return;
    abortController?.abort();
    const controller = new AbortController();
    const fetchKey = `${center.lat.toFixed(6)},${center.lon.toFixed(6)},${radiusM}`;
    set({ status: 'loading', error: undefined, abortController: controller });
    try {
      const query = buildOverpassQuery(center.lat, center.lon, radiusM);
      const response = await fetch(OVERPASS_URL, {
        method: 'POST',
        body: query,
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'
        }
      });
      if (!response.ok) {
        throw new Error(`Overpass error: ${response.status}`);
      }
      const data = await response.json();
      const { buildings, count } = parseOverpassBuildings(data);
      set({
        status: 'success',
        buildings,
        buildingsCount: count,
        lastFetchedKey: fetchKey,
        abortController: null
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
  }
}));

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
