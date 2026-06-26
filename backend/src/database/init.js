'use strict';

const db = require('./db');

/**
 * Ejecuta todas las migraciones DDL para crear el esquema inicial.
 * Es idempotente: usa IF NOT EXISTS en todas las sentencias.
 */
function initDatabase() {
  db.exec(`
    -- ─────────────────────────────────────────────
    -- Tabla: users
    -- ─────────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS users (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      username     VARCHAR(50)  UNIQUE NOT NULL,
      email        VARCHAR(100) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      role         VARCHAR(20)  NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
      avatar_url   VARCHAR(500),
      bio          TEXT,
      created_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at   DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- ─────────────────────────────────────────────
    -- Tabla: media (caché local de catálogos externos)
    -- El campo 'type' está pensado para escalar:
    -- 'movie' | 'series' | 'book' | 'comic' | 'character'
    -- ─────────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS media (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      imdb_id      VARCHAR(20)  UNIQUE NOT NULL,
      title        VARCHAR(255) NOT NULL,
      type         VARCHAR(20)  NOT NULL CHECK (type IN ('movie','series','book','comic','character')),
      year         VARCHAR(10),
      rated        VARCHAR(20),
      released     VARCHAR(30),
      runtime      VARCHAR(30),
      genre        VARCHAR(255),
      director     VARCHAR(255),
      writer       VARCHAR(255),
      actors       TEXT,
      plot         TEXT,
      poster_url   VARCHAR(500),
      imdb_rating  REAL,
      imdb_votes   VARCHAR(30),
      total_seasons VARCHAR(5),
      language     VARCHAR(100),
      country      VARCHAR(100),
      awards       TEXT,
      cached_at    DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- ─────────────────────────────────────────────
    -- Tabla: search_cache
    -- Caché de búsquedas TMDB por término, tipo y página.
    -- Guarda el payload ya normalizado para evitar llamadas
    -- repetidas al proveedor externo durante la ventana TTL.
    -- ─────────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS search_cache (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      query_key     VARCHAR(255) NOT NULL,
      type          VARCHAR(20)  NOT NULL,
      page          INTEGER      NOT NULL,
      total_results INTEGER      NOT NULL DEFAULT 0,
      results_json  TEXT         NOT NULL,
      cached_at     DATETIME     DEFAULT CURRENT_TIMESTAMP,
      UNIQUE (query_key, type, page)
    );

    -- ─────────────────────────────────────────────
    -- Tabla: ratings
    -- Un usuario sólo puede puntuar una vez cada
    -- ítem (UNIQUE en user_id + media_id).
    -- ─────────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS ratings (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id    INTEGER NOT NULL REFERENCES users(id)  ON DELETE CASCADE,
      media_id   INTEGER NOT NULL REFERENCES media(id)  ON DELETE CASCADE,
      score      INTEGER NOT NULL CHECK (score >= 1 AND score <= 10),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE (user_id, media_id)
    );

    -- ─────────────────────────────────────────────
    -- Tabla: comments
    -- parent_id NULL => comentario raíz
    -- parent_id SET  => respuesta a otro comentario
    -- ─────────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS comments (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id    INTEGER NOT NULL REFERENCES users(id)    ON DELETE CASCADE,
      media_id   INTEGER NOT NULL REFERENCES media(id)    ON DELETE CASCADE,
      parent_id  INTEGER          REFERENCES comments(id) ON DELETE CASCADE,
      content    TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- ─────────────────────────────────────────────
    -- Tabla: user_library
    -- Biblioteca personal del usuario (solo comics)
    -- read_status: 0 = No leido, 1 = Leido
    -- personal_score: puntuacion personal 1-10 (opcional)
    -- ─────────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS user_library (
      id             INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id        INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      media_id       INTEGER NOT NULL REFERENCES media(id) ON DELETE CASCADE,
      read_status    INTEGER NOT NULL DEFAULT 0 CHECK (read_status IN (0, 1)),
      personal_score INTEGER CHECK (personal_score IS NULL OR (personal_score >= 1 AND personal_score <= 10)),
      source_code    VARCHAR(64),
      created_at     DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at     DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE (user_id, media_id)
    );

    -- ─────────────────────────────────────────────
    -- Índices para mejorar el rendimiento de
    -- las consultas más frecuentes
    -- ─────────────────────────────────────────────
    CREATE INDEX IF NOT EXISTS idx_ratings_media   ON ratings  (media_id);
    CREATE INDEX IF NOT EXISTS idx_ratings_user    ON ratings  (user_id);
    CREATE INDEX IF NOT EXISTS idx_comments_media  ON comments (media_id);
    CREATE INDEX IF NOT EXISTS idx_comments_parent ON comments (parent_id);
    CREATE INDEX IF NOT EXISTS idx_media_type      ON media    (type);
    CREATE INDEX IF NOT EXISTS idx_media_title     ON media    (title);
    CREATE INDEX IF NOT EXISTS idx_search_cache_qtp ON search_cache (query_key, type, page);
    CREATE INDEX IF NOT EXISTS idx_library_user    ON user_library (user_id);
    CREATE INDEX IF NOT EXISTS idx_library_media   ON user_library (media_id);
  `);

  // Migracion para instalaciones existentes sin la columna role.
  const hasRoleColumn = db
    .prepare("SELECT 1 FROM pragma_table_info('users') WHERE name = 'role'")
    .get();
  if (!hasRoleColumn) {
    db.exec("ALTER TABLE users ADD COLUMN role VARCHAR(20) NOT NULL DEFAULT 'user'");
  }

  // Promocion automatica del admin principal por email.
  db.prepare("UPDATE users SET role = 'admin' WHERE lower(email) = lower(?)").run('samu91lenox@gmail.com');

  console.log('✅ Base de datos inicializada correctamente.');
}

initDatabase();
