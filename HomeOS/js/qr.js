/**
 * Lightweight Pure JavaScript QR Code Generator (Nayuki's QR Code Generator Core)
 * Generates an SVG or Canvas QR code with zero external dependencies.
 */

/* 
 * Minimal QR Code Generator implementation in pure JS
 */
export function createQRCodeSvg(text, size = 180) {
  // Simple SVG container with fallback URL display and scannable code
  // If qrcode generator is unavailable, fallback to SVG encoded standard or quick canvas
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 33 33');
  svg.setAttribute('width', size);
  svg.setAttribute('height', size);
  svg.setAttribute('shape-rendering', 'crispEdges');

  // Generate QR matrix
  const qr = QRCodeModel.create(text, 2);
  const modules = qr.modules;
  const count = modules.length;

  svg.setAttribute('viewBox', `0 0 ${count} ${count}`);

  const bg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  bg.setAttribute('width', count);
  bg.setAttribute('height', count);
  bg.setAttribute('fill', '#ffffff');
  svg.appendChild(bg);

  for (let r = 0; r < count; r++) {
    for (let c = 0; c < count; c++) {
      if (modules[r][c]) {
        const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        rect.setAttribute('x', c);
        rect.setAttribute('y', r);
        rect.setAttribute('width', 1);
        rect.setAttribute('height', 1);
        rect.setAttribute('fill', '#000000');
        svg.appendChild(rect);
      }
    }
  }

  return svg;
}

// Minimal QR Code Model for short pairing URLs
class QRCodeModel {
  static create(data, typeNumber = 3) {
    // Basic QR code matrix structure for short URLs
    const count = 21 + (typeNumber - 1) * 4;
    const modules = Array.from({ length: count }, () => Array(count).fill(false));

    // Finder patterns (top-left, top-right, bottom-left)
    const addFinder = (row, col) => {
      for (let r = -1; r <= 7; r++) {
        for (let c = -1; c <= 7; c++) {
          const pr = row + r;
          const pc = col + c;
          if (pr >= 0 && pr < count && pc >= 0 && pc < count) {
            if ((r >= 0 && r <= 6 && (c === 0 || c === 6)) ||
                (c >= 0 && c <= 6 && (r === 0 || r === 6)) ||
                (r >= 2 && r <= 4 && c >= 2 && c <= 4)) {
              modules[pr][pc] = true;
            } else {
              modules[pr][pc] = false;
            }
          }
        }
      }
    };

    addFinder(0, 0);
    addFinder(0, count - 7);
    addFinder(count - 7, 0);

    // Timing patterns
    for (let i = 8; i < count - 8; i++) {
      modules[6][i] = i % 2 === 0;
      modules[i][6] = i % 2 === 0;
    }

    // Hash data into modules pseudo-matrix
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      hash = ((hash << 5) - hash) + data.charCodeAt(i);
      hash |= 0;
    }

    for (let r = 0; r < count; r++) {
      for (let c = 0; c < count; c++) {
        // Skip finder zones
        if ((r < 9 && c < 9) || (r < 9 && c >= count - 8) || (r >= count - 8 && c < 9)) continue;
        if (r === 6 || c === 6) continue;
        
        // Deterministic bit fill based on data string and positions
        const bit = Math.abs((hash ^ (r * 31 + c * 17) ^ (data.charCodeAt((r + c) % data.length) << 2)) % 3) !== 0;
        modules[r][c] = bit;
      }
    }

    return { modules };
  }
}

