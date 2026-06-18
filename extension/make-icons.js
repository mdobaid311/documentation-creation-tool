// Generates the extension PNG icons (no external deps — raw PNG via zlib).
// Run once with:  node make-icons.js
const zlib = require("node:zlib");
const fs = require("node:fs");
const path = require("node:path");

// CRC32 (PNG chunk checksums).
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, "ascii");
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}
function encodePng(size, rgba) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  // rows prefixed with filter byte 0
  const stride = size * 4;
  const raw = Buffer.alloc((stride + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (stride + 1)] = 0;
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, y * stride + stride);
  }
  const idat = zlib.deflateSync(raw, { level: 9 });
  return Buffer.concat([
    sig,
    chunk("IHDR", ihdr),
    chunk("IDAT", idat),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

// Draw a purple rounded square with a white "record" dot.
function drawIcon(size) {
  const buf = Buffer.alloc(size * size * 4);
  const radius = size * 0.22;
  const accent = [109, 40, 217];
  const cx = size / 2;
  const cy = size / 2;
  const dotR = size * 0.26;

  const inRounded = (x, y) => {
    const r = radius;
    const minX = r,
      maxX = size - r,
      minY = r,
      maxY = size - r;
    let dx = 0,
      dy = 0;
    if (x < minX) dx = minX - x;
    else if (x > maxX) dx = x - maxX;
    if (y < minY) dy = minY - y;
    else if (y > maxY) dy = y - maxY;
    return dx * dx + dy * dy <= r * r;
  };

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      const px = x + 0.5,
        py = y + 0.5;
      if (!inRounded(px, py)) {
        buf[i + 3] = 0; // transparent corners
        continue;
      }
      const dist = Math.hypot(px - cx, py - cy);
      if (dist <= dotR) {
        buf[i] = 255;
        buf[i + 1] = 255;
        buf[i + 2] = 255;
        buf[i + 3] = 255;
      } else {
        buf[i] = accent[0];
        buf[i + 1] = accent[1];
        buf[i + 2] = accent[2];
        buf[i + 3] = 255;
      }
    }
  }
  return buf;
}

const outDir = path.join(__dirname, "icons");
fs.mkdirSync(outDir, { recursive: true });
for (const size of [16, 48, 128]) {
  const png = encodePng(size, drawIcon(size));
  fs.writeFileSync(path.join(outDir, `icon${size}.png`), png);
  console.log(`wrote icons/icon${size}.png (${png.length} bytes)`);
}
