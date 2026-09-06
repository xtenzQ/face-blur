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

const BLUR_MARGIN_FACTOR = 2;
const FEATHER_MARGIN_FACTOR = 3;
const FEATHER_SIGMA_FACTOR = 0.5;
const MASK_COLOR = '#fff';
const MIN_BLUR_PIXELS = 1;
const MAX_DOWNSCALE_STEP = 2;

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

function sizedCanvas(width: number, height: number): Canvas {
  return createCanvas(Math.max(1, Math.round(width)), Math.max(1, Math.round(height)));
}

function resizedCopy(source: Canvas, width: number, height: number): Canvas {
  const copy = sizedCanvas(width, height);
  const context = get2dContext(copy);
  context.imageSmoothingEnabled = true;
  context.drawImage(source, 0, 0, source.width, source.height, 0, 0, copy.width, copy.height);
  return copy;
}

function resampleBlur(canvas: Canvas, radius: number): void {
  if (radius < MIN_BLUR_PIXELS) {
    return;
  }
  const targetWidth = Math.max(1, Math.round(canvas.width / radius));
  const targetHeight = Math.max(1, Math.round(canvas.height / radius));
  let scaled: Canvas = canvas;
  while (scaled.width > targetWidth * MAX_DOWNSCALE_STEP && scaled.height > targetHeight * MAX_DOWNSCALE_STEP) {
    scaled = resizedCopy(scaled, Math.round(scaled.width / MAX_DOWNSCALE_STEP), Math.round(scaled.height / MAX_DOWNSCALE_STEP));
  }
  if (scaled.width !== targetWidth || scaled.height !== targetHeight) {
    scaled = resizedCopy(scaled, targetWidth, targetHeight);
  }
  if (scaled === canvas) {
    return;
  }
  while (scaled.width * MAX_DOWNSCALE_STEP < canvas.width && scaled.height * MAX_DOWNSCALE_STEP < canvas.height) {
    scaled = resizedCopy(scaled, scaled.width * MAX_DOWNSCALE_STEP, scaled.height * MAX_DOWNSCALE_STEP);
  }
  const context = get2dContext(canvas);
  context.imageSmoothingEnabled = true;
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.drawImage(scaled, 0, 0, scaled.width, scaled.height, 0, 0, canvas.width, canvas.height);
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
  const tile = sizedCanvas(area.w * scale, area.h * scale);
  const context = get2dContext(tile);
  context.imageSmoothingEnabled = true;
  context.drawImage(source, area.x, area.y, area.w, area.h, 0, 0, tile.width, tile.height);
  resampleBlur(tile, blurRadius(region, settings.strength) * scale);
  return tile;
}

function applyShapeAlpha(tile: Canvas, region: Region, area: Box, settings: MaskSettings, scale: number): void {
  const shape = sizedCanvas(tile.width, tile.height);
  const shapeContext = get2dContext(shape);
  const feather = featherRadius(region.box, settings.feather);
  const dilated = { ...region, box: expandBox(region.box, feather) };
  shapeContext.fillStyle = MASK_COLOR;
  maskPath(shapeContext, dilated, settings, { scale, offsetX: -area.x * scale, offsetY: -area.y * scale });
  shapeContext.fill();
  resampleBlur(shape, feather * FEATHER_SIGMA_FACTOR * scale);
  const tileContext = get2dContext(tile);
  tileContext.globalCompositeOperation = 'destination-in';
  tileContext.drawImage(shape, 0, 0);
  tileContext.globalCompositeOperation = 'source-over';
}

function maskMargin(region: Region, settings: MaskSettings): number {
  const blurMargin = settings.style === 'blur' ? blurRadius(region.box, settings.strength) * BLUR_MARGIN_FACTOR : 0;
  return Math.ceil(blurMargin + featherRadius(region.box, settings.feather) * FEATHER_MARGIN_FACTOR);
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
