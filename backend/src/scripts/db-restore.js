#!/usr/bin/env node
/**
 * db-restore.js
 * Restaura la base de datos desde un backup.
 * Uso:
 *   node src/scripts/db-restore.js            → lista los backups disponibles
 *   node src/scripts/db-restore.js <archivo>  → restaura el backup indicado
 *
 * IMPORTANTE: El servidor debe estar detenido antes de restaurar.
 */

const fs   = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const DB_PATH      = path.resolve(__dirname, '../../', process.env.DB_PATH || './data/ratecomic.db');
const BACKUPS_DIR  = path.resolve(path.dirname(DB_PATH), 'backups');

// ── Sin argumento: listar backups disponibles ──────────────────────────────
if (process.argv.length < 3) {
  if (!fs.existsSync(BACKUPS_DIR)) {
    console.log('No existe el directorio de backups:', BACKUPS_DIR);
    process.exit(0);
  }

  const backups = fs.readdirSync(BACKUPS_DIR)
    .filter(f => f.endsWith('.db'))
    .sort()
    .reverse(); // más reciente primero

  if (backups.length === 0) {
    console.log('No hay backups disponibles en:', BACKUPS_DIR);
    process.exit(0);
  }

  console.log(`\nBackups disponibles (${backups.length}):\n`);
  backups.forEach((file, i) => {
    const full  = path.join(BACKUPS_DIR, file);
    const stats = fs.statSync(full);
    const size  = (stats.size / 1024).toFixed(1);
    const date  = stats.mtime.toLocaleString('es-ES');
    console.log(`  ${String(i + 1).padStart(2)}. ${file}  (${size} KB, ${date})`);
  });

  console.log('\nUso para restaurar:');
  console.log('  npm run db:restore <nombre-archivo>');
  console.log('  Ejemplo: npm run db:restore', backups[0]);
  console.log('\n⚠  Detén el servidor antes de restaurar.\n');
  process.exit(0);
}

// ── Con argumento: restaurar ───────────────────────────────────────────────
let arg = process.argv[2];

// Aceptar solo nombre de archivo o ruta absoluta/relativa
let sourcePath = path.isAbsolute(arg)
  ? arg
  : path.join(BACKUPS_DIR, path.basename(arg)); // siempre busca en backups/

if (!fs.existsSync(sourcePath)) {
  console.error(`\nError: no se encontró el archivo de backup:\n  ${sourcePath}\n`);
  console.error('Ejecuta "npm run db:restore" sin argumentos para ver los disponibles.\n');
  process.exit(1);
}

if (!sourcePath.endsWith('.db')) {
  console.error('\nError: el archivo de backup debe tener extensión .db\n');
  process.exit(1);
}

// Verificar que el DB de destino no esté bloqueado (mejor-sqlite3 abre y cierra)
// Solo advertimos: si el server está corriendo la copia puede corromperse.
console.log('\n⚠  ADVERTENCIA: asegúrate de que el servidor esté detenido antes de continuar.');
console.log('   Si el servidor está corriendo, la restauración puede fallar o corromper la DB.\n');

const sourceStats = fs.statSync(sourcePath);
console.log(`Backup origen : ${sourcePath}`);
console.log(`Tamaño        : ${(sourceStats.size / 1024).toFixed(1)} KB`);
console.log(`DB destino    : ${DB_PATH}\n`);

// Crear un backup automático de la DB actual antes de sobreescribir
if (fs.existsSync(DB_PATH)) {
  const now = new Date();
  const pad = n => String(n).padStart(2, '0');
  const ts  = `${now.getFullYear()}${pad(now.getMonth()+1)}${pad(now.getDate())}-`
             + `${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
  const safetyBackup = path.join(BACKUPS_DIR, `ratecomic-before-restore-${ts}.db`);

  if (!fs.existsSync(BACKUPS_DIR)) fs.mkdirSync(BACKUPS_DIR, { recursive: true });

  fs.copyFileSync(DB_PATH, safetyBackup);
  console.log(`Backup de seguridad creado: ${safetyBackup}`);
}

// Restaurar: copiar backup → DB principal
fs.copyFileSync(sourcePath, DB_PATH);
console.log(`\n✓ Base de datos restaurada correctamente desde: ${path.basename(sourcePath)}`);
console.log('  Reinicia el servidor para usar la DB restaurada.\n');
