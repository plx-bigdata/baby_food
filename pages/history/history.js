// pages/history/history.js — 历史记录页逻辑

const app = getApp();
const dateUtil = require('../../utils/date');

Page({
  data: {
    viewMode: 'day',       // 'day' | 'week'
    currentDate: new Date(),
    periodTitle: '',
    isCurrentPeriod: true,
    groupedRecords: [],
  },

  onLoad() {
    this.updatePeriod();
    this.loadRecords();
  },

  /**
   * 切换视图模式
   */
  switchView(e) {
    const mode = e.currentTarget.dataset.mode;
    this.setData({ viewMode: mode, currentDate: new Date() });
    this.updatePeriod();
    this.loadRecords();
  },

  /**
   * 更新时间段标题
   */
  updatePeriod() {
    const { viewMode, currentDate } = this.data;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let title = '';
    if (viewMode === 'day') {
      title = dateUtil.formatDate(currentDate, 'YYYY年M月D日');
      const d = new Date(currentDate);
      d.setHours(0, 0, 0, 0);
      this.setData({ isCurrentPeriod: d.getTime() >= today.getTime() });
    } else {
      const { start, end } = dateUtil.getWeekRange(currentDate);
      title = `${dateUtil.formatDate(start, 'M月D日')} - ${dateUtil.formatDate(end, 'M月D日')}`;
      const weekStart = new Date(start);
      weekStart.setHours(0, 0, 0, 0);
      this.setData({ isCurrentPeriod: weekStart.getTime() >= today.getTime() });
    }
    this.setData({ periodTitle: title });
  },

  /**
   * 上一周期
   */
  prevPeriod() {
    const { viewMode, currentDate } = this.data;
    const d = new Date(currentDate);
    if (viewMode === 'day') {
      d.setDate(d.getDate() - 1);
    } else {
      d.setDate(d.getDate() - 7);
    }
    this.setData({ currentDate: d });
    this.updatePeriod();
    this.loadRecords();
  },

  /**
   * 下一周期
   */
  nextPeriod() {
    if (this.data.isCurrentPeriod) return;
    const { viewMode, currentDate } = this.data;
    const d = new Date(currentDate);
    if (viewMode === 'day') {
      d.setDate(d.getDate() + 1);
    } else {
      d.setDate(d.getDate() + 7);
    }
    this.setData({ currentDate: d });
    this.updatePeriod();
    this.loadRecords();
  },

  /**
   * 加载记录
   */
  async loadRecords() {
    const babyId = app.getCurrentBabyId();
    if (!babyId) return;

    const { viewMode, currentDate } = this.data;
    let startTime, endTime;

    if (viewMode === 'day') {
      const range = dateUtil.getDayRange(currentDate);
      startTime = range.start;
      endTime = range.end;
    } else {
      const range = dateUtil.getWeekRange(currentDate);
      startTime = range.start.toISOString();
      endTime = range.end.toISOString();
    }

    try {
      const result = await wx.cloud.callFunction({
        name: 'getRecords',
        data: { type: 'dayRecords', babyId, startTime, endTime },
      });

      if (result.result.code === 0) {
        const records = result.result.data;
        const grouped = this.groupRecordsByDate(records);
        this.setData({ groupedRecords: grouped });
      }
    } catch (err) {
      console.error('[历史页] 加载失败:', err);
    }
  },

  /**
   * 按日期分组记录
   */
  groupRecordsByDate(records) {
    const map = {};
    records.forEach(r => {
      const date = r.recordTime.split('T')[0];
      if (!map[date]) map[date] = [];
      map[date].push({
        ...r,
        timeText: dateUtil.formatTime(r.recordTime),
      });
    });

    return Object.keys(map)
      .sort((a, b) => b.localeCompare(a))
      .map(date => ({
        date,
        dateText: dateUtil.formatDate(new Date(date), 'M月D日 dddd'),
        records: map[date],
      }));
  },
});
