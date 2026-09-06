import * as ort from 'onnxruntime-web/wasm';
import wasmUrl from 'onnxruntime-web/ort-wasm-simd-threaded.wasm?url';
import { YUNET_STRIDES, type ModelRunner, type YuNetOutputs } from './types.ts';

const INPUT_NAME = 'input';
const MODEL_URL = `${import.meta.env.BASE_URL}models/face_detection_yunet_2026may.onnx`;

let runnerPromise: Promise<ModelRunner> | null = null;

async function createRunner(): Promise<ModelRunner> {
  ort.env.wasm.wasmPaths = { wasm: wasmUrl };
  ort.env.wasm.numThreads = 1;
  const session = await ort.InferenceSession.create(MODEL_URL, { executionProviders: ['wasm'] });
  return {
    async run(input, width, height): Promise<YuNetOutputs> {
      const feeds = { [INPUT_NAME]: new ort.Tensor('float32', input, [1, 3, height, width]) };
      const results = await session.run(feeds);
      const pick = (prefix: string): Float32Array[] =>
        YUNET_STRIDES.map((stride) => {
          const tensor = results[`${prefix}_${stride}`];
          if (!tensor) {
            throw new Error(`Missing output ${prefix}_${stride}`);
          }
          return tensor.data as Float32Array;
        });
      return { cls: pick('cls'), obj: pick('obj'), bbox: pick('bbox'), kps: pick('kps') };
    },
  };
}

export function getBrowserRunner(): Promise<ModelRunner> {
  runnerPromise ??= createRunner();
  return runnerPromise;
}
