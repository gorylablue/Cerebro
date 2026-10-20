// Daily Log: bitácora cronológica de todas las actualizaciones.

import * as store from '../data/store.js';
import { DEPT_IDS, dept, updateTypeLabel } from '../config.js';
import { esc, dayKey, todayKey, addDays, dayHeading, fmtTime, normalize } from '../logic/util.js';
import { icon, emptyState } from './components.js';
import { openUpdate, updatesSorted } from './update.js';

const state = { q: '', dept: 'all', range: 'todo', date: '' };

export function updateItem(u, { showDept = true } = {}) {
  const d = dept(u.dept);
  const goal = u.goalId ? store.get('goals', u.goalId) : null;
  return `<li class="log-item" style="--dc:${d.color}">
    <button class="log-btn" data-open-update="${esc(u.id)}">
      <span class="log-time">${esc(fmtTime(u.at))}</span>
      <span class="log-content">
        <span class="log-tags">
          ${showDept ? `<span class="tag tag-dept"><span class="dot"></span>${esc(d.name)}</span>` : ''}
          ${u.type ? `<span class="tag">${esc(updateTypeLabel(u.type))}</span>` : ''}
          ${goal ? `<span class="tag tag-goal">${icon('link')}${esc(goal.title)}</span>` : ''}
        </span>
        <span class="log-text">${esc(u.text)}</span>
      </span>
    </button>
  </li>`;
}

// Agrupa una lista de updates por día y devuelve el HTML.
export function groupedUpdates(list, opts) {
  const groups = new Map();
  for (const u of list) {
    const k = dayKey(u.at);
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k).push(u);
  }
  return [...groups].map(([k, items]) => `
    <section class="log-day">
      <h3 class="log-day-head">${esc(dayHeading(k))} <span>${items.length}</span></h3>
      <ul class="log-list">${items.map((u) => updateItem(u, opts)).join('')}</ul>
    </section>`).join('');
}

export function wireUpdateItems(root) {
  root.querySelectorAll('[data-open-update]').forEach((b) => {
    b.onclick = () => openUpdate({ existing: store.get('updates', b.dataset.openUpdate) });
  });
}

function matches(u) {
  if (state.dept !== 'all' && u.dept !== state.dept) return false;
  const k = dayKey(u.at);
  const t = todayKey();
  if (state.range === 'hoy' && k !== t) return false;
  if (state.range === 'ayer' && k !== addDays(t, -1)) return false;
  if (state.range === '7' && k < addDays(t, -6)) return false;
  if (state.range === 'fecha' && state.date && k !== state.date) return false;
  if (state.q) {
    const goal = u.goalId ? store.get('goals', u.goalId)?.title : '';
    const hay = normalize(`${u.text} ${updateTypeLabel(u.type)} ${dept(u.dept).name} ${goal || ''}`);
    if (!normalize(state.q).split(/\s+/).filter(Boolean).every((w) => hay.includes(w))) return false;
  }
  return true;
}

export function renderLog(view) {
  const chip = (val, label, key) => `<button class="fchip ${state[key] === val ? 'on' : ''}" data-${key}="${val}">${label}</button>`;
  view.innerHTML = `
    <div class="page page-log">
      <header class="page-head">
        <a class="back" href="#/">${icon('back')} Centro de operaciones</a>
        <h1>Daily Log</h1>
        <p class="page-sub">Todo lo que registras con UPDATE, en orden cronológico.</p>
      </header>
      <div class="filters">
        <label class="search">${icon('search')}<input type="search" placeholder="Buscar en el historial…" value="${esc(state.q)}" data-q></label>
        <div class="chips">
          ${chip('all', 'Todos', 'dept')}
          ${DEPT_IDS.map((id) => chip(id, dept(id).name, 'dept')).join('')}
          ${chip('general', 'General', 'dept')}
        </div>
        <div class="chips">
          ${chip('todo', 'Todo', 'range')}${chip('hoy', 'Hoy', 'range')}${chip('ayer', 'Ayer', 'range')}${chip('7', 'Últimos 7 días', 'range')}${chip('fecha', 'Fecha…', 'range')}
          ${state.range === 'fecha' ? `<input type="date" class="date-pick" value="${esc(state.date || todayKey())}" data-date>` : ''}
        </div>
      </div>
      <div class="log-results"></div>
    </div>`;

  const results = view.querySelector('.log-results');
  const paint = () => {
    const total = store.list('updates').length;
    const list = updatesSorted(matches);
    if (!total) {
      results.innerHTML = emptyState('Tu bitácora está vacía', 'Pulsa UPDATE para registrar tu primer avance.');
    } else if (!list.length) {
      results.innerHTML = emptyState('Sin resultados', 'Prueba con otra búsqueda o cambia los filtros.');
    } else {
      results.innerHTML = `<p class="result-count">${list.length} ${list.length === 1 ? 'entrada' : 'entradas'}</p>` + groupedUpdates(list);
      wireUpdateItems(results);
    }
  };
  paint();

  view.querySelector('[data-q]').addEventListener('input', (e) => { state.q = e.target.value; paint(); });
  view.querySelectorAll('[data-dept]').forEach((b) => b.onclick = () => { state.dept = b.dataset.dept; renderLog(view); });
  view.querySelectorAll('[data-range]').forEach((b) => b.onclick = () => {
    state.range = b.dataset.range;
    if (state.range === 'fecha' && !state.date) state.date = todayKey();
    renderLog(view);
  });
  view.querySelector('[data-date]')?.addEventListener('change', (e) => { state.date = e.target.value; paint(); });
  return { refresh: paint };
}
