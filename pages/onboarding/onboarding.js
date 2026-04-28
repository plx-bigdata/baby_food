// pages/onboarding/onboarding.js — 首次使用引导

const app = getApp();
const foodLib = require('../../data/food-library');
const planCats = require('../../data/plan-categories');
const dateUtil = require('../../utils/date');
const { chooseAndUploadAvatar } = require('../../utils/avatar-uploader');
const SHEET_ANIMATION_DURATION = 280;

Page({
  data: {
    // 当前步骤
    // welcome | babyInfo | choice | safeSelect | allergySelect | testingSelect | done
    step: 'welcome',
    progressPercent: 0,

    // 宝宝信息表单
    babyForm: { name: '', birthday: '', avatarUrl: '', gender: '', feedingType: '' },

    // 食物选择结果
    safeFoodIds: {},      // { foodId: true } — 已安全
    allergyFoodIds: {},   // { foodId: true } — 已过敏
    testingFoodDays: {},  // { foodId: days } — 测试中（天数）

    // 食物网格
    categoryTabs: [],
    currentCategory: 'all',
    displayFoods: [],
    allFoods: [],

    // 卡片样式 & 状态图标（由 _compute 维护）
    foodClassMap: {},
    foodBadgeMap: {},   // { foodId: 'safe'|'allergy'|'testing' }
    foodDaysMap: {},    // { foodId: days } 显示天数

    // 当前步骤的选中数
    safeCount: 0,
    allergyCount: 0,
    testingCount: 0,

    // 食物滚动位置（步骤切换时重置到顶部）
    foodScrollTop: 0,

    // 天数选择弹窗
    showDayModal: false,
    renderDayModal: false,
    dayModalFood: null,
    dayModalSelected: 1,

    // 步骤标题/说明（由 _stepMeta 维护）
    stepTitle: '',
    stepDesc: '',
    stepBtnText: '',

    // 状态栏高度(用于顶部进度条避让系统时间,默认 44 保底刘海屏)
    statusBarHeight: 44,

    // 隐私协议勾选状态
    agreed: false,

    // 协议弹窗
    showLegalModal: false,
    renderLegalModal: false,
    legalTitle: '',
    legalIntro: '',
    legalSections: [],
  },

  // ─── 内部变量 ─────────────────────────────────────────────
  _pendingTestingId: null,

  // ─── 生命周期 ─────────────────────────────────────────────
  onLoad(options) {
    this._loadFoods();
    try {
      const info = (wx.getWindowInfo && wx.getWindowInfo()) || wx.getSystemInfoSync();
      if (info && info.statusBarHeight) {
        this.setData({ statusBarHeight: info.statusBarHeight });
      }
    } catch (e) {}

    // 从"添加宝宝"入口进来时:宝宝信息已填完,直接跳到"新手/已有经验"选择
    if (options && options.fromAdd === '1') {
      this._fromAdd = true;
      this._goStep('choice', 40);
    }
  },

  // ─── 食物数据 ─────────────────────────────────────────────
  _loadFoods() {
    const cats = planCats.getAllCategories();
    const allFoods = foodLib.getAllFoods();
    const tabs = [
      { id: 'all', name: '全部' },
      ...cats.map(c => ({
        id: c.id.replace('cat_', ''),
        name: c.name,
      })),
    ];
    this.setData({ allFoods, displayFoods: allFoods, categoryTabs: tabs });
  },

  // ─── 步骤导航 ─────────────────────────────────────────────
  _goStep(step, pct) {
    const meta = this._stepMeta(step);
    this.setData({
      step,
      progressPercent: pct || 0,
      currentCategory: 'all',
      displayFoods: this.data.allFoods,
      foodScrollTop: 0,
      ...meta,
    });
    if (['safeSelect', 'allergySelect', 'testingSelect'].includes(step)) {
      this._computeMaps();
    }
    // 切换食物选择步骤时给明确的 toast 提示
    const toastMap = {
      safeSelect: '第1步：标记未过敏的食物',
      allergySelect: '第2步：标记有过敏反应的食物',
      testingSelect: '第3步：标记排敏中的食物',
    };
    if (toastMap[step]) {
      wx.showToast({ title: toastMap[step], icon: 'none', duration: 2500 });
    }
  },

  _stepMeta(step) {
    const metaMap = {
      safeSelect: {
        stepTitle: '哪些食物未过敏？',
        stepDesc: '选择宝宝已经尝试过、且没有出现过敏反应的食物',
        stepBtnText: '下一步',
      },
      allergySelect: {
        stepTitle: '有哪些食物过敏？',
        stepDesc: '选择曾经有过敏反应的食物，没有可直接跳过',
        stepBtnText: '下一步',
      },
      testingSelect: {
        stepTitle: '哪些食物还在排敏中？',
        stepDesc: '选择正在排敏观察中的食物，并告诉我已经吃了几天',
        stepBtnText: '完成，进入首页',
      },
    };
    return metaMap[step] || {};
  },

  _computeMaps() {
    const { step, allFoods, safeFoodIds, allergyFoodIds, testingFoodDays } = this.data;
    const foodClassMap = {};
    const foodBadgeMap = {};
    const foodDaysMap = {};

    allFoods.forEach(food => {
      const id = food.id;
      const isSafe = !!safeFoodIds[id];
      const isAllergy = !!allergyFoodIds[id];
      const isTesting = testingFoodDays[id] !== undefined;

      if (step === 'safeSelect') {
        if (isSafe) {
          foodClassMap[id] = 'food-card food-card--ob-safe';
          foodBadgeMap[id] = 'safe';
        } else if (isAllergy || isTesting) {
          foodClassMap[id] = 'food-card food-card--ob-dim';
        } else {
          foodClassMap[id] = 'food-card';
        }
      } else if (step === 'allergySelect') {
        if (isAllergy) {
          foodClassMap[id] = 'food-card food-card--ob-allergy';
          foodBadgeMap[id] = 'allergy';
        } else if (isSafe) {
          foodClassMap[id] = 'food-card food-card--ob-dim food-card--ob-safe-locked';
          foodBadgeMap[id] = 'safe';
        } else if (isTesting) {
          foodClassMap[id] = 'food-card food-card--ob-dim';
        } else {
          foodClassMap[id] = 'food-card';
        }
      } else if (step === 'testingSelect') {
        if (isTesting) {
          foodClassMap[id] = 'food-card food-card--ob-testing';
          foodBadgeMap[id] = 'testing';
          foodDaysMap[id] = testingFoodDays[id];
        } else if (isSafe) {
          foodClassMap[id] = 'food-card food-card--ob-dim food-card--ob-safe-locked';
          foodBadgeMap[id] = 'safe';
        } else if (isAllergy) {
          foodClassMap[id] = 'food-card food-card--ob-dim food-card--ob-allergy-locked';
          foodBadgeMap[id] = 'allergy';
        } else {
          foodClassMap[id] = 'food-card';
        }
      }
    });

    this.setData({
      foodClassMap,
      foodBadgeMap,
      foodDaysMap,
      safeCount: Object.keys(safeFoodIds).length,
      allergyCount: Object.keys(allergyFoodIds).length,
      testingCount: Object.keys(testingFoodDays).length,
    });
  },

  // ─── Welcome ──────────────────────────────────────────────
  onStart() {
    if (!this.data.agreed) {
      wx.showToast({ title: '请先阅读并同意用户协议', icon: 'none' });
      return;
    }
    wx.setStorageSync('privacyAgreed', '1');
    wx.setStorageSync('privacyAgreedAt', new Date().toISOString());
    this._goStep('babyInfo', 20);
  },

  toggleAgree() {
    this.setData({ agreed: !this.data.agreed });
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
    }, SHEET_ANIMATION_DURATION);
  },

  _legalModalDragY: 0,
  onLegalModalDragStart(e) {
    this._legalModalDragY = e.touches[0].clientY;
  },
  onLegalModalDragEnd(e) {
    if (e.changedTouches[0].clientY - this._legalModalDragY > 80) {
      this.closeLegalModal();
    }
  },

  // ─── Baby Info ────────────────────────────────────────────
  onNameInput(e) {
    this.setData({ 'babyForm.name': e.detail.value });
  },
  onBirthdayChange(e) {
    this.setData({ 'babyForm.birthday': e.detail.value });
  },
  async chooseBabyAvatar() {
    const fileID = await chooseAndUploadAvatar();
    if (fileID) this.setData({ 'babyForm.avatarUrl': fileID });
  },
  selectGender(e) {
    this.setData({ 'babyForm.gender': e.currentTarget.dataset.gender });
  },
  selectFeedingType(e) {
    this.setData({ 'babyForm.feedingType': e.currentTarget.dataset.feeding });
  },
  saveBabyAndNext() {
    const { name, birthday, gender, feedingType } = this.data.babyForm;
    if (!name.trim()) {
      wx.showToast({ title: '请输入宝宝昵称', icon: 'none' });
      return;
    }
    if (!birthday) {
      wx.showToast({ title: '请选择出生日期', icon: 'none' });
      return;
    }
    if (!gender) {
      wx.showToast({ title: '请选择宝宝性别', icon: 'none' });
      return;
    }
    if (!feedingType) {
      wx.showToast({ title: '请选择喂养方式', icon: 'none' });
      return;
    }
    const baby = app.addBaby({
      name: name.trim(),
      birthday,
      gender,
      feedingType,
      avatarUrl: this.data.babyForm.avatarUrl || '',
    });
    app.globalData.currentBaby = baby;
    app.globalData.currentBabyId = baby._id;
    wx.setStorageSync('currentBabyId', baby._id);
    this._goStep('choice', 40);
  },

  // ─── Choice ───────────────────────────────────────────────
  chooseNew() {
    // 刚开始 — 直接进入app
    this._finishOnboarding(false);
  },
  chooseExisting() {
    // 已有辅食经历 — 进入食物选择
    this._goStep('safeSelect', 60);
  },

  // ─── 分类切换 ─────────────────────────────────────────────
  switchCategory(e) {
    const catId = e.currentTarget.dataset.id;
    const display = catId === 'all'
      ? this.data.allFoods
      : foodLib.getFoodsByCategory(catId);
    this.setData({ currentCategory: catId, displayFoods: display });
  },

  // ─── 食物点击 ─────────────────────────────────────────────
  onFoodTap(e) {
    const id = e.currentTarget.dataset.id;
    const { step, safeFoodIds, allergyFoodIds, testingFoodDays, allFoods } = this.data;
    const food = allFoods.find(f => f.id === id);
    if (!food) return;

    if (step === 'safeSelect') {
      // 已标记为过敏/测试中的不能再选安全
      if (allergyFoodIds[id] || testingFoodDays[id] !== undefined) return;
      const newSafe = { ...safeFoodIds };
      if (newSafe[id]) delete newSafe[id];
      else newSafe[id] = true;
      this.setData({ safeFoodIds: newSafe });
      this._computeMaps();

    } else if (step === 'allergySelect') {
      // 已标记为安全的：在过敏页显示但不可再选（已有锁定图标）
      if (safeFoodIds[id]) return;
      const newAllergy = { ...allergyFoodIds };
      if (newAllergy[id]) delete newAllergy[id];
      else newAllergy[id] = true;
      this.setData({ allergyFoodIds: newAllergy });
      this._computeMaps();

    } else if (step === 'testingSelect') {
      // 已安全 / 已过敏的不可选
      if (safeFoodIds[id] || allergyFoodIds[id]) return;
      const newTesting = { ...testingFoodDays };
      if (newTesting[id] !== undefined) {
        // 再次点击 → 取消
        delete newTesting[id];
        this.setData({ testingFoodDays: newTesting });
        this._computeMaps();
      } else {
        // 弹出天数选择
        this._pendingTestingId = id;
        this.setData({
          renderDayModal: true,
          showDayModal: false,
          dayModalFood: food,
          dayModalSelected: 1,
        }, () => {
          setTimeout(() => this.setData({ showDayModal: true }), 16);
        });
      }
    }
  },

  // ─── 天数弹窗 ─────────────────────────────────────────────
  selectDay(e) {
    this.setData({ dayModalSelected: e.currentTarget.dataset.days });
  },
  confirmDay() {
    const id = this._pendingTestingId;
    if (!id) return;
    const newTesting = { ...this.data.testingFoodDays, [id]: this.data.dayModalSelected };
    this.setData({ testingFoodDays: newTesting });
    this._pendingTestingId = null;
    this._computeMaps();
    this.closeDayModal();
  },
  closeDayModal() {
    if (!this.data.renderDayModal && !this.data.showDayModal) return;
    this.setData({ showDayModal: false }, () => {
      clearTimeout(this._dayModalTimer);
      this._dayModalTimer = setTimeout(() => {
        this.setData({ renderDayModal: false, dayModalFood: null });
      }, SHEET_ANIMATION_DURATION);
    });
    this._pendingTestingId = null;
  },

  _dayModalDragY: 0,
  onDayModalDragStart(e) {
    this._dayModalDragY = e.touches[0].clientY;
  },
  onDayModalDragEnd(e) {
    if (e.changedTouches[0].clientY - this._dayModalDragY > 80) {
      this.closeDayModal();
    }
  },

  // ─── 步骤间导航 ───────────────────────────────────────────
  goBack() {
    // 从"添加宝宝"入口进来 + 当前在 choice 步骤 → 直接返回首页
    if (this._fromAdd && this.data.step === 'choice') {
      wx.navigateBack();
      return;
    }
    const backMap = {
      babyInfo: 'welcome',
      choice: 'babyInfo',
      safeSelect: 'choice',
      allergySelect: 'safeSelect',
      testingSelect: 'allergySelect',
    };
    const pctMap = {
      welcome: 0, babyInfo: 20, choice: 40,
      safeSelect: 60, allergySelect: 70, testingSelect: 80,
    };
    const prev = backMap[this.data.step];
    if (prev) {
      this._goStep(prev, pctMap[prev]);
    }
  },

  onNextStep() {
    const { step } = this.data;
    if (step === 'safeSelect') this._goStep('allergySelect', 75);
    else if (step === 'allergySelect') this._goStep('testingSelect', 88);
    else if (step === 'testingSelect') this._finishOnboarding(true);
  },

  // ─── 完成引导 ─────────────────────────────────────────────
  _finishOnboarding(hasHistory) {
    const baby = app.globalData.currentBaby;
    if (!baby) return;

    const today = new Date();
    const allRecords = [];
    const allergyLogs = [];
    const onboardingStates = {};

    if (hasHistory) {
      // 安全食物:只存状态标记,不写任何辅食记录
      Object.keys(this.data.safeFoodIds).forEach(foodId => {
        onboardingStates[foodId] = 'passed';
      });

      // 过敏食物:写过敏日志(带 clientId 便于云端去重)
      Object.keys(this.data.allergyFoodIds).forEach(foodId => {
        const food = foodLib.getFoodById(foodId);
        if (!food) return;
        const d = new Date(today);
        d.setDate(d.getDate() - 1);
        d.setHours(12, 0, 0, 0);
        const cid = `ob_al_${baby._id}_${foodId}`;
        allergyLogs.push({
          _id: cid,
          clientId: cid,
          babyId: baby._id,
          symptom: '过敏反应',
          severity: '中度',
          occurredAt: d.toISOString(),
          occurredDate: dateUtil.getLocalDateStr(d),
          suspectedFoods: [{ foodId, foodName: food.name, confidence: '高' }],
          confirmedFood: foodId,
          notes: '引导时标记',
          createdAt: new Date().toISOString(),
        });
      });

      // 测试中食物:写 N 天记录,时间固定为中午 12:00
      Object.entries(this.data.testingFoodDays).forEach(([foodId, days]) => {
        const food = foodLib.getFoodById(foodId);
        if (!food) return;
        const n = parseInt(days) || 1;
        for (let i = n; i >= 1; i--) {
          const d = new Date(today);
          d.setDate(d.getDate() - i);
          d.setHours(12, 0, 0, 0);
          const cid = `ob_t_${baby._id}_${foodId}_${i}`;
          allRecords.push({
            _id: cid,
            clientId: cid,
            babyId: baby._id,
            foodId,
            foodName: food.name,
            category: food.category,
            reaction: '正常',
            reactionNote: '',
            recordTime: d.toISOString(),
            recordDate: dateUtil.getLocalDateStr(d),
            isFirstTime: i === n,
          });
        }
      });
    }

    // onboardingStates 挂到 baby 档案上,跟随 babies 集合上云
    app.updateBaby(baby._id, { onboardingStates });
    app.globalData.onboardingStates = onboardingStates;
    wx.setStorageSync(`onboardingStates_${baby._id}`, onboardingStates);
    wx.setStorageSync('onboardingComplete', '1');

    // 通过 app 方法写入,触发云同步
    if (allRecords.length > 0) {
      app.saveRecords(allRecords);
    }
    allergyLogs.forEach(log => app.saveAllergyLog(log));

    // 显示完成屏，1.5s 后跳首页
    this.setData({ step: 'done', progressPercent: 100 });
    setTimeout(() => {
      wx.reLaunch({ url: '/pages/index/index' });
    }, 1600);
  },

  noop() {},
});
