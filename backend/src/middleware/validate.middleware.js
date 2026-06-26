'use strict';

const { validationResult } = require('express-validator');

/**
 * Middleware que comprueba los errores de express-validator.
 * Si hay errores, responde 422 con la lista de errores.
 */
function validateRequest(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({ errors: errors.array() });
  }
  next();
}

module.exports = validateRequest;
