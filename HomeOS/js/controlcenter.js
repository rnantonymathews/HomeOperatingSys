/**
 * HomeOS Control Center, Status Bar & Pairing Manager
 */

import { createQRCodeSvg } from './qr.js';

export class ControlCenter {
  constructor(link, nav) {
    this.link = link;
    this.nav = nav;
    this.volume = 65;
    this.isMuted = false;
    this.volumeTimer = null;
    this.screensaverActive = false;

    this.initClock();
    this.initElements();
  }

  initElements() {
    this.clockEl = document.getElementById('tv-clock');
    this.remoteStatusEl = document.getElementById('remote-status-pill');
    this.volumeHudEl = document.getElementById('volume-hud');
    this.volumeBarEl = document.getElementById('volume-level-bar');
    this.pairingModal = document.getElementById('pairing-modal');
    this.qrContainer = document.getElementById('pairing-qr-container');
    this.pairingUrlText = document.getElementById('pairing-url-text');
    this.screensaverEl = document.getElementById('screensaver-overlay');
  }

  initClock() {
    const updateTime = () => {
      const now = new Date();
      if (this.clockEl) {
        this.clockEl.textContent = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      }
    };
    updateTime();
    setInterval(updateTime, 1000);
  }

  setRemoteConnected(connected, count = 1) {
    if (!this.remoteStatusEl) return;
    if (connected) {
      this.remoteStatusEl.classList.add('connected');
      this.remoteStatusEl.innerHTML = `
        <span class="status-dot green"></span>
        <span class="status-text">${count} Remote${count > 1 ? 's' : ''} Connected</span>
      `;
    } else {
      this.remoteStatusEl.classList.remove('connected');
      this.remoteStatusEl.innerHTML = `
        <span class="status-dot red"></span>
        <span class="status-text">Pair Remote</span>
      `;
    }
  }

  showPairingModal() {
    if (!this.pairingModal) return;
    this.pairingModal.classList.remove('hidden');

    // Build remote pairing URL using current host or local IP
    const host = window.location.host;
    const protocol = window.location.protocol;
    const pairingUrl = `${protocol}//${host}/HomeMote/?room=${encodeURIComponent(this.link.roomId)}`;

    if (this.pairingUrlText) {
      this.pairingUrlText.textContent = pairingUrl;
    }

    if (this.qrContainer) {
      this.qrContainer.innerHTML = '';
      const svg = createQRCodeSvg(pairingUrl, 180);
      this.qrContainer.appendChild(svg);
    }

    this.nav.openScope('modal', this.pairingModal);
  }

  hidePairingModal() {
    if (!this.pairingModal) return;
    this.pairingModal.classList.add('hidden');
    this.nav.closeScope();
  }

  adjustVolume(action) {
    if (action === 'UP') {
      this.volume = Math.min(100, this.volume + 5);
      this.isMuted = false;
    } else if (action === 'DOWN') {
      this.volume = Math.max(0, this.volume - 5);
      this.isMuted = false;
    } else if (action === 'MUTE') {
      this.isMuted = !this.isMuted;
    }

    this.showVolumeHud();
  }

  showVolumeHud() {
    if (!this.volumeHudEl || !this.volumeBarEl) return;
    this.volumeHudEl.classList.remove('hidden');
    this.volumeHudEl.classList.add('visible');

    const effectiveVolume = this.isMuted ? 0 : this.volume;
    this.volumeBarEl.style.height = `${effectiveVolume}%`;

    const iconEl = this.volumeHudEl.querySelector('.volume-icon');
    if (iconEl) {
      iconEl.textContent = this.isMuted ? '🔇' : (this.volume > 50 ? '🔊' : '🔉');
    }

    clearTimeout(this.volumeTimer);
    this.volumeTimer = setTimeout(() => {
      this.volumeHudEl.classList.remove('visible');
      setTimeout(() => this.volumeHudEl.classList.add('hidden'), 250);
    }, 2000);
  }

  toggleScreensaver() {
    this.screensaverActive = !this.screensaverActive;
    if (this.screensaverEl) {
      if (this.screensaverActive) {
        this.screensaverEl.classList.remove('hidden');
      } else {
        this.screensaverEl.classList.add('hidden');
      }
    }
  }

  wakeFromScreensaver() {
    if (this.screensaverActive) {
      this.screensaverActive = false;
      if (this.screensaverEl) {
        this.screensaverEl.classList.add('hidden');
      }
      return true; // was sleeping
    }
    return false;
  }
}
