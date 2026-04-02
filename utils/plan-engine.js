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
 * @returns {Object} { [foodId]: { status, startDate, dayIndex, totalDays, foodName, imageUrl } }
 */
function computeAllFoodStates(records, allergyLogs, settings) {
  const testDays = settings?.testDays || 3;
  const today = dateUtil.getTodayDateStr();
  const foodLibrary = require('../data/food-library');
  const allFoods = foodLibrary.getAllFoods();
  const stateMap = {};

  console.log('[PlanEngine] computeAllFoodStates - records:', records.length, 'allergyLogs:', allergyLogs.length, 'testDays:', testDays, 'today:', today);

  allFoods.forEach(food => {
    const foodRecords = records.filter(r => r.foodId === food.id);
    const foodAllergy = allergyLogs.filter(log =>
      log.confirmedFood === food.id
    );

    let status = 'pending';
    let startDate = null;
    let dayIndex = 0;

    if (foodAllergy.length > 0) {
      status = 'allergy';
    } else if (foodRecords.length > 0) {
      const sorted = [...foodRecords].sort((a, b) =>
        new Date(a.recordTime) - new Date(b.recordTime)
      );
      const firstRecord = sorted[0];
      if (firstRecord.recordTime) {
        startDate = firstRecord.recordTime.split('T')[0];
        dayIndex = calcDayIndex(startDate, today);
        console.log('[PlanEngine] food:', food.name, 'foodId:', food.id, 'firstRecordTime:', firstRecord.recordTime, 'startDate:', startDate, 'dayIndex:', dayIndex, 'testDays:', testDays);
        if (dayIndex >= testDays) {
          status = 'passed';
        } else {
          status = 'testing';
        }
      }
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
      if (firstRecord.recordTime) {
        startDate = firstRecord.recordTime.split('T')[0];
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
  suggestNextCategories,
};
