// data/plan-categories.js — 排敏计划分类（基于 allergyFoods.json 标准）
// 参照中国营养学会《婴幼儿喂养指南2023》及 AAP/ESPGHAN 排敏添加顺序
// 每种食物单独引入，观察3~5天无过敏则该分类通过

const PLAN_CATEGORIES = [
  // ========== 谷物主食 ==========
  {
    id: 'cat_grain',
    name: '谷物主食',
    icon: '🌾',
    allergyRisk: '低',
    recommendMonth: 6,
    description: '第一口辅食首选，铁强化米粉过敏率极低',
    foodIds: [
      'food_grain_rice_cereal', 'food_grain_rice_porridge', 'food_grain_oat_cereal',
      'food_grain_millet_porridge', 'food_grain_wheat_cereal',
      'food_grain_purple_sweet_potato',
    ],
  },
  // ========== 蔬菜 ==========
  {
    id: 'cat_vegetable',
    name: '蔬菜',
    icon: '🥦',
    allergyRisk: '低',
    recommendMonth: 6,
    description: '先从根茎类开始，叶菜类稍后引入',
    foodIds: [
      'food_veg_carrot', 'food_veg_pumpkin', 'food_veg_sweet_potato', 'food_veg_potato',
      'food_veg_zucchini', 'food_veg_broccoli', 'food_veg_spinach', 'food_veg_pea',
      'food_veg_corn', 'food_veg_tomato', 'food_veg_eggplant', 'food_veg_celery',
      'food_veg_cabbage', 'food_veg_cauliflower', 'food_veg_cucumber', 'food_veg_chinese_cabbage',
      'food_veg_yam', 'food_veg_asparagus', 'food_veg_lotus_root', 'food_veg_mushroom',
      'food_veg_rapeseed_greens', 'food_veg_winter_melon', 'food_veg_luffa',
      'food_veg_amaranth', 'food_veg_taro', 'food_veg_okra', 'food_veg_beetroot',
      'food_veg_shiitake', 'food_veg_white_radish', 'food_veg_lettuce', 'food_veg_green_bean',
    ],
  },
  // ========== 水果 ==========
  {
    id: 'cat_fruit',
    name: '水果',
    icon: '🍎',
    allergyRisk: '低',
    recommendMonth: 6,
    description: '先从低敏水果开始，高过敏风险水果稍后引入',
    foodIds: [
      'food_fruit_apple', 'food_fruit_pear', 'food_fruit_banana', 'food_fruit_avocado',
      'food_fruit_watermelon', 'food_fruit_blueberry', 'food_fruit_mango', 'food_fruit_strawberry',
      'food_fruit_grape', 'food_fruit_peach', 'food_fruit_kiwi', 'food_fruit_orange',
      'food_fruit_cherry', 'food_fruit_plum', 'food_fruit_papaya',
      'food_fruit_cantaloupe', 'food_fruit_pineapple', 'food_fruit_tangerine',
      'food_fruit_pomelo',
    ],
  },
  // ========== 肉类 ==========
  {
    id: 'cat_meat',
    name: '肉类',
    icon: '🍖',
    allergyRisk: '低',
    recommendMonth: 6,
    description: '先引入猪肉和牛肉，再引入禽肉和内脏',
    foodIds: [
      'food_meat_pork_lean', 'food_meat_beef', 'food_meat_chicken',
      'food_meat_lamb', 'food_meat_duck', 'food_meat_pig_liver',
      'food_meat_chicken_liver', 'food_meat_beef_liver',
    ],
  },
  // ========== 鱼虾水产 ==========
  {
    id: 'cat_seafood',
    name: '鱼虾水产',
    icon: '🐟',
    allergyRisk: '中',
    recommendMonth: 7,
    description: '先白肉鱼再虾蟹，贝类高敏建议1岁后',
    foodIds: [
      'food_sea_white_fish', 'food_sea_salmon', 'food_sea_crucian', 'food_sea_tilapia',
      'food_sea_sea_bass', 'food_sea_yellow_croaker', 'food_sea_grass_carp', 'food_sea_hairtail',
      'food_sea_shrimp', 'food_sea_crab', 'food_sea_oyster', 'food_sea_clam',
    ],
  },
  // ========== 蛋类 ==========
  {
    id: 'cat_egg',
    name: '蛋类',
    icon: '🥚',
    allergyRisk: '中',
    recommendMonth: 6,
    description: '先引入蛋黄，蛋白观察3~5天',
    foodIds: [
      'food_egg_egg_yolk', 'food_egg_whole_egg', 'food_egg_quail_egg', 'food_egg_duck_egg',
    ],
  },
  // ========== 豆制品 ==========
  {
    id: 'cat_legume',
    name: '豆制品',
    icon: '🫘',
    allergyRisk: '中',
    recommendMonth: 8,
    description: '先豆腐再大豆，大豆为八大过敏原之一需谨慎',
    foodIds: [
      'food_legume_tofu', 'food_legume_soybean', 'food_legume_edamame',
      'food_legume_lentil', 'food_legume_chickpea',
    ],
  },
  // ========== 乳制品 ==========
  {
    id: 'cat_dairy',
    name: '乳制品',
    icon: '🥛',
    allergyRisk: '高',
    recommendMonth: 6,
    description: '先酸奶奶酪，纯牛奶1岁后引入',
    foodIds: [
      'food_dairy_yogurt', 'food_dairy_cheese', 'food_dairy_cows_milk',
    ],
  },
  // ========== 坚果种子 ==========
  {
    id: 'cat_nut',
    name: '坚果种子',
    icon: '🥜',
    allergyRisk: '高',
    recommendMonth: 6,
    description: '花生酱早期引入反而降低过敏风险（LEAP研究），需稀释后观察',
    foodIds: [
      'food_nut_peanut_paste', 'food_nut_almond_paste', 'food_nut_walnut_paste',
      'food_nut_sesame_paste', 'food_nut_tahini',
    ],
  },
];

/**
 * 获取所有排敏分类
 */
function getAllCategories() {
  return PLAN_CATEGORIES;
}

/**
 * 根据 ID 获取分类
 */
function getCategoryById(id) {
  return PLAN_CATEGORIES.find(c => c.id === id) || null;
}

/**
 * 根据食物 ID 找到所属分类
 */
function getCategoryByFoodId(foodId) {
  return PLAN_CATEGORIES.find(c => c.foodIds.includes(foodId)) || null;
}

/**
 * 获取所有食物 ID 总数
 */
function getTotalFoodCount() {
  return PLAN_CATEGORIES.reduce((sum, c) => sum + c.foodIds.length, 0);
}

module.exports = {
  getAllCategories,
  getCategoryById,
  getCategoryByFoodId,
  getTotalFoodCount,
  PLAN_CATEGORIES,
};
