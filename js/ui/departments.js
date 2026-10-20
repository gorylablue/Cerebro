// Espacios de trabajo de los departamentos: cabecera, pestañas y la pestaña común
// "Objetivos y updates". Cada departamento define sus propias pestañas en su archivo.

import { DEPTS } from '../config.js';
import { esc } from '../logic/util.js';
import { icon, emptyState } from './components.js';
import { renderGoalList } from './goals.js';
import { groupedUpdates, wireUpdateItems } from './log.js';
import { updatesSorted, openUpdate } from './update.js';
import { tradingTabs } from './dept-trading.js';
import { mapaTabs } from './dept-mapa.js';
import { uniTabs } from './dept-uni.js';

function overviewTab(id) {
  return {
    id: 'resumen',
    label: 'Objetivos',
    render(el) {
      const ups = updatesSorted((u) => u.dept === id).slice(0, 40);
      el.innerHTML = `<div class="dept-grid">
        <section class="card" data-goals></section>
        <section class="card">
          <div class="panel-head"><h2>Últimos updates</h2><button class="btn btn-small" data-up>${icon('bolt')} UPDATE</button></div>
          ${ups.length ? groupedUpdates(ups, { showDept: false }) : emptyState('Sin updates en este departamento', 'Usa UPDATE para registrar avances.')}
        </section>
      </div>`;
      renderGoalList(el.querySelector('[data-goals]'), { deptId: id, title: 'Objetivos' });
      wireUpdateItems(el);
      el.querySelector('[data-up]').onclick = () => openUpdate({ deptId: id });
    },
  };
}

const TABS = { trading: tradingTabs, mapa: mapaTabs, uni: uniTabs };

export function renderDept(view, id, tabId) {
  const d = DEPTS[id];
  const tabs = id === 'trading' ? [...TABS[id](), overviewTab(id)] : [overviewTab(id), ...TABS[id]()];
  const active = tabs.find((t) => t.id === tabId) || tabs[0];
  view.innerHTML = `
    <div class="page page-dept" style="--dc:${d.color}">
      <header class="page-head dept-head">
        <a class="back" href="#/">${icon('back')} Centro de operaciones</a>
        <h1><span class="dept-dot"></span>${esc(d.name)}</h1>
      </header>
      <nav class="tabs" aria-label="Secciones de ${esc(d.name)}">
        ${tabs.map((t) => `<a class="tab ${t === active ? 'on' : ''}" href="#/dept/${id}/${t.id}" ${t === active ? 'aria-current="page"' : ''}>${esc(t.label)}</a>`).join('')}
      </nav>
      <div class="tab-body"></div>
    </div>`;
  const body = view.querySelector('.tab-body');
  const draw = () => active.render(body);
  draw();
  return { refresh: draw };
}
