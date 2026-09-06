import type { MaskSettings, Region } from '../domain/types.ts';
import type { PhotoKind } from '../image/load.ts';

export type PhotoStatus = 'queued' | 'detecting' | 'ready' | 'failed';

export interface PhotoEntry {
  id: string;
  name: string;
  file: File;
  kind: PhotoKind;
  image: HTMLImageElement;
  width: number;
  height: number;
  thumbnailUrl: string;
  regions: Region[];
  past: Region[][];
  future: Region[][];
  status: PhotoStatus;
}

export interface Settings {
  mask: MaskSettings;
  stripMetadata: boolean;
}

export type ModelStatus = 'idle' | 'loading' | 'ready' | 'failed';

export interface AppState {
  photos: PhotoEntry[];
  currentId: string | null;
  selectedRegionId: string | null;
  settings: Settings;
  isPeeking: boolean;
  modelStatus: ModelStatus;
  notices: string[];
  isExporting: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  mask: { style: 'pixelate', strength: 0.6, feather: 0.3, cornerRadius: 0.2 },
  stripMetadata: false,
};

const SETTINGS_KEY = 'face-blur.settings';

export function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) {
      return DEFAULT_SETTINGS;
    }
    const parsed: Partial<Settings> = JSON.parse(raw);
    return {
      mask: { ...DEFAULT_SETTINGS.mask, ...parsed.mask },
      stripMetadata: parsed.stripMetadata ?? DEFAULT_SETTINGS.stripMetadata,
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: Settings): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    return;
  }
}

export type Listener<T> = (state: T) => void;

export interface Store<T> {
  get(): T;
  set(next: T): void;
  update(mutate: (state: T) => T): void;
  subscribe(listener: Listener<T>): () => void;
}

export function createStore<T>(initial: T): Store<T> {
  let state = initial;
  const listeners = new Set<Listener<T>>();
  return {
    get: () => state,
    set(next) {
      state = next;
      for (const listener of listeners) {
        listener(state);
      }
    },
    update(mutate) {
      this.set(mutate(state));
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}

export function createAppStore(): Store<AppState> {
  return createStore<AppState>({
    photos: [],
    currentId: null,
    selectedRegionId: null,
    settings: loadSettings(),
    isPeeking: false,
    modelStatus: 'idle',
    notices: [],
    isExporting: false,
  });
}

export function currentPhoto(state: AppState): PhotoEntry | null {
  return state.photos.find((photo) => photo.id === state.currentId) ?? null;
}

export function selectedRegion(state: AppState): Region | null {
  const photo = currentPhoto(state);
  return photo?.regions.find((region) => region.id === state.selectedRegionId) ?? null;
}
