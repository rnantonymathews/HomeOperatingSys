/**
 * HomeOS Main Controller
 * tvOS Launcher Homescreen:
 * 1. Top Left: Date, Time & Weather
 * 2. Top Right: User Greetings ("Good evening, Aaron")
 * 3. Bottom Center: Now Playing Bar (visible ONLY if media is playing)
 * Real handshake, live cursor & power toggle, dynamic storage
 * Responds to HomeMote: OPEN_APP, MEDIA_SEEK, PLAY_PAUSE, CURSOR_MOVE, CURSOR_CLICK
 */

import { HomeLink } from '../../shared/homelink.js';
import { MESSAGE_TYPES } from '../../shared/protocol.js';
import { sounds } from './sound.js';

const APP_CATALOG = {
  appletv: {
    badge: 'tv+',
    title: 'Apple TV+',
    media: 'Severance',
    desc: 'Mark leads a team of office workers whose memories have been surgically divided between their work and personal lives.',
    service: 'tv'
  },
  netflix: {
    badge: 'NETFLIX',
    title: 'Netflix',
    media: 'Stranger Things',
    desc: 'When a young boy vanishes, a small town uncovers a mystery involving secret experiments, terrifying supernatural forces and one strange little girl.',
    service: 'Netflix'
  },
  prime: {
    badge: 'PRIME',
    title: 'Prime Video',
    media: 'The Boys',
    desc: 'A fun and irreverent take on what happens when superheroes abuse their superpowers rather than use them for good.',
    service: 'Prime Video'
  },
  disney: {
    badge: 'DISNEY+',
    title: 'Disney+',
    media: 'The Mandalorian',
    desc: 'The travels of a lone bounty hunter in the outer reaches of the galaxy, far from the authority of the New Republic.',
    service: 'Disney+'
  },
  youtube: {
    badge: 'YOUTUBE',
    title: 'YouTube',
    media: 'Apple Park Keynote',
    desc: 'Special Apple Event broadcast from Cupertino, California streaming in 4K HDR.',
    service: 'YouTube'
  },
  spotify: {
    badge: 'SPOTIFY',
    title: 'Spotify',
    media: 'Top Hits 2026',
    desc: 'The hottest tracks right now across pop, electronic, and hip-hop.',
    service: 'Spotify'
  }
};

class HomeOSLauncher {
  constructor() {
    // Fixed embedded PIN code
    this.pinCode = '103279';
    localStorage.setItem('homeos_pairing_pin', this.pinCode);

    this.pairedRemotes = new Set();
    this.isSleeping = false;
    this.currentApp = null;

    // Media State ("Now Playing Bar, visible only if media is playing")
    this.mediaState = {
      isPlaying: true, // Default to true as shown in user's mockup
      title: 'Severance',
      service: 'tv'
    };

    // Initialize HomeLink for this TV PIN room
    this.link = new HomeLink({
      role: 'tv',
      roomId: `homeos_${this.pinCode}`
    });

    // Cursor position (default center of screen)
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
    this.appBadge = document.getElementById('app-window-badge');
    this.appTitle = document.getElementById('app-window-title');
    this.appMediaName = document.getElementById('app-media-name');
    this.appMediaDesc = document.getElementById('app-media-desc');
    this.btnCloseApp = document.getElementById('btn-close-app');
    this.btnAppPlay = document.getElementById('btn-app-play');

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
    // Notify HomeMote so it automatically switches to Mediapad!
    this.link.send(MESSAGE_TYPES.MEDIA_STATUS, {
      isPlaying: this.mediaState.isPlaying,
      title: this.mediaState.title,
      service: this.mediaState.service
    });
  }

  // =========================================================================
  // On-Screen HUD Pill Notification (Seek, Play/Pause)
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

  openApp(appId, title) {
    this.currentApp = appId || 'appletv';
    const info = APP_CATALOG[this.currentApp] || {
      badge: title || 'APP',
      title: title || 'Streaming App',
      media: 'Now Showing',
      desc: 'Enjoy top streaming originals and movies on HomeOS.',
      service: title || 'OTT'
    };

    if (this.appBadge) this.appBadge.textContent = info.badge;
    if (this.appTitle) this.appTitle.textContent = info.title;
    if (this.appMediaName) this.appMediaName.textContent = info.media;
    if (this.appMediaDesc) this.appMediaDesc.textContent = info.desc;

    if (this.appOverlay) {
      this.appOverlay.classList.remove('hidden');
      sounds.playSelect();
    }
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
        // Sync initial media state to remote
        this.broadcastMediaStatus();
      } else {
        this.link.send(MESSAGE_TYPES.PAIR_REJECTED, {
          error: 'Incorrect 6-digit PIN code.'
        });
      }
    });

    // Real-time Cursor Movement from Freepad / Mediapad
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

    // Cursor Click / Tap on Remote Surface
    this.link.on(MESSAGE_TYPES.CURSOR_CLICK, (payload) => {
      if (this.isSleeping) return;
      this.showCursor();
      if (!this.cursorEl) return;

      if (payload.action === 'press') {
        this.cursorEl.classList.add('clicked');
        sounds.playSelect();

        // Native click dispatch to element beneath cursor!
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

    // Remote User Profile (e.g. "Aaron Antony")
    this.link.on(MESSAGE_TYPES.USER_PROFILE, (payload) => {
      const username = payload?.username;
      if (username) {
        console.log(`[HomeOS] Connected Remote belongs to: ${username}`);
        localStorage.setItem('homeos_remote_user', username);
        this.updateGreeting();
      }
    });

    // Launch OTT App from Entertainment Screen
    this.link.on(MESSAGE_TYPES.OPEN_APP, (payload) => {
      console.log('[HomeOS] Opening OTT App:', payload);
      this.openApp(payload?.appId, payload?.title);
    });

    // Seek Gestures from Mediapad
    this.link.on(MESSAGE_TYPES.MEDIA_SEEK, (payload) => {
      console.log('[HomeOS] Media Seek:', payload);
      this.handleSeek(payload?.direction, payload?.seconds || 10);
    });

    // Play / Pause Toggle from Remote
    this.link.on(MESSAGE_TYPES.PLAY_PAUSE, () => {
      this.toggleMediaPlayState();
    });

    // Power Toggle from Remote
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
