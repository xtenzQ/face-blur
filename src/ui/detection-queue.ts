import { getBrowserRunner } from '../detect/browser-runner.ts';
import { detectFaces } from '../detect/pipeline.ts';
import { regionFromDetection } from '../domain/regions.ts';
import { createCanvasRaster } from '../image/canvas-raster.ts';
import { setDetectedRegions, setPhotoStatus } from './actions.ts';
import type { AppState, PhotoEntry, Store } from './store.ts';

function nextQueued(state: AppState): PhotoEntry | null {
  return state.photos.find((photo) => photo.status === 'queued') ?? null;
}

function yieldToEventLoop(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

async function detectOne(store: Store<AppState>, photo: PhotoEntry): Promise<void> {
  setPhotoStatus(store, photo.id, 'detecting');
  try {
    const runner = await getBrowserRunner();
    const raster = createCanvasRaster(photo.image, photo.width, photo.height);
    const detections = await detectFaces(raster, runner);
    const stillPresent = store.get().photos.some((entry) => entry.id === photo.id);
    if (stillPresent) {
      setDetectedRegions(
        store,
        photo.id,
        detections.map((detection) => regionFromDetection(detection, photo.width, photo.height)),
      );
    }
  } catch (error) {
    console.error(error);
    setPhotoStatus(store, photo.id, 'failed');
  }
}

export function startDetectionQueue(store: Store<AppState>): void {
  let isRunning = false;

  async function drain(): Promise<void> {
    if (isRunning) {
      return;
    }
    isRunning = true;
    try {
      for (let photo = nextQueued(store.get()); photo; photo = nextQueued(store.get())) {
        await detectOne(store, photo);
        await yieldToEventLoop();
      }
    } finally {
      isRunning = false;
    }
  }

  async function warmUpModel(): Promise<void> {
    store.update((state) => ({ ...state, modelStatus: 'loading' }));
    try {
      await getBrowserRunner();
      store.update((state) => ({ ...state, modelStatus: 'ready' }));
    } catch (error) {
      console.error(error);
      store.update((state) => ({ ...state, modelStatus: 'failed' }));
    }
  }

  void warmUpModel();
  store.subscribe(() => {
    void drain();
  });
}
