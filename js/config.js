/**
 * Aura Music — Runtime Configuration
 *
 * Fetches secrets from the /api/config serverless endpoint.
 * Keys are stored as Vercel Environment Variables — never in source code.
 *
 * Local dev: copy config.template.js → config.js and fill in values,
 * OR set the same env vars in a local .env file with a dev server.
 *
 * ⚠️  THIS FILE IS GITIGNORED — it is only used for local development.
 *     On Vercel, config is always served from /api/config.
 */

let _cfg = null;

export async function loadConfig() {
  if (_cfg) return _cfg;

  try {
    const res = await fetch('/api/config');
    if (res.ok) {
      _cfg = await res.json();
      return _cfg;
    }
  } catch (e) {
    // /api/config not available (local dev without a server)
  }

  // Local dev fallback — fill in your values here (this file is gitignored)
  _cfg = {
    YT_API_KEY: '',
    FIREBASE: {
      apiKey:            '',
      authDomain:        '',
      projectId:         '',
      storageBucket:     '',
      messagingSenderId: '',
      appId:             '',
      measurementId:     '',
    },
  };
  return _cfg;
}

// Synchronous CONFIG shim kept for backwards-compat with imports that
// already destructure { CONFIG }. Will be empty until loadConfig() resolves.
export const CONFIG = {
  get YT_API_KEY()  { return _cfg?.YT_API_KEY  || ''; },
  get FIREBASE()    { return _cfg?.FIREBASE    || {}; },
};
