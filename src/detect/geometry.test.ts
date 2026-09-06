import { describe, expect, it } from 'vitest';
import { intersectionOverSmaller, intersectionOverUnion, rotatePoint, toOriginalCoordinates, unrotatePoint } from './geometry.ts';
import type { Detection, Rotation } from './types.ts';

const ROTATIONS: Rotation[] = [0, 90, 180, 270];

describe('rotatePoint / unrotatePoint', () => {
  it.each(ROTATIONS)('round-trips a point through rotation %i', (rotation) => {
    // given
    const point = { x: 17, y: 5 };

    // when
    const restored = unrotatePoint(rotatePoint(point, rotation, 100, 40), rotation, 100, 40);

    // then
    expect(restored.x).toBeCloseTo(point.x);
    expect(restored.y).toBeCloseTo(point.y);
  });

  it('maps the top-left corner to the top-right corner when rotating 90 degrees clockwise', () => {
    expect(rotatePoint({ x: 0, y: 0 }, 90, 100, 40)).toEqual({ x: 40, y: 0 });
  });
});

describe('toOriginalCoordinates', () => {
  it('maps a box found in a scaled, rotated tile back to original pixels', () => {
    // given
    const crop = { x: 100, y: 200, w: 400, h: 300 };
    const scale = 0.5;
    const rotation: Rotation = 90;
    const uprightBox = { x: 20, y: 30, w: 40, h: 50 };
    const rotatedTopLeft = rotatePoint({ x: uprightBox.x, y: uprightBox.y + uprightBox.h }, rotation, 200, 150);
    const detection: Detection = { ...rotatedTopLeft, w: uprightBox.h, h: uprightBox.w, score: 0.9, rotation, landmarks: [] };

    // when
    const original = toOriginalCoordinates(detection, { crop, scale, rotation });

    // then
    expect(original.x).toBeCloseTo(crop.x + uprightBox.x / scale);
    expect(original.y).toBeCloseTo(crop.y + uprightBox.y / scale);
    expect(original.w).toBeCloseTo(uprightBox.w / scale);
    expect(original.h).toBeCloseTo(uprightBox.h / scale);
  });
});

describe('overlap measures', () => {
  it('reports full containment as 1 even when IoU is small', () => {
    // given
    const large = { x: 0, y: 0, w: 100, h: 100 };
    const small = { x: 10, y: 10, w: 10, h: 10 };

    // then
    expect(intersectionOverSmaller(large, small)).toBe(1);
    expect(intersectionOverUnion(large, small)).toBeCloseTo(0.01);
  });
});
