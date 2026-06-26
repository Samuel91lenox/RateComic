'use strict';

const express = require('express');
const router = express.Router();

const { search, getDetail, getTrending } = require('../controllers/media.controller');

/**
 * @swagger
 * tags:
 *   name: Media
 *   description: Búsqueda y detalle de cómics/personajes vía Comic Vine + Marvel API
 */

/**
 * @swagger
 * /api/media/search:
 *   get:
 *     summary: Buscar cómics o personajes
 *     tags: [Media]
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema: { type: string }
 *         description: Término de búsqueda
 *         example: inception
 *       - in: query
 *         name: type
 *         schema: { type: string, enum: [comic, character] }
 *         description: Filtrar por tipo (omitir para buscar ambos)
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *         description: Número de página (20 resultados por página)
 *     responses:
 *       200:
 *         description: Lista paginada de resultados.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 results:
 *                   type: array
 *                   items: { $ref: '#/components/schemas/Media' }
 *                 totalResults: { type: integer }
 *                 page:         { type: integer }
 *                 totalPages:   { type: integer }
 *                 cached:       { type: boolean }
 *       400:
 *         description: Parámetro q requerido.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 */
router.get('/search', search);

/**
 * @swagger
 * /api/media/trending:
 *   get:
 *     summary: Obtener contenido más puntuado en RateComic
 *     tags: [Media]
 *     parameters:
 *       - in: query
 *         name: type
 *         schema: { type: string, enum: [comic, character], default: comic }
 *         description: Tipo de contenido
 *     responses:
 *       200:
 *         description: Lista de tendencias.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 results:
 *                   type: array
 *                   items: { $ref: '#/components/schemas/Media' }
 */
router.get('/trending', getTrending);

/**
 * @swagger
 * /api/media/{imdbId}:
 *   get:
 *     summary: Obtener detalle de un cómic o personaje
 *     tags: [Media]
 *     parameters:
 *       - in: path
 *         name: imdbId
 *         required: true
 *         schema: { type: string }
 *         description: ID interno (p.ej. cv-issue-12345 o mv-character-1011334)
 *         example: cv-issue-12345
 *     responses:
 *       200:
 *         description: Detalle completo del título.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Media' }
 *       404:
 *         description: No encontrado.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 */
router.get('/:imdbId', getDetail);

module.exports = router;
