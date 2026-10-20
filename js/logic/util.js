// Utilidades generales: identificadores, fechas y texto seguro.

export function uid() {
  if (crypto?.randomUUID) return crypto.randomUUID();
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
}

// Escapa texto antes de insertarlo en HTML (evita que un texto rompa la página).
export function esc(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

const pad = (n) => String(n).padStart(2, '0');

// Fecha local en formato AAAA-MM-DD (sin desfase de zona horaria).
export function dayKey(date = new Date()) {
  const d = date instanceof Date ? date : new Date(date);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function todayKey() { return dayKey(new Date()); }

export function addDays(key, n) {
  const [y, m, d] = key.split('-').map(Number);
  return dayKey(new Date(y, m - 1, d + n));
}

// Convierte "AAAA-MM-DD" en Date local a mediodía (evita saltos de día).
export function parseDay(key) {
  if (!key) return null;
  const [y, m, d] = key.split('-').map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d, 12);
}

// Días desde hoy hasta la fecha (negativo = vencida).
export function daysUntil(key) {
  const target = parseDay(key);
  if (!target) return null;
  const today = parseDay(todayKey());
  return Math.round((target - today) / 86400000);
}

const LOCALE = 'es-PR';

export function fmtDay(key, opts = { day: 'numeric', month: 'short' }) {
  const d = parseDay(key);
  return d ? d.toLocaleDateString(LOCALE, opts) : '';
}

export function fmtDayLong(key) {
  return fmtDay(key, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

export function fmtTime(iso) {
  return new Date(iso).toLocaleTimeString(LOCALE, { hour: 'numeric', minute: '2-digit' });
}

export function fmtDateTime(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleString(LOCALE, { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' });
}

// "Hoy", "Ayer", o fecha larga.
export function dayHeading(key) {
  const t = todayKey();
  if (key === t) return 'Hoy';
  if (key === addDays(t, -1)) return 'Ayer';
  const s = fmtDay(key, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// Etiqueta corta para una fecha límite.
export function dueLabel(key) {
  const n = daysUntil(key);
  if (n === null) return '';
  if (n < 0) return n === -1 ? 'Venció ayer' : `Venció hace ${-n} días`;
  if (n === 0) return 'Vence hoy';
  if (n === 1) return 'Vence mañana';
  if (n <= 7) return `En ${n} días`;
  return fmtDay(key);
}

export function dueClass(key) {
  const n = daysUntil(key);
  if (n === null) return '';
  if (n < 0) return 'due-over';
  if (n <= 2) return 'due-soon';
  return '';
}

// Valor de <input type="datetime-local"> a partir de un ISO (hora local).
export function toLocalInput(iso) {
  const d = iso ? new Date(iso) : new Date();
  return `${dayKey(d)}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function fromLocalInput(value) {
  if (!value) return null;
  const d = new Date(value);
  return isNaN(d) ? null : d.toISOString();
}

export function relativeTime(iso) {
  if (!iso) return '';
  const mins = Math.round((Date.now() - new Date(iso)) / 60000);
  if (mins < 1) return 'ahora';
  if (mins < 60) return `hace ${mins} min`;
  const h = Math.round(mins / 60);
  if (h < 24) return `hace ${h} h`;
  const d = Math.round(h / 24);
  return d === 1 ? 'ayer' : `hace ${d} días`;
}

export function normalize(s) {
  return String(s ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}
