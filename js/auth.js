/**
 * Aura Music — Authentication Module
 * Google Sign-In via Firebase Auth popup.
 * Falls back gracefully when Firebase is not configured.
 */

import { auth, isConfigured } from './firebase.js';

import {
  GoogleAuthProvider,
  signInWithPopup,
  signOut as fbSignOut,
  onAuthStateChanged,
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';

// ── Internal state ────────────────────────────────────────────
let _currentUser = null;
const _listeners = [];

// ── Helpers ───────────────────────────────────────────────────

/**
 * Normalize a Firebase user into a plain object.
 * @param {import('firebase/auth').User|null} fbUser
 * @returns {Object|null}
 */
function normalizeUser(fbUser) {
  if (!fbUser) return null;
  return {
    uid:         fbUser.uid,
    displayName: fbUser.displayName || 'Music Lover',
    firstName:   (fbUser.displayName || '').split(' ')[0] || 'Music Lover',
    email:       fbUser.email,
    photoURL:    fbUser.photoURL || null,
  };
}

// ── Auth state observer ───────────────────────────────────────
if (isConfigured && auth) {
  onAuthStateChanged(auth, (fbUser) => {
    _currentUser = normalizeUser(fbUser);
    _listeners.forEach(fn => fn(_currentUser));
  });
}

// ── Public API ────────────────────────────────────────────────

/**
 * Register a callback to run whenever auth state changes.
 * Fires immediately with the current user (or null).
 * @param {(user: Object|null) => void} callback
 */
export function onAuthStateChange(callback) {
  _listeners.push(callback);
  // Fire immediately with current state
  callback(_currentUser);
}

/**
 * Sign in with a Google popup.
 * @returns {Promise<Object>} normalized user
 */
export async function signInWithGoogle() {
  if (!isConfigured || !auth) {
    throw new Error('Firebase not configured. Add your firebaseConfig to js/config.js.');
  }
  const provider = new GoogleAuthProvider();
  provider.addScope('profile');
  provider.addScope('email');
  const result = await signInWithPopup(auth, provider);
  return normalizeUser(result.user);
}

/**
 * Sign out the current user.
 */
export async function signOut() {
  if (!isConfigured || !auth) return;
  await fbSignOut(auth);
}

/**
 * Get the currently signed-in user (sync, may be null).
 * @returns {Object|null}
 */
export function getCurrentUser() {
  return _currentUser;
}

/**
 * True if a user is signed in.
 */
export function isSignedIn() {
  return !!_currentUser;
}
