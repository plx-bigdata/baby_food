// pages/record/record.js — 辅食记录页逻辑

const app = getApp();
const dateUtil = require('../../utils/date');
const planEngine = require('../../utils/plan-engine');
const foodLibrary = require('../../data/food-library');
const planCategories = require('../../data/plan-categories');
const SHEET_ANIMATION_DURATION = 280;

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
    renderRecordPanel: false,
    // 记录表单
    recordForm: {
      time: '',
    },
    saving: false,
    closing: false,
    hasSelected: false,

    // ===== 预计算数据（解决 WXML 不支持箭头函数和 > 运算符）=====
    // 食物卡片类名映射
    foodClassMap: {},
    // 已选食物 ID → true/false（用于 wx:if 替代箭头函数）
    selectedSet: {},
    // 食物天数标签 foodId → { label, type }
    foodDayLabelMap: {},
    // 过敏风险 → CSS类名
    riskClassMap: { '高': 'danger', '中': 'mid', '低': 'low' },
    // 过敏风险 → 标签文字
    riskLabelMap: { '高': '高敏', '中': '中敏', '低': '低' },
    // 自定义食物
    customFoods: [],
    newCustomFoodName: '',

    // 搜索关键词
    searchKeyword: '',

    // 食材 ID → 状态（pending/testing/passed/preliminary/allergy），用于显示状态角标
    foodStatusMap: {},
  },

  onLoad() {
    const today = dateUtil.getTodayDateStr();
    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    // 构建分类 tabs
    const planCats = planCategories.getAllCategories();
    const categoryTabs = [
      { id: 'all', name: '全部' },
      ...planCats.map(cat => ({ id: cat.id, name: cat.name })),
      { id: 'custom', name: '自定义' },
    ];

    // 加载自定义食物
    const babyId = app.globalData.currentBabyId || 'default';
    const customFoods = foodLibrary.getCustomFoods(babyId);

    // 构建食物列表(全部 tab = 官方 + 自定义)
    const displayFoods = [...foodLibrary.getAllFoods(), ...customFoods];

    // 预计算 foodClassMap（初始无选中，全部为默认类名）
    const foodClassMap = {};
    displayFoods.forEach(f => { foodClassMap[f.id] = 'food-card'; });

    // 一次性 setData，避免多次渲染抖动
    this.setData({
      today,
      'recordForm.time': timeStr,
      categoryTabs,
      displayFoods,
      customFoods,
      foodClassMap,
      selectedSet: {},
      hasSelected: false,
    });

    // 计算当前是否有食材处于"排敏中"以及各食材的禁用状态
    this._computeTestingFood();
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
   * 计算各食材的当前状态，用于显示角标
   */
  _computeTestingFood() {
    const app = getApp();
    const records = app.globalData.allRecords || [];
    const allergyLogs = app.globalData.allergyLogs || [];
    const babyId = app.globalData.currentBabyId || 'default';
    const settings = app.globalData.currentBaby?.settings || {};
    const testDays = settings.testDays || 3;
    const onboardingStates = app.globalData.onboardingStates
      || wx.getStorageSync(`onboardingStates_${babyId}`) || {};
    const customFoods = foodLibrary.getCustomFoods(babyId);

    const states = planEngine.computeAllFoodStates(
      records,
      allergyLogs,
      { testDays },
      onboardingStates,
      customFoods
    );
    app.globalData.foodStates = states;

    const statusMap = {};
    for (const [foodId, state] of Object.entries(states)) {
      statusMap[foodId] = state.status || 'pending';
    }

    this.setData({ foodStatusMap: statusMap });
  },
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
      { id: 'custom', name: '自定义' },
    ];
    this.setData({ categoryTabs: tabs });
  },

  /**
   * 切换分类
   */
  switchCategory(e) {
    const id = e.currentTarget.dataset.id;
    this.setData({ currentCategory: id }, () => {
      this.updateDisplayFoods();
    });
  },

  /**
   * 搜索框输入
   */
  onSearchInput(e) {
    this.setData({ searchKeyword: e.detail.value }, () => {
      this.updateDisplayFoods();
    });
  },

  /**
   * 清空搜索
   */
  clearSearch() {
    this.setData({ searchKeyword: '' }, () => {
      this.updateDisplayFoods();
    });
  },

  /**
   * 更新展示的食物列表
   */
  updateDisplayFoods() {
    const { currentCategory, selectedFoods, customFoods, searchKeyword } = this.data;
    const kw = (searchKeyword || '').trim().toLowerCase();
    let foods;
    if (kw) {
      // 搜索模式:跨分类,在官方 + 自定义全集中按名称过滤
      const all = [...foodLibrary.getAllFoods(), ...customFoods];
      foods = all.filter(f => (f.name || '').toLowerCase().includes(kw));
    } else if (currentCategory === 'custom') {
      foods = customFoods;
    } else if (currentCategory === 'all') {
      foods = [...foodLibrary.getAllFoods(), ...customFoods];
    } else {
      const foodCategory = currentCategory.startsWith('cat_')
        ? currentCategory.replace('cat_', '')
        : currentCategory;
      foods = foodLibrary.getFoodsByCategory(foodCategory);
    }
    // 同步重算 foodClassMap，合并成一次 setData
    const firstSelectedId = selectedFoods.length > 0 ? selectedFoods[0].id : null;
    const foodClassMap = {};
    foods.forEach(f => {
      const isSelected = selectedFoods.some(sf => sf.id === f.id);
      if (isSelected) {
        foodClassMap[f.id] = 'food-card food-card--selected' + (f.id === firstSelectedId ? ' food-card--first' : '');
      } else {
        foodClassMap[f.id] = 'food-card';
      }
    });
    this.setData({ displayFoods: foods, foodClassMap });
  },

  /**
   * 选中食物（无限制，自由选择）
   */
  selectFood(e) {
    const id = e.currentTarget.dataset.id;
    const { selectedFoods, displayFoods } = this.data;

    // 优先从当前显示列表中查找（自定义食物不在 foodLibrary 中）
    let food = displayFoods.find(f => f.id === id);
    if (!food) food = foodLibrary.getFoodById(id);
    if (!food) return;

    const idx = selectedFoods.findIndex(sf => sf.id === id);
    const newSelected = idx > -1
      ? selectedFoods.filter(sf => sf.id !== id)
      : [...selectedFoods, food];

    this._applySelection(newSelected, displayFoods);
  },

  removeFood(e) {
    const id = e.currentTarget.dataset.id;
    const { selectedFoods, displayFoods } = this.data;
    this._applySelection(selectedFoods.filter(sf => sf.id !== id), displayFoods);
  },

  // 内部辅助：更新选中状态并一次性 setData
  _applySelection(newSelected, displayFoods) {
    const firstId = newSelected.length > 0 ? newSelected[0].id : null;
    const selectedSet = {};
    const foodClassMap = {};
    newSelected.forEach(f => { selectedSet[f.id] = true; });
    displayFoods.forEach(f => {
      if (selectedSet[f.id]) {
        foodClassMap[f.id] = 'food-card food-card--selected' + (f.id === firstId ? ' food-card--first' : '');
      } else {
        foodClassMap[f.id] = 'food-card';
      }
    });
    this.setData({ selectedFoods: newSelected, selectedSet, foodClassMap, hasSelected: newSelected.length > 0 });
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
    const foodStates = app.globalData.foodStates || {};
    const foodDayLabelMap = {};

    selectedFoods.forEach(food => {
      const state = foodStates[food.id] || {};
      const foodStatus = state.status || 'pending';

      // 过敏或已确认未过敏
      if (foodStatus === 'allergy') {
        foodDayLabelMap[food.id] = { label: '过敏', type: 'danger' };
      } else if (foodStatus === 'passed' || foodStatus === 'preliminary') {
        foodDayLabelMap[food.id] = { label: '未过敏', type: 'safe' };
      } else {
        // 计算这个食物本身被吃过的次数
        const foodRecords = allRecords
          .filter(r => r.foodId === food.id)
          .sort((a, b) => new Date(b.recordTime) - new Date(a.recordTime));
        const eatenCount = foodRecords.length;

        if (eatenCount === 0) {
          // 从没吃过
          foodDayLabelMap[food.id] = { label: '第1天·首次', type: 'testing' };
        } else {
          // 吃过了，本次是第几天
          foodDayLabelMap[food.id] = { label: '第' + (eatenCount + 1) + '天', type: 'testing' };
        }
      }
    });

    this.setData({
      renderRecordPanel: true,
      showRecordPanel: false,
      foodDayLabelMap,
    }, () => {
      setTimeout(() => this.setData({ showRecordPanel: true }), 16);
    });
  },

  closeRecordPanel() {
    if (!this.data.renderRecordPanel && !this.data.showRecordPanel) return;
    this.setData({ showRecordPanel: false }, () => {
      clearTimeout(this._recordPanelTimer);
      this._recordPanelTimer = setTimeout(() => {
        this.setData({ renderRecordPanel: false });
      }, SHEET_ANIMATION_DURATION);
    });
  },

  _recordPanelDragY: 0,
  onRecordPanelDragStart(e) {
    this._recordPanelDragY = e.touches[0].clientY;
  },
  onRecordPanelDragEnd(e) {
    if (e.changedTouches[0].clientY - this._recordPanelDragY > 80) {
      this.closeRecordPanel();
    }
  },

  /** ===== 自定义食物 ===== */
  onCustomFoodNameInput(e) {
    this.setData({ newCustomFoodName: e.detail.value });
  },

  addCustomFood() {
    const name = this.data.newCustomFoodName.trim();
    if (!name) {
      wx.showToast({ title: '请输入食物名称', icon: 'none' });
      return;
    }
    const babyId = app.globalData.currentBabyId || 'default';
    const newFood = {
      id: foodLibrary.generateCustomFoodId(),
      name,
      category: 'custom',
      allergyRisk: '低',
      recommendMonth: null,
      isCustom: true,
    };
    foodLibrary.enrichCustomFood(newFood);
    const customFoods = [...this.data.customFoods, newFood];
    foodLibrary.saveCustomFoods(babyId, customFoods);
    this.setData({ customFoods, newCustomFoodName: '' });
    if (this.data.currentCategory === 'custom') {
      this.updateDisplayFoods();
    }
  },

  deleteCustomFood(e) {
    const id = e.currentTarget.dataset.id;
    const babyId = app.globalData.currentBabyId || 'default';
    const customFoods = this.data.customFoods.filter(f => f.id !== id);
    foodLibrary.saveCustomFoods(babyId, customFoods);
    this.setData({ customFoods });
    if (this.data.currentCategory === 'custom') {
      this.updateDisplayFoods();
    }
  },

  goBack() {
    this.setData({ closing: true });
    setTimeout(() => {
      wx.navigateBack({
        delta: 1,
        fail: () => {
          const app = getApp();
          const returnUrl = app.globalData.recordReturnUrl || '/pages/index/index';
          wx.reLaunch({ url: returnUrl });
        },
      });
    }, 280);
  },

  // 拖拽关闭手势（sheet-body 非 scroll-view 区域共用）
  _sheetDragY: 0,
  _sheetDragging: false,
  onSheetDragStart(e) {
    this._sheetDragY = e.touches[0].clientY;
    this._sheetDragging = true;
  },
  onSheetDragMove(e) {
    if (this._sheetDragging) {
      this._sheetDragY = e.touches[0].clientY;
    }
  },
  onSheetDragEnd(e) {
    if (!this._sheetDragging) return;
    const delta = e.changedTouches[0].clientY - this._sheetDragY;
    this._sheetDragging = false;
    if (delta > 80) this.goBack();
  },

  // scroll-view 区域下滑关闭：需在内容滚到顶部时下拉才关闭
  _foodGridAtTop: true,
  _foodGridDragY: 0,
  _foodGridStartAtTop: false,
  onFoodGridScrollUpper() {
    this._foodGridAtTop = true;
  },
  onFoodGridScroll(e) {
    this._foodGridAtTop = (e.detail.scrollTop || 0) <= 0;
  },
  onFoodGridDragStart(e) {
    this._foodGridDragY = e.touches[0].clientY;
    this._foodGridStartAtTop = this._foodGridAtTop;
  },
  onFoodGridDragEnd(e) {
    const delta = e.changedTouches[0].clientY - this._foodGridDragY;
    if (this._foodGridStartAtTop && delta > 80) this.goBack();
    this._foodGridStartAtTop = false;
  },

  onTimeChange(e) {
    this.setData({ 'recordForm.time': e.detail.value });
  },

  onDateChange(e) {
    this.setData({ today: e.detail.value });
  },

  /**
   * 保存记录
   */
  saveRecord() {
    const { selectedFoods, recordForm, today, saving } = this.data;
    if (saving || selectedFoods.length === 0) return;

    this.setData({ saving: true });

    try {
      const allRecords = app.globalData.allRecords || [];
      const recordTime = `${today}T${recordForm.time}:00`;
      const newRecords = selectedFoods.map(food => {
        const foodRecords = allRecords.filter(r => r.foodId === food.id);
        const isFirstTime = foodRecords.length === 0;
        return {
          foodId: food.id,
          foodName: food.name,
          category: food.category,
          imageUrl: food.imageUrl,
          reaction: '正常',
          isFirstTime,
          dayIndex: foodRecords.length + 1,
          recordTime,
          recordDate: today,
          recordedAt: new Date().toISOString(),
        };
      });

      app.saveRecords(newRecords);

      wx.showToast({ title: '记录成功', icon: 'success' });

      // 关闭记录页
      setTimeout(() => {
        wx.navigateBack({
          delta: 1,
          fail: () => {
            const app = getApp();
            const returnUrl = app.globalData.recordReturnUrl || '/pages/index/index';
            wx.reLaunch({ url: returnUrl });
          },
        });
      }, 500);
    } catch (err) {
      console.error('[记录页] 保存失败:', err);
      wx.showToast({ title: '保存失败', icon: 'none' });
      this.setData({ saving: false });
    }
  },

  noop() {},
});
