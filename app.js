// app.js - Fixed & Robust

// --- DOM Elements helper ---
const $ = (s) => document.querySelector(s);

// UI Elements
const landingPage = $('#landingPage');
const appContainer = $('#app');
const startBtn = $('#startBtn');
const homeBtn = $('#homeBtn');

const stageWrap = $('#stageWrap');
const world = $('#world');
const bgCanvas = $('#bgCanvas');
const overlay = $('#overlay');
const ctx = bgCanvas.getContext('2d');

const fileInput = $('#fileInput');
const calibrateBtn = $('#calibrateBtn');
const squareBtn = $('#squareBtn');
const rectBtn = $('#rectBtn');
const exportBtn = $('#exportBtn');
const scaleInfo = $('#scaleInfo');
const hint = $('#hint');
const contextMenu = $('#contextMenu');
const contextDelete = $('#contextDelete');
const zoomLevelEl = $('#zoomLevel');
const zoomInBtn = $('#zoomInBtn');
const zoomOutBtn = $('#zoomOutBtn');
const fitBtn = $('#fitBtn');

// --- State ---
let state = {
  mode: 'idle', // idle, calibrate, square, rect, select, panning
  bg: { img: null, width: 800, height: 600 },
  viewport: { x: 0, y: 0, scale: 1 },
  meterPerPixel: null,
  shapes: [], // {id, type, x, y, w, h, selected}
  active: null,
  isSpacePressed: false
};

// --- Initialization ---
function init() {
  console.log('App initializing...');

  // Navigation: Start Button
  if (startBtn) {
    startBtn.addEventListener('click', () => {
      console.log('Start button clicked');
      if (landingPage) landingPage.hidden = true;
      if (appContainer) {
        appContainer.hidden = false;
        // Trigger a resize/fit to ensure layout is correct after becoming visible
        if (state.bg.img) fitToScreen();
        else updateViewportTransform();
      }
    });
  } else {
    console.error('Start button not found!');
  }

  // Navigation: Home Button
  if (homeBtn) {
    homeBtn.addEventListener('click', () => {
      if (confirm('確定要返回首頁嗎？目前的編輯內容將會遺失（除非重新匯入）。')) {
        location.reload();
      }
    });
  }

  // Initial Setup
  resizeWorld(state.bg.width, state.bg.height);
  updateViewportTransform();
  setMode('idle');
  
  // Bind other events
  bindEvents();
  
  // Bind Export Module safely
  setupExporter();
}

// --- Viewport Logic ---
function resizeWorld(w, h) {
  state.bg.width = w;
  state.bg.height = h;
  bgCanvas.width = w;
  bgCanvas.height = h;
  overlay.setAttribute('viewBox', `0 0 ${w} ${h}`);
  overlay.setAttribute('width', w);
  overlay.setAttribute('height', h);
  world.style.width = w + 'px';
  world.style.height = h + 'px';
}

function updateViewportTransform() {
  const { x, y, scale } = state.viewport;
  world.style.transform = `translate(${x}px, ${y}px) scale(${scale})`;
  if (zoomLevelEl) zoomLevelEl.textContent = `${Math.round(scale * 100)}%`;
}

function toWorldPos(clientX, clientY) {
  const rect = stageWrap.getBoundingClientRect();
  const screenX = clientX - rect.left;
  const screenY = clientY - rect.top;
  return {
    x: (screenX - state.viewport.x) / state.viewport.scale,
    y: (screenY - state.viewport.y) / state.viewport.scale
  };
}

function fitToScreen() {
  if (!state.bg.width || !stageWrap) return;
  const rect = stageWrap.getBoundingClientRect();
  if (rect.width === 0) return; // Not visible yet

  const pad = 40;
  const availW = rect.width - pad;
  const availH = rect.height - pad;
  const scale = Math.min(availW / state.bg.width, availH / state.bg.height);
  const finalScale = Math.min(1, scale); // Max 100% initial zoom

  const cx = (rect.width - state.bg.width * finalScale) / 2;
  const cy = (rect.height - state.bg.height * finalScale) / 2;

  state.viewport = { x: cx, y: cy, scale: finalScale };
  updateViewportTransform();
}

function zoomAt(factor, clientX, clientY) {
  const oldScale = state.viewport.scale;
  let newScale = oldScale * factor;
  newScale = Math.max(0.05, Math.min(10, newScale));

  const rect = stageWrap.getBoundingClientRect();
  const screenX = clientX - rect.left;
  const screenY = clientY - rect.top;

  const newX = screenX - ((screenX - state.viewport.x) / oldScale) * newScale;
  const newY = screenY - ((screenY - state.viewport.y) / oldScale) * newScale;

  state.viewport = { x: newX, y: newY, scale: newScale };
  updateViewportTransform();
}

// --- Rendering ---
function redrawOverlay() {
  while (overlay.firstChild) overlay.removeChild(overlay.firstChild);

  // 1. Drafts
  if (state.active && ['calLine', 'squareDraft', 'rectDraft'].includes(state.active.type)) {
    const { sx, sy, cx, cy } = state.active;
    if (state.active.type === 'calLine') {
      overlay.appendChild(svg('line', { x1: sx, y1: sy, x2: cx, y2: cy, class: 'line-guide' }));
      const px = Math.hypot(cx - sx, cy - sy);
      overlay.appendChild(svgText((sx + cx) / 2, (sy + cy) / 2, `${px.toFixed(1)} px`));
    } else {
      let w = Math.abs(cx - sx), h = Math.abs(cy - sy);
      if (state.active.type === 'squareDraft') { const s = Math.max(w, h); w = s; h = s; }
      const x = (cx < sx) ? sx - w : sx;
      const y = (cy < sy) ? sy - h : sy;
      overlay.appendChild(svg('rect', { x, y, width: w, height: h, class: 'shape' }));
    }
  }

  // 2. Shapes
  const strokeW = 2 / state.viewport.scale;
  const handleR = 5 / state.viewport.scale;
  const fontSize = 12 / state.viewport.scale;

  state.shapes.forEach(shape => {
    const g = svg('g', { class: 'shape-group', 'data-id': shape.id });
    
    // Main Rect
    const r = svg('rect', {
      x: shape.x, y: shape.y, width: shape.w, height: shape.h,
      class: `shape ${shape.selected ? 'selected' : ''}`,
      'stroke-width': strokeW
    });
    g.appendChild(r);

    // Label
    let labelText;
    if (state.meterPerPixel) {
      const wm = metersToBest(shape.w * state.meterPerPixel);
      const hm = metersToBest(shape.h * state.meterPerPixel);
      labelText = (shape.type === 'square') ? wm : `${wm} x ${hm}`;
    } else {
      labelText = `${Math.round(shape.w)} x ${Math.round(shape.h)}`;
    }
    
    const txt = svgText(shape.x + shape.w / 2, shape.y - fontSize, labelText);
    txt.setAttribute('font-size', fontSize);
    txt.setAttribute('stroke-width', 3 / state.viewport.scale);
    g.appendChild(txt);

    // Handles
    if (shape.selected) {
      const corners = [
        { x: shape.x + shape.w, y: shape.y + shape.h, k: 'se' },
        { x: shape.x + shape.w / 2, y: shape.y + shape.h, k: 's' },
        { x: shape.x + shape.w, y: shape.y + shape.h / 2, k: 'e' }
      ];
      corners.forEach(c => {
        if (shape.type === 'square' && c.k !== 'se') return;
        const h = svg('circle', {
          cx: c.x, cy: c.y, r: handleR,
          class: 'handle', 'data-kind': c.k, 'data-id': shape.id
        });
        h.setAttribute('stroke-width', 2 / state.viewport.scale);
        g.appendChild(h);
      });
      // Move Handle
      const mh = svg('circle', {
        cx: shape.x + shape.w / 2, cy: shape.y + shape.h / 2, r: handleR,
        class: 'handle move', 'data-kind': 'move', 'data-id': shape.id
      });
      mh.setAttribute('stroke-width', 2 / state.viewport.scale);
      g.appendChild(mh);
    }
    overlay.appendChild(g);
  });
}

function svg(tag, attrs) {
  const el = document.createElementNS('http://www.w3.org/2000/svg', tag);
  for (const k in attrs) el.setAttribute(k, attrs[k]);
  return el;
}
function svgText(x, y, content) {
  const t = svg('text', { x, y, class: 'dim', 'text-anchor': 'middle' });
  t.textContent = content;
  return t;
}

// --- Event Binding ---
function bindEvents() {
  // File Input
  if (fileInput) {
    fileInput.addEventListener('change', (e) => {
      const f = e.target.files[0];
      if (!f) return;
      const img = new Image();
      img.onload = () => {
        state.bg.img = img;
        resizeWorld(img.naturalWidth, img.naturalHeight);
        ctx.clearRect(0, 0, bgCanvas.width, bgCanvas.height);
        ctx.drawImage(img, 0, 0);
        fitToScreen();
        scaleInfo.textContent = '尚未校正';
        hint.textContent = '底圖已載入，請選擇工具開始規劃。';
      };
      img.src = URL.createObjectURL(f);
    });
  }

  // Tools
  if(calibrateBtn) calibrateBtn.addEventListener('click', () => setMode(state.mode === 'calibrate' ? 'idle' : 'calibrate'));
  if(squareBtn) squareBtn.addEventListener('click', () => setMode(state.mode === 'square' ? 'idle' : 'square'));
  if(rectBtn) rectBtn.addEventListener('click', () => setMode(state.mode === 'rect' ? 'idle' : 'rect'));

  // Zoom
  if(zoomInBtn) zoomInBtn.addEventListener('click', () => {
    const r = stageWrap.getBoundingClientRect();
    zoomAt(1.2, r.left + r.width / 2, r.top + r.height / 2);
  });
  if(zoomOutBtn) zoomOutBtn.addEventListener('click', () => {
    const r = stageWrap.getBoundingClientRect();
    zoomAt(0.8, r.left + r.width / 2, r.top + r.height / 2);
  });
  if(fitBtn) fitBtn.addEventListener('click', fitToScreen);

  // Stage Interaction
  if (stageWrap) {
    stageWrap.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    stageWrap.addEventListener('wheel', (e) => {
       e.preventDefault();
       const factor = e.deltaY > 0 ? 0.9 : 1.1;
       zoomAt(factor, e.clientX, e.clientY);
    }, { passive: false });
    
    // Context Menu
    stageWrap.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      const shapeEl = e.target.closest('.shape-group');
      if (shapeEl && contextMenu) {
        selectShape(shapeEl.dataset.id);
        const rect = stageWrap.getBoundingClientRect();
        contextMenu.style.left = (e.clientX) + 'px';
        contextMenu.style.top = (e.clientY) + 'px';
        contextMenu.hidden = false;
      }
    });
  }

  // Keyboard
  window.addEventListener('keydown', (e) => {
    if (e.key === ' ') { state.isSpacePressed = true; if(stageWrap) stageWrap.style.cursor = 'grab'; }
    if (e.key === 'Delete' || e.key === 'Backspace') deleteSelected();
    if (e.key.toLowerCase() === 's') setMode('square');
    if (e.key.toLowerCase() === 'r') setMode('rect');
    if (e.key.toLowerCase() === 'c') setMode('calibrate');
    if (e.key === 'Escape') setMode('idle');
  });
  window.addEventListener('keyup', (e) => {
    if (e.key === ' ') { state.isSpacePressed = false; if(stageWrap) stageWrap.style.cursor = ''; }
  });

  if (contextDelete) {
    contextDelete.addEventListener('click', () => {
      deleteSelected();
      if(contextMenu) contextMenu.hidden = true;
    });
  }
}

// --- Interaction Handlers ---
function onPointerDown(e) {
  if(contextMenu) contextMenu.hidden = true;
  const worldPos = toWorldPos(e.clientX, e.clientY);
  const target = e.target;
  const isHandle = target.classList.contains('handle');
  const isShape = target.closest('.shape-group');
  const isMiddle = e.button === 1;
  const isLeft = e.button === 0;

  // Pan
  if (state.isSpacePressed || isMiddle) {
    e.preventDefault();
    state.active = { type: 'panning', startX: e.clientX, startY: e.clientY, viewX: state.viewport.x, viewY: state.viewport.y };
    stageWrap.style.cursor = 'grabbing';
    return;
  }

  if (!isLeft) return;

  // Manipulate
  if (isHandle) {
    const id = target.dataset.id;
    const kind = target.dataset.kind;
    const shape = state.shapes.find(s => s.id === id);
    if (shape) {
      state.active = { type: 'manipulate', kind, shape, sx: worldPos.x, sy: worldPos.y, initW: shape.w, initH: shape.h, initX: shape.x, initY: shape.y };
    }
    return;
  }

  // Select
  if (isShape && ['idle', 'select'].includes(state.mode)) {
    const id = target.closest('.shape-group').dataset.id;
    selectShape(id);
    const shape = state.shapes.find(s => s.id === id);
    state.active = { type: 'manipulate', kind: 'move', shape, sx: worldPos.x, sy: worldPos.y, initX: shape.x, initY: shape.y };
    return;
  }

  // Create
  if (['calibrate', 'square', 'rect'].includes(state.mode)) {
    let type = state.mode === 'calibrate' ? 'calLine' : (state.mode === 'square' ? 'squareDraft' : 'rectDraft');
    state.active = { type, sx: worldPos.x, sy: worldPos.y, cx: worldPos.x, cy: worldPos.y };
    redrawOverlay();
    return;
  }

  // Deselect / Background Pan
  if (state.mode === 'idle' || state.mode === 'select') {
    state.shapes.forEach(s => s.selected = false);
    redrawOverlay();
    // Allow panning by dragging empty background
    state.active = { type: 'panning', startX: e.clientX, startY: e.clientY, viewX: state.viewport.x, viewY: state.viewport.y };
    stageWrap.style.cursor = 'grabbing';
  }
}

function onPointerMove(e) {
  if (!state.active) return;
  const worldPos = toWorldPos(e.clientX, e.clientY);

  if (state.active.type === 'panning') {
    const dx = e.clientX - state.active.startX;
    const dy = e.clientY - state.active.startY;
    state.viewport.x = state.active.viewX + dx;
    state.viewport.y = state.active.viewY + dy;
    updateViewportTransform();
    return;
  }

  if (state.active.type === 'manipulate') {
    const { kind, shape, sx, sy, initW, initH, initX, initY } = state.active;
    const dx = worldPos.x - sx;
    const dy = worldPos.y - sy;
    if (kind === 'move') {
      shape.x = initX + dx;
      shape.y = initY + dy;
    } else if (kind === 'se') {
      shape.w = Math.max(5, initW + dx);
      shape.h = Math.max(5, initH + dy);
      if (shape.type === 'square') shape.h = shape.w;
    } else if (kind === 'e') shape.w = Math.max(5, initW + dx);
    else if (kind === 's') shape.h = Math.max(5, initH + dy);
    redrawOverlay();
    return;
  }

  if (['calLine', 'squareDraft', 'rectDraft'].includes(state.active.type)) {
    state.active.cx = worldPos.x;
    state.active.cy = worldPos.y;
    redrawOverlay();
  }
}

function onPointerUp(e) {
  if (!state.active) return;
  if (state.active.type === 'panning') {
    if(stageWrap) stageWrap.style.cursor = '';
  } else if (['squareDraft', 'rectDraft'].includes(state.active.type)) {
    const { sx, sy, cx, cy } = state.active;
    let w = Math.abs(cx - sx), h = Math.abs(cy - sy);
    if (w > 5 || h > 5) {
      if (state.active.type === 'squareDraft') { const s = Math.max(w, h); w = s; h = s; }
      const x = (cx < sx) ? sx - w : sx;
      const y = (cy < sy) ? sy - h : sy;
      const newShape = { id: 's_' + Date.now(), type: state.active.type === 'squareDraft' ? 'square' : 'rect', x, y, w, h, selected: true };
      state.shapes.forEach(s => s.selected = false);
      state.shapes.push(newShape);
      setMode('idle');
    }
  } else if (state.active.type === 'calLine') {
    const { sx, sy, cx, cy } = state.active;
    const dist = Math.hypot(cx - sx, cy - sy);
    if (dist > 5) {
      const input = prompt("請輸入這段線的真實長度 (例如: 5m, 300cm):", "1m");
      if (input) {
        const m = parseLengthToMeters(input);
        if (m) {
          state.meterPerPixel = m / dist;
          if(scaleInfo) {
             scaleInfo.textContent = `1px = ${metersToBest(state.meterPerPixel)}`;
             scaleInfo.style.background = '#d1fae5';
             scaleInfo.style.color = '#065f46';
          }
        } else {
          alert("格式錯誤");
        }
      }
    }
    setMode('idle');
  }
  state.active = null;
  redrawOverlay();
}

// --- Helpers ---
function setMode(m) {
  state.mode = m;
  $('.tool-btn.active')?.classList.remove('active');
  if (m === 'calibrate') calibrateBtn?.classList.add('active');
  if (m === 'square') squareBtn?.classList.add('active');
  if (m === 'rect') rectBtn?.classList.add('active');

  const msgs = {
    idle: '拖曳空白處可移動視角，滾輪縮放。',
    calibrate: '請在圖上拉出一條已知長度的參考線。',
    square: '拖曳建立正方形。',
    rect: '拖曳建立長方形。'
  };
  if(hint) hint.textContent = msgs[m] || '';
  if(stageWrap) stageWrap.classList.toggle('drawing', m !== 'idle' && m !== 'select');
}

function selectShape(id) {
  state.shapes.forEach(s => s.selected = (s.id === id));
  redrawOverlay();
}

function deleteSelected() {
  state.shapes = state.shapes.filter(s => !s.selected);
  redrawOverlay();
}

function parseLengthToMeters(str) {
  const m = str.toLowerCase().match(/^([\d.]+)\s*(m|cm|mm)?$/);
  if (!m) return null;
  const val = parseFloat(m[1]);
  const unit = m[2] || 'm';
  return unit === 'cm' ? val / 100 : (unit === 'mm' ? val / 1000 : val);
}

function metersToBest(m) {
  if (m < 1) return (m * 100).toFixed(1).replace(/\.0$/, '') + ' cm';
  return m.toFixed(2).replace(/\.00$/, '') + ' m';
}

function setupExporter() {
  // Wrap in try-catch to prevent App crash if module is missing
  if (typeof CreateExportModule !== 'undefined' && exportBtn) {
    const Exporter = CreateExportModule({
      getBgCanvas: () => bgCanvas,
      getOverlaySvg: () => overlay,
      getTheme: () => 'light',
      getOutlineColor: () => '#e5e7eb'
    });
    Exporter.bindUI({ exportBtn: exportBtn, filename: 'plan-export.png' });
  } else {
    console.warn('Export Module not found or Export Button missing.');
  }
}

// Run
init();