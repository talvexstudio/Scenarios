import { create } from 'zustand';
import { nanoid } from 'nanoid';
import { BlockFunction, BlockParams, BlocksModel, Units } from '../types';
import { deepClone } from '../utils/clone';

type BlocksState = {
  units: Units;
  blocks: BlockParams[];
  selectedBlockIds: string[];
  addBlock: () => void;
  updateBlock: (id: string, changes: Partial<BlockParams>) => void;
  removeBlock: (id: string) => void;
  resetBlocks: (model?: BlocksModel) => void;
  setUnits: (units: Units) => void;
  getModelSnapshot: () => BlocksModel;
  selectBlock: (id: string | null, additive?: boolean) => void;
  clearSelection: () => void;
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

const removeFromSelection = (selection: string[], id: string) => selection.filter((selectedId) => selectedId !== id);

export const useBlocksStore = create<BlocksState>((set, get) => {
  const initialBlock = defaultBlock(0);
  return {
    units: 'metric',
    blocks: [initialBlock],
    selectedBlockIds: [initialBlock.id],
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
        selectedBlockIds: removeFromSelection(state.selectedBlockIds, id)
      })),
    setUnits: (units) => set(() => ({ units })),
    resetBlocks: (model) =>
      set(() => {
        if (model) {
          const nextBlocks = deepClone(model.blocks).map(ensureRotation);
          return {
            units: model.units,
            blocks: nextBlocks,
            selectedBlockIds: nextBlocks[0]?.id ? [nextBlocks[0].id] : []
          };
        }
        const fresh = defaultBlock(0);
        return { units: 'metric' as Units, blocks: [fresh], selectedBlockIds: [fresh.id] };
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
    selectBlock: (id, additive = false) =>
      set((state) => {
        if (!id) {
          return { selectedBlockIds: [] };
        }
        if (!additive) {
          return { selectedBlockIds: [id] };
        }
        const alreadySelected = state.selectedBlockIds.includes(id);
        if (alreadySelected) {
          return { selectedBlockIds: removeFromSelection(state.selectedBlockIds, id) };
        }
        return { selectedBlockIds: [...state.selectedBlockIds, id] };
      }),
    clearSelection: () => set({ selectedBlockIds: [] })
  };
});
