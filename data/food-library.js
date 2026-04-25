// data/food-library.js — 食物图库
// 云存储已设为公有读，直接使用 HTTPS URL

const { PLAN_CATEGORIES } = require('./plan-categories.js');

const CLOUD_BASE = 'https://636c-cloud1-7gxy5dtebaba517e-1328830365.tcb.qcloud.la';

// 按 plan-categories 的 foodIds 顺序建立全局食物排序,保证各页面展示顺序一致
const PLAN_ORDER = (() => {
  const map = {};
  let i = 0;
  PLAN_CATEGORIES.forEach(cat => {
    (cat.foodIds || []).forEach(id => {
      if (!(id in map)) map[id] = i++;
    });
  });
  return map;
})();
function planOrderKey(id) {
  return id in PLAN_ORDER ? PLAN_ORDER[id] : Number.MAX_SAFE_INTEGER;
}

// 食物ID → 云端路径
const FOOD_CLOUD_PATH = {
  // 谷物
  'food_grain_rice_cereal':     'foods_image/rice.jpg',
  'food_grain_oat_cereal':      'foods_image/oats.jpg',
  'food_grain_millet_porridge': 'foods_image/millet.jpg',
  'food_grain_wheat_cereal':    'foods_image/wheat.jpg',
  'food_grain_bread':           'foods_image/wheat.jpg',
  // 蔬菜
  'food_veg_carrot':            'foods_image/carrot.jpg',
  'food_veg_pumpkin':           'foods_image/pumpkin.jpg',
  'food_veg_sweet_potato':      'foods_image/sweet_potato.jpg',
  'food_veg_potato':            'foods_image/potato.jpg',
  'food_veg_zucchini':          'foods_image/cucumber.jpg',
  'food_veg_broccoli':          'foods_image/broccoli.jpg',
  'food_veg_spinach':           'foods_image/spinach.jpg',
  'food_veg_pea':               'foods_image/pea.jpg',
  'food_veg_corn':              'foods_image/corn.jpg',
  'food_veg_tomato':            'foods_image/tomato.jpg',
  'food_veg_eggplant':          'foods_image/eggplant.jpg',
  'food_veg_celery':            'foods_image/celery.jpg',
  'food_veg_cabbage':           'foods_image/chinese_cabbage.jpg',
  'food_veg_cauliflower':       'foods_image/cauliflower.jpg',
  'food_veg_cucumber':          'foods_image/cucumber.jpg',
  'food_veg_chinese_cabbage':   'foods_image/chinese_cabbage.jpg',
  'food_veg_yam':               'foods_image/yam.jpg',
  'food_veg_asparagus':         'foods_image/asparagus.jpg',
  'food_veg_lotus_root':        'foods_image/lotus_root.jpg',
  'food_veg_mushroom':          'foods_image/mushroom.jpg',
  // 水果
  'food_fruit_apple':           'foods_image/apple.jpg',
  'food_fruit_pear':            'foods_image/pear.jpg',
  'food_fruit_banana':          'foods_image/banana.jpg',
  'food_fruit_avocado':         'foods_image/avocado.jpg',
  'food_fruit_watermelon':      'foods_image/watermelon.jpg',
  'food_fruit_blueberry':       'foods_image/blueberry.jpg',
  'food_fruit_mango':           'foods_image/mango.jpg',
  'food_fruit_strawberry':      'foods_image/strawberry.jpg',
  'food_fruit_grape':           'foods_image/grape.jpg',
  'food_fruit_peach':           'foods_image/peach.jpg',
  'food_fruit_kiwi':            'foods_image/kiwi.jpg',
  'food_fruit_orange':          'foods_image/orange.jpg',
  'food_fruit_cherry':          'foods_image/cherry.jpg',
  'food_fruit_plum':            'foods_image/plum.jpg',
  'food_fruit_papaya':          'foods_image/papaya.jpg',
  // 肉类
  'food_meat_pork_lean':        'foods_image/pork.jpg',
  'food_meat_beef':             'foods_image/beef.jpg',
  'food_meat_chicken':          'foods_image/chicken.jpg',
  'food_meat_lamb':             'foods_image/lamb.jpg',
  'food_meat_duck':             'foods_image/duck.jpg',
  'food_meat_pig_liver':        'foods_image/pig_liver.jpg',
  // 水产
  'food_sea_white_fish':        'foods_image/cod.jpg',
  'food_sea_salmon':            'foods_image/salmon.jpg',
  'food_sea_crucian':           'foods_image/crucian_carp.jpg',
  'food_sea_tilapia':           'foods_image/tilapia.jpg',
  'food_sea_shrimp':            'foods_image/shrimp.jpg',
  'food_sea_crab':              'foods_image/crab.jpg',
  'food_sea_oyster':            'foods_image/oyster.jpg',
  'food_sea_clam':              'foods_image/clam.jpg',
  // 蛋类
  'food_egg_egg_yolk':          'foods_image/chicken_egg.jpg',
  'food_egg_whole_egg':         'foods_image/chicken_egg.jpg',
  'food_egg_quail_egg':         'foods_image/quail_egg.jpg',
  'food_egg_duck_egg':          'foods_image/duck_egg.jpg',
  // 豆类
  'food_legume_tofu':           'foods_image/tofu.jpg',
  'food_legume_soybean':        'foods_image/soybeans.jpg',
  'food_legume_edamame':        'foods_image/edamame.jpg',
  'food_legume_lentil':         'foods_image/lentil.jpg',
  'food_legume_chickpea':       'foods_image/chickpeas.jpg',
  // 乳制品
  'food_dairy_formula':         'foods_image/milk.jpg',
  'food_dairy_yogurt':          'foods_image/yogurt.jpg',
  'food_dairy_cheese':          'foods_image/cheese.jpg',
  'food_dairy_cows_milk':       'foods_image/milk.jpg',
  'food_dairy_butter':          'foods_image/butter.jpg',
  // 坚果
  'food_nut_peanut_paste':      'foods_image/peanut.jpg',
  'food_nut_almond_paste':      'foods_image/almond.jpg',
  'food_nut_walnut_paste':      'foods_image/walnut.jpg',
  'food_nut_sesame_paste':      'foods_image/sesame.jpg',
  'food_nut_tahini':            'foods_image/pumpkin_seeds.jpg',
  'food_nut_flaxseed':          'foods_image/flaxseed.jpg',
  // 油脂
  'food_oil_olive_oil':         'foods_image/olive.jpg',
  'food_oil_coconut_oil':       'foods_image/coconut.jpg',
  'food_oil_rapeseed_oil':      'foods_image/rapeseed.jpg',
  'food_oil_walnut_oil':        'foods_image/walnut.jpg',
  // 新增谷物
  'food_grain_rice_porridge':         'foods_image/rice.jpg',
  'food_grain_purple_sweet_potato':   'foods_image/sweet_potato.jpg',
  'food_grain_coix':                  'foods_image/millet.jpg',
  'food_grain_steamed_bun':           'foods_image/wheat.jpg',
  // 新增蔬菜
  'food_veg_winter_melon':      'foods_image/cucumber.jpg',
  'food_veg_luffa':             'foods_image/cucumber.jpg',
  'food_veg_rapeseed_greens':   'foods_image/spinach.jpg',
  'food_veg_amaranth':          'foods_image/spinach.jpg',
  'food_veg_taro':              'foods_image/yam.jpg',
  'food_veg_okra':              'foods_image/asparagus.jpg',
  'food_veg_water_chestnut':    'foods_image/lotus_root.jpg',
  'food_veg_beetroot':          'foods_image/carrot.jpg',
  'food_veg_shiitake':          'foods_image/mushroom.jpg',
  'food_veg_black_fungus':      'foods_image/mushroom.jpg',
  // 新增水果
  'food_fruit_cantaloupe':      'foods_image/watermelon.jpg',
  'food_fruit_pomegranate':     'foods_image/grape.jpg',
  'food_fruit_jujube':          'foods_image/cherry.jpg',
  'food_fruit_mulberry':        'foods_image/blueberry.jpg',
  'food_fruit_pineapple':       'foods_image/mango.jpg',
  'food_fruit_loquat':          'foods_image/peach.jpg',
  'food_fruit_persimmon':       'foods_image/orange.jpg',
  'food_fruit_lychee':          'foods_image/grape.jpg',
  // 新增肉类
  'food_meat_pig_blood':        'foods_image/pork.jpg',
  'food_meat_chicken_liver':    'foods_image/pig_liver.jpg',
  'food_meat_beef_liver':       'foods_image/pig_liver.jpg',
  // 新增水产
  'food_sea_sea_bass':          'foods_image/tilapia.jpg',
  'food_sea_hairtail':          'foods_image/cod.jpg',
  'food_sea_yellow_croaker':    'foods_image/tilapia.jpg',
  'food_sea_grass_carp':        'foods_image/crucian_carp.jpg',
  // 新增豆制品
  'food_legume_soy_milk':       'foods_image/soybeans.jpg',
  'food_legume_mung_bean':      'foods_image/edamame.jpg',
  'food_legume_black_bean':     'foods_image/soybeans.jpg',
};

// 食物 Emoji 映射
const FOOD_EMOJI = {
  // ===== 谷物主食 =====
  'food_grain_rice_cereal':           '🥣',   // 米粉(婴儿米糊,用碗勺形象)
  'food_grain_rice_porridge':         '🌾',   // 大米
  'food_grain_oat_cereal':            '🌾',   // 燕麦
  'food_grain_millet_porridge':       '🌾',   // 小米
  'food_grain_wheat_cereal':          '🌾',   // 小麦
  'food_grain_bread':                 '🍞',   // 面包
  'food_grain_purple_sweet_potato':  '🍠',   // 紫薯
  'food_grain_coix':                 '🌰',   // 薏米
  'food_grain_steamed_bun':           '🥟',   // 馒头
  // ===== 蔬菜 =====
  'food_veg_carrot':                 '🥕',   // 胡萝卜
  'food_veg_pumpkin':                '🎃',   // 南瓜
  'food_veg_sweet_potato':           '🍠',   // 红薯
  'food_veg_potato':                 '🥔',   // 土豆
  'food_veg_zucchini':               '🥒',   // 西葫芦
  'food_veg_broccoli':               '🥦',   // 西兰花
  'food_veg_spinach':                '🥬',   // 菠菜
  'food_veg_pea':                    '🫛',   // 豌豆
  'food_veg_corn':                   '🌽',   // 玉米
  'food_veg_tomato':                 '🍅',   // 番茄
  'food_veg_eggplant':               '🍆',   // 茄子
  'food_veg_celery':                 '🌿',   // 芹菜
  'food_veg_cabbage':                '🥬',   // 卷心菜
  'food_veg_cauliflower':            '🥦',   // 花菜
  'food_veg_cucumber':               '🥒',   // 黄瓜
  'food_veg_chinese_cabbage':        '🥬',   // 白菜
  'food_veg_yam':                    '🥔',   // 山药
  'food_veg_asparagus':               '🌿',   // 芦笋
  'food_veg_lotus_root':             '🪷',   // 莲藕
  'food_veg_mushroom':               '🍄',   // 蘑菇
  'food_veg_rapeseed_greens':        '🥬',   // 油菜
  'food_veg_winter_melon':           '🍈',   // 冬瓜
  'food_veg_luffa':                  '🥒',   // 丝瓜
  'food_veg_amaranth':               '🥬',   // 苋菜
  'food_veg_taro':                   '🥔',   // 芋头
  'food_veg_okra':                   '🌿',   // 秋葵
  'food_veg_beetroot':               '🫒',   // 甜菜根
  'food_veg_shiitake':               '🍄',   // 香菇
  'food_veg_water_chestnut':         '🌰',   // 荸荠
  'food_veg_black_fungus':           '🍄',   // 木耳
  'food_veg_white_radish':           '🫚',   // 白萝卜(临时用根茎类图标占位)
  'food_veg_lettuce':                '🥬',   // 生菜
  'food_veg_green_bean':             '🫛',   // 四季豆
  // ===== 水果 =====
  'food_fruit_apple':                '🍎',   // 苹果
  'food_fruit_pear':                 '🍐',   // 梨
  'food_fruit_banana':               '🍌',   // 香蕉
  'food_fruit_avocado':              '🥑',   // 牛油果
  'food_fruit_watermelon':           '🍉',   // 西瓜
  'food_fruit_blueberry':            '🫐',   // 蓝莓
  'food_fruit_mango':                '🥭',   // 芒果
  'food_fruit_strawberry':           '🍓',   // 草莓
  'food_fruit_grape':                '🍇',   // 葡萄
  'food_fruit_peach':                '🍑',   // 桃子
  'food_fruit_kiwi':                 '🥝',   // 猕猴桃
  'food_fruit_orange':               '🍊',   // 橙子
  'food_fruit_cherry':               '🍒',   // 樱桃
  'food_fruit_plum':                 '🍑',   // 李子
  'food_fruit_papaya':               '🍈',   // 木瓜
  'food_fruit_cantaloupe':           '🍈',   // 哈密瓜
  'food_fruit_jujube':              '🍒',   // 红枣
  'food_fruit_mulberry':             '🫐',   // 桑葚
  'food_fruit_loquat':               '🍐',   // 枇杷
  'food_fruit_pineapple':            '🍍',   // 菠萝
  'food_fruit_pomegranate':          '🍎',   // 石榴
  'food_fruit_persimmon':            '🍊',   // 柿子
  'food_fruit_lychee':               '🍑',   // 荔枝
  'food_fruit_tangerine':            '🍊',   // 橘子
  'food_fruit_pomelo':               '🍋',   // 柚子
  // ===== 肉类 =====
  'food_meat_pork_lean':             '🐖',   // 瘦肉
  'food_meat_beef':                  '🐄',   // 牛肉
  'food_meat_chicken':                '🐔',   // 鸡肉
  'food_meat_lamb':                  '🐑',   // 羊肉
  'food_meat_duck':                  '🦆',   // 鸭肉
  'food_meat_pig_liver':             '🥩',   // 猪肝
  'food_meat_pig_blood':             '🥘',   // 猪血
  'food_meat_chicken_liver':         '🥩',   // 鸡肝
  'food_meat_beef_liver':            '🥩',   // 牛肝
  // ===== 鱼虾水产 =====
  'food_sea_white_fish':             '🐟',   // 鳕鱼
  'food_sea_salmon':                 '🐠',   // 三文鱼
  'food_sea_crucian':                '🐟',   // 鲫鱼
  'food_sea_tilapia':                '🐟',   // 罗非鱼
  'food_sea_sea_bass':               '🐠',   // 鲈鱼
  'food_sea_yellow_croaker':        '🐡',   // 黄鱼
  'food_sea_grass_carp':             '🐟',   // 草鱼
  'food_sea_hairtail':               '🐟',   // 带鱼
  'food_sea_shrimp':                 '🦐',   // 虾
  'food_sea_crab':                   '🦀',   // 蟹
  'food_sea_oyster':                 '🦪',   // 生蚝
  'food_sea_clam':                   '🦪',   // 蛤蜊
  // ===== 蛋类 =====
  'food_egg_egg_yolk':               '🥚',   // 蛋黄
  'food_egg_whole_egg':              '🍳',   // 全蛋
  'food_egg_quail_egg':              '🥚',   // 鹌鹑蛋
  'food_egg_duck_egg':               '🥚',   // 鸭蛋
  // ===== 豆制品 =====
  'food_legume_tofu':                '🧈',   // 豆腐
  'food_legume_soybean':             '🫘',   // 黄豆
  'food_legume_edamame':             '🫛',   // 毛豆
  'food_legume_lentil':              '🫘',   // 扁豆
  'food_legume_chickpea':            '🫘',   // 鹰嘴豆
  'food_legume_mung_bean':           '🫘',   // 绿豆
  'food_legume_black_bean':          '🫘',   // 黑豆
  'food_legume_soy_milk':            '🥛',   // 豆浆
  // ===== 乳制品 =====
  'food_dairy_formula':              '🍼',   // 配方奶
  'food_dairy_yogurt':               '🍨',   // 酸奶
  'food_dairy_cheese':               '🧀',   // 奶酪
  'food_dairy_cows_milk':            '🥛',   // 牛奶
  'food_dairy_butter':               '🧈',   // 黄油
  // ===== 坚果种子 =====
  'food_nut_peanut_paste':           '🥜',   // 花生
  'food_nut_almond_paste':            '🌰',   // 杏仁
  'food_nut_walnut_paste':            '🌰',   // 核桃
  'food_nut_sesame_paste':           '🌱',   // 芝麻
  'food_nut_tahini':                  '🌻',   // 葵花籽
  'food_nut_flaxseed':               '🫘',   // 亚麻籽
  // ===== 油脂 =====
  'food_oil_olive_oil':              '🫒',   // 橄榄油
  'food_oil_coconut_oil':            '🥥',   // 椰子油
  'food_oil_rapeseed_oil':           '🌻',   // 菜籽油
  'food_oil_walnut_oil':             '🌰',   // 核桃油
};

// 获取食物 Emoji
function getFoodEmoji(foodId) {
  return FOOD_EMOJI[foodId] || '🍽️';
}

// 食物图标云存储映射（已上传到微信云存储，主包不再打包本地图标）
const ICON_CLOUD_PREFIX = 'cloud://darcy01-9glmf7r53f72d926.6461-darcy01-9glmf7r53f72d926-1422236596/food-icons/';
const FOOD_ICON_FILES = [
  'food_egg_duck_egg', 'food_egg_egg_yolk',
  'food_fruit_cantaloupe', 'food_fruit_jujube', 'food_fruit_loquat',
  'food_fruit_lychee', 'food_fruit_mulberry', 'food_fruit_persimmon',
  'food_fruit_pineapple', 'food_fruit_plum', 'food_fruit_pomegranate',
  // 谷物 PNG 图标(已上传):面包 🍞、细面条 🍜 走 emoji,不在此列表
  'food_grain_coix', 'food_grain_millet_porridge',
  'food_grain_oat_cereal',
  'food_grain_purple_sweet_potato',
  'food_grain_rice_cereal',
  'food_grain_rice_porridge', 'food_grain_steamed_bun',
  'food_grain_wheat_cereal',
  'food_legume_black_bean', 'food_legume_chickpea', 'food_legume_lentil',
  'food_legume_mung_bean', 'food_legume_soy_milk', 'food_legume_soybean',
  'food_legume_tofu',
  'food_dairy_yogurt',
  'food_meat_beef_liver', 'food_meat_chicken_liver',
  'food_meat_pig_blood', 'food_meat_pig_liver',
  'food_nut_almond_paste', 'food_nut_flaxseed', 'food_nut_sesame_paste',
  'food_nut_tahini', 'food_nut_walnut_paste',
  'food_oil_walnut_oil',
  'food_sea_hairtail', 'food_sea_salmon', 'food_sea_sea_bass',
  'food_sea_yellow_croaker',
  'food_veg_amaranth', 'food_veg_asparagus', 'food_veg_beetroot',
  'food_veg_black_fungus', 'food_veg_cabbage', 'food_veg_celery',
  'food_veg_lettuce',
  'food_veg_lotus_root', 'food_veg_luffa', 'food_veg_okra',
  'food_veg_rapeseed_greens', 'food_veg_shiitake', 'food_veg_spinach',
  'food_veg_taro', 'food_veg_water_chestnut', 'food_veg_white_radish',
  'food_veg_winter_melon', 'food_veg_yam', 'food_veg_zucchini',
];
const FOOD_ICON_URL = FOOD_ICON_FILES.reduce((map, id) => {
  map[id] = `${ICON_CLOUD_PREFIX}${id}.png`;
  return map;
}, {});

const LOCAL_FOOD_ICON_URL = {};

const FORCE_EMOJI_ICON_IDS = new Set([
  'food_veg_green_bean',
  'food_fruit_tangerine',
  'food_fruit_pomelo',
  // 坚果种子中没有真图的仍走 emoji
  'food_nut_peanut_paste',
  'food_nut_tahini',
  'food_nut_flaxseed',
]);

function getFoodLocalIconPath(foodId) {
  return LOCAL_FOOD_ICON_URL[foodId] || '';
}

function getFoodIconUrl(foodId) {
  if (FORCE_EMOJI_ICON_IDS.has(foodId)) return '';
  return FOOD_ICON_URL[foodId] || '';
}

// 英文名映射
const FOOD_EN_NAME = {
  'food_grain_rice_cereal': 'Rice Cereal', 'food_grain_oat_cereal': 'Oatmeal',
  'food_grain_millet_porridge': 'Millet Porridge', 'food_grain_wheat_cereal': 'Wheat Cereal',
  'food_grain_bread': 'Bread',
  'food_veg_carrot': 'Carrot', 'food_veg_pumpkin': 'Pumpkin',
  'food_veg_sweet_potato': 'Sweet Potato', 'food_veg_potato': 'Potato',
  'food_veg_zucchini': 'Zucchini', 'food_veg_broccoli': 'Broccoli',
  'food_veg_spinach': 'Spinach', 'food_veg_pea': 'Pea',
  'food_veg_corn': 'Corn', 'food_veg_tomato': 'Tomato',
  'food_veg_eggplant': 'Eggplant', 'food_veg_celery': 'Celery',
  'food_veg_cabbage': 'Cabbage', 'food_veg_cauliflower': 'Cauliflower',
  'food_veg_cucumber': 'Cucumber', 'food_veg_chinese_cabbage': 'Chinese Cabbage',
  'food_veg_yam': 'Yam', 'food_veg_asparagus': 'Asparagus',
  'food_veg_lotus_root': 'Lotus Root', 'food_veg_mushroom': 'Mushroom',
  'food_fruit_apple': 'Apple', 'food_fruit_pear': 'Pear',
  'food_fruit_banana': 'Banana', 'food_fruit_avocado': 'Avocado',
  'food_fruit_watermelon': 'Watermelon', 'food_fruit_blueberry': 'Blueberry',
  'food_fruit_mango': 'Mango', 'food_fruit_strawberry': 'Strawberry',
  'food_fruit_grape': 'Grape', 'food_fruit_peach': 'Peach',
  'food_fruit_kiwi': 'Kiwi', 'food_fruit_orange': 'Orange',
  'food_fruit_cherry': 'Cherry', 'food_fruit_plum': 'Plum',
  'food_fruit_papaya': 'Papaya', 'food_meat_pork_lean': 'Pork Tenderloin',
  'food_meat_beef': 'Beef', 'food_meat_chicken': 'Chicken',
  'food_meat_lamb': 'Lamb', 'food_meat_duck': 'Duck',
  'food_meat_pig_liver': 'Pig Liver', 'food_sea_white_fish': 'White Fish',
  'food_sea_salmon': 'Salmon', 'food_sea_crucian': 'Crucian Carp',
  'food_sea_tilapia': 'Tilapia', 'food_sea_shrimp': 'Shrimp',
  'food_sea_crab': 'Crab', 'food_sea_oyster': 'Oyster',
  'food_sea_clam': 'Clam', 'food_egg_egg_yolk': 'Egg Yolk',
  'food_egg_whole_egg': 'Whole Egg', 'food_egg_quail_egg': 'Quail Egg',
  'food_egg_duck_egg': 'Duck Egg', 'food_legume_tofu': 'Tofu',
  'food_legume_soybean': 'Soybean', 'food_legume_edamame': 'Edamame',
  'food_legume_lentil': 'Lentil', 'food_legume_chickpea': 'Chickpea',
  'food_dairy_yogurt': 'Yogurt', 'food_dairy_cheese': 'Cheese',
  'food_dairy_cows_milk': "Cow's Milk", 'food_dairy_butter': 'Butter',
  'food_nut_peanut_paste': 'Peanut Butter', 'food_nut_almond_paste': 'Almond Paste',
  'food_nut_walnut_paste': 'Walnut Paste', 'food_nut_sesame_paste': 'Sesame Paste',
  'food_oil_olive_oil': 'Olive Oil', 'food_oil_coconut_oil': 'Coconut Oil',
  'food_oil_rapeseed_oil': 'Rapeseed Oil', 'food_oil_walnut_oil': 'Walnut Oil',
  // 新增谷物
  'food_grain_rice_porridge': 'Rice Porridge', 'food_grain_purple_sweet_potato': 'Purple Sweet Potato',
  'food_grain_coix': 'Coix Porridge', 'food_grain_steamed_bun': 'Steamed Bun',
  // 新增蔬菜
  'food_veg_rapeseed_greens': 'Rapeseed Greens', 'food_veg_winter_melon': 'Winter Melon',
  'food_veg_luffa': 'Luffa', 'food_veg_amaranth': 'Amaranth',
  'food_veg_taro': 'Taro', 'food_veg_okra': 'Okra',
  'food_veg_beetroot': 'Beetroot', 'food_veg_shiitake': 'Shiitake',
  'food_veg_water_chestnut': 'Water Chestnut', 'food_veg_black_fungus': 'Black Fungus',
  'food_veg_white_radish': 'White Radish', 'food_veg_lettuce': 'Lettuce',
  'food_veg_green_bean': 'Green Bean',
  // 新增水果
  'food_fruit_cantaloupe': 'Cantaloupe', 'food_fruit_jujube': 'Jujube',
  'food_fruit_mulberry': 'Mulberry', 'food_fruit_loquat': 'Loquat',
  'food_fruit_pineapple': 'Pineapple', 'food_fruit_pomegranate': 'Pomegranate',
  'food_fruit_persimmon': 'Persimmon', 'food_fruit_lychee': 'Lychee',
  'food_fruit_tangerine': 'Tangerine', 'food_fruit_pomelo': 'Pomelo',
  // 新增肉类
  'food_meat_pig_blood': 'Pig Blood', 'food_meat_chicken_liver': 'Chicken Liver',
  'food_meat_beef_liver': 'Beef Liver',
  // 新增水产
  'food_sea_sea_bass': 'Sea Bass', 'food_sea_yellow_croaker': 'Yellow Croaker',
  'food_sea_grass_carp': 'Grass Carp', 'food_sea_hairtail': 'Hairtail',
  // 新增豆制品
  'food_legume_mung_bean': 'Mung Bean', 'food_legume_black_bean': 'Black Bean',
  'food_legume_soy_milk': 'Soy Milk',
  // 坚果油脂
  'food_nut_tahini': 'Tahini', 'food_nut_flaxseed': 'Flaxseed',
  // 配方奶
  'food_dairy_formula': 'Infant Formula',
};

function getFoodEnName(foodId) {
  return FOOD_EN_NAME[foodId] || '';
}

// 获取月龄标签（用于角标显示）
function getMonthLabel(month) {
  if (!month || month === 0) return '';
  if (month >= 12) return `${Math.floor(month / 12)}Y+`;
  return `${month}M+`;
}

// 获取食物图片 URL
function getFoodImageUrl(foodId) {
  const path = FOOD_CLOUD_PATH[foodId];
  if (!path) return '';
  return `${CLOUD_BASE}/${path}`;
}

function isCoreFood(food) {
  return food && food.isCore !== false;
}

function getCoreFoods() {
  return FOODS.filter(isCoreFood);
}

// 食物数据
const FOODS = [
  // ========== 谷物主食 (grain) ==========
  { id: 'food_grain_rice_cereal',     name: '米粉',       category: 'grain',    allergyRisk: '低',   recommendMonth: 6,  tags: ['主食', '铁强化'],    description: '第一口辅食首选，铁强化米粉' },
  { id: 'food_grain_oat_cereal',     name: '燕麦',       category: 'grain',    allergyRisk: '低',   recommendMonth: 6,  tags: ['主食', 'β-葡聚糖'],  description: '优先用原味燕麦煮软打糊' },
  { id: 'food_grain_millet_porridge',name: '小米',       category: 'grain',    allergyRisk: '低',   recommendMonth: 6,  tags: ['主食', 'B族维生素'], description: '温和易消化，可煮软做泥糊' },
  { id: 'food_grain_wheat_cereal',   name: '小麦',       category: 'grain',    allergyRisk: '中',   recommendMonth: 7,  tags: ['含麸质'],          description: '含麸质，建议用单一麦类形态引入' },
  { id: 'food_grain_bread',          name: '面包',       category: 'grain',    allergyRisk: '中',   recommendMonth: 10, tags: ['主食'],            description: '加工主食，放在家庭餐阶段引入', isCore: false },

  // ========== 蔬菜 (vegetable) ==========
  { id: 'food_veg_carrot',       name: '胡萝卜',   category: 'vegetable', allergyRisk: '低', recommendMonth: 6, tags: ['β-胡萝卜素', '维生素A'], description: '富含β-胡萝卜素，蒸熟打泥' },
  { id: 'food_veg_pumpkin',      name: '南瓜',     category: 'vegetable', allergyRisk: '低', recommendMonth: 6, tags: ['β-胡萝卜素'],      description: '甜味，宝宝易接受' },
  { id: 'food_veg_sweet_potato', name: '红薯',     category: 'vegetable', allergyRisk: '低', recommendMonth: 6, tags: ['膳食纤维'],        description: '富含膳食纤维，预防便秘' },
  { id: 'food_veg_potato',       name: '土豆',     category: 'vegetable', allergyRisk: '低', recommendMonth: 6, tags: ['淀粉', '维生素C'],   description: '蒸熟压泥，不加盐' },
  { id: 'food_veg_zucchini',      name: '西葫芦',   category: 'vegetable', allergyRisk: '低', recommendMonth: 6, tags: ['水分多', '口感软'], description: '水分多，口感软' },
  { id: 'food_veg_broccoli',     name: '西兰花',   category: 'vegetable', allergyRisk: '中', recommendMonth: 6, tags: ['维生素C'],          description: '十字花科，富含维生素C，焯水后打泥' },
  { id: 'food_veg_spinach',      name: '菠菜',     category: 'vegetable', allergyRisk: '低', recommendMonth: 6, tags: ['铁', '叶酸'],        description: '草酸较高，焯水去除' },
  { id: 'food_veg_pea',          name: '豌豆',     category: 'vegetable', allergyRisk: '低', recommendMonth: 6, tags: ['蛋白质'],            description: '过滤豆皮，研磨成泥' },
  { id: 'food_veg_corn',         name: '玉米',     category: 'vegetable', allergyRisk: '低', recommendMonth: 7, tags: ['膳食纤维'],          description: '过滤玉米皮后使用' },
  { id: 'food_veg_tomato',       name: '西红柿',   category: 'vegetable', allergyRisk: '低', recommendMonth: 7, tags: ['维生素C', '番茄红素'], description: '去皮去籽，少量引入' },
  { id: 'food_veg_eggplant',     name: '茄子',     category: 'vegetable', allergyRisk: '低', recommendMonth: 7, tags: ['膳食纤维'],          description: '蒸熟压泥' },
  { id: 'food_veg_celery',       name: '芹菜',     category: 'vegetable', allergyRisk: '低', recommendMonth: 8, tags: ['膳食纤维'],          description: '焯水切末，纤维较粗' },
  { id: 'food_veg_cabbage',      name: '卷心菜',   category: 'vegetable', allergyRisk: '低', recommendMonth: 7, tags: ['维生素C'],            description: '煮软后食用' },
  { id: 'food_veg_cauliflower',  name: '花椰菜',   category: 'vegetable', allergyRisk: '中', recommendMonth: 6, tags: ['维生素C'],            description: '十字花科，与西兰花同类，温和' },
  { id: 'food_veg_cucumber',     name: '黄瓜',     category: 'vegetable', allergyRisk: '低', recommendMonth: 8, tags: ['水分'],               description: '去皮去籽，蒸软或生食条状' },
  { id: 'food_veg_chinese_cabbage',name: '白菜',   category: 'vegetable', allergyRisk: '低', recommendMonth: 6, tags: ['维生素'],            description: '叶片柔软，易消化' },
  { id: 'food_veg_yam',          name: '山药',     category: 'vegetable', allergyRisk: '低', recommendMonth: 6, tags: ['淀粉', '健脾'],      description: '蒸熟压泥，润肺健脾' },
  { id: 'food_veg_asparagus',    name: '芦笋',     category: 'vegetable', allergyRisk: '低', recommendMonth: 8, tags: ['维生素'],            description: '取嫩尖部分，焯水后使用' },
  { id: 'food_veg_lotus_root',   name: '莲藕',     category: 'vegetable', allergyRisk: '低', recommendMonth: 9, tags: ['淀粉', '维生素C'],   description: '煮熟压泥或切丁' },
  { id: 'food_veg_mushroom',     name: '蘑菇',     category: 'vegetable', allergyRisk: '中', recommendMonth: 9, tags: ['鲜味', '维生素D'],   description: '菌类有争议，部分宝宝过敏，煮熟切碎引入' },

  // ========== 水果 (fruit) ==========
  { id: 'food_fruit_apple',       name: '苹果',     category: 'fruit',  allergyRisk: '低',   recommendMonth: 6, tags: ['膳食纤维', '维生素C'], description: '蒸熟打泥，或研磨生泥' },
  { id: 'food_fruit_pear',        name: '梨',       category: 'fruit',  allergyRisk: '低',   recommendMonth: 6, tags: ['润肺', '膳食纤维'],    description: '润肺，蒸熟后更易消化' },
  { id: 'food_fruit_banana',      name: '香蕉',     category: 'fruit',  allergyRisk: '低',   recommendMonth: 6, tags: ['钾'],                 description: '直接捣泥，富含钾' },
  { id: 'food_fruit_avocado',     name: '牛油果',   category: 'fruit',  allergyRisk: '低',   recommendMonth: 6, tags: ['健康脂肪'],          description: '富含健康脂肪，直接捣泥' },
  { id: 'food_fruit_watermelon',  name: '西瓜',     category: 'fruit',  allergyRisk: '低',   recommendMonth: 6, tags: ['水分'],              description: '去籽去皮，少量引入' },
  { id: 'food_fruit_blueberry',   name: '蓝莓',     category: 'fruit',  allergyRisk: '低',   recommendMonth: 6, tags: ['花青素'],            description: '压泥或切半，富含花青素' },
  { id: 'food_fruit_mango',       name: '芒果',     category: 'fruit',  allergyRisk: '中',   recommendMonth: 8, tags: ['维生素A'],            description: '少数宝宝过敏，少量观察' },
  { id: 'food_fruit_strawberry',  name: '草莓',     category: 'fruit',  allergyRisk: '中',   recommendMonth: 8, tags: ['维生素C'],            description: '有过敏风险，捣泥后引入' },
  { id: 'food_fruit_grape',       name: '葡萄',     category: 'fruit',  allergyRisk: '低',   recommendMonth: 8, tags: ['抗氧化', '铁'],       description: '去皮去籽，压泥或切小块' },
  { id: 'food_fruit_peach',       name: '桃',       category: 'fruit',  allergyRisk: '低',   recommendMonth: 7, tags: ['维生素C'],            description: '去皮去核，蒸熟后食用' },
  { id: 'food_fruit_kiwi',        name: '猕猴桃',   category: 'fruit',  allergyRisk: '中',   recommendMonth: 8, tags: ['维生素C', '叶酸'],    description: '酸性较强，少量引入' },
  { id: 'food_fruit_orange',      name: '橙子',     category: 'fruit',  allergyRisk: '低',   recommendMonth: 8, tags: ['维生素C'],            description: '榨汁稀释或取果肉' },
  { id: 'food_fruit_cherry',      name: '樱桃',     category: 'fruit',  allergyRisk: '低',   recommendMonth: 8, tags: ['铁', '维生素C'],      description: '去核压泥' },
  { id: 'food_fruit_plum',        name: '李子',     category: 'fruit',  allergyRisk: '低',   recommendMonth: 9, tags: ['膳食纤维'],          description: '去皮去核' },
  { id: 'food_fruit_papaya',      name: '木瓜',     category: 'fruit',  allergyRisk: '低',   recommendMonth: 7, tags: ['助消化'],            description: '助消化，压泥食用' },

  // ========== 肉类蛋白 (protein_meat) ==========
  { id: 'food_meat_pork_lean', name: '猪肉',    category: 'meat', allergyRisk: '低',   recommendMonth: 6, tags: ['蛋白质', '铁'],      description: '最先引入的肉类，蒸熟打泥' },
  { id: 'food_meat_beef',      name: '牛肉',    category: 'meat', allergyRisk: '中',   recommendMonth: 6, tags: ['铁', '蛋白质'],       description: '红肉过敏率低，但部分宝宝敏感，补铁首选' },
  { id: 'food_meat_chicken',    name: '鸡肉',    category: 'meat', allergyRisk: '低',   recommendMonth: 7, tags: ['蛋白质'],            description: '去皮去骨，蒸熟切碎' },
  { id: 'food_meat_lamb',       name: '羊肉',    category: 'meat', allergyRisk: '中',   recommendMonth: 8, tags: ['蛋白质'],            description: '膻味较重，部分宝宝对羊肉过敏，与蔬菜搭配' },
  { id: 'food_meat_duck',       name: '鸭肉',    category: 'meat', allergyRisk: '低',   recommendMonth: 9, tags: ['脂肪'],              description: '去皮，脂肪较高' },
  { id: 'food_meat_pig_liver',  name: '猪肝',    category: 'meat', allergyRisk: '低',   recommendMonth: 7, tags: ['铁', '维生素A'],     description: '富含铁和维生素A，每周1~2次' },

  // ========== 水产蛋白 (protein_seafood) ==========
  { id: 'food_sea_white_fish', name: '鳕鱼', category: 'seafood', allergyRisk: '中', recommendMonth: 7,  tags: ['DHA', '蛋白质'], description: '过敏风险中等，仔细去刺' },
  { id: 'food_sea_salmon',     name: '三文鱼',   category: 'seafood', allergyRisk: '中', recommendMonth: 8,  tags: ['DHA'],             description: '富含DHA，蒸熟去刺' },
  { id: 'food_sea_crucian',    name: '鲫鱼',     category: 'seafood', allergyRisk: '中', recommendMonth: 7,  tags: ['蛋白质'],           description: '刺多需过滤，取鱼肉泥' },
  { id: 'food_sea_tilapia',    name: '罗非鱼',   category: 'seafood', allergyRisk: '中', recommendMonth: 7,  tags: ['刺少'],             description: '刺少，适合辅食' },
  { id: 'food_sea_shrimp',     name: '虾',       category: 'seafood', allergyRisk: '高', recommendMonth: 9,  tags: ['高敏'],             description: '甲壳类高敏食物，少量谨慎引入' },
  { id: 'food_sea_crab',       name: '螃蟹',     category: 'seafood', allergyRisk: '高', recommendMonth: 12, tags: ['高敏'],             description: '高敏，建议1岁后引入' },
  { id: 'food_sea_oyster',     name: '牡蛎',     category: 'seafood', allergyRisk: '高', recommendMonth: 12, tags: ['高敏', '锌'],       description: '高敏，富含锌，1岁后' },
  { id: 'food_sea_clam',       name: '蛤蜊',     category: 'seafood', allergyRisk: '高', recommendMonth: 12, tags: ['高敏'],             description: '贝类高敏，谨慎引入' },

  // ========== 蛋类 (protein_egg) ==========
  { id: 'food_egg_egg_yolk',   name: '鸡蛋黄',  category: 'egg', allergyRisk: '低',   recommendMonth: 6, tags: ['DHA', '铁'],         description: '先引入蛋黄，富含铁和DHA' },
  { id: 'food_egg_whole_egg',  name: '全蛋',    category: 'egg', allergyRisk: '中',   recommendMonth: 8, tags: ['蛋白质'],           description: '蛋白有过敏风险，观察3~5天' },
  { id: 'food_egg_quail_egg',  name: '鹌鹑蛋',  category: 'egg', allergyRisk: '中',   recommendMonth: 8, tags: ['营养类似鸡蛋'],     description: '营养类似鸡蛋，同样观察' },
  { id: 'food_egg_duck_egg',   name: '鸭蛋黄',  category: 'egg', allergyRisk: '中',   recommendMonth: 8, tags: ['蛋白质'],           description: '可替代鸡蛋，注意腥味' },

  // ========== 豆类 (protein_legume) ==========
  { id: 'food_legume_tofu',     name: '豆腐',      category: 'legume', allergyRisk: '中', recommendMonth: 8,  tags: ['优质蛋白'],       description: '优质蛋白，嫩豆腐直接压泥' },
  { id: 'food_legume_soybean',  name: '大豆',      category: 'legume', allergyRisk: '高', recommendMonth: 10, tags: ['八大过敏原之一'], description: '八大过敏原之一，谨慎引入' },
  { id: 'food_legume_edamame',  name: '毛豆',      category: 'legume', allergyRisk: '中', recommendMonth: 9,  tags: ['蛋白质'],          description: '去皮压泥' },
  { id: 'food_legume_lentil',   name: '扁豆/红豆', category: 'legume', allergyRisk: '低', recommendMonth: 8,  tags: ['植物蛋白'],       description: '煮软压泥，植物蛋白' },
  { id: 'food_legume_chickpea', name: '鹰嘴豆',    category: 'legume', allergyRisk: '低', recommendMonth: 9,  tags: ['营养丰富'],       description: '煮软打泥，营养丰富' },

  // ========== 乳制品 (dairy) ==========
  { id: 'food_dairy_formula',   name: '配方奶',  category: 'dairy', allergyRisk: '低', recommendMonth: 0,  tags: ['主食'],              description: '基础奶类喂养，不纳入核心辅食排敏清单', isCore: false },
  { id: 'food_dairy_yogurt',    name: '原味酸奶', category: 'dairy', allergyRisk: '中', recommendMonth: 8,  tags: ['乳糖分解更好'],   description: '乳糖分解更好，选无糖全脂' },
  { id: 'food_dairy_cheese',    name: '奶酪',    category: 'dairy', allergyRisk: '中', recommendMonth: 9,  tags: ['高钙'],              description: '高钙，选低钠儿童奶酪' },
  { id: 'food_dairy_cows_milk', name: '纯牛奶',  category: 'dairy', allergyRisk: '高', recommendMonth: 12, tags: ['八大过敏原'],      description: '1岁后作为饮品，八大过敏原' },
  { id: 'food_dairy_butter',    name: '黄油',    category: 'dairy', allergyRisk: '中', recommendMonth: 8,  tags: ['热量'],              description: '烹饪配料，放在家庭餐阶段引入', isCore: false },

  // ========== 坚果种子 (nut_seed) ==========
  { id: 'food_nut_peanut_paste', name: '花生',    category: 'nut', allergyRisk: '高', recommendMonth: 6,  tags: ['八大过敏原', 'LEAP研究'], description: '早期引入反而降低过敏风险（LEAP研究），磨碎/稀释后引入' },
  { id: 'food_nut_almond_paste', name: '杏仁',    category: 'nut', allergyRisk: '高', recommendMonth: 8,  tags: ['高敏'],              description: '坚果类高敏，磨碎/稀释后引入' },
  { id: 'food_nut_walnut_paste', name: '核桃',    category: 'nut', allergyRisk: '高', recommendMonth: 8,  tags: ['omega-3'],           description: '富含omega-3，研磨细腻后引入' },
  { id: 'food_nut_sesame_paste', name: '芝麻',    category: 'nut', allergyRisk: '高', recommendMonth: 8,  tags: ['补钙'],              description: '补钙，磨碎后少量引入观察' },
  { id: 'food_nut_tahini',       name: '葵花籽',  category: 'nut', allergyRisk: '中', recommendMonth: 8,  tags: ['维生素E'],           description: '磨碎/稀释后少量引入' },
  { id: 'food_nut_flaxseed',     name: '亚麻籽',  category: 'nut', allergyRisk: '低', recommendMonth: 8,  tags: ['omega-3'],           description: '更适合作为配料，不纳入核心清单', isCore: false },

  // ========== 油脂 (oil_fat) ==========
  { id: 'food_oil_olive_oil',   name: '橄榄油',  category: 'oil_fat', allergyRisk: '低', recommendMonth: 6, tags: ['初榨'],     description: '烹饪配料，不纳入核心辅食清单', isCore: false },
  { id: 'food_oil_coconut_oil', name: '椰子油',  category: 'oil_fat', allergyRisk: '低', recommendMonth: 6, tags: ['饱和脂肪'], description: '烹饪配料，不纳入核心辅食清单', isCore: false },
  { id: 'food_oil_rapeseed_oil',name: '菜籽油',  category: 'oil_fat', allergyRisk: '低', recommendMonth: 6, tags: ['食用油'],   description: '烹饪配料，不纳入核心辅食清单', isCore: false },
  { id: 'food_oil_walnut_oil',  name: '核桃油',  category: 'oil_fat', allergyRisk: '低', recommendMonth: 6, tags: ['omega-3'], description: '烹饪配料，不纳入核心辅食清单', isCore: false },

  // ========== 新增谷物 ==========
  { id: 'food_grain_rice_porridge',       name: '大米',     category: 'grain', allergyRisk: '低', recommendMonth: 6,  tags: ['主食', '易消化'],   description: '可煮成稀粥或米糊，作为基础主食引入' },
  { id: 'food_grain_purple_sweet_potato', name: '紫薯',     category: 'grain', allergyRisk: '低', recommendMonth: 7,  tags: ['花青素', '膳食纤维'], description: '蒸熟压泥，作为单一食材引入' },
  { id: 'food_grain_coix',               name: '薏米',     category: 'grain', allergyRisk: '低', recommendMonth: 10, tags: ['健脾利湿'],          description: '更适合作为扩展主食，不纳入核心清单', isCore: false },
  { id: 'food_grain_steamed_bun',        name: '馒头',     category: 'grain', allergyRisk: '中', recommendMonth: 10, tags: ['含麸质', '锻炼咀嚼'], description: '加工主食，放在家庭餐阶段引入', isCore: false },

  // ========== 新增蔬菜 ==========
  { id: 'food_veg_rapeseed_greens', name: '油菜',   category: 'vegetable', allergyRisk: '低', recommendMonth: 6,  tags: ['钙', '叶酸'],       description: '富含钙和叶酸，焯水切碎' },
  { id: 'food_veg_winter_melon',    name: '冬瓜',   category: 'vegetable', allergyRisk: '低', recommendMonth: 7,  tags: ['水分多', '低热量'], description: '水分多，蒸熟打泥或切丁' },
  { id: 'food_veg_luffa',           name: '丝瓜',   category: 'vegetable', allergyRisk: '低', recommendMonth: 7,  tags: ['水分多', '口感嫩'], description: '口感嫩滑，蒸熟切碎' },
  { id: 'food_veg_amaranth',        name: '苋菜',   category: 'vegetable', allergyRisk: '低', recommendMonth: 7,  tags: ['铁', '钙'],         description: '铁含量丰富，焯水去草酸' },
  { id: 'food_veg_taro',            name: '芋头',   category: 'vegetable', allergyRisk: '低', recommendMonth: 8,  tags: ['淀粉', '健脾'],     description: '蒸熟压泥，注意处理时戴手套' },
  { id: 'food_veg_okra',            name: '秋葵',   category: 'vegetable', allergyRisk: '低', recommendMonth: 8,  tags: ['黏液质', '膳食纤维'], description: '焯水去黏液后切段' },
  { id: 'food_veg_beetroot',        name: '甜菜根', category: 'vegetable', allergyRisk: '低', recommendMonth: 8,  tags: ['叶酸', '铁'],       description: '蒸熟打泥，颜色鲜艳' },
  { id: 'food_veg_shiitake',        name: '香菇',   category: 'vegetable', allergyRisk: '低', recommendMonth: 9,  tags: ['鲜味', '维生素D'],  description: '煮熟切碎，增加鲜味' },
  { id: 'food_veg_water_chestnut',  name: '荸荠',   category: 'vegetable', allergyRisk: '低', recommendMonth: 10, tags: ['清热', '淀粉'],     description: '口感特殊，放在扩展清单更合适', isCore: false },
  { id: 'food_veg_black_fungus',    name: '木耳',   category: 'vegetable', allergyRisk: '低', recommendMonth: 10, tags: ['铁', '膳食纤维'],   description: '纤维较粗，放在扩展清单更合适', isCore: false },
  { id: 'food_veg_white_radish',    name: '白萝卜', category: 'vegetable', allergyRisk: '低', recommendMonth: 7,  tags: ['维生素C', '膳食纤维'], description: '煮软后压泥或切碎，家庭常见' },
  { id: 'food_veg_lettuce',         name: '生菜',   category: 'vegetable', allergyRisk: '低', recommendMonth: 8,  tags: ['叶酸', '水分'],     description: '焯软切碎，适合作为常见叶菜补充' },
  { id: 'food_veg_green_bean',      name: '四季豆', category: 'vegetable', allergyRisk: '低', recommendMonth: 9,  tags: ['膳食纤维'],         description: '必须彻底煮熟后再切碎引入' },

  // ========== 新增水果 ==========
  { id: 'food_fruit_cantaloupe',  name: '哈密瓜', category: 'fruit', allergyRisk: '低', recommendMonth: 8,  tags: ['维生素A', '水分'],   description: '去皮去籽，切小块或打泥' },
  { id: 'food_fruit_jujube',      name: '红枣',   category: 'fruit', allergyRisk: '低', recommendMonth: 8,  tags: ['铁', '维生素C'],     description: '更适合作为扩展水果，不纳入核心清单', isCore: false },
  { id: 'food_fruit_mulberry',    name: '桑葚',   category: 'fruit', allergyRisk: '低', recommendMonth: 9,  tags: ['花青素', '铁'],      description: '季节性较强，放在扩展清单更合适', isCore: false },
  { id: 'food_fruit_loquat',      name: '枇杷',   category: 'fruit', allergyRisk: '低', recommendMonth: 9,  tags: ['维生素A', '镇咳'],   description: '季节性较强，放在扩展清单更合适', isCore: false },
  { id: 'food_fruit_pineapple',   name: '菠萝',   category: 'fruit', allergyRisk: '中', recommendMonth: 10, tags: ['助消化', '维生素C'],  description: '盐水浸泡后食用，含菠萝蛋白酶' },
  { id: 'food_fruit_pomegranate', name: '石榴',   category: 'fruit', allergyRisk: '低', recommendMonth: 10, tags: ['花青素', '抗氧化'],  description: '取汁较麻烦，放在扩展清单更合适', isCore: false },
  { id: 'food_fruit_persimmon',   name: '柿子',   category: 'fruit', allergyRisk: '低', recommendMonth: 10, tags: ['膳食纤维', '维生素C'], description: '成熟度要求较高，放在扩展清单更合适', isCore: false },
  { id: 'food_fruit_lychee',      name: '荔枝',   category: 'fruit', allergyRisk: '低', recommendMonth: 12, tags: ['维生素C'],           description: '含糖高且偏季节性，放在扩展清单更合适', isCore: false },
  { id: 'food_fruit_tangerine',   name: '橘子',   category: 'fruit', allergyRisk: '低', recommendMonth: 8,  tags: ['维生素C'],           description: '去膜取果肉，家庭常见' },
  { id: 'food_fruit_pomelo',      name: '柚子',   category: 'fruit', allergyRisk: '低', recommendMonth: 10, tags: ['维生素C', '水分'],    description: '去膜取果肉，小量引入' },

  // ========== 新增肉类 ==========
  { id: 'food_meat_pig_blood',     name: '猪血',   category: 'meat', allergyRisk: '低', recommendMonth: 7, tags: ['铁', '蛋白质'],    description: '并非常见首轮肉类，放在扩展清单更合适', isCore: false },
  { id: 'food_meat_chicken_liver', name: '鸡肝',   category: 'meat', allergyRisk: '低', recommendMonth: 7, tags: ['铁', '维生素A'],   description: '富含铁和维生素A，每周1~2次' },
  { id: 'food_meat_beef_liver',    name: '牛肝',   category: 'meat', allergyRisk: '低', recommendMonth: 8, tags: ['铁', '维生素B12'], description: '铁和B12含量高，每周1次' },

  // ========== 新增水产 ==========
  { id: 'food_sea_sea_bass',      name: '鲈鱼',   category: 'seafood', allergyRisk: '中', recommendMonth: 7, tags: ['DHA', '刺少'],   description: '刺少，肉嫩，蒸熟去刺' },
  { id: 'food_sea_yellow_croaker',name: '黄鱼',   category: 'seafood', allergyRisk: '中', recommendMonth: 7, tags: ['DHA', '蛋白质'], description: '肉嫩少刺，蒸熟取肉' },
  { id: 'food_sea_grass_carp',    name: '草鱼',   category: 'seafood', allergyRisk: '中', recommendMonth: 7, tags: ['蛋白质'],        description: '常见淡水鱼，仔细去刺' },
  { id: 'food_sea_hairtail',      name: '带鱼',   category: 'seafood', allergyRisk: '中', recommendMonth: 8, tags: ['DHA', '蛋白质'], description: '刺少，肉质细嫩，蒸熟取肉' },

  // ========== 新增豆制品 ==========
  { id: 'food_legume_mung_bean',  name: '绿豆',   category: 'legume', allergyRisk: '低', recommendMonth: 8,  tags: ['植物蛋白'],         description: '更适合作为扩展豆类，不纳入核心清单', isCore: false },
  { id: 'food_legume_black_bean', name: '黑豆',   category: 'legume', allergyRisk: '低', recommendMonth: 9,  tags: ['花青素', '蛋白质'], description: '更适合作为扩展豆类，不纳入核心清单', isCore: false },
  { id: 'food_legume_soy_milk',   name: '豆浆',   category: 'legume', allergyRisk: '高', recommendMonth: 10, tags: ['八大过敏原', '蛋白质'], description: '饮品形态，优先追踪大豆/豆腐，不纳入核心清单', isCore: false },
];

/**
 * 为食物对象附加 emoji 和 monthLabel
 */
function enrichFood(f) {
  const imageUrl = getFoodImageUrl(f.id);
  const localIconPath = getFoodLocalIconPath(f.id);
  const iconUrl = getFoodIconUrl(f.id);
  return {
    ...f,
    imageUrl,
    localIconPath,
    iconUrl,
    emoji: getFoodEmoji(f.id),
    enName: getFoodEnName(f.id),
    monthLabel: getMonthLabel(f.recommendMonth),
  };
}

/**
 * 获取所有食物 — 按 plan-categories 定义的排敏顺序统一排序
 */
function getAllFoods() {
  return getCoreFoods()
    .slice()
    .sort((a, b) => planOrderKey(a.id) - planOrderKey(b.id))
    .map(enrichFood);
}

/**
 * 根据 ID 获取食物
 */
function getFoodById(id) {
  const food = FOODS.find(f => f.id === id);
  if (!food) return null;
  return enrichFood(food);
}

/**
 * 根据分类获取食物
 */
function getFoodsByCategory(category) {
  const sourceFoods = getCoreFoods();
  const foods = (!category || category === 'all')
    ? sourceFoods
    : sourceFoods.filter(f => f.category === category);
  return foods.slice()
    .sort((a, b) => planOrderKey(a.id) - planOrderKey(b.id))
    .map(enrichFood);
}

/**
 * 搜索食物（名称和标签）
 */
function searchFoods(keyword) {
  const sourceFoods = getCoreFoods();
  const foods = !keyword ? sourceFoods : sourceFoods.filter(f =>
    f.name.toLowerCase().includes(keyword.trim().toLowerCase()) ||
    (f.tags && f.tags.some(t => t.toLowerCase().includes(keyword.trim().toLowerCase())))
  );
  return foods.map(enrichFood);
}

/**
 * 获取高过敏风险食物
 */
function getHighAllergyFoods() {
  return getCoreFoods().filter(f => f.allergyRisk === '高').map(enrichFood);
}

/**
 * 获取适合某月龄的食物
 */
function getFoodsForAge(ageMonths) {
  return getCoreFoods().filter(f => f.recommendMonth <= ageMonths).map(enrichFood);
}

// ===== 自定义食物 =====
const CUSTOM_FOOD_PREFIX = 'food_custom_';

/**
 * 获取自定义食物列表
 * 共享宝宝场景下,优先用 baby 文档上的 customFoods 字段(跨成员共享);
 * 退化用本地 storage(向后兼容历史数据)
 */
function getCustomFoods(babyId) {
  try {
    let fromBaby = [];
    try {
      const app = getApp();
      const babies = (app && app.globalData && app.globalData.babies) || [];
      const baby = babies.find(b => (b._id === babyId) || (b.clientId === babyId));
      if (baby && Array.isArray(baby.customFoods)) {
        fromBaby = baby.customFoods;
      }
    } catch (_) {}

    let fromStorage = [];
    const raw = wx.getStorageSync(`customFoods_${babyId}`);
    if (raw) {
      fromStorage = JSON.parse(raw);
    }

    // 合并去重(以 id 为键,baby 文档优先)
    const map = new Map();
    fromStorage.forEach(f => { if (f && f.id) map.set(f.id, f); });
    fromBaby.forEach(f => { if (f && f.id) map.set(f.id, f); });
    return Array.from(map.values()).map(enrichCustomFood);
  } catch (e) {
    return [];
  }
}

/**
 * 保存自定义食物列表
 * 同时写本地 storage 和 baby 文档(随 syncBabies 上云,跨成员可见)
 */
function saveCustomFoods(babyId, foods) {
  const raw = foods.map(f => ({
    id: f.id,
    name: f.name,
    category: f.category,
    allergyRisk: f.allergyRisk,
    recommendMonth: f.recommendMonth,
    isCustom: f.isCustom,
  }));
  wx.setStorageSync(`customFoods_${babyId}`, JSON.stringify(raw));
  // 挂到 baby 文档上,跟随云端同步给其他家庭成员
  try {
    const app = getApp();
    if (app && typeof app.updateBaby === 'function') {
      app.updateBaby(babyId, { customFoods: raw });
    }
  } catch (_) {}
}

/**
 * 为自定义食物附加 emoji / monthLabel
 */
function enrichCustomFood(f) {
  return {
    ...f,
    imageUrl: '',
    localIconPath: '',
    iconUrl: '',
    emoji: '🍽️',
    enName: '',
    monthLabel: '',
  };
}

/**
 * 统一食物展示字段，避免各页面各自拼接导致图标源不一致
 */
function getFoodDisplay(foodOrId, fallback = {}) {
  const food = typeof foodOrId === 'string' ? getFoodById(foodOrId) : foodOrId;
  const foodId = (food && food.id) || fallback.foodId || fallback.id || '';
  // library 有条目则以 library 为准(名称/图标随更新),否则回退到记录里持久化的字段(兼容自定义食物)
  const foodName = (food && food.name) || fallback.foodName || fallback.name || '';

  return {
    id: foodId,
    foodId,
    name: foodName,
    foodName,
    imageUrl: (food && food.imageUrl) || fallback.imageUrl || '',
    localIconPath: (food && food.localIconPath) || fallback.localIconPath || '',
    iconUrl: (food && food.iconUrl) || fallback.iconUrl || '',
    emoji: (food && food.emoji) || fallback.emoji || '🍽️',
  };
}

/**
 * 生成自定义食物 ID
 */
function generateCustomFoodId() {
  return CUSTOM_FOOD_PREFIX + Date.now() + '_' + Math.random().toString(36).slice(2, 6);
}

module.exports = {
  getAllFoods,
  getFoodById,
  getFoodsByCategory,
  searchFoods,
  getHighAllergyFoods,
  getFoodsForAge,
  getCustomFoods,
  saveCustomFoods,
  generateCustomFoodId,
  enrichCustomFood,
  getFoodDisplay,
  FOODS,
};
