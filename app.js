// app.js — 小程序入口

App({
  /**
   * 全局数据
   */
  globalData: {
    // 宝宝列表
    babies: [],
    // 当前宝宝 ID
    currentBabyId: '',
    // 当前宝宝信息
    currentBaby: null,
    // 微信用户信息
    userInfo: null,
    // openid
    openid: '',
    // 是否已初始化云环境
    cloudReady: false,
    // 本地模拟数据（当前宝宝）
    allRecords: [],
    allergyLogs: [],
    todayRecords: [],
    foodStates: {},
    categoryStates: {},
  },

  /**
   * 小程序启动时执行
   */
  onLaunch() {
    // 初始化云开发环境
    if (wx.cloud) {
      wx.cloud.init({
        env: 'your-cloud-env-id',
        traceUser: true,
      });
      this.globalData.cloudReady = true;
    }

    // 加载用户信息
    const userInfo = wx.getStorageSync('userInfo') || {};
    this.globalData.userInfo = userInfo;

    // 加载宝宝列表
    const babies = wx.getStorageSync('babies') || [];
    this.globalData.babies = babies;

    // 加载当前宝宝 ID
    let currentBabyId = wx.getStorageSync('currentBabyId') || '';

    if (babies.length === 0) {
      // 初始化第一个宝宝（演示数据）
      const firstBaby = {
        _id: 'baby_001',
        name: '小豆芽',
        birthday: '2025-07-15',
        height: 72,
        weight: 9.2,
        avatarUrl: '',
        settings: { testDays: 3, dailyNewFoodLimit: 1 },
      };
      babies.push(firstBaby);
      wx.setStorageSync('babies', babies);
      currentBabyId = firstBaby._id;
      wx.setStorageSync('currentBabyId', currentBabyId);
    }

    this.globalData.currentBabyId = currentBabyId;

    // 加载当前宝宝的数据
    this.loadBabyData(currentBabyId);
  },

  /**
   * 加载指定宝宝的数据
   */
  loadBabyData(babyId) {
    const baby = this.globalData.babies.find(b => b._id === babyId);
    if (!baby) return;

    this.globalData.currentBaby = baby;
    this.globalData.currentBabyId = babyId;
    wx.setStorageSync('currentBabyId', babyId);

    // 加载该宝宝的历史记录
    const allRecords = wx.getStorageSync(`allRecords_${babyId}`) || [];
    const allergyLogs = wx.getStorageSync(`allergyLogs_${babyId}`) || [];
    const todayRecords = wx.getStorageSync(`todayRecords_${babyId}`) || [];

    this.globalData.allRecords = allRecords;
    this.globalData.allergyLogs = allergyLogs;
    this.globalData.todayRecords = todayRecords;

    // 初始化今日记录（日期变化时重置）
    this.initTodayRecords();
  },

  /**
   * 初始化今日记录（日期变化时自动重置）
   */
  initTodayRecords() {
    const today = this.getTodayStr();
    const storedDate = wx.getStorageSync('todayDate');
    if (storedDate !== today) {
      this.globalData.todayRecords = [];
      wx.setStorageSync('todayDate', today);
      // 保存今日记录（空）
      wx.setStorageSync(`todayRecords_${this.globalData.currentBabyId}`, []);
    }
  },

  /**
   * 获取今天日期字符串 YYYY-MM-DD
   */
  getTodayStr() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  },

  /**
   * 切换宝宝
   */
  switchBaby(babyId) {
    if (babyId === this.globalData.currentBabyId) return;
    // 先保存当前宝宝的数据
    this.saveCurrentBabyData();
    // 切换并加载新宝宝数据
    this.loadBabyData(babyId);
  },

  /**
   * 保存当前宝宝的数据到 storage
   */
  saveCurrentBabyData() {
    const { currentBabyId, allRecords, allergyLogs, todayRecords } = this.globalData;
    if (!currentBabyId) return;
    wx.setStorageSync(`allRecords_${currentBabyId}`, allRecords);
    wx.setStorageSync(`allergyLogs_${currentBabyId}`, allergyLogs);
    wx.setStorageSync(`todayRecords_${currentBabyId}`, todayRecords);
  },

  /**
   * 添加新宝宝
   */
  addBaby(babyInfo) {
    const id = `baby_${Date.now()}`;
    const newBaby = {
      _id: id,
      name: babyInfo.name || '',
      birthday: babyInfo.birthday || '',
      height: babyInfo.height || null,
      weight: babyInfo.weight || null,
      avatarUrl: babyInfo.avatarUrl || '',
      settings: { testDays: 3, dailyNewFoodLimit: 1 },
    };
    this.globalData.babies.push(newBaby);
    wx.setStorageSync('babies', this.globalData.babies);
    return newBaby;
  },

  /**
   * 更新宝宝信息
   */
  updateBaby(babyId, updates) {
    const babies = this.globalData.babies;
    const idx = babies.findIndex(b => b._id === babyId);
    if (idx === -1) return;
    babies[idx] = { ...babies[idx], ...updates };
    this.globalData.babies = babies;
    wx.setStorageSync('babies', babies);
    if (babyId === this.globalData.currentBabyId) {
      this.globalData.currentBaby = babies[idx];
    }
  },

  /**
   * 删除宝宝
   */
  deleteBaby(babyId) {
    const babies = this.globalData.babies.filter(b => b._id !== babyId);
    this.globalData.babies = babies;
    wx.setStorageSync('babies', babies);
    // 清除该宝宝的 storage
    wx.removeStorageSync(`allRecords_${babyId}`);
    wx.removeStorageSync(`allergyLogs_${babyId}`);
    wx.removeStorageSync(`todayRecords_${babyId}`);
    // 如果删除的是当前宝宝，切换到第一个
    if (babyId === this.globalData.currentBabyId) {
      if (babies.length > 0) {
        this.switchBaby(babies[0]._id);
      } else {
        this.globalData.currentBabyId = '';
        this.globalData.currentBaby = null;
        wx.setStorageSync('currentBabyId', '');
      }
    }
  },

  /**
   * 小程序进入前台
   */
  onShow() {},

  /**
   * 小程序进入后台
   */
  onHide() {
    // 离开时保存当前宝宝数据
    this.saveCurrentBabyData();
  },

  /**
   * 全局错误处理
   */
  onError(msg) {
    console.error('[App] 全局错误:', msg);
  },

  /**
   * 保存辅食记录
   */
  saveRecords(records) {
    const allRecords = this.globalData.allRecords || [];
    const todayRecords = this.globalData.todayRecords || [];
    const newAll = [...allRecords, ...records];
    const newToday = [...todayRecords, ...records];
    this.globalData.allRecords = newAll;
    this.globalData.todayRecords = newToday;
    wx.setStorageSync(`allRecords_${this.globalData.currentBabyId}`, newAll);
    wx.setStorageSync(`todayRecords_${this.globalData.currentBabyId}`, newToday);
  },

  /**
   * 保存过敏日志
   */
  saveAllergyLog(log) {
    const logs = this.globalData.allergyLogs || [];
    const newLogs = [...logs, log];
    this.globalData.allergyLogs = newLogs;
    wx.setStorageSync(`allergyLogs_${this.globalData.currentBabyId}`, newLogs);
  },
});
