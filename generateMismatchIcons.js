/**
 * 批量生成错误/缺失 emoji 对应的食物图标
 * 使用可灵AI生成 flat vector icon 风格，透明背景 240×240px
 *
 * 用法：node generateMismatchIcons.js
 */

require('dotenv').config();
const fs   = require('fs');
const path = require('path');
const https = require('https');
const { execSync } = require('child_process');
const jwt  = require('jsonwebtoken');

const OUTPUT_DIR = './static/food-images/emoji-icons';
const API_BASE   = 'https://api-beijing.klingai.com';

// 需要生成图标的食物列表（emoji 不匹配或使用色块的）
const MISMATCH_FOODS = [
  // 色块 emoji
  { id: 'food_veg_beetroot',       enName: 'beetroot',                   prompt: 'single beetroot root vegetable, flat vector icon, deep red purple, white background, clean minimal food icon' },
  { id: 'food_veg_black_fungus',   enName: 'black fungus',               prompt: 'single black wood ear fungus mushroom, flat vector icon, dark brown, white background, clean minimal food icon' },
  { id: 'food_fruit_pomegranate',  enName: 'pomegranate',                prompt: 'single pomegranate fruit, flat vector icon, red, white background, clean minimal food icon' },
  { id: 'food_fruit_persimmon',    enName: 'persimmon',                  prompt: 'single persimmon fruit, flat vector icon, orange, white background, clean minimal food icon' },
  { id: 'food_fruit_lychee',       enName: 'lychee',                     prompt: 'single lychee fruit, flat vector icon, pink red skin with white flesh, white background, clean minimal food icon' },
  { id: 'food_meat_pig_blood',     enName: 'pig blood curd',             prompt: 'single pig blood tofu curd block, flat vector icon, dark red brown, white background, clean minimal food icon' },
  { id: 'food_egg_egg_yolk',       enName: 'egg yolk',                   prompt: 'single cracked egg showing yolk, flat vector icon, yellow yolk white background, clean minimal food icon' },
  { id: 'food_egg_duck_egg',       enName: 'duck egg',                   prompt: 'single duck egg, flat vector icon, pale blue green shell, white background, clean minimal food icon' },
  { id: 'food_legume_soybean',     enName: 'soybean',                    prompt: 'single pile of soybeans, flat vector icon, yellow green beans, white background, clean minimal food icon' },
  { id: 'food_legume_lentil',      enName: 'lentil',                     prompt: 'single pile of lentils, flat vector icon, orange red lentils, white background, clean minimal food icon' },
  { id: 'food_legume_chickpea',    enName: 'chickpea',                   prompt: 'single pile of chickpeas, flat vector icon, beige tan chickpeas, white background, clean minimal food icon' },
  { id: 'food_legume_mung_bean',   enName: 'mung bean',                  prompt: 'single pile of mung beans, flat vector icon, small green beans, white background, clean minimal food icon' },
  { id: 'food_legume_black_bean',  enName: 'black bean',                 prompt: 'single pile of black beans, flat vector icon, shiny black beans, white background, clean minimal food icon' },
  { id: 'food_nut_sesame_paste',   enName: 'black sesame paste',         prompt: 'single bowl of black sesame paste, flat vector icon, dark grey paste in bowl, white background, clean minimal food icon' },
  { id: 'food_nut_tahini',         enName: 'white sesame tahini',        prompt: 'single jar of tahini sesame paste, flat vector icon, creamy beige paste, white background, clean minimal food icon' },
  // 错误 emoji（食物类型不对）
  { id: 'food_grain_steamed_bun',  enName: 'steamed bun mantou',         prompt: 'single steamed bun mantou, flat vector icon, white round steamed bread, white background, clean minimal food icon' },
  { id: 'food_legume_tofu',        enName: 'tofu',                       prompt: 'single tofu block, flat vector icon, white silken tofu cube, white background, clean minimal food icon' },
  { id: 'food_veg_amaranth',       enName: 'amaranth vegetable',         prompt: 'single amaranth leaves vegetable, flat vector icon, green red leaves, white background, clean minimal food icon' },
  { id: 'food_fruit_jujube',       enName: 'red jujube date',            prompt: 'single red jujube Chinese date, flat vector icon, red oval fruit, white background, clean minimal food icon' },
  { id: 'food_grain_coix',         enName: "coix seeds job's tears",     prompt: "single coix seeds job's tears barley, flat vector icon, white pearly grains, white background, clean minimal food icon" },
  { id: 'food_veg_water_chestnut', enName: 'water chestnut',             prompt: 'single water chestnut, flat vector icon, brown dark corm with white flesh, white background, clean minimal food icon' },
  { id: 'food_sea_hairtail',       enName: 'hairtail fish belt fish',     prompt: 'single hairtail belt fish, flat vector icon, long silver fish, white background, clean minimal food icon' },
  { id: 'food_veg_luffa',          enName: 'luffa sponge gourd',         prompt: 'single luffa ridge gourd, flat vector icon, long green ribbed vegetable, white background, clean minimal food icon' },
  { id: 'food_veg_winter_melon',   enName: 'winter melon wax gourd',     prompt: 'single winter melon wax gourd, flat vector icon, large green oblong melon, white background, clean minimal food icon' },
  // 相近但不准确
  { id: 'food_fruit_mulberry',     enName: 'mulberry',                   prompt: 'single mulberry fruit, flat vector icon, dark purple elongated berry, white background, clean minimal food icon' },
  { id: 'food_fruit_cantaloupe',   enName: 'cantaloupe hami melon',      prompt: 'single cantaloupe hami melon, flat vector icon, yellow orange oval melon, white background, clean minimal food icon' },
];

const NEG_PROMPT = 'face, eyes, mouth, smile, character, person, arms, hands, autumn leaves, falling leaves, leaf decoration, watermark, text, shadow, realistic photo, 3D render, multiple objects, complex background';

// JWT 鉴权
function getKlingToken() {
  const ak = process.env.KLING_ACCESS_KEY;
  const sk = process.env.KLING_SECRET_KEY;
  if (!ak || !sk) throw new Error('缺少 KLING_ACCESS_KEY 或 KLING_SECRET_KEY');
  return jwt.sign(
    { iss: ak, exp: Math.floor(Date.now() / 1000) + 1800, nbf: Math.floor(Date.now() / 1000) - 5 },
    sk,
    { algorithm: 'HS256', header: { alg: 'HS256', typ: 'JWT' } }
  );
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function klingRequest(method, endpoint, body) {
  const token = getKlingToken();
  const res = await fetch(`${API_BASE}${endpoint}`, {
    method,
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();
  if (data.code !== 0) throw new Error(`可灵API错误 ${data.code}: ${data.message}`);
  return data.data;
}

async function downloadFile(url, destPath) {
  return new Promise((resolve, reject) => {
    fs.mkdirSync(path.dirname(destPath), { recursive: true });
    const file = fs.createWriteStream(destPath);
    https.get(url, res => {
      res.pipe(file);
      file.on('finish', () => file.close(resolve));
    }).on('error', err => { fs.unlink(destPath, () => {}); reject(err); });
  });
}

function removeBgAndResize(rawPath, finalPath) {
  const py = `
import sys
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
print('ok')
`.trim();

  const pyFile = '/tmp/_rmBg_icon.py';
  fs.writeFileSync(pyFile, py);
  execSync(`python3 ${pyFile}`, { stdio: 'pipe' });
}

async function generateIcon(food) {
  // 1. 提交生成任务
  const task = await klingRequest('POST', '/v1/images/generations', {
    model_name: 'kling-v1',
    prompt: food.prompt,
    negative_prompt: NEG_PROMPT,
    image_count: 1,
    aspect_ratio: '1:1',
  });

  const taskId = task.task_id;
  if (!taskId) throw new Error('未获取 task_id');

  // 2. 轮询结果
  for (let i = 0; i < 40; i++) {
    await sleep(3000);
    const result = await klingRequest('GET', `/v1/images/generations/${taskId}`);
    const status = result.task_status;
    if (status === 'succeed') {
      const imgUrl = result.task_result?.images?.[0]?.url;
      if (!imgUrl) throw new Error('结果无图片URL');
      return imgUrl;
    }
    if (status === 'failed') throw new Error(result.task_status_msg || '任务失败');
  }
  throw new Error('生成超时');
}

async function main() {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  // 跳过已有图标
  const todo = MISMATCH_FOODS.filter(f => {
    const finalPath = path.join(OUTPUT_DIR, `${f.id}.png`);
    return !fs.existsSync(finalPath);
  });

  console.log(`共 ${MISMATCH_FOODS.length} 种，已完成 ${MISMATCH_FOODS.length - todo.length} 种，待生成 ${todo.length} 种\n`);

  const results = { success: [], failed: [] };

  for (let i = 0; i < todo.length; i++) {
    const food = todo[i];
    const rawPath  = `/tmp/_icon_raw_${food.id}.png`;
    const finalPath = path.join(OUTPUT_DIR, `${food.id}.png`);

    process.stdout.write(`[${i + 1}/${todo.length}] ${food.id} ... `);
    const t0 = Date.now();

    try {
      const imgUrl = await generateIcon(food);
      await downloadFile(imgUrl, rawPath);
      removeBgAndResize(rawPath, finalPath);
      fs.unlinkSync(rawPath);

      const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
      console.log(`✓ ${elapsed}s → ${finalPath}`);
      results.success.push(food.id);
    } catch (err) {
      console.log(`✗ ${err.message}`);
      results.failed.push({ id: food.id, error: err.message });
    }

    // 每4个任务后稍微休息一下，避免并发限流
    if ((i + 1) % 4 === 0) {
      console.log('  (短暂休息 3s...)');
      await sleep(3000);
    }
  }

  console.log('\n===== 完成 =====');
  console.log(`成功: ${results.success.length}  失败: ${results.failed.length}`);
  if (results.failed.length > 0) {
    console.log('失败列表:', results.failed);
  }

  // 输出 FOOD_ICON_URL 补丁，方便复制到 food-library.js
  const allGenerated = MISMATCH_FOODS.filter(f =>
    fs.existsSync(path.join(OUTPUT_DIR, `${f.id}.png`))
  );
  if (allGenerated.length > 0) {
    console.log('\n===== 复制以下内容更新 food-library.js 中的 FOOD_ICON_URL =====');
    for (const f of allGenerated) {
      console.log(`  '${f.id}': '/static/food-images/emoji-icons/${f.id}.png',`);
    }
  }
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
