# El Cerebro

Centro de operaciones personal: **En El Mapa**, **Trading** y **Universidad**.
Es una aplicación web pensada primero para iPad, que se instala en la pantalla de inicio y guarda los datos en el propio dispositivo.

## Cómo usarla

1. Abre la dirección de Netlify en Safari.
2. Pulsa **Compartir → Añadir a pantalla de inicio**.
3. Úsala **siempre desde ese icono**. Safari y el icono guardan los datos por separado.
4. Haz un respaldo cada semana: **Datos → Exportar respaldo completo → Guardar en Archivos → iCloud Drive**.

## Qué incluye la versión 1

| Área | Funciones |
|---|---|
| Pantalla principal | Trading floor isométrico animado (estaciones circulares, En El Mapa y Universidad), pantallas LED y etiquetas con datos reales, panel de operaciones abiertas, calendario económico de TradingView, prioridades en un panel plegable |
| Objetivos | Crear, editar, completar y eliminar; prioridad, estado, fecha límite, próxima acción y notas |
| UPDATE | Registro rápido con departamento, tipo opcional y vínculo opcional a un objetivo |
| Daily Log | Historial por días, búsqueda por palabras y filtros por departamento y fecha |
| Trading | Diario de operaciones con filtros; estadísticas con definiciones explícitas |
| En El Mapa | Página web (tareas, cambios, problemas, ideas, notas técnicas e historial), Aprendizaje (buscable) y Contenido (lista por estado y calendario) |
| Universidad | Asignaciones, exámenes y proyectos ordenables; próximas fechas; cursos con progreso y materiales |
| Datos | Exportar JSON y CSV, restaurar desde un respaldo, borrar todo |
| App | Se instala en la pantalla de inicio y abre sin conexión después de la primera visita |

**Pendiente (no implementado):**
- Sincronización entre iPad e iPhone.
- Subir imágenes; por ahora la captura de un trade es un enlace o una referencia.
- Gráficos de trading.
- Asistentes de IA.
- Notificaciones.

## Estructura del código

No hay paso de compilación: Netlify publica los archivos tal cual.

```
index.html              Página única
css/app.css             Todos los estilos (las variables de color están arriba)
js/app.js               Arranque, barra superior y navegación
js/config.js            Departamentos, colores, estados y prioridades
js/data/                ACCESO A DATOS: el único lugar que toca el almacenamiento
  db.js                 IndexedDB (tablas)
  store.js              Guardar, leer, borrar y avisar a la interfaz
  backup.js             Exportar e importar respaldos
js/logic/               LÓGICA: cálculos sin interfaz (se pueden probar y reutilizar)
  trading.js            Definiciones y estadísticas de trading
  summary.js            Resúmenes para la oficina
  util.js               Fechas y texto
js/ui/                  INTERFAZ: pantallas y componentes
  office.js             La escena isométrica del trading floor (SVG generado en código)
  hud.js                Paneles de operaciones abiertas y calendario económico
tests/trading.test.js   Pruebas de los cálculos (node tests/trading.test.js)
sw.js                   Copia de la app para abrir sin conexión
```

### Cambios sencillos

- **Colores o nombres de departamentos:** `js/config.js`.
- **Colores generales y tamaños:** las variables `--...` al principio de `css/app.css`.
- **Opciones de formularios** (plataformas, tipos de contenido, emociones…): las listas al principio de `js/ui/dept-*.js`.
- **Si cambias archivos, sube el número de `CACHE` en `sw.js`** (por ejemplo `cerebro-v3` → `cerebro-v4`). Así la app instalada descarga la versión nueva.

## Calendario económico

- Se usa el widget oficial y gratuito de TradingView.
- La app no recibe esos datos: TradingView los muestra dentro de su propio recuadro, que necesita internet.
- Las monedas se sugieren a partir de los instrumentos del diario y se pueden cambiar en el lápiz del panel.
- La API de Myfxbook no ofrece el calendario, por eso no se usa.

## Almacenamiento: decisión y límites

Los datos viven en **IndexedDB**, dentro del navegador del dispositivo.

**Ventajas:**
- Es fiable y rápido.
- No necesita cuentas, servidores ni claves secretas.
- Es gratis.
- Funciona sin conexión.

**Límites:**
- **No se sincroniza** entre dispositivos.
- Los datos se pierden si se borran los datos del sitio en Safari o si se pierde el iPad. Por eso existen el respaldo y la restauración.

Netlify solo publica la página; no guarda tus datos.

## Evolución prevista

- **Sincronización (Supabase):**
  - Se reemplaza `js/data/db.js` por una versión que lea y escriba en Supabase, con inicio de sesión y reglas de acceso (Row Level Security) para que solo tú veas tus filas.
  - En el navegador solo iría la clave pública «anon»; la clave secreta nunca va en el código.
  - Los respaldos JSON actuales servirán para migrar los datos.
- **Asistentes de IA:**
  - Cada departamento ya tiene sus datos en tablas separadas y sus cálculos en `js/logic/`.
  - Un asistente podría recibir esos datos y esos cálculos sin tocar la interfaz.
  - Las llamadas a un modelo de IA tendrían que pasar por una función del servidor (por ejemplo, Netlify Functions) para no exponer claves.
  - Los personajes de la oficina (`js/ui/office.js`) son solo decoración; podrán enlazarse a esos asistentes más adelante.
