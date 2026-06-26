'use strict';

const express = require('express');
const router = express.Router();

const { getProfile, updateProfile, updateValidators, upload, uploadAvatar } = require('../controllers/user.controller');
const { authenticate } = require('../middleware/auth.middleware');
const validate = require('../middleware/validate.middleware');

/**
 * @swagger
 * tags:
 *   name: Users
 *   description: Gestión de perfil de usuario
 */

/**
 * @swagger
 * /api/users/me:
 *   get:
 *     summary: Obtener mi perfil
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Datos del perfil del usuario autenticado.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/UserPublic' }
 *       401:
 *         description: No autenticado.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *   patch:
 *     summary: Actualizar mi perfil
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               username:   { type: string, example: nuevo_nombre }
 *               bio:        { type: string, example: Fan del cine noir. }
 *               avatar_url: { type: string, example: 'https://example.com/avatar.png' }
 *     responses:
 *       200:
 *         description: Perfil actualizado.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/UserPublic' }
 *       401:
 *         description: No autenticado.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 */
router.get('/me', authenticate, getProfile);
router.patch('/me', authenticate, updateValidators, validate, updateProfile);
router.post('/me/avatar', authenticate, upload.single('avatar'), uploadAvatar);

/**
 * @swagger
 * /api/users/{id}:
 *   get:
 *     summary: Ver perfil público de otro usuario
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *         example: 1
 *     responses:
 *       200:
 *         description: Perfil público del usuario.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/UserPublic' }
 *       404:
 *         description: Usuario no encontrado.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 */
router.get('/:id', getProfile);

module.exports = router;
