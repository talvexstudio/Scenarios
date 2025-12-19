import { BlocksModel, BlockFunction, Metrics } from '../types';
import { toMeters } from './units';

export function computeMetricsFromBlocksModel(model: BlocksModel): Metrics {
  const totals: Partial<Record<BlockFunction, number>> = {};
  let totalGFA = 0;
  let totalLevels = 0;
  let maxHeight = 0;

  model.blocks.forEach((block) => {
    const footprint = toMeters(block.xSize, model.units) * toMeters(block.ySize, model.units);
    const blockArea = footprint * block.levels;
    totals[block.defaultFunction] = (totals[block.defaultFunction] || 0) + blockArea;
    totalGFA += blockArea;
    totalLevels += block.levels;

    const baseZ = block.posY ?? 0;
    const height = (block.levels ?? 0) * (block.levelHeight ?? 0);
    const top = baseZ + height;
    if (top > maxHeight) {
      maxHeight = top;
    }
  });

  return {
    totalGFA,
    totalLevels,
    maxHeight,
    gfaByFunction: totals,
    units: model.units
  };
}
