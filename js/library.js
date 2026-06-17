/**
 * Aura Music — Library Manager
 * Handles: Favorites, Saved Albums, Recently Played history.
 *
 * Strategy:
 *  - Always write to localStorage (instant, offline-safe).
 *  - When a user is signed in, also sync to Firestore (cloud).
 *  - On first sign-in: hydrate localStorage from Firestore (cloud wins).
 */

import { saveFavorites, saveHistory } from './db.js';

const KEYS = {
  FAVORITES:    'aura_favorites',
  SAVED_ALBUMS: 'aura_saved_albums',
  HISTORY:      'aura_history',
  QUEUE:        'aura_queue',
};

const MAX_HISTORY = 30;

// ── Signed-in user UID (set by app.js on auth state change) ──
let _uid = null;

export function setLibraryUser(uid) {
  _uid = uid;
}

// ── Internal helpers ──────────────────────────────────────────
function load(key) {
  try { return JSON.parse(localStorage.getItem(key)) || []; }
  catch { return []; }
}
function save(key, data) {
  try { localStorage.setItem(key, JSON.stringify(data)); }
  catch(e) { console.warn('Library save failed:', e); }
}

// ── Hydrate from Firestore (called once after sign-in) ────────
/**
 * Overwrite localStorage with cloud data.
 * Called once when a user signs in so their data is restored.
 */
export function hydrateFromCloud(cloudFavs, cloudHistory) {
  if (Array.isArray(cloudFavs))    save(KEYS.FAVORITES, cloudFavs);
  if (Array.isArray(cloudHistory)) save(KEYS.HISTORY,   cloudHistory);
}

/**
 * Clear localStorage on sign-out so the next guest starts fresh.
 */
export function clearUserData() {
  save(KEYS.FAVORITES, []);
  save(KEYS.HISTORY, []);
  _uid = null;
}

// ── FAVORITES ────────────────────────────────────────────────
export function getFavorites() { return load(KEYS.FAVORITES); }

export function isFavorite(videoId) {
  return getFavorites().some(t => t.videoId === videoId);
}

export function toggleFavorite(track) {
  let favs = getFavorites();
  const idx = favs.findIndex(t => t.videoId === track.videoId);
  let added;
  if (idx === -1) {
    favs.unshift({ ...track, savedAt: Date.now() });
    added = true;
  } else {
    favs.splice(idx, 1);
    added = false;
  }
  save(KEYS.FAVORITES, favs);
  // Async cloud sync — fire and forget
  if (_uid) saveFavorites(_uid, favs);
  return added;
}

// ── SAVED ALBUMS ─────────────────────────────────────────────
export function getSavedAlbums() { return load(KEYS.SAVED_ALBUMS); }

export function isSavedAlbum(albumId) {
  return getSavedAlbums().some(a => a.id === albumId);
}

export function toggleSavedAlbum(album) {
  let albums = getSavedAlbums();
  const idx = albums.findIndex(a => a.id === album.id);
  if (idx === -1) {
    albums.unshift({ ...album, savedAt: Date.now() });
    save(KEYS.SAVED_ALBUMS, albums);
    return true;
  } else {
    albums.splice(idx, 1);
    save(KEYS.SAVED_ALBUMS, albums);
    return false;
  }
}

// ── HISTORY ──────────────────────────────────────────────────
export function getHistory() { return load(KEYS.HISTORY); }

export function addToHistory(track) {
  let history = getHistory();
  history = history.filter(t => t.videoId !== track.videoId);
  history.unshift({ ...track, playedAt: Date.now() });
  if (history.length > MAX_HISTORY) history = history.slice(0, MAX_HISTORY);
  save(KEYS.HISTORY, history);
  // Async cloud sync — fire and forget
  if (_uid) saveHistory(_uid, history);
}

export function clearHistory() {
  save(KEYS.HISTORY, []);
  if (_uid) saveHistory(_uid, []);
}

// ── QUEUE ─────────────────────────────────────────────────────
export function getQueue() { return load(KEYS.QUEUE); }
export function saveQueue(queue) { save(KEYS.QUEUE, queue); }
