'use strict';

process.env.JWT_SECRET = 'unit_test_secret';
process.env.JWT_EXPIRES_IN = '1h';

const { authenticate, requireRole, hasRole, generateToken } = require('../../src/middleware/auth.middleware');

describe('auth.middleware unit', () => {
  it('retorna 401 si falta Authorization header', () => {
    const req = { headers: {} };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();

    authenticate(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Token no proporcionado' });
    expect(next).not.toHaveBeenCalled();
  });

  it('retorna 401 si el token es invalido', () => {
    const req = { headers: { authorization: 'Bearer token_invalido' } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();

    authenticate(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Token inválido o expirado' });
    expect(next).not.toHaveBeenCalled();
  });

  it('autentica correctamente con token valido', () => {
    const user = { id: 1, username: 'tester', email: 'tester@example.com' };
    const token = generateToken(user);

    const req = { headers: { authorization: `Bearer ${token}` } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();

    authenticate(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(req.user).toMatchObject({
      id: user.id,
      username: user.username,
      email: user.email,
    });
  });

  it('hasRole valida roles permitidos', () => {
    expect(hasRole({ role: 'admin' }, ['admin'])).toBe(true);
    expect(hasRole({ role: 'user' }, ['admin'])).toBe(false);
  });

  it('requireRole permite cuando el rol coincide', () => {
    const middleware = requireRole(['admin']);
    const req = { user: { id: 1, role: 'admin' }, ip: '127.0.0.1', originalUrl: '/x' };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();

    middleware(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
  });

  it('requireRole responde 403 cuando el rol no coincide', () => {
    const middleware = requireRole(['admin']);
    const req = { user: { id: 2, role: 'user' }, ip: '127.0.0.1', originalUrl: '/x' };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();

    middleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ error: 'No tienes permisos para esta acción' });
    expect(next).not.toHaveBeenCalled();
  });
});
