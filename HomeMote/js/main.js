/**
 * HomeMote Remote Controller
 * Clean canvas ready for step-by-step feature development
 */

import { HomeLink } from '../../shared/homelink.js';
import { MESSAGE_TYPES } from '../../shared/protocol.js';
import { haptics } from './haptics.js';

class HomeMoteController {
  constructor() {
    const urlParams = new URLSearchParams(window.location.search);
    const roomId = urlParams.get('room') || 'homeos_default';

    this.link = new HomeLink({
      role: 'remote',
      roomId
    });

    this.init();
  }

  init() {
    console.log('[HomeMote] Remote initialized (Clean Canvas).');

    this.link.onStatusChange((status) => {
      console.log(`[HomeMote] Connection Status: ${status}`);
      if (status === 'connected') {
        haptics.success();
      }
    });

    this.link.on('*', (type, payload) => {
      console.log(`[HomeMote] Received TV update [${type}]:`, payload);
    });

    this.registerPWA();
  }

  // Convenient helper to send commands
  sendCommand(type, payload = {}) {
    haptics.click();
    this.link.send(type, payload);
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
