'use strict';

const axios = require('axios');
const MediaModel = require('../models/media.model');
const SearchCacheModel = require('../models/search-cache.model');

const TMDB_API_URL = 'https://api.themoviedb.org/3';
const TMDB_IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w500';
const CACHE_HOURS = parseInt(process.env.MEDIA_CACHE_HOURS || '24', 10);
const SEARCH_CACHE_HOURS = parseInt(process.env.SEARCH_CACHE_HOURS || '24', 10);

function getAuthHeaders() {
  const bearerToken = process.env.TMDB_ACCESS_TOKEN;
  const apiKey = process.env.TMDB_API_KEY;

  if (bearerToken && bearerToken !== 'your_tmdb_access_token_here') {
    return {
      accept: 'application/json',
      Authorization: `Bearer ${bearerToken}`,
    };
  }

  if (apiKey && apiKey !== 'your_tmdb_api_key_here') {
    return {
      accept: 'application/json',
    };
  }

  throw new Error('TMDB no configurado. Define TMDB_ACCESS_TOKEN o TMDB_API_KEY.');
}

function getCommonParams() {
  const apiKey = process.env.TMDB_API_KEY;
  return {
    language: 'es-ES',
    ...(apiKey && apiKey !== 'your_tmdb_api_key_here' ? { api_key: apiKey } : {}),
  };
}

function buildPosterUrl(path) {
  return path ? `${TMDB_IMAGE_BASE_URL}${path}` : null;
}

function buildMediaKey(type, tmdbId) {
  return `tmdb-${type}-${tmdbId}`;
}

function parseMediaKey(mediaKey) {
  const match = /^tmdb-(movie|series)-(\d+)$/.exec(mediaKey);
  if (!match) {
    throw Object.assign(new Error('Identificador de media no válido'), { statusCode: 400 });
  }

  return {
    type: match[1],
    tmdbId: match[2],
  };
}

function extractYear(dateString) {
  return dateString ? String(dateString).slice(0, 4) : null;
}

function joinNames(items, key = 'name', limit = 8) {
  if (!Array.isArray(items) || items.length === 0) return null;
  return items
    .map(item => item?.[key])
    .filter(Boolean)
    .slice(0, limit)
    .join(', ') || null;
}

function getMovieCertification(releaseDates) {
  const us = releaseDates?.results?.find(item => item.iso_3166_1 === 'US');
  const certification = us?.release_dates?.find(item => item.certification)?.certification;
  return certification || null;
}

function getTvCertification(contentRatings) {
  const us = contentRatings?.results?.find(item => item.iso_3166_1 === 'US');
  return us?.rating || null;
}

/**
 * Verifica si el caché de un registro de media ha expirado.
 */
function isCacheExpired(cachedAt) {
  if (!cachedAt) return true;
  const diff = (Date.now() - new Date(cachedAt).getTime()) / 1000 / 3600;
  return diff > CACHE_HOURS;
}

function isSearchCacheExpired(cachedAt) {
  if (!cachedAt) return true;
  const diff = (Date.now() - new Date(cachedAt).getTime()) / 1000 / 3600;
  return diff > SEARCH_CACHE_HOURS;
}

/**
 * Mapea la respuesta de TMDB a nuestro esquema de base de datos.
 */
function mapTmdbDetailToModel(type, detail) {
  const crew = detail.credits?.crew || detail.aggregate_credits?.crew || [];
  const cast = detail.credits?.cast || detail.aggregate_credits?.cast || [];
  const directorJobs = type === 'movie' ? ['Director'] : ['Executive Producer', 'Creator'];
  const writerJobs = ['Writer', 'Screenplay', 'Story', 'Novel'];
  const directors = crew.filter(person => directorJobs.includes(person.job)).map(person => person.name);
  const writers = crew.filter(person => writerJobs.includes(person.job)).map(person => person.name);

  return {
    imdb_id:       buildMediaKey(type, detail.id),
    title:         type === 'movie' ? detail.title : detail.name,
    type,
    year:          extractYear(type === 'movie' ? detail.release_date : detail.first_air_date),
    rated:         type === 'movie' ? getMovieCertification(detail.release_dates) : getTvCertification(detail.content_ratings),
    released:      type === 'movie' ? detail.release_date || null : detail.first_air_date || null,
    runtime:       type === 'movie'
      ? (detail.runtime ? `${detail.runtime} min` : null)
      : (detail.episode_run_time?.[0] ? `${detail.episode_run_time[0]} min` : null),
    genre:         joinNames(detail.genres),
    director:      directors.slice(0, 4).join(', ') || null,
    writer:        writers.slice(0, 6).join(', ') || null,
    actors:        joinNames(cast),
    plot:          detail.overview || null,
    poster_url:    buildPosterUrl(detail.poster_path),
    imdb_rating:   typeof detail.vote_average === 'number' ? Number(detail.vote_average.toFixed(1)) : null,
    imdb_votes:    typeof detail.vote_count === 'number' ? String(detail.vote_count) : null,
    total_seasons: type === 'series' && detail.number_of_seasons ? String(detail.number_of_seasons) : null,
    language:      joinNames(detail.spoken_languages),
    country:       type === 'movie'
      ? joinNames(detail.production_countries)
      : Array.isArray(detail.origin_country) ? detail.origin_country.join(', ') || null : null,
    awards:        null,
  };
}

function mapTmdbSearchItem(type, item) {
  const normalizedType = type === 'tv' ? 'series' : 'movie';
  return {
    imdbID: buildMediaKey(normalizedType, item.id),
    Title: type === 'tv' ? item.name : item.title,
    Year: extractYear(type === 'tv' ? item.first_air_date : item.release_date) || '',
    Type: normalizedType,
    Poster: buildPosterUrl(item.poster_path) || 'N/A',
  };
}

async function tmdbGet(path, params = {}) {
  const { data } = await axios.get(`${TMDB_API_URL}${path}`, {
    headers: getAuthHeaders(),
    params: {
      ...getCommonParams(),
      ...params,
    },
    timeout: 8000,
  });

  return data;
}

const TmdbService = {
  /**
   * Busca películas/series en TMDB.
   * @param {string} query  Texto de búsqueda
   * @param {string} type   'movie' | 'series'
   * @param {number} page   Página
   */
  async search(query, type, page = 1) {
    const cachedSearch = SearchCacheModel.find(query, type, page);
    if (cachedSearch && !isSearchCacheExpired(cachedSearch.cached_at)) {
      return {
        results: JSON.parse(cachedSearch.results_json),
        totalResults: cachedSearch.total_results,
      };
    }

    let endpoint = '/search/multi';
    if (type === 'movie') endpoint = '/search/movie';
    if (type === 'series') endpoint = '/search/tv';

    const data = await tmdbGet(endpoint, {
      query,
      include_adult: false,
      page,
    });

    const rawResults = Array.isArray(data.results) ? data.results : [];
    const filteredResults = rawResults.filter(item => {
      if (type === 'movie') return true;
      if (type === 'series') return true;
      return item.media_type === 'movie' || item.media_type === 'tv';
    });

    const results = filteredResults.map(item => mapTmdbSearchItem(item.media_type || (type === 'series' ? 'tv' : 'movie'), item));

    for (const item of results) {
      const cached = MediaModel.findByImdbId(item.imdbID);
      if (!cached) {
        MediaModel.upsert({
          imdb_id:    item.imdbID,
          title:      item.Title,
          type:       item.Type === 'series' ? 'series' : 'movie',
          year:       item.Year || null,
          poster_url: item.Poster !== 'N/A' ? item.Poster : null,
          rated: null, released: null, runtime: null, genre: null,
          director: null, writer: null, actors: null, plot: null,
          imdb_rating: null, imdb_votes: null, total_seasons: null,
          language: null, country: null, awards: null,
        });
      }
    }

    SearchCacheModel.upsert({
      query,
      type,
      page,
      totalResults: parseInt(data.total_results || '0', 10),
      results,
    });

    return {
      results,
      totalResults: parseInt(data.total_results || '0', 10),
    };
  },

  /**
   * Obtiene el detalle completo de un ítem por su identificador interno.
   * Usa caché local si los datos son recientes.
   */
  async getDetail(mediaKey) {
    const cached = MediaModel.findByImdbId(mediaKey);
    if (cached && !isCacheExpired(cached.cached_at) && cached.plot) {
      return cached;
    }

    if (!process.env.TMDB_ACCESS_TOKEN && !process.env.TMDB_API_KEY) {
      if (cached) return cached;
      throw new Error('TMDB no configurado.');
    }

    const { type, tmdbId } = parseMediaKey(mediaKey);
    const endpointType = type === 'series' ? 'tv' : 'movie';
    const appendToResponse = type === 'movie'
      ? 'credits,release_dates,external_ids'
      : 'aggregate_credits,content_ratings,external_ids';

    let data;
    try {
      data = await tmdbGet(`/${endpointType}/${tmdbId}`, {
        append_to_response: appendToResponse,
      });
    } catch (error) {
      if (error.response?.status === 404) {
        throw Object.assign(new Error('Media no encontrada en TMDB'), { statusCode: 404 });
      }
      throw error;
    }

    return MediaModel.upsert(mapTmdbDetailToModel(type, data));
  },
};

module.exports = TmdbService;
