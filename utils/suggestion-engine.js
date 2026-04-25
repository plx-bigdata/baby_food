// utils/suggestion-engine.js — 今日食谱建议引擎
// 基于已安全/排敏中的食物，按营养结构输出今日搭配建议 + 下一步新食物推荐

const planCategories = require('../data/plan-categories');
const foodLibrary = require('../data/food-library');

// 营养分组：每天搭配推荐
const NUTRITION_GROUPS = [
  { key: 'starch',    label: '主食',   catIds: ['cat_grain'],                         quota: 1 },
  { key: 'vegetable', label: '蔬菜',   catIds: ['cat_vegetable'],                     quota: 1 },
  { key: 'fruit',     label: '水果',   catIds: ['cat_fruit'],                         quota: 1 },
  { key: 'protein',   label: '蛋白质', catIds: ['cat_meat', 'cat_seafood', 'cat_egg'], quota: 1 },
];

// 过敏风险排序权重
const RISK_ORDER = { '低': 0, '中': 1, '高': 2 };

/**
 * 生成今日食谱建议
 *
 * @param {Object} foodStates       foodId → { status, dayIndex, totalDays }（来自 planEngine）
 * @param {number} babyAgeMonths    宝宝月龄
 * @returns {Array} 分组建议列表
 *   [{ groupKey, groupLabel, foods: [...] }]
 */
function getTodaySuggestions(foodStates, babyAgeMonths) {
  babyAgeMonths = babyAgeMonths || 6;
  const result = [];

  // ── Section 1：今日排敏任务 ──────────────────────────────────
  let testingFood = null;
  for (const [fid, state] of Object.entries(foodStates)) {
    if (state.status === 'testing') {
      const food = foodLibrary.getFoodById(fid);
      if (food) {
        const display = foodLibrary.getFoodDisplay(food);
        testingFood = {
          ...display,
          description: food.description || '',
          status: 'testing',
          dayIndex: state.dayIndex || 0,
          totalDays: state.totalDays || 3,
        };
        break; // 严格模式只有一种同时排敏
      }
    }
  }

  if (testingFood) {
    result.push({
      groupKey: 'testing',
      groupLabel: '排敏任务',
      foods: [testingFood],
    });
  }

  // ── Section 2：今日搭配（已安全食物，按日期轮换） ──────────────
  // 若今日排敏任务的食物已覆盖某营养组（如排敏米粉占了主食位），则跳过该组，避免重复
  const todayDay = new Date().getDate(); // 1~31，每天不同
  const comboFoods = [];
  const coveredGroupKeys = new Set();
  if (testingFood && testingFood.foodId) {
    const testingCat = planCategories.getCategoryByFoodId(testingFood.foodId);
    if (testingCat) {
      NUTRITION_GROUPS.forEach(group => {
        if (group.catIds.includes(testingCat.id)) coveredGroupKeys.add(group.key);
      });
    }
  }

  NUTRITION_GROUPS.forEach(group => {
    if (coveredGroupKeys.has(group.key)) return;
    const candidates = [];
    group.catIds.forEach(catId => {
      const cat = planCategories.getCategoryById(catId);
      if (!cat) return;
      cat.foodIds.forEach(fid => {
        const state = foodStates[fid];
        if (!state || state.status !== 'passed') return;
        const food = foodLibrary.getFoodById(fid);
        if (!food) return;
        const display = foodLibrary.getFoodDisplay(food);
        candidates.push({
          ...display,
          description: food.description || '',
          status: 'passed',
        });
      });
    });
    if (candidates.length === 0) return;
    // 按日期轮换，而不是每天都一样
    const idx = todayDay % candidates.length;
    comboFoods.push(candidates[idx]);
  });

  if (comboFoods.length > 0) {
    result.push({
      groupKey: 'safe_combo',
      groupLabel: '搭配建议',
      foods: comboFoods,
    });
  }

  // ── Section 3：下一步可以尝试的新食物（有排敏任务时不显示）──────────────────────────
  if (testingFood) return result;

  const allFoods = foodLibrary.getAllFoods();
  const nextFoods = [];

  allFoods.forEach(food => {
    const state = foodStates[food.id];
    // 已尝试过的（passed/testing/allergy）跳过
    if (state && (state.status === 'passed' || state.status === 'testing' || state.status === 'allergy')) return;
    // 月龄未到跳过
    if (food.recommendMonth > babyAgeMonths) return;

    nextFoods.push({
      ...foodLibrary.getFoodDisplay(food),
      description: food.description || '',
      allergyRisk: food.allergyRisk,
      recommendMonth: food.recommendMonth,
      status: 'pending',
    });
  });

  // 低过敏风险优先，再按月龄从小到大（最该尝试的排前面）
  nextFoods.sort((a, b) => {
    const riskDiff = (RISK_ORDER[a.allergyRisk] || 0) - (RISK_ORDER[b.allergyRisk] || 0);
    if (riskDiff !== 0) return riskDiff;
    return a.recommendMonth - b.recommendMonth;
  });

  if (nextFoods.length > 0) {
    result.push({
      groupKey: 'next_try',
      groupLabel: '可以尝试的新食物',
      foods: nextFoods.slice(0, 3),
    });
  }

  return result;
}

module.exports = {
  getTodaySuggestions,
};
