// Writes the app icons into public/. Run with: node scripts/make-icons.cjs
// A 16x16 pixel-art Miami sunset: palm tree, striped sun, sea.
const zlib = require('zlib');
const fs = require('fs');
const path = require('path');

const art = [
  '5555555555555555',
  '5kkk55kkk5555555',
  'kk5kkkk5kk555555',
  'k44kkkk44k444444',
  '444kkk4kk4444444',
  '44k4kk44k4yyyy44',
  '3333kk333yyyyyy3',
  '3333kk33yyyyyyyy',
  '3333kk33oooooooo',
  '2222kk22yyyyyyyy',
  '222kk222oooooooo',
  '222kk2222yyyyyy2',
  'tttkktttttlllttt',
  'ttkkkttlltttttll',
  'tllttttttttllttt',
  'tttttlltttttttll',
];
const hex = { 5: '2b1055', 4: '7a1fa2', 3: 'ff3d9a', 2: 'ff8a4c', y: 'ffe14d', o: 'ff9f1c', k: '160b33', t: '0bb5c4', l: '9ff7f2' };
const pal = Object.fromEntries(Object.entries(hex).map(([k, v]) => [k, [0, 2, 4].map((i) => parseInt(v.slice(i, i + 2), 16))]));
for (const row of art) if (row.length !== 16 || [...row].some((c) => !pal[c])) throw new Error(`bad row ${row}`);

const crcT = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
const crc = (b) => { let c = 0xffffffff; for (const x of b) c = crcT[(c ^ x) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
const chunk = (t, d) => { const l = Buffer.alloc(4); l.writeUInt32BE(d.length); const td = Buffer.concat([Buffer.from(t), d]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([l, td, c]); };

function png(size, file) {
  const cell = size / 16;
  const buf = Buffer.alloc(size * (1 + size * 3));
  for (let y = 0; y < size; y++) {
    buf[y * (1 + size * 3)] = 0;
    for (let x = 0; x < size; x++) {
      const ch = art[Math.min(15, Math.floor(y / cell))][Math.min(15, Math.floor(x / cell))];
      const o = y * (1 + size * 3) + 1 + x * 3;
      [buf[o], buf[o + 1], buf[o + 2]] = pal[ch];
    }
  }
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4); ihdr[8] = 8; ihdr[9] = 2;
  fs.writeFileSync(path.join(__dirname, '..', 'public', file), Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(buf)), chunk('IEND', Buffer.alloc(0)),
  ]));
}
png(180, 'apple-touch-icon.png');
png(192, 'icon-192.png');
png(512, 'icon-512.png');
