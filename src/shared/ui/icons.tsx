import {
  AlignCenterVertical as LucideAlignCenterVertical,
  ArrowDownToLine as LucideArrowDownToLine,
  ArrowLeftRight as LucideArrowLeftRight,
  ArrowRight as LucideArrowRight,
  ArrowUpDown as LucideArrowUpDown,
  ChevronDown as LucideChevronDown,
  ChevronUp as LucideChevronUp,
  Copy as LucideCopy,
  Crosshair as LucideCrosshair,
  Download as LucideDownload,
  Info as LucideInfo,
  Layers as LucideLayers,
  MapPin as LucideMapPin,
  MoreHorizontal as LucideMoreHorizontal,
  Move3d as LucideMove3d,
  Plus as LucidePlus,
  RefreshCw as LucideRefreshCw,
  Redo2 as LucideRedo2,
  RotateCcw as LucideRotateCcw,
  RotateCw as LucideRotateCw,
  Search as LucideSearch,
  Trash2 as LucideTrash2,
  Undo2 as LucideUndo2,
  X as LucideX,
  Pencil as LucidePencil
} from 'lucide-react';
import type { LucideIcon, LucideProps } from 'lucide-react';

const withDefaults = (Icon: LucideIcon) => {
  const Component = ({ size = 16, strokeWidth = 1.5, className, ...rest }: LucideProps) => (
    <Icon size={size} strokeWidth={strokeWidth} className={className ?? 'text-slate-600'} {...rest} />
  );
  Component.displayName = `Talvex${Icon.displayName ?? Icon.name ?? 'Icon'}`;
  return Component;
};

export const ChevronDown = withDefaults(LucideChevronDown);
export const ChevronUp = withDefaults(LucideChevronUp);
export const Plus = withDefaults(LucidePlus);
export const X = withDefaults(LucideX);
export const Info = withDefaults(LucideInfo);
export const MapPin = withDefaults(LucideMapPin);
export const RotateCw = withDefaults(LucideRotateCw);
export const Search = withDefaults(LucideSearch);
export const MoreHorizontal = withDefaults(LucideMoreHorizontal);
export const Trash2 = withDefaults(LucideTrash2);
export const Copy = withDefaults(LucideCopy);
export const Download = withDefaults(LucideDownload);
export const RefreshCw = withDefaults(LucideRefreshCw);
export const ArrowRight = withDefaults(LucideArrowRight);
export const RotateCcw = withDefaults(LucideRotateCcw);
export const Crosshair = withDefaults(LucideCrosshair);
export const ArrowDownToLine = withDefaults(LucideArrowDownToLine);
export const ArrowLeftRight = withDefaults(LucideArrowLeftRight);
export const ArrowUpDown = withDefaults(LucideArrowUpDown);
export const AlignVerticalCenter = withDefaults(LucideAlignCenterVertical);
export const Move3d = withDefaults(LucideMove3d);
export const Layers = withDefaults(LucideLayers);
export const Undo2 = withDefaults(LucideUndo2);
export const Redo2 = withDefaults(LucideRedo2);
export const Pencil = withDefaults(LucidePencil);
