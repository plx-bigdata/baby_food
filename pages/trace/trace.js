// pages/trace/trace.js — 日历页逻辑

const app = getApp();
const dateUtil = require('../../utils/date');
const foodLibrary = require('../../data/food-library');
const SHEET_ANIMATION_DURATION = 280;

Page({
  data: {
    calendarYear: new Date().getFullYear(),
    calendarMonth: new Date().getMonth() + 1,
    calendarDays: [],
    selectedDay: null,
    showDayModal: false,
    renderSelectedDay: false,
    calendarScrollHeight: 400,
    dayModalScrollHeight: 300,
    showRecordSheet: false,
  },

  // ===== 记录辅食覆盖层 =====
  handleShowRecordSheet() {
    this.setData({ showRecordSheet: true });
  },
  onRecordSheetClose() {
    this.setData({ showRecordSheet: false });
  },
  onRecordSaved() {
    this.setData({ showRecordSheet: false });
    this.buildCalendar();
  },

  onLoad() {
    this._computeScrollHeights();
    this.buildCalendar();
  },

  onShow() {
    const tabBar = this.getTabBar();
    if (tabBar) tabBar.setData({ currentSelected: 3 });
    this.refreshFromGlobal();
  },

  /**
   * 云同步完成后由 app.syncFromCloud 主动调用;onShow 也复用
   */
  refreshFromGlobal() {
    const babyId = app.globalData.currentBabyId;
    if (babyId) {
      const records = wx.getStorageSync('allRecords_' + babyId) || [];
      app.globalData.allRecords = records;
    }
    this.buildCalendar();
  },

  _computeScrollHeights() {
    const info = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync();
    const winH = info.windowHeight;
    const safeBottom = info.safeArea ? (winH - info.safeArea.bottom) : 0;
    const tabbarH = 50 + safeBottom;

    // 日历 scroll-view：扣除 container-padding(24px) + header(~48px) + weekdays(~36px) + 余量(10px)
    const calendarScrollHeight = winH - tabbarH - 24 - 48 - 36 - 10;
    // 日期弹窗内 scroll-view：弹窗 70vh，扣除 handle+header ~44px
    const dayModalScrollHeight = winH * 0.7 - 44;

    this.setData({
      calendarScrollHeight: Math.max(calendarScrollHeight, 200),
      dayModalScrollHeight: Math.max(dayModalScrollHeight, 200),
    });
  },

  buildCalendar() {
    const { calendarYear, calendarMonth } = this.data;
    const days = dateUtil.buildMonthCalendar(calendarYear, calendarMonth);
    const records = app.globalData.allRecords || [];

    const recordsByDate = {};
    days.forEach(day => {
      const { start, end } = dateUtil.getDayRange(day.date);
      const startMs = start.getTime();
      const endMs = end.getTime();
      const dayRecords = records.filter(r => {
        if (!r.recordTime) return false;
        const recordMs = new Date(r.recordTime).getTime();
        return recordMs >= startMs && recordMs <= endMs;
      });
      if (dayRecords.length > 0) {
        recordsByDate[day.date] = dayRecords;
      }
    });

    const today = dateUtil.getTodayDateStr();
    const filledDays = days.map(day => {
      const dayRecs = recordsByDate[day.date] || [];
      const seenFoodIds = new Set();
      const dayFoods = [];
      dayRecs.forEach(r => {
        if (seenFoodIds.has(r.foodId)) return;
        seenFoodIds.add(r.foodId);
        const food = foodLibrary.getFoodById(r.foodId);
        const display = foodLibrary.getFoodDisplay(food, r);
        dayFoods.push({
          ...r,
          ...display,
        });
      });
      return {
        ...day,
        hasRecord: dayRecs.length > 0,
        recordCount: dayRecs.length,
        dayFoods,
        isToday: day.date === today,
      };
    });

    this.setData({ calendarDays: filledDays });
  },

  prevMonth() {
    let { calendarYear, calendarMonth } = this.data;
    calendarMonth--;
    if (calendarMonth < 1) { calendarMonth = 12; calendarYear--; }
    this.setData({ calendarYear, calendarMonth });
    this.buildCalendar();
  },

  nextMonth() {
    let { calendarYear, calendarMonth } = this.data;
    calendarMonth++;
    if (calendarMonth > 12) { calendarMonth = 1; calendarYear++; }
    this.setData({ calendarYear, calendarMonth });
    this.buildCalendar();
  },

  goToToday() {
    const now = new Date();
    this.setData({ calendarYear: now.getFullYear(), calendarMonth: now.getMonth() + 1 });
    this.buildCalendar();
  },

  selectCalendarDay(e) {
    const date = e.currentTarget.dataset.date;
    const day = this.data.calendarDays.find(d => d.date === date);
    if (!day || !day.hasRecord) return;

    const records = app.globalData.allRecords || [];
    const { start, end } = dateUtil.getDayRange(date);
    const startMs = start.getTime();
    const endMs = end.getTime();
    const rawRecords = records.filter(r => {
      if (!r.recordTime) return false;
      const ms = new Date(r.recordTime).getTime();
      return ms >= startMs && ms <= endMs;
    });

    const foodMap = {};
    rawRecords.forEach(r => {
      const food = foodLibrary.getFoodById(r.foodId);
      const key = r.foodId;
      if (!foodMap[key]) {
        const display = foodLibrary.getFoodDisplay(food, r);
        foodMap[key] = {
          ...display,
          times: [],
          reaction: '',
          reactionClass: 'normal',
        };
      }
      const d = new Date(r.recordTime);
      const t = `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
      foodMap[key].times.push(t);
      if (r.reaction === '过敏') {
        foodMap[key].reaction = '过敏'; foodMap[key].reactionClass = 'danger';
      } else if (r.reaction === '疑似过敏' && foodMap[key].reactionClass !== 'danger') {
        foodMap[key].reaction = '疑似过敏'; foodMap[key].reactionClass = 'warning';
      }
    });

    const dayRecords = Object.values(foodMap).map(item => ({
      ...item,
      timesStr: item.times.sort().join('  '),
    }));

    const dateText = `${date.split('-')[1]}月${date.split('-')[2]}日`;
    this.setData({
      renderSelectedDay: true,
      showDayModal: false,
      selectedDay: { date, dateText, foods: dayRecords },
    }, () => {
      setTimeout(() => this.setData({ showDayModal: true }), 16);
    });
  },

  closeDayModal() {
    if (!this.data.selectedDay && !this.data.renderSelectedDay) return;
    this.setData({ showDayModal: false }, () => {
      clearTimeout(this._dayModalTimer);
      this._dayModalTimer = setTimeout(() => {
        this.setData({ renderSelectedDay: false, selectedDay: null });
      }, SHEET_ANIMATION_DURATION);
    });
  },

  _modalDragY: -9999,
  onModalDragStart(e) {
    const touchY = e.touches[0].clientY;
    const screenHeight = wx.getSystemInfoSync().windowHeight;
    const modalTop = screenHeight * 0.3;
    if (touchY >= modalTop && touchY < modalTop + 200) {
      this._modalDragY = touchY;
    } else {
      this._modalDragY = -9999;
    }
  },
  onModalDragEnd(e) {
    if (this._modalDragY < 0) return;
    const delta = e.changedTouches[0].clientY - this._modalDragY;
    if (delta > 120) this.closeDayModal();
  },

  /**
   * 删除某天某食物的所有记录
   */
  onDeleteDayRecord(e) {
    const { foodid, name, count } = e.currentTarget.dataset;
    const date = this.data.selectedDay && this.data.selectedDay.date;
    if (!foodid || !date) return;
    const n = parseInt(count, 10) || 1;
    wx.showModal({
      title: '删除食用记录',
      content: `将删除 ${date} 的 ${name || ''} ${n} 次记录,确定继续?`,
      confirmColor: '#FF4757',
      success: (res) => {
        if (!res.confirm) return;
        const removed = app.deleteFoodRecordsByDay(foodid, date);
        if (!removed) {
          wx.showToast({ title: '未找到记录', icon: 'none' });
          return;
        }
        wx.showToast({ title: '已删除', icon: 'success' });
        // 刷新当前日期弹窗 + 日历
        const newFoods = (this.data.selectedDay.foods || []).filter(f => f.id !== foodid);
        if (newFoods.length === 0) {
          this.closeDayModal();
        } else {
          this.setData({ 'selectedDay.foods': newFoods });
        }
        this.buildCalendar();
      },
    });
  },

  noop() {},
});
