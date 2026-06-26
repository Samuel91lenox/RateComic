'use strict';

const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'RateComic API',
      version: '1.0.0',
      description:
        'API REST de RateComic. Permite buscar cómics y personajes vía Comic Vine + Marvel API, puntuarlos del 1 al 10 y dejar comentarios anidados.',
    },
    servers: [
      { url: 'http://localhost:3000', description: 'Desarrollo local' },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Token JWT obtenido en POST /api/auth/login',
        },
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            error: { type: 'string', example: 'Mensaje de error' },
          },
        },
        UserPublic: {
          type: 'object',
          properties: {
            id:         { type: 'integer', example: 1 },
            username:   { type: 'string',  example: 'juanito' },
            email:      { type: 'string',  example: 'juanito@example.com' },
            avatar_url: { type: 'string',  example: null, nullable: true },
            bio:        { type: 'string',  example: null, nullable: true },
            created_at: { type: 'string',  format: 'date-time' },
          },
        },
        Media: {
          type: 'object',
          properties: {
            id:          { type: 'integer' },
            imdb_id:     { type: 'string',  example: 'cv-issue-12345' },
            title:       { type: 'string',  example: 'Batman #1' },
            year:        { type: 'string',  example: '2016' },
            type:        { type: 'string',  enum: ['comic', 'character'] },
            poster:      { type: 'string',  example: 'https://comicvine.gamespot.com/a/uploads/...' },
            plot:        { type: 'string' },
            genre:       { type: 'string',  example: 'Drama, Thriller' },
            director:    { type: 'string' },
            actors:      { type: 'string' },
            rating_imdb: { type: 'number',  example: 8.8 },
          },
        },
        Rating: {
          type: 'object',
          properties: {
            id:         { type: 'integer' },
            user_id:    { type: 'integer' },
            imdb_id:    { type: 'string' },
            score:      { type: 'integer', minimum: 1, maximum: 10 },
            created_at: { type: 'string', format: 'date-time' },
            updated_at: { type: 'string', format: 'date-time' },
          },
        },
        Comment: {
          type: 'object',
          properties: {
            id:         { type: 'integer' },
            user_id:    { type: 'integer' },
            imdb_id:    { type: 'string' },
            parent_id:  { type: 'integer', nullable: true },
            body:       { type: 'string' },
            created_at: { type: 'string', format: 'date-time' },
            updated_at: { type: 'string', format: 'date-time' },
            username:   { type: 'string' },
            replies:    { type: 'array', items: { $ref: '#/components/schemas/Comment' } },
          },
        },
      },
    },
  },
  // Archivos donde buscar anotaciones @swagger
  apis: ['./src/routes/*.js'],
};

module.exports = swaggerJsdoc(options);
