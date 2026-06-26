'use strict';

const db = require('../database/db');

const CommentModel = {
  create({ user_id, media_id, parent_id = null, content }) {
    const result = db.prepare(`
      INSERT INTO comments (user_id, media_id, parent_id, content)
      VALUES (@user_id, @media_id, @parent_id, @content)
    `).run({ user_id, media_id, parent_id, content });

    return this.findById(result.lastInsertRowid);
  },

  findById(id) {
    return db.prepare(`
      SELECT c.*, u.username, u.avatar_url
      FROM comments c
      JOIN users u ON u.id = c.user_id
      WHERE c.id = ?
    `).get(id);
  },

  /**
   * Devuelve los comentarios raíz de una media + sus respuestas anidadas.
   */
  getByMedia(media_id) {
    // Comentarios raíz
    const roots = db.prepare(`
      SELECT c.*, u.username, u.avatar_url
      FROM comments c
      JOIN users u ON u.id = c.user_id
      WHERE c.media_id = ? AND c.parent_id IS NULL
      ORDER BY c.created_at DESC
    `).all(media_id);

    // Respuestas
    const replies = db.prepare(`
      SELECT c.*, u.username, u.avatar_url
      FROM comments c
      JOIN users u ON u.id = c.user_id
      WHERE c.media_id = ? AND c.parent_id IS NOT NULL
      ORDER BY c.created_at ASC
    `).all(media_id);

    // Agrupar respuestas bajo sus padres
    const replyMap = {};
    for (const reply of replies) {
      if (!replyMap[reply.parent_id]) replyMap[reply.parent_id] = [];
      replyMap[reply.parent_id].push(reply);
    }

    return roots.map(root => ({
      ...root,
      replies: replyMap[root.id] || [],
    }));
  },

  update(id, { content }) {
    db.prepare(`
      UPDATE comments SET content = @content, updated_at = CURRENT_TIMESTAMP
      WHERE id = @id
    `).run({ id, content });
    return this.findById(id);
  },

  delete(id) {
    return db.prepare('DELETE FROM comments WHERE id = ?').run(id);
  },
};

module.exports = CommentModel;
