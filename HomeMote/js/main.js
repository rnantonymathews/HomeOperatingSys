/**
 * HomeMote Controller
 * Complete 3-Pad Dynamic Flow:
 * - Standby: Centered Big Power Button
 * - Active: Top Bar (Green Capsule + Compact Power Button)
 * - Flow: Power ON -> EntertainmentPad (10 OTT apps with uploaded icons, 2 in row)
 *         -> App Chosen -> Freepad (Tactile trackpad, glide moves cursor on TV, tap selects)
 *         -> Media Playing Signal Received -> Mediapad (Vertical trackpad + double-tap seek/pause)
 * - Universal Persistent Footer across all 3 pads:
 *   [ Back | Home | Volume | AI ] (Icons Only)
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
    this.isPoweredOn = false;
    this.currentMode = 'entertainment'; // 'entertainment' | 'freepad' | 'mediapad'

    // Touchpad tracking
    this.pointerActive = false;
    this.lastPointerX = 0;
    this.lastPointerY = 0;
    this.pointerStartX = 0;
    this.pointerStartY = 0;
    this.pointerStartTime = 0;

    // Double-tap gesture tracking for Mediapad
    this.lastTapTime = 0;
    this.lastTapX = 0;
    this.lastTapY = 0;
    this.singleTapTimeout = null;

    // Capsule PIN display timer
    this.capsuleTimer = null;
    this.isShowingCapsulePin = false;

    // Initialize HomeLink
    const initialRoom = this.pairedPin ? `homeos_${this.pairedPin}` : 'homeos_pairing_lobby';
    this.link = new HomeLink({
      role: 'remote',
      roomId: initialRoom
    });

    this.init();
  }

  init() {
    console.log('[HomeMote] Initializing 3-Pad Controller with Universal Footer...');

    this.initElements();
    this.setupKeypad();
    this.setupNameForm();
    this.setupPowerControls();
    this.setupConnectedCapsule();
    this.setupEntertainmentGrid();
    this.setupFreepadSurface();
    this.setupMediapadSurface();
    this.setupUniversalFooter();
    this.setupLinkEvents();
    this.registerPWA();

    // Check saved state:
    if (this.pairedPin && this.username) {
      console.log(`[HomeMote] Fully configured for ${this.username} (PIN: ${this.pairedPin})`);
      this.showMainScreen(this.username);
      this.attemptPair(this.pairedPin, true);
    } else if (this.pairedPin && !this.username) {
      this.pendingPin = this.pairedPin;
      this.showNameScreen();
    } else {
      this.showPairingScreen();
    }
  }

  initElements() {
    this.pairingScreen = document.getElementById('pairing-screen');
    this.nameScreen = document.getElementById('name-screen');
    this.mainScreen = document.getElementById('remote-main-screen');

    this.standbyView = document.getElementById('standby-view');
    this.activeView = document.getElementById('active-view');

    this.pinBoxes = Array.from(document.querySelectorAll('.pin-box'));
    this.pinRow = document.getElementById('pin-display');
    this.feedbackEl = document.getElementById('pairing-feedback');

    this.nameInput = document.getElementById('username-input');
    this.nameError = document.getElementById('name-error');
    this.nameForm = document.getElementById('name-form');

    this.standbyUserNameEl = document.getElementById('standby-user-name');
    this.unpairBtn = document.getElementById('btn-unpair');

    this.powerMainBtn = document.getElementById('btn-power-main');
    this.powerActiveBtn = document.getElementById('btn-power-active');

    this.capsuleBtn = document.getElementById('btn-connected-capsule');
    this.capsuleLabel = document.getElementById('capsule-label');

    // Mode Panels (Pads)
    this.modePanels = {
      entertainment: document.getElementById('mode-entertainment'),
      freepad: document.getElementById('mode-freepad'),
      mediapad: document.getElementById('mode-mediapad')
    };

    // Universal Footer Buttons (Back | Home | Volume | AI)
    this.btnFooterBack = document.getElementById('btn-footer-back');
    this.btnFooterHome = document.getElementById('btn-footer-home');
    this.btnFooterVolume = document.getElementById('btn-footer-volume');
    this.btnFooterAi = document.getElementById('btn-footer-ai');

    // Surfaces
    this.freepadSurface = document.getElementById('freepad-surface');
    this.freepadRipple = document.getElementById('freepad-ripple');
    this.mediapadSurface = document.getElementById('mediapad-surface');
    this.mediapadRipple = document.getElementById('mediapad-ripple');
    this.mediapadHud = document.getElementById('mediapad-hud');
    this.mediapadHudIcon = document.getElementById('mediapad-hud-icon');
    this.mediapadHudText = document.getElementById('mediapad-hud-text');
    this.mediapadStatusHint = document.getElementById('mediapad-status-hint');

    if (this.unpairBtn) {
      this.unpairBtn.addEventListener('click', () => {
        haptics.click();
        this.unpair();
      });
    }
  }

  // =========================================================================
  // STEP 1: Pairing PIN (103279)
  // =========================================================================
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

    this.link.setRoom(`homeos_${pin}`);

    // Send immediately and retry briefly
    this.link.send(MESSAGE_TYPES.PAIR_REQUEST, { pin });
    setTimeout(() => {
      if (!this.isPaired) {
        this.link.send(MESSAGE_TYPES.PAIR_REQUEST, { pin });
      }
    }, 200);

    if (!isAutoConnect) {
      clearTimeout(this.pairTimeout);
      this.pairTimeout = setTimeout(() => {
        if (!this.isPaired) {
          this.triggerPinError('TV not found or code incorrect. Expected 103279.');
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
      }, 550);
    }
  }

  setFeedback(text, type = '') {
    if (this.feedbackEl) {
      this.feedbackEl.textContent = text;
      this.feedbackEl.className = `pairing-feedback ${type}`.trim();
    }
  }

  // =========================================================================
  // STEP 2: Name Input
  // =========================================================================
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

    localStorage.setItem('homemote_paired_pin', this.pairedPin);
    localStorage.setItem('homemote_username', this.username);
    console.log(`[HomeMote] Saved: PIN=${this.pairedPin}, Name=${this.username}`);

    this.link.send(MESSAGE_TYPES.USER_PROFILE, {
      username: this.username,
      pin: this.pairedPin
    });

    haptics.success();
    this.showMainScreen(this.username);
  }

  // =========================================================================
  // STEP 3: Power Controls (Center Standby <-> Top Right Active)
  // =========================================================================
  setupPowerControls() {
    // 1. Center Big Power Button (Standby View) -> Turn TV ON -> Enter EntertainmentPad
    if (this.powerMainBtn) {
      this.powerMainBtn.addEventListener('click', () => {
        haptics.doublePulse();
        console.log('[HomeMote] Powering ON HomeOS -> Flow to EntertainmentPad...');
        this.powerOn();
      });
    }

    // 2. Compact Top Right Power Button (Active View) -> Turn TV OFF -> Return to Standby
    if (this.powerActiveBtn) {
      this.powerActiveBtn.addEventListener('click', () => {
        haptics.doublePulse();
        console.log('[HomeMote] Powering OFF HomeOS -> Return to Standby...');
        this.powerOff();
      });
    }
  }

  powerOn() {
    this.isPoweredOn = true;
    this.link.send(MESSAGE_TYPES.POWER, { action: 'ON', user: this.username });

    // Transition from Standby to Active View:
    // Center power button disappears; top bar + body modes + universal footer appear
    if (this.standbyView) this.standbyView.classList.add('hidden');
    if (this.activeView) this.activeView.classList.remove('hidden');

    // "Flow: power button > clicked > entertainmentpad"
    this.switchMode('entertainment');
  }

  powerOff() {
    this.isPoweredOn = false;
    this.link.send(MESSAGE_TYPES.POWER, { action: 'OFF', user: this.username });

    // Revert back to Standby View (Centered Power Button)
    if (this.activeView) this.activeView.classList.add('hidden');
    if (this.standbyView) this.standbyView.classList.remove('hidden');
  }

  // =========================================================================
  // Top Left Green Capsule (Connected <-> Code for 10s)
  // =========================================================================
  setupConnectedCapsule() {
    if (!this.capsuleBtn) return;

    this.capsuleBtn.addEventListener('click', () => {
      haptics.click();
      this.toggleCapsuleCode();
    });
  }

  toggleCapsuleCode() {
    if (this.isShowingCapsulePin) {
      this.revertCapsuleToConnected();
    } else {
      this.isShowingCapsulePin = true;
      const code = this.pairedPin || '103279';
      this.capsuleBtn.classList.add('showing-pin');
      this.capsuleLabel.textContent = `PIN: ${code}`;

      clearTimeout(this.capsuleTimer);
      this.capsuleTimer = setTimeout(() => {
        this.revertCapsuleToConnected();
      }, 10000);
    }
  }

  revertCapsuleToConnected() {
    this.isShowingCapsulePin = false;
    clearTimeout(this.capsuleTimer);
    if (this.capsuleBtn) this.capsuleBtn.classList.remove('showing-pin');
    if (this.capsuleLabel) this.capsuleLabel.textContent = 'Connected';
  }

  // =========================================================================
  // PAD 1: EntertainmentPad (All OTTs with uploaded icons, 2 in a row)
  // =========================================================================
  setupEntertainmentGrid() {
    const ottCards = document.querySelectorAll('.ott-card');
    ottCards.forEach(card => {
      card.addEventListener('click', () => {
        const appId = card.getAttribute('data-app-id');
        const title = card.getAttribute('data-title');

        haptics.select();
        console.log(`[HomeMote] Flow: OTT App chosen (${title}) -> Opening on HomeOS -> Switching to Freepad...`);

        // Signal to HomeOS to open OTT app on TV
        this.link.send(MESSAGE_TYPES.OPEN_APP, {
          appId: appId,
          title: title,
          user: this.username
        });

        // "Flow: app chosen > freepad"
        this.switchMode('freepad');
      });
    });
  }

  // =========================================================================
  // PAD 2: Freepad (Fullscreen Trackpad)
  // =========================================================================
  setupFreepadSurface() {
    if (!this.freepadSurface) return;

    this.attachTrackpadListeners(this.freepadSurface, this.freepadRipple, (type, detail) => {
      if (type === 'move') {
        this.link.send(MESSAGE_TYPES.CURSOR_MOVE, { dx: detail.dx, dy: detail.dy });
      } else if (type === 'click') {
        haptics.click();
        this.link.send(MESSAGE_TYPES.CURSOR_CLICK, { action: 'press' });
        setTimeout(() => {
          this.link.send(MESSAGE_TYPES.CURSOR_CLICK, { action: 'release' });
        }, 80);
      }
    });
  }

  // =========================================================================
  // PAD 3: Mediapad (Vertical Trackpad + Double-Tap Seek & Play/Pause)
  // =========================================================================
  setupMediapadSurface() {
    if (!this.mediapadSurface) return;

    // Attach base cursor tracking
    this.attachTrackpadListeners(this.mediapadSurface, this.mediapadRipple, (type, detail) => {
      if (type === 'move') {
        this.link.send(MESSAGE_TYPES.CURSOR_MOVE, { dx: detail.dx, dy: detail.dy });
      }
    });

    // Double-Tap Gestures:
    // Left: Seek -10s | Center: Pause/Play | Right: Seek +10s
    this.mediapadSurface.addEventListener('pointerdown', (e) => {
      const now = Date.now();
      const rect = this.mediapadSurface.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const clickY = e.clientY - rect.top;
      const xRatio = clickX / rect.width;

      const timeDiff = now - this.lastTapTime;
      const dist = Math.hypot(clickX - this.lastTapX, clickY - this.lastTapY);

      if (timeDiff < 340 && dist < 35) {
        clearTimeout(this.singleTapTimeout);
        this.handleMediapadDoubleTap(xRatio);
        this.lastTapTime = 0;
      } else {
        this.lastTapTime = now;
        this.lastTapX = clickX;
        this.lastTapY = clickY;

        this.singleTapTimeout = setTimeout(() => {
          // Single tap fallback
        }, 350);
      }
    });
  }

  handleMediapadDoubleTap(xRatio) {
    if (xRatio < 0.35) {
      // LEFT SIDE: Seek Backward -10s
      haptics.medium();
      console.log('[HomeMote] Mediapad Double Tap: Seek -10s');
      this.link.send(MESSAGE_TYPES.MEDIA_SEEK, { direction: 'BACKWARD', seconds: 10 });
      this.showMediapadHud('⏪', 'Seek -10s');
    } else if (xRatio > 0.65) {
      // RIGHT SIDE: Seek Forward +10s
      haptics.medium();
      console.log('[HomeMote] Mediapad Double Tap: Seek +10s');
      this.link.send(MESSAGE_TYPES.MEDIA_SEEK, { direction: 'FORWARD', seconds: 10 });
      this.showMediapadHud('⏩', 'Seek +10s');
    } else {
      // CENTER: Pause / Play Toggle
      haptics.doublePulse();
      console.log('[HomeMote] Mediapad Double Tap: Play / Pause Toggle');
      this.link.send(MESSAGE_TYPES.PLAY_PAUSE, {});
      this.showMediapadHud('⏯', 'Play / Pause');
    }
  }

  showMediapadHud(icon, text) {
    if (!this.mediapadHud) return;
    if (this.mediapadHudIcon) this.mediapadHudIcon.textContent = icon;
    if (this.mediapadHudText) this.mediapadHudText.textContent = text;

    this.mediapadHud.classList.remove('hidden');
    clearTimeout(this.hudTimeout);
    this.hudTimeout = setTimeout(() => {
      if (this.mediapadHud) this.mediapadHud.classList.add('hidden');
    }, 1100);
  }

  // =========================================================================
  // UNIVERSAL FOOTER: Back | Home | Volume | AI (Icons Only)
  // =========================================================================
  setupUniversalFooter() {
    // 1. Back Button
    if (this.btnFooterBack) {
      this.btnFooterBack.addEventListener('click', () => {
        haptics.click();
        console.log('[HomeMote] Universal Footer: Back');
        this.link.send(MESSAGE_TYPES.BACK, {});

        // Dynamic navigation flow on Back:
        if (this.currentMode === 'mediapad') {
          this.switchMode('freepad');
        } else if (this.currentMode === 'freepad') {
          this.switchMode('entertainment');
        }
      });
    }

    // 2. Home Button -> Returns to EntertainmentPad & Homescreen
    if (this.btnFooterHome) {
      this.btnFooterHome.addEventListener('click', () => {
        haptics.select();
        console.log('[HomeMote] Universal Footer: Home');
        this.link.send(MESSAGE_TYPES.HOME, {});
        this.switchMode('entertainment');
      });
    }

    // 3. Volume Button -> Toggles Volume HUD on TV
    if (this.btnFooterVolume) {
      this.btnFooterVolume.addEventListener('click', () => {
        haptics.tick();
        console.log('[HomeMote] Universal Footer: Volume');
        this.link.send(MESSAGE_TYPES.VOLUME, { action: 'TOGGLE' });
      });
    }

    // 4. AI Button -> Activates AI Assistant / Siri on TV
    if (this.btnFooterAi) {
      this.btnFooterAi.addEventListener('click', () => {
        haptics.doublePulse();
        console.log('[HomeMote] Universal Footer: AI Assistant');
        this.link.send(MESSAGE_TYPES.VOICE_SEARCH, { query: 'AI_TRIGGER' });
      });
    }
  }

  // =========================================================================
  // Mode Transition Engine (EntertainmentPad <-> Freepad <-> Mediapad)
  // =========================================================================
  switchMode(mode) {
    if (!this.modePanels[mode]) return;
    this.currentMode = mode;

    Object.keys(this.modePanels).forEach(key => {
      if (key === mode) {
        this.modePanels[key].classList.remove('hidden');
        this.modePanels[key].classList.add('active');
      } else {
        this.modePanels[key].classList.add('hidden');
        this.modePanels[key].classList.remove('active');
      }
    });

    console.log(`[HomeMote] Pad active: ${mode}`);
  }

  // =========================================================================
  // Shared Tactile Trackpad Listener Engine
  // =========================================================================
  attachTrackpadListeners(surface, rippleEl, callback) {
    let isDown = false;
    let startX = 0, startY = 0, startTime = 0;
    let lastX = 0, lastY = 0;
    let totalMoved = 0;

    const onDown = (e) => {
      isDown = true;
      startX = e.clientX;
      startY = e.clientY;
      lastX = e.clientX;
      lastY = e.clientY;
      startTime = Date.now();
      totalMoved = 0;

      const rect = surface.getBoundingClientRect();
      if (rippleEl) {
        rippleEl.style.left = `${e.clientX - rect.left}px`;
        rippleEl.style.top = `${e.clientY - rect.top}px`;
        rippleEl.classList.add('active');
      }

      surface.setPointerCapture?.(e.pointerId);
    };

    const onMove = (e) => {
      if (!isDown) return;
      const dx = e.clientX - lastX;
      const dy = e.clientY - lastY;
      lastX = e.clientX;
      lastY = e.clientY;
      totalMoved += Math.hypot(dx, dy);

      if (Math.abs(dx) > 0.2 || Math.abs(dy) > 0.2) {
        callback('move', { dx, dy });
      }

      const rect = surface.getBoundingClientRect();
      if (rippleEl) {
        rippleEl.style.left = `${e.clientX - rect.left}px`;
        rippleEl.style.top = `${e.clientY - rect.top}px`;
      }
    };

    const onUp = (e) => {
      if (!isDown) return;
      isDown = false;
      const duration = Date.now() - startTime;

      if (rippleEl) rippleEl.classList.remove('active');

      if (duration < 280 && totalMoved < 14) {
        callback('click', {});
      }
    };

    surface.addEventListener('pointerdown', onDown);
    surface.addEventListener('pointermove', onMove);
    surface.addEventListener('pointerup', onUp);
    surface.addEventListener('pointercancel', onUp);
  }

  // =========================================================================
  // Screen Transitions & Setup Handshake
  // =========================================================================
  showPairingScreen() {
    if (this.pairingScreen) this.pairingScreen.classList.remove('hidden');
    if (this.nameScreen) this.nameScreen.classList.add('hidden');
    if (this.mainScreen) this.mainScreen.classList.add('hidden');
  }

  showNameScreen() {
    if (this.pairingScreen) this.pairingScreen.classList.add('hidden');
    if (this.nameScreen) this.nameScreen.classList.remove('hidden');
    if (this.mainScreen) this.mainScreen.classList.add('hidden');
    setTimeout(() => {
      if (this.nameInput) this.nameInput.focus();
    }, 200);
  }

  showMainScreen(username) {
    this.isPaired = true;
    if (this.pairingScreen) this.pairingScreen.classList.add('hidden');
    if (this.nameScreen) this.nameScreen.classList.add('hidden');
    if (this.mainScreen) this.mainScreen.classList.remove('hidden');

    if (this.standbyUserNameEl) {
      this.standbyUserNameEl.textContent = username ? `${username}'s HomeMote` : 'HomeMote';
    }

    if (!this.isPoweredOn) {
      if (this.standbyView) this.standbyView.classList.remove('hidden');
      if (this.activeView) this.activeView.classList.add('hidden');
    }
  }

  unpair() {
    this.link.send(MESSAGE_TYPES.UNPAIR, { pin: this.pairedPin, username: this.username });
    this.isPaired = false;
    this.isPoweredOn = false;
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

  // =========================================================================
  // Real-time Link Events
  // =========================================================================
  setupLinkEvents() {
    this.link.on(MESSAGE_TYPES.PAIR_ACCEPTED, (payload) => {
      console.log('[HomeMote] Pairing Accepted by HomeOS:', payload);
      clearTimeout(this.pairTimeout);
      this.isPaired = true;
      this.setFeedback('', '');

      const pin = payload?.pin || this.enteredPin.join('');
      this.pendingPin = pin;

      if (!this.username) {
        haptics.click();
        this.showNameScreen();
      } else {
        haptics.success();
        this.showMainScreen(this.username);
      }
    });

    this.link.on(MESSAGE_TYPES.PAIR_REJECTED, (payload) => {
      clearTimeout(this.pairTimeout);
      this.triggerPinError(payload?.error || 'Incorrect PIN code. Expected 103279.');
    });

    // "Flow: recieved input stating media is playing > mediapad"
    this.link.on(MESSAGE_TYPES.MEDIA_STATUS, (payload) => {
      console.log('[HomeMote] Received Media Status from HomeOS:', payload);
      if (payload?.isPlaying) {
        if (this.mediapadStatusHint && payload?.title) {
          this.mediapadStatusHint.textContent = `Now Playing: ${payload.title}`;
        }
        // Auto-switch to Mediapad!
        if (this.isPoweredOn && this.currentMode !== 'mediapad') {
          haptics.tick();
          this.switchMode('mediapad');
        }
      }
    });

    // Remote sync for Power State from HomeOS
    this.link.on(MESSAGE_TYPES.POWER_STATE, (payload) => {
      if (payload?.isPoweredOn && !this.isPoweredOn) {
        this.powerOn();
      } else if (!payload?.isPoweredOn && this.isPoweredOn) {
        this.powerOff();
      }
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
