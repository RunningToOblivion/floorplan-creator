const editor = document.getElementById('editor');
const bgUpload = document.getElementById('bgUpload');
const bgImage = document.getElementById('bgImage');
const clearBgBtn = document.getElementById('clearBgBtn');
const wallsLayer = document.getElementById('wallsLayer');
const doorsLayer = document.getElementById('doorsLayer');
const exitsLayer = document.getElementById('exitsLayer');
const arrowsLayer = document.getElementById('arrowsLayer');
const measureLayer = document.getElementById('measureLayer');
const handlesLayer = document.getElementById('handlesLayer');

const addWallBtn = document.getElementById('addWallBtn');
const addExitBtn = document.getElementById('addExitBtn');
const addArrowBtn = document.getElementById('addArrowBtn');
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
const zoomValue = document.getElementById('zoomValue');
const pxPerCmInput = document.getElementById('pxPerCmInput');
const applyScaleBtn = document.getElementById('applyScaleBtn');
const lengthInput = document.getElementById('lengthInput');
const thicknessInput = document.getElementById('thicknessInput');
const angleInput = document.getElementById('angleInput');
const applyPropsBtn = document.getElementById('applyPropsBtn');

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
const MIN_ZOOM = 0.25;
const MAX_ZOOM = 4;
const ZOOM_STEP = 0.25;

const WALL_DEFAULTS_CM = {
  length: 300,
  thickness: 20,
  angle: 0,
};

const state = {
  walls: [],
  doors: [],
  exits: [],
  arrows: [],
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

function doorById(id) {
  return state.doors.find((door) => door.id === id) || null;
}

function exitById(id) {
  return state.exits.find((exitItem) => exitItem.id === id) || null;
}

function arrowById(id) {
  return state.arrows.find((arrow) => arrow.id === id) || null;
}

function selectedEntity() {
  if (!state.selected) {
    return null;
  }

  if (state.selected.type === 'wall') {
    return { type: 'wall', data: wallById(state.selected.id) };
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

  return null;
}

function selectedWall() {
  if (state.selected?.type !== 'wall') {
    return null;
  }
  return wallById(state.selected.id);
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
    doors: structuredClone(state.doors),
    exits: structuredClone(state.exits),
    arrows: structuredClone(state.arrows),
    selected: structuredClone(state.selected),
    canvas: structuredClone(state.canvas),
    pxPerCm: state.pxPerCm,
    backgroundDataUrl: state.backgroundDataUrl,
  };
}

function restoreScene(snapshot) {
  state.walls = structuredClone(snapshot.walls || []);
  state.doors = structuredClone(snapshot.doors || []);
  state.exits = structuredClone(snapshot.exits || []);
  state.arrows = structuredClone(snapshot.arrows || []);
  state.selected = snapshot.selected ? structuredClone(snapshot.selected) : null;
  state.canvas = structuredClone(snapshot.canvas || { width: 1200, height: 800, zoom: 1 });
  state.pxPerCm = Number(snapshot.pxPerCm) > 0 ? Number(snapshot.pxPerCm) : DEFAULT_PX_PER_CM;
  state.backgroundDataUrl = String(snapshot.backgroundDataUrl || '');
  bgImage.setAttribute('href', state.backgroundDataUrl);
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

  const wallPropsDisabled = !wall;
  [lengthInput, thicknessInput, angleInput, applyPropsBtn].forEach((el) => {
    el.disabled = wallPropsDisabled;
  });

  deleteWallBtn.disabled = !entity;

  if (!wall) {
    lengthInput.value = '';
    thicknessInput.value = '';
    angleInput.value = '';
    return;
  }

  lengthInput.value = roundCm(pxToCm(wall.length));
  thicknessInput.value = roundCm(pxToCm(wall.thickness));
  angleInput.value = Math.round(wall.angle);
}

function render() {
  applyCanvasSizeAndZoom();
  wallsLayer.innerHTML = '';
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
      endHandle.setAttribute('r', 7);
      endHandle.setAttribute('class', 'handle');
      endHandle.dataset.id = wall.id;
      endHandle.dataset.kind = 'wall-handle-end';
      handlesLayer.appendChild(endHandle);

      const startHandle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      startHandle.setAttribute('cx', wall.x);
      startHandle.setAttribute('cy', wall.y);
      startHandle.setAttribute('r', 7);
      startHandle.setAttribute('class', 'handle');
      startHandle.dataset.id = wall.id;
      startHandle.dataset.kind = 'wall-handle-start';
      handlesLayer.appendChild(startHandle);

      const midX = (wall.x + end.x) / 2;
      const midY = (wall.y + end.y) / 2;
      const normalX = -Math.sin(degToRad(wall.angle));
      const normalY = Math.cos(degToRad(wall.angle));
      const rotateDistance = Math.max(28, wall.thickness + 14);

      const rotateHandle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      rotateHandle.setAttribute('cx', midX + normalX * rotateDistance);
      rotateHandle.setAttribute('cy', midY + normalY * rotateDistance);
      rotateHandle.setAttribute('r', 7);
      rotateHandle.setAttribute('class', 'handle rotate-handle');
      rotateHandle.dataset.id = wall.id;
      rotateHandle.dataset.kind = 'wall-handle-rotate';
      handlesLayer.appendChild(rotateHandle);
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
      handle.setAttribute('r', 7);
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
      handle.setAttribute('r', 7);
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
      handlesLayer.appendChild(edgeLine);
    }

    const guideLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    guideLine.setAttribute('x1', state.snapGuide.source.x);
    guideLine.setAttribute('y1', state.snapGuide.source.y);
    guideLine.setAttribute('x2', state.snapGuide.target.x);
    guideLine.setAttribute('y2', state.snapGuide.target.y);
    guideLine.setAttribute('class', 'snap-guide-line');
    handlesLayer.appendChild(guideLine);

    const targetPoint = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    targetPoint.setAttribute('cx', state.snapGuide.target.x);
    targetPoint.setAttribute('cy', state.snapGuide.target.y);
    targetPoint.setAttribute('r', 5);
    targetPoint.setAttribute('class', 'snap-guide-point');
    handlesLayer.appendChild(targetPoint);

    const sourcePoint = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    sourcePoint.setAttribute('cx', state.snapGuide.source.x);
    sourcePoint.setAttribute('cy', state.snapGuide.source.y);
    sourcePoint.setAttribute('r', 4);
    sourcePoint.setAttribute('class', 'snap-guide-source');
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

  const measureEnd = state.measure.end || state.measure.hover;
  if (state.measure.start) {
    const startPoint = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    startPoint.setAttribute('cx', state.measure.start.x);
    startPoint.setAttribute('cy', state.measure.start.y);
    startPoint.setAttribute('r', 4.5);
    startPoint.setAttribute('class', 'measure-point');
    measureLayer.appendChild(startPoint);
  }

  if (state.measure.start && measureEnd) {
    const measureLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    measureLine.setAttribute('x1', state.measure.start.x);
    measureLine.setAttribute('y1', state.measure.start.y);
    measureLine.setAttribute('x2', measureEnd.x);
    measureLine.setAttribute('y2', measureEnd.y);
    measureLine.setAttribute('class', 'measure-line');
    measureLayer.appendChild(measureLine);

    const endPoint = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    endPoint.setAttribute('cx', measureEnd.x);
    endPoint.setAttribute('cy', measureEnd.y);
    endPoint.setAttribute('r', 4.5);
    endPoint.setAttribute('class', 'measure-point');
    measureLayer.appendChild(endPoint);

    const distPx = distance(state.measure.start, measureEnd);
    const distCm = roundCm(pxToCm(distPx));
    const midX = (state.measure.start.x + measureEnd.x) / 2;
    const midY = (state.measure.start.y + measureEnd.y) / 2;

    const measureLabel = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    measureLabel.setAttribute('x', midX + 8);
    measureLabel.setAttribute('y', midY - 8);
    measureLabel.setAttribute('class', 'measure-label');
    measureLabel.textContent = `${distCm} cm`;
    measureLayer.appendChild(measureLabel);

    measureValue.textContent = `Distance: ${distCm} cm`;
  } else {
    measureValue.textContent = 'Distance: -';
  }

  measureToggleBtn.classList.toggle('active-tool', state.measure.active);
  measureToggleBtn.textContent = `Measure: ${state.measure.active ? 'On' : 'Off'}`;

  updateInputs();
}

function addWall() {
  const id = createId('wall');
  const wall = {
    id,
    x: 180,
    y: 180,
    length: cmToPx(WALL_DEFAULTS_CM.length),
    thickness: cmToPx(WALL_DEFAULTS_CM.thickness),
    angle: WALL_DEFAULTS_CM.angle,
  };

  state.walls.push(wall);
  state.selected = { type: 'wall', id };
  commitStateChange();
}

function addExit() {
  const id = createId('exit');
  state.exits.push({
    id,
    x: 260,
    y: 260,
    width: 100,
    height: 42,
  });
  state.selected = { type: 'exit', id };
  commitStateChange();
}

function addArrow() {
  const id = createId('arrow');
  state.arrows.push({
    id,
    x1: 380,
    y1: 380,
    x2: 500,
    y2: 380,
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
  const id = createId('door');
  let x = 320;
  let y = 220;
  let angle = 0;

  const wall = selectedWall();
  if (wall) {
    const start = { x: wall.x, y: wall.y };
    const end = endPoint(wall);
    x = (start.x + end.x) / 2;
    y = (start.y + end.y) / 2;
    angle = wall.angle;
  }

  state.doors.push({ id, x, y, angle });
  state.selected = { type: 'door', id };
  commitStateChange();
}

function setSelection(type, id) {
  state.selected = { type, id };
  render();
}

function deleteSelectedItem() {
  if (!state.selected) {
    return;
  }

  if (state.selected.type === 'wall') {
    state.walls = state.walls.filter((w) => w.id !== state.selected.id);
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

  state.selected = state.walls[0] ? { type: 'wall', id: state.walls[0].id } : null;
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

function closestPointMatch(sourcePoint, targetWallId, maxDistance, prolongationPx = WALL_PROLONGATION_PX) {
  let best = null;
  const cornerMaxDistance = Math.max(maxDistance, CORNER_CAPTURE_DISTANCE_PX);

  state.walls.forEach((targetWall) => {
    if (targetWall.id === targetWallId) {
      return;
    }

    const geometry = wallSnapGeometry(targetWall);

    geometry.corners.forEach((targetCorner) => {
      const d = distance(sourcePoint, targetCorner);
      const score = d - CORNER_PRIORITY_BONUS_PX;
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
            WALL_PROLONGATION_PX,
          ),
        },
        {
          source: movingEdgeEnd,
          target: nearestPointOnExtendedSegment(
            movingEdgeEnd,
            targetEdgeStart,
            targetEdgeEnd,
            WALL_PROLONGATION_PX,
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
  return findClosestSnapPoint(pointer, currentWallId, POINT_SNAP_DISTANCE_PX) || pointer;
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
      const cornerMatch = closestPointMatch(feature.source, wall.id, MOVE_SNAP_DISTANCE_PX);
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
        MOVE_SNAP_DISTANCE_PX,
      );
      considerCandidate(edgeMatch);

      const edgeCornerMatch = edgeToCornerMatch(
        feature.edgeStart,
        feature.edgeEnd,
        wall.id,
        MOVE_SNAP_DISTANCE_PX,
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

function startDrag(evt) {
  evt.preventDefault();
  if (state.measure.active) {
    const pointer = svgPoint(evt);
    if (!state.measure.start || state.measure.end) {
      state.measure.start = pointer;
      state.measure.end = null;
      state.measure.hover = pointer;
    } else {
      state.measure.end = pointer;
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
  if (state.measure.active) {
    if (state.measure.start && !state.measure.end) {
      state.measure.hover = svgPoint(evt);
      render();
    }
    return;
  }

  if (!state.dragMode) {
    return;
  }

  const pointer = svgPoint(evt);

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
        RESIZE_SNAP_DISTANCE_PX,
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

  if (type === 'exit') {
    return {
      id: createId('exit'),
      x: data.x + offset,
      y: data.y + offset,
      width: data.width,
      height: data.height,
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
  } else if (state.clipboard.type === 'door') {
    state.doors.push(pasted);
    state.selected = { type: 'door', id: pasted.id };
  } else if (state.clipboard.type === 'exit') {
    state.exits.push(pasted);
    state.selected = { type: 'exit', id: pasted.id };
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
  state.measure.start = null;
  state.measure.end = null;
  state.measure.hover = null;
  render();
}

function setZoom(nextZoom) {
  state.canvas.zoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, nextZoom));
  render();
}

function fitCanvasToPlan() {
  state.canvas.zoom = 1;
  render();
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

  state.walls.forEach((wall) => {
    wall.x *= ratio;
    wall.y *= ratio;
    wall.length *= ratio;
    wall.thickness *= ratio;
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

  state.pxPerCm = nextPxPerCm;
  state.snapGuide = null;
  state.measure.start = null;
  state.measure.end = null;
  state.measure.hover = null;

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
    version: 2,
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

      state.backgroundDataUrl = String(parsed.backgroundDataUrl || '');
      bgImage.setAttribute('href', state.backgroundDataUrl);
      state.canvas = {
        width: Number(parsed.canvas?.width) || 1200,
        height: Number(parsed.canvas?.height) || 800,
        zoom: Number(parsed.canvas?.zoom) || 1,
      };
      state.selected = state.walls[0] ? { type: 'wall', id: state.walls[0].id } : null;
      commitStateChange();
    } catch (err) {
      alert('Could not import this file.');
    }
  };

  reader.readAsText(file);
}

function resetAll() {
  state.walls = [];
  state.doors = [];
  state.exits = [];
  state.arrows = [];
  state.selected = null;
  state.canvas = { width: 1200, height: 800, zoom: 1 };
  state.pxPerCm = DEFAULT_PX_PER_CM;
  state.backgroundDataUrl = '';
  bgUpload.value = '';
  bgImage.setAttribute('href', '');
  commitStateChange();
}

addWallBtn.addEventListener('click', addWall);
addExitBtn.addEventListener('click', addExit);
addArrowBtn.addEventListener('click', addArrow);
addDoorBtn.addEventListener('click', addDoor);
deleteWallBtn.addEventListener('click', deleteSelectedItem);
duplicateBtn.addEventListener('click', duplicateSelected);
undoBtn.addEventListener('click', undoLastChange);
zoomOutBtn.addEventListener('click', () => setZoom(state.canvas.zoom - ZOOM_STEP));
zoomInBtn.addEventListener('click', () => setZoom(state.canvas.zoom + ZOOM_STEP));
fitPlanBtn.addEventListener('click', fitCanvasToPlan);
applyScaleBtn.addEventListener('click', applyPxPerCmScale);
measureToggleBtn.addEventListener('click', toggleMeasureMode);
clearMeasureBtn.addEventListener('click', clearMeasure);
applyPropsBtn.addEventListener('click', applySelectedProperties);

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
