// Objetivos principales: panel lateral y editor.

import * as store from '../data/store.js';
import { DEPTS, DEPT_IDS, GENERAL, dept, PRIORITIES, PRIORITY_RANK, STATUSES, statusLabel } from '../config.js';
import { esc, dueLabel, dueClass, fmtClock } from '../logic/util.js';
import { openEditor, withSave, icon, emptyState } from './components.js';
import { sortByDue } from '../logic/goals.js';

export const GOAL_FIELDS = [
  { name: 'title', label: 'Nombre', type: 'text', required: true, wide: true, placeholder: 'Ej.: Perfeccionar la página web' },
  { name: 'dept', label: 'Departamento', type: 'segmented', wide: true,
    options: [...DEPT_IDS.map((id) => ({ value: id, label: DEPTS[id].name, color: DEPTS[id].color })), { value: 'general', label: 'General', color: GENERAL.color }] },
  { name: 'priority', label: 'Prioridad', type: 'segmented', options: PRIORITIES },
  { name: 'status', label: 'Estado', type: 'segmented', options: STATUSES },
  { name: 'nextAction', label: 'Próxima acción', type: 'text', wide: true, placeholder: '¿Qué es lo siguiente que tienes que hacer?' },
  { name: 'due', label: 'Fecha límite (opcional)', type: 'date' },
  { name: 'dueTime', label: 'Hora (opcional)', type: 'time' },
  { name: 'notes', label: 'Notas (opcional)', type: 'textarea', wide: true },
];

// Por fecha de entrega (la más cercana primero; sin fecha al final). Ver js/logic/goals.js.
export function sortGoals(goals) {
  return sortByDue(goals);
}

export function activeGoals(deptId) {
  return store.list('goals').filter((g) => g.status !== 'completado' && (!deptId || g.dept === deptId));
}

export function openGoalEditor(goal = null, defaults = {}) {
  return openEditor({
    store: 'goals',
    title: goal ? 'Editar objetivo' : 'Nuevo objetivo',
    fields: GOAL_FIELDS,
    record: goal,
    defaults: { dept: 'general', priority: 'media', status: 'pendiente', ...defaults },
    transform: (v, prev) => ({
      ...v,
      completedAt: v.status === 'completado' ? (prev?.completedAt || new Date().toISOString()) : null,
    }),
    okMessage: goal ? 'Objetivo actualizado' : 'Objetivo creado',
    deleteMessage: '¿Eliminar este objetivo? Esta acción no se puede deshacer.',
  });
}

export async function toggleGoal(id) {
  const g = store.get('goals', id);
  if (!g) return;
  const done = g.status === 'completado';
  await withSave(() => store.save('goals', {
    ...g,
    status: done ? 'pendiente' : 'completado',
    completedAt: done ? null : new Date().toISOString(),
  }), done ? 'Objetivo reabierto' : 'Objetivo completado');
}

function goalItem(g) {
  const d = dept(g.dept);
  const done = g.status === 'completado';
  return `<li class="goal p-${esc(g.priority || 'media')} ${done ? 'done' : ''}" style="--dc:${d.color}">
    <button class="goal-check" data-toggle="${esc(g.id)}" aria-label="${done ? 'Reabrir objetivo' : 'Marcar como completado'}">${done ? icon('check') : ''}</button>
    <button class="goal-main" data-edit="${esc(g.id)}">
      <span class="goal-meta"><span class="dot"></span>${esc(d.name)}${g.status === 'progreso' ? '<span class="chip chip-prog">En progreso</span>' : ''}${g.priority === 'alta' && !done ? '<span class="chip chip-high">Alta</span>' : ''}</span>
      <span class="goal-title">${esc(g.title)}</span>
      ${g.nextAction && !done ? `<span class="goal-next">→ ${esc(g.nextAction)}</span>` : ''}
      ${g.due && !done ? `<span class="goal-due ${dueClass(g.due)}">${esc(dueLabel(g.due))}${g.dueTime ? ` · ${esc(fmtClock(g.dueTime))}` : ''}</span>` : ''}
    </button>
  </li>`;
}

// Dibuja la lista de objetivos dentro de "el". Si se pasa deptId, solo muestra ese departamento.
export function renderGoalList(el, { deptId = null, title = 'Prioridades' } = {}) {
  const all = store.list('goals').filter((g) => !deptId || g.dept === deptId);
  const active = sortGoals(all.filter((g) => g.status !== 'completado'));
  const done = all.filter((g) => g.status === 'completado')
    .sort((a, b) => (b.completedAt || '').localeCompare(a.completedAt || ''));

  el.innerHTML = `
    <div class="panel-head">
      <h2>${esc(title)}</h2>
      <button class="btn btn-small" data-new-goal>${icon('plus')} Objetivo</button>
    </div>
    ${active.length === 0 ? emptyState(done.length ? 'Todo completado' : 'Aún no hay objetivos', 'Crea un objetivo para tenerlo siempre a la vista.') : ''}
    ${active.length ? `<ul class="goal-list">${active.map(goalItem).join('')}</ul>` : ''}
    ${done.length ? `<details class="done-block"><summary>Completados (${done.length})</summary><ul class="goal-list">${done.slice(0, 30).map(goalItem).join('')}</ul></details>` : ''}`;

  el.querySelector('[data-new-goal]').onclick = () => openGoalEditor(null, deptId ? { dept: deptId } : {});
  el.querySelectorAll('[data-edit]').forEach((b) => b.onclick = () => openGoalEditor(store.get('goals', b.dataset.edit)));
  el.querySelectorAll('[data-toggle]').forEach((b) => b.onclick = () => toggleGoal(b.dataset.toggle));
}
