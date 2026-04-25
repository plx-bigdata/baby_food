/**
 * 重新生成效果不好的图标（覆盖已有文件）
 * node generateRetryIcons.js
 */

require('dotenv').config();
const fs   = require('fs');
const path = require('path');
const https = require('https');
const { execSync } = require('child_process');
const jwt  = require('jsonwebtoken');

const OUTPUT_DIR = './static/food-images/emoji-icons';
const API_BASE   = 'https://api-beijing.klingai.com';

const RETRY_FOODS = [
  { id: 'food_grain_rice_porridge',   prompt: 'single bowl of white rice congee porridge, flat vector icon, white creamy soup in bowl, top view, white background, clean minimal food icon' },
  { id: 'food_grain_millet_porridge', prompt: 'single bowl of yellow millet congee porridge, flat vector icon, golden yellow soup in bowl, top view, white background, clean minimal food icon' },
  { id: 'food_veg_celery',            prompt: 'single celery stalk bunch, flat vector icon, bright green celery with leaves, white background, clean minimal food icon' },
  { id: 'food_veg_asparagus',         prompt: 'single bundle of green asparagus spears, flat vector icon, bright green asparagus stalks tied together, white background, clean minimal food icon' },
  { id: 'food_veg_lotus_root',        prompt: 'single lotus root cross section, flat vector icon, beige round slice showing holes pattern, white background, clean minimal food icon' },
  { id: 'food_veg_rapeseed_greens',   prompt: 'single rapeseed vegetable oil菜 bok choy like green, flat vector icon, dark green leafy vegetable with white stems, white background, clean minimal food icon' },
  { id: 'food_fruit_plum',            prompt: 'single plum fruit, flat vector icon, round dark purple red plum with shine, white background, clean minimal food icon' },
  { id: 'food_meat_pig_liver',        prompt: 'single pig liver slice, flat vector icon, dark reddish brown liver piece, white background, clean minimal food icon' },
  { id: 'food_meat_pig_blood',        prompt: 'single pig blood tofu block, flat vector icon, dark brownish red rectangular block, white background, clean minimal food icon' },
  { id: 'food_sea_hairtail',          prompt: 'single hairtail beltfish, flat vector icon, long silvery flat ribbon fish, white background, clean minimal food icon' },
  { id: 'food_legume_soybean',        prompt: 'single pile of soybeans, flat vector icon, round yellow green soybean seeds, white background, clean minimal food icon' },
  { id: 'food_legume_black_bean',     prompt: 'single pile of black beans, flat vector icon, shiny round black bean seeds, white background, clean minimal food icon' },
  { id: 'food_nut_flaxseed',          prompt: 'single pile of flaxseeds linseed powder, flat vector icon, small brown oval seeds, white background, clean minimal food icon' },
  { id: 'food_nut_almond_paste',      prompt: 'single bowl of almond paste cream, flat vector icon, smooth creamy paste in bowl with almonds beside, white background, clean minimal food icon' },
  { id: 'food_nut_walnut_paste',      prompt: 'single bowl of walnut paste cream, flat vector icon, dark brown walnut paste in bowl with walnut beside, white background, clean minimal food icon' },
  { id: 'food_oil_walnut_oil',        prompt: 'single small bottle of walnut oil, flat vector icon, glass bottle with golden oil and walnut beside, white background, clean minimal food icon' },
];

const NEG_PROMPT = 'face, eyes, mouth, smile, character, person, arms, hands, autumn leaves, watermark, text, shadow, realistic photo, 3D render, multiple objects, complex background';

function getKlingToken() {
  const { KLING_ACCESS_KEY: ak, KLING_SECRET_KEY: sk } = process.env;
  return jwt.sign(
    { iss: ak, exp: Math.floor(Date.now() / 1000) + 1800, nbf: Math.floor(Date.now() / 1000) - 5 },
    sk, { algorithm: 'HS256', header: { alg: 'HS256', typ: 'JWT' } }
  );
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function klingRequest(method, endpoint, body) {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    method,
    headers: { 'Authorization': `Bearer ${getKlingToken()}`, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();
  if (data.code !== 0) throw new Error(`可灵 ${data.code}: ${data.message}`);
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
import os; os.environ['U2NET_HOME'] = os.path.expanduser('~/.u2net')
from rembg import remove, new_session
from PIL import Image
session = new_session('u2net')
img = Image.open(r'${rawPath}').convert('RGBA')
result = remove(img, session=session)
bbox = result.getbbox()
if bbox:
    result = result.crop(bbox)
    side = max(result.size)
    sq = Image.new('RGBA', (side, side), (0,0,0,0))
    sq.paste(result, ((side-result.width)//2, (side-result.height)//2))
    result = sq
result = result.resize((240,240), Image.LANCZOS)
result.save(r'${finalPath}', 'PNG')
`.trim();
  const f = '/tmp/_retry_bg.py';
  fs.writeFileSync(f, py);
  execSync(`/usr/local/opt/python@3.12/bin/python3.12 ${f}`, { stdio: 'pipe' });
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
    const r = await klingRequest('GET', `/v1/images/generations/${taskId}`);
    if (r.task_status === 'succeed') return r.task_result?.images?.[0]?.url;
    if (r.task_status === 'failed') throw new Error('任务失败');
  }
  throw new Error('超时');
}

async function main() {
  const failed = [];
  console.log(`共 ${RETRY_FOODS.length} 种，全部重新生成（覆盖）\n`);

  for (let i = 0; i < RETRY_FOODS.length; i++) {
    const food = RETRY_FOODS[i];
    const raw  = `/tmp/_retry_${food.id}.png`;
    const dest = path.join(OUTPUT_DIR, `${food.id}.png`);
    process.stdout.write(`[${i+1}/${RETRY_FOODS.length}] ${food.id} ... `);
    const t0 = Date.now();
    try {
      const url = await generateIcon(food);
      await downloadFile(url, raw);
      removeBg(raw, dest);
      try { fs.unlinkSync(raw); } catch {}
      console.log(`✓ ${((Date.now()-t0)/1000).toFixed(1)}s`);
    } catch (err) {
      console.log(`✗ ${err.message}`);
      failed.push({ id: food.id, error: err.message });
    }
    if ((i+1) % 4 === 0) { process.stdout.write('  (休息 3s...)\n'); await sleep(3000); }
  }

  console.log(`\n完成  失败: ${failed.length}`);
  if (failed.length) console.log(failed);

  // 列出需要新增到 FOOD_ICON_URL 的（原本没有 icon 的）
  const newIds = ['food_veg_celery','food_veg_asparagus','food_veg_lotus_root',
    'food_fruit_plum','food_meat_pig_liver','food_nut_flaxseed',
    'food_nut_almond_paste','food_nut_walnut_paste','food_oil_walnut_oil'];
  const toAdd = RETRY_FOODS.filter(f => newIds.includes(f.id));
  if (toAdd.length) {
    console.log('\n需要追加到 FOOD_ICON_URL:');
    toAdd.forEach(f => console.log(`  '${f.id}': '/static/food-images/emoji-icons/${f.id}.png',`));
  }
}

main().catch(e => { console.error(e); process.exit(1); });
