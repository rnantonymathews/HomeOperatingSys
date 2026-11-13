/**
 * HomeOS Main Controller
 * Embedded PIN: 103279 (Clean display, real handshake, live cursor & power toggle)
 */

import { HomeLink } from '../../shared/homelink.js';
import { MESSAGE_TYPES } from '../../shared/protocol.js';
import { sounds } from './sound.js';

class HomeOSLauncher {
  constructor() {
    // Fixed embedded code as requested
    this.pinCode = '103279';
    localStorage.setItem('homeos_pairing_pin', this.pinCode);

    this.pairedRemotes = new Set();
    this.isSleeping = false;
    
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
    this.setupLinkEvents();
    this.registerPWA();
  }

  initElements() {
    this.cursorEl = document.getElementById('tv-cursor');
    this.updateCursorPosition();
  }

  setupLinkEvents() {
    this.link.onStatusChange((status) => {
      console.log(`[HomeOS Link] Status: ${status}`);
    });

    // Handle incoming Pair Request from HomeMote
    this.link.on(MESSAGE_TYPES.PAIR_REQUEST, (payload, raw) => {
      const incomingPin = String(payload?.pin || '').trim();
      console.log(`[HomeOS] Received Pair Request with PIN: "${incomingPin}" (Embedded: "${this.pinCode}")`);

      if (incomingPin === this.pinCode) {
        // Successful real pairing!
        this.pairedRemotes.add(raw.senderId);
        sounds.playConnectChime();

        // Confirm back to remote
        this.link.send(MESSAGE_TYPES.PAIR_ACCEPTED, {
          tvName: 'HomeOS TV',
          pin: this.pinCode
        });

        // Wake screen if sleeping
        if (this.isSleeping) {
          this.togglePower();
        }

        this.showCursor();
      } else {
        // Rejected
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
      }
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
