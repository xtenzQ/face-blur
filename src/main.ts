import './style.css';
import { registerSW } from 'virtual:pwa-register';
import { t } from './i18n/en.ts';
import { addFiles } from './ui/actions.ts';
import { startDetectionQueue } from './ui/detection-queue.ts';
import { mountEditor } from './ui/editor.ts';
import { mountGallery } from './ui/gallery.ts';
import { createAppStore } from './ui/store.ts';
import { mountToolbar } from './ui/toolbar.ts';

function required(id: string): HTMLElement {
  const node = document.getElementById(id);
  if (!node) {
    throw new Error(`Missing element #${id}`);
  }
  return node;
}

function filesFrom(transfer: DataTransfer | null): File[] {
  return Array.from(transfer?.files ?? []);
}

const store = createAppStore();
const app = required('app');
const empty = required('empty');

required('title').textContent = t.appTitle;
required('tagline').textContent = t.tagline;
required('empty-text').textContent = t.empty;
required('empty-formats').textContent = t.supportedFormats;

mountGallery(required('gallery'), store);
mountEditor(required('editor'), store);
mountToolbar(required('toolbar'), store);
startDetectionQueue(store);

store.subscribe((state) => {
  empty.hidden = state.photos.length > 0;
});

app.addEventListener('dragover', (event) => {
  event.preventDefault();
  app.classList.add('is-dragging');
});
app.addEventListener('dragleave', () => app.classList.remove('is-dragging'));
app.addEventListener('drop', (event) => {
  event.preventDefault();
  app.classList.remove('is-dragging');
  void addFiles(store, filesFrom(event.dataTransfer));
});
window.addEventListener('paste', (event) => {
  const files = filesFrom(event.clipboardData);
  if (files.length > 0) {
    event.preventDefault();
    void addFiles(store, files);
  }
});

registerSW({ immediate: true });

if (import.meta.env.DEV) {
  Object.assign(window, { faceBlurStore: store });
}
