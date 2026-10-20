// Configuración central: departamentos, estados y listas de opciones.
// Cambiar un nombre o color aquí lo cambia en toda la app.

// Nombre que aparece en la bienvenida.
export const OWNER_NAME = 'José';

export const DEPTS = {
  mapa:    { id: 'mapa',    name: 'En El Mapa',  color: '#34d3b4', tint: '#0f2a28' },
  trading: { id: 'trading', name: 'Trading',     color: '#f2b544', tint: '#211d14' },
  uni:     { id: 'uni',     name: 'Universidad', color: '#a48bfa', tint: '#1e1934' },
};
export const DEPT_IDS = ['mapa', 'trading', 'uni'];
export const GENERAL = { id: 'general', name: 'General', color: '#8f9bb3', tint: '#1a1f2b' };
export const dept = (id) => DEPTS[id] || GENERAL;

export const PRIORITIES = [
  { value: 'alta', label: 'Alta' },
  { value: 'media', label: 'Media' },
  { value: 'baja', label: 'Baja' },
];
export const PRIORITY_RANK = { alta: 0, media: 1, baja: 2 };

export const STATUSES = [
  { value: 'pendiente', label: 'Pendiente' },
  { value: 'progreso', label: 'En progreso' },
  { value: 'completado', label: 'Completado' },
];
export const statusLabel = (v) => STATUSES.find((s) => s.value === v)?.label || 'Pendiente';

export const UPDATE_TYPES = [
  { value: 'avance', label: 'Avance' },
  { value: 'tarea', label: 'Tarea' },
  { value: 'problema', label: 'Problema' },
  { value: 'idea', label: 'Idea' },
  { value: 'aprendizaje', label: 'Aprendizaje' },
  { value: 'nota', label: 'Nota' },
];
export const updateTypeLabel = (v) => UPDATE_TYPES.find((t) => t.value === v)?.label || '';

export const DEPT_OPTIONS = [
  ...['mapa', 'trading', 'uni'].map((id) => ({ value: id, label: DEPTS[id].name })),
  { value: 'general', label: 'General' },
];
