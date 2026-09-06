export interface Point {
  x: number;
  y: number;
}

export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

export type Rotation = 0 | 90 | 180 | 270;

export interface Detection extends Box {
  score: number;
  rotation: Rotation;
  landmarks: Point[];
}

export interface Raster {
  data: Uint8ClampedArray;
  width: number;
  height: number;
}

export interface RasterProvider {
  readonly width: number;
  readonly height: number;
  read(crop: Box, scale: number, rotation: Rotation): Promise<Raster>;
}

export const YUNET_STRIDES = [8, 16, 32] as const;

export interface YuNetOutputs {
  cls: Float32Array[];
  obj: Float32Array[];
  bbox: Float32Array[];
  kps: Float32Array[];
}

export interface ModelRunner {
  run(input: Float32Array, width: number, height: number): Promise<YuNetOutputs>;
}
