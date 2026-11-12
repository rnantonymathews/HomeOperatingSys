/**
 * HomeOS Main Controller
 * Orchestrates communication, spatial navigation, sound, UI rendering, and PWA setup
 */

import { HomeLink } from '../../shared/homelink.js';
import { MESSAGE_TYPES } from '../../shared/protocol.js';
import { SpatialNavigation } from './navigation.js';
import { sounds } from './sound.js';
import { renderAppGrid, APPS, launchApp } from './apps.js';
import { ControlCenter } from './controlcenter.js';
import { WallpaperEngine, SEASONS, TIMES_OF_DAY } from './wallpaper.js';

class HomeOSLauncher {
  constructor() {
    this.nav = new SpatialNavigation();

    // Read room from URL query or default
    const urlParams = new URLSearchParams(window.location.search);
    const roomId = urlParams.get('room') || 'homeos_default';

    this.link = new HomeLink({
      role: 'tv',
      roomId
    });

    this.controlCenter = new ControlCenter(this.link, this.nav);
    this.activeApp = null;
    this.searchQuery = '';

    this.init();
  }

  init() {
    console.log('[HomeOS] Initializing tvOS Launcher...');

    // Render Grid
    const appGridContainer = document.getElementById('tv-app-grid');
    if (appGridContainer) {
      renderAppGrid(appGridContainer);
    }

    // Initialize Dynamic Wallpaper Engine
    this.wallpaper = new WallpaperEngine();

    // Refresh navigation focusables
    this.nav.refreshFocusables();

    // Setup Communication Handlers
    this.setupLinkEvents();

    // Setup UI Event Listeners
    this.setupUIEvents();

    // Register Service Worker for PWA
    this.registerPWA();
  }

  setupLinkEvents() {
    // Connection state
    this.link.onStatusChange((status) => {
      console.log(`[HomeOS] Connection Status: ${status}`);
      this.controlCenter.setRemoteConnected(status === 'connected');
      if (status === 'connected') {
        sounds.playConnectChime();
        this.broadcastStatus();
      }
    });

    // Handle peer joined
    this.link.on('PEER_JOINED', (payload) => {
      console.log('[HomeOS] Remote joined room:', payload);
      this.controlCenter.setRemoteConnected(true, payload.peerCount || 1);
      sounds.playConnectChime();
      this.broadcastStatus();
    });

    // Remote Navigation Commands
    this.link.on(MESSAGE_TYPES.NAVIGATE, (payload) => {
      if (this.controlCenter.wakeFromScreensaver()) return;
      if (payload && payload.direction) {
        this.nav.move(payload.direction);
      }
    });

    this.link.on(MESSAGE_TYPES.SELECT, () => {
      if (this.controlCenter.wakeFromScreensaver()) return;
      this.nav.selectCurrent();
    });

    this.link.on(MESSAGE_TYPES.BACK, () => {
      if (this.controlCenter.wakeFromScreensaver()) return;
      this.handleBack();
    });

    this.link.on(MESSAGE_TYPES.HOME, () => {
      if (this.controlCenter.wakeFromScreensaver()) return;
      this.handleHome();
    });

    this.link.on(MESSAGE_TYPES.PLAY_PAUSE, () => {
      if (this.controlCenter.wakeFromScreensaver()) return;
      sounds.playSelect();
      this.showToast('Media: Play / Pause');
    });

    this.link.on(MESSAGE_TYPES.VOLUME, (payload) => {
      this.controlCenter.adjustVolume(payload?.action || 'UP');
      this.broadcastStatus();
    });

    this.link.on(MESSAGE_TYPES.POWER, () => {
      sounds.playBack();
      this.controlCenter.toggleScreensaver();
    });

    // Voice Dictation from Remote
    this.link.on(MESSAGE_TYPES.VOICE_SEARCH, (payload) => {
      if (this.controlCenter.wakeFromScreensaver()) return;
      if (payload?.query) {
        this.handleVoiceQuery(payload.query);
      }
    });

    // Remote Keyboard typing
    this.link.on(MESSAGE_TYPES.KEYBOARD_INPUT, (payload) => {
      if (this.controlCenter.wakeFromScreensaver()) return;
      this.handleKeyboardInput(payload);
    });
  }

  setupUIEvents() {
    // Focus change updates the Top Shelf preview
    window.addEventListener('tvfocuschange', (e) => {
      const el = e.detail.element;
      const appId = el.getAttribute('data-app-id');
      const app = APPS.find(a => a.id === appId);
      if (app) {
        this.updateTopShelf(app);
      }
    });

    // App Launch
    window.addEventListener('tvapplaunch', (e) => {
      const app = e.detail.app;
      sounds.playSelect();
      this.openAppModal(app);
    });

    // Back Press
    window.addEventListener('tvbackpress', () => {
      this.handleBack();
    });

    // Remote status button clicked opens pairing modal
    const remotePill = document.getElementById('remote-status-pill');
    if (remotePill) {
      remotePill.addEventListener('click', () => {
        this.controlCenter.showPairingModal();
      });
    }

    // Close pairing modal button
    const closePairingBtn = document.getElementById('btn-close-pairing');
    if (closePairingBtn) {
      closePairingBtn.addEventListener('click', () => {
        this.controlCenter.hidePairingModal();
      });
    }

    // App modal close button
    const closeAppBtn = document.getElementById('btn-close-app');
    if (closeAppBtn) {
      closeAppBtn.addEventListener('click', () => {
        this.closeAppModal();
      });
    }

    // Wallpaper change event listener
    window.addEventListener('wallpaperchange', (e) => {
      if (e.detail?.title) {
        this.showToast(`Wallpaper: ${e.detail.title}`);
      }
    });
  }

  updateTopShelf(app) {
    const banner = document.getElementById('top-shelf-banner');
    const headline = document.getElementById('top-shelf-headline');
    const tagline = document.getElementById('top-shelf-tagline');
    const badge = document.getElementById('top-shelf-badge');
    const actionsContainer = document.getElementById('top-shelf-actions');

    if (!app || !app.topShelf) return;

    if (banner) {
      banner.style.background = app.topShelf.bgGradient;
    }
    if (headline) {
      headline.textContent = app.topShelf.headline;
    }
    if (tagline) {
      tagline.textContent = app.topShelf.tagline;
    }
    if (badge) {
      badge.textContent = app.category.toUpperCase();
    }
    if (actionsContainer && app.topShelf.actions) {
      actionsContainer.innerHTML = '';
      app.topShelf.actions.forEach((actName, idx) => {
        const btn = document.createElement('button');
        btn.className = 'top-shelf-btn tv-focusable';
        btn.tabIndex = 0;
        btn.textContent = actName;
        btn.addEventListener('click', () => {
          this.showToast(`Action: ${actName}`);
        });
        actionsContainer.appendChild(btn);
      });
    }
  }

  openAppModal(app) {
    this.activeApp = app;
    const modal = document.getElementById('app-viewer-modal');
    const titleEl = document.getElementById('app-viewer-title');
    const iconEl = document.getElementById('app-viewer-icon');
    const descEl = document.getElementById('app-viewer-desc');

    if (titleEl) titleEl.textContent = app.title;
    if (iconEl) iconEl.innerHTML = app.iconSvg;
    if (descEl) descEl.textContent = `${app.title} is now running in full-screen tvOS Mode.`;

    if (modal) {
      modal.classList.remove('hidden');
      this.nav.openScope('modal', modal);
    }

    this.broadcastStatus();
  }

  closeAppModal() {
    this.activeApp = null;
    const modal = document.getElementById('app-viewer-modal');
    if (modal) {
      modal.classList.add('hidden');
      this.nav.closeScope();
    }
    sounds.playBack();
    this.broadcastStatus();
  }

  handleBack() {
    sounds.playBack();
    if (this.activeApp) {
      this.closeAppModal();
    } else if (this.controlCenter.pairingModal && !this.controlCenter.pairingModal.classList.contains('hidden')) {
      this.controlCenter.hidePairingModal();
    } else {
      this.showToast('At Home Screen');
    }
  }

  handleHome() {
    sounds.playBack();
    if (this.activeApp) {
      this.closeAppModal();
    }
    if (this.controlCenter.pairingModal) {
      this.controlCenter.hidePairingModal();
    }
    // Focus first app
    const firstCard = document.querySelector('.tv-app-card');
    if (firstCard) {
      this.nav.setFocus(firstCard);
    }
  }

  handleVoiceQuery(query) {
    sounds.playSelect();
    this.showToast(`Siri: "${query}"`);
    console.log(`[HomeOS] Voice query: ${query}`);
  }

  handleKeyboardInput(payload) {
    if (payload.action === 'TYPE') {
      this.searchQuery += payload.text;
    } else if (payload.action === 'BACKSPACE') {
      this.searchQuery = this.searchQuery.slice(0, -1);
    } else if (payload.action === 'CLEAR') {
      this.searchQuery = '';
    }
    this.showToast(`Search: ${this.searchQuery}`);
  }

  broadcastStatus() {
    this.link.send(MESSAGE_TYPES.STATUS_SYNC, {
      activeApp: this.activeApp?.title || null,
      volume: this.controlCenter.volume,
      muted: this.controlCenter.isMuted,
      keyboardActive: false,
      currentTime: new Date().toISOString()
    });
  }

  showToast(message) {
    let toast = document.getElementById('tv-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'tv-toast';
      document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.classList.add('visible');
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => {
      toast.classList.remove('visible');
    }, 2200);
  }

  registerPWA() {
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
          .then((reg) => console.log('[HomeOS] ServiceWorker registered with scope:', reg.scope))
          .catch((err) => console.warn('[HomeOS] ServiceWorker registration failed:', err));
      });
    }

    // PWA Install Prompt
    let deferredPrompt;
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      deferredPrompt = e;
      const installBtn = document.getElementById('pwa-install-btn');
      if (installBtn) {
        installBtn.classList.remove('hidden');
        installBtn.addEventListener('click', () => {
          deferredPrompt.prompt();
          deferredPrompt.userChoice.then((choiceResult) => {
            if (choiceResult.outcome === 'accepted') {
              console.log('[HomeOS] User accepted the install prompt');
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
  window.homeOS = new HomeOSLauncher();
});
