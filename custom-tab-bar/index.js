// custom-tab-bar/index.js — 自定义底部导航逻辑
Component({
  data: {
    currentSelected: 0,
    hidden: false,
    testValue: 0,
    list: [
      {
        pagePath: '/pages/index/index',
        text: '首页',
        iconEmoji: '🏠',
      },
      {
        pagePath: '/pages/plan/plan',
        text: '食物',
        iconEmoji: '🍎',
      },
      {
        pagePath: '',
        text: '',
        isAction: true,
      },
      {
        pagePath: '/pages/trace/trace',
        text: '日历',
        iconEmoji: '📅',
      },
      {
        pagePath: '/pages/settings/settings',
        text: '我的',
        iconEmoji: '👤',
      },
    ],
  },

  methods: {
    switchTab(e) {
      const index = parseInt(e.currentTarget.dataset.index);
      const item = this.data.list[index];

      if (item.isAction) {
        // 直接调用当前页的记录辅食覆盖层,避免页面跳转白屏
        const pages = getCurrentPages();
        const currentPage = pages[pages.length - 1];
        if (currentPage && typeof currentPage.handleShowRecordSheet === 'function') {
          currentPage.handleShowRecordSheet();
        } else {
          // 兜底:当前页未接入 record-sheet 时回退到独立页面
          wx.reLaunch({ url: '/pages/record/record' });
        }
        return;
      }

      this.setData({ currentSelected: index });
      wx.switchTab({ url: item.pagePath });
    },
  },
});
