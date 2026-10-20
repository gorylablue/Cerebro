// Pruebas de la selección de «Objetivos pendientes». Ejecutar: npm test
import assert from 'node:assert/strict';
import { topPendingGoals } from '../js/logic/goals.js';

const g = (id, priority, extra = {}) => ({ id, priority, status: 'pendiente', createdAt: `2026-10-0${id.length}`, ...extra });
const ids = (list) => list.map((x) => x.id);

// Más de tres altas: solo las tres primeras altas
assert.deepEqual(ids(topPendingGoals([g('m', 'media'), g('a1', 'alta'), g('a2', 'alta'), g('a3', 'alta'), g('a4', 'alta')])).length, 3);
assert.ok(topPendingGoals([g('m', 'media'), g('a1', 'alta'), g('a2', 'alta'), g('a3', 'alta'), g('a4', 'alta')]).every((x) => x.priority === 'alta'));
// Menos de tres altas: se completa con media y luego baja
assert.deepEqual(ids(topPendingGoals([g('b', 'baja'), g('m', 'media'), g('a', 'alta')])), ['a', 'm', 'b']);
assert.deepEqual(ids(topPendingGoals([g('b', 'baja'), g('m1', 'media'), g('a', 'alta'), g('m2', 'media')])), ['a', 'm1', 'm2']);
// Sin altas: media antes que baja
assert.deepEqual(ids(topPendingGoals([g('b', 'baja'), g('m', 'media')])), ['m', 'b']);
// Completados excluidos; menos de tres en total
assert.deepEqual(ids(topPendingGoals([g('a', 'alta', { status: 'completado' }), g('m', 'media', { status: 'progreso' })])), ['m']);
assert.deepEqual(topPendingGoals([]), []);
// Dentro de la misma prioridad, la fecha límite más cercana primero
assert.deepEqual(ids(topPendingGoals([g('x', 'alta'), g('y', 'alta', { due: '2026-11-01' }), g('z', 'alta', { due: '2026-10-25' })])), ['z', 'y', 'x']);
console.log('✓ Todas las pruebas de objetivos pasaron');
