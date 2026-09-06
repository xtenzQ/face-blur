import type { Box } from '../detect/types.ts';
import type { MaskSettings, Region } from '../domain/types.ts';
import { createCanvas, get2dContext, type Context2D, type ImageSource } from '../image/canvas-raster.ts';
import { blurRadius, cornerRadius, expandBox, featherRadius, pixelBlockSize } from './geometry.ts';

export interface ViewTransform {
  scale: number;
  offsetX: number;
  offsetY: number;
}

export const IDENTITY_TRANSFORM: ViewTransform = { scale: 1, offsetX: 0, offsetY: 0 };

const FALLBACK_BLUR_DOWNSCALE = 0.35;
const BLUR_MARGIN_FACTOR = 2;
const MASK_COLOR = '#fff';

type Canvas = OffscreenCanvas | HTMLCanvasElement;

export function maskPath(context: Context2D, region: Region, settings: MaskSettings, view: ViewTransform): void {
  const { x, y, w, h } = region.box;
  const left = x * view.scale + view.offsetX;
  const top = y * view.scale + view.offsetY;
  const width = w * view.scale;
  const height = h * view.scale;
  context.beginPath();
  if (region.shape === 'ellipse') {
    context.ellipse(left + width / 2, top + height / 2, width / 2, height / 2, 0, 0, Math.PI * 2);
    return;
  }
  const radius = cornerRadius(region.box, settings.cornerRadius) * view.scale;
  if (radius > 0 && 'roundRect' in context) {
    context.roundRect(left, top, width, height, radius);
  } else {
    context.rect(left, top, width, height);
  }
}

function supportsCanvasFilter(context: Context2D): boolean {
  return 'filter' in context;
}

function sizedCanvas(width: number, height: number): Canvas {
  return createCanvas(Math.max(1, Math.round(width)), Math.max(1, Math.round(height)));
}

function pixelatedTile(source: ImageSource, region: Box, area: Box, settings: MaskSettings, scale: number): Canvas {
  const block = pixelBlockSize(region, settings.strength);
  const small = sizedCanvas(area.w / block, area.h / block);
  const smallContext = get2dContext(small);
  smallContext.imageSmoothingEnabled = true;
  smallContext.drawImage(source, area.x, area.y, area.w, area.h, 0, 0, small.width, small.height);
  const tile = sizedCanvas(area.w * scale, area.h * scale);
  const tileContext = get2dContext(tile);
  tileContext.imageSmoothingEnabled = false;
  tileContext.drawImage(small, 0, 0, tile.width, tile.height);
  return tile;
}

function blurredTile(source: ImageSource, region: Box, area: Box, settings: MaskSettings, scale: number): Canvas {
  const radius = blurRadius(region, settings.strength);
  const tile = sizedCanvas(area.w * scale, area.h * scale);
  const context = get2dContext(tile);
  if (supportsCanvasFilter(context)) {
    context.filter = `blur(${radius * scale}px)`;
    context.drawImage(source, area.x, area.y, area.w, area.h, 0, 0, tile.width, tile.height);
    return tile;
  }
  const small = sizedCanvas(tile.width * FALLBACK_BLUR_DOWNSCALE, tile.height * FALLBACK_BLUR_DOWNSCALE);
  get2dContext(small).drawImage(source, area.x, area.y, area.w, area.h, 0, 0, small.width, small.height);
  context.imageSmoothingEnabled = true;
  context.drawImage(small, 0, 0, tile.width, tile.height);
  return tile;
}

function applyShapeAlpha(tile: Canvas, region: Region, area: Box, settings: MaskSettings, scale: number): void {
  const shape = sizedCanvas(tile.width, tile.height);
  const shapeContext = get2dContext(shape);
  const feather = featherRadius(region.box, settings.feather) * scale;
  if (feather > 0 && supportsCanvasFilter(shapeContext)) {
    shapeContext.filter = `blur(${feather}px)`;
  }
  shapeContext.fillStyle = MASK_COLOR;
  maskPath(shapeContext, region, settings, { scale, offsetX: -area.x * scale, offsetY: -area.y * scale });
  shapeContext.fill();
  const tileContext = get2dContext(tile);
  tileContext.globalCompositeOperation = 'destination-in';
  tileContext.drawImage(shape, 0, 0);
  tileContext.globalCompositeOperation = 'source-over';
}

function maskMargin(region: Region, settings: MaskSettings): number {
  const blurMargin = settings.style === 'blur' ? blurRadius(region.box, settings.strength) * BLUR_MARGIN_FACTOR : 0;
  return Math.ceil(blurMargin + featherRadius(region.box, settings.feather) * BLUR_MARGIN_FACTOR);
}

export function drawMask(context: Context2D, source: ImageSource, region: Region, settings: MaskSettings, view: ViewTransform): void {
  const box = region.box;
  if (box.w < 1 || box.h < 1) {
    return;
  }
  const area = expandBox(box, maskMargin(region, settings));
  const tile =
    settings.style === 'pixelate'
      ? pixelatedTile(source, box, area, settings, view.scale)
      : blurredTile(source, box, area, settings, view.scale);
  applyShapeAlpha(tile, region, area, settings, view.scale);
  context.drawImage(tile, area.x * view.scale + view.offsetX, area.y * view.scale + view.offsetY, area.w * view.scale, area.h * view.scale);
}

export interface MaskedImageOptions {
  source: ImageSource;
  width: number;
  height: number;
  regions: Region[];
  settings: MaskSettings;
  view: ViewTransform;
}

export function drawMaskedImage(context: Context2D, options: MaskedImageOptions): void {
  const { source, width, height, regions, settings, view } = options;
  context.drawImage(source, view.offsetX, view.offsetY, width * view.scale, height * view.scale);
  for (const region of regions) {
    if (region.enabled) {
      drawMask(context, source, region, settings, view);
    }
  }
}
