/**
 * 定点重生成当前不相符或主体过小的食物图标（覆盖已有文件）
 * node generateIconFixes.js
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const https = require('https');
const { execSync } = require('child_process');
const jwt = require('jsonwebtoken');

const OUTPUT_DIR = './static/food-images/emoji-icons';
const API_BASE = 'https://api-beijing.klingai.com';

const FIX_FOODS = [
  {
    id: 'food_grain_coix',
    prompt: 'single bowl of coix porridge job\'s tears congee, flat vector icon, creamy light beige porridge clearly shown in bowl, close-up centered composition, white background, clean minimal food icon',
  },
  {
    id: 'food_grain_steamed_bun',
    prompt: 'single plain mantou steamed bun, flat vector icon, large white round bun with no filling and no sesame, close-up centered composition, white background, clean minimal food icon',
  },
  {
    id: 'food_egg_duck_egg',
    prompt: 'single duck egg yolk food, flat vector icon, halved cooked duck egg showing bright yolk, close-up centered composition, white background, clean minimal food icon',
  },
  {
    id: 'food_legume_black_bean',
    prompt: 'single pile of black beans, flat vector icon, shiny round black bean seeds clearly visible, close-up centered composition, white background, clean minimal food icon',
  },
  {
    id: 'food_sea_hairtail',
    prompt: 'single hairtail beltfish, flat vector icon, long narrow silver ribbon fish clearly visible, side view close-up centered composition, white background, clean minimal food icon',
  },
  {
    id: 'food_veg_amaranth',
    prompt: 'single amaranth leafy vegetable, flat vector icon, bunch of green leaves with reddish stems, close-up centered composition, white background, clean minimal food icon',
  },
  {
    id: 'food_veg_black_fungus',
    prompt: 'single black fungus wood ear mushroom, flat vector icon, dark brown black ruffled fungus pieces clearly visible, close-up centered composition, white background, clean minimal food icon',
  },
  {
    id: 'food_veg_winter_melon',
    prompt: 'single winter melon wax gourd, flat vector icon, green oblong wax gourd with pale interior slice, close-up centered composition, white background, clean minimal food icon',
  },
  {
    id: 'food_nut_tahini',
    prompt: 'single bowl of sunflower seed paste, flat vector icon, creamy beige paste in small bowl with sunflower seeds beside, close-up centered composition, white background, clean minimal food icon',
  },
];

const NEG_PROMPT = 'face, eyes, mouth, smile, cartoon character, person, animal mascot, chick, duckling, arms, hands, sesame bun, stuffed bun, red bean bun, bread loaf, watermelon stripes, broccoli, cabbage, mushroom cap, watermark, text, shadow, realistic photo, 3D render, multiple objects, complex background';

function getKlingToken() {
  const { KLING_ACCESS_KEY: ak, KLING_SECRET_KEY: sk } = process.env;
  if (!ak || !sk) throw new Error('缺少 KLING_ACCESS_KEY 或 KLING_SECRET_KEY');
  return jwt.sign(
    { iss: ak, exp: Math.floor(Date.now() / 1000) + 1800, nbf: Math.floor(Date.now() / 1000) - 5 },
    sk,
    { algorithm: 'HS256', header: { alg: 'HS256', typ: 'JWT' } }
  );
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function klingRequest(method, endpoint, body) {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    method,
    headers: {
      Authorization: `Bearer ${getKlingToken()}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();
  if (data.code !== 0) throw new Error(`可灵 ${data.code}: ${data.message}`);
  return data.data;
}

async function downloadFile(url, destPath) {
  return new Promise((resolve, reject) => {
    fs.mkdirSync(path.dirname(destPath), { recursive: true });
    const file = fs.createWriteStream(destPath);
    https.get(url, res => {
      res.pipe(file);
      file.on('finish', () => file.close(resolve));
    }).on('error', err => {
      fs.unlink(destPath, () => {});
      reject(err);
    });
  });
}

function removeBgAndResize(rawPath, finalPath) {
  const py = `
import numpy as np
from PIL import Image

img = Image.open(r'${rawPath}').convert('RGBA')
data = np.array(img)
r, g, b, a = data[:,:,0], data[:,:,1], data[:,:,2], data[:,:,3]
white_mask = (r > 230) & (g > 230) & (b > 230)
data[white_mask, 3] = 0
result = Image.fromarray(data, 'RGBA')
bbox = result.getbbox()
if bbox:
    result = result.crop(bbox)
    side = max(result.size)
    square = Image.new('RGBA', (side, side), (0, 0, 0, 0))
    offset = ((side - result.width) // 2, (side - result.height) // 2)
    square.paste(result, offset)
    result = square
result = result.resize((240, 240), Image.LANCZOS)
result.save(r'${finalPath}', 'PNG')
`.trim();

  const pyFile = '/tmp/_food_icon_fix.py';
  fs.writeFileSync(pyFile, py);
  execSync(`python3 ${pyFile}`, { stdio: 'pipe' });
}

async function generateIcon(food) {
  const task = await klingRequest('POST', '/v1/images/generations', {
    model_name: 'kling-v1',
    prompt: food.prompt,
    negative_prompt: NEG_PROMPT,
    image_count: 1,
    aspect_ratio: '1:1',
  });

  const taskId = task.task_id;
  if (!taskId) throw new Error('无 task_id');

  for (let i = 0; i < 40; i++) {
    await sleep(3000);
    const result = await klingRequest('GET', `/v1/images/generations/${taskId}`);
    if (result.task_status === 'succeed') {
      const url = result.task_result?.images?.[0]?.url;
      if (!url) throw new Error('无图片URL');
      return url;
    }
    if (result.task_status === 'failed') {
      throw new Error(result.task_status_msg || '任务失败');
    }
  }
  throw new Error('超时');
}

async function main() {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  const failed = [];

  console.log(`共 ${FIX_FOODS.length} 种，开始覆盖重生成\\n`);

  for (let i = 0; i < FIX_FOODS.length; i++) {
    const food = FIX_FOODS[i];
    const rawPath = `/tmp/_icon_fix_${food.id}.png`;
    const finalPath = path.join(OUTPUT_DIR, `${food.id}.png`);

    process.stdout.write(`[${i + 1}/${FIX_FOODS.length}] ${food.id} ... `);
    const t0 = Date.now();

    try {
      const url = await generateIcon(food);
      await downloadFile(url, rawPath);
      removeBgAndResize(rawPath, finalPath);
      try { fs.unlinkSync(rawPath); } catch {}
      console.log(`✓ ${((Date.now() - t0) / 1000).toFixed(1)}s`);
    } catch (err) {
      console.log(`✗ ${err.message}`);
      failed.push({ id: food.id, error: err.message });
    }

    if ((i + 1) % 3 === 0) {
      console.log('  (短暂休息 3s...)');
      await sleep(3000);
    }
  }

  console.log(`\\n完成，失败 ${failed.length} 个`);
  if (failed.length) console.log(failed);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
