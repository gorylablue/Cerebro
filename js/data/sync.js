// Copia privada para la revisión de Claude.
// Cada vez que cambian tus datos (y al abrir la app), se envía una copia a la función
// de Netlify /.netlify/functions/sync, que la guarda en tu repositorio privado de GitHub.
//
// La clave se guarda SOLO en este dispositivo (localStorage): no va en el código,
// ni en los respaldos, ni en la copia que se envía.

import * as store from './store.js';
import { buildBackup } from './backup.js';

const KEY_LS = 'cerebroSyncKey';
const STATUS_LS = 'cerebroSyncStatus';
const ENDPOINT = './.netlify/functions/sync';
const DELAY = 15000; // espera 15 s tras el último cambio para agrupar varios guardados

const ls = {
  get(k) { try { return localStorage.getItem(k); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch { /* almacenamiento no disponible */ } },
  del(k) { try { localStorage.removeItem(k); } catch { /* idem */ } },
};

export const getSyncKey = () => ls.get(KEY_LS) || '';
export function getSyncStatus() {
  try { return JSON.parse(ls.get(STATUS_LS) || 'null'); } catch { return null; }
}
const listeners = new Set();
export const onSyncStatus = (fn) => { listeners.add(fn); return () => listeners.delete(fn); };
function setStatus(st) {
  ls.set(STATUS_LS, JSON.stringify(st));
  for (const fn of listeners) fn(st);
}

let timer = null;
let inFlight = null;
let lastSent = '';
let warned = false;

export async function syncNow({ key = getSyncKey(), notify } = {}) {
  if (!key) return { ok: false, error: 'Sin clave configurada.' };
  if (inFlight) await inFlight.catch(() => {});
  const backup = buildBackup();
  const body = JSON.stringify(backup);
  const fingerprint = JSON.stringify(backup.data);
  inFlight = (async () => {
    let res;
    try {
      res = await fetch(ENDPOINT, { method: 'POST', headers: { 'content-type': 'application/json', 'x-cerebro-key': key }, body, cache: 'no-store' });
    } catch {
      throw new Error(navigator.onLine ? 'No se pudo contactar con Netlify.' : 'Sin conexión a internet. Se enviará al volver la conexión.');
    }
    let out = {};
    try { out = await res.json(); } catch { /* respuesta vacía */ }
    if (res.status === 404) throw new Error('La función de Netlify todavía no está publicada.');
    if (!res.ok || !out.ok) throw new Error(out.error || `Error ${res.status}.`);
    return out;
  })();
  try {
    await inFlight;
    lastSent = fingerprint;
    warned = false;
    setStatus({ ok: true, at: new Date().toISOString() });
    return { ok: true };
  } catch (err) {
    setStatus({ ok: false, at: new Date().toISOString(), error: err.message });
    if (!warned) { warned = true; notify?.(`La copia para Claude no se pudo enviar: ${err.message}`); }
    return { ok: false, error: err.message };
  } finally {
    inFlight = null;
  }
}

export function scheduleSync(notify) {
  if (!getSyncKey()) return;
  if (JSON.stringify(store.snapshot()) === lastSent) return;
  clearTimeout(timer);
  timer = setTimeout(() => syncNow({ notify }), DELAY);
}

export function setSyncKey(key) {
  if (key) ls.set(KEY_LS, key); else { ls.del(KEY_LS); ls.del(STATUS_LS); }
  lastSent = '';
}

// Llamar una vez al arrancar la app.
export function initSync(notify) {
  store.subscribe(() => scheduleSync(notify));
  window.addEventListener('online', () => { if (getSyncStatus()?.ok === false) syncNow({ notify }); });
  // Al salir de la app, si hay cambios pendientes se envían de inmediato.
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden' && timer) { clearTimeout(timer); timer = null; syncNow({ notify }); }
  });
  if (getSyncKey()) syncNow({ notify });
}
