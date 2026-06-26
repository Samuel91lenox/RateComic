'use strict';

const { body } = require('express-validator');
const TmdbService = require('../services/tmdb.service');
const MediaModel = require('../models/media.model');
const CommentModel = require('../models/comment.model');
const { hasRole } = require('../middleware/auth.middleware');
const { securityLog } = require('../utils/security-log.util');

const commentValidators = [
  body('imdb_id').trim().notEmpty().withMessage('imdb_id requerido'),
  body('content').trim().isLength({ min: 1, max: 2000 }).withMessage('El comentario debe tener entre 1 y 2000 caracteres'),
  body('parent_id').optional().isInt({ min: 1 }).withMessage('parent_id debe ser un entero positivo'),
];

const updateValidators = [
  body('content').trim().isLength({ min: 1, max: 2000 }).withMessage('El contenido es requerido'),
];

async function createComment(req, res, next) {
  try {
    const { imdb_id, content, parent_id } = req.body;
    const user_id = req.user.id;

    let media = MediaModel.findByImdbId(imdb_id);
    if (!media) {
      media = await TmdbService.getDetail(imdb_id);
    }

    const comment = CommentModel.create({
      user_id,
      media_id: media.id,
      parent_id: parent_id || null,
      content,
    });

    res.status(201).json(comment);
  } catch (err) {
    next(err);
  }
}

async function getComments(req, res, next) {
  try {
    const { imdbId } = req.params;
    let media = MediaModel.findByImdbId(imdbId);
    if (!media) {
      media = await TmdbService.getDetail(imdbId);
    }

    const comments = CommentModel.getByMedia(media.id);
    res.json(comments);
  } catch (err) {
    next(err);
  }
}

function updateComment(req, res, next) {
  try {
    const comment = CommentModel.findById(parseInt(req.params.id, 10));
    if (!comment) return res.status(404).json({ error: 'Comentario no encontrado' });
    if (comment.user_id !== req.user.id) {
      return res.status(403).json({ error: 'No tienes permiso para editar este comentario' });
    }

    const updated = CommentModel.update(comment.id, { content: req.body.content });
    res.json(updated);
  } catch (err) {
    next(err);
  }
}

function deleteComment(req, res, next) {
  try {
    const comment = CommentModel.findById(parseInt(req.params.id, 10));
    if (!comment) return res.status(404).json({ error: 'Comentario no encontrado' });
    const isOwner = comment.user_id === req.user.id;
    const isAdmin = hasRole(req.user, ['admin']);
    if (!isOwner && !isAdmin) {
      securityLog('comment_delete_forbidden', {
        ip: req.ip,
        userId: req.user.id,
        role: req.user.role || 'user',
        commentId: comment.id,
      });
      return res.status(403).json({ error: 'No tienes permiso para eliminar este comentario' });
    }

    CommentModel.delete(comment.id);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
}

module.exports = { createComment, getComments, updateComment, deleteComment, commentValidators, updateValidators };
