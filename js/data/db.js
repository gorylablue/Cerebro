// Acceso de bajo nivel a IndexedDB.
// Es el ÚNICO archivo que habla directamente con el almacenamiento del navegador.
// Si en el futuro cambiamos a Supabase, se reemplaza esta capa y el resto de la app sigue igual.

const DB_NAME = 'cerebro';
const DB_VERSION = 1;

// Una "tabla" (object store) por tipo de registro.
export const STORES = [
  'goals',       // Objetivos principales
  'updates',     // UPDATE / Daily Log
  'trades',      // Diario de trading
  'web',         // En El Mapa · Página web (tareas, cambios, problemas, ideas, notas)
  'learning',    // En El Mapa · Aprendizaje
  'posts',       // En El Mapa · Contenido y redes
  'courses',     // Universidad · Cursos
  'assignments', // Universidad · Asignaciones, exámenes, proyectos
  'meta',        // Ajustes internos (último respaldo, etc.)
];

let dbPromise = null;

function openDb() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    if (!('indexedDB' in window)) {
      reject(new Error('Este navegador no permite guardar datos (IndexedDB no disponible).'));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      for (const name of STORES) {
        if (!db.objectStoreNames.contains(name)) db.createObjectStore(name, { keyPath: 'id' });
      }
    };
    req.onsuccess = () => {
      const db = req.result;
      db.onversionchange = () => { db.close(); dbPromise = null; };
      resolve(db);
    };
    req.onerror = () => reject(req.error || new Error('No se pudo abrir la base de datos.'));
    req.onblocked = () => reject(new Error('La base de datos está bloqueada. Cierra otras ventanas de El Cerebro.'));
  });
  dbPromise.catch(() => { dbPromise = null; });
  return dbPromise;
}

// Ejecuta una transacción y resuelve SOLO cuando el navegador confirma que se escribió.
function run(storeNames, mode, work) {
  return openDb().then((db) => new Promise((resolve, reject) => {
    let tx;
    try { tx = db.transaction(storeNames, mode); }
    catch (e) { reject(e); return; }
    let result;
    const out = work(tx, (r) => { result = r; });
    if (out && 'onsuccess' in out) out.onsuccess = () => { result = out.result; };
    tx.oncomplete = () => resolve(result);
    tx.onerror = () => reject(tx.error || new Error('Error al guardar.'));
    tx.onabort = () => reject(tx.error || new Error('La operación se canceló (¿almacenamiento lleno?).'));
  }));
}

export const db = {
  all: (store) => run(store, 'readonly', (tx) => tx.objectStore(store).getAll()),
  put: (store, record) => run(store, 'readwrite', (tx) => tx.objectStore(store).put(record)),
  remove: (store, id) => run(store, 'readwrite', (tx) => tx.objectStore(store).delete(id)),

  // Reemplaza TODO el contenido (para restaurar un respaldo) en una sola transacción:
  // o se restaura todo, o no cambia nada.
  replaceAll: (data) => run(STORES, 'readwrite', (tx) => {
    for (const name of STORES) {
      const st = tx.objectStore(name);
      st.clear();
      for (const rec of (data[name] || [])) st.put(rec);
    }
  }),
};
