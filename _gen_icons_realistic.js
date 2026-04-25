require('dotenv').config();
const fs    = require('fs');
const https = require('https');
const jwt   = require('jsonwebtoken');
const path  = require('path');
const { execSync } = require('child_process');

const API_BASE = 'https://api-beijing.klingai.com';
const OUT_DIR  = path.join(__dirname, '_preview_icons_realistic');

const BG = {
  grain: '#FFF8E7', vegetable: '#F0FBF0', fruit: '#FFF0F5',
  meat:  '#FFF0EE', seafood:   '#EFF8FF', egg:   '#FFFDE7',
  legume:'#F5F0FF', dairy:     '#F0FAFF', nut:   '#FFF8F0', oil_fat:'#F8FFF0',
};

function buildPrompt(food) {
  return `professional food photography of a single ${food.enName}, studio lighting, isolated on pure white background, high detail, sharp focus, hyperrealistic, commercial product photo, centered composition`;
}

const NEGATIVE = 'cartoon, sticker, illustration, drawing, painting, anime, cute, chibi, face, eyes, character, person, text, watermark, multiple items, cluttered, shadow, dark background';

// 剩余 54 个(已排除测试跑过的 5 个:carrot/apple/chicken/salmon/yogurt)
const FOODS = [
  { id: 'food_grain_rice_cereal',     name: '米粉',   enName: 'bowl of rice cereal baby food', category: 'grain' },
  { id: 'food_grain_oat_cereal',      name: '燕麦糊', enName: 'bowl of oatmeal',               category: 'grain' },
  { id: 'food_grain_wheat_cereal',    name: '小麦糊', enName: 'bowl of wheat cereal',          category: 'grain' },
  { id: 'food_grain_corn_porridge',   name: '玉米糊', enName: 'bowl of corn porridge',         category: 'grain' },
  { id: 'food_veg_pumpkin',           name: '南瓜',   enName: 'fresh pumpkin',                 category: 'vegetable' },
  { id: 'food_veg_sweet_potato',      name: '红薯',   enName: 'fresh sweet potato',            category: 'vegetable' },
  { id: 'food_veg_potato',            name: '土豆',   enName: 'fresh potato',                  category: 'vegetable' },
  { id: 'food_veg_broccoli',          name: '西兰花', enName: 'fresh broccoli floret',         category: 'vegetable' },
  { id: 'food_veg_spinach',           name: '菠菜',   enName: 'fresh spinach leaves',          category: 'vegetable' },
  { id: 'food_veg_pea',               name: '豌豆',   enName: 'fresh green peas',              category: 'vegetable' },
  { id: 'food_veg_corn',              name: '玉米',   enName: 'fresh corn on the cob',         category: 'vegetable' },
  { id: 'food_veg_tomato',            name: '西红柿', enName: 'fresh red tomato',              category: 'vegetable' },
  { id: 'food_veg_eggplant',          name: '茄子',   enName: 'fresh purple eggplant',         category: 'vegetable' },
  { id: 'food_veg_cauliflower',       name: '花椰菜', enName: 'fresh cauliflower',             category: 'vegetable' },
  { id: 'food_veg_cucumber',          name: '黄瓜',   enName: 'fresh cucumber',                category: 'vegetable' },
  { id: 'food_veg_chinese_cabbage',   name: '白菜',   enName: 'fresh napa cabbage',            category: 'vegetable' },
  { id: 'food_veg_yam',               name: '山药',   enName: 'fresh chinese yam root',        category: 'vegetable' },
  { id: 'food_veg_mushroom',          name: '蘑菇',   enName: 'fresh button mushroom',         category: 'vegetable' },
  { id: 'food_fruit_pear',            name: '梨',     enName: 'fresh pear',                    category: 'fruit' },
  { id: 'food_fruit_banana',          name: '香蕉',   enName: 'fresh banana',                  category: 'fruit' },
  { id: 'food_fruit_avocado',         name: '牛油果', enName: 'fresh avocado',                 category: 'fruit' },
  { id: 'food_fruit_watermelon',      name: '西瓜',   enName: 'fresh watermelon slice',        category: 'fruit' },
  { id: 'food_fruit_blueberry',       name: '蓝莓',   enName: 'fresh blueberries',             category: 'fruit' },
  { id: 'food_fruit_mango',           name: '芒果',   enName: 'fresh mango',                   category: 'fruit' },
  { id: 'food_fruit_strawberry',      name: '草莓',   enName: 'fresh strawberry',              category: 'fruit' },
  { id: 'food_fruit_grape',           name: '葡萄',   enName: 'fresh purple grapes bunch',     category: 'fruit' },
  { id: 'food_fruit_peach',           name: '桃',     enName: 'fresh peach',                   category: 'fruit' },
  { id: 'food_fruit_kiwi',            name: '猕猴桃', enName: 'fresh kiwi fruit',              category: 'fruit' },
  { id: 'food_fruit_orange',          name: '橙子',   enName: 'fresh orange',                  category: 'fruit' },
  { id: 'food_fruit_cherry',          name: '樱桃',   enName: 'fresh red cherries',            category: 'fruit' },
  { id: 'food_fruit_papaya',          name: '木瓜',   enName: 'fresh papaya',                  category: 'fruit' },
  { id: 'food_meat_pork_lean',        name: '猪里脊', enName: 'raw pork tenderloin',           category: 'meat' },
  { id: 'food_meat_beef',             name: '牛肉',   enName: 'raw beef steak',                category: 'meat' },
  { id: 'food_meat_lamb',             name: '羊肉',   enName: 'raw lamb meat',                 category: 'meat' },
  { id: 'food_meat_duck',             name: '鸭肉',   enName: 'raw duck meat',                 category: 'meat' },
  { id: 'food_sea_white_fish',        name: '白肉鱼', enName: 'raw cod fish fillet',           category: 'seafood' },
  { id: 'food_sea_crucian',           name: '鲫鱼',   enName: 'fresh crucian carp fish',       category: 'seafood' },
  { id: 'food_sea_tilapia',           name: '罗非鱼', enName: 'fresh tilapia fish',            category: 'seafood' },
  { id: 'food_sea_shrimp',            name: '虾',     enName: 'fresh shrimp',                  category: 'seafood' },
  { id: 'food_sea_crab',              name: '螃蟹',   enName: 'fresh crab',                    category: 'seafood' },
  { id: 'food_sea_oyster',            name: '牡蛎',   enName: 'fresh oyster',                  category: 'seafood' },
  { id: 'food_sea_clam',              name: '蛤蜊',   enName: 'fresh clams',                   category: 'seafood' },
  { id: 'food_sea_grass_carp',        name: '草鱼',   enName: 'fresh grass carp fish',         category: 'seafood' },
  { id: 'food_egg_whole_egg',         name: '全蛋',   enName: 'whole chicken egg',             category: 'egg' },
  { id: 'food_egg_quail_egg',         name: '鹌鹑蛋', enName: 'quail eggs',                    category: 'egg' },
  { id: 'food_legume_edamame',        name: '毛豆',   enName: 'fresh edamame beans in pods',   category: 'legume' },
  { id: 'food_dairy_formula',         name: '配方奶', enName: 'can of infant formula milk powder', category: 'dairy' },
  { id: 'food_dairy_cheese',          name: '奶酪',   enName: 'block of cheese',               category: 'dairy' },
  { id: 'food_dairy_cows_milk',       name: '纯牛奶', enName: 'glass of fresh milk',           category: 'dairy' },
  { id: 'food_dairy_butter',          name: '黄油',   enName: 'block of butter',               category: 'dairy' },
  { id: 'food_nut_peanut_paste',      name: '花生酱', enName: 'jar of peanut butter',          category: 'nut' },
  { id: 'food_oil_olive_oil',         name: '橄榄油', enName: 'bottle of olive oil',           category: 'oil_fat' },
  { id: 'food_oil_coconut_oil',       name: '椰子油', enName: 'jar of coconut oil',            category: 'oil_fat' },
  { id: 'food_oil_rapeseed_oil',      name: '菜籽油', enName: 'bottle of rapeseed oil',        category: 'oil_fat' },
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
  const results = [], failed = [];

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
      results.push(food.id);
      console.log('✓');
    } catch(e) {
      if (fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath);
      failed.push({ id: food.id, name: food.name, error: e.message });
      console.log(`✗ ${e.message}`);
    }
  }

  console.log(`\n${'═'.repeat(50)}`);
  console.log(`完成:${results.length} 成功,${failed.length} 失败`);
  console.log(`预览目录: ${OUT_DIR}`);
  if (failed.length > 0) {
    console.log('\n失败列表:');
    failed.forEach(f => console.log(`  ${f.id}  // ${f.name}: ${f.error}`));
  }
}

main().catch(e => { console.error('❌', e.message); process.exit(1); });
