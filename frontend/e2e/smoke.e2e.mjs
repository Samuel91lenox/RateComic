import assert from 'node:assert/strict';

const url = 'http://localhost:4200';

async function run() {
  const response = await fetch(url);
  assert.equal(response.status, 200, 'La home de frontend debe responder 200');

  const html = await response.text();
  assert.ok(html.includes('<app-root'), 'El HTML debe incluir el host app-root');

  console.log('E2E frontend OK: home cargada correctamente.');
}

run().catch((error) => {
  console.error('E2E frontend fallo:', error.message);
  process.exit(1);
});
