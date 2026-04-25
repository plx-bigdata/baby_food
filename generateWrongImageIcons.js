/**
 * 为云端图片不符的食物批量生成 AI 图标
 * node generateWrongImageIcons.js
 */

require('dotenv').config();
const fs   = require('fs');
const path = require('path');
const https = require('https');
const { execSync } = require('child_process');
const jwt  = require('jsonwebtoken');

const OUTPUT_DIR = './static/food-images/emoji-icons';
const API_BASE   = 'https://api-beijing.klingai.com';

const WRONG_IMAGE_FOODS = [
  { id: 'food_grain_noodles',           prompt: 'single cooked noodles, flat vector icon, yellow white noodles swirl, white background, clean minimal food icon' },
  { id: 'food_grain_bread',             prompt: 'single sliced bread loaf, flat vector icon, golden brown bread, white background, clean minimal food icon' },
  { id: 'food_grain_purple_sweet_potato', prompt: 'single purple sweet potato, flat vector icon, dark purple oblong root, white background, clean minimal food icon' },
  { id: 'food_veg_zucchini',            prompt: 'single zucchini courgette, flat vector icon, dark green cylinder vegetable, white background, clean minimal food icon' },
  { id: 'food_veg_cabbage',             prompt: 'single round green cabbage head, flat vector icon, pale green layered ball, white background, clean minimal food icon' },
  { id: 'food_veg_rapeseed_greens',     prompt: 'single rapeseed greens oil vegetable, flat vector icon, green leafy vegetable with yellow flower, white background, clean minimal food icon' },
  { id: 'food_veg_taro',                prompt: 'single taro root, flat vector icon, brown hairy corm with purple flesh inside, white background, clean minimal food icon' },
  { id: 'food_veg_shiitake',            prompt: 'single shiitake mushroom, flat vector icon, brown cap with white gills, white background, clean minimal food icon' },
  { id: 'food_fruit_pineapple',         prompt: 'single pineapple, flat vector icon, yellow tropical fruit with green crown, white background, clean minimal food icon' },
  { id: 'food_fruit_loquat',            prompt: 'single loquat fruit, flat vector icon, small oval orange yellow fruit, white background, clean minimal food icon' },
  { id: 'food_meat_chicken_liver',      prompt: 'single chicken liver, flat vector icon, dark reddish brown chicken liver piece, white background, clean minimal food icon' },
  { id: 'food_meat_beef_liver',         prompt: 'single beef liver, flat vector icon, deep dark red beef liver slice, white background, clean minimal food icon' },
  { id: 'food_sea_sea_bass',            prompt: 'single sea bass fish, flat vector icon, silver grey fish with stripes, white background, clean minimal food icon' },
  { id: 'food_sea_yellow_croaker',      prompt: 'single yellow croaker fish, flat vector icon, golden yellow fish, white background, clean minimal food icon' },
  { id: 'food_legume_soy_milk',         prompt: 'single glass of soy milk, flat vector icon, white milk in glass cup, white background, clean minimal food icon' },
];

const NEG_PROMPT = 'face, eyes, mouth, smile, character, person, arms, hands, autumn leaves, watermark, text, shadow, realistic photo, 3D render, multiple objects, complex background';

function getKlingToken() {
  const ak = process.env.KLING_ACCESS_KEY;
  const sk = process.env.KLING_SECRET_KEY;
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
  if (data.code !== 0) throw new Error(`可灵API ${data.code}: ${data.message}`);
  return data.data;
}

async function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    const file = fs.createWriteStream(dest);
    https.get(url, res => { res.pipe(file); file.on('finish', () => file.close(resolve)); })
      .on('error', err => { fs.unlink(dest, () => {}); reject(err); });
  });
}

function removeBg(rawPath, finalPath) {
  const py = `
import sys, os
os.environ['U2NET_HOME'] = os.path.expanduser('~/.u2net')
from rembg import remove, new_session
from PIL import Image
session = new_session('u2net')
img = Image.open('${rawPath}').convert('RGBA')
result = remove(img, session=session)
bbox = result.getbbox()
if bbox:
    result = result.crop(bbox)
    side = max(result.size)
    sq = Image.new('RGBA', (side, side), (0,0,0,0))
    sq.paste(result, ((side-result.width)//2, (side-result.height)//2))
    result = sq
result = result.resize((240,240), Image.LANCZOS)
result.save('${finalPath}', 'PNG')
print('ok')
`.trim();
  const pyFile = '/tmp/_rmBg2.py';
  fs.writeFileSync(pyFile, py);
  execSync(`/usr/local/opt/python@3.12/bin/python3.12 ${pyFile}`, { stdio: 'pipe' });
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
    if (result.task_status === 'failed') throw new Error('任务失败');
  }
  throw new Error('超时');
}

async function main() {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  const todo = WRONG_IMAGE_FOODS.filter(f => !fs.existsSync(path.join(OUTPUT_DIR, `${f.id}.png`)));
  console.log(`共 ${WRONG_IMAGE_FOODS.length} 种，待生成 ${todo.length} 种\n`);

  const success = [], failed = [];

  for (let i = 0; i < todo.length; i++) {
    const food = todo[i];
    const rawPath   = `/tmp/_icon2_${food.id}.png`;
    const finalPath = path.join(OUTPUT_DIR, `${food.id}.png`);
    process.stdout.write(`[${i+1}/${todo.length}] ${food.id} ... `);
    const t0 = Date.now();
    try {
      const url = await generateIcon(food);
      await downloadFile(url, rawPath);
      removeBg(rawPath, finalPath);
      try { fs.unlinkSync(rawPath); } catch {}
      console.log(`✓ ${((Date.now()-t0)/1000).toFixed(1)}s`);
      success.push(food.id);
    } catch (err) {
      console.log(`✗ ${err.message}`);
      failed.push({ id: food.id, error: err.message });
    }
    if ((i+1) % 4 === 0) { process.stdout.write('  (休息 3s...)\n'); await sleep(3000); }
  }

  console.log(`\n成功: ${success.length}  失败: ${failed.length}`);
  if (failed.length) console.log('失败:', failed);

  const allDone = WRONG_IMAGE_FOODS.filter(f => fs.existsSync(path.join(OUTPUT_DIR, `${f.id}.png`)));
  if (allDone.length) {
    console.log('\n新增到 FOOD_ICON_URL:');
    allDone.forEach(f => console.log(`  '${f.id}': '/static/food-images/emoji-icons/${f.id}.png',`));
  }
}

main().catch(e => { console.error(e); process.exit(1); });
