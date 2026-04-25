const Jimp = require('jimp');
const path = require('path');

const SIZE = 81;
const ICON_DIR = path.join(__dirname, 'static', 'icons');
const NORMAL_COLOR = '#888888';
const ACTIVE_COLOR = '#FFFFFF';

function drawSimpleLine(img, x1, y1, x2, y2, color, thick) {
  const col = Jimp.cssColorToHex(color);
  const steps = Math.max(Math.abs(x2 - x1), Math.abs(y2 - y1));
  for (let i = 0; i <= steps; i++) {
    const t = steps === 0 ? 0 : i / steps;
    const x = Math.round(x1 + (x2 - x1) * t);
    const y = Math.round(y1 + (y2 - y1) * t);
    for (let dx = -thick; dx <= thick; dx++) {
      for (let dy = -thick; dy <= thick; dy++) {
        if (dx * dx + dy * dy <= thick * thick) {
          const px = x + dx;
          const py = y + dy;
          if (px >= 0 && px < SIZE && py >= 0 && py < SIZE) {
            img.setPixelColor(col, px, py);
          }
        }
      }
    }
  }
}

function fillPixelCircle(img, cx, cy, r, color) {
  const col = Jimp.cssColorToHex(color);
  for (let y = cy - r; y <= cy + r; y++) {
    for (let x = cx - r; x <= cx + r; x++) {
      if (x >= 0 && x < SIZE && y >= 0 && y < SIZE) {
        const dist = Math.sqrt((x - cx) * (x - cx) + (y - cy) * (y - cy));
        if (dist <= r) img.setPixelColor(col, x, y);
      }
    }
  }
}

function drawEllipseRing(img, cx, cy, rx, ry, color, thick, startAngle = 0, endAngle = Math.PI * 2) {
  for (let t = startAngle; t <= endAngle; t += 0.01) {
    const x = Math.round(cx + Math.cos(t) * rx);
    const y = Math.round(cy + Math.sin(t) * ry);
    drawSimpleLine(img, x, y, x, y, color, thick);
  }
}

async function drawApple(img, color) {
  const col = Jimp.cssColorToHex(color);

  for (let y = 18; y <= 66; y++) {
    for (let x = 14; x <= 66; x++) {
      const left = ((x - 29) * (x - 29)) / (15 * 15) + ((y - 36) * (y - 36)) / (14 * 14);
      const right = ((x - 51) * (x - 51)) / (15 * 15) + ((y - 36) * (y - 36)) / (14 * 14);
      const bottom = ((x - 40) * (x - 40)) / (22 * 22) + ((y - 50) * (y - 50)) / (18 * 18);
      const topGap = ((x - 40) * (x - 40)) / (6 * 6) + ((y - 28) * (y - 28)) / (5 * 5);
      const inShape = (left <= 1 || right <= 1 || bottom <= 1) && topGap >= 1;
      const innerLeft = ((x - 29) * (x - 29)) / (11 * 11) + ((y - 36) * (y - 36)) / (10 * 10);
      const innerRight = ((x - 51) * (x - 51)) / (11 * 11) + ((y - 36) * (y - 36)) / (10 * 10);
      const innerBottom = ((x - 40) * (x - 40)) / (17 * 17) + ((y - 50) * (y - 50)) / (13 * 13);
      const innerGap = ((x - 40) * (x - 40)) / (9 * 9) + ((y - 29) * (y - 29)) / (7 * 7);
      const inInner = (innerLeft <= 1 || innerRight <= 1 || innerBottom <= 1) && innerGap >= 1;
      if (inShape && !inInner) {
        img.setPixelColor(col, x, y);
      }
    }
  }

  drawSimpleLine(img, 40, 22, 43, 12, color, 2);
  drawSimpleLine(img, 43, 13, 52, 18, color, 2);
  drawSimpleLine(img, 52, 18, 56, 24, color, 2);
}

async function drawBowl(img, color) {
  drawEllipseRing(img, 40, 44, 24, 11, color, 2, Math.PI * 0.08, Math.PI * 0.92);
  drawSimpleLine(img, 18, 44, 24, 58, color, 2);
  drawSimpleLine(img, 62, 44, 56, 58, color, 2);
  drawSimpleLine(img, 25, 58, 55, 58, color, 2);
  drawSimpleLine(img, 28, 63, 52, 63, color, 2);
  drawSimpleLine(img, 55, 19, 46, 31, color, 2);
  drawSimpleLine(img, 46, 31, 41, 27, color, 2);
  drawSimpleLine(img, 33, 18, 41, 30, color, 2);
}

async function drawCarrot(img, color) {
  drawSimpleLine(img, 28, 20, 54, 30, color, 2);
  drawSimpleLine(img, 54, 30, 46, 61, color, 2);
  drawSimpleLine(img, 46, 61, 21, 50, color, 2);
  drawSimpleLine(img, 21, 50, 28, 20, color, 2);
  drawSimpleLine(img, 36, 14, 28, 4, color, 2);
  drawSimpleLine(img, 40, 14, 42, 3, color, 2);
  drawSimpleLine(img, 44, 16, 54, 8, color, 2);
  drawSimpleLine(img, 33, 28, 44, 32, color, 1);
  drawSimpleLine(img, 30, 38, 42, 43, color, 1);
  drawSimpleLine(img, 27, 48, 38, 53, color, 1);
}

async function drawPlate(img, color) {
  drawEllipseRing(img, 40, 42, 24, 24, color, 2);
  drawEllipseRing(img, 40, 42, 14, 14, color, 2);
  drawSimpleLine(img, 18, 19, 11, 12, color, 2);
  drawSimpleLine(img, 18, 65, 11, 72, color, 2);
  drawSimpleLine(img, 62, 19, 69, 12, color, 2);
  drawSimpleLine(img, 62, 65, 69, 72, color, 2);
}

async function drawPeaPod(img, color) {
  drawSimpleLine(img, 18, 46, 26, 28, color, 2);
  drawSimpleLine(img, 26, 28, 53, 27, color, 2);
  drawSimpleLine(img, 53, 27, 63, 41, color, 2);
  drawSimpleLine(img, 63, 41, 57, 56, color, 2);
  drawSimpleLine(img, 57, 56, 28, 58, color, 2);
  drawSimpleLine(img, 28, 58, 18, 46, color, 2);
  fillPixelCircle(img, 31, 42, 4, color);
  fillPixelCircle(img, 42, 41, 4, color);
  fillPixelCircle(img, 53, 41, 4, color);
  drawSimpleLine(img, 24, 25, 18, 17, color, 2);
}

async function writeVariant(name, draw) {
  const normal = new Jimp(SIZE, SIZE, 0x00000000);
  await draw(normal, NORMAL_COLOR);
  await normal.writeAsync(path.join(ICON_DIR, `${name}.png`));

  const active = new Jimp(SIZE, SIZE, 0x00000000);
  await draw(active, ACTIVE_COLOR);
  await active.writeAsync(path.join(ICON_DIR, `${name}-active.png`));

  console.log(`Generated: ${name}.png / ${name}-active.png`);
}

async function main() {
  const variants = [
    { name: 'food-apple', draw: drawApple },
    { name: 'food-bowl', draw: drawBowl },
    { name: 'food-carrot', draw: drawCarrot },
    { name: 'food-plate', draw: drawPlate },
    { name: 'food-peapod', draw: drawPeaPod },
  ];

  for (const variant of variants) {
    await writeVariant(variant.name, variant.draw);
  }
}

main().catch(console.error);
