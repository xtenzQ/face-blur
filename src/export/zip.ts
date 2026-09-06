import { zipSync } from 'fflate';

const STORE_ONLY = 0;

export function zipFiles(files: Map<string, Uint8Array>): Uint8Array<ArrayBuffer> {
  const entries: Record<string, [Uint8Array, { level: 0 }]> = {};
  for (const [name, bytes] of files) {
    entries[name] = [bytes, { level: STORE_ONLY }];
  }
  return new Uint8Array(zipSync(entries));
}
