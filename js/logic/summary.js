// Resúmenes por departamento para la oficina y la barra superior.
// Todo se calcula a partir de tus registros; si no hay datos, se dice claramente.

import * as store from '../data/store.js';
import { computeStats } from './trading.js';
import { todayKey, dayKey, daysUntil, dueLabel } from './util.js';

export const fmtMoney = (v, sign = true) => {
  if (v === null || v === undefined) return '—';
  const s = Math.abs(v).toLocaleString('es-PR', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 });
  return (v < 0 ? '−' : sign && v > 0 ? '+' : '') + s;
};
export const fmtPct = (v) => (v === null || v === undefined ? '—' : `${(v * 100).toFixed(1)}%`);
export const fmtR = (v) => (v === null || v === undefined ? '—' : `${v >= 0 ? '+' : '−'}${Math.abs(v).toFixed(2)}R`);
export const fmtNum = (v, d = 2) => (v === null || v === undefined ? '—' : v.toFixed(d));

const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

export function nextAssignments(limit = 5) {
  return store.list('assignments')
    .filter((a) => a.status !== 'completado' && a.due)
    .sort((a, b) => a.due.localeCompare(b.due))
    .slice(0, limit);
}

export function deptSummaries() {
  const goals = store.list('goals').filter((g) => g.status !== 'completado');
  const goalsOf = (id) => goals.filter((g) => g.dept === id).length;

  // En El Mapa
  const webOpen = store.list('web').filter((w) => ['tarea', 'cambio', 'problema'].includes(w.kind) && w.status !== 'completado').length;
  const postsActive = store.list('posts').filter((p) => p.status && p.status !== 'publicado').length;
  const mapaBits = [];
  if (goalsOf('mapa')) mapaBits.push(plural(goalsOf('mapa'), 'objetivo', 'objetivos'));
  if (webOpen) mapaBits.push(plural(webOpen, 'pendiente web', 'pendientes web'));
  if (postsActive) mapaBits.push(plural(postsActive, 'publicación en curso', 'publicaciones en curso'));

  // Trading
  const trades = store.list('trades');
  const st = computeStats(trades);
  const tradingBits = [];
  if (st.closed) tradingBits.push(plural(st.closed, 'operación cerrada', 'operaciones cerradas'));
  if (st.netProfit !== null) tradingBits.push(`neto ${fmtMoney(st.netProfit)}`);
  if (st.open) tradingBits.push(plural(st.open, 'abierta', 'abiertas'));
  if (!tradingBits.length && goalsOf('trading')) tradingBits.push(plural(goalsOf('trading'), 'objetivo', 'objetivos'));
  const ticker = st.closed
    ? [`CERRADAS ${st.closed}`, `WIN RATE ${fmtPct(st.winRate)}`, `NETO ${fmtMoney(st.netProfit)}`, `EXPECTATIVA ${fmtR(st.expectancyR)}`, `ABIERTAS ${st.open}`].join('   ·   ')
    : 'REGISTRA TU PRIMERA OPERACIÓN PARA VER TUS ESTADÍSTICAS';

  // Universidad
  const pending = store.list('assignments').filter((a) => a.status !== 'completado');
  const next = nextAssignments(1)[0];
  const uniBits = [];
  if (next) uniBits.push(`Próxima: ${next.title} · ${dueLabel(next.due).toLowerCase()}`);
  else if (pending.length) uniBits.push(plural(pending.length, 'asignación pendiente', 'asignaciones pendientes'));
  else if (goalsOf('uni')) uniBits.push(plural(goalsOf('uni'), 'objetivo', 'objetivos'));

  return {
    mapa: { line: mapaBits.join(' · ') || 'Sin registros todavía' },
    trading: { line: tradingBits.join(' · ') || 'Sin operaciones registradas', ticker },
    uni: { line: uniBits.join(' · ') || 'Sin asignaciones registradas', overdue: pending.filter((a) => a.due && daysUntil(a.due) < 0).length },
  };
}

export function topSummary() {
  const today = todayKey();
  const updatesToday = store.list('updates').filter((u) => dayKey(u.at) === today).length;
  const activeGoals = store.list('goals').filter((g) => g.status !== 'completado').length;
  return { updatesToday, activeGoals };
}
