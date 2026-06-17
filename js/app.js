/**
 * Aura Music — App Coordinator
 * Bootstraps the app, wires all events, manages global state.
 */

import { CONFIG, loadConfig } from './config.js';
import { onAuthStateChange, signInWithGoogle, signOut, isSignedIn } from './auth.js';
import { upsertProfile, loadFavorites, loadHistory, loadPreferences, savePreferences } from './db.js';
import { initYouTubePlayer, playVideo, pause, resume, seekTo, setVolume, getCurrentTime, getDuration, isPlaying } from './player.js';
import { searchAll, searchTracks, searchArtists, searchPlaylists } from './youtube-api.js';
import { extractColors } from './color-extractor.js';
import {
  getFavorites, getSavedAlbums, getHistory,
  addToHistory, toggleFavorite, isFavorite, toggleSavedAlbum,
  setLibraryUser, hydrateFromCloud, clearUserData,
} from './library.js';
import {
  showView, showPage, setGreeting, updateMiniPlayer,
  updateMiniProgress, updateNowPlaying, updateNowPlayingProgress,
  updateNowPlayingBg, renderAlbumCard, renderTrackItem,
  renderSkeletonCards, showToast, showApiBanner,
  openSettingsModal, closeSettingsModal, formatTime, Icons
} from './ui.js';

// ── Global State ─────────────────────────────────────────────
const state = {
  currentTrack: null,
  queue: [],
  queueIndex: -1,
  isPlaying: false,
  shuffle: false,
  repeat: false,       // false | 'one' | 'all'
  volume: 85,
  searchResults: null,
  activeTab: 'top',
  hasApiKey: false,
};

// ── Curated Browse Categories (shown before search) ──────────
const BROWSE_CATEGORIES = [
  { label: 'Electronic', gradient: 'linear-gradient(135deg,#1a1a2e,#16213e,#0f3460)', query: 'electronic music' },
  { label: 'Ambient', gradient: 'linear-gradient(135deg,#0d1117,#1a2a3a,#0a2a3a)', query: 'ambient music' },
  { label: 'Hip-Hop', gradient: 'linear-gradient(135deg,#1a0a0a,#2a1a0a,#3a1a0a)', query: 'hip hop beats' },
  { label: 'Jazz', gradient: 'linear-gradient(135deg,#0a1a0a,#0a2a1a,#1a3a1a)', query: 'jazz music' },
  { label: 'Classical', gradient: 'linear-gradient(135deg,#1a1a0a,#2a2a0a,#1a2a0a)', query: 'classical music' },
  { label: 'Lo-Fi', gradient: 'linear-gradient(135deg,#0a0a1a,#1a0a2a,#2a0a2a)', query: 'lo-fi hip hop' },
  { label: 'Rock', gradient: 'linear-gradient(135deg,#1a0a0a,#2a0a0a,#3a0a0a)', query: 'rock music' },
  { label: 'Pop', gradient: 'linear-gradient(135deg,#0a0a2a,#1a0a3a,#2a0a3a)', query: 'pop hits' },
];

// ── Init ─────────────────────────────────────────────────────
async function init() {
  // Fetch secrets from /api/config (Vercel env vars) — must be first
  await loadConfig();

  // Load YouTube API key from config.js (gitignored, sourced from .env)
  if (!localStorage.getItem('aura_yt_api_key') && CONFIG.YT_API_KEY) {
    localStorage.setItem('aura_yt_api_key', CONFIG.YT_API_KEY);
  }

  state.hasApiKey = !!localStorage.getItem('aura_yt_api_key');
  showApiBanner(!state.hasApiKey);

  // Wire all UI events
  wireNavigation();
  wireSearch();
  wireMiniPlayer();
  wireNowPlaying();
  wireSettings();
  wireLanding();

  // ── Firebase Auth state observer ────────────────────────
  onAuthStateChange(async (user) => {
    if (user) {
      // ── Signed in ──────────────────────────────────────
      state.currentUser = user;
      sessionStorage.setItem('aura_guest', '0');

      // Tell library module who's logged in
      setLibraryUser(user.uid);

      // Upsert profile in Firestore (non-blocking)
      upsertProfile(user.uid, user);

      // Hydrate localStorage from Firestore
      const [cloudFavs, cloudHistory] = await Promise.all([
        loadFavorites(user.uid),
        loadHistory(user.uid),
      ]);
      hydrateFromCloud(cloudFavs, cloudHistory);

      // Load saved preferences
      const cloudPrefs = await loadPreferences(user.uid);
      if (cloudPrefs) applyPreferences(cloudPrefs);

      // Update topbar avatar
      updateTopbarUser(user);

      // Launch main app
      showView('main');
      showPage('home');
      renderHomePage(user);
    } else {
      // ── Signed out / Guest ──────────────────────────────
      state.currentUser = null;
      setLibraryUser(null);
      updateTopbarUser(null);

      const isGuest = sessionStorage.getItem('aura_guest') === '1';
      if (isGuest) {
        launchMain();
      } else {
        showView('landing');
      }
    }
  });

  // Init YouTube player (non-blocking)
  try {
    await initYouTubePlayer();
    wirePlayerEvents();
    setVolume(state.volume);
  } catch (e) {
    console.warn('YouTube player init failed:', e);
  }
}

// ── Landing ──────────────────────────────────────────────────
function wireLanding() {
  const guestBtn  = document.getElementById('btn-guest');
  const googleBtn = document.getElementById('btn-google');

  guestBtn?.addEventListener('click', () => {
    sessionStorage.setItem('aura_guest', '1');
    clearUserData();
    launchMain();
  });

  googleBtn?.addEventListener('click', async () => {
    try {
      googleBtn.disabled = true;
      googleBtn.innerHTML = `<span class="btn-spinner"></span> Signing in…`;
      await signInWithGoogle();
      // onAuthStateChange will handle the transition
    } catch (e) {
      googleBtn.disabled = false;
      googleBtn.innerHTML = `<svg class="google-icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg> Sign in with Google`;
      const msg = e.message?.includes('not configured')
        ? 'Firebase not set up yet. Continue as Guest instead.'
        : 'Sign-in cancelled or failed.';
      showToast(msg);
    }
  });
}

function launchMain(user = null) {
  showView('main');
  showPage('home');
  renderHomePage(user);
}

// ── Auth helpers ───────────────────────────────────────────────

function updateTopbarUser(user) {
  const avatar = document.getElementById('topbar-avatar');
  const dropdown = document.getElementById('profile-dropdown');
  if (!avatar) return;

  if (user) {
    avatar.innerHTML = user.photoURL
      ? `<img src="${user.photoURL}" alt="${user.displayName}" referrerpolicy="no-referrer">`
      : `<span class="avatar-initials">${user.firstName?.[0] || '?'}</span>`;
    avatar.classList.add('signed-in');

    if (dropdown) {
      dropdown.querySelector('.pd-name').textContent  = user.displayName;
      dropdown.querySelector('.pd-email').textContent = user.email;
    }
  } else {
    avatar.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`;
    avatar.classList.remove('signed-in');
  }
}

function applyPreferences(prefs) {
  if (prefs.volume !== undefined) {
    state.volume = prefs.volume;
    setVolume(state.volume);
  }
  if (prefs.autoplay !== undefined) {
    const el = document.getElementById('setting-autoplay');
    if (el) el.checked = prefs.autoplay;
  }
  if (prefs.crossfade !== undefined) {
    const el = document.getElementById('setting-crossfade');
    if (el) el.checked = prefs.crossfade;
  }
}

// ── Navigation ───────────────────────────────────────────────
function wireNavigation() {
  document.querySelectorAll('.nav-item').forEach(btn => {
    btn.addEventListener('click', () => {
      const page = btn.dataset.page;
      showPage(page);
      if (page === 'home') renderHomePage();
      if (page === 'library') renderLibraryPage();
      if (page === 'search') {
        const searchInput = document.getElementById('topbar-search-input');
        if (searchInput) searchInput.focus();
        renderSearchEmpty();
      }
    });
  });

  document.getElementById('view-all-recent')?.addEventListener('click', () => {
    showPage('library');
    renderLibraryPage();
  });
}

// ── HOME PAGE ────────────────────────────────────────────────
function renderHomePage(user = null) {
  // Personalized greeting
  setGreeting(user?.firstName || null);
  renderRecentlyPlayed();
  renderRecommended();
}

function renderRecentlyPlayed() {
  const grid = document.getElementById('recently-played-grid');
  if (!grid) return;

  const history = getHistory();
  if (history.length === 0) {
    grid.innerHTML = '<p style="color:var(--on-surface-dim);font-size:var(--fs-body-sm)">Nothing played yet. Search for music to get started.</p>';
    return;
  }

  grid.innerHTML = '';
  history.slice(0, 4).forEach(track => {
    const card = renderAlbumCard(track);
    card.addEventListener('click', () => playTrack(track));
    grid.appendChild(card);
  });
}

const DEMO_RECOMMENDED = [
  { id: 'pl1', title: 'Deep Focus Sessions', artist: 'Various Artists', thumbnail: 'https://i.ytimg.com/vi/jfKfPfyJRdk/hqdefault.jpg', type: 'playlist', query: 'lo-fi hip hop focus study', badge: 'Curated Playlist' },
  { id: 'pl2', title: 'Midnight Frequencies', artist: 'Electronic Collective', thumbnail: 'https://i.ytimg.com/vi/5qap5aO4i9A/hqdefault.jpg', type: 'playlist', query: 'ambient electronic music', badge: 'Featured' },
];

function renderRecommended() {
  const grid = document.getElementById('recommended-grid');
  if (!grid) return;
  grid.innerHTML = '';

  DEMO_RECOMMENDED.forEach(item => {
    const card = renderAlbumCard(item, { large: true, badge: item.badge });
    card.addEventListener('click', () => {
      // Play first result from the playlist query
      searchAndPlay(item.query);
    });
    grid.appendChild(card);
  });
}

async function searchAndPlay(query) {
  if (!state.hasApiKey) { openSettingsModal(); return; }
  try {
    const tracks = await searchTracks(query, 10);
    if (tracks.length) {
      state.queue = tracks;
      state.queueIndex = 0;
      playTrack(tracks[0]);
    }
  } catch(e) { showToast('Search failed: ' + e.message); }
}

// ── SEARCH PAGE ──────────────────────────────────────────────
let searchDebounce = null;

function wireSearch() {
  const input = document.getElementById('topbar-search-input');
  if (!input) return;

  // Auto-switch to search page when user starts typing
  input.addEventListener('focus', () => {
    showPage('search');
    if (!input.value.trim()) renderSearchEmpty();
  });

  input.addEventListener('input', () => {
    showPage('search');
    clearTimeout(searchDebounce);
    const q = input.value.trim();
    if (!q) { renderSearchEmpty(); return; }
    searchDebounce = setTimeout(() => doSearch(q), 400);
  });

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      clearTimeout(searchDebounce);
      const q = input.value.trim();
      if (q) doSearch(q);
    }
    if (e.key === 'Escape') {
      input.value = '';
      input.blur();
      renderSearchEmpty();
    }
  });

  // Tab buttons
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.activeTab = btn.dataset.tab;
      if (state.searchResults) renderSearchResults(state.searchResults, state.activeTab);
    });
  });
}

function renderSearchEmpty() {
  const content = document.getElementById('search-content');
  if (!content) return;
  content.innerHTML = `
    <p style="color:var(--on-surface-dim);font-size:var(--fs-body-sm);margin-bottom:var(--space-6)">Browse by mood or genre</p>
    <div class="browse-grid" id="browse-grid"></div>
  `;
  const browseGrid = document.getElementById('browse-grid');
  BROWSE_CATEGORIES.forEach(cat => {
    const card = document.createElement('div');
    card.className = 'browse-card';
    card.style.background = cat.gradient;
    card.innerHTML = `<span class="browse-label">${cat.label}</span>`;
    card.addEventListener('click', () => {
      showPage('search');
      const input = document.getElementById('topbar-search-input');
      if (input) { input.value = cat.label; }
      doSearch(cat.query);
    });
    browseGrid.appendChild(card);
  });
}

async function doSearch(query) {
  showPage('search');
  const content = document.getElementById('search-content');
  if (!content) return;

  if (!state.hasApiKey) {
    content.innerHTML = `
      <div class="empty-state">
        ${Icons.info}
        <h3>YouTube API Key Required</h3>
        <p>Add your free API key in Settings to start searching.</p>
        <button class="btn-primary" id="open-settings-from-search" style="margin-top:var(--space-4)">Open Settings</button>
      </div>`;
    document.getElementById('open-settings-from-search')?.addEventListener('click', openSettingsModal);
    return;
  }

  content.innerHTML = '<div class="spinner"></div>';

  try {
    const results = await searchAll(query);
    state.searchResults = results;
    renderSearchResults(results, state.activeTab);
  } catch(e) {
    content.innerHTML = `<div class="empty-state">${Icons.info}<h3>Search Failed</h3><p>${e.message}</p></div>`;
  }
}

function renderSearchResults(results, tab) {
  const content = document.getElementById('search-content');
  if (!content) return;

  // Reset tabs
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));

  if (tab === 'tracks') {
    content.innerHTML = '<div class="track-list" id="search-track-list"></div>';
    const list = document.getElementById('search-track-list');
    results.tracks.forEach(track => {
      const item = renderTrackItem(track, { isPlaying: state.currentTrack?.videoId === track.videoId });
      item.addEventListener('click', (e) => {
        if (!e.target.closest('.track-fav-btn')) {
          state.queue = results.tracks;
          state.queueIndex = results.tracks.indexOf(track);
          playTrack(track);
        }
      });
      wireTrackFavBtn(item, track);
      list.appendChild(item);
    });
    return;
  }

  if (tab === 'albums') {
    content.innerHTML = '<div class="albums-mini-grid" id="search-albums-grid"></div>';
    const grid = document.getElementById('search-albums-grid');
    results.albums.forEach(album => {
      const card = renderAlbumCard(album);
      card.addEventListener('click', () => showToast(`Opening: ${album.title}`));
      grid.appendChild(card);
    });
    return;
  }

  if (tab === 'artists') {
    content.innerHTML = '<div class="artists-grid" id="search-artists-grid"></div>';
    const grid = document.getElementById('search-artists-grid');
    results.artists.forEach(a => {
      const card = document.createElement('div');
      card.className = 'artist-card';
      card.innerHTML = `
        <div class="artist-avatar"><img src="${a.thumbnail}" alt="${a.name}" loading="lazy"></div>
        <div class="artist-name">${a.name}</div>
        <div class="artist-type" style="color:var(--on-surface-dim);font-size:var(--fs-label)">Artist</div>
      `;
      grid.appendChild(card);
    });
    return;
  }

  // Top Results (default)
  content.innerHTML = '';

  // Hero section
  if (results.topResult || results.artists[0]) {
    const hero = document.createElement('div');
    hero.className = 'search-hero';

    // Top Result card
    const heroCard = document.createElement('div');
    heroCard.className = 'hero-card';
    if (results.topResult) {
      const t = results.topResult;
      heroCard.innerHTML = `
        <div class="hero-card-bg"><img src="${t.thumbnail}" alt="${t.title}"></div>
        <div class="hero-card-content">
          <span class="hero-badge">Top Result</span>
          <div class="hero-title">${t.title}</div>
          <div class="hero-meta">Track • ${t.artist}</div>
          <button class="hero-play" id="hero-play-btn">${Icons.play}</button>
        </div>`;
      hero.appendChild(heroCard);
      heroCard.addEventListener('click', (e) => {
        if (!e.target.closest('#hero-play-btn')) return;
        state.queue = results.tracks;
        state.queueIndex = 0;
        playTrack(t);
      });
      heroCard.style.cursor = 'pointer';
      heroCard.addEventListener('click', () => { state.queue = results.tracks; state.queueIndex = 0; playTrack(t); });
    }

    // Artist card
    if (results.artists[0]) {
      const a = results.artists[0];
      const artistCard = document.createElement('div');
      artistCard.className = 'artist-card';
      artistCard.innerHTML = `
        <div class="artist-avatar"><img src="${a.thumbnail}" alt="${a.name}"></div>
        <div class="artist-name">${a.name}</div>
        <div class="artist-type">Artist</div>`;
      hero.appendChild(artistCard);
    }

    content.appendChild(hero);
  }

  // Tracks + Albums 2-column
  const grid = document.createElement('div');
  grid.className = 'search-results-grid';

  // Tracks
  const tracksSection = document.createElement('div');
  tracksSection.innerHTML = `<div class="section-header"><span class="section-title">Tracks</span><span class="section-link" id="see-all-tracks">SEE ALL</span></div>`;
  const trackList = document.createElement('div');
  trackList.className = 'track-list';
  results.tracks.slice(0, 4).forEach(track => {
    const item = renderTrackItem(track, { isPlaying: state.currentTrack?.videoId === track.videoId });
    item.addEventListener('click', (e) => {
      if (!e.target.closest('.track-fav-btn')) {
        state.queue = results.tracks;
        state.queueIndex = results.tracks.indexOf(track);
        playTrack(track);
      }
    });
    wireTrackFavBtn(item, track);
    trackList.appendChild(item);
  });
  tracksSection.appendChild(trackList);
  tracksSection.querySelector('#see-all-tracks')?.addEventListener('click', () => {
    document.querySelector('.tab-btn[data-tab="tracks"]')?.click();
  });
  grid.appendChild(tracksSection);

  // Albums
  const albumsSection = document.createElement('div');
  albumsSection.innerHTML = `<div class="section-header"><span class="section-title">Albums</span><span class="section-link" id="see-all-albums">SEE ALL</span></div>`;
  const albumsGrid = document.createElement('div');
  albumsGrid.className = 'albums-mini-grid';
  results.albums.slice(0, 4).forEach(album => {
    const card = renderAlbumCard(album);
    albumsGrid.appendChild(card);
  });
  albumsSection.appendChild(albumsGrid);
  albumsSection.querySelector('#see-all-albums')?.addEventListener('click', () => {
    document.querySelector('.tab-btn[data-tab="albums"]')?.click();
  });
  grid.appendChild(albumsSection);

  content.appendChild(grid);
}

// ── LIBRARY PAGE ─────────────────────────────────────────────
function renderLibraryPage() {
  renderFavorites();
  renderSavedAlbums();
}

function renderFavorites() {
  const container = document.getElementById('favorites-list');
  if (!container) return;
  container.innerHTML = '';

  const favs = getFavorites();
  if (!favs.length) {
    container.innerHTML = `<div class="empty-state">${Icons.heart}<h3>No favorites yet</h3><p>Heart any track while listening to save it here.</p></div>`;
    return;
  }

  favs.forEach(track => {
    const item = renderTrackItem(track);
    item.addEventListener('click', (e) => {
      if (!e.target.closest('.track-fav-btn')) {
        state.queue = favs;
        state.queueIndex = favs.indexOf(track);
        playTrack(track);
      }
    });
    wireTrackFavBtn(item, track);
    container.appendChild(item);
    container.appendChild(Object.assign(document.createElement('hr'), { className: 'divider' }));
  });
}

function renderSavedAlbums() {
  const grid = document.getElementById('saved-albums-grid');
  if (!grid) return;
  const albums = getSavedAlbums();
  if (!albums.length) {
    grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1">${Icons.library}<h3>No saved albums</h3><p>Save albums while browsing to find them here.</p></div>`;
    return;
  }
  grid.innerHTML = '';
  albums.forEach(album => {
    const card = renderAlbumCard(album);
    grid.appendChild(card);
  });
}

// ── PLAYBACK ─────────────────────────────────────────────────
async function playTrack(track) {
  state.currentTrack = track;
  state.isPlaying = true;

  // Update history
  addToHistory(track);

  // Update UIs
  updateMiniPlayer(track, true);
  updateNowPlaying(track, true);

  // Start playback
  playVideo(track.videoId);

  // Extract colors for Now Playing bg
  try {
    const colors = await extractColors(track.thumbnail);
    if (colors) updateNowPlayingBg(colors, track.thumbnail);
  } catch(e) {}

  // Update fav state in mini player
  syncMiniPlayerFav();
}

function syncMiniPlayerFav() {
  const btn = document.querySelector('#mini-player .mini-fav');
  if (!btn || !state.currentTrack) return;
  const faved = isFavorite(state.currentTrack.videoId);
  btn.classList.toggle('active', faved);
  btn.innerHTML = faved ? Icons.heart_filled : Icons.heart;
}

function syncNowPlayingFav() {
  // If we add a fav btn to NP, sync it here too
}

function skipNext() {
  if (!state.queue.length) return;
  let nextIdx;
  if (state.shuffle) {
    nextIdx = Math.floor(Math.random() * state.queue.length);
  } else {
    nextIdx = state.queueIndex + 1;
    if (nextIdx >= state.queue.length) {
      if (state.repeat === 'all') nextIdx = 0;
      else return;
    }
  }
  state.queueIndex = nextIdx;
  playTrack(state.queue[nextIdx]);
}

function skipPrev() {
  // If > 3s in, seek to 0; else go prev
  const t = getCurrentTime();
  if (t > 3) { seekTo(0); return; }
  let prevIdx = state.queueIndex - 1;
  if (prevIdx < 0) { prevIdx = state.repeat === 'all' ? state.queue.length - 1 : 0; }
  state.queueIndex = prevIdx;
  playTrack(state.queue[prevIdx]);
}

function togglePlayPause() {
  if (!state.currentTrack) return;
  if (isPlaying()) {
    pause();
    state.isPlaying = false;
    updateMiniPlayer(state.currentTrack, false);
    updateNowPlaying(state.currentTrack, false);
    document.querySelector('.mini-play-btn')?.classList.remove('playing');
    document.querySelector('.np-play-btn')?.classList.remove('playing');
  } else {
    resume();
    state.isPlaying = true;
    updateMiniPlayer(state.currentTrack, true);
    updateNowPlaying(state.currentTrack, true);
    document.querySelector('.mini-play-btn')?.classList.add('playing');
    document.querySelector('.np-play-btn')?.classList.add('playing');
  }
}

// ── Player Events ─────────────────────────────────────────────
function wirePlayerEvents() {
  window.addEventListener('aura:tick', (e) => {
    const { currentTime, duration } = e.detail;
    updateMiniProgress(currentTime, duration);
    updateNowPlayingProgress(currentTime, duration);
  });

  window.addEventListener('aura:stateChange', (e) => {
    const { state: s } = e.detail;
    const playing = s === 'playing';
    document.querySelector('.mini-play-btn')?.classList.toggle('playing', playing);
    document.querySelector('.np-play-btn')?.classList.toggle('playing', playing);
  });

  window.addEventListener('aura:ended', () => {
    if (state.repeat === 'one') {
      seekTo(0);
      resume();
    } else {
      skipNext();
    }
  });

  window.addEventListener('aura:error', (e) => {
    showToast(`Playback error: ${e.detail.message}`);
  });
}

// ── Mini Player ───────────────────────────────────────────────
function wireMiniPlayer() {
  const mp = document.getElementById('mini-player');
  if (!mp) return;

  // Open Now Playing on thumb/title click
  mp.querySelector('.mini-thumb')?.addEventListener('click', openNowPlaying);
  mp.querySelector('.mini-text')?.addEventListener('click', openNowPlaying);

  // Play/Pause
  mp.querySelector('.mini-play-btn')?.addEventListener('click', togglePlayPause);

  // Skip
  mp.querySelector('#mini-skip-next')?.addEventListener('click', skipNext);
  mp.querySelector('#mini-skip-prev')?.addEventListener('click', skipPrev);

  // Shuffle
  const shuffleBtn = mp.querySelector('#mini-shuffle');
  shuffleBtn?.addEventListener('click', () => {
    state.shuffle = !state.shuffle;
    shuffleBtn.classList.toggle('active', state.shuffle);
    showToast(state.shuffle ? 'Shuffle on' : 'Shuffle off');
  });

  // Repeat
  const repeatBtn = mp.querySelector('#mini-repeat');
  repeatBtn?.addEventListener('click', () => {
    if (!state.repeat)          state.repeat = 'all';
    else if (state.repeat === 'all') state.repeat = 'one';
    else                        state.repeat = false;
    repeatBtn.classList.toggle('active', !!state.repeat);
    showToast(state.repeat ? `Repeat ${state.repeat}` : 'Repeat off');
  });

  // Fav
  mp.querySelector('.mini-fav')?.addEventListener('click', () => {
    if (!state.currentTrack) return;
    const added = toggleFavorite(state.currentTrack);
    syncMiniPlayerFav();
    showToast(added ? 'Added to Favorites' : 'Removed from Favorites');
    if (document.getElementById('page-library')?.classList.contains('active')) renderFavorites();
  });

  // Volume
  const volSlider = mp.querySelector('.volume-slider');
  volSlider?.addEventListener('input', () => {
    state.volume = parseInt(volSlider.value);
    setVolume(state.volume);
  });

  // Progress bar seek
  const progressBar = mp.querySelector('.mini-player-progress');
  progressBar?.addEventListener('click', (e) => {
    const rect = progressBar.getBoundingClientRect();
    const pct = (e.clientX - rect.left) / rect.width;
    const dur = getDuration();
    if (dur > 0) seekTo(pct * dur);
  });
}

// ── Now Playing ───────────────────────────────────────────────
function wireNowPlaying() {
  // Open NP when mini-player track info is clicked
  const miniThumb = document.querySelector('#mini-player .mini-thumb');
  const miniText  = document.querySelector('#mini-player .mini-text');
  miniThumb?.addEventListener('click', openNowPlaying);
  miniText?.addEventListener('click', openNowPlaying);

  // Close
  document.getElementById('np-close-btn')?.addEventListener('click', () => showView('close-now-playing'));

  // Play/Pause
  document.querySelector('.np-play-btn')?.addEventListener('click', togglePlayPause);

  // Skip
  document.getElementById('np-skip-next')?.addEventListener('click', skipNext);
  document.getElementById('np-skip-prev')?.addEventListener('click', skipPrev);

  // Shuffle / Repeat
  const npShuffle = document.getElementById('np-shuffle');
  npShuffle?.addEventListener('click', () => {
    state.shuffle = !state.shuffle;
    npShuffle.classList.toggle('active', state.shuffle);
  });

  const npRepeat = document.getElementById('np-repeat');
  npRepeat?.addEventListener('click', () => {
    if (!state.repeat)          state.repeat = 'all';
    else if (state.repeat === 'all') state.repeat = 'one';
    else                        state.repeat = false;
    npRepeat.classList.toggle('active', !!state.repeat);
  });

  // Progress seek
  const npProgress = document.querySelector('.np-progress-bar');
  npProgress?.addEventListener('click', (e) => {
    const rect = npProgress.getBoundingClientRect();
    const pct = (e.clientX - rect.left) / rect.width;
    const dur = getDuration();
    if (dur > 0) seekTo(pct * dur);
  });

  // Volume
  const npVol = document.querySelector('.np-volume-slider');
  npVol?.addEventListener('input', () => {
    state.volume = parseInt(npVol.value);
    setVolume(state.volume);
    const miniVol = document.querySelector('.volume-slider');
    if (miniVol) miniVol.value = state.volume;
  });
}

function openNowPlaying() {
  if (!state.currentTrack) return;
  showView('now-playing');
  updateNowPlaying(state.currentTrack, state.isPlaying);
}

// ── Settings ──────────────────────────────────────────────────
function wireSettings() {
  document.getElementById('settings-btn')?.addEventListener('click', openSettingsModal);
  document.getElementById('api-banner-link')?.addEventListener('click', openSettingsModal);
  document.getElementById('modal-settings-close')?.addEventListener('click', closeSettingsModal);
  document.getElementById('modal-settings-cancel')?.addEventListener('click', closeSettingsModal);

  document.getElementById('modal-settings-save')?.addEventListener('click', () => {
    const quality  = document.querySelector('input[name="quality"]:checked')?.value || 'high';
    const autoplay = document.getElementById('setting-autoplay')?.checked ?? true;
    const crossfade = document.getElementById('setting-crossfade')?.checked ?? false;

    const prefs = { quality, autoplay, crossfade, volume: state.volume };
    localStorage.setItem('aura_quality',   quality);
    localStorage.setItem('aura_autoplay',  autoplay);
    localStorage.setItem('aura_crossfade', crossfade);

    // Sync to Firestore if signed in
    if (state.currentUser?.uid) {
      savePreferences(state.currentUser.uid, prefs);
    }

    closeSettingsModal();
    showToast('Settings saved.');
  });

  // Close modal on backdrop click
  document.getElementById('modal-settings')?.addEventListener('click', (e) => {
    if (e.target === document.getElementById('modal-settings')) closeSettingsModal();
  });

  // Profile dropdown: avatar click
  document.getElementById('topbar-avatar')?.addEventListener('click', (e) => {
    e.stopPropagation();
    document.getElementById('profile-dropdown')?.classList.toggle('open');
  });
  document.addEventListener('click', () => {
    document.getElementById('profile-dropdown')?.classList.remove('open');
  });

  // Sign-out button in profile dropdown
  document.getElementById('btn-sign-out')?.addEventListener('click', async () => {
    document.getElementById('profile-dropdown')?.classList.remove('open');
    clearUserData();
    await signOut();
    sessionStorage.removeItem('aura_guest');
    showToast('Signed out.');
    // onAuthStateChange will show the landing page
  });
}

// ── Track Fav Button Wiring ───────────────────────────────────
function wireTrackFavBtn(itemEl, track) {
  const btn = itemEl.querySelector('.track-fav-btn');
  if (!btn) return;
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    const added = toggleFavorite(track);
    btn.classList.toggle('active', added);
    btn.innerHTML = added ? Icons.heart_filled : Icons.heart;
    showToast(added ? 'Added to Favorites' : 'Removed from Favorites');
    syncMiniPlayerFav();
    if (document.getElementById('page-library')?.classList.contains('active')) renderFavorites();
  });
}

// ── Keyboard shortcuts ────────────────────────────────────────
document.addEventListener('keydown', (e) => {
  // Ignore when typing in inputs
  if (['INPUT','TEXTAREA'].includes(e.target.tagName)) return;

  if (e.code === 'Space') { e.preventDefault(); togglePlayPause(); }
  if (e.code === 'ArrowRight' && e.altKey) { e.preventDefault(); skipNext(); }
  if (e.code === 'ArrowLeft'  && e.altKey) { e.preventDefault(); skipPrev(); }
  if (e.code === 'Escape') {
    const np = document.getElementById('view-now-playing');
    if (np?.classList.contains('open')) showView('close-now-playing');
  }
});

// ── Boot ─────────────────────────────────────────────────────
init();
