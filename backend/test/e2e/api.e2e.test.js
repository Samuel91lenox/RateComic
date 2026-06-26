'use strict';

const fs = require('fs');
const path = require('path');
const request = require('supertest');

const testDbPath = path.resolve(__dirname, '../../data/ratecomic.e2e.db');

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'e2e_test_secret';
process.env.DB_PATH = testDbPath;

if (fs.existsSync(testDbPath)) {
  fs.rmSync(testDbPath, { force: true });
}

const app = require('../../src/app');
const db = require('../../src/database/db');

describe('API e2e', () => {
  function randomUserPayload(prefix = 'user') {
    const ts = Date.now();
    return {
      username: `${prefix}_${ts}`,
      email: `${prefix}_${ts}@example.com`,
      password: 'password123',
    };
  }

  async function registerAndGetToken(prefix = 'user') {
    const payload = randomUserPayload(prefix);
    const res = await request(app).post('/api/auth/register').send(payload);
    expect(res.statusCode).toBe(201);
    return { token: res.body.token, user: res.body.user, payload };
  }

  it('GET /api/health responde status ok', async () => {
    const res = await request(app).get('/api/health');

    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(typeof res.body.timestamp).toBe('string');
  });

  it('GET /api/docs.json expone la spec OpenAPI', async () => {
    const res = await request(app).get('/api/docs.json');

    expect(res.statusCode).toBe(200);
    expect(res.body.openapi).toBe('3.0.0');
    expect(res.body.info.title).toBe('RateComic API');
  });

  it('ruta inexistente devuelve 404', async () => {
    const res = await request(app).get('/api/no-existe');

    expect(res.statusCode).toBe(404);
    expect(res.body).toEqual({ error: 'Endpoint no encontrado' });
  });

  it('gestiona la biblioteca de usuario (importar, listar, actualizar y borrar)', async () => {
    const email = `library_${Date.now()}@example.com`;
    const registerRes = await request(app)
      .post('/api/auth/register')
      .send({ username: `lib_${Date.now()}`, email, password: 'password123' });

    expect(registerRes.statusCode).toBe(201);
    const token = registerRes.body.token;
    expect(typeof token).toBe('string');

    db.prepare(`
      INSERT INTO media (
        imdb_id, title, type, year, poster_url, plot,
        rated, released, runtime, genre, director, writer, actors,
        imdb_rating, imdb_votes, total_seasons, language, country, awards
      ) VALUES (
        'cv-issue-9991', 'Test Comic', 'comic', '2024', 'https://img.test/comic.jpg', 'Plot',
        NULL, NULL, NULL, NULL, NULL, NULL, NULL,
        NULL, NULL, NULL, NULL, NULL, NULL
      )
    `).run();

    const mediaRow = db.prepare('SELECT id FROM media WHERE imdb_id = ?').get('cv-issue-9991');
    db.prepare('INSERT INTO ratings (user_id, media_id, score) VALUES (?, ?, ?)').run(
      registerRes.body.user.id,
      mediaRow.id,
      8,
    );

    const importRes = await request(app)
      .post('/api/library/import')
      .set('Authorization', `Bearer ${token}`)
      .send({ code: 'cv-issue-9991', read_status: true });

    expect(importRes.statusCode).toBe(201);
    expect(importRes.body.read_status).toBe(true);
    expect(importRes.body.personal_score).toBe(8);

    const listRes = await request(app)
      .get('/api/library/me')
      .set('Authorization', `Bearer ${token}`);

    expect(listRes.statusCode).toBe(200);
    expect(Array.isArray(listRes.body)).toBe(true);
    expect(listRes.body[0].media.imdb_id).toBe('cv-issue-9991');
    expect(listRes.body[0].personal_score).toBe(8);

    const patchRes = await request(app)
      .patch('/api/library/cv-issue-9991')
      .set('Authorization', `Bearer ${token}`)
      .send({ read_status: false, personal_score: 7 });

    expect(patchRes.statusCode).toBe(200);
    expect(patchRes.body.read_status).toBe(false);
    expect(patchRes.body.personal_score).toBe(7);

    const deleteRes = await request(app)
      .delete('/api/library/cv-issue-9991')
      .set('Authorization', `Bearer ${token}`);

    expect(deleteRes.statusCode).toBe(204);

    const listAfterDelete = await request(app)
      .get('/api/library/me')
      .set('Authorization', `Bearer ${token}`);

    expect(listAfterDelete.statusCode).toBe(200);
    expect(listAfterDelete.body.length).toBe(0);
  });

  it('rechaza CORS para origen no permitido', async () => {
    const res = await request(app)
      .get('/api/health')
      .set('Origin', 'http://evil.example.com');

    expect(res.statusCode).toBe(403);
    expect(res.body.error).toContain('CORS');
  });

  it('auth/me requiere token', async () => {
    const res = await request(app).get('/api/auth/me');

    expect(res.statusCode).toBe(401);
    expect(res.body.error).toBe('Token no proporcionado');
  });

  it('register devuelve 409 para email repetido', async () => {
    const payload = randomUserPayload('dup');
    const first = await request(app).post('/api/auth/register').send(payload);
    const second = await request(app).post('/api/auth/register').send({
      username: `other_${Date.now()}`,
      email: payload.email,
      password: payload.password,
    });

    expect(first.statusCode).toBe(201);
    expect(second.statusCode).toBe(409);
    expect(second.body.error).toContain('email');
  });

  it('bloquea temporalmente login tras varios intentos fallidos', async () => {
    const payload = randomUserPayload('lock');
    const registerRes = await request(app).post('/api/auth/register').send(payload);
    expect(registerRes.statusCode).toBe(201);

    // 5 intentos fallidos (401)
    for (let i = 0; i < 5; i += 1) {
      const bad = await request(app).post('/api/auth/login').send({
        email: payload.email,
        password: 'incorrecta',
      });
      expect(bad.statusCode).toBe(401);
    }

    // A partir de aquí entra lockout
    const locked = await request(app).post('/api/auth/login').send({
      email: payload.email,
      password: 'incorrecta',
    });
    expect(locked.statusCode).toBe(429);
    expect(locked.body.error).toContain('bloqueada');
  });

  it('asigna rol admin al email configurado y permite moderar comentarios', async () => {
    // Usuario normal autor del comentario
    const normal = await registerAndGetToken('author');

    db.prepare(`
      INSERT INTO media (
        imdb_id, title, type, year, poster_url, plot,
        rated, released, runtime, genre, director, writer, actors,
        imdb_rating, imdb_votes, total_seasons, language, country, awards
      ) VALUES (
        'cv-issue-admin-1', 'Admin Test Comic', 'comic', '2024', 'https://img.test/comic.jpg', 'Plot',
        NULL, NULL, NULL, NULL, NULL, NULL, NULL,
        NULL, NULL, NULL, NULL, NULL, NULL
      )
    `).run();

    const media = db.prepare('SELECT id FROM media WHERE imdb_id = ?').get('cv-issue-admin-1');
    const comment = db.prepare('INSERT INTO comments (user_id, media_id, content) VALUES (?, ?, ?)')
      .run(normal.user.id, media.id, 'Comentario moderable');

    // Admin por email fijo
    const adminEmail = 'samu91lenox@gmail.com';
    const adminRegister = await request(app)
      .post('/api/auth/register')
      .send({
        username: `admin_${Date.now()}`,
        email: adminEmail,
        password: 'password123',
      });

    expect(adminRegister.statusCode).toBe(201);
    expect(adminRegister.body.user.role).toBe('admin');

    // Login admin y borrado de comentario ajeno
    const adminLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: adminEmail, password: 'password123' });
    expect(adminLogin.statusCode).toBe(200);
    expect(adminLogin.body.user.role).toBe('admin');

    const deleteRes = await request(app)
      .delete(`/api/comments/${comment.lastInsertRowid}`)
      .set('Authorization', `Bearer ${adminLogin.body.token}`);

    expect(deleteRes.statusCode).toBe(204);
  });

  it('rechaza payload no-imagen al subir avatar', async () => {
    const { token } = await registerAndGetToken('avatar_bad');

    const badUpload = await request(app)
      .post('/api/users/me/avatar')
      .set('Authorization', `Bearer ${token}`)
      .attach('avatar', Buffer.from('not-an-image'), {
        filename: 'fake.png',
        contentType: 'image/png',
      });

    expect(badUpload.statusCode).toBe(422);
    expect(badUpload.body.error).toContain('inválido');
  });

  it('sube avatar válido y devuelve ruta local /avatars/*.webp', async () => {
    const { token } = await registerAndGetToken('avatar_ok');

    // PNG 1x1 válido
    const onePxPng = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO7sL2UAAAAASUVORK5CYII=',
      'base64',
    );

    const okUpload = await request(app)
      .post('/api/users/me/avatar')
      .set('Authorization', `Bearer ${token}`)
      .attach('avatar', onePxPng, {
        filename: 'avatar.png',
        contentType: 'image/png',
      });

    expect(okUpload.statusCode).toBe(200);
    expect(okUpload.body.avatar_url).toMatch(/^\/avatars\/avatar-\d+-\d+\.webp$/);
  });
});
