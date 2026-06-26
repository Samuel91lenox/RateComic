'use strict';

const bcrypt = require('bcryptjs');
const { body } = require('express-validator');
const rateLimit = require('express-rate-limit');
const UserModel = require('../models/user.model');
const { generateToken } = require('../middleware/auth.middleware');
const { securityLog } = require('../utils/security-log.util');

const registerLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 8,
  message: { error: 'Demasiados intentos de autenticación. Espera 15 minutos.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 12,
  skipSuccessfulRequests: true,
  message: { error: 'Demasiados intentos de login. Espera 15 minutos.' },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res, _next, options) => {
    securityLog('auth_rate_limited', {
      ip: req.ip,
      path: req.originalUrl,
      email: String(req.body?.email || '').toLowerCase() || undefined,
    });
    res.status(options.statusCode).json(options.message);
  },
});

const lockoutState = new Map();
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_MS = 15 * 60 * 1000;

function getLockKey(email) {
  return String(email || '').toLowerCase();
}

function isLocked(email) {
  const key = getLockKey(email);
  const state = lockoutState.get(key);
  if (!state) return false;

  if (state.lockedUntil && state.lockedUntil > Date.now()) {
    return true;
  }

  if (state.lockedUntil && state.lockedUntil <= Date.now()) {
    lockoutState.delete(key);
  }

  return false;
}

function registerFailure(email) {
  const key = getLockKey(email);
  const state = lockoutState.get(key) || { count: 0, lockedUntil: 0 };
  state.count += 1;
  if (state.count >= MAX_FAILED_ATTEMPTS) {
    state.lockedUntil = Date.now() + LOCKOUT_MS;
  }
  lockoutState.set(key, state);
  return state;
}

function clearFailures(email) {
  lockoutState.delete(getLockKey(email));
}

// ─── Validaciones ─────────────────────────────────────────────────────────────
const registerValidators = [
  body('username')
    .trim().isLength({ min: 3, max: 50 })
    .withMessage('El nombre de usuario debe tener entre 3 y 50 caracteres')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('El nombre de usuario solo puede contener letras, números y guiones bajos'),
  body('email')
    .trim().isEmail().normalizeEmail()
    .withMessage('Email no válido'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('La contraseña debe tener al menos 8 caracteres'),
];

const loginValidators = [
  body('email').trim().isEmail().normalizeEmail().withMessage('Email no válido'),
  body('password').notEmpty().withMessage('Contraseña requerida'),
];

// ─── Handlers ─────────────────────────────────────────────────────────────────
async function register(req, res, next) {
  try {
    const { username, email, password } = req.body;

    if (UserModel.findByEmail(email)) {
      securityLog('auth_register_conflict_email', { ip: req.ip, email });
      return res.status(409).json({ error: 'El email ya está en uso' });
    }
    if (UserModel.findByUsername(username)) {
      securityLog('auth_register_conflict_username', { ip: req.ip, username });
      return res.status(409).json({ error: 'El nombre de usuario ya está en uso' });
    }

    const password_hash = await bcrypt.hash(password, 12);
    const user = UserModel.create({ username, email, password_hash });
    const token = generateToken(user);

    res.status(201).json({ user, token });
  } catch (err) {
    next(err);
  }
}

async function login(req, res, next) {
  try {
    const { email, password } = req.body;

    if (isLocked(email)) {
      securityLog('auth_login_locked', { ip: req.ip, email });
      return res.status(429).json({ error: 'Cuenta temporalmente bloqueada por intentos fallidos. Intenta más tarde.' });
    }

    UserModel.ensureAdminRoleByEmail(email);
    const user = UserModel.findByEmail(email);
    if (!user) {
      const state = registerFailure(email);
      securityLog('auth_login_failed_user_not_found', { ip: req.ip, email, failedAttempts: state.count });
      return res.status(401).json({ error: 'Credenciales incorrectas' });
    }

    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      const state = registerFailure(email);
      securityLog('auth_login_failed_bad_password', { ip: req.ip, email, failedAttempts: state.count });
      return res.status(401).json({ error: 'Credenciales incorrectas' });
    }

    clearFailures(email);

    const publicUser = {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role || 'user',
      avatar_url: user.avatar_url,
      bio: user.bio,
      created_at: user.created_at,
    };
    const token = generateToken(publicUser);

    securityLog('auth_login_success', { ip: req.ip, userId: user.id, role: publicUser.role });

    res.json({ user: publicUser, token });
  } catch (err) {
    next(err);
  }
}

function me(req, res) {
  const user = UserModel.findById(req.user.id);
  if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });
  res.json(user);
}

module.exports = { register, login, me, registerValidators, loginValidators, registerLimiter, loginLimiter };
