import type { Box, Point } from '../detect/types.ts';
import type { Region } from '../domain/types.ts';
import { get2dContext } from '../image/canvas-raster.ts';
import { drawMaskedImage, maskPath, type ViewTransform } from '../mask/render.ts';
import { addManualRegion, deleteRegion, redo, selectRegion, setPeeking, setRegionBox, toggleRegion, undo } from './actions.ts';
import { currentPhoto, type AppState, type PhotoEntry, type Store } from './store.ts';

const HANDLE_SIZE_CSS = 10;
const DRAG_THRESHOLD_CSS = 3;
const MIN_REGION_SIDE = 6;
const ENABLED_COLOR = '#22c55e';
const DISABLED_COLOR = '#f59e0b';
const SELECTED_COLOR = '#ffffff';
const DRAFT_COLOR = '#93c5fd';
const DASH_CSS = [6, 4];

type HandleId = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w';

const HANDLES: Array<{ id: HandleId; dx: number; dy: number }> = [
  { id: 'nw', dx: 0, dy: 0 },
  { id: 'n', dx: 0.5, dy: 0 },
  { id: 'ne', dx: 1, dy: 0 },
  { id: 'e', dx: 1, dy: 0.5 },
  { id: 'se', dx: 1, dy: 1 },
  { id: 's', dx: 0.5, dy: 1 },
  { id: 'sw', dx: 0, dy: 1 },
  { id: 'w', dx: 0, dy: 0.5 },
];

const HANDLE_CURSORS: Record<HandleId, string> = {
  nw: 'nwse-resize',
  se: 'nwse-resize',
  ne: 'nesw-resize',
  sw: 'nesw-resize',
  n: 'ns-resize',
  s: 'ns-resize',
  e: 'ew-resize',
  w: 'ew-resize',
};

type Interaction =
  | { kind: 'idle' }
  | { kind: 'pending'; regionId: string; start: Point; origin: Box }
  | { kind: 'move'; regionId: string; start: Point; origin: Box }
  | { kind: 'resize'; regionId: string; handle: HandleId; origin: Box }
  | { kind: 'draw'; start: Point; current: Point };

function fitView(canvasWidth: number, canvasHeight: number, photo: PhotoEntry): ViewTransform {
  const scale = Math.min(canvasWidth / photo.width, canvasHeight / photo.height);
  return {
    scale,
    offsetX: (canvasWidth - photo.width * scale) / 2,
    offsetY: (canvasHeight - photo.height * scale) / 2,
  };
}

function toImage(point: Point, view: ViewTransform): Point {
  return { x: (point.x - view.offsetX) / view.scale, y: (point.y - view.offsetY) / view.scale };
}

function containsPoint(region: Region, point: Point): boolean {
  const { x, y, w, h } = region.box;
  if (region.shape === 'rect') {
    return point.x >= x && point.x <= x + w && point.y >= y && point.y <= y + h;
  }
  const dx = (point.x - (x + w / 2)) / (w / 2);
  const dy = (point.y - (y + h / 2)) / (h / 2);
  return dx * dx + dy * dy <= 1;
}

function regionAt(regions: Region[], point: Point): Region | null {
  const hits = regions.filter((region) => containsPoint(region, point));
  hits.sort((a, b) => a.box.w * a.box.h - b.box.w * b.box.h);
  return hits[0] ?? null;
}

function handlePosition(box: Box, handle: { dx: number; dy: number }, view: ViewTransform): Point {
  return { x: (box.x + box.w * handle.dx) * view.scale + view.offsetX, y: (box.y + box.h * handle.dy) * view.scale + view.offsetY };
}

function handleAt(region: Region, point: Point, view: ViewTransform, handleSize: number): HandleId | null {
  for (const handle of HANDLES) {
    const position = handlePosition(region.box, handle, view);
    if (Math.abs(position.x - point.x) <= handleSize && Math.abs(position.y - point.y) <= handleSize) {
      return handle.id;
    }
  }
  return null;
}

function normalise(a: Point, b: Point): Box {
  return { x: Math.min(a.x, b.x), y: Math.min(a.y, b.y), w: Math.abs(a.x - b.x), h: Math.abs(a.y - b.y) };
}

function resizedBox(origin: Box, handle: HandleId, point: Point): Box {
  const left = handle.includes('w') ? point.x : origin.x;
  const right = handle.includes('e') ? point.x : origin.x + origin.w;
  const top = handle.includes('n') ? point.y : origin.y;
  const bottom = handle.includes('s') ? point.y : origin.y + origin.h;
  return normalise({ x: left, y: top }, { x: right, y: bottom });
}

function clampToPhoto(box: Box, photo: PhotoEntry): Box {
  const x = Math.min(Math.max(0, box.x), photo.width - MIN_REGION_SIDE);
  const y = Math.min(Math.max(0, box.y), photo.height - MIN_REGION_SIDE);
  const w = Math.max(MIN_REGION_SIDE, Math.min(box.w, photo.width - x));
  const h = Math.max(MIN_REGION_SIDE, Math.min(box.h, photo.height - y));
  return { x, y, w, h };
}

function isEditableTarget(target: EventTarget | null): boolean {
  return target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement;
}

export function mountEditor(root: HTMLElement, store: Store<AppState>): void {
  const canvas = document.createElement('canvas');
  canvas.className = 'editor-canvas';
  canvas.tabIndex = 0;
  root.append(canvas);
  const context = get2dContext(canvas);
  let interaction: Interaction = { kind: 'idle' };
  let view: ViewTransform = { scale: 1, offsetX: 0, offsetY: 0 };
  let renderQueued = false;

  const dpr = (): number => window.devicePixelRatio || 1;
  const handleSize = (): number => HANDLE_SIZE_CSS * dpr();

  function pointerPoint(event: PointerEvent): Point {
    const rect = canvas.getBoundingClientRect();
    return { x: (event.clientX - rect.left) * dpr(), y: (event.clientY - rect.top) * dpr() };
  }

  function resizeCanvas(): void {
    const rect = root.getBoundingClientRect();
    const width = Math.max(1, Math.round(rect.width * dpr()));
    const height = Math.max(1, Math.round(rect.height * dpr()));
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }
  }

  function strokeRegion(region: Region, state: AppState, isSelected: boolean): void {
    const scale = dpr();
    maskPath(context, region, state.settings.mask, view);
    context.lineWidth = (isSelected ? 3 : 2) * scale;
    context.setLineDash(region.enabled ? [] : DASH_CSS.map((dash) => dash * scale));
    context.strokeStyle = region.enabled ? ENABLED_COLOR : DISABLED_COLOR;
    context.stroke();
    if (!isSelected) {
      return;
    }
    context.setLineDash([]);
    context.lineWidth = 1 * scale;
    context.strokeStyle = SELECTED_COLOR;
    context.stroke();
    for (const handle of HANDLES) {
      const position = handlePosition(region.box, handle, view);
      const size = handleSize();
      context.fillStyle = SELECTED_COLOR;
      context.fillRect(position.x - size / 2, position.y - size / 2, size, size);
      context.strokeStyle = '#000';
      context.strokeRect(position.x - size / 2, position.y - size / 2, size, size);
    }
  }

  function strokeDraft(box: Box): void {
    const scale = dpr();
    context.setLineDash(DASH_CSS.map((dash) => dash * scale));
    context.lineWidth = 2 * scale;
    context.strokeStyle = DRAFT_COLOR;
    context.strokeRect(box.x * view.scale + view.offsetX, box.y * view.scale + view.offsetY, box.w * view.scale, box.h * view.scale);
    context.setLineDash([]);
  }

  function render(): void {
    renderQueued = false;
    resizeCanvas();
    const state = store.get();
    const photo = currentPhoto(state);
    context.clearRect(0, 0, canvas.width, canvas.height);
    if (!photo) {
      return;
    }
    view = fitView(canvas.width, canvas.height, photo);
    drawMaskedImage(context, {
      source: photo.image,
      width: photo.width,
      height: photo.height,
      regions: state.isPeeking ? [] : photo.regions,
      settings: state.settings.mask,
      view,
    });
    for (const region of photo.regions) {
      strokeRegion(region, state, region.id === state.selectedRegionId);
    }
    if (interaction.kind === 'draw') {
      strokeDraft(normalise(interaction.start, interaction.current));
    }
  }

  function scheduleRender(): void {
    if (!renderQueued) {
      renderQueued = true;
      requestAnimationFrame(render);
    }
  }

  function updateCursor(point: Point): void {
    const state = store.get();
    const photo = currentPhoto(state);
    if (!photo) {
      canvas.style.cursor = 'default';
      return;
    }
    const selected = photo.regions.find((region) => region.id === state.selectedRegionId);
    const handle = selected ? handleAt(selected, point, view, handleSize()) : null;
    if (handle) {
      canvas.style.cursor = HANDLE_CURSORS[handle];
      return;
    }
    canvas.style.cursor = regionAt(photo.regions, toImage(point, view)) ? 'move' : 'crosshair';
  }

  canvas.addEventListener('pointerdown', (event) => {
    const state = store.get();
    const photo = currentPhoto(state);
    if (!photo || event.button !== 0) {
      return;
    }
    canvas.focus();
    canvas.setPointerCapture(event.pointerId);
    const point = pointerPoint(event);
    const imagePoint = toImage(point, view);
    const selected = photo.regions.find((region) => region.id === state.selectedRegionId);
    const handle = selected ? handleAt(selected, point, view, handleSize()) : null;
    if (selected && handle) {
      interaction = { kind: 'resize', regionId: selected.id, handle, origin: selected.box };
      return;
    }
    const hit = regionAt(photo.regions, imagePoint);
    if (hit) {
      interaction = { kind: 'pending', regionId: hit.id, start: imagePoint, origin: hit.box };
      return;
    }
    selectRegion(store, null);
    interaction = { kind: 'draw', start: imagePoint, current: imagePoint };
  });

  canvas.addEventListener('pointermove', (event) => {
    const point = pointerPoint(event);
    const photo = currentPhoto(store.get());
    if (!photo) {
      return;
    }
    const imagePoint = toImage(point, view);
    if (interaction.kind === 'idle') {
      updateCursor(point);
      return;
    }
    if (interaction.kind === 'pending') {
      const moved = Math.hypot(imagePoint.x - interaction.start.x, imagePoint.y - interaction.start.y) * view.scale;
      if (moved < DRAG_THRESHOLD_CSS * dpr()) {
        return;
      }
      interaction = { kind: 'move', regionId: interaction.regionId, start: interaction.start, origin: interaction.origin };
      selectRegion(store, interaction.regionId);
    }
    if (interaction.kind === 'move') {
      const box = {
        ...interaction.origin,
        x: interaction.origin.x + imagePoint.x - interaction.start.x,
        y: interaction.origin.y + imagePoint.y - interaction.start.y,
      };
      setRegionBox(store, interaction.regionId, clampToPhoto(box, photo), false);
      return;
    }
    if (interaction.kind === 'resize') {
      setRegionBox(store, interaction.regionId, clampToPhoto(resizedBox(interaction.origin, interaction.handle, imagePoint), photo), false);
      return;
    }
    interaction = { ...interaction, current: imagePoint };
    scheduleRender();
  });

  canvas.addEventListener('pointerup', (event) => {
    const photo = currentPhoto(store.get());
    const finished = interaction;
    interaction = { kind: 'idle' };
    if (!photo) {
      return;
    }
    if (finished.kind === 'pending') {
      toggleRegion(store, finished.regionId);
    } else if (finished.kind === 'move' || finished.kind === 'resize') {
      const region = photo.regions.find((entry) => entry.id === finished.regionId);
      if (region) {
        setRegionBox(store, region.id, finished.origin, false);
        setRegionBox(store, region.id, region.box, true);
      }
    } else if (finished.kind === 'draw') {
      const box = normalise(finished.start, toImage(pointerPoint(event), view));
      if (box.w >= MIN_REGION_SIDE && box.h >= MIN_REGION_SIDE) {
        addManualRegion(store, clampToPhoto(box, photo));
      }
    }
    scheduleRender();
  });

  canvas.addEventListener('pointercancel', () => {
    interaction = { kind: 'idle' };
    scheduleRender();
  });

  window.addEventListener('keydown', (event) => {
    if (isEditableTarget(event.target)) {
      return;
    }
    const state = store.get();
    const isCommand = event.metaKey || event.ctrlKey;
    if (event.code === 'Space') {
      event.preventDefault();
      setPeeking(store, true);
    } else if (isCommand && event.key.toLowerCase() === 'z') {
      event.preventDefault();
      if (event.shiftKey) {
        redo(store);
      } else {
        undo(store);
      }
    } else if (isCommand && event.key.toLowerCase() === 'y') {
      event.preventDefault();
      redo(store);
    } else if ((event.key === 'Delete' || event.key === 'Backspace') && state.selectedRegionId) {
      event.preventDefault();
      deleteRegion(store, state.selectedRegionId);
    } else if (event.key === 'Escape') {
      selectRegion(store, null);
    }
  });

  window.addEventListener('keyup', (event) => {
    if (event.code === 'Space') {
      setPeeking(store, false);
    }
  });
  window.addEventListener('blur', () => setPeeking(store, false));

  new ResizeObserver(scheduleRender).observe(root);
  store.subscribe(scheduleRender);
  scheduleRender();
}
