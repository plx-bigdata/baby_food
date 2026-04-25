// pages/allergy/allergy.js — 过敏排查页逻辑

const app = getApp();
const dateUtil = require('../../utils/date');
const foodLibrary = require('../../data/food-library');
const planCategories = require('../../data/plan-categories');
const security = require('../../utils/security');
const SHEET_ANIMATION_DURATION = 280;

Page({
  data: {
    showForm: false,
    renderForm: false,
    allergyForm: {
      date: '',
      time: '',
      notes: '',
    },
    selectedSymptomMap: {},
    symptomTypes: [
      { label: '皮疹', value: 'rash' },
      { label: '腹泻', value: 'diarrhea' },
      { label: '呕吐', value: 'vomit' },
      { label: '湿疹加重', value: 'eczema' },
      { label: '鼻塞', value: 'nasal' },
      { label: '哭闹不安', value: 'fussy' },
      { label: '其他', value: 'other' },
    ],
    severityOptions: [
      { label: '轻度', value: '轻度' },
      { label: '中度', value: '中度' },
      { label: '重度', value: '重度' },
    ],
    severity: '轻度',
    showOtherInput: false,
    otherSymptomText: '',
    suspectList: [],
    confirmedFoodId: '',
    confirmedFoodName: '',
    allergyHistory: [],
    showSuspectModal: false,
    renderSuspectModal: false,
  },

  onLoad() {
    const today = dateUtil.getTodayDateStr();
    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    this.setData({
      'allergyForm.date': today,
      'allergyForm.time': timeStr,
    });
    this.loadAllergyHistory();
  },

  onShow() {
    this.loadAllergyHistory();
  },

  goBack() {
    wx.navigateBack();
  },

  loadAllergyHistory() {
    const babyId = app.globalData.currentBabyId;
    if (babyId) {
      const allergyLogs = wx.getStorageSync(`allergyLogs_${babyId}`) || [];
      app.globalData.allergyLogs = allergyLogs;
    }
    const logs = app.globalData.allergyLogs || [];

    // 为历史遗留的日志补 _id,保证删除/key 唯一性
    let needPersist = false;
    logs.forEach(log => {
      if (!log._id) {
        log._id = `allergy_${new Date(log.createdAt || log.occurredAt || Date.now()).getTime()}_${Math.random().toString(36).slice(2, 8)}`;
        needPersist = true;
      }
    });
    if (needPersist && babyId) {
      wx.setStorageSync(`allergyLogs_${babyId}`, logs);
      app.globalData.allergyLogs = logs;
    }

    const history = logs
      .slice()
      .sort((a, b) => {
        // 主排序:发生时间倒叙;同一时间按创建时间倒叙(最新在前)
        const oa = new Date(a.occurredAt).getTime();
        const ob = new Date(b.occurredAt).getTime();
        if (ob !== oa) return ob - oa;
        const ca = new Date(a.createdAt || 0).getTime();
        const cb = new Date(b.createdAt || 0).getTime();
        return cb - ca;
      })
      .map(log => {
        const food = log.confirmedFood ? foodLibrary.getFoodById(log.confirmedFood) : null;
        const cat = food ? planCategories.getCategoryByFoodId(food.id) : null;
        const display = foodLibrary.getFoodDisplay(food, {
          foodId: log.confirmedFood,
          foodName: log.confirmedFoodName,
        });
        const occurred = new Date(log.occurredAt);
        const timeText = `${String(occurred.getHours()).padStart(2, '0')}:${String(occurred.getMinutes()).padStart(2, '0')}`;
        return {
          ...log,
          dateText: dateUtil.formatDate(occurred, 'YYYY年M月D日'),
          timeText,
          confirmedFoodName: display.foodName || '未确认',
          confirmedFoodEmoji: display.emoji,
          confirmedFoodLocalIconPath: display.localIconPath,
          confirmedFoodIconUrl: display.iconUrl,
          confirmedCatName: cat ? cat.name : '',
        };
      });
    this.setData({ allergyHistory: history });
  },

  onDeleteAllergy(e) {
    const id = e.currentTarget.dataset.id;
    if (!id) return;
    wx.showModal({
      title: '删除过敏记录',
      content: '删除后无法恢复,确定继续?',
      confirmColor: '#FF4757',
      success: (res) => {
        if (!res.confirm) return;
        const ok = app.deleteAllergyLog(id);
        if (ok) {
          wx.showToast({ title: '已删除', icon: 'success' });
          this.loadAllergyHistory();
        } else {
          wx.showToast({ title: '删除失败', icon: 'none' });
        }
      },
    });
  },

  openAllergyForm() {
    this.setData({
      renderForm: true,
      showForm: false,
      suspectList: [],
      confirmedFoodId: '',
      confirmedFoodName: '',
      'allergyForm.notes': '',
      selectedSymptomMap: {},
      severity: '轻度',
      showOtherInput: false,
      otherSymptomText: '',
    }, () => {
      setTimeout(() => this.setData({ showForm: true }), 16);
    });
  },

  closeAllergyForm() {
    if (!this.data.renderForm && !this.data.showForm) return;
    this.setData({ showForm: false }, () => {
      clearTimeout(this._formTimer);
      this._formTimer = setTimeout(() => {
        this.setData({ renderForm: false });
      }, SHEET_ANIMATION_DURATION);
    });
  },

  _formDragY: 0,
  onFormDragStart(e) {
    this._formDragY = e.touches[0].clientY;
  },
  onFormDragEnd(e) {
    if (e.changedTouches[0].clientY - this._formDragY > 80) {
      this.closeAllergyForm();
    }
  },

  openSuspectModal() {
    this.setData({ renderSuspectModal: true, showSuspectModal: false }, () => {
      setTimeout(() => this.setData({ showSuspectModal: true }), 16);
    });
  },

  closeSuspectModal() {
    if (!this.data.renderSuspectModal && !this.data.showSuspectModal) return;
    this.setData({ showSuspectModal: false }, () => {
      clearTimeout(this._suspectTimer);
      this._suspectTimer = setTimeout(() => {
        this.setData({ renderSuspectModal: false, suspectList: [], confirmedFoodId: '', confirmedFoodName: '' });
      }, SHEET_ANIMATION_DURATION);
    });
  },

  _suspectDragY: 0,
  onSuspectDragStart(e) {
    this._suspectDragY = e.touches[0].clientY;
  },
  onSuspectDragEnd(e) {
    if (e.changedTouches[0].clientY - this._suspectDragY > 80) {
      this.closeSuspectModal();
    }
  },

  toggleSymptom(e) {
    const val = e.currentTarget.dataset.value;
    const { selectedSymptomMap } = this.data;
    const newMap = { ...selectedSymptomMap };
    if (newMap[val]) {
      delete newMap[val];
    } else {
      newMap[val] = true;
    }
    this.setData({
      selectedSymptomMap: newMap,
      showOtherInput: !!newMap['other'],
    });
  },

  onOtherSymptomInput(e) {
    this.setData({ otherSymptomText: e.detail.value });
  },

  selectSeverity(e) {
    this.setData({ severity: e.currentTarget.dataset.value });
  },

  onDateChange(e) {
    this.setData({ 'allergyForm.date': e.detail.value });
  },

  onTimeChange(e) {
    this.setData({ 'allergyForm.time': e.detail.value });
  },

  onNotesInput(e) {
    this.setData({ 'allergyForm.notes': e.detail.value });
  },

  analyzeAllergy() {
    const { allergyForm, severity, selectedSymptomMap } = this.data;
    const selectedSymptoms = Object.keys(selectedSymptomMap);
    if (selectedSymptoms.length === 0) {
      wx.showToast({ title: '请至少选择一个症状', icon: 'none' });
      return;
    }

    wx.showLoading({ title: '分析中...' });

    try {
      const { date, time } = allergyForm;
      const occurredAt = new Date(`${date}T${time}:00`).toISOString();

      const records = app.globalData.allRecords || [];
      const windowStart = new Date(new Date(occurredAt).getTime() - 7 * 24 * 60 * 60 * 1000);
      const windowRecords = records.filter(r => {
        if (!r.recordTime) return false;
        const rt = new Date(r.recordTime);
        return rt >= windowStart && rt <= new Date(occurredAt);
      });

      const suspects = this.rankSuspects(windowRecords, occurredAt);

      this.setData({
        suspectList: suspects,
      });
      this.closeAllergyForm();
      this.openSuspectModal();

      wx.hideLoading();
    } catch (err) {
      console.error('[过敏排查] 分析失败:', err);
      wx.hideLoading();
      wx.showToast({ title: '分析失败', icon: 'none' });
    }
  },

  rankSuspects(records, occurredAt) {
    const scored = records.map(r => {
      const food = foodLibrary.getFoodById(r.foodId);
      const cat = food ? planCategories.getCategoryByFoodId(r.foodId) : null;
      const display = foodLibrary.getFoodDisplay(food, r);
      const hoursAgo = (new Date(occurredAt) - new Date(r.recordTime)) / (1000 * 60 * 60);
      const allergyRiskScore = cat
        ? { '低': 1, '中': 2, '高': 3 }[cat.allergyRisk] || 1
        : 1;
      const isFirstScore = r.isFirstTime ? 2 : 0;
      const timeScore = Math.max(0, 1 - hoursAgo / (7 * 24));
      const totalScore = isFirstScore + allergyRiskScore + timeScore * 0.5;

      let confidence = '低';
      if (totalScore >= 4) confidence = '高';
      else if (totalScore >= 2.5) confidence = '中';

      return {
        ...display,
        isFirstTime: r.isFirstTime,
        hoursAgo: Math.round(hoursAgo),
        timeAgoText: this.formatTimeAgo(hoursAgo),
        allergyRisk: cat ? cat.allergyRisk : '低',
        confidence,
        totalScore,
      };
    });

    const deduped = {};
    scored.forEach(s => {
      if (!deduped[s.foodId] || s.totalScore > deduped[s.foodId].totalScore) {
        deduped[s.foodId] = s;
      }
    });

    return Object.values(deduped).sort((a, b) => b.totalScore - a.totalScore);
  },

  formatTimeAgo(hours) {
    if (hours < 1) return '刚刚';
    if (hours < 24) return `${Math.round(hours)}小时`;
    const days = Math.round(hours / 24);
    return `${days}天`;
  },

  confirmFood(e) {
    const id = e.currentTarget.dataset.id;
    const name = e.currentTarget.dataset.name;
    this.setData({ confirmedFoodId: id, confirmedFoodName: name });
  },

  async saveAllergyRecord() {
    const { allergyForm, severity, suspectList, confirmedFoodId, confirmedFoodName, selectedSymptomMap } = this.data;
    const selectedSymptoms = Object.keys(selectedSymptomMap);
    if (!confirmedFoodId) {
      wx.showToast({ title: '请选择过敏食物', icon: 'none' });
      return;
    }

    // 内容安全检测:备注文本过审
    const check = await security.checkText(allergyForm.notes, { scene: 2 });
    if (!check.ok) {
      wx.showToast({ title: '备注含不合规内容', icon: 'none' });
      return;
    }

    const occurredAt = new Date(`${allergyForm.date}T${allergyForm.time}:00`).toISOString();

    const symptomLabelMap = {
      rash: '皮疹', diarrhea: '腹泻', vomit: '呕吐',
      eczema: '湿疹加重', nasal: '鼻塞', fussy: '哭闹不安', other: '其他',
    };
    const symptomText = selectedSymptoms.map(s => symptomLabelMap[s] || s).join('、');

    const log = {
      occurredAt,
      occurredDate: allergyForm.date,
      symptoms: selectedSymptoms,
      symptomText,
      severity,
      notes: allergyForm.notes,
      confirmedFood: confirmedFoodId,
      confirmedFoodName,
      retestDate: this.calcRetestDate(occurredAt),
      createdAt: new Date().toISOString(),
    };

    app.saveAllergyLog(log);

    wx.showToast({ title: '已记录过敏', icon: 'success' });
    this.closeSuspectModal();
    this.loadAllergyHistory();
  },

  calcRetestDate(occurredAt) {
    const d = new Date(occurredAt);
    d.setMonth(d.getMonth() + 3);
    return dateUtil.formatDate(d, 'YYYY-MM-DD');
  },

  async directSaveAllergy() {
    const { allergyForm, severity, selectedSymptomMap } = this.data;
    const selectedSymptoms = Object.keys(selectedSymptomMap);
    if (selectedSymptoms.length === 0) {
      wx.showToast({ title: '请至少选择一个症状', icon: 'none' });
      return;
    }

    // 内容安全检测:备注文本过审
    const check = await security.checkText(allergyForm.notes, { scene: 2 });
    if (!check.ok) {
      wx.showToast({ title: '备注含不合规内容', icon: 'none' });
      return;
    }

    const occurredAt = new Date(`${allergyForm.date}T${allergyForm.time}:00`).toISOString();
    const symptomLabelMap = {
      rash: '皮疹', diarrhea: '腹泻', vomit: '呕吐',
      eczema: '湿疹加重', nasal: '鼻塞', fussy: '哭闹不安', other: '其他',
    };
    const symptomText = selectedSymptoms.map(s => symptomLabelMap[s] || s).join('、');

    const log = {
      occurredAt,
      occurredDate: allergyForm.date,
      symptoms: selectedSymptoms,
      symptomText,
      severity,
      notes: allergyForm.notes,
      confirmedFood: '',
      confirmedFoodName: '',
      retestDate: this.calcRetestDate(occurredAt),
      createdAt: new Date().toISOString(),
    };

    app.saveAllergyLog(log);

    wx.showToast({ title: '已记录过敏', icon: 'success' });
    this.setData({ showForm: false, selectedSymptomMap: {}, suspectList: [] });
    this.loadAllergyHistory();
  },

  noop() {},
});
