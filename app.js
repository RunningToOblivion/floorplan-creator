const editor = document.getElementById('editor');
const bgUpload = document.getElementById('bgUpload');
const bgImage = document.getElementById('bgImage');
const clearBgBtn = document.getElementById('clearBgBtn');
const wallsLayer = document.getElementById('wallsLayer');
const stairsLayer = document.getElementById('stairsLayer');
const doorsLayer = document.getElementById('doorsLayer');
const exitsLayer = document.getElementById('exitsLayer');
const arrowsLayer = document.getElementById('arrowsLayer');
const measureLayer = document.getElementById('measureLayer');
const handlesLayer = document.getElementById('handlesLayer');

const addWallBtn = document.getElementById('addWallBtn');
const addExitBtn = document.getElementById('addExitBtn');
const addArrowBtn = document.getElementById('addArrowBtn');
const addStairBtn = document.getElementById('addStairBtn');
const addDoorBtn = document.getElementById('addDoorBtn');
const deleteWallBtn = document.getElementById('deleteWallBtn');
const duplicateBtn = document.getElementById('duplicateBtn');
const undoBtn = document.getElementById('undoBtn');
const measureToggleBtn = document.getElementById('measureToggleBtn');
const clearMeasureBtn = document.getElementById('clearMeasureBtn');
const measureValue = document.getElementById('measureValue');
const zoomOutBtn = document.getElementById('zoomOutBtn');
const zoomInBtn = document.getElementById('zoomInBtn');
const fitPlanBtn = document.getElementById('fitPlanBtn');
const autoZoomBtn = document.getElementById('autoZoomBtn');
const zoomValue = document.getElementById('zoomValue');
const pxPerCmInput = document.getElementById('pxPerCmInput');
const applyScaleBtn = document.getElementById('applyScaleBtn');
const preset4kmBtn = document.getElementById('preset4kmBtn');
const lengthInput = document.getElementById('lengthInput');
const thicknessInput = document.getElementById('thicknessInput');
const angleInput = document.getElementById('angleInput');
const applyPropsBtn = document.getElementById('applyPropsBtn');
const stairLengthInput = document.getElementById('stairLengthInput');
const stairWidthInput = document.getElementById('stairWidthInput');
const applyStairPropsBtn = document.getElementById('applyStairPropsBtn');
const measureDialog = document.getElementById('measureDialog');
const measureForm = document.getElementById('measureForm');
const measureLengthInput = document.getElementById('measureLengthInput');
const measureAngleInput = document.getElementById('measureAngleInput');
const measureCancelBtn = document.getElementById('measureCancelBtn');

const exportBtn = document.getElementById('exportBtn');
const importBtn = document.getElementById('importBtn');
const exportA3Btn = document.getElementById('exportA3Btn');
const importFile = document.getElementById('importFile');
const resetBtn = document.getElementById('resetBtn');

const DEFAULT_PX_PER_CM = 2;
const ORIENTATION_SNAP_DEG = 15;
const ORIENTATION_THRESHOLD_DEG = 7;
const POINT_SNAP_DISTANCE_PX = 16;
const RESIZE_SNAP_DISTANCE_PX = 40;
const MOVE_SNAP_DISTANCE_PX = 18;
const CORNER_CAPTURE_DISTANCE_PX = 26;
const CORNER_PRIORITY_BONUS_PX = 8;
const WALL_PROLONGATION_PX = 160;
const PASTE_OFFSET_PX = 24;
const DOOR_SNAP_DISTANCE_CM = 12;
const DOOR_SIZE_CM = 80;
const DOOR_BG_MIN_THICKNESS_CM = 32;
const DOOR_ANCHOR_X = 49;
const DOOR_ANCHOR_Y = 67;
const DOOR_FRAME_MIN_X = 31;
const DOOR_FRAME_MAX_X = 67;
const DOOR_SYMBOL_BASE_WIDTH = DOOR_FRAME_MAX_X - DOOR_FRAME_MIN_X;
const DOOR_PATH_D = 'M65,65.6C64.7,40.8,41.2,36.6,35,36v-1c0-0.8-0.7-1.5-1.5-1.5S32,34.2,32,35v30.6h-6.8v2.1H35v-2.1h0V37c2.6,0.3,8.3,1.1,13.9,3.9c10.1,5,15.2,13.5,15.2,25.2c0,0,0,0,0,0.1v1.5h9.8v-2.1H65z';
const HISTORY_LIMIT = 150;
const MIN_ZOOM = 0.05;
const MAX_ZOOM = 600;
const ZOOM_FACTOR = 1.25;
const LARGE_CANVAS_SIDE_CM = 400000;
const LARGE_CANVAS_TARGET_PX = 6000;

const WALL_DEFAULTS_CM = {
  length: 300,
  thickness: 20,
  angle: 0,
};

const STAIR_DEFAULTS_CM = {
  length: 150,
  width: 120,
};

const state = {
  walls: [],
  stairs: [],
  doors: [],
  exits: [],
  arrows: [],
  measures: [],
  selected: null,
  dragMode: null,
  snapGuide: null,
  measure: {
    active: false,
    start: null,
    end: null,
    hover: null,
  },
  canvas: {
    width: 1200,
    height: 800,
    zoom: 1,
  },
  pxPerCm: DEFAULT_PX_PER_CM,
  backgroundDataUrl: '',
  clipboard: null,
  history: [],
  historyIndex: -1,
};

let lastPointerClient = null;

function createId(prefix) {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}-${Date.now().toString(36)}`;
}

function roundCm(value) {
  return Math.round(Number(value) * 10) / 10;
}

function cmToPx(cm) {
  return Number(cm) * state.pxPerCm;
}

function pxToCm(px) {
  return Number(px) / state.pxPerCm;
}

function degToRad(deg) {
  return (Number(deg) * Math.PI) / 180;
}

function normalizeAngle(angle) {
  let normalized = Number(angle) % 360;
  if (normalized < 0) {
    normalized += 360;
  }
  return normalized;
}

function angleDifference(a, b) {
  const diff = Math.abs(normalizeAngle(a) - normalizeAngle(b));
  return Math.min(diff, 360 - diff);
}

function endPoint(wall) {
  const rad = degToRad(wall.angle);
  return {
    x: wall.x + Math.cos(rad) * wall.length,
    y: wall.y + Math.sin(rad) * wall.length,
  };
}

function wallById(id) {
  return state.walls.find((wall) => wall.id === id) || null;
}

function stairById(id) {
  return state.stairs.find((stair) => stair.id === id) || null;
}

function doorById(id) {
  return state.doors.find((door) => door.id === id) || null;
}

function exitById(id) {
  return state.exits.find((exitItem) => exitItem.id === id) || null;
}

function arrowById(id) {
  return state.arrows.find((arrow) => arrow.id === id) || null;
}

function measureById(id) {
  return state.measures.find((measure) => measure.id === id) || null;
}

function selectedEntity() {
  if (!state.selected) {
    return null;
  }

  if (state.selected.type === 'wall') {
    return { type: 'wall', data: wallById(state.selected.id) };
  }
  if (state.selected.type === 'stair') {
    return { type: 'stair', data: stairById(state.selected.id) };
  }
  if (state.selected.type === 'door') {
    return { type: 'door', data: doorById(state.selected.id) };
  }
  if (state.selected.type === 'exit') {
    return { type: 'exit', data: exitById(state.selected.id) };
  }
  if (state.selected.type === 'arrow') {
    return { type: 'arrow', data: arrowById(state.selected.id) };
  }
  if (state.selected.type === 'measure') {
    return { type: 'measure', data: measureById(state.selected.id) };
  }

  return null;
}

function selectedWall() {
  if (state.selected?.type !== 'wall') {
    return null;
  }
  return wallById(state.selected.id);
}

function handleRadius() {
  const scaleByUnits = state.pxPerCm / DEFAULT_PX_PER_CM;
  const zoomFactor = Math.max(1, state.canvas.zoom);
  const scaled = 7 * scaleByUnits / zoomFactor;
  return Math.max(0.2, Math.min(7, scaled));
}

function screenPxToSvg(px) {
  return Number(px) / Math.max(0.05, state.canvas.zoom);
}

function clampByScreenPx(valueInSvg, minScreenPx, maxScreenPx) {
  const minSvg = screenPxToSvg(minScreenPx);
  const maxSvg = screenPxToSvg(maxScreenPx);
  return Math.max(minSvg, Math.min(maxSvg, valueInSvg));
}

function rotateHandleRadius() {
  return clampByScreenPx(Math.max(0.5, handleRadius() * 2.2), 3.5, 9);
}

function snapGuideTargetRadius() {
  return clampByScreenPx(Math.max(0.12, handleRadius() * 0.35), 1.2, 2.8);
}

function snapGuideSourceRadius() {
  return clampByScreenPx(Math.max(0.1, handleRadius() * 0.3), 1, 2.3);
}

function snapGuideLineWidth() {
  return screenPxToSvg(1.25);
}

function snapGuideEdgeWidth() {
  return screenPxToSvg(1.5);
}

function snapGuidePointStrokeWidth() {
  return screenPxToSvg(0.9);
}

function snapGuideSourceStrokeWidth() {
  return screenPxToSvg(0.8);
}

function measureLineWidth() {
  return screenPxToSvg(1.35);
}

function measureDashLength() {
  return screenPxToSvg(4.5);
}

function measureDashGap() {
  return screenPxToSvg(3);
}

function measureLabelOffset() {
  return screenPxToSvg(7);
}

function measureLabelFontSize() {
  return screenPxToSvg(11);
}

function measureHandleRadius() {
  return clampByScreenPx(handleRadius(), 2.6, 7);
}

function scaledByCanvasUnits(pxValue) {
  return Number(pxValue) * (state.pxPerCm / DEFAULT_PX_PER_CM);
}

function snapDistancePx(basePx, minPx = 0.5) {
  return Math.max(minPx, scaledByCanvasUnits(basePx));
}

function pointSnapDistancePx() {
  return snapDistancePx(POINT_SNAP_DISTANCE_PX);
}

function moveSnapDistancePx() {
  return snapDistancePx(MOVE_SNAP_DISTANCE_PX);
}

function resizeSnapDistancePx() {
  return snapDistancePx(RESIZE_SNAP_DISTANCE_PX);
}

function cornerCaptureDistancePx() {
  return snapDistancePx(CORNER_CAPTURE_DISTANCE_PX);
}

function cornerPriorityBonusPx() {
  return snapDistancePx(CORNER_PRIORITY_BONUS_PX, 0.1);
}

function wallProlongationPx() {
  return snapDistancePx(WALL_PROLONGATION_PX, 10);
}

function doorWidthPx() {
  return cmToPx(DOOR_SIZE_CM);
}

function doorHeightPx() {
  return cmToPx(DOOR_SIZE_CM);
}

function doorSnapDistancePx() {
  return cmToPx(DOOR_SNAP_DISTANCE_CM);
}

function nearestWallThicknessPx(point) {
  let bestDistance = Infinity;
  let bestThickness = cmToPx(WALL_DEFAULTS_CM.thickness);

  state.walls.forEach((wall) => {
    const start = { x: wall.x, y: wall.y };
    const end = endPoint(wall);
    const nearest = nearestPointOnSegment(point, start, end);
    const d = distance(point, nearest);
    if (d < bestDistance) {
      bestDistance = d;
      bestThickness = wall.thickness;
    }
  });

  return bestThickness;
}

function commitStateChange() {
  state.snapGuide = null;
  render();
  pushHistorySnapshot();
}

function undoLastChange() {
  if (state.historyIndex <= 0) {
    return;
  }

  state.historyIndex -= 1;
  restoreScene(state.history[state.historyIndex]);
  state.snapGuide = null;
  state.dragMode = null;
  render();
}

function snapshotScene() {
  return {
    walls: structuredClone(state.walls),
    stairs: structuredClone(state.stairs),
    doors: structuredClone(state.doors),
    exits: structuredClone(state.exits),
    arrows: structuredClone(state.arrows),
    measures: structuredClone(state.measures),
    selected: structuredClone(state.selected),
    canvas: structuredClone(state.canvas),
    pxPerCm: state.pxPerCm,
    backgroundDataUrl: state.backgroundDataUrl,
  };
}

function restoreScene(snapshot) {
  state.walls = structuredClone(snapshot.walls || []);
  state.stairs = structuredClone(snapshot.stairs || []);
  state.doors = structuredClone(snapshot.doors || []);
  state.exits = structuredClone(snapshot.exits || []);
  state.arrows = structuredClone(snapshot.arrows || []);
  state.measures = structuredClone(snapshot.measures || []);
  state.selected = snapshot.selected ? structuredClone(snapshot.selected) : null;
  state.canvas = structuredClone(snapshot.canvas || { width: 1200, height: 800, zoom: 1 });
  state.pxPerCm = Number(snapshot.pxPerCm) > 0 ? Number(snapshot.pxPerCm) : DEFAULT_PX_PER_CM;
  state.backgroundDataUrl = String(snapshot.backgroundDataUrl || '');
  bgImage.setAttribute('href', state.backgroundDataUrl);
}

function firstSelectableEntity() {
  if (state.walls[0]) {
    return { type: 'wall', id: state.walls[0].id };
  }
  if (state.stairs[0]) {
    return { type: 'stair', id: state.stairs[0].id };
  }
  if (state.doors[0]) {
    return { type: 'door', id: state.doors[0].id };
  }
  if (state.exits[0]) {
    return { type: 'exit', id: state.exits[0].id };
  }
  if (state.arrows[0]) {
    return { type: 'arrow', id: state.arrows[0].id };
  }
  if (state.measures[0]) {
    return { type: 'measure', id: state.measures[0].id };
  }

  return null;
}

function applyCanvasSizeAndZoom() {
  const width = Math.max(200, state.canvas.width || 1200);
  const height = Math.max(200, state.canvas.height || 800);
  const zoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, state.canvas.zoom || 1));

  state.canvas.width = width;
  state.canvas.height = height;
  state.canvas.zoom = zoom;

  editor.setAttribute('viewBox', `0 0 ${width} ${height}`);
  bgImage.setAttribute('width', width);
  bgImage.setAttribute('height', height);
  editor.style.width = `${Math.round(width * zoom)}px`;
  editor.style.height = `${Math.round(height * zoom)}px`;
  zoomValue.textContent = `Zoom: ${Math.round(zoom * 100)}%`;
  pxPerCmInput.value = String(roundCm(state.pxPerCm));
}

function pushHistorySnapshot() {
  const snapshot = snapshotScene();
  const current = state.history[state.historyIndex];
  if (current && JSON.stringify(current) === JSON.stringify(snapshot)) {
    return;
  }

  const nextHistory = state.history.slice(0, state.historyIndex + 1);
  nextHistory.push(snapshot);
  if (nextHistory.length > HISTORY_LIMIT) {
    nextHistory.shift();
  }

  state.history = nextHistory;
  state.historyIndex = state.history.length - 1;
}

function updateInputs() {
  const wall = selectedWall();
  const entity = selectedEntity();
  const stair = state.selected?.type === 'stair' ? stairById(state.selected.id) : null;

  const wallPropsDisabled = !wall;
  [lengthInput, thicknessInput, angleInput, applyPropsBtn].forEach((el) => {
    el.disabled = wallPropsDisabled;
  });

  const stairPropsDisabled = !stair;
  [stairLengthInput, stairWidthInput, applyStairPropsBtn].forEach((el) => {
    el.disabled = stairPropsDisabled;
  });

  deleteWallBtn.disabled = !entity;

  if (!wall) {
    lengthInput.value = '';
    thicknessInput.value = '';
    angleInput.value = '';
  } else {
    lengthInput.value = roundCm(pxToCm(wall.length));
    thicknessInput.value = roundCm(pxToCm(wall.thickness));
    angleInput.value = Math.round(wall.angle);
  }

  if (!stair) {
    stairLengthInput.value = '';
    stairWidthInput.value = '';
    return;
  }

  stairLengthInput.value = roundCm(pxToCm(stair.length));
  stairWidthInput.value = roundCm(pxToCm(stair.width));
}

function render() {
  applyCanvasSizeAndZoom();
  const uiHandleRadius = handleRadius();
  wallsLayer.innerHTML = '';
  stairsLayer.innerHTML = '';
  doorsLayer.innerHTML = '';
  exitsLayer.innerHTML = '';
  arrowsLayer.innerHTML = '';
  measureLayer.innerHTML = '';
  handlesLayer.innerHTML = '';

  state.walls.forEach((wall) => {
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    const end = endPoint(wall);

    line.setAttribute('x1', wall.x);
    line.setAttribute('y1', wall.y);
    line.setAttribute('x2', end.x);
    line.setAttribute('y2', end.y);
    line.setAttribute('stroke-width', wall.thickness);
    line.setAttribute('class', `wall ${state.selected?.type === 'wall' && wall.id === state.selected.id ? 'selected' : ''}`);
    line.dataset.id = wall.id;
    line.dataset.kind = 'wall';

    wallsLayer.appendChild(line);

    if (state.selected?.type === 'wall' && wall.id === state.selected.id) {
      const endHandle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      endHandle.setAttribute('cx', end.x);
      endHandle.setAttribute('cy', end.y);
      endHandle.setAttribute('r', uiHandleRadius);
      endHandle.setAttribute('class', 'handle');
      endHandle.dataset.id = wall.id;
      endHandle.dataset.kind = 'wall-handle-end';
      handlesLayer.appendChild(endHandle);

      const startHandle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      startHandle.setAttribute('cx', wall.x);
      startHandle.setAttribute('cy', wall.y);
      startHandle.setAttribute('r', uiHandleRadius);
      startHandle.setAttribute('class', 'handle');
      startHandle.dataset.id = wall.id;
      startHandle.dataset.kind = 'wall-handle-start';
      handlesLayer.appendChild(startHandle);

      const midX = (wall.x + end.x) / 2;
      const midY = (wall.y + end.y) / 2;
      const normalX = -Math.sin(degToRad(wall.angle));
      const normalY = Math.cos(degToRad(wall.angle));
      const rotateDistance = screenPxToSvg(24) + Math.min(screenPxToSvg(10), wall.thickness * 0.2);

      const rotateHandle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      rotateHandle.setAttribute('cx', midX + normalX * rotateDistance);
      rotateHandle.setAttribute('cy', midY + normalY * rotateDistance);
      rotateHandle.setAttribute('r', rotateHandleRadius());
      rotateHandle.setAttribute('class', 'handle rotate-handle');
      rotateHandle.style.stroke = '#ffffff';
      rotateHandle.style.strokeWidth = String(screenPxToSvg(1.3));
      rotateHandle.dataset.id = wall.id;
      rotateHandle.dataset.kind = 'wall-handle-rotate';
      handlesLayer.appendChild(rotateHandle);
    }
  });

  state.stairs.forEach((stair) => {
    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    rect.setAttribute('x', stair.x);
    rect.setAttribute('y', stair.y);
    rect.setAttribute('width', stair.length);
    rect.setAttribute('height', stair.width);
    rect.setAttribute('class', `stair-rect ${state.selected?.type === 'stair' && stair.id === state.selected.id ? 'selected' : ''}`);
    rect.dataset.id = stair.id;
    rect.dataset.kind = 'stair';
    stairsLayer.appendChild(rect);

    const stepCount = Math.max(3, Math.min(12, Math.round(stair.width / Math.max(1, screenPxToSvg(14)))));
    for (let i = 1; i < stepCount; i += 1) {
      const y = stair.y + (stair.width * i) / stepCount;
      const stepLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      stepLine.setAttribute('x1', stair.x);
      stepLine.setAttribute('y1', y);
      stepLine.setAttribute('x2', stair.x + stair.length);
      stepLine.setAttribute('y2', y);
      stepLine.setAttribute('class', 'stair-step-line');
      stairsLayer.appendChild(stepLine);
    }

    if (state.selected?.type === 'stair' && stair.id === state.selected.id) {
      const handle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      handle.setAttribute('cx', stair.x + stair.length);
      handle.setAttribute('cy', stair.y + stair.width);
      handle.setAttribute('r', uiHandleRadius);
      handle.setAttribute('class', 'handle');
      handle.dataset.id = stair.id;
      handle.dataset.kind = 'stair-handle';
      handlesLayer.appendChild(handle);
    }
  });

  state.doors.forEach((door) => {
    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    const symbolScale = doorWidthPx() / DOOR_SYMBOL_BASE_WIDTH;
    const scaleX = symbolScale;
    const scaleY = symbolScale;
    const nearbyWallThickness = nearestWallThicknessPx({ x: door.x, y: door.y });
    const bgThicknessPx = Math.max(cmToPx(DOOR_BG_MIN_THICKNESS_CM), nearbyWallThickness + cmToPx(2));
    const bgHeightSvg = bgThicknessPx / symbolScale;
    const bgY = DOOR_ANCHOR_Y - bgHeightSvg / 2;

    g.setAttribute(
      'transform',
      `translate(${door.x} ${door.y}) rotate(${door.angle}) scale(${scaleX} ${scaleY}) translate(${-DOOR_ANCHOR_X} ${-DOOR_ANCHOR_Y})`,
    );
    g.dataset.id = door.id;
    g.dataset.kind = 'door';

    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    const bgPlate = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    bgPlate.setAttribute('x', String(DOOR_FRAME_MIN_X));
    bgPlate.setAttribute('y', String(bgY));
    bgPlate.setAttribute('width', String(DOOR_FRAME_MAX_X - DOOR_FRAME_MIN_X));
    bgPlate.setAttribute('height', String(bgHeightSvg));
    bgPlate.setAttribute('rx', '2.5');
    bgPlate.setAttribute(
      'class',
      `door-bg ${state.selected?.type === 'door' && door.id === state.selected.id ? 'selected' : ''}`,
    );
    bgPlate.dataset.id = door.id;
    bgPlate.dataset.kind = 'door';

    path.setAttribute('d', DOOR_PATH_D);
    path.setAttribute(
      'class',
      `door-symbol ${state.selected?.type === 'door' && door.id === state.selected.id ? 'selected' : ''}`,
    );
    path.dataset.id = door.id;
    path.dataset.kind = 'door';

    g.appendChild(bgPlate);
    g.appendChild(path);
    doorsLayer.appendChild(g);

    if (state.selected?.type === 'door' && door.id === state.selected.id) {
      const rad = degToRad(door.angle);
      const handleDistance = Math.max(doorWidthPx(), doorHeightPx()) * 0.55;
      const handle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      handle.setAttribute('cx', door.x + Math.cos(rad) * handleDistance);
      handle.setAttribute('cy', door.y + Math.sin(rad) * handleDistance);
      handle.setAttribute('r', uiHandleRadius);
      handle.setAttribute('class', 'handle');
      handle.dataset.id = door.id;
      handle.dataset.kind = 'door-handle';
      handlesLayer.appendChild(handle);
    }
  });

  state.exits.forEach((exitItem) => {
    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    g.dataset.id = exitItem.id;
    g.dataset.kind = 'exit';

    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    rect.setAttribute('x', exitItem.x);
    rect.setAttribute('y', exitItem.y);
    rect.setAttribute('width', exitItem.width);
    rect.setAttribute('height', exitItem.height);
    rect.setAttribute(
      'class',
      `exit-rect ${state.selected?.type === 'exit' && exitItem.id === state.selected.id ? 'selected' : ''}`,
    );
    rect.dataset.id = exitItem.id;
    rect.dataset.kind = 'exit';

    const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    text.setAttribute('x', exitItem.x + exitItem.width / 2);
    text.setAttribute('y', exitItem.y + exitItem.height / 2 + 4);
    text.setAttribute('text-anchor', 'middle');
    text.setAttribute('class', 'exit-label');
    text.textContent = 'EXIT';

    g.appendChild(rect);
    g.appendChild(text);
    exitsLayer.appendChild(g);
  });

  state.arrows.forEach((arrow) => {
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', arrow.x1);
    line.setAttribute('y1', arrow.y1);
    line.setAttribute('x2', arrow.x2);
    line.setAttribute('y2', arrow.y2);
    line.setAttribute('class', `arrow-line ${state.selected?.type === 'arrow' && arrow.id === state.selected.id ? 'selected' : ''}`);
    line.setAttribute('marker-end', 'url(#arrowHead)');
    line.dataset.id = arrow.id;
    line.dataset.kind = 'arrow';
    arrowsLayer.appendChild(line);

    if (state.selected?.type === 'arrow' && arrow.id === state.selected.id) {
      const handle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      handle.setAttribute('cx', arrow.x2);
      handle.setAttribute('cy', arrow.y2);
      handle.setAttribute('r', uiHandleRadius);
      handle.setAttribute('class', 'handle');
      handle.dataset.id = arrow.id;
      handle.dataset.kind = 'arrow-handle';
      handlesLayer.appendChild(handle);
    }
  });

  if (state.snapGuide) {
    if (state.snapGuide.targetEdge) {
      const edgeLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      edgeLine.setAttribute('x1', state.snapGuide.targetEdge.start.x);
      edgeLine.setAttribute('y1', state.snapGuide.targetEdge.start.y);
      edgeLine.setAttribute('x2', state.snapGuide.targetEdge.end.x);
      edgeLine.setAttribute('y2', state.snapGuide.targetEdge.end.y);
      edgeLine.setAttribute('class', 'snap-guide-target-edge');
      edgeLine.style.strokeWidth = String(snapGuideEdgeWidth());
      handlesLayer.appendChild(edgeLine);
    }

    const guideLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    guideLine.setAttribute('x1', state.snapGuide.source.x);
    guideLine.setAttribute('y1', state.snapGuide.source.y);
    guideLine.setAttribute('x2', state.snapGuide.target.x);
    guideLine.setAttribute('y2', state.snapGuide.target.y);
    guideLine.setAttribute('class', 'snap-guide-line');
    guideLine.style.strokeWidth = String(snapGuideLineWidth());
    handlesLayer.appendChild(guideLine);

    const targetPoint = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    targetPoint.setAttribute('cx', state.snapGuide.target.x);
    targetPoint.setAttribute('cy', state.snapGuide.target.y);
    targetPoint.setAttribute('r', snapGuideTargetRadius());
    targetPoint.setAttribute('class', 'snap-guide-point');
    targetPoint.style.strokeWidth = String(snapGuidePointStrokeWidth());
    handlesLayer.appendChild(targetPoint);

    const sourcePoint = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    sourcePoint.setAttribute('cx', state.snapGuide.source.x);
    sourcePoint.setAttribute('cy', state.snapGuide.source.y);
    sourcePoint.setAttribute('r', snapGuideSourceRadius());
    sourcePoint.setAttribute('class', 'snap-guide-source');
    sourcePoint.style.strokeWidth = String(snapGuideSourceStrokeWidth());
    handlesLayer.appendChild(sourcePoint);

    if (state.snapGuide.label) {
      const snapLabel = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      snapLabel.setAttribute('x', state.snapGuide.target.x + 10);
      snapLabel.setAttribute('y', state.snapGuide.target.y - 10);
      snapLabel.setAttribute('class', 'snap-guide-label');
      snapLabel.textContent = state.snapGuide.label;
      handlesLayer.appendChild(snapLabel);
    }
  }

  state.measures.forEach((measure) => {
    const quoteHitLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    quoteHitLine.setAttribute('x1', measure.x1);
    quoteHitLine.setAttribute('y1', measure.y1);
    quoteHitLine.setAttribute('x2', measure.x2);
    quoteHitLine.setAttribute('y2', measure.y2);
    quoteHitLine.setAttribute('stroke', 'rgba(0, 0, 0, 0.001)');
    quoteHitLine.setAttribute('stroke-linecap', 'round');
    quoteHitLine.style.strokeWidth = String(screenPxToSvg(18));
    quoteHitLine.style.pointerEvents = 'stroke';
    quoteHitLine.dataset.id = measure.id;
    quoteHitLine.dataset.kind = 'measure';
    measureLayer.appendChild(quoteHitLine);

    const quoteLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    quoteLine.setAttribute('x1', measure.x1);
    quoteLine.setAttribute('y1', measure.y1);
    quoteLine.setAttribute('x2', measure.x2);
    quoteLine.setAttribute('y2', measure.y2);
    quoteLine.setAttribute('class', `measure-quote ${state.selected?.type === 'measure' && measure.id === state.selected.id ? 'selected' : ''}`);
    quoteLine.style.strokeWidth = String(measureLineWidth());
    quoteLine.style.strokeDasharray = `${measureDashLength()} ${measureDashGap()}`;
    quoteLine.style.pointerEvents = 'none';
    quoteLine.dataset.id = measure.id;
    quoteLine.dataset.kind = 'measure';
    measureLayer.appendChild(quoteLine);

    const distCm = roundCm(pxToCm(distance({ x: measure.x1, y: measure.y1 }, { x: measure.x2, y: measure.y2 })));
    const midX = (measure.x1 + measure.x2) / 2;
    const midY = (measure.y1 + measure.y2) / 2;
    const measureLabel = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    measureLabel.setAttribute('x', midX + measureLabelOffset());
    measureLabel.setAttribute('y', midY - measureLabelOffset());
    measureLabel.setAttribute('class', 'measure-label');
    measureLabel.style.fontSize = `${measureLabelFontSize()}px`;
    measureLabel.textContent = `${distCm} cm`;
    measureLayer.appendChild(measureLabel);

    if (state.selected?.type === 'measure' && measure.id === state.selected.id) {
      const endHandle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      endHandle.setAttribute('cx', measure.x2);
      endHandle.setAttribute('cy', measure.y2);
      endHandle.setAttribute('r', measureHandleRadius());
      endHandle.setAttribute('class', 'handle');
      endHandle.dataset.id = measure.id;
      endHandle.dataset.kind = 'measure-handle-end';
      handlesLayer.appendChild(endHandle);
    }
  });

  const draftEnd = state.measure.end || state.measure.hover;
  if (state.measure.start && draftEnd) {
    const draftLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    draftLine.setAttribute('x1', state.measure.start.x);
    draftLine.setAttribute('y1', state.measure.start.y);
    draftLine.setAttribute('x2', draftEnd.x);
    draftLine.setAttribute('y2', draftEnd.y);
    draftLine.setAttribute('class', 'measure-line');
    draftLine.style.strokeWidth = String(measureLineWidth());
    draftLine.style.strokeDasharray = `${measureDashLength()} ${measureDashGap()}`;
    measureLayer.appendChild(draftLine);

    const startPoint = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    startPoint.setAttribute('cx', state.measure.start.x);
    startPoint.setAttribute('cy', state.measure.start.y);
    startPoint.setAttribute('r', screenPxToSvg(2.4));
    startPoint.setAttribute('class', 'measure-point');
    measureLayer.appendChild(startPoint);

    const endPoint = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    endPoint.setAttribute('cx', draftEnd.x);
    endPoint.setAttribute('cy', draftEnd.y);
    endPoint.setAttribute('r', screenPxToSvg(2.4));
    endPoint.setAttribute('class', 'measure-point');
    measureLayer.appendChild(endPoint);

    const draftDistCm = roundCm(pxToCm(distance(state.measure.start, draftEnd)));
    measureValue.textContent = `Distance: ${draftDistCm} cm`;
  } else if (state.selected?.type === 'measure') {
    const selectedMeasure = measureById(state.selected.id);
    if (selectedMeasure) {
      const selectedDistCm = roundCm(pxToCm(distance(
        { x: selectedMeasure.x1, y: selectedMeasure.y1 },
        { x: selectedMeasure.x2, y: selectedMeasure.y2 },
      )));
      measureValue.textContent = `Distance: ${selectedDistCm} cm`;
    } else {
      measureValue.textContent = 'Distance: -';
    }
  } else {
    measureValue.textContent = 'Distance: -';
  }

  measureToggleBtn.classList.toggle('active-tool', state.measure.active);
  measureToggleBtn.textContent = `Measure: ${state.measure.active ? 'On' : 'Off'}`;

  updateInputs();
}

function addWall() {
  const spawn = nextSpawnPoint();
  const id = createId('wall');
  const wall = {
    id,
    x: spawn.x,
    y: spawn.y,
    length: cmToPx(WALL_DEFAULTS_CM.length),
    thickness: cmToPx(WALL_DEFAULTS_CM.thickness),
    angle: WALL_DEFAULTS_CM.angle,
  };

  state.walls.push(wall);
  state.selected = { type: 'wall', id };
  commitStateChange();
}

function addStair() {
  const spawn = nextSpawnPoint();
  const id = createId('stair');
  const length = cmToPx(STAIR_DEFAULTS_CM.length);
  const width = cmToPx(STAIR_DEFAULTS_CM.width);

  state.stairs.push({
    id,
    x: spawn.x - length / 2,
    y: spawn.y - width / 2,
    length,
    width,
  });
  state.selected = { type: 'stair', id };
  commitStateChange();
}

function addExit() {
  const spawn = nextSpawnPoint();
  const id = createId('exit');
  const width = 100;
  const height = 42;
  state.exits.push({
    id,
    x: spawn.x - width / 2,
    y: spawn.y - height / 2,
    width,
    height,
  });
  state.selected = { type: 'exit', id };
  commitStateChange();
}

function addArrow() {
  const spawn = nextSpawnPoint();
  const length = cmToPx(60);
  const id = createId('arrow');
  state.arrows.push({
    id,
    x1: spawn.x,
    y1: spawn.y,
    x2: spawn.x + length,
    y2: spawn.y,
  });
  state.selected = { type: 'arrow', id };
  commitStateChange();
}

function snapDoorToWall(point, maxDistance) {
  let best = null;

  state.walls.forEach((wall) => {
    const start = { x: wall.x, y: wall.y };
    const end = endPoint(wall);
    const projected = nearestPointOnSegment(point, start, end);
    const d = distance(point, projected);
    if (d <= maxDistance && (!best || d < best.distance)) {
      best = {
        point: projected,
        angle: wall.angle,
        distance: d,
        targetEdge: { start, end },
      };
    }
  });

  return best;
}

function addDoor() {
  const spawn = nextSpawnPoint();
  const id = createId('door');
  let x = spawn.x;
  let y = spawn.y;
  let angle = 0;

  const snap = snapDoorToWall(spawn, doorSnapDistancePx());
  if (snap) {
    x = snap.point.x;
    y = snap.point.y;
    angle = snap.angle;
  }

  state.doors.push({ id, x, y, angle });
  state.selected = { type: 'door', id };
  commitStateChange();
}

function setSelection(type, id, openDialog = true) {
  state.selected = { type, id };
  render();

  if (type === 'measure' && openDialog) {
    openMeasureDialog(id);
  }
}

function snapMovedMeasure(measure, proposedStart) {
  const dxOriginal = measure.x2 - measure.x1;
  const dyOriginal = measure.y2 - measure.y1;
  const proposedEnd = {
    x: proposedStart.x + dxOriginal,
    y: proposedStart.y + dyOriginal,
  };

  const candidates = [];
  const startMatch = findClosestSnapMatch(proposedStart, null, moveSnapDistancePx());
  if (startMatch) {
    candidates.push({
      distance: startMatch.distance,
      dx: startMatch.point.x - proposedStart.x,
      dy: startMatch.point.y - proposedStart.y,
      guide: {
        source: proposedStart,
        target: startMatch.point,
        label: startMatch.label,
        targetEdge: startMatch.targetEdge,
      },
    });
  }

  const endMatch = findClosestSnapMatch(proposedEnd, null, moveSnapDistancePx());
  if (endMatch) {
    candidates.push({
      distance: endMatch.distance,
      dx: endMatch.point.x - proposedEnd.x,
      dy: endMatch.point.y - proposedEnd.y,
      guide: {
        source: proposedEnd,
        target: endMatch.point,
        label: endMatch.label,
        targetEdge: endMatch.targetEdge,
      },
    });
  }

  if (candidates.length === 0) {
    return {
      x1: proposedStart.x,
      y1: proposedStart.y,
      x2: proposedEnd.x,
      y2: proposedEnd.y,
      guide: null,
    };
  }

  candidates.sort((a, b) => a.distance - b.distance);
  const best = candidates[0];
  return {
    x1: proposedStart.x + best.dx,
    y1: proposedStart.y + best.dy,
    x2: proposedEnd.x + best.dx,
    y2: proposedEnd.y + best.dy,
    guide: best.guide,
  };
}

function measureLengthPx(measure) {
  return distance({ x: measure.x1, y: measure.y1 }, { x: measure.x2, y: measure.y2 });
}

function measureAngleDeg(measure) {
  return (Math.atan2(measure.y2 - measure.y1, measure.x2 - measure.x1) * 180) / Math.PI;
}

function openMeasureDialog(measureId) {
  const measure = measureById(measureId);
  if (!measure || !measureDialog) {
    return;
  }

  measureLengthInput.value = String(roundCm(pxToCm(measureLengthPx(measure))));
  measureAngleInput.value = String(Math.round(measureAngleDeg(measure)));
  measureDialog.dataset.measureId = measure.id;
  if (!measureDialog.open) {
    measureDialog.showModal();
  }
}

function applyMeasureDialog() {
  const measureId = measureDialog?.dataset?.measureId;
  if (!measureId) {
    return;
  }

  const measure = measureById(measureId);
  if (!measure) {
    return;
  }

  const lengthCm = Number(measureLengthInput.value);
  const angleDeg = Number(measureAngleInput.value);
  if (!Number.isFinite(lengthCm) || lengthCm <= 0 || !Number.isFinite(angleDeg)) {
    return;
  }

  const lengthPx = cmToPx(lengthCm);
  const rad = degToRad(angleDeg);
  measure.x2 = measure.x1 + Math.cos(rad) * lengthPx;
  measure.y2 = measure.y1 + Math.sin(rad) * lengthPx;
  commitStateChange();
}

function deleteSelectedItem() {
  if (!state.selected) {
    return;
  }

  if (state.selected.type === 'wall') {
    state.walls = state.walls.filter((w) => w.id !== state.selected.id);
  }

  if (state.selected.type === 'stair') {
    state.stairs = state.stairs.filter((s) => s.id !== state.selected.id);
  }

  if (state.selected.type === 'door') {
    state.doors = state.doors.filter((d) => d.id !== state.selected.id);
  }

  if (state.selected.type === 'exit') {
    state.exits = state.exits.filter((e) => e.id !== state.selected.id);
  }

  if (state.selected.type === 'arrow') {
    state.arrows = state.arrows.filter((a) => a.id !== state.selected.id);
  }

  if (state.selected.type === 'measure') {
    state.measures = state.measures.filter((m) => m.id !== state.selected.id);
    if (measureDialog?.open) {
      measureDialog.close();
    }
  }

  state.selected = firstSelectableEntity();
  commitStateChange();
}

function nearestPointOnSegment(point, a, b) {
  const abx = b.x - a.x;
  const aby = b.y - a.y;
  const abSquared = abx * abx + aby * aby;
  if (abSquared === 0) {
    return { x: a.x, y: a.y };
  }

  const apx = point.x - a.x;
  const apy = point.y - a.y;
  const t = Math.max(0, Math.min(1, (apx * abx + apy * aby) / abSquared));
  return {
    x: a.x + abx * t,
    y: a.y + aby * t,
  };
}

function nearestPointOnExtendedSegment(point, a, b, extensionPx) {
  const abx = b.x - a.x;
  const aby = b.y - a.y;
  const abSquared = abx * abx + aby * aby;
  if (abSquared === 0) {
    return { x: a.x, y: a.y };
  }

  const length = Math.sqrt(abSquared);
  const extensionT = extensionPx / length;
  const apx = point.x - a.x;
  const apy = point.y - a.y;
  const tRaw = (apx * abx + apy * aby) / abSquared;
  const t = Math.max(-extensionT, Math.min(1 + extensionT, tRaw));

  return {
    x: a.x + abx * t,
    y: a.y + aby * t,
  };
}

function projectPointOnAxis(point, origin, axis) {
  const t = (point.x - origin.x) * axis.x + (point.y - origin.y) * axis.y;
  return {
    x: origin.x + axis.x * t,
    y: origin.y + axis.y * t,
  };
}

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function wallSnapGeometry(wall) {
  const start = { x: wall.x, y: wall.y };
  const end = endPoint(wall);
  const length = Math.max(1, wall.length);
  const ux = (end.x - start.x) / length;
  const uy = (end.y - start.y) / length;
  const nx = -uy;
  const ny = ux;
  const halfThickness = wall.thickness / 2;

  const startLeft = {
    x: start.x + nx * halfThickness,
    y: start.y + ny * halfThickness,
  };
  const endLeft = {
    x: end.x + nx * halfThickness,
    y: end.y + ny * halfThickness,
  };
  const endRight = {
    x: end.x - nx * halfThickness,
    y: end.y - ny * halfThickness,
  };
  const startRight = {
    x: start.x - nx * halfThickness,
    y: start.y - ny * halfThickness,
  };

  const corners = [startLeft, endLeft, endRight, startRight];
  const edges = [
    [startLeft, endLeft],
    [endLeft, endRight],
    [endRight, startRight],
    [startRight, startLeft],
  ];
  const longEdges = [
    [startLeft, endLeft],
    [startRight, endRight],
  ];

  return {
    corners,
    edges,
    longEdges,
    centerStart: start,
    centerEnd: end,
    endLeft,
    endRight,
    startLeft,
    startRight,
  };
}

function normalizeVector(vector) {
  const len = Math.hypot(vector.x, vector.y);
  if (len === 0) {
    return { x: 0, y: 0 };
  }
  return {
    x: vector.x / len,
    y: vector.y / len,
  };
}

function projectPointsOnAxis(points, axis) {
  let min = Infinity;
  let max = -Infinity;

  points.forEach((point) => {
    const projection = point.x * axis.x + point.y * axis.y;
    if (projection < min) {
      min = projection;
    }
    if (projection > max) {
      max = projection;
    }
  });

  return { min, max };
}

function overlapAmount(intervalA, intervalB) {
  return Math.min(intervalA.max, intervalB.max) - Math.max(intervalA.min, intervalB.min);
}

function polygonsInteriorOverlap(cornersA, cornersB, epsilon = 0.4) {
  const axes = [];

  const addAxesFromCorners = (corners) => {
    for (let i = 0; i < corners.length; i += 1) {
      const current = corners[i];
      const next = corners[(i + 1) % corners.length];
      const edge = { x: next.x - current.x, y: next.y - current.y };
      const axis = normalizeVector({ x: -edge.y, y: edge.x });
      if (axis.x !== 0 || axis.y !== 0) {
        axes.push(axis);
      }
    }
  };

  addAxesFromCorners(cornersA);
  addAxesFromCorners(cornersB);

  for (const axis of axes) {
    const projectionA = projectPointsOnAxis(cornersA, axis);
    const projectionB = projectPointsOnAxis(cornersB, axis);
    if (overlapAmount(projectionA, projectionB) <= epsilon) {
      return false;
    }
  }

  return true;
}

function translatedWall(wall, dx, dy) {
  return {
    ...wall,
    x: wall.x + dx,
    y: wall.y + dy,
  };
}

function snapCandidateIsValid(movingWall, source, target, movingWallId) {
  const dx = target.x - source.x;
  const dy = target.y - source.y;
  const moved = translatedWall(movingWall, dx, dy);
  const movedCorners = wallSnapGeometry(moved).corners;

  for (const otherWall of state.walls) {
    if (otherWall.id === movingWallId) {
      continue;
    }

    const otherCorners = wallSnapGeometry(otherWall).corners;
    if (polygonsInteriorOverlap(movedCorners, otherCorners)) {
      return false;
    }
  }

  return true;
}

function closestPointMatch(sourcePoint, targetWallId, maxDistance, prolongationPx = wallProlongationPx()) {
  let best = null;
  const cornerMaxDistance = Math.max(maxDistance, cornerCaptureDistancePx());

  state.walls.forEach((targetWall) => {
    if (targetWall.id === targetWallId) {
      return;
    }

    const geometry = wallSnapGeometry(targetWall);

    geometry.corners.forEach((targetCorner) => {
      const d = distance(sourcePoint, targetCorner);
      const score = d - cornerPriorityBonusPx();
      if (d <= cornerMaxDistance && (!best || score < best.score || (score === best.score && d < best.distance))) {
        best = {
          source: sourcePoint,
          target: targetCorner,
          distance: d,
          score,
          kind: 'corner',
          label: 'Corner → Corner',
          targetEdge: null,
          targetWallId: targetWall.id,
        };
      }
    });

    geometry.edges.forEach(([edgeStart, edgeEnd]) => {
      const targetOnEdge = nearestPointOnSegment(sourcePoint, edgeStart, edgeEnd);
      const d = distance(sourcePoint, targetOnEdge);
      const score = d;
      if (d <= maxDistance && (!best || score < best.score || (score === best.score && d < best.distance))) {
        best = {
          source: sourcePoint,
          target: targetOnEdge,
          distance: d,
          score,
          kind: 'edge',
          label: 'Edge → Edge',
          targetEdge: { start: edgeStart, end: edgeEnd },
          targetWallId: targetWall.id,
        };
      }
    });

    geometry.longEdges.forEach(([edgeStart, edgeEnd]) => {
      const targetOnProlongation = nearestPointOnExtendedSegment(
        sourcePoint,
        edgeStart,
        edgeEnd,
        prolongationPx,
      );
      const d = distance(sourcePoint, targetOnProlongation);
      const score = d + 0.5;
      if (d <= maxDistance && (!best || score < best.score || (score === best.score && d < best.distance))) {
        best = {
          source: sourcePoint,
          target: targetOnProlongation,
          distance: d,
          score,
          kind: 'edge-prolongation',
          label: 'Edge → Prolongation',
          targetEdge: { start: edgeStart, end: edgeEnd },
          targetWallId: targetWall.id,
        };
      }
    });
  });

  return best;
}

function edgeToEdgeMatch(movingEdgeStart, movingEdgeEnd, targetWallId, maxDistance) {
  let best = null;
  const movingVec = {
    x: movingEdgeEnd.x - movingEdgeStart.x,
    y: movingEdgeEnd.y - movingEdgeStart.y,
  };
  const movingLen = Math.hypot(movingVec.x, movingVec.y);
  if (movingLen === 0) {
    return null;
  }

  state.walls.forEach((targetWall) => {
    if (targetWall.id === targetWallId) {
      return;
    }

    const targetGeometry = wallSnapGeometry(targetWall);

    targetGeometry.longEdges.forEach(([targetEdgeStart, targetEdgeEnd]) => {
      const targetVec = {
        x: targetEdgeEnd.x - targetEdgeStart.x,
        y: targetEdgeEnd.y - targetEdgeStart.y,
      };
      const targetLen = Math.hypot(targetVec.x, targetVec.y);
      if (targetLen === 0) {
        return;
      }

      const parallelScore = Math.abs(
        (movingVec.x * targetVec.x + movingVec.y * targetVec.y) / (movingLen * targetLen),
      );
      if (parallelScore < 0.9659) {
        return;
      }

      const candidates = [
        {
          source: movingEdgeStart,
          target: nearestPointOnExtendedSegment(
            movingEdgeStart,
            targetEdgeStart,
            targetEdgeEnd,
            wallProlongationPx(),
          ),
        },
        {
          source: movingEdgeEnd,
          target: nearestPointOnExtendedSegment(
            movingEdgeEnd,
            targetEdgeStart,
            targetEdgeEnd,
            wallProlongationPx(),
          ),
        },
        {
          source: nearestPointOnSegment(targetEdgeStart, movingEdgeStart, movingEdgeEnd),
          target: targetEdgeStart,
        },
        {
          source: nearestPointOnSegment(targetEdgeEnd, movingEdgeStart, movingEdgeEnd),
          target: targetEdgeEnd,
        },
      ];

      candidates.forEach((candidate) => {
        const d = distance(candidate.source, candidate.target);
        if (d <= maxDistance && (!best || d < best.distance)) {
          best = {
            source: candidate.source,
            target: candidate.target,
            distance: d,
            kind: 'edge',
            label: 'Edge → Edge',
            targetEdge: { start: targetEdgeStart, end: targetEdgeEnd },
            targetWallId: targetWall.id,
          };
        }
      });
    });
  });

  return best;
}

function edgeToCornerMatch(movingEdgeStart, movingEdgeEnd, targetWallId, maxDistance) {
  let best = null;

  state.walls.forEach((targetWall) => {
    if (targetWall.id === targetWallId) {
      return;
    }

    const targetGeometry = wallSnapGeometry(targetWall);
    targetGeometry.corners.forEach((targetCorner) => {
      const sourceOnEdge = nearestPointOnSegment(targetCorner, movingEdgeStart, movingEdgeEnd);
      const d = distance(sourceOnEdge, targetCorner);
      if (d <= maxDistance && (!best || d < best.distance)) {
        best = {
          source: sourceOnEdge,
          target: targetCorner,
          distance: d,
          kind: 'edge-corner',
          label: 'Edge → Corner',
          targetEdge: null,
          targetWallId: targetWall.id,
        };
      }
    });
  });

  return best;
}

function findClosestSnapMatch(pointer, currentWallId, maxDistance) {
  const best = closestPointMatch(pointer, currentWallId, maxDistance);
  if (!best) {
    return null;
  }

  return { point: best.target, distance: best.distance, label: best.label, targetEdge: best.targetEdge };
}

function findClosestSnapPoint(pointer, currentWallId, maxDistance) {
  const match = findClosestSnapMatch(pointer, currentWallId, maxDistance);
  return match?.point || null;
}

function snapPointToWalls(pointer, currentWallId) {
  return findClosestSnapPoint(pointer, currentWallId, pointSnapDistancePx()) || pointer;
}

function nearestMovingFeatures(geometry, pointer) {
  let nearestCorner = null;
  geometry.corners.forEach((corner) => {
    const d = distance(pointer, corner);
    if (!nearestCorner || d < nearestCorner.distance) {
      nearestCorner = { source: corner, distance: d, kind: 'corner' };
    }
  });

  let nearestEdge = null;
  geometry.edges.forEach(([edgeStart, edgeEnd]) => {
    const sourceOnEdge = nearestPointOnSegment(pointer, edgeStart, edgeEnd);
    const d = distance(pointer, sourceOnEdge);
    if (!nearestEdge || d < nearestEdge.distance) {
      nearestEdge = {
        source: sourceOnEdge,
        edgeStart,
        edgeEnd,
        distance: d,
        kind: 'edge',
      };
    }
  });

  const features = [];
  if (nearestCorner) {
    features.push(nearestCorner);
  }
  if (nearestEdge) {
    features.push(nearestEdge);
  }
  return features;
}

function snapMovedWallStart(wall, proposedStart, pointer) {
  const proposedWall = {
    ...wall,
    x: proposedStart.x,
    y: proposedStart.y,
  };
  const geometry = wallSnapGeometry(proposedWall);
  const sourceFeatures = nearestMovingFeatures(geometry, pointer);

  let bestMatch = null;

  const considerCandidate = (candidate) => {
    if (!candidate) {
      return;
    }

    if (!snapCandidateIsValid(proposedWall, candidate.source, candidate.target, wall.id)) {
      return;
    }

    const candidateScore = candidate.score ?? candidate.distance;
    const bestScore = bestMatch ? bestMatch.score ?? bestMatch.distance : null;
    if (!bestMatch || candidateScore < bestScore || (candidateScore === bestScore && candidate.distance < bestMatch.distance)) {
      bestMatch = {
        source: candidate.source,
        target: candidate.target,
        distance: candidate.distance,
        score: candidateScore,
        label: candidate.label,
        targetEdge: candidate.targetEdge,
      };
    }
  };

  sourceFeatures.forEach((feature) => {
    if (feature.kind === 'corner') {
      const cornerMatch = closestPointMatch(feature.source, wall.id, moveSnapDistancePx());
      if (cornerMatch) {
        considerCandidate({
          source: feature.source,
          target: cornerMatch.target,
          distance: cornerMatch.distance,
          score: cornerMatch.score,
          label: cornerMatch.label,
          targetEdge: cornerMatch.targetEdge,
        });
      }
      return;
    }

    if (feature.kind === 'edge') {
      const edgeMatch = edgeToEdgeMatch(
        feature.edgeStart,
        feature.edgeEnd,
        wall.id,
        moveSnapDistancePx(),
      );
      considerCandidate(edgeMatch);

      const edgeCornerMatch = edgeToCornerMatch(
        feature.edgeStart,
        feature.edgeEnd,
        wall.id,
        moveSnapDistancePx(),
      );
      considerCandidate(edgeCornerMatch);
    }
  });

  if (!bestMatch) {
    return { start: proposedStart, guide: null };
  }

  return {
    start: {
      x: proposedStart.x + (bestMatch.target.x - bestMatch.source.x),
      y: proposedStart.y + (bestMatch.target.y - bestMatch.source.y),
    },
    guide: {
      source: bestMatch.source,
      target: bestMatch.target,
      label: bestMatch.label,
      targetEdge: bestMatch.targetEdge,
    },
  };
}

function snapAngle(rawAngle, currentWallId) {
  let snapped = rawAngle;

  const incrementSnap = Math.round(rawAngle / ORIENTATION_SNAP_DEG) * ORIENTATION_SNAP_DEG;
  if (angleDifference(rawAngle, incrementSnap) <= ORIENTATION_THRESHOLD_DEG) {
    snapped = incrementSnap;
  }

  state.walls.forEach((wall) => {
    if (wall.id === currentWallId) {
      return;
    }

    if (angleDifference(rawAngle, wall.angle) < angleDifference(rawAngle, snapped) && angleDifference(rawAngle, wall.angle) <= ORIENTATION_THRESHOLD_DEG) {
      snapped = wall.angle;
    }
  });

  return normalizeAngle(snapped);
}

function svgPoint(evt) {
  const pt = editor.createSVGPoint();
  pt.x = evt.clientX;
  pt.y = evt.clientY;
  const transformed = pt.matrixTransform(editor.getScreenCTM().inverse());
  return { x: transformed.x, y: transformed.y };
}

function clientToSvgPoint(clientX, clientY) {
  const pt = editor.createSVGPoint();
  pt.x = clientX;
  pt.y = clientY;
  const transformed = pt.matrixTransform(editor.getScreenCTM().inverse());
  return { x: transformed.x, y: transformed.y };
}

function clampPointToCanvas(point) {
  return {
    x: Math.max(0, Math.min(state.canvas.width, point.x)),
    y: Math.max(0, Math.min(state.canvas.height, point.y)),
  };
}

function viewportCenterSvgPoint() {
  const viewport = editor.parentElement;
  if (!viewport) {
    return {
      x: state.canvas.width / 2,
      y: state.canvas.height / 2,
    };
  }

  return {
    x: (viewport.scrollLeft + viewport.clientWidth / 2) / state.canvas.zoom,
    y: (viewport.scrollTop + viewport.clientHeight / 2) / state.canvas.zoom,
  };
}

function nextSpawnPoint() {
  const lastWall = state.walls[state.walls.length - 1];
  if (lastWall) {
    const offset = Math.max(6, scaledByCanvasUnits(PASTE_OFFSET_PX));
    return clampPointToCanvas({
      x: lastWall.x + offset,
      y: lastWall.y + offset,
    });
  }

  const viewport = editor.parentElement;
  if (lastPointerClient && viewport) {
    const rect = viewport.getBoundingClientRect();
    const withinViewport =
      lastPointerClient.x >= rect.left &&
      lastPointerClient.x <= rect.right &&
      lastPointerClient.y >= rect.top &&
      lastPointerClient.y <= rect.bottom;

    if (withinViewport) {
      return clampPointToCanvas(clientToSvgPoint(lastPointerClient.x, lastPointerClient.y));
    }
  }

  return clampPointToCanvas(viewportCenterSvgPoint());
}

function startDrag(evt) {
  evt.preventDefault();
  lastPointerClient = { x: evt.clientX, y: evt.clientY };
  const measureHandleEnd = evt.target.closest('[data-kind="measure-handle-end"]');
  const measureQuote = evt.target.closest('[data-kind="measure"]');

  if (measureHandleEnd) {
    const id = measureHandleEnd.dataset.id;
    state.selected = { type: 'measure', id };
    state.dragMode = { type: 'resize-measure', id, didMutate: false };
    render();
    return;
  }

  if (measureQuote) {
    const id = measureQuote.dataset.id;
    const measure = measureById(id);
    if (!measure) {
      return;
    }
    const pointer = svgPoint(evt);
    setSelection('measure', id, false);
    state.dragMode = {
      type: 'move-measure',
      id,
      dx: pointer.x - measure.x1,
      dy: pointer.y - measure.y1,
      didMutate: false,
    };
    return;
  }

  if (state.measure.active) {
    const pointer = snapPointToWalls(svgPoint(evt), null);
    if (!state.measure.start || state.measure.end) {
      state.measure.start = pointer;
      state.measure.end = null;
      state.measure.hover = pointer;
    } else {
      state.measure.end = pointer;
      if (distance(state.measure.start, state.measure.end) >= 1) {
        const id = createId('measure');
        state.measures.push({
          id,
          x1: state.measure.start.x,
          y1: state.measure.start.y,
          x2: state.measure.end.x,
          y2: state.measure.end.y,
        });
        state.selected = { type: 'measure', id };
        state.measure.start = null;
        state.measure.end = null;
        state.measure.hover = null;
        commitStateChange();
        openMeasureDialog(id);
        return;
      }
      state.measure.hover = null;
    }
    state.snapGuide = null;
    render();
    return;
  }

  state.snapGuide = null;
  const wallLine = evt.target.closest('.wall');
  const wallHandleStart = evt.target.closest('[data-kind="wall-handle-start"]');
  const wallHandleEnd = evt.target.closest('[data-kind="wall-handle-end"]');
  const wallHandleRotate = evt.target.closest('[data-kind="wall-handle-rotate"]');
  const stairRect = evt.target.closest('.stair-rect');
  const stairHandle = evt.target.closest('[data-kind="stair-handle"]');
  const doorSymbol = evt.target.closest('.door-symbol');
  const doorHandle = evt.target.closest('[data-kind="door-handle"]');
  const arrowLine = evt.target.closest('.arrow-line');
  const arrowHandle = evt.target.closest('[data-kind="arrow-handle"]');
  const exitRect = evt.target.closest('.exit-rect');
  const exitGroup = evt.target.closest('[data-kind="exit"]');

  if (doorHandle) {
    const id = doorHandle.dataset.id;
    setSelection('door', id);
    state.dragMode = { type: 'rotate-door', id, didMutate: false };
    return;
  }

  if (wallHandleStart) {
    const id = wallHandleStart.dataset.id;
    const wall = wallById(id);
    const axis = {
      x: Math.cos(degToRad(wall.angle)),
      y: Math.sin(degToRad(wall.angle)),
    };
    setSelection('wall', id);
    state.dragMode = { type: 'resize-start', id, didMutate: false, axis };
    return;
  }

  if (wallHandleEnd) {
    const id = wallHandleEnd.dataset.id;
    const wall = wallById(id);
    const axis = {
      x: Math.cos(degToRad(wall.angle)),
      y: Math.sin(degToRad(wall.angle)),
    };
    setSelection('wall', id);
    state.dragMode = { type: 'resize-end', id, didMutate: false, axis };
    return;
  }

  if (wallHandleRotate) {
    const id = wallHandleRotate.dataset.id;
    const wall = wallById(id);
    const end = endPoint(wall);
    const center = { x: (wall.x + end.x) / 2, y: (wall.y + end.y) / 2 };
    setSelection('wall', id);
    state.dragMode = { type: 'rotate-wall', id, didMutate: false, center };
    return;
  }

  if (arrowHandle) {
    const id = arrowHandle.dataset.id;
    setSelection('arrow', id);
    state.dragMode = { type: 'resize-arrow', id, didMutate: false };
    return;
  }

  if (stairHandle) {
    const id = stairHandle.dataset.id;
    setSelection('stair', id);
    state.dragMode = { type: 'resize-stair', id, didMutate: false };
    return;
  }

  if (stairRect) {
    const id = stairRect.dataset.id;
    setSelection('stair', id);
    const stair = stairById(id);
    const pointer = svgPoint(evt);
    state.dragMode = {
      type: 'move-stair',
      id,
      dx: pointer.x - stair.x,
      dy: pointer.y - stair.y,
      didMutate: false,
    };
    return;
  }

  if (wallLine) {
    const id = wallLine.dataset.id;
    setSelection('wall', id);
    const wall = wallById(id);
    const pointer = svgPoint(evt);
    state.dragMode = {
      type: 'move',
      id,
      dx: pointer.x - wall.x,
      dy: pointer.y - wall.y,
      didMutate: false,
    };
    return;
  }

  if (doorSymbol) {
    const id = doorSymbol.dataset.id;
    setSelection('door', id);
    const door = doorById(id);
    const pointer = svgPoint(evt);
    state.dragMode = {
      type: 'move-door',
      id,
      dx: pointer.x - door.x,
      dy: pointer.y - door.y,
      didMutate: false,
    };
    return;
  }

  if (arrowLine) {
    const id = arrowLine.dataset.id;
    setSelection('arrow', id);
    const arrow = arrowById(id);
    const pointer = svgPoint(evt);
    state.dragMode = {
      type: 'move-arrow',
      id,
      dx: pointer.x - arrow.x1,
      dy: pointer.y - arrow.y1,
      didMutate: false,
    };
    return;
  }

  if (exitRect || exitGroup) {
    const id = (exitRect || exitGroup).dataset.id;
    setSelection('exit', id);
    const exitItem = exitById(id);
    const pointer = svgPoint(evt);
    state.dragMode = {
      type: 'move-exit',
      id,
      dx: pointer.x - exitItem.x,
      dy: pointer.y - exitItem.y,
      didMutate: false,
    };
    return;
  }

  state.selected = null;
  render();
}

function onPointerMove(evt) {
  lastPointerClient = { x: evt.clientX, y: evt.clientY };

  if (state.measure.active) {
    if (state.measure.start && !state.measure.end) {
      state.measure.hover = snapPointToWalls(svgPoint(evt), null);
      render();
    }
    return;
  }

  if (!state.dragMode) {
    return;
  }

  const pointer = svgPoint(evt);

  if (state.dragMode.type === 'resize-measure') {
    const measure = measureById(state.dragMode.id);
    if (!measure) {
      return;
    }

    const snapped = snapPointToWalls(pointer, null);
    measure.x2 = snapped.x;
    measure.y2 = snapped.y;
    state.dragMode.didMutate = true;
    state.snapGuide = null;
    render();
    return;
  }

  if (state.dragMode.type === 'move-measure') {
    const measure = measureById(state.dragMode.id);
    if (!measure) {
      return;
    }

    const proposedStart = {
      x: pointer.x - state.dragMode.dx,
      y: pointer.y - state.dragMode.dy,
    };
    const moved = snapMovedMeasure(measure, proposedStart);
    measure.x1 = moved.x1;
    measure.y1 = moved.y1;
    measure.x2 = moved.x2;
    measure.y2 = moved.y2;
    state.dragMode.didMutate = true;
    state.snapGuide = moved.guide;
    render();
    return;
  }

  if (state.dragMode.type === 'move-stair') {
    const stair = stairById(state.dragMode.id);
    if (!stair) {
      return;
    }

    stair.x = pointer.x - state.dragMode.dx;
    stair.y = pointer.y - state.dragMode.dy;
    state.dragMode.didMutate = true;
    state.snapGuide = null;
    render();
    return;
  }

  if (state.dragMode.type === 'resize-stair') {
    const stair = stairById(state.dragMode.id);
    if (!stair) {
      return;
    }

    const minSide = Math.max(1, cmToPx(10));
    stair.length = Math.max(minSide, pointer.x - stair.x);
    stair.width = Math.max(minSide, pointer.y - stair.y);
    state.dragMode.didMutate = true;
    state.snapGuide = null;
    render();
    return;
  }

  if (state.dragMode.type === 'move-exit') {
    const exitItem = exitById(state.dragMode.id);
    if (!exitItem) {
      return;
    }

    exitItem.x = pointer.x - state.dragMode.dx;
    exitItem.y = pointer.y - state.dragMode.dy;
    state.dragMode.didMutate = true;
    state.snapGuide = null;
    render();
    return;
  }

  if (state.dragMode.type === 'move-arrow') {
    const arrow = arrowById(state.dragMode.id);
    if (!arrow) {
      return;
    }

    const nextX1 = pointer.x - state.dragMode.dx;
    const nextY1 = pointer.y - state.dragMode.dy;
    const dx = arrow.x2 - arrow.x1;
    const dy = arrow.y2 - arrow.y1;

    arrow.x1 = nextX1;
    arrow.y1 = nextY1;
    arrow.x2 = nextX1 + dx;
    arrow.y2 = nextY1 + dy;
    state.dragMode.didMutate = true;
    state.snapGuide = null;
    render();
    return;
  }

  if (state.dragMode.type === 'move-door') {
    const door = doorById(state.dragMode.id);
    if (!door) {
      return;
    }

    const proposed = {
      x: pointer.x - state.dragMode.dx,
      y: pointer.y - state.dragMode.dy,
    };
    const snap = snapDoorToWall(proposed, doorSnapDistancePx());
    if (snap) {
      door.x = snap.point.x;
      door.y = snap.point.y;
      door.angle = snap.angle;
      state.snapGuide = {
        source: proposed,
        target: snap.point,
        label: 'Door → Wall',
        targetEdge: snap.targetEdge,
      };
    } else {
      door.x = proposed.x;
      door.y = proposed.y;
      state.snapGuide = null;
    }

    state.dragMode.didMutate = true;
    render();
    return;
  }

  if (state.dragMode.type === 'rotate-door') {
    const door = doorById(state.dragMode.id);
    if (!door) {
      return;
    }

    const dx = pointer.x - door.x;
    const dy = pointer.y - door.y;
    const rawAngle = (Math.atan2(dy, dx) * 180) / Math.PI;
    door.angle = snapAngle(rawAngle, null);
    state.dragMode.didMutate = true;
    state.snapGuide = null;
    render();
    return;
  }

  if (state.dragMode.type === 'resize-arrow') {
    const arrow = arrowById(state.dragMode.id);
    if (!arrow) {
      return;
    }

    const dx = pointer.x - arrow.x1;
    const dy = pointer.y - arrow.y1;
    const rawAngle = (Math.atan2(dy, dx) * 180) / Math.PI;
    const snapped = snapAngle(rawAngle, null);
    const length = Math.max(10, Math.hypot(dx, dy));
    const rad = degToRad(snapped);
    arrow.x2 = arrow.x1 + Math.cos(rad) * length;
    arrow.y2 = arrow.y1 + Math.sin(rad) * length;
    state.dragMode.didMutate = true;
    state.snapGuide = null;
    render();
    return;
  }

  const wall = wallById(state.dragMode.id);
  if (!wall) {
    return;
  }

  if (state.dragMode.type === 'rotate-wall') {
    const center = state.dragMode.center;
    const rawAngle = (Math.atan2(pointer.y - center.y, pointer.x - center.x) * 180) / Math.PI;
    const snappedAngle = snapAngle(rawAngle, wall.id);
    wall.angle = snappedAngle;
    const rad = degToRad(snappedAngle);
    const halfLength = wall.length / 2;
    wall.x = center.x - Math.cos(rad) * halfLength;
    wall.y = center.y - Math.sin(rad) * halfLength;

    state.dragMode.didMutate = true;
    state.snapGuide = null;
    render();
    return;
  }

  if (state.dragMode.type === 'move') {
    const proposedStart = {
      x: pointer.x - state.dragMode.dx,
      y: pointer.y - state.dragMode.dy,
    };
    const moved = snapMovedWallStart(wall, proposedStart, pointer);
    wall.x = moved.start.x;
    wall.y = moved.start.y;
    state.dragMode.didMutate = true;
    state.snapGuide = moved.guide;
    render();
    return;
  }

  if (state.dragMode.type === 'resize-end' || state.dragMode.type === 'resize-start') {
    const fixedEnd = endPoint(wall);
    const resizingStart = state.dragMode.type === 'resize-start';

    const anchor = resizingStart ? fixedEnd : { x: wall.x, y: wall.y };
    const axis = state.dragMode.axis || {
      x: Math.cos(degToRad(wall.angle)),
      y: Math.sin(degToRad(wall.angle)),
    };
    const pointerOnAxis = projectPointOnAxis(pointer, anchor, axis);
    const vxRaw = pointerOnAxis.x - anchor.x;
    const vyRaw = pointerOnAxis.y - anchor.y;
    const rawLength = Math.max(1, Math.hypot(vxRaw, vyRaw));
    const initialAngle = (Math.atan2(vyRaw, vxRaw) * 180) / Math.PI;

    const tempWall = resizingStart
      ? {
          ...wall,
          x: pointerOnAxis.x,
          y: pointerOnAxis.y,
          length: Math.max(1, Math.hypot(fixedEnd.x - pointerOnAxis.x, fixedEnd.y - pointerOnAxis.y)),
          angle: (Math.atan2(fixedEnd.y - pointerOnAxis.y, fixedEnd.x - pointerOnAxis.x) * 180) / Math.PI,
        }
      : {
          ...wall,
          length: rawLength,
          angle: initialAngle,
        };
    const tempGeometry = wallSnapGeometry(tempWall);

    const resizeCandidates = resizingStart
      ? [
          { source: tempGeometry.startLeft, offset: { x: tempGeometry.startLeft.x - tempGeometry.centerStart.x, y: tempGeometry.startLeft.y - tempGeometry.centerStart.y } },
          { source: tempGeometry.startRight, offset: { x: tempGeometry.startRight.x - tempGeometry.centerStart.x, y: tempGeometry.startRight.y - tempGeometry.centerStart.y } },
          { source: tempGeometry.centerStart, offset: { x: 0, y: 0 } },
        ]
      : [
          { source: tempGeometry.endLeft, offset: { x: tempGeometry.endLeft.x - tempGeometry.centerEnd.x, y: tempGeometry.endLeft.y - tempGeometry.centerEnd.y } },
          { source: tempGeometry.endRight, offset: { x: tempGeometry.endRight.x - tempGeometry.centerEnd.x, y: tempGeometry.endRight.y - tempGeometry.centerEnd.y } },
          { source: tempGeometry.centerEnd, offset: { x: 0, y: 0 } },
        ];

    let bestResizeMatch = null;
    resizeCandidates.forEach((candidate) => {
      const resizeProlongationPx = Math.hypot(state.canvas.width, state.canvas.height);
      const match = closestPointMatch(
        candidate.source,
        wall.id,
        resizeSnapDistancePx(),
        resizeProlongationPx,
      );
      if (!match) {
        return;
      }

      const prolongationBonus = match.kind === 'edge-prolongation' ? 4 : 0;
      const matchScore = (match.score ?? match.distance) - prolongationBonus;
      const bestScore = bestResizeMatch ? bestResizeMatch.score ?? bestResizeMatch.distance : null;
      if (!bestResizeMatch || matchScore < bestScore || (matchScore === bestScore && match.distance < bestResizeMatch.distance)) {
        bestResizeMatch = {
          source: candidate.source,
          target: match.target,
          offset: candidate.offset,
          distance: match.distance,
          score: matchScore,
          label: match.label,
          targetEdge: match.targetEdge,
        };
      }
    });

    const snappedPointer = bestResizeMatch
      ? {
          x: bestResizeMatch.target.x - bestResizeMatch.offset.x,
          y: bestResizeMatch.target.y - bestResizeMatch.offset.y,
        }
      : pointerOnAxis;
    const snappedOnAxis = projectPointOnAxis(snappedPointer, anchor, axis);

    if (resizingStart) {
      const dx = fixedEnd.x - snappedOnAxis.x;
      const dy = fixedEnd.y - snappedOnAxis.y;
      wall.x = snappedOnAxis.x;
      wall.y = snappedOnAxis.y;
      wall.length = Math.max(1, Math.hypot(dx, dy));
      wall.angle = snapAngle((Math.atan2(dy, dx) * 180) / Math.PI, wall.id);
    } else {
      const vx = snappedOnAxis.x - wall.x;
      const vy = snappedOnAxis.y - wall.y;
      wall.length = Math.max(1, Math.hypot(vx, vy));
      wall.angle = snapAngle((Math.atan2(vy, vx) * 180) / Math.PI, wall.id);
    }

    state.dragMode.didMutate = true;
    state.snapGuide = bestResizeMatch
      ? {
          source: bestResizeMatch.source,
          target: bestResizeMatch.target,
          label: bestResizeMatch.label,
          targetEdge: bestResizeMatch.targetEdge,
        }
      : null;
    render();
  }
}

function stopDrag() {
  const hadGuide = Boolean(state.snapGuide);
  const mutated = Boolean(state.dragMode?.didMutate);
  state.dragMode = null;
  state.snapGuide = null;
  if (hadGuide) {
    render();
  }
  if (mutated) {
    pushHistorySnapshot();
  }
}

function cloneForPaste(type, data, offset) {
  if (type === 'wall') {
    return {
      id: createId('wall'),
      x: data.x + offset,
      y: data.y + offset,
      length: data.length,
      thickness: data.thickness,
      angle: data.angle,
    };
  }

  if (type === 'door') {
    return {
      id: createId('door'),
      x: data.x + offset,
      y: data.y + offset,
      angle: data.angle,
    };
  }

  if (type === 'stair') {
    return {
      id: createId('stair'),
      x: data.x + offset,
      y: data.y + offset,
      length: data.length,
      width: data.width,
    };
  }

  if (type === 'exit') {
    return {
      id: createId('exit'),
      x: data.x + offset,
      y: data.y + offset,
      width: data.width,
      height: data.height,
    };
  }

  if (type === 'measure') {
    return {
      id: createId('measure'),
      x1: data.x1 + offset,
      y1: data.y1 + offset,
      x2: data.x2 + offset,
      y2: data.y2 + offset,
    };
  }

  return {
    id: createId('arrow'),
    x1: data.x1 + offset,
    y1: data.y1 + offset,
    x2: data.x2 + offset,
    y2: data.y2 + offset,
  };
}

function copySelected() {
  const entity = selectedEntity();
  if (!entity) {
    return;
  }

  state.clipboard = {
    type: entity.type,
    data: structuredClone(entity.data),
  };
}

function pasteCopied() {
  if (!state.clipboard) {
    return;
  }

  const pasted = cloneForPaste(state.clipboard.type, state.clipboard.data, PASTE_OFFSET_PX);

  if (state.clipboard.type === 'wall') {
    state.walls.push(pasted);
    state.selected = { type: 'wall', id: pasted.id };
  } else if (state.clipboard.type === 'stair') {
    state.stairs.push(pasted);
    state.selected = { type: 'stair', id: pasted.id };
  } else if (state.clipboard.type === 'door') {
    state.doors.push(pasted);
    state.selected = { type: 'door', id: pasted.id };
  } else if (state.clipboard.type === 'exit') {
    state.exits.push(pasted);
    state.selected = { type: 'exit', id: pasted.id };
  } else if (state.clipboard.type === 'measure') {
    state.measures.push(pasted);
    state.selected = { type: 'measure', id: pasted.id };
  } else {
    state.arrows.push(pasted);
    state.selected = { type: 'arrow', id: pasted.id };
  }

  state.clipboard = {
    ...state.clipboard,
    data: structuredClone(pasted),
  };
  commitStateChange();
}

function duplicateSelected() {
  copySelected();
  pasteCopied();
}

function toggleMeasureMode() {
  state.measure.active = !state.measure.active;
  state.measure.start = null;
  state.measure.end = null;
  state.measure.hover = null;
  state.dragMode = null;
  state.snapGuide = null;
  render();
}

function clearMeasure() {
  state.measures = [];
  state.measure.start = null;
  state.measure.end = null;
  state.measure.hover = null;
  if (state.selected?.type === 'measure') {
    state.selected = null;
  }
  if (measureDialog?.open) {
    measureDialog.close();
  }
  commitStateChange();
}

function setZoom(nextZoom) {
  const viewport = editor.parentElement;
  const previousZoom = state.canvas.zoom;
  const clampedZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, nextZoom));

  if (!viewport || previousZoom <= 0) {
    state.canvas.zoom = clampedZoom;
    render();
    return;
  }

  const selectedCenter = selectedEntityCenter();
  const fallbackCenter = {
    x: (viewport.scrollLeft + viewport.clientWidth / 2) / previousZoom,
    y: (viewport.scrollTop + viewport.clientHeight / 2) / previousZoom,
  };
  const focus = selectedCenter || fallbackCenter;

  state.canvas.zoom = clampedZoom;
  render();

  viewport.scrollLeft = Math.max(0, focus.x * state.canvas.zoom - viewport.clientWidth / 2);
  viewport.scrollTop = Math.max(0, focus.y * state.canvas.zoom - viewport.clientHeight / 2);
}

function selectedEntityCenter() {
  const entity = selectedEntity();
  if (!entity?.data) {
    return null;
  }

  if (entity.type === 'wall') {
    const end = endPoint(entity.data);
    return {
      x: (entity.data.x + end.x) / 2,
      y: (entity.data.y + end.y) / 2,
    };
  }

  if (entity.type === 'stair') {
    return {
      x: entity.data.x + entity.data.length / 2,
      y: entity.data.y + entity.data.width / 2,
    };
  }

  if (entity.type === 'door') {
    return {
      x: entity.data.x,
      y: entity.data.y,
    };
  }

  if (entity.type === 'exit') {
    return {
      x: entity.data.x + entity.data.width / 2,
      y: entity.data.y + entity.data.height / 2,
    };
  }

  if (entity.type === 'measure') {
    return {
      x: (entity.data.x1 + entity.data.x2) / 2,
      y: (entity.data.y1 + entity.data.y2) / 2,
    };
  }

  return {
    x: (entity.data.x1 + entity.data.x2) / 2,
    y: (entity.data.y1 + entity.data.y2) / 2,
  };
}

function fitCanvasToPlan() {
  state.canvas.zoom = 1;
  render();
}

function currentPlanBounds() {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  const includePoint = (x, y) => {
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
  };

  state.walls.forEach((wall) => {
    const geometry = wallSnapGeometry(wall);
    geometry.corners.forEach((corner) => includePoint(corner.x, corner.y));
  });

  state.stairs.forEach((stair) => {
    includePoint(stair.x, stair.y);
    includePoint(stair.x + stair.length, stair.y + stair.width);
  });

  state.doors.forEach((door) => {
    const half = doorWidthPx() / 2;
    includePoint(door.x - half, door.y - half);
    includePoint(door.x + half, door.y + half);
  });

  state.exits.forEach((exitItem) => {
    includePoint(exitItem.x, exitItem.y);
    includePoint(exitItem.x + exitItem.width, exitItem.y + exitItem.height);
  });

  state.arrows.forEach((arrow) => {
    includePoint(arrow.x1, arrow.y1);
    includePoint(arrow.x2, arrow.y2);
  });

  if (!Number.isFinite(minX) || !Number.isFinite(minY) || !Number.isFinite(maxX) || !Number.isFinite(maxY)) {
    return null;
  }

  return { minX, minY, maxX, maxY };
}

function centerViewportOn(bounds) {
  const viewport = editor.parentElement;
  if (!viewport) {
    return;
  }

  const centerX = ((bounds.minX + bounds.maxX) / 2) * state.canvas.zoom;
  const centerY = ((bounds.minY + bounds.maxY) / 2) * state.canvas.zoom;
  viewport.scrollLeft = Math.max(0, centerX - viewport.clientWidth / 2);
  viewport.scrollTop = Math.max(0, centerY - viewport.clientHeight / 2);
}

function autoZoomToPlan() {
  const bounds = currentPlanBounds();
  if (!bounds) {
    fitCanvasToPlan();
    return;
  }

  const viewport = editor.parentElement;
  if (!viewport) {
    fitCanvasToPlan();
    return;
  }

  const padding = 80;
  const planWidth = Math.max(1, bounds.maxX - bounds.minX);
  const planHeight = Math.max(1, bounds.maxY - bounds.minY);
  const availableWidth = Math.max(100, viewport.clientWidth - padding);
  const availableHeight = Math.max(100, viewport.clientHeight - padding);
  const targetZoom = Math.min(availableWidth / planWidth, availableHeight / planHeight);

  state.canvas.zoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, targetZoom));
  render();
  centerViewportOn(bounds);
}

function applyPxPerCmScale() {
  const nextPxPerCm = Number(pxPerCmInput.value);
  if (!Number.isFinite(nextPxPerCm) || nextPxPerCm <= 0) {
    alert('Scale must be a positive number.');
    return;
  }

  const current = state.pxPerCm;
  if (Math.abs(nextPxPerCm - current) < 1e-9) {
    return;
  }

  const ratio = nextPxPerCm / current;
  applyScaleRatio(ratio);
  state.pxPerCm = nextPxPerCm;
  commitStateChange();
}

function applyScaleRatio(ratio) {
  state.walls.forEach((wall) => {
    wall.x *= ratio;
    wall.y *= ratio;
    wall.length *= ratio;
    wall.thickness *= ratio;
  });

  state.stairs.forEach((stair) => {
    stair.x *= ratio;
    stair.y *= ratio;
    stair.length *= ratio;
    stair.width *= ratio;
  });

  state.doors.forEach((door) => {
    door.x *= ratio;
    door.y *= ratio;
  });

  state.exits.forEach((exitItem) => {
    exitItem.x *= ratio;
    exitItem.y *= ratio;
    exitItem.width *= ratio;
    exitItem.height *= ratio;
  });

  state.arrows.forEach((arrow) => {
    arrow.x1 *= ratio;
    arrow.y1 *= ratio;
    arrow.x2 *= ratio;
    arrow.y2 *= ratio;
  });

  state.measures.forEach((measure) => {
    measure.x1 *= ratio;
    measure.y1 *= ratio;
    measure.x2 *= ratio;
    measure.y2 *= ratio;
  });
  state.snapGuide = null;
  state.measure.start = null;
  state.measure.end = null;
  state.measure.hover = null;
}

function setCanvasTo4KmPreset() {
  const nextPxPerCm = LARGE_CANVAS_TARGET_PX / LARGE_CANVAS_SIDE_CM;
  const ratio = nextPxPerCm / state.pxPerCm;

  applyScaleRatio(ratio);
  state.pxPerCm = nextPxPerCm;
  state.canvas.width = LARGE_CANVAS_TARGET_PX;
  state.canvas.height = LARGE_CANVAS_TARGET_PX;
  state.canvas.zoom = 1;

  commitStateChange();
}

function onKeyDown(evt) {
  const tagName = evt.target?.tagName?.toLowerCase();
  if (tagName === 'input' || tagName === 'textarea') {
    return;
  }

  const key = evt.key.toLowerCase();

  if (key === 'delete') {
    deleteSelectedItem();
    evt.preventDefault();
    return;
  }

  const isModifier = evt.ctrlKey || evt.metaKey;

  if (!isModifier) {
    return;
  }

  if (key === 'c') {
    copySelected();
    evt.preventDefault();
  }

  if (key === 'v') {
    pasteCopied();
    evt.preventDefault();
  }

  if (key === 'd') {
    duplicateSelected();
    evt.preventDefault();
  }

  if (key === 'z' && !evt.shiftKey) {
    undoLastChange();
    evt.preventDefault();
  }
}

function applySelectedProperties() {
  const wall = selectedWall();
  if (!wall) {
    return;
  }

  const lengthCm = Number(lengthInput.value);
  const thicknessCm = Number(thicknessInput.value);
  const angle = Number(angleInput.value);

  if (!Number.isFinite(lengthCm) || lengthCm <= 0) {
    alert('Length must be a positive number.');
    return;
  }

  if (!Number.isFinite(thicknessCm) || thicknessCm <= 0) {
    alert('Thickness must be a positive number.');
    return;
  }

  if (!Number.isFinite(angle)) {
    alert('Orientation must be a number in degrees.');
    return;
  }

  wall.length = cmToPx(lengthCm);
  wall.thickness = cmToPx(thicknessCm);
  wall.angle = angle;
  commitStateChange();
}

function applySelectedStairProperties() {
  if (state.selected?.type !== 'stair') {
    return;
  }

  const stair = stairById(state.selected.id);
  if (!stair) {
    return;
  }

  const lengthCm = Number(stairLengthInput.value);
  const widthCm = Number(stairWidthInput.value);

  if (!Number.isFinite(lengthCm) || lengthCm <= 0) {
    alert('Stair length must be a positive number.');
    return;
  }

  if (!Number.isFinite(widthCm) || widthCm <= 0) {
    alert('Stair width must be a positive number.');
    return;
  }

  stair.length = cmToPx(lengthCm);
  stair.width = cmToPx(widthCm);
  commitStateChange();
}

function importBackground(file) {
  if (!file) {
    return;
  }

  const reader = new FileReader();
  reader.onload = () => {
    state.backgroundDataUrl = String(reader.result || '');
    bgImage.setAttribute('href', state.backgroundDataUrl);

    const img = new Image();
    img.onload = () => {
      state.canvas.width = img.naturalWidth || state.canvas.width;
      state.canvas.height = img.naturalHeight || state.canvas.height;
      state.canvas.zoom = 1;
      commitStateChange();
    };
    img.onerror = () => {
      commitStateChange();
    };
    img.src = state.backgroundDataUrl;
  };
  reader.readAsDataURL(file);
}

function exportProject() {
  const payload = {
    version: 3,
    unit: 'cm',
    pxPerCm: state.pxPerCm,
    canvas: state.canvas,
    backgroundDataUrl: state.backgroundDataUrl,
    walls: state.walls.map((w) => ({
      id: w.id,
      xCm: roundCm(pxToCm(w.x)),
      yCm: roundCm(pxToCm(w.y)),
      lengthCm: roundCm(pxToCm(w.length)),
      thicknessCm: roundCm(pxToCm(w.thickness)),
      angle: roundCm(w.angle),
    })),
    stairs: state.stairs.map((s) => ({
      id: s.id,
      xCm: roundCm(pxToCm(s.x)),
      yCm: roundCm(pxToCm(s.y)),
      lengthCm: roundCm(pxToCm(s.length)),
      widthCm: roundCm(pxToCm(s.width)),
    })),
    doors: state.doors.map((d) => ({
      id: d.id,
      xCm: roundCm(pxToCm(d.x)),
      yCm: roundCm(pxToCm(d.y)),
      angle: roundCm(d.angle),
    })),
    exits: state.exits.map((e) => ({
      id: e.id,
      xCm: roundCm(pxToCm(e.x)),
      yCm: roundCm(pxToCm(e.y)),
      widthCm: roundCm(pxToCm(e.width)),
      heightCm: roundCm(pxToCm(e.height)),
    })),
    arrows: state.arrows.map((a) => ({
      id: a.id,
      x1Cm: roundCm(pxToCm(a.x1)),
      y1Cm: roundCm(pxToCm(a.y1)),
      x2Cm: roundCm(pxToCm(a.x2)),
      y2Cm: roundCm(pxToCm(a.y2)),
    })),
    measures: state.measures.map((m) => ({
      id: m.id,
      x1Cm: roundCm(pxToCm(m.x1)),
      y1Cm: roundCm(pxToCm(m.y1)),
      x2Cm: roundCm(pxToCm(m.x2)),
      y2Cm: roundCm(pxToCm(m.y2)),
    })),
  };

  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = 'evacuation-plan.json';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function loadImageFromUrl(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Could not render image export.'));
    img.src = url;
  });
}

function collectDocumentCssText() {
  let cssText = '';

  Array.from(document.styleSheets).forEach((sheet) => {
    try {
      const rules = sheet.cssRules || [];
      Array.from(rules).forEach((rule) => {
        cssText += `${rule.cssText}\n`;
      });
    } catch (_error) {
    }
  });

  return cssText;
}

async function exportA3ImagePng() {
  try {
    const printSvg = editor.cloneNode(true);
    const printHandles = printSvg.querySelector('#handlesLayer');
    const printMeasure = printSvg.querySelector('#measureLayer');
    if (printHandles) {
      printHandles.innerHTML = '';
    }
    if (printMeasure) {
      printMeasure.innerHTML = '';
    }

    const sourceWidth = state.canvas.width;
    const sourceHeight = state.canvas.height;
    printSvg.setAttribute('viewBox', `0 0 ${sourceWidth} ${sourceHeight}`);
    printSvg.setAttribute('width', String(sourceWidth));
    printSvg.setAttribute('height', String(sourceHeight));
    printSvg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');

    const styleNode = document.createElementNS('http://www.w3.org/2000/svg', 'style');
    styleNode.textContent = collectDocumentCssText();
    printSvg.insertBefore(styleNode, printSvg.firstChild);

    const serializer = new XMLSerializer();
    const svgText = serializer.serializeToString(printSvg);
    const svgBlob = new Blob([svgText], { type: 'image/svg+xml;charset=utf-8' });
    const svgUrl = URL.createObjectURL(svgBlob);

    const svgImage = await loadImageFromUrl(svgUrl);
    URL.revokeObjectURL(svgUrl);

    const isLandscape = sourceWidth >= sourceHeight;
    const outWidth = isLandscape ? 4961 : 3508;
    const outHeight = isLandscape ? 3508 : 4961;
    const margin = 180;

    const canvas = document.createElement('canvas');
    canvas.width = outWidth;
    canvas.height = outHeight;
    const context = canvas.getContext('2d');

    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, outWidth, outHeight);

    const scale = Math.min((outWidth - margin * 2) / sourceWidth, (outHeight - margin * 2) / sourceHeight);
    const drawWidth = sourceWidth * scale;
    const drawHeight = sourceHeight * scale;
    const drawX = (outWidth - drawWidth) / 2;
    const drawY = (outHeight - drawHeight) / 2;

    context.drawImage(svgImage, drawX, drawY, drawWidth, drawHeight);

    const pngUrl = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.href = pngUrl;
    link.download = isLandscape ? 'evacuation-plan-a3-landscape.png' : 'evacuation-plan-a3-portrait.png';
    document.body.appendChild(link);
    link.click();
    link.remove();
  } catch (error) {
    alert('Could not export A3 image.');
  }
}

function importProject(file) {
  if (!file) {
    return;
  }

  const reader = new FileReader();
  reader.onload = () => {
    try {
      const parsed = JSON.parse(String(reader.result || '{}'));
      if (!Array.isArray(parsed.walls)) {
        throw new Error('Invalid format');
      }

      state.pxPerCm = Number(parsed.pxPerCm) > 0 ? Number(parsed.pxPerCm) : DEFAULT_PX_PER_CM;

      state.walls = parsed.walls
        .filter((w) => Number.isFinite(w.x) || Number.isFinite(w.xCm))
        .map((w) => ({
          id: String(w.id || createId('wall')),
          x: Number.isFinite(w.xCm) ? cmToPx(Number(w.xCm)) : Number(w.x),
          y: Number.isFinite(w.yCm) ? cmToPx(Number(w.yCm)) : Number(w.y),
          length: Math.max(
            1,
            Number.isFinite(w.lengthCm)
              ? cmToPx(Number(w.lengthCm))
              : Number(w.length) || cmToPx(WALL_DEFAULTS_CM.length),
          ),
          thickness: Math.max(
            1,
            Number.isFinite(w.thicknessCm)
              ? cmToPx(Number(w.thicknessCm))
              : Number(w.thickness) || cmToPx(WALL_DEFAULTS_CM.thickness),
          ),
          angle: Number(w.angle) || 0,
        }));

      state.stairs = Array.isArray(parsed.stairs)
        ? parsed.stairs.map((s) => ({
            id: String(s.id || createId('stair')),
            x: Number.isFinite(s.xCm) ? cmToPx(Number(s.xCm)) : Number(s.x) || 260,
            y: Number.isFinite(s.yCm) ? cmToPx(Number(s.yCm)) : Number(s.y) || 260,
            length: Math.max(1, Number.isFinite(s.lengthCm) ? cmToPx(Number(s.lengthCm)) : Number(s.length) || cmToPx(STAIR_DEFAULTS_CM.length)),
            width: Math.max(1, Number.isFinite(s.widthCm) ? cmToPx(Number(s.widthCm)) : Number(s.width) || cmToPx(STAIR_DEFAULTS_CM.width)),
          }))
        : [];

      state.exits = Array.isArray(parsed.exits)
        ? parsed.exits.map((e) => ({
            id: String(e.id || createId('exit')),
            x: Number.isFinite(e.xCm) ? cmToPx(Number(e.xCm)) : Number(e.x) || 260,
            y: Number.isFinite(e.yCm) ? cmToPx(Number(e.yCm)) : Number(e.y) || 260,
            width: Number.isFinite(e.widthCm) ? cmToPx(Number(e.widthCm)) : Number(e.width) || 100,
            height: Number.isFinite(e.heightCm) ? cmToPx(Number(e.heightCm)) : Number(e.height) || 42,
          }))
        : [];

      state.doors = Array.isArray(parsed.doors)
        ? parsed.doors.map((d) => ({
            id: String(d.id || createId('door')),
            x: Number.isFinite(d.xCm) ? cmToPx(Number(d.xCm)) : Number(d.x) || 320,
            y: Number.isFinite(d.yCm) ? cmToPx(Number(d.yCm)) : Number(d.y) || 220,
            angle: Number(d.angle) || 0,
          }))
        : [];

      state.arrows = Array.isArray(parsed.arrows)
        ? parsed.arrows.map((a) => ({
            id: String(a.id || createId('arrow')),
            x1: Number.isFinite(a.x1Cm) ? cmToPx(Number(a.x1Cm)) : Number(a.x1) || 380,
            y1: Number.isFinite(a.y1Cm) ? cmToPx(Number(a.y1Cm)) : Number(a.y1) || 380,
            x2: Number.isFinite(a.x2Cm) ? cmToPx(Number(a.x2Cm)) : Number(a.x2) || 500,
            y2: Number.isFinite(a.y2Cm) ? cmToPx(Number(a.y2Cm)) : Number(a.y2) || 380,
          }))
        : [];
      state.measures = Array.isArray(parsed.measures)
        ? parsed.measures.map((m) => ({
            id: String(m.id || createId('measure')),
            x1: Number.isFinite(m.x1Cm) ? cmToPx(Number(m.x1Cm)) : Number(m.x1) || 200,
            y1: Number.isFinite(m.y1Cm) ? cmToPx(Number(m.y1Cm)) : Number(m.y1) || 200,
            x2: Number.isFinite(m.x2Cm) ? cmToPx(Number(m.x2Cm)) : Number(m.x2) || 300,
            y2: Number.isFinite(m.y2Cm) ? cmToPx(Number(m.y2Cm)) : Number(m.y2) || 200,
          }))
        : [];

      state.backgroundDataUrl = String(parsed.backgroundDataUrl || '');
      bgImage.setAttribute('href', state.backgroundDataUrl);
      state.canvas = {
        width: Number(parsed.canvas?.width) || 1200,
        height: Number(parsed.canvas?.height) || 800,
        zoom: Number(parsed.canvas?.zoom) || 1,
      };
      state.selected = firstSelectableEntity();
      commitStateChange();
    } catch (err) {
      alert('Could not import this file.');
    }
  };

  reader.readAsText(file);
}

function resetAll() {
  state.walls = [];
  state.stairs = [];
  state.doors = [];
  state.exits = [];
  state.arrows = [];
  state.measures = [];
  state.selected = null;
  state.canvas = { width: 1200, height: 800, zoom: 1 };
  state.pxPerCm = DEFAULT_PX_PER_CM;
  state.backgroundDataUrl = '';
  bgUpload.value = '';
  bgImage.setAttribute('href', '');
  commitStateChange();
}

addWallBtn.addEventListener('click', addWall);
addStairBtn.addEventListener('click', addStair);
addExitBtn.addEventListener('click', addExit);
addArrowBtn.addEventListener('click', addArrow);
addDoorBtn.addEventListener('click', addDoor);
deleteWallBtn.addEventListener('click', deleteSelectedItem);
duplicateBtn.addEventListener('click', duplicateSelected);
undoBtn.addEventListener('click', undoLastChange);
zoomOutBtn.addEventListener('click', () => setZoom(state.canvas.zoom / ZOOM_FACTOR));
zoomInBtn.addEventListener('click', () => setZoom(state.canvas.zoom * ZOOM_FACTOR));
fitPlanBtn.addEventListener('click', fitCanvasToPlan);
autoZoomBtn.addEventListener('click', autoZoomToPlan);
applyScaleBtn.addEventListener('click', applyPxPerCmScale);
preset4kmBtn.addEventListener('click', setCanvasTo4KmPreset);
measureToggleBtn.addEventListener('click', toggleMeasureMode);
clearMeasureBtn.addEventListener('click', clearMeasure);
applyPropsBtn.addEventListener('click', applySelectedProperties);
applyStairPropsBtn.addEventListener('click', applySelectedStairProperties);
measureForm.addEventListener('submit', (evt) => {
  evt.preventDefault();
  applyMeasureDialog();
  measureDialog.close();
});
measureCancelBtn.addEventListener('click', () => {
  measureDialog.close();
});

editor.addEventListener('pointerdown', startDrag);
editor.addEventListener('dragstart', (evt) => evt.preventDefault());
window.addEventListener('pointermove', onPointerMove);
window.addEventListener('pointerup', stopDrag);
window.addEventListener('pointercancel', stopDrag);
window.addEventListener('keydown', onKeyDown);

bgUpload.addEventListener('change', (evt) => {
  importBackground(evt.target.files?.[0]);
});

clearBgBtn.addEventListener('click', () => {
  state.backgroundDataUrl = '';
  bgUpload.value = '';
  bgImage.setAttribute('href', '');
  commitStateChange();
});

exportBtn.addEventListener('click', exportProject);
exportA3Btn.addEventListener('click', exportA3ImagePng);
importBtn.addEventListener('click', () => importFile.click());
importFile.addEventListener('change', (evt) => {
  importProject(evt.target.files?.[0]);
  importFile.value = '';
});

resetBtn.addEventListener('click', () => {
  if (confirm('Reset project and remove all walls?')) {
    resetAll();
  }
});

render();
pushHistorySnapshot();
