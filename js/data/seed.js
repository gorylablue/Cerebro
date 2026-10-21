// Paquetes de objetivos y publicaciones preparados fuera de la app (por ejemplo, un plan hecho con Claude).
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
  {
    // Calendario de la colección de 10 publicaciones: una cada 2 días a partir del 23 de octubre.
    id: 'mapa-coleccion-10-calendario',
    posts: [
          {
                "id": "mapa-col10-post03",
                "title": "03 · Anuncio: creamos páginas web (carrusel: video + imagen)",
                "platform": "Instagram",
                "contentType": "Carrusel",
                "status": "listo",
                "plannedDate": "2026-10-23",
                "caption": "Tu próximo cliente te está buscando. ¿Te va a encontrar? 👀\n\nEn En el Mapa creamos páginas web para negocios: diseño a la medida de tu marca, hecha para verse bien en el celular y con botones para que te escriban o te llamen con un toque.\n\n📲 Escríbenos por DM o al (787) 920-4410 y conversemos sobre la tuya.\n\n#PaginasWeb #DiseñoWeb #PuertoRico #NegociosPR #PequeñosNegocios #EmprendedoresPR #HechoEnPR #EnElMapa",
                "designLink": "redes/coleccion-10 · 03-video-promocional → sube primero 01-video-promocional.mp4 y después 02-imagen-complementaria.png en el mismo post. Como portada del video usa 00-portada-del-video.png (en Instagram: Editar portada → Agregar desde la galería).",
                "notes": "Programar en Instagram para las 7:00 p.m. Colección de 10 publicaciones."
          },
          {
                "id": "mapa-col10-post04",
                "title": "04 · Tres señales de que necesitas una web (carrusel, 5 imágenes)",
                "platform": "Instagram",
                "contentType": "Carrusel",
                "status": "listo",
                "plannedDate": "2026-10-25",
                "caption": "¿Te preguntan todos los días dónde estás o a qué hora abres? Esa es una señal. 🚩\n\nDesliza y revisa las tres. Si te identificas con alguna, es momento de darle a tu negocio su propio espacio en internet.\n\nGuarda este post y compártelo con alguien que tiene un negocio 🙌\n\n#PaginasWeb #NegociosPR #PequeñosNegocios #EmprendedoresPR #PresenciaDigital #DiseñoWeb #PuertoRico #EnElMapa",
                "designLink": "redes/coleccion-10 · 02-carruseles/04-tres-senales",
                "notes": "Programar en Instagram para las 7:00 p.m. Colección de 10 publicaciones."
          },
          {
                "id": "mapa-col10-post05",
                "title": "05 · Lo que debe tener una buena página web (carrusel, 7 imágenes)",
                "platform": "Instagram",
                "contentType": "Carrusel",
                "status": "listo",
                "plannedDate": "2026-10-27",
                "caption": "Checklist rápido para tu página web ✅\n\nInformación clara, servicios bien presentados, botones de contacto, diseño para el celular y navegación sencilla.\n\n¿Cuántas tiene la tuya? Guarda este post para revisarla con calma.\n\nSi te faltan, te ayudamos: DM o (787) 920-4410.\n\n#DiseñoWeb #PaginasWeb #Checklist #NegociosPR #EmprendedoresPR #PresenciaDigital #PuertoRico #EnElMapa",
                "designLink": "redes/coleccion-10 · 02-carruseles/05-que-debe-tener",
                "notes": "Programar en Instagram para las 7:00 p.m. Colección de 10 publicaciones."
          },
          {
                "id": "mapa-col10-post06",
                "title": "06 · Una página web es más que diseño (individual)",
                "platform": "Instagram",
                "contentType": "Post",
                "status": "listo",
                "plannedDate": "2026-10-29",
                "caption": "Que se vea bonita es solo el comienzo. ✨\n\nUna buena página web también tiene que ser fácil de usar y dejar claro qué ofreces. Cuando las tres cosas se juntan, tus clientes se quedan… y te escriben.\n\n#DiseñoWeb #PaginasWeb #ExperienciaDeUsuario #NegociosPR #PequeñosNegocios #PuertoRico #EnElMapa",
                "designLink": "redes/coleccion-10 · 01-publicaciones-individuales/06-mas-que-diseno.png",
                "notes": "Programar en Instagram para las 7:00 p.m. Colección de 10 publicaciones."
          },
          {
                "id": "mapa-col10-post07",
                "title": "07 · Tu negocio merece una presentación a su altura (individual)",
                "platform": "Instagram",
                "contentType": "Post",
                "status": "listo",
                "plannedDate": "2026-10-31",
                "caption": "Le has puesto horas, esfuerzo y cariño a tu negocio. 💚\n\nMerece una presentación que esté a la altura: una página que hable bien de ti, incluso cuando no estás.\n\nCuando estés listo, conversemos.\n\n#EmprendedoresPR #PequeñosNegocios #NegociosPR #PaginasWeb #OrgulloBoricua #PuertoRico #EnElMapa",
                "designLink": "redes/coleccion-10 · 01-publicaciones-individuales/07-presentacion-profesional.png",
                "notes": "Programar en Instagram para las 7:00 p.m. Colección de 10 publicaciones."
          },
          {
                "id": "mapa-col10-post08",
                "title": "08 · Tres mitos sobre las páginas web (carrusel, 5 imágenes)",
                "platform": "Instagram",
                "contentType": "Carrusel",
                "status": "listo",
                "plannedDate": "2026-11-02",
                "caption": "“Mi negocio es muy pequeño para tener página.” ¿Te suena? 🙅\n\nDesliza: desmentimos tres mitos que hacen que muchos negocios se queden fuera del mapa.\n\n¿Cuál habías escuchado? Cuéntanos en los comentarios 👇\n\n#MitosYRealidades #PaginasWeb #NegociosPR #PequeñosNegocios #EmprendedoresPR #DiseñoWeb #PuertoRico #EnElMapa",
                "designLink": "redes/coleccion-10 · 02-carruseles/08-mitos",
                "notes": "Programar en Instagram para las 7:00 p.m. Colección de 10 publicaciones."
          },
          {
                "id": "mapa-col10-post09",
                "title": "09 · Así trabajamos en En el Mapa (carrusel, 7 imágenes)",
                "platform": "Instagram",
                "contentType": "Carrusel",
                "status": "listo",
                "plannedDate": "2026-11-04",
                "caption": "¿Cómo es hacer una página web con nosotros? Simple y paso a paso. 🗺️\n\n1. Conocemos tu negocio\n2. Organizamos la información\n3. Diseñamos tu página\n4. Revisamos que todo funcione (tú la ves antes de publicarla)\n5. Coordinamos la entrega\n\nEmpecemos por el paso uno: escríbenos por DM o al (787) 920-4410.\n\n#PaginasWeb #DiseñoWeb #ProcesoCreativo #NegociosPR #EmprendedoresPR #PuertoRico #EnElMapa",
                "designLink": "redes/coleccion-10 · 02-carruseles/09-como-trabajamos",
                "notes": "Programar en Instagram para las 7:00 p.m. Colección de 10 publicaciones."
          },
          {
                "id": "mapa-col10-post10",
                "title": "10 · Conversemos sobre tu página web (individual)",
                "platform": "Instagram",
                "contentType": "Post",
                "status": "listo",
                "plannedDate": "2026-11-06",
                "caption": "¿Tienes un negocio y quieres que te encuentren más fácil? Conversemos. ☕\n\nCuéntanos qué haces y te orientamos sin compromiso.\n\n📲 WhatsApp y llamadas: (787) 920-4410\n📍 DM: @enelmapapr\n\n#PaginasWeb #DiseñoWeb #NegociosPR #PequeñosNegocios #EmprendedoresPR #PuertoRico #HechoEnPR #EnElMapa",
                "designLink": "redes/coleccion-10 · 01-publicaciones-individuales/10-comunicate.png",
                "notes": "Programar en Instagram para las 7:00 p.m. Colección de 10 publicaciones."
          }
    ],
  },
];

// Añade los paquetes que todavía no se han añadido (objetivos y publicaciones). Devuelve cuántos elementos se añadieron.
export async function applyPacks() {
  let added = 0;
  for (const pack of PACKS) {
    const flag = `pack:${pack.id}`;
    if (store.getMeta(flag)) continue;
    for (const table of ['goals', 'posts']) {
      for (const item of pack[table] || []) {
        if (store.get(table, item.id)) continue;
        await store.save(table, { ...item, createdAt: new Date().toISOString() });
        added++;
      }
    }
    await store.setMeta(flag, new Date().toISOString());
  }
  return added;
}
