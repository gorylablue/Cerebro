// El trading floor: escena isométrica dibujada en SVG (sin dependencias).
//
// Cómo funciona:
// - Cada objeto se coloca en coordenadas del "mundo" (x, y sobre el piso; z hacia arriba)
//   y la función P() lo proyecta a la pantalla en perspectiva isométrica.
// - Los objetos se ordenan por profundidad (x + y) para que lo cercano tape a lo lejano.
// - Los personajes son decoración animada con CSS. NO son asistentes de IA (todavía).
// - Los textos de las pantallas LED y de las etiquetas salen de tus registros reales.

import { DEPTS } from '../config.js';
import { esc } from '../logic/util.js';

export const VB = { x: -1060, y: -430, w: 2120, h: 1510 };
const HW = 250; // altura de las paredes
const S2 = Math.SQRT2;
const r1 = (n) => Math.round(n * 10) / 10;
const P = (x, y, z = 0) => [x - y, (x + y) / 2 - z];
const poly = (world, attrs = '') => `<polygon points="${world.map((p) => P(...p).map(r1).join(',')).join(' ')}" ${attrs}/>`;
const mY = (x0, y, zt) => { const [e, f] = P(x0, y, zt); return `matrix(1 .5 0 1 ${r1(e)} ${r1(f)})`; };   // cara que mira a +y
const mX = (x, y1, zt) => { const [e, f] = P(x, y1, zt); return `matrix(1 -.5 0 1 ${r1(e)} ${r1(f)})`; };  // cara que mira a +x
const mZ = (x0, y0, z) => { const [e, f] = P(x0, y0, z); return `matrix(1 .5 -1 .5 ${r1(e)} ${r1(f)})`; }; // superficie horizontal

function rng(seed) { let s = seed; return () => { s = (s * 9301 + 49297) % 233280; return s / 233280; }; }

// ---------- Primitivas 3D ----------
const DESK = { t: '#334057', l: '#1d2535', r: '#151b28' };
const STEEL = { t: '#3a465c', l: '#232c3d', r: '#182030' };

function box(x, y, z, w, d, h, c = DESK) {
  return poly([[x, y + d, z], [x + w, y + d, z], [x + w, y + d, z + h], [x, y + d, z + h]], `fill="${c.l}"`)
    + poly([[x + w, y, z], [x + w, y + d, z], [x + w, y + d, z + h], [x + w, y, z + h]], `fill="${c.r}"`)
    + poly([[x, y, z + h], [x + w, y, z + h], [x + w, y + d, z + h], [x, y + d, z + h]], `fill="${c.t}"`);
}

function cylSide(cx, cy, z, r, h, fill, extra = '') {
  const [tx, ty] = P(cx, cy, z + h); const [bx, by] = P(cx, cy, z);
  const rx = r * S2, ry = rx / 2;
  return `<path d="M${r1(tx - rx)},${r1(ty)} L${r1(bx - rx)},${r1(by)} A${r1(rx)},${r1(ry)} 0 0 0 ${r1(bx + rx)},${r1(by)} L${r1(tx + rx)},${r1(ty)} A${r1(rx)},${r1(ry)} 0 0 1 ${r1(tx - rx)},${r1(ty)}Z" fill="${fill}" ${extra}/>`;
}
function ell(cx, cy, z, r, attrs) {
  const [x, y] = P(cx, cy, z); const rx = r * S2;
  return `<ellipse cx="${r1(x)}" cy="${r1(y)}" rx="${r1(rx)}" ry="${r1(rx / 2)}" ${attrs}/>`;
}
function frontArc(cx, cy, z, r, attrs) {
  const [x, y] = P(cx, cy, z); const rx = r * S2;
  return `<path d="M${r1(x - rx)},${r1(y)} A${r1(rx)},${r1(rx / 2)} 0 0 0 ${r1(x + rx)},${r1(y)}" fill="none" ${attrs}/>`;
}
function cylinder(cx, cy, z, r, h, side, top, extra = '') {
  return cylSide(cx, cy, z, r, h, side, extra) + ell(cx, cy, z + h, r, `fill="${top}"`);
}

// Contenido de pantallas (coordenadas locales 0..w × 0..h)
function screenContent(kind, w, h, r, color) {
  const pad = 3;
  switch (kind) {
    case 'chart': {
      let s = '';
      const n = 7, cw = (w - 2 * pad) / n;
      let lvl = h * 0.55;
      for (let i = 0; i < n; i++) {
        const up = r() > 0.42; const body = 3 + r() * (h * 0.22);
        const y0 = Math.max(pad + 2, Math.min(h - pad - body - 2, lvl - (up ? body : 0)));
        s += `<line x1="${r1(pad + i * cw + cw / 2)}" x2="${r1(pad + i * cw + cw / 2)}" y1="${r1(y0 - 3)}" y2="${r1(y0 + body + 3)}" stroke="${up ? '#3fd68b' : '#ff5a6a'}" stroke-width=".8"/>
          <rect x="${r1(pad + i * cw + cw * 0.22)}" y="${r1(y0)}" width="${r1(cw * 0.56)}" height="${r1(body)}" fill="${up ? '#3fd68b' : '#ff5a6a'}"/>`;
        lvl += (up ? -1 : 1) * body * 0.6;
      }
      return s;
    }
    case 'web':
      return `<rect x="${pad}" y="${pad}" width="${w - 2 * pad}" height="4" fill="${color}"/>
        <rect x="${pad}" y="${pad + 7}" width="${(w - 2 * pad) * 0.55}" height="${h * 0.3}" fill="#dfe7f2" opacity=".85"/>
        <rect x="${pad + (w - 2 * pad) * 0.62}" y="${pad + 7}" width="${(w - 2 * pad) * 0.38}" height="3" fill="#8a96ad"/>
        <rect x="${pad + (w - 2 * pad) * 0.62}" y="${pad + 12}" width="${(w - 2 * pad) * 0.3}" height="3" fill="#8a96ad"/>
        <rect x="${pad + (w - 2 * pad) * 0.62}" y="${pad + 18}" width="10" height="4" rx="1" fill="${color}"/>
        <rect x="${pad}" y="${h - pad - 6}" width="${(w - 2 * pad) * 0.3}" height="5" fill="#2c3a50"/><rect x="${pad + (w - 2 * pad) * 0.35}" y="${h - pad - 6}" width="${(w - 2 * pad) * 0.3}" height="5" fill="#2c3a50"/><rect x="${pad + (w - 2 * pad) * 0.7}" y="${h - pad - 6}" width="${(w - 2 * pad) * 0.3}" height="5" fill="#2c3a50"/>`;
    case 'code':
      return [0, 1, 2, 3, 4, 5].map((i) => `<rect x="${pad + (i % 3) * 4}" y="${pad + i * 4.6}" width="${8 + r() * (w - 20)}" height="2.2" fill="${['#a48bfa', '#34d3b4', '#f2b544', '#8fb4ff'][i % 4]}" opacity=".9"/>`).join('');
    case 'doc':
      return `<rect x="${pad}" y="${pad}" width="${w * 0.5}" height="3.4" fill="${color}"/>` + [0, 1, 2, 3, 4].map((i) => `<rect x="${pad}" y="${pad + 7 + i * 4.4}" width="${(w - 2 * pad) * (0.6 + r() * 0.4)}" height="2" fill="#b9c3d6" opacity=".7"/>`).join('');
    case 'map':
      return `<rect x="${pad}" y="${pad}" width="${w - 2 * pad}" height="${h - 2 * pad}" fill="#0f2f2c"/>
        <path d="M${pad + 4},${h - 8} Q${w * 0.4},${h * 0.2} ${w - pad - 4},${h * 0.35}" stroke="${color}" stroke-dasharray="2 2" fill="none" stroke-width="1.1"/>
        <circle cx="${w * 0.3}" cy="${h * 0.55}" r="2.2" fill="#f2b544" class="pin"/><circle cx="${w * 0.72}" cy="${h * 0.38}" r="2.2" fill="${color}" class="pin" style="animation-delay:1s"/>`;
    default:
      return '';
  }
}

function monitorQuad(matrix, w, h, kind, r, color, flicker) {
  return `<g transform="${matrix}">
    <rect x="-1.5" y="-1.5" width="${w + 3}" height="${h + 3}" rx="1.5" fill="#0a0e16" stroke="#3a465c" stroke-width=".8"/>
    <g class="${flicker ? 'scr' : ''}" style="animation-delay:${r1(r() * 4)}s"><rect width="${w}" height="${h}" fill="#08111f"/>${screenContent(kind, w, h, r, color)}</g>
    <rect width="${w}" height="${h}" fill="url(#gGlass)"/>
  </g>`;
}

// ---------- Personajes de caricatura ----------
const SKINS = ['#f3cfac', '#e2b08a', '#c68b62', '#9a6544', '#f0c49b', '#7a4e33'];
const HAIRS = ['#2a1d17', '#5a3a24', '#121216', '#8a5a33', '#d9b25a', '#3b2a1f', '#6b3a2a'];
const STYLES = ['flat', 'spiky', 'bun', 'long', 'cap', 'short', 'flat', 'short'];

function hairFront(style, hair, cap) {
  switch (style) {
    case 'spiky': return `<path d="M-12.6,-41 L-11.5,-50 L-7.5,-47.5 L-5.5,-56 L-1.5,-49 L1.5,-57 L4,-49 L8,-54 L9,-46.5 L12.6,-41 C8,-45.5 -8,-45.5 -12.6,-41Z" fill="${hair}"/>`;
    case 'bun': return `<circle cx="0" cy="-56" r="5" fill="${hair}"/><path d="M-12.8,-40 C-13,-52 -6,-54 0,-54 C6,-54 13,-52 12.8,-40 C9,-45 4,-46.5 0,-46.5 C-4,-46.5 -9,-45 -12.8,-40Z" fill="${hair}"/>`;
    case 'long': return `<path d="M-12.8,-42 L-14.5,-27 L-9,-27.5 L-9.6,-40Z M12.8,-42 L14.5,-27 L9,-27.5 L9.6,-40Z" fill="${hair}"/><path d="M-12.8,-40 C-13,-52 -6,-54 0,-54 C6,-54 13,-52 12.8,-40 C9,-46 4,-47 0,-47 C-4,-47 -9,-46 -12.8,-40Z" fill="${hair}"/>`;
    case 'cap': return `<path d="M-12.8,-43 C-12.8,-55 12.8,-55 12.8,-43Z" fill="${cap}"/><ellipse cx="0" cy="-43" rx="14.5" ry="3" fill="${cap}"/><ellipse cx="0" cy="-43.8" rx="14.5" ry="2" fill="#000" opacity=".18"/>`;
    case 'short': return `<path d="M-12.5,-42 C-12,-51 -5,-53 0,-53 C5,-53 12,-51 12.5,-42 C8,-47 -8,-47 -12.5,-42Z" fill="${hair}"/>`;
    default: return `<path d="M-12.8,-40 C-13,-52 -6,-54 0,-54 C6,-54 13,-52 12.8,-40 C9,-45 4,-46 0,-46 C-4,-46 -9,-45 -12.8,-40Z" fill="${hair}"/>`;
  }
}

// Dibuja un personaje con los pies en (sx, sy) de la pantalla.
function figure(sx, sy, o) {
  const { view = 'front', sit = false, shirt, skin, hair, style, anim = 'idle', delay = 0, cap = '#2a3446', tie = null, scale = 1 } = o;
  const by = sit ? 7 : 0;
  const legs = sit ? '' : `<g class="legs"><rect class="lg l1" x="-6.6" y="-12.5" width="5.6" height="12.5" rx="2.4" fill="#1d2433"/><rect class="lg l2" x="1" y="-12.5" width="5.6" height="12.5" rx="2.4" fill="#1d2433"/></g>`;
  const front = view === 'front';
  const face = front
    ? `<ellipse cx="-12.6" cy="-39" rx="2.4" ry="3.4" fill="${skin}"/><ellipse cx="12.6" cy="-39" rx="2.4" ry="3.4" fill="${skin}"/>
       <ellipse cx="0" cy="-40" rx="12.6" ry="11.6" fill="${skin}"/>
       ${hairFront(style, hair, cap)}
       <g class="eyes"><ellipse cx="-4.3" cy="-39.4" rx="3.5" ry="4.1" fill="#fff"/><ellipse cx="4.3" cy="-39.4" rx="3.5" ry="4.1" fill="#fff"/>
         <g class="pupils"><circle cx="-3.8" cy="-38.8" r="1.45" fill="#151515"/><circle cx="4.8" cy="-38.8" r="1.45" fill="#151515"/></g></g>
       <path d="M-3.4,-32.6 Q0,-30.4 3.4,-32.6" stroke="#6b2f2f" stroke-width="1.4" fill="none" stroke-linecap="round"/>`
    : `<ellipse cx="-12.6" cy="-39" rx="2.4" ry="3.4" fill="${skin}"/><ellipse cx="12.6" cy="-39" rx="2.4" ry="3.4" fill="${skin}"/>
       <ellipse cx="0" cy="-40" rx="12.6" ry="11.6" fill="${skin}"/>
       ${style === 'cap' ? `<ellipse cx="0" cy="-42" rx="12.8" ry="10.5" fill="${hair}"/><path d="M-12.8,-44 C-12.8,-56 12.8,-56 12.8,-44Z" fill="${cap}"/>`
         : style === 'long' ? `<path d="M-13,-41 C-13,-55 13,-55 13,-41 L14,-28 L-14,-28Z" fill="${hair}"/>`
           : `<ellipse cx="0" cy="-42.5" rx="12.9" ry="10.6" fill="${hair}"/>${style === 'bun' ? `<circle cx="0" cy="-55" r="5" fill="${hair}"/>` : ''}${style === 'spiky' ? `<path d="M-10,-50 L-7,-57 L-3,-51 L1,-58 L4,-51 L8,-56 L10,-49Z" fill="${hair}"/>` : ''}`}`;
  const tieSvg = front && tie ? `<path d="M-3.2,${-29} L0,${-26.5} L3.2,${-29}Z" fill="#e8edf6"/><path d="M0,-26.5 l-1.8,2.4 1.8,8 1.8,-8z" fill="${tie}"/>` : '';
  return `<g transform="translate(${r1(sx)} ${r1(sy)})${scale !== 1 ? ` scale(${scale})` : ''}">
    <ellipse cx="0" cy="0" rx="11.5" ry="4.2" fill="#000" opacity=".38"/>
    <g class="fig a-${anim}" style="animation-delay:${delay}s;--d:${delay}s">
      ${legs}
      <g transform="translate(0 ${by})">
        <path d="M-10.2,-11 C-10.6,-24 -8,-29.5 0,-29.5 C8,-29.5 10.6,-24 10.2,-11Z" fill="${shirt}"/>
        <path d="M-10.2,-11 C-10.6,-24 -8,-29.5 0,-29.5 L0,-11Z" fill="#fff" opacity=".07"/>
        ${tieSvg}
        <g class="arm al"><rect x="-14" y="-26.5" width="5.2" height="14" rx="2.6" fill="${shirt}"/><circle cx="-11.4" cy="-12.6" r="2.7" fill="${skin}"/></g>
        <g class="arm ar"><rect x="8.8" y="-26.5" width="5.2" height="14" rx="2.6" fill="${shirt}"/><circle cx="11.4" cy="-12.6" r="2.7" fill="${skin}"/></g>
        <g class="head">${face}</g>
      </g>
    </g>
  </g>`;
}

function person(r, x, y, opts) {
  const [sx, sy] = P(x, y, 0);
  const o = {
    skin: SKINS[Math.floor(r() * SKINS.length)],
    hair: HAIRS[Math.floor(r() * HAIRS.length)],
    style: STYLES[Math.floor(r() * STYLES.length)],
    delay: r1(r() * 3),
    scale: 1.15,
    ...opts,
  };
  return figure(sx, sy, o);
}

// Silla de oficina vista desde atrás (tapa la espalda de quien está sentado de espaldas).
function chairBack(x, y) {
  const [sx, sy] = P(x, y, 0);
  return `<g transform="translate(${r1(sx)} ${r1(sy)})"><rect x="-11" y="-22" width="22" height="15" rx="5" fill="#252f42" stroke="#323e55" stroke-width="1"/><rect x="-1.5" y="-7" width="3" height="7" fill="#1a2130"/></g>`;
}
function chairSeat(x, y) {
  const [sx, sy] = P(x, y, 0);
  return `<g transform="translate(${r1(sx)} ${r1(sy)})"><ellipse cx="0" cy="-8" rx="12" ry="5.5" fill="#252f42"/><rect x="-10" y="-30" width="20" height="18" rx="5" fill="#232c3e"/></g>`;
}

// ---------- Construcción de la escena ----------
function walls(sum) {
  const winRow = (len, offset) => {
    let s = '';
    for (let u = offset; u < len - 60; u += 125) {
      s += `<path d="M${u},96 L${u},38 Q${u + 42},6 ${u + 84},38 L${u + 84},96Z" fill="url(#gWin)"/>
        <path d="M${u + 42},18 L${u + 42},96 M${u},62 L${u + 84},62" stroke="#0a1220" stroke-width="3"/>`;
    }
    return s;
  };
  const columns = (len) => { let s = ''; for (let u = 0; u <= len; u += 125) s += `<rect x="${u - 7}" y="0" width="14" height="${HW}" fill="#1b2434"/><rect x="${u - 7}" y="0" width="3" height="${HW}" fill="#2a3448"/>`; return s; };
  const back = `<g transform="${mY(0, 0, HW)}">
      <rect width="1000" height="${HW}" fill="url(#gWallB)"/>
      ${winRow(1000, 22)}${columns(1000)}
      <rect x="0" y="104" width="1000" height="32" fill="#04070c"/>
      <clipPath id="clipLedB"><rect x="0" y="104" width="1000" height="32"/></clipPath>
      <g clip-path="url(#clipLedB)"><g class="led-scroll" data-led="b" data-len="1000"><text x="1000" y="127" class="led">${esc(sum.ledBack)}</text></g></g>
      <rect x="0" y="103" width="1000" height="2" fill="#f2b544" opacity=".5"/><rect x="0" y="136" width="1000" height="2" fill="#f2b544" opacity=".5"/>
      <!-- Pizarras de Trading (se pueden tocar): GRÁFICA y CALENDARIO -->
      <rect x="26" y="150" width="116" height="88" rx="4" fill="#05080e" stroke="#3fd68b" stroke-width="2" class="board" style="--g:#3fd68b"/>
      <text x="36" y="174" class="wall-title board-title" fill="#3fd68b">GRÁFICA</text>
      <polyline points="36,222 50,212 62,216 74,200 88,206 102,190 116,196 130,182" fill="none" stroke="#3fd68b" stroke-width="2.5" class="draw-line"/>
      <text x="132" y="233" text-anchor="end" class="board-sub">TradingView ›</text>
      <rect x="152" y="150" width="124" height="88" rx="4" fill="#05080e" stroke="#f2b544" stroke-width="2" class="board" style="--g:#f2b544"/>
      <text x="162" y="174" class="wall-title board-title" fill="#f2b544">CALENDARIO</text>
      ${[0, 1].map((row) => [0, 1, 2, 3, 4].map((c) => `<rect x="${162 + c * 21}" y="${186 + row * 22}" width="16" height="16" rx="2" fill="${row === 0 && c === 2 ? '#ff5a6a' : row === 1 && c === 4 ? '#f2b544' : '#1d2636'}" stroke="#2c3953"/>`).join('')).join('')}
      <!-- Pizarra de Universidad -->
      <rect x="690" y="148" width="250" height="84" rx="3" fill="#e9eef5"/>
      <rect x="690" y="232" width="250" height="5" fill="#9aa6bd"/>
      <path d="M705,170 q8,-10 16,0 t16,0 M748,166 l14,0 M770,160 l0,14 M763,167 l14,0 M790,170 q10,-14 20,0" stroke="#5b4bd6" stroke-width="2.4" fill="none"/>
      <path d="M705,196 l36,0 M750,190 l10,12 m0,-12 l-10,12 M770,196 l52,0 M832,186 q10,22 22,0" stroke="#2a3448" stroke-width="2.2" fill="none"/>
      <path d="M705,218 l70,0 M786,218 l24,0" stroke="#d94b4b" stroke-width="2.2" fill="none"/>
      <rect x="0" y="${HW - 12}" width="1000" height="12" fill="#0b1019"/>
    </g>`;
  const left = `<g transform="${mX(0, 1000, HW)}">
      <rect width="1000" height="${HW}" fill="url(#gWallL)"/>
      ${winRow(1000, 22)}${columns(1000)}
      <rect x="0" y="104" width="1000" height="32" fill="#04070c"/>
      <clipPath id="clipLedL"><rect x="0" y="104" width="1000" height="32"/></clipPath>
      <g clip-path="url(#clipLedL)"><g class="led-scroll led-slow" data-led="l" data-len="1000"><text x="1000" y="127" class="led led-cyan">${esc(sum.ledLeft)}</text></g></g>
      <rect x="0" y="103" width="1000" height="2" fill="#39d0ff" opacity=".45"/><rect x="0" y="136" width="1000" height="2" fill="#39d0ff" opacity=".45"/>
      <!-- Billboard LED de En El Mapa -->
      <rect x="110" y="146" width="440" height="94" rx="4" fill="#03100f" stroke="#34d3b4" stroke-width="2.5"/>
      <g class="bb-msgs">
        <text x="330" y="205" text-anchor="middle" class="bb-text bb1" fill="#34d3b4">EN EL MAPA</text>
        <text x="330" y="202" text-anchor="middle" class="bb-text bb2 bb-small" fill="#e8edf6">PÁGINAS WEB · BILLBOARDS</text>
        <text x="330" y="202" text-anchor="middle" class="bb-text bb3 bb-small" fill="#f2b544">TU MARCA EN EL MAPA</text>
      </g>
      <rect x="110" y="146" width="440" height="94" rx="4" fill="url(#gLedDots)"/>
      <!-- Pizarra de Trading (se puede tocar): OPERACIONES ABIERTAS -->
      <rect x="764" y="150" width="210" height="88" rx="4" fill="#05080e" stroke="#39d0ff" stroke-width="2" class="board" style="--g:#39d0ff"/>
      <text x="776" y="174" class="wall-title board-title board-title-long" fill="#39d0ff">OPERACIONES ABIERTAS</text>
      <g transform="translate(778 186) scale(.72)">${screenContent('chart', 120, 46, rng(17), '#39d0ff')}</g>
      <polyline points="868,224 884,218 900,222 916,206 932,210 948,196 962,200" fill="none" stroke="#3fd68b" stroke-width="2.5" class="draw-line" style="animation-delay:-3s"/>
      <rect x="0" y="${HW - 12}" width="1000" height="12" fill="#0b1019"/>
    </g>`;
  // Remate superior de las paredes
  const caps = poly([[0, 0, HW], [1000, 0, HW], [1000, -14, HW], [0, -14, HW]], 'fill="#2a3448"')
    + poly([[0, 0, HW], [0, 1000, HW], [-14, 1000, HW], [-14, 0, HW]], 'fill="#323e55"');
  return back + left + caps;
}

function floor() {
  return `<g transform="${mZ(0, 0, 0)}">
    <rect width="1000" height="1000" fill="url(#gFloor)"/>
    <rect width="1000" height="1000" fill="url(#pTiles)"/>
    <polygon points="18,292 18,982 708,982" fill="${DEPTS.mapa.color}" fill-opacity=".07" stroke="${DEPTS.mapa.color}" stroke-opacity=".45" stroke-width="3" class="zone-carpet" data-zone="mapa"/>
    <polygon points="292,18 982,18 982,708" fill="${DEPTS.uni.color}" fill-opacity=".07" stroke="${DEPTS.uni.color}" stroke-opacity=".45" stroke-width="3" class="zone-carpet" data-zone="uni"/>
    <polygon points="18,18 250,18 982,750 982,982 750,982 18,250" fill="${DEPTS.trading.color}" fill-opacity=".05" stroke="${DEPTS.trading.color}" stroke-opacity=".35" stroke-width="3" class="zone-carpet" data-zone="trading"/>
    <circle cx="210" cy="210" r="190" fill="url(#gPoolT)"/><circle cx="470" cy="470" r="200" fill="url(#gPoolT)"/><circle cx="730" cy="730" r="200" fill="url(#gPoolT)"/>
    <circle cx="140" cy="640" r="230" fill="url(#gPoolM)"/><circle cx="700" cy="230" r="240" fill="url(#gPoolU)"/>
    <path d="M18,18 L982,982" stroke="#f2b544" stroke-opacity=".12" stroke-width="2" stroke-dasharray="14 18"/>
  </g>`;
}

// Estación circular de operaciones, inspirada en los "posts" del piso de la bolsa.
function tradingPost(items, r, cx, cy, idx) {
  const R = 96, RI = 58, H = 30, base = cx + cy;
  const z = 'trading';
  // Sombra
  items.push({ d: base - 400, z, s: ell(cx, cy, 0, R + 16, 'fill="url(#gShadow)"') });
  // Personas alrededor (de pie)
  const angles = [[0.15, 'type'], [0.9, 'talk'], [1.55, 'type'], [2.35, 'look'], [3.3, 'type'], [4.2, 'talk'], [5.05, 'type'], [5.7, 'look']];
  const shirts = ['#2f4a7a', '#e8edf6', '#3a4256', '#7a2f3a', '#2d5f56', '#c9a14a', '#56408f'];
  angles.forEach(([a0, anim], i) => {
    if ((i + idx) % 3 === 2) return;
    const a = a0 + idx * 0.4;
    const pr = R + 22;
    const px = cx + Math.cos(a) * pr, py = cy + Math.sin(a) * pr;
    const facingViewer = Math.cos(a) + Math.sin(a) < 0; // detrás de la estación → le vemos la cara
    items.push({ d: px + py, z, s: person(r, px, py, { view: facingViewer ? 'front' : 'back', shirt: shirts[(i + idx) % shirts.length], tie: r() > 0.5 ? '#c0392b' : null, anim }) });
  });
  // Mostrador circular
  const [tx, ty] = P(cx, cy, H);
  const ro = R * S2, rio = RI * S2;
  const ring = cylSide(cx, cy, 0, R, H, 'url(#gRingSide)')
    + `<path d="M${r1(tx - ro)},${r1(ty)} a${r1(ro)},${r1(ro / 2)} 0 1 0 ${r1(2 * ro)},0 a${r1(ro)},${r1(ro / 2)} 0 1 0 ${r1(-2 * ro)},0Z M${r1(tx - rio)},${r1(ty)} a${r1(rio)},${r1(rio / 2)} 0 1 0 ${r1(2 * rio)},0 a${r1(rio)},${r1(rio / 2)} 0 1 0 ${r1(-2 * rio)},0Z" fill="#35425a" fill-rule="evenodd"/>`
    + ell(cx, cy, H, R, 'fill="none" stroke="#f2b544" stroke-opacity=".35" stroke-width="1.5"')
    + ell(cx, cy, H, RI, 'fill="#090d15"')
    + frontArc(cx, cy, 6, R, 'stroke="#f2b544" stroke-opacity=".55" stroke-width="2"');
  items.push({ d: base, z, s: ring });
  // Monitores sobre el mostrador
  const N = 14;
  for (let k = 0; k < N; k++) {
    const a = (k / N) * Math.PI * 2 + idx * 0.2;
    const ca = Math.cos(a), sa = Math.sin(a);
    const rm = R - 12;
    const mx = cx + ca * rm, my = cy + sa * rm;
    const tX = -sa * 9, tY = ca * 9;
    const front = ca + sa > 0;
    const quad = [[mx - tX, my - tY, H + 2], [mx + tX, my + tY, H + 2], [mx + tX, my + tY, H + 19], [mx - tX, my - tY, H + 19]];
    const col = ['#3fd68b', '#ff5a6a', '#39d0ff', '#f2b544'][Math.floor(r() * 4)];
    let s = poly(quad, `fill="${front ? '#0a1424' : '#1b2333'}" stroke="#3a465c" stroke-width=".7"`);
    if (front) {
      const l1 = [[mx - tX * 0.7, my - tY * 0.7, H + 13], [mx + tX * 0.7, my + tY * 0.7, H + 13]];
      const l2 = [[mx - tX * 0.7, my - tY * 0.7, H + 8], [mx + tX * 0.2, my + tY * 0.2, H + 8]];
      s += `<g class="${k % 3 === 0 ? 'scr' : ''}" style="animation-delay:${r1(r() * 4)}s">`
        + [l1, l2].map((l) => { const [a1, b1] = P(...l[0]); const [a2, b2] = P(...l[1]); return `<line x1="${r1(a1)}" y1="${r1(b1)}" x2="${r1(a2)}" y2="${r1(b2)}" stroke="${col}" stroke-width="2"/>`; }).join('')
        + '</g>';
    }
    items.push({ d: front ? base + rm * (ca + sa) * 0.6 + 1 : base + 0.1, z, s });
  }
  // Columna central y corona de pantallas
  const crown = cylinder(cx, cy, H, 15, 92, 'url(#gSteelSide)', '#4a566e')
    + cylSide(cx, cy, 120, 66, 34, '#060a12', 'stroke="#f2b544" stroke-opacity=".6" stroke-width="1.5"')
    + frontArc(cx, cy, 128, 66, `stroke="#3fd68b" stroke-width="4" stroke-dasharray="10 7 22 9" class="crawl" style="animation-delay:-${idx}s"`)
    + frontArc(cx, cy, 140, 66, `stroke="#ff5a6a" stroke-width="4" stroke-dasharray="16 11 6 8" class="crawl crawl-rev" style="animation-delay:-${idx * 2}s"`)
    + frontArc(cx, cy, 148, 66, 'stroke="#39d0ff" stroke-width="2" stroke-dasharray="3 5" opacity=".8"')
    + ell(cx, cy, 154, 66, 'fill="#1d2636" stroke="#f2b544" stroke-opacity=".5" stroke-width="1.5"')
    + ell(cx, cy, 155, 48, 'fill="#f2b544" opacity=".14" class="crown-glow"');
  items.push({ d: base + 0.3, z, s: crown });
}

// Escritorio con monitor y persona sentada de espaldas.
function deskStation(items, r, x, y, { facing = 'x', kind = 'web', zone, color, shirt, monitors = 1, occupied = true, anim = 'type' }) {
  if (facing === 'x') {
    items.push({ d: x + y + 52, z: zone, s: box(x, y, 0, 38, 66, 26) + ell(x + 19, y + 33, 0, 46, 'fill="url(#gShadow)" opacity=".5"') });
    const w = monitors === 2 ? 28 : 44;
    let m = '';
    for (let i = 0; i < monitors; i++) {
      const y1 = y + 58 - i * 30;
      m += box(x + 10, y1 - w / 2 - 3, 26, 4, 6, 10, STEEL) + monitorQuad(mX(x + 9, y1, 26 + 40), w, 28, kind, r, color, i === 0);
    }
    items.push({ d: x + y + 52.1, z: zone, s: m });
    if (occupied) items.push({ d: x + y + 52 + 60, z: zone, s: person(r, x + 56, y + 33, { view: 'back', sit: true, shirt, anim }) + chairBack(x + 60, y + 35) });
    else items.push({ d: x + y + 112, z: zone, s: chairBack(x + 60, y + 35) });
  } else {
    items.push({ d: x + y + 52, z: zone, s: box(x, y, 0, 66, 38, 26) + ell(x + 33, y + 19, 0, 46, 'fill="url(#gShadow)" opacity=".5"') });
    const w = monitors === 2 ? 28 : 44;
    let m = '';
    for (let i = 0; i < monitors; i++) {
      const x1 = x + 8 + i * 30;
      m += box(x1 + w / 2 - 3, y + 10, 26, 6, 4, 10, STEEL) + monitorQuad(mY(x1, y + 9, 26 + 40), w, 28, kind, r, color, i === 0);
    }
    items.push({ d: x + y + 52.1, z: zone, s: m });
    if (occupied) items.push({ d: x + y + 52 + 60, z: zone, s: person(r, x + 33, y + 56, { view: 'back', sit: true, shirt, anim }) + chairBack(x + 35, y + 60) });
    else items.push({ d: x + y + 112, z: zone, s: chairBack(x + 35, y + 60) });
  }
}

function walker(items, r, zone, x, y, dx, dy, opts) {
  // dx, dy en el mundo → desplazamiento en pantalla
  const sx = dx - dy, sy = (dx + dy) / 2;
  const [px, py] = P(x, y, 0);
  items.push({
    d: x + y + (dx + dy) / 2, z: zone,
    s: `<g class="walker" style="--dx:${r1(sx)}px;--dy:${r1(sy)}px;animation-duration:${opts.dur || 16}s;animation-delay:-${opts.offset || 0}s">${figure(px, py, {
      skin: SKINS[Math.floor(r() * SKINS.length)], hair: HAIRS[Math.floor(r() * HAIRS.length)], style: opts.style || 'short', scale: 1.15, ...opts, anim: 'walk',
    })}</g>`,
  });
}

function mapaZone(items) {
  const r = rng(29);
  const c = DEPTS.mapa.color;
  const z = 'mapa';
  deskStation(items, r, 50, 400, { facing: 'x', kind: 'web', zone: z, color: c, shirt: c, monitors: 2 });
  deskStation(items, r, 50, 480, { facing: 'x', kind: 'code', zone: z, color: c, shirt: '#e8edf6' });
  deskStation(items, r, 50, 560, { facing: 'x', kind: 'web', zone: z, color: c, shirt: '#3a4256', monitors: 2 });
  deskStation(items, r, 190, 560, { facing: 'x', kind: 'map', zone: z, color: c, shirt: '#c9a14a' });
  deskStation(items, r, 190, 640, { facing: 'x', kind: 'web', zone: z, color: c, shirt: c, occupied: false });
  // Billboard publicitario sobre postes (servicio de En El Mapa)
  const bx = 360;
  const bb = box(bx, 800, 0, 8, 8, 120, STEEL) + box(bx, 900, 0, 8, 8, 120, STEEL)
    + box(bx - 4, 790, 112, 14, 140, 6, STEEL)
    + `<g transform="${mX(bx + 9, 932, 205)}">
        <rect x="-2" y="-2" width="148" height="88" fill="#1a2232"/>
        <rect width="144" height="84" fill="#062220"/>
        <rect width="144" height="84" fill="url(#gBill)"/>
        <text x="72" y="36" text-anchor="middle" class="bill-text" fill="#e8edf6">TU MARCA</text>
        <text x="72" y="60" text-anchor="middle" class="bill-text" fill="${c}">AQUÍ</text>
        <rect x="6" y="70" width="132" height="4" fill="${c}" class="bill-bar"/>
      </g>`
    + ell(bx + 4, 860, 0, 70, 'fill="url(#gShadow)" opacity=".5"');
  items.push({ d: bx + 860, z, s: bb });
  // Dos personas conversando junto al billboard
  items.push({ d: 470 + 880, z, s: person(r, 470, 880, { view: 'front', shirt: '#2d5f56', anim: 'talk' }) });
  items.push({ d: 450 + 930, z, s: person(r, 450, 930, { view: 'back', shirt: '#e8edf6', anim: 'nod', style: 'long' }) });
  walker(items, r, z, 120, 700, 0, 170, { shirt: c, dur: 18, offset: 2 });
}

function uniZone(items) {
  const r = rng(53);
  const c = DEPTS.uni.color;
  const z = 'uni';
  // Estantería con libros contra la pared
  let books = '';
  const colors = ['#a48bfa', '#6b5bd6', '#dfe5ef', '#f2b544', '#34d3b4', '#ef7a7a', '#8f9bb3', '#4a6fd6'];
  for (const v of [8, 40, 72, 104]) {
    for (let u = 6; u < 324;) {
      const w = 5 + r() * 8; const h = 18 + r() * 8;
      books += `<rect x="${r1(u)}" y="${r1(v + 26 - h)}" width="${r1(w)}" height="${r1(h)}" fill="${colors[Math.floor(r() * colors.length)]}" opacity=".9"/>`;
      u += w + 1.4;
    }
  }
  items.push({ d: 300 + 26, z, s: box(300, 0, 0, 330, 26, 132, { t: '#3a3150', l: '#2a2338', r: '#211b2e' }) + `<g transform="${mY(300, 26, 132)}"><rect width="330" height="132" fill="#1c1729"/>${books}${[34, 66, 98].map((v) => `<rect y="${v}" width="330" height="4" fill="#3a3150"/>`).join('')}</g>` });
  // Mesas redondas de estudio
  const table = (tx, ty, kind) => {
    items.push({ d: tx + ty - 50, z, s: person(r, tx - 6, ty - 46, { view: 'front', sit: true, shirt: r() > 0.5 ? c : '#e8edf6', anim: 'read', style: 'bun' }) });
    items.push({ d: tx + ty, z, s: ell(tx, ty, 0, 52, 'fill="url(#gShadow)"') + cylinder(tx, ty, 0, 6, 22, '#1d2535', '#2a3446') + cylinder(tx, ty, 22, 36, 4, '#2a2340', '#3d3457')
      + box(tx - 18, ty - 2, 26, 22, 16, 2, { t: '#c7d0de', l: '#8f9bb3', r: '#6b7891' })
      + monitorQuad(mY(tx - 18, ty - 2, 26 + 16), 22, 15, kind, r, c, true)
      + cylinder(tx + 18, ty - 12, 26, 3, 16, '#4a566e', '#f2d48a') + ell(tx + 18, ty - 12, 42, 9, 'fill="#f2d48a" opacity=".22" class="lamp"') });
    items.push({ d: tx + ty + 50, z, s: person(r, tx + 4, ty + 46, { view: 'back', sit: true, shirt: '#3a4256', anim: 'type' }) + chairBack(tx + 6, ty + 50) });
  };
  table(560, 210, 'doc');
  table(790, 320, 'code');
  table(890, 560, 'doc');
  deskStation(items, r, 690, 470, { facing: 'y', kind: 'doc', zone: z, color: c, shirt: c });
  // Persona escribiendo en la pizarra (de espaldas)
  items.push({ d: 820 + 44, z, s: person(r, 820, 44, { view: 'back', shirt: '#e8edf6', anim: 'write', style: 'short' }) });
  walker(items, r, z, 470, 110, 190, 0, { shirt: c, dur: 20, offset: 7, style: 'long' });
}

function tradingZone(items) {
  const r = rng(11);
  tradingPost(items, r, 210, 210, 0);
  tradingPost(items, r, 470, 470, 1);
  tradingPost(items, r, 730, 730, 2);
  walker(items, r, 'trading', 420, 650, 190, 0, { shirt: '#2f4a7a', tie: '#c0392b', dur: 15, offset: 1 });
  walker(items, r, 'trading', 640, 360, 0, 200, { shirt: '#e8edf6', dur: 17, offset: 9, style: 'flat' });
  walker(items, r, 'trading', 260, 470, 0, -150, { shirt: '#7a2f3a', dur: 13, offset: 4, style: 'spiky' });
}

const DEFS = `<defs>
  <linearGradient id="gWallB" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0c1220"/><stop offset=".6" stop-color="#131c2d"/><stop offset="1" stop-color="#0f1624"/></linearGradient>
  <linearGradient id="gWallL" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#101829"/><stop offset=".6" stop-color="#18223a"/><stop offset="1" stop-color="#121a2b"/></linearGradient>
  <linearGradient id="gWin" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5fb7ff" stop-opacity=".55"/><stop offset="1" stop-color="#1b3c6e" stop-opacity=".35"/></linearGradient>
  <radialGradient id="gFloor" cx=".45" cy=".45" r=".75"><stop offset="0" stop-color="#2a2420"/><stop offset=".55" stop-color="#171a22"/><stop offset="1" stop-color="#0d1119"/></radialGradient>
  <pattern id="pTiles" width="50" height="50" patternUnits="userSpaceOnUse"><path d="M50 0H0V50" fill="none" stroke="#ffffff" stroke-opacity=".045" stroke-width="1.5"/></pattern>
  <radialGradient id="gPoolT"><stop offset="0" stop-color="#f2b544" stop-opacity=".22"/><stop offset="1" stop-color="#f2b544" stop-opacity="0"/></radialGradient>
  <radialGradient id="gPoolM"><stop offset="0" stop-color="#34d3b4" stop-opacity=".18"/><stop offset="1" stop-color="#34d3b4" stop-opacity="0"/></radialGradient>
  <radialGradient id="gPoolU"><stop offset="0" stop-color="#a48bfa" stop-opacity=".2"/><stop offset="1" stop-color="#a48bfa" stop-opacity="0"/></radialGradient>
  <radialGradient id="gShadow"><stop offset="0" stop-color="#000" stop-opacity=".55"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient>
  <linearGradient id="gRingSide" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#3a4760"/><stop offset=".45" stop-color="#253044"/><stop offset="1" stop-color="#121924"/></linearGradient>
  <linearGradient id="gSteelSide" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#5a6780"/><stop offset=".5" stop-color="#2f3a4f"/><stop offset="1" stop-color="#1a2232"/></linearGradient>
  <linearGradient id="gGlass" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".12"/><stop offset=".5" stop-color="#fff" stop-opacity="0"/></linearGradient>
  <linearGradient id="gBill" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#34d3b4" stop-opacity=".35"/><stop offset="1" stop-color="#062220" stop-opacity="0"/></linearGradient>
  <pattern id="gLedDots" width="5" height="5" patternUnits="userSpaceOnUse"><rect width="5" height="5" fill="none"/><circle cx="2.5" cy="2.5" r=".7" fill="#000" opacity=".45"/></pattern>
  <radialGradient id="gVignette" cx=".5" cy=".42" r=".7"><stop offset=".6" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".55"/></radialGradient>
</defs>`;

// Zonas táctiles de las tres pizarras (un poco más grandes que la pizarra, para tocarlas con el dedo).
export const BOARDS = {
  trades: { label: 'Operaciones abiertas', wall: 'left', x: 764, w: 210 },
  chart: { label: 'Gráfica en TradingView', wall: 'back', x: 26, w: 116 },
  calendar: { label: 'Calendario económico', wall: 'back', x: 152, w: 124 },
};
function boardHits() {
  return Object.entries(BOARDS).map(([id, b]) => `<g transform="${b.wall === 'left' ? mX(0, 1000, HW) : mY(0, 0, HW)}">
    <rect class="board-hit" data-board="${id}" role="button" aria-label="${esc(b.label)}" x="${b.x - 6}" y="142" width="${b.w + 12}" height="104" rx="8" fill="transparent"/>
  </g>`).join('');
}

function buildScene(sum) {
  const items = [];
  tradingZone(items);
  mapaZone(items);
  uniZone(items);
  items.sort((a, b) => a.d - b.d);
  const body = items.map((it) => `<g data-zone="${it.z}">${it.s}</g>`).join('');
  // Capa táctil invisible encima de todo: cualquier punto de un ala (piso, pared, muebles,
  // personajes o pasillos) abre su departamento.
  const hit = (z, pts) => `<polygon class="hit" data-zone="${z}" fill="transparent" points="${pts.map((p) => P(...p).map(r1).join(',')).join(' ')}"/>`;
  const hits = hit('mapa', [[0, 255, HW], [0, 1000, HW], [0, 1000, 0], [745, 1000, 0], [0, 255, 0]])
    + hit('uni', [[255, 0, HW], [1000, 0, HW], [1000, 0, 0], [1000, 745, 0], [255, 0, 0]])
    + hit('trading', [[0, 0, HW], [255, 0, HW], [255, 0, 0], [1000, 745, 0], [1000, 1000, 0], [745, 1000, 0], [0, 255, 0], [0, 255, HW]]);
  return `${DEFS}
    <rect x="${VB.x}" y="${VB.y}" width="${VB.w}" height="${VB.h}" fill="url(#gVignette)" opacity=".6"/>
    ${floor()}
    ${walls(sum)}
    ${body}
    <g class="hit-layer">${hits}${boardHits()}</g>`;
}

// ---------- API pública ----------
// Puntos de anclaje de las etiquetas (en coordenadas del mundo).
// Trading arriba, sobre la esquina; En El Mapa y Universidad en el borde delantero de su ala,
// para dejar libre la esquina superior izquierda (Objetivos pendientes).
const ANCHORS = { mapa: [110, 1000, 0], trading: [0, 0, 264], uni: [1000, 110, 0] };

function labelHtml(id, s) {
  const d = DEPTS[id];
  return `<button class="scene-label" data-label="${id}" style="--dc:${d.color}" aria-label="Entrar a ${esc(d.name)}">
    <span class="sl-name"><i class="sl-dot"></i>${esc(d.name)}</span>
    <span class="sl-line">${esc(s?.line || '')}</span>
    <span class="sl-enter">Entrar ›</span>
  </button>`;
}

export function renderOffice(container, { summaries = {}, onSelect, onBoard }) {
  const sum = officeTexts(summaries);
  container.innerHTML = `<div class="scene">
    <svg class="office" viewBox="${VB.x} ${VB.y} ${VB.w} ${VB.h}" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Trading floor con los departamentos En El Mapa, Trading y Universidad">${buildScene(sum)}</svg>
    <div class="scene-labels">${['mapa', 'trading', 'uni'].map((id) => labelHtml(id, summaries[id])).join('')}</div>
  </div>`;
  const svg = container.querySelector('svg');
  svg.addEventListener('click', (e) => {
    const board = e.target.closest('[data-board]');
    if (board) { onBoard?.(board.dataset.board, board.getBoundingClientRect()); return; }
    const g = e.target.closest('[data-zone]');
    if (g) onSelect?.(g.dataset.zone);
  });
  container.querySelectorAll('[data-label]').forEach((b) => b.addEventListener('click', () => onSelect?.(b.dataset.label)));
  measureLeds(container);
  placeLabels(container);
  // Arranque de las animaciones: se activan en el siguiente fotograma, cuando el SVG ya está
  // pintado. Safari a veces no inicia animaciones de un SVG recién insertado hasta un repintado.
  svg.getBoundingClientRect();
  requestAnimationFrame(() => requestAnimationFrame(() => svg.classList.add('live')));
}

// ---------- Cámara ----------
// El acercamiento cambia el viewBox del SVG (la escena se vuelve a dibujar en vectores a la
// nueva escala). Así no se crean capas gigantes en memoria, que en el iPad pueden verse negras.
const FOCUS = {
  trading: { cx: 0, cy: 430, w: 560, h: 840 },
  mapa: { cx: -600, cy: 380, w: 820, h: 620 },
  uni: { cx: 600, cy: 330, w: 820, h: 660 },
};

function overviewBox(W, H) {
  const k = Math.min(W / VB.w, H / VB.h);
  const w = W / k, h = H / k;
  return { x: VB.x - (w - VB.w) / 2, y: VB.y - (h - VB.h) / 2, w, h };
}

function targetBox(target, W, H, vis) {
  if (!target || target === 'overview') return overviewBox(W, H);
  const f = typeof target === 'string' ? FOCUS[target] : target;
  if (!f) return overviewBox(W, H);
  const v = vis || { x: 0, y: 0, w: W, h: H };
  const k = Math.min(v.w / f.w, v.h / f.h);
  return { x: f.cx - (v.x + v.w / 2) / k, y: f.cy - (v.y + v.h / 2) / k, w: W / k, h: H / k };
}

const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

// target: 'overview', un id de departamento, o una caja {cx, cy, w, h}. vis: zona visible (px) no tapada por el panel.
export function cameraTo(container, target, { vis = null, duration = 750, onDone } = {}) {
  const scene = container.querySelector('.scene');
  const svg = scene?.querySelector('svg');
  if (!svg) return;
  const W = scene.clientWidth, H = scene.clientHeight;
  if (!W || !H) return;
  const to = targetBox(target, W, H, vis);
  const from = svg._cam || overviewBox(W, H);
  cancelAnimationFrame(svg._camRaf);
  svg._camTarget = { target, vis };
  scene.classList.toggle('zoomed', target !== 'overview');
  const set = (b) => { svg._cam = b; svg.setAttribute('viewBox', `${r1(b.x)} ${r1(b.y)} ${r1(b.w)} ${r1(b.h)}`); };
  if (!duration || matchMedia('(prefers-reduced-motion: reduce)').matches) { set(to); onDone?.(); return; }
  const t0 = performance.now();
  const step = (now) => {
    const t = Math.min(1, (now - t0) / duration);
    const e = ease(t);
    set({ x: from.x + (to.x - from.x) * e, y: from.y + (to.y - from.y) * e, w: from.w + (to.w - from.w) * e, h: from.h + (to.h - from.h) * e });
    if (t < 1) svg._camRaf = requestAnimationFrame(step);
    else onDone?.();
  };
  svg._camRaf = requestAnimationFrame(step);
}

// Vuelve a encuadrar sin animación (por ejemplo, al girar el iPad).
export function refitCamera(container, vis) {
  const svg = container.querySelector('.scene svg');
  const t = svg?._camTarget?.target || 'overview';
  cameraTo(container, t, { vis: vis ?? svg?._camTarget?.vis, duration: 0 });
  placeLabels(container);
}

// Acercamiento de entrada para la bienvenida: empieza cerca del centro y se abre a la vista general.
export function introCamera(container, duration = 1700) {
  const svg = container.querySelector('.scene svg');
  if (!svg) return;
  const scene = container.querySelector('.scene');
  const ov = overviewBox(scene.clientWidth, scene.clientHeight);
  svg._cam = { x: ov.x + ov.w * 0.14, y: ov.y + ov.h * 0.16, w: ov.w * 0.72, h: ov.h * 0.72 };
  svg.setAttribute('viewBox', `${r1(svg._cam.x)} ${r1(svg._cam.y)} ${r1(svg._cam.w)} ${r1(svg._cam.h)}`);
  cameraTo(container, 'overview', { duration });
}

function officeTexts(s) {
  return {
    ledBack: `TRADING  ·  ${s.trading?.ticker || ''}`,
    ledLeft: `EN EL MAPA  ·  ${s.mapa?.line || ''}      UNIVERSIDAD  ·  ${s.uni?.line || ''}`,
  };
}

// Actualiza textos sin redibujar la escena (las animaciones no se reinician).
export function updateOffice(container, summaries) {
  const sum = officeTexts(summaries);
  const b = container.querySelector('[data-led="b"] text');
  const l = container.querySelector('[data-led="l"] text');
  if (!b) return;
  if (b.textContent !== sum.ledBack || l.textContent !== sum.ledLeft) {
    b.textContent = sum.ledBack;
    l.textContent = sum.ledLeft;
    measureLeds(container);
  }
  for (const id of ['mapa', 'trading', 'uni']) {
    const el = container.querySelector(`[data-label="${id}"] .sl-line`);
    if (el) el.textContent = summaries[id]?.line || '';
  }
}

function measureLeds(container) {
  container.querySelectorAll('.led-scroll').forEach((g) => {
    const t = g.querySelector('text');
    const dist = t.getComputedTextLength() + Number(g.dataset.len);
    g.style.setProperty('--dist', `${-r1(dist)}px`);
    g.style.setProperty('--dur', `${r1(Math.max(14, dist / 48))}s`);
  });
}

// Coloca las etiquetas HTML encima de la escena (texto nítido y botones grandes en cualquier tamaño).
export function placeLabels(container) {
  const scene = container.querySelector('.scene');
  if (!scene) return;
  const w = scene.clientWidth, h = scene.clientHeight;
  const k = Math.min(w / VB.w, h / VB.h);
  const ox = (w - VB.w * k) / 2, oy = (h - VB.h * k) / 2;
  for (const [id, a] of Object.entries(ANCHORS)) {
    const el = scene.querySelector(`[data-label="${id}"]`);
    const [x, y] = P(...a);
    el.style.left = `${r1(ox + (x - VB.x) * k)}px`;
    el.style.top = `${r1(oy + (y - VB.y) * k)}px`;
  }
  scene.style.setProperty('--k', k.toFixed(3));
}

export function pingZone(container, id) {
  const el = container.querySelector(`[data-label="${id}"]`);
  if (!el) return;
  el.classList.remove('ping');
  void el.offsetWidth;
  el.classList.add('ping');
  setTimeout(() => el.classList.remove('ping'), 1600);
}
