'use strict';

const jwt = require('jsonwebtoken');
const { securityLog } = require('../utils/security-log.util');

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

if (!JWT_SECRET || JWT_SECRET.length < 32) {
  console.warn('[SECURITY] JWT_SECRET no está configurado con suficiente entropía (mínimo recomendado: 32 chars).');
}

function hasRole(user, allowedRoles = []) {
  return !!user && allowedRoles.includes(String(user.role || 'user'));
}

/**
 * Middleware que verifica el token JWT en la cabecera Authorization.
 * Añade req.user = { id, username, email } si es válido.
 */
function authenticate(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    securityLog('auth_missing_token', { ip: req.ip, path: req.originalUrl });
    return res.status(401).json({ error: 'Token no proporcionado' });
  }

  const token = authHeader.slice(7);
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload;
    next();
  } catch {
    securityLog('auth_invalid_token', { ip: req.ip, path: req.originalUrl });
    return res.status(401).json({ error: 'Token inválido o expirado' });
  }
}

function requireRole(allowedRoles = []) {
  return (req, res, next) => {
    if (!hasRole(req.user, allowedRoles)) {
      securityLog('auth_forbidden_role', {
        ip: req.ip,
        path: req.originalUrl,
        userId: req.user?.id,
        role: req.user?.role || 'user',
        allowedRoles,
      });
      return res.status(403).json({ error: 'No tienes permisos para esta acción' });
    }

    next();
  };
}

/**
 * Genera un token JWT para un usuario.
 */
function generateToken(user) {
  return jwt.sign(
    { id: user.id, username: user.username, email: user.email, role: user.role || 'user' },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

module.exports = { authenticate, requireRole, hasRole, generateToken };
