// pages/share-report/share-report.js — 分享报告只读页

const app = getApp();

Page({
  data: {
    loading: true,
    loadError: '',
    reportCode: '',
    hasExistingBaby: false,
    babyName: '',
    babyAge: '',
    passedCount: 0,
    totalCount: 0,
    allergyCount: 0,
    testingCount: 0,
    categoryStats: [],
    quote: '',
  },

  onLoad(options) {
    const reportCode = String(options.reportCode || '').trim().toUpperCase();
    this.setData({ reportCode, hasExistingBaby: this._hasExistingBaby() });
    if (!reportCode) {
      this.setData({ loading: false, loadError: '这份报告链接不完整' });
      return;
    }
    this.loadReport(reportCode);
  },

  onCloudSyncDone() {
    this.setData({ hasExistingBaby: this._hasExistingBaby() });
  },

  _hasExistingBaby() {
    return !!(app && app.globalData && app.globalData.babies && app.globalData.babies.length);
  },

  _waitForCloudSync() {
    return new Promise(resolve => {
      if (!app || !app.globalData || !app.globalData.cloudReady) {
        resolve();
        return;
      }
      const finished = () => ['done', 'skipped', 'failed'].includes(app.globalData.cloudSyncStatus || 'idle');
      if (finished()) {
        resolve();
        return;
      }
      const start = Date.now();
      const timer = setInterval(() => {
        if (finished() || Date.now() - start > 2500) {
          clearInterval(timer);
          resolve();
        }
      }, 100);
    });
  },

  async loadReport(reportCode) {
    if (!wx.cloud) {
      this.setData({ loading: false, loadError: '当前版本暂时无法打开报告' });
      return;
    }

    try {
      const res = await wx.cloud.callFunction({
        name: 'familyShare',
        data: { op: 'getReport', reportCode },
      });
      const result = res.result || {};
      if (result.code !== 0 || !result.data || !result.data.report) {
        throw new Error(result.message || 'report not found');
      }
      const report = result.data.report;
      this.setData({
        loading: false,
        loadError: '',
        babyName: report.babyName || '',
        babyAge: report.babyAge || '',
        passedCount: report.passedCount || 0,
        totalCount: report.totalCount || 0,
        allergyCount: report.allergyCount || 0,
        testingCount: report.testingCount || 0,
        categoryStats: report.categoryStats || [],
        quote: report.quote || '每一次尝试，都是宝宝成长的小脚印',
      });
    } catch (err) {
      console.error('[ShareReportPage] 加载报告失败:', err);
      this.setData({ loading: false, loadError: '报告暂时无法打开，请稍后再试' });
    }
  },

  async startUse() {
    if (app && typeof app.syncFromCloudThrottled === 'function') {
      app.syncFromCloudThrottled(true);
    }
    wx.showLoading({ title: '同步账号数据...' });
    await this._waitForCloudSync();
    wx.hideLoading();
    const hasExistingBaby = this._hasExistingBaby();
    this.setData({ hasExistingBaby });
    if (hasExistingBaby) {
      wx.switchTab({ url: '/pages/index/index' });
      return;
    }
    wx.reLaunch({ url: '/pages/onboarding/onboarding' });
  },

  onShareAppMessage() {
    const { reportCode, babyName, passedCount, totalCount } = this.data;
    return {
      title: babyName
        ? `${babyName}已探索${passedCount}种辅食啦`
        : `宝宝已探索${passedCount}/${totalCount}种辅食`,
      path: `/pages/share-report/share-report?reportCode=${encodeURIComponent(reportCode)}`,
    };
  },
});
