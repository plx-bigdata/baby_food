// pages/settings/settings.js — 设置页逻辑

const app = getApp();
const dateUtil = require('../../utils/date');

Page({
  data: {
    today: dateUtil.getTodayDateStr(),
    // 用户信息
    userInfo: {
      nickname: '',
      city: '',
      avatarUrl: '',
    },
    // 用户编辑弹窗
    showUserEditForm: false,
    userEditForm: {
      nickname: '',
      city: '',
    },
    // 排敏规则
    settings: {
      testDays: 3,
      dailyNewFoodLimit: 1,
    },
  },

  onLoad() {
    this.loadData();
  },

  onShow() {
    this.loadData();
  },

  /**
   * 加载数据
   */
  loadData() {
    const userInfo = app.globalData.userInfo || {};
    const currentBaby = app.globalData.currentBaby;
    this.setData({
      userInfo,
      settings: {
        testDays: currentBaby?.settings?.testDays ?? 3,
        dailyNewFoodLimit: currentBaby?.settings?.dailyNewFoodLimit ?? 1,
      },
    });
  },

  /**
   * 打开用户信息编辑
   */
  editUserInfo() {
    this.setData({
      showUserEditForm: true,
      userEditForm: {
        nickname: this.data.userInfo.nickname || '',
        city: this.data.userInfo.city || '',
        avatarUrl: this.data.userInfo.avatarUrl || '',
      },
    });
  },

  closeUserEditForm() {
    this.setData({ showUserEditForm: false });
  },

  onNicknameInput(e) {
    this.setData({ 'userEditForm.nickname': e.detail.value });
  },

  onCityInput(e) {
    this.setData({ 'userEditForm.city': e.detail.value });
  },

  saveUserInfo() {
    const { userEditForm } = this.data;
    const userInfo = {
      ...this.data.userInfo,
      nickname: userEditForm.nickname.trim(),
      city: userEditForm.city.trim(),
      avatarUrl: userEditForm.avatarUrl || '',
    };
    app.globalData.userInfo = userInfo;
    wx.setStorageSync('userInfo', userInfo);
    this.setData({ userInfo, showUserEditForm: false });
    wx.showToast({ title: '保存成功', icon: 'success' });
  },

  /**
   * 选择头像
   */
  chooseAvatar() {
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const tempFilePath = res.tempFiles[0].tempFilePath;
        // 实际上传需要云存储，这里用本地临时路径演示
        this.setData({ 'userEditForm.avatarUrl': tempFilePath });
      },
    });
  },

  /**
   * 测试天数调节
   */
  decreaseTestDays() {
    const val = Math.max(1, this.data.settings.testDays - 1);
    this.setData({ 'settings.testDays': val });
    this.saveSettings({ testDays: val });
  },

  increaseTestDays() {
    const val = Math.min(7, this.data.settings.testDays + 1);
    this.setData({ 'settings.testDays': val });
    this.saveSettings({ testDays: val });
  },

  decreaseNewFoodLimit() {
    const val = Math.max(1, this.data.settings.dailyNewFoodLimit - 1);
    this.setData({ 'settings.dailyNewFoodLimit': val });
    this.saveSettings({ dailyNewFoodLimit: val });
  },

  increaseNewFoodLimit() {
    const val = Math.min(3, this.data.settings.dailyNewFoodLimit + 1);
    this.setData({ 'settings.dailyNewFoodLimit': val });
    this.saveSettings({ dailyNewFoodLimit: val });
  },

  saveSettings(partial) {
    const settings = { ...this.data.settings, ...partial };
    const babyId = app.globalData.currentBabyId;
    if (babyId) {
      app.updateBaby(babyId, { settings });
    }
  },
});
