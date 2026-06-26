'use strict';

const ComicsService = require('../services/comics.service');
const MediaModel = require('../models/media.model');
const RatingModel = require('../models/rating.model');

async function search(req, res, next) {
  try {
    const { q, type, page = 1 } = req.query;
    if (!q || q.trim().length < 2) {
      return res.status(422).json({ error: 'El parámetro "q" debe tener al menos 2 caracteres' });
    }

    const data = await ComicsService.search(q.trim(), type, parseInt(page, 10));
    res.json(data);
  } catch (err) {
    next(err);
  }
}

async function getDetail(req, res, next) {
  try {
    const { imdbId } = req.params;
    const media = await ComicsService.getDetail(imdbId);

    // Añadir estadísticas de puntuación si el media está en nuestra BD
    const stats = media.id ? RatingModel.getStatsForMedia(media.id) : null;

    res.json({ ...media, rating_stats: stats });
  } catch (err) {
    next(err);
  }
}

function getTrending(req, res, next) {
  try {
    // Devuelve los medias con más valoraciones de nuestra caché local
    const db = require('../database/db');
    const { type } = req.query;

    let sql = `
      SELECT m.*, ROUND(AVG(r.score), 2) AS avg_score, COUNT(r.id) AS total_votes
      FROM media m
      LEFT JOIN ratings r ON r.media_id = m.id
    `;
    const params = [];
    if (type) {
      sql += ' WHERE m.type = ?';
      params.push(type);
    }
    sql += ' GROUP BY m.id HAVING total_votes > 0 ORDER BY total_votes DESC, avg_score DESC LIMIT 20';

    const results = db.prepare(sql).all(...params);
    res.json(results);
  } catch (err) {
    next(err);
  }
}

module.exports = { search, getDetail, getTrending };
