import { create } from 'zustand';
import { nanoid } from 'nanoid';
import { BlockFunction, BlockParams, BlocksModel, Units } from '../types';
import { deepClone } from '../utils/clone';

type BlocksSnapshot = {
  units: Units;
  blocks: BlockParams[];
};

type BlocksState = {
  units: Units;
  blocks: BlockParams[];
  history: {
    past: BlocksSnapshot[];
    future: BlocksSnapshot[];
  };
  selectedBlockIds: string[];
  addBlock: () => void;
  updateBlock: (id: string, changes: Partial<BlockParams>) => void;
  removeBlock: (id: string) => void;
  resetBlocks: (model?: BlocksModel) => void;
  setUnits: (units: Units, options?: { silent?: boolean }) => void;
  getModelSnapshot: () => BlocksModel;
  selectBlock: (id: string | null, additive?: boolean) => void;
  clearSelection: () => void;
  undo: () => void;
  redo: () => void;
  applyBatch: (mutator: (draft: { blocks: BlockParams[]; units: Units }) => void) => void;
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
const MAX_HISTORY = 50;

const createSnapshot = (state: Pick<BlocksState, 'units' | 'blocks'>): BlocksSnapshot => ({
  units: state.units,
  blocks: deepClone(state.blocks).map(ensureRotation)
});

const pushPast = (state: BlocksState) => {
  const past = [...state.history.past, createSnapshot(state)];
  if (past.length > MAX_HISTORY) past.shift();
  return past;
};

export const useBlocksStore = create<BlocksState>((set, get) => {
  const initialBlock = defaultBlock(0);
  return {
    units: 'metric',
    blocks: [initialBlock],
    history: { past: [], future: [] },
    selectedBlockIds: [initialBlock.id],
    addBlock: () =>
      set((state) => ({
        blocks: [...state.blocks, defaultBlock(state.blocks.length)],
        history: { past: pushPast(state), future: [] }
      })),
    updateBlock: (id, changes) =>
      set((state) => ({
        blocks: state.blocks.map((block) => (block.id === id ? { ...block, ...changes } : block)),
        history: { past: pushPast(state), future: [] }
      })),
    removeBlock: (id) =>
      set((state) => ({
        blocks: state.blocks.filter((block) => block.id !== id),
        selectedBlockIds: removeFromSelection(state.selectedBlockIds, id),
        history: { past: pushPast(state), future: [] }
      })),
    setUnits: (units, options) =>
      set((state) => ({
        units,
        history: options?.silent ? state.history : { past: pushPast(state), future: [] }
      })),
    resetBlocks: (model) =>
      set(() => {
        if (model) {
          const nextBlocks = deepClone(model.blocks).map(ensureRotation);
          return {
            units: model.units,
            blocks: nextBlocks,
            selectedBlockIds: nextBlocks[0]?.id ? [nextBlocks[0].id] : [],
            history: { past: [], future: [] }
          };
        }
        const fresh = defaultBlock(0);
        return { units: 'metric' as Units, blocks: [fresh], selectedBlockIds: [fresh.id], history: { past: [], future: [] } };
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
    clearSelection: () => set({ selectedBlockIds: [] }),
    undo: () =>
      set((state) => {
        if (!state.history.past.length) return state;
        const previous = state.history.past[state.history.past.length - 1];
        const newPast = state.history.past.slice(0, -1);
        const currentSnapshot = createSnapshot(state);
        return {
          units: previous.units,
          blocks: deepClone(previous.blocks).map(ensureRotation),
          history: {
            past: newPast,
            future: [currentSnapshot, ...state.history.future].slice(0, MAX_HISTORY)
          },
          selectedBlockIds: state.selectedBlockIds.filter((id) => previous.blocks.some((block) => block.id === id))
        };
      }),
    redo: () =>
      set((state) => {
        if (!state.history.future.length) return state;
        const next = state.history.future[0];
        const remainingFuture = state.history.future.slice(1);
        const currentSnapshot = createSnapshot(state);
        return {
          units: next.units,
          blocks: deepClone(next.blocks).map(ensureRotation),
          history: {
            past: [...state.history.past, currentSnapshot].slice(-MAX_HISTORY),
            future: remainingFuture
          },
          selectedBlockIds: state.selectedBlockIds.filter((id) => next.blocks.some((block) => block.id === id))
        };
      }),
    applyBatch: (mutator) =>
      set((state) => {
        const draft = {
          units: state.units,
          blocks: deepClone(state.blocks).map(ensureRotation)
        };
        mutator(draft);
        const changed =
          draft.units !== state.units ||
          JSON.stringify(state.blocks) !== JSON.stringify(draft.blocks);
        if (!changed) {
          return state;
        }
        return {
          ...state,
          units: draft.units,
          blocks: draft.blocks,
          history: { past: pushPast(state), future: [] }
        };
      })
  };
});
