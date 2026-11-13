/**
 * HomeOS Main Controller
 * Clean canvas ready for step-by-step feature development
 */

import { HomeLink } from '../../shared/homelink.js';
import { MESSAGE_TYPES } from '../../shared/protocol.js';

class HomeOSLauncher {
  constructor() {
    const urlParams = new URLSearchParams(window.location.search);
    const roomId = urlParams.get('room') || 'homeos_default';

    this.link = new HomeLink({
      role: 'tv',
      roomId
    });

    this.init();
  }

  init() {
    console.log('[HomeOS] Launcher initialized (Clean Canvas).');

    this.link.onStatusChange((status) => {
      console.log(`[HomeOS] Connection Status: ${status}`);
    });

    this.link.on('*', (type, payload) => {
      console.log(`[HomeOS] Received remote command [${type}]:`, payload);
    });

    this.registerPWA();
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
