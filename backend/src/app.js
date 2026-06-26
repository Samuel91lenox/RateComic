'use strict';

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const authRoutes = require('./routes/auth.routes');
const mediaRoutes = require('./routes/media.routes');
const ratingRoutes = require('./routes/rating.routes');
const commentRoutes = require('./routes/comment.routes');
const userRoutes = require('./routes/user.routes');
const libraryRoutes = require('./routes/library.routes');
const swaggerUi   = require('swagger-ui-express');
const swaggerSpec  = require('./config/swagger');
const MediaModel = require('./models/media.model');
const SearchCacheModel = require('./models/search-cache.model');

// Inicializar base de datos al arrancar
require('./database/init');

const removedMediaCache = MediaModel.deleteExpiredCache();
const removedSearchCache = SearchCacheModel.deleteExpiredCache();

if (removedMediaCache || removedSearchCache) {
  console.log(`🧹 Caché purgada al iniciar: media=${removedMediaCache}, busquedas=${removedSearchCache}`);
}

const app = express();

const NODE_ENV = process.env.NODE_ENV || 'development';

function getAllowedOrigins() {
  const fromList = String(process.env.CORS_ALLOWLIST || '')
    .split(',')
    .map(o => o.trim())
    .filter(Boolean);

  const single = String(process.env.CORS_ORIGIN || '').trim();
  if (single) {
    fromList.push(single);
  }

  if (!fromList.length) {
    return ['http://localhost:4200'];
  }

  return Array.from(new Set(fromList));
}

const allowedOrigins = getAllowedOrigins();

// ─── Archivos estáticos (antes de helmet para evitar CORP cross-origin) ───────
const path = require('path');
app.use('/avatars', (req, res, next) => {
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  next();
}, express.static(path.join(__dirname, '../public/avatars')));

// ─── Seguridad ────────────────────────────────────────────────────────────────
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

// ─── CORS ─────────────────────────────────────────────────────────────────────
app.use(cors({
  origin(origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    return callback(Object.assign(new Error('Origen no permitido por CORS'), { statusCode: 403 }));
  },
  credentials: true,
}));

// ─── Rate limiting global ─────────────────────────────────────────────────────
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiadas peticiones, intenta de nuevo más tarde.' },
});
app.use('/api', globalLimiter);

// ─── Parsers ──────────────────────────────────────────────────────────────────
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: false }));

// ─── Timeout defensivo por request ────────────────────────────────────────────
app.use((req, res, next) => {
  req.setTimeout(15_000);
  res.setTimeout(15_000);
  next();
});

// ─── Rutas ────────────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/media', mediaRoutes);
app.use('/api/ratings', ratingRoutes);
app.use('/api/comments', commentRoutes);
app.use('/api/users', userRoutes);
app.use('/api/library', libraryRoutes);

// ─── Health check ─────────────────────────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ─── 404 ──────────────────────────────────────────────────────────────────────
// ─── Swagger UI ───────────────────────────────────────────────────────────────
// Disponible en http://localhost:3000/api/docs
// Deshabilitamos CSP solo para esta ruta para que los assets de swagger-ui carguen
app.use(
  '/api/docs',
  (_req, _res, next) => {
    _res.setHeader('Content-Security-Policy', '');
    next();
  },
  swaggerUi.serve,
  swaggerUi.setup(swaggerSpec, {
    customSiteTitle: 'RateComic API Docs',
    swaggerOptions: { persistAuthorization: true },
  })
);

// ─── Swagger spec JSON ────────────────────────────────────────────────────────
app.get('/api/docs.json', (_req, res) => res.json(swaggerSpec));

// ─── 404 ──────────────────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ error: 'Endpoint no encontrado' });
});

// ─── Error handler global ─────────────────────────────────────────────────────
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  console.error(err.stack);
  const status = err.statusCode || 500;
  if (status === 500 && NODE_ENV === 'production') {
    return res.status(status).json({ error: 'Error interno del servidor' });
  }

  res.status(status).json({ error: err.message || 'Error interno del servidor' });
});

module.exports = app;
