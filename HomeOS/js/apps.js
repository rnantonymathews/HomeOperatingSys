/**
 * HomeOS App Registry & App Grid Builder
 */

export const APPS = [
  {
    id: 'tv_plus',
    title: 'Apple TV+',
    category: 'Entertainment',
    iconGradient: 'linear-gradient(135deg, #111111, #333333)',
    iconSvg: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.37c.63-.78 1.06-1.85.94-2.93-.91.04-2.02.61-2.67 1.39-.58.68-1.08 1.77-.95 2.82 1.02.08 2.05-.5 2.68-1.28z"/></svg>`,
    badge: '4K HDR',
    topShelf: {
      headline: 'The Morning Show',
      tagline: 'Chaos is the new normal. Stream the new season exclusively.',
      bgGradient: 'linear-gradient(to top, rgba(10,12,18,0.95), rgba(10,12,18,0.2)), radial-gradient(circle at 75% 30%, #3a1c71, #1a102f, #0a0c12)',
      actions: ['Play S3:E1', 'View Details']
    }
  },
  {
    id: 'music',
    title: 'Music',
    category: 'Audio',
    iconGradient: 'linear-gradient(135deg, #ff2d55, #ff375f)',
    iconSvg: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/></svg>`,
    badge: 'Lossless',
    topShelf: {
      headline: 'Spatial Audio Favorites',
      tagline: 'Immerse yourself in sound all around you with Dolby Atmos.',
      bgGradient: 'linear-gradient(to top, rgba(10,12,18,0.95), rgba(10,12,18,0.2)), radial-gradient(circle at 75% 30%, #d62447, #5c0e29, #0a0c12)',
      actions: ['Listen Now', 'Browse Library']
    }
  },
  {
    id: 'arcade',
    title: 'Arcade',
    category: 'Games',
    iconGradient: 'linear-gradient(135deg, #f35626, #feab3a)',
    iconSvg: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M21 6H3c-1.1 0-2 .9-2 2v8c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm-10 7H8v3H6v-3H3v-2h3V8h2v3h3v2zm4.5 2c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm4-3c-.83 0-1.5-.67-1.5-1.5S18.67 9 19.5 9s1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"/></svg>`,
    badge: 'Game Controller',
    topShelf: {
      headline: 'Sneaky Sasquatch',
      tagline: 'Live the life of a Sasquatch and sneak around the campsite.',
      bgGradient: 'linear-gradient(to top, rgba(10,12,18,0.95), rgba(10,12,18,0.2)), radial-gradient(circle at 75% 30%, #ea580c, #7c2d12, #0a0c12)',
      actions: ['Continue Game', 'Explore Arcade']
    }
  },
  {
    id: 'photos',
    title: 'Photos',
    category: 'Memories',
    iconGradient: 'linear-gradient(135deg, #007aff, #5856d6)',
    iconSvg: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/></svg>`,
    badge: 'iCloud',
    topShelf: {
      headline: 'Autumn in Kyoto',
      tagline: 'Relive your favorite memories on the big screen in crisp 4K.',
      bgGradient: 'linear-gradient(to top, rgba(10,12,18,0.95), rgba(10,12,18,0.2)), radial-gradient(circle at 75% 30%, #2563eb, #1e3a8a, #0a0c12)',
      actions: ['Play Slideshow', 'All Albums']
    }
  },
  {
    id: 'youtube',
    title: 'YouTube',
    category: 'Video',
    iconGradient: 'linear-gradient(135deg, #e50914, #990000)',
    iconSvg: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M21.58 7.19c-.23-.86-.91-1.54-1.77-1.77C18.25 5 12 5 12 5s-6.25 0-7.81.42c-.86.23-1.54.91-1.77 1.77C2 8.75 2 12 2 12s0 3.25.42 4.81c.23.86.91 1.54 1.77 1.77C5.75 19 12 19 12 19s6.25 0 7.81-.42c.86-.23 1.54-.91 1.77-1.77C22 15.25 22 12 22 12s0-3.25-.42-4.81zM10 15V9l5.2 3-5.2 3z"/></svg>`,
    badge: 'Subscribed',
    topShelf: {
      headline: 'NASA 4K Earth Livestream',
      tagline: 'Watch ultra high definition views of planet Earth from the ISS.',
      bgGradient: 'linear-gradient(to top, rgba(10,12,18,0.95), rgba(10,12,18,0.2)), radial-gradient(circle at 75% 30%, #b91c1c, #450a0a, #0a0c12)',
      actions: ['Watch Live', 'Subscriptions']
    }
  },
  {
    id: 'browser',
    title: 'Web WebOS',
    category: 'Internet',
    iconGradient: 'linear-gradient(135deg, #0284c7, #0369a1)',
    iconSvg: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/></svg>`,
    badge: 'Full Web',
    topShelf: {
      headline: 'Clean Web Experience',
      tagline: 'Browse the open web directly on your TV display with remote navigation.',
      bgGradient: 'linear-gradient(to top, rgba(10,12,18,0.95), rgba(10,12,18,0.2)), radial-gradient(circle at 75% 30%, #0284c7, #082f49, #0a0c12)',
      actions: ['Open Browser', 'Bookmarks']
    }
  },
  {
    id: 'weather',
    title: 'Weather',
    category: 'Information',
    iconGradient: 'linear-gradient(135deg, #38bdf8, #1e40af)',
    iconSvg: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM19 18H6c-2.21 0-4-1.79-4-4 0-2.05 1.53-3.76 3.56-3.97l1.07-.11.5-.95C8.08 7.14 9.94 6 12 6c2.62 0 4.88 1.86 5.39 4.43l.3 1.5 1.53.11c1.56.1 2.78 1.41 2.78 2.96 0 1.65-1.35 3-3 3z"/></svg>`,
    badge: '22°C Clear',
    topShelf: {
      headline: 'Sunny & Clear · 22°',
      tagline: 'Humidity 45% · Wind 8 km/h · Sunset at 6:42 PM',
      bgGradient: 'linear-gradient(to top, rgba(10,12,18,0.95), rgba(10,12,18,0.2)), radial-gradient(circle at 75% 30%, #38bdf8, #172554, #0a0c12)',
      actions: ['7-Day Forecast', 'Radar Map']
    }
  },
  {
    id: 'settings',
    title: 'Settings',
    category: 'System',
    iconGradient: 'linear-gradient(135deg, #64748b, #334155)',
    iconSvg: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/></svg>`,
    badge: 'HomeOS 1.0',
    topShelf: {
      headline: 'HomeOS System Preferences',
      tagline: 'Manage Remote Pairing, Display 4K HDR, Audio, and Network.',
      bgGradient: 'linear-gradient(to top, rgba(10,12,18,0.95), rgba(10,12,18,0.2)), radial-gradient(circle at 75% 30%, #475569, #0f172a, #0a0c12)',
      actions: ['Remote Pairing', 'System Diagnostics']
    }
  }
];

export function renderAppGrid(container) {
  container.innerHTML = '';
  
  APPS.forEach((app, index) => {
    const card = document.createElement('div');
    card.className = 'tv-app-card tv-focusable';
    card.setAttribute('tabindex', '0');
    card.setAttribute('data-app-id', app.id);
    card.setAttribute('data-index', index);

    card.innerHTML = `
      <div class="tv-app-icon-wrap" style="background: ${app.iconGradient}">
        <div class="tv-app-sheen"></div>
        <div class="tv-app-icon-svg">${app.iconSvg}</div>
        ${app.badge ? `<span class="tv-app-badge">${app.badge}</span>` : ''}
      </div>
      <div class="tv-app-title">${app.title}</div>
    `;

    card.addEventListener('click', () => {
      launchApp(app);
    });

    container.appendChild(card);
  });
}

export function launchApp(app) {
  console.log(`[HomeOS] Launching App: ${app.title} (${app.id})`);
  const launchEvent = new CustomEvent('tvapplaunch', { detail: { app } });
  window.dispatchEvent(launchEvent);
}

