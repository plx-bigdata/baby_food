require('dotenv').config();
const fs    = require('fs');
const https = require('https');
const jwt   = require('jsonwebtoken');
const path  = require('path');
const { execSync } = require('child_process');

const API_BASE = 'https://api-beijing.klingai.com';
const OUT_DIR  = path.join(__dirname, '_preview_icons_realistic');

// ── 分类背景色 ────────────────────────────────────────────
const BG = {
  grain: '#FFF8E7', vegetable: '#F0FBF0', fruit: '#FFF0F5',
  meat:  '#FFF0EE', seafood:   '#EFF8FF', egg:   '#FFFDE7',
  legume:'#F5F0FF', dairy:     '#F0FAFF', nut:   '#FFF8F0', oil_fat:'#F8FFF0',
};

// 真实食物摄影风格 prompt
function buildPrompt(food) {
  return `professional food photography of a single ${food.enName}, studio lighting, isolated on pure white background, high detail, sharp focus, hyperrealistic, commercial product photo, centered composition`;
}

const NEGATIVE = 'cartoon, sticker, illustration, drawing, painting, anime, cute, chibi, face, eyes, character, person, text, watermark, multiple items, cluttered, shadow, dark background';

// ── 5 个测试食物（覆盖主要分类）────────────────────────
const FOODS = [
  { id: 'food_veg_carrot',    name: '胡萝卜',   enName: 'fresh carrot',        category: 'vegetable' },
  { id: 'food_fruit_apple',   name: '苹果',     enName: 'fresh red apple',     category: 'fruit' },
  { id: 'food_meat_chicken',  name: '鸡肉',     enName: 'raw chicken breast meat', category: 'meat' },
  { id: 'food_sea_salmon',    name: '三文鱼',   enName: 'raw salmon fillet',   category: 'seafood' },
  { id: 'food_dairy_yogurt',  name: '原味酸奶', enName: 'cup of plain yogurt', category: 'dairy' },
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

function addBackground(rawPath, bgColor, outPath) {
  const py = [
    'from PIL import Image, ImageDraw',
    `ai=Image.open(r"${rawPath}").convert("RGBA").resize((96,96),Image.LANCZOS)`,
    'S,R=120,20',
    'bg=Image.new("RGBA",(S,S),(0,0,0,0))',
    `h="${bgColor}".lstrip("#")`,
    'c=tuple(int(h[i:i+2],16) for i in (0,2,4))+(255,)',
    'sl=Image.new("RGBA",(S,S),c)',
    'mk=Image.new("L",(S,S),0)',
    'ImageDraw.Draw(mk).rounded_rectangle([0,0,S-1,S-1],radius=R,fill=255)',
    'bg.paste(sl,mask=mk)',
    'o=((S-96)//2,(S-96)//2)',
    'bg.paste(ai,o,ai)',
    `bg.save(r"${outPath}","PNG")`,
  ].join(';');
  execSync(`python3 -c '${py}'`);
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });

  for (const food of FOODS) {
    const outPath = path.join(OUT_DIR, `${food.id}.png`);
    const tmpPath = path.join(OUT_DIR, `_tmp_${food.id}.png`);
    const bg = BG[food.category] || '#F5F5F5';

    process.stdout.write(`⏳ ${food.name}（${food.id}）... `);
    try {
      const task = await klingReq('POST', '/v1/images/generations', {
        model_name: 'kling-v1',
        prompt: buildPrompt(food),
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
      addBackground(tmpPath, bg, outPath);
      if (fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath);
      console.log('✓');
    } catch(e) {
      if (fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath);
      console.log(`✗ ${e.message}`);
    }
  }

  console.log(`\n预览目录: ${OUT_DIR}`);
}

main().catch(e => { console.error('❌', e.message); process.exit(1); });
