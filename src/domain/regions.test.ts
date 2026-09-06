import { describe, expect, it } from 'vitest';
import type { Detection } from '../detect/types.ts';
import { centeredManualBox, isVisibleRegion, regionFromDetection, toggledRegion } from './regions.ts';

function detection(score: number): Detection {
  return { x: 100, y: 100, w: 50, h: 60, score, rotation: 0, landmarks: [] };
}

describe('regionFromDetection', () => {
  it('turns a confident detection into an enabled ordinary region', () => {
    const region = regionFromDetection(detection(0.9), 1000, 1000);
    expect(region.enabled).toBe(true);
    expect(region.isSuggestion).toBe(false);
  });

  it('turns a weak detection into a hidden suggestion', () => {
    const region = regionFromDetection(detection(0.4), 1000, 1000);
    expect(region.enabled).toBe(false);
    expect(region.isSuggestion).toBe(true);
    expect(isVisibleRegion(region, false)).toBe(false);
    expect(isVisibleRegion(region, true)).toBe(true);
  });
});

describe('toggledRegion', () => {
  it('promotes a suggestion to an ordinary enabled region', () => {
    const promoted = toggledRegion(regionFromDetection(detection(0.4), 1000, 1000));
    expect(promoted.enabled).toBe(true);
    expect(promoted.isSuggestion).toBe(false);
    expect(isVisibleRegion(promoted, false)).toBe(true);
  });

  it('keeps a user-disabled face visible', () => {
    const disabled = toggledRegion(regionFromDetection(detection(0.9), 1000, 1000));
    expect(disabled.enabled).toBe(false);
    expect(isVisibleRegion(disabled, false)).toBe(true);
  });
});

describe('centeredManualBox', () => {
  it('places a square sized from the shorter side in the middle of the photo', () => {
    expect(centeredManualBox(1000, 500)).toEqual({ x: 450, y: 200, w: 100, h: 100 });
  });
});
