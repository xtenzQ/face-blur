import type { Box, Detection, Point, Rotation } from './types.ts';

export function intersectionOverUnion(a: Box, b: Box): number {
  const left = Math.max(a.x, b.x);
  const top = Math.max(a.y, b.y);
  const right = Math.min(a.x + a.w, b.x + b.w);
  const bottom = Math.min(a.y + a.h, b.y + b.h);
  const intersection = Math.max(0, right - left) * Math.max(0, bottom - top);
  const union = a.w * a.h + b.w * b.h - intersection;
  return union <= 0 ? 0 : intersection / union;
}

export function intersectionOverSmaller(a: Box, b: Box): number {
  const left = Math.max(a.x, b.x);
  const top = Math.max(a.y, b.y);
  const right = Math.min(a.x + a.w, b.x + b.w);
  const bottom = Math.min(a.y + a.h, b.y + b.h);
  const intersection = Math.max(0, right - left) * Math.max(0, bottom - top);
  const smaller = Math.min(a.w * a.h, b.w * b.h);
  return smaller <= 0 ? 0 : intersection / smaller;
}

export function unrotatePoint(point: Point, rotation: Rotation, uprightWidth: number, uprightHeight: number): Point {
  switch (rotation) {
    case 0:
      return point;
    case 90:
      return { x: point.y, y: uprightHeight - point.x };
    case 180:
      return { x: uprightWidth - point.x, y: uprightHeight - point.y };
    case 270:
      return { x: uprightWidth - point.y, y: point.x };
  }
}

export function rotatePoint(point: Point, rotation: Rotation, uprightWidth: number, uprightHeight: number): Point {
  switch (rotation) {
    case 0:
      return point;
    case 90:
      return { x: uprightHeight - point.y, y: point.x };
    case 180:
      return { x: uprightWidth - point.x, y: uprightHeight - point.y };
    case 270:
      return { x: point.y, y: uprightWidth - point.x };
  }
}

export function unrotateBox(box: Box, rotation: Rotation, uprightWidth: number, uprightHeight: number): Box {
  const a = unrotatePoint({ x: box.x, y: box.y }, rotation, uprightWidth, uprightHeight);
  const b = unrotatePoint({ x: box.x + box.w, y: box.y + box.h }, rotation, uprightWidth, uprightHeight);
  const x = Math.min(a.x, b.x);
  const y = Math.min(a.y, b.y);
  return { x, y, w: Math.abs(a.x - b.x), h: Math.abs(a.y - b.y) };
}

export function rotatedSize(width: number, height: number, rotation: Rotation): { width: number; height: number } {
  return rotation === 90 || rotation === 270 ? { width: height, height: width } : { width, height };
}

export interface PassTransform {
  crop: Box;
  scale: number;
  rotation: Rotation;
}

export function toOriginalCoordinates(detection: Detection, pass: PassTransform): Detection {
  const uprightWidth = Math.round(pass.crop.w * pass.scale);
  const uprightHeight = Math.round(pass.crop.h * pass.scale);
  const upright = unrotateBox(detection, pass.rotation, uprightWidth, uprightHeight);
  const landmarks = detection.landmarks.map((point) => {
    const uprightPoint = unrotatePoint(point, pass.rotation, uprightWidth, uprightHeight);
    return { x: uprightPoint.x / pass.scale + pass.crop.x, y: uprightPoint.y / pass.scale + pass.crop.y };
  });
  return {
    x: upright.x / pass.scale + pass.crop.x,
    y: upright.y / pass.scale + pass.crop.y,
    w: upright.w / pass.scale,
    h: upright.h / pass.scale,
    score: detection.score,
    rotation: detection.rotation,
    landmarks,
  };
}

export function clampBox(box: Box, width: number, height: number): Box {
  const x = Math.max(0, box.x);
  const y = Math.max(0, box.y);
  const right = Math.min(width, box.x + box.w);
  const bottom = Math.min(height, box.y + box.h);
  return { x, y, w: Math.max(0, right - x), h: Math.max(0, bottom - y) };
}
