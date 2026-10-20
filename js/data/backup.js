// Respaldo y restauración: exportar a JSON (todo) o CSV (por tabla), e importar un JSON.

import * as store from './store.js';
import { STORES } from './db.js';

export const BACKUP_FORMAT = 'el-cerebro-backup';
export const BACKUP_VERSION = 1;

export function buildBackup() {
  return {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    data: store.snapshot(),
  };
}

export function stamp() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}_${p(d.getHours())}${p(d.getMinutes())}`;
}

// Comprueba que un archivo es un respaldo válido antes de tocar nada.
export function validateBackup(obj) {
  if (!obj || typeof obj !== 'object') return 'El archivo no contiene datos válidos.';
  if (obj.format !== BACKUP_FORMAT) return 'Este archivo no es un respaldo de El Cerebro.';
  if (typeof obj.version !== 'number' || obj.version > BACKUP_VERSION) return 'El respaldo es de una versión más nueva de la app.';
  if (!obj.data || typeof obj.data !== 'object') return 'El respaldo no tiene la sección de datos.';
  for (const name of STORES) {
    const arr = obj.data[name];
    if (arr === undefined) continue;
    if (!Array.isArray(arr)) return `La tabla «${name}» tiene un formato incorrecto.`;
    if (arr.some((r) => !r || typeof r !== 'object' || typeof r.id !== 'string' || !r.id)) return `Hay registros sin identificador en «${name}».`;
  }
  return null;
}

export async function restoreBackup(obj) {
  const err = validateBackup(obj);
  if (err) throw new Error(err);
  const data = {};
  for (const name of STORES) data[name] = obj.data[name] || [];
  await store.replaceAll(data);
}

export function countRecords(data) {
  return STORES.filter((s) => s !== 'meta').reduce((n, s) => n + (data[s]?.length || 0), 0);
}

// CSV compatible con Excel y Numbers (incluye BOM para conservar los acentos).
export function toCSV(rows, columns) {
  const cols = columns || [...new Set(rows.flatMap((r) => Object.keys(r)))];
  const cell = (v) => {
    if (v === null || v === undefined) return '';
    const s = typeof v === 'object' ? JSON.stringify(v) : String(v);
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return '﻿' + [cols.join(','), ...rows.map((r) => cols.map((c) => cell(r[c])).join(','))].join('\r\n');
}

// En iPad/iPhone abre el menú Compartir (para "Guardar en Archivos"); si no se puede, descarga el archivo.
export async function deliverFile(filename, text, mime) {
  const blob = new Blob([text], { type: mime });
  try {
    const file = new File([blob], filename, { type: mime });
    if (navigator.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file], title: filename });
      return true;
    }
  } catch (err) {
    if (err?.name === 'AbortError') return false; // El usuario cerró el menú.
    console.warn('Compartir no disponible, se usa descarga', err);
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
  return true;
}
