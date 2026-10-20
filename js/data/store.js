// Capa de datos de la app: guarda en IndexedDB y mantiene una copia en memoria
// para que las pantallas se dibujen al instante.
// Regla clave: la copia en memoria SOLO cambia después de que IndexedDB confirma el guardado.
// Si falla, se lanza un error y la interfaz lo muestra.

import { db, STORES } from './db.js';
import { uid } from '../logic/util.js';

const cache = {};
const listeners = new Set();

export async function loadAll() {
  for (const name of STORES) cache[name] = await db.all(name);
}

export function list(store) { return cache[store] || []; }
export function get(store, id) { return list(store).find((r) => r.id === id) || null; }

export async function save(store, data) {
  const now = new Date().toISOString();
  const record = { ...data };
  if (!record.id) { record.id = uid(); record.createdAt = now; }
  record.updatedAt = now;
  await db.put(store, record);
  const arr = cache[store] || (cache[store] = []);
  const i = arr.findIndex((r) => r.id === record.id);
  if (i >= 0) arr[i] = record; else arr.push(record);
  notify(store);
  requestPersistence();
  return record;
}

export async function remove(store, id) {
  await db.remove(store, id);
  cache[store] = list(store).filter((r) => r.id !== id);
  notify(store);
}

export async function replaceAll(data) {
  await db.replaceAll(data);
  for (const name of STORES) cache[name] = [...(data[name] || [])];
  notify('*');
}

export function snapshot() {
  const out = {};
  for (const name of STORES) out[name] = list(name).map((r) => ({ ...r }));
  return out;
}

// Ajustes simples (último respaldo, etc.) guardados en la tabla "meta".
export function getMeta(key) { return get('meta', key)?.value ?? null; }
export function setMeta(key, value) { return save('meta', { id: key, value }); }

export function subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); }
function notify(store) { for (const fn of listeners) fn(store); }

// Pide al navegador que no borre los datos automáticamente (si lo permite).
let persistAsked = false;
export async function requestPersistence() {
  if (persistAsked || !navigator.storage?.persist) return null;
  persistAsked = true;
  try { return await navigator.storage.persist(); } catch { return null; }
}
