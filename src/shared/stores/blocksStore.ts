import { create } from 'zustand';
import { nanoid } from 'nanoid';
import { BlockFunction, BlockParams, BlocksModel, Units } from '../types';
import { deepClone } from '../utils/clone';

type BlocksState = {
  units: Units;
  blocks: BlockParams[];
  addBlock: () => void;
  updateBlock: (id: string, changes: Partial<BlockParams>) => void;
  removeBlock: (id: string) => void;
  resetBlocks: (model?: BlocksModel) => void;
  setUnits: (units: Units) => void;
  getModelSnapshot: () => BlocksModel;
};

const defaultBlock = (index: number): BlockParams => ({
  id: nanoid(),
  name: `Block ${String.fromCharCode(65 + index)}`,
  xSize: 20,
  ySize: 20,
  levels: 5,
  levelHeight: 3.2,
  posX: index * 25,
  posY: 0,
  posZ: 0,
  defaultFunction: 'Mixed'
});

export const useBlocksStore = create<BlocksState>((set, get) => ({
  units: 'metric',
  blocks: [defaultBlock(0)],
  addBlock: () =>
    set((state) => ({
      blocks: [...state.blocks, defaultBlock(state.blocks.length)]
    })),
  updateBlock: (id, changes) =>
    set((state) => ({
      blocks: state.blocks.map((block) => (block.id === id ? { ...block, ...changes } : block))
    })),
  removeBlock: (id) =>
    set((state) => ({
      blocks: state.blocks.filter((block) => block.id !== id)
    })),
  setUnits: (units) => set(() => ({ units })),
  resetBlocks: (model) =>
    set(() => {
      if (model) {
        return { units: model.units, blocks: deepClone(model.blocks) };
      }
      return { units: 'metric' as Units, blocks: [defaultBlock(0)] };
    }),
  getModelSnapshot: () => {
    const state = get();
    return {
      schemaVersion: 1,
      units: state.units,
      blocks: deepClone(state.blocks),
      createdAt: new Date().toISOString()
    };
  }
}));
