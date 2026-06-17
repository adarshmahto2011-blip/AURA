/**
 * Aura Music — Firebase Initialization
 * Single entry point for Firebase app, Auth, and Firestore.
 * Uses the modular Firebase Web SDK v10 via CDN (no bundler needed).
 */

import { CONFIG } from './config.js';

// ── Firebase SDK (CDN imports — no build step needed) ────────
import { initializeApp }
  from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import { getAuth }
  from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import { getFirestore }
  from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

// ── Guard: only init if config is present ────────────────────
const isConfigured = CONFIG.FIREBASE?.apiKey &&
                     CONFIG.FIREBASE.apiKey !== 'YOUR_FIREBASE_API_KEY';

let app = null;
let auth = null;
let db = null;

if (isConfigured) {
  try {
    app  = initializeApp(CONFIG.FIREBASE);
    auth = getAuth(app);
    db   = getFirestore(app);
    console.log('[Aura] Firebase initialized ✓');
  } catch (e) {
    console.warn('[Aura] Firebase init failed:', e.message);
  }
} else {
  console.info('[Aura] Firebase config not set — running in guest-only mode.');
}

export { app, auth, db, isConfigured };
