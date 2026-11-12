/**
 * HomeMote Main Remote Controller
 * Connects buttons, touch surface, voice, haptics, and HomeLink
 */

import { HomeLink } from '../../shared/homelink.js';
import { MESSAGE_TYPES, DIRECTIONS } from '../../shared/protocol.js';
import { TouchpadController } from './touchpad.js';
import { VoiceController } from './voice.js';
import { RemoteKeyboard } from './keyboard.js';
import { haptics } from './haptics.js';

class HomeMoteController {
  constructor() {
    // Read room from URL query or default
    const urlParams = new URLSearchParams(window.location.search);
    const roomId = urlParams.get('room') || 'homeos_default';

    this.link = new HomeLink({
      role: 'remote',
      roomId
    });

    this.init();
  }

  init() {
    console.log('[HomeMote] Initializing Apple TV Remote...');

    // 1. Setup Touchpad
    const touchpadEl = document.getElementById('touchpad-surface');
    this.touchpad = new TouchpadController(touchpadEl, {
      onNavigate: (dir) => {
        this.link.send(MESSAGE_TYPES.NAVIGATE, { direction: dir });
      },
      onSelect: () => {
        this.link.send(MESSAGE_TYPES.SELECT, { action: 'CLICK' });
      }
    });

    // 2. Setup Voice (Siri)
    const siriBtn = document.getElementById('btn-siri');
    this.voice = new VoiceController({
      onResult: (transcript) => {
        console.log('[HomeMote] Voice result:', transcript);
        this.link.send(MESSAGE_TYPES.VOICE_SEARCH, { query: transcript });
        this.showToast(`Sent: "${transcript}"`);
      },
      onStatusChange: (isListening) => {
        if (siriBtn) {
          siriBtn.classList.toggle('listening', isListening);
        }
      }
    });

    if (siriBtn) {
      siriBtn.addEventListener('click', () => {
        haptics.click();
        this.voice.toggle();
      });
    }

    // 3. Setup Remote Keyboard
    this.keyboard = new RemoteKeyboard({
      onInput: (data) => {
        this.link.send(MESSAGE_TYPES.KEYBOARD_INPUT, data);
      }
    });

    const keyboardBtn = document.getElementById('btn-keyboard-toggle');
    if (keyboardBtn) {
      keyboardBtn.addEventListener('click', () => {
        haptics.click();
        this.keyboard.toggle();
      });
    }

    // 4. Setup Hardware Buttons
    this.setupHardwareButtons();

    // 5. Setup HomeLink Listeners
    this.setupLinkEvents();

    // 6. Setup PWA Service Worker
    this.registerPWA();
  }

  setupHardwareButtons() {
    // Power
    const btnPower = document.getElementById('btn-power');
    if (btnPower) {
      btnPower.addEventListener('click', () => {
        haptics.doublePulse();
        this.link.send(MESSAGE_TYPES.POWER);
      });
    }

    // Back (<)
    const btnBack = document.getElementById('btn-back');
    if (btnBack) {
      btnBack.addEventListener('click', () => {
        haptics.click();
        this.link.send(MESSAGE_TYPES.BACK);
      });
    }

    // Home / TV
    const btnHome = document.getElementById('btn-home');
    if (btnHome) {
      btnHome.addEventListener('click', () => {
        haptics.doublePulse();
        this.link.send(MESSAGE_TYPES.HOME);
      });
    }

    // Play / Pause
    const btnPlayPause = document.getElementById('btn-play-pause');
    if (btnPlayPause) {
      btnPlayPause.addEventListener('click', () => {
        haptics.click();
        this.link.send(MESSAGE_TYPES.PLAY_PAUSE);
      });
    }

    // Mute
    const btnMute = document.getElementById('btn-mute');
    if (btnMute) {
      btnMute.addEventListener('click', () => {
        haptics.click();
        this.link.send(MESSAGE_TYPES.VOLUME, { action: 'MUTE' });
      });
    }

    // Volume Up
    const btnVolUp = document.getElementById('btn-vol-up');
    if (btnVolUp) {
      btnVolUp.addEventListener('click', () => {
        haptics.tick();
        this.link.send(MESSAGE_TYPES.VOLUME, { action: 'UP' });
      });
    }

    // Volume Down
    const btnVolDown = document.getElementById('btn-vol-down');
    if (btnVolDown) {
      btnVolDown.addEventListener('click', () => {
        haptics.tick();
        this.link.send(MESSAGE_TYPES.VOLUME, { action: 'DOWN' });
      });
    }

    // Room ID pill click allows room switching
    const roomPill = document.getElementById('remote-room-pill');
    if (roomPill) {
      roomPill.addEventListener('click', () => {
        const current = this.link.roomId;
        const newRoom = prompt('Enter HomeOS Pairing Room / PIN:', current);
        if (newRoom && newRoom.trim() !== '') {
          this.link.setRoom(newRoom.trim());
          this.updateRoomBadge(newRoom.trim());
        }
      });
    }
  }

  setupLinkEvents() {
    const statusPill = document.getElementById('connection-status-pill');
    const statusText = document.getElementById('connection-status-text');

    this.link.onStatusChange((status) => {
      console.log(`[HomeMote] Link Status: ${status}`);
      if (!statusPill || !statusText) return;

      if (status === 'connected') {
        statusPill.className = 'status-pill connected';
        statusText.textContent = 'HomeOS TV Connected';
        haptics.success();
      } else if (status === 'connecting') {
        statusPill.className = 'status-pill connecting';
        statusText.textContent = 'Connecting...';
      } else {
        statusPill.className = 'status-pill disconnected';
        statusText.textContent = 'Disconnected';
      }
    });

    // TV Status Sync (Active App, Volume, etc.)
    this.link.on(MESSAGE_TYPES.STATUS_SYNC, (data) => {
      console.log('[HomeMote] TV Status Sync:', data);
      const appBadge = document.getElementById('tv-active-app');
      if (appBadge) {
        appBadge.textContent = data.activeApp ? `App: ${data.activeApp}` : 'Home Screen';
      }
    });

    // Request Keyboard Trigger from TV
    this.link.on(MESSAGE_TYPES.REQUEST_KEYBOARD, (data) => {
      haptics.click();
      this.keyboard.show(data?.placeholder || 'Type on TV...');
    });

    this.link.on(MESSAGE_TYPES.DISMISS_KEYBOARD, () => {
      this.keyboard.hide();
    });
  }

  updateRoomBadge(room) {
    const badge = document.getElementById('remote-room-text');
    if (badge) {
      badge.textContent = `Room: ${room}`;
    }
  }

  showToast(message) {
    let toast = document.getElementById('remote-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'remote-toast';
      document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.classList.add('visible');
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => {
      toast.classList.remove('visible');
    }, 2000);
  }

  registerPWA() {
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
          .then((reg) => console.log('[HomeMote] ServiceWorker registered with scope:', reg.scope))
          .catch((err) => console.warn('[HomeMote] ServiceWorker registration failed:', err));
      });
    }

    // PWA Install prompt
    let deferredPrompt;
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      deferredPrompt = e;
      const installBtn = document.getElementById('pwa-remote-install');
      if (installBtn) {
        installBtn.classList.remove('hidden');
        installBtn.addEventListener('click', () => {
          deferredPrompt.prompt();
          deferredPrompt.userChoice.then((choice) => {
            if (choice.outcome === 'accepted') {
              console.log('[HomeMote] PWA installed');
            }
            deferredPrompt = null;
            installBtn.classList.add('hidden');
          });
        });
      }
    });
  }
}

// Bootstrap once DOM is loaded
window.addEventListener('DOMContentLoaded', () => {
  window.homeMote = new HomeMoteController();
});
