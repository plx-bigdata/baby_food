// pages/index/index.js — 首页逻辑

const app = getApp();
const dateUtil = require('../../utils/date');
const planEngine = require('../../utils/plan-engine');
const suggestionEngine = require('../../utils/suggestion-engine');
const planCategories = require('../../data/plan-categories');

Page({
  data: {
    // 宝宝信息
    baby: null,
    babyAge: '',
    // 宝宝月龄（数值）
    babyAgeMonths: 0,
    // 今日日期
    todayText: '',
    // 宝宝列表
    babies: [],
    // 当前宝宝 ID
    currentBabyId: '',
    // 宝宝切换弹窗
    showBabySwitcher: false,
    // 排敏进度
    planStats: { passed: 0, total: 0, percent: 0, allergy: 0, testing: 0, tried: 0 },
    // 安全食物列表
    passedFoods: [],
    // 过敏食物列表
    allergyFoods: [],
    // 安全/过敏列表展开状态
    showSafeList: false,
    showAllergyList: false,
    // 今日建议
    todaySuggestions: [],
    // 今日食谱（按天分组，去重）
    dayList: [],
    // 达标提示
    growthHint: '',
    // 生长状态
    growthStatus: '正常',
    growthStatusClass: 'normal',
    // 身高体重编辑状态
    editingHeight: false,
    editingWeight: false,
    editHeightValue: '',
    editWeightValue: '',
  },

  onLoad() {
    const today = new Date();
    this.setData({ todayText: dateUtil.formatDate(today, 'M月D日') });
  },

  onShow() {
    this.loadData();
  },

  /**
   * 加载所有数据
   */
  loadData() {
    // 1. 加载宝宝信息
    this.loadBabyInfo();
    // 2. 加载排敏进度
    this.loadPlanSummary();
    // 3. 加载今日记录
    this.loadTodayRecords();
  },

  /**
   * 加载宝宝信息
   */
  loadBabyInfo() {
    const baby = app.globalData.currentBaby;
    const babies = app.globalData.babies || [];
    const currentBabyId = app.globalData.currentBabyId || '';
    if (!baby) {
      const mockBaby = {
        _id: 'baby_001',
        name: '小豆芽',
        birthday: '2025-07-15',
        height: 72,
        weight: 9.2,
      };
      this.setData({ baby: mockBaby, babies, currentBabyId: mockBaby._id, editHeightValue: mockBaby.height, editWeightValue: mockBaby.weight });
      this.calcBabyAge(mockBaby.birthday);
      this.checkGrowthStatus(mockBaby);
      return;
    }
    this.setData({ baby, babies, currentBabyId, editHeightValue: baby.height || '', editWeightValue: baby.weight || '' });
    this.calcBabyAge(baby.birthday);
    this.checkGrowthStatus(baby);
  },

  /**
   * 计算宝宝月龄
   */
  calcBabyAge(birthday) {
    if (!birthday) return;
    const months = dateUtil.calcBabyAgeMonths(birthday);
    this.setData({ babyAge: dateUtil.calcBabyAge(birthday), babyAgeMonths: months });
  },

  /**
   * 根据身高体重评估生长状态（常量估算，不接真实数据）
   */
  checkGrowthStatus(baby) {
    if (!baby || !baby.height || !baby.weight) {
      this.setData({ growthHint: '', growthStatus: '--', growthStatusClass: 'normal' });
      return;
    }
    const { height, weight } = baby;
    // 8月龄参考：身高64-74cm，体重6.5-11kg（简化估算）
    const hints = [];
    let status = '正常';
    let statusClass = 'normal';
    if (height < 64) { hints.push('身高偏矮'); status = '偏低'; statusClass = 'low'; }
    else if (height > 78) { hints.push('身高偏高'); status = '偏高'; statusClass = 'high'; }
    if (weight < 6.5) { hints.push('体重偏轻'); if (status === '正常') { status = '偏低'; statusClass = 'low'; } }
    else if (weight > 11) { hints.push('体重偏重'); if (status === '正常') { status = '偏高'; statusClass = 'high'; } }
    if (hints.length === 0) {
      this.setData({ growthHint: '身高体重发育正常', growthStatus: '正常', growthStatusClass: 'normal' });
    } else {
      this.setData({ growthHint: hints.join('、') + '，建议咨询儿保医生', growthStatus: status, growthStatusClass: statusClass });
    }
  },

  /**
   * 加载排敏进度摘要（按食物计算）
   */
  loadPlanSummary() {
    const records = app.globalData.allRecords || [];
    const allergyLogs = app.globalData.allergyLogs || [];
    const settings = app.globalData.currentBaby?.settings || { testDays: 3 };

    console.log('[Index] loadPlanSummary - records count:', records.length);
    console.log('[Index] loadPlanSummary - settings:', settings);

    // 按食物计算状态
    const foodStates = planEngine.computeAllFoodStates(records, allergyLogs, settings);
    const foodLibrary = require('../../data/food-library');
    const allFoods = foodLibrary.getAllFoods();

    console.log('[Index] loadPlanSummary - allFoods count:', allFoods.length);

    // 统计各状态食物数量
    let passedCount = 0;
    let allergyCount = 0;
    let testingCount = 0;
    const allergyFoodsList = []; // 过敏食物列表
    const passedFoodsList = []; // 安全食物列表

    allFoods.forEach(food => {
      const state = foodStates[food.id] || {};
      if (state.status === 'passed') {
        passedCount++;
        passedFoodsList.push({ foodId: food.id, name: food.name, imageUrl: food.imageUrl });
      } else if (state.status === 'allergy') {
        allergyCount++;
        allergyFoodsList.push({ foodId: food.id, name: food.name, imageUrl: food.imageUrl });
      } else if (state.status === 'testing') {
        testingCount++;
      }
    });

    const total = allFoods.length;
    const triedCount = passedCount + allergyCount + testingCount;

    console.log('[Index] planStats:', { passed: passedCount, total, tried: triedCount, allergy: allergyCount, testing: testingCount });

    this.setData({
      planStats: { passed: passedCount, total, percent: total > 0 ? Math.round(triedCount / total * 100) : 0, allergy: allergyCount, testing: testingCount, tried: triedCount },
      allergyFoods: allergyFoodsList,
      passedFoods: passedFoodsList,
    });

    // 同步到全局，供 plan 页使用
    app.globalData.foodStates = foodStates;

    // 计算分类状态（供建议引擎使用）
    const planCategories = require('../../data/plan-categories');
    const allCategories = planCategories.getAllCategories();
    const categoryStateMap = {};
    allCategories.forEach(cat => {
      const catFoods = cat.foodIds.map(fid => foodStates[fid]).filter(f => f && f.status);
      const testingCount = catFoods.filter(f => f.status === 'testing').length;
      const passedCount = catFoods.filter(f => f.status === 'passed').length;
      const allergyCount = catFoods.filter(f => f.status === 'allergy').length;
      const totalFoods = catFoods.length;
      const hasAllergy = allergyCount > 0;
      const allPassed = totalFoods > 0 && passedCount === totalFoods;
      let status = 'pending';
      if (hasAllergy) status = 'allergy';
      else if (allPassed) status = 'passed';
      else if (testingCount > 0) status = 'testing';
      const testingOnes = catFoods.filter(f => f.status === 'testing');
      const startDate = testingOnes.length > 0
        ? testingOnes.reduce(( earliest, f) => !earliest || f.startDate < earliest ? f.startDate : earliest, null)
        : null;
      const dayIndex = startDate ? planEngine.calcDayIndex(startDate, dateUtil.getTodayDateStr()) : 0;
      categoryStateMap[cat.id] = { status, dayIndex, startDate, totalDays: settings.testDays };
    });
    app.globalData.categoryStates = categoryStateMap;
  },

  /**
   * 加载今日建议
   */
  loadTodaySuggestions() {
    const { babyAgeMonths } = this.data;
    const todayRecords = app.globalData.todayRecords || [];
    const categoryStates = app.globalData.categoryStates || {};
    const settings = app.globalData.currentBaby?.settings || { testDays: 3, dailyNewFoodLimit: 1 };

    const suggestions = suggestionEngine.getTodaySuggestions(todayRecords, categoryStates, babyAgeMonths, settings);
    this.setData({ todaySuggestions: suggestions.slice(0, 3) });
  },

  /**
   * 加载今日记录（按天分组，去重）
   */
  loadTodayRecords() {
    const todayRecords = app.globalData.todayRecords || [];
    // 按日期分组，每天去重
    const dayMap = {};
    todayRecords.forEach(r => {
      if (!r.recordTime) return;
      const dateStr = r.recordTime.split('T')[0];
      if (!dayMap[dateStr]) dayMap[dateStr] = new Map();
      // 用 Map 去重，key 为 foodId
      dayMap[dateStr].set(r.foodId, {
        foodId: r.foodId,
        foodName: r.foodName,
        imageUrl: r.imageUrl,
        recordTime: r.recordTime ? dateUtil.formatTime(r.recordTime) : '',
      });
    });

    // 转换为数组格式
    const dayList = Object.keys(dayMap).sort((a, b) => b.localeCompare(a)).map(dateStr => ({
      date: dateStr,
      dateText: dateStr,
      foods: Array.from(dayMap[dateStr].values()),
    }));
    this.setData({ dayList });
  },

  /**
   * 跳转到记录页
   */
  goToRecord() {
    wx.switchTab({ url: '/pages/record/record' });
  },

  /**
   * 开始编辑身高
   */
  startEditHeight() {
    const { baby } = this.data;
    this.setData({ editingHeight: true, editHeightValue: baby.height || '' });
  },

  /**
   * 身高输入
   */
  onHeightInput(e) {
    this.setData({ editHeightValue: e.detail.value });
  },

  /**
   * 确认身高
   */
  confirmEditHeight() {
    const val = parseFloat(this.data.editHeightValue);
    if (isNaN(val) || val <= 0) {
      wx.showToast({ title: '请输入有效身高', icon: 'none' });
      return;
    }
    const baby = { ...this.data.baby, height: val };
    app.globalData.currentBaby = baby;
    this.setData({ baby, editingHeight: false });
    this.checkGrowthStatus(baby);
  },

  /**
   * 开始编辑体重
   */
  startEditWeight() {
    const { baby } = this.data;
    this.setData({ editingWeight: true, editWeightValue: baby.weight || '' });
  },

  /**
   * 体重输入
   */
  onWeightInput(e) {
    this.setData({ editWeightValue: e.detail.value });
  },

  /**
   * 确认体重
   */
  confirmEditWeight() {
    const val = parseFloat(this.data.editWeightValue);
    if (isNaN(val) || val <= 0) {
      wx.showToast({ title: '请输入有效体重', icon: 'none' });
      return;
    }
    const baby = { ...this.data.baby, weight: val };
    app.globalData.currentBaby = baby;
    this.setData({ baby, editingWeight: false });
    this.checkGrowthStatus(baby);
  },

  /**
   * 下拉刷新
   */
  onPullDownRefresh() {
    this.loadData();
    setTimeout(() => wx.stopPullDownRefresh(), 300);
  },

  /**
   * 展开/收起安全食物列表
   */
  toggleSafeList() {
    this.setData({
      showSafeList: !this.data.showSafeList,
      showAllergyList: false,
    });
  },

  /**
   * 展开/收起过敏食物列表
   */
  toggleAllergyList() {
    this.setData({
      showAllergyList: !this.data.showAllergyList,
      showSafeList: false,
    });
  },

  /**
   * 显示宝宝切换弹窗
   */
  showBabySwitcher() {
    const babies = app.globalData.babies || [];
    const currentBabyId = app.globalData.currentBabyId || '';
    this.setData({
      showBabySwitcher: true,
      babies,
      currentBabyId,
    });
  },

  /**
   * 关闭宝宝切换弹窗
   */
  closeBabySwitcher() {
    this.setData({ showBabySwitcher: false });
  },

  /**
   * 选择宝宝
   */
  selectBaby(e) {
    const babyId = e.currentTarget.dataset.id;
    if (babyId === this.data.currentBabyId) {
      this.setData({ showBabySwitcher: false });
      return;
    }
    app.switchBaby(babyId);
    this.setData({ showBabySwitcher: false });
    this.loadData();
  },

  /**
   * 跳转到添加宝宝
   */
  goToAddBaby() {
    this.setData({ showBabySwitcher: false });
    wx.switchTab({ url: '/pages/settings/settings' });
  },
});
