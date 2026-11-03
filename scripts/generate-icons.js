import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

function createPng(width, height, isMaskable = false) {
  // RGBA buffer
  const stride = width * 4;
  const rawData = Buffer.alloc((stride + 1) * height);

  const cx = width / 2;
  const cy = height / 2;
  const r = (width / 2) * (isMaskable ? 0.95 : 0.88);
  const cornerR = isMaskable ? 0 : width * 0.22;

  for (let y = 0; y < height; y++) {
    const rowOffset = y * (stride + 1);
    rawData[rowOffset] = 0; // Filter type 0 (None)

    for (let x = 0; x < width; x++) {
      const pxOffset = rowOffset + 1 + x * 4;
      
      // Calculate rounded rect distance
      let inside = false;
      if (isMaskable) {
        inside = true;
      } else {
        const dx = Math.max(0, Math.abs(x - cx) - (cx - cornerR));
        const dy = Math.max(0, Math.abs(y - cy) - (cy - cornerR));
        inside = (dx * dx + dy * dy) <= cornerR * cornerR;
      }

      if (!inside) {
        rawData[pxOffset] = 0;
        rawData[pxOffset + 1] = 0;
        rawData[pxOffset + 2] = 0;
        rawData[pxOffset + 3] = 0;
        continue;
      }

      // Background gradient: #ff8a3d -> #ff4520 (top-left to bottom-right)
      const t = (x + y) / (width + height);
      const bgR = Math.round(255 - t * 15);
      const bgG = Math.round(138 - t * 75);
      const bgB = Math.round(61 - t * 35);

      // Music note / disc shape in center
      const ndx = x - cx;
      const ndy = y - cy;
      const distFromCenter = Math.sqrt(ndx * ndx + ndy * ndy);
      const outerR = width * 0.28;
      const innerR = width * 0.08;

      let rCol = bgR, gCol = bgG, bCol = bgB, aCol = 255;

      // Outer vinyl ring
      if (distFromCenter <= outerR && distFromCenter >= innerR * 1.5) {
        // Grooves
        const groove = Math.sin(distFromCenter * 0.6) * 15;
        rCol = Math.max(0, Math.min(255, 30 + groove));
        gCol = Math.max(0, Math.min(255, 34 + groove));
        bCol = Math.max(0, Math.min(255, 45 + groove));
      } else if (distFromCenter < innerR * 1.5) {
        // Center label: vibrant yellow-orange
        rCol = 255;
        gCol = 200;
        bCol = 70;
        if (distFromCenter < innerR * 0.5) {
          // Center spindle hole
          rCol = 20;
          gCol = 22;
          bCol = 28;
        }
      }

      // Note overlay (white beamed sixteenth notes)
      const noteScale = width / 192;
      const n1x = cx - 18 * noteScale;
      const n2x = cx + 18 * noteScale;
      const noteBaseY = cy + 18 * noteScale;
      const headR = 11 * noteScale;

      const d1 = Math.sqrt((x - n1x) ** 2 + (y - noteBaseY) ** 2);
      const d2 = Math.sqrt((x - n2x) ** 2 + (y - (noteBaseY - 6 * noteScale)) ** 2);

      // Stems and beam
      const stemW = 3.5 * noteScale;
      const inStem1 = (x >= n1x + headR - stemW && x <= n1x + headR) && (y <= noteBaseY && y >= cy - 28 * noteScale);
      const inStem2 = (x >= n2x + headR - stemW && x <= n2x + headR) && (y <= (noteBaseY - 6 * noteScale) && y >= cy - 34 * noteScale);

      // Beam across top
      const beamY = cy - 28 * noteScale - ((x - n1x) / (n2x - n1x)) * 6 * noteScale;
      const inBeam = (x >= n1x + headR - stemW && x <= n2x + headR) && (y >= beamY - 7 * noteScale && y <= beamY);

      if (d1 <= headR || d2 <= headR || inStem1 || inStem2 || inBeam) {
        rCol = 255;
        gCol = 255;
        bCol = 255;
      }

      rawData[pxOffset] = rCol;
      rawData[pxOffset + 1] = gCol;
      rawData[pxOffset + 2] = bCol;
      rawData[pxOffset + 3] = aCol;
    }
  }

  // Compress IDAT
  const compressed = zlib.deflateSync(rawData);

  // PNG structure
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  function chunk(type, data) {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length, 0);

    const typeBuf = Buffer.from(type);
    const crcBuf = Buffer.concat([typeBuf, data]);
    const crc = crc32(crcBuf);

    const crcOut = Buffer.alloc(4);
    crcOut.writeUInt32BE(crc, 0);

    return Buffer.concat([len, typeBuf, data, crcOut]);
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace

  const ihdrChunk = chunk('IHDR', ihdr);
  const idatChunk = chunk('IDAT', compressed);
  const iendChunk = chunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

// Simple CRC32 for PNG chunks
function crc32(buf) {
  let table = [];
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      if (c & 1) c = 0xedb88320 ^ (c >>> 1);
      else c = c >>> 1;
    }
    table[n] = c;
  }
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = table[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

const iconsDir = path.resolve('public/icons');
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

fs.writeFileSync(path.join(iconsDir, 'icon-192.png'), createPng(192, 192, false));
fs.writeFileSync(path.join(iconsDir, 'icon-512.png'), createPng(512, 512, false));
fs.writeFileSync(path.join(iconsDir, 'icon-maskable-512.png'), createPng(512, 512, true));
fs.writeFileSync(path.join(iconsDir, 'apple-touch-icon.png'), createPng(180, 180, false));
fs.writeFileSync(path.join(iconsDir, 'favicon.png'), createPng(64, 64, false));

console.log('Successfully generated PWA and App icons!');
