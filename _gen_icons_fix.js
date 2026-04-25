require('dotenv').config();
const fs    = require('fs');
const https = require('https');
const jwt   = require('jsonwebtoken');
const path  = require('path');
const { execSync } = require('child_process');

const API_BASE = 'https://api-beijing.klingai.com';
const OUT_DIR  = path.join(__dirname, 'static/food-images/emoji-icons');

const NEGATIVE = 'plate, bowl, dish, tray, table, surface, shadow, realistic photo, photograph, 3D render, multiple objects, complex background, text, watermark, cartoon chibi, face, eyes, mouth, character, person, hands, decoration, rosemary, herb, parsley, garnish, leaf on meat, spice, duck, bird, animal';

const FOODS = [
  // 食物不对
  { id: 'food_veg_black_fungus', name: '木耳', enName: 'black wood ear fungus', detail: 'several pieces of dark brown-black dried wood ear fungus, thin wavy ear-shaped, wrinkled texture' },
  { id: 'food_sea_hairtail', name: '带鱼', enName: 'hairtail beltfish', detail: 'one long thin silver ribbon-shaped fish, narrow elongated body like a belt, metallic silver color, side view' },
  { id: 'food_egg_duck_egg', name: '鸭蛋', enName: 'duck egg', detail: 'one large pale blue-green duck egg, slightly bigger than chicken egg, smooth oval shell' },
  { id: 'food_veg_winter_melon', name: '冬瓜', enName: 'winter melon', detail: 'a wedge slice of winter melon showing pale green skin and white translucent flesh with seeds' },
  { id: 'food_grain_steamed_bun', name: '馒头', enName: 'Chinese mantou', detail: 'one plain white round steamed bun, smooth surface, no sesame, no filling, no steamer' },
  { id: 'food_grain_coix', name: '薏米', enName: 'coix seed', detail: 'a small pile of oval white-beige coix seeds, also called Jobs tears, about fifteen loose grains' },
  // 太写实 / 背景不透明
  { id: 'food_fruit_persimmon', name: '柿子', enName: 'persimmon', detail: 'one whole orange persimmon fruit with green calyx leaves on top' },
  { id: 'food_fruit_lychee', name: '荔枝', enName: 'lychee', detail: 'one whole red lychee fruit with bumpy textured skin, with one peeled showing white flesh' },
  { id: 'food_legume_tofu', name: '豆腐', enName: 'tofu', detail: 'two blocks of white soft tofu cubes, smooth clean surface, no garnish no leaf' },
  { id: 'food_meat_pig_blood', name: '猪血', enName: 'pig blood curd', detail: 'two dark red-brown cubes of coagulated pig blood tofu, smooth surface, no garnish' },
  { id: 'food_meat_pig_liver', name: '猪肝', enName: 'pork liver', detail: 'one piece of dark reddish-brown raw pork liver, smooth lobe shape' },
  { id: 'food_grain_bread', name: '面包', enName: 'bread', detail: 'one whole small round bread loaf, golden brown crust, simple' },
  { id: 'food_nut_tahini', name: '白芝麻酱', enName: 'tahini paste', detail: 'a small jar of creamy beige tahini sesame paste, top view showing smooth paste' },
  { id: 'food_oil_walnut_oil', name: '核桃油', enName: 'walnut oil', detail: 'a small glass bottle of golden walnut oil, simple bottle shape, no walnut pieces around' },
  { id: 'food_egg_egg_yolk', name: '蛋黄', enName: 'egg yolk', detail: 'one bright golden-yellow round egg yolk sitting on its own, no shell, no egg white' },
  { id: 'food_veg_cabbage', name: '卷心菜', enName: 'cabbage', detail: 'one whole round green cabbage head, layered leaves, compact ball shape' },
  { id: 'food_veg_amaranth', name: '苋菜', enName: 'amaranth greens', detail: 'a bunch of fresh amaranth leaves with red-purple stems and green-red oval leaves' },
  { id: 'food_meat_chicken_liver', name: '鸡肝', enName: 'chicken liver', detail: 'two pieces of dark reddish-brown raw chicken liver, small smooth lobes' },
  { id: 'food_meat_beef_liver', name: '牛肝', enName: 'beef liver', detail: 'one thick slice of dark red-brown raw beef liver, large smooth piece' },
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
    process.stdout.write(`[${ok+fail+1}/${FOODS.length}] ${food.name}(${food.id})... `);
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
