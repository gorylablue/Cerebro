// Departamento de Trading: diario de operaciones y estadísticas.

import * as store from '../data/store.js';
import { DEPTS } from '../config.js';
import { esc, dayKey, todayKey, addDays, fmtDateTime, fmtDay, normalize } from '../logic/util.js';
import { computeStats, groupStats, netResult, tradeR, outcome, plannedRR, tradeDate, monthKey, weekKey } from '../logic/trading.js';
import { fmtMoney, fmtPct, fmtR, fmtNum } from '../logic/summary.js';
import { openEditor, icon, emptyState } from './components.js';

const DIRS = [{ value: 'compra', label: 'Compra (long)' }, { value: 'venta', label: 'Venta (short)' }];
const TSTATUS = [{ value: 'abierta', label: 'Abierta' }, { value: 'cerrada', label: 'Cerrada' }, { value: 'cancelada', label: 'Cancelada' }];
const EMOTIONS = ['Calmado', 'Confiado', 'Ansioso', 'Impaciente', 'Frustrado', 'Eufórico', 'Cansado', 'Con miedo'];
const uniq = (arr) => [...new Set(arr.filter(Boolean))].sort((a, b) => a.localeCompare(b));

function tradeFields() {
  const trades = store.list('trades');
  return [
    { section: 'Operación' },
    { name: 'openedAt', label: 'Fecha y hora de entrada', type: 'datetime', required: true },
    { name: 'instrument', label: 'Instrumento', type: 'text', required: true, placeholder: 'Ej.: EURUSD, NQ, AAPL', datalist: uniq(trades.map((t) => t.instrument)) },
    { name: 'direction', label: 'Dirección', type: 'segmented', options: DIRS },
    { name: 'setup', label: 'Setup / tipo de operación', type: 'text', datalist: uniq(trades.map((t) => t.setup)) },
    { name: 'status', label: 'Estado', type: 'segmented', wide: true, options: TSTATUS },
    { section: 'Precios y tamaño (opcional)' },
    { name: 'entry', label: 'Precio de entrada', type: 'number' },
    { name: 'stop', label: 'Stop loss', type: 'number' },
    { name: 'target', label: 'Take profit', type: 'number' },
    { name: 'exitPrice', label: 'Precio de salida', type: 'number' },
    { name: 'size', label: 'Tamaño de posición', type: 'number', hint: 'Lotes, contratos o acciones.' },
    { section: 'Riesgo y resultado' },
    { name: 'riskAmount', label: 'Riesgo monetario ($)', type: 'number', hint: 'Lo que perderías si toca el stop. Se usa para calcular R.' },
    { name: 'riskPct', label: 'Riesgo porcentual (%)', type: 'number' },
    { name: 'result', label: 'Resultado monetario ($)', type: 'number', hint: 'Ganancia o pérdida real al cerrar. Negativo si perdiste.' },
    { name: 'fees', label: 'Comisiones y costos ($)', type: 'number', hint: 'Se restan del resultado para obtener el neto.' },
    { name: 'rManual', label: 'Resultado en R (manual)', type: 'number', hint: 'Solo se usa si no indicas el riesgo monetario.' },
    { name: 'closedAt', label: 'Fecha y hora de cierre', type: 'datetime' },
    { name: '_calc', label: '', type: 'calc' },
    { section: 'Revisión' },
    { name: 'screenshot', label: 'Captura o referencia de imagen', type: 'text', wide: true, placeholder: 'Enlace (TradingView, iCloud…) o nombre de la imagen' },
    { name: 'reason', label: 'Razón de entrada', type: 'textarea', wide: true },
    { name: 'emotion', label: 'Estado emocional', type: 'text', datalist: EMOTIONS },
    { name: 'rulesFollowed', label: '¿Cumpliste tus reglas?', type: 'tristate' },
    { name: 'mistakes', label: 'Errores cometidos', type: 'textarea', wide: true },
    { name: 'lessons', label: 'Lecciones aprendidas', type: 'textarea', wide: true },
    { name: 'notes', label: 'Notas adicionales', type: 'textarea', wide: true },
  ];
}

export function openTradeEditor(trade = null, extraDefaults = {}) {
  const fields = tradeFields();
  return openEditor({
    store: 'trades',
    title: trade ? 'Editar operación' : 'Registrar operación',
    size: 'wide',
    fields: fields.filter((f) => f.type !== 'calc'),
    record: trade,
    defaults: { openedAt: new Date().toISOString(), direction: 'compra', status: 'cerrada', rulesFollowed: '', ...extraDefaults },
    transform: (v) => ({ ...v, instrument: (v.instrument || '').toUpperCase() }),
    validate: (v) => {
      if (v.riskAmount !== null && v.riskAmount < 0) return 'El riesgo monetario no puede ser negativo.';
      if (v.fees !== null && v.fees < 0) return 'Las comisiones se registran como número positivo.';
      if (v.closedAt && v.openedAt && v.closedAt < v.openedAt) return 'La fecha de cierre es anterior a la de entrada.';
      return null;
    },
    onReady: (form, read) => {
      // Vista previa en vivo del neto y R, con las mismas reglas que las estadísticas.
      const box = document.createElement('div');
      box.className = 'field wide calc-preview';
      form.querySelector('[data-field="closedAt"]').after(box);
      const paint = () => {
        const v = read();
        const net = netResult(v), r = tradeR(v), rr = plannedRR(v);
        box.innerHTML = `<span>Neto: <b class="${net > 0 ? 'pos' : net < 0 ? 'neg' : ''}">${net === null ? 'sin resultado' : fmtMoney(net)}</b></span>
          <span>R: <b>${r === null ? 'no disponible' : fmtR(r)}</b></span>
          <span>R:R planificado: <b>${rr === null ? '—' : `1:${fmtNum(rr)}`}</b></span>`;
      };
      form.addEventListener('input', paint);
      paint();
    },
    okMessage: trade ? 'Operación actualizada' : 'Operación registrada',
    deleteMessage: '¿Eliminar esta operación? Las estadísticas se recalcularán.',
  });
}

// ---------- Diario ----------
const jf = { from: '', to: '', instrument: '', direction: '', setup: '', result: '' };

function filterTrades(trades) {
  return trades.filter((t) => {
    const k = dayKey(tradeDate(t) || t.createdAt);
    if (jf.from && k < jf.from) return false;
    if (jf.to && k > jf.to) return false;
    if (jf.instrument && t.instrument !== jf.instrument) return false;
    if (jf.direction && t.direction !== jf.direction) return false;
    if (jf.setup && normalize(t.setup) !== normalize(jf.setup)) return false;
    if (jf.result) {
      const o = outcome(t);
      if (jf.result === 'abierta' && t.status !== 'abierta') return false;
      if (jf.result === 'cancelada' && t.status !== 'cancelada') return false;
      if (['win', 'loss', 'be'].includes(jf.result) && (t.status !== 'cerrada' || o !== jf.result)) return false;
      if (jf.result === 'sin' && !(t.status === 'cerrada' && o === null)) return false;
    }
    return true;
  });
}

function tradeRow(t) {
  const net = netResult(t);
  const r = tradeR(t);
  const o = t.status === 'cerrada' ? outcome(t) : null;
  const statusTag = t.status === 'abierta' ? '<span class="tag tag-open">Abierta</span>'
    : t.status === 'cancelada' ? '<span class="tag">Cancelada</span>'
      : o === null ? '<span class="tag tag-warn">Sin resultado</span>'
        : o === 'be' ? '<span class="tag">Break-even</span>' : '';
  return `<li><button class="trade-row ${o ? `o-${o}` : ''}" data-trade="${esc(t.id)}">
    <span class="tr-main">
      <span class="tr-top"><b class="tr-inst">${esc(t.instrument || '—')}</b>
        <span class="dir dir-${esc(t.direction || '')}">${t.direction === 'venta' ? 'Venta' : t.direction === 'compra' ? 'Compra' : ''}</span>
        ${t.setup ? `<span class="tag">${esc(t.setup)}</span>` : ''}${statusTag}</span>
      <span class="tr-date">${esc(fmtDateTime(t.openedAt))}${t.rulesFollowed === 'no' ? ' · <span class="neg">reglas incumplidas</span>' : ''}</span>
    </span>
    <span class="tr-res">
      <b class="${net > 0 ? 'pos' : net < 0 ? 'neg' : ''}">${t.status === 'cerrada' && net !== null ? fmtMoney(net) : ''}</b>
      <small>${t.status === 'cerrada' && r !== null ? fmtR(r) : ''}</small>
    </span>
  </button></li>`;
}

function renderJournal(el) {
  const all = store.list('trades');
  const list = filterTrades(all).sort((a, b) => (tradeDate(b) || '').localeCompare(tradeDate(a) || ''));
  const sel = (key, label, opts) => `<label class="mini-field"><span>${label}</span><select data-jf="${key}"><option value="">Todos</option>${opts.map((o) => `<option value="${esc(o.value ?? o)}" ${String(jf[key]) === String(o.value ?? o) ? 'selected' : ''}>${esc(o.label ?? o)}</option>`).join('')}</select></label>`;
  const active = Object.values(jf).some(Boolean);
  const open = all.filter((t) => t.status === 'abierta').sort((a, b) => (b.openedAt || '').localeCompare(a.openedAt || ''));
  el.innerHTML = `
    <section class="card open-block">
      <h2>Operaciones abiertas <span class="muted">(${open.length})</span></h2>
      ${open.length ? `<ul class="trade-list">${open.map(tradeRow).join('')}</ul>` : '<p class="muted">No tienes operaciones abiertas.</p>'}
    </section>
    <div class="toolbar">
      <button class="btn btn-primary btn-lg" data-new-trade>${icon('plus')} Registrar operación</button>
    </div>
    ${all.length ? `<h3 class="section-title">Historial</h3>` : ''}
    ${all.length ? `<div class="filter-grid">
      <label class="mini-field"><span>Desde</span><input type="date" data-jf="from" value="${esc(jf.from)}"></label>
      <label class="mini-field"><span>Hasta</span><input type="date" data-jf="to" value="${esc(jf.to)}"></label>
      ${sel('instrument', 'Instrumento', uniq(all.map((t) => t.instrument)))}
      ${sel('direction', 'Dirección', [{ value: 'compra', label: 'Compra' }, { value: 'venta', label: 'Venta' }])}
      ${sel('setup', 'Setup', uniq(all.map((t) => t.setup)))}
      ${sel('result', 'Resultado', [{ value: 'win', label: 'Ganadoras' }, { value: 'loss', label: 'Perdedoras' }, { value: 'be', label: 'Break-even' }, { value: 'sin', label: 'Cerradas sin resultado' }, { value: 'abierta', label: 'Abiertas' }, { value: 'cancelada', label: 'Canceladas' }])}
      ${active ? '<button class="btn btn-ghost btn-small" data-clear>Quitar filtros</button>' : ''}
    </div>` : ''}
    ${!all.length ? emptyState('Tu diario está vacío', 'Registra tu primera operación para comenzar a ver tus estadísticas.')
    : !list.length ? emptyState('Sin operaciones con estos filtros', '')
      : `<p class="result-count">${list.length} de ${all.length} operaciones</p><ul class="trade-list">${list.map(tradeRow).join('')}</ul>`}`;

  el.querySelector('[data-new-trade]').onclick = () => openTradeEditor();
  el.querySelectorAll('[data-trade]').forEach((b) => b.onclick = () => openTradeEditor(store.get('trades', b.dataset.trade)));
  el.querySelectorAll('[data-jf]').forEach((i) => i.onchange = () => { jf[i.dataset.jf] = i.value; renderJournal(el); });
  const clear = el.querySelector('[data-clear]');
  if (clear) clear.onclick = () => { Object.keys(jf).forEach((k) => { jf[k] = ''; }); renderJournal(el); };
}

// ---------- Estadísticas ----------
const sf = { period: 'todo', group: 'month' };

function periodFilter(t) {
  const k = dayKey(tradeDate(t) || t.createdAt);
  const today = todayKey();
  if (sf.period === 'mes') return k.slice(0, 7) === today.slice(0, 7);
  if (sf.period === '30') return k >= addDays(today, -29);
  if (sf.period === 'ano') return k.slice(0, 4) === today.slice(0, 4);
  return true;
}

function kpi(label, value, def, cls = '') {
  return `<div class="kpi"><span class="kpi-label">${esc(label)}</span><b class="kpi-value ${cls}">${value}</b>${def ? `<small>${esc(def)}</small>` : ''}</div>`;
}
const signCls = (v) => (v > 0 ? 'pos' : v < 0 ? 'neg' : '');

function groupTable(rows, label) {
  if (!rows.length) return '';
  rows.sort((a, b) => (b.net ?? -Infinity) - (a.net ?? -Infinity));
  return `<div class="table-wrap"><table class="data-table">
    <thead><tr><th>${esc(label)}</th><th>Cerradas</th><th>G / P / BE</th><th>Win rate</th><th>Neto</th><th>Expectativa R</th></tr></thead>
    <tbody>${rows.map((g) => `<tr>
      <td>${esc(g.key)}</td><td>${g.n}${g.missing ? ` <small class="muted">(${g.missing} sin resultado)</small>` : ''}</td>
      <td>${g.wins} / ${g.losses} / ${g.be}</td><td>${fmtPct(g.winRate)}</td>
      <td class="${signCls(g.net)}">${fmtMoney(g.net)}</td><td>${fmtR(g.expectancyR)}</td></tr>`).join('')}</tbody>
  </table></div>`;
}

function periodLabel(key) {
  if (!key || key === 'Sin especificar') return 'Sin fecha';
  if (sf.group === 'month') {
    const [y, m] = key.split('-').map(Number);
    const s = new Date(y, m - 1, 1).toLocaleDateString('es-PR', { month: 'long', year: 'numeric' });
    return s.charAt(0).toUpperCase() + s.slice(1);
  }
  return `Semana del ${fmtDay(key, { day: 'numeric', month: 'short', year: 'numeric' })}`;
}

function renderStats(el) {
  const trades = store.list('trades').filter(periodFilter);
  const s = computeStats(trades);
  const chip = (key, val, label) => `<button class="fchip ${sf[key] === val ? 'on' : ''}" data-sf="${key}" data-val="${val}">${label}</button>`;
  let body;
  if (!store.list('trades').length) {
    body = emptyState('Sin datos todavía', 'Registra tu primera operación para comenzar a ver tus estadísticas.');
  } else if (!s.closed) {
    body = emptyState('No hay operaciones cerradas en este período', s.open ? `Tienes ${s.open} abierta(s). Las estadísticas solo usan operaciones cerradas.` : '');
  } else {
    const periodRows = groupStats(trades, sf.group === 'month' ? monthKey : weekKey)
      .sort((a, b) => b.key.localeCompare(a.key)).map((g) => ({ ...g, key: periodLabel(g.key) }));
    body = `
      ${s.missingResult ? `<div class="notice notice-warn">${s.missingResult} operación(es) cerrada(s) no tienen resultado registrado y no se incluyen en las cifras monetarias.</div>` : ''}
      <div class="kpi-grid">
        ${kpi('Cerradas', s.closed, s.open || s.cancelled ? `${s.open} abiertas · ${s.cancelled} canceladas (excluidas)` : '')}
        ${kpi('Ganadoras', s.wins, '', 'pos')}
        ${kpi('Perdedoras', s.losses, '', 'neg')}
        ${kpi('Break-even', s.be, 'Resultado neto = 0')}
        ${kpi('Win rate', fmtPct(s.winRate), 'Ganadoras ÷ (ganadoras + perdedoras)')}
        ${kpi('Ganancia neta', fmtMoney(s.netProfit), s.fees ? `Incluye −${fmtMoney(s.fees, false)} en comisiones` : 'Resultado − comisiones', signCls(s.netProfit))}
        ${kpi('Ganancia bruta', fmtMoney(s.grossProfit), 'Suma de las ganadoras', 'pos')}
        ${kpi('Pérdida bruta', fmtMoney(s.grossLoss), 'Suma de las perdedoras', 'neg')}
        ${kpi('Promedio de ganancias', fmtMoney(s.avgWin), s.avgWinR !== null ? `${fmtR(s.avgWinR)} de media` : '')}
        ${kpi('Promedio de pérdidas', fmtMoney(s.avgLoss), s.avgLossR !== null ? `${fmtR(s.avgLossR)} de media` : '')}
        ${kpi('R:R realizado', s.payoff === null ? '—' : `1:${fmtNum(s.payoff)}`, 'Ganancia media ÷ |pérdida media|')}
        ${kpi('Profit factor', s.profitFactor === null ? '—' : fmtNum(s.profitFactor), 'Ganancia bruta ÷ |pérdida bruta|')}
        ${kpi('Expectativa ($)', fmtMoney(s.expectancy), 'Neto medio por operación cerrada', signCls(s.expectancy))}
        ${kpi('Expectativa (R)', fmtR(s.expectancyR), s.rCount < s.closed ? `R disponible en ${s.rCount} de ${s.closed}` : 'R medio por operación', signCls(s.expectancyR))}
        ${kpi('R total', fmtR(s.totalR), '', signCls(s.totalR))}
      </div>
      <h3 class="section-title">Por instrumento</h3>${groupTable(groupStats(trades, (t) => t.instrument), 'Instrumento')}
      <h3 class="section-title">Por setup</h3>${groupTable(groupStats(trades, (t) => t.setup), 'Setup')}
      <h3 class="section-title">Por período <span class="chips inline">${chip('group', 'month', 'Mes')}${chip('group', 'week', 'Semana')}</span></h3>
      <div class="table-wrap"><table class="data-table">
        <thead><tr><th>Período</th><th>Cerradas</th><th>G / P / BE</th><th>Win rate</th><th>Neto</th><th>Expectativa R</th></tr></thead>
        <tbody>${periodRows.map((g) => `<tr><td>${esc(g.key)}</td><td>${g.n}</td><td>${g.wins} / ${g.losses} / ${g.be}</td><td>${fmtPct(g.winRate)}</td><td class="${signCls(g.net)}">${fmtMoney(g.net)}</td><td>${fmtR(g.expectancyR)}</td></tr>`).join('')}</tbody>
      </table></div>`;
  }
  el.innerHTML = `
    <div class="chips stats-period">${chip('period', 'todo', 'Todo')}${chip('period', 'mes', 'Este mes')}${chip('period', '30', 'Últimos 30 días')}${chip('period', 'ano', 'Este año')}</div>
    ${body}
    <details class="defs card">
      <summary>Cómo se calcula cada métrica</summary>
      <ul>
        <li>Solo se usan operaciones <b>cerradas</b>. Las abiertas y canceladas se excluyen.</li>
        <li><b>Resultado neto</b> = resultado registrado − comisiones. Si no registraste el resultado, la operación no entra en las cifras.</li>
        <li><b>Ganadora</b>: neto mayor que 0 · <b>Perdedora</b>: menor que 0 · <b>Break-even</b>: igual a 0.</li>
        <li><b>Win rate</b> = ganadoras ÷ (ganadoras + perdedoras). El break-even se muestra aparte.</li>
        <li><b>R</b> = resultado neto ÷ riesgo monetario inicial. Sin riesgo monetario, se usa el R que registraste a mano; si no hay ninguno, R no está disponible.</li>
        <li>El precio de entrada, el stop y el take profit no se usan para calcular resultados reales.</li>
      </ul>
    </details>`;
  el.querySelectorAll('[data-sf]').forEach((b) => b.onclick = () => { sf[b.dataset.sf] = b.dataset.val; renderStats(el); });
}

export function tradingTabs() {
  return [
    { id: 'diario', label: 'Diario', render: renderJournal },
    { id: 'estadisticas', label: 'Estadísticas', render: renderStats },
  ];
}

export { DEPTS };
