// utils/date.js — 日期工具函数

/**
 * 格式化日期
 * @param {Date} date
 * @param {string} fmt 格式：YYYY-MM-DD / M月D日 / dddd 等
 */
function formatDate(date, fmt) {
  if (!date || isNaN(date.getTime())) return '';
  const weekdays = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
  return fmt
    .replace('YYYY', date.getFullYear())
    .replace('MM', String(date.getMonth() + 1).padStart(2, '0'))
    .replace('DD', String(date.getDate()).padStart(2, '0'))
    .replace('M', date.getMonth() + 1)
    .replace('D', date.getDate())
    .replace('dddd', weekdays[date.getDay()]);
}

/**
 * 格式化时间（HH:mm）
 * @param {string} isoString
 */
function formatTime(isoString) {
  if (!isoString) return '';
  const d = new Date(isoString);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/**
 * 获取今天日期字符串 YYYY-MM-DD
 */
function getTodayDateStr() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

/**
 * 任意输入(ISO 字符串 / Date / 时间戳) → 本地 YYYY-MM-DD。
 * 所有业务日期判断统一走这里,避免 toISOString().split('T')[0] 的时区偏移。
 */
function getLocalDateStr(input) {
  if (!input) return '';
  const d = input instanceof Date ? input : new Date(input);
  if (isNaN(d.getTime())) return '';
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * 辅食记录 → 本地 YYYY-MM-DD。优先用记录里显式写的 recordDate(新字段),
 * 老数据没有时从 recordTime 按本地时区推算。
 */
function getRecordDate(record) {
  if (!record) return '';
  if (record.recordDate) return record.recordDate;
  return getLocalDateStr(record.recordTime);
}

/**
 * 过敏日志 → 本地 YYYY-MM-DD。优先用 occurredDate(新字段),老数据用 occurredAt 推算。
 */
function getOccurredDate(log) {
  if (!log) return '';
  if (log.occurredDate) return log.occurredDate;
  return getLocalDateStr(log.occurredAt);
}

/**
 * 获取今天的起止时间 ISO 字符串
 */
function getTodayRange() {
  const today = getTodayDateStr();
  return {
    start: `${today}T00:00:00.000Z`,
    end: `${today}T23:59:59.999Z`,
  };
}

/**
 * 获取指定日期的起止时间（返回 Date 对象）
 */
function getDayRange(date) {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = d.getMonth();
  const day = d.getDate();
  return {
    start: new Date(year, month, day, 0, 0, 0, 0),
    end: new Date(year, month, day, 23, 59, 59, 999),
  };
}

/**
 * 获取指定日期所在周的起止时间（周一到周日）
 */
function getWeekRange(date) {
  const d = new Date(date);
  const day = d.getDay(); // 0=日, 1=一 ... 6=六
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const start = new Date(d);
  start.setDate(d.getDate() + mondayOffset);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

/**
 * 计算宝宝月龄描述
 * @param {string} birthday YYYY-MM-DD
 * @returns {string} 格式：X月XX天 或 X岁X月
 */
function calcBabyAge(birthday) {
  if (!birthday) return '';
  const birth = new Date(birthday);
  const now = new Date();
  const totalDays = Math.floor((now - birth) / (1000 * 60 * 60 * 24));
  const months = (now.getFullYear() - birth.getFullYear()) * 12 + (now.getMonth() - birth.getMonth());

  if (totalDays < 30) {
    return `${totalDays}天`;
  }

  // 计算准确的月龄（X月XX天）
  const birthMonth = birth.getMonth();
  const birthDay = birth.getDate();
  const currentMonth = now.getMonth();
  const currentDay = now.getDate();

  let monthAge = months;
  let dayAge = currentDay - birthDay;
  if (dayAge < 0) {
    monthAge--;
    // 上个月有多少天
    const lastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
    dayAge += lastMonth.getDate();
  }

  if (monthAge < 12) {
    return `${monthAge}个月${dayAge}天`;
  }

  // 超过12个月显示岁
  const years = Math.floor(monthAge / 12);
  const remainMonths = monthAge % 12;
  return remainMonths > 0 ? `${years}岁${remainMonths}月` : `${years}岁`;
}

/**
 * 构建月历数据（含前后月补位）
 * @param {number} year
 * @param {number} month 1-12
 */
function buildMonthCalendar(year, month) {
  const today = getTodayDateStr();
  const firstDay = new Date(year, month - 1, 1);
  const lastDay = new Date(year, month, 0);
  const startWeekday = firstDay.getDay(); // 0=日

  const days = [];

  // 补前月
  for (let i = startWeekday - 1; i >= 0; i--) {
    const d = new Date(year, month - 1, -i);
    days.push({
      date: formatDate(d, 'YYYY-MM-DD'),
      day: d.getDate(),
      isCurrentMonth: false,
      isToday: false,
      plans: [],
    });
  }

  // 当月
  for (let i = 1; i <= lastDay.getDate(); i++) {
    const d = new Date(year, month - 1, i);
    const dateStr = formatDate(d, 'YYYY-MM-DD');
    days.push({
      date: dateStr,
      day: i,
      isCurrentMonth: true,
      isToday: dateStr === today,
      plans: [],
    });
  }

  // 补后月（补齐6行42格）
  const remain = 42 - days.length;
  for (let i = 1; i <= remain; i++) {
    const d = new Date(year, month, i);
    days.push({
      date: formatDate(d, 'YYYY-MM-DD'),
      day: d.getDate(),
      isCurrentMonth: false,
      isToday: false,
      plans: [],
    });
  }

  return days;
}

/**
 * 计算宝宝月龄（数值，用于判断食物月龄适配）
 * @param {string} birthday YYYY-MM-DD
 * @returns {number} 月龄数值（不足一月按一月算）
 */
function calcBabyAgeMonths(birthday) {
  if (!birthday) return 0;
  const birth = new Date(birthday);
  const now = new Date();
  const months = (now.getFullYear() - birth.getFullYear()) * 12 + (now.getMonth() - birth.getMonth());
  // 不足一月按一月算
  return Math.max(1, months);
}

module.exports = {
  formatDate,
  formatTime,
  getTodayDateStr,
  getLocalDateStr,
  getRecordDate,
  getOccurredDate,
  getTodayRange,
  getDayRange,
  getWeekRange,
  calcBabyAge,
  calcBabyAgeMonths,
  buildMonthCalendar,
};
