// Lógica del diario de trading: definiciones y estadísticas.
// No depende de la interfaz ni del almacenamiento, así que se puede probar por separado
// (y en el futuro un asistente de IA podrá usar exactamente las mismas funciones).
//
// DEFINICIONES
// - Solo cuentan las operaciones CERRADAS. Abiertas y canceladas se excluyen.
// - Resultado neto = resultado registrado − comisiones/costos (si se registraron).
//   Si no registraste el resultado, la operación aparece como "sin resultado" y no entra en las cifras.
// - Ganadora: neto > 0. Perdedora: neto < 0. Break-even: neto = 0.
// - Win rate = ganadoras ÷ (ganadoras + perdedoras). El break-even se excluye y se muestra aparte.
// - R de una operación = resultado neto ÷ riesgo monetario inicial.
//   Si no hay riesgo monetario, se usa el R que registraste manualmente; si tampoco existe, R = no disponible.
// - Expectativa = resultado neto total ÷ operaciones cerradas con resultado (también en R, con las que tienen R).
// - R:R realizado = ganancia media ÷ |pérdida media|.
// - Profit factor = ganancia bruta ÷ |pérdida bruta|.
// El precio de entrada, el stop y el take profit NUNCA se usan para inventar el resultado.

const EPS = 1e-9;
const num = (v) => (typeof v === 'number' && isFinite(v) ? v : null);

export function netResult(t) {
  const result = num(t.result);
  if (result === null) return null;
  return result - (num(t.fees) || 0);
}

export function tradeR(t) {
  const net = netResult(t);
  const risk = num(t.riskAmount);
  if (net !== null && risk !== null && risk > 0) return net / risk;
  return num(t.rManual);
}

export function outcome(t) {
  const net = netResult(t);
  if (net === null) return null;
  if (net > EPS) return 'win';
  if (net < -EPS) return 'loss';
  return 'be';
}

// R:R planificado a partir de entrada, stop y objetivo (solo informativo).
export function plannedRR(t) {
  const e = num(t.entry), s = num(t.stop), tp = num(t.target);
  if (e === null || s === null || tp === null) return null;
  const risk = Math.abs(e - s);
  if (risk < EPS) return null;
  return Math.abs(tp - e) / risk;
}

export function tradeDate(t) {
  return t.closedAt || t.openedAt || t.createdAt || '';
}

function sum(arr) { return arr.reduce((a, b) => a + b, 0); }
const avg = (arr) => (arr.length ? sum(arr) / arr.length : null);

export function computeStats(trades) {
  const closed = trades.filter((t) => t.status === 'cerrada');
  const withResult = closed.filter((t) => netResult(t) !== null);
  const nets = withResult.map(netResult);
  const winsArr = nets.filter((n) => n > EPS);
  const lossArr = nets.filter((n) => n < -EPS);
  const wins = winsArr.length;
  const losses = lossArr.length;
  const be = nets.length - wins - losses;
  const grossProfit = sum(winsArr);
  const grossLoss = sum(lossArr); // negativo
  const avgWin = wins ? grossProfit / wins : null;
  const avgLoss = losses ? grossLoss / losses : null;
  const rs = closed.map(tradeR).filter((r) => r !== null);
  const winRs = closed.filter((t) => outcome(t) === 'win').map(tradeR).filter((r) => r !== null);
  const lossRs = closed.filter((t) => outcome(t) === 'loss').map(tradeR).filter((r) => r !== null);

  return {
    total: trades.length,
    open: trades.filter((t) => t.status === 'abierta').length,
    cancelled: trades.filter((t) => t.status === 'cancelada').length,
    closed: closed.length,
    withResult: withResult.length,
    missingResult: closed.length - withResult.length,
    wins, losses, be,
    winRate: wins + losses > 0 ? wins / (wins + losses) : null,
    netProfit: withResult.length ? sum(nets) : null,
    grossProfit: withResult.length ? grossProfit : null,
    grossLoss: withResult.length ? grossLoss : null,
    fees: sum(withResult.map((t) => num(t.fees) || 0)),
    avgWin,
    avgLoss,
    payoff: avgWin !== null && avgLoss !== null && Math.abs(avgLoss) > EPS ? avgWin / Math.abs(avgLoss) : null,
    profitFactor: wins && losses ? grossProfit / Math.abs(grossLoss) : null,
    expectancy: withResult.length ? sum(nets) / withResult.length : null,
    rCount: rs.length,
    totalR: rs.length ? sum(rs) : null,
    expectancyR: avg(rs),
    avgWinR: avg(winRs),
    avgLossR: avg(lossRs),
  };
}

// Agrupa las operaciones cerradas por una clave y calcula un resumen por grupo.
export function groupStats(trades, keyFn) {
  const groups = new Map();
  for (const t of trades.filter((x) => x.status === 'cerrada')) {
    const k = keyFn(t) || 'Sin especificar';
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k).push(t);
  }
  return [...groups].map(([key, list]) => {
    const s = computeStats(list);
    return { key, n: s.closed, wins: s.wins, losses: s.losses, be: s.be, winRate: s.winRate, net: s.netProfit, expectancyR: s.expectancyR, missing: s.missingResult };
  });
}

export function monthKey(t) { return tradeDate(t).slice(0, 7); }

// Semana que empieza en lunes, en hora local: devuelve la fecha AAAA-MM-DD del lunes.
export function weekKey(t) {
  const iso = tradeDate(t);
  if (!iso) return '';
  const d = new Date(iso);
  const day = (d.getDay() + 6) % 7;
  const m = new Date(d.getFullYear(), d.getMonth(), d.getDate() - day);
  return `${m.getFullYear()}-${String(m.getMonth() + 1).padStart(2, '0')}-${String(m.getDate()).padStart(2, '0')}`;
}
