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
import { renderOffice, pingZone } from './ui/office.js';
import { renderDept } from './ui/departments.js';

const view = document.getElementById('view');
const topbar = document.getElementById('topbar');
let current = { name: '', refresh: null };
const PHONE = window.matchMedia('(max-width: 699px)');

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
      <a class="btn btn-ghost top-btn ${current.name === 'log' ? 'active' : ''}" href="#/log">${icon('log')}<span>Daily Log</span></a>
      <a class="btn btn-ghost top-btn ${current.name === 'datos' ? 'active' : ''}" href="#/datos" aria-label="Datos y respaldo">${icon('db')}<span>Datos</span>${needsBackup ? '<i class="badge-dot" title="Haz un respaldo"></i>' : ''}</a>
      <button class="btn btn-update" data-update>${icon('bolt')}<span>UPDATE</span></button>
    </nav>`;
  topbar.querySelector('[data-update]').onclick = () => openUpdate({ deptId: current.dept || null });
}

// ---------- Pantalla principal ----------
let resizeObs = null;
function renderHome() {
  view.innerHTML = `
    <div class="home">
      <aside class="goals-panel" id="goals-panel" aria-label="Objetivos y prioridades"></aside>
      <section class="floor-area">
        <div class="floor" id="floor" aria-label="Trading floor"></div>
        <nav class="phone-depts" aria-label="Departamentos"></nav>
      </section>
    </div>`;
  const floor = view.querySelector('#floor');
  const draw = () => {
    renderGoalList(view.querySelector('#goals-panel'));
    const sums = deptSummaries();
    view.querySelector('.phone-depts').innerHTML = DEPT_IDS.map((id) => `
      <a class="phone-dept" href="#/dept/${id}" style="--dc:${DEPTS[id].color}">
        <span class="pd-dot"></span>
        <span class="pd-text"><strong>${esc(DEPTS[id].name)}</strong><small>${esc(sums[id].line)}</small></span>
        ${icon('chevron')}
      </a>`).join('');
    if (!PHONE.matches) renderOffice(floor, { summaries: sums, onSelect: (id) => { location.hash = `#/dept/${id}`; } });
    else floor.innerHTML = '';
  };
  draw();
  let t;
  resizeObs?.disconnect();
  resizeObs = new ResizeObserver(() => { clearTimeout(t); t = setTimeout(() => { if (current.name === 'home') draw(); }, 120); });
  resizeObs.observe(floor);
  return { refresh: draw };
}

// ---------- Navegación ----------
function route() {
  const hash = location.hash.replace(/^#/, '') || '/';
  const parts = hash.split('/').filter(Boolean);
  resizeObs?.disconnect();
  window.scrollTo(0, 0);
  if (parts[0] === 'log') current = { name: 'log', ...renderLog(view) };
  else if (parts[0] === 'datos') { renderDataPage(view); current = { name: 'datos', refresh: () => renderDataPage(view) }; }
  else if (parts[0] === 'dept' && DEPTS[parts[1]]) current = { name: 'dept', dept: parts[1], ...renderDept(view, parts[1], parts[2]) };
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

  store.subscribe(() => { current.refresh?.(); renderTopbar(); });
  window.addEventListener('hashchange', route);
  window.addEventListener('cerebro:update-saved', (e) => {
    const floor = document.getElementById('floor');
    if (floor) pingZone(floor, e.detail.dept);
  });
  PHONE.addEventListener?.('change', () => current.refresh?.());

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
