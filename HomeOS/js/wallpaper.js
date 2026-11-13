/**
 * HomeOS Dynamic Wallpaper Engine
 * Handles wallpaper switching across 4 seasons and 4 times of day:
 * Seasons: summer, winter, rainy (cloudy only), cherry_blossom
 * Times: 03am, 09am, 03pm, 09pm
 */

export const SEASONS = {
  SUMMER: 'summer',
  WINTER: 'winter',
  RAINY: 'rainy',
  CHERRY_BLOSSOM: 'cherry_blossom'
};

export const TIMES_OF_DAY = {
  T_03AM: '03am',
  T_09AM: '09am',
  T_03PM: '03pm',
  T_09PM: '09pm'
};

export const WALLPAPER_CATALOG = [
  // Summer
  { id: 'summer_03am', season: 'summer', time: '03am', title: 'Summer Midnight (3 AM)', file: 'summer_03am.jpg' },
  { id: 'summer_09am', season: 'summer', time: '09am', title: 'Summer Morning (9 AM)', file: 'summer_09am.jpg' },
  { id: 'summer_03pm', season: 'summer', time: '03pm', title: 'Summer Afternoon (3 PM)', file: 'summer_03pm.jpg' },
  { id: 'summer_09pm', season: 'summer', time: '09pm', title: 'Summer Twilight (9 PM)', file: 'summer_09pm.jpg' },

  // Winter
  { id: 'winter_03am', season: 'winter', time: '03am', title: 'Winter Midnight (3 AM)', file: 'winter_03am.jpg' },
  { id: 'winter_09am', season: 'winter', time: '09am', title: 'Winter Morning (9 AM)', file: 'winter_09am.jpg' },
  { id: 'winter_03pm', season: 'winter', time: '03pm', title: 'Winter Afternoon (3 PM)', file: 'winter_03pm.jpg' },
  { id: 'winter_09pm', season: 'winter', time: '09pm', title: 'Winter Twilight (9 PM)', file: 'winter_09pm.jpg' },

  // Rainy (Cloudy only)
  { id: 'rainy_cloudy_03am', season: 'rainy', time: '03am', title: 'Overcast Night (3 AM)', file: 'rainy_cloudy_03am.jpg' },
  { id: 'rainy_cloudy_09am', season: 'rainy', time: '09am', title: 'Overcast Morning (9 AM)', file: 'rainy_cloudy_09am.jpg' },
  { id: 'rainy_cloudy_03pm', season: 'rainy', time: '03pm', title: 'Overcast Afternoon (3 PM)', file: 'rainy_cloudy_03pm.jpg' },
  { id: 'rainy_cloudy_09pm', season: 'rainy', time: '09pm', title: 'Overcast Dusk (9 PM)', file: 'rainy_cloudy_09pm.jpg' },

  // Cherry Blossom
  { id: 'cherry_blossom_03am', season: 'cherry_blossom', time: '03am', title: 'Cherry Blossom Night (3 AM)', file: 'cherry_blossom_03am.jpg' },
  { id: 'cherry_blossom_09am', season: 'cherry_blossom', time: '09am', title: 'Cherry Blossom Morning (9 AM)', file: 'cherry_blossom_09am.jpg' },
  { id: 'cherry_blossom_03pm', season: 'cherry_blossom', time: '03pm', title: 'Cherry Blossom Afternoon (3 PM)', file: 'cherry_blossom_03pm.jpg' },
  { id: 'cherry_blossom_09pm', season: 'cherry_blossom', time: '09pm', title: 'Cherry Blossom Dusk (9 PM)', file: 'cherry_blossom_09pm.jpg' },
];

export class WallpaperEngine {
  constructor() {
    this.currentSeason = SEASONS.SUMMER;
    this.currentTimeOfDay = TIMES_OF_DAY.T_03PM;
    this.container = null;
    this.currentWallpaperEl = null;

    this.init();
  }

  init() {
    this.container = document.getElementById('tv-dynamic-wallpaper');
    if (!this.container) {
      this.container = document.createElement('div');
      this.container.id = 'tv-dynamic-wallpaper';
      this.container.className = 'tv-wallpaper-container';
      document.body.prepend(this.container);
    }

    // Apply default wallpaper
    this.applyCurrent();
  }

  getMatchedTimeOfDay(date = new Date()) {
    const hour = date.getHours();
    if (hour >= 0 && hour < 6) return TIMES_OF_DAY.T_03AM;
    if (hour >= 6 && hour < 12) return TIMES_OF_DAY.T_09AM;
    if (hour >= 12 && hour < 18) return TIMES_OF_DAY.T_03PM;
    return TIMES_OF_DAY.T_09PM;
  }

  setSeason(season) {
    if (Object.values(SEASONS).includes(season)) {
      this.currentSeason = season;
      this.applyCurrent();
    }
  }

  setTimeOfDay(time) {
    if (Object.values(TIMES_OF_DAY).includes(time)) {
      this.currentTimeOfDay = time;
      this.applyCurrent();
    }
  }

  applyCurrent() {
    if (!this.container) return;

    const matched = WALLPAPER_CATALOG.find(
      w => w.season === this.currentSeason && w.time === this.currentTimeOfDay
    );

    const filename = matched ? matched.file : 'reference.jpg';
    const imagePath = `Wallpaper/${filename}`;

    // Create new background layer for smooth cross-fade
    const newLayer = document.createElement('div');
    newLayer.className = 'wallpaper-layer';
    
    // Test if image exists or fallback to reference / styled ambient backdrop
    const img = new Image();
    img.src = imagePath;
    img.onload = () => {
      newLayer.style.backgroundImage = `url('${imagePath}')`;
    };
    img.onerror = () => {
      // Fallback to reference.jpg with color grading filter
      newLayer.style.backgroundImage = `url('Wallpaper/reference.jpg')`;
      newLayer.style.filter = this.getGradingFilter(this.currentSeason, this.currentTimeOfDay);
    };

    this.container.appendChild(newLayer);

    // Fade in
    requestAnimationFrame(() => {
      newLayer.classList.add('active');
    });

    // Remove old layer
    if (this.currentWallpaperEl) {
      const oldLayer = this.currentWallpaperEl;
      setTimeout(() => oldLayer.remove(), 800);
    }
    this.currentWallpaperEl = newLayer;

    // Dispatch event
    window.dispatchEvent(new CustomEvent('wallpaperchange', {
      detail: { season: this.currentSeason, time: this.currentTimeOfDay, title: matched?.title }
    }));
  }

  getGradingFilter(season, time) {
    let filter = '';
    
    // Time filter
    if (time === TIMES_OF_DAY.T_03AM) {
      filter += 'brightness(0.35) hue-rotate(210deg) saturate(0.8) contrast(1.2) ';
    } else if (time === TIMES_OF_DAY.T_09AM) {
      filter += 'brightness(1.1) saturate(1.2) contrast(1.05) ';
    } else if (time === TIMES_OF_DAY.T_03PM) {
      filter += 'brightness(1.0) saturate(1.1) ';
    } else if (time === TIMES_OF_DAY.T_09PM) {
      filter += 'brightness(0.55) hue-rotate(270deg) saturate(1.3) contrast(1.1) ';
    }

    // Season filter
    if (season === SEASONS.WINTER) {
      filter += 'saturate(0.4) brightness(1.2) hue-rotate(180deg) ';
    } else if (season === SEASONS.RAINY) {
      filter += 'saturate(0.65) brightness(0.85) contrast(0.95) ';
    } else if (season === SEASONS.CHERRY_BLOSSOM) {
      filter += 'hue-rotate(310deg) saturate(1.3) ';
    }

    return filter.trim();
  }
}

