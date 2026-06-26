'use strict';

require('dotenv').config();

const db = require('../database/db');

function getTableStats(tableName) {
  const count = db.prepare(`SELECT COUNT(*) AS count FROM ${tableName}`).get().count;
  const cachedAt = db.prepare(`
    SELECT
      MIN(cached_at) AS oldest_cached_at,
      MAX(cached_at) AS newest_cached_at
    FROM ${tableName}
  `).get();

  return {
    count,
    oldest_cached_at: cachedAt.oldest_cached_at,
    newest_cached_at: cachedAt.newest_cached_at,
  };
}

function getMediaTypeBreakdown() {
  return db.prepare(`
    SELECT type, COUNT(*) AS count
    FROM media
    GROUP BY type
    ORDER BY count DESC, type ASC
  `).all();
}

function getSearchTypeBreakdown() {
  return db.prepare(`
    SELECT type, COUNT(*) AS count
    FROM search_cache
    GROUP BY type
    ORDER BY count DESC, type ASC
  `).all();
}

const stats = {
  media: {
    ...getTableStats('media'),
    by_type: getMediaTypeBreakdown(),
  },
  search_cache: {
    ...getTableStats('search_cache'),
    by_type: getSearchTypeBreakdown(),
  },
};

console.log(JSON.stringify(stats, null, 2));