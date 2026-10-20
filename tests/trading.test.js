// Pruebas de los cálculos de trading con casos conocidos. Ejecutar: npm test
import assert from 'node:assert/strict';
import { computeStats, netResult, tradeR, outcome, plannedRR, groupStats, monthKey } from '../js/logic/trading.js';

const close = (a, b) => assert.ok(Math.abs(a - b) < 1e-9, `${a} ≠ ${b}`);

// Caso 1: sin operaciones → todo no disponible
let s = computeStats([]);
assert.equal(s.closed, 0); assert.equal(s.winRate, null); assert.equal(s.netProfit, null); assert.equal(s.expectancy, null);

// Caso 2: conjunto conocido
const T = [
  { id: 'a', status: 'cerrada', instrument: 'EURUSD', setup: 'Ruptura', result: 200, fees: 5, riskAmount: 100, openedAt: '2026-10-01T14:00:00Z' }, // neto 195, R 1.95
  { id: 'b', status: 'cerrada', instrument: 'EURUSD', setup: 'Ruptura', result: -100, fees: 5, riskAmount: 100, openedAt: '2026-10-02T14:00:00Z' }, // neto -105, R -1.05
  { id: 'c', status: 'cerrada', instrument: 'NQ', setup: 'Retroceso', result: 0, openedAt: '2026-10-03T14:00:00Z' }, // BE, sin R
  { id: 'd', status: 'cerrada', instrument: 'NQ', setup: 'Retroceso', result: 300, rManual: 3, openedAt: '2026-11-01T14:00:00Z' }, // neto 300, R manual 3
  { id: 'e', status: 'cerrada', instrument: 'NQ', setup: 'Retroceso', result: -50, riskAmount: 50, openedAt: '2026-11-02T14:00:00Z' }, // neto -50, R -1
  { id: 'f', status: 'abierta', instrument: 'NQ', result: 999, riskAmount: 10 }, // excluida
  { id: 'g', status: 'cancelada', instrument: 'NQ', result: -999 }, // excluida
  { id: 'h', status: 'cerrada', instrument: 'GC' }, // cerrada sin resultado
];
s = computeStats(T);
assert.equal(s.total, 8); assert.equal(s.open, 1); assert.equal(s.cancelled, 1);
assert.equal(s.closed, 6); assert.equal(s.withResult, 5); assert.equal(s.missingResult, 1);
assert.equal(s.wins, 2); assert.equal(s.losses, 2); assert.equal(s.be, 1);
close(s.winRate, 0.5);                      // BE excluido
close(s.netProfit, 195 - 105 + 0 + 300 - 50); // 340
close(s.grossProfit, 495); close(s.grossLoss, -155);
close(s.fees, 10);
close(s.avgWin, 247.5); close(s.avgLoss, -77.5);
close(s.payoff, 247.5 / 77.5);
close(s.profitFactor, 495 / 155);
close(s.expectancy, 340 / 5);
assert.equal(s.rCount, 4);                  // c no tiene R, h no tiene resultado
close(s.totalR, 1.95 - 1.05 + 3 - 1);
close(s.expectancyR, (1.95 - 1.05 + 3 - 1) / 4);
close(s.avgWinR, (1.95 + 3) / 2); close(s.avgLossR, (-1.05 - 1) / 2);

// Definiciones individuales
close(netResult(T[0]), 195); close(tradeR(T[0]), 1.95);
assert.equal(tradeR(T[2]), null); assert.equal(outcome(T[2]), 'be'); assert.equal(outcome(T[7]), null);
// R calculado tiene prioridad sobre el manual cuando hay riesgo monetario
close(tradeR({ result: 100, riskAmount: 50, rManual: 9 }), 2);
// Riesgo 0 no divide entre cero
assert.equal(tradeR({ result: 100, riskAmount: 0 }), null);
// R:R planificado (solo informativo)
close(plannedRR({ entry: 100, stop: 95, target: 115 }), 3);
assert.equal(plannedRR({ entry: 100, stop: 100, target: 115 }), null);

// Agrupaciones
const byInst = Object.fromEntries(groupStats(T, (t) => t.instrument).map((g) => [g.key, g]));
assert.equal(byInst.EURUSD.n, 2); close(byInst.EURUSD.net, 90); close(byInst.EURUSD.winRate, 0.5);
assert.equal(byInst.NQ.n, 3); close(byInst.NQ.net, 250); assert.equal(byInst.NQ.be, 1);
assert.equal(byInst.GC.net, null); assert.equal(byInst.GC.missing, 1);
const byMonth = Object.fromEntries(groupStats(T, monthKey).map((g) => [g.key, g]));
close(byMonth['2026-10'].net, 90); close(byMonth['2026-11'].net, 250);

// Editar y eliminar actualiza las cifras (las estadísticas se recalculan desde los datos)
const edited = T.map((t) => (t.id === 'b' ? { ...t, result: 150 } : t)).filter((t) => t.id !== 'e');
s = computeStats(edited);
assert.equal(s.wins, 3); assert.equal(s.losses, 0); assert.equal(s.winRate, 1);
close(s.netProfit, 195 + 145 + 0 + 300);
assert.equal(s.profitFactor, null); // sin pérdidas, no se puede calcular

console.log('✓ Todas las pruebas de trading pasaron');
