export type Units = 'metric' | 'imperial';

export type BlockFunction = 'Retail' | 'Office' | 'Residential' | 'Mixed' | 'Others';

export interface BlockParams {
  id: string;
  name: string;
  xSize: number;
  ySize: number;
  levels: number;
  levelHeight: number;
  posX: number;
  posY: number;
  posZ: number;
  rotationX?: number;
  rotationY?: number;
  rotationZ?: number;
  defaultFunction: BlockFunction;
}

export interface BlocksModel {
  schemaVersion: 1;
  units: Units;
  blocks: BlockParams[];
  createdAt: string;
}

export interface Metrics {
  totalGFA: number;
  totalLevels: number;
  maxHeight: number;
  gfaByFunction: Partial<Record<BlockFunction, number>>;
  units: Units;
}

export interface ScenarioOption {
  id: string;
  name: string;
  createdAt: string;
  source: 'blocks';
  model: BlocksModel;
  metrics: Metrics;
}
