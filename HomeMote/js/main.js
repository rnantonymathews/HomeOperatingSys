/**
 * HomeMote Main Controller
 * 6-Digit PIN Pairing Screen, Real Handshake, and Live Trackpad
 */

import { HomeLink } from '../../shared/homelink.js';
import { MESSAGE_TYPES } from '../../shared/protocol.js';
import { haptics } from './haptics.js';

class HomeMoteController {
  constructor() {
    this.enteredPin = [];
    this.pairedPin = localStorage.getItem('homemote_paired_pin') || null;
    this.isPaired = false;

    // Touchpad tracking variables
    this.isTracking = false;
    this.lastX = 0;
    this.lastY = 0;
    this.hasMoved = false;

    // Initialize HomeLink (using paired room if saved, or temporary room)
    const initialRoom = this.pairedPin ? `homeos_${this.pairedPin}` : 'homeos_pairing_lobby';
    this.link = new HomeLink({
      role: 'remote',
      roomId: initialRoom
    });

    this.init();
  }

  init() {
    console.log('[HomeMote] Initialized.');

    this.initElements();
    this.setupKeypad();
    this.setupTrackpad();
    this.setupLinkEvents();
    this.registerPWA();

    // If already paired in localStorage, auto-restore connection
    if (this.pairedPin && this.pairedPin.length === 6) {
      console.log(`[HomeMote] Restoring paired connection for PIN: ${this.pairedPin}`);
      this.showTrackpadScreen('HomeOS TV');
      this.attemptPair(this.pairedPin, true);
    }
  }

  initElements() {
    this.pairingScreen = document.getElementById('pairing-screen');
    this.trackpadScreen = document.getElementById('trackpad-screen');
    this.pinBoxes = Array.from(document.querySelectorAll('.pin-box'));
    this.pinRow = document.getElementById('pin-display');
    this.feedbackEl = document.getElementById('pairing-feedback');
    this.tvNameEl = document.getElementById('connected-tv-name');
    this.unpairBtn = document.getElementById('btn-unpair');
    this.trackpadEl = document.getElementById('mote-trackpad');

    if (this.unpairBtn) {
      this.unpairBtn.addEventListener('click', () => {
        haptics.click();
        this.unpair();
      });
    }
  }

  // --- Screen 1: Numpad & 6-Digit PIN Logic ---
  setupKeypad() {
    // On-screen number pad buttons
    const keys = document.querySelectorAll('.numpad-key[data-key]');
    keys.forEach(btn => {
      btn.addEventListener('click', () => {
        const key = btn.getAttribute('data-key');
        if (key === 'backspace') {
          this.handleBackspace();
        } else {
          this.handleDigit(key);
        }
      });
    });

    // Physical desktop keyboard support
    window.addEventListener('keydown', (e) => {
      if (this.isPaired) return;
      if (e.key >= '0' && e.key <= '9') {
        this.handleDigit(e.key);
      } else if (e.key === 'Backspace') {
        this.handleBackspace();
      }
    });
  }

  handleDigit(digit) {
    if (this.enteredPin.length >= 6) return;
    haptics.tick();
    this.enteredPin.push(digit);
    this.updatePinDisplay();

    // Auto-submit on 6th digit
    if (this.enteredPin.length === 6) {
      const pin = this.enteredPin.join('');
      this.attemptPair(pin, false);
    }
  }

  handleBackspace() {
    if (this.enteredPin.length === 0) return;
    haptics.tick();
    this.enteredPin.pop();
    this.updatePinDisplay();
    this.setFeedback('', '');
  }

  updatePinDisplay() {
    this.pinBoxes.forEach((box, idx) => {
      if (idx < this.enteredPin.length) {
        box.textContent = this.enteredPin[idx];
        box.classList.add('filled');
        box.classList.remove('active');
      } else if (idx === this.enteredPin.length) {
        box.textContent = '';
        box.classList.remove('filled');
        box.classList.add('active');
      } else {
        box.textContent = '';
        box.classList.remove('filled', 'active');
      }
    });
  }

  attemptPair(pin, isAutoConnect = false) {
    console.log(`[HomeMote] Attempting real pair with PIN: ${pin}`);
    if (!isAutoConnect) {
      this.setFeedback('Connecting to TV...', '');
    }

    // Switch HomeLink to the TV's room
    this.link.setRoom(`homeos_${pin}`);

    // Send real PAIR_REQUEST
    setTimeout(() => {
      this.link.send(MESSAGE_TYPES.PAIR_REQUEST, { pin });
    }, 150);

    // Timeout fallback if TV doesn't respond
    if (!isAutoConnect) {
      clearTimeout(this.pairTimeout);
      this.pairTimeout = setTimeout(() => {
        if (!this.isPaired) {
          this.triggerPinError('TV not found. Make sure HomeOS is running.');
        }
      }, 4000);
    }
  }

  triggerPinError(message) {
    haptics.error();
    this.setFeedback(message, 'error');
    if (this.pinRow) {
      this.pinRow.classList.add('error');
      setTimeout(() => {
        if (this.pinRow) this.pinRow.classList.remove('error');
        this.enteredPin = [];
        this.updatePinDisplay();
      }, 600);
    }
  }

  setFeedback(text, type = '') {
    if (this.feedbackEl) {
      this.feedbackEl.textContent = text;
      this.feedbackEl.className = `pairing-feedback ${type}`.trim();
    }
  }

  showTrackpadScreen(tvName) {
    this.isPaired = true;
    if (this.pairingScreen) this.pairingScreen.classList.add('hidden');
    if (this.trackpadScreen) this.trackpadScreen.classList.remove('hidden');
    if (this.tvNameEl) this.tvNameEl.textContent = tvName || 'HomeOS TV';
  }

  unpair() {
    this.link.send(MESSAGE_TYPES.UNPAIR, { pin: this.pairedPin });
    this.isPaired = false;
    this.pairedPin = null;
    localStorage.removeItem('homemote_paired_pin');

    this.enteredPin = [];
    this.updatePinDisplay();
    this.setFeedback('', '');

    if (this.trackpadScreen) this.trackpadScreen.classList.add('hidden');
    if (this.pairingScreen) this.pairingScreen.classList.remove('hidden');
  }

  // --- Screen 2: Real-time Trackpad Controller ---
  setupTrackpad() {
    if (!this.trackpadEl) return;

    this.trackpadEl.addEventListener('pointerdown', (e) => this.onPointerDown(e));
    window.addEventListener('pointermove', (e) => this.onPointerMove(e));
    window.addEventListener('pointerup', (e) => this.onPointerUp(e));
    window.addEventListener('pointercancel', (e) => this.onPointerUp(e));
  }

  onPointerDown(e) {
    if (!this.isPaired) return;
    this.isTracking = true;
    this.hasMoved = false;
    this.lastX = e.clientX;
    this.lastY = e.clientY;

    this.showTouchTrail(e.clientX, e.clientY);
  }

  onPointerMove(e) {
    if (!this.isTracking || !this.isPaired) return;

    const dx = e.clientX - this.lastX;
    const dy = e.clientY - this.lastY;

    if (Math.abs(dx) > 1 || Math.abs(dy) > 1) {
      this.hasMoved = true;
      this.lastX = e.clientX;
      this.lastY = e.clientY;

      // Stream cursor movement to HomeOS
      this.link.send(MESSAGE_TYPES.CURSOR_MOVE, { dx, dy });
    }
  }

  onPointerUp(e) {
    if (!this.isTracking || !this.isPaired) return;
    this.isTracking = false;

    // If released without significant dragging, trigger a Click!
    if (!this.hasMoved) {
      haptics.click();
      this.link.send(MESSAGE_TYPES.CURSOR_CLICK, { action: 'press' });
      setTimeout(() => {
        this.link.send(MESSAGE_TYPES.CURSOR_CLICK, { action: 'release' });
      }, 100);
    }
  }

  showTouchTrail(clientX, clientY) {
    const rect = this.trackpadEl.getBoundingClientRect();
    const trail = document.createElement('div');
    trail.className = 'touch-trail';
    trail.style.left = `${clientX - rect.left}px`;
    trail.style.top = `${clientY - rect.top}px`;

    this.trackpadEl.appendChild(trail);
    setTimeout(() => trail.remove(), 350);
  }

  // --- Communication Events ---
  setupLinkEvents() {
    // When TV accepts pair request
    this.link.on(MESSAGE_TYPES.PAIR_ACCEPTED, (payload) => {
      console.log('[HomeMote] Pairing Accepted by TV:', payload);
      clearTimeout(this.pairTimeout);
      haptics.success();

      const pin = payload?.pin || this.enteredPin.join('');
      this.pairedPin = pin;
      localStorage.setItem('homemote_paired_pin', pin);

      this.showTrackpadScreen(payload?.tvName || 'HomeOS TV');
    });

    // When TV rejects pair request
    this.link.on(MESSAGE_TYPES.PAIR_REJECTED, (payload) => {
      clearTimeout(this.pairTimeout);
      this.triggerPinError(payload?.error || 'PIN rejected by TV.');
    });
  }

  registerPWA() {
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
          .then((reg) => console.log('[HomeMote] ServiceWorker registered:', reg.scope))
          .catch((err) => console.warn('[HomeMote] ServiceWorker failed:', err));
      });
    }
  }
}

window.addEventListener('DOMContentLoaded', () => {
  window.homeMote = new HomeMoteController();
});
