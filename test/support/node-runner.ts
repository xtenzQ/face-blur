import * as ort from 'onnxruntime-node';
import { YUNET_STRIDES, type ModelRunner, type YuNetOutputs } from '../../src/detect/types.ts';

const INPUT_NAME = 'input';

export async function createNodeRunner(modelPath: string): Promise<ModelRunner> {
  const session = await ort.InferenceSession.create(modelPath);
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
