// pages/plan/plan.js — 排敏计划页逻辑

const app = getApp();
const dateUtil = require('../../utils/date');
const planEngine = require('../../utils/plan-engine');
const planCategories = require('../../data/plan-categories');
const foodLibrary = require('../../data/food-library');

Page({
  data: {
    // Tab 列表
    tabList: [],
    // 当前选中 Tab
    currentTab: 'all',
    // 当前显示的食物列表
    displayFoods: [],
    // 食物详情面板
    showFoodDetail: false,
    detailFood: null,
    detailRecords: [],
    // 颜色图例
    legend: [
      { label: '排敏中', colorClass: 'testing', color: '#FAAD14' },
      { label: '安全', colorClass: 'passed', color: '#52C41A' },
      { label: '过敏', colorClass: 'allergy', color: '#FF4D4F' },
    ],
    // 状态统计
    stats: { testing: 0, passed: 0, allergy: 0, pending: 0 },
  },

  onLoad() {
    this.buildTabs();
    this.buildFoods();
  },

  onShow() {
    // 强制从 storage 重新读取最新数据
    const babyId = app.globalData.currentBabyId;
    if (babyId) {
      const records = wx.getStorageSync('allRecords_' + babyId) || [];
      const allergyLogs = wx.getStorageSync('allergyLogs_' + babyId) || [];
      app.globalData.allRecords = records;
      app.globalData.allergyLogs = allergyLogs;
    }
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
    ];
    this.setData({ tabList: tabs });
  },

  /**
   * 切换 Tab
   */
  switchTab(e) {
    const id = e.currentTarget.dataset.id;
    this.setData({ currentTab: id });
    this.buildFoods();
  },

  /**
   * 构建食物列表（按当前 Tab 过滤）
   */
  buildFoods() {
    const { currentTab } = this.data;
    const foodStatesMap = app.globalData.foodStates || {};
    const allCats = planCategories.getAllCategories();

    let foodIds = [];
    if (currentTab === 'all') {
      // 全部：收集所有食物
      allCats.forEach(cat => {
        foodIds.push(...cat.foodIds);
      });
    } else {
      // 指定分类
      const cat = allCats.find(c => c.id === currentTab);
      if (cat) foodIds = cat.foodIds;
    }

    const foods = foodIds.map(fid => {
      const food = foodLibrary.getFoodById(fid);
      if (!food) return null;
      const state = foodStatesMap[fid] || {};
      return {
        id: food.id,
        name: food.name,
        imageUrl: food.imageUrl,
        status: state.status || 'pending',
        dayIndex: state.dayIndex || 0,
      };
    }).filter(f => f);

    this.setData({ displayFoods: foods });
  },

  /**
   * 根据所有记录重新计算各分类状态
   */
  rebuildCategoryStates() {
    const allCats = planCategories.getAllCategories();
    const records = app.globalData.allRecords || [];
    const allergyLogs = app.globalData.allergyLogs || [];
    const settings = app.globalData.currentBaby?.settings || { testDays: 3 };
    const today = dateUtil.getTodayDateStr();

    // 计算每个食物的状态
    const foodStatesMap = {};
    allCats.forEach(cat => {
      cat.foodIds.forEach(fid => {
        const food = foodLibrary.getFoodById(fid);
        if (!food) return;
        const foodRecords = records.filter(r => r.foodId === fid);
        const foodAllergy = allergyLogs.filter(log => log.confirmedFood === fid);

        let status = 'pending';
        let startDate = null;
        let dayIndex = 0;

        if (foodAllergy.length > 0) {
          status = 'allergy';
        } else if (foodRecords.length > 0) {
          // 计算这个食物被记录过的不同天数（去重日期），排除未来日期
          const uniqueDates = new Set();
          const todayDate = new Date(today);
          foodRecords.forEach(r => {
            if (r.recordTime) {
              const recordDate = new Date(r.recordTime.split('T')[0]);
              // 只算今天或之前的日期
              if (recordDate <= todayDate) {
                uniqueDates.add(r.recordTime.split('T')[0]);
              }
            }
          });
          dayIndex = uniqueDates.size;

          // 状态判断：基于记录天数
          if (dayIndex >= settings.testDays) {
            status = 'passed';
          } else {
            status = 'testing';
          }

          // startDate 取最早的记录日期（排除未来日期）
          const pastRecords = foodRecords.filter(r => {
            if (!r.recordTime) return false;
            return new Date(r.recordTime.split('T')[0]) <= todayDate;
          });
          const sorted = [...pastRecords].sort((a, b) =>
            new Date(a.recordTime) - new Date(b.recordTime)
          );
          if (sorted[0] && sorted[0].recordTime) {
            startDate = sorted[0].recordTime.split('T')[0];
          }
        } else {
          // no records for this food
        }

        foodStatesMap[fid] = {
          id: fid,
          name: food.name,
          imageUrl: food.imageUrl,
          status,
          startDate,
          dayIndex,
          totalDays: settings.testDays,
          recordCount: foodRecords.length,
        };
      });
    });

    app.globalData.foodStates = foodStatesMap;

    // 统计汇总
    let testingTotal = 0;
    let passedTotal = 0;
    let allergyTotal = 0;

    Object.values(foodStatesMap).forEach(f => {
      if (f.status === 'testing') testingTotal++;
      else if (f.status === 'passed') passedTotal++;
      else if (f.status === 'allergy') allergyTotal++;
    });

    this.setData({
      stats: {
        testing: testingTotal,
        passed: passedTotal,
        allergy: allergyTotal,
        pending: 0,
      },
    });

    this.buildFoods();
  },

  /**
   * 显示食物详情
   */
  showFoodDetail(e) {
    const foodId = e.currentTarget.dataset.id;
    const food = foodLibrary.getFoodById(foodId);

    // 直接从 storage 读取最新数据
    const babyId = app.globalData.currentBabyId;
    const allRecords = wx.getStorageSync('allRecords_' + babyId) || [];
    const allergyLogs = wx.getStorageSync('allergyLogs_' + babyId) || [];
    app.globalData.allRecords = allRecords;
    app.globalData.allergyLogs = allergyLogs;

    const foodStatesMap = app.globalData.foodStates || {};
    const state = foodStatesMap[foodId] || {};

    // 找到该食物的所有记录
    const foodRecords = allRecords
      .filter(r => r.foodId === foodId)
      .sort((a, b) => new Date(b.recordTime) - new Date(a.recordTime));

    const detailRecords = foodRecords.map(r => {
      const d = new Date(r.recordTime);
      const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const timeStr = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
      let reactionClass = 'normal';
      if (r.reaction === '过敏') reactionClass = 'danger';
      else if (r.reaction === '疑似过敏') reactionClass = 'warning';
      return {
        dateStr,
        timeStr,
        mealType: r.mealType || 1,
        reaction: r.reaction || '正常',
        reactionClass,
      };
    });

    this.setData({
      showFoodDetail: true,
      detailFood: {
        id: food.id,
        name: food.name,
        imageUrl: food.imageUrl,
        status: state.status || 'pending',
      },
      detailRecords,
    });
  },

  /**
   * 关闭食物详情
   */
  closeFoodDetail() {
    this.setData({ showFoodDetail: false });
  },
});
