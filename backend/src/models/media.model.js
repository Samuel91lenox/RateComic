'use strict';

const db = require('../database/db');

const MEDIA_CACHE_HOURS = parseInt(process.env.MEDIA_CACHE_HOURS || '24', 10);

const MediaModel = {
  findByImdbId(imdbId) {
    return db.prepare('SELECT * FROM media WHERE imdb_id = ?').get(imdbId);
  },

  /**
   * Inserta o actualiza un registro de media cacheado desde OMDB.
   */
  upsert(data) {
    const stmt = db.prepare(`
      INSERT INTO media (
        imdb_id, title, type, year, rated, released, runtime, genre,
        director, writer, actors, plot, poster_url, imdb_rating, imdb_votes,
        total_seasons, language, country, awards, cached_at
      ) VALUES (
        @imdb_id, @title, @type, @year, @rated, @released, @runtime, @genre,
        @director, @writer, @actors, @plot, @poster_url, @imdb_rating, @imdb_votes,
        @total_seasons, @language, @country, @awards, CURRENT_TIMESTAMP
      )
      ON CONFLICT(imdb_id) DO UPDATE SET
        title        = excluded.title,
        type         = excluded.type,
        year         = excluded.year,
        rated        = excluded.rated,
        released     = excluded.released,
        runtime      = excluded.runtime,
        genre        = excluded.genre,
        director     = excluded.director,
        writer       = excluded.writer,
        actors       = excluded.actors,
        plot         = excluded.plot,
        poster_url   = excluded.poster_url,
        imdb_rating  = excluded.imdb_rating,
        imdb_votes   = excluded.imdb_votes,
        total_seasons= excluded.total_seasons,
        language     = excluded.language,
        country      = excluded.country,
        awards       = excluded.awards,
        cached_at    = CURRENT_TIMESTAMP
    `);
    stmt.run(data);
    return this.findByImdbId(data.imdb_id);
  },

  search({ query, type, page = 1, limit = 20 }) {
    const offset = (page - 1) * limit;
    let sql = 'SELECT * FROM media WHERE 1=1';
    const params = [];

    if (query) {
      sql += ' AND title LIKE ?';
      params.push(`%${query}%`);
    }
    if (type) {
      sql += ' AND type = ?';
      params.push(type);
    }

    sql += ' ORDER BY title ASC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    return db.prepare(sql).all(...params);
  },

  findById(id) {
    return db.prepare('SELECT * FROM media WHERE id = ?').get(id);
  },

  deleteExpiredCache() {
    const result = db.prepare(`
      DELETE FROM media
      WHERE datetime(cached_at) < datetime('now', ?)
    `).run(`-${MEDIA_CACHE_HOURS} hours`);

    return result.changes;
  },
};

module.exports = MediaModel;
