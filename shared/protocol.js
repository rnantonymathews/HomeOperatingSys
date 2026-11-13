/**
 * HomeOS & HomeMote Shared Communication Protocol
 * Pure Vanilla JS ES Module
 */

export const MESSAGE_TYPES = {
  // Navigation & Control (Remote -> TV)
  NAVIGATE: 'NAVIGATE',         // { direction: 'UP' | 'DOWN' | 'LEFT' | 'RIGHT' }
  SELECT: 'SELECT',             // { action: 'CLICK' | 'HOLD' }
  BACK: 'BACK',                 // {}
  HOME: 'HOME',                 // {}
  PLAY_PAUSE: 'PLAY_PAUSE',     // {}
  VOLUME: 'VOLUME',             // { action: 'UP' | 'DOWN' | 'MUTE' }
  POWER: 'POWER',               // {}
  TOUCH_GESTURE: 'TOUCH_GESTURE', // { type: 'SWIPE' | 'PAN', dx, dy, direction }

  // Voice & Text Input (Remote -> TV)
  VOICE_SEARCH: 'VOICE_SEARCH',   // { query: string }
  KEYBOARD_INPUT: 'KEYBOARD_INPUT', // { text: string, action: 'TYPE' | 'ENTER' | 'BACKSPACE' | 'CLEAR' }

  // System Sync & Feedback (TV -> Remote)
  STATUS_SYNC: 'STATUS_SYNC',     // { focusedApp, isPlaying, volume, muted, keyboardActive, inputPlaceholder, currentTime }
  REQUEST_KEYBOARD: 'REQUEST_KEYBOARD', // { placeholder, currentValue }
  DISMISS_KEYBOARD: 'DISMISS_KEYBOARD', // {}
  HAPTIC_TRIGGER: 'HAPTIC_TRIGGER', // { pattern: 'light' | 'medium' | 'heavy' | 'success' | 'selection' }

  // User Profile
  USER_PROFILE: 'USER_PROFILE',     // { username: string }

  // Touchpad & Cursor Tracking (Remote -> TV)
  CURSOR_MOVE: 'CURSOR_MOVE',       // { dx: number, dy: number }
  CURSOR_CLICK: 'CURSOR_CLICK',     // { action: 'press' | 'release' }

  // Pairing & Connection Handshake
  PING: 'PING',
  PONG: 'PONG',
  PAIR_REQUEST: 'PAIR_REQUEST',     // { pin: string }
  PAIR_ACCEPTED: 'PAIR_ACCEPTED',   // { tvName: string, pin: string }
  PAIR_REJECTED: 'PAIR_REJECTED',   // { error: string }
  UNPAIR: 'UNPAIR',                 // {}
  SWITCH_ROOM: 'SWITCH_ROOM',       // { room: string }
  ROOM_SWITCHED: 'ROOM_SWITCHED'    // { room: string }
};

export const DIRECTIONS = {
  UP: 'UP',
  DOWN: 'DOWN',
  LEFT: 'LEFT',
  RIGHT: 'RIGHT'
};
