require('dotenv').config();
const fs    = require('fs');
const https = require('https');
const jwt   = require('jsonwebtoken');
const path  = require('path');
const { execSync } = require('child_process');

const API_BASE = 'https://api-beijing.klingai.com';
const OUT_DIR  = path.join(__dirname, 'static/food-images/emoji-icons');

const NEGATIVE = 'realistic photo, photograph, complex background, text, watermark, face, eyes, mouth, character, person, hands, rosemary, herb, parsley, cilantro, garnish, spice, pepper, peppercorn';

const FOODS = [
  { id: 'food_meat_pig_liver', name: '猪肝',
    prompt: 'sliced cooked pork liver on a small white plate, flat vector illustration style, several thin dark reddish-brown liver slices neatly arranged on a clean white plate, isolated on pure white background, clean minimal food icon' },
  { id: 'food_meat_pig_blood', name: '猪血',
    prompt: 'Chinese pig blood curd cubes (blood tofu), flat vector illustration style, several dark reddish-brown smooth cubes of coagulated pig blood on a small white plate, the cubes have a smooth jelly-like texture, isolated on pure white background, clean minimal food icon' },
  { id: 'food_fruit_persimmon', name: '柿子',
    prompt: 'a single ripe persimmon fruit, flat vector illustration style, one bright orange persimmon with four green leaves on top, round and slightly flat shape, isolated on pure white background, clean minimal food icon' },
  { id: 'food_fruit_cantaloupe', name: '哈密瓜',
    prompt: 'cantaloupe melon cut in half showing orange flesh and seeds, flat vector illustration style, one half of a cantaloupe melon showing the orange interior and netted green-yellow skin, isolated on pure white background, clean minimal food icon' },
  { id: 'food_grain_noodles', name: '细面条',
    prompt: 'top down view of a bowl of Chinese thin noodles, flat vector illustration style, bird eye view looking down into a bowl of plain thin wheat noodles in clear broth, isolated on pure white background, clean minimal food icon' },
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
w, h = im.size
pixels = list(im.getdata())
corners = [pixels[0], pixels[w-1], pixels[(h-1)*w], pixels[h*w-1]]
bg_r = sum(c[0] for c in corners) // 4
bg_g = sum(c[1] for c in corners) // 4
bg_b = sum(c[2] for c in corners) // 4
print(f"bg=({bg_r},{bg_g},{bg_b})")
if bg_r > 220 and bg_g > 220 and bg_b > 220:
    nd = [(r,g,b,0) if (r>=235 and g>=235 and b>=235) else (r,g,b,a) for (r,g,b,a) in pixels]
else:
    tol = 45
    nd = [(r,g,b,0) if (abs(r-bg_r)<tol and abs(g-bg_g)<tol and abs(b-bg_b)<tol) else (r,g,b,a) for (r,g,b,a) in pixels]
im.putdata(nd)
bbox = im.getbbox()
if bbox:
    im = im.crop(bbox)
cw, ch = im.size
s = max(cw, ch)
canvas = Image.new("RGBA", (s, s), (0, 0, 0, 0))
canvas.paste(im, ((s-cw)//2, (s-ch)//2), im)
canvas = canvas.resize((120, 120), Image.LANCZOS)
# 压缩: P 模式量化
q = canvas.quantize(colors=128, method=2)
q.save(r"${outPath}", "PNG", optimize=True)
`;
  const tmpPy = path.join(__dirname, '_tmp_icon.py');
  fs.writeFileSync(tmpPy, script);
  try { const out = execSync(`python3 "${tmpPy}"`).toString().trim(); console.log(out); }
  finally { fs.unlinkSync(tmpPy); }
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
        model_name: 'kling-v2',
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
      console.log(' ✓');
    } catch(e) {
      if (fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath);
      fail++;
      console.log(` ✗ ${e.message}`);
    }
  }
  console.log(`\n完成: ${ok} 成功, ${fail} 失败`);
}

main().catch(e => { console.error('❌', e.message); process.exit(1); });
