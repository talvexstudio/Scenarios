export type BlockFunction = "Retail" | "Office" | "Residential" | "Mixed" | "Others";

export interface BlockModel {
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

export interface ExportPayload {
  units: "metric" | "imperial";
  generatedAt: string;
  blocks: BlockModel[];
  metrics: {
    totalGfa: number;
    totalLevels: number;
    gfaByFunction: Record<BlockFunction, number>;
  };
}
