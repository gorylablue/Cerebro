// Pruebas de la función de copia privada (GitHub simulado). Ejecutar: npm test
import assert from 'node:assert/strict';
import handler from '../netlify/functions/sync.mjs';

const files = new Map();
let puts = 0;
globalThis.fetch = async (url, opts = {}) => {
  assert.ok(url.startsWith('https://api.github.com/repos/yo/datos/contents/datos/cerebro.json'));
  assert.equal(opts.headers.authorization, 'Bearer tok');
  if (!opts.method) {
    const f = files.get(url);
    return f ? new Response(JSON.stringify(f), { status: 200 }) : new Response('{}', { status: 404 });
  }
  puts++;
  const body = JSON.parse(opts.body);
  const prev = files.get(url);
  if (prev && body.sha !== prev.sha) return new Response('{}', { status: 409 });
  files.set(url, { sha: `sha${puts}`, content: body.content });
  return new Response('{}', { status: 201 });
};

const backup = (n) => ({ format: 'el-cerebro-backup', version: 1, exportedAt: `2026-10-21T1${n}:00:00Z`, data: { goals: [{ id: String(n) }] } });
const call = (body, key = 'clave-secreta', method = 'POST') => handler(new Request('https://x/.netlify/functions/sync', {
  method, headers: { 'x-cerebro-key': key }, body: method === 'POST' ? (typeof body === 'string' ? body : JSON.stringify(body)) : undefined,
}));

process.env.GITHUB_TOKEN = 'tok'; process.env.GITHUB_REPO = 'yo/datos';
let r = await call(backup(1));
assert.equal(r.status, 500, 'sin CEREBRO_SYNC_KEY debe avisar de la configuración');
process.env.CEREBRO_SYNC_KEY = 'clave-secreta';

assert.equal((await call(backup(1), 'otra')).status, 401);
assert.equal((await call(backup(1), '')).status, 401);
assert.equal((await call(backup(1), 'clave-secreta', 'GET')).status, 405);
assert.equal((await call('no es json')).status, 400);
assert.equal((await call({ hola: 1 })).status, 400);
assert.equal(puts, 0, 'nada se escribe si la petición no es válida');

r = await call(backup(1)); assert.equal(r.status, 200); assert.equal(puts, 1);
const saved = JSON.parse(Buffer.from([...files.values()][0].content, 'base64').toString());
assert.deepEqual(saved.data, backup(1).data);
r = await call({ ...backup(1), exportedAt: 'otra hora' }); assert.equal((await r.json()).unchanged, true); assert.equal(puts, 1, 'sin cambios no hay commit');
r = await call(backup(2)); assert.equal(r.status, 200); assert.equal(puts, 2, 'reemplaza usando el sha actual');
console.log('✓ Todas las pruebas de la copia privada pasaron');
