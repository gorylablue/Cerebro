// Paneles de la pantalla principal: operaciones abiertas y calendario económico.

import * as store from '../data/store.js';
import { esc, fmtDateTime } from '../logic/util.js';
import { icon, withSave } from './components.js';
import { openTradeEditor } from './dept-trading.js';

// ---------- Operaciones abiertas ----------
// Solo muestra lo que guardaste en el diario: no hay precios actuales ni ganancias flotantes.

const num = (v) => (typeof v === 'number' && isFinite(v) ? String(v) : null);

export function elapsed(iso, now = Date.now()) {
  if (!iso) return '';
  const mins = Math.floor((now - new Date(iso)) / 60000);
  if (isNaN(mins)) return '';
  if (mins < 0) return `programada para ${fmtDateTime(iso)}`;
  if (mins < 1) return 'abierta hace menos de 1 min';
  if (mins < 60) return `abierta hace ${mins} min`;
  const h = Math.floor(mins / 60), m = mins % 60;
  if (h < 24) return `abierta hace ${h} h${m ? ` ${m} min` : ''}`;
  const d = Math.floor(h / 24), hh = h % 24;
  return `abierta hace ${d} ${d === 1 ? 'día' : 'días'}${hh ? ` ${hh} h` : ''}`;
}

export function openTrades() {
  return store.list('trades').filter((t) => t.status === 'abierta')
    .sort((a, b) => (b.openedAt || b.createdAt || '').localeCompare(a.openedAt || a.createdAt || ''));
}

export function renderOpenTrades(el) {
  const list = openTrades();
  el.innerHTML = `
    <header class="hud-head">
      <span class="hud-title"><i class="hud-dot" style="--c:#f2b544"></i>Operaciones abiertas</span>
      <span class="hud-count">${list.length}</span>
    </header>
    ${list.length ? `<ul class="ot-list">${list.map((t) => {
      const levels = [['Entrada', num(t.entry)], ['SL', num(t.stop)], ['TP', num(t.target)]].filter(([, v]) => v !== null);
      return `<li><button class="ot-item" data-open-trade="${esc(t.id)}">
        <span class="ot-top"><b>${esc(t.instrument || 'Sin instrumento')}</b>
          ${t.direction ? `<span class="dir dir-${esc(t.direction)}">${t.direction === 'venta' ? 'Venta' : 'Compra'}</span>` : ''}
          ${t.setup ? `<span class="ot-setup">${esc(t.setup)}</span>` : ''}</span>
        ${levels.length ? `<span class="ot-levels">${levels.map(([k, v]) => `<span>${k} <b>${esc(v)}</b></span>`).join('')}</span>` : '<span class="ot-levels muted">Sin precios registrados</span>'}
        <span class="ot-time" data-since="${esc(t.openedAt || '')}">${esc(elapsed(t.openedAt))}</span>
      </button></li>`;
    }).join('')}</ul>`
    : `<div class="hud-empty"><p>No tienes operaciones abiertas.</p><button class="btn btn-small" data-new-open>${icon('plus')} Registrar una abierta</button></div>`}`;
  el.querySelectorAll('[data-open-trade]').forEach((b) => b.onclick = () => { location.hash = `#/dept/trading/diario/${b.dataset.openTrade}`; });
  const nb = el.querySelector('[data-new-open]');
  if (nb) nb.onclick = () => openTradeEditor(null, { status: 'abierta' });
}

// Actualiza solo los tiempos transcurridos (cada minuto).
export function tickOpenTrades(el) {
  el.querySelectorAll('[data-since]').forEach((s) => { s.textContent = elapsed(s.dataset.since); });
}

// ---------- Calendario económico (widget oficial de TradingView) ----------
// La app no recibe los datos: TradingView los muestra dentro de su propio recuadro (iframe).
// Si no hay internet o el widget no carga, se muestra un mensaje; nunca eventos inventados.

const TV_SRC = 'https://s3.tradingview.com/external-embedding/embed-widget-events.js';
export const CURRENCIES = [
  ['USD', 'us'], ['EUR', 'eu,de'], ['GBP', 'gb'], ['JPY', 'jp'], ['CAD', 'ca'],
  ['AUD', 'au'], ['NZD', 'nz'], ['CHF', 'ch'], ['CNY', 'cn'],
];
const IMPACTS = { high: { label: 'Alto impacto', filter: '1' }, mid: { label: 'Alto y medio', filter: '0,1' }, all: { label: 'Todos', filter: '-1,0,1' } };
const INDEX_USD = ['NQ', 'ES', 'YM', 'RTY', 'US30', 'US100', 'NAS', 'SPX', 'SP500', 'GC', 'CL', 'SI', 'MNQ', 'MES', 'BTC', 'ETH'];

// Monedas sugeridas a partir de los instrumentos que registras (EURUSD → EUR y USD; NQ → USD).
export function suggestedCurrencies() {
  const found = new Set();
  for (const t of store.list('trades')) {
    const s = String(t.instrument || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
    for (const [c] of CURRENCIES) if (s.includes(c)) found.add(c);
    if (s.startsWith('XAU') || s.startsWith('XAG') || INDEX_USD.some((p) => s.startsWith(p))) found.add('USD');
  }
  if (!found.size) found.add('USD');
  return CURRENCIES.map(([c]) => c).filter((c) => found.has(c));
}

function prefs() {
  const p = store.getMeta('calendarPrefs');
  return { currencies: p?.currencies?.length ? p.currencies : suggestedCurrencies(), impact: p?.impact || 'high', custom: !!p };
}

export function calendarConfig(p) {
  const countries = p.currencies.map((c) => CURRENCIES.find(([k]) => k === c)?.[1]).filter(Boolean).join(',');
  return {
    colorTheme: 'dark', isTransparent: true, width: '100%', height: '100%', locale: 'es',
    importanceFilter: IMPACTS[p.impact]?.filter || '1', countryFilter: countries || 'us',
  };
}

let calOpen = null;
export function renderCalendar(el, { startOpen = false } = {}) {
  if (calOpen === null) calOpen = startOpen;
  const p = prefs();
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'local';
  el.innerHTML = `
    <header class="hud-head">
      <button class="hud-toggle" data-cal-toggle aria-expanded="${calOpen}">
        <span class="hud-title"><i class="hud-dot" style="--c:#ff5a6a"></i>Calendario económico</span>
        <span class="hud-sub">${esc(IMPACTS[p.impact].label)} · ${esc(p.currencies.join(', '))}</span>
      </button>
      ${calOpen ? `<button class="icon-btn hud-gear" data-cal-prefs aria-label="Ajustes del calendario">${icon('edit')}</button>` : ''}
      <button class="icon-btn" data-cal-toggle aria-label="${calOpen ? 'Ocultar' : 'Mostrar'} calendario">${icon(calOpen ? 'x' : 'chevron')}</button>
    </header>
    ${calOpen ? `
      <div class="cal-prefs" hidden>
        <p class="hud-label">Monedas</p>
        <div class="chips">${CURRENCIES.map(([c]) => `<button class="fchip ${p.currencies.includes(c) ? 'on' : ''}" data-cur="${c}">${c}</button>`).join('')}</div>
        <p class="hud-label">Impacto</p>
        <div class="chips">${Object.entries(IMPACTS).map(([k, v]) => `<button class="fchip ${p.impact === k ? 'on' : ''}" data-imp="${k}">${v.label}</button>`).join('')}</div>
        ${!p.custom ? '<p class="hud-note">Monedas sugeridas a partir de los instrumentos de tu diario.</p>' : ''}
      </div>
      <div class="tv-box" data-tv></div>
      <p class="hud-note">Datos y horarios de <a href="https://www.tradingview.com/economic-calendar/" target="_blank" rel="noopener">TradingView</a>. Zona horaria de este dispositivo: ${esc(tz)}.</p>` : ''}`;

  el.querySelectorAll('[data-cal-toggle]').forEach((b) => b.onclick = () => { calOpen = !calOpen; renderCalendar(el); });
  if (!calOpen) return;
  const prefsEl = el.querySelector('.cal-prefs');
  el.querySelector('[data-cal-prefs]').onclick = () => { prefsEl.hidden = !prefsEl.hidden; };
  const savePrefs = async (next) => {
    if (!next.currencies.length) return;
    if (await withSave(() => store.setMeta('calendarPrefs', { currencies: next.currencies, impact: next.impact }), null)) renderCalendar(el);
  };
  el.querySelectorAll('[data-cur]').forEach((b) => b.onclick = () => {
    const c = b.dataset.cur;
    const cur = p.currencies.includes(c) ? p.currencies.filter((x) => x !== c) : [...p.currencies, c];
    savePrefs({ ...p, currencies: CURRENCIES.map(([k]) => k).filter((k) => cur.includes(k)) });
  });
  el.querySelectorAll('[data-imp]').forEach((b) => b.onclick = () => savePrefs({ ...p, impact: b.dataset.imp }));
  mountWidget(el.querySelector('[data-tv]'), calendarConfig(p));
}

function mountWidget(box, config) {
  if (!navigator.onLine) {
    box.innerHTML = '<div class="hud-empty"><p>Sin conexión a internet.</p><p class="muted small">El calendario se carga desde TradingView cuando hay conexión.</p></div>';
    return;
  }
  box.innerHTML = '<div class="tv-loading">Cargando calendario…</div>';
  const wrap = document.createElement('div');
  wrap.className = 'tradingview-widget-container';
  wrap.innerHTML = '<div class="tradingview-widget-container__widget"></div>';
  const s = document.createElement('script');
  s.src = TV_SRC;
  s.async = true;
  s.textContent = JSON.stringify(config);
  const fail = () => {
    box.innerHTML = `<div class="hud-empty"><p>No se pudo cargar el calendario.</p><p class="muted small">Revisa tu conexión o ábrelo directamente en <a href="https://www.tradingview.com/economic-calendar/" target="_blank" rel="noopener">TradingView</a>.</p></div>`;
  };
  s.onerror = fail;
  wrap.appendChild(s);
  box.appendChild(wrap);
  // Si en 15 s no apareció el recuadro de TradingView, se informa en lugar de dejar el panel vacío.
  setTimeout(() => {
    if (!box.isConnected) return;
    if (box.querySelector('iframe')) box.querySelector('.tv-loading')?.remove();
    else if (box.querySelector('.tv-loading')) fail();
  }, 15000);
  const obs = new MutationObserver(() => {
    if (box.querySelector('iframe')) { box.querySelector('.tv-loading')?.remove(); obs.disconnect(); }
  });
  obs.observe(box, { childList: true, subtree: true });
}
