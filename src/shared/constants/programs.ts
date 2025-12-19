import { BlockFunction } from '../types';

export const PROGRAM_COLORS: Record<BlockFunction, { label: string; color: string }> = {
  Retail: { label: 'Retail', color: '#f17373' },
  Office: { label: 'Office', color: '#4f6cd2' },
  Residential: { label: 'Residential', color: '#f6c95a' },
  Mixed: { label: 'Mixed-use', color: '#73c6a2' },
  Others: { label: 'Others', color: '#c5ccd6' }
};

