/**
 * HomeMote Controller
 * Connect to TV Screen (PIN: 103279) -> Centered Power Button Remote Screen
 */

import { HomeLink } from '../../shared/homelink.js';
import { MESSAGE_TYPES } from '../../shared/protocol.js';
import { haptics } from './haptics.js';

class HomeMoteController {
  constructor() {
    this.enteredPin = [];
    this.pairedPin = localStorage.getItem('homemote_paired_pin') || null;
    this.isPaired = false;

    // Initialize HomeLink (using paired room if saved, or temporary room)
    const initialRoom = this.pairedPin ? `homeos_${this.pairedPin}` : 'homeos_pairing_lobby';
    this.link = new HomeLink({
      role: 'remote',
      roomId: initialRoom
    });

    this.init();
  }

  init() {
    console.log('[HomeMote] Initializing Remote...');

    this.initElements();
    this.setupKeypad();
    this.setupPowerButton();
    this.setupLinkEvents();
    this.registerPWA();

    // If already paired in localStorage, directly show the Power Button screen
    if (this.pairedPin && this.pairedPin.length === 6) {
      console.log(`[HomeMote] Already paired with PIN: ${this.pairedPin}`);
      this.showPowerScreen('HomeOS TV');
      this.attemptPair(this.pairedPin, true);
    }
  }

  initElements() {
    this.pairingScreen = document.getElementById('pairing-screen');
    this.powerScreen = document.getElementById('power-screen');
    this.pinBoxes = Array.from(document.querySelectorAll('.pin-box'));
    this.pinRow = document.getElementById('pin-display');
    this.feedbackEl = document.getElementById('pairing-feedback');
    this.tvNameEl = document.getElementById('connected-tv-name');
    this.unpairBtn = document.getElementById('btn-unpair');
    this.powerBtn = document.getElementById('btn-power-main');

    if (this.unpairBtn) {
      this.unpairBtn.addEventListener('click', () => {
        haptics.click();
        this.unpair();
      });
    }
  }

  // --- Screen 1: Numpad & 6-Digit PIN Logic ---
  setupKeypad() {
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
    console.log(`[HomeMote] Attempting pair with PIN: ${pin}`);
    if (!isAutoConnect) {
      this.setFeedback('Connecting to HomeOS TV...', '');
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
          this.triggerPinError('TV not found or incorrect code. Please check HomeOS.');
        }
      }, 3500);
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
      }, 550);
    }
  }

  setFeedback(text, type = '') {
    if (this.feedbackEl) {
      this.feedbackEl.textContent = text;
      this.feedbackEl.className = `pairing-feedback ${type}`.trim();
    }
  }

  showPowerScreen(tvName) {
    this.isPaired = true;
    if (this.pairingScreen) this.pairingScreen.classList.add('hidden');
    if (this.powerScreen) this.powerScreen.classList.remove('hidden');
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

    if (this.powerScreen) this.powerScreen.classList.add('hidden');
    if (this.pairingScreen) this.pairingScreen.classList.remove('hidden');
  }

  // --- Screen 2: Centered Power Button ---
  setupPowerButton() {
    if (!this.powerBtn) return;

    this.powerBtn.addEventListener('click', () => {
      haptics.doublePulse();
      console.log('[HomeMote] Power button pressed');
      this.link.send(MESSAGE_TYPES.POWER);
    });
  }

  // --- Communication Events ---
  setupLinkEvents() {
    // When TV accepts pair request
    this.link.on(MESSAGE_TYPES.PAIR_ACCEPTED, (payload) => {
      console.log('[HomeMote] Pairing Accepted by HomeOS:', payload);
      clearTimeout(this.pairTimeout);
      haptics.success();

      const pin = payload?.pin || this.enteredPin.join('');
      this.pairedPin = pin;
      localStorage.setItem('homemote_paired_pin', pin);

      this.showPowerScreen(payload?.tvName || 'HomeOS TV');
    });

    // When TV rejects pair request
    this.link.on(MESSAGE_TYPES.PAIR_REJECTED, (payload) => {
      clearTimeout(this.pairTimeout);
      this.triggerPinError(payload?.error || 'Incorrect code.');
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
