// pages/index/index.js — 首页逻辑

const app = getApp();
const dateUtil = require('../../utils/date');
const planEngine = require('../../utils/plan-engine');
const suggestionEngine = require('../../utils/suggestion-engine');
const planCategories = require('../../data/plan-categories');
const SHEET_ANIMATION_DURATION = 280;

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
    renderBabySwitcher: false,
    // 添加/编辑宝宝弹窗
    showAddBabyForm: false,
    renderAddBabyForm: false,
    editingBabyId: '', // 非空 = 编辑模式,空 = 新增模式
    babyForm: {
      name: '',
      birthday: '',
      avatarUrl: '',
      gender: '',
      feedingType: '',
    },
    // 排敏进度
    planStats: { passed: 0, total: 0, percent: 0, allergy: 0, testing: 0, tried: 0, testDays: 3 },
    // 已排敏食物列表
    passedFoods: [],
    // 过敏食物列表
    allergyFoods: [],
    // 排敏中食物列表
    testingFoods: [],
    // 列表展开状态
    showSafeList: false,
    renderSafeList: false,
    showAllergyList: false,
    renderAllergyList: false,
    showTestingList: false,
    renderTestingList: false,
    // 状态说明弹窗
    showStatusExplain: false,
    renderStatusExplain: false,
    // 今日建议
    todaySuggestions: [],
    // 记录辅食覆盖层
    showRecordSheet: false,
    // 家庭邀请加入
    showJoinModal: false,
    renderJoinModal: false,
    joinBabyName: '',
    joining: false,
    pendingJoinData: null,
  },

  onLoad(options = {}) {
    const today = new Date();
    this.setData({ todayText: dateUtil.formatDate(today, 'M月D日') });

    if (options.joinCode) {
      app.globalData.pendingJoinCode = options.joinCode;
      return;
    }

    // 首次使用 → 跳转引导页
    // 换设备/清缓存后本地为空但云端有宝宝数据,等云同步给个结果再决定
    this._maybeRedirectToOnboarding();
  },

  /**
   * 本地无宝宝 + 未完成引导 → 可能需要跳引导页
   * 但要等云同步完成再决定(避免换设备场景把云端宝宝数据盖掉)
   */
  _maybeRedirectToOnboarding() {
    if (app.globalData.pendingJoinCode) return;

    const done = wx.getStorageSync('onboardingComplete');
    if (done) return;

    const hasLocalBaby = (app.globalData.babies || []).length > 0;
    if (hasLocalBaby) return;

    const decide = () => {
      const hasBabyNow = (app.globalData.babies || []).length > 0;
      const syncStatus = app.globalData.cloudSyncStatus || 'idle';
      const syncFinished = ['done', 'skipped', 'failed'].includes(syncStatus);
      if (hasBabyNow) {
        clearInterval(this._entryDecisionTimer);
        this._entryDecisionTimer = null;
        this.refreshFromGlobal();
        return;
      }
      if (syncFinished) {
        clearInterval(this._entryDecisionTimer);
        this._entryDecisionTimer = null;
        if ((app.globalData.babies || []).length === 0) {
          wx.reLaunch({ url: '/pages/onboarding/onboarding' });
        }
      }
    };

    decide();
    const shouldKeepWaiting =
      (app.globalData.babies || []).length === 0
      && !['done', 'skipped', 'failed'].includes(app.globalData.cloudSyncStatus || 'idle');
    if (!shouldKeepWaiting) return;

    if (this._entryDecisionTimer) clearInterval(this._entryDecisionTimer);
    this._entryDecisionTimer = setInterval(decide, 200);
  },

  onShow() {
    const tabBar = this.getTabBar();
    if (tabBar) tabBar.setData({ currentSelected: 0 });
    // 强制从 storage 重新读取最新数据
    const babyId = app.globalData.currentBabyId;
    if (babyId) {
      const records = wx.getStorageSync('allRecords_' + babyId) || [];
      const allergyLogs = wx.getStorageSync('allergyLogs_' + babyId) || [];
      app.globalData.allRecords = records;
      app.globalData.allergyLogs = allergyLogs;
    }
    this.loadData();
    // 检查是否有待处理的家庭邀请
    const joinCode = app.globalData.pendingJoinCode;
    if (joinCode) {
      app.globalData.pendingJoinCode = null;
      this.loadJoinData(joinCode);
      return;
    }

    this._maybeRedirectToOnboarding();
  },

  /**
   * 加载所有数据
   */
  loadData() {
    // 1. 加载宝宝信息
    this.loadBabyInfo();
    // 2. 加载排敏进度
    this.loadPlanSummary();
  },

  /**
   * 云同步完成后由 app.syncFromCloud 主动调用
   * 用最新的本地 + 云端合并数据重刷页面
   */
  refreshFromGlobal() {
    const babyId = app.globalData.currentBabyId;
    if (babyId) {
      const records = wx.getStorageSync('allRecords_' + babyId) || [];
      const allergyLogs = wx.getStorageSync('allergyLogs_' + babyId) || [];
      app.globalData.allRecords = records;
      app.globalData.allergyLogs = allergyLogs;
    }
    this.loadData();
  },

  onUnload() {
    if (this._entryDecisionTimer) {
      clearInterval(this._entryDecisionTimer);
      this._entryDecisionTimer = null;
    }
  },

  /**
   * 加载宝宝信息
   */
  loadBabyInfo() {
    const baby = app.globalData.currentBaby;
    const babies = app.globalData.babies || [];
    const currentBabyId = app.globalData.currentBabyId || '';
    if (!baby) {
      this.setData({
        baby: {},
        babies,
        currentBabyId,
        babyAge: '',
        babyAgeMonths: 0,
      });
      return;
    }
    this.setData({ baby, babies, currentBabyId });
    this.calcBabyAge(baby.birthday);
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
   * 加载排敏进度摘要（按食物计算）
   */
  loadPlanSummary() {
    const records = app.globalData.allRecords || [];
    const allergyLogs = app.globalData.allergyLogs || [];
    const settings = app.globalData.currentBaby?.settings || { testDays: 3 };

    // 按食物计算状态（含引导时标记的状态）
    const babyId = app.globalData.currentBabyId || 'default';
    const foodLibrary = require('../../data/food-library');
    const customFoods = foodLibrary.getCustomFoods(babyId);
    const onboardingStates = app.globalData.onboardingStates
      || wx.getStorageSync(`onboardingStates_${babyId}`) || {};
    const foodStates = planEngine.computeAllFoodStates(records, allergyLogs, settings, onboardingStates, customFoods);
    const allFoods = [...foodLibrary.getAllFoods(), ...customFoods];

    // 统计各状态食物数量（未过敏 = passed + preliminary）
    let passedCount = 0;
    let allergyCount = 0;
    let testingCount = 0;
    const allergyFoodsList = [];
    const passedFoodsList = [];
    const testingFoodsList = [];

    allFoods.forEach(food => {
      const state = foodStates[food.id] || {};
      const display = foodLibrary.getFoodDisplay(food);
      if (state.status === 'passed' || state.status === 'preliminary') {
        passedCount++;
        passedFoodsList.push(display);
      } else if (state.status === 'allergy') {
        allergyCount++;
        allergyFoodsList.push(display);
      } else if (state.status === 'testing') {
        testingCount++;
        testingFoodsList.push(display);
      }
    });

    const total = allFoods.length;
    const triedCount = passedCount + allergyCount;

    this.setData({
      planStats: { passed: passedCount, total, percent: total > 0 ? Math.round(triedCount / total * 100) : 0, allergy: allergyCount, testing: testingCount, tried: triedCount, testDays: settings.testDays || 3 },
      allergyFoods: allergyFoodsList,
      passedFoods: passedFoodsList,
      testingFoods: testingFoodsList,
    });

    // 同步到全局，供 plan 页使用
    app.globalData.foodStates = foodStates;

    // 生成今日食谱建议（传入月龄，用于推荐下一步新食物）
    const babyAgeMonths = this.data.babyAgeMonths || 6;
    const todaySuggestions = suggestionEngine.getTodaySuggestions(foodStates, babyAgeMonths);
    this.setData({ todaySuggestions });

    // 计算分类状态（供建议引擎使用）
    const categoryStateMap = planEngine.buildCategoryStatesFromFoodStates(foodStates, settings);
    app.globalData.categoryStates = categoryStateMap;
  },

  /**
   * 跳转到记录页
   */
  goToRecord() {
    wx.switchTab({ url: '/pages/record/record' });
  },

  /**
   * 跳转到过敏排查页（二级页面）
   */
  goToTrace() {
    wx.navigateTo({ url: '/pages/allergy/allergy' });
  },

  goToShareReport() {
    this.setData({ showShareReport: true });
  },

  onShareReportClose() {
    this.setData({ showShareReport: false });
  },

  onShareAppMessage() {
    const comp = this.selectComponent('#shareReport');
    if (comp && this.data.showShareReport) {
      return comp.getShareData();
    }
    return { title: '呀咪宝宝辅食', path: '/pages/index/index' };
  },

  /**
   * 下拉刷新
   */
  onPullDownRefresh() {
    this.loadData();
    setTimeout(() => wx.stopPullDownRefresh(), 300);
  },

  noop() {},

  onAdoptRecommend() {
    const suggestions = this.data.todaySuggestions || [];
    const ids = [];
    const seen = new Set();
    suggestions.forEach(group => {
      (group.foods || []).forEach(f => {
        const id = f.foodId || f.id;
        if (id && !seen.has(id)) {
          seen.add(id);
          ids.push(id);
        }
      });
    });
    if (ids.length === 0) {
      wx.showToast({ title: '暂无推荐食物', icon: 'none' });
      return;
    }
    this.setData({ showRecordSheet: true }, () => {
      setTimeout(() => {
        const sheet = this.selectComponent('#recordSheet');
        if (sheet && typeof sheet.prefillFoods === 'function') {
          sheet.prefillFoods(ids);
        }
      }, 60);
    });
  },

  _setSheetTimer(key, fn) {
    this._sheetTimers = this._sheetTimers || {};
    if (this._sheetTimers[key]) clearTimeout(this._sheetTimers[key]);
    this._sheetTimers[key] = setTimeout(fn, SHEET_ANIMATION_DURATION);
  },

  _openBottomSheet(renderKey, showKey, extra = {}) {
    this.setData({ ...extra, [renderKey]: true, [showKey]: false }, () => {
      setTimeout(() => this.setData({ [showKey]: true }), 16);
    });
  },

  _closeBottomSheet(renderKey, showKey, extra = {}, afterClose) {
    if (!this.data[renderKey] && !this.data[showKey]) return;
    this.setData({ ...extra, [showKey]: false }, () => {
      this._setSheetTimer(renderKey, () => {
        const finalState = { [renderKey]: false };
        if (afterClose) afterClose(finalState);
        this.setData(finalState);
      });
    });
  },

  _closeIndexOverlays(except = '') {
    const overlays = [
      ['babySwitcher', 'renderBabySwitcher', 'showBabySwitcher'],
      ['addBabyForm', 'renderAddBabyForm', 'showAddBabyForm'],
      ['statusExplain', 'renderStatusExplain', 'showStatusExplain'],
      ['safeList', 'renderSafeList', 'showSafeList'],
      ['testingList', 'renderTestingList', 'showTestingList'],
      ['allergyList', 'renderAllergyList', 'showAllergyList'],
      ['joinModal', 'renderJoinModal', 'showJoinModal'],
    ];
    overlays.forEach(([name, renderKey, showKey]) => {
      if (name === except) return;
      // addBaby 面板打开时会隐藏 tabbar,关闭时要还原
      if (name === 'addBabyForm' && (this.data[showKey] || this.data[renderKey])) {
        this._toggleTabBar(false);
      }
      this._closeBottomSheet(renderKey, showKey);
    });
  },

  // ===== 底部弹窗通用拖拽关闭 =====
  _panelDragY: 0,
  onPanelDragStart(e) {
    this._panelDragY = e.touches[0].clientY;
  },
  onSwitcherDragEnd(e) {
    if (e.changedTouches[0].clientY - this._panelDragY > 80) this.closeBabySwitcher();
  },
  onEditDragEnd(e) {
    if (e.changedTouches[0].clientY - this._panelDragY > 80) this.closeAddBabyForm();
  },
  onJoinDragEnd(e) {
    if (e.changedTouches[0].clientY - this._panelDragY > 80) this.cancelJoin();
  },
  // 食物列表弹窗的下滑关闭
  // 外层面板记录起始Y，scroll-view 到顶后下拉超过阈值则关闭
  _foodListAtTop: true,
  onFoodListDragStart(e) {
    this._panelDragY = e.touches[0].clientY;
  },
  onFoodListScrollUpper(e) {
    this._foodListAtTop = true;
  },
  onFoodListDragEnd(e) {
    if (!this._foodListAtTop) return;
    if (e.changedTouches[0].clientY - this._panelDragY <= 80) return;
    const type = e.currentTarget.dataset.type;
    const closeMap = {
      status: 'toggleStatusExplain',
      safe: 'toggleSafeList',
      testing: 'toggleTestingList',
      allergy: 'toggleAllergyList',
    };
    if (closeMap[type]) {
      this._foodListAtTop = true;
      this[closeMap[type]]();
    }
  },

  // ===== 记录辅食覆盖层 =====
  handleShowRecordSheet() {
    this.setData({ showRecordSheet: true });
  },

  onRecordSheetClose() {
    this.setData({ showRecordSheet: false });
  },

  onRecordSaved() {
    // 刷新首页数据
    this.loadData();
    this.setData({ showRecordSheet: false });
  },

  toggleStatusExplain() {
    this._foodListAtTop = true;
    if (this.data.showStatusExplain || this.data.renderStatusExplain) {
      this._closeBottomSheet('renderStatusExplain', 'showStatusExplain');
      return;
    }
    this._closeIndexOverlays('statusExplain');
    this._openBottomSheet('renderStatusExplain', 'showStatusExplain');
  },

  /**
   * 展开/收起安全食物列表
   */
  toggleSafeList() {
    this._foodListAtTop = true;
    if (this.data.showSafeList || this.data.renderSafeList) {
      this._closeBottomSheet('renderSafeList', 'showSafeList');
      return;
    }
    this._closeIndexOverlays('safeList');
    this._openBottomSheet('renderSafeList', 'showSafeList');
  },

  /**
   * 展开/收起排敏中食物列表
   */
  toggleTestingList() {
    this._foodListAtTop = true;
    if (this.data.showTestingList || this.data.renderTestingList) {
      this._closeBottomSheet('renderTestingList', 'showTestingList');
      return;
    }
    this._closeIndexOverlays('testingList');
    this._openBottomSheet('renderTestingList', 'showTestingList');
  },

  toggleAllergyList() {
    this._foodListAtTop = true;
    if (this.data.showAllergyList || this.data.renderAllergyList) {
      this._closeBottomSheet('renderAllergyList', 'showAllergyList');
      return;
    }
    this._closeIndexOverlays('allergyList');
    this._openBottomSheet('renderAllergyList', 'showAllergyList');
  },

  /**
   * 显示宝宝切换弹窗
   */
  showBabySwitcher() {
    const babies = app.globalData.babies || [];
    const currentBabyId = app.globalData.currentBabyId || '';
    this._closeIndexOverlays('babySwitcher');
    this._openBottomSheet('renderBabySwitcher', 'showBabySwitcher', {
      babies,
      currentBabyId,
    });
  },

  /**
   * 关闭宝宝切换弹窗
   */
  closeBabySwitcher() {
    this._closeBottomSheet('renderBabySwitcher', 'showBabySwitcher');
  },

  /**
   * 选择宝宝
   */
  selectBaby(e) {
    const babyId = e.currentTarget.dataset.id;
    if (babyId === this.data.currentBabyId) {
      this.closeBabySwitcher();
      return;
    }
    app.switchBaby(babyId);
    this.closeBabySwitcher();
    this.loadData();
  },

  /**
   * 打开添加宝宝表单
   */
  openAddBabyForm() {
    this._closeIndexOverlays('addBabyForm');
    this._toggleTabBar(true);
    this._openBottomSheet('renderAddBabyForm', 'showAddBabyForm', {
      editingBabyId: '',
      babyForm: {
        name: '',
        birthday: '',
        avatarUrl: '',
        gender: '',
        feedingType: '',
      },
    });
  },

  _toggleTabBar(hide) {
    const tabBar = this.getTabBar && this.getTabBar();
    if (tabBar) tabBar.setData({ hidden: !!hide });
  },

  /**
   * 打开编辑宝宝表单(预填当前宝宝数据)
   */
  openEditBabyForm(e) {
    const babyId = e.currentTarget.dataset.id;
    const baby = (app.globalData.babies || []).find(b => b._id === babyId || b.clientId === babyId);
    if (!baby) return;
    const openEdit = () => {
      this._toggleTabBar(true);
      this._openBottomSheet('renderAddBabyForm', 'showAddBabyForm', {
        editingBabyId: babyId,
        babyForm: {
          name: baby.name || '',
          birthday: baby.birthday || '',
          avatarUrl: baby.avatarUrl || '',
          gender: baby.gender || '',
          feedingType: baby.feedingType || '',
        },
      });
    };
    // 如果 switcher 正开着,先关它,等动画收尾再打开编辑面板;避免两个面板同时动画造成的点击穿透/遮挡
    if (this.data.showBabySwitcher || this.data.renderBabySwitcher) {
      this._closeBottomSheet('renderBabySwitcher', 'showBabySwitcher', {}, () => {
        openEdit();
      });
    } else {
      openEdit();
    }
  },

  /**
   * 关闭添加宝宝表单
   */
  closeAddBabyForm() {
    this._toggleTabBar(false);
    this._closeBottomSheet('renderAddBabyForm', 'showAddBabyForm');
  },

  /**
   * 选择宝宝头像
   */
  chooseBabyAvatar() {
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const tempFilePath = res.tempFiles[0].tempFilePath;
        this.setData({ 'babyForm.avatarUrl': tempFilePath });
      },
    });
  },

  /**
   * 输入宝宝昵称
   */
  onBabyNameInput(e) {
    this.setData({ 'babyForm.name': e.detail.value });
  },

  /**
   * 选择宝宝生日
   */
  onBabyBirthdayChange(e) {
    this.setData({ 'babyForm.birthday': e.detail.value });
  },

  /**
   * 选择宝宝性别
   */
  onBabyGenderSelect(e) {
    this.setData({ 'babyForm.gender': e.currentTarget.dataset.gender });
  },

  /**
   * 选择喂养方式
   */
  onBabyFeedingSelect(e) {
    this.setData({ 'babyForm.feedingType': e.currentTarget.dataset.feeding });
  },

  /**
   * 保存宝宝
   */
  saveBaby() {
    const { babyForm, editingBabyId } = this.data;

    if (!babyForm.name.trim()) {
      wx.showToast({ title: '请输入宝宝昵称', icon: 'none' });
      return;
    }

    if (!babyForm.birthday) {
      wx.showToast({ title: '请选择出生日期', icon: 'none' });
      return;
    }

    if (!editingBabyId && !babyForm.gender) {
      wx.showToast({ title: '请选择宝宝性别', icon: 'none' });
      return;
    }

    if (!editingBabyId && !babyForm.feedingType) {
      wx.showToast({ title: '请选择喂养方式', icon: 'none' });
      return;
    }

    try {
      if (editingBabyId) {
        app.updateBaby(editingBabyId, {
          name: babyForm.name.trim(),
          birthday: babyForm.birthday,
          avatarUrl: babyForm.avatarUrl || '',
          gender: babyForm.gender || '',
          feedingType: babyForm.feedingType || '',
        });
        this.setData({
          babies: app.globalData.babies || [],
        });
        wx.showToast({ title: '已保存', icon: 'success' });
        this.closeAddBabyForm();
        this.closeBabySwitcher();
        this.loadData();
      } else {
        const baby = app.addBaby({
          name: babyForm.name.trim(),
          birthday: babyForm.birthday,
          avatarUrl: babyForm.avatarUrl || '',
          gender: babyForm.gender,
          feedingType: babyForm.feedingType,
        });
        app.switchBaby(baby._id);
        this.closeAddBabyForm();
        this.closeBabySwitcher();
        // 新添加的宝宝 → 进入 onboarding 的"新手/已有经验"选择步骤
        wx.navigateTo({ url: '/pages/onboarding/onboarding?fromAdd=1' });
      }
    } catch (err) {
      console.error('[Index] saveBaby error:', err);
      wx.showToast({ title: '保存失败', icon: 'none' });
    }
  },

  /**
   * 删除宝宝
   */
  deleteBaby(e) {
    const babyId = e.currentTarget.dataset.id;
    wx.showModal({
      title: '确认删除',
      content: '删除后该宝宝的辅食数据将无法恢复，确定要删除吗？',
      success: (res) => {
        if (res.confirm) {
          app.deleteBaby(babyId);
          // 如果删除的是当前宝宝，需要刷新数据
          this.setData({
            babies: app.globalData.babies || [],
            currentBabyId: app.globalData.currentBabyId || '',
          });
          this.loadData();
          wx.showToast({ title: '已删除', icon: 'success' });
        }
      },
    });
  },

  // ===== 家庭邀请加入 =====

  /**
   * 从云端加载邀请数据
   */
  loadJoinData(code) {
    if (!wx.cloud || !app.globalData.cloudReady) {
      wx.showToast({ title: '邀请功能需要网络支持', icon: 'none' });
      return;
    }
    wx.showLoading({ title: '加载邀请数据...' });
    wx.cloud.callFunction({
      name: 'familyShare',
      data: { op: 'preview', shareCode: code },
      success: res => {
        wx.hideLoading();
        const result = res.result || {};
        if (result.code !== 0 || !result.data) {
          wx.showToast({ title: '邀请码无效或已过期', icon: 'none' });
          return;
        }
        this.setData({
          showJoinModal: true,
          renderJoinModal: true,
          joinBabyName: result.data.babyName || '家人的宝宝',
          pendingJoinData: { shareCode: code },
        }, () => setTimeout(() => this.setData({ showJoinModal: true }), 16));
      },
      fail: () => {
        wx.hideLoading();
        wx.showToast({ title: '加载失败，请重试', icon: 'none' });
      },
    });
  },

  /**
   * 确认加入家庭
   */
  confirmJoin() {
    const { pendingJoinData } = this.data;
    if (!pendingJoinData || this.data.joining) return;
    this.setData({ joining: true });

    wx.cloud.callFunction({
      name: 'familyShare',
      data: { op: 'join', shareCode: pendingJoinData.shareCode },
      success: res => {
        const result = res.result || {};
        if (result.code !== 0 || !result.data || !result.data.baby) {
          this.setData({ joining: false });
          wx.showToast({ title: '加入失败，请重试', icon: 'none' });
          return;
        }

        const { baby, allRecords, allergyLogs } = result.data;
        const babies = app.globalData.babies || [];
        const existingIndex = babies.findIndex(b => (b.clientId || b._id) === (baby.clientId || baby._id));
        if (existingIndex >= 0) {
          babies[existingIndex] = { ...babies[existingIndex], ...baby };
        } else {
          babies.push(baby);
        }
        app.globalData.babies = babies;
        wx.setStorageSync('babies', babies);
        wx.setStorageSync('onboardingComplete', true);

        wx.setStorageSync(`allRecords_${baby._id}`, allRecords || []);
        wx.setStorageSync(`allergyLogs_${baby._id}`, allergyLogs || []);
        // 共享宝宝的"已排敏"状态来自 owner 端,显式落到本地 storage,防止下次冷启动丢失
        if (baby.onboardingStates) {
          wx.setStorageSync(`onboardingStates_${baby._id}`, baby.onboardingStates);
        }
        app.loadBabyData(baby._id);

        this._closeBottomSheet(
          'renderJoinModal',
          'showJoinModal',
          { joining: false },
          finalState => {
            finalState.pendingJoinData = null;
            finalState.joinBabyName = '';
          }
        );
        wx.showToast({ title: `已加入${baby.name}的记录`, icon: 'success' });
        this.loadData();
      },
      fail: () => {
        this.setData({ joining: false });
        wx.showToast({ title: '加入失败，请重试', icon: 'none' });
      },
    });
  },

  /**
   * 取消加入
   */
  cancelJoin() {
    this._closeBottomSheet(
      'renderJoinModal',
      'showJoinModal',
      {},
      finalState => {
        finalState.pendingJoinData = null;
        finalState.joinBabyName = '';
      }
    );
    // 新用户取消加入后本地仍无宝宝,需重新触发引导判断,避免停在空白首页
    setTimeout(() => this._maybeRedirectToOnboarding(), SHEET_ANIMATION_DURATION + 50);
  },
});
