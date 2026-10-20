// Punto de entrada: carga los datos, dibuja la barra superior y gestiona la navegación.

import * as store from './data/store.js';
import { DEPTS, DEPT_IDS } from './config.js';
import { esc, todayKey, fmtDayLong } from './logic/util.js';
import { deptSummaries, topSummary } from './logic/summary.js';
import { icon } from './ui/components.js';
import { renderGoalList } from './ui/goals.js';
import { openUpdate } from './ui/update.js';
import { renderLog } from './ui/log.js';
import { renderDataPage, backupAgeDays } from './ui/data-page.js';
import { renderOffice, updateOffice, placeLabels, pingZone } from './ui/office.js';
import { renderDept } from './ui/departments.js';
import { renderOpenTrades, tickOpenTrades, renderCalendar } from './ui/hud.js';
import { openTradeEditor } from './ui/dept-trading.js';

const view = document.getElementById('view');
const topbar = document.getElementById('topbar');
let current = { name: '', refresh: null };

// ---------- Barra superior ----------
function renderTopbar() {
  const { updatesToday, activeGoals } = topSummary();
  const age = backupAgeDays();
  const hasData = store.list('goals').length + store.list('updates').length + store.list('trades').length > 0;
  const needsBackup = hasData && (age === null || age >= 7);
  const date = fmtDayLong(todayKey());
  topbar.innerHTML = `
    <a class="brand" href="#/" aria-label="El Cerebro, inicio">
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
  topbar.querySelector('[data-goals]').onclick = () => toggleGoalsDrawer(true);
}

// ---------- Panel plegable de objetivos ----------
const drawer = document.getElementById('goals-drawer');
function toggleGoalsDrawer(open) {
  drawer.classList.toggle('open', open);
  drawer.setAttribute('aria-hidden', String(!open));
  if (open) {
    drawer.innerHTML = `<div class="drawer-scrim" data-close-drawer></div>
      <aside class="drawer-panel" role="dialog" aria-label="Prioridades">
        <button class="icon-btn drawer-close" data-close-drawer aria-label="Cerrar">${icon('x')}</button>
        <div class="drawer-body"></div>
      </aside>`;
    renderGoalList(drawer.querySelector('.drawer-body'));
    drawer.querySelectorAll('[data-close-drawer]').forEach((b) => b.onclick = () => toggleGoalsDrawer(false));
  }
}
function refreshDrawer() {
  if (drawer.classList.contains('open')) renderGoalList(drawer.querySelector('.drawer-body'));
}

// ---------- Pantalla principal ----------
// La escena se dibuja una sola vez; al cambiar los datos solo se actualizan textos y paneles,
// así las animaciones no se reinician y el calendario no se recarga.
let resizeObs = null;
let homeTimer = null;
function renderHome() {
  view.innerHTML = `
    <div class="home">
      <section class="stage" aria-label="Trading floor"><div class="floor" id="floor"></div></section>
      <nav class="phone-depts" aria-label="Departamentos"></nav>
      <aside class="hud hud-trades" id="hud-trades" aria-label="Operaciones abiertas"></aside>
      <aside class="hud hud-cal" id="hud-cal" aria-label="Calendario económico"></aside>
    </div>`;
  const floor = view.querySelector('#floor');
  const trades = view.querySelector('#hud-trades');
  const go = (id) => { location.hash = `#/dept/${id}`; };
  const sums = deptSummaries();
  renderOffice(floor, { summaries: sums, onSelect: go });
  renderCalendar(view.querySelector('#hud-cal'), { startOpen: window.matchMedia('(min-width: 700px) and (orientation: portrait)').matches });
  const refresh = () => {
    const s = deptSummaries();
    updateOffice(floor, s);
    renderOpenTrades(trades);
    view.querySelector('.phone-depts').innerHTML = DEPT_IDS.map((id) => `
      <a class="phone-dept" href="#/dept/${id}" style="--dc:${DEPTS[id].color}">
        <span class="pd-dot"></span>
        <span class="pd-text"><strong>${esc(DEPTS[id].name)}</strong><small>${esc(s[id].line)}</small></span>
        ${icon('chevron')}
      </a>`).join('');
  };
  refresh();
  resizeObs?.disconnect();
  resizeObs = new ResizeObserver(() => placeLabels(floor));
  resizeObs.observe(floor);
  clearInterval(homeTimer);
  homeTimer = setInterval(() => tickOpenTrades(trades), 60000);
  return { refresh };
}

// ---------- Navegación ----------
function route() {
  const hash = location.hash.replace(/^#/, '') || '/';
  const parts = hash.split('/').filter(Boolean);
  resizeObs?.disconnect();
  clearInterval(homeTimer);
  window.scrollTo(0, 0);
  if (parts[0] === 'log') current = { name: 'log', ...renderLog(view) };
  else if (parts[0] === 'datos') { renderDataPage(view); current = { name: 'datos', refresh: () => renderDataPage(view) }; }
  else if (parts[0] === 'dept' && DEPTS[parts[1]]) {
    current = { name: 'dept', dept: parts[1], ...renderDept(view, parts[1], parts[2]) };
    // #/dept/trading/diario/<id> abre directamente la ficha de esa operación (desde el panel de abiertas).
    if (parts[1] === 'trading' && parts[3]) {
      history.replaceState(null, '', `#/dept/trading/${parts[2] || 'diario'}`);
      const t = store.get('trades', parts[3]);
      if (t) openTradeEditor(t);
    }
  }
  else current = { name: 'home', ...renderHome() };
  document.body.dataset.view = current.name;
  renderTopbar();
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

  store.subscribe(() => { current.refresh?.(); renderTopbar(); refreshDrawer(); });
  window.addEventListener('online', () => { const c = document.getElementById('hud-cal'); if (c && c.querySelector('.hud-empty')) renderCalendar(c); });
  window.addEventListener('hashchange', route);
  window.addEventListener('cerebro:update-saved', (e) => {
    const floor = document.getElementById('floor');
    if (floor) pingZone(floor, e.detail.dept);
  });

  // Pausa las animaciones cuando la app no está visible (ahorra batería).
  const setPaused = () => document.documentElement.classList.toggle('paused', document.hidden);
  document.addEventListener('visibilitychange', setPaused);
  setPaused();

  // La fecha de la barra superior cambia a medianoche.
  let lastDay = todayKey();
  setInterval(() => { if (todayKey() !== lastDay) { lastDay = todayKey(); current.refresh?.(); renderTopbar(); } }, 60000);

  route();
  document.documentElement.classList.add('ready');

  if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
    navigator.serviceWorker.register('./sw.js').catch((e) => console.warn('Service worker no registrado', e));
  }
}

boot();
