/**
 * HomeMote Touchpad & Clickpad Controller
 * Handles gestures, swipes, circular d-pad, and tactile feedback
 */

import { DIRECTIONS } from '../../shared/protocol.js';
import { haptics } from './haptics.js';

export class TouchpadController {
  constructor(element, options = {}) {
    this.el = element;
    this.onNavigate = options.onNavigate || (() => {});
    this.onSelect = options.onSelect || (() => {});
    
    this.startX = 0;
    this.startY = 0;
    this.currentX = 0;
    this.currentY = 0;
    this.isTracking = false;
    this.hasMoved = false;
    this.threshold = 32; // Pixels needed for a swipe snap

    this.init();
  }

  init() {
    if (!this.el) return;

    // Pointer Events for both touch and mouse
    this.el.addEventListener('pointerdown', (e) => this.handlePointerDown(e));
    window.addEventListener('pointermove', (e) => this.handlePointerMove(e));
    window.addEventListener('pointerup', (e) => this.handlePointerUp(e));
    window.addEventListener('pointercancel', (e) => this.handlePointerUp(e));

    // Direct directional buttons on pad
    const dpadButtons = this.el.querySelectorAll('[data-direction]');
    dpadButtons.forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const dir = btn.getAttribute('data-direction');
        haptics.tick();
        this.onNavigate(dir);
      });
    });

    // Center Select Button
    const centerBtn = this.el.querySelector('.clickpad-center');
    if (centerBtn) {
      centerBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        haptics.click();
        this.onSelect();
      });
    }
  }

  handlePointerDown(e) {
    // Only track if touched within the pad
    if (e.target.closest('.clickpad-center') || e.target.closest('[data-direction]')) {
      return; // Handled by button clicks
    }

    this.isTracking = true;
    this.hasMoved = false;
    this.startX = e.clientX;
    this.startY = e.clientY;
    this.currentX = e.clientX;
    this.currentY = e.clientY;

    this.showTouchRipple(e.clientX, e.clientY);
  }

  handlePointerMove(e) {
    if (!this.isTracking) return;

    const dx = e.clientX - this.startX;
    const dy = e.clientY - this.startY;

    // Swipe threshold exceeded
    if (Math.abs(dx) > this.threshold || Math.abs(dy) > this.threshold) {
      this.hasMoved = true;
      let dir = null;

      if (Math.abs(dx) > Math.abs(dy)) {
        dir = dx > 0 ? DIRECTIONS.RIGHT : DIRECTIONS.LEFT;
      } else {
        dir = dy > 0 ? DIRECTIONS.DOWN : DIRECTIONS.UP;
      }

      if (dir) {
        haptics.tick();
        this.onNavigate(dir);
      }

      // Reset start to allow fluid repeated swipes
      this.startX = e.clientX;
      this.startY = e.clientY;
    }
  }

  handlePointerUp(e) {
    if (!this.isTracking) return;

    // If released without significant swipe, register as a select click
    if (!this.hasMoved) {
      const rect = this.el.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const clickY = e.clientY - rect.top;

      // Check if tap was near center
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      const dist = Math.hypot(clickX - centerX, clickY - centerY);

      if (dist < rect.width * 0.35) {
        haptics.click();
        this.onSelect();
      }
    }

    this.isTracking = false;
    this.hasMoved = false;
  }

  showTouchRipple(clientX, clientY) {
    const ripple = document.createElement('div');
    ripple.className = 'touchpad-ripple';
    const rect = this.el.getBoundingClientRect();
    ripple.style.left = `${clientX - rect.left}px`;
    ripple.style.top = `${clientY - rect.top}px`;

    this.el.appendChild(ripple);
    setTimeout(() => ripple.remove(), 400);
  }
}
