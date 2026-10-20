// Paquetes de objetivos preparados fuera de la app (por ejemplo, un plan hecho con Claude).
// Cada paquete se añade UNA sola vez: se marca en la tabla "meta" y no vuelve a aparecer,
// aunque después edites o borres sus objetivos. Nunca reemplaza datos existentes.
//
// Para añadir otro paquete: copia el bloque de abajo con un "id" nuevo.

import * as store from './store.js';

const PLAN_4D = 'https://claude.ai/artifact/4ztpC2gmVBTt4DF5FSdS7T';

export const PACKS = [
  {
    id: 'mapa-plan-4-dias-2026-10',
    goals: [
      {
        id: 'mapa-4d-pagina',
        title: 'Publicar la página con dominio y formulario funcionando',
        dept: 'mapa', priority: 'alta', status: 'pendiente', due: '2026-10-21',
        nextAction: 'Crear el formulario en Formspree y pegar su dirección en sitio/lib/manifest.js',
        notes: `Día 1. Formspree → Netlify (entrar con GitHub e importar en-el-mapa) → comprar dominio y conectarlo → email con tu dominio → probar formulario, WhatsApp y mapa desde el celular → enlace en la bio de Instagram.\nPlan: ${PLAN_4D}`,
      },
      {
        id: 'mapa-4d-bmedia',
        title: 'Permiso y catálogo de bMedia',
        dept: 'mapa', priority: 'baja', status: 'pendiente', due: '2026-10-21',
        nextAction: 'Escribirle a bMedia pidiendo permiso por escrito y el catálogo de billboards fijos y otras regiones',
        notes: 'Hasta tener el permiso por escrito, no promocionar el mapa de billboards en redes. Nunca publicar precios ni confirmar disponibilidad sin bMedia.',
      },
      {
        id: 'mapa-4d-contactos',
        title: 'Contactar 15 negocios sin página web',
        dept: 'mapa', priority: 'alta', status: 'pendiente', due: '2026-10-22',
        nextAction: 'Hacer en Google Maps una lista de 30 negocios sin botón "Sitio web"',
        notes: `Día 2. Anotar nombre, tipo, Instagram y teléfono; marcar los que podrían querer billboards. Escoger 2–3 clientes fundadores. Escribirle a 15 negocios con el mensaje del plan y a 5 personas cercanas. Día 4: seguimiento a los que no contestaron.\nPlan: ${PLAN_4D}`,
      },
      {
        id: 'mapa-4d-posts',
        title: 'Tener 6 posts listos y programados',
        dept: 'mapa', priority: 'media', status: 'pendiente', due: '2026-10-23',
        nextAction: 'Hacer 6 posts con las Plantillas de marca de Canva',
        notes: 'Día 3. 2 de ellos como Reels con "Animar". Programar en Meta Business Suite: lunes educativo, miércoles promoción, viernes trabajo real.',
      },
      {
        id: 'mapa-4d-marca',
        title: 'Brand Kit, Perfil de Google y WhatsApp Business',
        dept: 'mapa', priority: 'baja', status: 'pendiente', due: '2026-10-23',
        nextAction: 'Subir colores, logo y las 4 letras (redes/marca/fuentes) al Brand Kit de Canva',
        notes: 'Día 3. Colores: #A3B18A, #111310, #F1F2EC, #4A5737. Subir letras desde canva.com en Safari. Borrar las 2 carpetas vacías de Canva. WhatsApp Business: perfil, catálogo y respuestas rápidas. Perfil de Negocio en Google como negocio de servicio.',
      },
      {
        id: 'mapa-4d-paquetes',
        title: 'Definir paquetes, precios y cotización',
        dept: 'mapa', priority: 'media', status: 'pendiente', due: '2026-10-24',
        nextAction: 'Escoger 3 paquetes de página web y ponerles precio',
        notes: 'Día 4. Cotización en Canva y lista de preguntas para cada cliente nuevo. Los precios no tienen que estar publicados.',
      },
      {
        id: 'mapa-4d-medir',
        title: 'Medir la semana y planificar la próxima',
        dept: 'mapa', priority: 'baja', status: 'pendiente', due: '2026-10-24',
        nextAction: 'Anotar mensajes, contactos, conversaciones y cotizaciones de la semana',
        notes: 'Semana 2: 15 contactos nuevos, 3 posts, pedir un referido a cada cliente, privacidad y términos para la página.',
      },
    ],
  },
];

// Añade los paquetes que todavía no se han añadido. Devuelve cuántos objetivos se añadieron.
export async function applyPacks() {
  let added = 0;
  for (const pack of PACKS) {
    const flag = `pack:${pack.id}`;
    if (store.getMeta(flag)) continue;
    for (const goal of pack.goals) {
      if (store.get('goals', goal.id)) continue;
      await store.save('goals', { ...goal, createdAt: new Date().toISOString() });
      added++;
    }
    await store.setMeta(flag, new Date().toISOString());
  }
  return added;
}
