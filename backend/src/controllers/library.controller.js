'use strict';

const axios = require('axios');
const { body } = require('express-validator');
const ComicsService = require('../services/comics.service');
const MediaModel = require('../models/media.model');
const LibraryModel = require('../models/library.model');
const RatingModel = require('../models/rating.model');

const importValidators = [
  body('code')
    .optional()
    .isString()
    .trim()
    .isLength({ min: 3, max: 64 })
    .withMessage('El codigo debe tener entre 3 y 64 caracteres'),
  body('barcode')
    .optional()
    .isString()
    .trim()
    .isLength({ min: 8, max: 32 })
    .withMessage('El codigo de barras debe tener entre 8 y 32 caracteres'),
  body('read_status')
    .optional()
    .isBoolean()
    .withMessage('read_status debe ser booleano'),
  body('personal_score')
    .optional({ nullable: true })
    .isInt({ min: 1, max: 10 })
    .withMessage('La puntuacion debe ser un entero entre 1 y 10'),
];

const updateValidators = [
  body('read_status')
    .optional()
    .isBoolean()
    .withMessage('read_status debe ser booleano'),
  body('personal_score')
    .optional({ nullable: true })
    .isInt({ min: 1, max: 10 })
    .withMessage('La puntuacion debe ser un entero entre 1 y 10'),
];

function normalizeCode(code) {
  return String(code || '').trim();
}

function asLibraryItem(row) {
  return {
    library_id: row.library_id,
    user_id: row.user_id,
    media_id: row.media_id,
    read_status: Boolean(row.read_status),
    personal_score: row.personal_score,
    source_code: row.source_code,
    library_created_at: row.library_created_at,
    library_updated_at: row.library_updated_at,
    media: {
      id: row.id,
      imdb_id: row.imdb_id,
      title: row.title,
      type: row.type,
      year: row.year,
      rated: row.rated,
      released: row.released,
      runtime: row.runtime,
      genre: row.genre,
      director: row.director,
      writer: row.writer,
      actors: row.actors,
      plot: row.plot,
      poster_url: row.poster_url,
      imdb_rating: row.imdb_rating,
      imdb_votes: row.imdb_votes,
      total_seasons: row.total_seasons,
      language: row.language,
      country: row.country,
      awards: row.awards,
      cached_at: row.cached_at,
      avg_score: row.avg_score,
      total_votes: row.total_votes,
    },
  };
}

async function resolveMediaByCode(rawCode) {
  const code = normalizeCode(rawCode);
  if (!code) {
    throw Object.assign(new Error('Debes indicar un codigo o codigo de barras'), { statusCode: 422 });
  }

  let media = MediaModel.findByImdbId(code);
  if (media) return { media, normalizedCode: code };

  // ISBN/EAN escaneado -> Open Library (isbn/{code}.json => work key)
  const onlyDigits = /^\d{10,13}$/.test(code);
  if (onlyDigits) {
    try {
      const { data } = await axios.get(`https://openlibrary.org/isbn/${code}.json`, { timeout: 8000 });
      const firstWork = Array.isArray(data?.works) ? data.works[0]?.key : null;
      if (firstWork && String(firstWork).startsWith('/works/')) {
        const workId = String(firstWork).replace('/works/', '');
        media = await ComicsService.getDetail(`ol-work-${workId}`);
        return { media, normalizedCode: code };
      }
    } catch (_) {
      // Si no encontramos isbn, seguimos con el flujo normal.
    }
  }

  media = await ComicsService.getDetail(code);
  return { media, normalizedCode: code };
}

async function importToLibrary(req, res, next) {
  try {
    const user_id = req.user.id;
    const code = req.body.code || req.body.barcode;
    const { read_status = false, personal_score = null } = req.body;

    const { media, normalizedCode } = await resolveMediaByCode(code);

    if (media.type !== 'comic') {
      return res.status(422).json({ error: 'Solo puedes anadir comics a tu biblioteca' });
    }

    const previousRating = RatingModel.findByUserAndMedia(user_id, media.id);
    const resolvedPersonalScore = personal_score ?? previousRating?.score ?? null;

    const libraryItem = LibraryModel.upsert({
      user_id,
      media_id: media.id,
      read_status: read_status ? 1 : 0,
      personal_score: resolvedPersonalScore,
      source_code: normalizedCode,
    });

    // Reflejar la puntuacion personal en las valoraciones de la comunidad
    if (resolvedPersonalScore !== null) {
      RatingModel.upsert({ user_id, media_id: media.id, score: resolvedPersonalScore });
    }

    res.status(201).json({
      ...libraryItem,
      read_status: Boolean(libraryItem.read_status),
      media,
    });
  } catch (err) {
    next(err);
  }
}

function getMyLibrary(req, res, next) {
  try {
    const rows = LibraryModel.getByUser(req.user.id);
    res.json(rows.map(asLibraryItem));
  } catch (err) {
    next(err);
  }
}

async function updateLibraryItem(req, res, next) {
  try {
    const media = MediaModel.findByImdbId(req.params.imdbId);
    if (!media) {
      return res.status(404).json({ error: 'Media no encontrada' });
    }

    const item = LibraryModel.updateByUserAndMedia({
      user_id: req.user.id,
      media_id: media.id,
      read_status: req.body.read_status === undefined ? null : (req.body.read_status ? 1 : 0),
      personal_score: req.body.personal_score,
    });

    if (!item) {
      return res.status(404).json({ error: 'Comic no encontrado en tu biblioteca' });
    }

    // Reflejar la puntuacion personal en las valoraciones de la comunidad
    if (req.body.personal_score !== undefined) {
      if (req.body.personal_score === null) {
        RatingModel.delete({ user_id: req.user.id, media_id: media.id });
      } else {
        RatingModel.upsert({ user_id: req.user.id, media_id: media.id, score: req.body.personal_score });
      }
    }

    res.json({ ...item, read_status: Boolean(item.read_status) });
  } catch (err) {
    next(err);
  }
}

function removeLibraryItem(req, res, next) {
  try {
    const media = MediaModel.findByImdbId(req.params.imdbId);
    if (!media) {
      return res.status(404).json({ error: 'Media no encontrada' });
    }

    const result = LibraryModel.deleteByUserAndMedia({
      user_id: req.user.id,
      media_id: media.id,
    });

    if (!result.changes) {
      return res.status(404).json({ error: 'Comic no encontrado en tu biblioteca' });
    }

    res.status(204).end();
  } catch (err) {
    next(err);
  }
}

module.exports = {
  importToLibrary,
  getMyLibrary,
  updateLibraryItem,
  removeLibraryItem,
  importValidators,
  updateValidators,
};
