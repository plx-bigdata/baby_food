// pages/plan/plan.js — 辅食页逻辑

const app = getApp();
const planEngine = require('../../utils/plan-engine');
const planCategories = require('../../data/plan-categories');
const foodLibrary = require('../../data/food-library');
const dateUtil = require('../../utils/date');
const SHEET_ANIMATION_DURATION = 280;

Page({
  data: {
    // Tab 列表
    tabList: [],
    // 当前选中 Tab
    currentTab: 'all',
    currentTabName: '全部',
    showTabDropdown: false,
    currentCatStyle: '',
    // 品类颜色(背景 + 文字),与食物卡片色系统一
    catColorMap: {
      'cat_grain':     { bg: '#FFF4D4', text: '#A86B1A' },
      'cat_vegetable': { bg: '#E0F5E0', text: '#2E7D32' },
      'cat_fruit':     { bg: '#FFE0ED', text: '#B0185A' },
      'cat_meat':      { bg: '#FFE4D4', text: '#B85C00' },
      'cat_seafood':   { bg: '#D9ECFF', text: '#1A5FAB' },
      'cat_egg':       { bg: '#FFF4CC', text: '#8B6914' },
      'cat_legume':    { bg: '#E3F5CC', text: '#4F7A14' },
      'cat_dairy':     { bg: '#FFF7E0', text: '#9E7320' },
      'cat_nut':       { bg: '#FFE0D9', text: '#A83D28' },
      'cat_oil_fat':   { bg: '#F0F5CC', text: '#6B7A14' },
    },
    // 状态筛选
    statusList: [
      { id: 'all',     name: '全部',   color: '' },
      { id: 'passed',  name: '未过敏', color: '#52C41A' },
      { id: 'testing', name: '排敏中', color: '#FA8C16' },
      { id: 'allergy', name: '过敏',   color: '#FF4D4F' },
    ],
    currentStatus: 'all',
    currentStatusName: '全部',
    showStatusDropdown: false,
    // 当前显示的食物列表
    displayFoods: [],
    // 记录辅食覆盖层
    showRecordSheet: false,
    // 食物详情面板
    showFoodDetail: false,
    renderFoodDetail: false,
    detailFood: null,
    detailRecords: [],
    // 动态计算的高度（单位 px）
    foodScrollHeight: 400,
    detailScrollHeight: 300,
  },

  onLoad() {
    this._computeScrollHeights();
    this.buildTabs();
    this.rebuildCategoryStates();
  },

  _computeScrollHeights() {
    const info = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync();
    const winH = info.windowHeight;
    const safeBottom = info.safeArea ? (winH - info.safeArea.bottom) : 0;
    const tabbarH = 50 + safeBottom;

    // 食物网格 scroll-view：扣除 筛选下拉栏(~70px) + 余量(10px)
    const foodScrollHeight = winH - tabbarH - 70 - 10;
    // 食物详情面板 scroll-view：面板 max-height 80vh，扣除 handle+header ~92px
    const detailScrollHeight = winH * 0.8 - 92;

    this.setData({
      foodScrollHeight: Math.max(foodScrollHeight, 200),
      detailScrollHeight: Math.max(detailScrollHeight, 200),
    });
  },

  onShow() {
    const tabBar = this.getTabBar();
    if (tabBar) tabBar.setData({ currentSelected: 1 });
    this.refreshFromGlobal();
  },

  /**
   * 云同步完成后由 app.syncFromCloud 主动调用;onShow 也复用同一份逻辑
   */
  refreshFromGlobal() {
    const babyId = app.globalData.currentBabyId;
    if (babyId) {
      const records = wx.getStorageSync('allRecords_' + babyId) || [];
      const allergyLogs = wx.getStorageSync('allergyLogs_' + babyId) || [];
      app.globalData.allRecords = records;
      app.globalData.allergyLogs = allergyLogs;
    }
    this.rebuildCategoryStates();
  },

  noop() {},

  // ===== 记录辅食覆盖层 =====
  handleShowRecordSheet() {
    this.setData({ showRecordSheet: true });
  },
  onRecordSheetClose() {
    this.setData({ showRecordSheet: false });
  },
  onRecordSaved() {
    this.setData({ showRecordSheet: false });
    this.rebuildCategoryStates();
  },

  /**
   * 构建 Tab 列表
   */
  buildTabs() {
    const allCats = planCategories.getAllCategories();
    const tabs = [
      { id: 'all', name: '全部' },
      ...allCats.map(cat => ({ id: cat.id, name: cat.name })),
      { id: 'custom', name: '自定义' },
    ];
    this.setData({ tabList: tabs });
  },

  /**
   * 切换分类下拉展开/收起
   */
  toggleTabDropdown() {
    this.setData({
      showTabDropdown: !this.data.showTabDropdown,
      showStatusDropdown: false,
    });
  },

  toggleStatusDropdown() {
    this.setData({
      showStatusDropdown: !this.data.showStatusDropdown,
      showTabDropdown: false,
    });
  },

  closeDropdowns() {
    this.setData({ showTabDropdown: false, showStatusDropdown: false });
  },

  /**
   * 选择分类
   */
  selectTab(e) {
    const id = e.currentTarget.dataset.id;
    const item = this.data.tabList.find(t => t.id === id);
    if (!item) return;
    const meta = this.data.catColorMap[item.id];
    const currentCatStyle = meta
      ? `background:${meta.bg};border-color:${meta.bg};color:${meta.text};`
      : '';
    this.setData({
      currentTab: item.id,
      currentTabName: item.name,
      currentCatStyle,
      showTabDropdown: false,
    });
    this.buildFoods();
  },

  /**
   * 选择状态
   */
  selectStatus(e) {
    const id = e.currentTarget.dataset.id;
    const item = this.data.statusList.find(s => s.id === id);
    if (!item) return;
    this.setData({
      currentStatus: item.id,
      currentStatusName: item.name,
      showStatusDropdown: false,
    });
    this.buildFoods();
  },

  /**
   * 构建食物列表（按当前 Tab 过滤）
   */
  buildFoods() {
    const { currentTab } = this.data;
    const foodStatesMap = app.globalData.foodStates || {};
    const allCats = planCategories.getAllCategories();
    const babyId = app.globalData.currentBabyId || 'default';

    let foodIds = [];
    let includeCustom = false;
    if (currentTab === 'all') {
      allCats.forEach(cat => { foodIds.push(...cat.foodIds); });
      includeCustom = true;
    } else if (currentTab === 'custom') {
      includeCustom = true;
    } else {
      const cat = allCats.find(c => c.id === currentTab);
      if (cat) foodIds = cat.foodIds;
    }

    // 营养标签映射（数据依据：《中国食物成分表》第6版）
    const notableTagMap = {
      '高铁': '高铁', '铁强化': '高铁', '铁': '高铁',
      '维生素A': '高VA', 'β-胡萝卜素': '高VA',
      '维生素C': '高VC',
      '叶酸': '高叶酸', 'B族维生素': '高VB',
      '蛋白质': '高蛋白',
      'DHA': '高DHA', 'omega-3': '高ω-3', 'Ω-3': '高ω-3',
      '钙': '高钙', '钾': '高钾', '锌': '高锌',
      '膳食纤维': '高纤维', 'β-葡聚糖': '高纤维',
      '含麸质': '含麸质',
    };

    const catColorMap = {
      'cat_grain': '#FFF8E6',
      'cat_vegetable': '#F0FFF4',
      'cat_fruit': '#FFF0F5',
      'cat_meat': '#FFF5F0',
      'cat_seafood': '#F0F8FF',
      'cat_egg': '#FFF9E6',
      'cat_legume': '#F5FFF0',
      'cat_dairy': '#FFFDF5',
      'cat_nut': '#FFF5F5',
      'cat_oil_fat': '#F8FFF0',
    };

    const foods = foodIds.map(fid => {
      const food = foodLibrary.getFoodById(fid);
      if (!food) return null;
      const cat = planCategories.getCategoryByFoodId(fid);
      const state = foodStatesMap[fid] || {};
      const rawTags = food.tags || [];
      const filteredTags = rawTags
        .map(t => notableTagMap[t])
        .filter(t => t)
        .filter((label, idx, arr) => arr.indexOf(label) === idx)
        .slice(0, 3)
        .map(label => ({ label }));
      const bottomLabel = filteredTags.map(t => t.label).join(' · ');
      const catColor = cat ? (catColorMap[cat.id] || '#fff') : '#fff';
      const display = foodLibrary.getFoodDisplay(food);
      return {
        ...display,
        allergyRisk: food.allergyRisk || '低',
        status: state.status || 'pending',
        dayIndex: state.dayIndex || 0,
        totalDays: state.totalDays || 3,
        bottomLabel,
        catColor,
      };
    }).filter(f => f);

    // 追加自定义食物
    if (includeCustom) {
      const customFoods = foodLibrary.getCustomFoods(babyId).map(f => {
        const state = foodStatesMap[f.id] || {};
        const display = foodLibrary.getFoodDisplay(f);
        return {
          ...display,
          allergyRisk: f.allergyRisk || '低',
          status: state.status || 'pending',
          dayIndex: state.dayIndex || 0,
          totalDays: state.totalDays || 3,
          bottomLabel: '',
          catColor: '#fff',
        };
      });
      foods.push(...customFoods);
    }

    // 状态筛选
    const { currentStatus } = this.data;
    let filtered = foods;
    if (currentStatus === 'passed') {
      filtered = foods.filter(f => f.status === 'passed' || f.status === 'preliminary');
    } else if (currentStatus === 'testing') {
      filtered = foods.filter(f => f.status === 'testing');
    } else if (currentStatus === 'allergy') {
      filtered = foods.filter(f => f.status === 'allergy');
    }

    this.setData({ displayFoods: filtered });
  },

  /**
   * 根据所有记录重新计算各食物状态
   */
  rebuildCategoryStates() {
    const records = app.globalData.allRecords || [];
    const allergyLogs = app.globalData.allergyLogs || [];
    const babySettings = app.globalData.currentBaby?.settings || {};
    const settings = { testDays: babySettings.testDays || 3 };

    // 引导时直接标记的安全状态（无记录，通过此表读取）
    const babyId = app.globalData.currentBabyId || 'default';
    const onboardingStates = app.globalData.onboardingStates
      || wx.getStorageSync(`onboardingStates_${babyId}`) || {};
    const customFoods = foodLibrary.getCustomFoods(babyId);
    const foodStatesMap = planEngine.computeAllFoodStates(
      records,
      allergyLogs,
      settings,
      onboardingStates,
      customFoods
    );

    app.globalData.foodStates = foodStatesMap;
    this.buildFoods();
  },

  /**
   * 添加自定义食物
   */
  addCustomFood() {
    wx.showModal({
      title: '添加自定义食物',
      editable: true,
      placeholderText: '食物名称',
      success: (res) => {
        if (!res.confirm) return;
        const name = (res.content || '').trim();
        if (!name) {
          wx.showToast({ title: '请输入名称', icon: 'none' });
          return;
        }
        const babyId = app.globalData.currentBabyId || 'default';
        const existing = foodLibrary.getCustomFoods(babyId);
        if (existing.some(f => f.name === name)) {
          wx.showToast({ title: '已有同名食物', icon: 'none' });
          return;
        }
        const newFood = {
          id: foodLibrary.generateCustomFoodId(),
          name,
          category: 'custom',
          allergyRisk: '低',
          recommendMonth: 6,
          isCustom: true,
        };
        const updated = [...existing, foodLibrary.enrichCustomFood(newFood)];
        foodLibrary.saveCustomFoods(babyId, updated);
        this.setData({
          currentTab: 'custom',
          currentTabName: '自定义',
          currentCatStyle: '',
        });
        this.rebuildCategoryStates();
      },
    });
  },

  /**
   * 显示食物详情
   */
  showFoodDetail(e) {
    const foodId = e.currentTarget.dataset.id;
    let food = foodLibrary.getFoodById(foodId);
    if (!food) {
      const babyId = app.globalData.currentBabyId || 'default';
      const customFoods = foodLibrary.getCustomFoods(babyId);
      food = customFoods.find(f => f.id === foodId) || null;
    }
    if (!food) return;

    const babyId = app.globalData.currentBabyId;
    const allRecords = wx.getStorageSync('allRecords_' + babyId) || [];
    const allergyLogs = wx.getStorageSync('allergyLogs_' + babyId) || [];
    app.globalData.allRecords = allRecords;
    app.globalData.allergyLogs = allergyLogs;

    const foodStatesMap = app.globalData.foodStates || {};
    const state = foodStatesMap[foodId] || {};

    const foodRecords = allRecords.filter(r => r.foodId === foodId);

    const dateMap = {};
    foodRecords.forEach(r => {
      const dateStr = dateUtil.getRecordDate(r);
      if (!dateStr || !r.recordTime) return;
      if (!dateMap[dateStr]) {
        dateMap[dateStr] = { dateStr, times: [], reaction: '', reactionClass: 'normal' };
      }
      const d = new Date(r.recordTime);
      const t = `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
      dateMap[dateStr].times.push(t);
      if (r.reaction === '过敏') {
        dateMap[dateStr].reaction = '过敏'; dateMap[dateStr].reactionClass = 'danger';
      } else if (r.reaction === '疑似过敏' && dateMap[dateStr].reactionClass !== 'danger') {
        dateMap[dateStr].reaction = '疑似过敏'; dateMap[dateStr].reactionClass = 'warning';
      }
    });

    const detailRecords = Object.values(dateMap)
      .sort((a, b) => b.dateStr.localeCompare(a.dateStr))
      .map(item => ({ ...item, timesStr: item.times.sort().join('  ') }));

    this.setData({
      renderFoodDetail: true,
      showFoodDetail: false,
      detailFood: {
        ...foodLibrary.getFoodDisplay(food),
        status: state.status || 'pending',
        statusText: (state.status === 'passed' || state.status === 'preliminary')
          ? '未过敏'
          : state.status === 'testing'
            ? '排敏中'
            : state.status === 'allergy'
              ? '过敏'
              : '待开始',
      },
      detailRecords,
    }, () => {
      setTimeout(() => this.setData({ showFoodDetail: true }), 16);
    });
  },

  closeFoodDetail() {
    if (!this.data.renderFoodDetail && !this.data.showFoodDetail) return;
    this.setData({ showFoodDetail: false }, () => {
      clearTimeout(this._detailTimer);
      this._detailTimer = setTimeout(() => {
        this.setData({ renderFoodDetail: false });
      }, SHEET_ANIMATION_DURATION);
    });
  },

  _detailDragY: 0,
  onDetailDragStart(e) {
    this._detailDragY = e.touches[0].clientY;
  },
  onDetailDragEnd(e) {
    if (e.changedTouches[0].clientY - this._detailDragY > 80) {
      this.closeFoodDetail();
    }
  },

  /**
   * 删除食物详情里某天的所有食用记录
   */
  onDeleteDetailRecord(e) {
    const { date, count } = e.currentTarget.dataset;
    const foodId = this.data.detailFood && this.data.detailFood.id;
    if (!foodId || !date) return;
    const n = parseInt(count, 10) || 1;
    wx.showModal({
      title: '删除食用记录',
      content: `将删除 ${date} 当天 ${n} 次食用记录,确定继续?`,
      confirmColor: '#FF4757',
      success: (res) => {
        if (!res.confirm) return;
        const removed = app.deleteFoodRecordsByDay(foodId, date);
        if (!removed) {
          wx.showToast({ title: '未找到记录', icon: 'none' });
          return;
        }
        wx.showToast({ title: '已删除', icon: 'success' });
        this.rebuildCategoryStates();
        // 只更新 detailRecords,不闪动面板
        const newList = (this.data.detailRecords || []).filter(r => r.dateStr !== date);
        this.setData({ detailRecords: newList });
      },
    });
  },
});
