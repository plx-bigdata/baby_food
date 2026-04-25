require('dotenv').config();
const fs    = require('fs');
const https = require('https');
const jwt   = require('jsonwebtoken');
const path  = require('path');
const { execSync } = require('child_process');

const API_BASE = 'https://api-beijing.klingai.com';
const OUT_DIR  = path.join(__dirname, 'static/food-images/emoji-icons');

const NEGATIVE = 'plate, bowl, dish, tray, table, surface, shadow, realistic photo, photograph, 3D render, complex background, text, watermark, face, eyes, mouth, character, person, hands, rosemary, herb, parsley, garnish, spice, pepper, peppercorn, seasoning, steamer, basket, bamboo steamer, duck, bird, animal, egg white, fried egg';

const FOODS = [
  { id: 'food_veg_black_fungus', name: '木耳',
    prompt: 'single black wood ear only, flat vector icon, several thin wavy dark brown-black dried wood ear pieces like ruffled sheets, no mushroom cap, no stem, centered close-up, white background, clean minimal food icon' },
  { id: 'food_sea_hairtail', name: '带鱼',
    prompt: 'single hairtail ribbonfish only, flat vector icon, one extremely long narrow silver ribbon-shaped fish like a belt or snake shape, very elongated thin body, metallic silver, side view, white background, clean minimal food icon' },
  { id: 'food_egg_duck_egg', name: '鸭蛋',
    prompt: 'single pale blue-green egg only, flat vector icon, one large oval egg with smooth light blue-green shell, no bird, no duck, just the egg alone, centered close-up, white background, clean minimal food icon' },
  { id: 'food_grain_steamed_bun', name: '馒头',
    prompt: 'single white mantou bun only, flat vector icon, one plain smooth white round steamed bread ball, no steamer, no basket, no sesame, no tray, just the bun floating, centered close-up, white background, clean minimal food icon' },
  { id: 'food_egg_egg_yolk', name: '蛋黄',
    prompt: 'single egg yolk sphere only, flat vector icon, one perfect round bright golden-yellow yolk ball, glossy smooth surface, no egg white, no shell, just the yellow sphere, centered close-up, white background, clean minimal food icon' },
  { id: 'food_legume_tofu', name: '豆腐',
    prompt: 'single tofu blocks only, flat vector icon, two white soft tofu cubes stacked, smooth clean surface, no leaf, no herb, no garnish, no parsley, just plain white tofu, centered close-up, white background, clean minimal food icon' },
  { id: 'food_meat_pig_liver', name: '猪肝',
    prompt: 'single raw pork liver only, flat vector icon, one dark reddish-brown smooth lobe of raw pork liver, no herb, no rosemary, no garnish, no seasoning, just the organ piece, centered close-up, white background, clean minimal food icon' },
  { id: 'food_meat_chicken_liver', name: '鸡肝',
    prompt: 'single raw chicken liver only, flat vector icon, two small dark reddish-brown raw chicken liver lobes, smooth surface, no herb, no rosemary, no pepper, no garnish, just the organs, centered close-up, white background, clean minimal food icon' },
  { id: 'food_meat_beef_liver', name: '牛肝',
    prompt: 'single raw beef liver slice only, flat vector icon, one thick slice of dark red-brown raw beef liver, smooth surface, no vegetable, no herb, no seasoning, no garnish, just the liver slice, centered close-up, white background, clean minimal food icon' },
];

function getToken() {
  return jwt.sign(
    { iss: process.env.KLING_ACCESS_KEY, exp: Math.floor(Date.now()/1000)+1800, nbf: Math.floor(Date.now()/1000)-5 },
    process.env.KLING_SECRET_KEY,
    { algorithm: 'HS256', header: { alg: 'HS256', typ: 'JWT' } }
  );
}

async function klingReq(method, endpoint, body) {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    method,
    headers: { Authorization: `Bearer ${getToken()}`, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const d = await res.json();
  if (d.code !== 0) throw new Error(`可灵错误 ${d.code}: ${d.message}`);
  return d.data;
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function downloadImg(url, dest) {
  return new Promise((resolve, reject) => {
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    const f = fs.createWriteStream(dest);
    https.get(url, r => { r.pipe(f); f.on('finish', () => f.close(resolve)); }).on('error', reject);
  });
}

function makeTransparentIcon(rawPath, outPath) {
  const script = `
from PIL import Image
im = Image.open(r"${rawPath}").convert("RGBA")
d = list(im.getdata())
nd = [(r,g,b,0) if (r>=240 and g>=240 and b>=240) else (r,g,b,a) for (r,g,b,a) in d]
im.putdata(nd)
bbox = im.getbbox()
if bbox:
    im = im.crop(bbox)
w, h = im.size
s = max(w, h)
canvas = Image.new("RGBA", (s, s), (0, 0, 0, 0))
canvas.paste(im, ((s-w)//2, (s-h)//2), im)
canvas = canvas.resize((120, 120), Image.LANCZOS)
canvas.save(r"${outPath}", "PNG")
`;
  const tmpPy = path.join(__dirname, '_tmp_icon.py');
  fs.writeFileSync(tmpPy, script);
  try { execSync(`python3 "${tmpPy}"`); } finally { fs.unlinkSync(tmpPy); }
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  let ok = 0, fail = 0;
  for (const food of FOODS) {
    const outPath = path.join(OUT_DIR, `${food.id}.png`);
    const tmpPath = path.join(OUT_DIR, `_tmp_${food.id}.png`);
    process.stdout.write(`[${ok+fail+1}/${FOODS.length}] ${food.name}... `);
    try {
      const task = await klingReq('POST', '/v1/images/generations', {
        model_name: 'kling-v1',
        prompt: food.prompt,
        negative_prompt: NEGATIVE,
        image_count: 1,
        aspect_ratio: '1:1',
      });
      const taskId = task.task_id;
      let imgUrl = null;
      for (let i = 0; i < 30; i++) {
        await sleep(3000);
        const r = await klingReq('GET', `/v1/images/generations/${taskId}`);
        if (r.task_status === 'succeed') { imgUrl = r.task_result?.images?.[0]?.url; break; }
        if (r.task_status === 'failed')  throw new Error(r.task_status_msg || '任务失败');
        process.stdout.write('.');
      }
      if (!imgUrl) throw new Error('超时');
      await downloadImg(imgUrl, tmpPath);
      makeTransparentIcon(tmpPath, outPath);
      if (fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath);
      ok++;
      console.log('✓');
    } catch(e) {
      if (fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath);
      fail++;
      console.log(`✗ ${e.message}`);
    }
    if ((ok + fail) % 4 === 0) await sleep(3000);
  }
  console.log(`\n完成: ${ok} 成功, ${fail} 失败`);
}

main().catch(e => { console.error('❌', e.message); process.exit(1); });
