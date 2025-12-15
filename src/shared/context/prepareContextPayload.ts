import type { BuildingFootprint, ContextSnapshot } from '../stores/contextStore';
import type { ContextMeshPayload } from '../three/massingRenderer';
import { MAX_CONTEXT_BUILDINGS } from '../three/massingRenderer';

const DEFAULT_LEVEL_HEIGHT_M = 3.2;
const MIN_CONTEXT_HEIGHT_M = 6;
const MAX_CONTEXT_HEIGHT_M = 80;
const FALLBACK_CONTEXT_HEIGHT_M = 12;

type Center = { lat: number; lon: number };

export type ContextPreparationStats = {
  inputCount: number;
  validCount: number;
  skippedTooFewPoints: number;
  skippedNaN: number;
  skippedDegenerateArea: number;
  skippedOther: number;
  correctedSwaps: number;
};

export function prepareContextPayload(
  center: Center | null,
  buildings: BuildingFootprint[] | ContextSnapshot['buildings'],
  seedKey = '',
  radiusM = 100
): { payload: ContextMeshPayload[] | null; stats: ContextPreparationStats } {
  const stats: ContextPreparationStats = {
    inputCount: buildings?.length ?? 0,
    validCount: 0,
    skippedTooFewPoints: 0,
    skippedNaN: 0,
    skippedDegenerateArea: 0,
    skippedOther: 0,
    correctedSwaps: 0
  };

  if (!center || !buildings?.length) {
    return { payload: null, stats };
  }

  const cosLat = Math.cos((center.lat * Math.PI) / 180);
  const usable: Array<{ id: string; footprint: Array<[number, number]>; height?: number }> = [];
  const heightSamples: number[] = [];

  for (const building of buildings) {
    const conversion = convertFootprintToLocal(building.footprint, center, cosLat);
    if (!conversion) {
      stats.skippedOther += 1;
      continue;
    }
    const { footprint, correctedSwap } = conversion;
    if (correctedSwap) stats.correctedSwaps += 1;
    if (footprint.length < 3) {
      stats.skippedTooFewPoints += 1;
      continue;
    }
    if (!isFinitePolygon(footprint)) {
      stats.skippedNaN += 1;
      continue;
    }
    if (Math.abs(polygonArea(footprint)) < 1e-2) {
      stats.skippedDegenerateArea += 1;
      continue;
    }
    const explicitHeight = resolveBuildingHeight(building);
    if (typeof explicitHeight === 'number' && Number.isFinite(explicitHeight)) {
      heightSamples.push(explicitHeight);
    }
    usable.push({ id: building.id, footprint, height: explicitHeight });
    stats.validCount += 1;
    if (usable.length >= MAX_CONTEXT_BUILDINGS) break;
  }

  if (!usable.length) {
    return { payload: null, stats };
  }

  const fallback = heightSamples.length ? median(heightSamples) : FALLBACK_CONTEXT_HEIGHT_M;
  const baseSeed = seedKey || `${center.lat.toFixed(6)},${center.lon.toFixed(6)},${radiusM}`;

  const payload = usable.map((item, index) => {
    let height = item.height;
    if (typeof height !== 'number' || !Number.isFinite(height)) {
      const jitter = 0.2 * seededNoise(`${baseSeed}-${item.id}-${index}`); // [-0.2, 0.2]
      height = fallback * (0.9 + jitter);
    }
    height = clamp(height, MIN_CONTEXT_HEIGHT_M, MAX_CONTEXT_HEIGHT_M);
    return {
      id: item.id,
      footprint: item.footprint,
      height
    };
  });

  return { payload, stats };
}

function resolveBuildingHeight(building: BuildingFootprint): number | undefined {
  if (typeof building.heightM === 'number' && Number.isFinite(building.heightM)) {
    return building.heightM;
  }
  if (typeof building.levels === 'number' && Number.isFinite(building.levels)) {
    return building.levels * DEFAULT_LEVEL_HEIGHT_M;
  }
  return undefined;
}

function convertFootprintToLocal(
  footprint: Array<[number, number]> | undefined,
  origin: Center,
  cosLat: number
): { footprint: Array<[number, number]>; correctedSwap: boolean } | null {
  if (!footprint || footprint.length < 3) return null;
  const converted: Array<[number, number]> = [];
  let correctedSwap = false;
  const points = [...footprint];
  if (points.length >= 3) {
    const [firstLat, firstLon] = points[0];
    const [secondLat, secondLon] = points[1];
    if (Math.abs(firstLat) > 90 || Math.abs(firstLon) > 180 || Math.abs(secondLat) > 90 || Math.abs(secondLon) > 180) {
      correctedSwap = true;
      for (let i = 0; i < points.length; i += 1) {
        points[i] = [points[i][1], points[i][0]];
      }
    }
  }
  for (const point of points) {
    if (!Array.isArray(point) || point.length < 2) return null;
    const [lat, lon] = point;
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
    const x = (lon - origin.lon) * cosLat * 111320;
    const z = -(lat - origin.lat) * 110540;
    if (!Number.isFinite(x) || !Number.isFinite(z)) return null;
    converted.push([x, z]);
  }
  if (converted.length < 3) return null;
  const [firstX, firstZ] = converted[0];
  const [lastX, lastZ] = converted[converted.length - 1];
  if (Math.abs(firstX - lastX) > 0.01 || Math.abs(firstZ - lastZ) > 0.01) {
    converted.push([firstX, firstZ]);
  }
  return { footprint: converted, correctedSwap };
}

function isFinitePolygon(points: Array<[number, number]>) {
  return points.every(([x, z]) => Number.isFinite(x) && Number.isFinite(z));
}

function polygonArea(points: Array<[number, number]>) {
  let area = 0;
  for (let i = 0; i < points.length - 1; i += 1) {
    const [x1, y1] = points[i];
    const [x2, y2] = points[i + 1];
    area += x1 * y2 - x2 * y1;
  }
  return area / 2;
}

function median(values: number[]): number {
  if (!values.length) return FALLBACK_CONTEXT_HEIGHT_M;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return (sorted[middle - 1] + sorted[middle]) / 2;
  }
  return sorted[middle];
}

function seededNoise(seed: string): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }
  const normalized = (hash >>> 0) / 0xffffffff;
  return normalized * 2 - 1;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}
