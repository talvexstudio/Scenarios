import { BlocksModel, BlockFunction, Metrics } from '../types';
import { toMeters } from './units';

export function computeMetricsFromBlocksModel(model: BlocksModel): Metrics {
  const totals: Partial<Record<BlockFunction, number>> = {};
  let totalGFA = 0;
  let totalLevels = 0;

  model.blocks.forEach((block) => {
    const footprint =
      toMeters(block.xSize, model.units) * toMeters(block.ySize, model.units);
    const blockArea = footprint * block.levels;
    totals[block.defaultFunction] = (totals[block.defaultFunction] || 0) + blockArea;
    totalGFA += blockArea;
    totalLevels += block.levels;
  });

  return {
    totalGFA,
    totalLevels,
    gfaByFunction: totals,
    units: model.units
  };
}
