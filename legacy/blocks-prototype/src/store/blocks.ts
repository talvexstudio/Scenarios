import { create } from "zustand";

import type { Units } from "@/lib/units";
import type { BlockModel } from "@/types/blocks";

const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

const formatBlockName = (index: number) => {
  let label = "";
  let current = index;

  while (current >= 0) {
    label = alphabet[current % alphabet.length] + label;
    current = Math.floor(current / alphabet.length) - 1;
  }

  return `Block ${label}`;
};

const createBlock = (index: number): BlockModel => ({
  id: typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2),
  name: formatBlockName(index),
  xSize: 24,
  ySize: 24,
  levels: 8,
  levelHeight: 3.6,
  posX: index * 8,
  posY: 0,
  posZ: 0,
  rotationX: 0,
  rotationY: 0,
  rotationZ: 0,
  defaultFunction: "Office",
});

const initialBlock = createBlock(0);

const reindexBlocks = (blocks: BlockModel[]) =>
  blocks.map((block, index) => ({
    ...block,
    name: formatBlockName(index),
  }));

const cloneBlocks = (blocks: BlockModel[]) => blocks.map((block) => ({ ...block }));

type TransformMode = "translate" | "rotate";

interface BlockState {
  units: Units;
  blocks: BlockModel[];
  past: BlockModel[][];
  future: BlockModel[][];
  snapshot: BlockModel[] | null;
  selectedBlockId: string | null;
  transformMode: TransformMode;
  addBlock: () => void;
  duplicateBlock: (id: string) => void;
  updateBlock: (id: string, payload: Partial<BlockModel>) => void;
  updateBlockLive: (id: string, payload: Partial<BlockModel>) => void;
  removeBlock: (id: string) => void;
  setUnitsFromFirstBlock: (unit: Units) => void;
  selectBlock: (id: string | null) => void;
  setTransformMode: (mode: TransformMode) => void;
  startSnapshot: () => void;
  commitSnapshot: () => void;
  undo: () => void;
  redo: () => void;
}

const withHistory = (state: BlockState, nextBlocks: BlockModel[]) => ({
  blocks: nextBlocks,
  past: [...state.past, cloneBlocks(state.blocks)],
  future: [],
  snapshot: null,
});

export const useBlockStore = create<BlockState>((set, get) => ({
  units: "metric",
  blocks: [initialBlock],
  past: [],
  future: [],
  snapshot: null,
  selectedBlockId: initialBlock.id,
  transformMode: "translate",
  addBlock: () =>
    set((state) => {
      const next = [...state.blocks, createBlock(state.blocks.length)];
      const reindexed = reindexBlocks(next);
      return {
        ...withHistory(state, reindexed),
        selectedBlockId: reindexed[reindexed.length - 1]?.id ?? null,
      };
    }),
  duplicateBlock: (id) =>
    set((state) => {
      const index = state.blocks.findIndex((block) => block.id === id);
      if (index === -1) return {};
      const source = state.blocks[index];
      const clone: BlockModel = {
        ...source,
        id: typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2),
      };
      const next = [...state.blocks.slice(0, index + 1), clone, ...state.blocks.slice(index + 1)];
      const reindexed = reindexBlocks(next);
      return {
        ...withHistory(state, reindexed),
        selectedBlockId: clone.id,
      };
    }),
  updateBlock: (id, payload) =>
    set((state) => {
      const reindexed = reindexBlocks(
        state.blocks.map((block) => (block.id === id ? { ...block, ...payload } : block)),
      );
      return {
        ...withHistory(state, reindexed),
      };
    }),
  updateBlockLive: (id, payload) =>
    set((state) => ({
      blocks: state.blocks.map((block) => (block.id === id ? { ...block, ...payload } : block)),
    })),
  removeBlock: (id) =>
    set((state) => {
      if (state.blocks.length === 1) {
        return {};
      }

      const next = state.blocks.filter((block) => block.id !== id);
      const reindexed = next.length ? reindexBlocks(next) : [createBlock(0)];
      return {
        ...withHistory(state, reindexed),
        selectedBlockId: reindexed.find((block) => block.id === state.selectedBlockId)?.id ?? reindexed[0]?.id ?? null,
      };
    }),
  setUnitsFromFirstBlock: (unit) => {
    if (get().units === unit) return;
    set({ units: unit });
  },
  selectBlock: (id) => set({ selectedBlockId: id }),
  setTransformMode: (mode) => set({ transformMode: mode }),
  startSnapshot: () =>
    set((state) => {
      if (state.snapshot) return {};
      return { snapshot: cloneBlocks(state.blocks) };
    }),
  commitSnapshot: () =>
    set((state) => {
      if (!state.snapshot) return state;
      return {
        past: [...state.past, state.snapshot],
        snapshot: null,
        future: [],
      };
    }),
  undo: () =>
    set((state) => {
      const pastStack = state.snapshot ? [...state.past, state.snapshot] : state.past;
      const futureStack = state.snapshot ? [] : state.future;
      if (!pastStack.length) {
        return state.snapshot ? { snapshot: null } : state;
      }
      const previous = pastStack[pastStack.length - 1];
      const newPast = pastStack.slice(0, -1);
      return {
        blocks: previous,
        past: newPast,
        future: [...futureStack, cloneBlocks(state.blocks)],
        snapshot: null,
        selectedBlockId: previous.find((block) => block.id === state.selectedBlockId)?.id ?? previous[0]?.id ?? null,
      };
    }),
  redo: () =>
    set((state) => {
      if (!state.future.length) return state;
      const next = state.future[state.future.length - 1];
      const newFuture = state.future.slice(0, -1);
      return {
        blocks: next,
        past: [...state.past, cloneBlocks(state.blocks)],
        future: newFuture,
        snapshot: null,
        selectedBlockId: next.find((block) => block.id === state.selectedBlockId)?.id ?? next[0]?.id ?? null,
      };
    }),
}));
