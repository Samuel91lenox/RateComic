'use strict';

const db = require('../database/db');

const LibraryModel = {
  upsert({ user_id, media_id, read_status = 0, personal_score = null, source_code = null }) {
    db.prepare(`
      INSERT INTO user_library (user_id, media_id, read_status, personal_score, source_code)
      VALUES (@user_id, @media_id, @read_status, @personal_score, @source_code)
      ON CONFLICT(user_id, media_id) DO UPDATE SET
        read_status = excluded.read_status,
        personal_score = excluded.personal_score,
        source_code = COALESCE(excluded.source_code, user_library.source_code),
        updated_at = CURRENT_TIMESTAMP
    `).run({ user_id, media_id, read_status, personal_score, source_code });

    return this.findByUserAndMedia(user_id, media_id);
  },

  findByUserAndMedia(user_id, media_id) {
    return db.prepare(`
      SELECT *
      FROM user_library
      WHERE user_id = ? AND media_id = ?
    `).get(user_id, media_id);
  },

  getByUser(user_id) {
    return db.prepare(`
      SELECT
        l.id AS library_id,
        l.user_id,
        l.media_id,
        l.read_status,
        COALESCE(l.personal_score, my_rating.score) AS personal_score,
        l.source_code,
        l.created_at AS library_created_at,
        l.updated_at AS library_updated_at,
        m.*,
        ROUND(AVG(r.score), 2) AS avg_score,
        COUNT(r.id) AS total_votes
      FROM user_library l
      JOIN media m ON m.id = l.media_id
      LEFT JOIN ratings r ON r.media_id = m.id
      LEFT JOIN ratings my_rating ON my_rating.media_id = m.id AND my_rating.user_id = l.user_id
      WHERE l.user_id = ?
      GROUP BY l.id
      ORDER BY l.updated_at DESC
    `).all(user_id);
  },

  updateByUserAndMedia({ user_id, media_id, read_status, personal_score }) {
    db.prepare(`
      UPDATE user_library
      SET
        read_status = COALESCE(@read_status, read_status),
        personal_score = CASE
          WHEN @personal_score_marker = 1 THEN @personal_score
          ELSE personal_score
        END,
        updated_at = CURRENT_TIMESTAMP
      WHERE user_id = @user_id AND media_id = @media_id
    `).run({
      user_id,
      media_id,
      read_status,
      personal_score,
      personal_score_marker: personal_score === undefined ? 0 : 1,
    });

    return this.findByUserAndMedia(user_id, media_id);
  },

  deleteByUserAndMedia({ user_id, media_id }) {
    return db.prepare('DELETE FROM user_library WHERE user_id = ? AND media_id = ?').run(user_id, media_id);
  },
};

module.exports = LibraryModel;
