/**
 * HomeOS Main Controller
 * tvOS Launcher Homescreen:
 * 1. Top Left: Date, Time & Weather
 * 2. Top Right: User Greetings ("Good evening, Aaron")
 * 3. Bottom Center: Now Playing Bar (visible ONLY if media is playing)
 * Real handshake, live cursor & power toggle, dynamic storage
 * Responds to HomeMote: OPEN_APP (10 OTT apps), MEDIA_SEEK, PLAY_PAUSE, CURSOR_MOVE, CURSOR_CLICK, BACK, HOME, VOLUME, VOICE_SEARCH
 */

import { HomeLink } from '../../shared/homelink.js';
import { MESSAGE_TYPES } from '../../shared/protocol.js';
import { sounds } from './sound.js';

const APP_CATALOG = {
  netflix: {
    badge: 'NETFLIX',
    title: 'Netflix',
    media: 'Stranger Things',
    desc: 'When a young boy vanishes, a small town uncovers a mystery involving secret experiments and terrifying supernatural forces.',
    service: 'Netflix',
    icon: 'icons/netflix-512.png',
    url: 'https://www.netflix.com/browse'
  },
  jiohotstar: {
    badge: 'HOTSTAR',
    title: 'Hotstar',
    media: 'House of the Dragon',
    desc: 'The story of House Targaryen set 200 years before the events of Game of Thrones in Westeros.',
    service: 'Hotstar',
    icon: 'icons/jiohotstar-512.png',
    url: 'https://www.hotstar.com/in/home'
  },
  prime: {
    badge: 'PRIME',
    title: 'Prime Video',
    media: 'The Boys',
    desc: 'A fun and irreverent take on what happens when superheroes abuse their superpowers rather than use them for good.',
    service: 'Prime Video',
    icon: 'icons/prime-512.png',
    url: 'https://www.primevideo.com/region/eu/storefront'
  },
  youtube: {
    badge: 'YOUTUBE',
    title: 'YouTube',
    media: 'Apple Park Keynote',
    desc: 'Special Apple Event broadcast from Cupertino, California streaming in 4K HDR.',
    service: 'YouTube',
    icon: 'icons/youtube-512.png',
    url: 'https://www.youtube.com/'
  },
  zee5: {
    badge: 'ZEE5',
    title: 'ZEE5',
    media: 'Taj: Divided by Blood',
    desc: 'A gripping historical saga capturing the succession war for the Mughal throne.',
    service: 'ZEE5',
    icon: 'icons/zee5-512.png',
    url: 'https://www.zee5.com/?tracking_id=1a96c031-c133-4d3d-8660-340c219a3cc4&gclsrc=aw.ds&gad_source=1&gad_campaignid=22405199967&gbraid=0AAAAADEa-ArTXasfte_0c-1sbB5bCVNZH'
  },
  airtel: {
    badge: 'AIRTEL',
    title: 'Airtel Xstream',
    media: 'Live TV & Entertainment',
    desc: 'Stream live channels, blockbuster movies, and top regional series with Airtel Xstream.',
    service: 'Airtel Xstream',
    icon: 'icons/airtel-512.svg',
    url: 'https://www.airtelxstream.in/'
  },
  appletv: {
    badge: 'tv+',
    title: 'Apple TV+',
    media: 'Severance',
    desc: 'Mark leads a team of office workers whose memories have been surgically divided between their work and personal lives.',
    service: 'tv',
    icon: 'icons/apple-512.png',
    url: 'https://tv.apple.com/in'
  },
  fancode: {
    badge: 'FANCODE',
    title: 'FanCode',
    media: 'Formula 1 & Live Sports',
    desc: 'Live Formula 1 Grand Prix races, football, cricket and premium sports streaming.',
    service: 'FanCode',
    icon: 'icons/fancode-512.png',
    url: 'https://www.fancode.com/formula1/tour/f1-msc-cruises-grande-premio-de-sao-paulo-2026-19295054/schedule'
  },
  sony: {
    badge: 'SONY LIV',
    title: 'Sony LIV',
    media: 'Scam 1992',
    desc: 'The meteoric rise and catastrophic fall of stockbroker Harshad Mehta in 1990s Mumbai.',
    service: 'Sony LIV',
    icon: 'icons/sony-512.png',
    url: 'https://www.sonyliv.com/'
  },
  ytmusic: {
    badge: 'YT MUSIC',
    title: 'YouTube Music',
    media: 'Synthwave & Electronic Sessions',
    desc: 'Continuous non-stop curated electronic music playlists and live festival streams.',
    service: 'YouTube Music',
    icon: 'icons/ytmusic-512.png',
    url: 'https://music.youtube.com/'
  },
  brave: {
    badge: 'BRAVE',
    title: 'Brave Browser',
    media: 'Private Web Search',
    desc: 'Fast, secure, ad-free web browsing on tvOS with integrated Shields protection.',
    service: 'Brave',
    icon: 'icons/brave-512.png',
    url: 'https://search.brave.com/'
  }
};

class HomeOSLauncher {
  constructor() {
    this.pinCode = '103279';
    localStorage.setItem('homeos_pairing_pin', this.pinCode);

    this.pairedRemotes = new Set();
    this.isSleeping = false;
    this.currentApp = null;
    this.isMuted = false;

    // Media State
    this.mediaState = {
      isPlaying: true,
      title: 'Severance',
      service: 'tv'
    };

    // Initialize HomeLink for this TV PIN room
    this.link = new HomeLink({
      role: 'tv',
      roomId: `homeos_${this.pinCode}`
    });

    // Cursor position
    this.cursorX = window.innerWidth / 2;
    this.cursorY = window.innerHeight / 2;
    this.cursorVisible = false;

    this.init();
  }

  init() {
    console.log(`[HomeOS] Initialized with embedded PIN: ${this.pinCode}`);

    this.initElements();
    this.initClockAndWeather();
    this.initUserGreeting();
    this.initNowPlaying();
    this.setupAppModal();
    this.setupLinkEvents();
    this.registerPWA();
  }

  initElements() {
    this.cursorEl = document.getElementById('tv-cursor');
    this.dateEl = document.getElementById('header-date');
    this.timeEl = document.getElementById('header-time');
    this.weatherTempEl = document.getElementById('weather-temp');
    this.weatherCityEl = document.getElementById('weather-city');
    this.greetingEl = document.getElementById('user-greeting');
    this.nowPlayingContainer = document.getElementById('now-playing-container');
    this.nowPlayingTitle = document.getElementById('np-title');
    this.btnPlay = document.getElementById('btn-np-play');
    this.playIcon = document.getElementById('np-play-icon');

    // On-screen HUD Notification
    this.hudPill = document.getElementById('tv-hud-notification');
    this.hudIcon = document.getElementById('hud-pill-icon');
    this.hudText = document.getElementById('hud-pill-text');

    // App Overlay Elements
    this.appOverlay = document.getElementById('tv-app-overlay');
    this.appWindowIcon = document.getElementById('app-window-icon');
    this.appBadge = document.getElementById('app-window-badge');
    this.appTitle = document.getElementById('app-window-title');
    this.appMediaName = document.getElementById('app-media-name');
    this.appMediaDesc = document.getElementById('app-media-desc');
    this.btnCloseApp = document.getElementById('btn-close-app');
    this.btnAppPlay = document.getElementById('btn-app-play');
    this.appWindowUrl = document.getElementById('app-window-url');
    this.appUrlText = document.getElementById('app-url-text');
    this.btnAppPlayText = document.getElementById('btn-app-play-text');

    this.updateCursorPosition();
  }

  // =========================================================================
  // 1. TOP LEFT: Date & Time + Weather
  // =========================================================================
  initClockAndWeather() {
    this.updateDateTime();
    this.clockInterval = setInterval(() => this.updateDateTime(), 1000);
  }

  updateDateTime() {
    const now = new Date();

    if (this.dateEl) {
      this.dateEl.textContent = now.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric'
      });
    }

    if (this.timeEl) {
      this.timeEl.textContent = now.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
    }
  }

  // =========================================================================
  // 2. TOP RIGHT: User Greetings
  // =========================================================================
  initUserGreeting() {
    this.updateGreeting();
    setInterval(() => this.updateGreeting(), 30000);
  }

  getGreetingPhrase() {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return 'Good morning';
    if (hour >= 12 && hour < 17) return 'Good afternoon';
    if (hour >= 17 && hour < 22) return 'Good evening';
    return 'Good night';
  }

  getUserFirstName() {
    const storedUser = localStorage.getItem('homeos_remote_user') || 'Aaron';
    const trimmed = storedUser.trim();
    return trimmed ? trimmed.split(' ')[0] : 'Aaron';
  }

  updateGreeting() {
    if (this.greetingEl) {
      const greeting = this.getGreetingPhrase();
      const name = this.getUserFirstName();
      this.greetingEl.textContent = `${greeting}, ${name}`;
    }
  }

  // =========================================================================
  // 3. BOTTOM CENTER: Now Playing Bar (Only if media is playing)
  // =========================================================================
  initNowPlaying() {
    this.updateNowPlayingUI();

    if (this.btnPlay) {
      this.btnPlay.addEventListener('click', (e) => {
        e.stopPropagation();
        this.toggleMediaPlayState();
      });
    }

    window.addEventListener('keydown', (e) => {
      if (e.code === 'Space' || e.key === 'm' || e.key === 'M') {
        this.toggleMediaPlayState();
      }
    });
  }

  setMediaPlaying(isPlaying, title = null, service = null) {
    this.mediaState.isPlaying = Boolean(isPlaying);
    if (title) this.mediaState.title = title;
    if (service) this.mediaState.service = service;
    this.updateNowPlayingUI();
    this.broadcastMediaStatus();
  }

  toggleMediaPlayState() {
    this.mediaState.isPlaying = !this.mediaState.isPlaying;
    sounds.playSelect();
    this.updateNowPlayingUI();

    const actionText = this.mediaState.isPlaying ? 'Playing' : 'Paused';
    const actionIcon = this.mediaState.isPlaying ? '▶' : '⏸';
    this.showOnScreenHud(actionIcon, actionText);

    this.broadcastMediaStatus();
    console.log(`[HomeOS] Media state toggled: isPlaying=${this.mediaState.isPlaying}`);
  }

  updateNowPlayingUI() {
    if (!this.nowPlayingContainer) return;

    if (this.mediaState.isPlaying) {
      this.nowPlayingContainer.classList.add('is-playing');
      if (this.nowPlayingTitle) {
        this.nowPlayingTitle.textContent = this.mediaState.title;
      }
      if (this.playIcon) {
        this.playIcon.innerHTML = '<path d="M8 5v14l11-7z"/>';
      }
    } else {
      this.nowPlayingContainer.classList.remove('is-playing');
    }
  }

  broadcastMediaStatus() {
    this.link.send(MESSAGE_TYPES.MEDIA_STATUS, {
      isPlaying: this.mediaState.isPlaying,
      title: this.mediaState.title,
      service: this.mediaState.service
    });
  }

  // =========================================================================
  // On-Screen HUD Pill Notification (Seek, Play/Pause, Volume, Home, AI)
  // =========================================================================
  showOnScreenHud(icon, text) {
    if (!this.hudPill) return;
    if (this.hudIcon) this.hudIcon.textContent = icon;
    if (this.hudText) this.hudText.textContent = text;

    this.hudPill.classList.remove('hidden');
    clearTimeout(this.hudTimer);
    this.hudTimer = setTimeout(() => {
      if (this.hudPill) this.hudPill.classList.add('hidden');
    }, 1400);
  }

  handleSeek(direction, seconds = 10) {
    sounds.playSelect();
    const isFwd = direction === 'FORWARD';
    const icon = isFwd ? '⏩' : '⏪';
    const label = isFwd ? `+${seconds}s` : `-${seconds}s`;
    this.showOnScreenHud(icon, label);
  }

  // =========================================================================
  // OTT App Launch & Window Overlay
  // =========================================================================
  setupAppModal() {
    if (this.btnCloseApp) {
      this.btnCloseApp.addEventListener('click', () => {
        sounds.playBack();
        this.closeApp();
      });
    }

    if (this.btnAppPlay) {
      this.btnAppPlay.addEventListener('click', () => {
        sounds.playSelect();
        const info = APP_CATALOG[this.currentApp] || APP_CATALOG.appletv;
        this.setMediaPlaying(true, info.media, info.service);
        this.closeApp();
      });
    }
  }

  openApp(appId, title, url) {
    this.currentApp = appId || 'netflix';
    const info = APP_CATALOG[this.currentApp] || {
      badge: title || 'APP',
      title: title || 'Streaming App',
      media: 'Now Showing',
      desc: 'Enjoy top streaming originals and movies on HomeOS.',
      service: title || 'OTT',
      icon: 'icons/netflix-512.png',
      url: url || 'https://www.netflix.com/browse'
    };

    const targetUrl = url || info.url || 'https://www.netflix.com/browse';

    if (this.appWindowIcon && info.icon) this.appWindowIcon.src = info.icon;
    if (this.appBadge) this.appBadge.textContent = info.badge;
    if (this.appTitle) this.appTitle.textContent = info.title;
    if (this.appMediaName) this.appMediaName.textContent = info.media;
    if (this.appMediaDesc) this.appMediaDesc.textContent = info.desc;
    if (this.appWindowUrl) this.appWindowUrl.href = targetUrl;
    if (this.appUrlText) this.appUrlText.textContent = targetUrl;
    if (this.btnAppPlay) this.btnAppPlay.href = targetUrl;

    if (this.appOverlay) {
      this.appOverlay.classList.remove('hidden');
      sounds.playSelect();
    }

    // Auto open destination link in a new tab if allowed
    try {
      window.open(targetUrl, '_blank', 'noopener,noreferrer');
    } catch (e) {
      console.warn('[HomeOS] Auto-open window popup blocked:', e);
    }

    // Broadcast media status so Now Playing bar displays & HomeMote switches to Mediapad
    this.setMediaPlaying(true, info.media, info.service);
  }

  closeApp() {
    if (this.appOverlay) {
      this.appOverlay.classList.add('hidden');
    }
    this.currentApp = null;
  }

  // =========================================================================
  // Real-time Link & Remote Events
  // =========================================================================
  setupLinkEvents() {
    this.link.onStatusChange((status) => {
      console.log(`[HomeOS Link] Status: ${status}`);
    });

    // Pair Request
    this.link.on(MESSAGE_TYPES.PAIR_REQUEST, (payload, raw) => {
      const incomingPin = String(payload?.pin || '').trim();
      console.log(`[HomeOS] Received Pair Request with PIN: "${incomingPin}" (Embedded: "${this.pinCode}")`);

      if (incomingPin === this.pinCode) {
        this.pairedRemotes.add(raw.senderId);
        sounds.playConnectChime();

        this.link.send(MESSAGE_TYPES.PAIR_ACCEPTED, {
          tvName: 'HomeOS TV',
          pin: this.pinCode
        });

        if (this.isSleeping) {
          this.togglePower();
        }

        this.showCursor();
        this.broadcastMediaStatus();
      } else {
        this.link.send(MESSAGE_TYPES.PAIR_REJECTED, {
          error: 'Incorrect 6-digit PIN code.'
        });
      }
    });

    // Cursor Movement
    this.link.on(MESSAGE_TYPES.CURSOR_MOVE, (payload) => {
      if (this.isSleeping) return;
      this.showCursor();

      const sensitivity = 1.6;
      const dx = (payload.dx || 0) * sensitivity;
      const dy = (payload.dy || 0) * sensitivity;

      this.cursorX = Math.max(16, Math.min(window.innerWidth - 16, this.cursorX + dx));
      this.cursorY = Math.max(16, Math.min(window.innerHeight - 16, this.cursorY + dy));

      this.updateCursorPosition();
    });

    // Cursor Click / Tap
    this.link.on(MESSAGE_TYPES.CURSOR_CLICK, (payload) => {
      if (this.isSleeping) return;
      this.showCursor();
      if (!this.cursorEl) return;

      if (payload.action === 'press') {
        this.cursorEl.classList.add('clicked');
        sounds.playSelect();

        this.cursorEl.style.pointerEvents = 'none';
        const target = document.elementFromPoint(this.cursorX, this.cursorY);
        this.cursorEl.style.pointerEvents = '';
        if (target) {
          const clickable = target.closest('button, a, .tv-focusable, [tabindex]');
          if (clickable) {
            clickable.click();
            clickable.focus?.();
          }
        }
      } else {
        this.cursorEl.classList.remove('clicked');
      }
    });

    // User Profile Sync
    this.link.on(MESSAGE_TYPES.USER_PROFILE, (payload) => {
      const username = payload?.username;
      if (username) {
        console.log(`[HomeOS] Connected Remote belongs to: ${username}`);
        localStorage.setItem('homeos_remote_user', username);
        this.updateGreeting();
      }
    });

    // Launch OTT App
    this.link.on(MESSAGE_TYPES.OPEN_APP, (payload) => {
      console.log('[HomeOS] Opening OTT App:', payload);
      this.openApp(payload?.appId, payload?.title, payload?.url);
    });

    // Seek Gestures from Mediapad
    this.link.on(MESSAGE_TYPES.MEDIA_SEEK, (payload) => {
      console.log('[HomeOS] Media Seek:', payload);
      this.handleSeek(payload?.direction, payload?.seconds || 10);
    });

    // Play / Pause Toggle
    this.link.on(MESSAGE_TYPES.PLAY_PAUSE, () => {
      this.toggleMediaPlayState();
    });

    // Universal Footer Action: Back
    this.link.on(MESSAGE_TYPES.BACK, () => {
      sounds.playBack();
      if (this.appOverlay && !this.appOverlay.classList.contains('hidden')) {
        this.closeApp();
      } else if (this.mediaState.isPlaying) {
        this.toggleMediaPlayState();
      }
    });

    // Universal Footer Action: Home
    this.link.on(MESSAGE_TYPES.HOME, () => {
      sounds.playSelect();
      if (this.appOverlay) this.closeApp();
      this.showOnScreenHud('⌂', 'Home');
    });

    // Universal Footer Action: Volume
    this.link.on(MESSAGE_TYPES.VOLUME, () => {
      sounds.playSelect();
      this.isMuted = !this.isMuted;
      const volIcon = this.isMuted ? '🔇' : '🔊';
      const volText = this.isMuted ? 'Muted' : 'Volume 50%';
      this.showOnScreenHud(volIcon, volText);
    });

    // Universal Footer Action: AI
    this.link.on(MESSAGE_TYPES.VOICE_SEARCH, () => {
      sounds.playConnectChime();
      this.showOnScreenHud('✨', 'How can I help you?');
    });

    // Power Toggle
    this.link.on(MESSAGE_TYPES.POWER, (payload) => {
      const action = payload?.action;
      if (action === 'ON') {
        if (this.isSleeping) this.togglePower();
      } else if (action === 'OFF') {
        if (!this.isSleeping) this.togglePower();
      } else {
        this.togglePower();
      }
    });

    // Unpair
    this.link.on(MESSAGE_TYPES.UNPAIR, (payload, raw) => {
      this.pairedRemotes.delete(raw.senderId);
      if (this.pairedRemotes.size === 0) {
        this.hideCursor();
      }
    });
  }

  togglePower() {
    this.isSleeping = !this.isSleeping;
    let sleepEl = document.getElementById('tv-sleep-overlay');
    if (!sleepEl) {
      sleepEl = document.createElement('div');
      sleepEl.id = 'tv-sleep-overlay';
      sleepEl.style.cssText = 'position:fixed;inset:0;background:#000000;z-index:99999;transition:opacity 0.5s ease;pointer-events:none;opacity:0;';
      document.body.appendChild(sleepEl);
    }

    if (this.isSleeping) {
      sleepEl.style.opacity = '1';
      sounds.playBack();
      this.hideCursor();
      this.link.send(MESSAGE_TYPES.POWER_STATE, { isPoweredOn: false });
    } else {
      sleepEl.style.opacity = '0';
      sounds.playSelect();
      this.showCursor();
      this.link.send(MESSAGE_TYPES.POWER_STATE, { isPoweredOn: true });
    }
  }

  showCursor() {
    if (!this.cursorVisible && this.cursorEl) {
      this.cursorVisible = true;
      this.cursorEl.classList.add('visible');
    }
  }

  hideCursor() {
    if (this.cursorVisible && this.cursorEl) {
      this.cursorVisible = false;
      this.cursorEl.classList.remove('visible');
    }
  }

  updateCursorPosition() {
    if (this.cursorEl) {
      this.cursorEl.style.left = `${this.cursorX}px`;
      this.cursorEl.style.top = `${this.cursorY}px`;
    }
  }

  registerPWA() {
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
          .then((reg) => console.log('[HomeOS] ServiceWorker registered:', reg.scope))
          .catch((err) => console.warn('[HomeOS] ServiceWorker failed:', err));
      });
    }
  }
}

window.addEventListener('DOMContentLoaded', () => {
  window.homeOS = new HomeOSLauncher();
});
