'use strict';

const express = require('express');
const router = express.Router();

const {
  createComment,
  getComments,
  updateComment,
  deleteComment,
  commentValidators,
  updateValidators,
} = require('../controllers/comment.controller');
const { authenticate } = require('../middleware/auth.middleware');
const validate = require('../middleware/validate.middleware');

/**
 * @swagger
 * tags:
 *   name: Comments
 *   description: Comentarios anidados por título
 */

/**
 * @swagger
 * /api/comments:
 *   post:
 *     summary: Crear un comentario o respuesta
 *     tags: [Comments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [imdb_id, body]
 *             properties:
 *               imdb_id:
 *                 type: string
 *                 example: tmdb-movie-550
 *               body:
 *                 type: string
 *                 example: Gran película, me encantó el giro final.
 *               parent_id:
 *                 type: integer
 *                 nullable: true
 *                 description: ID del comentario al que responde (null para comentario raíz)
 *     responses:
 *       201:
 *         description: Comentario creado.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Comment' }
 *       401:
 *         description: No autenticado.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 */
router.post('/', authenticate, commentValidators, validate, createComment);

/**
 * @swagger
 * /api/comments/{imdbId}:
 *   get:
 *     summary: Obtener comentarios de un título (árbol anidado)
 *     tags: [Comments]
 *     parameters:
 *       - in: path
 *         name: imdbId
 *         required: true
 *         schema: { type: string }
 *         example: tmdb-movie-550
 *     responses:
 *       200:
 *         description: Lista de comentarios raíz con sus respuestas anidadas.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items: { $ref: '#/components/schemas/Comment' }
 */
router.get('/:imdbId', getComments);

/**
 * @swagger
 * /api/comments/{id}:
 *   patch:
 *     summary: Editar un comentario propio
 *     tags: [Comments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [body]
 *             properties:
 *               body: { type: string, example: Comentario editado. }
 *     responses:
 *       200:
 *         description: Comentario actualizado.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Comment' }
 *       403:
 *         description: No eres el autor de este comentario.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *   delete:
 *     summary: Eliminar un comentario propio
 *     tags: [Comments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Comentario eliminado.
 *       403:
 *         description: No eres el autor de este comentario.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 */
router.patch('/:id', authenticate, updateValidators, validate, updateComment);
router.delete('/:id', authenticate, deleteComment);

module.exports = router;
