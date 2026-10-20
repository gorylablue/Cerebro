// El trading floor: oficina 2D vista desde arriba, dibujada en SVG.
// Los personajes son decoración animada; NO son asistentes de IA (todavía).
// Cada zona muestra en su placa datos reales calculados a partir de tus registros.

import { DEPTS } from '../config.js';
import { esc } from '../logic/util.js';

const SKIN = ['#f1c7a3', '#d9a27c', '#b77b55', '#8d5a3b', '#e8b996', '#6e4630'];
const HAIR = ['#1d1a1a', '#3a2a20', '#5b3a26', '#0f0f12', '#7a5233', '#2b2b33'];

function rng(seed) {
  let s = seed;
  return () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
}

// ---------- Piezas básicas ----------
function person(x, y, { rot = 0, shirt, anim = 'type', delay = 0, r }) {
  const skin = SKIN[Math.floor(r() * SKIN.length)];
  const hair = HAIR[Math.floor(r() * HAIR.length)];
  return `<g transform="translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${rot})">
    <g class="pp a-${anim}" style="animation-delay:${delay}s">
      <g class="arm al"><ellipse cx="-8.5" cy="-6" rx="2.6" ry="5.2" fill="${shirt}" transform="rotate(24 -8.5 -6)"/></g>
      <g class="arm ar"><ellipse cx="8.5" cy="-6" rx="2.6" ry="5.2" fill="${shirt}" transform="rotate(-24 8.5 -6)"/></g>
      <ellipse cx="0" cy="2" rx="13" ry="7" fill="${shirt}"/>
      <ellipse cx="0" cy="2.6" rx="13" ry="6.4" fill="#000" opacity=".12"/>
      <circle cx="0" cy="-0.5" r="7.2" fill="${hair}"/>
      <ellipse cx="0" cy="-5" rx="4.4" ry="2.4" fill="${skin}"/>
    </g>
  </g>`;
}

const chair = (x, y) => `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="10.5" class="chair"/>`;

function plant(x, y, size = 1) {
  const s = 9 * size;
  return `<g transform="translate(${x.toFixed(1)} ${y.toFixed(1)})" class="plant">
    <circle r="${s * 1.25}" class="pot"/>
    <circle cx="${-s * 0.5}" cy="${-s * 0.3}" r="${s * 0.8}" fill="#2f6b4f"/>
    <circle cx="${s * 0.55}" cy="${-s * 0.15}" r="${s * 0.75}" fill="#3b8460"/>
    <circle cx="0" cy="${s * 0.45}" r="${s * 0.7}" fill="#295c45"/>
  </g>`;
}

// Escritorio con monitores (vista superior). El usuario se sienta debajo, mirando hacia arriba.
function station(x, y, w, { screens = 2, colors, occupied, shirt, r, animIdx }) {
  const depth = 34;
  let out = `<rect x="${x}" y="${y}" width="${w}" height="${depth}" rx="4" class="desk"/>`;
  const mw = (w - 14) / screens - 4;
  for (let i = 0; i < screens; i++) {
    const mx = x + 7 + i * (mw + 4);
    const c = colors[Math.floor(r() * colors.length)];
    const animate = animIdx.n++ % 3 === 0;
    out += `<rect x="${mx.toFixed(1)}" y="${y + 4}" width="${mw.toFixed(1)}" height="7" rx="1.5" class="monitor"/>
      <rect x="${(mx + 1.5).toFixed(1)}" y="${y + 9}" width="${(mw - 3).toFixed(1)}" height="1.8" fill="${c}" class="${animate ? 'scr' : ''}" style="animation-delay:${(r() * 4).toFixed(2)}s" opacity=".85"/>`;
  }
  out += `<rect x="${(x + w / 2 - 12).toFixed(1)}" y="${y + 18}" width="24" height="7" rx="1.5" class="kbd"/>`;
  const px = x + w / 2, py = y + depth + 13;
  out += chair(px, py + 3);
  if (occupied) out += person(px, py, { shirt, anim: r() > 0.35 ? 'type' : 'look', delay: (r() * 2).toFixed(2), r });
  return out;
}

// ---------- Zonas ----------
function zoneFrame(id, z, s) {
  const d = DEPTS[id];
  return `
    <rect x="${z.x}" y="${z.y}" width="${z.w}" height="${z.h}" rx="20" fill="${d.tint}" class="zone-floor"/>
    <rect x="${z.x}" y="${z.y}" width="${z.w}" height="${z.h}" rx="20" fill="url(#grid)"/>
    <rect x="${z.x + 1}" y="${z.y + 1}" width="${z.w - 2}" height="${z.h - 2}" rx="19" fill="none" stroke="${d.color}" stroke-opacity=".28" stroke-width="2" class="zone-edge"/>
    <g class="plaque">
      <text x="${z.x + 22}" y="${z.y + 36}" class="z-name" fill="#eef2f8">${esc(d.name)}</text>
      <text x="${z.x + 22}" y="${z.y + 58}" class="z-line">${esc(s?.line || '')}</text>
      <g transform="translate(${z.x + z.w - 96} ${z.y + 18})" class="z-enter">
        <rect width="78" height="30" rx="15" fill="${d.color}" fill-opacity=".14" stroke="${d.color}" stroke-opacity=".5"/>
        <text x="39" y="20" text-anchor="middle" fill="${d.color}">Entrar ›</text>
      </g>
    </g>`;
}

function tradingZone(z, s) {
  const r = rng(11);
  const d = DEPTS.trading;
  const cx = z.x + 24, cw = z.w - 48, top = z.y + 74, ch = z.h - 74 - 16;
  let out = '';
  // Pantalla mural con un "ticker" de tus estadísticas reales.
  const sw = Math.min(cw * 0.62, 560), sx = z.x + (z.w - sw) / 2, sy = top;
  out += `<rect x="${sx}" y="${sy}" width="${sw}" height="40" rx="6" class="wall-screen"/>
    <clipPath id="tick-clip"><rect x="${sx + 8}" y="${sy}" width="${sw - 16}" height="40"/></clipPath>
    <g clip-path="url(#tick-clip)"><g class="ticker" data-sw="${Math.round(sw)}">
      <text x="${sx + sw}" y="${sy + 26}" class="ticker-text" fill="${d.color}">${esc(s?.ticker || '')}</text>
    </g></g>`;
  const rowsTop = top + 62;
  const pitch = 100;
  const rows = Math.max(1, Math.min(3, Math.floor((ch - 62 + 14) / pitch)));
  const per = Math.max(3, Math.min(8, Math.floor(cw / 112)));
  const sWidth = (cw - (per - 1) * 10) / per;
  const shirts = [d.color, '#dfe5ef', '#3c4b69', '#c98f2c'];
  const animIdx = { n: 0 };
  let people = 0;
  for (let row = 0; row < rows; row++) {
    for (let i = 0; i < per; i++) {
      const occupied = people < 8 && ((i * 7 + row * 3) % 5) < 3;
      if (occupied) people++;
      out += station(cx + i * (sWidth + 10), rowsTop + row * pitch, sWidth, {
        screens: sWidth > 100 ? 3 : 2, colors: ['#3fd68b', '#ef5a5a', '#5aa2ff', d.color],
        occupied, shirt: shirts[(i + row) % shirts.length], r, animIdx,
      });
    }
  }
  out += plant(z.x + 26, z.y + z.h - 26, 0.9) + plant(z.x + z.w - 26, z.y + z.h - 26, 0.9);
  return out;
}

function mapaZone(z, s) {
  const r = rng(29);
  const d = DEPTS.mapa;
  const cx = z.x + 24, cw = z.w - 48, top = z.y + 78, ch = z.h - 78 - 18;
  let out = '';
  // Mesa central con mapa (zona creativa).
  const tw = Math.min(cw * 0.46, 300), th = Math.min(ch * 0.58, 150);
  const tx = cx + 26, ty = top + Math.max(0, (ch - th) / 2 - 12);
  out += `<rect x="${tx}" y="${ty}" width="${tw}" height="${th}" rx="10" class="desk desk-light"/>
    <rect x="${tx + 10}" y="${ty + 10}" width="${tw - 20}" height="${th - 20}" rx="6" fill="#0d2321" stroke="${d.color}" stroke-opacity=".35"/>
    <path d="M${tx + 22} ${ty + th * 0.62} q ${tw * 0.18} ${-th * 0.4} ${tw * 0.36} ${-th * 0.12} t ${tw * 0.34} ${-th * 0.18}" fill="none" stroke="${d.color}" stroke-width="2" stroke-dasharray="4 5" class="route" opacity=".8"/>
    ${[[0.18, 0.62], [0.54, 0.47], [0.86, 0.3], [0.4, 0.28]].map(([fx, fy], i) =>
      `<circle cx="${(tx + tw * fx).toFixed(1)}" cy="${(ty + th * fy).toFixed(1)}" r="4.5" fill="${i === 3 ? '#f2b544' : d.color}" class="${i % 2 === 0 ? 'pin' : ''}" style="animation-delay:${i * 0.7}s"/>`).join('')}`;
  out += chair(tx + tw / 2, ty + th + 16) + person(tx + tw / 2, ty + th + 13, { shirt: d.color, anim: 'look', delay: 0.4, r });
  out += chair(tx - 14, ty + th / 2) + person(tx - 14, ty + th / 2, { rot: 90, shirt: '#dfe5ef', anim: 'type', delay: 1.1, r });
  // Estaciones de diseño y desarrollo web.
  const rx = tx + tw + 50, rw = cx + cw - rx;
  if (rw > 90) {
    const n = rw > 260 ? 2 : 1;
    const w = Math.min(130, (rw - (n - 1) * 14) / n);
    const animIdx = { n: 0 };
    out += station(rx, top + 6, w, { screens: 1, colors: [d.color, '#5aa2ff'], occupied: true, shirt: '#3c4b69', r, animIdx });
    if (n === 2) out += station(rx + w + 14, top + 6, w, { screens: 2, colors: [d.color, '#f2b544'], occupied: true, shirt: d.color, r, animIdx });
    // Pizarra de contenido (notas adhesivas).
    const by = top + 92;
    if (by + 40 < top + ch) {
      const bw = Math.min(rw - 10, 230);
      out += `<rect x="${rx}" y="${by}" width="${bw}" height="10" rx="3" class="board"/>`;
      const notes = ['#f2b544', d.color, '#a48bfa', '#ef7a7a', '#dfe5ef'];
      for (let i = 0; i < Math.floor(bw / 30); i++) out += `<rect x="${rx + 8 + i * 30}" y="${by + 1.5}" width="16" height="7" rx="1" fill="${notes[i % notes.length]}" opacity=".85"/>`;
      out += person(rx + bw * 0.55, by + 24, { shirt: '#c7d0de', anim: 'present', delay: 0.2, r });
    }
  }
  // Persona caminando entre la mesa y las estaciones.
  const wy = Math.min(top + ch - 8, ty + th + 44);
  out += `<g transform="translate(${tx + tw + 20} ${wy})"><g class="walker" style="--wx:${Math.max(40, rw * 0.6).toFixed(0)}px;--wy:${(-(wy - top - 70)).toFixed(0)}px">${person(0, 0, { shirt: d.color, anim: 'walk', r })}</g></g>`;
  out += plant(z.x + z.w - 28, z.y + z.h - 26) + plant(z.x + 28, z.y + z.h - 26, 0.8);
  return out;
}

function uniZone(z, s) {
  const r = rng(53);
  const d = DEPTS.uni;
  const cx = z.x + 24, cw = z.w - 48, top = z.y + 76, ch = z.h - 76 - 18;
  let out = '';
  // Estantería con libros a lo largo de la pared.
  const shelfW = cw * 0.62;
  out += `<rect x="${cx}" y="${top}" width="${shelfW}" height="16" rx="3" class="shelf"/>`;
  const books = ['#a48bfa', '#6b5bd6', '#dfe5ef', '#f2b544', '#34d3b4', '#ef7a7a', '#8f9bb3'];
  for (let bx = cx + 4; bx < cx + shelfW - 8;) {
    const bw = 4 + r() * 6;
    out += `<rect x="${bx.toFixed(1)}" y="${top + 3}" width="${bw.toFixed(1)}" height="10" fill="${books[Math.floor(r() * books.length)]}" opacity=".8"/>`;
    bx += bw + 1.5;
  }
  // Mesas redondas de estudio con lámpara y libros.
  const tables = cw > 600 ? 3 : 2;
  const tr = Math.min(40, ch * 0.2);
  const ty = top + 40 + Math.max(tr, (ch - 40) * 0.45);
  for (let i = 0; i < tables; i++) {
    const tx = cx + (shelfW / tables) * (i + 0.5);
    out += `<circle cx="${tx.toFixed(1)}" cy="${ty.toFixed(1)}" r="${tr}" class="desk desk-round"/>
      <rect x="${(tx - 12).toFixed(1)}" y="${(ty - 8).toFixed(1)}" width="11" height="15" rx="1.5" fill="#e9eef6" opacity=".85"/>
      <rect x="${(tx + 1).toFixed(1)}" y="${(ty - 8).toFixed(1)}" width="11" height="15" rx="1.5" fill="#d6dde9" opacity=".85"/>
      <circle cx="${(tx + tr * 0.5).toFixed(1)}" cy="${(ty - tr * 0.45).toFixed(1)}" r="9" fill="#f2d48a" opacity=".18" class="lamp"/>
      <circle cx="${(tx + tr * 0.5).toFixed(1)}" cy="${(ty - tr * 0.45).toFixed(1)}" r="3.5" fill="#f2d48a"/>`;
    out += chair(tx, ty + tr + 12) + person(tx, ty + tr + 10, { shirt: i % 2 ? '#dfe5ef' : d.color, anim: 'read', delay: i * 0.9, r });
    if (i === 1) out += chair(tx - tr - 12, ty) + person(tx - tr - 12, ty, { rot: 90, shirt: '#3c4b69', anim: 'read', delay: 1.7, r });
  }
  // Pizarra con fórmulas y una persona escribiendo.
  const bx = cx + cw - 12;
  const bh = Math.min(ch - 10, 170);
  out += `<rect x="${bx}" y="${top + 4}" width="10" height="${bh}" rx="3" class="board"/>`;
  for (let i = 0; i < 5; i++) out += `<line x1="${bx + 2}" x2="${bx + 8}" y1="${top + 20 + i * (bh - 30) / 5}" y2="${top + 20 + i * (bh - 30) / 5}" stroke="${d.color}" stroke-width="1.5" opacity=".7"/>`;
  out += person(bx - 22, top + 4 + bh * 0.45, { rot: 90, shirt: '#c7d0de', anim: 'present', delay: 0.5, r });
  // Persona caminando hacia la estantería.
  const wy = top + 32;
  out += `<g transform="translate(${cx + shelfW + 30} ${wy})"><g class="walker walker-b" style="--wx:${(-shelfW * 0.55).toFixed(0)}px;--wy:0px">${person(0, 0, { rot: -90, shirt: d.color, anim: 'walk', r })}</g></g>`;
  out += plant(z.x + z.w - 30, z.y + z.h - 28) + plant(cx + shelfW + 18, top + 8, 0.7);
  return out;
}

const DRAW = { trading: tradingZone, mapa: mapaZone, uni: uniZone };

function layout(W, aspect) {
  const H = Math.round(Math.min(W * 2.4, Math.max(W * 0.5, W / aspect)));
  const pad = 12, gap = 14;
  if (aspect >= 1.15) {
    const h1 = Math.round((H - 2 * pad - gap) * 0.47);
    const w2 = (W - 2 * pad - gap) / 2;
    return { H, zones: {
      mapa: { x: pad, y: pad, w: w2, h: h1 },
      uni: { x: pad + w2 + gap, y: pad, w: w2, h: h1 },
      trading: { x: pad, y: pad + h1 + gap, w: W - 2 * pad, h: H - 2 * pad - gap - h1 },
    } };
  }
  const avail = H - 2 * pad - 2 * gap;
  const ht = Math.round(avail * 0.36), hm = Math.round(avail * 0.32);
  return { H, zones: {
    trading: { x: pad, y: pad, w: W - 2 * pad, h: ht },
    mapa: { x: pad, y: pad + ht + gap, w: W - 2 * pad, h: hm },
    uni: { x: pad, y: pad + ht + gap + hm + gap, w: W - 2 * pad, h: H - 2 * pad - 2 * gap - ht - hm },
  } };
}

export function renderOffice(container, { summaries = {}, onSelect }) {
  const rect = container.getBoundingClientRect();
  if (rect.width < 320 || rect.height < 240) { container.innerHTML = ""; return; }
  // El ancho interno se acerca al ancho real en píxeles: así los muebles y personajes
  // mantienen un tamaño legible tanto en horizontal como en vertical.
  const W = Math.round(Math.max(560, Math.min(1000, rect.width)));
  const { H, zones } = layout(W, rect.width / rect.height);
  const parts = Object.entries(zones).map(([id, z]) => `
    <g class="zone" data-zone="${id}" role="button" tabindex="0" aria-label="Entrar a ${esc(DEPTS[id].name)}" style="--dc:${DEPTS[id].color}">
      ${zoneFrame(id, z, summaries[id])}
      <g class="zone-art">${DRAW[id](z, summaries[id])}</g>
      <rect x="${z.x}" y="${z.y}" width="${z.w}" height="${z.h}" rx="20" fill="transparent" class="zone-hit"/>
    </g>`).join('');

  container.innerHTML = `<svg class="office" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Centro de operaciones con tres departamentos">
    <defs>
      <pattern id="grid" width="28" height="28" patternUnits="userSpaceOnUse">
        <path d="M28 0H0V28" fill="none" stroke="#ffffff" stroke-opacity=".035" stroke-width="1"/>
      </pattern>
    </defs>
    ${parts}
  </svg>`;

  // El ticker recorre la pantalla mural completa a velocidad constante.
  const tk = container.querySelector('.ticker');
  const tt = tk?.querySelector('text');
  if (tt) {
    const dist = tt.getComputedTextLength() + Number(tk.dataset.sw);
    tk.style.setProperty('--dist', `${-dist}px`);
    tk.style.setProperty('--dur', `${Math.max(12, dist / 55).toFixed(1)}s`);
  }

  container.querySelectorAll('[data-zone]').forEach((g) => {
    const go = () => onSelect?.(g.dataset.zone);
    g.addEventListener('click', go);
    g.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); } });
  });
}

// Destello breve en una zona (por ejemplo, después de guardar un UPDATE).
export function pingZone(container, id) {
  const g = container.querySelector(`[data-zone="${id}"]`);
  if (!g) return;
  g.classList.remove('ping');
  void g.getBoundingClientRect();
  g.classList.add('ping');
  setTimeout(() => g.classList.remove('ping'), 1600);
}
