'use strict';

const express = require('express');
const router = express.Router();

const { upsertRating, getMyRatings, getMediaRatings, deleteRating, ratingValidators } = require('../controllers/rating.controller');
const { authenticate } = require('../middleware/auth.middleware');
const validate = require('../middleware/validate.middleware');

/**
 * @swagger
 * tags:
 *   name: Ratings
 *   description: Puntuaciones de 1 a 10 por usuario y título
 */

/**
 * @swagger
 * /api/ratings:
 *   post:
 *     summary: Crear o actualizar una puntuación
 *     tags: [Ratings]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [imdb_id, score]
 *             properties:
 *               imdb_id:
 *                 type: string
 *                 example: tmdb-movie-550
 *               score:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 10
 *                 example: 9
 *     responses:
 *       200:
 *         description: Puntuación creada o actualizada.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Rating' }
 *       401:
 *         description: No autenticado.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 */
router.post('/', authenticate, ratingValidators, validate, upsertRating);

/**
 * @swagger
 * /api/ratings/me:
 *   get:
 *     summary: Obtener todas mis valoraciones
 *     tags: [Ratings]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de valoraciones del usuario autenticado.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items: { $ref: '#/components/schemas/Rating' }
 *       401:
 *         description: No autenticado.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 */
router.get('/me', authenticate, getMyRatings);

/**
 * @swagger
 * /api/ratings/{imdbId}:
 *   get:
 *     summary: Obtener estadísticas de puntuación de un título
 *     tags: [Ratings]
 *     parameters:
 *       - in: path
 *         name: imdbId
 *         required: true
 *         schema: { type: string }
 *         example: tmdb-movie-550
 *     responses:
 *       200:
 *         description: Media, total de votos y distribución.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 average:      { type: number, example: 8.2 }
 *                 count:        { type: integer, example: 34 }
 *                 distribution: { type: object, description: 'Mapa score→cantidad' }
 *                 myScore:      { type: integer, nullable: true, example: 9 }
 *   delete:
 *     summary: Eliminar mi puntuación de un título
 *     tags: [Ratings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: imdbId
 *         required: true
 *         schema: { type: string }
 *         example: tmdb-movie-550
 *     responses:
 *       200:
 *         description: Puntuación eliminada.
 *       401:
 *         description: No autenticado.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *       404:
 *         description: No tenías puntuación para ese título.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 */
router.get('/:imdbId', getMediaRatings);
router.delete('/:imdbId', authenticate, deleteRating);

module.exports = router;
