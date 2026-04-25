require('dotenv').config();
const fs    = require('fs');
const https = require('https');
const jwt   = require('jsonwebtoken');
const path  = require('path');
const { execSync } = require('child_process');

const API_BASE = 'https://api-beijing.klingai.com';
const OUT_DIR  = path.join(__dirname, 'static', 'food-images', 'emoji-icons');
const STYLE    = process.env.ICON_STYLE || 'sticker';

// ── 分类背景色 ────────────────────────────────────────────
const BG = {
  grain: '#FFF8E7', vegetable: '#F0FBF0', fruit: '#FFF0F5',
  meat:  '#FFF0EE', seafood:   '#EFF8FF', egg:   '#FFFDE7',
  legume:'#F5F0FF', dairy:     '#F0FAFF', nut:   '#FFF8F0', oil_fat:'#F8FFF0',
};

const STYLE_SUFFIX = {
  emoji:   'flat vector icon, white background, clean minimal food icon design, simple illustration',
  sticker: 'cute sticker style, thick outline, pastel colors, white background, clean, simple food illustration',
  flat:    'flat icon design, minimal, solid colors, pure white background, geometric simplification, clean',
};

function buildPrompt(food) {
  return `single ${food.enName}, ${STYLE_SUFFIX[STYLE]}`;
}

const NEGATIVE = 'face, eyes, mouth, smile, character, person, arms, hands, autumn leaves, falling leaves, leaf, foliage, decoration, watermark, text, shadow, realistic photo, 3D render, multiple objects, busy background';

// ── 59 个待生成食物 ─────────────────────────────────────
const FOODS = [
  { id: 'food_grain_rice_cereal',     name: '米粉',   enName: 'Rice Cereal',     category: 'grain' },
  { id: 'food_grain_oat_cereal',      name: '燕麦糊', enName: 'Oatmeal',         category: 'grain' },
  { id: 'food_grain_wheat_cereal',    name: '小麦糊', enName: 'Wheat Cereal',    category: 'grain' },
  { id: 'food_grain_corn_porridge',   name: '玉米糊', enName: 'Corn Porridge',   category: 'grain' },
  { id: 'food_veg_carrot',            name: '胡萝卜', enName: 'Carrot',          category: 'vegetable' },
  { id: 'food_veg_pumpkin',           name: '南瓜',   enName: 'Pumpkin',         category: 'vegetable' },
  { id: 'food_veg_sweet_potato',      name: '红薯',   enName: 'Sweet Potato',    category: 'vegetable' },
  { id: 'food_veg_potato',            name: '土豆',   enName: 'Potato',          category: 'vegetable' },
  { id: 'food_veg_broccoli',          name: '西兰花', enName: 'Broccoli',        category: 'vegetable' },
  { id: 'food_veg_spinach',           name: '菠菜',   enName: 'Spinach',         category: 'vegetable' },
  { id: 'food_veg_pea',               name: '豌豆',   enName: 'Pea',             category: 'vegetable' },
  { id: 'food_veg_corn',              name: '玉米',   enName: 'Corn',            category: 'vegetable' },
  { id: 'food_veg_tomato',            name: '西红柿', enName: 'Tomato',          category: 'vegetable' },
  { id: 'food_veg_eggplant',          name: '茄子',   enName: 'Eggplant',        category: 'vegetable' },
  { id: 'food_veg_cauliflower',       name: '花椰菜', enName: 'Cauliflower',     category: 'vegetable' },
  { id: 'food_veg_cucumber',          name: '黄瓜',   enName: 'Cucumber',        category: 'vegetable' },
  { id: 'food_veg_chinese_cabbage',   name: '白菜',   enName: 'Chinese Cabbage', category: 'vegetable' },
  { id: 'food_veg_yam',               name: '山药',   enName: 'Chinese Yam',     category: 'vegetable' },
  { id: 'food_veg_mushroom',          name: '蘑菇',   enName: 'Mushroom',        category: 'vegetable' },
  { id: 'food_fruit_apple',           name: '苹果',   enName: 'Apple',           category: 'fruit' },
  { id: 'food_fruit_pear',            name: '梨',     enName: 'Pear',            category: 'fruit' },
  { id: 'food_fruit_banana',          name: '香蕉',   enName: 'Banana',          category: 'fruit' },
  { id: 'food_fruit_avocado',         name: '牛油果', enName: 'Avocado',         category: 'fruit' },
  { id: 'food_fruit_watermelon',      name: '西瓜',   enName: 'Watermelon',      category: 'fruit' },
  { id: 'food_fruit_blueberry',       name: '蓝莓',   enName: 'Blueberry',       category: 'fruit' },
  { id: 'food_fruit_mango',           name: '芒果',   enName: 'Mango',           category: 'fruit' },
  { id: 'food_fruit_strawberry',      name: '草莓',   enName: 'Strawberry',      category: 'fruit' },
  { id: 'food_fruit_grape',           name: '葡萄',   enName: 'Grape',           category: 'fruit' },
  { id: 'food_fruit_peach',           name: '桃',     enName: 'Peach',           category: 'fruit' },
  { id: 'food_fruit_kiwi',            name: '猕猴桃', enName: 'Kiwi',            category: 'fruit' },
  { id: 'food_fruit_orange',          name: '橙子',   enName: 'Orange',          category: 'fruit' },
  { id: 'food_fruit_cherry',          name: '樱桃',   enName: 'Cherry',          category: 'fruit' },
  { id: 'food_fruit_papaya',          name: '木瓜',   enName: 'Papaya',          category: 'fruit' },
  { id: 'food_meat_pork_lean',        name: '猪里脊', enName: 'Pork Tenderloin', category: 'meat' },
  { id: 'food_meat_beef',             name: '牛肉',   enName: 'Beef Steak',      category: 'meat' },
  { id: 'food_meat_chicken',          name: '鸡肉',   enName: 'Chicken Breast',  category: 'meat' },
  { id: 'food_meat_lamb',             name: '羊肉',   enName: 'Lamb Meat',       category: 'meat' },
  { id: 'food_meat_duck',             name: '鸭肉',   enName: 'Duck Meat',       category: 'meat' },
  { id: 'food_sea_white_fish',        name: '白肉鱼', enName: 'Cod Fish',        category: 'seafood' },
  { id: 'food_sea_salmon',            name: '三文鱼', enName: 'Salmon',          category: 'seafood' },
  { id: 'food_sea_crucian',           name: '鲫鱼',   enName: 'Crucian Carp',    category: 'seafood' },
  { id: 'food_sea_tilapia',           name: '罗非鱼', enName: 'Tilapia',         category: 'seafood' },
  { id: 'food_sea_shrimp',            name: '虾',     enName: 'Shrimp',          category: 'seafood' },
  { id: 'food_sea_crab',              name: '螃蟹',   enName: 'Crab',            category: 'seafood' },
  { id: 'food_sea_oyster',            name: '牡蛎',   enName: 'Oyster',          category: 'seafood' },
  { id: 'food_sea_clam',              name: '蛤蜊',   enName: 'Clam',            category: 'seafood' },
  { id: 'food_sea_grass_carp',        name: '草鱼',   enName: 'Grass Carp',      category: 'seafood' },
  { id: 'food_egg_whole_egg',         name: '全蛋',   enName: 'Whole Egg',       category: 'egg' },
  { id: 'food_egg_quail_egg',         name: '鹌鹑蛋', enName: 'Quail Egg',       category: 'egg' },
  { id: 'food_legume_edamame',        name: '毛豆',   enName: 'Edamame',         category: 'legume' },
  { id: 'food_dairy_formula',         name: '配方奶', enName: 'Infant Formula Milk Powder', category: 'dairy' },
  { id: 'food_dairy_yogurt',          name: '原味酸奶', enName: 'Plain Yogurt',  category: 'dairy' },
  { id: 'food_dairy_cheese',          name: '奶酪',   enName: 'Cheese',          category: 'dairy' },
  { id: 'food_dairy_cows_milk',       name: '纯牛奶', enName: 'Milk Carton',     category: 'dairy' },
  { id: 'food_dairy_butter',          name: '黄油',   enName: 'Butter',          category: 'dairy' },
  { id: 'food_nut_peanut_paste',      name: '花生酱', enName: 'Peanut Butter',   category: 'nut' },
  { id: 'food_oil_olive_oil',         name: '橄榄油', enName: 'Olive Oil Bottle', category: 'oil_fat' },
  { id: 'food_oil_coconut_oil',       name: '椰子油', enName: 'Coconut Oil Jar', category: 'oil_fat' },
  { id: 'food_oil_rapeseed_oil',      name: '菜籽油', enName: 'Rapeseed Oil Bottle', category: 'oil_fat' },
];

// ── 可灵鉴权 ─────────────────────────────────────────────
function getToken() {
  const ak = process.env.KLING_ACCESS_KEY;
  const sk = process.env.KLING_SECRET_KEY;
  return jwt.sign(
    { iss: ak, exp: Math.floor(Date.now()/1000)+1800, nbf: Math.floor(Date.now()/1000)-5 },
    sk,
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

// ── 主流程 ───────────────────────────────────────────────
async function main() {
  // 输出到预览目录，不污染正式目录
  const PREVIEW_DIR = path.join(__dirname, '_preview_icons');
  fs.mkdirSync(PREVIEW_DIR, { recursive: true });
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const results = [], failed = [];

  for (const food of FOODS) {
    const outPath = path.join(PREVIEW_DIR, `${food.id}.png`);
    const tmpPath = path.join(PREVIEW_DIR, `_tmp_${food.id}.png`);
    const bg      = BG[food.category] || '#F5F5F5';

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

      results.push({ id: food.id, name: food.name, previewPath: outPath });
      console.log('✓');
    } catch(e) {
      if (fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath);
      failed.push({ id: food.id, name: food.name, error: e.message });
      console.log(`✗ ${e.message}`);
    }
  }

  console.log(`\n${'═'.repeat(50)}`);
  console.log(`完成：${results.length} 成功，${failed.length} 失败`);
  console.log(`预览目录：${PREVIEW_DIR}`);
  if (failed.length > 0) {
    console.log('\n失败列表:');
    failed.forEach(f => console.log(`  ${f.id}  // ${f.name}: ${f.error}`));
  }

  fs.writeFileSync(
    path.join(__dirname, 'emoji-icon-report.json'),
    JSON.stringify({ style: STYLE, success: results, failed }, null, 2)
  );
  console.log('\n详细报告 → emoji-icon-report.json');
}

main().catch(e => { console.error('❌', e.message); process.exit(1); });
