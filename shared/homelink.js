/**
 * HomeLink - Universal Communication Layer for HomeOS <-> HomeMote
 * Supports:
 * 1. BroadcastChannel (Zero-latency same-browser local tab testing)
 * 2. WebSocket (Ultra-fast LAN / Wi-Fi cross-device communication)
 * 3. Message deduplication, heartbeats, and auto-reconnect
 */

import { MESSAGE_TYPES } from './protocol.js';

export class HomeLink {
  constructor(options = {}) {
    this.role = options.role || 'client'; // 'tv' or 'remote'
    this.roomId = options.roomId || 'homeos_default';
    this.listeners = new Map();
    this.statusListeners = new Set();
    this.status = 'disconnected'; // 'connected' | 'connecting' | 'disconnected'

    this.broadcastChannel = null;
    this.ws = null;
    this.seenMessageIds = new Set();
    this.reconnectTimer = null;
    this.pingTimer = null;

    this.init();
  }

  init() {
    this.initBroadcastChannel();
    this.initWebSocket();
  }

  // Setup BroadcastChannel for local dual-tab testing
  initBroadcastChannel() {
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        this.broadcastChannel = new BroadcastChannel(`homeos_channel_${this.roomId}`);
        this.broadcastChannel.onmessage = (event) => {
          this.handleIncomingRaw(event.data, 'broadcast');
        };
      } catch (e) {
        console.warn('[HomeLink] BroadcastChannel initialization failed:', e);
      }
    }
  }

  // Setup WebSocket for cross-device LAN communication
  initWebSocket() {
    if (typeof window === 'undefined' || !window.WebSocket) return;

    // Use current host or fallback
    const loc = window.location;
    const protocol = loc.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = loc.host || 'localhost:3000';
    const wsUrl = `${protocol}//${host}/ws?room=${encodeURIComponent(this.roomId)}&role=${encodeURIComponent(this.role)}`;

    this.updateStatus('connecting');

    try {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        console.log(`[HomeLink] WebSocket connected as ${this.role} in room ${this.roomId}`);
        this.updateStatus('connected');
        this.startHeartbeat();
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.handleIncomingRaw(data, 'websocket');
        } catch (e) {
          console.error('[HomeLink] Failed to parse incoming WebSocket message:', e);
        }
      };

      this.ws.onclose = () => {
        this.stopHeartbeat();
        // If broadcastChannel is active, we might still be partially connected locally
        this.updateStatus('disconnected');
        this.scheduleReconnect();
      };

      this.ws.onerror = (err) => {
        console.warn('[HomeLink] WebSocket encountered an error:', err);
      };
    } catch (e) {
      console.warn('[HomeLink] WebSocket could not be created:', e);
      this.scheduleReconnect();
    }
  }

  scheduleReconnect() {
    if (this.reconnectTimer) return;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      console.log('[HomeLink] Attempting WebSocket reconnect...');
      this.initWebSocket();
    }, 2500);
  }

  startHeartbeat() {
    this.stopHeartbeat();
    this.pingTimer = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: MESSAGE_TYPES.PING, role: this.role, timestamp: Date.now() }));
      }
    }, 15000);
  }

  stopHeartbeat() {
    if (this.pingTimer) {
      clearInterval(this.pingTimer);
      this.pingTimer = null;
    }
  }

  updateStatus(newStatus) {
    if (this.status === newStatus) return;
    this.status = newStatus;
    for (const callback of this.statusListeners) {
      try {
        callback(this.status);
      } catch (e) {
        console.error('[HomeLink] Status listener error:', e);
      }
    }
  }

  onStatusChange(callback) {
    this.statusListeners.add(callback);
    callback(this.status);
    return () => this.statusListeners.delete(callback);
  }

  handleIncomingRaw(data, transport) {
    if (!data || !data.type) return;

    // Ignore PING/PONG from triggering user-level events
    if (data.type === MESSAGE_TYPES.PING) {
      if (data.role !== this.role) {
        this.send(MESSAGE_TYPES.PONG, { replyTo: data.timestamp });
      }
      return;
    }
    if (data.type === MESSAGE_TYPES.PONG) return;

    // Message deduplication
    const msgId = data.msgId;
    if (msgId) {
      if (this.seenMessageIds.has(msgId)) return;
      this.seenMessageIds.add(msgId);
      // Keep memory bound
      if (this.seenMessageIds.size > 200) {
        const first = this.seenMessageIds.values().next().value;
        this.seenMessageIds.delete(first);
      }
    }

    // Don't process messages sent by ourselves
    if (data.senderRole === this.role && data.senderId === this.senderId) return;

    this.dispatch(data.type, data.payload, data);
  }

  // Subscribe to specific message types
  on(type, callback) {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set());
    }
    this.listeners.get(type).add(callback);
    return () => this.listeners.get(type).delete(callback);
  }

  dispatch(type, payload, raw) {
    // Specific listeners
    const specific = this.listeners.get(type);
    if (specific) {
      for (const cb of specific) {
        try {
          cb(payload, raw);
        } catch (e) {
          console.error(`[HomeLink] Error in handler for ${type}:`, e);
        }
      }
    }

    // Catch-all listener '*'
    const all = this.listeners.get('*');
    if (all) {
      for (const cb of all) {
        try {
          cb(type, payload, raw);
        } catch (e) {
          console.error('[HomeLink] Error in catch-all handler:', e);
        }
      }
    }
  }

  // Generate unique sender session ID
  get senderId() {
    if (!this._senderId) {
      this._senderId = Math.random().toString(36).substring(2, 9);
    }
    return this._senderId;
  }

  // Send message to peers across active transports
  send(type, payload = {}) {
    const message = {
      msgId: `${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      type,
      payload,
      senderRole: this.role,
      senderId: this.senderId,
      roomId: this.roomId,
      timestamp: Date.now()
    };

    // 1. Send via BroadcastChannel (local tabs)
    if (this.broadcastChannel) {
      try {
        this.broadcastChannel.postMessage(message);
      } catch (e) {
        console.warn('[HomeLink] Failed to postMessage on BroadcastChannel:', e);
      }
    }

    // 2. Send via WebSocket (network / LAN)
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(JSON.stringify(message));
      } catch (e) {
        console.warn('[HomeLink] Failed to send over WebSocket:', e);
      }
    }
  }

  setRoom(newRoomId) {
    if (this.roomId === newRoomId) return;
    this.roomId = newRoomId;
    if (this.broadcastChannel) {
      this.broadcastChannel.close();
    }
    if (this.ws) {
      this.ws.close();
    }
    this.init();
  }
}
