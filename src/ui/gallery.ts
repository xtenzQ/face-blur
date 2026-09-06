import { t } from '../i18n/en.ts';
import { removePhoto, selectPhoto } from './actions.ts';
import type { AppState, PhotoEntry, Store } from './store.ts';

function statusText(photo: PhotoEntry): string {
  switch (photo.status) {
    case 'queued':
      return t.statusQueued;
    case 'detecting':
      return t.statusDetecting;
    case 'failed':
      return t.statusFailed;
    case 'ready':
      return t.statusReady(photo.regions.filter((region) => region.enabled).length, photo.regions.length);
  }
}

function signature(state: AppState): string {
  return state.photos
    .map((photo) => `${photo.id}:${photo.status}:${photo.regions.length}:${photo.regions.filter((r) => r.enabled).length}:${photo.id === state.currentId ? 1 : 0}`)
    .join('|');
}

function renderItem(photo: PhotoEntry, isCurrent: boolean, store: Store<AppState>): HTMLElement {
  const item = document.createElement('button');
  item.type = 'button';
  item.className = `gallery-item${isCurrent ? ' is-current' : ''}`;
  item.title = photo.name;
  const image = document.createElement('img');
  image.src = photo.thumbnailUrl;
  image.alt = '';
  const name = document.createElement('span');
  name.className = 'gallery-name';
  name.textContent = photo.name;
  const status = document.createElement('span');
  status.className = `gallery-status is-${photo.status}`;
  status.textContent = statusText(photo);
  const remove = document.createElement('span');
  remove.className = 'gallery-remove';
  remove.setAttribute('role', 'button');
  remove.setAttribute('aria-label', t.removePhoto);
  remove.textContent = '×';
  remove.addEventListener('click', (event) => {
    event.stopPropagation();
    removePhoto(store, photo.id);
  });
  item.append(image, name, status, remove);
  item.addEventListener('click', () => selectPhoto(store, photo.id));
  return item;
}

export function mountGallery(root: HTMLElement, store: Store<AppState>): void {
  let lastSignature = '';
  function render(state: AppState): void {
    const next = signature(state);
    if (next === lastSignature) {
      return;
    }
    lastSignature = next;
    root.replaceChildren(...state.photos.map((photo) => renderItem(photo, photo.id === state.currentId, store)));
    root.hidden = state.photos.length === 0;
  }
  store.subscribe(render);
  render(store.get());
}
