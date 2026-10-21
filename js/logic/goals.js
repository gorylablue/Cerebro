// Orden de los objetivos: por fecha de entrega.
// - Primero la fecha (y hora) más cercana; los vencidos quedan arriba.
// - Los que no tienen fecha van al final.
// - Si dos tienen la misma fecha y hora, decide la prioridad (alta → media → baja)
//   y después el más antiguo.

const RANK = { alta: 0, media: 1, baja: 2 };
const dueKey = (g) => `${g.due || '9999-99-99'} ${g.due ? (g.dueTime || '99:99') : '99:99'}`;

export function compareByDue(a, b) {
  return dueKey(a).localeCompare(dueKey(b))
    || (RANK[a.priority] ?? 1) - (RANK[b.priority] ?? 1)
    || (a.createdAt || '').localeCompare(b.createdAt || '');
}

export function sortByDue(goals) {
  return [...goals].sort(compareByDue);
}

export function topPendingGoals(goals, limit = 3) {
  return sortByDue(goals.filter((g) => g.status !== 'completado')).slice(0, limit);
}
