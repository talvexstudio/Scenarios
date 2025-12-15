import JSZip from 'jszip';
import { BlocksModel } from '../types';
import { ContextFileData, ContextSnapshot, BuildingFootprint, CONTEXT_SCHEMA_VERSION } from '../stores/contextStore';
import { MAX_CONTEXT_BUILDINGS } from '../three/massingRenderer';

const MODEL_FILENAME = 'model.json';
const CONTEXT_FILENAME = 'context.json';

export async function createTBKArchive(model: BlocksModel, context: ContextFileData | null): Promise<Blob> {
  const zip = new JSZip();
  zip.file(MODEL_FILENAME, JSON.stringify(model, null, 2));
  if (context && context.center && context.buildings.length) {
    zip.file(CONTEXT_FILENAME, JSON.stringify(context, null, 2));
  }
  return zip.generateAsync({ type: 'blob' });
}

export async function parseTBKFile(file: File): Promise<{ model: BlocksModel; context: ContextSnapshot | null }> {
  const buffer = await file.arrayBuffer();
  try {
    const zip = await JSZip.loadAsync(buffer);
    const modelText = await zip.file(MODEL_FILENAME)?.async('string');
    if (!modelText) throw new Error('Missing model.json');
    const model = JSON.parse(modelText);
    const contextFile = zip.file(CONTEXT_FILENAME);
    let context: ContextSnapshot | null = null;
    if (contextFile) {
      const contextText = await contextFile.async('string');
      context = parseContextFile(JSON.parse(contextText));
    }
    return { model, context };
  } catch (zipError) {
    try {
      const text = new TextDecoder().decode(buffer);
      const model = JSON.parse(text);
      return { model, context: null };
    } catch (fallbackError) {
      throw zipError;
    }
  }
}

function parseContextFile(data: any): ContextSnapshot | null {
  if (!data || typeof data !== 'object') return null;
  if (data.schemaVersion !== CONTEXT_SCHEMA_VERSION) return null;
  if (!data.center || typeof data.center.lat !== 'number' || typeof data.center.lon !== 'number') return null;
  if (typeof data.radiusM !== 'number') return null;
  if (!Array.isArray(data.buildings)) return null;
  const buildings = sanitizeBuildings(data.buildings);
  return {
    center: { lat: Number(data.center.lat), lon: Number(data.center.lon) },
    radiusM: Number(data.radiusM),
    buildings,
    fetchedAt: typeof data.fetchedAt === 'string' ? data.fetchedAt : undefined,
    source: typeof data.source === 'string' ? data.source : 'tbk'
  };
}

function sanitizeBuildings(buildings: any[]): BuildingFootprint[] {
  const sanitized: BuildingFootprint[] = [];
  for (const building of buildings) {
    if (!building || typeof building.id !== 'string' || !Array.isArray(building.footprint)) continue;
    const footprint: Array<[number, number]> = [];
    for (const point of building.footprint) {
      if (!Array.isArray(point) || point.length < 2) continue;
      const [lat, lon] = point;
      if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;
      footprint.push([Number(lat), Number(lon)]);
    }
    if (footprint.length < 3) continue;
    sanitized.push({
      id: building.id,
      footprint,
      heightM: typeof building.heightM === 'number' ? Number(building.heightM) : undefined,
      levels: typeof building.levels === 'number' ? Number(building.levels) : undefined
    });
    if (sanitized.length >= MAX_CONTEXT_BUILDINGS) break;
  }
  return sanitized;
}
