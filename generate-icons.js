// generate-icons.js — 生成简洁 tabBar 图标
const Jimp = require('jimp');
const path = require('path');
const fs = require('fs');

const SIZE = 81;

function drawSimpleLine(img, x1, y1, x2, y2, color, thick) {
  const col = Jimp.cssColorToHex(color);
  const steps = Math.max(Math.abs(x2-x1), Math.abs(y2-y1));
  for (let i = 0; i <= steps; i++) {
    const t = steps === 0 ? 0 : i / steps;
    const x = Math.round(x1 + (x2 - x1) * t);
    const y = Math.round(y1 + (y2 - y1) * t);
    for (let dx = -thick; dx <= thick; dx++) {
      for (let dy = -thick; dy <= thick; dy++) {
        if (dx*dx + dy*dy <= thick*thick) {
          const px = x + dx, py = y + dy;
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
        const dist = Math.sqrt((x-cx)*(x-cx) + (y-cy)*(y-cy));
        if (dist <= r) img.setPixelColor(col, x, y);
      }
    }
  }
}

const COLOR = '#888888';

// 简单房子
async function drawHome(img, color) {
  drawSimpleLine(img, 10, 36, 40, 12, color, 2);
  drawSimpleLine(img, 40, 12, 71, 36, color, 2);
  drawSimpleLine(img, 12, 36, 12, 68, color, 2);
  drawSimpleLine(img, 12, 68, 68, 68, color, 2);
  drawSimpleLine(img, 68, 68, 68, 36, color, 2);
  drawSimpleLine(img, 32, 68, 32, 50, color, 2);
  drawSimpleLine(img, 32, 50, 48, 50, color, 2);
  drawSimpleLine(img, 48, 50, 48, 68, color, 2);
}

// 食物：碗 + 小芽（与 home/trace 同风格线稿）
async function drawPlan(img, color) {
  // 小芽
  drawSimpleLine(img, 40, 18, 40, 34, color, 2);
  drawSimpleLine(img, 40, 19, 31, 12, color, 2);
  drawSimpleLine(img, 31, 12, 24, 18, color, 2);
  drawSimpleLine(img, 40, 19, 49, 12, color, 2);
  drawSimpleLine(img, 49, 12, 56, 18, color, 2);

  // 碗沿
  drawSimpleLine(img, 18, 34, 62, 34, color, 2);

  // 碗身
  drawSimpleLine(img, 18, 34, 24, 50, color, 2);
  drawSimpleLine(img, 62, 34, 56, 50, color, 2);
  drawSimpleLine(img, 24, 50, 56, 50, color, 2);

  // 碗底托
  drawSimpleLine(img, 28, 56, 52, 56, color, 2);

  // 碗内食物纹理
  drawSimpleLine(img, 26, 40, 54, 40, color, 1);
  drawSimpleLine(img, 29, 45, 51, 45, color, 1);
}

// 红色十字（方形圆角背景，更大）
async function drawRecord(img, color) {
  const red = Jimp.cssColorToHex('#FF4757');
  const white = Jimp.cssColorToHex('#FFFFFF');
  const mid = 40;
  // 红色圆角方形背景（更大）
  const left = 6, top = 6, right = 74, bottom = 74, radius = 18;
  for (let y = top; y <= bottom; y++) {
    for (let x = left; x <= right; x++) {
      let inRect = true;
      if (x < left + radius && y < top + radius) {
        const dx = left + radius - x, dy = top + radius - y;
        if (dx*dx + dy*dy > radius*radius) inRect = false;
      } else if (x > right - radius && y < top + radius) {
        const dx = x - (right - radius), dy = top + radius - y;
        if (dx*dx + dy*dy > radius*radius) inRect = false;
      } else if (x < left + radius && y > bottom - radius) {
        const dx = left + radius - x, dy = y - (bottom - radius);
        if (dx*dx + dy*dy > radius*radius) inRect = false;
      } else if (x > right - radius && y > bottom - radius) {
        const dx = x - (right - radius), dy = y - (bottom - radius);
        if (dx*dx + dy*dy > radius*radius) inRect = false;
      }
      if (inRect) img.setPixelColor(red, x, y);
    }
  }
  // 白色十字
  const thick = 4, len = 20;
  for (let x = mid - len; x <= mid + len; x++) {
    for (let y = mid - thick; y <= mid + thick; y++) {
      img.setPixelColor(white, x, y);
    }
  }
  for (let y = mid - len; y <= mid + len; y++) {
    for (let x = mid - thick; x <= mid + thick; x++) {
      img.setPixelColor(white, x, y);
    }
  }
}

// 日历
async function drawTrace(img, color) {
  drawSimpleLine(img, 14, 18, 67, 18, color, 2);
  drawSimpleLine(img, 14, 18, 14, 66, color, 2);
  drawSimpleLine(img, 67, 18, 67, 66, color, 2);
  drawSimpleLine(img, 14, 66, 67, 66, color, 2);
  drawSimpleLine(img, 14, 26, 67, 26, color, 2);
  fillPixelCircle(img, 24, 22, 2, color);
  fillPixelCircle(img, 57, 22, 2, color);
  fillPixelCircle(img, 26, 46, 4, color);
  fillPixelCircle(img, 40, 46, 4, color);
  fillPixelCircle(img, 54, 46, 4, color);
}

// 人物
async function drawMine(img, color) {
  fillPixelCircle(img, 40, 26, 10, color);
  drawSimpleLine(img, 18, 58, 26, 44, color, 2);
  drawSimpleLine(img, 26, 44, 54, 44, color, 2);
  drawSimpleLine(img, 54, 44, 62, 58, color, 2);
  drawSimpleLine(img, 18, 58, 62, 58, color, 2);
}

async function main() {
  const iconDir = path.join(__dirname, 'static', 'icons');

  const icons = [
    { name: 'home', draw: drawHome },
    { name: 'plan', draw: drawPlan },
    { name: 'record', draw: drawRecord },
    { name: 'trace', draw: drawTrace },
    { name: 'mine', draw: drawMine },
  ];

  for (const icon of icons) {
    // 普通态（灰色）
    const imgNormal = new Jimp(SIZE, SIZE, 0x00000000);
    await icon.draw(imgNormal, COLOR);
    await imgNormal.writeAsync(path.join(iconDir, `${icon.name}.png`));
    console.log(`Generated: ${icon.name}.png`);

    // 选中态（白色，用于彩色背景上）
    const imgActive = new Jimp(SIZE, SIZE, 0x00000000);
    await icon.draw(imgActive, '#FFFFFF');
    await imgActive.writeAsync(path.join(iconDir, `${icon.name}-active.png`));
    console.log(`Generated: ${icon.name}-active.png`);
  }

  console.log('All done!');
}

main().catch(console.error);
