'use strict';

require('dotenv').config();

const MediaModel = require('../models/media.model');
const SearchCacheModel = require('../models/search-cache.model');
const db = require('../database/db');

function deleteAllCache() {
  const mediaDeleted = db.prepare('DELETE FROM media').run().changes;
  const searchDeleted = db.prepare('DELETE FROM search_cache').run().changes;

  return { mediaDeleted, searchDeleted, mode: 'all' };
}

function deleteExpiredCache() {
  const mediaDeleted = MediaModel.deleteExpiredCache();
  const searchDeleted = SearchCacheModel.deleteExpiredCache();

  return { mediaDeleted, searchDeleted, mode: 'expired' };
}

const deleteAll = process.argv.includes('--all');
const result = deleteAll ? deleteAllCache() : deleteExpiredCache();

console.log(
  `Cache clean (${result.mode}): media=${result.mediaDeleted}, busquedas=${result.searchDeleted}`
);