'use strict';

require('dotenv').config();

const fs = require('fs');
const path = require('path');

const dbPath = path.resolve(process.env.DB_PATH || './data/ratecomic.db');
const dbDir = path.dirname(dbPath);
const backupsDir = path.resolve(dbDir, 'backups');

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function getTimestamp() {
  const now = new Date();
  const pad = (value) => String(value).padStart(2, '0');

  return [
    now.getFullYear(),
    pad(now.getMonth() + 1),
    pad(now.getDate()),
    '-',
    pad(now.getHours()),
    pad(now.getMinutes()),
    pad(now.getSeconds()),
  ].join('');
}

ensureDir(dbDir);
ensureDir(backupsDir);

if (!fs.existsSync(dbPath)) {
  fs.writeFileSync(dbPath, '');
}

const backupFileName = `ratecomic-${getTimestamp()}.db`;
const backupPath = path.join(backupsDir, backupFileName);

fs.copyFileSync(dbPath, backupPath);

console.log(`Backup created: ${backupPath}`);