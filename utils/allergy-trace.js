// utils/allergy-trace.js — 过敏溯源算法

const foodLibrary = require('../data/food-library');

/**
 * 分析可疑食物
 * @param {Array} records 过敏发生前观察窗口内的辅食记录
 * @param {string} occurredAt 过敏发生时间（ISO 字符串）
 * @returns {Array} 可疑食物列表（按可疑程度排序）
 */
function analyzeSuspects(records, occurredAt) {
  if (!records || records.length === 0) return [];

  const occurredTime = new Date(occurredAt).getTime();

  // 去重（同一食物取最近的记录）
  const foodMap = {};
  records.forEach(record => {
    const fid = record.foodId;
    if (!foodMap[fid] || new Date(record.recordTime) > new Date(foodMap[fid].recordTime)) {
      foodMap[fid] = record;
    }
  });

  const suspects = Object.values(foodMap).map(record => {
    const food = foodLibrary.getFoodById(record.foodId) || {};
    const recordTime = new Date(record.recordTime).getTime();
    const hoursAgo = (occurredTime - recordTime) / (1000 * 60 * 60);

    // 计算风险分数
    const score = calcRiskScore({
      isFirstTime: record.isFirstTime,
      allergyRisk: food.allergyRisk || record.allergyRisk || '低',
      hoursAgo,
    });

    return {
      foodId: record.foodId,
      foodName: record.foodName,
      imageUrl: food.imageUrl || record.imageUrl || '',
      allergyRisk: food.allergyRisk || '低',
      isFirstTime: record.isFirstTime,
      hoursAgo: Math.round(hoursAgo),
      timeAgoText: formatHoursAgo(hoursAgo),
      score,
      confidence: scoreToConfidence(score),
    };
  });

  // 按分数降序排列
  suspects.sort((a, b) => b.score - a.score);
  return suspects;
}

/**
 * 计算风险分数（0-100）
 * 权重：首次食用 > 食物过敏风险 > 时间远近
 */
function calcRiskScore({ isFirstTime, allergyRisk, hoursAgo }) {
  let score = 0;

  // 首次食用加权（最高40分）
  if (isFirstTime) score += 40;

  // 食物本身过敏风险（最高30分）
  const riskScoreMap = { '高': 30, '中': 18, '低': 6 };
  score += riskScoreMap[allergyRisk] || 6;

  // 时间越近越可疑（最高30分，72小时内线性衰减）
  const maxHours = 72;
  const timeScore = Math.max(0, 30 * (1 - hoursAgo / maxHours));
  score += timeScore;

  return Math.round(score);
}

/**
 * 分数转置信度标签
 */
function scoreToConfidence(score) {
  if (score >= 60) return '高';
  if (score >= 35) return '中';
  return '低';
}

/**
 * 格式化小时数为可读文本
 */
function formatHoursAgo(hours) {
  if (hours < 1) return `${Math.round(hours * 60)}分钟`;
  if (hours < 24) return `${Math.round(hours)}小时`;
  return `${Math.round(hours / 24)}天`;
}

module.exports = { analyzeSuspects };
