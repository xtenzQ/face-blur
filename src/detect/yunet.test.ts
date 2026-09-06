import { describe, expect, it } from 'vitest';
import { YUNET_STRIDES, type YuNetOutputs } from './types.ts';
import { decodeYuNet } from './yunet.ts';

const WIDTH = 64;
const HEIGHT = 32;

function emptyOutputs(): YuNetOutputs {
  const cells = YUNET_STRIDES.map((stride) => (WIDTH / stride) * (HEIGHT / stride));
  return {
    cls: cells.map((n) => new Float32Array(n)),
    obj: cells.map((n) => new Float32Array(n)),
    bbox: cells.map((n) => new Float32Array(n * 4)),
    kps: cells.map((n) => new Float32Array(n * 10)),
  };
}

describe('decodeYuNet', () => {
  it('decodes a single hot cell into a box centred on that cell', () => {
    // given
    const outputs = emptyOutputs();
    const level = 1;
    const stride = 16;
    const cols = WIDTH / stride;
    const row = 1;
    const col = 2;
    const index = row * cols + col;
    outputs.cls[level]?.set([0.81], index);
    outputs.obj[level]?.set([1], index);
    outputs.bbox[level]?.set([0.5, 0.5, Math.log(2), Math.log(3)], index * 4);
    outputs.kps[level]?.set([0.5, 0.5], index * 10);

    // when
    const [detection, ...rest] = decodeYuNet(outputs, { width: WIDTH, height: HEIGHT, scoreThreshold: 0.5, rotation: 0 });

    // then
    expect(rest).toHaveLength(0);
    expect(detection?.score).toBeCloseTo(0.9);
    expect(detection?.w).toBeCloseTo(32);
    expect(detection?.h).toBeCloseTo(48);
    expect(detection?.x).toBeCloseTo((col + 0.5) * stride - 16);
    expect(detection?.y).toBeCloseTo((row + 0.5) * stride - 24);
    expect(detection?.landmarks[0]).toEqual({ x: (col + 0.5) * stride, y: (row + 0.5) * stride });
  });

  it('drops cells below the score threshold and clamps scores above one', () => {
    // given
    const outputs = emptyOutputs();
    outputs.cls[0]?.set([0.2], 3);
    outputs.obj[0]?.set([0.2], 3);
    outputs.cls[2]?.set([5], 0);
    outputs.obj[2]?.set([5], 0);

    // when
    const detections = decodeYuNet(outputs, { width: WIDTH, height: HEIGHT, scoreThreshold: 0.3, rotation: 0 });

    // then
    expect(detections).toHaveLength(1);
    expect(detections[0]?.score).toBe(1);
  });
});
