// Paneles de las pizarras de Trading: OPERACIONES ABIERTAS, CALENDARIO y GRÁFICA.
// En pantallas grandes en horizontal aparecen flotando junto a la pizarra tocada;
// en iPad vertical y teléfono, como hoja inferior que se cierra deslizando hacia abajo.

import * as store from '../data/store.js';
import { esc } from '../logic/util.js';
import { icon } from './components.js';
import { renderOpenTrades, tickOpenTrades, renderCalendar, openTrades } from './hud.js';
import { openTradeEditor } from './dept-trading.js';
import { dismissGesture, clearDrag } from './motion.js';

const META = {
  trades: { title: 'Operaciones abiertas', color: '#39d0ff', width: 380 },
  calendar: { title: 'Calendario económico', color: '#f2b544', width: 420 },
  chart: { title: 'Gráfica en TradingView', color: '#3fd68b', width: 360 },
};

// ---------- Gráfica: símbolos de TradingView ----------
const FUTURES = { NQ: 'CME_MINI:NQ1!', MNQ: 'CME_MINI:MNQ1!', ES: 'CME_MINI:ES1!', MES: 'CME_MINI:MES1!', YM: 'CBOT_MINI:YM1!', RTY: 'CME_MINI:RTY1!', GC: 'COMEX:GC1!', MGC: 'COMEX:MGC1!', CL: 'NYMEX:CL1!', SI: 'COMEX:SI1!' };
const FX = ['USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD', 'NZD', 'CHF'];
const DEFAULTS = ['EURUSD', 'GBPUSD', 'USDJPY', 'XAUUSD', 'NQ'];

export function tvSymbol(raw) {
  const s = String(raw || '').toUpperCase().replace(/\s+/g, '');
  if (!s) return '';
  if (s.includes(':')) return s;
  if (FUTURES[s]) return FUTURES[s];
  if (/^XA[UG]USD$/.test(s)) return `OANDA:${s}`;
  if (/^[A-Z]{6}$/.test(s) && FX.includes(s.slice(0, 3)) && FX.includes(s.slice(3))) return `FX:${s}`;
  return s;
}
export const chartUrl = (raw) => `https://www.tradingview.com/chart/?symbol=${encodeURIComponent(tvSymbol(raw))}`;

// Símbolos de tu diario (los más recientes primero) y después algunos habituales.
export function chartSymbols() {
  const mine = [];
  for (const t of [...store.list('trades')].sort((a, b) => (b.openedAt || b.createdAt || '').localeCompare(a.openedAt || a.createdAt || ''))) {
    const s = String(t.instrument || '').toUpperCase().trim();
    if (s && !mine.includes(s)) mine.push(s);
  }
  const rest = DEFAULTS.filter((s) => !mine.includes(s));
  return { mine: mine.slice(0, 6), rest };
}

function renderChart(el) {
  const { mine, rest } = chartSymbols();
  const pill = (s, own) => `<a class="pair ${own ? 'own' : ''}" href="${esc(chartUrl(s))}" target="_blank" rel="noopener">${esc(s)}${own ? '<small>de tu diario</small>' : ''}</a>`;
  el.innerHTML = `
    <div class="pairs">${mine.map((s) => pill(s, true)).join('')}${rest.map((s) => pill(s, false)).join('')}</div>
    <form class="pair-form" data-pair-form>
      <input type="text" name="sym" placeholder="Otro símbolo (ej. AUDUSD)" autocapitalize="characters" autocomplete="off" aria-label="Otro símbolo">
      <button class="btn btn-primary" type="submit">Abrir</button>
    </form>
    <p class="hud-note">Se abre la gráfica en Safari, o en la app de TradingView si la tienes instalada.</p>`;
  el.querySelector('[data-pair-form]').onsubmit = (e) => {
    e.preventDefault();
    const v = e.target.elements.sym.value.trim();
    if (v) window.open(chartUrl(v), '_blank', 'noopener');
  };
}

function renderTrades(el) {
  el.innerHTML = '<div data-ot></div>';
  renderOpenTrades(el.querySelector('[data-ot]'));
  const n = openTrades().length;
  el.insertAdjacentHTML('beforeend', `
    ${n ? '<p class="hud-note">Precio actual y P/L flotante: no disponibles, porque la app no tiene una fuente de precios conectada.</p>' : ''}
    <div class="bp-actions">
      <a class="btn" href="#/dept/trading">Ver en Trading</a>
      <button class="btn btn-primary" data-bp-new>${icon('plus')} Registrar operación</button>
    </div>`);
  el.querySelector('[data-bp-new]').onclick = () => openTradeEditor(null, { status: 'abierta' });
}

// ---------- Panel ----------
export function createBoardPanel(root) {
  const wrap = document.createElement('div');
  wrap.className = 'bp-layer';
  wrap.hidden = true;
  wrap.innerHTML = `<div class="bp-scrim" data-bp-close></div>
    <section class="bp" role="dialog" aria-modal="true">
      <span class="bp-grab" aria-hidden="true"></span>
      <header class="bp-head">
        <span class="bp-title"><i></i><span></span></span>
        <button class="icon-btn" data-bp-close aria-label="Cerrar">${icon('x')}</button>
      </header>
      <div class="bp-body"></div>
    </section>
    <span class="bp-arrow" aria-hidden="true"></span>`;
  root.appendChild(wrap);
  const bp = wrap.querySelector('.bp');
  const body = wrap.querySelector('.bp-body');
  const arrow = wrap.querySelector('.bp-arrow');
  let kind = null;
  let anchor = null;
  let tick = null;
  const sheetMode = matchMedia('(orientation: portrait), (max-width: 699px)');

  const draw = () => {
    if (kind === 'trades') renderTrades(body);
    else if (kind === 'calendar') renderCalendar(body, { docked: true });
    else if (kind === 'chart') renderChart(body);
  };

  function place() {
    const sheet = sheetMode.matches || !anchor;
    wrap.classList.toggle('sheet', sheet);
    bp.style.left = bp.style.top = bp.style.width = '';
    arrow.hidden = true;
    if (sheet) return;
    const R = root.getBoundingClientRect();
    const a = { x: anchor.left - R.left, y: anchor.top - R.top, w: anchor.width, h: anchor.height };
    const W = Math.min(META[kind].width, R.width - 24);
    const H = Math.min(bp.offsetHeight || 400, R.height - 24);
    const gap = 16;
    const rightRoom = R.width - (a.x + a.w) - gap - 12;
    const right = rightRoom >= W || rightRoom > a.x;
    let left = right ? a.x + a.w + gap : a.x - gap - W;
    left = Math.max(12, Math.min(left, R.width - W - 12));
    let top = a.y - 10;
    top = Math.max(12, Math.min(top, R.height - H - 12));
    bp.style.width = `${W}px`;
    bp.style.left = `${left}px`;
    bp.style.top = `${top}px`;
    const ay = a.y + a.h / 2 - 8;
    if (ay > top + 16 && ay < top + H - 24) {
      arrow.hidden = false;
      arrow.style.setProperty('--c', META[kind].color);
      arrow.style.top = `${ay}px`;
      arrow.style.left = `${right ? left - 8 : left + W - 8}px`;
      arrow.classList.toggle('to-right', !right);
    }
  }

  function open(k, rect) {
    kind = k;
    anchor = rect || null;
    const m = META[k];
    bp.style.setProperty('--g', m.color);
    bp.setAttribute('aria-label', m.title);
    wrap.querySelector('.bp-title span').textContent = m.title;
    wrap.dataset.kind = k;
    clearDrag(bp);
    wrap.hidden = false;
    draw();
    place();
    requestAnimationFrame(() => { place(); wrap.classList.add('open'); });
    clearInterval(tick);
    tick = setInterval(() => { if (kind === 'trades') tickOpenTrades(body); }, 60000);
  }

  function close() {
    if (wrap.hidden) return;
    wrap.classList.remove('open');
    clearInterval(tick);
    kind = null;
    setTimeout(() => { if (!wrap.classList.contains('open')) { wrap.hidden = true; body.innerHTML = ''; clearDrag(bp); } }, 300);
  }

  wrap.querySelectorAll('[data-bp-close]').forEach((b) => b.addEventListener('click', close));
  // Ir a Trading desde el panel también lo cierra.
  body.addEventListener('click', (e) => { if (e.target.closest('a[href^="#/"], [data-open-trade]')) close(); });
  dismissGesture({ target: bp, handle: wrap.querySelector('.bp-grab'), axis: () => 'y', sign: 1, enabled: () => isOpen() && wrap.classList.contains('sheet'), onDismiss: close });
  new ResizeObserver(() => { if (isOpen()) place(); }).observe(root);
  const isOpen = () => !wrap.hidden && wrap.classList.contains('open');

  return {
    open, close, isOpen,
    // Al cambiar los datos se redibuja el panel abierto (salvo el calendario, para no recargarlo).
    refresh() { if (isOpen() && kind !== 'calendar') draw(); },
    get kind() { return kind; },
  };
}
