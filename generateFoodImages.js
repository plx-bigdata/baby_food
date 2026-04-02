/**
 * 排敏食物图片批量生成脚本 —— 可灵AI官方API
 * 文档：https://docs.qingque.cn/d/home/eZQDvqQMBJDOmgUiCqfxc7bfA
 *
 * 准备：
 *   npm install jsonwebtoken node-fetch dotenv
 *
 * .env 文件：
 *   KLING_ACCESS_KEY=your_access_key
 *   KLING_SECRET_KEY=your_secret_key
 */

require('dotenv').config();
const fs   = require('fs');
const path = require('path');
const https = require('https');
const jwt  = require('jsonwebtoken');

const OUTPUT_DIR    = './food_images';
const REFERENCE_DIR = './foods_whit_bg';   // 已有的白色背景食物图片参考目录
const MANIFEST_PATH = path.join(OUTPUT_DIR, '_manifest.json');
const API_BASE      = 'https://api-beijing.klingai.com';

// ── Prompt 模板（匹配 foods_whit_bg 风格：白色背景食物摄影）───
const makePrompt = (name, en) =>
  `${name}，纯白背景，实物摄影，高清细节，` +
  `婴儿辅食，中心构图，光线柔和均匀，` +
  `无阴影，无水印，无文字，干净简洁`;

// ── 可灵 JWT 鉴权（每次请求前生成，有效期30分钟）───────────────
function getKlingToken() {
  const ak = process.env.KLING_ACCESS_KEY;
  const sk = process.env.KLING_SECRET_KEY;
  if (!ak || !sk) throw new Error('缺少 KLING_ACCESS_KEY 或 KLING_SECRET_KEY');

  return jwt.sign(
    { iss: ak, exp: Math.floor(Date.now() / 1000) + 1800, nbf: Math.floor(Date.now() / 1000) - 5 },
    sk,
    { algorithm: 'HS256', header: { alg: 'HS256', typ: 'JWT' } }
  );
}

// ── 食物列表 ───────────────────────────────────────────────────
const ALL_FOODS = [
  { key:'rice_cereal',     name:'米粉',      en:'Rice Cereal'      },
  { key:'oat_cereal',      name:'燕麦糊',    en:'Oat Cereal'       },
  { key:'millet_porridge', name:'小米粥',    en:'Millet Porridge'  },
  { key:'wheat_cereal',    name:'小麦糊',    en:'Wheat Cereal'     },
  { key:'soft_rice',       name:'软饭',      en:'Soft Rice'        },
  { key:'noodles',         name:'细面条',    en:'Noodles'          },
  { key:'corn_porridge',   name:'玉米糊',    en:'Corn Porridge'    },
  { key:'bread',           name:'面包',      en:'Bread'            },
  { key:'carrot',          name:'胡萝卜',    en:'Carrot'           },
  { key:'pumpkin',         name:'南瓜',      en:'Pumpkin'          },
  { key:'sweet_potato',    name:'红薯',      en:'Sweet Potato'     },
  { key:'potato',          name:'土豆',      en:'Potato'           },
  { key:'zucchini',        name:'西葫芦',    en:'Zucchini'         },
  { key:'broccoli',        name:'西兰花',    en:'Broccoli'         },
  { key:'spinach',         name:'菠菜',      en:'Spinach'          },
  { key:'pea',             name:'豌豆',      en:'Pea'              },
  { key:'yam',             name:'山药',      en:'Yam'              },
  { key:'cauliflower',     name:'花椰菜',    en:'Cauliflower'      },
  { key:'chinese_cabbage', name:'白菜',      en:'Chinese Cabbage'  },
  { key:'corn',            name:'玉米',      en:'Corn'             },
  { key:'tomato',          name:'西红柿',    en:'Tomato'           },
  { key:'eggplant',        name:'茄子',      en:'Eggplant'         },
  { key:'celery',          name:'芹菜',      en:'Celery'           },
  { key:'cabbage',         name:'卷心菜',    en:'Cabbage'          },
  { key:'cucumber',        name:'黄瓜',      en:'Cucumber'         },
  { key:'asparagus',       name:'芦笋',      en:'Asparagus'        },
  { key:'mushroom',        name:'蘑菇',      en:'Mushroom'         },
  { key:'lotus_root',      name:'莲藕',      en:'Lotus Root'       },
  { key:'apple',           name:'苹果',      en:'Apple'            },
  { key:'pear',            name:'梨',        en:'Pear'             },
  { key:'banana',          name:'香蕉',      en:'Banana'           },
  { key:'avocado',         name:'牛油果',    en:'Avocado'          },
  { key:'watermelon',      name:'西瓜',      en:'Watermelon'       },
  { key:'blueberry',       name:'蓝莓',      en:'Blueberry'        },
  { key:'peach',           name:'桃',        en:'Peach'            },
  { key:'grape',           name:'葡萄',      en:'Grape'            },
  { key:'mango',           name:'芒果',      en:'Mango'            },
  { key:'strawberry',      name:'草莓',      en:'Strawberry'       },
  { key:'kiwi',            name:'猕猴桃',    en:'Kiwi'             },
  { key:'orange',          name:'橙子',      en:'Orange'           },
  { key:'cherry',          name:'樱桃',      en:'Cherry'           },
  { key:'plum',            name:'李子',      en:'Plum'             },
  { key:'pork_lean',       name:'猪里脊',    en:'Pork Tenderloin'  },
  { key:'beef',            name:'牛肉',      en:'Beef'             },
  { key:'pig_liver',       name:'猪肝',      en:'Pig Liver'        },
  { key:'chicken',         name:'鸡肉',      en:'Chicken'          },
  { key:'lamb',            name:'羊肉',      en:'Lamb'             },
  { key:'duck',            name:'鸭肉',      en:'Duck'             },
  { key:'white_fish',      name:'鳕鱼',      en:'Cod Fish'         },
  { key:'crucian',         name:'鲫鱼',      en:'Crucian Carp'     },
  { key:'tilapia',         name:'罗非鱼',    en:'Tilapia'          },
  { key:'salmon',          name:'三文鱼',    en:'Salmon'           },
  { key:'shrimp',          name:'虾',        en:'Shrimp'           },
  { key:'oyster',          name:'牡蛎',      en:'Oyster'           },
  { key:'crab',            name:'螃蟹',      en:'Crab'             },
  { key:'clam',            name:'蛤蜊',      en:'Clam'             },
  { key:'egg_yolk',        name:'鸡蛋黄',    en:'Egg Yolk'         },
  { key:'whole_egg',       name:'全蛋',      en:'Whole Egg'        },
  { key:'quail_egg',       name:'鹌鹑蛋',    en:'Quail Egg'        },
  { key:'tofu',            name:'豆腐',      en:'Tofu'             },
  { key:'edamame',         name:'毛豆',      en:'Edamame'          },
  { key:'lentil',          name:'红豆',      en:'Red Lentil'       },
  { key:'chickpea',        name:'鹰嘴豆',    en:'Chickpea'         },
  { key:'soybean',         name:'大豆',      en:'Soybean'          },
  { key:'yogurt',          name:'酸奶',      en:'Yogurt'           },
  { key:'cheese',          name:'奶酪',      en:'Cheese'           },
  { key:'butter',          name:'黄油',      en:'Butter'           },
  { key:'cows_milk',       name:'牛奶',      en:'Milk'             },
  { key:'peanut_paste',    name:'花生酱',    en:'Peanut Butter'    },
  { key:'almond_paste',    name:'杏仁泥',    en:'Almond Paste'     },
  { key:'walnut_paste',    name:'核桃泥',    en:'Walnut'           },
  { key:'sesame_paste',    name:'芝麻酱',    en:'Sesame Paste'     },
  { key:'flaxseed',        name:'亚麻籽',    en:'Flaxseed'         },
];

// ── 工具函数 ───────────────────────────────────────────────────
const sleep = ms => new Promise(r => setTimeout(r, ms));

function loadManifest() {
  try { return JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf-8')); }
  catch { return {}; }
}

// ── 读取已有图片（白色背景食物图）─────────────────────────────
function getExistingFoods() {
  const existing = new Set();
  if (!fs.existsSync(REFERENCE_DIR)) return existing;
  for (const cat of fs.readdirSync(REFERENCE_DIR)) {
    const catPath = path.join(REFERENCE_DIR, cat);
    if (!fs.statSync(catPath).isDirectory()) continue;
    for (const file of fs.readdirSync(catPath)) {
      const name = file.replace(/\.(jpg|png|webp|jpeg)$/i, '');
      existing.add(name);
    }
  }
  return existing;
}

function saveManifest(data) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  fs.writeFileSync(MANIFEST_PATH, JSON.stringify(data, null, 2));
}

async function downloadImage(url, localPath) {
  return new Promise((resolve, reject) => {
    fs.mkdirSync(path.dirname(localPath), { recursive: true });
    const file = fs.createWriteStream(localPath);
    https.get(url, res => {
      res.pipe(file);
      file.on('finish', () => file.close(resolve));
    }).on('error', err => { fs.unlink(localPath, () => {}); reject(err); });
  });
}

// ── 可灵 API 调用 ──────────────────────────────────────────────
async function klingRequest(method, path, body) {
  const token = getKlingToken();
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();
  if (data.code !== 0) throw new Error(`可灵API错误 ${data.code}: ${data.message}`);
  return data.data;
}

async function generateImage(food) {
  // 1. 提交任务
  const task = await klingRequest('POST', '/v1/images/generations', {
    model_name: 'kling-v1',        // 可选: kling-v1 / kling-v1-5
    prompt: makePrompt(food.name, food.en),
    negative_prompt: '文字，水印，阴影，复杂背景，模糊，低质量，插画，卡通，动漫，AI生成，扁平风格，3D渲染，CGI',
    image_count: 1,
    aspect_ratio: '1:1',
  });

  const taskId = task.task_id;
  if (!taskId) throw new Error('未获取到 task_id');

  // 2. 轮询结果（可灵图片生成通常 15~40 秒）
  for (let i = 0; i < 30; i++) {
    await sleep(3000);
    const result = await klingRequest('GET', `/v1/images/generations/${taskId}`);
    const status = result.task_status;

    if (status === 'succeed') {
      const imgUrl = result.task_result?.images?.[0]?.url;
      if (!imgUrl) throw new Error('结果中无图片URL');
      return imgUrl;
    }
    if (status === 'failed') throw new Error(result.task_status_msg || '任务失败');
    // status: 'submitted' | 'processing' → 继续等待
  }
  throw new Error('生成超时（90s）');
}

// ── 主流程 ─────────────────────────────────────────────────────
async function main() {
  if (!process.env.KLING_ACCESS_KEY || !process.env.KLING_SECRET_KEY) {
    console.error('❌ 请在 .env 文件中配置 KLING_ACCESS_KEY 和 KLING_SECRET_KEY');
    process.exit(1);
  }

  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  const manifest = loadManifest();
  const existing = getExistingFoods();   // 从 foods_whit_bg 读取已有图片
  const todo = ALL_FOODS.filter(f => !manifest[f.key]?.done && !existing.has(f.key));
  const doneCount = ALL_FOODS.length - todo.length - existing.size;

  console.log(`共 ${ALL_FOODS.length} 种，已有 ${existing.size} 种（跳过），manifest 已完成 ${ALL_FOODS.length - todo.length - existing.size}，待生成 ${todo.length} 种\n`);

  for (let i = 0; i < todo.length; i++) {
    const food = todo[i];
    const localPath = path.join(OUTPUT_DIR, `${food.key}.png`);
    const current = doneCount + i + 1;

    process.stdout.write(`[${current}/${ALL_FOODS.length}] ${food.name}... `);
    const t0 = Date.now();

    try {
      const imgUrl = await generateImage(food);
      await downloadImage(imgUrl, localPath);
      manifest[food.key] = { local: localPath, done: true, ts: Date.now() };
      saveManifest(manifest);
      console.log(`✓ ${((Date.now()-t0)/1000).toFixed(1)}s`);
    } catch (err) {
      console.log(`✗ ${err.message}`);
    }

    // 并发保护：每张间隔 3 秒
    if (i < todo.length - 1) await sleep(3000);
  }

  // 输出 key->本地路径 映射
  const map = {};
  ALL_FOODS.forEach(f => { map[f.key] = manifest[f.key]?.local || null; });
  fs.writeFileSync('./food_image_map.json', JSON.stringify(map, null, 2));

  const ok = Object.values(manifest).filter(v => v.done).length;
  console.log(`\n完成！${ok}/${ALL_FOODS.length} 张图片已保存到 ${OUTPUT_DIR}/`);
}

main().catch(console.error);
