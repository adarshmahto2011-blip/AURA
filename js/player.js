/**
 * Aura Music — YouTube IFrame Player Wrapper
 * Controls a hidden YouTube iframe for audio-only playback.
 * Fires custom events on window: aura:playerReady, aura:stateChange, aura:tick
 */

let player = null;
let playerReady = false;
let tickInterval = null;
let currentVideoId = null;

const TICK_MS = 500; // progress update frequency

// ── Load the YouTube IFrame API ────────────────────────────
export function initYouTubePlayer() {
  return new Promise((resolve) => {
    if (window.YT && window.YT.Player) {
      _createPlayer(resolve);
      return;
    }
    // Inject script
    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    document.head.appendChild(tag);

    window.onYouTubeIframeAPIReady = () => _createPlayer(resolve);
  });
}

function _createPlayer(resolve) {
  const container = document.getElementById('yt-player-container');
  const div = document.createElement('div');
  div.id = 'yt-player';
  container.appendChild(div);

  player = new YT.Player('yt-player', {
    height: '1',
    width: '1',
    playerVars: {
      autoplay: 0,
      controls: 0,
      disablekb: 1,
      fs: 0,
      iv_load_policy: 3,
      modestbranding: 1,
      rel: 0,
      showinfo: 0,
      origin: window.location.origin || 'http://localhost',
    },
    events: {
      onReady: () => {
        playerReady = true;
        _dispatch('aura:playerReady');
        resolve(player);
      },
      onStateChange: (e) => _onStateChange(e),
      onError: (e) => _onError(e),
    },
  });
}

function _onStateChange(e) {
  const stateNames = {
    [-1]: 'unstarted',
    [0]:  'ended',
    [1]:  'playing',
    [2]:  'paused',
    [3]:  'buffering',
    [5]:  'cued',
  };
  const state = stateNames[e.data] || 'unknown';
  _dispatch('aura:stateChange', { state, code: e.data });

  if (e.data === YT.PlayerState.PLAYING) {
    _startTick();
  } else if (e.data === YT.PlayerState.PAUSED || e.data === YT.PlayerState.ENDED) {
    _stopTick();
    if (e.data === YT.PlayerState.ENDED) {
      _dispatch('aura:ended');
    }
  }
}

function _onError(e) {
  const errorMessages = {
    2:   'Invalid video ID',
    5:   'HTML5 player error',
    100: 'Video not found or removed',
    101: 'Video cannot be played in embedded player',
    150: 'Video cannot be played in embedded player',
  };
  _dispatch('aura:error', { code: e.data, message: errorMessages[e.data] || 'Playback error' });
}

function _startTick() {
  _stopTick();
  tickInterval = setInterval(() => {
    if (!player || !playerReady) return;
    try {
      _dispatch('aura:tick', {
        currentTime: player.getCurrentTime() || 0,
        duration: player.getDuration() || 0,
      });
    } catch(e) {}
  }, TICK_MS);
}

function _stopTick() {
  if (tickInterval) { clearInterval(tickInterval); tickInterval = null; }
}

function _dispatch(name, detail = {}) {
  window.dispatchEvent(new CustomEvent(name, { detail }));
}

// ── Public API ─────────────────────────────────────────────

export function playVideo(videoId) {
  if (!playerReady || !player) return;
  currentVideoId = videoId;
  player.loadVideoById(videoId);
}

export function pause() {
  if (!playerReady || !player) return;
  player.pauseVideo();
}

export function resume() {
  if (!playerReady || !player) return;
  player.playVideo();
}

export function seekTo(seconds) {
  if (!playerReady || !player) return;
  player.seekTo(seconds, true);
}

export function setVolume(pct) {
  // pct: 0–100
  if (!playerReady || !player) return;
  player.setVolume(Math.max(0, Math.min(100, pct)));
}

export function getVolume() {
  if (!playerReady || !player) return 100;
  return player.getVolume();
}

export function getCurrentTime() {
  if (!playerReady || !player) return 0;
  try { return player.getCurrentTime() || 0; } catch { return 0; }
}

export function getDuration() {
  if (!playerReady || !player) return 0;
  try { return player.getDuration() || 0; } catch { return 0; }
}

export function getState() {
  if (!playerReady || !player) return 'unstarted';
  const states = { [-1]:'unstarted', 0:'ended', 1:'playing', 2:'paused', 3:'buffering', 5:'cued' };
  return states[player.getPlayerState()] || 'unknown';
}

export function isPlaying() {
  return getState() === 'playing';
}

export function getCurrentVideoId() { return currentVideoId; }
