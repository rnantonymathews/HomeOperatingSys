/**
 * HomeOS Main Controller
 * 6-Digit PIN Display, Real Handshake, and Live Blue Circle Cursor
 */

import { HomeLink } from '../../shared/homelink.js';
import { MESSAGE_TYPES } from '../../shared/protocol.js';
import { sounds } from './sound.js';

class HomeOSLauncher {
  constructor() {
    this.pinCode = this.getOrCreatePinCode();
    this.pairedRemotes = new Set();
    
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

  getOrCreatePinCode() {
    // Generate once and store permanently in localStorage (never shuffles)
    let stored = localStorage.getItem('homeos_pairing_pin') || sessionStorage.getItem('homeos_pairing_pin');
    if (!stored || stored.length !== 6 || isNaN(stored)) {
      stored = Math.floor(100000 + Math.random() * 900000).toString();
    }
    localStorage.setItem('homeos_pairing_pin', stored);
    return stored;
  }

  init() {
    console.log(`[HomeOS] Initialized with 6-Digit PIN: ${this.pinCode}`);

    this.initElements();
    this.renderPairingCode();
    this.setupLinkEvents();
    this.registerPWA();
  }

  initElements() {
    this.cursorEl = document.getElementById('tv-cursor');
    this.pairingDotEl = document.getElementById('tv-pairing-dot');
    this.pairingCodeEl = document.getElementById('tv-pairing-code');

    // Position cursor at center initially
    this.updateCursorPosition();
  }

  renderPairingCode() {
    if (this.pairingCodeEl) {
      // Format as "123 · 456" for readability
      const formatted = `${this.pinCode.slice(0, 3)} · ${this.pinCode.slice(3)}`;
      this.pairingCodeEl.textContent = formatted;
    }
  }

  setupLinkEvents() {
    // Link connection state
    this.link.onStatusChange((status) => {
      console.log(`[HomeOS Link] Status: ${status}`);
    });

    // Handle incoming Pair Request from HomeMote
    this.link.on(MESSAGE_TYPES.PAIR_REQUEST, (payload, raw) => {
      const incomingPin = String(payload?.pin || '').trim();
      console.log(`[HomeOS] Received Pair Request with PIN: "${incomingPin}" (Expected: "${this.pinCode}")`);

      if (incomingPin === this.pinCode) {
        // Successful real pairing!
        this.pairedRemotes.add(raw.senderId);
        this.updatePairingUI(true);
        sounds.playConnectChime();

        // Confirm back to remote
        this.link.send(MESSAGE_TYPES.PAIR_ACCEPTED, {
          tvName: 'HomeOS Living Room TV',
          pin: this.pinCode
        });

        // Show cursor upon pairing
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
      this.showCursor();
      if (!this.cursorEl) return;

      if (payload.action === 'press') {
        this.cursorEl.classList.add('clicked');
        sounds.playSelect();
      } else {
        this.cursorEl.classList.remove('clicked');
      }
    });

    // Unpair
    this.link.on(MESSAGE_TYPES.UNPAIR, (payload, raw) => {
      this.pairedRemotes.delete(raw.senderId);
      if (this.pairedRemotes.size === 0) {
        this.updatePairingUI(false);
        this.hideCursor();
      }
    });
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

  updatePairingUI(isConnected) {
    if (this.pairingDotEl) {
      if (isConnected) {
        this.pairingDotEl.classList.add('connected');
      } else {
        this.pairingDotEl.classList.remove('connected');
      }
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
