/**
 * Aura Music — UI Helpers & DOM Management
 * View switching, rendering cards/tracks, syncing player UI.
 */

import { isFavorite } from './library.js';

// ── View Management ─────────────────────────────────────────
const views = {
  landing:     document.getElementById('view-landing'),
  main:        document.getElementById('view-main'),
  nowPlaying:  document.getElementById('view-now-playing'),
};

let currentPageId = null;

export function showView(viewName) {
  // Landing ↔ Main are mutually exclusive
  if (viewName === 'landing') {
    views.landing.classList.add('active');
    views.main.classList.remove('active');
    views.nowPlaying.classList.remove('open');
    return;
  }
  if (viewName === 'main') {
    views.landing.classList.remove('active');
    views.main.classList.add('active');
    views.main.classList.add('anim-view-in');
    setTimeout(() => views.main.classList.remove('anim-view-in'), 400);
    return;
  }
  if (viewName === 'now-playing') {
    views.nowPlaying.classList.remove('closing');
    views.nowPlaying.classList.add('open');
    return;
  }
  if (viewName === 'close-now-playing') {
    views.nowPlaying.classList.add('closing');
    setTimeout(() => views.nowPlaying.classList.remove('open', 'closing'), 300);
    return;
  }
}

// ── Page (sub-views within main) ────────────────────────────
export function showPage(pageId) {
  if (currentPageId === pageId) return;
  document.querySelectorAll('.page').forEach(p => {
    p.classList.toggle('active', p.id === `page-${pageId}`);
  });
  document.querySelectorAll('.nav-item').forEach(n => {
    n.classList.toggle('active', n.dataset.page === pageId);
  });
  currentPageId = pageId;
}

// ── Greeting ─────────────────────────────────────────────────
export function setGreeting(firstName = null) {
  const hour = new Date().getHours();
  const greetings = {
    morning:   'Good Morning',
    afternoon: 'Good Afternoon',
    evening:   'Good Evening',
    night:     'Good Night',
  };
  const g = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : hour < 21 ? 'evening' : 'night';
  const el = document.getElementById('greeting-text');
  if (el) {
    el.textContent = firstName ? `${greetings[g]}, ${firstName}.` : `${greetings[g]}.`;
  }
}

// ── Format seconds → "m:ss" ──────────────────────────────────
export function formatTime(s) {
  if (!s || isNaN(s)) return '0:00';
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

// ── SVG Icon helpers ─────────────────────────────────────────
export const Icons = {
  play: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>`,
  pause: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>`,
  skip_next: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/></svg>`,
  skip_prev: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 6h2v12H6zm3.5 6 8.5 6V6z"/></svg>`,
  shuffle: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 3 21 3 21 8"/><line x1="4" y1="20" x2="21" y2="3"/><polyline points="21 16 21 21 16 21"/><line x1="15" y1="15" x2="21" y2="21"/></svg>`,
  repeat: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>`,
  heart: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>`,
  heart_filled: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>`,
  volume: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>`,
  queue: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>`,
  chevron_down: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>`,
  more_horiz: `<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/></svg>`,
  settings: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>`,
  user: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`,
  search: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>`,
  home: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>`,
  library: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>`,
  music_note: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 3v10.55A4 4 0 1 0 14 17V7h4V3z"/></svg>`,
  info: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>`,
  x: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`,
};

// ── Render an Album Card ─────────────────────────────────────
export function renderAlbumCard(item, options = {}) {
  const { large = false, badge = null } = options;
  const isAlbum = item.type === 'playlist';
  const div = document.createElement('div');
  div.className = `album-card${large ? ' card-lg' : ''}`;
  div.dataset.id = item.videoId || item.id;
  div.innerHTML = `
    <div class="card-art-wrap">
      <img src="${item.thumbnail}" alt="${item.title}" loading="lazy"
           onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><rect width=%22100%22 height=%22100%22 fill=%22%23262626%22/><text y=%2250%22 x=%2250%22 font-size=%2240%22 text-anchor=%22middle%22 dominant-baseline=%22middle%22>♫</text></svg>'">
      ${badge ? `<span class="card-badge">${badge}</span>` : ''}
      <button class="card-play-btn" aria-label="Play">${Icons.play}</button>
    </div>
    <div class="card-title">${item.title}</div>
    <div class="card-artist">${item.artist || ''}</div>
  `;
  return div;
}

// ── Render a Track List Item ─────────────────────────────────
export function renderTrackItem(track, options = {}) {
  const { showFav = true, isPlaying = false } = options;
  const faved = isFavorite(track.videoId);
  const div = document.createElement('div');
  div.className = `track-item${isPlaying ? ' playing' : ''}`;
  div.dataset.videoId = track.videoId;
  div.innerHTML = `
    <div class="track-thumb">
      <img src="${track.thumbnail}" alt="${track.title}" loading="lazy"
           onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><rect width=%22100%22 height=%22100%22 fill=%22%23262626%22/></svg>'">
    </div>
    <div class="track-info">
      <div class="track-name">${track.title}</div>
      <div class="track-artist">${track.artist}</div>
    </div>
    <div class="track-actions">
      ${isPlaying ? '<div class="waveform"><span></span><span></span><span></span></div>' : ''}
      ${showFav ? `<button class="track-fav-btn${faved ? ' active' : ''}" aria-label="Favorite" data-video-id="${track.videoId}">
        ${faved ? Icons.heart_filled : Icons.heart}
      </button>` : ''}
      <span class="track-duration">${track.durationStr || ''}</span>
    </div>
  `;
  return div;
}

// ── Skeleton cards ───────────────────────────────────────────
export function renderSkeletonCards(container, count = 4) {
  container.innerHTML = Array.from({ length: count }, () => `
    <div class="album-card">
      <div class="card-art-wrap skeleton skeleton-art"></div>
      <div class="skeleton skeleton-text"></div>
      <div class="skeleton skeleton-text2"></div>
    </div>
  `).join('');
}

// ── Mini Player UI ───────────────────────────────────────────
export function updateMiniPlayer(track, playing) {
  const mp = document.getElementById('mini-player');
  if (!mp) return;

  mp.classList.toggle('hidden', !track);
  if (!track) return;

  const img = mp.querySelector('.mini-thumb img');
  const title = mp.querySelector('.mini-title');
  const artist = mp.querySelector('.mini-artist');
  const playBtn = mp.querySelector('.mini-play-btn');

  if (img) img.src = track.thumbnail;
  if (title) title.textContent = track.title;
  if (artist) artist.textContent = track.artist;
  if (playBtn) playBtn.classList.toggle('playing', !!playing);
}

export function updateMiniProgress(current, duration) {
  const fill = document.querySelector('.mini-progress-fill');
  const time = document.querySelector('.mini-time');
  if (fill && duration > 0) {
    fill.style.width = `${(current / duration) * 100}%`;
  }
  if (time) {
    time.textContent = `${formatTime(current)} / ${formatTime(duration)}`;
  }
}

// ── Now Playing UI ───────────────────────────────────────────
export function updateNowPlaying(track, playing) {
  if (!track) return;
  const img = document.querySelector('.np-art-wrap img');
  const title = document.querySelector('.np-title');
  const artist = document.querySelector('.np-artist');
  const playBtn = document.querySelector('.np-play-btn');

  if (img) {
    img.classList.remove('anim-art');
    void img.offsetWidth; // reflow
    img.src = track.thumbnail;
    img.classList.add('anim-art');
  }
  if (title) title.textContent = track.title;
  if (artist) artist.textContent = track.artist;
  if (playBtn) playBtn.classList.toggle('playing', !!playing);
}

export function updateNowPlayingProgress(current, duration) {
  const fill = document.querySelector('.np-progress-fill');
  const curEl = document.querySelector('.np-time-current');
  const durEl = document.querySelector('.np-time-total');

  if (fill && duration > 0) {
    fill.style.width = `${(current / duration) * 100}%`;
  }
  if (curEl) curEl.textContent = formatTime(current);
  if (durEl) durEl.textContent = formatTime(duration);
}

export function updateNowPlayingBg(colors, imageUrl) {
  const bgEl = document.querySelector('.np-bg');
  const blurEl = document.querySelector('.np-bg-blur');
  if (bgEl && colors) {
    bgEl.style.background = colors.darkBg;
  }
  if (blurEl && imageUrl) {
    blurEl.style.backgroundImage = `url(${imageUrl})`;
    blurEl.style.opacity = '0';
    requestAnimationFrame(() => { blurEl.style.opacity = '1'; });
  }
}

// ── Toast Notifications ──────────────────────────────────────
export function showToast(message, duration = 2500) {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(20px)';
    toast.style.transition = '0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

// ── API Banner ───────────────────────────────────────────────
export function showApiBanner(show) {
  const banner = document.getElementById('api-banner');
  if (banner) banner.classList.toggle('visible', show);
}

// ── Settings Modal ───────────────────────────────────────────
export function openSettingsModal() {
  const modal = document.getElementById('modal-settings');
  if (modal) {
    modal.classList.add('open');
    const input = document.getElementById('api-key-input');
    if (input) input.value = localStorage.getItem('aura_yt_api_key') || '';
  }
}
export function closeSettingsModal() {
  const modal = document.getElementById('modal-settings');
  if (modal) modal.classList.remove('open');
}
