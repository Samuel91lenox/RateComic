'use strict';

const db = require('../database/db');

const RatingModel = {
  /**
   * Inserta o actualiza la puntuación de un usuario para una película/serie.
   */
  upsert({ user_id, media_id, score }) {
    db.prepare(`
      INSERT INTO ratings (user_id, media_id, score)
      VALUES (@user_id, @media_id, @score)
      ON CONFLICT(user_id, media_id) DO UPDATE SET
        score = excluded.score,
        updated_at = CURRENT_TIMESTAMP
    `).run({ user_id, media_id, score });

    return this.findByUserAndMedia(user_id, media_id);
  },

  findByUserAndMedia(user_id, media_id) {
    return db.prepare('SELECT * FROM ratings WHERE user_id = ? AND media_id = ?').get(user_id, media_id);
  },

  /**
   * Estadísticas de puntuación para un elemento de media.
   * Devuelve: avg_score, total_votes, score_distribution (1-10)
   */
  getStatsForMedia(media_id) {
    const stats = db.prepare(`
      SELECT
        ROUND(AVG(score), 2) AS avg_score,
        COUNT(*)             AS total_votes
      FROM ratings
      WHERE media_id = ?
    `).get(media_id);

    const distribution = db.prepare(`
      SELECT score, COUNT(*) AS count
      FROM ratings
      WHERE media_id = ?
      GROUP BY score
      ORDER BY score
    `).all(media_id);

    return { ...stats, distribution };
  },

  getByUser(user_id) {
    return db.prepare(`
      SELECT r.*, m.title, m.type, m.poster_url, m.imdb_id
      FROM ratings r
      JOIN media m ON m.id = r.media_id
      WHERE r.user_id = ?
      ORDER BY r.updated_at DESC
    `).all(user_id);
  },

  delete({ user_id, media_id }) {
    return db.prepare('DELETE FROM ratings WHERE user_id = ? AND media_id = ?').run(user_id, media_id);
  },
};

module.exports = RatingModel;
