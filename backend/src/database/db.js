'use strict';

const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');

const dbPath = process.env.DB_PATH || './data/ratecomic.db';
const dbDir = path.dirname(path.resolve(dbPath));

// Asegurar que el directorio existe
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const db = new Database(path.resolve(dbPath));

// Activar WAL mode para mayor rendimiento y concurrencia
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

module.exports = db;
