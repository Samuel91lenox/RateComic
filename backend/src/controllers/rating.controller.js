'use strict';

const { body } = require('express-validator');
const TmdbService = require('../services/tmdb.service');
const MediaModel = require('../models/media.model');
const RatingModel = require('../models/rating.model');

const ratingValidators = [
  body('imdb_id').trim().notEmpty().withMessage('imdb_id requerido'),
  body('score')
    .isInt({ min: 1, max: 10 })
    .withMessage('La puntuación debe ser un entero entre 1 y 10'),
];

async function upsertRating(req, res, next) {
  try {
    const { imdb_id, score } = req.body;
    const user_id = req.user.id;

    // Asegurar que el media existe en caché local
    let media = MediaModel.findByImdbId(imdb_id);
    if (!media) {
      media = await TmdbService.getDetail(imdb_id);
    }

    const rating = RatingModel.upsert({ user_id, media_id: media.id, score });
    res.status(200).json(rating);
  } catch (err) {
    next(err);
  }
}

function getMyRatings(req, res, next) {
  try {
    const ratings = RatingModel.getByUser(req.user.id);
    res.json(ratings);
  } catch (err) {
    next(err);
  }
}

async function getMediaRatings(req, res, next) {
  try {
    const { imdbId } = req.params;
    let media = MediaModel.findByImdbId(imdbId);
    if (!media) {
      media = await TmdbService.getDetail(imdbId);
    }
    const stats = RatingModel.getStatsForMedia(media.id);
    res.json(stats);
  } catch (err) {
    next(err);
  }
}

async function deleteRating(req, res, next) {
  try {
    const { imdbId } = req.params;
    const media = MediaModel.findByImdbId(imdbId);
    if (!media) return res.status(404).json({ error: 'Media no encontrada' });

    RatingModel.delete({ user_id: req.user.id, media_id: media.id });
    res.status(204).end();
  } catch (err) {
    next(err);
  }
}

module.exports = { upsertRating, getMyRatings, getMediaRatings, deleteRating, ratingValidators };
