'use strict';

const db = require('../database/db');

const ADMIN_EMAIL = 'samu91lenox@gmail.com';

function resolveRoleByEmail(email) {
  return String(email || '').toLowerCase() === ADMIN_EMAIL ? 'admin' : 'user';
}

const UserModel = {
  /**
   * Crear un nuevo usuario.
   * @param {{ username, email, password_hash }} data
   */
  create({ username, email, password_hash }) {
    const stmt = db.prepare(`
      INSERT INTO users (username, email, password_hash, role)
      VALUES (@username, @email, @password_hash, @role)
    `);
    const role = resolveRoleByEmail(email);
    const result = stmt.run({ username, email, password_hash, role });
    return this.findById(result.lastInsertRowid);
  },

  findById(id) {
    return db.prepare('SELECT id, username, email, role, avatar_url, bio, created_at FROM users WHERE id = ?').get(id);
  },

  findByEmail(email) {
    return db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  },

  findByUsername(username) {
    return db.prepare('SELECT * FROM users WHERE username = ?').get(username);
  },

  update(id, { avatar_url, bio }) {
    db.prepare(`
      UPDATE users SET avatar_url = @avatar_url, bio = @bio, updated_at = CURRENT_TIMESTAMP
      WHERE id = @id
    `).run({ id, avatar_url, bio });
    return this.findById(id);
  },

  ensureAdminRoleByEmail(email) {
    if (resolveRoleByEmail(email) !== 'admin') return;
    db.prepare("UPDATE users SET role = 'admin' WHERE lower(email) = lower(?)").run(email);
  },
};

module.exports = UserModel;
