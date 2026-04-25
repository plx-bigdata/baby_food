require('dotenv').config();
const fs    = require('fs');
const https = require('https');
const jwt   = require('jsonwebtoken');
const path  = require('path');
const { execSync } = require('child_process');

const API_BASE = 'https://api-beijing.klingai.com';
const OUT_DIR  = path.join(__dirname, 'static/food-images/emoji-icons');

const NEGATIVE = 'plate, bowl, dish, tray, table, surface, shadow, realistic photo, photograph, 3D render, complex background, colored background, grey background, dark background, text, watermark, face, eyes, mouth, character, person, rosemary, herb, parsley, cilantro, garnish, spice, pepper, seasoning, egg white, fried egg';

const FOODS = [
  { id: 'food_veg_black_fungus', name: '木耳',
    prompt: 'single black wood ear fungus, flat vector illustration style, several pieces of dark brown curly dried wood ear, thin ruffled ear-shaped pieces, isolated on pure white background, no mushroom cap, no stem, centered, clean minimal icon, pure white background' },
  { id: 'food_legume_tofu', name: '豆腐',
    prompt: 'single tofu cubes, flat vector illustration style, two plain white tofu blocks with smooth surface, no garnish, no herb, no leaf, isolated on pure white background, centered, clean minimal icon, pure white background' },
  { id: 'food_egg_egg_yolk', name: '蛋黄',
    prompt: 'single egg yolk, flat vector illustration style, one round golden yellow yolk sphere, glossy ball, no egg white, no shell, no plate, isolated on pure white background, centered, clean minimal icon, pure white background' },
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

// v2 可能生成灰色背景，用更智能的去背景
function makeTransparentIcon(rawPath, outPath) {
  const script = `
from PIL import Image
im = Image.open(r"${rawPath}").convert("RGBA")
w, h = im.size
pixels = list(im.getdata())

# 取四角颜色判断背景
corners = [pixels[0], pixels[w-1], pixels[(h-1)*w], pixels[h*w-1]]
bg_r = sum(c[0] for c in corners) // 4
bg_g = sum(c[1] for c in corners) // 4
bg_b = sum(c[2] for c in corners) // 4

# 如果背景接近白色(>220)，用白色阈值；否则用背景色阈值
if bg_r > 220 and bg_g > 220 and bg_b > 220:
    # 白色背景
    nd = [(r,g,b,0) if (r>=235 and g>=235 and b>=235) else (r,g,b,a) for (r,g,b,a) in pixels]
else:
    # 有色背景，用较宽容差
    tol = 50
    nd = [(r,g,b,0) if (abs(r-bg_r)<tol and abs(g-bg_g)<tol and abs(b-bg_b)<tol and a>0) else (r,g,b,a) for (r,g,b,a) in pixels]

im.putdata(nd)
bbox = im.getbbox()
if bbox:
    im = im.crop(bbox)
cw, ch = im.size
s = max(cw, ch)
canvas = Image.new("RGBA", (s, s), (0, 0, 0, 0))
canvas.paste(im, ((s-cw)//2, (s-ch)//2), im)
canvas = canvas.resize((120, 120), Image.LANCZOS)
canvas.save(r"${outPath}", "PNG")
print(f"bg=({bg_r},{bg_g},{bg_b})")
`;
  const tmpPy = path.join(__dirname, '_tmp_icon.py');
  fs.writeFileSync(tmpPy, script);
  try {
    const out = execSync(`python3 "${tmpPy}"`).toString().trim();
    console.log(out);
  } finally { fs.unlinkSync(tmpPy); }
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
