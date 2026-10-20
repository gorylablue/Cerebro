// Departamento En El Mapa: página web, aprendizaje y contenido para redes.

import * as store from '../data/store.js';
import { PRIORITIES, STATUSES, PRIORITY_RANK } from '../config.js';
import { esc, todayKey, fmtDay, fmtDateTime, normalize, dayKey, dueLabel, dueClass } from '../logic/util.js';
import { openEditor, openModal, withSave, icon, emptyState } from './components.js';

// ================= Página web =================
const WEB_KINDS = [
  { value: 'tarea', label: 'Tarea' },
  { value: 'cambio', label: 'Cambio' },
  { value: 'problema', label: 'Problema' },
  { value: 'idea', label: 'Idea' },
  { value: 'nota', label: 'Nota técnica' },
];
const kindLabel = (k) => WEB_KINDS.find((x) => x.value === k)?.label || '';
const ACTIONABLE = ['tarea', 'cambio', 'problema'];

const WEB_FIELDS = [
  { name: 'kind', label: 'Tipo', type: 'segmented', wide: true, options: WEB_KINDS },
  { name: 'title', label: 'Título', type: 'text', required: true, wide: true, placeholder: 'Ej.: Reorganizar la sección de servicios' },
  { name: 'details', label: 'Detalles', type: 'textarea', wide: true, rows: 4 },
  { name: 'status', label: 'Estado', type: 'segmented', wide: true, options: STATUSES },
  { name: 'priority', label: 'Prioridad', type: 'segmented', options: PRIORITIES },
  { name: 'doneDate', label: 'Fecha de realización', type: 'date', hint: 'Se completa sola al marcarlo como completado.' },
  { name: 'nextAction', label: 'Próxima acción / qué queda pendiente', type: 'text', wide: true },
];

function openWebEditor(item = null, kind = 'tarea') {
  return openEditor({
    store: 'web', title: item ? 'Editar' : `Nuevo: ${kindLabel(kind).toLowerCase()}`, fields: WEB_FIELDS, record: item,
    defaults: { kind, status: 'pendiente', priority: 'media' },
    transform: (v) => ({ ...v, doneDate: v.status === 'completado' ? (v.doneDate || todayKey()) : v.doneDate }),
    okMessage: item ? 'Actualizado' : 'Guardado',
  });
}

const wf = { kind: 'abiertos' };

function webItem(w) {
  const done = w.status === 'completado';
  const check = ACTIONABLE.includes(w.kind)
    ? `<button class="goal-check" data-web-toggle="${esc(w.id)}" aria-label="${done ? 'Reabrir' : 'Marcar como completado'}">${done ? icon('check') : ''}</button>` : '<span class="kind-ico"></span>';
  return `<li class="goal p-${esc(w.priority || 'media')} ${done ? 'done' : ''}" style="--dc:var(--dc-page)">
    ${check}
    <button class="goal-main" data-web="${esc(w.id)}">
      <span class="goal-meta">${esc(kindLabel(w.kind))}${w.status === 'progreso' ? '<span class="chip chip-prog">En progreso</span>' : ''}${w.priority === 'alta' && !done ? '<span class="chip chip-high">Alta</span>' : ''}</span>
      <span class="goal-title">${esc(w.title)}</span>
      ${w.details ? `<span class="goal-next clamp">${esc(w.details)}</span>` : ''}
      ${w.nextAction ? `<span class="goal-next">→ ${esc(w.nextAction)}</span>` : ''}
    </button>
  </li>`;
}

async function toggleWeb(id) {
  const w = store.get('web', id);
  const done = w.status === 'completado';
  await withSave(() => store.save('web', { ...w, status: done ? 'pendiente' : 'completado', doneDate: done ? w.doneDate : (w.doneDate || todayKey()) }), done ? 'Reabierto' : 'Completado');
}

function editCurrentGoal() {
  const current = store.getMeta('webCurrentGoal') || '';
  const m = openModal({
    title: 'Objetivo actual de la página web',
    body: `<div class="field"><label class="label" for="cg">¿En qué te estás enfocando ahora?</label><textarea id="cg" rows="3">${esc(current)}</textarea></div>`,
    footer: '<span class="spacer"></span><button class="btn btn-ghost" data-close>Cancelar</button><button class="btn btn-primary" data-save>Guardar</button>',
  });
  m.el.querySelector('[data-save]').onclick = async () => {
    const v = m.el.querySelector('#cg').value.trim();
    if (await withSave(() => store.setMeta('webCurrentGoal', v), 'Objetivo actual guardado')) m.close();
  };
}

function renderWeb(el) {
  const items = store.list('web');
  const current = store.getMeta('webCurrentGoal');
  const sortFn = (a, b) => (PRIORITY_RANK[a.priority] ?? 1) - (PRIORITY_RANK[b.priority] ?? 1) || (b.createdAt || '').localeCompare(a.createdAt || '');
  const open = items.filter((w) => ACTIONABLE.includes(w.kind) && w.status !== 'completado');
  const filters = [
    ['abiertos', `Pendientes (${open.length})`],
    ['tarea', 'Tareas'], ['cambio', 'Cambios'], ['problema', 'Problemas'], ['idea', 'Ideas'], ['nota', 'Notas técnicas'],
  ];
  let shown;
  if (wf.kind === 'abiertos') shown = open.sort(sortFn);
  else shown = items.filter((w) => w.kind === wf.kind).sort((a, b) => (a.status === 'completado') - (b.status === 'completado') || sortFn(a, b));
  const history = items.filter((w) => w.status === 'completado' && ACTIONABLE.includes(w.kind))
    .sort((a, b) => (b.doneDate || '').localeCompare(a.doneDate || '') || (b.updatedAt || '').localeCompare(a.updatedAt || ''));

  el.innerHTML = `
    <section class="card current-goal">
      <div class="panel-head"><h2>Objetivo actual</h2><button class="btn btn-small btn-ghost" data-cg>${icon('edit')} Editar</button></div>
      ${current ? `<p class="big-text">${esc(current)}</p>` : '<p class="muted">Aún no has definido el objetivo actual de la página web.</p>'}
    </section>
    <div class="toolbar">
      ${WEB_KINDS.map((k) => `<button class="btn btn-small" data-new-web="${k.value}">${icon('plus')} ${esc(k.label)}</button>`).join('')}
    </div>
    <div class="chips">${filters.map(([v, l]) => `<button class="fchip ${wf.kind === v ? 'on' : ''}" data-wf="${v}">${esc(l)}</button>`).join('')}</div>
    <div class="dept-grid mt">
      <section class="card">
        <h2>${esc(filters.find((f) => f[0] === wf.kind)[1].replace(/ \(\d+\)$/, ''))}</h2>
        ${shown.length ? `<ul class="goal-list">${shown.map(webItem).join('')}</ul>` : emptyState('Nada por aquí', 'Usa los botones de arriba para añadir.')}
      </section>
      <section class="card">
        <h2>Historial de cambios</h2>
        ${history.length ? `<ol class="history">${history.slice(0, 60).map((w) => `
          <li><button class="hist-btn" data-web="${esc(w.id)}">
            <span class="hist-date">${esc(w.doneDate ? fmtDay(w.doneDate, { day: 'numeric', month: 'short', year: 'numeric' }) : '—')}</span>
            <span><b>${esc(w.title)}</b> <span class="tag">${esc(kindLabel(w.kind))}</span>
            ${w.nextAction ? `<span class="goal-next">Próxima acción: ${esc(w.nextAction)}</span>` : ''}</span>
          </button></li>`).join('')}</ol>`
    : emptyState('Sin cambios completados', 'Cuando completes una tarea, cambio o problema aparecerá aquí con su fecha.')}
      </section>
    </div>`;
  el.style.setProperty('--dc-page', '#34d3b4');
  el.querySelector('[data-cg]').onclick = editCurrentGoal;
  el.querySelectorAll('[data-new-web]').forEach((b) => b.onclick = () => openWebEditor(null, b.dataset.newWeb));
  el.querySelectorAll('[data-web]').forEach((b) => b.onclick = () => openWebEditor(store.get('web', b.dataset.web)));
  el.querySelectorAll('[data-web-toggle]').forEach((b) => b.onclick = () => toggleWeb(b.dataset.webToggle));
  el.querySelectorAll('[data-wf]').forEach((b) => b.onclick = () => { wf.kind = b.dataset.wf; renderWeb(el); });
}

// ================= Aprendizaje =================
const LEARN_CATS = ['Página web', 'HTML y CSS', 'GitHub', 'Netlify', 'Claude', 'Diseño', 'Errores y soluciones', 'Formularios', 'Otro'];
const LEARN_FIELDS = [
  { name: 'title', label: 'Título', type: 'text', required: true, wide: true, placeholder: 'Ej.: Cómo publicar cambios en Netlify' },
  { name: 'category', label: 'Categoría', type: 'text', datalist: LEARN_CATS },
  { name: 'link', label: 'Enlace de referencia (opcional)', type: 'url' },
  { name: 'content', label: 'Lo que aprendí (pasos, código, notas)', type: 'textarea', wide: true, rows: 10 },
];
const lf = { q: '', cat: '' };

function openLearnEditor(note = null) {
  return openEditor({ store: 'learning', title: note ? 'Editar aprendizaje' : 'Nuevo aprendizaje', fields: LEARN_FIELDS, record: note, size: 'wide', okMessage: 'Aprendizaje guardado' });
}

function renderLearning(el) {
  const all = store.list('learning');
  const cats = [...new Set(all.map((n) => n.category).filter(Boolean))].sort();
  const paint = () => {
    const words = normalize(lf.q).split(/\s+/).filter(Boolean);
    const list = all.filter((n) => (!lf.cat || n.category === lf.cat)
      && words.every((w) => normalize(`${n.title} ${n.category} ${n.content}`).includes(w)))
      .sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''));
    const res = el.querySelector('.learn-results');
    res.innerHTML = !all.length ? emptyState('Tu base de conocimiento está vacía', 'Guarda aquí lo que aprendas: cómo cambiar una sección, publicar, corregir errores…')
      : !list.length ? emptyState('Sin resultados', '')
        : `<div class="note-grid">${list.map((n) => `
          <button class="note-card" data-note="${esc(n.id)}">
            ${n.category ? `<span class="tag">${esc(n.category)}</span>` : ''}
            <b>${esc(n.title)}</b>
            <span class="clamp-3">${esc(n.content || '')}</span>
            <small class="muted">Actualizado ${esc(fmtDateTime(n.updatedAt))}</small>
          </button>`).join('')}</div>`;
    res.querySelectorAll('[data-note]').forEach((b) => b.onclick = () => openLearnEditor(store.get('learning', b.dataset.note)));
  };
  el.innerHTML = `
    <div class="toolbar"><button class="btn btn-primary" data-new-note>${icon('plus')} Nuevo aprendizaje</button></div>
    <div class="filters">
      <label class="search">${icon('search')}<input type="search" placeholder="Buscar en tus aprendizajes…" value="${esc(lf.q)}" data-lq></label>
      ${cats.length ? `<div class="chips"><button class="fchip ${!lf.cat ? 'on' : ''}" data-cat="">Todas</button>${cats.map((c) => `<button class="fchip ${lf.cat === c ? 'on' : ''}" data-cat="${esc(c)}">${esc(c)}</button>`).join('')}</div>` : ''}
    </div>
    <div class="learn-results"></div>`;
  paint();
  el.querySelector('[data-new-note]').onclick = () => openLearnEditor();
  el.querySelector('[data-lq]').oninput = (e) => { lf.q = e.target.value; paint(); };
  el.querySelectorAll('[data-cat]').forEach((b) => b.onclick = () => { lf.cat = b.dataset.cat; renderLearning(el); });
}

// ================= Contenido y redes =================
const POST_STATUSES = [
  { value: 'idea', label: 'Idea' },
  { value: 'produccion', label: 'En producción' },
  { value: 'listo', label: 'Listo para publicar' },
  { value: 'publicado', label: 'Publicado' },
];
const postStatusLabel = (v) => POST_STATUSES.find((s) => s.value === v)?.label || 'Idea';
const PLATFORMS = ['Instagram', 'Facebook', 'TikTok', 'LinkedIn', 'YouTube', 'X', 'Otra'].map((p) => ({ value: p, label: p }));
const CTYPES = ['Post', 'Carrusel', 'Reel', 'Historia', 'Video', 'Otro'].map((p) => ({ value: p, label: p }));
const POST_FIELDS = [
  { name: 'title', label: 'Título o nombre', type: 'text', required: true, wide: true },
  { name: 'platform', label: 'Plataforma', type: 'select', options: PLATFORMS },
  { name: 'contentType', label: 'Tipo de contenido', type: 'select', options: CTYPES },
  { name: 'status', label: 'Estado', type: 'segmented', wide: true, options: POST_STATUSES },
  { name: 'plannedDate', label: 'Fecha prevista de publicación', type: 'date' },
  { name: 'publishedDate', label: 'Fecha de publicación', type: 'date', hint: 'Se completa sola al marcarla como publicada.' },
  { name: 'idea', label: 'Idea', type: 'textarea', wide: true },
  { name: 'caption', label: 'Texto o caption', type: 'textarea', wide: true, rows: 5 },
  { name: 'designLink', label: 'Enlace o referencia al diseño', type: 'text', wide: true, placeholder: 'Enlace de Canva, nombre del archivo…' },
  { name: 'notes', label: 'Notas', type: 'textarea', wide: true },
];

function openPostEditor(post = null, defaults = {}) {
  return openEditor({
    store: 'posts', title: post ? 'Editar publicación' : 'Nueva publicación', fields: POST_FIELDS, record: post, size: 'wide',
    defaults: { status: 'idea', platform: 'Instagram', contentType: 'Post', ...defaults },
    transform: (v) => ({ ...v, publishedDate: v.status === 'publicado' ? (v.publishedDate || todayKey()) : v.publishedDate }),
    okMessage: post ? 'Publicación actualizada' : 'Publicación creada',
  });
}

const pf = { view: 'lista', month: todayKey().slice(0, 7) };

async function advancePost(id) {
  const p = store.get('posts', id);
  const i = POST_STATUSES.findIndex((s) => s.value === p.status);
  if (i < 0 || i >= POST_STATUSES.length - 1) return;
  const next = POST_STATUSES[i + 1].value;
  await withSave(() => store.save('posts', { ...p, status: next, publishedDate: next === 'publicado' ? (p.publishedDate || todayKey()) : p.publishedDate }), `Movida a «${postStatusLabel(next)}»`);
}

function postCard(p) {
  const date = p.status === 'publicado' ? p.publishedDate : p.plannedDate;
  return `<li class="post-card">
    <button class="post-main" data-post="${esc(p.id)}">
      <span class="goal-meta">${esc(p.platform || '')}${p.contentType ? ` · ${esc(p.contentType)}` : ''}</span>
      <b>${esc(p.title)}</b>
      ${date ? `<span class="goal-due ${p.status !== 'publicado' ? dueClass(date) : ''}">${p.status === 'publicado' ? 'Publicado el ' + esc(fmtDay(date)) : esc(dueLabel(date))}</span>` : ''}
    </button>
    ${p.status !== 'publicado' ? `<button class="btn btn-small btn-ghost adv" data-adv="${esc(p.id)}" aria-label="Avanzar al siguiente estado">${icon('chevron')}</button>` : ''}
  </li>`;
}

function calendarHtml(posts) {
  const [y, m] = pf.month.split('-').map(Number);
  const first = new Date(y, m - 1, 1);
  const startOffset = (first.getDay() + 6) % 7;
  const days = new Date(y, m, 0).getDate();
  const byDay = {};
  for (const p of posts) {
    const d = p.status === 'publicado' ? (p.publishedDate || p.plannedDate) : p.plannedDate;
    if (d && d.startsWith(pf.month)) (byDay[d] = byDay[d] || []).push(p);
  }
  const today = todayKey();
  let cells = '';
  for (let i = 0; i < startOffset; i++) cells += '<div class="cal-cell empty"></div>';
  for (let d = 1; d <= days; d++) {
    const key = `${pf.month}-${String(d).padStart(2, '0')}`;
    cells += `<div class="cal-cell ${key === today ? 'today' : ''}" data-day="${key}">
      <span class="cal-num">${d}</span>
      ${(byDay[key] || []).map((p) => `<button class="cal-item st-${esc(p.status)}" data-post="${esc(p.id)}">${esc(p.title)}</button>`).join('')}
    </div>`;
  }
  const label = first.toLocaleDateString('es-PR', { month: 'long', year: 'numeric' });
  return `<div class="cal-head">
      <button class="icon-btn" data-cal="-1" aria-label="Mes anterior">${icon('back')}</button>
      <b>${esc(label.charAt(0).toUpperCase() + label.slice(1))}</b>
      <button class="icon-btn" data-cal="1" aria-label="Mes siguiente">${icon('chevron')}</button>
    </div>
    <div class="cal-grid">${['L', 'M', 'X', 'J', 'V', 'S', 'D'].map((d) => `<div class="cal-dow">${d}</div>`).join('')}${cells}</div>
    <p class="hint">Toca un día vacío para planificar una publicación en esa fecha. Las publicaciones sin fecha prevista solo aparecen en la lista.</p>`;
}

function renderContent(el) {
  const posts = store.list('posts');
  const byStatus = (s) => posts.filter((p) => (p.status || 'idea') === s)
    .sort((a, b) => (a.plannedDate || '9999').localeCompare(b.plannedDate || '9999'));
  el.innerHTML = `
    <div class="toolbar">
      <button class="btn btn-primary" data-new-post>${icon('plus')} Nueva publicación</button>
      <span class="spacer"></span>
      <div class="chips"><button class="fchip ${pf.view === 'lista' ? 'on' : ''}" data-pv="lista">${icon('list')} Lista</button><button class="fchip ${pf.view === 'calendario' ? 'on' : ''}" data-pv="calendario">${icon('calendar')} Calendario</button></div>
    </div>
    ${!posts.length ? emptyState('Aún no hay contenido', 'Empieza registrando una idea. El flujo es: Idea → En producción → Listo para publicar → Publicado.')
    : pf.view === 'lista' ? `<div class="pipeline">${POST_STATUSES.map((s) => {
      const list = byStatus(s.value);
      const shown = s.value === 'publicado' ? list.sort((a, b) => (b.publishedDate || '').localeCompare(a.publishedDate || '')).slice(0, 20) : list;
      return `<section class="pipe-col"><h3>${esc(s.label)} <span>${list.length}</span></h3>
        ${shown.length ? `<ul class="post-list">${shown.map(postCard).join('')}</ul>` : '<p class="muted small">Vacío</p>'}</section>`;
    }).join('')}</div>`
      : `<section class="card calendar">${calendarHtml(posts)}</section>`}`;

  el.querySelector('[data-new-post]').onclick = () => openPostEditor();
  el.querySelectorAll('[data-post]').forEach((b) => b.onclick = (e) => { e.stopPropagation(); openPostEditor(store.get('posts', b.dataset.post)); });
  el.querySelectorAll('[data-adv]').forEach((b) => b.onclick = () => advancePost(b.dataset.adv));
  el.querySelectorAll('[data-pv]').forEach((b) => b.onclick = () => { pf.view = b.dataset.pv; renderContent(el); });
  el.querySelectorAll('[data-cal]').forEach((b) => b.onclick = () => {
    const [y, m] = pf.month.split('-').map(Number);
    pf.month = dayKey(new Date(y, m - 1 + Number(b.dataset.cal), 1)).slice(0, 7);
    renderContent(el);
  });
  el.querySelectorAll('.cal-cell[data-day]').forEach((c) => c.onclick = () => openPostEditor(null, { plannedDate: c.dataset.day }));
}

export function mapaTabs() {
  return [
    { id: 'web', label: 'Página web', render: renderWeb },
    { id: 'aprendizaje', label: 'Aprendizaje', render: renderLearning },
    { id: 'contenido', label: 'Contenido y redes', render: renderContent },
  ];
}
