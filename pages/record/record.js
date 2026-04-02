// pages/record/record.js — 辅食记录页逻辑

const app = getApp();
const dateUtil = require('../../utils/date');
const planEngine = require('../../utils/plan-engine');
const foodLibrary = require('../../data/food-library');
const planCategories = require('../../data/plan-categories');

Page({
  data: {
    // 当前日期
    today: '',
    // 分类 tabs
    categoryTabs: [],
    currentCategory: 'all',
    // 食物网格
    displayFoods: [],
    // 已选食物
    selectedFoods: [],
    // 记录面板
    showRecordPanel: false,
    // 首次食物信息
    firstTimeFoodInfo: null,
    // 记录表单
    recordForm: {
      time: '',
      amount: '正常',
      reaction: '正常',
      note: '',
    },
    amountOptions: ['少量', '正常', '多'],
    reactionOptions: [
      { label: '正常', value: '正常', type: 'normal' },
      { label: '疑似过敏', value: '疑似过敏', type: 'warning' },
      { label: '过敏', value: '过敏', type: 'danger' },
    ],
    saving: false,

    // ===== 预计算数据（解决 WXML 不支持箭头函数和 > 运算符）=====
    // 食物卡片类名映射
    foodClassMap: {},
    // 已选食物 ID → true/false（用于 wx:if 替代箭头函数）
    selectedSet: {},
    // 首次食物天数映射 foodId → dayIndex
    firstTimeDayIndexMap: {},
    // 过敏风险 → CSS类名
    riskClassMap: { '高': 'high', '中': 'mid', '低': 'low' },
    // 过敏风险 → 标签文字
    riskLabelMap: { '高': '高敏', '中': '中敏', '低': '低' },
  },

  onLoad() {
    const today = dateUtil.getTodayDateStr();
    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    this.setData({ today, 'recordForm.time': timeStr });
    this.buildCategoryTabs();
    this.updateDisplayFoods();
    this.recomputeAll();
  },

  /**
   * 统一重新计算所有预计算数据
   */
  recomputeAll() {
    this.computeFoodClassMap();
    this.computeSelectedSet();
    this.computeRiskMaps();
  },

  /**
   * 根据已选食物计算每个卡片的类名映射
   */
  computeFoodClassMap() {
    const { selectedFoods, displayFoods } = this.data;
    const map = {};
    const firstSelectedId = selectedFoods.length > 0 ? selectedFoods[0].id : null;
    displayFoods.forEach(f => {
      const isSelected = selectedFoods.some(sf => sf.id === f.id);
      if (isSelected) {
        const isFirst = f.id === firstSelectedId;
        map[f.id] = 'food-card food-card--selected' + (isFirst ? ' food-card--first' : '');
      } else {
        map[f.id] = 'food-card';
      }
    });
    this.setData({ foodClassMap: map });
  },

  /**
   * 计算 selectedSet（避免 WXML 里用箭头函数）
   */
  computeSelectedSet() {
    const { selectedFoods } = this.data;
    const set = {};
    selectedFoods.forEach(f => { set[f.id] = true; });
    this.setData({ selectedSet: set });
  },

  /**
   * 预计算过敏风险标签（一次性，非动态）
   */
  computeRiskMaps() {
    // 已在 data 里静态定义，这里不需要额外计算
  },

  /**
   * 构建分类 tab（基于 planCategories 的 10 大分类）
   */
  buildCategoryTabs() {
    // 使用 planCategories 的分类作为 tab 来源，保持与排敏计划一致
    const planCats = planCategories.getAllCategories();
    const tabs = [
      { id: 'all', name: '全部' },
      ...planCats.map(cat => ({
        id: cat.id,
        name: cat.name,
      })),
    ];
    this.setData({ categoryTabs: tabs });
  },

  /**
   * 切换分类
   */
  switchCategory(e) {
    const id = e.currentTarget.dataset.id;
    this.setData({ currentCategory: id });
    this.updateDisplayFoods();
    this.recomputeAll();
  },

  /**
   * 更新展示的食物列表
   */
  updateDisplayFoods() {
    const { currentCategory } = this.data;
    let foods = foodLibrary.getAllFoods();
    if (currentCategory !== 'all') {
      // plan category id 格式为 cat_grain，需去掉前缀匹配 food.category
      const foodCategory = currentCategory.startsWith('cat_')
        ? currentCategory.replace('cat_', '')
        : currentCategory;
      foods = foods.filter(f => f.category === foodCategory);
    }
    this.setData({ displayFoods: foods });
    this.recomputeAll();
  },

  /**
   * 选中食物
   */
  selectFood(e) {
    const id = e.currentTarget.dataset.id;
    const { selectedFoods } = this.data;
    const food = foodLibrary.getFoodById(id);
    if (!food) return;

    const idx = selectedFoods.findIndex(sf => sf.id === id);
    if (idx > -1) {
      this.setData({ selectedFoods: selectedFoods.filter(sf => sf.id !== id) });
    } else {
      this.setData({ selectedFoods: [...selectedFoods, food] });
    }
    this.recomputeAll();
  },

  /**
   * 移除已选食物
   */
  removeFood(e) {
    const id = e.currentTarget.dataset.id;
    this.setData({ selectedFoods: this.data.selectedFoods.filter(sf => sf.id !== id) });
    this.recomputeAll();
  },

  /**
   * 打开记录面板
   */
  openRecordPanel() {
    const { selectedFoods } = this.data;
    if (selectedFoods.length === 0) {
      wx.showToast({ title: '请先选择食物', icon: 'none' });
      return;
    }

    const allRecords = app.globalData.allRecords || [];
    const firstTimeInfos = [];
    const firstTimeDayIndexMap = {};

    selectedFoods.forEach(food => {
      const existing = allRecords.find(r => r.foodId === food.id);
      let dayIndex = 0;
      let isFirstTime = false;

      if (!existing) {
        isFirstTime = true;
        const cat = planCategories.getCategoryByFoodId(food.id);
        if (cat) {
          const catRecords = allRecords
            .filter(r => cat.foodIds.includes(r.foodId))
            .sort((a, b) => new Date(a.recordTime) - new Date(b.recordTime));
          if (catRecords.length > 0) {
            const firstDate = catRecords[0].recordTime.split('T')[0];
            const today = dateUtil.getTodayDateStr();
            dayIndex = planEngine.calcDayIndex(firstDate, today) + 1;
          } else {
            dayIndex = 1;
          }
        } else {
          dayIndex = 1;
        }
      }
      firstTimeInfos.push({ foodId: food.id, dayIndex, isFirstTime });
      firstTimeDayIndexMap[food.id] = dayIndex;
    });

    this.setData({
      showRecordPanel: true,
      firstTimeFoodInfo: firstTimeInfos,
      firstTimeDayIndexMap,
    });
  },

  closeRecordPanel() {
    this.setData({ showRecordPanel: false });
  },

  onTimeChange(e) {
    this.setData({ 'recordForm.time': e.detail.value });
  },

  onDateChange(e) {
    this.setData({ today: e.detail.value });
  },

  selectAmount(e) {
    this.setData({ 'recordForm.amount': e.currentTarget.dataset.value });
  },

  selectReaction(e) {
    this.setData({ 'recordForm.reaction': e.currentTarget.dataset.value });
  },

  onNoteInput(e) {
    this.setData({ 'recordForm.note': e.detail.value });
  },

  /**
   * 保存记录
   */
  saveRecord() {
    const { selectedFoods, recordForm, today, firstTimeFoodInfo, saving } = this.data;
    if (saving || selectedFoods.length === 0) return;

    this.setData({ saving: true });

    try {
      const recordTime = new Date(`${today}T${recordForm.time}:00`).toISOString();
      const newRecords = selectedFoods.map(food => {
        const ftInfo = firstTimeFoodInfo.find(f => f.foodId === food.id) || {};
        return {
          foodId: food.id,
          foodName: food.name,
          category: food.category,
          imageUrl: food.imageUrl,
          amount: recordForm.amount,
          reaction: recordForm.reaction,
          reactionNote: recordForm.note,
          isFirstTime: !!ftInfo.isFirstTime,
          dayIndex: ftInfo.dayIndex || 0,
          recordTime,
          recordedAt: new Date().toISOString(),
        };
      });

      app.saveRecords(newRecords);

      wx.showToast({ title: '记录成功', icon: 'success' });

      this.setData({
        showRecordPanel: false,
        selectedFoods: [],
        'recordForm.note': '',
        'recordForm.reaction': '正常',
        saving: false,
        firstTimeFoodInfo: null,
        firstTimeDayIndexMap: {},
      });

      setTimeout(() => wx.switchTab({ url: '/pages/index/index' }), 800);
    } catch (err) {
      console.error('[记录页] 保存失败:', err);
      wx.showToast({ title: '保存失败', icon: 'none' });
      this.setData({ saving: false });
    }
  },
});
