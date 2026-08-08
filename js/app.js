/* =====================================================
   MELODIX — APP.JS v2.1 FIXED
   iTunes API + YouTube Data v3 API
   ===================================================== */

'use strict';

/* ─── CONFIG ─── */
const CONFIG = {
  // API Key blank rakho — Google Console se nayi restricted key lo
  YT_API_KEY: 'AIzaSyBZvVmwusqmN1b-vVbLtFfHLo83w9FIRF4',
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

/* ─── STATE ─── */
const STATE = {
  currentSong:    null,
  queue:          [],
  favorites:      JSON.parse(localStorage.getItem('melodix_favs') || '[]'),
  history:        JSON.parse(localStorage.getItem('melodix_history') || '[]'),
  playlists:      JSON.parse(localStorage.getItem('melodix_playlists') || '[]'),
  isPlaying:      false,
  shuffle:        false,
  repeat:         'none',
  volume:         0.8,
  isMuted:        false,
  activeSection:  'home',
  searchTimeout:  null,
  ytPlayer:       null,
  ytReady:        false,
  currentVideoId: null,
  featuredSongs:  [],
  trendingSongs:  [],
  songForPlaylist: null,
};

/* ─── DOM ─── */
const $ = id => document.getElementById(id);
const $$ = sel => document.querySelectorAll(sel);

const DOM = {
  preloader:          $('preloader'),
  searchToggleBtn:    $('searchToggleBtn'),
  searchBarDropdown:  $('searchBarDropdown'),
  searchInput:        $('searchInput'),
  searchCloseBtn:     $('searchCloseBtn'),
  searchSpinner:      $('searchSpinner'),
  themeToggle:        $('themeToggle'),
  themeIcon:          $('themeIcon'),

  heroBannerBg:       $('heroBannerBg'),
  heroBannerTitle:    $('heroBannerTitle'),
  heroBannerArtist:   $('heroBannerArtist'),
  heroBannerArt:      $('heroBannerArt'),
  heroBannerPlay:     $('heroBannerPlay'),
  heroBannerAdd:      $('heroBannerAdd'),

  featuredRow:        $('featuredRow'),
  trendingGrid:       $('trendingGrid'),
  favoritesList:      $('favoritesList'),
  queueList:          $('queueList'),
  historyList:        $('historyList'),
  recentList:         $('recentList'),
  searchGrid:         $('searchGrid'),
  playlistsGrid:      $('playlistsGrid'),

  favEmpty:           $('favEmpty'),
  queueEmpty:         $('queueEmpty'),
  historyEmpty:       $('historyEmpty'),
  recentEmpty:        $('recentEmpty'),
  searchEmpty:        $('searchEmpty'),
  playlistEmpty:      $('playlistEmpty'),
  resultCount:        $('resultCount'),

  // Mini Player
  miniPlayer:         $('miniPlayer'),
  miniPlayerExpand:   $('miniPlayerExpand'),
  miniPlayerArt:      $('miniPlayerArt'),
  miniPlayerTitle:    $('miniPlayerTitle'),
  miniPlayerArtist:   $('miniPlayerArtist'),
  miniProgressFill:   $('miniProgressFill'),
  miniPlayPauseBtn:   $('miniPlayPauseBtn'),
  miniPlayIcon:       $('miniPlayIcon'),
  miniNextBtn:        $('miniNextBtn'),

  // Expanded Player
  expandedPlayer:     $('expandedPlayer'),
  expandedBg:         $('expandedBg'),
  expandedDisc:       $('expandedDisc'),
  expandedArt:        $('expandedArt'),
  expandedTitle:      $('expandedTitle'),
  expandedArtist:     $('expandedArtist'),
  expandedFavBtn:     $('expandedFavBtn'),
  expandedFavIcon:    $('expandedFavIcon'),
  collapseBtn:        $('collapseBtn'),
  expandedMoreBtn:    $('expandedMoreBtn'),
  expPlayPauseBtn:    $('expPlayPauseBtn'),
  expPlayIcon:        $('expPlayIcon'),
  expPrevBtn:         $('expPrevBtn'),
  expNextBtn:         $('expNextBtn'),
  expShuffleBtn:      $('expShuffleBtn'),
  expRepeatBtn:       $('expRepeatBtn'),
  expProgressBar:     $('expProgressBar'),
  expProgressFill:    $('expProgressFill'),
  expCurrentTime:     $('expCurrentTime'),
  expTotalTime:       $('expTotalTime'),
  expVolumeSlider:    $('expVolumeSlider'),
  expVolumeFill:      $('expVolumeFill'),
  expAddQueueBtn:     $('expAddQueueBtn'),
  expAddPlaylistBtn:  $('expAddPlaylistBtn'),
  waveform:           $('waveform'),
  detailGenre:        $('detailGenre'),
  detailRelease:      $('detailRelease'),
  detailAlbumFull:    $('detailAlbumFull'),
  detailDuration:     $('detailDuration'),

  // Modals
  playlistModal:      $('playlistModal'),
  modalTitle:         $('modalTitle'),
  modalClose:         $('modalClose'),
  modalCancel:        $('modalCancel'),
  modalConfirm:       $('modalConfirm'),
  playlistNameInput:  $('playlistNameInput'),
  addToPlaylistModal: $('addToPlaylistModal'),
  addModalClose:      $('addModalClose'),
  playlistSelectList: $('playlistSelectList'),
  createNewFromAdd:   $('createNewFromAdd'),
  createPlaylistBtn:  $('createPlaylistBtn'),

  toastContainer:     $('toastContainer'),
};

/* ─────────────────────────────────────────
   UTILITIES
───────────────────────────────────────── */
function formatTime(ms) {
  if (!ms || isNaN(ms)) return '0:00';
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function formatSeconds(sec) {
  if (!sec || isNaN(sec)) return '0:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function isFavorite(trackId) {
  return STATE.favorites.some(f => f.trackId === trackId);
}

function saveFavorites() {
  localStorage.setItem('melodix_favs', JSON.stringify(STATE.favorites));
}

function saveHistory() {
  STATE.history = STATE.history.slice(0, 50);
  localStorage.setItem('melodix_history', JSON.stringify(STATE.history));
}

function savePlaylists() {
  localStorage.setItem('melodix_playlists', JSON.stringify(STATE.playlists));
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
   ITUNES API
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
    return data.results?.length ? data.results : getDemoSongs();
  } catch (err) {
    console.error('iTunes Error:', err);
    return getDemoSongs();
  }
}

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
      artworkUrl100: "https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/ba/96/6f/ba966f5a-7c7c-8b66-f54e-8c4e7a9a7c7a/196589464750.jpg/100x100bb.jpg",
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
      artworkUrl100: "https://is1-ssl.mzstatic.com/image/thumb/Music125/v4/5c/6d/c8/5c6dc891-8b0f-3c3b-8b8b-8b8b8b8b8b8b/196589124517.jpg/100x100bb.jpg",
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
      artworkUrl100: "https://is1-ssl.mzstatic.com/image/thumb/Music125/v4/5c/6d/c8/5c6dc891-8b0f-3c3b-8b8b-8b8b8b8b8b8b/196589124517.jpg/100x100bb.jpg",
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
    },
  ];
}

/* ─────────────────────────────────────────
   YOUTUBE API — ORIGINAL WORKING VERSION
───────────────────────────────────────── */
async function searchYouTube(query) {
  if (!CONFIG.YT_API_KEY || CONFIG.YT_API_KEY === '') {
    return null;
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
    return null;
  }
}

/* ─────────────────────────────────────────
   YOUTUBE PLAYER — ORIGINAL WORKING VERSION
───────────────────────────────────────── */
window.onYouTubeIframeAPIReady = function () {
  STATE.ytPlayer = new YT.Player('ytPlayer', {
    height: '1',
    width: '1',
    playerVars: {
      autoplay: 1,
      controls: 0,
      disablekb: 1,
      fs: 0,
      iv_load_policy: 3,
      modestbranding: 1,
      rel: 0,
      playsinline: 1,
      origin: window.location.origin,
    },
    events: {
      onReady: (e) => {
        STATE.ytReady = true;
        e.target.setVolume(STATE.volume * 100);
        console.log('✅ YouTube Player Ready');
      },
      onStateChange: (e) => onYTStateChange(e),
      onError: (e) => {
        console.error('YT Player Error:', e.data);
        showToast('Playback error', 'error', 'alert-circle');
        // Try simulate karo agar error aaye
        if (STATE.currentSong) simulatePlayback(STATE.currentSong);
      }
    }
  });
};

function onYTStateChange(e) {
  const s = YT.PlayerState;
  if (e.data === s.PLAYING) {
    STATE.isPlaying = true;
    updateAllPlayIcons(true);
    startProgressUpdater();
  } else if (e.data === s.PAUSED) {
    STATE.isPlaying = false;
    updateAllPlayIcons(false);
  } else if (e.data === s.ENDED) {
    STATE.isPlaying = false;
    updateAllPlayIcons(false);
    handleSongEnd();
  } else if (e.data === s.BUFFERING) {
    console.log('Buffering...');
  }
}

/* ─────────────────────────────────────────
   PLAY SONG — ORIGINAL WORKING METHOD
───────────────────────────────────────── */
async function playSong(song, autoOpenPlayer = true) {
  if (!song) return;

  addToHistory(song);
  STATE.currentSong = song;
  updateMiniPlayer(song);
  updateExpandedPlayer(song);

  // Auto open expanded player
  if (autoOpenPlayer) {
    openExpandedPlayer();
  }

  // Search YouTube
  const ytQuery = `${song.artistName} ${song.trackName} official audio`;
  const videoId = await searchYouTube(ytQuery);

  if (videoId && STATE.ytReady && STATE.ytPlayer) {
    STATE.currentVideoId = videoId;
    // Original working method
    STATE.ytPlayer.loadVideoById(videoId);
    STATE.ytPlayer.setVolume(STATE.isMuted ? 0 : STATE.volume * 100);
  } else {
    // No API key ya error — simulate
    simulatePlayback(song);
  }

  // Vinyl spin karo
  $$('.vinyl__disc, .expanded-vinyl__disc')
    .forEach(el => el.classList.add('spinning'));
}

/* ─────────────────────────────────────────
   DEMO SIMULATION (jab YT API na ho)
───────────────────────────────────────── */
let demoTimer = null;
let demoProgress = 0;

function simulatePlayback(song) {
  STATE.isPlaying = true;
  updateAllPlayIcons(true);
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
    updateProgressUI(pct, demoProgress, duration);
  }, 1000);
}

/* ─────────────────────────────────────────
   PROGRESS
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
      updateProgressUI(pct, current, duration);
    } catch (e) {}
  }, 500);
}

function updateProgressUI(pct, current, duration) {
  if (DOM.miniProgressFill)
    DOM.miniProgressFill.style.width = `${pct}%`;
  if (DOM.expProgressFill)
    DOM.expProgressFill.style.width = `${pct}%`;
  if (DOM.expCurrentTime)
    DOM.expCurrentTime.textContent = formatSeconds(current);
  if (DOM.expTotalTime)
    DOM.expTotalTime.textContent = formatSeconds(duration);
  updateWaveform(pct);
}

/* ─────────────────────────────────────────
   WAVEFORM
───────────────────────────────────────── */
function initWaveform() {
  if (!DOM.waveform) return;
  DOM.waveform.innerHTML = '';
  for (let i = 0; i < 55; i++) {
    const bar = document.createElement('div');
    bar.className = 'waveform-bar';
    bar.style.height = `${15 + Math.random() * 85}%`;
    DOM.waveform.appendChild(bar);
  }
}

function updateWaveform(pct) {
  if (!DOM.waveform) return;
  const bars = DOM.waveform.querySelectorAll('.waveform-bar');
  const activeIndex = Math.floor((pct / 100) * bars.length);
  bars.forEach((bar, i) => {
    bar.classList.toggle('active', i <= activeIndex);
  });
}

/* ─────────────────────────────────────────
   PLAYER UI UPDATES
───────────────────────────────────────── */
function updateMiniPlayer(song) {
  const artUrl = song.artworkUrl100?.replace('100x100', '300x300') || '';
  DOM.miniPlayerTitle.textContent = song.trackName || 'Unknown';
  DOM.miniPlayerArtist.textContent = song.artistName || '—';
  if (artUrl) {
    DOM.miniPlayerArt.src = artUrl;
    DOM.miniPlayerArt.onload = () => DOM.miniPlayerArt.classList.add('loaded');
    DOM.miniPlayerArt.classList.remove('loaded');
  }
}

function updateExpandedPlayer(song) {
  const artUrl = song.artworkUrl100?.replace('100x100', '600x600') || '';
  DOM.expandedTitle.textContent = song.trackName || 'Unknown';
  DOM.expandedArtist.textContent = song.artistName || '—';
  DOM.expandedArt.src = artUrl;
  DOM.expandedBg.style.backgroundImage = `url(${artUrl})`;
  DOM.detailGenre.textContent = song.primaryGenreName || '—';
  DOM.detailRelease.textContent = song.releaseDate
    ? new Date(song.releaseDate).getFullYear() : '—';
  DOM.detailAlbumFull.textContent = song.collectionName || '—';
  DOM.detailDuration.textContent = formatTime(song.trackTimeMillis);
  updateFavUI(song.trackId);
  document.title = `${song.trackName} — Melodix`;

  // Hero banner bhi update karo
  const bg = `url(${artUrl})`;
  DOM.heroBannerBg.style.backgroundImage = bg;
  DOM.heroBannerArt.style.backgroundImage = bg;
}

function updateAllPlayIcons(isPlaying) {
  const icon = isPlaying ? 'pause' : 'play';
  STATE.isPlaying = isPlaying;

  // Mini player icon
  if (DOM.miniPlayIcon) {
    DOM.miniPlayIcon.setAttribute('data-lucide', icon);
    lucide.createIcons({ el: DOM.miniPlayPauseBtn });
    // White color fix for mini play btn
    const svg = DOM.miniPlayPauseBtn.querySelector('svg');
    if (svg) {
      svg.style.stroke = '#000000';
      svg.style.fill = isPlaying ? '#000000' : 'none';
    }
  }

  // Expanded player icon
  if (DOM.expPlayIcon) {
    DOM.expPlayIcon.setAttribute('data-lucide', icon);
    lucide.createIcons({ el: DOM.expPlayPauseBtn });
    const svg = DOM.expPlayPauseBtn.querySelector('svg');
    if (svg) {
      svg.style.stroke = '#000000';
      svg.style.fill = isPlaying ? '#000000' : 'none';
    }
  }

  // Vinyl spin
  $$('.vinyl__disc, .expanded-vinyl__disc').forEach(el => {
    el.classList.toggle('spinning', isPlaying);
  });
}

function updateFavUI(trackId) {
  const fav = isFavorite(trackId);
  if (DOM.expandedFavBtn) {
    DOM.expandedFavBtn.classList.toggle('active', fav);
  }
  if (DOM.expandedFavIcon) {
    DOM.expandedFavIcon.setAttribute('data-lucide', 'heart');
    lucide.createIcons({ el: DOM.expandedFavBtn });
    DOM.expandedFavIcon.style.fill = fav ? 'currentColor' : 'none';
  }
}

/* ─────────────────────────────────────────
   EXPANDED PLAYER OPEN / CLOSE
───────────────────────────────────────── */
function openExpandedPlayer() {
  DOM.expandedPlayer.classList.add('open');
  // Vinyl update
  if (STATE.isPlaying) {
    $$('.expanded-vinyl__disc').forEach(el => el.classList.add('spinning'));
  }
}

function closeExpandedPlayer() {
  DOM.expandedPlayer.classList.remove('open');
}

/* ─────────────────────────────────────────
   PLAYBACK CONTROLS
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
    // Demo mode toggle
    STATE.isPlaying = !STATE.isPlaying;
    updateAllPlayIcons(STATE.isPlaying);
    if (!STATE.isPlaying) {
      clearInterval(demoTimer);
    } else {
      simulatePlayback(STATE.currentSong);
    }
  }
}

function seekTo(pct) {
  if (STATE.ytReady && STATE.ytPlayer) {
    const dur = STATE.ytPlayer.getDuration();
    STATE.ytPlayer.seekTo((pct / 100) * dur, true);
  } else {
    demoProgress = (pct / 100) * ((STATE.currentSong?.trackTimeMillis || 210000) / 1000);
  }
}

function setVolume(pct) {
  STATE.volume = pct / 100;
  if (STATE.ytReady && STATE.ytPlayer) {
    STATE.ytPlayer.setVolume(pct);
  }
  if (DOM.expVolumeFill) DOM.expVolumeFill.style.width = `${pct}%`;
}

function toggleMute() {
  STATE.isMuted = !STATE.isMuted;
  if (STATE.ytReady && STATE.ytPlayer) {
    if (STATE.isMuted) STATE.ytPlayer.mute();
    else STATE.ytPlayer.unMute();
  }
}

function playPrev() {
  if (STATE.history.length > 1) {
    playSong(STATE.history[1], false);
  } else {
    showToast('No previous song', 'info', 'skip-back');
  }
}

function playNext() {
  if (STATE.queue.length > 0) {
    const next = STATE.queue.shift();
    renderQueue();
    playSong(next, false);
  } else if (STATE.featuredSongs.length > 0) {
    let nextSong;
    if (STATE.shuffle) {
      const idx = Math.floor(Math.random() * STATE.featuredSongs.length);
      nextSong = STATE.featuredSongs[idx];
    } else {
      const currentIdx = STATE.featuredSongs.findIndex(
        s => s.trackId === STATE.currentSong?.trackId
      );
      nextSong = STATE.featuredSongs[
        (currentIdx + 1) % STATE.featuredSongs.length
      ];
    }
    playSong(nextSong, false);
  }
}

function toggleShuffle() {
  STATE.shuffle = !STATE.shuffle;
  DOM.expShuffleBtn?.classList.toggle('active', STATE.shuffle);
  showToast(STATE.shuffle ? 'Shuffle On' : 'Shuffle Off', 'info', 'shuffle');
}

function toggleRepeat() {
  const modes = ['none', 'all', 'one'];
  const idx = modes.indexOf(STATE.repeat);
  STATE.repeat = modes[(idx + 1) % modes.length];
  [DOM.expRepeatBtn].forEach(btn => {
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
    playSong(next, false);
    return;
  }
  if (STATE.repeat === 'all' && STATE.featuredSongs.length > 0) {
    const next = STATE.featuredSongs[
      Math.floor(Math.random() * STATE.featuredSongs.length)
    ];
    playSong(next, false);
    return;
  }
  updateAllPlayIcons(false);
  $$('.vinyl__disc, .expanded-vinyl__disc')
    .forEach(el => el.classList.remove('spinning'));
}

/* ─────────────────────────────────────────
   FAVORITES
───────────────────────────────────────── */
function toggleFavorite(song) {
  const idx = STATE.favorites.findIndex(f => f.trackId === song.trackId);
  if (idx === -1) {
    STATE.favorites.unshift(song);
    showToast('Added to Favorites', 'success', 'heart');
  } else {
    STATE.favorites.splice(idx, 1);
    showToast('Removed from Favorites', 'info', 'heart');
  }
  saveFavorites();
  updateFavUI(song.trackId);
}

function renderFavorites() {
  DOM.favoritesList.innerHTML = '';
  if (!STATE.favorites.length) {
    DOM.favoritesList.appendChild(DOM.favEmpty);
    DOM.favEmpty.style.display = 'flex';
    return;
  }
  DOM.favEmpty.style.display = 'none';
  STATE.favorites.forEach((s, i) =>
    DOM.favoritesList.appendChild(createListItem(s, i))
  );
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
  if (!STATE.queue.length) {
    DOM.queueList.appendChild(DOM.queueEmpty);
    DOM.queueEmpty.style.display = 'flex';
    return;
  }
  DOM.queueEmpty.style.display = 'none';
  STATE.queue.forEach((s, i) =>
    DOM.queueList.appendChild(createListItem(s, i))
  );
}

/* ─────────────────────────────────────────
   HISTORY
───────────────────────────────────────── */
function addToHistory(song) {
  STATE.history = STATE.history.filter(h => h.trackId !== song.trackId);
  STATE.history.unshift({ ...song, playedAt: Date.now() });
  saveHistory();
}

function renderHistory() {
  DOM.historyList.innerHTML = '';
  if (!STATE.history.length) {
    DOM.historyList.appendChild(DOM.historyEmpty);
    DOM.historyEmpty.style.display = 'flex';
    return;
  }
  DOM.historyEmpty.style.display = 'none';
  STATE.history.slice(0, 30).forEach((s, i) =>
    DOM.historyList.appendChild(createListItem(s, i))
  );
}

function renderRecentList() {
  DOM.recentList.innerHTML = '';
  if (!STATE.history.length) {
    DOM.recentList.appendChild(DOM.recentEmpty);
    DOM.recentEmpty.style.display = 'flex';
    return;
  }
  DOM.recentEmpty.style.display = 'none';
  STATE.history.slice(0, 6).forEach((s, i) =>
    DOM.recentList.appendChild(createListItem(s, i))
  );
}

/* ─────────────────────────────────────────
   PLAYLISTS
───────────────────────────────────────── */
function createPlaylist(name) {
  if (!name.trim()) {
    showToast('Enter playlist name', 'info', 'alert-circle');
    return null;
  }
  const pl = {
    id: Date.now(),
    name: name.trim(),
    songs: [],
    createdAt: Date.now()
  };
  STATE.playlists.unshift(pl);
  savePlaylists();
  renderPlaylists();
  showToast(`Created: ${pl.name}`, 'success', 'list-music');
  return pl;
}

function deletePlaylist(id) {
  STATE.playlists = STATE.playlists.filter(p => p.id !== id);
  savePlaylists();
  renderPlaylists();
  showToast('Playlist deleted', 'info', 'trash-2');
}

function addSongToPlaylist(playlistId, song) {
  const pl = STATE.playlists.find(p => p.id === playlistId);
  if (!pl) return;
  if (pl.songs.find(s => s.trackId === song.trackId)) {
    showToast('Already in playlist', 'info', 'info');
    return;
  }
  pl.songs.unshift(song);
  savePlaylists();
  renderPlaylists();
  showToast(`Added to "${pl.name}"`, 'success', 'check');
}

function renderPlaylists() {
  DOM.playlistsGrid.innerHTML = '';
  if (!STATE.playlists.length) {
    DOM.playlistsGrid.appendChild(DOM.playlistEmpty);
    DOM.playlistEmpty.style.display = 'flex';
    return;
  }
  DOM.playlistEmpty.style.display = 'none';
  STATE.playlists.forEach((pl, i) => {
    DOM.playlistsGrid.appendChild(createPlaylistCard(pl, i));
  });
}

function createPlaylistCard(pl, index) {
  const card = document.createElement('div');
  card.className = 'playlist-card';
  card.style.animationDelay = `${index * 0.05}s`;

  const arts = pl.songs.slice(0, 4)
    .map(s => s.artworkUrl100 || '')
    .filter(Boolean);

  let artHTML = '';
  if (arts.length === 0) {
    artHTML = `
      <div class="playlist-card__art-placeholder">
        <i data-lucide="list-music"></i>
      </div>`;
  } else if (arts.length < 4) {
    artHTML = `
      <div class="playlist-card__art" style="display:flex;align-items:center;justify-content:center;">
        <img src="${arts[0]}" style="width:100%;height:150px;object-fit:cover;"/>
      </div>`;
  } else {
    artHTML = `
      <div class="playlist-card__art">
        ${arts.map(a => `<img src="${a}" alt=""/>`).join('')}
      </div>`;
  }

  card.innerHTML = `
    ${artHTML}
    <div class="playlist-card__info">
      <p class="playlist-card__name">${pl.name}</p>
      <p class="playlist-card__count">
        ${pl.songs.length} song${pl.songs.length !== 1 ? 's' : ''}
      </p>
    </div>
    <button class="playlist-card__delete" title="Delete playlist">
      <i data-lucide="trash-2"></i>
    </button>
  `;

  card.querySelector('.playlist-card__delete')
    ?.addEventListener('click', e => {
      e.stopPropagation();
      deletePlaylist(pl.id);
    });

  card.addEventListener('click', () => openPlaylistDetail(pl));
  lucide.createIcons({ el: card });
  return card;
}

function openPlaylistDetail(pl) {
  switchSection('search');
  DOM.resultCount.textContent = `${pl.songs.length} songs`;

  const titleEl = document.querySelector('#section-search .section__title');
  if (titleEl) {
    titleEl.innerHTML = `<i data-lucide="list-music"></i> ${pl.name}`;
    lucide.createIcons({ el: document.querySelector('#section-search .section__header') });
  }

  DOM.searchGrid.innerHTML = '';
  if (!pl.songs.length) {
    DOM.searchEmpty.style.display = 'flex';
    return;
  }
  DOM.searchEmpty.style.display = 'none';
  pl.songs.forEach(song => DOM.searchGrid.appendChild(createMusicCard(song)));
}

function openAddToPlaylistModal(song) {
  STATE.songForPlaylist = song;
  DOM.playlistSelectList.innerHTML = '';

  if (!STATE.playlists.length) {
    DOM.playlistSelectList.innerHTML = `
      <p style="color:var(--text-muted);font-size:0.82rem;text-align:center;padding:20px;">
        No playlists yet. Create one!
      </p>`;
  } else {
    STATE.playlists.forEach(pl => {
      const item = document.createElement('div');
      item.className = 'playlist-select-item';
      item.innerHTML = `
        <i data-lucide="list-music"></i>
        <span>${pl.name} (${pl.songs.length})</span>
      `;
      item.addEventListener('click', () => {
        addSongToPlaylist(pl.id, song);
        closeModal(DOM.addToPlaylistModal);
      });
      DOM.playlistSelectList.appendChild(item);
      lucide.createIcons({ el: item });
    });
  }
  openModal(DOM.addToPlaylistModal);
}

/* ─────────────────────────────────────────
   MODAL HELPERS
───────────────────────────────────────── */
function openModal(modal) {
  if (modal) modal.classList.add('open');
}
function closeModal(modal) {
  if (modal) modal.classList.remove('open');
}

/* ─────────────────────────────────────────
   CARD BUILDERS
───────────────────────────────────────── */
function createMusicCard(song) {
  const artUrl = song.artworkUrl100?.replace('100x100', '300x300') || '';
  const fav = isFavorite(song.trackId);

  const card = document.createElement('div');
  card.className = 'music-card';
  card.dataset.trackId = song.trackId;
  card.innerHTML = `
    <div class="music-card__art-wrap">
      <img
        class="music-card__art"
        src="${artUrl}"
        alt="${song.trackName}"
        loading="lazy"
      />
      <div class="music-card__overlay">
        <button class="music-card__play-btn">
          <i data-lucide="play"></i>
        </button>
      </div>
      <button class="music-card__fav ${fav ? 'active' : ''}">
        <i data-lucide="heart" style="fill:${fav ? 'currentColor' : 'none'}"></i>
      </button>
      <span class="music-card__duration">
        ${formatTime(song.trackTimeMillis)}
      </span>
    </div>
    <div class="music-card__info">
      <p class="music-card__title">${song.trackName || 'Unknown'}</p>
      <p class="music-card__artist">${song.artistName || 'Unknown'}</p>
    </div>
  `;

  card.querySelector('.music-card__play-btn')
    .addEventListener('click', e => {
      e.stopPropagation();
      playSong(song);
      showToast(`Playing: ${song.trackName}`, 'success', 'music');
    });

  card.addEventListener('click', () => playSong(song));

  card.querySelector('.music-card__fav')
    .addEventListener('click', e => {
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
  const fav = isFavorite(song.trackId);
  const isPlaying = STATE.currentSong?.trackId === song.trackId;

  const item = document.createElement('div');
  item.className = `list-item${isPlaying ? ' playing' : ''}`;
  item.dataset.trackId = song.trackId;
  item.innerHTML = `
    <div class="list-item__index">
      ${isPlaying
        ? `<div class="playing-bars">
             <span></span><span></span><span></span>
           </div>`
        : `<span>${index + 1}</span>`
      }
    </div>
    <img
      class="list-item__art"
      src="${artUrl}"
      alt="${song.trackName}"
      loading="lazy"
    />
    <div class="list-item__meta">
      <p class="list-item__title">${song.trackName || 'Unknown'}</p>
      <p class="list-item__artist">${song.artistName || 'Unknown'}</p>
    </div>
    <span class="list-item__duration">
      ${formatTime(song.trackTimeMillis)}
    </span>
    <div class="list-item__actions">
      <button class="list-item__action-btn fav-btn ${fav ? 'active' : ''}"
        title="Favorite">
        <i data-lucide="heart"
          style="fill:${fav ? 'currentColor' : 'none'}"></i>
      </button>
      <button class="list-item__action-btn playlist-btn"
        title="Add to Playlist">
        <i data-lucide="folder-plus"></i>
      </button>
      <button class="list-item__action-btn queue-btn"
        title="Add to Queue">
        <i data-lucide="list-plus"></i>
      </button>
    </div>
  `;

  item.addEventListener('click', () => playSong(song, false));

  item.querySelector('.fav-btn').addEventListener('click', e => {
    e.stopPropagation();
    toggleFavorite(song);
    renderFavorites();
    renderHistory();
    renderRecentList();
    updateFavUI(song.trackId);
  });

  item.querySelector('.playlist-btn').addEventListener('click', e => {
    e.stopPropagation();
    openAddToPlaylistModal(song);
  });

  item.querySelector('.queue-btn').addEventListener('click', e => {
    e.stopPropagation();
    addToQueue(song);
  });

  lucide.createIcons({ el: item });
  return item;
}

/* ─────────────────────────────────────────
   SEARCH
───────────────────────────────────────── */
function toggleSearchBar() {
  const isOpen = DOM.searchBarDropdown.classList.contains('open');
  if (isOpen) {
    DOM.searchBarDropdown.classList.remove('open');
    DOM.searchInput.value = '';
    if (STATE.activeSection === 'search') switchSection('home');
  } else {
    DOM.searchBarDropdown.classList.add('open');
    setTimeout(() => DOM.searchInput.focus(), 350);
  }
}

async function doSearch(query) {
  if (!query.trim()) { switchSection('home'); return; }

  switchSection('search');
  DOM.searchGrid.innerHTML = '';
  DOM.searchEmpty.style.display = 'none';
  DOM.resultCount.textContent = '';

  // Reset title
  const titleEl = document.querySelector('#section-search .section__title');
  if (titleEl) titleEl.textContent = 'Search Results';

  // Skeletons
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

  if (!results.length) {
    DOM.searchEmpty.style.display = 'flex';
    return;
  }

  DOM.resultCount.textContent = `${results.length} results`;
  results.forEach(song => DOM.searchGrid.appendChild(createMusicCard(song)));
}

/* ─────────────────────────────────────────
   SECTION SWITCH
───────────────────────────────────────── */
function switchSection(name) {
  $$('.section').forEach(s => s.classList.remove('active'));
  $$('.bottom-nav__item').forEach(b => b.classList.remove('active'));

  const sec = $(`section-${name}`);
  if (sec) sec.classList.add('active');

  const navBtn = document.querySelector(
    `.bottom-nav__item[data-section="${name}"]`
  );
  if (navBtn) navBtn.classList.add('active');

  STATE.activeSection = name;

  if (name === 'favorites') renderFavorites();
  if (name === 'queue')     renderQueue();
  if (name === 'history')   renderHistory();
  if (name === 'trending')  loadTrending();
  if (name === 'playlists') renderPlaylists();
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
  songs.forEach(s => DOM.featuredRow.appendChild(createMusicCard(s)));

  if (songs.length > 0) {
    const art = songs[0].artworkUrl100?.replace('100x100', '600x600') || '';
    DOM.heroBannerBg.style.backgroundImage = `url(${art})`;
    DOM.heroBannerTitle.textContent = songs[0].trackName;
    DOM.heroBannerArtist.textContent = songs[0].artistName;
    DOM.heroBannerArt.style.backgroundImage = `url(${art})`;
  }
}

async function loadTrending() {
  if (STATE.trendingSongs.length > 0) {
    renderTrendingGrid(STATE.trendingSongs);
    return;
  }
  DOM.trendingGrid.innerHTML = '';
  for (let i = 0; i < 6; i++) {
    const s = document.createElement('div');
    s.className = 'cards-row__skeleton';
    s.style.height = '240px';
    DOM.trendingGrid.appendChild(s);
  }
  const songs = await fetchITunes('trending songs 2024', 18);
  STATE.trendingSongs = songs;
  renderTrendingGrid(songs);
}

function renderTrendingGrid(songs) {
  DOM.trendingGrid.innerHTML = '';
  songs.forEach(s => DOM.trendingGrid.appendChild(createMusicCard(s)));
}

async function loadGenre(genre) {
  const query = CONFIG.GENRE_QUERIES[genre] || genre;
  DOM.trendingGrid.innerHTML = '';
  for (let i = 0; i < 6; i++) {
    const s = document.createElement('div');
    s.className = 'cards-row__skeleton';
    s.style.height = '240px';
    DOM.trendingGrid.appendChild(s);
  }
  const songs = await fetchITunes(query, 18);
  STATE.trendingSongs = songs;
  renderTrendingGrid(songs);
  if (STATE.activeSection !== 'trending') switchSection('trending');
}

/* ─────────────────────────────────────────
   PROGRESS BAR & VOLUME INTERACTION
───────────────────────────────────────── */
function setupProgressBar(barEl, callback) {
  let dragging = false;
  const getPct = e => {
    const rect = barEl.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    return Math.max(0, Math.min(100,
      ((clientX - rect.left) / rect.width) * 100
    ));
  };
  barEl.addEventListener('mousedown', e => { dragging = true; callback(getPct(e)); });
  barEl.addEventListener('touchstart', e => { dragging = true; callback(getPct(e)); }, { passive: true });
  document.addEventListener('mousemove', e => { if (dragging) callback(getPct(e)); });
  document.addEventListener('touchmove', e => { if (dragging) callback(getPct(e)); }, { passive: true });
  document.addEventListener('mouseup', () => { dragging = false; });
  document.addEventListener('touchend', () => { dragging = false; });
  barEl.addEventListener('click', e => callback(getPct(e)));
}

function setupVolumeSlider(sliderEl, fillEl) {
  let dragging = false;
  const getPct = e => {
    const rect = sliderEl.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    return Math.max(0, Math.min(100,
      ((clientX - rect.left) / rect.width) * 100
    ));
  };
  const update = e => {
    const pct = getPct(e);
    if (fillEl) fillEl.style.width = `${pct}%`;
    setVolume(pct);
  };
  sliderEl.addEventListener('mousedown', e => { dragging = true; update(e); });
  document.addEventListener('mousemove', e => { if (dragging) update(e); });
  document.addEventListener('mouseup', () => { dragging = false; });
  sliderEl.addEventListener('click', update);
}

/* ─────────────────────────────────────────
   THEME
───────────────────────────────────────── */
function toggleTheme() {
  document.body.classList.toggle('light-theme');
  const isLight = document.body.classList.contains('light-theme');
  localStorage.setItem('melodix_theme', isLight ? 'light' : 'dark');
  DOM.themeIcon.setAttribute('data-lucide', isLight ? 'moon' : 'sun');
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
   KEYBOARD SHORTCUTS
───────────────────────────────────────── */
document.addEventListener('keydown', e => {
  if (e.target.tagName === 'INPUT') return;
  switch (e.code) {
    case 'Space':
      e.preventDefault();
      togglePlayPause();
      break;
    case 'ArrowRight':
      e.preventDefault();
      if (STATE.ytReady && STATE.ytPlayer)
        STATE.ytPlayer.seekTo(STATE.ytPlayer.getCurrentTime() + 10, true);
      break;
    case 'ArrowLeft':
      e.preventDefault();
      if (STATE.ytReady && STATE.ytPlayer)
        STATE.ytPlayer.seekTo(
          Math.max(0, STATE.ytPlayer.getCurrentTime() - 10), true
        );
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
    case 'Escape':
      closeExpandedPlayer();
      break;
  }
});

/* ─────────────────────────────────────────
   EVENT LISTENERS
───────────────────────────────────────── */
function initEventListeners() {

  // Search
  DOM.searchToggleBtn?.addEventListener('click', toggleSearchBar);
  DOM.searchCloseBtn?.addEventListener('click', toggleSearchBar);
  DOM.searchInput?.addEventListener('input', e => {
    clearTimeout(STATE.searchTimeout);
    const q = e.target.value.trim();
    if (!q) { switchSection('home'); return; }
    STATE.searchTimeout = setTimeout(() => doSearch(q), 600);
  });

  // Theme
  DOM.themeToggle?.addEventListener('click', toggleTheme);

  // Bottom Nav
  $$('.bottom-nav__item').forEach(btn => {
    btn.addEventListener('click', () => {
      const sec = btn.dataset.section;
      if (sec) switchSection(sec);
    });
  });

  // See All
  $$('.section__see-all').forEach(btn => {
    btn.addEventListener('click', () => {
      const target = btn.dataset.sectionTarget;
      if (target) switchSection(target);
    });
  });

  // Genre chips
  $$('.genre-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      $$('.genre-chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      loadGenre(chip.dataset.genre);
    });
  });

  // Hero Banner
  DOM.heroBannerPlay?.addEventListener('click', () => {
    if (STATE.featuredSongs[0]) playSong(STATE.featuredSongs[0]);
  });
  DOM.heroBannerAdd?.addEventListener('click', () => {
    if (STATE.featuredSongs[0]) addToQueue(STATE.featuredSongs[0]);
  });

  // Mini Player
  DOM.miniPlayerExpand?.addEventListener('click', openExpandedPlayer);
  DOM.miniPlayPauseBtn?.addEventListener('click', e => {
    e.stopPropagation();
    togglePlayPause();
  });
  DOM.miniNextBtn?.addEventListener('click', e => {
    e.stopPropagation();
    playNext();
  });

  // Expanded Player
  DOM.collapseBtn?.addEventListener('click', closeExpandedPlayer);
  DOM.expPlayPauseBtn?.addEventListener('click', togglePlayPause);
  DOM.expPrevBtn?.addEventListener('click', playPrev);
  DOM.expNextBtn?.addEventListener('click', playNext);
  DOM.expShuffleBtn?.addEventListener('click', toggleShuffle);
  DOM.expRepeatBtn?.addEventListener('click', toggleRepeat);

  DOM.expandedFavBtn?.addEventListener('click', () => {
    if (STATE.currentSong) {
      toggleFavorite(STATE.currentSong);
      DOM.expandedFavBtn.classList.add('animate-heartbeat');
      setTimeout(() => DOM.expandedFavBtn.classList.remove('animate-heartbeat'), 600);
    }
  });

  DOM.expAddQueueBtn?.addEventListener('click', () => {
    if (STATE.currentSong) addToQueue(STATE.currentSong);
  });
  DOM.expAddPlaylistBtn?.addEventListener('click', () => {
    if (STATE.currentSong) openAddToPlaylistModal(STATE.currentSong);
  });

  // Progress bar
  if (DOM.expProgressBar) {
    setupProgressBar(DOM.expProgressBar, pct => seekTo(pct));
  }

  // Volume slider
  if (DOM.expVolumeSlider && DOM.expVolumeFill) {
    setupVolumeSlider(DOM.expVolumeSlider, DOM.expVolumeFill);
  }
  if (DOM.expVolumeFill) {
    DOM.expVolumeFill.style.width = `${STATE.volume * 100}%`;
  }

  // Playlist Modal
  DOM.createPlaylistBtn?.addEventListener('click', () => {
    DOM.modalTitle.textContent = 'Create Playlist';
    DOM.playlistNameInput.value = '';
    openModal(DOM.playlistModal);
    setTimeout(() => DOM.playlistNameInput.focus(), 350);
  });
  DOM.modalClose?.addEventListener('click', () => closeModal(DOM.playlistModal));
  DOM.modalCancel?.addEventListener('click', () => closeModal(DOM.playlistModal));
  DOM.modalConfirm?.addEventListener('click', () => {
    createPlaylist(DOM.playlistNameInput.value);
    closeModal(DOM.playlistModal);
  });
  DOM.playlistNameInput?.addEventListener('keydown', e => {
    if (e.key === 'Enter') {
      createPlaylist(DOM.playlistNameInput.value);
      closeModal(DOM.playlistModal);
    }
  });

  // Add to Playlist Modal
  DOM.addModalClose?.addEventListener('click', () =>
    closeModal(DOM.addToPlaylistModal)
  );
  DOM.createNewFromAdd?.addEventListener('click', () => {
    closeModal(DOM.addToPlaylistModal);
    DOM.modalTitle.textContent = 'Create Playlist';
    DOM.playlistNameInput.value = '';
    openModal(DOM.playlistModal);
  });
  DOM.playlistModal?.addEventListener('click', e => {
    if (e.target === DOM.playlistModal) closeModal(DOM.playlistModal);
  });
  DOM.addToPlaylistModal?.addEventListener('click', e => {
    if (e.target === DOM.addToPlaylistModal) closeModal(DOM.addToPlaylistModal);
  });

  // Clear buttons
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

  // Sort pills
  $$('.sort-pill').forEach(pill => {
    pill.addEventListener('click', () => {
      $$('.sort-pill').forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
    });
  });
}

/* ─────────────────────────────────────────
   INIT
───────────────────────────────────────── */
async function init() {
  console.log('🎵 Melodix v2.1 Starting...');

  loadTheme();
  lucide.createIcons();
  initWaveform();

  initEventListeners();

  // Preloader hide — 1.2 sec mein
  setTimeout(() => {
    DOM.preloader?.classList.add('hidden');
    console.log('✅ Preloader hidden');
  }, 1200);

  // Data load karo
  try {
    await loadFeatured();
    console.log('✅ Featured songs loaded');
  } catch (e) {
    console.error('Load error:', e);
  }

  renderHistory();
  renderRecentList();
  renderPlaylists();

  console.log('🎉 Melodix Ready!');
}

document.addEventListener('DOMContentLoaded', init);

// Safety net — 5 sec baad force hide
setTimeout(() => {
  const p = document.getElementById('preloader');
  if (p && !p.classList.contains('hidden')) {
    p.classList.add('hidden');
    console.log('⚠️ Force preloader hide');
  }
}, 5000);
