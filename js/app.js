/* =====================================================
   MELODIX — APP.JS
   iTunes API + YouTube Data v3 API
   ===================================================== */

'use strict';

/* ─────────────────────────────────────────
   CONFIG
───────────────────────────────────────── */
const CONFIG = {
  YT_API_KEY: 'AIzaSyCFfdP2_4L77DqJfoXEMuCgGJvAWzB8Rek',
  ITUNES_BASE: 'https://itunes.apple.com/search',
  GENRE_QUERIES: {
    pop:       'pop hits 2024',
    hiphop:    'hip hop rap 2024',
    electronic:'electronic dance music',
    rock:      'rock hits 2024',
    jazz:      'jazz music',
    classical: 'classical music beethoven'
  },
  FEATURED_QUERY: 'top hits 2024',
  DEFAULT_LIMIT: 20,
};

/* ─────────────────────────────────────────
   STATE
───────────────────────────────────────── */
const STATE = {
  currentSong:   null,
  queue:         [],
  favorites:     JSON.parse(localStorage.getItem('melodix_favs') || '[]'),
  history:       JSON.parse(localStorage.getItem('melodix_history') || '[]'),
  isPlaying:     false,
  shuffle:       false,
  repeat:        'none',
  volume:        0.8,
  isMuted:       false,
  currentGenre:  'pop',
  activeSection: 'home',
  searchTimeout: null,
  ytPlayer:      null,
  ytReady:       false,
  currentVideoId:null,
  featuredSongs: [],
  trendingSongs: [],
};

/* ─────────────────────────────────────────
   DOM REFERENCES
───────────────────────────────────────── */
const $ = id => document.getElementById(id);
const $$ = sel => document.querySelectorAll(sel);

const DOM = {
  preloader:        $('preloader'),
  sidebar:          $('sidebar'),
  menuToggle:       $('menuToggle'),
  themeToggle:      $('themeToggle'),
  themeIcon:        $('themeIcon'),
  searchInput:      $('searchInput'),
  searchSpinner:    $('searchSpinner'),
  topbarTitle:      $('topbarTitle'),
  heroBannerBg:     $('heroBannerBg'),
  heroBannerTitle:  $('heroBannerTitle'),
  heroBannerArtist: $('heroBannerArtist'),
  heroBannerArt:    $('heroBannerArt'),
  heroBannerPlay:   $('heroBannerPlay'),
  heroBannerAdd:    $('heroBannerAdd'),
  heroBannerVinyl:  $('heroBannerVinyl'),
  featuredRow:      $('featuredRow'),
  trendingGrid:     $('trendingGrid'),
  favoritesList:    $('favoritesList'),
  queueList:        $('queueList'),
  historyList:      $('historyList'),
  recentList:       $('recentList'),
  searchGrid:       $('searchGrid'),
  favEmpty:         $('favEmpty'),
  queueEmpty:       $('queueEmpty'),
  historyEmpty:     $('historyEmpty'),
  recentEmpty:      $('recentEmpty'),
  searchEmpty:      $('searchEmpty'),
  resultCount:      $('resultCount'),
  playerArt:        $('playerArt'),
  playerTitle:      $('playerTitle'),
  playerArtist:     $('playerArtist'),
  playerFavBtn:     $('playerFavBtn'),
  playerFavIcon:    $('playerFavIcon'),
  playPauseBtn:     $('playPauseBtn'),
  playIcon:         $('playIcon'),
  prevBtn:          $('prevBtn'),
  nextBtn:          $('nextBtn'),
  shuffleBtn:       $('shuffleBtn'),
  repeatBtn:        $('repeatBtn'),
  progressBar:      $('progressBar'),
  progressFill:     $('progressFill'),
  progressThumb:    $('progressThumb'),
  currentTime:      $('currentTime'),
  totalTime:        $('totalTime'),
  muteBtn:          $('muteBtn'),
  volumeIcon:       $('volumeIcon'),
  volumeSlider:     $('volumeSlider'),
  volumeFill:       $('volumeFill'),
  volumeThumb:      $('volumeThumb'),
  addQueueBtn:      $('addQueueBtn'),
  expandBtn:        $('expandBtn'),
  expandedPlayer:   $('expandedPlayer'),
  expandedBg:       $('expandedBg'),
  expandedDisc:     $('expandedDisc'),
  expandedArt:      $('expandedArt'),
  expandedTitle:    $('expandedTitle'),
  expandedArtist:   $('expandedArtist'),
  expandedAlbum:    $('expandedAlbum'),
  expandedFavBtn:   $('expandedFavBtn'),
  expandedFavIcon:  $('expandedFavIcon'),
  collapseBtn:      $('collapseBtn'),
  expPlayPauseBtn:  $('expPlayPauseBtn'),
  expPlayIcon:      $('expPlayIcon'),
  expPrevBtn:       $('expPrevBtn'),
  expNextBtn:       $('expNextBtn'),
  expShuffleBtn:    $('expShuffleBtn'),
  expRepeatBtn:     $('expRepeatBtn'),
  expProgressBar:   $('expProgressBar'),
  expProgressFill:  $('expProgressFill'),
  expCurrentTime:   $('expCurrentTime'),
  expTotalTime:     $('expTotalTime'),
  expVolumeSlider:  $('expVolumeSlider'),
  expVolumeFill:    $('expVolumeFill'),
  waveform:         $('waveform'),
  detailGenre:      $('detailGenre'),
  detailRelease:    $('detailRelease'),
  detailAlbumFull:  $('detailAlbumFull'),
  detailDuration:   $('detailDuration'),
  favBadge:         $('favBadge'),
  toastContainer:   $('toastContainer'),
};

/* ─────────────────────────────────────────
   UTILITIES
───────────────────────────────────────── */
function formatTime(ms) {
  if (!ms || isNaN(ms)) return '0:00';
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${s.toString().padStart(2,'0')}`;
}

function formatSeconds(sec) {
  if (!sec || isNaN(sec)) return '0:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2,'0')}`;
}

function isFavorite(trackId) {
  return STATE.favorites.some(f => f.trackId === trackId);
}

function saveFavorites() {
  localStorage.setItem('melodix_favs', JSON.stringify(STATE.favorites));
  DOM.favBadge.textContent = STATE.favorites.length;
}

function saveHistory() {
  STATE.history = STATE.history.slice(0, 50);
  localStorage.setItem('melodix_history', JSON.stringify(STATE.history));
}

function showToast(message, type = 'info', icon = 'info') {
  const toast = document.createElement('div');
  toast.className = `toast toast--${type}`;
  toast.innerHTML = `<i data-lucide="${icon}"></i><span>${message}</span>`;
  DOM.toastContainer.appendChild(toast);
  lucide.createIcons({ el: toast });
  setTimeout(() => {
    toast.classList.add('hiding');
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good Morning';
  if (h < 17) return 'Good Afternoon';
  return 'Good Evening';
}

/* ─────────────────────────────────────────
   ITUNES API — WITH FALLBACK
───────────────────────────────────────── */
async function fetchITunes(query, limit = CONFIG.DEFAULT_LIMIT) {
  try {
    const url = `${CONFIG.ITUNES_BASE}?term=${encodeURIComponent(query)}&media=music&limit=${limit}&entity=song`;
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);
    
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);
    
    if (!res.ok) throw new Error('iTunes fetch failed');
    const data = await res.json();
    
    if (!data.results || data.results.length === 0) {
      return getDemoSongs();
    }
    
    return data.results;
  } catch (err) {
    console.error('iTunes API Error:', err);
    return getDemoSongs();
  }
}

// Fallback Demo Songs
function getDemoSongs() {
  return [
    {
      trackId: 1001,
      trackName: "Blinding Lights",
      artistName: "The Weeknd",
      collectionName: "After Hours",
      artworkUrl100: "https://is1-ssl.mzstatic.com/image/thumb/Music125/v4/70/0f/26/700f2688-7787-6f6f-1c50-a2b3ecf85ffb/886449935251.jpg/100x100bb.jpg",
      trackTimeMillis: 200040,
      primaryGenreName: "Pop",
      releaseDate: "2020-03-20T07:00:00Z"
    },
    {
      trackId: 1002,
      trackName: "Stay",
      artistName: "The Kid LAROI & Justin Bieber",
      collectionName: "F*CK LOVE 3",
      artworkUrl100: "https://is1-ssl.mzstatic.com/image/thumb/Music125/v4/8f/1e/e4/8f1ee4b8-6f4f-8b8a-3b8a-3b8a3b8a3b8a/196589464750.jpg/100x100bb.jpg",
      trackTimeMillis: 141000,
      primaryGenreName: "Hip-Hop",
      releaseDate: "2021-07-09T07:00:00Z"
    },
    {
      trackId: 1003,
      trackName: "As It Was",
      artistName: "Harry Styles",
      collectionName: "Harry's House",
      artworkUrl100: "https://is1-ssl.mzstatic.com/image/thumb/Music116/v4/9e/60/17/9e601700-5432-1b6a-9b13-de0d1e0e5f9f/886449990061.jpg/100x100bb.jpg",
      trackTimeMillis: 167303,
      primaryGenreName: "Pop",
      releaseDate: "2022-04-01T07:00:00Z"
    },
    {
      trackId: 1004,
      trackName: "Levitating",
      artistName: "Dua Lipa",
      collectionName: "Future Nostalgia",
      artworkUrl100: "https://is1-ssl.mzstatic.com/image/thumb/Music125/v4/e3/68/8c/e3688cbf-b9c8-c057-8ecb-e0bd0d0aa2c0/190295140424.jpg/100x100bb.jpg",
      trackTimeMillis: 203000,
      primaryGenreName: "Pop",
      releaseDate: "2020-10-01T07:00:00Z"
    },
    {
      trackId: 1005,
      trackName: "Peaches",
      artistName: "Justin Bieber",
      collectionName: "Justice",
      artworkUrl100: "https://is1-ssl.mzstatic.com/image/thumb/Music124/v4/8a/aa/74/8aaa7449-e5ea-3e69-0dd0-1f0e8a5b9f9a/00602435835297.jpg/100x100bb.jpg",
      trackTimeMillis: 198000,
      primaryGenreName: "Pop",
      releaseDate: "2021-03-19T07:00:00Z"
    },
    {
      trackId: 1006,
      trackName: "INDUSTRY BABY",
      artistName: "Lil Nas X",
      collectionName: "MONTERO",
      artworkUrl100: "https://is1-ssl.mzstatic.com/image/thumb/Music116/v4/9c/13/e8/9c13e8f2-53d8-2f04-3b7b-f45b0f7a1e5f/196589091246.jpg/100x100bb.jpg",
      trackTimeMillis: 212000,
      primaryGenreName: "Hip-Hop",
      releaseDate: "2021-07-23T07:00:00Z"
    },
    {
      trackId: 1007,
      trackName: "good 4 u",
      artistName: "Olivia Rodrigo",
      collectionName: "SOUR",
      artworkUrl100: "https://is1-ssl.mzstatic.com/image/thumb/Music125/v4/5c/6d/c8/5c6dc891-8b0f-11eb-8b0d-8b0d8b0d8b0d/196589124517.jpg/100x100bb.jpg",
      trackTimeMillis: 178000,
      primaryGenreName: "Pop",
      releaseDate: "2021-05-14T07:00:00Z"
    },
    {
      trackId: 1008,
      trackName: "Watermelon Sugar",
      artistName: "Harry Styles",
      collectionName: "Fine Line",
      artworkUrl100: "https://is1-ssl.mzstatic.com/image/thumb/Music123/v4/64/8b/e0/648be0f2-fcf0-9c96-e0a1-f5ae2b6bbb87/19UMGIM56091.rgb.jpg/100x100bb.jpg",
      trackTimeMillis: 174000,
      primaryGenreName: "Pop",
      releaseDate: "2019-11-16T07:00:00Z"
    },
    {
      trackId: 1009,
      trackName: "drivers license",
      artistName: "Olivia Rodrigo",
      collectionName: "SOUR",
      artworkUrl100: "https://is1-ssl.mzstatic.com/image/thumb/Music125/v4/5c/6d/c8/5c6dc891-8b0f-11eb-8b0d-8b0d8b0d8b0d/196589124517.jpg/100x100bb.jpg",
      trackTimeMillis: 242000,
      primaryGenreName: "Pop",
      releaseDate: "2021-01-08T07:00:00Z"
    },
    {
      trackId: 1010,
      trackName: "Save Your Tears",
      artistName: "The Weeknd",
      collectionName: "After Hours",
      artworkUrl100: "https://is1-ssl.mzstatic.com/image/thumb/Music125/v4/70/0f/26/700f2688-7787-6f6f-1c50-a2b3ecf85ffb/886449935251.jpg/100x100bb.jpg",
      trackTimeMillis: 215000,
      primaryGenreName: "Pop",
      releaseDate: "2020-03-20T07:00:00Z"
    }
  ];
}

/* ─────────────────────────────────────────
   YOUTUBE SEARCH API
───────────────────────────────────────── */
async function searchYouTube(query) {
  if (!CONFIG.YT_API_KEY || CONFIG.YT_API_KEY === 'YOUR_YOUTUBE_API_KEY_HERE') {
    showToast('Add YouTube API Key for real playback', 'info', 'info');
    return getDemoVideoId(query);
  }
  try {
    const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(query)}&type=video&videoCategoryId=10&key=${CONFIG.YT_API_KEY}&maxResults=1`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('YT API Error');
    const data = await res.json();
    if (data.items && data.items.length > 0) {
      return data.items[0].id.videoId;
    }
    return null;
  } catch (err) {
    console.error('YouTube API Error:', err);
    showToast('YouTube search failed - check API key', 'error', 'alert-circle');
    return null;
  }
}

function getDemoVideoId(query) {
  return 'dQw4w9WgXcQ';
}

/* ─────────────────────────────────────────
   YOUTUBE PLAYER
───────────────────────────────────────── */
window.onYouTubeIframeAPIReady = function () {
  STATE.ytPlayer = new YT.Player('ytPlayer', {
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
    },
    events: {
      onReady: (e) => {
        STATE.ytReady = true;
        e.target.setVolume(STATE.volume * 100);
      },
      onStateChange: (e) => onYTStateChange(e),
      onError: (e) => {
        console.error('YT Player Error:', e.data);
        showToast('Video playback error', 'error', 'alert-circle');
      }
    }
  });
};

function onYTStateChange(e) {
  const s = YT.PlayerState;
  if (e.data === s.PLAYING) {
    STATE.isPlaying = true;
    updatePlayUI(true);
    startProgressUpdater();
  } else if (e.data === s.PAUSED) {
    STATE.isPlaying = false;
    updatePlayUI(false);
  } else if (e.data === s.ENDED) {
    STATE.isPlaying = false;
    updatePlayUI(false);
    handleSongEnd();
  }
}

async function playSong(song) {
  if (!song) return;

  addToHistory(song);
  STATE.currentSong = song;
  updatePlayerUI(song);

  const ytQuery = `${song.artistName} ${song.trackName} official audio`;
  const videoId = await searchYouTube(ytQuery);

  if (videoId && STATE.ytReady && STATE.ytPlayer) {
    STATE.currentVideoId = videoId;
    STATE.ytPlayer.loadVideoById(videoId);
    STATE.ytPlayer.setVolume(STATE.isMuted ? 0 : STATE.volume * 100);
  } else {
    simulatePlayback(song);
  }

  if (STATE.featuredSongs.length > 0) {
    updateHeroBanner(STATE.featuredSongs[0]);
  }

  $$('.vinyl__disc, .expanded-vinyl__disc').forEach(el => el.classList.add('spinning'));
}

let demoTimer = null;
let demoProgress = 0;
function simulatePlayback(song) {
  STATE.isPlaying = true;
  updatePlayUI(true);
  demoProgress = 0;
  const duration = (song.trackTimeMillis || 210000) / 1000;

  clearInterval(demoTimer);
  demoTimer = setInterval(() => {
    if (!STATE.isPlaying) return;
    demoProgress += 1;
    if (demoProgress >= duration) {
      clearInterval(demoTimer);
      handleSongEnd();
      return;
    }
    const pct = (demoProgress / duration) * 100;
    updateProgressBars(pct, demoProgress, duration);
  }, 1000);
}

/* ─────────────────────────────────────────
   PROGRESS UPDATER
───────────────────────────────────────── */
let progressInterval = null;
function startProgressUpdater() {
  clearInterval(progressInterval);
  progressInterval = setInterval(() => {
    if (!STATE.ytPlayer || !STATE.ytReady) return;
    try {
      const current = STATE.ytPlayer.getCurrentTime();
      const duration = STATE.ytPlayer.getDuration();
      if (!duration) return;
      const pct = (current / duration) * 100;
      updateProgressBars(pct, current, duration);
      updateWaveform(pct);
    } catch(e) {}
  }, 500);
}

function updateProgressBars(pct, current, duration) {
  if (DOM.progressFill) DOM.progressFill.style.width = `${pct}%`;
  if (DOM.currentTime) DOM.currentTime.textContent = formatSeconds(current);
  if (DOM.totalTime) DOM.totalTime.textContent = formatSeconds(duration);
  if (DOM.expProgressFill) DOM.expProgressFill.style.width = `${pct}%`;
  if (DOM.expCurrentTime) DOM.expCurrentTime.textContent = formatSeconds(current);
  if (DOM.expTotalTime) DOM.expTotalTime.textContent = formatSeconds(duration);
}

/* ─────────────────────────────────────────
   WAVEFORM
───────────────────────────────────────── */
function initWaveform() {
  if (!DOM.waveform) return;
  DOM.waveform.innerHTML = '';
  const barCount = 60;
  for (let i = 0; i < barCount; i++) {
    const bar = document.createElement('div');
    bar.className = 'waveform-bar';
    const h = 15 + Math.random() * 85;
    bar.style.height = `${h}%`;
    DOM.waveform.appendChild(bar);
  }
}

function updateWaveform(progressPct) {
  if (!DOM.waveform) return;
  const bars = DOM.waveform.querySelectorAll('.waveform-bar');
  const activeIndex = Math.floor((progressPct / 100) * bars.length);
  bars.forEach((bar, i) => {
    bar.classList.toggle('active', i <= activeIndex);
  });
}

/* ─────────────────────────────────────────
   PLAYER UI UPDATE
───────────────────────────────────────── */
function updatePlayerUI(song) {
  if (!song) return;

  const artUrl = song.artworkUrl100?.replace('100x100', '600x600') || '';
  const title = song.trackName || 'Unknown';
  const artist = song.artistName || 'Unknown Artist';
  const album = song.collectionName || '';

  DOM.playerTitle.textContent = title;
  DOM.playerArtist.textContent = artist;

  if (artUrl) {
    DOM.playerArt.src = artUrl;
    DOM.playerArt.onload = () => DOM.playerArt.classList.add('loaded');
    DOM.playerArt.classList.remove('loaded');
  }

  DOM.expandedTitle.textContent = title;
  DOM.expandedArtist.textContent = artist;
  DOM.expandedAlbum.textContent = album;
  DOM.expandedArt.src = artUrl;
  DOM.expandedBg.style.backgroundImage = `url(${artUrl})`;

  DOM.detailGenre.textContent = song.primaryGenreName || '—';
  DOM.detailRelease.textContent = song.releaseDate
    ? new Date(song.releaseDate).getFullYear()
    : '—';
  DOM.detailAlbumFull.textContent = album || '—';
  DOM.detailDuration.textContent = formatTime(song.trackTimeMillis);

  updateFavUI(song.trackId);
  DOM.heroBannerArt.style.backgroundImage = `url(${artUrl})`;
  document.title = `${title} — Melodix`;
}

function updatePlayUI(isPlaying) {
  const icon = isPlaying ? 'pause' : 'play';
  [DOM.playIcon, DOM.expPlayIcon].forEach(el => {
    if (!el) return;
    el.setAttribute('data-lucide', icon);
    lucide.createIcons({ el: el.parentElement });
  });
  $$('.vinyl__disc, .expanded-vinyl__disc').forEach(el => {
    el.classList.toggle('spinning', isPlaying);
  });
}

function updateFavUI(trackId) {
  const isFav = isFavorite(trackId);
  [DOM.playerFavBtn, DOM.expandedFavBtn].forEach(btn => {
    if (!btn) return;
    btn.classList.toggle('active', isFav);
  });
  [DOM.playerFavIcon, DOM.expandedFavIcon].forEach(icon => {
    if (!icon) return;
    icon.setAttribute('data-lucide', 'heart');
    if (icon.parentElement) {
      lucide.createIcons({ el: icon.parentElement });
    }
    icon.style.fill = isFav ? 'currentColor' : 'none';
  });
}

/* ─────────────────────────────────────────
   HERO BANNER
───────────────────────────────────────── */
function updateHeroBanner(song) {
  if (!song) return;
  const artUrl = song.artworkUrl100?.replace('100x100','600x600') || '';
  DOM.heroBannerBg.style.backgroundImage = `url(${artUrl})`;
  DOM.heroBannerTitle.textContent = song.trackName || 'Discover Music';
  DOM.heroBannerArtist.textContent = song.artistName || '';
  DOM.heroBannerArt.style.backgroundImage = `url(${artUrl})`;
}

/* ─────────────────────────────────────────
   CARD BUILDERS
───────────────────────────────────────── */
function createMusicCard(song) {
  const artUrl = song.artworkUrl100?.replace('100x100','300x300') || '';
  const isFav = isFavorite(song.trackId);

  const card = document.createElement('div');
  card.className = 'music-card';
  card.dataset.trackId = song.trackId;
  card.innerHTML = `
    <div class="music-card__art-wrap">
      <img class="music-card__art" src="${artUrl}" alt="${song.trackName}" loading="lazy"/>
      <div class="music-card__overlay">
        <button class="music-card__play-btn">
          <i data-lucide="play"></i>
        </button>
      </div>
      <button class="music-card__fav ${isFav ? 'active' : ''}">
        <i data-lucide="heart" style="fill:${isFav ? 'currentColor' : 'none'}"></i>
      </button>
      <span class="music-card__duration">${formatTime(song.trackTimeMillis)}</span>
    </div>
    <div class="music-card__info">
      <p class="music-card__title">${song.trackName || 'Unknown'}</p>
      <p class="music-card__artist">${song.artistName || 'Unknown'}</p>
    </div>
  `;

  card.querySelector('.music-card__play-btn').addEventListener('click', (e) => {
    e.stopPropagation();
    playSong(song);
    showToast(`Playing: ${song.trackName}`, 'success', 'music');
  });

  card.addEventListener('click', () => playSong(song));

  card.querySelector('.music-card__fav').addEventListener('click', (e) => {
    e.stopPropagation();
    toggleFavorite(song);
    const btn = e.currentTarget;
    const icon = btn.querySelector('[data-lucide]');
    const nowFav = isFavorite(song.trackId);
    btn.classList.toggle('active', nowFav);
    if (icon) icon.style.fill = nowFav ? 'currentColor' : 'none';
    btn.classList.add('animate-heartbeat');
    setTimeout(() => btn.classList.remove('animate-heartbeat'), 600);
  });

  lucide.createIcons({ el: card });
  return card;
}

function createListItem(song, index) {
  const artUrl = song.artworkUrl100 || '';
  const isFav = isFavorite(song.trackId);
  const isPlaying = STATE.currentSong?.trackId === song.trackId;

  const item = document.createElement('div');
  item.className = `list-item${isPlaying ? ' playing' : ''}`;
  item.dataset.trackId = song.trackId;
  item.innerHTML = `
    <div class="list-item__index">
      ${isPlaying
        ? `<div class="playing-bars"><span></span><span></span><span></span></div>`
        : `<span class="idx-num">${index + 1}</span>`
      }
    </div>
    <img class="list-item__art" src="${artUrl}" alt="${song.trackName}" loading="lazy"/>
    <div class="list-item__meta">
      <p class="list-item__title">${song.trackName || 'Unknown'}</p>
      <p class="list-item__artist">${song.artistName || 'Unknown'}</p>
    </div>
    <span class="list-item__duration">${formatTime(song.trackTimeMillis)}</span>
    <div class="list-item__actions">
      <button class="list-item__action-btn fav-btn ${isFav ? 'active' : ''}" title="Favorite">
        <i data-lucide="heart" style="fill:${isFav ? 'currentColor' : 'none'}"></i>
      </button>
      <button class="list-item__action-btn queue-btn" title="Add to Queue">
        <i data-lucide="list-plus"></i>
      </button>
      <button class="list-item__action-btn remove-btn" title="Remove">
        <i data-lucide="x"></i>
      </button>
    </div>
  `;

  item.addEventListener('click', () => playSong(song));

  item.querySelector('.fav-btn').addEventListener('click', (e) => {
    e.stopPropagation();
    toggleFavorite(song);
    renderFavorites();
    renderHistory();
    updateFavUI(song.trackId);
  });

  item.querySelector('.queue-btn').addEventListener('click', (e) => {
    e.stopPropagation();
    addToQueue(song);
  });

  item.querySelector('.remove-btn').addEventListener('click', (e) => {
    e.stopPropagation();
    item.style.animation = 'toastOut 0.3s ease forwards';
    setTimeout(() => item.remove(), 300);
  });

  lucide.createIcons({ el: item });
  return item;
}

/* ─────────────────────────────────────────
   FAVORITES
───────────────────────────────────────── */
function toggleFavorite(song) {
  const idx = STATE.favorites.findIndex(f => f.trackId === song.trackId);
  if (idx === -1) {
    STATE.favorites.unshift(song);
    showToast(`Added to Favorites`, 'success', 'heart');
  } else {
    STATE.favorites.splice(idx, 1);
    showToast(`Removed from Favorites`, 'info', 'heart');
  }
  saveFavorites();
  updateFavUI(song.trackId);
}

function renderFavorites() {
  DOM.favoritesList.innerHTML = '';
  if (STATE.favorites.length === 0) {
    DOM.favoritesList.appendChild(DOM.favEmpty);
    DOM.favEmpty.style.display = 'flex';
    return;
  }
  DOM.favEmpty.style.display = 'none';
  STATE.favorites.forEach((song, i) => {
    DOM.favoritesList.appendChild(createListItem(song, i));
  });
}

/* ─────────────────────────────────────────
   QUEUE
───────────────────────────────────────── */
function addToQueue(song) {
  STATE.queue.push(song);
  showToast(`Added to Queue: ${song.trackName}`, 'success', 'list-plus');
  renderQueue();
}

function renderQueue() {
  DOM.queueList.innerHTML = '';
  if (STATE.queue.length === 0) {
    DOM.queueList.appendChild(DOM.queueEmpty);
    DOM.queueEmpty.style.display = 'flex';
    return;
  }
  DOM.queueEmpty.style.display = 'none';
  STATE.queue.forEach((song, i) => {
    DOM.queueList.appendChild(createListItem(song, i));
  });
}

/* ─────────────────────────────────────────
   HISTORY
───────────────────────────────────────── */
function addToHistory(song) {
  STATE.history = STATE.history.filter(h => h.trackId !== song.trackId);
  STATE.history.unshift({ ...song, playedAt: Date.now() });
  saveHistory();
  renderHistory();
  renderRecentList();
}

function renderHistory() {
  DOM.historyList.innerHTML = '';
  if (STATE.history.length === 0) {
    DOM.historyList.appendChild(DOM.historyEmpty);
    DOM.historyEmpty.style.display = 'flex';
    return;
  }
  DOM.historyEmpty.style.display = 'none';
  STATE.history.slice(0, 30).forEach((song, i) => {
    DOM.historyList.appendChild(createListItem(song, i));
  });
}

function renderRecentList() {
  DOM.recentList.innerHTML = '';
  const recent = STATE.history.slice(0, 6);
  if (recent.length === 0) {
    DOM.recentList.appendChild(DOM.recentEmpty);
    DOM.recentEmpty.style.display = 'flex';
    return;
  }
  DOM.recentEmpty.style.display = 'none';
  recent.forEach((song, i) => {
    DOM.recentList.appendChild(createListItem(song, i));
  });
}

/* ─────────────────────────────────────────
   SONG END HANDLER
───────────────────────────────────────── */
function handleSongEnd() {
  if (STATE.repeat === 'one') {
    if (STATE.ytPlayer && STATE.ytReady) {
      STATE.ytPlayer.seekTo(0);
      STATE.ytPlayer.playVideo();
    }
    return;
  }

  if (STATE.queue.length > 0) {
    const next = STATE.queue.shift();
    renderQueue();
    playSong(next);
    return;
  }

  if (STATE.repeat === 'all' && STATE.featuredSongs.length > 0) {
    const next = STATE.featuredSongs[Math.floor(Math.random() * STATE.featuredSongs.length)];
    playSong(next);
    return;
  }

  updatePlayUI(false);
  $$('.vinyl__disc, .expanded-vinyl__disc').forEach(el => el.classList.remove('spinning'));
}

/* ─────────────────────────────────────────
   SEARCH
───────────────────────────────────────── */
async function doSearch(query) {
  if (!query.trim()) {
    switchSection('home');
    return;
  }

  switchSection('search');
  DOM.searchGrid.innerHTML = '';
  DOM.searchEmpty.style.display = 'none';
  DOM.resultCount.textContent = '';

  for (let i = 0; i < 8; i++) {
    const skel = document.createElement('div');
    skel.className = 'cards-row__skeleton';
    skel.style.height = '240px';
    DOM.searchGrid.appendChild(skel);
  }

  DOM.searchSpinner.classList.add('active');
  const results = await fetchITunes(query, 24);
  DOM.searchSpinner.classList.remove('active');

  DOM.searchGrid.innerHTML = '';

  if (results.length === 0) {
    DOM.searchEmpty.style.display = 'flex';
    return;
  }

  DOM.resultCount.textContent = `${results.length} results`;

  results.forEach(song => {
    DOM.searchGrid.appendChild(createMusicCard(song));
  });
}

/* ─────────────────────────────────────────
   SECTION SWITCHING
───────────────────────────────────────── */
function switchSection(name) {
  $$('.section').forEach(s => s.classList.remove('active'));
  $$('.sidebar__nav-item').forEach(a => a.classList.remove('active'));

  const section = $(`section-${name}`);
  if (section) section.classList.add('active');

  const navItem = document.querySelector(`[data-section="${name}"]`);
  if (navItem) navItem.classList.add('active');

  STATE.activeSection = name;

  if (name === 'favorites') renderFavorites();
  if (name === 'queue') renderQueue();
  if (name === 'history') renderHistory();
  if (name === 'trending') loadTrending();

  const titles = {
    home: `${getGreeting()} 🎵`,
    trending: 'Trending Now',
    favorites: 'Your Favorites',
    queue: 'Play Queue',
    history: 'Play History',
    search: 'Search Results',
  };
  DOM.topbarTitle.textContent = titles[name] || 'Melodix';

  if (window.innerWidth <= 900) {
    DOM.sidebar.classList.remove('open');
    document.querySelector('.sidebar-overlay')?.remove();
  }
}

/* ─────────────────────────────────────────
   LOAD CONTENT
───────────────────────────────────────── */
async function loadFeatured() {
  DOM.featuredRow.innerHTML = `
    <div class="cards-row__skeleton"></div>
    <div class="cards-row__skeleton"></div>
    <div class="cards-row__skeleton"></div>
    <div class="cards-row__skeleton"></div>
  `;

  const songs = await fetchITunes(CONFIG.FEATURED_QUERY, 10);
  STATE.featuredSongs = songs;

  DOM.featuredRow.innerHTML = '';
  songs.forEach(song => {
    DOM.featuredRow.appendChild(createMusicCard(song));
  });

  if (songs.length > 0) {
    updateHeroBanner(songs[0]);
  }
}

async function loadTrending() {
  if (STATE.trendingSongs.length > 0) {
    renderTrendingGrid(STATE.trendingSongs);
    return;
  }
  DOM.trendingGrid.innerHTML = `
    <div class="cards-row__skeleton" style="height:240px"></div>
    <div class="cards-row__skeleton" style="height:240px"></div>
    <div class="cards-row__skeleton" style="height:240px"></div>
    <div class="cards-row__skeleton" style="height:240px"></div>
    <div class="cards-row__skeleton" style="height:240px"></div>
    <div class="cards-row__skeleton" style="height:240px"></div>
  `;
  const songs = await fetchITunes('trending songs 2024', 18);
  STATE.trendingSongs = songs;
  renderTrendingGrid(songs);
}

function renderTrendingGrid(songs) {
  DOM.trendingGrid.innerHTML = '';
  songs.forEach(song => {
    DOM.trendingGrid.appendChild(createMusicCard(song));
  });
}

async function loadGenre(genre) {
  const query = CONFIG.GENRE_QUERIES[genre] || genre;
  DOM.trendingGrid.innerHTML = '';
  for (let i = 0; i < 6; i++) {
    const skel = document.createElement('div');
    skel.className = 'cards-row__skeleton';
    skel.style.height = '240px';
    DOM.trendingGrid.appendChild(skel);
  }
  const songs = await fetchITunes(query, 18);
  STATE.trendingSongs = songs;
  renderTrendingGrid(songs);

  if (STATE.activeSection !== 'trending') {
    switchSection('trending');
  }
}

/* ─────────────────────────────────────────
   CONTROLS
───────────────────────────────────────── */
function togglePlayPause() {
  if (!STATE.currentSong) {
    showToast('Select a song first!', 'info', 'music');
    return;
  }

  if (STATE.ytReady && STATE.ytPlayer) {
    if (STATE.isPlaying) {
      STATE.ytPlayer.pauseVideo();
    } else {
      STATE.ytPlayer.playVideo();
    }
  } else {
    STATE.isPlaying = !STATE.isPlaying;
    updatePlayUI(STATE.isPlaying);
    if (!STATE.isPlaying) clearInterval(demoTimer);
    else simulatePlayback(STATE.currentSong);
  }
}

function seekTo(pct) {
  if (STATE.ytReady && STATE.ytPlayer) {
    const dur = STATE.ytPlayer.getDuration();
    STATE.ytPlayer.seekTo((pct / 100) * dur, true);
  } else {
    demoProgress = (pct / 100) * (STATE.currentSong?.trackTimeMillis / 1000 || 200);
  }
}

function setVolume(pct) {
  STATE.volume = pct / 100;
  if (STATE.ytReady && STATE.ytPlayer) {
    STATE.ytPlayer.setVolume(pct);
  }
  DOM.volumeFill.style.width = `${pct}%`;
  DOM.expVolumeFill.style.width = `${pct}%`;
  updateVolumeIcon(pct);
}

function updateVolumeIcon(vol) {
  let icon = 'volume-2';
  if (vol === 0) icon = 'volume-x';
  else if (vol < 40) icon = 'volume-1';
  DOM.volumeIcon?.setAttribute('data-lucide', icon);
  if (DOM.muteBtn) lucide.createIcons({ el: DOM.muteBtn });
}

function playPrev() {
  if (STATE.history.length > 1) {
    playSong(STATE.history[1]);
  } else {
    showToast('No previous song', 'info', 'skip-back');
  }
}

function playNext() {
  if (STATE.queue.length > 0) {
    const next = STATE.queue.shift();
    renderQueue();
    playSong(next);
  } else if (STATE.featuredSongs.length > 0) {
    let nextSong;
    if (STATE.shuffle) {
      const idx = Math.floor(Math.random() * STATE.featuredSongs.length);
      nextSong = STATE.featuredSongs[idx];
    } else {
      const currentIdx = STATE.featuredSongs.findIndex(s => s.trackId === STATE.currentSong?.trackId);
      nextSong = STATE.featuredSongs[(currentIdx + 1) % STATE.featuredSongs.length];
    }
    playSong(nextSong);
  }
}

function toggleShuffle() {
  STATE.shuffle = !STATE.shuffle;
  DOM.shuffleBtn?.classList.toggle('active', STATE.shuffle);
  DOM.expShuffleBtn?.classList.toggle('active', STATE.shuffle);
  showToast(STATE.shuffle ? 'Shuffle On' : 'Shuffle Off', 'info', 'shuffle');
}

function toggleRepeat() {
  const modes = ['none', 'all', 'one'];
  const idx = modes.indexOf(STATE.repeat);
  STATE.repeat = modes[(idx + 1) % modes.length];
  [DOM.repeatBtn, DOM.expRepeatBtn].forEach(btn => {
    if (!btn) return;
    btn.classList.toggle('active', STATE.repeat !== 'none');
    const icon = btn.querySelector('[data-lucide]');
    if (icon) {
      icon.setAttribute('data-lucide', STATE.repeat === 'one' ? 'repeat-1' : 'repeat');
      lucide.createIcons({ el: btn });
    }
  });
  showToast(`Repeat: ${STATE.repeat}`, 'info', 'repeat');
}

/* ─────────────────────────────────────────
   PROGRESS BAR INTERACTION
───────────────────────────────────────── */
function setupProgressBar(barEl, callback) {
  let dragging = false;
  const getPercent = (e) => {
    const rect = barEl.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    return Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100));
  };
  barEl.addEventListener('mousedown', (e) => { dragging = true; callback(getPercent(e)); });
  barEl.addEventListener('touchstart', (e) => { dragging = true; callback(getPercent(e)); }, { passive: true });
  document.addEventListener('mousemove', (e) => { if (dragging) callback(getPercent(e)); });
  document.addEventListener('touchmove', (e) => { if (dragging) callback(getPercent(e)); }, { passive: true });
  document.addEventListener('mouseup', () => { dragging = false; });
  document.addEventListener('touchend', () => { dragging = false; });
  barEl.addEventListener('click', (e) => callback(getPercent(e)));
}

function setupVolumeSlider(sliderEl, fillEl) {
  let dragging = false;
  const getPercent = (e) => {
    const rect = sliderEl.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    return Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100));
  };
  const update = (e) => {
    const pct = getPercent(e);
    fillEl.style.width = `${pct}%`;
    setVolume(pct);
  };
  sliderEl.addEventListener('mousedown', (e) => { dragging = true; update(e); });
  document.addEventListener('mousemove', (e) => { if (dragging) update(e); });
  document.addEventListener('mouseup', () => { dragging = false; });
  sliderEl.addEventListener('click', update);
}

/* ─────────────────────────────────────────
   KEYBOARD SHORTCUTS
───────────────────────────────────────── */
document.addEventListener('keydown', (e) => {
  if (e.target.tagName === 'INPUT') return;
  switch (e.code) {
    case 'Space':
      e.preventDefault();
      togglePlayPause();
      break;
    case 'ArrowRight':
      e.preventDefault();
      if (STATE.ytReady && STATE.ytPlayer) {
        STATE.ytPlayer.seekTo(STATE.ytPlayer.getCurrentTime() + 10, true);
      }
      break;
    case 'ArrowLeft':
      e.preventDefault();
      if (STATE.ytReady && STATE.ytPlayer) {
        const t = Math.max(0, STATE.ytPlayer.getCurrentTime() - 10);
        STATE.ytPlayer.seekTo(t, true);
      }
      break;
    case 'ArrowUp':
      e.preventDefault();
      setVolume(Math.min(100, STATE.volume * 100 + 10));
      break;
    case 'ArrowDown':
      e.preventDefault();
      setVolume(Math.max(0, STATE.volume * 100 - 10));
      break;
    case 'KeyM':
      toggleMute();
      break;
    case 'KeyN':
      playNext();
      break;
    case 'KeyP':
      playPrev();
      break;
  }
});

function toggleMute() {
  STATE.isMuted = !STATE.isMuted;
  if (STATE.ytReady && STATE.ytPlayer) {
    if (STATE.isMuted) STATE.ytPlayer.mute();
    else STATE.ytPlayer.unMute();
  }
  updateVolumeIcon(STATE.isMuted ? 0 : STATE.volume * 100);
}

/* ─────────────────────────────────────────
   THEME TOGGLE
───────────────────────────────────────── */
function toggleTheme() {
  document.body.classList.toggle('light-theme');
  const isLight = document.body.classList.contains('light-theme');
  localStorage.setItem('melodix_theme', isLight ? 'light' : 'dark');
  const icon = isLight ? 'moon' : 'sun';
  DOM.themeIcon.setAttribute('data-lucide', icon);
  lucide.createIcons({ el: DOM.themeToggle });
}

function loadTheme() {
  const saved = localStorage.getItem('melodix_theme');
  if (saved === 'light') {
    document.body.classList.add('light-theme');
    DOM.themeIcon?.setAttribute('data-lucide', 'moon');
  }
}

/* ─────────────────────────────────────────
   SIDEBAR OVERLAY (mobile)
───────────────────────────────────────── */
function openSidebar() {
  DOM.sidebar.classList.add('open');
  let overlay = document.querySelector('.sidebar-overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.className = 'sidebar-overlay show';
    overlay.addEventListener('click', closeSidebar);
    document.body.appendChild(overlay);
  }
}
function closeSidebar() {
  DOM.sidebar.classList.remove('open');
  document.querySelector('.sidebar-overlay')?.remove();
}

/* ─────────────────────────────────────────
   EVENT LISTENERS
───────────────────────────────────────── */
function initEventListeners() {
  DOM.menuToggle?.addEventListener('click', () => {
    DOM.sidebar.classList.contains('open') ? closeSidebar() : openSidebar();
  });

  DOM.themeToggle?.addEventListener('click', toggleTheme);

  $$('.sidebar__nav-item').forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      const section = item.dataset.section;
      if (section) switchSection(section);
    });
  });

  $$('.section__see-all').forEach(btn => {
    btn.addEventListener('click', () => {
      const target = btn.dataset.sectionTarget;
      if (target) switchSection(target);
    });
  });

  $$('.genre-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      $$('.genre-chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      STATE.currentGenre = chip.dataset.genre;
      loadGenre(chip.dataset.genre);
    });
  });

  DOM.searchInput?.addEventListener('input', (e) => {
    clearTimeout(STATE.searchTimeout);
    const q = e.target.value.trim();
    if (!q) {
      switchSection('home');
      return;
    }
    STATE.searchTimeout = setTimeout(() => doSearch(q), 600);
  });

  DOM.heroBannerPlay?.addEventListener('click', () => {
    const song = STATE.featuredSongs[0];
    if (song) playSong(song);
  });

  DOM.heroBannerAdd?.addEventListener('click', () => {
    const song = STATE.featuredSongs[0];
    if (song) addToQueue(song);
  });

  DOM.playPauseBtn?.addEventListener('click', togglePlayPause);
  DOM.prevBtn?.addEventListener('click', playPrev);
  DOM.nextBtn?.addEventListener('click', playNext);
  DOM.shuffleBtn?.addEventListener('click', toggleShuffle);
  DOM.repeatBtn?.addEventListener('click', toggleRepeat);
  DOM.muteBtn?.addEventListener('click', toggleMute);

  DOM.expPlayPauseBtn?.addEventListener('click', togglePlayPause);
  DOM.expPrevBtn?.addEventListener('click', playPrev);
  DOM.expNextBtn?.addEventListener('click', playNext);
  DOM.expShuffleBtn?.addEventListener('click', toggleShuffle);
  DOM.expRepeatBtn?.addEventListener('click', toggleRepeat);

  DOM.expandBtn?.addEventListener('click', () => {
    DOM.expandedPlayer?.classList.add('open');
  });
  DOM.collapseBtn?.addEventListener('click', () => {
    DOM.expandedPlayer?.classList.remove('open');
  });

  DOM.playerFavBtn?.addEventListener('click', () => {
    if (STATE.currentSong) {
      toggleFavorite(STATE.currentSong);
      DOM.playerFavBtn.classList.add('animate-heartbeat');
      setTimeout(() => DOM.playerFavBtn.classList.remove('animate-heartbeat'), 600);
    }
  });

  DOM.expandedFavBtn?.addEventListener('click', () => {
    if (STATE.currentSong) {
      toggleFavorite(STATE.currentSong);
    }
  });

  DOM.addQueueBtn?.addEventListener('click', () => {
    if (STATE.currentSong) addToQueue(STATE.currentSong);
  });

  if (DOM.progressBar) {
    setupProgressBar(DOM.progressBar, (pct) => seekTo(pct));
  }
  if (DOM.expProgressBar) {
    setupProgressBar(DOM.expProgressBar, (pct) => seekTo(pct));
  }

  if (DOM.volumeSlider && DOM.volumeFill) {
    setupVolumeSlider(DOM.volumeSlider, DOM.volumeFill);
  }
  if (DOM.expVolumeSlider && DOM.expVolumeFill) {
    setupVolumeSlider(DOM.expVolumeSlider, DOM.expVolumeFill);
  }

  $('clearFavBtn')?.addEventListener('click', () => {
    STATE.favorites = [];
    saveFavorites();
    renderFavorites();
    showToast('Favorites cleared', 'info', 'trash-2');
  });

  $('clearQueueBtn')?.addEventListener('click', () => {
    STATE.queue = [];
    renderQueue();
    showToast('Queue cleared', 'info', 'x');
  });

  $('clearHistoryBtn')?.addEventListener('click', () => {
    STATE.history = [];
    saveHistory();
    renderHistory();
    renderRecentList();
    showToast('History cleared', 'info', 'trash-2');
  });

  $$('.sort-pill').forEach(pill => {
    pill.addEventListener('click', () => {
      $$('.sort-pill').forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
    });
  });

  DOM.volumeFill.style.width = `${STATE.volume * 100}%`;
  DOM.expVolumeFill.style.width = `${STATE.volume * 100}%`;
}

/* ─────────────────────────────────────────
   INIT — FIXED VERSION
───────────────────────────────────────── */
async function init() {
  console.log('🎵 Melodix Init Started');
  
  loadTheme();
  lucide.createIcons();
  initWaveform();
  DOM.topbarTitle.textContent = `${getGreeting()} 🎵`;
  DOM.favBadge.textContent = STATE.favorites.length;
  initEventListeners();

  // Preloader FIRST hide karo, chahe data load ho ya na ho
  setTimeout(() => {
    DOM.preloader?.classList.add('hidden');
    console.log('✅ Preloader hidden');
  }, 1200);

  // Phir data load karo background mein
  try {
    console.log('📡 Loading featured songs...');
    await loadFeatured();
    console.log('✅ Featured songs loaded:', STATE.featuredSongs.length);
  } catch(e) {
    console.error('❌ Featured load error:', e);
    showToast('Using demo songs', 'info', 'info');
  }

  renderHistory();
  renderRecentList();
  
  console.log('🎉 Melodix Ready!');
}

// Start when DOM ready
document.addEventListener('DOMContentLoaded', init);

// Safety timeout — agar kuch bhi atak jaye
setTimeout(() => {
  const preloader = document.getElementById('preloader');
  if (preloader && !preloader.classList.contains('hidden')) {
    preloader.classList.add('hidden');
    console.log('⚠️ Force hidden preloader (safety timeout)');
  }
}, 5000);
