// Piezas de interfaz reutilizables: avisos, ventanas, formularios y editor genérico.

import { esc, toLocalInput, fromLocalInput } from '../logic/util.js';
import * as store from '../data/store.js';

// ---------- Avisos (toasts) ----------
export function toast(message, kind = 'ok') {
  const root = document.getElementById('toast-root');
  const el = document.createElement('div');
  el.className = `toast toast-${kind}`;
  el.setAttribute('role', kind === 'error' ? 'alert' : 'status');
  el.textContent = message;
  root.appendChild(el);
  requestAnimationFrame(() => el.classList.add('show'));
  setTimeout(() => {
    el.classList.remove('show');
    setTimeout(() => el.remove(), 300);
  }, kind === 'error' ? 6000 : 2200);
}

// Ejecuta un guardado y avisa del resultado. Devuelve null si falla.
export async function withSave(fn, okMessage = 'Guardado') {
  try {
    const result = await fn();
    if (okMessage) toast(okMessage);
    return result ?? true;
  } catch (err) {
    console.error(err);
    toast(`No se pudo guardar. ${err?.message || ''}`.trim(), 'error');
    return null;
  }
}

// ---------- Ventana modal ----------
export function openModal({ title, body, footer = '', size = '', onClose }) {
  const root = document.getElementById('modal-root');
  const wrap = document.createElement('div');
  wrap.className = 'modal-backdrop';
  wrap.innerHTML = `
    <div class="modal ${size}" role="dialog" aria-modal="true" aria-label="${esc(title)}">
      <header class="modal-head">
        <h2>${esc(title)}</h2>
        <button class="icon-btn" data-close aria-label="Cerrar">${icon('x')}</button>
      </header>
      <div class="modal-body"></div>
      ${footer ? `<footer class="modal-foot">${footer}</footer>` : ''}
    </div>`;
  const bodyEl = wrap.querySelector('.modal-body');
  if (typeof body === 'string') bodyEl.innerHTML = body; else if (body) bodyEl.appendChild(body);
  root.appendChild(wrap);
  document.body.classList.add('modal-open');
  requestAnimationFrame(() => wrap.classList.add('show'));

  const onKey = (e) => { if (e.key === 'Escape') close(); };
  function close() {
    document.removeEventListener('keydown', onKey);
    wrap.classList.remove('show');
    setTimeout(() => {
      wrap.remove();
      if (!root.children.length) document.body.classList.remove('modal-open');
    }, 200);
    onClose?.();
  }
  document.addEventListener('keydown', onKey);
  wrap.querySelectorAll('[data-close]').forEach((b) => b.addEventListener('click', close));
  return { el: wrap, body: bodyEl, close };
}

export function confirmAction(message) {
  return window.confirm(message);
}

// ---------- Formularios ----------
// Cada campo se describe con un objeto: { name, label, type, options, required, placeholder, wide, hint, step }
export function fieldHtml(f, value) {
  const id = `f-${f.name}`;
  const req = f.required ? 'required' : '';
  const ph = f.placeholder ? `placeholder="${esc(f.placeholder)}"` : '';
  const v = value ?? f.default ?? '';
  let input;
  switch (f.type) {
    case 'textarea':
      input = `<textarea id="${id}" name="${f.name}" rows="${f.rows || 3}" ${ph} ${req}>${esc(v)}</textarea>`;
      break;
    case 'select':
      input = `<select id="${id}" name="${f.name}" ${req}>
        ${f.allowEmpty !== false && !f.required ? `<option value="">${esc(f.emptyLabel || '—')}</option>` : ''}
        ${f.options.map((o) => `<option value="${esc(o.value)}" ${String(o.value) === String(v) ? 'selected' : ''}>${esc(o.label)}</option>`).join('')}
      </select>`;
      break;
    case 'segmented':
      input = `<div class="segmented" role="radiogroup" id="${id}">
        ${f.options.map((o) => `
          <label class="seg ${o.value === v ? 'on' : ''}" ${o.color ? `style="--seg:${o.color}"` : ''}>
            <input type="radio" name="${f.name}" value="${esc(o.value)}" ${o.value === v ? 'checked' : ''}>
            <span>${esc(o.label)}</span>
          </label>`).join('')}
      </div>`;
      break;
    case 'checkbox':
      input = `<label class="toggle"><input type="checkbox" id="${id}" name="${f.name}" ${v === true ? 'checked' : ''}><span>${esc(f.checkLabel || 'Sí')}</span></label>`;
      break;
    case 'tristate': // Sí / No / Sin indicar
      input = `<div class="segmented" id="${id}">
        ${[['', 'Sin indicar'], ['si', 'Sí'], ['no', 'No']].map(([val, lab]) => `
          <label class="seg ${val === (v ?? '') ? 'on' : ''}"><input type="radio" name="${f.name}" value="${val}" ${val === (v ?? '') ? 'checked' : ''}><span>${lab}</span></label>`).join('')}
      </div>`;
      break;
    case 'datetime':
      input = `<input type="datetime-local" id="${id}" name="${f.name}" value="${esc(v ? toLocalInput(v) : '')}" ${req}>`;
      break;
    case 'number':
      input = `<input type="number" inputmode="decimal" step="${f.step || 'any'}" id="${id}" name="${f.name}" value="${v === null ? '' : esc(v)}" ${ph} ${req}>`;
      break;
    default:
      input = `<input type="${f.type || 'text'}" id="${id}" name="${f.name}" value="${esc(v)}" ${ph} ${req} ${f.type === 'url' ? 'inputmode="url" autocapitalize="off"' : ''}>`;
  }
  const label = f.type === 'checkbox' ? `<span class="label">${esc(f.label)}</span>` : `<label class="label" for="${id}">${esc(f.label)}${f.required ? ' <span class="req">*</span>' : ''}</label>`;
  return `<div class="field ${f.wide ? 'wide' : ''} ${f.half ? 'half' : ''}" data-field="${f.name}">
    ${label}${input}${f.hint ? `<small class="hint">${esc(f.hint)}</small>` : ''}
  </div>`;
}

export function formHtml(fields, record = {}) {
  return `<div class="form-grid">${fields.map((f) => f.section
    ? `<h3 class="form-section">${esc(f.section)}</h3>`
    : fieldHtml(f, record[f.name])).join('')}</div>`;
}

// Activa el resaltado visual de los botones segmentados.
export function wireSegmented(root) {
  root.querySelectorAll('.segmented').forEach((seg) => {
    seg.addEventListener('change', () => {
      seg.querySelectorAll('.seg').forEach((l) => l.classList.toggle('on', l.querySelector('input').checked));
    });
  });
}

export function readForm(form, fields) {
  const fd = new FormData(form);
  const out = {};
  for (const f of fields) {
    if (f.section) continue;
    const raw = fd.get(f.name);
    switch (f.type) {
      case 'number': {
        const s = String(raw ?? '').trim().replace(',', '.');
        out[f.name] = s === '' ? null : Number(s);
        break;
      }
      case 'checkbox': out[f.name] = form.elements[f.name]?.checked || false; break;
      case 'datetime': out[f.name] = fromLocalInput(raw); break;
      default: out[f.name] = typeof raw === 'string' ? raw.trim() : (raw ?? '');
    }
  }
  return out;
}

// ---------- Editor genérico de registros ----------
// Abre un formulario para crear o editar un registro de cualquier tabla.
export function openEditor({ store: storeName, title, fields, record = null, defaults = {}, validate, transform, onSaved, okMessage = 'Guardado', deleteMessage = '¿Eliminar este registro? Esta acción no se puede deshacer.', size }) {
  const isNew = !record?.id;
  const data = { ...defaults, ...(record || {}) };
  const form = document.createElement('form');
  form.className = 'editor-form';
  form.noValidate = true;
  form.innerHTML = formHtml(fields, data) + '<p class="form-error" hidden></p>';
  const footer = `
    ${!isNew ? `<button type="button" class="btn btn-danger-ghost" data-delete>${icon('trash')} Eliminar</button>` : ''}
    <span class="spacer"></span>
    <button type="button" class="btn btn-ghost" data-close>Cancelar</button>
    <button type="button" class="btn btn-primary" data-save>Guardar</button>`;
  const m = openModal({ title, body: form, footer, size });
  wireSegmented(form);
  const errEl = form.querySelector('.form-error');
  const saveBtn = m.el.querySelector('[data-save]');

  async function submit() {
    let values = readForm(form, fields);
    for (const f of fields) {
      if (f.required && (values[f.name] === '' || values[f.name] === null)) {
        return showErr(`Completa el campo «${f.label}».`, f.name);
      }
    }
    const msg = validate?.(values);
    if (msg) return showErr(msg);
    values = transform ? transform(values, record) : values;
    saveBtn.disabled = true;
    saveBtn.textContent = 'Guardando…';
    const saved = await withSave(() => store.save(storeName, { ...(record || {}), ...values }), okMessage);
    saveBtn.disabled = false;
    saveBtn.textContent = 'Guardar';
    if (saved) { m.close(); onSaved?.(saved); }
  }
  function showErr(msg, name) {
    errEl.hidden = false;
    errEl.textContent = msg;
    if (name) form.elements[name]?.focus?.();
  }
  saveBtn.addEventListener('click', submit);
  form.addEventListener('submit', (e) => { e.preventDefault(); submit(); });
  m.el.querySelector('[data-delete]')?.addEventListener('click', async () => {
    if (!confirmAction(deleteMessage)) return;
    const ok = await withSave(() => store.remove(storeName, record.id), 'Eliminado');
    if (ok) m.close();
  });
  return m;
}

// ---------- Iconos (SVG en línea, sin dependencias) ----------
const ICONS = {
  x: '<path d="M6 6l12 12M18 6L6 18"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  back: '<path d="M15 18l-6-6 6-6"/>',
  chevron: '<path d="M9 6l6 6-6 6"/>',
  log: '<path d="M4 6h16M4 12h16M4 18h10"/>',
  db: '<ellipse cx="12" cy="6" rx="7" ry="3"/><path d="M5 6v6c0 1.7 3.1 3 7 3s7-1.3 7-3V6M5 12v6c0 1.7 3.1 3 7 3s7-1.3 7-3v-6"/>',
  bolt: '<path d="M13 3L5 14h6l-1 7 8-11h-6l1-7z"/>',
  check: '<path d="M5 12l5 5 9-10"/>',
  trash: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>',
  search: '<circle cx="11" cy="11" r="6"/><path d="M20 20l-4.5-4.5"/>',
  edit: '<path d="M4 20h4L19 9l-4-4L4 16v4z"/>',
  link: '<path d="M10 14a4 4 0 005.7 0l3-3a4 4 0 00-5.7-5.7l-1 1M14 10a4 4 0 00-5.7 0l-3 3a4 4 0 005.7 5.7l1-1"/>',
  download: '<path d="M12 4v11M7 10l5 5 5-5M5 20h14"/>',
  upload: '<path d="M12 20V9M7 14l5-5 5 5M5 4h14"/>',
  calendar: '<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M4 10h16M9 3v4M15 3v4"/>',
  list: '<path d="M9 6h11M9 12h11M9 18h11M4 6h.01M4 12h.01M4 18h.01"/>',
};
export function icon(name, cls = '') {
  return `<svg class="ico ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name] || ''}</svg>`;
}

export function emptyState(title, text, action = '') {
  return `<div class="empty"><p class="empty-title">${esc(title)}</p>${text ? `<p class="empty-text">${esc(text)}</p>` : ''}${action}</div>`;
}
