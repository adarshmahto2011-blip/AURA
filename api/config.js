/**
 * Aura Music — Vercel Serverless Config Endpoint
 * GET /api/config
 *
 * Reads secrets from Vercel Environment Variables and returns
 * them as JSON. Keys are never stored in the repo.
 *
 * Set these in: Vercel Dashboard → Project → Settings → Environment Variables
 *   YT_API_KEY
 *   FIREBASE_API_KEY
 *   FIREBASE_AUTH_DOMAIN
 *   FIREBASE_PROJECT_ID
 *   FIREBASE_STORAGE_BUCKET
 *   FIREBASE_MESSAGING_SENDER_ID
 *   FIREBASE_APP_ID
 *   FIREBASE_MEASUREMENT_ID
 */

export default function handler(req, res) {
  // Only allow GET
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  res.setHeader('Cache-Control', 'no-store'); // never cache secrets
  res.status(200).json({
    YT_API_KEY: process.env.YT_API_KEY || '',
    FIREBASE: {
      apiKey:            process.env.FIREBASE_API_KEY            || '',
      authDomain:        process.env.FIREBASE_AUTH_DOMAIN        || '',
      projectId:         process.env.FIREBASE_PROJECT_ID         || '',
      storageBucket:     process.env.FIREBASE_STORAGE_BUCKET     || '',
      messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || '',
      appId:             process.env.FIREBASE_APP_ID             || '',
      measurementId:     process.env.FIREBASE_MEASUREMENT_ID     || '',
    },
  });
}
