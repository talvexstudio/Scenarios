import type { BlockFunction } from "@/types/blocks";

export const PROGRAM_OPTIONS: BlockFunction[] = [
  "Retail",
  "Office",
  "Residential",
  "Mixed",
  "Others",
];

export const FUNCTION_COLORS: Record<BlockFunction, string> = {
  Retail: "#f97316",
  Office: "#3b82f6",
  Residential: "#22c55e",
  Mixed: "#a855f7",
  Others: "#94a3b8",
};
