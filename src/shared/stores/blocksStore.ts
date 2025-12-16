import { create } from 'zustand';
import { nanoid } from 'nanoid';
import { BlockFunction, BlockParams, BlocksModel, Units } from '../types';
import { deepClone } from '../utils/clone';

type BlocksState = {
  units: Units;
  blocks: BlockParams[];
  selectedBlockId: string | null;
  addBlock: () => void;
  updateBlock: (id: string, changes: Partial<BlockParams>) => void;
  removeBlock: (id: string) => void;
  resetBlocks: (model?: BlocksModel) => void;
  setUnits: (units: Units) => void;
  getModelSnapshot: () => BlocksModel;
  selectBlock: (id: string | null) => void;
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
  rotationX: 0,
  rotationY: 0,
  rotationZ: 0,
  defaultFunction: 'Mixed'
});

const ensureRotation = (block: BlockParams): BlockParams => ({
  ...block,
  rotationX: block.rotationX ?? 0,
  rotationY: block.rotationY ?? 0,
  rotationZ: block.rotationZ ?? 0
});

export const useBlocksStore = create<BlocksState>((set, get) => ({
  units: 'metric',
  blocks: [defaultBlock(0)],
  selectedBlockId: null,
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
      blocks: state.blocks.filter((block) => block.id !== id),
      selectedBlockId: state.selectedBlockId === id ? null : state.selectedBlockId
    })),
  setUnits: (units) => set(() => ({ units })),
  resetBlocks: (model) =>
    set(() => {
      if (model) {
        const nextBlocks = deepClone(model.blocks).map(ensureRotation);
        return {
          units: model.units,
          blocks: nextBlocks,
          selectedBlockId: nextBlocks[0]?.id ?? null
        };
      }
      const initial = defaultBlock(0);
      return { units: 'metric' as Units, blocks: [initial], selectedBlockId: initial.id };
    }),
  getModelSnapshot: () => {
    const state = get();
    return {
      schemaVersion: 1,
      units: state.units,
      blocks: deepClone(state.blocks).map(ensureRotation),
      createdAt: new Date().toISOString()
    };
  },
  selectBlock: (id) => set({ selectedBlockId: id })
}));
