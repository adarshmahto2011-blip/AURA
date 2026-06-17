/**
 * Aura Music — Firestore Database Module
 * Per-user data persistence: favorites, history, preferences.
 * All functions are safe no-ops when Firebase is not configured
 * or the user is a guest.
 *
 * Firestore structure:
 *   users/{uid}/
 *     ├── profile      { displayName, email, photoURL, lastSeen }
 *     ├── favorites    { items: Track[] }
 *     ├── history      { items: Track[] }
 *     └── preferences  { quality, autoplay, crossfade, volume }
 */

import { db, isConfigured } from './firebase.js';

import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

// ── Guard ─────────────────────────────────────────────────────
function canUseFirestore(uid) {
  return isConfigured && !!db && !!uid;
}

// ── Reference helpers ─────────────────────────────────────────
const userRef    = (uid) => doc(db, 'users', uid);
const favsRef    = (uid) => doc(db, 'users', uid, 'data', 'favorites');
const historyRef = (uid) => doc(db, 'users', uid, 'data', 'history');
const prefsRef   = (uid) => doc(db, 'users', uid, 'data', 'preferences');

// ── Profile ───────────────────────────────────────────────────

/**
 * Create or update the user's profile document.
 */
export async function upsertProfile(uid, profile) {
  if (!canUseFirestore(uid)) return;
  try {
    await setDoc(userRef(uid), {
      displayName: profile.displayName,
      email:       profile.email,
      photoURL:    profile.photoURL || null,
      lastSeen:    serverTimestamp(),
    }, { merge: true });
  } catch (e) {
    console.warn('[DB] upsertProfile failed:', e.message);
  }
}

// ── Favorites ─────────────────────────────────────────────────

/**
 * Load favorites from Firestore. Returns [] on failure.
 */
export async function loadFavorites(uid) {
  if (!canUseFirestore(uid)) return null; // null = not loaded from cloud
  try {
    const snap = await getDoc(favsRef(uid));
    return snap.exists() ? (snap.data().items || []) : [];
  } catch (e) {
    console.warn('[DB] loadFavorites failed:', e.message);
    return null;
  }
}

/**
 * Overwrite the favorites list for a user.
 */
export async function saveFavorites(uid, items) {
  if (!canUseFirestore(uid)) return;
  try {
    await setDoc(favsRef(uid), { items, updatedAt: serverTimestamp() });
  } catch (e) {
    console.warn('[DB] saveFavorites failed:', e.message);
  }
}

// ── History ───────────────────────────────────────────────────

/**
 * Load play history from Firestore. Returns null on failure.
 */
export async function loadHistory(uid) {
  if (!canUseFirestore(uid)) return null;
  try {
    const snap = await getDoc(historyRef(uid));
    return snap.exists() ? (snap.data().items || []) : [];
  } catch (e) {
    console.warn('[DB] loadHistory failed:', e.message);
    return null;
  }
}

/**
 * Overwrite the history list for a user.
 */
export async function saveHistory(uid, items) {
  if (!canUseFirestore(uid)) return;
  try {
    await setDoc(historyRef(uid), { items, updatedAt: serverTimestamp() });
  } catch (e) {
    console.warn('[DB] saveHistory failed:', e.message);
  }
}

// ── Preferences ───────────────────────────────────────────────

/**
 * Load preferences from Firestore.
 */
export async function loadPreferences(uid) {
  if (!canUseFirestore(uid)) return null;
  try {
    const snap = await getDoc(prefsRef(uid));
    return snap.exists() ? snap.data() : null;
  } catch (e) {
    console.warn('[DB] loadPreferences failed:', e.message);
    return null;
  }
}

/**
 * Save preferences to Firestore.
 */
export async function savePreferences(uid, prefs) {
  if (!canUseFirestore(uid)) return;
  try {
    await setDoc(prefsRef(uid), { ...prefs, updatedAt: serverTimestamp() });
  } catch (e) {
    console.warn('[DB] savePreferences failed:', e.message);
  }
}
