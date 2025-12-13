import type { BlockFunction, BlockModel } from "@/types/blocks";

export interface MetricsSummary {
  totalGfa: number;
  totalLevels: number;
  gfaByFunction: Record<BlockFunction, number>;
}

const FUNCTIONS: BlockFunction[] = ["Retail", "Office", "Residential", "Mixed", "Others"];

export const calculateMetrics = (blocks: BlockModel[]): MetricsSummary => {
  const gfaByFunction = FUNCTIONS.reduce<Record<BlockFunction, number>>((acc, fn) => {
    acc[fn] = 0;
    return acc;
  }, {} as Record<BlockFunction, number>);

  let totalLevels = 0;
  let totalGfa = 0;

  blocks.forEach((block) => {
    const footprint = block.xSize * block.ySize;
    const gfa = footprint * block.levels;
    totalGfa += gfa;
    totalLevels += block.levels;
    gfaByFunction[block.defaultFunction] += gfa;
  });

  return { totalGfa, totalLevels, gfaByFunction };
};
