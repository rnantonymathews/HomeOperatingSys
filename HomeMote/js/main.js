/**
 * HomeMote Controller
 * Setup Flow:
 * 1. Enter PIN (103279)
 * 2. Enter Name ({username})
 * 3. Save both in localStorage and show Centered Power Button
 */

import { HomeLink } from '../../shared/homelink.js';
import { MESSAGE_TYPES } from '../../shared/protocol.js';
import { haptics } from './haptics.js';

class HomeMoteController {
  constructor() {
    this.enteredPin = [];
    this.pendingPin = null;
    this.pairedPin = localStorage.getItem('homemote_paired_pin') || null;
    this.username = localStorage.getItem('homemote_username') || null;
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
    console.log('[HomeMote] Initializing Setup Flow...');

    this.initElements();
    this.setupKeypad();
    this.setupNameForm();
    this.setupPowerButton();
    this.setupLinkEvents();
    this.registerPWA();

    // Check saved state:
    if (this.pairedPin && this.username) {
      // Both PIN & Name already saved: directly show Power Button
      console.log(`[HomeMote] Fully configured for ${this.username} (PIN: ${this.pairedPin})`);
      this.showPowerScreen(this.username);
      this.attemptPair(this.pairedPin, true);
    } else if (this.pairedPin && !this.username) {
      // PIN saved but name missing: prompt name
      this.pendingPin = this.pairedPin;
      this.showNameScreen();
    } else {
      // First-time launch: show pairing PIN screen
      this.showPairingScreen();
    }
  }

  initElements() {
    this.pairingScreen = document.getElementById('pairing-screen');
    this.nameScreen = document.getElementById('name-screen');
    this.powerScreen = document.getElementById('power-screen');

    this.pinBoxes = Array.from(document.querySelectorAll('.pin-box'));
    this.pinRow = document.getElementById('pin-display');
    this.feedbackEl = document.getElementById('pairing-feedback');
    
    this.nameInput = document.getElementById('username-input');
    this.nameError = document.getElementById('name-error');
    this.nameForm = document.getElementById('name-form');

    this.userNameEl = document.getElementById('connected-user-name');
    this.unpairBtn = document.getElementById('btn-unpair');
    this.powerBtn = document.getElementById('btn-power-main');

    if (this.unpairBtn) {
      this.unpairBtn.addEventListener('click', () => {
        haptics.click();
        this.unpair();
      });
    }
  }

  // --- Step 1: Numpad & 6-Digit PIN Logic ---
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
      if (this.pairingScreen && !this.pairingScreen.classList.contains('hidden')) {
        if (e.key >= '0' && e.key <= '9') {
          this.handleDigit(e.key);
        } else if (e.key === 'Backspace') {
          this.handleBackspace();
        }
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
      this.setFeedback('Verifying PIN with HomeOS...', '');
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
          this.triggerPinError('TV not found or code incorrect. Expected 103279.');
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

  // --- Step 2: Name Input Screen ---
  setupNameForm() {
    if (!this.nameForm) return;

    this.nameForm.addEventListener('submit', (e) => {
      e.preventDefault();
      this.submitName();
    });

    const submitBtn = document.getElementById('btn-save-name');
    if (submitBtn) {
      submitBtn.addEventListener('click', (e) => {
        e.preventDefault();
        this.submitName();
      });
    }
  }

  submitName() {
    const raw = this.nameInput ? this.nameInput.value.trim() : '';
    if (!raw) {
      if (this.nameError) this.nameError.textContent = 'Please enter your name.';
      haptics.error();
      return;
    }

    this.username = raw;
    this.pairedPin = this.pendingPin || '103279';

    // Save both data permanently in localStorage
    localStorage.setItem('homemote_paired_pin', this.pairedPin);
    localStorage.setItem('homemote_username', this.username);
    console.log(`[HomeMote] Saved credentials: PIN=${this.pairedPin}, Name=${this.username}`);

    // Notify HomeOS
    this.link.send(MESSAGE_TYPES.USER_PROFILE, {
      username: this.username,
      pin: this.pairedPin
    });

    haptics.success();
    this.showPowerScreen(this.username);
  }

  // --- Screen Navigation ---
  showPairingScreen() {
    if (this.pairingScreen) this.pairingScreen.classList.remove('hidden');
    if (this.nameScreen) this.nameScreen.classList.add('hidden');
    if (this.powerScreen) this.powerScreen.classList.add('hidden');
  }

  showNameScreen() {
    if (this.pairingScreen) this.pairingScreen.classList.add('hidden');
    if (this.nameScreen) this.nameScreen.classList.remove('hidden');
    if (this.powerScreen) this.powerScreen.classList.add('hidden');
    setTimeout(() => {
      if (this.nameInput) this.nameInput.focus();
    }, 200);
  }

  showPowerScreen(username) {
    this.isPaired = true;
    if (this.pairingScreen) this.pairingScreen.classList.add('hidden');
    if (this.nameScreen) this.nameScreen.classList.add('hidden');
    if (this.powerScreen) this.powerScreen.classList.remove('hidden');
    if (this.userNameEl) {
      this.userNameEl.textContent = username ? `${username}'s HomeMote` : 'HomeMote';
    }
  }

  unpair() {
    this.link.send(MESSAGE_TYPES.UNPAIR, { pin: this.pairedPin, username: this.username });
    this.isPaired = false;
    this.pairedPin = null;
    this.pendingPin = null;
    this.username = null;

    localStorage.removeItem('homemote_paired_pin');
    localStorage.removeItem('homemote_username');

    this.enteredPin = [];
    this.updatePinDisplay();
    this.setFeedback('', '');
    if (this.nameInput) this.nameInput.value = '';

    this.showPairingScreen();
  }

  // --- Step 3: Centered Power Button ---
  setupPowerButton() {
    if (!this.powerBtn) return;

    this.powerBtn.addEventListener('click', () => {
      haptics.doublePulse();
      console.log(`[HomeMote] Power toggled by ${this.username || 'User'}`);
      this.link.send(MESSAGE_TYPES.POWER, {
        triggeredBy: this.username
      });
    });
  }

  // --- Communication Events ---
  setupLinkEvents() {
    // When TV accepts pair request
    this.link.on(MESSAGE_TYPES.PAIR_ACCEPTED, (payload) => {
      console.log('[HomeMote] Pairing Accepted by HomeOS:', payload);
      clearTimeout(this.pairTimeout);

      const pin = payload?.pin || this.enteredPin.join('');
      this.pendingPin = pin;

      // If user hasn't set their name yet, show Name Setup screen!
      if (!this.username) {
        haptics.click();
        this.showNameScreen();
      } else {
        haptics.success();
        this.showPowerScreen(this.username);
      }
    });

    // When TV rejects pair request
    this.link.on(MESSAGE_TYPES.PAIR_REJECTED, (payload) => {
      clearTimeout(this.pairTimeout);
      this.triggerPinError(payload?.error || 'Incorrect PIN code. Expected 103279.');
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
