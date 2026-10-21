// Función de Netlify: recibe una copia de los datos de El Cerebro y la guarda en un
// repositorio PRIVADO de GitHub, donde Claude puede leerla para la revisión periódica.
//
// Variables de entorno (se configuran en Netlify, nunca en el código):
//   CEREBRO_SYNC_KEY  Clave que eliges tú; la app la envía en cada copia.
//   GITHUB_TOKEN      Token de GitHub con permiso Contents (lectura y escritura) solo sobre el repo privado.
//   GITHUB_REPO       Repositorio privado, por ejemplo: gorylablue/cerebro-datos
//   GITHUB_PATH       (opcional) Ruta del archivo. Por defecto: datos/cerebro.json

import { timingSafeEqual } from 'node:crypto';

const MAX_BYTES = 5 * 1024 * 1024;

const json = (status, body) => new Response(JSON.stringify(body), {
  status,
  headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
});

function sameKey(a, b) {
  const x = Buffer.from(String(a || ''));
  const y = Buffer.from(String(b || ''));
  return x.length === y.length && x.length > 0 && timingSafeEqual(x, y);
}

export default async function handler(req) {
  if (req.method !== 'POST') return json(405, { ok: false, error: 'Método no permitido.' });

  const { CEREBRO_SYNC_KEY, GITHUB_TOKEN, GITHUB_REPO } = process.env;
  const path = process.env.GITHUB_PATH || 'datos/cerebro.json';
  if (!CEREBRO_SYNC_KEY || !GITHUB_TOKEN || !GITHUB_REPO) {
    return json(500, { ok: false, error: 'Falta configurar las variables en Netlify (CEREBRO_SYNC_KEY, GITHUB_TOKEN, GITHUB_REPO).' });
  }
  if (!sameKey(req.headers.get('x-cerebro-key'), CEREBRO_SYNC_KEY)) {
    return json(401, { ok: false, error: 'La clave no coincide con la configurada en Netlify.' });
  }

  const text = await req.text();
  if (Buffer.byteLength(text) > MAX_BYTES) return json(413, { ok: false, error: 'La copia es demasiado grande.' });
  let backup;
  try { backup = JSON.parse(text); } catch { return json(400, { ok: false, error: 'La copia no es un JSON válido.' }); }
  if (backup?.format !== 'el-cerebro-backup' || typeof backup.data !== 'object') {
    return json(400, { ok: false, error: 'El contenido no es una copia de El Cerebro.' });
  }

  const api = `https://api.github.com/repos/${GITHUB_REPO}/contents/${path}`;
  const headers = {
    authorization: `Bearer ${GITHUB_TOKEN}`,
    accept: 'application/vnd.github+json',
    'x-github-api-version': '2022-11-28',
    'user-agent': 'el-cerebro-sync',
  };
  const content = JSON.stringify(backup, null, 2);

  // Se lee el archivo actual para obtener su "sha" (GitHub lo exige para reemplazarlo)
  // y para no crear un commit si no cambió nada.
  let sha;
  const cur = await fetch(api, { headers });
  if (cur.ok) {
    const info = await cur.json();
    sha = info.sha;
    if (info.content) {
      const prev = Buffer.from(info.content, 'base64').toString('utf8');
      try {
        if (JSON.stringify(JSON.parse(prev).data) === JSON.stringify(backup.data)) return json(200, { ok: true, unchanged: true });
      } catch { /* se reemplaza si el archivo anterior estaba dañado */ }
    }
  } else if (cur.status !== 404) {
    return json(502, { ok: false, error: `GitHub respondió ${cur.status} al leer el repositorio. Revisa GITHUB_REPO y el token.` });
  }

  const put = await fetch(api, {
    method: 'PUT',
    headers: { ...headers, 'content-type': 'application/json' },
    body: JSON.stringify({
      message: `Copia de El Cerebro ${backup.exportedAt || new Date().toISOString()}`,
      content: Buffer.from(content).toString('base64'),
      ...(sha ? { sha } : {}),
    }),
  });
  if (!put.ok) {
    const detail = put.status === 409 ? 'conflicto, se reintentará en la próxima copia' : `GitHub respondió ${put.status}`;
    return json(502, { ok: false, error: `No se pudo guardar la copia (${detail}).` });
  }
  return json(200, { ok: true });
}
