// Departamento Universidad: asignaciones (con exámenes y proyectos), cursos y próximas fechas.

import * as store from '../data/store.js';
import { PRIORITIES, STATUSES, PRIORITY_RANK } from '../config.js';
import { esc, todayKey, addDays, fmtDay, dueLabel, dueClass, daysUntil } from '../logic/util.js';
import { openEditor, withSave, icon, emptyState } from './components.js';

const KINDS = [
  { value: 'asignacion', label: 'Asignación' },
  { value: 'proyecto', label: 'Proyecto' },
  { value: 'examen', label: 'Examen' },
  { value: 'lectura', label: 'Estudio / lectura' },
  { value: 'tarea', label: 'Tarea pendiente' },
];
const kindLabel = (k) => KINDS.find((x) => x.value === k)?.label || 'Asignación';
const courseName = (id) => (id ? store.get('courses', id)?.name || 'Curso eliminado' : 'Sin curso');

function assignmentFields() {
  const courses = store.list('courses').sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  return [
    { name: 'title', label: 'Nombre', type: 'text', required: true, wide: true },
    { name: 'kind', label: 'Tipo', type: 'segmented', wide: true, options: KINDS },
    { name: 'courseId', label: 'Curso', type: 'select', options: courses.map((c) => ({ value: c.id, label: c.name })), emptyLabel: courses.length ? 'Sin curso' : 'Primero crea un curso (opcional)' },
    { name: 'due', label: 'Fecha límite (opcional)', type: 'date' },
    { name: 'priority', label: 'Prioridad', type: 'segmented', options: PRIORITIES },
    { name: 'status', label: 'Estado', type: 'segmented', options: STATUSES },
    { name: 'link', label: 'Enlace o archivo relacionado', type: 'text', wide: true, placeholder: 'Enlace de Blackboard/Moodle, Drive, nombre del archivo…' },
    { name: 'notes', label: 'Notas', type: 'textarea', wide: true },
  ];
}

export function openAssignmentEditor(a = null, defaults = {}) {
  return openEditor({
    store: 'assignments', title: a ? 'Editar' : 'Nueva asignación', fields: assignmentFields(), record: a,
    defaults: { kind: 'asignacion', priority: 'media', status: 'pendiente', ...defaults },
    transform: (v, prev) => ({ ...v, completedAt: v.status === 'completado' ? (prev?.completedAt || new Date().toISOString()) : null }),
    okMessage: a ? 'Asignación actualizada' : 'Asignación creada',
  });
}

const COURSE_FIELDS = [
  { name: 'name', label: 'Nombre del curso', type: 'text', required: true, wide: true },
  { name: 'code', label: 'Código / sección', type: 'text' },
  { name: 'professor', label: 'Profesor(a)', type: 'text' },
  { name: 'schedule', label: 'Horario y salón', type: 'text', wide: true },
  { name: 'materials', label: 'Materiales de estudio', type: 'textarea', wide: true, rows: 5, hint: 'Libros, enlaces, presentaciones… uno por línea.' },
  { name: 'notes', label: 'Notas', type: 'textarea', wide: true },
];
function openCourseEditor(c = null) {
  return openEditor({
    store: 'courses', title: c ? 'Editar curso' : 'Nuevo curso', fields: COURSE_FIELDS, record: c, size: 'wide', okMessage: 'Curso guardado',
    deleteMessage: '¿Eliminar este curso? Sus asignaciones no se borran: quedarán marcadas como «Curso eliminado».',
  });
}

async function toggleAssignment(id) {
  const a = store.get('assignments', id);
  const done = a.status === 'completado';
  await withSave(() => store.save('assignments', { ...a, status: done ? 'pendiente' : 'completado', completedAt: done ? null : new Date().toISOString() }), done ? 'Reabierta' : 'Completada');
}

function row(a, { showCourse = true } = {}) {
  const done = a.status === 'completado';
  return `<li class="goal p-${esc(a.priority || 'media')} ${done ? 'done' : ''}">
    <button class="goal-check" data-a-toggle="${esc(a.id)}" aria-label="${done ? 'Reabrir' : 'Marcar como completada'}">${done ? icon('check') : ''}</button>
    <button class="goal-main" data-a="${esc(a.id)}">
      <span class="goal-meta">${esc(kindLabel(a.kind))}${showCourse ? ` · ${esc(courseName(a.courseId))}` : ''}${a.status === 'progreso' ? '<span class="chip chip-prog">En progreso</span>' : ''}${a.priority === 'alta' && !done ? '<span class="chip chip-high">Alta</span>' : ''}</span>
      <span class="goal-title">${esc(a.title)}</span>
      ${a.due && !done ? `<span class="goal-due ${dueClass(a.due)}">${daysUntil(a.due) <= 7 ? `${esc(dueLabel(a.due))} · ` : ''}${esc(fmtDay(a.due, { weekday: 'short', day: 'numeric', month: 'short' }))}</span>` : ''}
    </button>
  </li>`;
}

function wireRows(el) {
  el.querySelectorAll('[data-a]').forEach((b) => b.onclick = () => openAssignmentEditor(store.get('assignments', b.dataset.a)));
  el.querySelectorAll('[data-a-toggle]').forEach((b) => b.onclick = () => toggleAssignment(b.dataset.aToggle));
}

// ---------- Asignaciones ----------
const af = { sort: 'due', status: 'abiertas', course: '' };
const SORTS = {
  due: (a, b) => (a.due || '9999').localeCompare(b.due || '9999') || (PRIORITY_RANK[a.priority] ?? 1) - (PRIORITY_RANK[b.priority] ?? 1),
  priority: (a, b) => (PRIORITY_RANK[a.priority] ?? 1) - (PRIORITY_RANK[b.priority] ?? 1) || (a.due || '9999').localeCompare(b.due || '9999'),
  course: (a, b) => courseName(a.courseId).localeCompare(courseName(b.courseId)) || (a.due || '9999').localeCompare(b.due || '9999'),
};

function renderAssignments(el) {
  const all = store.list('assignments');
  const today = todayKey();
  const upcoming = all.filter((a) => a.status !== 'completado' && a.due && a.due <= addDays(today, 14)).sort(SORTS.due);
  const list = all.filter((a) => (af.status === 'todas' || (af.status === 'abiertas' ? a.status !== 'completado' : a.status === af.status))
    && (!af.course || a.courseId === af.course)).sort(SORTS[af.sort]);
  const courses = store.list('courses').sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  const chip = (key, val, label) => `<button class="fchip ${af[key] === val ? 'on' : ''}" data-af="${key}" data-val="${esc(val)}">${esc(label)}</button>`;

  el.innerHTML = `
    <div class="toolbar">
      <button class="btn btn-primary" data-new-a>${icon('plus')} Nueva asignación</button>
      <button class="btn" data-new-exam>${icon('plus')} Examen</button>
      <button class="btn" data-new-proj>${icon('plus')} Proyecto</button>
    </div>
    <section class="card upcoming">
      <h2>Próximas fechas <small class="muted">(vencidas y próximos 14 días)</small></h2>
      ${upcoming.length ? `<ul class="timeline">${upcoming.map((a) => {
        const n = daysUntil(a.due);
        return `<li><button data-a="${esc(a.id)}" class="tl-item ${n < 0 ? 'over' : n <= 2 ? 'soon' : ''}">
          <span class="tl-date"><b>${esc(fmtDay(a.due, { day: 'numeric' }))}</b>${esc(fmtDay(a.due, { month: 'short' }))}</span>
          <span><b>${esc(a.title)}</b><small>${esc(kindLabel(a.kind))} · ${esc(courseName(a.courseId))} · ${esc(dueLabel(a.due))}</small></span>
        </button></li>`;
      }).join('')}</ul>` : '<p class="muted">Nada pendiente en los próximos 14 días.</p>'}
    </section>
    <div class="filters">
      <div class="chips">${chip('status', 'abiertas', 'Pendientes')}${chip('status', 'progreso', 'En progreso')}${chip('status', 'completado', 'Completadas')}${chip('status', 'todas', 'Todas')}</div>
      <div class="chips"><span class="muted small">Ordenar:</span>${chip('sort', 'due', 'Fecha límite')}${chip('sort', 'priority', 'Prioridad')}${chip('sort', 'course', 'Curso')}
        ${courses.length ? `<select class="inline-select" data-course><option value="">Todos los cursos</option>${courses.map((c) => `<option value="${esc(c.id)}" ${af.course === c.id ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}</select>` : ''}
      </div>
    </div>
    ${!all.length ? emptyState('Aún no hay asignaciones', courses.length ? 'Crea la primera con el botón de arriba.' : 'Puedes crear tus cursos en la pestaña «Cursos» y luego añadir asignaciones.')
    : list.length ? `<ul class="goal-list">${list.map((a) => row(a)).join('')}</ul>` : emptyState('Sin resultados con estos filtros', '')}`;

  el.querySelector('[data-new-a]').onclick = () => openAssignmentEditor(null, af.course ? { courseId: af.course } : {});
  el.querySelector('[data-new-exam]').onclick = () => openAssignmentEditor(null, { kind: 'examen', priority: 'alta', ...(af.course ? { courseId: af.course } : {}) });
  el.querySelector('[data-new-proj]').onclick = () => openAssignmentEditor(null, { kind: 'proyecto', ...(af.course ? { courseId: af.course } : {}) });
  el.querySelectorAll('[data-af]').forEach((b) => b.onclick = () => { af[b.dataset.af] = b.dataset.val; renderAssignments(el); });
  const cs = el.querySelector('[data-course]');
  if (cs) cs.onchange = () => { af.course = cs.value; renderAssignments(el); };
  wireRows(el);
}

// ---------- Cursos ----------
function renderCourses(el) {
  const courses = store.list('courses').sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  const all = store.list('assignments');
  el.innerHTML = `
    <div class="toolbar"><button class="btn btn-primary" data-new-course>${icon('plus')} Nuevo curso</button></div>
    ${!courses.length ? emptyState('Aún no hay cursos', 'Crea tus cursos para organizar asignaciones, exámenes y materiales.')
    : `<div class="course-grid">${courses.map((c) => {
      const items = all.filter((a) => a.courseId === c.id);
      const done = items.filter((a) => a.status === 'completado').length;
      const pct = items.length ? Math.round((done / items.length) * 100) : 0;
      const open = items.filter((a) => a.status !== 'completado').sort(SORTS.due);
      return `<section class="card course">
        <div class="panel-head"><div><h2>${esc(c.name)}</h2><small class="muted">${esc([c.code, c.professor, c.schedule].filter(Boolean).join(' · '))}</small></div>
          <button class="btn btn-small btn-ghost" data-course-edit="${esc(c.id)}">${icon('edit')} Editar</button></div>
        <div class="progress" role="progressbar" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100"><span style="width:${pct}%"></span></div>
        <p class="small muted">${items.length ? `${done} de ${items.length} completadas (${pct}%)` : 'Sin asignaciones todavía'}</p>
        ${open.length ? `<ul class="goal-list">${open.slice(0, 5).map((a) => row(a, { showCourse: false })).join('')}</ul>` : ''}
        <button class="btn btn-small" data-course-add="${esc(c.id)}">${icon('plus')} Asignación en este curso</button>
        ${c.materials ? `<details class="materials"><summary>Materiales de estudio</summary><p class="pre">${esc(c.materials)}</p></details>` : ''}
        ${c.notes ? `<details class="materials"><summary>Notas</summary><p class="pre">${esc(c.notes)}</p></details>` : ''}
      </section>`;
    }).join('')}</div>`}`;
  el.querySelector('[data-new-course]').onclick = () => openCourseEditor();
  el.querySelectorAll('[data-course-edit]').forEach((b) => b.onclick = () => openCourseEditor(store.get('courses', b.dataset.courseEdit)));
  el.querySelectorAll('[data-course-add]').forEach((b) => b.onclick = () => openAssignmentEditor(null, { courseId: b.dataset.courseAdd }));
  wireRows(el);
}

export function uniTabs() {
  return [

  ];
}
