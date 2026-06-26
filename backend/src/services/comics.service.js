'use strict';

const axios = require('axios');
const crypto = require('crypto');
const MediaModel = require('../models/media.model');
const SearchCacheModel = require('../models/search-cache.model');

const COMIC_VINE_API_URL = 'https://comicvine.gamespot.com/api';
const MARVEL_API_URL = 'https://gateway.marvel.com:443/v1/public';
const OPEN_LIBRARY_API_URL = 'https://openlibrary.org';

const CACHE_HOURS = parseInt(process.env.MEDIA_CACHE_HOURS || '24', 10);
const SEARCH_CACHE_HOURS = parseInt(process.env.SEARCH_CACHE_HOURS || '24', 10);

function isCacheExpired(cachedAt, maxHours) {
  if (!cachedAt) return true;
  const diff = (Date.now() - new Date(cachedAt).getTime()) / 1000 / 3600;
  return diff > maxHours;
}

function extractYear(value) {
  if (!value) return null;
  return String(value).slice(0, 4);
}

function toList(value, max = 8) {
  if (!Array.isArray(value) || value.length === 0) return null;
  return value
    .map(item => (typeof item === 'string' ? item : item?.name || item?.title))
    .filter(Boolean)
    .slice(0, max)
    .join(', ') || null;
}

function parseComicKey(mediaKey) {
  const parts = String(mediaKey || '').split('-');
  if (parts.length < 3) {
    throw Object.assign(new Error('Identificador de cómic no válido'), { statusCode: 400 });
  }

  const source = parts[0];
  const kind = parts[1];
  const id = parts.slice(2).join('-');

  const validSources = new Set(['cv', 'mv', 'ol']);
  const validKinds = new Set(['issue', 'volume', 'comic', 'character', 'work']);

  if (!validSources.has(source) || !validKinds.has(kind) || !id) {
    throw Object.assign(new Error('Identificador de cómic no válido'), { statusCode: 400 });
  }

  if ((source === 'cv' || source === 'mv') && !/^\d+$/.test(id)) {
    throw Object.assign(new Error('Identificador de cómic no válido'), { statusCode: 400 });
  }

  return {
    source,
    kind,
    id,
  };
}

function mapComicVineSearchItem(item, forcedType) {
  const resource = item?.resource_type || forcedType || 'issue';
  const kind = resource === 'character' ? 'character' : (resource === 'volume' ? 'volume' : 'issue');
  const title = item?.name || item?.title || item?.volume?.name || 'Sin título';
  const genre = kind === 'character'
    ? 'Personaje'
    : (item?.publisher?.name || 'Comic');

  return {
    imdbID: `cv-${kind}-${item.id}`,
    Title: title,
    Year: extractYear(item?.cover_date || item?.start_year || item?.date_added) || '',
    Type: kind === 'character' ? 'character' : 'comic',
    Genre: genre,
    Poster: item?.image?.small_url || item?.image?.medium_url || 'N/A',
  };
}

function mapMarvelSearchItem(item, kind) {
  if (kind === 'character') {
    const thumb = item?.thumbnail?.path && item?.thumbnail?.extension
      ? `${item.thumbnail.path}.${item.thumbnail.extension}`
      : null;

    return {
      imdbID: `mv-character-${item.id}`,
      Title: item?.name || 'Personaje sin nombre',
      Year: '',
      Type: 'character',
      Genre: 'Personaje',
      Poster: thumb || 'N/A',
    };
  }

  const thumb = item?.thumbnail?.path && item?.thumbnail?.extension
    ? `${item.thumbnail.path}.${item.thumbnail.extension}`
    : null;

  return {
    imdbID: `mv-comic-${item.id}`,
    Title: item?.title || 'Comic sin título',
    Year: extractYear(item?.dates?.find(d => d.type === 'onsaleDate')?.date) || '',
    Type: 'comic',
    Genre: item?.format || item?.series?.name || 'Comic',
    Poster: thumb || 'N/A',
  };
}

function mapToMediaRow(searchItem) {
  const type = searchItem.Type === 'character' ? 'character' : 'comic';
  return {
    imdb_id: searchItem.imdbID,
    title: searchItem.Title,
    type,
    year: searchItem.Year || null,
    poster_url: searchItem.Poster !== 'N/A' ? searchItem.Poster : null,
    rated: null,
    released: null,
    runtime: null,
    genre: searchItem.Genre || null,
    director: null,
    writer: null,
    actors: null,
    plot: null,
    imdb_rating: null,
    imdb_votes: null,
    total_seasons: null,
    language: null,
    country: null,
    awards: null,
  };
}

function inferGenreFromItem(item) {
  if (item?.Genre && String(item.Genre).trim()) {
    return String(item.Genre).trim();
  }

  if (item?.Type === 'character') {
    return 'Personaje';
  }

  const id = String(item?.imdbID || '');
  if (id.startsWith('cv-')) return 'Comic';
  if (id.startsWith('mv-')) return 'Superhero';
  if (id.startsWith('ol-')) return 'Graphic Novel';

  return 'Comic';
}

function inferTypeFromItem(item) {
  const declaredType = String(item?.Type || '').trim().toLowerCase();
  if (declaredType === 'character') return 'character';
  if (declaredType) return 'comic';

  const id = String(item?.imdbID || '').toLowerCase();
  if (id.includes('character')) return 'character';
  return 'comic';
}

function normalizeSearchItem(item) {
  return {
    ...item,
    Type: inferTypeFromItem(item),
    Genre: inferGenreFromItem(item),
  };
}

function interleaveProvidersWeighted(providers, maxItems = 60) {
  const normalized = providers.map(provider => ({
    weight: Math.max(1, Number(provider?.weight) || 1),
    bucket: Array.isArray(provider?.results) ? [...provider.results] : [],
  }));
  const merged = [];

  while (merged.length < maxItems) {
    let addedInRound = 0;

    for (const provider of normalized) {
      if (provider.bucket.length === 0) continue;

      let addedForProvider = 0;
      while (provider.bucket.length > 0 && addedForProvider < provider.weight && merged.length < maxItems) {
        merged.push(provider.bucket.shift());
        addedForProvider += 1;
        addedInRound += 1;
      }

      if (merged.length >= maxItems) break;
    }

    if (addedInRound === 0) break;
  }

  return merged;
}

function mapOpenLibrarySearchItem(item) {
  const cover = Number.isInteger(item?.cover_i)
    ? `https://covers.openlibrary.org/b/id/${item.cover_i}-M.jpg`
    : null;

  const subjects = Array.isArray(item?.subject) ? item.subject : [];
  const genre = subjects.length ? String(subjects[0]) : 'Comic';

  return {
    imdbID: `ol-work-${String(item.key || '').replace('/works/', '')}`,
    Title: item?.title || 'Comic sin título',
    Year: item?.first_publish_year ? String(item.first_publish_year) : '',
    Type: 'comic',
    Genre: genre,
    Poster: cover || 'N/A',
  };
}

function hasComicVineKey() {
  const key = process.env.COMICVINE_API_KEY;
  return Boolean(key && !String(key).startsWith('your_'));
}

function hasMarvelKeys() {
  const enabled = String(process.env.MARVEL_ENABLED || 'false').toLowerCase() === 'true';
  if (!enabled) return false;

  const pub = process.env.MARVEL_PUBLIC_KEY;
  const priv = process.env.MARVEL_PRIVATE_KEY;
  if (!pub || !priv) return false;
  return !String(pub).startsWith('your_') && !String(priv).startsWith('your_');
}

function hasOpenLibraryEnabled() {
  return String(process.env.OPENLIBRARY_ENABLED || 'true').toLowerCase() === 'true';
}

function ensureComicVineConfigured() {
  if (!hasComicVineKey()) {
    throw new Error('Comic Vine no configurado. Define COMICVINE_API_KEY.');
  }
}

function ensureMarvelConfigured() {
  if (!hasMarvelKeys()) {
    throw new Error('Marvel no configurado. Define MARVEL_PUBLIC_KEY y MARVEL_PRIVATE_KEY.');
  }
}

async function comicVineGet(path, params = {}) {
  ensureComicVineConfigured();
  const { data } = await axios.get(`${COMIC_VINE_API_URL}${path}`, {
    params: {
      api_key: process.env.COMICVINE_API_KEY,
      format: 'json',
      ...params,
    },
    headers: { 'User-Agent': 'RateComic/1.0' },
    timeout: 10000,
  });

  if (data?.error && data.error !== 'OK') {
    throw new Error(`Comic Vine error: ${data.error}`);
  }

  return data;
}

function getMarvelAuthParams() {
  ensureMarvelConfigured();
  const ts = Date.now().toString();
  const payload = `${ts}${process.env.MARVEL_PRIVATE_KEY}${process.env.MARVEL_PUBLIC_KEY}`;
  const hash = crypto.createHash('md5').update(payload).digest('hex');

  return {
    ts,
    apikey: process.env.MARVEL_PUBLIC_KEY,
    hash,
  };
}

async function marvelGet(path, params = {}) {
  const { data } = await axios.get(`${MARVEL_API_URL}${path}`, {
    params: {
      ...getMarvelAuthParams(),
      ...params,
    },
    timeout: 10000,
  });

  return data?.data || { results: [], total: 0 };
}

async function openLibraryGet(path, params = {}) {
  const { data } = await axios.get(`${OPEN_LIBRARY_API_URL}${path}`, {
    params,
    timeout: 10000,
  });

  return data;
}

async function searchComicVine(query, type, page) {
  if (!hasComicVineKey()) return { results: [], total: 0 };

  const resources = type === 'character' ? 'character' : (type === 'comic' ? 'issue,volume' : 'issue,volume,character');
  const data = await comicVineGet('/search/', {
    query,
    resources,
    page,
    limit: 20,
  });

  const raw = Array.isArray(data.results) ? data.results : [];
  const mapped = raw.map(item => mapComicVineSearchItem(item));
  return {
    results: mapped,
    total: data.number_of_total_results || mapped.length,
  };
}

async function searchMarvel(query, type, page) {
  if (!hasMarvelKeys()) {
    return { results: [], total: 0 };
  }

  const offset = (page - 1) * 20;
  const tasks = [];

  if (!type || type === 'comic') {
    tasks.push(
      marvelGet('/comics', { titleStartsWith: query, limit: 20, offset })
        .then(payload => ({ kind: 'comic', payload }))
    );
  }

  if (!type || type === 'character') {
    tasks.push(
      marvelGet('/characters', { nameStartsWith: query, limit: 20, offset })
        .then(payload => ({ kind: 'character', payload }))
    );
  }

  const responses = await Promise.all(tasks);
  const results = [];
  let total = 0;

  for (const item of responses) {
    const mapped = (item.payload.results || []).map(entry => mapMarvelSearchItem(entry, item.kind));
    results.push(...mapped);
    total += item.payload.total || mapped.length;
  }

  return { results, total };
}

async function searchOpenLibrary(query, type, page) {
  if (!hasOpenLibraryEnabled() || type === 'character') {
    return { results: [], total: 0 };
  }

  const data = await openLibraryGet('/search.json', {
    q: query,
    page,
    limit: 20,
    language: 'eng',
  });

  const docs = Array.isArray(data?.docs) ? data.docs : [];
  const works = docs
    .filter(item => String(item?.key || '').startsWith('/works/'))
    .sort((a, b) => {
      const aComicLike = Array.isArray(a?.subject)
        ? a.subject.some(tag => /comic|comics|graphic novel|manga/i.test(String(tag)))
        : /comic|manga|graphic/i.test(String(a?.title || ''));
      const bComicLike = Array.isArray(b?.subject)
        ? b.subject.some(tag => /comic|comics|graphic novel|manga/i.test(String(tag)))
        : /comic|manga|graphic/i.test(String(b?.title || ''));

      if (aComicLike === bComicLike) return 0;
      return aComicLike ? -1 : 1;
    });

  const mapped = works
    .map(mapOpenLibrarySearchItem)
    .filter(item => !item.imdbID.endsWith('ol-work-'));
  return {
    results: mapped,
    total: Number.isInteger(data?.numFound) ? data.numFound : mapped.length,
  };
}

async function getComicVineDetail(kind, id) {
  const endpoint = kind === 'character'
    ? `/character/4005-${id}/`
    : (kind === 'volume' ? `/volume/4050-${id}/` : `/issue/4000-${id}/`);

  const data = await comicVineGet(endpoint, {
    field_list: 'id,name,deck,description,image,cover_date,date_added,start_year,publisher,volume,character_credits,person_credits,issue_number,site_detail_url',
  });

  const item = data.results;
  if (!item) {
    throw Object.assign(new Error('Comic no encontrado en Comic Vine'), { statusCode: 404 });
  }

  const title = item.name || item.volume?.name || `Comic ${id}`;
  const description = item.deck || item.description || null;

  return {
    imdb_id: `cv-${kind}-${id}`,
    title,
    type: kind === 'character' ? 'character' : 'comic',
    year: extractYear(item.cover_date || item.start_year || item.date_added),
    rated: null,
    released: item.cover_date || null,
    runtime: null,
    genre: kind === 'character' ? 'Personaje' : 'Comic',
    director: item.publisher?.name || null,
    writer: toList(item.person_credits),
    actors: toList(item.character_credits),
    plot: description,
    poster_url: item.image?.original_url || item.image?.medium_url || null,
    imdb_rating: null,
    imdb_votes: null,
    total_seasons: null,
    language: 'English',
    country: null,
    awards: item.site_detail_url || null,
  };
}

async function getMarvelDetail(kind, id) {
  const endpoint = kind === 'character' ? `/characters/${id}` : `/comics/${id}`;
  const payload = await marvelGet(endpoint);
  const item = payload.results?.[0];

  if (!item) {
    throw Object.assign(new Error('Comic no encontrado en Marvel'), { statusCode: 404 });
  }

  const thumbnail = item.thumbnail?.path && item.thumbnail?.extension
    ? `${item.thumbnail.path}.${item.thumbnail.extension}`
    : null;

  if (kind === 'character') {
    return {
      imdb_id: `mv-character-${id}`,
      title: item.name || `Personaje ${id}`,
      type: 'character',
      year: null,
      rated: null,
      released: null,
      runtime: null,
      genre: 'Personaje',
      director: 'Marvel',
      writer: null,
      actors: null,
      plot: item.description || null,
      poster_url: thumbnail,
      imdb_rating: null,
      imdb_votes: null,
      total_seasons: null,
      language: 'English',
      country: null,
      awards: item.urls?.[0]?.url || null,
    };
  }

  const onsale = item.dates?.find(entry => entry.type === 'onsaleDate')?.date || null;

  return {
    imdb_id: `mv-comic-${id}`,
    title: item.title || `Comic ${id}`,
    type: 'comic',
    year: extractYear(onsale),
    rated: null,
    released: onsale,
    runtime: null,
    genre: toList(item.series ? [item.series] : null),
    director: 'Marvel',
    writer: toList(item.creators?.items),
    actors: toList(item.characters?.items),
    plot: item.description || null,
    poster_url: thumbnail,
    imdb_rating: typeof item.issueNumber === 'number' ? Number(item.issueNumber) : null,
    imdb_votes: null,
    total_seasons: null,
    language: 'English',
    country: null,
    awards: item.urls?.[0]?.url || null,
  };
}

async function getOpenLibraryDetail(kind, id) {
  const workId = kind === 'work' || kind === 'comic' ? id : id;
  const item = await openLibraryGet(`/works/${workId}.json`);

  if (!item) {
    throw Object.assign(new Error('Comic no encontrado en Open Library'), { statusCode: 404 });
  }

  let writer = null;
  if (Array.isArray(item.authors) && item.authors.length > 0) {
    const authorNames = await Promise.all(item.authors.slice(0, 8).map(async entry => {
      try {
        const authorKey = entry?.author?.key;
        if (!authorKey) return null;
        const author = await openLibraryGet(`${authorKey}.json`);
        return author?.name || null;
      } catch (_) {
        return null;
      }
    }));
    writer = authorNames.filter(Boolean).join(', ') || null;
  }

  const coverId = Array.isArray(item.covers) && item.covers.length > 0 ? item.covers[0] : null;
  const description = typeof item.description === 'string'
    ? item.description
    : item.description?.value || null;

  return {
    imdb_id: `ol-work-${workId}`,
    title: item.title || `Comic ${workId}`,
    type: 'comic',
    year: item.first_publish_date ? extractYear(item.first_publish_date) : null,
    rated: null,
    released: item.first_publish_date || null,
    runtime: null,
    genre: Array.isArray(item.subjects) ? item.subjects.slice(0, 6).join(', ') : 'Comic',
    director: 'Open Library',
    writer,
    actors: null,
    plot: description,
    poster_url: coverId ? `https://covers.openlibrary.org/b/id/${coverId}-L.jpg` : null,
    imdb_rating: null,
    imdb_votes: null,
    total_seasons: null,
    language: 'English',
    country: null,
    awards: item.key ? `https://openlibrary.org${item.key}` : null,
  };
}

const ComicsService = {
  async search(query, type, page = 1) {
    const normalizedType = type || 'all';
    const cachedSearch = SearchCacheModel.find(query, normalizedType, page);

    if (cachedSearch && !isCacheExpired(cachedSearch.cached_at, SEARCH_CACHE_HOURS)) {
      const cachedResults = JSON.parse(cachedSearch.results_json).map(normalizeSearchItem);
      return {
        results: cachedResults,
        totalResults: cachedSearch.total_results,
      };
    }

    const providers = await Promise.allSettled([
      searchComicVine(query, type, page),
      searchMarvel(query, type, page),
      searchOpenLibrary(query, type, page),
    ]);

    const comicVine = providers[0].status === 'fulfilled'
      ? providers[0].value
      : { results: [], total: 0 };
    const marvel = providers[1].status === 'fulfilled'
      ? providers[1].value
      : { results: [], total: 0 };
    const openLibrary = providers[2].status === 'fulfilled'
      ? providers[2].value
      : { results: [], total: 0 };

    const merged = interleaveProvidersWeighted([
      { results: comicVine.results, weight: 2 },
      { results: openLibrary.results, weight: 1 },
      { results: marvel.results, weight: 1 },
    ]);
    const dedup = [];
    const seen = new Set();
    for (const item of merged) {
      if (!seen.has(item.imdbID)) {
        seen.add(item.imdbID);
        dedup.push(item);
      }
    }

    const results = dedup.slice(0, 20).map(normalizeSearchItem);
    const totalResults = comicVine.total + marvel.total + openLibrary.total;

    for (const item of results) {
      const exists = MediaModel.findByImdbId(item.imdbID);
      if (!exists) {
        MediaModel.upsert(mapToMediaRow(item));
      }
    }

    SearchCacheModel.upsert({
      query,
      type: normalizedType,
      page,
      totalResults,
      results,
    });

    return { results, totalResults };
  },

  async getDetail(mediaKey) {
    const cached = MediaModel.findByImdbId(mediaKey);
    if (cached && !isCacheExpired(cached.cached_at, CACHE_HOURS) && cached.plot) {
      return cached;
    }

    const { source, kind, id } = parseComicKey(mediaKey);

    let row;
    if (source === 'cv') {
      row = await getComicVineDetail(kind, id);
    } else if (source === 'mv') {
      row = await getMarvelDetail(kind, id);
    } else {
      row = await getOpenLibraryDetail(kind, id);
    }

    return MediaModel.upsert(row);
  },
};

module.exports = ComicsService;
