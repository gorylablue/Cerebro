// Pruebas del orden de «Objetivos pendientes» (por fecha de entrega). Ejecutar: npm test
import assert from 'node:assert/strict';
import { topPendingGoals, sortByDue } from '../js/logic/goals.js';

const g = (id, extra = {}) => ({ id, priority: 'media', status: 'pendiente', createdAt: `2026-10-01T00:00:0${id.length}Z`, ...extra });
const ids = (list) => list.map((x) => x.id);

// La fecha manda sobre la prioridad
assert.deepEqual(ids(sortByDue([
  g('alta-lejos', { priority: 'alta', due: '2026-11-30' }),
  g('baja-cerca', { priority: 'baja', due: '2026-10-22' }),
  g('media-medio', { due: '2026-10-25' }),
])), ['baja-cerca', 'media-medio', 'alta-lejos']);
// Vencidos arriba; sin fecha al final
assert.deepEqual(ids(sortByDue([g('sin'), g('futuro', { due: '2026-12-01' }), g('vencido', { due: '2026-10-01' })])), ['vencido', 'futuro', 'sin']);
// Misma fecha: primero la hora más temprana; sin hora después de las que tienen hora
assert.deepEqual(ids(sortByDue([
  g('tarde', { due: '2026-10-23', dueTime: '18:00' }),
  g('sinhora', { due: '2026-10-23' }),
  g('manana', { due: '2026-10-23', dueTime: '09:30' }),
])), ['manana', 'tarde', 'sinhora']);
// Misma fecha y hora: decide la prioridad
assert.deepEqual(ids(sortByDue([g('b', { priority: 'baja', due: '2026-10-23' }), g('a', { priority: 'alta', due: '2026-10-23' })])), ['a', 'b']);
// Sin fechas: decide la prioridad
assert.deepEqual(ids(sortByDue([g('b', { priority: 'baja' }), g('m'), g('a', { priority: 'alta' })])), ['a', 'm', 'b']);
// Máximo tres, sin completados
assert.equal(topPendingGoals([g('1', { due: '2026-10-21' }), g('2', { due: '2026-10-22' }), g('3', { due: '2026-10-23' }), g('4', { due: '2026-10-24' })]).length, 3);
assert.deepEqual(ids(topPendingGoals([g('hecho', { status: 'completado', due: '2026-10-01' }), g('p', { due: '2026-10-30' })])), ['p']);
assert.deepEqual(topPendingGoals([]), []);
console.log('✓ Todas las pruebas de objetivos pasaron');
