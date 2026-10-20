// Selección de objetivos pendientes para la pantalla principal.
// Regla: primero prioridad alta, luego media y luego baja; dentro de cada prioridad,
// la fecha límite más cercana primero (sin fecha al final) y después el más antiguo.

const RANK = { alta: 0, media: 1, baja: 2 };

export function topPendingGoals(goals, limit = 3) {
  return goals
    .filter((g) => g.status !== 'completado')
    .sort((a, b) => (RANK[a.priority] ?? 1) - (RANK[b.priority] ?? 1)
      || `${a.due || '9999-99-99'} ${a.dueTime || '99:99'}`.localeCompare(`${b.due || '9999-99-99'} ${b.dueTime || '99:99'}`)
      || (a.createdAt || '').localeCompare(b.createdAt || ''))
    .slice(0, limit);
}
