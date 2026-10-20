// Pantalla "Datos y respaldo": estado del almacenamiento, exportar, restaurar y borrar.

import * as store from '../data/store.js';
import { STORES } from '../data/db.js';
import { buildBackup, restoreBackup, validateBackup, countRecords, toCSV, deliverFile, stamp } from '../data/backup.js';
import { esc, fmtDateTime, relativeTime } from '../logic/util.js';
import { icon, toast, withSave, confirmAction } from './components.js';

const CSV_TABLES = [
  ['goals', 'Objetivos'], ['updates', 'Updates / Daily Log'], ['trades', 'Operaciones de trading'],
  ['web', 'Página web'], ['learning', 'Aprendizaje'], ['posts', 'Contenido y redes'],
  ['courses', 'Cursos'], ['assignments', 'Asignaciones'],
];

export function isStandalone() {
  return window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true;
}

export function backupAgeDays() {
  const last = store.getMeta('lastBackupAt');
  if (!last) return null;
  return Math.floor((Date.now() - new Date(last)) / 86400000);
}

export function renderDataPage(view) {
  const total = countRecords(store.snapshot());
  const last = store.getMeta('lastBackupAt');
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

  view.innerHTML = `
  <div class="page page-data">
    <header class="page-head">
      <a class="back" href="#/">${icon('back')} Centro de operaciones</a>
      <h1>Datos y respaldo</h1>
      <p class="page-sub">Tus datos se guardan en este dispositivo. Haz respaldos con frecuencia.</p>
    </header>

    ${isIOS && !isStandalone() ? `<div class="notice notice-warn">
      <strong>Estás usando El Cerebro dentro de Safari.</strong>
      Para que los datos se conserven de forma fiable, añádelo a la pantalla de inicio (botón Compartir → «Añadir a pantalla de inicio») y ábrelo siempre desde ese icono.
      Safari y el icono guardan datos por separado.
    </div>` : ''}

    <section class="card">
      <h2>Estado</h2>
      <dl class="kv">
        <dt>Dónde se guarda</dt><dd>En este dispositivo (IndexedDB del navegador). No se sincroniza con otros dispositivos.</dd>
        <dt>Registros guardados</dt><dd>${total}</dd>
        <dt>Protección contra borrado</dt><dd data-persist>Comprobando…</dd>
        <dt>Espacio usado</dt><dd data-usage>—</dd>
        <dt>Último respaldo</dt><dd>${last ? `${esc(fmtDateTime(last))} (${esc(relativeTime(last))})` : '<span class="warn-text">Nunca</span>'}</dd>
      </dl>
    </section>

    <section class="card">
      <h2>Exportar respaldo</h2>
      <p>El respaldo completo (JSON) contiene todo y sirve para restaurar la app en este u otro dispositivo.</p>
      <button class="btn btn-primary btn-lg" data-export-json>${icon('download')} Exportar respaldo completo</button>
      <h3 class="sub">Tablas en CSV (para Excel o Numbers)</h3>
      <div class="btn-row">
        ${CSV_TABLES.map(([k, label]) => `<button class="btn btn-ghost btn-small" data-csv="${k}">${esc(label)} <span class="count">${store.list(k).length}</span></button>`).join('')}
      </div>
    </section>

    <section class="card">
      <h2>Restaurar desde un respaldo</h2>
      <p>Reemplaza todos los datos actuales por los del archivo JSON. Se comprueba el archivo antes de cambiar nada.</p>
      <label class="btn btn-ghost">${icon('upload')} Elegir archivo de respaldo…<input type="file" accept=".json,application/json" hidden data-import></label>
    </section>

    <section class="card">
      <h2>Cómo respaldar en el iPad</h2>
      <ol class="steps">
        <li>Pulsa «Exportar respaldo completo».</li>
        <li>En el menú que aparece, elige <strong>Guardar en Archivos</strong>.</li>
        <li>Selecciona <strong>iCloud Drive</strong> (por ejemplo, una carpeta «Cerebro respaldos») y pulsa Guardar.</li>
        <li>Para restaurar: «Elegir archivo de respaldo…» y selecciona el archivo más reciente.</li>
      </ol>
      <p class="hint">Recomendación: un respaldo por semana, y siempre antes de borrar datos de Safari o cambiar de dispositivo.</p>
    </section>

    <section class="card card-danger">
      <h2>Borrar todos los datos</h2>
      <p>Elimina todo lo guardado en este dispositivo. Exporta un respaldo antes.</p>
      <button class="btn btn-danger" data-wipe>${icon('trash')} Borrar todo</button>
    </section>
  </div>`;

  // Estado de persistencia y espacio
  (async () => {
    const pEl = view.querySelector('[data-persist]');
    const uEl = view.querySelector('[data-usage]');
    try {
      const p = await navigator.storage?.persisted?.();
      pEl.textContent = p === true ? 'Activada: el navegador no borrará los datos automáticamente.'
        : p === false ? (isIOS && isStandalone() ? 'Gestionada por iOS. Al usarla desde la pantalla de inicio no aplica el borrado automático de Safari.' : 'No garantizada por el navegador. Haz respaldos.')
          : 'No disponible en este navegador.';
      const est = await navigator.storage?.estimate?.();
      if (est?.usage != null) uEl.textContent = `${(est.usage / 1024 / 1024).toFixed(2)} MB`;
    } catch { pEl.textContent = 'No disponible.'; }
  })();

  view.querySelector('[data-export-json]').onclick = async () => {
    const backup = buildBackup();
    const ok = await deliverFile(`el-cerebro-respaldo_${stamp()}.json`, JSON.stringify(backup, null, 2), 'application/json');
    if (ok) {
      await withSave(() => store.setMeta('lastBackupAt', backup.exportedAt), 'Respaldo exportado');
      renderDataPage(view);
    }
  };

  view.querySelectorAll('[data-csv]').forEach((b) => b.onclick = async () => {
    const rows = store.list(b.dataset.csv);
    if (!rows.length) { toast('Esta tabla aún no tiene registros.', 'error'); return; }
    await deliverFile(`el-cerebro-${b.dataset.csv}_${stamp()}.csv`, toCSV(rows), 'text/csv');
  });

  view.querySelector('[data-import]').onchange = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    let obj;
    try { obj = JSON.parse(await file.text()); }
    catch { toast('No se pudo leer el archivo: no es un JSON válido.', 'error'); return; }
    const err = validateBackup(obj);
    if (err) { toast(err, 'error'); return; }
    const incoming = countRecords(obj.data);
    if (!confirmAction(`Se reemplazarán ${total} registros actuales por ${incoming} registros del respaldo del ${fmtDateTime(obj.exportedAt)}. ¿Continuar?`)) return;
    const ok = await withSave(() => restoreBackup(obj), 'Respaldo restaurado');
    if (ok) renderDataPage(view);
  };

  view.querySelector('[data-wipe]').onclick = async () => {
    const answer = window.prompt('Esto borrará TODOS tus datos de este dispositivo. Escribe BORRAR para confirmar.');
    if (answer?.trim().toUpperCase() !== 'BORRAR') return;
    const empty = Object.fromEntries(STORES.map((s) => [s, []]));
    const ok = await withSave(() => store.replaceAll(empty), 'Datos borrados');
    if (ok) renderDataPage(view);
  };
}
