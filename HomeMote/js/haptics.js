/**
 * HomeMote Haptic Feedback Manager
 * Uses Web Vibration API for authentic Apple TV Remote tactile clicks
 */

class HapticsManager {
  constructor() {
    this.enabled = typeof navigator !== 'undefined' && 'vibrate' in navigator;
  }

  // Soft click (directional moves, swipes)
  tick() {
    if (!this.enabled) return;
    try {
      navigator.vibrate(12);
    } catch (e) { }
  }

  // Medium snap (Select, Button Press)
  click() {
    if (!this.enabled) return;
    try {
      navigator.vibrate(24);
    } catch (e) { }
  }

  // Distinct double pulse (Back / Home)
  doublePulse() {
    if (!this.enabled) return;
    try {
      navigator.vibrate([15, 40, 20]);
    } catch (e) { }
  }

  // Long confirmation (Connection established, Voice complete)
  success() {
    if (!this.enabled) return;
    try {
      navigator.vibrate([20, 50, 35]);
    } catch (e) { }
  }

  // Error buzz
  error() {
    if (!this.enabled) return;
    try {
      navigator.vibrate([50, 30, 50]);
    } catch (e) { }
  }
}

export const haptics = new HapticsManager();
