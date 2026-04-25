require('dotenv').config();
const fs    = require('fs');
const https = require('https');
const jwt   = require('jsonwebtoken');
const path  = require('path');
const { execSync } = require('child_process');

const API_BASE = 'https://api-beijing.klingai.com';
const OUT_DIR  = path.join(__dirname, '_preview_icons_flat');

function buildPrompt(food) {
  return `single ${food.enName} only, flat vector icon, ${food.detail}, centered close-up, white background, clean minimal food icon`;
}

const NEGATIVE = 'plate, bowl, dish, tray, table, surface, shadow, realistic photo, photograph, 3D render, multiple objects, complex background, text, watermark, cartoon chibi, face, eyes, mouth, character, person, hands, decoration';

// 57 张待生成(苹果、鸡肉已完成)
const FOODS = [
  // 谷物
  { id: 'food_grain_rice_cereal',     name: '米粉',     enName: 'baby rice cereal bowl', detail: 'one white bowl of smooth white rice cereal paste for babies' },
  { id: 'food_grain_oat_cereal',      name: '燕麦糊',   enName: 'oatmeal bowl',          detail: 'one white bowl of creamy beige oatmeal porridge' },
  { id: 'food_grain_wheat_cereal',    name: '小麦糊',   enName: 'wheat cereal bowl',     detail: 'one white bowl of beige wheat cereal paste' },
  { id: 'food_grain_corn_porridge',   name: '玉米糊',   enName: 'corn porridge bowl',    detail: 'one white bowl of yellow corn porridge' },

  // 蔬菜
  { id: 'food_veg_carrot',            name: '胡萝卜',   enName: 'carrot',          detail: 'one orange carrot with small green leaf top' },
  { id: 'food_veg_pumpkin',           name: '南瓜',     enName: 'pumpkin',         detail: 'one round orange pumpkin with short green stem' },
  { id: 'food_veg_sweet_potato',      name: '红薯',     enName: 'sweet potato',    detail: 'one purple skinned sweet potato with orange flesh visible at ends' },
  { id: 'food_veg_potato',            name: '土豆',     enName: 'potato',          detail: 'one brown oval potato' },
  { id: 'food_veg_broccoli',          name: '西兰花',   enName: 'broccoli floret', detail: 'one green broccoli floret with thick stem' },
  { id: 'food_veg_spinach',           name: '菠菜',     enName: 'spinach leaves',  detail: 'a small bundle of fresh green spinach leaves with red stems' },
  { id: 'food_veg_pea',               name: '豌豆',     enName: 'green peas pod',  detail: 'one opened green pea pod with three round green peas inside' },
  { id: 'food_veg_corn',              name: '玉米',     enName: 'corn on the cob', detail: 'one yellow corn cob with green husk peeled back' },
  { id: 'food_veg_tomato',            name: '西红柿',   enName: 'tomato',          detail: 'one round red tomato with green stem top' },
  { id: 'food_veg_eggplant',          name: '茄子',     enName: 'eggplant',        detail: 'one long purple eggplant with green stem' },
  { id: 'food_veg_cauliflower',       name: '花椰菜',   enName: 'cauliflower',     detail: 'one white cauliflower floret with small green leaves' },
  { id: 'food_veg_cucumber',          name: '黄瓜',     enName: 'cucumber',        detail: 'one fresh green cucumber' },
  { id: 'food_veg_chinese_cabbage',   name: '白菜',     enName: 'napa cabbage',    detail: 'one white and pale green napa cabbage head' },
  { id: 'food_veg_yam',               name: '山药',     enName: 'chinese yam root', detail: 'one long beige chinese yam root' },
  { id: 'food_veg_mushroom',          name: '蘑菇',     enName: 'mushroom',        detail: 'one round white button mushroom' },

  // 水果
  { id: 'food_fruit_pear',            name: '梨',       enName: 'pear',            detail: 'one yellow green pear with small stem and leaf' },
  { id: 'food_fruit_banana',          name: '香蕉',     enName: 'banana',          detail: 'one yellow curved banana' },
  { id: 'food_fruit_avocado',         name: '牛油果',   enName: 'avocado',         detail: 'one whole avocado next to a half avocado with brown seed' },
  { id: 'food_fruit_watermelon',      name: '西瓜',     enName: 'watermelon slice', detail: 'one triangular slice of red watermelon with green rind and black seeds' },
  { id: 'food_fruit_blueberry',       name: '蓝莓',     enName: 'blueberries',     detail: 'a small cluster of round blue blueberries' },
  { id: 'food_fruit_mango',           name: '芒果',     enName: 'mango',           detail: 'one whole yellow orange mango with smooth skin' },
  { id: 'food_fruit_strawberry',      name: '草莓',     enName: 'strawberry',      detail: 'one red strawberry with green leaf cap and yellow seeds' },
  { id: 'food_fruit_grape',           name: '葡萄',     enName: 'grapes bunch',    detail: 'one small bunch of round purple grapes with green stem' },
  { id: 'food_fruit_peach',           name: '桃',       enName: 'peach',           detail: 'one pink peach with green leaf' },
  { id: 'food_fruit_kiwi',            name: '猕猴桃',   enName: 'kiwi fruit',      detail: 'one whole brown kiwi next to a half kiwi showing green flesh and black seeds' },
  { id: 'food_fruit_orange',          name: '橙子',     enName: 'orange',          detail: 'one round orange fruit with small green leaf' },
  { id: 'food_fruit_cherry',          name: '樱桃',     enName: 'cherries',        detail: 'two red cherries joined by green stem' },
  { id: 'food_fruit_papaya',          name: '木瓜',     enName: 'papaya',          detail: 'one whole yellow papaya next to a half showing orange flesh and black seeds' },

  // 肉类
  { id: 'food_meat_pork_lean',        name: '猪里脊',   enName: 'pork tenderloin', detail: 'one pink raw pork tenderloin piece' },
  { id: 'food_meat_beef',             name: '牛肉',     enName: 'beef steak',      detail: 'one raw dark red beef steak piece with marbling' },
  { id: 'food_meat_lamb',             name: '羊肉',     enName: 'lamb meat',       detail: 'one raw red lamb meat piece' },
  { id: 'food_meat_duck',             name: '鸭肉',     enName: 'duck meat',       detail: 'one raw dark pink duck meat piece' },

  // 海鲜
  { id: 'food_sea_salmon',            name: '三文鱼',   enName: 'salmon fillet',   detail: 'one raw orange pink salmon fillet with white lines' },
  { id: 'food_sea_white_fish',        name: '白肉鱼',   enName: 'cod fish fillet', detail: 'one raw white cod fish fillet' },
  { id: 'food_sea_crucian',           name: '鲫鱼',     enName: 'crucian carp fish', detail: 'one whole silver crucian carp fish side view' },
  { id: 'food_sea_tilapia',           name: '罗非鱼',   enName: 'tilapia fish',    detail: 'one whole silver tilapia fish side view' },
  { id: 'food_sea_shrimp',            name: '虾',       enName: 'shrimp',          detail: 'one curled pink shrimp with tail' },
  { id: 'food_sea_crab',              name: '螃蟹',     enName: 'crab',            detail: 'one red orange crab with claws, top view' },
  { id: 'food_sea_oyster',            name: '牡蛎',     enName: 'oyster',          detail: 'one opened oyster shell with grey meat inside' },
  { id: 'food_sea_clam',              name: '蛤蜊',     enName: 'clam',            detail: 'one brown striped clam shell' },
  { id: 'food_sea_grass_carp',        name: '草鱼',     enName: 'grass carp fish', detail: 'one whole grass carp fish side view' },

  // 蛋类
  { id: 'food_egg_whole_egg',         name: '全蛋',     enName: 'chicken egg',     detail: 'one whole brown chicken egg next to a half cooked egg showing yellow yolk' },
  { id: 'food_egg_quail_egg',         name: '鹌鹑蛋',   enName: 'quail eggs',      detail: 'two small speckled brown quail eggs' },

  // 豆类
  { id: 'food_legume_edamame',        name: '毛豆',     enName: 'edamame pods',    detail: 'two green edamame bean pods with fuzzy surface' },

  // 乳制品
  { id: 'food_dairy_yogurt',          name: '原味酸奶', enName: 'yogurt cup',      detail: 'one small white plastic cup of plain white yogurt' },
  { id: 'food_dairy_formula',         name: '配方奶',   enName: 'infant formula can', detail: 'one round blue and white infant formula milk powder can' },
  { id: 'food_dairy_cheese',          name: '奶酪',     enName: 'cheese block',    detail: 'one yellow triangular cheese wedge block' },
  { id: 'food_dairy_cows_milk',       name: '纯牛奶',   enName: 'milk glass',      detail: 'one clear glass full of white milk' },
  { id: 'food_dairy_butter',          name: '黄油',     enName: 'butter block',    detail: 'one yellow rectangular butter block' },

  // 坚果
  { id: 'food_nut_peanut_paste',      name: '花生酱',   enName: 'peanut butter jar', detail: 'one glass jar of brown peanut butter with peanuts on lid' },

  // 油脂
  { id: 'food_oil_olive_oil',         name: '橄榄油',   enName: 'olive oil bottle', detail: 'one tall glass bottle of green yellow olive oil' },
  { id: 'food_oil_coconut_oil',       name: '椰子油',   enName: 'coconut oil jar', detail: 'one glass jar of white coconut oil' },
  { id: 'food_oil_rapeseed_oil',      name: '菜籽油',   enName: 'rapeseed oil bottle', detail: 'one tall glass bottle of yellow rapeseed oil' },
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
  const tmpPy = path.join(__dirname, `_tmp_icon_${process.pid}.py`);
  fs.writeFileSync(tmpPy, script);
  try { execSync(`python3 "${tmpPy}"`); } finally { if (fs.existsSync(tmpPy)) fs.unlinkSync(tmpPy); }
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const success = [], failed = [];

  for (let i = 0; i < FOODS.length; i++) {
    const food = FOODS[i];
    const outPath = path.join(OUT_DIR, `${food.id}.png`);
    const tmpPath = path.join(OUT_DIR, `_tmp_${food.id}.png`);

    process.stdout.write(`[${i+1}/${FOODS.length}] ${food.name}(${food.id})... `);
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
      for (let j = 0; j < 30; j++) {
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
      success.push(food.id);
      console.log('✓');
    } catch(e) {
      if (fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath);
      failed.push({ id: food.id, name: food.name, error: e.message });
      console.log(`✗ ${e.message}`);
    }
  }

  console.log(`\n${'═'.repeat(60)}`);
  console.log(`完成:${success.length} 成功,${failed.length} 失败`);
  console.log(`目录:${OUT_DIR}`);
  if (failed.length > 0) {
    console.log('\n失败:');
    failed.forEach(f => console.log(`  ${f.id} - ${f.name}: ${f.error}`));
  }
  fs.writeFileSync(
    path.join(__dirname, '_flat_batch_report.json'),
    JSON.stringify({ success, failed }, null, 2)
  );
}

main().catch(e => { console.error('❌', e.message); process.exit(1); });
