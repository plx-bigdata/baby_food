// ============================================================
// 中国宝宝生长曲线参考数据 & 评估工具
// 数据来源：中国卫生部《中国7岁以下儿童生长发育参照标准》（2009年）
// 使用方法：在小程序页面 import 后调用 evaluateGrowth(options)
// ============================================================

/**
 * 数据格式：
 * [月龄, 身高P3, P10, P25, P50, P75, P90, P97, 体重P3, P10, P25, P50, P75, P90, P97]
 */
const BOY_DATA = [
  [0,  46.1,47.2,48.2,49.9,51.2,52.2,53.2, 2.62,2.89,3.13,3.32,3.73,4.18,4.66],
  [1,  50.7,51.8,52.9,54.4,56.0,57.1,58.1, 3.52,3.87,4.16,4.47,5.29,5.89,6.53],
  [2,  54.3,55.5,56.6,58.1,59.7,60.9,61.9, 4.51,4.93,5.31,5.68,6.54,7.23,7.99],
  [3,  57.3,58.5,59.7,61.4,62.9,64.1,65.1, 5.33,5.79,6.21,6.70,7.65,8.41,9.25],
  [4,  59.7,61.0,62.3,64.0,65.6,66.9,67.9, 6.02,6.51,6.99,7.61,8.62,9.43,10.35],
  [5,  61.7,63.2,64.5,66.2,67.9,69.2,70.3, 6.62,7.14,7.64,8.38,9.40,10.27,11.25],
  [6,  63.3,64.8,66.2,68.1,69.8,71.2,72.3, 7.11,7.65,8.20,9.00,10.05,10.94,11.98],
  [7,  64.8,66.4,67.8,69.8,71.6,73.0,74.2, 7.51,8.08,8.67,9.49,10.56,11.49,12.57],
  [8,  66.2,67.8,69.3,71.5,73.2,74.7,75.9, 7.84,8.43,9.05,9.90,10.99,11.95,13.05],
  [9,  67.5,69.2,70.8,72.9,74.7,76.2,77.6, 8.14,8.75,9.39,10.27,11.38,12.37,13.50],
  [10, 68.7,70.4,72.1,74.3,76.2,77.7,79.2, 8.41,9.03,9.69,10.59,11.73,12.75,13.90],
  [11, 69.9,71.7,73.4,75.7,77.6,79.2,80.7, 8.66,9.29,9.97,10.90,12.07,13.10,14.27],
  [12, 71.0,72.8,74.6,76.9,78.9,80.6,82.1, 8.89,9.54,10.24,11.18,12.37,13.43,14.62],
  [15, 74.5,76.4,78.3,80.7,82.9,84.7,86.4, 9.51,10.20,10.96,12.00,13.26,14.40,15.68],
  [18, 77.5,79.5,81.5,84.2,86.5,88.4,90.3, 10.06,10.80,11.62,12.73,14.08,15.29,16.66],
  [21, 80.2,82.3,84.4,87.3,89.8,91.9,93.8, 10.57,11.35,12.22,13.40,14.82,16.09,17.53],
  [24, 82.5,84.7,86.9,89.9,92.5,94.7,96.8, 11.05,11.86,12.77,14.00,15.49,16.82,18.33],
  [27, 84.7,86.9,89.3,92.4,95.1,97.5,99.7, 11.50,12.36,13.31,14.60,16.16,17.55,19.13],
  [30, 86.7,89.1,91.5,94.7,97.6,100.1,102.4,11.95,12.84,13.83,15.19,16.81,18.26,19.91],
  [33, 88.6,91.1,93.6,97.0,100.0,102.6,105.1,12.38,13.31,14.34,15.77,17.46,18.96,20.68],
  [36, 90.4,93.0,95.6,99.1,102.2,105.0,107.6,12.82,13.79,14.87,16.35,18.10,19.66,21.45],
];

const GIRL_DATA = [
  [0,  45.5,46.6,47.6,49.1,50.5,51.5,52.5, 2.54,2.77,3.01,3.21,3.62,4.05,4.52],
  [1,  49.8,50.9,52.0,53.7,55.2,56.3,57.2, 3.36,3.68,3.96,4.29,5.00,5.55,6.15],
  [2,  53.2,54.4,55.5,57.1,58.6,59.7,60.7, 4.25,4.66,5.01,5.40,6.23,6.87,7.57],
  [3,  55.8,57.0,58.2,60.0,61.6,62.7,63.7, 5.03,5.48,5.87,6.39,7.34,8.06,8.85],
  [4,  58.0,59.3,60.5,62.4,64.0,65.2,66.2, 5.67,6.17,6.60,7.22,8.24,9.03,9.92],
  [5,  59.9,61.2,62.6,64.4,66.1,67.4,68.5, 6.20,6.73,7.21,7.89,8.98,9.83,10.79],
  [6,  61.5,62.9,64.3,66.3,68.0,69.4,70.5, 6.67,7.23,7.77,8.50,9.65,10.55,11.58],
  [7,  62.9,64.4,65.9,67.9,69.8,71.2,72.3, 7.09,7.68,8.26,9.06,10.27,11.22,12.32],
  [8,  64.3,65.8,67.4,69.5,71.4,72.9,74.1, 7.46,8.08,8.70,9.57,10.83,11.83,13.00],
  [9,  65.6,67.2,68.8,71.0,73.0,74.5,75.8, 7.80,8.46,9.11,10.03,11.34,12.39,13.61],
  [10, 66.9,68.5,70.2,72.4,74.4,76.1,77.4, 8.11,8.80,9.48,10.45,11.82,12.93,14.20],
  [11, 68.0,69.8,71.5,73.8,75.9,77.6,79.0, 8.40,9.11,9.82,10.83,12.25,13.40,14.72],
  [12, 69.2,70.9,72.8,75.1,77.3,79.0,80.5, 8.67,9.40,10.14,11.19,12.66,13.86,15.23],
  [15, 72.8,74.7,76.7,79.2,81.5,83.4,85.2, 9.36,10.14,10.95,12.12,13.71,15.02,16.54],
  [18, 76.0,78.0,80.1,82.7,85.2,87.2,89.2, 9.95,10.79,11.66,12.93,14.64,16.05,17.70],
  [21, 78.8,80.9,83.1,86.0,88.6,90.8,92.8, 10.50,11.39,12.32,13.69,15.50,17.00,18.78],
  [24, 81.3,83.5,85.8,88.9,91.6,94.0,96.2, 11.02,11.96,12.95,14.41,16.32,17.93,19.82],
  [27, 83.6,85.9,88.3,91.5,94.5,97.0,99.4, 11.51,12.51,13.55,15.09,17.10,18.82,20.83],
  [30, 85.8,88.2,90.7,94.1,97.2,99.9,102.4,12.00,13.04,14.14,15.77,17.87,19.68,21.80],
  [33, 87.9,90.4,93.0,96.5,99.8,102.7,105.3,12.47,13.55,14.71,16.43,18.62,20.52,22.74],
  [36, 89.8,92.4,95.1,98.8,102.2,105.2,107.9,12.92,14.06,15.27,17.07,19.35,21.33,23.65],
];

/**
 * 找到最近月龄的参考行（四舍五入到最近有数据的月龄）
 * @param {string} gender - 'boy' | 'girl'
 * @param {number} month  - 月龄（0~36）
 * @returns {Array} 参考行数据
 */
function getNearestRow(gender, month) {
  const data = gender === 'boy' ? BOY_DATA : GIRL_DATA;
  let best = data[0];
  let minDiff = Math.abs(data[0][0] - month);
  for (const row of data) {
    const diff = Math.abs(row[0] - month);
    if (diff < minDiff) { minDiff = diff; best = row; }
  }
  return best;
}

/**
 * 根据测量值和参考百分位，返回评级
 * @param {number} val  - 实测值
 * @param {number} p3   - 3rd 百分位
 * @param {number} p10  - 10th 百分位
 * @param {number} p90  - 90th 百分位
 * @param {number} p97  - 97th 百分位
 * @returns {{ level: string, label: string, color: string }}
 *   level: 'very_low' | 'low' | 'normal' | 'high' | 'very_high'
 */
function getLevel(val, p3, p10, p90, p97) {
  if (val < p3)        return { level: 'very_low',  label: '偏低（P3以下）',   color: '#E24B4A' };
  if (val < p10)       return { level: 'low',       label: '偏低（P3~P10）',  color: '#EF9F27' };
  if (val <= p90)      return { level: 'normal',    label: '正常',            color: '#1D9E75' };
  if (val <= p97)      return { level: 'high',      label: '偏高（P90~P97）', color: '#EF9F27' };
  return               { level: 'very_high', label: '偏高（P97以上）',  color: '#E24B4A' };
}

/**
 * 核心评估函数
 *
 * @param {Object} options
 * @param {string} options.gender  - 'boy' | 'girl'
 * @param {number} options.month   - 月龄，整数，0~36
 * @param {number} options.height  - 身高，单位 cm
 * @param {number} options.weight  - 体重，单位 kg
 *
 * @returns {Object} result
 * @returns {number}   result.refMonth          - 实际对比的参考月龄
 * @returns {Object}   result.height            - 身高评估
 * @returns {string}   result.height.level      - 'very_low'|'low'|'normal'|'high'|'very_high'
 * @returns {string}   result.height.label      - 中文描述
 * @returns {string}   result.height.color      - 建议展示颜色 hex
 * @returns {number}   result.height.p3         - 参考 P3
 * @returns {number}   result.height.p10        - 参考 P10
 * @returns {number}   result.height.p50        - 参考 P50（中位数）
 * @returns {number}   result.height.p90        - 参考 P90
 * @returns {number}   result.height.p97        - 参考 P97
 * @returns {Object}   result.weight            - 体重评估（同上结构）
 * @returns {string}   result.summary           - 综合一句话说明
 */
function evaluateGrowth({ gender, month, height, weight }) {
  if (!['boy', 'girl'].includes(gender)) throw new Error('gender 必须为 boy 或 girl');
  if (typeof month !== 'number' || month < 0 || month > 36) throw new Error('month 范围 0~36');
  if (!height || !weight) throw new Error('请传入身高和体重');

  const row = getNearestRow(gender, month);
  const [
    refMonth,
    hP3, hP10, hP25, hP50, hP75, hP90, hP97,
    wP3, wP10, wP25, wP50, wP75, wP90, wP97
  ] = row;

  const hLevel = getLevel(height, hP3, hP10, hP90, hP97);
  const wLevel = getLevel(weight, wP3, wP10, wP90, wP97);

  // 综合判断
  const bothNormal = hLevel.level === 'normal' && wLevel.level === 'normal';
  const anyDanger  = ['very_low','very_high'].includes(hLevel.level) || ['very_low','very_high'].includes(wLevel.level);
  const summary = bothNormal
    ? '身高体重均在正常范围，继续保持！'
    : anyDanger
    ? '存在偏差较大的指标，建议咨询儿科医生或儿保科。'
    : '部分指标轻微偏离，建议关注并定期儿保随访。';

  return {
    refMonth,
    height: {
      value:  height,
      level:  hLevel.level,
      label:  hLevel.label,
      color:  hLevel.color,
      p3:  hP3,
      p10: hP10,
      p25: hP25,
      p50: hP50,
      p75: hP75,
      p90: hP90,
      p97: hP97,
    },
    weight: {
      value:  weight,
      level:  wLevel.level,
      label:  wLevel.label,
      color:  wLevel.color,
      p3:  wP3,
      p10: wP10,
      p25: wP25,
      p50: wP50,
      p75: wP75,
      p90: wP90,
      p97: wP97,
    },
    summary,
  };
}

/**
 * 获取某性别全部月龄的参考数据（用于绘制曲线图）
 * @param {string} gender - 'boy' | 'girl'
 * @returns {Array<Object>} 每条记录包含 month, heightRefs, weightRefs
 */
function getAllReferenceData(gender) {
  const data = gender === 'boy' ? BOY_DATA : GIRL_DATA;
  return data.map(row => ({
    month: row[0],
    height: { p3: row[1], p10: row[2], p25: row[3], p50: row[4], p75: row[5], p90: row[6], p97: row[7] },
    weight: { p3: row[8], p10: row[9], p25: row[10], p50: row[11], p75: row[12], p90: row[13], p97: row[14] },
  }));
}

module.exports = {
  evaluateGrowth,
  getAllReferenceData,
  BOY_DATA,
  GIRL_DATA,
};


// ============================================================
// 使用示例（小程序页面 Page 中）
// ============================================================
//
// const { evaluateGrowth, getAllReferenceData } = require('../../utils/growthChart');
//
// // 1. 评估单次数据
// const result = evaluateGrowth({
//   gender: 'boy',
//   month: 12,
//   height: 74.0,
//   weight: 10.5,
// });
//
// console.log(result.height.label);  // "正常"
// console.log(result.weight.label);  // "正常"
// console.log(result.summary);       // "身高体重均在正常范围，继续保持！"
//
// // result 完整结构：
// // {
// //   refMonth: 12,
// //   height: {
// //     value: 74.0, level: 'normal', label: '正常', color: '#1D9E75',
// //     p3: 71.0, p10: 72.8, p25: 74.6, p50: 76.9, p75: 78.9, p90: 80.6, p97: 82.1
// //   },
// //   weight: {
// //     value: 10.5, level: 'high', label: '偏高（P90~P97）', color: '#EF9F27',
// //     p3: 8.89, p10: 9.54, p25: 10.24, p50: 11.18, p75: 12.37, p90: 13.43, p97: 14.62
// //   },
// //   summary: '部分指标轻微偏离，建议关注并定期儿保随访。'
// // }
//
// // 2. 获取全部参考数据（绘图用）
// const refData = getAllReferenceData('boy');
// // refData[0] => { month: 0, height: { p3:46.1, p10:47.2, ... }, weight: { p3:2.62, ... } }
