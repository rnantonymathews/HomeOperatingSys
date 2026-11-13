import http from 'http';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';
import { WebSocketServer, WebSocket } from 'ws';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 8080;

// Resolve local LAN IPv4 address
function getLocalIP() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
}

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
};

// HTTP Static Server
const server = http.createServer((req, res) => {
  // CORS for local cross-origin testing if needed
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // Parse URL
  const parsedUrl = new URL(req.url, `http://${req.headers.host}`);
  let pathname = parsedUrl.pathname;

  // Root redirect or default index
  if (pathname === '/') {
    pathname = '/index.html';
  } else if (pathname.endsWith('/')) {
    pathname += 'index.html';
  }

  // Safe path resolution
  const safePath = path.normalize(path.join(__dirname, pathname));
  if (!safePath.startsWith(__dirname)) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    res.end('403 Forbidden');
    return;
  }

  // If path is a directory without trailing slash, redirect with slash
  if (fs.existsSync(safePath) && fs.statSync(safePath).isDirectory()) {
    res.writeHead(301, { Location: pathname + '/' });
    res.end();
    return;
  }

  fs.readFile(safePath, (err, data) => {
    if (err) {
      if (err.code === 'ENOENT') {
        res.writeHead(404, { 'Content-Type': 'text/html' });
        res.end(`<h2>404 Not Found</h2><p>Path: ${pathname}</p>`);
      } else {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end(`500 Internal Server Error: ${err.message}`);
      }
      return;
    }

    const ext = path.extname(safePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    // No-cache for swift iterative development
    res.writeHead(200, {
      'Content-Type': contentType,
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
    });
    res.end(data);
  });
});

// WebSocket Hub for HomeOS <-> HomeMote
const wss = new WebSocketServer({ server });
const rooms = new Map(); // roomId -> Set of client sockets

wss.on('connection', (ws, req) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const roomId = url.searchParams.get('room') || 'default';
  const role = url.searchParams.get('role') || 'client'; // 'tv' or 'remote'

  ws.roomId = roomId;
  ws.role = role;
  ws.isAlive = true;

  if (!rooms.has(roomId)) {
    rooms.set(roomId, new Set());
  }
  rooms.get(roomId).add(ws);

  console.log(`[WS] Client joined room "${roomId}" as role "${role}" (Total in room: ${rooms.get(roomId).size})`);

  // Inform client of successful connection
  ws.send(JSON.stringify({
    type: 'CONNECTION_ESTABLISHED',
    roomId,
    role,
    peerCount: rooms.get(roomId).size
  }));

  // Broadcast peer joined to room members
  for (const client of rooms.get(roomId)) {
    if (client !== ws && client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify({
        type: 'PEER_JOINED',
        role,
        peerCount: rooms.get(roomId).size
      }));
    }
  }

  ws.on('pong', () => {
    ws.isAlive = true;
  });

  ws.on('message', (message) => {
    try {
      const parsed = JSON.parse(message);

      // Support dynamic room switching (e.g. entering 6-digit PIN)
      if (parsed.type === 'SWITCH_ROOM' && parsed.room) {
        const oldRoom = ws.roomId;
        if (rooms.has(oldRoom)) {
          rooms.get(oldRoom).delete(ws);
          if (rooms.get(oldRoom).size === 0) rooms.delete(oldRoom);
        }

        ws.roomId = String(parsed.room).trim();
        if (!rooms.has(ws.roomId)) {
          rooms.set(ws.roomId, new Set());
        }
        rooms.get(ws.roomId).add(ws);
        console.log(`[WS] Client switched to room "${ws.roomId}" as "${ws.role}"`);

        ws.send(JSON.stringify({
          type: 'ROOM_SWITCHED',
          room: ws.roomId,
          peerCount: rooms.get(ws.roomId).size
        }));

        // Notify other peers in the new room
        for (const client of rooms.get(ws.roomId)) {
          if (client !== ws && client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({
              type: 'PEER_JOINED',
              role: ws.role,
              peerCount: rooms.get(ws.roomId).size
            }));
          }
        }
        return;
      }

      // Forward message to all peers in the room
      const currentRoom = ws.roomId;
      const roomClients = rooms.get(currentRoom);
      if (roomClients) {
        for (const client of roomClients) {
          if (client !== ws && client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(parsed));
          }
        }
      }
    } catch (e) {
      console.error('[WS] Invalid JSON received:', e.message);
    }
  });

  ws.on('close', () => {
    const roomClients = rooms.get(roomId);
    if (roomClients) {
      roomClients.delete(ws);
      console.log(`[WS] Client left room "${roomId}" (Remaining: ${roomClients.size})`);
      if (roomClients.size === 0) {
        rooms.delete(roomId);
      } else {
        for (const client of roomClients) {
          if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({
              type: 'PEER_LEFT',
              role,
              peerCount: roomClients.size
            }));
          }
        }
      }
    }
  });

  ws.on('error', (err) => {
    console.error(`[WS] Client error:`, err.message);
  });
});

// Periodic ping to keep connections alive
const pingInterval = setInterval(() => {
  wss.clients.forEach((ws) => {
    if (ws.isAlive === false) return ws.terminate();
    ws.isAlive = false;
    ws.ping();
  });
}, 30000);

wss.on('close', () => clearInterval(pingInterval));

function startListening(port) {
  server.listen(port, '0.0.0.0', () => {
    const localIP = getLocalIP();
    console.log('\n======================================================');
    console.log('  tvOS Launcher & Remote Dev Server Running');
    console.log('======================================================');
    console.log(`  Local Hub:     http://localhost:${port}/`);
    console.log(`  HomeOS (TV):   http://localhost:${port}/HomeOS/`);
    console.log(`  HomeMote:      http://localhost:${port}/HomeMote/`);
    console.log('------------------------------------------------------');
    console.log(`  Network (Mobile): http://${localIP}:${port}/HomeMote/`);
    console.log('======================================================\n');
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.warn(`[Server] Port ${port} is in use, trying port ${port + 1}...`);
      startListening(port + 1);
    } else {
      console.error('[Server] Fatal error:', err);
    }
  });
}

startListening(DEFAULT_PORT);
