import type { Box } from '../detect/types.ts';

export type RegionSource = 'detected' | 'manual';
export type RegionShape = 'ellipse' | 'rect';

export interface Region {
  id: string;
  source: RegionSource;
  shape: RegionShape;
  box: Box;
  enabled: boolean;
  isSuggestion: boolean;
  confidence: number | null;
}

export type MaskStyle = 'pixelate' | 'blur';

export interface MaskSettings {
  style: MaskStyle;
  strength: number;
  feather: number;
  cornerRadius: number;
}
