'use strict';

const db = require('../database/db');

const SEARCH_CACHE_HOURS = parseInt(process.env.SEARCH_CACHE_HOURS || '24', 10);

const SearchCacheModel = {
  normalizeQuery(query) {
    return query.trim().toLowerCase();
  },

  find(query, type, page) {
    const query_key = this.normalizeQuery(query);
    return db.prepare(`
      SELECT *
      FROM search_cache
      WHERE query_key = ? AND type = ? AND page = ?
    `).get(query_key, type || 'all', page);
  },

  upsert({ query, type, page, totalResults, results }) {
    const query_key = this.normalizeQuery(query);
    db.prepare(`
      INSERT INTO search_cache (query_key, type, page, total_results, results_json, cached_at)
      VALUES (@query_key, @type, @page, @total_results, @results_json, CURRENT_TIMESTAMP)
      ON CONFLICT(query_key, type, page) DO UPDATE SET
        total_results = excluded.total_results,
        results_json = excluded.results_json,
        cached_at = CURRENT_TIMESTAMP
    `).run({
      query_key,
      type: type || 'all',
      page,
      total_results: totalResults,
      results_json: JSON.stringify(results),
    });

    return this.find(query, type, page);
  },

  deleteExpiredCache() {
    const result = db.prepare(`
      DELETE FROM search_cache
      WHERE datetime(cached_at) < datetime('now', ?)
    `).run(`-${SEARCH_CACHE_HOURS} hours`);

    return result.changes;
  },
};

module.exports = SearchCacheModel;