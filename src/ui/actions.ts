import type { Box } from '../detect/types.ts';
import { manualRegion } from '../domain/regions.ts';
import type { Region, RegionShape } from '../domain/types.ts';
import { t } from '../i18n/en.ts';
import { kindOf, loadImage, releaseImage } from '../image/load.ts';
import { galleryThumbnail } from '../image/thumbnail.ts';
import { currentPhoto, saveSettings, type AppState, type PhotoEntry, type Settings, type Store } from './store.ts';

const MAX_HISTORY = 50;
const NOTICE_TTL_MS = 6000;

export function notify(store: Store<AppState>, message: string): void {
  store.update((state) => ({ ...state, notices: [...state.notices, message] }));
  setTimeout(() => {
    store.update((state) => ({ ...state, notices: state.notices.filter((notice) => notice !== message) }));
  }, NOTICE_TTL_MS);
}

async function createEntry(file: File): Promise<PhotoEntry> {
  const loaded = await loadImage(file);
  const thumbnailUrl = await galleryThumbnail(loaded.image, loaded.width, loaded.height);
  return {
    id: crypto.randomUUID(),
    name: file.name,
    file,
    kind: loaded.kind,
    image: loaded.image,
    width: loaded.width,
    height: loaded.height,
    thumbnailUrl,
    regions: [],
    past: [],
    future: [],
    status: 'queued',
  };
}

export async function addFiles(store: Store<AppState>, files: Iterable<File>): Promise<void> {
  for (const file of files) {
    if (!kindOf(file)) {
      notify(store, t.unsupportedFile(file.name));
      continue;
    }
    try {
      const entry = await createEntry(file);
      store.update((state) => ({ ...state, photos: [...state.photos, entry], currentId: state.currentId ?? entry.id }));
    } catch {
      notify(store, t.decodeFailed(file.name));
    }
  }
}

export function removePhoto(store: Store<AppState>, photoId: string): void {
  const state = store.get();
  const photo = state.photos.find((entry) => entry.id === photoId);
  if (!photo) {
    return;
  }
  releaseImage(photo.image);
  URL.revokeObjectURL(photo.thumbnailUrl);
  const photos = state.photos.filter((entry) => entry.id !== photoId);
  const currentId = state.currentId === photoId ? (photos[0]?.id ?? null) : state.currentId;
  store.set({ ...state, photos, currentId, selectedRegionId: null });
}

export function clearPhotos(store: Store<AppState>): void {
  for (const photo of store.get().photos) {
    removePhoto(store, photo.id);
  }
}

export function selectPhoto(store: Store<AppState>, photoId: string): void {
  store.update((state) => ({ ...state, currentId: photoId, selectedRegionId: null }));
}

export function selectRegion(store: Store<AppState>, regionId: string | null): void {
  store.update((state) => ({ ...state, selectedRegionId: regionId }));
}

function updatePhoto(store: Store<AppState>, photoId: string, mutate: (photo: PhotoEntry) => PhotoEntry): void {
  store.update((state) => ({
    ...state,
    photos: state.photos.map((photo) => (photo.id === photoId ? mutate(photo) : photo)),
  }));
}

export function setPhotoStatus(store: Store<AppState>, photoId: string, status: PhotoEntry['status']): void {
  updatePhoto(store, photoId, (photo) => ({ ...photo, status }));
}

export function setDetectedRegions(store: Store<AppState>, photoId: string, regions: Region[]): void {
  updatePhoto(store, photoId, (photo) => ({ ...photo, regions, past: [], future: [], status: 'ready' }));
}

export function commitRegions(store: Store<AppState>, regions: Region[]): void {
  const photo = currentPhoto(store.get());
  if (!photo) {
    return;
  }
  updatePhoto(store, photo.id, (entry) => ({
    ...entry,
    regions,
    past: [...entry.past, entry.regions].slice(-MAX_HISTORY),
    future: [],
  }));
}

export function previewRegions(store: Store<AppState>, regions: Region[]): void {
  const photo = currentPhoto(store.get());
  if (!photo) {
    return;
  }
  updatePhoto(store, photo.id, (entry) => ({ ...entry, regions }));
}

function replaceRegion(regions: Region[], next: Region): Region[] {
  return regions.map((region) => (region.id === next.id ? next : region));
}

export function toggleRegion(store: Store<AppState>, regionId: string): void {
  const photo = currentPhoto(store.get());
  const region = photo?.regions.find((entry) => entry.id === regionId);
  if (!photo || !region) {
    return;
  }
  commitRegions(store, replaceRegion(photo.regions, { ...region, enabled: !region.enabled }));
  selectRegion(store, regionId);
}

export function setRegionBox(store: Store<AppState>, regionId: string, box: Box, commit: boolean): void {
  const photo = currentPhoto(store.get());
  const region = photo?.regions.find((entry) => entry.id === regionId);
  if (!photo || !region) {
    return;
  }
  const regions = replaceRegion(photo.regions, { ...region, box });
  if (commit) {
    commitRegions(store, regions);
  } else {
    previewRegions(store, regions);
  }
}

export function setRegionShape(store: Store<AppState>, regionId: string, shape: RegionShape): void {
  const photo = currentPhoto(store.get());
  const region = photo?.regions.find((entry) => entry.id === regionId);
  if (!photo || !region) {
    return;
  }
  commitRegions(store, replaceRegion(photo.regions, { ...region, shape }));
}

export function addManualRegion(store: Store<AppState>, box: Box): void {
  const photo = currentPhoto(store.get());
  if (!photo) {
    return;
  }
  const region = manualRegion(box);
  commitRegions(store, [...photo.regions, region]);
  selectRegion(store, region.id);
}

export function deleteRegion(store: Store<AppState>, regionId: string): void {
  const photo = currentPhoto(store.get());
  if (!photo) {
    return;
  }
  commitRegions(
    store,
    photo.regions.filter((region) => region.id !== regionId),
  );
  selectRegion(store, null);
}

export function undo(store: Store<AppState>): void {
  const photo = currentPhoto(store.get());
  const previous = photo?.past.at(-1);
  if (!photo || !previous) {
    return;
  }
  updatePhoto(store, photo.id, (entry) => ({
    ...entry,
    regions: previous,
    past: entry.past.slice(0, -1),
    future: [entry.regions, ...entry.future],
  }));
  selectRegion(store, null);
}

export function redo(store: Store<AppState>): void {
  const photo = currentPhoto(store.get());
  const next = photo?.future[0];
  if (!photo || !next) {
    return;
  }
  updatePhoto(store, photo.id, (entry) => ({
    ...entry,
    regions: next,
    past: [...entry.past, entry.regions],
    future: entry.future.slice(1),
  }));
  selectRegion(store, null);
}

export function updateSettings(store: Store<AppState>, patch: Partial<Settings>): void {
  store.update((state) => {
    const settings = { ...state.settings, ...patch, mask: { ...state.settings.mask, ...patch.mask } };
    saveSettings(settings);
    return { ...state, settings };
  });
}

export function setPeeking(store: Store<AppState>, isPeeking: boolean): void {
  if (store.get().isPeeking !== isPeeking) {
    store.update((state) => ({ ...state, isPeeking }));
  }
}
