import {
  ArrowRight as LucideArrowRight,
  ChevronDown as LucideChevronDown,
  ChevronUp as LucideChevronUp,
  Copy as LucideCopy,
  Download as LucideDownload,
  Info as LucideInfo,
  MapPin as LucideMapPin,
  MoreHorizontal as LucideMoreHorizontal,
  Plus as LucidePlus,
  RefreshCw as LucideRefreshCw,
  RotateCw as LucideRotateCw,
  Search as LucideSearch,
  Trash2 as LucideTrash2,
  X as LucideX
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
