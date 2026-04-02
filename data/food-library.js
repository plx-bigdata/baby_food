// data/food-library.js — 食物图库（基于 allergyFoods.json 标准）
// 参照中国营养学会《婴幼儿喂养指南2022》及 AAP/ESPGHAN 排敏添加顺序
// 图片路径：/static/food-images/{category}/{name}.jpg（真实食物图片）

const FOODS = [
  // ========== 谷物主食 (grain) ==========
  { id: 'food_grain_rice_cereal',    name: '米粉',       category: 'grain',    imageUrl: '/static/food-images/grains/rice.jpg', allergyRisk: '低',   recommendMonth: 4,  tags: ['主食', '铁强化'],    description: '第一口辅食首选，铁强化米粉' },
  { id: 'food_grain_oat_cereal',     name: '燕麦糊',     category: 'grain',    imageUrl: '/static/food-images/grains/oats.jpg', allergyRisk: '低',   recommendMonth: 6,  tags: ['主食', 'β-葡聚糖'],  description: '含β-葡聚糖，营养丰富' },
  { id: 'food_grain_millet_porridge',name: '小米粥',     category: 'grain',    imageUrl: '/static/food-images/grains/millet.jpg', allergyRisk: '低',   recommendMonth: 6,  tags: ['主食', 'B族维生素'], description: '温和，易消化' },
  { id: 'food_grain_wheat_cereal',   name: '小麦糊',     category: 'grain',    imageUrl: '/static/food-images/grains/wheat.jpg', allergyRisk: '中',   recommendMonth: 7,  tags: ['含麸质'],          description: '含麸质，观察过敏反应' },
  { id: 'food_grain_soft_rice',      name: '稠粥/软饭',  category: 'grain',    imageUrl: '/static/food-images/grains/rice.jpg', allergyRisk: '低',   recommendMonth: 8,  tags: ['主食', '锻炼咀嚼'], description: '逐渐加稠，锻炼咀嚼' },
  { id: 'food_grain_noodles',        name: '细面条',     category: 'grain',    imageUrl: '/static/food-images/grains/wheat.jpg', allergyRisk: '中',   recommendMonth: 8,  tags: ['含麸质'],          description: '含麸质，煮软后食用' },
  { id: 'food_grain_bread',          name: '面包',       category: 'grain',    imageUrl: '/static/food-images/grains/wheat.jpg', allergyRisk: '中',   recommendMonth: 10, tags: ['主食'],            description: '选低糖低盐，软化后食用' },
  { id: 'food_grain_corn_porridge',  name: '玉米糊',     category: 'grain',    imageUrl: '/static/food-images/grains/corn.jpg', allergyRisk: '低',   recommendMonth: 7,  tags: ['主食', '膳食纤维'], description: '过滤玉米皮' },

  // ========== 蔬菜 (vegetable) ==========
  { id: 'food_veg_carrot',       name: '胡萝卜',   category: 'vegetable', imageUrl: '/static/food-images/vegetables/carrot.jpg', allergyRisk: '低', recommendMonth: 4, tags: ['β-胡萝卜素', '维生素A'], description: '富含β-胡萝卜素，蒸熟打泥' },
  { id: 'food_veg_pumpkin',      name: '南瓜',     category: 'vegetable', imageUrl: '/static/food-images/vegetables/pumpkin.jpg', allergyRisk: '低', recommendMonth: 4, tags: ['β-胡萝卜素'],      description: '甜味，宝宝易接受' },
  { id: 'food_veg_sweet_potato', name: '红薯',     category: 'vegetable', imageUrl: '/static/food-images/vegetables/sweet_potato.jpg', allergyRisk: '低', recommendMonth: 4, tags: ['膳食纤维'],        description: '富含膳食纤维，预防便秘' },
  { id: 'food_veg_potato',       name: '土豆',     category: 'vegetable', imageUrl: '/static/food-images/vegetables/potato.jpg', allergyRisk: '低', recommendMonth: 5, tags: ['淀粉', '维生素C'],   description: '蒸熟压泥，不加盐' },
  { id: 'food_veg_zucchini',      name: '西葫芦',   category: 'vegetable', imageUrl: '/static/food-images/vegetables/cucumber.jpg', allergyRisk: '低', recommendMonth: 5, tags: ['水分多', '口感软'], description: '水分多，口感软' },
  { id: 'food_veg_broccoli',     name: '西兰花',   category: 'vegetable', imageUrl: '/static/food-images/vegetables/cucumber.jpg', allergyRisk: '低', recommendMonth: 6, tags: ['维生素C'],          description: '富含维生素C，焯水后打泥' },
  { id: 'food_veg_spinach',      name: '菠菜',     category: 'vegetable', imageUrl: '/static/food-images/vegetables/spinach.jpg', allergyRisk: '低', recommendMonth: 6, tags: ['铁', '叶酸'],        description: '草酸较高，焯水去除' },
  { id: 'food_veg_pea',          name: '豌豆',     category: 'vegetable', imageUrl: '/static/food-images/vegetables/spinach.jpg', allergyRisk: '低', recommendMonth: 6, tags: ['蛋白质'],            description: '过滤豆皮，研磨成泥' },
  { id: 'food_veg_corn',         name: '玉米',     category: 'vegetable', imageUrl: '/static/food-images/grains/corn.jpg', allergyRisk: '低', recommendMonth: 7, tags: ['膳食纤维'],          description: '过滤玉米皮后使用' },
  { id: 'food_veg_tomato',       name: '西红柿',   category: 'vegetable', imageUrl: '/static/food-images/vegetables/tomato.jpg', allergyRisk: '低', recommendMonth: 7, tags: ['维生素C', '番茄红素'], description: '去皮去籽，少量引入' },
  { id: 'food_veg_eggplant',     name: '茄子',     category: 'vegetable', imageUrl: '/static/food-images/vegetables/eggplant.jpg', allergyRisk: '低', recommendMonth: 7, tags: ['膳食纤维'],          description: '蒸熟压泥' },
  { id: 'food_veg_celery',       name: '芹菜',     category: 'vegetable', imageUrl: '/static/food-images/vegetables/celery.jpg', allergyRisk: '低', recommendMonth: 8, tags: ['膳食纤维'],          description: '焯水切末，纤维较粗' },
  { id: 'food_veg_cabbage',      name: '卷心菜',   category: 'vegetable', imageUrl: '/static/food-images/vegetables/chinese_cabbage.jpg', allergyRisk: '低', recommendMonth: 7, tags: ['维生素C'],            description: '煮软后食用' },
  { id: 'food_veg_cauliflower',  name: '花椰菜',   category: 'vegetable', imageUrl: '/static/food-images/vegetables/cucumber.jpg', allergyRisk: '低', recommendMonth: 6, tags: ['维生素C'],            description: '与西兰花同类，温和' },
  { id: 'food_veg_cucumber',     name: '黄瓜',     category: 'vegetable', imageUrl: '/static/food-images/vegetables/cucumber.jpg', allergyRisk: '低', recommendMonth: 8, tags: ['水分'],               description: '去皮去籽，蒸软或生食条状' },
  { id: 'food_veg_chinese_cabbage',name: '白菜',   category: 'vegetable', imageUrl: '/static/food-images/vegetables/chinese_cabbage.jpg', allergyRisk: '低', recommendMonth: 6, tags: ['维生素'],            description: '叶片柔软，易消化' },
  { id: 'food_veg_yam',          name: '山药',     category: 'vegetable', imageUrl: '/static/food-images/vegetables/yam.jpg', allergyRisk: '低', recommendMonth: 6, tags: ['淀粉', '健脾'],      description: '蒸熟压泥，润肺健脾' },
  { id: 'food_veg_asparagus',    name: '芦笋',     category: 'vegetable', imageUrl: '/static/food-images/vegetables/spinach.jpg', allergyRisk: '低', recommendMonth: 8, tags: ['维生素'],            description: '取嫩尖部分，焯水后使用' },
  { id: 'food_veg_lotus_root',   name: '莲藕',     category: 'vegetable', imageUrl: '/static/food-images/vegetables/lotus_root.jpg', allergyRisk: '低', recommendMonth: 9, tags: ['淀粉', '维生素C'],   description: '煮熟压泥或切丁' },
  { id: 'food_veg_mushroom',     name: '蘑菇',     category: 'vegetable', imageUrl: '/static/food-images/vegetables/yam.jpg', allergyRisk: '低', recommendMonth: 9, tags: ['鲜味', '维生素D'],   description: '煮熟切碎，增加鲜味' },

  // ========== 水果 (fruit) ==========
  { id: 'food_fruit_apple',       name: '苹果',     category: 'fruit',  imageUrl: '/static/food-images/fruits/apple.jpg', allergyRisk: '低',   recommendMonth: 4, tags: ['膳食纤维', '维生素C'], description: '蒸熟打泥，或研磨生泥' },
  { id: 'food_fruit_pear',        name: '梨',       category: 'fruit',  imageUrl: '/static/food-images/fruits/pear.jpg', allergyRisk: '低',   recommendMonth: 4, tags: ['润肺', '膳食纤维'],    description: '润肺，蒸熟后更易消化' },
  { id: 'food_fruit_banana',      name: '香蕉',     category: 'fruit',  imageUrl: '/static/food-images/fruits/banana.jpg', allergyRisk: '低',   recommendMonth: 5, tags: ['钾'],                 description: '直接捣泥，富含钾' },
  { id: 'food_fruit_avocado',     name: '牛油果',   category: 'fruit',  imageUrl: '/static/food-images/fruits/apple.jpg', allergyRisk: '低',   recommendMonth: 5, tags: ['健康脂肪'],          description: '富含健康脂肪，直接捣泥' },
  { id: 'food_fruit_watermelon',  name: '西瓜',     category: 'fruit',  imageUrl: '/static/food-images/fruits/watermelon.jpg', allergyRisk: '低',   recommendMonth: 6, tags: ['水分'],              description: '去籽去皮，少量引入' },
  { id: 'food_fruit_blueberry',   name: '蓝莓',     category: 'fruit',  imageUrl: '/static/food-images/fruits/strawberry.jpg', allergyRisk: '低',   recommendMonth: 6, tags: ['花青素'],            description: '压泥或切半，富含花青素' },
  { id: 'food_fruit_mango',       name: '芒果',     category: 'fruit',  imageUrl: '/static/food-images/fruits/mango.jpg', allergyRisk: '中',   recommendMonth: 8, tags: ['维生素A'],            description: '少数宝宝过敏，少量观察' },
  { id: 'food_fruit_strawberry',  name: '草莓',     category: 'fruit',  imageUrl: '/static/food-images/fruits/strawberry.jpg', allergyRisk: '中',   recommendMonth: 8, tags: ['维生素C'],            description: '有过敏风险，捣泥后引入' },
  { id: 'food_fruit_grape',       name: '葡萄',     category: 'fruit',  imageUrl: '/static/food-images/fruits/grape.jpg', allergyRisk: '低',   recommendMonth: 8, tags: ['抗氧化', '铁'],       description: '去皮去籽，压泥或切小块' },
  { id: 'food_fruit_peach',       name: '桃',       category: 'fruit',  imageUrl: '/static/food-images/fruits/peach.jpg', allergyRisk: '低',   recommendMonth: 7, tags: ['维生素C'],            description: '去皮去核，蒸熟后食用' },
  { id: 'food_fruit_kiwi',        name: '猕猴桃',   category: 'fruit',  imageUrl: '/static/food-images/fruits/kiwi.jpg', allergyRisk: '中',   recommendMonth: 8, tags: ['维生素C', '叶酸'],    description: '酸性较强，少量引入' },
  { id: 'food_fruit_orange',      name: '橙子',     category: 'fruit',  imageUrl: '/static/food-images/fruits/orange.jpg', allergyRisk: '低',   recommendMonth: 8, tags: ['维生素C'],            description: '榨汁稀释或取果肉' },
  { id: 'food_fruit_cherry',      name: '樱桃',     category: 'fruit',  imageUrl: '/static/food-images/fruits/cherry.jpg', allergyRisk: '低',   recommendMonth: 8, tags: ['铁', '维生素C'],      description: '去核压泥' },
  { id: 'food_fruit_plum',        name: '李子',     category: 'fruit',  imageUrl: '/static/food-images/fruits/plum.jpg', allergyRisk: '低',   recommendMonth: 9, tags: ['膳食纤维'],          description: '去皮去核' },
  { id: 'food_fruit_papaya',      name: '木瓜',     category: 'fruit',  imageUrl: '/static/food-images/fruits/mango.jpg', allergyRisk: '低',   recommendMonth: 7, tags: ['助消化'],            description: '助消化，压泥食用' },

  // ========== 肉类蛋白 (protein_meat) ==========
  { id: 'food_meat_pork_lean', name: '猪里脊',  category: 'protein_meat', imageUrl: '/static/food-images/meat-egg/pork.jpg', allergyRisk: '低',   recommendMonth: 6, tags: ['蛋白质', '铁'],      description: '最先引入的肉类，蒸熟打泥' },
  { id: 'food_meat_beef',      name: '牛肉',    category: 'protein_meat', imageUrl: '/static/food-images/meat-egg/beef.jpg', allergyRisk: '低',   recommendMonth: 6, tags: ['铁', '蛋白质'],       description: '补铁首选，蒸熟打泥' },
  { id: 'food_meat_chicken',    name: '鸡肉',    category: 'protein_meat', imageUrl: '/static/food-images/meat-egg/chicken.jpg', allergyRisk: '低',   recommendMonth: 7, tags: ['蛋白质'],            description: '去皮去骨，蒸熟切碎' },
  { id: 'food_meat_lamb',       name: '羊肉',    category: 'protein_meat', imageUrl: '/static/food-images/meat-egg/lamb.jpg', allergyRisk: '低',   recommendMonth: 8, tags: ['蛋白质'],            description: '膻味较重，与蔬菜搭配' },
  { id: 'food_meat_duck',       name: '鸭肉',    category: 'protein_meat', imageUrl: '/static/food-images/meat-egg/duck.jpg', allergyRisk: '低',   recommendMonth: 9, tags: ['脂肪'],              description: '去皮，脂肪较高' },
  { id: 'food_meat_pig_liver',  name: '猪肝',    category: 'protein_meat', imageUrl: '/static/food-images/meat-egg/pork.jpg', allergyRisk: '低',   recommendMonth: 7, tags: ['铁', '维生素A'],     description: '富含铁和维生素A，每周1~2次' },

  // ========== 水产蛋白 (protein_seafood) ==========
  { id: 'food_sea_white_fish', name: '白肉鱼（鳕鱼）', category: 'protein_seafood', imageUrl: '/static/food-images/seafood/cod.jpg', allergyRisk: '中', recommendMonth: 7,  tags: ['DHA', '蛋白质'], description: '过敏风险中等，仔细去刺' },
  { id: 'food_sea_salmon',     name: '三文鱼',   category: 'protein_seafood', imageUrl: '/static/food-images/seafood/salmon.jpg', allergyRisk: '中', recommendMonth: 8,  tags: ['DHA'],             description: '富含DHA，蒸熟去刺' },
  { id: 'food_sea_crucian',    name: '鲫鱼',     category: 'protein_seafood', imageUrl: '/static/food-images/seafood/crucian_carp.jpg', allergyRisk: '中', recommendMonth: 7,  tags: ['蛋白质'],           description: '刺多需过滤，取鱼肉泥' },
  { id: 'food_sea_tilapia',    name: '罗非鱼',   category: 'protein_seafood', imageUrl: '/static/food-images/seafood/cod.jpg', allergyRisk: '中', recommendMonth: 7,  tags: ['刺少'],             description: '刺少，适合辅食' },
  { id: 'food_sea_shrimp',     name: '虾',       category: 'protein_seafood', imageUrl: '/static/food-images/seafood/shrimp.jpg', allergyRisk: '高', recommendMonth: 9,  tags: ['高敏'],             description: '甲壳类高敏食物，少量谨慎引入' },
  { id: 'food_sea_crab',       name: '螃蟹',     category: 'protein_seafood', imageUrl: '/static/food-images/seafood/crab.jpg', allergyRisk: '高', recommendMonth: 12, tags: ['高敏'],             description: '高敏，建议1岁后引入' },
  { id: 'food_sea_oyster',     name: '牡蛎',     category: 'protein_seafood', imageUrl: '/static/food-images/seafood/oyster.jpg', allergyRisk: '高', recommendMonth: 12, tags: ['高敏', '锌'],       description: '高敏，富含锌，1岁后' },
  { id: 'food_sea_clam',       name: '蛤蜊',     category: 'protein_seafood', imageUrl: '/static/food-images/seafood/clam.jpg', allergyRisk: '高', recommendMonth: 12, tags: ['高敏'],             description: '贝类高敏，谨慎引入' },

  // ========== 蛋类 (protein_egg) ==========
  { id: 'food_egg_egg_yolk',   name: '鸡蛋黄',  category: 'protein_egg', imageUrl: '/static/food-images/meat-egg/chicken.jpg', allergyRisk: '低',   recommendMonth: 6, tags: ['DHA', '铁'],         description: '先引入蛋黄，富含铁和DHA' },
  { id: 'food_egg_whole_egg',  name: '全蛋',    category: 'protein_egg', imageUrl: '/static/food-images/meat-egg/chicken.jpg', allergyRisk: '中',   recommendMonth: 8, tags: ['蛋白质'],           description: '蛋白有过敏风险，观察3~5天' },
  { id: 'food_egg_quail_egg',  name: '鹌鹑蛋',  category: 'protein_egg', imageUrl: '/static/food-images/meat-egg/chicken.jpg', allergyRisk: '中',   recommendMonth: 8, tags: ['营养类似鸡蛋'],     description: '营养类似鸡蛋，同样观察' },
  { id: 'food_egg_duck_egg',   name: '鸭蛋黄',  category: 'protein_egg', imageUrl: '/static/food-images/meat-egg/duck.jpg', allergyRisk: '中',   recommendMonth: 8, tags: ['蛋白质'],           description: '可替代鸡蛋，注意腥味' },

  // ========== 豆类 (protein_legume) ==========
  { id: 'food_legume_tofu',     name: '豆腐',      category: 'protein_legume', imageUrl: '/static/food-images/beans/chickpeas.jpg', allergyRisk: '中', recommendMonth: 8,  tags: ['优质蛋白'],       description: '优质蛋白，嫩豆腐直接压泥' },
  { id: 'food_legume_soybean',  name: '大豆',      category: 'protein_legume', imageUrl: '/static/food-images/beans/soybeans.jpg', allergyRisk: '高', recommendMonth: 10, tags: ['八大过敏原之一'], description: '八大过敏原之一，谨慎引入' },
  { id: 'food_legume_edamame',  name: '毛豆',      category: 'protein_legume', imageUrl: '/static/food-images/beans/soybeans.jpg', allergyRisk: '中', recommendMonth: 9,  tags: ['蛋白质'],          description: '去皮压泥' },
  { id: 'food_legume_lentil',   name: '扁豆/红豆', category: 'protein_legume', imageUrl: '/static/food-images/beans/red_beans.jpg', allergyRisk: '低', recommendMonth: 8,  tags: ['植物蛋白'],       description: '煮软压泥，植物蛋白' },
  { id: 'food_legume_chickpea', name: '鹰嘴豆',    category: 'protein_legume', imageUrl: '/static/food-images/beans/chickpeas.jpg', allergyRisk: '低', recommendMonth: 9,  tags: ['营养丰富'],       description: '煮软打泥，营养丰富' },

  // ========== 乳制品 (dairy) ==========
  { id: 'food_dairy_formula',   name: '配方奶',  category: 'dairy', imageUrl: '/static/food-images/beans/soybeans.jpg', allergyRisk: '低', recommendMonth: 0,  tags: ['主食'],              description: '主食，非排敏引入项' },
  { id: 'food_dairy_yogurt',    name: '原味酸奶', category: 'dairy', imageUrl: '/static/food-images/beans/soybeans.jpg', allergyRisk: '中', recommendMonth: 8,  tags: ['乳糖分解更好'],   description: '乳糖分解更好，选无糖全脂' },
  { id: 'food_dairy_cheese',    name: '奶酪',    category: 'dairy', imageUrl: '/static/food-images/beans/soybeans.jpg', allergyRisk: '中', recommendMonth: 9,  tags: ['高钙'],              description: '高钙，选低钠儿童奶酪' },
  { id: 'food_dairy_cows_milk', name: '纯牛奶',  category: 'dairy', imageUrl: '/static/food-images/beans/soybeans.jpg', allergyRisk: '高', recommendMonth: 12, tags: ['八大过敏原'],      description: '1岁后作为饮品，八大过敏原' },
  { id: 'food_dairy_butter',    name: '黄油',    category: 'dairy', imageUrl: '/static/food-images/beans/soybeans.jpg', allergyRisk: '中', recommendMonth: 8,  tags: ['热量'],              description: '少量用于烹饪，增加热量' },

  // ========== 坚果种子 (nut_seed) ==========
  { id: 'food_nut_peanut_paste', name: '花生酱',  category: 'nut_seed', imageUrl: '/static/food-images/beans/soybeans.jpg', allergyRisk: '高', recommendMonth: 6,  tags: ['八大过敏原', 'LEAP研究'], description: '早期引入反而降低过敏风险（LEAP研究），稀释后引入' },
  { id: 'food_nut_almond_paste', name: '杏仁泥',  category: 'nut_seed', imageUrl: '/static/food-images/beans/soybeans.jpg', allergyRisk: '高', recommendMonth: 8,  tags: ['高敏'],              description: '坚果类高敏，稀释后引入' },
  { id: 'food_nut_walnut_paste', name: '核桃泥',  category: 'nut_seed', imageUrl: '/static/food-images/beans/soybeans.jpg', allergyRisk: '高', recommendMonth: 8,  tags: ['omega-3'],           description: '富含omega-3，研磨细腻' },
  { id: 'food_nut_sesame_paste', name: '芝麻酱',  category: 'nut_seed', imageUrl: '/static/food-images/beans/soybeans.jpg', allergyRisk: '高', recommendMonth: 8,  tags: ['补钙'],              description: '补钙，少量引入观察' },
  { id: 'food_nut_tahini',       name: '葵花籽泥', category: 'nut_seed', imageUrl: '/static/food-images/beans/soybeans.jpg', allergyRisk: '中', recommendMonth: 8,  tags: ['维生素E'],           description: '富含维生素E' },
  { id: 'food_nut_flaxseed',     name: '亚麻籽粉', category: 'nut_seed', imageUrl: '/static/food-images/beans/soybeans.jpg', allergyRisk: '低', recommendMonth: 8,  tags: ['omega-3'],           description: '富含omega-3，研磨后使用' },

  // ========== 油脂 (oil_fat) ==========
  { id: 'food_oil_olive_oil',   name: '橄榄油',  category: 'oil_fat', imageUrl: '/static/food-images/grains/corn.jpg', allergyRisk: '低', recommendMonth: 6, tags: ['初榨'],     description: '初榨橄榄油，每餐少量' },
  { id: 'food_oil_coconut_oil', name: '椰子油',  category: 'oil_fat', imageUrl: '/static/food-images/grains/corn.jpg', allergyRisk: '低', recommendMonth: 6, tags: ['饱和脂肪'], description: '饱和脂肪，少量使用' },
  { id: 'food_oil_rapeseed_oil',name: '菜籽油',  category: 'oil_fat', imageUrl: '/static/food-images/grains/corn.jpg', allergyRisk: '低', recommendMonth: 6, tags: ['食用油'],   description: '常见食用油' },
  { id: 'food_oil_walnut_oil',  name: '核桃油',  category: 'oil_fat', imageUrl: '/static/food-images/grains/corn.jpg', allergyRisk: '低', recommendMonth: 6, tags: ['omega-3'], description: '富含omega-3' },
];

/**
 * 获取所有食物
 */
function getAllFoods() {
  return FOODS;
}

/**
 * 根据 ID 获取食物
 */
function getFoodById(id) {
  return FOODS.find(f => f.id === id) || null;
}

/**
 * 根据分类获取食物
 */
function getFoodsByCategory(category) {
  if (!category || category === 'all') return FOODS;
  return FOODS.filter(f => f.category === category);
}

/**
 * 搜索食物（名称和标签）
 */
function searchFoods(keyword) {
  if (!keyword) return FOODS;
  const kw = keyword.trim().toLowerCase();
  return FOODS.filter(f =>
    f.name.toLowerCase().includes(kw) ||
    (f.tags && f.tags.some(t => t.toLowerCase().includes(kw)))
  );
}

/**
 * 获取高过敏风险食物
 */
function getHighAllergyFoods() {
  return FOODS.filter(f => f.allergyRisk === '高');
}

/**
 * 获取适合某月龄的食物
 */
function getFoodsForAge(ageMonths) {
  return FOODS.filter(f => f.recommendMonth <= ageMonths);
}

module.exports = {
  getAllFoods,
  getFoodById,
  getFoodsByCategory,
  searchFoods,
  getHighAllergyFoods,
  getFoodsForAge,
  FOODS,
};
