# HomeOS & HomeMote

A tvOS Launcher (**HomeOS**) and Apple TV Remote (**HomeMote**) built from scratch with **Vanilla JavaScript** and **Progressive Web App (PWA)** architecture.

---

## 🌟 Architecture Overview

```
                                      ┌──────────────────────┐
                                      │       HomeLink       │
                                      │ Communication Layer  │
                                      └──────────┬───────────┘
                                                 │
                   ┌─────────────────────────────┴─────────────────────────────┐
                   │                                                           │
        Local Same-Browser Tab                                      Local Wi-Fi / Remote
     (BroadcastChannel + localStorage)                               (WebSocket / WebRTC)
                   │                                                           │
         ┌─────────▼────────┐                                        ┌─────────▼────────┐
         │      HomeOS      │                                        │     HomeMote     │
         │  (tvOS Launcher) │ ◄────────────────────────────────────► │  (Apple Remote)  │
         │   Landscape PWA  │         Bidirectional Protocol         │   Portrait PWA   │
         └──────────────────┘                                        └──────────────────┘
```

### 1. `HomeOS` — The tvOS Launcher
- **10-Foot UI Experience**: Apple tvOS aesthetic with high-contrast typography, ambient backdrops, and glassmorphism.
- **Top Shelf**: Dynamic interactive hero showcase with featured content, metadata, and quick action triggers.
- **2D Spatial Navigation**: D-Pad arrow and swipe navigation with Apple 3D card tilt, focus glows, and sound effects.
- **Web Audio Sound Synthesizer**: Authentic procedural tvOS UI sounds (focus ticks, select pops, back swooshes, chime) synthesized in real-time with zero external audio assets.
- **Control Center & Volume HUD**: Live clock, remote status indicator, animated vertical volume level slider, and ambient screensaver.
- **Pairing System**: Integrated dynamic QR code generator and pairing PIN for one-step phone connection.
- **PWA Ready**: Manifest, Service Worker caching, and full-screen landscape display mode.

### 2. `HomeMote` — The Remote Controller
- **Siri Remote Ergonomics**: Sleek brushed aluminum chassis, tactile buttons, and glass touch surface.
- **Touchpad & Clickpad**:
  - Multi-directional swipe gestures (Up / Down / Left / Right) with inertia and threshold snapping.
  - Tactile center Click button.
  - Directional perimeter buttons.
- **Hardware Buttons**: Back (`<`), Home / TV (`📺`), Play / Pause (`⏯`), Mute (`🔇`), Volume Rocker (`+` / `-`), and Power (`⏻`).
- **Siri Voice Dictation**: Web Speech API integration transcribing speech in real-time and beaming search queries to the TV.
- **Remote Mobile Keyboard**: Seamless slide-up sheet allowing mobile typing directly into HomeOS TV search fields.
- **Tactile Haptics**: Vibration API (`navigator.vibrate`) delivering realistic haptic feedback on gestures and button presses.
- **PWA Ready**: Manifest, Service Worker caching, and standalone portrait mode.

### 3. `HomeLink` — The Always-On Communication Engine
- **Dual-Transport Hybrid**:
  1. **BroadcastChannel**: Instant, zero-latency communication when testing both tabs on the same computer / browser.
  2. **WebSocket Relay**: Real-time cross-device communication across the local Wi-Fi network (e.g. Phone -> TV).
- **Auto-Reconnection**: Heartbeat ping/pong and automatic reconnection if network or screen locks.
- **Deduplication**: Guaranteed single execution of navigation events across multiple transports.

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+)

### 1. Install & Launch Dev Server
```bash
npm install
npm run dev
```

The server will automatically detect your local LAN IP and output:
```text
======================================================
  tvOS Launcher & Remote Dev Server Running
======================================================
  Local Hub:        http://localhost:3000/
  HomeOS (TV):      http://localhost:3000/HomeOS/
  HomeMote:         http://localhost:3000/HomeMote/
------------------------------------------------------
  Network (Mobile): http://192.168.x.x:3000/HomeMote/
======================================================
```

### 2. Testing Modes

#### A. Simultaneous Studio (Split View on 1 Screen)
Open `http://localhost:3000/` in your desktop browser. Both HomeOS and HomeMote are loaded side-by-side, communicating live via `HomeLink`!

#### B. Multi-Device (Phone Remote controlling PC / TV)
1. Open `http://localhost:3000/HomeOS/` on your computer or TV display.
2. Click **Pair Remote** or scan the QR code on your mobile phone connected to the same Wi-Fi.
3. Use your phone's touch surface, volume rocker, and Siri mic to control the TV!

---

## 📂 Repository Structure

```
.
├── dev-server.js           # Lightweight static server & WebSocket real-time bridge
├── package.json            # Dev scripts and metadata
├── index.html              # Simultaneous Test Studio (Split-screen test view)
├── shared/                 # Universal communication layer
│   ├── protocol.js         # Event types and message schema
│   └── homelink.js         # Unified BroadcastChannel & WebSocket client
├── HomeOS/                 # tvOS Launcher PWA
│   ├── index.html          # 10-foot UI markup
│   ├── manifest.json       # Landscape PWA manifest
│   ├── sw.js               # Service Worker
│   ├── css/
│   │   ├── tvos-core.css   # tvOS design tokens and base styles
│   │   └── launcher.css    # Top shelf, grid, volume HUD, modals
│   ├── js/
│   │   ├── main.js         # Application bootstrap & link coordinator
│   │   ├── navigation.js   # 2D spatial navigation & 3D tilt engine
│   │   ├── sound.js        # Web Audio API procedural sound synthesizer
│   │   ├── apps.js         # App registry & card renderer
│   │   ├── controlcenter.js# Control center, status bar, and pairing
│   │   └── qr.js           # Dynamic zero-dependency QR code generator
│   └── icons/              # PWA icons
└── HomeMote/               # Apple TV Remote Controller PWA
    ├── index.html          # Remote UI markup
    ├── manifest.json       # Portrait PWA manifest
    ├── sw.js               # Service Worker
    ├── css/
    │   ├── mote-core.css   # Brushed aluminum chassis & button tokens
    │   └── remote.css      # Touchpad, rocker, and keyboard sheet
    ├── js/
    │   ├── main.js         # Remote bootstrap & button dispatcher
    │   ├── touchpad.js     # Touch & swipe gesture detector
    │   ├── haptics.js      # Vibration feedback manager
    │   ├── voice.js        # Web Speech API Siri dictation
    │   └── keyboard.js     # Slide-up mobile keyboard
    └── icons/              # PWA icons
```
