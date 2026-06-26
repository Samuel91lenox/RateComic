'use strict';

const express = require('express');
const router = express.Router();

const { authenticate } = require('../middleware/auth.middleware');
const validate = require('../middleware/validate.middleware');
const {
  importToLibrary,
  getMyLibrary,
  updateLibraryItem,
  removeLibraryItem,
  importValidators,
  updateValidators,
} = require('../controllers/library.controller');

router.get('/me', authenticate, getMyLibrary);
router.post('/import', authenticate, importValidators, validate, importToLibrary);
router.patch('/:imdbId', authenticate, updateValidators, validate, updateLibraryItem);
router.delete('/:imdbId', authenticate, removeLibraryItem);

module.exports = router;
