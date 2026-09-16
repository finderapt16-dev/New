import { deflateSync } from "node:zlib";
import { mkdirSync, writeFileSync } from "node:fs";

const crcTable = Array.from({ length: 256 }, (_, value) => {
  let crc = value;
  for (let bit = 0; bit < 8; bit += 1) crc = (crc & 1) ? 0xedb88320 ^ (crc >>> 1) : crc >>> 1;
  return crc >>> 0;
});

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const name = Buffer.from(type);
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const checksum = Buffer.alloc(4);
  checksum.writeUInt32BE(crc32(Buffer.concat([name, data])));
  return Buffer.concat([length, name, data, checksum]);
}

function createIcon(size, maskable = false) {
  const pixels = Buffer.alloc(size * (size * 4 + 1));
  const safe = maskable ? 0.19 : 0.1;
  const left = Math.round(size * safe);
  const right = size - left;
  const top = Math.round(size * safe);
  const bottom = size - top;
  const radius = Math.round(size * 0.15);

  for (let y = 0; y < size; y += 1) {
    const row = y * (size * 4 + 1);
    for (let x = 0; x < size; x += 1) {
      const offset = row + 1 + x * 4;
      let color = [255, 248, 232, 255];
      const dx = x < left + radius ? left + radius - x : x > right - radius ? x - (right - radius) : 0;
      const dy = y < top + radius ? top + radius - y : y > bottom - radius ? y - (bottom - radius) : 0;
      const inBadge = x >= left && x <= right && y >= top && y <= bottom && (dx === 0 || dy === 0 || dx * dx + dy * dy <= radius * radius);
      if (inBadge) {
        const progress = (x + y) / (size * 2);
        color = [255, Math.round(166 - progress * 90), Math.round(18 + progress * 14), 255];
      }

      const stroke = Math.max(3, Math.round(size * 0.035));
      const buildingLeft = Math.round(size * 0.34);
      const buildingRight = Math.round(size * 0.66);
      const buildingTop = Math.round(size * 0.31);
      const buildingBottom = Math.round(size * 0.68);
      const wall = inBadge && (
        (x >= buildingLeft && x < buildingLeft + stroke && y >= buildingTop && y <= buildingBottom) ||
        (x <= buildingRight && x > buildingRight - stroke && y >= buildingTop && y <= buildingBottom) ||
        (y >= buildingTop && y < buildingTop + stroke && x >= buildingLeft && x <= buildingRight) ||
        (y <= buildingBottom && y > buildingBottom - stroke && x >= Math.round(size * 0.28) && x <= Math.round(size * 0.72))
      );
      const windowLine = inBadge && x >= Math.round(size * 0.4) && x <= Math.round(size * 0.6) &&
        [0.41, 0.5, 0.59].some((position) => Math.abs(y - Math.round(size * position)) < stroke / 2);
      if (wall || windowLine) color = [255, 255, 255, 255];
      pixels.set(color, offset);
    }
  }

  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0);
  header.writeUInt32BE(size, 4);
  header.set([8, 6, 0, 0, 0], 8);
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", header),
    chunk("IDAT", deflateSync(pixels, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

mkdirSync("public/icons", { recursive: true });
for (const size of [192, 512]) {
  writeFileSync(`public/icons/icon-${size}.png`, createIcon(size));
  writeFileSync(`public/icons/icon-maskable-${size}.png`, createIcon(size, true));
}
writeFileSync("public/icons/apple-touch-icon.png", createIcon(180));
