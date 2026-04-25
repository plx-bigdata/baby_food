// utils/plan-engine.js — 排敏计划引擎（扩展版）
// 包含：分类状态计算、计划生成等核心算法

const planCategories = require('../data/plan-categories');
const dateUtil = require('./date');

/**
 * 计算某日期是计划中第几天（从1开始）
 * @param {string} startDate YYYY-MM-DD
 * @param {string} date YYYY-MM-DD
 * @returns {number}
 */
function calcDayIndex(startDate, date) {
  if (!startDate || !date) return 0;
  const start = new Date(startDate);
  const target = new Date(date);
  const diff = Math.floor((target - start) / (1000 * 60 * 60 * 24));
  return Math.max(0, diff + 1);
}

/**
 * Date / Date 对象 → YYYY-MM-DD 字符串
 * @param {Date} date
 * @returns {string}
 */
function formatDateStr(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function collectUniqueRecordDates(records, today) {
  const uniqueDates = new Set();
  records.forEach(record => {
    const localDate = dateUtil.getRecordDate(record);
    if (!localDate) return;
    if (!today || localDate <= today) {
      uniqueDates.add(localDate);
    }
  });
  return uniqueDates;
}

function calcMaxConsecutiveDays(sortedDates) {
  if (!sortedDates || sortedDates.length === 0) return 0;

  let maxStreak = 1;
  let streak = 1;

  for (let i = 1; i < sortedDates.length; i++) {
    const prev = new Date(sortedDates[i - 1]);
    const curr = new Date(sortedDates[i]);
    const diff = Math.round((curr - prev) / (1000 * 60 * 60 * 24));
    if (diff === 1) {
      streak++;
      maxStreak = Math.max(maxStreak, streak);
    } else {
      streak = 1;
    }
  }

  return maxStreak;
}

/**
 * 根据计划数据，获取某天的计划列表
 * @param {string} date YYYY-MM-DD
 * @param {Array} plans 排敏计划数组
 * @returns {Array}
 */
function getPlansForDate(date, plans) {
  if (!plans || plans.length === 0) return [];

  const statusClassMap = {
    '测试中': 'testing',
    '已通过': 'passed',
    '待开始': 'pending',
    '暂停': 'pending',
    '过敏': 'allergy',
  };

  return plans.filter(plan => {
    if (!plan.startDate || !plan.endDate) return false;
    return date >= plan.startDate && date <= plan.endDate;
  }).map(plan => {
    const dayIndex = calcDayIndex(plan.startDate, date);
    return {
      foodId: plan.foodId,
      foodName: plan.foodName,
      imageUrl: plan.imageUrl || '',
      status: plan.status,
      statusClass: statusClassMap[plan.status] || 'pending',
      statusText: plan.status,
      testDays: plan.testDays,
      dayIndex,
    };
  });
}

/**
 * 构建日期 → 计划列表的映射
 * @param {Array} plans
 * @returns {Object} { 'YYYY-MM-DD': [plan, ...] }
 */
function buildDatePlanMap(plans) {
  const map = {};

  plans.forEach(plan => {
    if (!plan.startDate || !plan.endDate) return;
    let current = new Date(plan.startDate);
    const end = new Date(plan.endDate);
    while (current <= end) {
      const dateStr = formatDateStr(current);
      if (!map[dateStr]) map[dateStr] = [];
      map[dateStr].push({
        foodId: plan.foodId,
        foodName: plan.foodName,
        status: plan.status,
      });
      current.setDate(current.getDate() + 1);
    }
  });

  return map;
}

/**
 * 根据排敏队列和规则，生成未来计划
 * @param {Array} queue 排敏队列（按 order 排序）
 * @param {Object} settings { testDays, dailyNewFoodLimit }
 * @param {string} startDate 开始日期 YYYY-MM-DD
 * @returns {Array} 未来的计划列表
 */
function generateFuturePlans(queue, settings, startDate) {
  const plans = [];
  const { testDays = 3, dailyNewFoodLimit = 1 } = settings;

  let currentDate = new Date(startDate);
  const pendingItems = queue
    .filter(item => item.status === '待开始')
    .sort((a, b) => a.order - b.order);

  pendingItems.forEach(item => {
    const planStartDate = formatDateStr(currentDate);
    const endDate = new Date(currentDate);
    endDate.setDate(endDate.getDate() + (item.testDays || testDays) - 1);

    plans.push({
      ...item,
      startDate: planStartDate,
      endDate: formatDateStr(endDate),
      status: '待开始',
    });

    currentDate = new Date(endDate);
    currentDate.setDate(currentDate.getDate() + 1);
  });

  return plans;
}

/**
 * 根据所有辅食记录和过敏日志，计算每个食物的当前状态
 *
 * 状态流转规则：
 * - 首次吃某食物 → 进入"进行中"（连续N天，默认3天）
 * - N天无过敏 → 进入"已通过"
 * - 有过敏记录 → 进入"过敏"
 *
 * @param {Array} records 全部辅食记录
 * @param {Array} allergyLogs 全部过敏日志
 * @param {Object} settings { testDays }
 * @param {Object} onboardingStates 引导时标记的食物状态 { [foodId]: 'passed' }
 * @param {Array} extraFoods 额外食物（例如自定义食物）
 * @returns {Object} { [foodId]: { status, startDate, dayIndex, totalDays, foodName, imageUrl } }
 */
function computeAllFoodStates(records, allergyLogs, settings, onboardingStates, extraFoods) {
  const testDays = settings?.testDays || 3;
  const today = dateUtil.getTodayDateStr();
  const foodLibrary = require('../data/food-library');
  const allFoods = [
    ...foodLibrary.getAllFoods(),
    ...((extraFoods || []).filter(Boolean)),
  ];
  const stateMap = {};
  const obStates = onboardingStates || {};

  allFoods.forEach(food => {
    const foodRecords = records.filter(r => r.foodId === food.id);
    // 过敏判定:除了 allergy_log.confirmedFood,也要看 record.reaction === '过敏'
    // 避免共享宝宝场景下 records 与 allergy_log 拉取时机不同造成两端状态错位
    const foodAllergy = allergyLogs.filter(log =>
      log.confirmedFood === food.id
    );
    // saveRecords 里 '过敏' 和 '疑似过敏' 都会自动建 allergy_log,这里两种都判 allergy
    const hasAllergyRecord = foodRecords.some(r =>
      r.reaction === '过敏' || r.reaction === '疑似过敏'
    );

    let status = 'pending';
    let startDate = null;
    let dayIndex = 0;

    if (foodAllergy.length > 0 || hasAllergyRecord) {
      status = 'allergy';
    } else if (foodRecords.length > 0) {
      // 收集所有吃过的日期（UTC 日期，与存储一致）
      const uniqueDates = collectUniqueRecordDates(foodRecords, today);
      dayIndex = uniqueDates.size;

      // 排序找最早日期作为 startDate
      const sorted = [...foodRecords].sort((a, b) =>
        new Date(a.recordTime) - new Date(b.recordTime)
      );
      if (sorted[0]) {
        startDate = dateUtil.getRecordDate(sorted[0]);
      }

      if (dayIndex >= testDays) {
        // 累计天数达标，再判断是否有连续 testDays 天
        const sortedDates = [...uniqueDates].sort();
        const maxStreak = calcMaxConsecutiveDays(sortedDates);
        // 连续吃够 testDays 天 → 安全；总天数够但不连续 → 基本安全
        status = maxStreak >= testDays ? 'passed' : 'preliminary';
      } else {
        status = 'testing';
      }
    } else if (obStates[food.id]) {
      // 引导时标记为安全（无实际记录）
      status = obStates[food.id];
    }

    stateMap[food.id] = {
      status,
      startDate,
      dayIndex,
      totalDays: testDays,
      foodName: food.name,
      imageUrl: food.imageUrl,
    };
  });

  return stateMap;
}

/**
 * 根据食物状态构建分类状态
 * @param {Object} foodStates foodId -> { status, startDate, dayIndex }
 * @param {Object} settings { testDays }
 * @returns {Object} { [categoryId]: { status, dayIndex, startDate, totalDays } }
 */
function buildCategoryStatesFromFoodStates(foodStates, settings) {
  const testDays = settings?.testDays || 3;
  const today = dateUtil.getTodayDateStr();
  const allCategories = planCategories.getAllCategories();
  const stateMap = {};

  allCategories.forEach(cat => {
    const catFoods = cat.foodIds
      .map(foodId => foodStates[foodId])
      .filter(Boolean);
    const testingFoods = catFoods.filter(food => food.status === 'testing');
    const allergyCount = catFoods.filter(food => food.status === 'allergy').length;
    const passedCount = catFoods.filter(food => food.status === 'passed').length;
    const totalFoods = catFoods.length;

    let status = 'pending';
    let startDate = null;
    let dayIndex = 0;

    if (allergyCount > 0) {
      status = 'allergy';
    } else if (totalFoods > 0 && passedCount === totalFoods && testingFoods.length === 0) {
      status = 'passed';
    } else if (testingFoods.length > 0) {
      status = 'testing';
      startDate = testingFoods.reduce((earliest, food) => {
        if (!food.startDate) return earliest;
        return !earliest || food.startDate < earliest ? food.startDate : earliest;
      }, null);
      dayIndex = startDate ? calcDayIndex(startDate, today) : 0;
    }

    stateMap[cat.id] = {
      status,
      dayIndex,
      startDate,
      totalDays: testDays,
    };
  });

  return stateMap;
}

/**
 * 根据所有辅食记录和过敏日志，计算每个分类的当前状态
 *
 * 状态流转规则：
 * - 首次吃某分类任意食物 → 进入"进行中"（连续N天，默认3天）
 * - N天无过敏 → 进入"已通过"
 * - 有过敏记录 → 进入"过敏"
 *
 * @param {Array} records 全部辅食记录
 * @param {Array} allergyLogs 全部过敏日志
 * @param {Object} settings { testDays }
 * @returns {Object} { [categoryId]: { status, startDate, dayIndex, totalDays } }
 */
function computeAllCategoryStates(records, allergyLogs, settings) {
  const testDays = settings?.testDays || 3;
  const today = dateUtil.getTodayDateStr();
  const allCategories = planCategories.getAllCategories();
  const stateMap = {};

  allCategories.forEach(cat => {
    const catRecords = records.filter(r => cat.foodIds.includes(r.foodId));
    const catAllergy = allergyLogs.filter(log =>
      log.confirmedFood && cat.foodIds.includes(log.confirmedFood)
    );

    let status = 'pending';
    let startDate = null;
    let dayIndex = 0;

    if (catAllergy.length > 0) {
      status = 'allergy';
    } else if (catRecords.length > 0) {
      const sorted = [...catRecords].sort((a, b) =>
        new Date(a.recordTime) - new Date(b.recordTime)
      );
      const firstRecord = sorted[0];
      const firstDate = dateUtil.getRecordDate(firstRecord);
      if (firstDate) {
        startDate = firstDate;
        dayIndex = calcDayIndex(startDate, today);
        if (dayIndex >= testDays) {
          status = 'passed';
        } else {
          status = 'testing';
        }
      }
    }

    stateMap[cat.id] = {
      status,
      startDate,
      dayIndex,
      totalDays: testDays,
    };
  });

  return stateMap;
}

/**
 * 根据分类状态，推荐下一个要排敏的分类（按优先级）
 * 优先级规则：
 * 1. 低过敏风险 > 中 > 高
 * 2. 月龄适合（recommendMonth <= babyAgeMonths）
 * 3. 待开始的分类
 *
 * @param {Object} categoryStateMap 分类状态映射
 * @param {number} babyAgeMonths 宝宝月龄
 * @returns {Array} 推荐分类列表
 */
function suggestNextCategories(categoryStateMap, babyAgeMonths) {
  const allCategories = planCategories.getAllCategories();

  const riskScoreMap = { '低': 1, '中': 2, '高': 3 };

  return allCategories
    .filter(cat => {
      const state = categoryStateMap[cat.id] || {};
      return state.status === 'pending' && cat.recommendMonth <= babyAgeMonths;
    })
    .sort((a, b) => {
      const riskA = riskScoreMap[a.allergyRisk] || 1;
      const riskB = riskScoreMap[b.allergyRisk] || 1;
      // 优先低风险
      if (riskA !== riskB) return riskA - riskB;
      // 其次按月龄（越小越靠前）
      return a.recommendMonth - b.recommendMonth;
    });
}

module.exports = {
  calcDayIndex,
  formatDateStr,
  getPlansForDate,
  buildDatePlanMap,
  generateFuturePlans,
  computeAllFoodStates,
  computeAllCategoryStates,
  buildCategoryStatesFromFoodStates,
  suggestNextCategories,
};
