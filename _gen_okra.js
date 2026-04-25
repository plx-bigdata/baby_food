require('dotenv').config();
const fs    = require('fs');
const https = require('https');
const jwt   = require('jsonwebtoken');
const path  = require('path');
const { execSync } = require('child_process');

const API_BASE = 'https://api-beijing.klingai.com';
const OUT_DIR  = path.join(__dirname, 'static/food-images/emoji-icons');

const NEGATIVE = 'plate, bowl, dish, tray, table, surface, shadow, realistic photo, photograph, 3D render, multiple objects, complex background, text, watermark, cartoon chibi, face, eyes, mouth, character, person, hands, decoration, rosemary, herb, parsley, garnish, leaf on meat, spice';

const FOODS = [
  { id: 'food_veg_okra', name: '秋葵', enName: 'okra', detail: 'two green okra pods with ridged surface, one cut in half showing star cross-section' },
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
  for (const food of FOODS) {
    const outPath = path.join(OUT_DIR, `${food.id}.png`);
    const tmpPath = path.join(OUT_DIR, `_tmp_${food.id}.png`);
    process.stdout.write(`⏳ ${food.name}(${food.id})... `);
    try {
      const task = await klingReq('POST', '/v1/images/generations', {
        model_name: 'kling-v1',
        prompt: `single ${food.enName} only, flat vector icon, ${food.detail}, centered close-up, white background, clean minimal food icon`,
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
      console.log('✓');
    } catch(e) {
      if (fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath);
      console.log(`✗ ${e.message}`);
    }
  }
}

main().catch(e => { console.error('❌', e.message); process.exit(1); });
