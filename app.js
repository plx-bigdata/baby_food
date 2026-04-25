// app.js — 小程序入口

const dateUtil = require('./utils/date');

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
    // 家庭协作
    pendingJoinCode: '',    // 待处理的邀请码（从分享链接打开时带入）
    pendingShareCode: '',   // 当前准备分享的邀请码
    // 云端同步状态：idle | syncing | done | skipped | failed
    cloudSyncStatus: 'idle',
    // 云端同步完成标记（兼容旧判断）
    cloudSyncDone: false,
  },

  /**
   * 小程序启动时执行
   */
  onLaunch() {
    // 初始化云开发环境
    if (wx.cloud) {
      wx.cloud.init({
        env: 'darcy01-9glmf7r53f72d926',
        traceUser: true,
      });
      this.globalData.cloudReady = true;
    }

    // 静默登录:获取 openid(商业化基础)
    this.silentLogin();

    // 检查是否从邀请链接打开（场景值1044=好友转发）
    const opts = wx.getLaunchOptionsSync();
    if (opts && opts.query && opts.query.joinCode) {
      this.globalData.pendingJoinCode = opts.query.joinCode;
    }

    // 加载用户信息
    const userInfo = wx.getStorageSync('userInfo') || {};
    this.globalData.userInfo = userInfo;

    // 加载宝宝列表
    const babies = wx.getStorageSync('babies') || [];
    this.globalData.babies = babies;

    // 加载当前宝宝 ID
    let currentBabyId = wx.getStorageSync('currentBabyId') || '';

    if (babies.length > 0) {
      const currentBabyExists = babies.some(b => b._id === currentBabyId || b.clientId === currentBabyId);
      if (!currentBabyExists) {
        currentBabyId = babies[0].clientId || babies[0]._id;
        wx.setStorageSync('currentBabyId', currentBabyId);
      }
      this.globalData.currentBabyId = currentBabyId;
      // 加载当前宝宝的数据
      this.loadBabyData(currentBabyId);
    }

    // 启动后异步从云端拉取最新数据覆盖本地
    // 即使本地无宝宝也要拉(换设备/清缓存场景)
    this._setCloudSyncStatus(this.globalData.cloudReady ? 'syncing' : 'skipped');
    this.syncFromCloud();
    this.startRealtimeSync();
  },

  _setCloudSyncStatus(status) {
    this.globalData.cloudSyncStatus = status;
    this.globalData.cloudSyncDone = ['done', 'skipped', 'failed'].includes(status);
  },

  _notifySyncFinished() {
    try {
      const pages = getCurrentPages();
      if (pages && pages.length > 0) {
        // 通知所有当前栈中的页面刷新(切 tab 不会卸载页面,所以 plan/history/trace 都可能在栈里)
        pages.forEach(p => {
          if (p && typeof p.refreshFromGlobal === 'function') {
            try { p.refreshFromGlobal(); } catch (_) {}
          }
          if (p && typeof p.onCloudSyncDone === 'function') {
            try { p.onCloudSyncDone(); } catch (_) {}
          }
        });
      }
    } catch (_) {}
  },

  /**
   * 触发云函数(不阻塞 UI,失败入待同步队列)
   */
  _cloudCall(name, data) {
    if (!this.globalData.cloudReady || !wx.cloud) {
      this._enqueuePending(name, data);
      return Promise.resolve({ result: { code: -1, message: 'no cloud' } });
    }
    return wx.cloud.callFunction({ name, data }).catch(err => {
      console.warn(`[cloud] ${name} failed, enqueued`, err);
      this._enqueuePending(name, data);
      return { result: { code: -1, message: String(err) } };
    });
  },

  _enqueuePending(name, data) {
    const key = 'pendingCloudOps';
    const list = wx.getStorageSync(key) || [];
    list.push({ name, data, ts: Date.now() });
    // 最多留 500 条,避免膨胀
    wx.setStorageSync(key, list.slice(-500));
  },

  /**
   * 重试待同步队列
   */
  flushPendingCloudOps() {
    if (!this.globalData.cloudReady || !wx.cloud) return;
    const key = 'pendingCloudOps';
    const list = wx.getStorageSync(key) || [];
    if (list.length === 0) return;
    wx.setStorageSync(key, []);
    list.forEach(op => {
      wx.cloud.callFunction({ name: op.name, data: op.data }).catch(() => {
        this._enqueuePending(op.name, op.data);
      });
    });
  },

  /**
   * 启动后从云端拉取宝宝 + 记录 + 过敏日志,合并到本地
   */
  async syncFromCloud() {
    if (!this.globalData.cloudReady || !wx.cloud) {
      this._setCloudSyncStatus('skipped');
      this._notifySyncFinished();
      return;
    }

    this._setCloudSyncStatus('syncing');

    // 先等 openid 就位,最多等 2 秒
    for (let i = 0; i < 20 && !this.globalData.openid; i++) {
      await new Promise(r => setTimeout(r, 100));
    }
    if (!this.globalData.openid || String(this.globalData.openid).startsWith('local_')) {
      // openid 没拿到,跳过云同步
      this._setCloudSyncStatus('skipped');
      this._notifySyncFinished();
      return;
    }

    // 先重试挂起的操作
    this.flushPendingCloudOps();

    // 1. 拉宝宝列表
    try {
      const res = await wx.cloud.callFunction({ name: 'syncBabies', data: { op: 'list' } });
      const cloudBabies = (res && res.result && res.result.data) || [];
      if (cloudBabies.length > 0) {
        // 云端为准,本地仅作为未同步档案的补充
        const local = this.globalData.babies || [];
        const merged = this._mergeById(cloudBabies, local);
        this.globalData.babies = merged;
        wx.setStorageSync('babies', merged);

        const cur = this.globalData.currentBabyId;
        const curStillValid = cur && merged.some(b => b._id === cur || b.clientId === cur);
        // 本地无 currentBabyId(换设备/清缓存) 或当前 id 在云端列表里不存在 → 落到第一个
        if (!curStillValid) {
          const first = merged[0];
          if (first) {
            this.globalData.currentBabyId = first._id || first.clientId;
            wx.setStorageSync('currentBabyId', this.globalData.currentBabyId);
            this.loadBabyData(this.globalData.currentBabyId);
          }
        } else {
          // 当前宝宝仍在云端列表里:重新走一次 loadBabyData,把云端最新的
          // onboardingStates / settings 等字段同步到 globalData(共享宝宝场景关键)
          this.loadBabyData(cur);
        }
      } else if (this.globalData.babies.length > 0) {
        // 云端为空但本地有:把本地档案推到云端
        this._cloudCall('syncBabies', {
          op: 'upsert',
          data: { babies: this.globalData.babies.map(b => ({ ...b, clientId: b.clientId || b._id })) },
        });
      }
    } catch (err) {
      console.warn('[syncFromCloud] babies', err);
    }

    const babyId = this.globalData.currentBabyId;
    if (!babyId) {
      this._setCloudSyncStatus('done');
      this._notifySyncFinished();
      return;
    }

    // 2. 拉辅食记录
    try {
      const res = await wx.cloud.callFunction({ name: 'getRecords', data: { babyId } });
      const result = (res && res.result) || {};
      const cloudRecords = result.data || [];
      const deletedRecordIds = new Set((result.deletedClientIds || []).filter(Boolean));
      const localRecords = (this.globalData.allRecords || [])
        .filter(r => !deletedRecordIds.has(r.clientId || r._id));
      if (cloudRecords.length > 0) {
        const merged = this._mergeById(cloudRecords, localRecords);
        this.globalData.allRecords = merged;
        wx.setStorageSync(`allRecords_${babyId}`, merged);
        const cloudKeys = new Set(cloudRecords.map(r => r.clientId || r._id).filter(Boolean));
        const missingLocal = localRecords
          .filter(r => {
            const key = r.clientId || r._id;
            return key && !cloudKeys.has(key) && !deletedRecordIds.has(key);
          })
          .map(r => ({ ...r, babyId, clientId: r.clientId || r._id }));
        if (missingLocal.length > 0) {
          this._cloudCall('addRecord', { records: missingLocal });
        }
      } else if (deletedRecordIds.size > 0) {
        this.globalData.allRecords = localRecords;
        wx.setStorageSync(`allRecords_${babyId}`, localRecords);
      } else if (localRecords.length > 0) {
        // 首次同步:把本地历史推到云端
        const batch = localRecords
          .map(r => ({ ...r, babyId, clientId: r.clientId || r._id }));
        this._cloudCall('addRecord', { records: batch });
      }
    } catch (err) {
      console.warn('[syncFromCloud] records', err);
    }

    // 3. 拉过敏日志
    try {
      const res = await wx.cloud.callFunction({ name: 'getAllergyLogs', data: { babyId } });
      const result = (res && res.result) || {};
      const cloudLogs = result.data || [];
      const deletedLogIds = new Set((result.deletedClientIds || []).filter(Boolean));
      const localLogs = (this.globalData.allergyLogs || [])
        .filter(l => !deletedLogIds.has(l.clientId || l._id));
      if (cloudLogs.length > 0) {
        const merged = this._mergeById(cloudLogs, localLogs);
        this.globalData.allergyLogs = merged;
        wx.setStorageSync(`allergyLogs_${babyId}`, merged);
        const cloudKeys = new Set(cloudLogs.map(l => l.clientId || l._id).filter(Boolean));
        const missingLocal = localLogs
          .filter(l => {
            const key = l.clientId || l._id;
            return key && !cloudKeys.has(key) && !deletedLogIds.has(key);
          })
          .map(l => ({ ...l, babyId, clientId: l.clientId || l._id }));
        if (missingLocal.length > 0) {
          this._cloudCall('addAllergyLog', { logs: missingLocal });
        }
      } else if (deletedLogIds.size > 0) {
        this.globalData.allergyLogs = localLogs;
        wx.setStorageSync(`allergyLogs_${babyId}`, localLogs);
      } else if (localLogs.length > 0) {
        const batch = localLogs
          .map(l => ({ ...l, babyId, clientId: l.clientId || l._id }));
        this._cloudCall('addAllergyLog', { logs: batch });
      }
    } catch (err) {
      console.warn('[syncFromCloud] allergyLogs', err);
    }

    // 标记云同步完成,让"跳引导页"判断能基于云端真实结果
    this._setCloudSyncStatus('done');
    this._notifySyncFinished();
  },

  syncFromCloudThrottled(force = false) {
    if (!this.globalData.cloudReady || !wx.cloud) return;
    if (this.globalData.cloudSyncStatus === 'syncing') return;
    const now = Date.now();
    if (!force && this._lastCloudSyncAt && now - this._lastCloudSyncAt < 15000) return;
    this._lastCloudSyncAt = now;
    this.syncFromCloud();
  },

  startRealtimeSync() {
    if (this._realtimeSyncTimer) return;
    this._realtimeSyncTimer = setInterval(() => {
      this.syncFromCloudThrottled();
    }, 15000);
  },

  stopRealtimeSync() {
    if (this._realtimeSyncTimer) {
      clearInterval(this._realtimeSyncTimer);
      this._realtimeSyncTimer = null;
    }
  },

  /**
   * 合并两个对象数组,按 clientId(或 _id)去重,以 a 为准
   */
  _mergeById(a, b) {
    const keyOf = x => x.clientId || x._id;
    const map = new Map();
    (a || []).forEach(x => { if (keyOf(x)) map.set(keyOf(x), x); });
    (b || []).forEach(x => {
      const k = keyOf(x);
      if (k && !map.has(k)) map.set(k, x);
    });
    return Array.from(map.values());
  },

  /**
   * 静默登录:优先走云函数获取真实 openid,失败则用本地持久化 ID 兜底
   * 全程不需要用户授权,不阻塞启动
   */
  silentLogin() {
    // 1. 先读本地缓存(下次启动瞬时可用)
    const cachedOpenid = wx.getStorageSync('openid') || '';
    if (cachedOpenid) {
      this.globalData.openid = cachedOpenid;
    }

    // 2. 调云函数拿真实 openid
    if (this.globalData.cloudReady && wx.cloud) {
      wx.cloud.callFunction({ name: 'login' })
        .then(res => {
          const openid = res && res.result && res.result.openid;
          if (openid && openid !== cachedOpenid) {
            this.globalData.openid = openid;
            wx.setStorageSync('openid', openid);
          }
        })
        .catch(err => {
          console.warn('[login] 云函数调用失败,使用本地兜底', err);
          this.ensureLocalUserId();
        });
    } else {
      this.ensureLocalUserId();
    }
  },

  /**
   * 本地兜底:云函数未部署时,生成一个持久化的本地 ID 作为用户标识
   * 格式: local_xxxxxx,部署云函数后会被真实 openid 覆盖
   */
  ensureLocalUserId() {
    if (this.globalData.openid) return;
    let localId = wx.getStorageSync('openid') || '';
    if (!localId) {
      localId = 'local_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
      wx.setStorageSync('openid', localId);
    }
    this.globalData.openid = localId;
  },

  /**
   * 小程序显示时（含从后台切回 / 通过分享卡片打开）
   * 处理"已运行的小程序"被分享卡片唤起的场景
   */
  onShow(opts) {
    this.startRealtimeSync();
    if (opts && opts.query && opts.query.joinCode) {
      this.globalData.pendingJoinCode = opts.query.joinCode;
      // 通知首页处理（首页 onShow 会读取 pendingJoinCode）
      const pages = getCurrentPages();
      const indexPage = pages && pages.find(p => p.route === 'pages/index/index');
      if (indexPage && typeof indexPage.loadJoinData === 'function') {
        const code = this.globalData.pendingJoinCode;
        this.globalData.pendingJoinCode = null;
        indexPage.loadJoinData(code);
      }
    }
    this.syncFromCloudThrottled();
  },

  /**
   * 加载指定宝宝的数据
   */
  loadBabyData(babyId) {
    const babies = this.globalData.babies || [];
    const target = babies.find(b => b._id === babyId || b.clientId === babyId) || babies[0];
    const targetId = target ? (target.clientId || target._id) : '';
    const baby = target || null;
    if (!baby) {
      this.globalData.currentBabyId = '';
      this.globalData.currentBaby = null;
      return;
    }

    // 修复可能损坏的 settings（确保 testDays 默认为 3）
    if (!baby.settings || typeof baby.settings.testDays !== 'number') {
      baby.settings = { ...baby.settings, testDays: 3, dailyNewFoodLimit: baby.settings?.dailyNewFoodLimit || 1 };
      const idx = this.globalData.babies.findIndex(b => b._id === targetId || b.clientId === targetId);
      if (idx !== -1) {
        this.globalData.babies[idx] = baby;
        wx.setStorageSync('babies', this.globalData.babies);
      }
    }

    // 老用户回填:本地有 customFoods 但 baby 文档里没有,推一次到云端,
    // 让其他家庭成员也能看到自定义食物(只跑一次,baby.customFoods 存在后跳过)
    try {
      if (!Array.isArray(baby.customFoods)) {
        const localRaw = wx.getStorageSync(`customFoods_${targetId}`);
        if (localRaw) {
          const parsed = JSON.parse(localRaw);
          if (Array.isArray(parsed) && parsed.length > 0) {
            baby.customFoods = parsed;
            const idx = this.globalData.babies.findIndex(b => b._id === targetId || b.clientId === targetId);
            if (idx !== -1) {
              this.globalData.babies[idx] = baby;
              wx.setStorageSync('babies', this.globalData.babies);
            }
            this._cloudCall('syncBabies', { op: 'upsert', data: { babies: [baby] } });
          }
        }
      }
    } catch (_) {}

    this.globalData.currentBaby = baby;
    this.globalData.currentBabyId = targetId;
    wx.setStorageSync('currentBabyId', targetId);

    // 加载该宝宝的历史记录
    const allRecords = wx.getStorageSync(`allRecords_${targetId}`) || [];
    const allergyLogs = wx.getStorageSync(`allergyLogs_${targetId}`) || [];
    const todayRecords = wx.getStorageSync(`todayRecords_${targetId}`) || [];
    // onboardingStates 以"宝宝档案上的字段"为准(共享宝宝场景下,云端文档是唯一真相源);
    // 本地 storage 仅作兜底。两者合并后回写,保证下一次 loadBabyData 也能读到。
    const stateFromBaby = baby.onboardingStates || {};
    const stateFromStorage = wx.getStorageSync(`onboardingStates_${targetId}`) || {};
    const onboardingStates = Object.keys(stateFromBaby).length > 0
      ? { ...stateFromStorage, ...stateFromBaby }
      : stateFromStorage;
    if (Object.keys(stateFromBaby).length > 0) {
      wx.setStorageSync(`onboardingStates_${targetId}`, onboardingStates);
    }

    this.globalData.allRecords = allRecords;
    this.globalData.allergyLogs = allergyLogs;
    this.globalData.todayRecords = todayRecords;
    this.globalData.onboardingStates = onboardingStates;

    // 初始化今日记录（日期变化时重置）
    this.initTodayRecords();
  },

  /**
   * 初始化今日记录（日期变化时自动重置）
   */
  initTodayRecords() {
    const babyId = this.globalData.currentBabyId;
    if (!babyId) return;
    const today = this.getTodayStr();
    const dateKey = `todayDate_${babyId}`;
    const storedDate = wx.getStorageSync(dateKey);
    if (storedDate !== today) {
      this.globalData.todayRecords = [];
      wx.setStorageSync(dateKey, today);
      // 保存今日记录（空）
      wx.setStorageSync(`todayRecords_${babyId}`, []);
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
      clientId: id,
      name: babyInfo.name || '',
      birthday: babyInfo.birthday || '',
      gender: babyInfo.gender || '',              // 'boy' | 'girl'
      feedingType: babyInfo.feedingType || '',    // 'breast' | 'formula' | 'mixed'
      height: babyInfo.height || null,
      weight: babyInfo.weight || null,
      birthWeight: babyInfo.birthWeight || null,  // 延迟收集
      birthHeight: babyInfo.birthHeight || null,  // 延迟收集
      isPremature: babyInfo.isPremature || false, // 延迟收集
      familyAllergies: babyInfo.familyAllergies || [], // 延迟收集
      city: babyInfo.city || '',                  // 延迟收集
      avatarUrl: babyInfo.avatarUrl || '',
      settings: { testDays: 3, dailyNewFoodLimit: 1 },
    };
    this.globalData.babies.push(newBaby);
    wx.setStorageSync('babies', this.globalData.babies);
    this._cloudCall('syncBabies', { op: 'upsert', data: { babies: [newBaby] } });
    return newBaby;
  },

  /**
   * 更新宝宝信息
   */
  updateBaby(babyId, updates) {
    const babies = this.globalData.babies;
    const idx = babies.findIndex(b => b._id === babyId || b.clientId === babyId);
    if (idx === -1) return;
    // 深合并 settings
    if (updates.settings) {
      updates.settings = { ...babies[idx].settings, ...updates.settings };
    }
    babies[idx] = { ...babies[idx], ...updates, clientId: babies[idx].clientId || babies[idx]._id };
    this.globalData.babies = babies;
    wx.setStorageSync('babies', babies);
    const updatedKey = babies[idx].clientId || babies[idx]._id;
    if (babyId === this.globalData.currentBabyId || updatedKey === this.globalData.currentBabyId) {
      this.globalData.currentBaby = babies[idx];
    }
    this._cloudCall('syncBabies', { op: 'upsert', data: { babies: [babies[idx]] } });
  },

  /**
   * 删除宝宝
   */
  deleteBaby(babyId) {
    const target = this.globalData.babies.find(b => b._id === babyId || b.clientId === babyId);
    const targetKey = target ? (target.clientId || target._id) : babyId;
    const babies = this.globalData.babies.filter(b => b._id !== babyId && b.clientId !== babyId);
    this.globalData.babies = babies;
    wx.setStorageSync('babies', babies);
    // 清除该宝宝的 storage
    wx.removeStorageSync(`allRecords_${targetKey}`);
    wx.removeStorageSync(`allergyLogs_${targetKey}`);
    wx.removeStorageSync(`todayRecords_${targetKey}`);
    // 异步删除云端
    if (target) {
      const cid = target.clientId || target._id;
      if (cid) this._cloudCall('syncBabies', { op: 'remove', data: { clientId: cid } });
    }
    // 如果删除的是当前宝宝，切换到第一个
    if (babyId === this.globalData.currentBabyId || targetKey === this.globalData.currentBabyId) {
      if (babies.length > 0) {
        this.switchBaby(babies[0].clientId || babies[0]._id);
      } else {
        this.globalData.currentBabyId = '';
        this.globalData.currentBaby = null;
        wx.setStorageSync('currentBabyId', '');
      }
    }
  },

  /**
   * 小程序进入后台
   */
  onHide() {
    // 离开时保存当前宝宝数据
    this.saveCurrentBabyData();
    this.stopRealtimeSync();
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
    const babyId = this.globalData.currentBabyId;
    // 确保每条记录都有稳定 clientId(云端去重用)
    const withId = records.map(r => ({
      ...r,
      clientId: r.clientId || r._id || `rec_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      babyId,
    }));

    const allRecords = this.globalData.allRecords || [];
    const todayRecords = this.globalData.todayRecords || [];
    const todayStr = this.getTodayStr();
    // 只把当天的记录加入 todayRecords(onboarding 历史记录日期是过去)
    const todayOnly = withId.filter(r => dateUtil.getRecordDate(r) === todayStr);
    const newAll = [...allRecords, ...withId];
    const newToday = [...todayRecords, ...todayOnly];
    this.globalData.allRecords = newAll;
    this.globalData.todayRecords = newToday;
    wx.setStorageSync(`allRecords_${babyId}`, newAll);
    wx.setStorageSync(`todayRecords_${babyId}`, newToday);

    // 异步写云端
    this._cloudCall('addRecord', { records: withId });

    // 如果有过敏反应，自动创建过敏日志
    const existingLogs = this.globalData.allergyLogs || [];
    const newLogs = [...existingLogs];
    const logsToSync = [];
    withId.forEach(record => {
      if (record.reaction === '过敏' || record.reaction === '疑似过敏') {
        const existing = newLogs.find(log => log.confirmedFood === record.foodId);
        if (!existing) {
          const log = {
            _id: `allergy_${Date.now()}_${record.foodId}`,
            clientId: `allergy_${Date.now()}_${record.foodId}`,
            babyId,
            symptom: record.reaction === '过敏' ? '过敏反应' : '疑似过敏',
            severity: record.reaction === '过敏' ? '中度' : '轻度',
            occurredAt: record.recordTime,
            occurredDate: dateUtil.getRecordDate(record),
            suspectedFoods: [{ foodId: record.foodId, foodName: record.foodName, confidence: '高' }],
            confirmedFood: record.foodId,
            notes: record.reactionNote || '',
            createdAt: new Date().toISOString(),
          };
          newLogs.push(log);
          logsToSync.push(log);
        }
      }
    });

    if (logsToSync.length > 0) {
      this.globalData.allergyLogs = newLogs;
      wx.setStorageSync(`allergyLogs_${babyId}`, newLogs);
      this._cloudCall('addAllergyLog', { logs: logsToSync });
    }
  },

  /**
   * 删除某天某食物的所有食用记录
   * 同时清理 todayRecords 中对应条目
   * 返回删除的条数
   */
  deleteFoodRecordsByDay(foodId, dateStr) {
    const babyId = this.globalData.currentBabyId;
    if (!babyId || !foodId || !dateStr) return 0;
    const allRecords = this.globalData.allRecords || [];
    const keep = [];
    const removedItems = [];
    allRecords.forEach(r => {
      if (r.foodId === foodId && dateUtil.getRecordDate(r) === dateStr) {
        removedItems.push(r);
      } else {
        keep.push(r);
      }
    });
    if (removedItems.length === 0) return 0;
    this.globalData.allRecords = keep;
    wx.setStorageSync(`allRecords_${babyId}`, keep);

    const today = this.getTodayStr();
    if (dateStr === today) {
      const todayRecords = this.globalData.todayRecords || [];
      const newToday = todayRecords.filter(r => !(r.foodId === foodId && dateUtil.getRecordDate(r) === dateStr));
      this.globalData.todayRecords = newToday;
      wx.setStorageSync(`todayRecords_${babyId}`, newToday);
    }

    // 异步删除云端
    removedItems.forEach(r => {
      const cid = r.clientId || r._id;
      if (cid) this._cloudCall('deleteRecord', { clientId: cid, babyId });
    });

    return removedItems.length;
  },

  /**
   * 保存过敏日志
   */
  saveAllergyLog(log) {
    const logs = this.globalData.allergyLogs || [];
    const id = log._id || `allergy_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const withId = {
      ...log,
      _id: id,
      clientId: log.clientId || id,
      babyId: log.babyId || this.globalData.currentBabyId,
    };
    const newLogs = [...logs, withId];
    this.globalData.allergyLogs = newLogs;
    wx.setStorageSync(`allergyLogs_${this.globalData.currentBabyId}`, newLogs);
    this._cloudCall('addAllergyLog', { log: withId });
  },

  /**
   * 删除过敏日志
   */
  deleteAllergyLog(id) {
    const logs = this.globalData.allergyLogs || [];
    const target = logs.find(l => l._id === id);
    const newLogs = logs.filter(l => l._id !== id);
    if (newLogs.length === logs.length) return false;
    this.globalData.allergyLogs = newLogs;
    wx.setStorageSync(`allergyLogs_${this.globalData.currentBabyId}`, newLogs);
    if (target) {
      const cid = target.clientId || target._id;
      if (cid) this._cloudCall('deleteAllergyLog', { clientId: cid, babyId: this.globalData.currentBabyId });
    }
    return true;
  },
});
