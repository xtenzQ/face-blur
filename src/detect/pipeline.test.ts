import { describe, expect, it } from 'vitest';
import { DEFAULT_DETECT_OPTIONS, planPasses } from './pipeline.ts';

describe('planPasses', () => {
  it('plans one full-frame pass per rotation for a normal photo', () => {
    // when
    const passes = planPasses(2000, 1500, DEFAULT_DETECT_OPTIONS);

    // then
    expect(passes.map((pass) => pass.rotation)).toEqual([0, 90, 180, 270]);
    expect(passes[0]?.scale).toBeCloseTo(1920 / 2000);
    expect(passes.every((pass) => pass.crop.w === 2000 && pass.crop.h === 1500)).toBe(true);
  });

  it('adds four overlapping tiles for a very large photo', () => {
    // when
    const passes = planPasses(4000, 3000, DEFAULT_DETECT_OPTIONS);
    const tiles = passes.filter((pass) => pass.crop.w < 4000);

    // then
    expect(tiles).toHaveLength(4);
    expect(tiles.every((tile) => tile.rotation === 0)).toBe(true);
    expect(tiles[0]?.crop).toEqual({ x: 0, y: 0, w: 2300, h: 1725 });
    expect((tiles[3]?.crop.x ?? 0) + (tiles[3]?.crop.w ?? 0)).toBe(4000);
  });

  it('asks rotated passes for a higher raw score than the upright pass', () => {
    // when
    const passes = planPasses(1000, 1000, DEFAULT_DETECT_OPTIONS);
    const upright = passes.find((pass) => pass.rotation === 0);
    const rotated = passes.find((pass) => pass.rotation === 90);

    // then
    expect(rotated?.scoreThreshold ?? 0).toBeGreaterThan(upright?.scoreThreshold ?? 1);
  });
});
