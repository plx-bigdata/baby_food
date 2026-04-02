// utils/suggestion-engine.js — 今日建议引擎
// 根据排敏进度和今日记录，生成今日建议

const planCategories = require('../data/plan-categories');
const foodLibrary = require('../data/food-library');
const planEngine = require('./plan-engine');
const dateUtil = require('./date');

/**
 * 获取今日建议食物列表
 *
 * 建议规则：
 * 1. 找"进行中"的分类 → 继续吃该分类下的任意食物（显示第几天）
 * 2. 找待开始的分类（按优先级）→ 建议开始新分类
 * 3. 避开：已通过分类、过敏分类、今日已记录的食物
 * 4. 优先推荐：低过敏风险、月龄适合、未排过的分类
 *
 * @param {Array} todayRecords 今日已记录的食物列表
 * @param {Object} categoryStateMap 分类状态映射（从 planEngine.computeAllCategoryStates 计算）
 * @param {number} babyAgeMonths 宝宝月龄（数值）
 * @param {Object} settings { testDays, dailyNewFoodLimit }
 * @returns {Array} 建议食物列表 [{ name, categoryName, imageUrl, reason, foodId }]
 */
function getTodaySuggestions(todayRecords, categoryStateMap, babyAgeMonths, settings) {
  const suggestions = [];
  const todayDate = dateUtil.getTodayDateStr();
  const testDays = settings?.testDays || 3;
  const dailyLimit = settings?.dailyNewFoodLimit || 1;

  // 今日已记录的食物 ID 集合
  const todayFoodIds = new Set((todayRecords || []).map(r => r.foodId));

  // 今日已记录涉及的分类 ID
  const todayCatIds = new Set();
  (todayRecords || []).forEach(r => {
    const cat = planCategories.getCategoryByFoodId(r.foodId);
    if (cat) todayCatIds.add(cat.id);
  });

  const allCategories = planCategories.getAllCategories();

  // ===== 规则1：进行中的分类 → 继续吃 =====
  const testingCats = allCategories.filter(cat => {
    const state = categoryStateMap[cat.id] || {};
    return state.status === 'testing';
  });

  testingCats.forEach(cat => {
    const state = categoryStateMap[cat.id] || {};
    // 该分类下今日还没记录的食物
    const availableFoods = cat.foodIds
      .map(fid => foodLibrary.getFoodById(fid))
      .filter(f => f && !todayFoodIds.has(f.id));

    if (availableFoods.length > 0) {
      const food = availableFoods[0];
      suggestions.push({
        foodId: food.id,
        name: food.name,
        categoryName: cat.name,
        imageUrl: food.imageUrl,
        reason: `继续排敏 · 第${state.dayIndex || 1}天/共${testDays}天`,
        isTesting: true,
        catId: cat.id,
      });
    }
  });

  // ===== 规则2：待开始的分类 → 建议开始新分类（按优先级） =====
  const pendingCats = planEngine.suggestNextCategories(categoryStateMap, babyAgeMonths);

  // 过滤掉今日已记录的分类
  const newCats = pendingCats.filter(cat => !todayCatIds.has(cat.id));

  const currentSuggestionCount = suggestions.length;
  const remainingSlots = dailyLimit - currentSuggestionCount;

  if (remainingSlots > 0) {
    newCats.slice(0, remainingSlots).forEach(cat => {
      // 取该分类的第一种食物作为代表
      const food = foodLibrary.getFoodById(cat.foodIds[0]);
      if (!food) return;

      const riskLabel = cat.allergyRisk === '高' ? '高过敏' : cat.allergyRisk === '中' ? '中过敏' : '低过敏';
      suggestions.push({
        foodId: food.id,
        name: food.name,
        categoryName: cat.name,
        imageUrl: food.imageUrl,
        reason: `${riskLabel} · 建议开始新分类`,
        isTesting: false,
        catId: cat.id,
      });
    });
  }

  // ===== 兜底：如果以上都没有，建议已通过分类中营养价值高的食物（不重复）=====
  if (suggestions.length === 0) {
    const passedCats = allCategories.filter(cat => {
      const state = categoryStateMap[cat.id] || {};
      return state.status === 'passed';
    });

    for (const cat of passedCats) {
      if (suggestions.length >= 2) break;
      const availableFoods = cat.foodIds
        .map(fid => foodLibrary.getFoodById(fid))
        .filter(f => f && !todayFoodIds.has(f.id));

      if (availableFoods.length > 0) {
        suggestions.push({
          foodId: availableFoods[0].id,
          name: availableFoods[0].name,
          categoryName: cat.name,
          imageUrl: availableFoods[0].imageUrl,
          reason: '已通过分类 · 可轮换搭配',
          isTesting: false,
          catId: cat.id,
        });
      }
    }
  }

  return suggestions;
}

/**
 * 获取今日排敏任务摘要
 * @param {Object} categoryStateMap 分类状态映射
 * @param {Array} todayRecords 今日已记录
 * @returns {Object} { testingTasks: [], completedToday: number }
 */
function getTodayTaskSummary(categoryStateMap, todayRecords) {
  const todayDate = dateUtil.getTodayDateStr();
  const allCategories = planCategories.getAllCategories();

  const testingTasks = allCategories
    .filter(cat => {
      const state = categoryStateMap[cat.id] || {};
      return state.status === 'testing';
    })
    .map(cat => {
      const state = categoryStateMap[cat.id] || {};
      const food = foodLibrary.getFoodById(cat.foodIds[0]);
      return {
        catId: cat.id,
        catName: cat.name,
        icon: cat.icon,
        dayIndex: state.dayIndex || 1,
        totalDays: state.totalDays || 3,
        imageUrl: food ? food.imageUrl : '',
      };
    });

  return { testingTasks };
}

module.exports = {
  getTodaySuggestions,
  getTodayTaskSummary,
};
