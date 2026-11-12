/**
 * HomeMote Keyboard Input Controller
 * Lets users type directly on phone and syncs to HomeOS
 */

import { haptics } from './haptics.js';

export class RemoteKeyboard {
  constructor(options = {}) {
    this.onInput = options.onInput || (() => {});
    this.sheetEl = document.getElementById('keyboard-sheet');
    this.inputEl = document.getElementById('remote-keyboard-input');
    this.clearBtn = document.getElementById('btn-keyboard-clear');
    this.closeBtn = document.getElementById('btn-keyboard-done');
    
    this.init();
  }

  init() {
    if (!this.sheetEl || !this.inputEl) return;

    this.inputEl.addEventListener('input', (e) => {
      haptics.tick();
      this.onInput({
        action: 'TYPE',
        text: e.data || '',
        fullText: this.inputEl.value
      });
    });

    this.inputEl.addEventListener('keydown', (e) => {
      if (e.key === 'Backspace') {
        this.onInput({ action: 'BACKSPACE' });
      } else if (e.key === 'Enter') {
        this.onInput({ action: 'ENTER' });
        this.hide();
      }
    });

    if (this.clearBtn) {
      this.clearBtn.addEventListener('click', () => {
        haptics.click();
        this.inputEl.value = '';
        this.onInput({ action: 'CLEAR' });
        this.inputEl.focus();
      });
    }

    if (this.closeBtn) {
      this.closeBtn.addEventListener('click', () => {
        haptics.click();
        this.hide();
      });
    }
  }

  show(placeholder = 'Search or Type on HomeOS...') {
    if (!this.sheetEl) return;
    this.sheetEl.classList.remove('hidden');
    if (this.inputEl) {
      this.inputEl.placeholder = placeholder;
      this.inputEl.value = '';
      setTimeout(() => this.inputEl.focus(), 150);
    }
  }

  hide() {
    if (!this.sheetEl) return;
    this.sheetEl.classList.add('hidden');
    if (this.inputEl) {
      this.inputEl.blur();
    }
  }

  toggle() {
    if (this.sheetEl && this.sheetEl.classList.contains('hidden')) {
      this.show();
    } else {
      this.hide();
    }
  }
}

