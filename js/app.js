// Punto de entrada: carga los datos, dibuja la oficina y gestiona la navegación.
//
// Estructura de la pantalla:
// - #world: la oficina (escena, etiquetas y paneles HUD). Se dibuja UNA vez y nunca se desmonta.
// - #panel: panel superpuesto donde se abren los departamentos, el Daily Log y Datos.
//   Al abrirlo, la cámara se acerca al departamento y la oficina sigue visible detrás.

import * as store from './data/store.js';
import { DEPTS, DEPT_IDS, OWNER_NAME } from './config.js';
import { esc, todayKey, fmtDayLong } from './logic/util.js';
import { deptSummaries, topSummary } from './logic/summary.js';
import { icon, toast } from './ui/components.js';
import { renderGoalList } from './ui/goals.js';
import { openUpdate } from './ui/update.js';
import { renderLog } from './ui/log.js';
import { renderDataPage, backupAgeDays } from './ui/data-page.js';
import { renderOffice, updateOffice, placeLabels, pingZone, cameraTo, refitCamera, introCamera } from './ui/office.js';
import { renderDept } from './ui/departments.js';
import { renderOpenTrades, tickOpenTrades, renderCalendar, renderPendingGoals } from './ui/hud.js';
import { openTradeEditor } from './ui/dept-trading.js';
import { applyPacks } from './data/seed.js';

const view = document.getElementById('view');
const topbar = document.getElementById('topbar');
const drawer = document.getElementById('goals-drawer');
let current = { name: 'home', refresh: null };
let world, floor, panel, panelBody, panelTitle;

// ---------- Barra superior ----------
function renderTopbar() {
  const { updatesToday, activeGoals } = topSummary();
  const age = backupAgeDays();
  const hasData = store.list('goals').length + store.list('updates').length + store.list('trades').length > 0;
  const needsBackup = hasData && (age === null || age >= 7);
  const date = fmtDayLong(todayKey());
  topbar.innerHTML = `
    <a class="brand" href="#/" aria-label="El Cerebro, volver al centro de operaciones">
      <span class="brand-mark" aria-hidden="true"><i></i><i></i><i></i></span>
      <span class="brand-text"><strong>El Cerebro</strong><small>${esc(date.charAt(0).toUpperCase() + date.slice(1))}</small></span>
    </a>
    <div class="top-summary" aria-label="Resumen">
      <span><b>${activeGoals}</b> ${activeGoals === 1 ? 'objetivo activo' : 'objetivos activos'}</span>
      <span><b>${updatesToday}</b> ${updatesToday === 1 ? 'update hoy' : 'updates hoy'}</span>
    </div>
    <nav class="top-actions">
      <button class="btn btn-ghost top-btn" data-goals aria-label="Prioridades">${icon('flag')}<span>Prioridades</span>${activeGoals ? `<i class="badge-num">${activeGoals}</i>` : ''}</button>
      <a class="btn btn-ghost top-btn ${current.name === 'log' ? 'active' : ''}" href="#/log">${icon('log')}<span>Daily Log</span></a>
      <a class="btn btn-ghost top-btn ${current.name === 'datos' ? 'active' : ''}" href="#/datos" aria-label="Datos y respaldo">${icon('db')}<span>Datos</span>${needsBackup ? '<i class="badge-dot" title="Haz un respaldo"></i>' : ''}</a>
      <button class="btn btn-update" data-update>${icon('bolt')}<span>UPDATE</span></button>
    </nav>`;
  topbar.querySelector('[data-update]').onclick = () => openUpdate({ deptId: current.dept || null });
  topbar.querySelector('[data-goals]').onclick = () => setDrawer(true);
}

// ---------- Prioridades (panel lateral) ----------
// El panel se crea una vez. Cerrado = oculto de verdad (visibility: hidden), no solo sin toques.
function buildDrawer() {
  drawer.innerHTML = `<div class="drawer-scrim" data-close-drawer></div>
    <aside class="drawer-panel" role="dialog" aria-modal="true" aria-label="Prioridades">
      <button class="icon-btn drawer-close" data-close-drawer aria-label="Cerrar prioridades">${icon('x')}</button>
      <div class="drawer-body"></div>
    </aside>`;
  drawer.querySelectorAll('[data-close-drawer]').forEach((b) => b.addEventListener('click', () => setDrawer(false)));
}
function setDrawer(open) {
  if (open) renderGoalList(drawer.querySelector('.drawer-body'));
  drawer.classList.toggle('open', open);
  drawer.setAttribute('aria-hidden', String(!open));
  if (open) drawer.querySelector('.drawer-close').focus({ preventScroll: true });
}
const drawerOpen = () => drawer.classList.contains('open');

// ---------- La oficina (persistente) ----------
let tradesHud, goalsHud;
function buildWorld() {
  view.innerHTML = `
    <div class="home" id="world">
      <section class="stage" aria-label="Trading floor"><div class="floor" id="floor"></div></section>
      <nav class="phone-depts" aria-label="Departamentos"></nav>
      <aside class="hud hud-goals" id="hud-goals" aria-label="Objetivos pendientes"></aside>
      <aside class="hud hud-trades" id="hud-trades" aria-label="Operaciones abiertas"></aside>
      <aside class="hud hud-cal" id="hud-cal" aria-label="Calendario económico"></aside>
    </div>
    <section class="panel" id="panel" hidden aria-hidden="true">
      <header class="panel-bar">
        <button class="panel-back" data-home>${icon('back')}<span>Centro de operaciones</span></button>
        <span class="panel-title" id="panel-title"></span>
        <button class="icon-btn panel-close" data-home aria-label="Volver al centro de operaciones">${icon('x')}</button>
      </header>
      <div class="panel-body" id="panel-body"></div>
    </section>`;
  world = view.querySelector('#world');
  floor = view.querySelector('#floor');
  panel = view.querySelector('#panel');
  panelBody = view.querySelector('#panel-body');
  panelTitle = view.querySelector('#panel-title');
  tradesHud = view.querySelector('#hud-trades');
  goalsHud = view.querySelector('#hud-goals');
  panel.querySelectorAll('[data-home]').forEach((b) => b.addEventListener('click', goHome));

  renderOffice(floor, { summaries: deptSummaries(), onSelect: (id) => { location.hash = `#/dept/${id}`; } });
  renderCalendar(view.querySelector('#hud-cal'), { startOpen: false });
  refreshWorld();

  let t;
  new ResizeObserver(() => {
    clearTimeout(t);
    t = setTimeout(() => refitCamera(floor, current.name === 'home' ? null : visibleRect()), 60);
  }).observe(floor);
  setInterval(() => tickOpenTrades(tradesHud), 60000);
}

function refreshWorld() {
  const s = deptSummaries();
  updateOffice(floor, s);
  renderOpenTrades(tradesHud);
  renderPendingGoals(goalsHud, { onShowAll: () => setDrawer(true) });
  view.querySelector('.phone-depts').innerHTML = DEPT_IDS.map((id) => `
    <a class="phone-dept" href="#/dept/${id}" style="--dc:${DEPTS[id].color}">
      <span class="pd-dot"></span>
      <span class="pd-text"><strong>${esc(DEPTS[id].name)}</strong><small>${esc(s[id].line)}</small></span>
      ${icon('chevron')}
    </a>`).join('');
}

// Zona de la escena que queda visible junto al panel (para centrar ahí el departamento).
function visibleRect() {
  const scene = floor.querySelector('.scene');
  if (!scene || panel.hidden) return null;
  const sr = scene.getBoundingClientRect();
  const pr = { left: panel.offsetLeft, top: panel.offsetTop };
  const vr = view.getBoundingClientRect();
  const sideBySide = pr.left > sr.width * 0.25;
  if (sideBySide) return { x: 0, y: 0, w: Math.max(160, vr.left + pr.left - sr.left - 12), h: sr.height };
  return { x: 0, y: 0, w: sr.width, h: Math.max(120, vr.top + pr.top - sr.top - 8) };
}

// ---------- Panel de departamento / Daily Log / Datos ----------
let panelKey = '';
function openPanel(key, { title, color, deptId }) {
  const sameKey = !panel.hidden && panel.classList.contains('open') && panelKey === key;
  panelTitle.innerHTML = title;
  panel.style.setProperty('--dc', color || 'var(--accent)');
  document.body.classList.add('panel-open');
  panel.hidden = false;
  panel.setAttribute('aria-hidden', 'false');
  clearTimeout(panel._hideT);
  panelKey = key;
  requestAnimationFrame(() => {
    panel.classList.add('open');
    if (sameKey) return;
    world.classList.toggle('dimmed', !deptId);
    // Espera a que la oficina ocupe su posición de fondo antes de mover la cámara.
    requestAnimationFrame(() => cameraTo(floor, deptId || 'overview', { vis: visibleRect(), duration: 800 }));
  });
}

function closePanel() {
  if (panel.hidden) return;
  panel.classList.remove('open');
  panel.setAttribute('aria-hidden', 'true');
  world.classList.remove('dimmed');
  document.body.classList.remove('panel-open');
  panelKey = '';
  requestAnimationFrame(() => cameraTo(floor, 'overview', { duration: 700, onDone: () => placeLabels(floor) }));
  panel._hideT = setTimeout(() => {
    if (!panel.classList.contains('open')) { panel.hidden = true; panelBody.innerHTML = ''; }
  }, 450);
}

function goHome() {
  if (location.hash && location.hash !== '#/' && location.hash !== '#') location.hash = '#/';
  else route();
}

// Si una sección falla al dibujarse, el panel muestra el error y una salida clara.
function safeRender(fn) {
  try {
    return fn() || {};
  } catch (err) {
    console.error(err);
    panelBody.innerHTML = `<div class="page"><div class="fatal-card">
      <h2>No se pudo abrir esta sección</h2>
      <p>${esc(err?.message || 'Error desconocido')}</p>
      <button class="btn btn-primary" data-home-fallback>${icon('back')} Volver al centro de operaciones</button>
    </div></div>`;
    panelBody.querySelector('[data-home-fallback]').onclick = goHome;
    return {};
  }
}

// ---------- Navegación ----------
function route() {
  const hash = location.hash.replace(/^#/, '') || '/';
  const parts = hash.split('/').filter(Boolean);
  const prevDept = current.dept;
  if (parts[0] === 'log') {
    openPanel('log', { title: `${icon('log')} Daily Log` });
    current = { name: 'log', ...safeRender(() => renderLog(panelBody)) };
    panelBody.scrollTop = 0;
  } else if (parts[0] === 'datos') {
    openPanel('datos', { title: `${icon('db')} Datos y respaldo` });
    safeRender(() => renderDataPage(panelBody));
    current = { name: 'datos', refresh: () => safeRender(() => renderDataPage(panelBody)) };
    panelBody.scrollTop = 0;
  } else if (parts[0] === 'dept' && DEPTS[parts[1]]) {
    const d = DEPTS[parts[1]];
    openPanel(`dept-${parts[1]}`, { title: `<i class="pt-dot"></i>${esc(d.name)}`, color: d.color, deptId: parts[1] });
    current = { name: 'dept', dept: parts[1], ...safeRender(() => renderDept(panelBody, parts[1], parts[2])) };
    if (prevDept !== parts[1]) panelBody.scrollTop = 0;
    // #/dept/trading/diario/<id> abre directamente la ficha de esa operación (desde el panel de abiertas).
    if (parts[1] === 'trading' && parts[3]) {
      history.replaceState(null, '', `#/dept/trading/${parts[2] || 'diario'}`);
      const t = store.get('trades', parts[3]);
      if (t) openTradeEditor(t);
    }
  } else {
    closePanel();
    current = { name: 'home', refresh: null };
  }
  document.body.dataset.view = current.name;
  renderTopbar();
}

// ---------- Bienvenida ----------
function playWelcome() {
  const el = document.createElement('div');
  el.className = 'welcome';
  el.setAttribute('aria-hidden', 'true');
  const date = fmtDayLong(todayKey());
  el.innerHTML = `<div class="welcome-inner">
      <span class="welcome-kicker">Centro de operaciones · en línea</span>
      <span class="welcome-title">Bienvenido, <b>${esc(OWNER_NAME)}</b></span>
      <span class="welcome-sub">${esc(date.charAt(0).toUpperCase() + date.slice(1))}</span>
    </div>`;
  world.appendChild(el);
  introCamera(floor, 1800);
  requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add('play')));
  setTimeout(() => el.remove(), 3400);
}

// ---------- Inicio ----------
async function boot() {
  try {
    await store.loadAll();
  } catch (err) {
    console.error(err);
    view.innerHTML = `<div class="fatal"><h1>No se pudieron cargar tus datos</h1>
      <p>${esc(err?.message || 'Error desconocido')}</p>
      <p>Prueba a cerrar y volver a abrir la app. Si usas el modo privado de Safari, el almacenamiento puede estar desactivado.</p>
      <button class="btn btn-primary" onclick="location.reload()">Reintentar</button></div>`;
    return;
  }

  buildDrawer();
  buildWorld();

  store.subscribe(() => {
    refreshWorld();
    current.refresh?.();
    renderTopbar();
    if (drawerOpen()) renderGoalList(drawer.querySelector('.drawer-body'));
  });

  // Objetivos preparados fuera de la app (js/data/seed.js). Se añaden una sola vez.
  applyPacks()
    .then((n) => { if (n) toast(`${n} novedades en En El Mapa`); })
    .catch((err) => { console.error(err); toast('No se pudieron añadir las novedades', 'error'); });
  window.addEventListener('hashchange', route);
  window.addEventListener('cerebro:update-saved', (e) => pingZone(floor, e.detail.dept));
  window.addEventListener('online', () => { const c = document.getElementById('hud-cal'); if (c?.querySelector('.hud-empty')) renderCalendar(c); });
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape' || document.getElementById('modal-root').children.length) return;
    if (drawerOpen()) setDrawer(false);
    else if (current.name !== 'home') goHome();
  });
  // Cualquier error inesperado se avisa; la X del panel y el logo siguen llevando a la oficina.
  window.addEventListener('error', (e) => { console.error(e.error || e.message); toast('Algo falló. Puedes volver al centro de operaciones con el logo o la X.', 'error'); });
  window.addEventListener('unhandledrejection', (e) => { console.error(e.reason); });

  // Pausa las animaciones solo cuando la app pasa realmente a segundo plano.
  const setPaused = () => document.documentElement.classList.toggle('paused', document.visibilityState === 'hidden');
  document.addEventListener('visibilitychange', setPaused);
  window.addEventListener('pageshow', () => document.documentElement.classList.remove('paused'));
  window.addEventListener('focus', () => document.documentElement.classList.remove('paused'));
  document.documentElement.classList.remove('paused');

  // La fecha de la barra superior cambia a medianoche.
  let lastDay = todayKey();
  setInterval(() => { if (todayKey() !== lastDay) { lastDay = todayKey(); refreshWorld(); current.refresh?.(); renderTopbar(); } }, 60000);

  const startsHome = !location.hash || location.hash === '#/' || location.hash === '#';
  route();
  document.documentElement.classList.add('ready');
  if (startsHome) playWelcome();

  if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
    navigator.serviceWorker.register('./sw.js').catch((e) => console.warn('Service worker no registrado', e));
  }
}

boot();
