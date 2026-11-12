/**
 * 2D Spatial Navigation and Focus Management for HomeOS
 * Handles tvOS focus engine, 3D card tilt, bounds navigation, and modal focus traps.
 */

import { sounds } from './sound.js';
import { DIRECTIONS } from '../../shared/protocol.js';

export class SpatialNavigation {
  constructor() {
    this.currentFocused = null;
    this.focusScope = 'launcher'; // 'launcher' | 'modal' | 'controlCenter'
    this.modalElement = null;
    this.registeredItems = [];

    // Keyboard fallback listeners (Arrow keys, Enter, Escape)
    window.addEventListener('keydown', (e) => this.handleKeyDown(e));
  }

  // Update focusable elements registry
  refreshFocusables() {
    const selector = this.focusScope === 'launcher' 
      ? '.tv-focusable:not([disabled]):not(.hidden)'
      : `#${this.modalElement?.id || 'modal'} .tv-focusable:not([disabled])`;
    
    this.registeredItems = Array.from(document.querySelectorAll(selector));
    
    // If nothing currently focused, focus first available item
    if (!this.currentFocused || !document.body.contains(this.currentFocused)) {
      if (this.registeredItems.length > 0) {
        this.setFocus(this.registeredItems[0], false);
      }
    }
  }

  setFocus(el, playSound = true) {
    if (!el || el === this.currentFocused) return;

    if (this.currentFocused) {
      this.currentFocused.classList.remove('focused');
      this.resetTilt(this.currentFocused);
    }

    this.currentFocused = el;
    this.currentFocused.classList.add('focused');
    this.currentFocused.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });

    if (playSound) {
      sounds.playFocus();
    }

    // Dispatch custom event for preview updates (Top Shelf showcase)
    const event = new CustomEvent('tvfocuschange', { detail: { element: el } });
    window.dispatchEvent(event);
  }

  move(direction) {
    this.refreshFocusables();
    if (this.registeredItems.length === 0) return;

    if (!this.currentFocused) {
      this.setFocus(this.registeredItems[0]);
      return;
    }

    const next = this.findNextElement(this.currentFocused, direction);
    if (next) {
      this.setFocus(next);
      this.applyDirectionalNudge(next, direction);
    } else {
      // Subtle edge bounce if at edge
      this.applyEdgeBounce(this.currentFocused, direction);
    }
  }

  findNextElement(current, direction) {
    const currentRect = current.getBoundingClientRect();
    const currentCenter = {
      x: currentRect.left + currentRect.width / 2,
      y: currentRect.top + currentRect.height / 2
    };

    let bestCandidate = null;
    let minDistance = Infinity;

    for (const item of this.registeredItems) {
      if (item === current) continue;
      const rect = item.getBoundingClientRect();
      const center = {
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2
      };

      const dx = center.x - currentCenter.x;
      const dy = center.y - currentCenter.y;

      let isCandidate = false;

      switch (direction) {
        case DIRECTIONS.UP:
          isCandidate = dy < -10 && Math.abs(dx) < Math.abs(dy) * 1.8;
          break;
        case DIRECTIONS.DOWN:
          isCandidate = dy > 10 && Math.abs(dx) < Math.abs(dy) * 1.8;
          break;
        case DIRECTIONS.LEFT:
          isCandidate = dx < -10 && Math.abs(dy) < Math.abs(dx) * 1.8;
          break;
        case DIRECTIONS.RIGHT:
          isCandidate = dx > 10 && Math.abs(dy) < Math.abs(dx) * 1.8;
          break;
      }

      if (isCandidate) {
        // Weighted euclidean distance (favor straight lines in intended direction)
        const primaryDist = (direction === DIRECTIONS.UP || direction === DIRECTIONS.DOWN) ? Math.abs(dy) : Math.abs(dx);
        const crossDist = (direction === DIRECTIONS.UP || direction === DIRECTIONS.DOWN) ? Math.abs(dx) : Math.abs(dy);
        const distance = primaryDist + crossDist * 2.0;

        if (distance < minDistance) {
          minDistance = distance;
          bestCandidate = item;
        }
      }
    }

    return bestCandidate;
  }

  // Apple TV 3D tilt micro-animation
  applyDirectionalNudge(el, direction) {
    let tiltX = 0;
    let tiltY = 0;
    if (direction === DIRECTIONS.UP) tiltX = 8;
    if (direction === DIRECTIONS.DOWN) tiltX = -8;
    if (direction === DIRECTIONS.LEFT) tiltY = -8;
    if (direction === DIRECTIONS.RIGHT) tiltY = 8;

    el.style.transform = `scale(1.08) perspective(600px) rotateX(${tiltX}deg) rotateY(${tiltY}deg)`;
    setTimeout(() => {
      if (el === this.currentFocused) {
        el.style.transform = `scale(1.08) perspective(600px) rotateX(0deg) rotateY(0deg)`;
      }
    }, 180);
  }

  applyEdgeBounce(el, direction) {
    let tx = 0;
    let ty = 0;
    if (direction === DIRECTIONS.UP) ty = -6;
    if (direction === DIRECTIONS.DOWN) ty = 6;
    if (direction === DIRECTIONS.LEFT) tx = -6;
    if (direction === DIRECTIONS.RIGHT) tx = 6;

    el.style.transform = `scale(1.08) translate3d(${tx}px, ${ty}px, 0)`;
    setTimeout(() => {
      if (el === this.currentFocused) {
        el.style.transform = `scale(1.08) translate3d(0, 0, 0)`;
      }
    }, 120);
  }

  resetTilt(el) {
    if (el) {
      el.style.transform = '';
    }
  }

  selectCurrent() {
    if (!this.currentFocused) return;
    sounds.playSelect();

    // Trigger subtle click compression
    this.currentFocused.classList.add('pressed');
    setTimeout(() => {
      this.currentFocused.classList.remove('pressed');
    }, 150);

    // Dispatch click event or invoke action
    this.currentFocused.click();
  }

  openScope(scopeName, modalElement) {
    this.focusScope = scopeName;
    this.modalElement = modalElement;
    this.refreshFocusables();
  }

  closeScope() {
    this.focusScope = 'launcher';
    this.modalElement = null;
    this.refreshFocusables();
  }

  handleKeyDown(e) {
    // Arrow Keys
    switch (e.key) {
      case 'ArrowUp':
        e.preventDefault();
        this.move(DIRECTIONS.UP);
        break;
      case 'ArrowDown':
        e.preventDefault();
        this.move(DIRECTIONS.DOWN);
        break;
      case 'ArrowLeft':
        e.preventDefault();
        this.move(DIRECTIONS.LEFT);
        break;
      case 'ArrowRight':
        e.preventDefault();
        this.move(DIRECTIONS.RIGHT);
        break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        this.selectCurrent();
        break;
      case 'Escape':
      case 'Backspace':
        // tvOS Back
        const backEvent = new CustomEvent('tvbackpress');
        window.dispatchEvent(backEvent);
        break;
    }
  }
}
