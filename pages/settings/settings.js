// pages/settings/settings.js — 设置页逻辑

const app = getApp();

Page({
  data: {
    // 分享报告
    showShareReport: false,
    // 记录辅食覆盖层
    showRecordSheet: false,
    // 关于弹窗
    showAbout: false,
    renderAbout: false,
    // 协议弹窗
    showLegalModal: false,
    renderLegalModal: false,
    legalTitle: '',
    legalIntro: '',
    legalSections: [],
  },

  onShow() {
    const tabBar = this.getTabBar();
    if (tabBar) tabBar.setData({ currentSelected: 3 });
  },

  // ===== 记录辅食覆盖层 =====
  handleShowRecordSheet() {
    this.setData({ showRecordSheet: true });
  },
  onRecordSheetClose() {
    this.setData({ showRecordSheet: false });
  },
  onRecordSaved() {
    this.setData({ showRecordSheet: false });
  },

  // ===== 家庭协作 =====

  /**
   * 邀请亲属 — 生成邀请码并上传云端快照
   * 由 button[open-type="share"] 的 bindtap 触发，紧接着微信会自动调用 onShareAppMessage
   */
  inviteFamily() {
    const baby = app.globalData.currentBaby;
    if (!baby) {
      wx.showToast({ title: '请先在首页设置宝宝信息', icon: 'none' });
      return;
    }
    // 生成6位随机邀请码并存到 globalData，供 onShareAppMessage 读取
    const code = Math.random().toString(36).slice(2, 8).toUpperCase();
    app.globalData.pendingShareCode = code;

    // 创建家庭邀请（异步，失败不阻断分享）
    if (app.globalData.cloudReady && wx.cloud) {
      try {
        const allRecords = app.globalData.allRecords || [];
        const allergyLogs = app.globalData.allergyLogs || [];
        wx.cloud.callFunction({
          name: 'familyShare',
          data: {
            op: 'create',
            shareCode: code,
            baby,
            allRecords,
            allergyLogs,
          },
        }).then(() => {}).catch(() => {});
      } catch (e) {
        console.warn('[invite] familyShare error', e);
      }
    }
  },

  /**
   * 分享配置（配合设置页的 open-type="share" 按钮）
   * 如果是分享排敏报告,走报告分享;否则走邀请亲属分享
   */
  onShareAppMessage() {
    if (this.data.showShareReport) {
      const comp = this.selectComponent('#shareReport');
      if (comp) return comp.getShareData();
    }
    const baby = app.globalData.currentBaby;
    const code = app.globalData.pendingShareCode || '';
    const name = baby ? baby.name : '宝宝';
    return {
      title: `邀请你一起记录 ${name} 的辅食日常`,
      path: `/pages/index/index?joinCode=${code}`,
    };
  },

  /**
   * 完善宝宝资料 · 生长曲线钩子（延迟收集入口）
   */
  openBabyProfile() {
    wx.showToast({
      title: '该功能暂未开放',
      icon: 'none',
      duration: 2000,
    });
  },

  /**
   * 打开/关闭 分享报告弹窗
   */
  openShareReport() {
    this.setData({ showShareReport: true });
  },
  onShareReportClose() {
    this.setData({ showShareReport: false });
  },

  /**
   * 关于弹窗
   */
  openAbout() {
    this.setData({ renderAbout: true }, () => {
      setTimeout(() => this.setData({ showAbout: true }), 16);
    });
  },
  closeAbout() {
    this.setData({ showAbout: false });
    setTimeout(() => this.setData({ renderAbout: false }), 280);
  },
  onAboutDragStart(e) {
    this._aboutDragY = e.touches[0].clientY;
  },
  onAboutDragEnd(e) {
    if (e.changedTouches[0].clientY - this._aboutDragY > 80) this.closeAbout();
  },
  copyAboutEmail() {
    wx.setClipboardData({
      data: '13026334211@163.com',
      success: () => wx.showToast({ title: '邮箱已复制', icon: 'success' }),
    });
  },
  openUserAgreement() {
    this._openLegalModal({
      title: '用户协议',
      intro: '欢迎使用呀咪宝宝辅食。本应用用于家庭辅食记录、排敏进度管理和过敏线索整理，记录内容仅供家庭参考。',
      sections: [
        {
          title: '服务定位',
          items: [
            '本应用不提供医学诊断、治疗建议或处方服务。',
            '宝宝出现皮疹、呕吐、喘息、精神差等异常反应时，请及时咨询医生或就医。',
          ],
        },
        {
          title: '用户责任',
          items: [
            '请根据宝宝真实情况记录辅食、过敏和排敏信息。',
            '请妥善保管账号与分享链接，避免将家庭数据分享给无关人员。',
          ],
        },
        {
          title: '数据与注销',
          items: [
            '你可以在设置页清理缓存或注销账号。',
            '注销账号后，云端业务数据将被删除，删除后无法恢复。',
          ],
        },
      ],
    });
  },
  openPrivacyPolicy() {
    this._openLegalModal({
      title: '隐私政策',
      intro: '我们只收集实现辅食记录、排敏管理、家庭协作和账号同步所必需的信息。',
      sections: [
        {
          title: '我们收集的信息',
          items: [
            '微信 openid：用于识别账号、同步数据和执行账号注销。',
            '宝宝资料：包括昵称、生日、头像、性别和喂养方式，用于展示和计算月龄。',
            '辅食与过敏记录：用于生成排敏状态、历史记录和家庭共享数据。',
          ],
        },
        {
          title: '信息使用方式',
          items: [
            '数据仅用于本应用功能，不会出售或用于无关营销。',
            '你主动发送家庭邀请时，被邀请人可查看对应宝宝的共享记录快照。',
          ],
        },
        {
          title: '你的权利',
          items: [
            '你可以在设置页清理本地缓存。',
            '你可以注销账号并删除云端业务数据。',
          ],
        },
      ],
    });
  },
  _openLegalModal(config) {
    this.setData({
      renderLegalModal: true,
      showLegalModal: false,
      legalTitle: config.title,
      legalIntro: config.intro,
      legalSections: config.sections,
    }, () => {
      setTimeout(() => this.setData({ showLegalModal: true }), 16);
    });
  },
  closeLegalModal() {
    this.setData({ showLegalModal: false });
    setTimeout(() => {
      this.setData({
        renderLegalModal: false,
        legalTitle: '',
        legalIntro: '',
        legalSections: [],
      });
    }, 280);
  },
  onLegalModalDragStart(e) {
    this._legalModalDragY = e.touches[0].clientY;
  },
  onLegalModalDragEnd(e) {
    if (e.changedTouches[0].clientY - this._legalModalDragY > 80) this.closeLegalModal();
  },
  noop() {},

  /**
   * 清除缓存 — 只清临时文件(海报导出图等),不碰记录数据
   * 用户的辅食/过敏记录存在云端,本地副本也保留
   */
  clearCache() {
    wx.showModal({
      title: '清除缓存',
      content: '将清理海报导出等临时文件,不会影响辅食记录和过敏数据',
      confirmText: '清理',
      success: (res) => {
        if (!res.confirm) return;
        try {
          const fs = wx.getFileSystemManager();
          const userPath = wx.env.USER_DATA_PATH;
          const files = fs.readdirSync(userPath);
          let cleared = 0;
          files.forEach(name => {
            try {
              fs.unlinkSync(`${userPath}/${name}`);
              cleared++;
            } catch (_) {}
          });
          wx.showToast({ title: `已清理 ${cleared} 个临时文件`, icon: 'success' });
        } catch (e) {
          wx.showToast({ title: '无可清理缓存', icon: 'none' });
        }
      },
    });
  },

  /**
   * 注销账号 — 合规要求
   * 两步确认 → 云端删除 → 本地清空 → 回到引导页
   */
  deleteAccount() {
    wx.showModal({
      title: '注销账号',
      content: '注销后会删除你的全部宝宝档案、辅食记录、过敏记录,且无法恢复。是否继续?',
      confirmText: '继续',
      confirmColor: '#E74C3C',
      cancelText: '取消',
      success: (res1) => {
        if (!res1.confirm) return;
        wx.showModal({
          title: '最后确认',
          content: '确认永久删除全部数据?此操作不可撤销。',
          confirmText: '确认删除',
          confirmColor: '#E74C3C',
          cancelText: '我再想想',
          success: async (res2) => {
            if (!res2.confirm) return;
            await this._performDeleteAccount();
          },
        });
      },
    });
  },

  async _performDeleteAccount() {
    wx.showLoading({ title: '注销中...', mask: true });
    try {
      // 1. 云端删除(按 openid 级联清理所有集合)
      if (app.globalData.cloudReady && wx.cloud) {
        try {
          await wx.cloud.callFunction({ name: 'deleteAccount' });
        } catch (err) {
          console.warn('[deleteAccount] cloud failed', err);
        }
      }

      // 2. 清本地所有业务数据
      try {
        const info = wx.getStorageInfoSync();
        (info.keys || []).forEach(k => {
          // openid 不清,方便重新登录时仍用同一 openid
          if (k === 'openid') return;
          try { wx.removeStorageSync(k); } catch (_) {}
        });
      } catch (_) {}

      // 3. 重置 globalData
      app.globalData.babies = [];
      app.globalData.currentBabyId = '';
      app.globalData.currentBaby = null;
      app.globalData.allRecords = [];
      app.globalData.allergyLogs = [];
      app.globalData.todayRecords = [];
      app.globalData.foodStates = {};
      app.globalData.categoryStates = {};
      app.globalData.onboardingStates = {};

      // 4. 清临时文件
      try {
        const fs = wx.getFileSystemManager();
        const userPath = wx.env.USER_DATA_PATH;
        const files = fs.readdirSync(userPath);
        files.forEach(name => { try { fs.unlinkSync(`${userPath}/${name}`); } catch (_) {} });
      } catch (_) {}

      wx.hideLoading();
      wx.showToast({ title: '账号已注销', icon: 'success', duration: 1500 });

      // 5. 回到引导页重新开始
      setTimeout(() => {
        wx.reLaunch({ url: '/pages/onboarding/onboarding' });
      }, 1500);
    } catch (err) {
      wx.hideLoading();
      wx.showToast({ title: '注销失败,请重试', icon: 'none' });
      console.error('[deleteAccount]', err);
    }
  },

});
