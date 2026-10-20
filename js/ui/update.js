// UPDATE: registro rápido de lo que pasa en el día. También se usa para editar entradas del Daily Log.

import * as store from '../data/store.js';
import { DEPTS, DEPT_IDS, GENERAL, UPDATE_TYPES } from '../config.js';
import { esc, fmtDateTime, toLocalInput, fromLocalInput } from '../logic/util.js';
import { openModal, fieldHtml, wireSegmented, withSave, confirmAction, icon } from './components.js';
import { sortGoals } from './goals.js';

const DEPT_FIELD = {
  name: 'dept', label: 'Departamento', type: 'segmented', wide: true,
  options: [...DEPT_IDS.map((id) => ({ value: id, label: DEPTS[id].name, color: DEPTS[id].color })), { value: 'general', label: 'General', color: GENERAL.color }],
};
const TYPE_FIELD = { name: 'type', label: 'Tipo (opcional)', type: 'segmented', wide: true, options: [{ value: '', label: 'Sin tipo' }, ...UPDATE_TYPES] };

function goalOptions(deptId, selected) {
  const goals = sortGoals(store.list('goals').filter((g) => (g.status !== 'completado' || g.id === selected) && (g.dept === deptId || g.dept === 'general')));
  return `<option value="">Ninguno</option>` + goals.map((g) =>
    `<option value="${esc(g.id)}" ${g.id === selected ? 'selected' : ''}>${esc(g.title)}</option>`).join('');
}

export function openUpdate({ existing = null, deptId = null } = {}) {
  const lastDept = store.getMeta('lastUpdateDept');
  const rec = existing || { dept: deptId || lastDept || 'mapa', type: '', text: '', goalId: '' };
  const form = document.createElement('form');
  form.className = 'editor-form update-form';
  form.innerHTML = `<div class="form-grid">
    ${fieldHtml(DEPT_FIELD, rec.dept)}
    <div class="field wide">
      <label class="label" for="f-text">¿Qué pasó? <span class="req">*</span></label>
      <textarea id="f-text" name="text" rows="6" placeholder="Ej.: Hoy terminé de reorganizar la sección de servicios. Mañana quiero revisar los formularios.">${esc(rec.text)}</textarea>
    </div>
    ${fieldHtml(TYPE_FIELD, rec.type || '')}
    <div class="field wide">
      <label class="label" for="f-goal">Vincular a un objetivo (opcional)</label>
      <select id="f-goal" name="goalId">${goalOptions(rec.dept, rec.goalId)}</select>
    </div>
    ${existing
      ? `<div class="field"><label class="label" for="f-at">Fecha y hora</label><input type="datetime-local" id="f-at" name="at" value="${esc(toLocalInput(existing.at))}"></div>`
      : `<p class="field wide hint auto-time">${icon('calendar')} Se guardará con la fecha y hora actuales.</p>`}
  </div><p class="form-error" hidden></p>`;

  const footer = `
    ${existing ? `<button type="button" class="btn btn-danger-ghost" data-delete>${icon('trash')} Eliminar</button>` : ''}
    <span class="spacer"></span>
    <button type="button" class="btn btn-ghost" data-close>Cancelar</button>
    <button type="button" class="btn btn-primary" data-save>${existing ? 'Guardar' : 'Guardar update'}</button>`;
  const m = openModal({ title: existing ? 'Editar actualización' : 'UPDATE', body: form, footer });
  wireSegmented(form);
  const textEl = form.querySelector('#f-text');
  if (!existing) setTimeout(() => textEl.focus(), 250);

  form.querySelector('[data-field="dept"]').addEventListener('change', () => {
    const d = form.querySelector('input[name="dept"]:checked')?.value;
    form.querySelector('#f-goal').innerHTML = goalOptions(d, '');
  });

  const errEl = form.querySelector('.form-error');
  const saveBtn = m.el.querySelector('[data-save]');
  saveBtn.addEventListener('click', async () => {
    const fd = new FormData(form);
    const text = String(fd.get('text') || '').trim();
    if (!text) { errEl.hidden = false; errEl.textContent = 'Escribe el texto de la actualización.'; textEl.focus(); return; }
    const deptVal = fd.get('dept') || 'general';
    const record = {
      ...(existing || {}),
      dept: deptVal,
      type: fd.get('type') || '',
      text,
      goalId: fd.get('goalId') || '',
      at: existing ? (fromLocalInput(fd.get('at')) || existing.at) : new Date().toISOString(),
    };
    saveBtn.disabled = true; saveBtn.textContent = 'Guardando…';
    const saved = await withSave(() => store.save('updates', record), existing ? 'Actualización editada' : 'Update guardado en el Daily Log');
    saveBtn.disabled = false; saveBtn.textContent = existing ? 'Guardar' : 'Guardar update';
    if (saved) {
      m.close();
      if (!existing) {
        store.setMeta('lastUpdateDept', deptVal).catch(() => {});
        window.dispatchEvent(new CustomEvent('cerebro:update-saved', { detail: { dept: deptVal } }));
      }
    }
  });

  m.el.querySelector('[data-delete]')?.addEventListener('click', async () => {
    if (!confirmAction('¿Eliminar esta actualización del Daily Log?')) return;
    if (await withSave(() => store.remove('updates', existing.id), 'Actualización eliminada')) m.close();
  });
  return m;
}

export function updatesSorted(filter = () => true) {
  return store.list('updates').filter(filter).sort((a, b) => (b.at || '').localeCompare(a.at || ''));
}

export { fmtDateTime };
