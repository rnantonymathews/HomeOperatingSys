/**
 * HomeOS Main Controller
 * tvOS Launcher Homescreen:
 * 1. Top Left: Date, Time & Weather
 * 2. Top Right: User Greetings ("Good evening, Aaron")
 * 3. Bottom Center: Now Playing Bar (visible ONLY if media is playing)
 * Real handshake, live cursor & power toggle, dynamic storage
 */

import { HomeLink } from '../../shared/homelink.js';
import { MESSAGE_TYPES } from '../../shared/protocol.js';
import { sounds } from './sound.js';

class HomeOSLauncher {
  constructor() {
    // Fixed embedded PIN code
    this.pinCode = '103279';
    localStorage.setItem('homeos_pairing_pin', this.pinCode);

    this.pairedRemotes = new Set();
    this.isSleeping = false;

    // Media State ("Now Playing Bar, but only if some media is playing")
    this.mediaState = {
      isPlaying: true, // Default to active sample as shown in mockup
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

    this.updateCursorPosition();
  }

  // =========================================================================
  // 1. TOP LEFT: Date & Time + Weather
  // =========================================================================
  initClockAndWeather() {
    this.updateDateTime();
    // Update every second for accurate clock display
    this.clockInterval = setInterval(() => this.updateDateTime(), 1000);
  }

  updateDateTime() {
    const now = new Date();

    // Date formatted as "Mon, Nov 10"
    if (this.dateEl) {
      const dateStr = now.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric'
      });
      this.dateEl.textContent = dateStr;
    }

    // Time formatted as "8:45 PM"
    if (this.timeEl) {
      const timeStr = now.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
      this.timeEl.textContent = timeStr;
    }
  }

  // =========================================================================
  // 2. TOP RIGHT: User Greetings
  // =========================================================================
  initUserGreeting() {
    this.updateGreeting();
    // Re-check periodically for day/evening transitions
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

    // Play/Pause button interaction
    if (this.btnPlay) {
      this.btnPlay.addEventListener('click', (e) => {
        e.stopPropagation();
        this.toggleMediaPlayState();
      });
    }

    // Interactive testing shortcut: Space bar or 'M' key toggles playback
    window.addEventListener('keydown', (e) => {
      if (e.code === 'Space' || e.key === 'm' || e.key === 'M') {
        this.toggleMediaPlayState();
      }
    });
  }

  setMediaPlaying(isPlaying, title = null) {
    this.mediaState.isPlaying = Boolean(isPlaying);
    if (title) this.mediaState.title = title;
    this.updateNowPlayingUI();
    console.log(`[HomeOS] setMediaPlaying -> ${this.mediaState.isPlaying} (${this.mediaState.title})`);
  }

  toggleMediaPlayState() {
    this.mediaState.isPlaying = !this.mediaState.isPlaying;
    sounds.playSelect();
    this.updateNowPlayingUI();
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
        // Triangle Play Glyph
        this.playIcon.innerHTML = '<path d="M8 5v14l11-7z"/>';
      }
    } else {
      // Hidden when no media is playing
      this.nowPlayingContainer.classList.remove('is-playing');
    }
  }

  // =========================================================================
  // Link & Remote Events
  // =========================================================================
  setupLinkEvents() {
    this.link.onStatusChange((status) => {
      console.log(`[HomeOS Link] Status: ${status}`);
    });

    // Handle incoming Pair Request from HomeMote
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
      } else {
        this.link.send(MESSAGE_TYPES.PAIR_REJECTED, {
          error: 'Incorrect 6-digit PIN code.'
        });
      }
    });

    // Real-time Cursor Movement
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

    // Play / Pause Toggle from Remote
    this.link.on(MESSAGE_TYPES.PLAY_PAUSE, () => {
      this.toggleMediaPlayState();
    });

    // Power Toggle from Remote
    this.link.on(MESSAGE_TYPES.POWER, () => {
      this.togglePower();
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
    } else {
      sleepEl.style.opacity = '0';
      sounds.playSelect();
      this.showCursor();
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
