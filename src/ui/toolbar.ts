import type { MaskStyle, RegionShape } from '../domain/types.ts';
import { exportBatch, exportPhoto, type MetadataOutcome } from '../export/encode.ts';
import { downloadBlob } from '../export/download.ts';
import { t } from '../i18n/en.ts';
import { WEAK_STRENGTH } from '../mask/geometry.ts';
import { addFiles, clearPhotos, deleteRegion, notify, setRegionShape, updateSettings } from './actions.ts';
import { currentPhoto, selectedRegion, type AppState, type Store } from './store.ts';

const ACCEPTED_TYPES = 'image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif,.jpg,.jpeg,.png,.webp';

function element<K extends keyof HTMLElementTagNameMap>(tag: K, className?: string, text?: string): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) {
    node.className = className;
  }
  if (text !== undefined) {
    node.textContent = text;
  }
  return node;
}

function slider(label: string, hint?: string): { wrapper: HTMLElement; input: HTMLInputElement } {
  const wrapper = element('label', 'field');
  const caption = element('span', 'field-label', label);
  const input = element('input');
  input.type = 'range';
  input.min = '0';
  input.max = '1';
  input.step = '0.01';
  wrapper.append(caption, input);
  if (hint) {
    wrapper.append(element('span', 'field-hint', hint));
  }
  return { wrapper, input };
}

function segmented<T extends string>(options: Array<{ value: T; label: string }>, onChange: (value: T) => void): { wrapper: HTMLElement; set: (value: T) => void } {
  const wrapper = element('div', 'segmented');
  const buttons = options.map((option) => {
    const button = element('button', 'segment', option.label);
    button.type = 'button';
    button.dataset['value'] = option.value;
    button.addEventListener('click', () => onChange(option.value));
    wrapper.append(button);
    return button;
  });
  return {
    wrapper,
    set(value) {
      for (const button of buttons) {
        button.classList.toggle('is-active', button.dataset['value'] === value);
      }
    },
  };
}

function metadataText(outcome: MetadataOutcome): string {
  switch (outcome) {
    case 'kept':
      return t.metadataKept;
    case 'stripped':
      return t.metadataStripped;
    case 'unavailable':
      return t.metadataUnavailable;
  }
}

export function mountToolbar(root: HTMLElement, store: Store<AppState>): void {
  const fileInput = element('input');
  fileInput.type = 'file';
  fileInput.multiple = true;
  fileInput.accept = ACCEPTED_TYPES;
  fileInput.hidden = true;
  fileInput.addEventListener('change', () => {
    void addFiles(store, Array.from(fileInput.files ?? []));
    fileInput.value = '';
  });

  const addButton = element('button', 'button primary', t.addPhotos);
  addButton.type = 'button';
  addButton.addEventListener('click', () => fileInput.click());

  const styleControl = segmented<MaskStyle>(
    [
      { value: 'pixelate', label: t.pixelate },
      { value: 'blur', label: t.blur },
    ],
    (style) => updateSettings(store, { mask: { ...store.get().settings.mask, style } }),
  );
  const styleField = element('div', 'field');
  styleField.append(element('span', 'field-label', t.maskStyle), styleControl.wrapper);

  const strength = slider(t.strength);
  strength.input.addEventListener('input', () => updateSettings(store, { mask: { ...store.get().settings.mask, strength: Number(strength.input.value) } }));
  const feather = slider(t.feather);
  feather.input.addEventListener('input', () => updateSettings(store, { mask: { ...store.get().settings.mask, feather: Number(feather.input.value) } }));
  const corner = slider(t.cornerRadius, t.cornerRadiusHint);
  corner.input.addEventListener('input', () => updateSettings(store, { mask: { ...store.get().settings.mask, cornerRadius: Number(corner.input.value) } }));

  const blurWarning = element('p', 'warning', t.blurWarning);

  const stripField = element('label', 'field checkbox');
  const stripInput = element('input');
  stripInput.type = 'checkbox';
  stripInput.addEventListener('change', () => updateSettings(store, { stripMetadata: stripInput.checked }));
  stripField.append(stripInput, element('span', undefined, t.stripMetadata));
  stripField.title = t.stripMetadataHint;
  const stripHint = element('p', 'field-hint', t.stripMetadataHint);

  const regionPanel = element('section', 'panel region-panel');
  const regionTitle = element('h3', undefined, t.region);
  const regionLabel = element('p', 'field-hint');
  const shapeControl = segmented<RegionShape>(
    [
      { value: 'ellipse', label: t.ellipse },
      { value: 'rect', label: t.rectangle },
    ],
    (shape) => {
      const region = selectedRegion(store.get());
      if (region) {
        setRegionShape(store, region.id, shape);
      }
    },
  );
  const deleteButton = element('button', 'button danger', t.deleteRegion);
  deleteButton.type = 'button';
  deleteButton.addEventListener('click', () => {
    const region = selectedRegion(store.get());
    if (region) {
      deleteRegion(store, region.id);
    }
  });
  regionPanel.append(regionTitle, regionLabel, shapeControl.wrapper, deleteButton);

  const downloadButton = element('button', 'button primary', t.download);
  downloadButton.type = 'button';
  downloadButton.addEventListener('click', () => void downloadCurrent());
  const downloadAllButton = element('button', 'button', t.downloadAll);
  downloadAllButton.type = 'button';
  downloadAllButton.addEventListener('click', () => void downloadAll());
  const clearButton = element('button', 'button subtle', t.clearAll);
  clearButton.type = 'button';
  clearButton.addEventListener('click', () => clearPhotos(store));

  const modelNotice = element('p', 'notice');
  const notices = element('div', 'notices');
  const hints = element('p', 'hints', t.hints);

  const maskPanel = element('section', 'panel');
  maskPanel.append(styleField, strength.wrapper, feather.wrapper, corner.wrapper, blurWarning);
  const exportPanel = element('section', 'panel');
  exportPanel.append(stripField, stripHint, downloadButton, downloadAllButton, clearButton);

  root.append(fileInput, addButton, modelNotice, maskPanel, regionPanel, exportPanel, notices, hints);

  async function downloadCurrent(): Promise<void> {
    const state = store.get();
    const photo = currentPhoto(state);
    if (!photo || state.isExporting) {
      return;
    }
    store.update((current) => ({ ...current, isExporting: true }));
    try {
      const result = await exportPhoto(photo, state.settings);
      downloadBlob(result.blob, result.filename);
      notify(store, metadataText(result.metadata));
    } catch (error) {
      console.error(error);
      notify(store, t.exportFailed(photo.name));
    } finally {
      store.update((current) => ({ ...current, isExporting: false }));
    }
  }

  async function downloadAll(): Promise<void> {
    const state = store.get();
    if (state.photos.length === 0 || state.isExporting) {
      return;
    }
    store.update((current) => ({ ...current, isExporting: true }));
    try {
      const zip = await exportBatch(state.photos, state.settings);
      downloadBlob(zip, t.zipName);
    } catch (error) {
      console.error(error);
      notify(store, t.exportFailed(t.zipName));
    } finally {
      store.update((current) => ({ ...current, isExporting: false }));
    }
  }

  function render(state: AppState): void {
    const { mask } = state.settings;
    styleControl.set(mask.style);
    strength.input.value = String(mask.strength);
    feather.input.value = String(mask.feather);
    corner.input.value = String(mask.cornerRadius);
    blurWarning.hidden = !(mask.style === 'blur' || mask.strength < WEAK_STRENGTH);
    stripInput.checked = state.settings.stripMetadata;

    const region = selectedRegion(state);
    regionPanel.hidden = !region;
    if (region) {
      shapeControl.set(region.shape);
      const sourceLabel = region.source === 'manual' ? t.manualLabel : t.detectedLabel(region.confidence ?? 0);
      regionLabel.textContent = `${sourceLabel} · ${region.enabled ? t.regionOn : t.regionOff}`;
    }

    const hasPhotos = state.photos.length > 0;
    downloadButton.disabled = !currentPhoto(state) || state.isExporting;
    downloadAllButton.disabled = !hasPhotos || state.isExporting;
    clearButton.disabled = !hasPhotos;
    downloadButton.textContent = state.isExporting ? t.exporting : t.download;

    modelNotice.hidden = state.modelStatus === 'ready' || state.modelStatus === 'idle';
    modelNotice.textContent = state.modelStatus === 'failed' ? t.modelFailed : t.modelLoading;
    modelNotice.classList.toggle('is-error', state.modelStatus === 'failed');

    notices.replaceChildren(...state.notices.map((message) => element('p', 'notice', message)));
  }

  store.subscribe(render);
  render(store.get());
}
