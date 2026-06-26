'use strict';

const express = require('express');
const router = express.Router();

const { register, login, me, registerValidators, loginValidators, registerLimiter, loginLimiter } = require('../controllers/auth.controller');
const { authenticate } = require('../middleware/auth.middleware');
const validate = require('../middleware/validate.middleware');

/**
 * @swagger
 * tags:
 *   name: Auth
 *   description: Registro, login y datos del usuario autenticado
 */

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Registrar un nuevo usuario
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [username, email, password]
 *             properties:
 *               username:
 *                 type: string
 *                 example: juanito
 *               email:
 *                 type: string
 *                 format: email
 *                 example: juanito@example.com
 *               password:
 *                 type: string
 *                 minLength: 6
 *                 example: secreta123
 *     responses:
 *       201:
 *         description: Usuario creado. Devuelve token JWT y datos del usuario.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token:  { type: string }
 *                 user:   { $ref: '#/components/schemas/UserPublic' }
 *       400:
 *         description: Datos inválidos o email/username ya en uso.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *       429:
 *         description: Demasiadas peticiones.
 */
router.post('/register', registerLimiter, registerValidators, validate, register);

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Iniciar sesión
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: juanito@example.com
 *               password:
 *                 type: string
 *                 example: secreta123
 *     responses:
 *       200:
 *         description: Login correcto. Devuelve token JWT y datos del usuario.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token: { type: string }
 *                 user:  { $ref: '#/components/schemas/UserPublic' }
 *       401:
 *         description: Credenciales incorrectas.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *       429:
 *         description: Demasiadas peticiones.
 */
router.post('/login', loginLimiter, loginValidators, validate, login);

/**
 * @swagger
 * /api/auth/me:
 *   get:
 *     summary: Obtener datos del usuario autenticado
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Datos del usuario actual.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/UserPublic' }
 *       401:
 *         description: Token ausente o inválido.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 */
router.get('/me', authenticate, me);

module.exports = router;
