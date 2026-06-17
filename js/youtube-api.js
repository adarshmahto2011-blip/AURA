/**
 * Aura Music — YouTube Data API v3 Wrapper
 * Provides search, video details, and playlist item retrieval.
 */

const BASE = 'https://www.googleapis.com/youtube/v3';

function getApiKey() {
  return localStorage.getItem('aura_yt_api_key') || '';
}

function iso8601ToSeconds(duration) {
  // PT4M13S → 253
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;
  return (parseInt(match[1] || 0) * 3600) +
         (parseInt(match[2] || 0) * 60) +
          parseInt(match[3] || 0);
}

function formatDuration(secs) {
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function bestThumbnail(thumbnails) {
  return (thumbnails.maxres || thumbnails.high || thumbnails.medium || thumbnails.default || {}).url
    || 'https://via.placeholder.com/480x480/131313/393939?text=♫';
}

function mapVideoItem(item) {
  const id = typeof item.id === 'string' ? item.id : item.id?.videoId || item.id?.playlistId;
  const snip = item.snippet || {};
  return {
    videoId:   id,
    title:     snip.title || 'Unknown Title',
    artist:    snip.channelTitle || snip.videoOwnerChannelTitle || 'Unknown Artist',
    thumbnail: bestThumbnail(snip.thumbnails || {}),
    publishedAt: snip.publishedAt,
  };
}

async function apiFetch(endpoint, params) {
  const key = getApiKey();
  if (!key) throw new Error('NO_API_KEY');

  const url = new URL(`${BASE}/${endpoint}`);
  url.searchParams.set('key', key);
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }

  const res = await fetch(url.toString());
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `HTTP ${res.status}`);
  }
  return res.json();
}

/**
 * Search YouTube for videos/channels/playlists.
 * Returns normalized track-like objects.
 * @param {string} query
 * @param {'video'|'playlist'|'channel'} type
 * @param {number} maxResults
 */
export async function search(query, type = 'video', maxResults = 20) {
  const data = await apiFetch('search', {
    part: 'snippet',
    q: query,
    type,
    maxResults,
    videoCategoryId: type === 'video' ? '10' : '',  // music category
  });

  const ids = data.items
    .filter(i => i.id?.videoId)
    .map(i => i.id.videoId)
    .join(',');

  // Fetch durations in a single batch call
  let durationMap = {};
  if (ids) {
    try {
      const details = await apiFetch('videos', {
        part: 'contentDetails',
        id: ids,
      });
      for (const v of details.items) {
        durationMap[v.id] = iso8601ToSeconds(v.contentDetails.duration);
      }
    } catch(e) { /* duration fetch is non-critical */ }
  }

  return data.items.map(item => {
    const mapped = mapVideoItem(item);
    const secs = durationMap[mapped.videoId] || 0;
    return { ...mapped, duration: secs, durationStr: formatDuration(secs) };
  });
}

/**
 * Get full details for a single video.
 */
export async function getVideoDetails(videoId) {
  const data = await apiFetch('videos', {
    part: 'snippet,contentDetails,statistics',
    id: videoId,
  });
  if (!data.items?.length) throw new Error('Video not found');
  const item = data.items[0];
  const secs = iso8601ToSeconds(item.contentDetails.duration);
  return {
    videoId:   item.id,
    title:     item.snippet.title,
    artist:    item.snippet.channelTitle,
    thumbnail: bestThumbnail(item.snippet.thumbnails),
    duration:  secs,
    durationStr: formatDuration(secs),
    description: item.snippet.description,
  };
}

/**
 * Search specifically for tracks (returns videos).
 */
export async function searchTracks(query, maxResults = 15) {
  return search(query + ' audio', 'video', maxResults);
}

/**
 * Search for channels (artists).
 */
export async function searchArtists(query, maxResults = 5) {
  const data = await apiFetch('search', {
    part: 'snippet',
    q: query,
    type: 'channel',
    maxResults,
  });
  return data.items.map(item => ({
    id:        item.id.channelId,
    name:      item.snippet.channelTitle,
    thumbnail: bestThumbnail(item.snippet.thumbnails),
    type:      'artist',
  }));
}

/**
 * Search for playlists (albums).
 */
export async function searchPlaylists(query, maxResults = 8) {
  const data = await apiFetch('search', {
    part: 'snippet',
    q: query,
    type: 'playlist',
    maxResults,
  });
  return data.items.map(item => ({
    id:        item.id.playlistId,
    title:     item.snippet.title,
    artist:    item.snippet.channelTitle,
    thumbnail: bestThumbnail(item.snippet.thumbnails),
    type:      'playlist',
  }));
}

/**
 * Comprehensive search returning tracks + artists + albums.
 */
export async function searchAll(query) {
  const [tracks, artists, albums] = await Promise.allSettled([
    searchTracks(query, 10),
    searchArtists(query, 3),
    searchPlaylists(query, 6),
  ]);

  return {
    tracks: tracks.status === 'fulfilled' ? tracks.value : [],
    artists: artists.status === 'fulfilled' ? artists.value : [],
    albums: albums.status === 'fulfilled' ? albums.value : [],
    topResult: tracks.status === 'fulfilled' ? tracks.value[0] : null,
  };
}

export { formatDuration, iso8601ToSeconds };
