// Espacios de trabajo de cada departamento (versión inicial: objetivos y updates del área).

import * as store from '../data/store.js';
import { DEPTS } from '../config.js';
import { esc } from '../logic/util.js';
import { icon, emptyState } from './components.js';
import { renderGoalList } from './goals.js';
import { groupedUpdates, wireUpdateItems } from './log.js';
import { updatesSorted, openUpdate } from './update.js';

export function renderDept(view, id) {
  const d = DEPTS[id];
  const draw = () => {
    const ups = updatesSorted((u) => u.dept === id).slice(0, 30);
    view.innerHTML = `
      <div class="page page-dept" style="--dc:${d.color}">
        <header class="page-head">
          <a class="back" href="#/">${icon('back')} Centro de operaciones</a>
          <h1><span class="dept-dot"></span>${esc(d.name)}</h1>
        </header>
        <div class="notice">Herramientas específicas de este departamento: <strong>pendiente</strong> (siguiente fase).</div>
        <div class="dept-grid">
          <section class="card" id="dept-goals"></section>
          <section class="card">
            <div class="panel-head"><h2>Últimos updates</h2><button class="btn btn-small" data-up>${icon('bolt')} UPDATE</button></div>
            <div class="dept-log">${ups.length ? groupedUpdates(ups, { showDept: false }) : emptyState('Sin updates en este departamento', '')}</div>
          </section>
        </div>
      </div>`;
    renderGoalList(view.querySelector('#dept-goals'), { deptId: id, title: 'Objetivos' });
    wireUpdateItems(view);
    view.querySelector('[data-up]').onclick = () => openUpdate({ deptId: id });
  };
  draw();
  return { refresh: draw };
}
