// components/share-report/share-report.js

const app = getApp();
const foodLibrary = require('../../data/food-library');
const planCategories = require('../../data/plan-categories');
const planEngine = require('../../utils/plan-engine');

const CAT_BG = {
  cat_grain:'#FFF3E0', cat_vegetable:'#E8F5E9', cat_fruit:'#FFF9C4',
  cat_meat:'#FFEBEE', cat_seafood:'#E3F2FD', cat_egg:'#FFF8E1',
  cat_legume:'#F3E5F5', cat_dairy:'#E0F7FA', cat_nut:'#EFEBE9', cat_oil_fat:'#F1F8E9',
};

const QUOTES = [
  '继续探索，每一口都是新发现',
  '小小美食家，一步一个脚印',
  '宝宝的味蕾正在环游世界',
  '慢慢来，每种食物都值得品尝',
  '用心的辅食，是爱的味道',
];

Component({
  properties: {
    show: { type: Boolean, value: false },
  },

  data: {
    closing: false,
    passedCount: 0,
    totalCount: 0,
    allergyCount: 0,
    testingCount: 0,
    babyName: '',
    babyAge: '',
    categoryStats: [],
    quote: '',
    generating: false,
    posterImagePath: '',
    reportCode: '',
    renderShare: false,
    showShare: false,
  },

  observers: {
    'show': function(val) {
      if (val) {
        this._assembleData();
        // 清除上次的海报缓存，下次重新生成
        this.setData({ posterImagePath: '', reportCode: '' });
        // 隐藏自定义 tabBar，避免遮挡底部按钮
        const pages = getCurrentPages();
        const page = pages[pages.length - 1];
        const tb = page && page.getTabBar && page.getTabBar();
        if (tb) tb.setData({ hidden: true });
      } else {
        const pages = getCurrentPages();
        const page = pages[pages.length - 1];
        const tb = page && page.getTabBar && page.getTabBar();
        if (tb) tb.setData({ hidden: false });
      }
    },
  },

  methods: {
    /**
     * 组装海报数据
     */
    _assembleData() {
      const baby = app.globalData.currentBaby;
      if (!baby) return;

      const babyName = baby.name || '';
      let babyAge = '';
      if (baby.birthday) {
        const birth = new Date(baby.birthday);
        const now = new Date();
        const months = (now.getFullYear() - birth.getFullYear()) * 12 + (now.getMonth() - birth.getMonth());
        if (months > 0) babyAge = months + '个月';
      }

      const records = app.globalData.allRecords || [];
      const allergyLogs = app.globalData.allergyLogs || [];
      const settings = baby.settings || { testDays: 3 };
      const babyId = app.globalData.currentBabyId || 'default';
      const customFoods = foodLibrary.getCustomFoods(babyId);
      const onboardingStates = app.globalData.onboardingStates
        || wx.getStorageSync(`onboardingStates_${babyId}`) || {};

      const foodStates = planEngine.computeAllFoodStates(records, allergyLogs, settings, onboardingStates, customFoods);
      const allFoods = [...foodLibrary.getAllFoods(), ...customFoods];

      let passedCount = 0;
      let allergyCount = 0;
      let testingCount = 0;
      allFoods.forEach(food => {
        const state = foodStates[food.id] || {};
        if (state.status === 'passed' || state.status === 'preliminary') passedCount++;
        else if (state.status === 'allergy') allergyCount++;
        else if (state.status === 'testing') testingCount++;
      });

      const categories = planCategories.getAllCategories();
      const categoryStats = categories.map(cat => {
        let passed = 0;
        cat.foodIds.forEach(fid => {
          const st = foodStates[fid] || {};
          if (st.status === 'passed' || st.status === 'preliminary') passed++;
        });
        return {
          id: cat.id, name: cat.name, icon: cat.icon,
          passed, total: cat.foodIds.length,
          bgColor: CAT_BG[cat.id] || '#F0EBE6',
        };
      });

      const quote = QUOTES[Math.floor(Math.random() * QUOTES.length)];

      this.setData({
        babyName, babyAge,
        passedCount,
        allergyCount,
        testingCount,
        totalCount: allFoods.length,
        categoryStats,
        quote,
      });
    },

    /**
     * 关闭弹窗
     */
    closeSheet() {
      this.setData({ closing: true });
      setTimeout(() => {
        this.setData({ closing: false });
        this.triggerEvent('close');
      }, 280);
    },

    /**
     * 点击"分享" -> 生成海报 -> 弹出分享浮层
     */
    async sharePoster() {
      let tempPath = this.data.posterImagePath;

      if (!tempPath) {
        this.setData({ generating: true });
        try {
          tempPath = await this._drawPoster();
          this.setData({ posterImagePath: tempPath, generating: false });
        } catch (err) {
          console.error('[ShareReport] 海报生成失败:', err);
          this.setData({ generating: false });
          wx.showToast({ title: '海报生成失败', icon: 'none' });
          return;
        }
      }

      const reportCode = await this._ensureReportShare();
      if (!reportCode) {
        wx.showToast({ title: '报告链接生成失败，请稍后再试', icon: 'none' });
        return;
      }

      this.setData({ renderShare: true, showShare: false }, () => {
        setTimeout(() => this.setData({ showShare: true }), 16);
      });
    },

    closeShare() {
      this.setData({ showShare: false }, () => {
        setTimeout(() => this.setData({ renderShare: false }), 300);
      });
    },

    noop() {},

    _sheetDragY: 0,
    _posterScrollTop: 0,
    onPosterScroll(e) {
      this._posterScrollTop = e.detail.scrollTop || 0;
    },
    onSheetDragStart(e) {
      this._sheetDragY = e.touches[0].clientY;
      this._sheetDragStartScrollTop = this._posterScrollTop;
    },
    onSheetDragEnd(e) {
      // 仅在内容已滚到顶部时，才允许下滑关闭
      if (this._sheetDragStartScrollTop > 5) return;
      if (e.changedTouches[0].clientY - this._sheetDragY > 80) {
        this.closeSheet();
      }
    },

    shareToTimeline() {
      const tempPath = this.data.posterImagePath;
      if (!tempPath) return;
      this._doSaveImage(tempPath, () => {
        wx.showToast({ title: '已保存，请从相册分享到朋友圈', icon: 'none', duration: 2500 });
        this.closeShare();
      });
    },

    collectPoster() {
      wx.showToast({ title: '请长按海报图片选择收藏', icon: 'none', duration: 2000 });
    },

    saveShareImage() {
      const tempPath = this.data.posterImagePath;
      if (!tempPath) return;
      this._doSaveImage(tempPath, () => {
        wx.showToast({ title: '已保存到相册', icon: 'success' });
      });
    },

    _doSaveImage(filePath, onSuccess) {
      // 直接调 saveImageToPhotosAlbum,新版微信会自动弹权限框
      // 失败时根据 errMsg 区分:权限拒绝 → 引导去设置;其他 → toast 提示
      wx.saveImageToPhotosAlbum({
        filePath,
        success: onSuccess,
        fail: (err) => {
          const msg = (err && err.errMsg) || '';
          if (/deny|denied|auth/i.test(msg)) {
            wx.showModal({
              title: '需要相册权限',
              content: '保存图片到相册,需要先在「设置」中允许相册权限',
              confirmText: '去设置',
              cancelText: '取消',
              success: m => {
                if (!m.confirm) return;
                wx.openSetting({
                  success: settingRes => {
                    // 用户从设置授权回来,自动重试一次
                    if (settingRes.authSetting && settingRes.authSetting['scope.writePhotosAlbum']) {
                      wx.saveImageToPhotosAlbum({
                        filePath,
                        success: onSuccess,
                        fail: () => wx.showToast({ title: '保存失败,请稍后重试', icon: 'none' }),
                      });
                    }
                  },
                });
              },
            });
          } else {
            wx.showToast({ title: '保存失败,请稍后重试', icon: 'none' });
          }
        },
      });
    },

    async saveToAlbum() {
      let tempPath = this.data.posterImagePath;
      if (!tempPath) {
        this.setData({ generating: true });
        try {
          tempPath = await this._drawPoster();
          this.setData({ posterImagePath: tempPath, generating: false });
        } catch (err) {
          this.setData({ generating: false });
          wx.showToast({ title: '海报生成失败', icon: 'none' });
          return;
        }
      }
      this._doSaveImage(tempPath, () => {
        wx.showToast({ title: '已保存到相册', icon: 'success' });
      });
    },

    /**
     * 提供分享数据给页面
     */
    getShareData() {
      const { babyName, passedCount, totalCount, posterImagePath, reportCode } = this.data;
      const title = babyName
        ? `${babyName}已探索${passedCount}种辅食啦`
        : `宝宝已探索${passedCount}/${totalCount}种辅食`;
      const path = reportCode
        ? `/pages/share-report/share-report?reportCode=${encodeURIComponent(reportCode)}`
        : '/pages/index/index';
      return { title, path, imageUrl: posterImagePath || '' };
    },

    _buildReportPayload() {
      const {
        babyName,
        babyAge,
        passedCount,
        totalCount,
        allergyCount,
        testingCount,
        categoryStats,
        quote,
      } = this.data;
      return {
        babyName,
        babyAge,
        passedCount,
        totalCount,
        allergyCount,
        testingCount,
        categoryStats,
        quote,
        createdAt: new Date().toISOString(),
      };
    },

    _makeReportCode() {
      return `RPT${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
    },

    async _ensureReportShare() {
      if (this.data.reportCode) return this.data.reportCode;
      if (!wx.cloud || !app.globalData.cloudReady) return '';

      const reportCode = this._makeReportCode();
      try {
        const res = await wx.cloud.callFunction({
          name: 'familyShare',
          data: {
            op: 'createReport',
            reportCode,
            report: this._buildReportPayload(),
          },
        });
        const result = res.result || {};
        if (result.code !== 0) throw new Error(result.message || 'create report failed');
        this.setData({ reportCode });
        return reportCode;
      } catch (err) {
        console.error('[ShareReport] 报告链接生成失败:', err);
        return '';
      }
    },

    /**
     * Canvas 2D 绘制海报
     */
    async _drawPoster() {
      // 组件内使用 this.createSelectorQuery()
      const query = this.createSelectorQuery();
      const canvas = await new Promise(resolve => {
        query.select('#poster-canvas').fields({ node: true, size: true }).exec(res => {
          resolve(res[0] && res[0].node);
        });
      });
      if (!canvas) throw new Error('canvas 节点未找到');

      const ctx = canvas.getContext('2d');
      const dpr = wx.getWindowInfo().pixelRatio || 2;
      const W = 375;

      const { categoryStats, babyName, babyAge, passedCount, allergyCount, testingCount, totalCount, quote } = this.data;

      const catGridRows = Math.ceil(categoryStats.length / 5);
      const statsH = 90;
      const heroH = 96;
      const heroStatsGap = 28;
      const H = heroH + heroStatsGap + statsH + 16 + catGridRows * 68 + 16 + 140;

      canvas.width = W * dpr;
      canvas.height = H * dpr;
      ctx.scale(dpr, dpr);

      // 1. 背景
      ctx.fillStyle = '#FDF8F4';
      ctx.fillRect(0, 0, W, H);

      // 2. 头部
      ctx.fillStyle = '#FF8C69';
      ctx.fillRect(0, 0, W, heroH);

      ctx.fillStyle = '#fff';
      ctx.font = 'bold 17px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'alphabetic';
      ctx.fillText((babyName || '宝宝') + '的美食探险日记', W / 2, 36);

      const badgeText = `${passedCount} / ${totalCount} 种已探索`;
      ctx.font = 'bold 13px sans-serif';
      const bw = ctx.measureText(badgeText).width + 32;
      const bx = (W - bw) / 2;
      ctx.fillStyle = 'rgba(255,255,255,0.3)';
      this._roundRect(ctx, bx, 52, bw, 28, 14);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.fillText(badgeText, W / 2, 71);

      // 3. 排敏进度统计(三张卡,与首页 safety-box 同一风格)
      let y = heroH + heroStatsGap;
      const statGap = 6;
      const statW = (W - 48 - statGap * 2) / 3;
      const stats = [
        { icon: '✓', label: '未过敏', count: passedCount,   bg: '#D9F7BE', border: '#52C41A' },
        { icon: '↻', label: '排敏中', count: testingCount,  bg: '#FFF7E6', border: '#FAAD14' },
        { icon: '!', label: '过敏',   count: allergyCount,  bg: '#FFF1F0', border: '#FF4D4F' },
      ];
      stats.forEach((s, i) => {
        const sx = 24 + i * (statW + statGap);

        // 卡片底色 + 边框
        ctx.fillStyle = s.bg;
        this._roundRect(ctx, sx, y, statW, statsH, 8);
        ctx.fill();
        ctx.strokeStyle = s.border;
        ctx.lineWidth = 1;
        this._roundRect(ctx, sx, y, statW, statsH, 8);
        ctx.stroke();

        // 图标(主色,bold 20px)
        ctx.fillStyle = s.border;
        ctx.font = 'bold 20px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'alphabetic';
        ctx.fillText(s.icon, sx + statW / 2, y + 30);

        // 标签(14px bold,主文字色)
        ctx.fillStyle = '#5A4A42';
        ctx.font = 'bold 14px sans-serif';
        ctx.fillText(s.label, sx + statW / 2, y + 56);

        // 数量(12px,次要文字色)
        ctx.fillStyle = '#9B8B82';
        ctx.font = '12px sans-serif';
        ctx.fillText(`${s.count}种`, sx + statW / 2, y + 76);
      });
      y += statsH + 16;

      // 4. 分类网格(5 列)
      const gridCols = 5;
      const cellW = (W - 48) / gridCols;
      const cellH = 68;

      categoryStats.forEach((cat, i) => {
        const col = i % gridCols;
        const row = Math.floor(i / gridCols);
        const cx = 24 + col * cellW + cellW / 2;
        const cy = y + row * cellH;

        ctx.fillStyle = cat.bgColor;
        ctx.beginPath();
        ctx.arc(cx, cy + 17, 17, 0, Math.PI * 2);
        ctx.fill();

        ctx.font = '17px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(cat.icon, cx, cy + 17);

        ctx.font = '11px sans-serif';
        ctx.fillStyle = '#5A4A42';
        ctx.textBaseline = 'alphabetic';
        ctx.fillText(cat.name, cx, cy + 46);

        ctx.font = 'bold 10px sans-serif';
        ctx.fillStyle = '#D4A9A0';
        ctx.fillText(`${cat.passed}/${cat.total}`, cx, cy + 60);
      });

      y += catGridRows * cellH + 16;

      // 5. 底部
      const footerY = y + 10;
      const qrSize = 100;
      const qrX = W - 24 - qrSize;

      ctx.font = '13px sans-serif';
      ctx.fillStyle = '#BBA99E';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'alphabetic';
      ctx.fillText(quote, 24, footerY + 30);

      ctx.font = '12px sans-serif';
      ctx.fillStyle = '#D4B5A8';
      ctx.fillText('【呀咪宝宝辅食】', 24, footerY + 55);

      // 右侧小程序码（真实图片，占满容器保证可扫描）
      await new Promise(resolve => {
        const qrImg = canvas.createImage();
        qrImg.onload = () => {
          ctx.drawImage(qrImg, qrX, footerY, qrSize, qrSize);
          resolve();
        };
        qrImg.onerror = () => resolve();
        qrImg.src = '/static/images/qrcode.jpg';
      });

      return new Promise((resolve, reject) => {
        wx.canvasToTempFilePath({
          canvas,
          fileType: 'png',
          quality: 1.0,
          success: res => resolve(res.tempFilePath),
          fail: reject,
        });
      });
    },

    _roundRect(ctx, x, y, w, h, r) {
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.lineTo(x + w - r, y);
      ctx.arcTo(x + w, y, x + w, y + r, r);
      ctx.lineTo(x + w, y + h - r);
      ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
      ctx.lineTo(x + r, y + h);
      ctx.arcTo(x, y + h, x, y + h - r, r);
      ctx.lineTo(x, y + r);
      ctx.arcTo(x, y, x + r, y, r);
      ctx.closePath();
    },
  },
});
