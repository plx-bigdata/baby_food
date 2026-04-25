// components/record-sheet/record-sheet.js
const app = getApp();
const dateUtil = require('../../utils/date');
const foodLibrary = require('../../data/food-library');
const planCategories = require('../../data/plan-categories');
const security = require('../../utils/security');
const SHEET_ANIMATION_DURATION = 280;

Component({
  properties: {
    show: {
      type: Boolean,
      value: false,
      observer(newVal) {
        if (newVal) {
          this._initData();
          this._toggleTabBar(true);
        } else {
          this._toggleTabBar(false);
        }
      }
    }
  },

  data: {
    today: '',
    categoryTabs: [],
    currentCategory: 'all',
    displayFoods: [],
    selectedFoods: [],
    showRecordPanel: false,
    renderRecordPanel: false,
    recordForm: {
      time: '',
    },
    saving: false,
    closing: false,

    foodClassMap: {},
    selectedSet: {},
    foodDayLabelMap: {},
    riskClassMap: { '高': 'danger', '中': 'mid', '低': 'low' },
    riskLabelMap: { '高': '高敏', '中': '中敏', '低': '低' },

    // 自定义食物 + 搜索
    customFoods: [],
    searchKeyword: '',
  },

  methods: {
    _initData() {
      const today = dateUtil.getTodayDateStr();
      const now = new Date();
      const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

      const planCats = planCategories.getAllCategories();
      const categoryTabs = [
        { id: 'all', name: '全部' },
        ...planCats.map(cat => ({ id: cat.id, name: cat.name })),
        { id: 'custom', name: '自定义' },
      ];

      const babyId = app.globalData.currentBabyId || 'default';
      const customFoods = foodLibrary.getCustomFoods(babyId);
      const displayFoods = [...foodLibrary.getAllFoods(), ...customFoods];

      const foodClassMap = {};
      displayFoods.forEach(f => { foodClassMap[f.id] = 'food-card'; });

      this.setData({
        today,
        'recordForm.time': timeStr,
        categoryTabs,
        displayFoods,
        customFoods,
        searchKeyword: '',
        currentCategory: 'all',
        foodClassMap,
        selectedSet: {},
        selectedFoods: [],
        hasSelected: false,
        closing: false,
        showRecordPanel: false,
        renderRecordPanel: false,
      });

      this.computeFoodClassMap();
      this.computeSelectedSet();

      // 手势关闭相关状态重置
      this._sheetDragging = false;
      this._foodGridScrollTop = 0;
      this._foodGridAtTop = true;
      this._foodGridDragStartAtTop = false;
    },

    recomputeAll() {
      this.computeFoodClassMap();
      this.computeSelectedSet();
      this.computeRiskMaps();
    },

    computeFoodClassMap() {
      const { selectedFoods, displayFoods } = this.data;
      const map = {};
      const firstSelectedId = selectedFoods.length > 0 ? selectedFoods[0].id : null;
      displayFoods.forEach(f => {
        const isSelected = selectedFoods.some(sf => sf.id === f.id);
        if (isSelected) {
          const isFirst = f.id === firstSelectedId;
          map[f.id] = 'food-card food-card--selected' + (isFirst ? ' food-card--first' : '');
        } else {
          map[f.id] = 'food-card';
        }
      });
      this.setData({ foodClassMap: map });
    },

    computeSelectedSet() {
      const set = {};
      this.data.selectedFoods.forEach(f => { set[f.id] = true; });
      this.setData({ selectedSet: set });
    },

    computeRiskMaps() {
      const riskClassMap = { '高': 'danger', '中': 'mid', '低': 'low' };
      const riskLabelMap = { '高': '高敏', '中': '中敏', '低': '低' };
      this.setData({ riskClassMap, riskLabelMap });
    },

    switchCategory(e) {
      const id = e.currentTarget.dataset.id;
      this.setData({ currentCategory: id }, () => {
        this._refreshDisplayFoods();
      });
    },

    onSearchInput(e) {
      this.setData({ searchKeyword: e.detail.value }, () => {
        this._refreshDisplayFoods();
      });
    },

    clearSearch() {
      this.setData({ searchKeyword: '' }, () => {
        this._refreshDisplayFoods();
      });
    },

    _refreshDisplayFoods() {
      const { currentCategory, customFoods, searchKeyword } = this.data;
      const kw = (searchKeyword || '').trim().toLowerCase();
      let foods;
      if (kw) {
        const all = [...foodLibrary.getAllFoods(), ...customFoods];
        foods = all.filter(f => (f.name || '').toLowerCase().includes(kw));
      } else if (currentCategory === 'all') {
        foods = [...foodLibrary.getAllFoods(), ...customFoods];
      } else if (currentCategory === 'custom') {
        foods = customFoods;
      } else {
        const foodCategory = currentCategory.startsWith('cat_') ? currentCategory.replace('cat_', '') : currentCategory;
        foods = foodLibrary.getFoodsByCategory(foodCategory);
      }
      this.setData({ displayFoods: foods });
      this.computeFoodClassMap();
    },

    prefillFoods(foodIds) {
      if (!foodIds || foodIds.length === 0) return;
      const customFoods = this.data.customFoods || [];
      const newSelected = [];
      foodIds.forEach(id => {
        let food = foodLibrary.getFoodById(id);
        if (!food) food = customFoods.find(f => f.id === id);
        if (food) newSelected.push(food);
      });
      if (newSelected.length === 0) return;
      this.setData({
        selectedFoods: newSelected,
        hasSelected: true,
      });
      this.computeFoodClassMap();
      this.computeSelectedSet();
    },

    selectFood(e) {
      const id = e.currentTarget.dataset.id;
      let food = foodLibrary.getFoodById(id);
      if (!food) {
        food = (this.data.customFoods || []).find(f => f.id === id);
      }
      if (!food) return;

      const alreadySelected = this.data.selectedFoods.some(f => f.id === id);
      let newSelected;
      if (alreadySelected) {
        newSelected = this.data.selectedFoods.filter(f => f.id !== id);
      } else {
        newSelected = [...this.data.selectedFoods, food];
      }

      this.setData({
        selectedFoods: newSelected,
        hasSelected: newSelected.length > 0
      });
      this.computeFoodClassMap();
      this.computeSelectedSet();
    },

    removeFood(e) {
      const id = e.currentTarget.dataset.id;
      const newSelected = this.data.selectedFoods.filter(f => f.id !== id);
      this.setData({
        selectedFoods: newSelected,
        hasSelected: newSelected.length > 0
      });
      this.computeFoodClassMap();
      this.computeSelectedSet();
    },

    _applySelection() {
      this.computeFoodClassMap();
      this.computeSelectedSet();
      const { selectedFoods } = this.data;
      const foodDayLabelMap = {};

      const allRecords = app.globalData.allRecords || [];
      const foodStates = app.globalData.foodStates || {};

      selectedFoods.forEach(food => {
        const state = foodStates[food.id] || {};
        const foodStatus = state.status || 'pending';

        if (foodStatus === 'allergy') {
          foodDayLabelMap[food.id] = { label: '过敏', type: 'danger' };
        } else if (foodStatus === 'passed' || foodStatus === 'preliminary') {
          foodDayLabelMap[food.id] = { label: '未过敏', type: 'safe' };
        } else {
          const foodRecords = allRecords
            .filter(r => r.foodId === food.id)
            .sort((a, b) => new Date(b.recordTime) - new Date(a.recordTime));
          const eatenCount = foodRecords.length;

          if (eatenCount === 0) {
            foodDayLabelMap[food.id] = { label: '第1天·首次', type: 'testing' };
          } else {
            foodDayLabelMap[food.id] = { label: '第' + (eatenCount + 1) + '天', type: 'testing' };
          }
        }
      });

      this.setData({ foodDayLabelMap });
    },

    openRecordPanel() {
      this._applySelection();
      this.setData({ renderRecordPanel: true, showRecordPanel: false }, () => {
        setTimeout(() => this.setData({ showRecordPanel: true }), 16);
      });
    },

    closeRecordPanel() {
      if (!this.data.renderRecordPanel && !this.data.showRecordPanel) return;
      this.setData({ showRecordPanel: false }, () => {
        clearTimeout(this._recordPanelTimer);
        this._recordPanelTimer = setTimeout(() => {
          this.setData({ renderRecordPanel: false });
        }, SHEET_ANIMATION_DURATION);
      });
    },

    closeSheet() {
      this.setData({ closing: true });
      setTimeout(() => {
        this.triggerEvent('close');
      }, 280);
    },

    onSheetDragStart(e) {
      this._sheetDragY = e.touches[0].clientY;
      this._sheetDragging = true;
    },

    onSheetDragMove() {
      // 占位,保留手势流畅
    },

    onSheetDragEnd(e) {
      if (!this._sheetDragging) return;
      this._sheetDragging = false;
      if (e.changedTouches[0].clientY - this._sheetDragY > 80) {
        this.closeSheet();
      }
    },

    // 食物网格内:滚动到顶部且继续下拉时关闭
    onFoodGridScroll(e) {
      this._foodGridScrollTop = e.detail.scrollTop;
      if (this._foodGridScrollTop > 0) {
        this._foodGridAtTop = false;
      }
    },

    onFoodGridScrollUpper() {
      this._foodGridAtTop = true;
    },

    onFoodGridDragStart(e) {
      this._foodGridDragStartY = e.touches[0].clientY;
      this._foodGridDragStartAtTop = (this._foodGridScrollTop || 0) <= 0 || this._foodGridAtTop;
    },

    onFoodGridDragMove() {},

    onFoodGridDragEnd(e) {
      if (!this._foodGridDragStartAtTop) return;
      const delta = e.changedTouches[0].clientY - (this._foodGridDragStartY || 0);
      if (delta > 80) this.closeSheet();
    },

    onRecordPanelDragStart(e) {
      this._recordPanelDragY = e.touches[0].clientY;
    },

    onRecordPanelDragEnd(e) {
      if (e.changedTouches[0].clientY - this._recordPanelDragY > 80) {
        this.closeRecordPanel();
      }
    },

    onDateChange(e) {
      this.setData({ today: e.detail.value });
    },

    onTimeChange(e) {
      this.setData({ 'recordForm.time': e.detail.value });
    },

    async saveRecord() {
      if (this.data.saving || this.data.selectedFoods.length === 0) return;
      this.setData({ saving: true });

      try {
        const allRecords = app.globalData.allRecords || [];
        const recordTime = `${this.data.today}T${this.data.recordForm.time}:00`;
        const newRecords = this.data.selectedFoods.map(food => {
          const foodRecords = allRecords.filter(r => r.foodId === food.id);
          const isFirstTime = foodRecords.length === 0;
          return {
            foodId: food.id,
            foodName: food.name,
            category: food.category,
            imageUrl: food.imageUrl,
            reaction: '正常',
            isFirstTime,
            dayIndex: foodRecords.length + 1,
            recordTime,
            recordDate: this.data.today,
            recordedAt: new Date().toISOString(),
          };
        });

        app.saveRecords(newRecords);
        wx.showToast({ title: '记录成功', icon: 'success' });

        this.setData({ saving: false, showRecordPanel: false, selectedFoods: [], hasSelected: false, foodDayLabelMap: {} });
        this.triggerEvent('saved');
        this.closeSheet();
      } catch (err) {
        console.error('保存失败', err);
        this.setData({ saving: false });
        wx.showToast({ title: '保存失败', icon: 'none' });
      }
    },

    addCustomFood() {
      wx.showModal({
        title: '添加自定义食物',
        editable: true,
        placeholderText: '食物名称',
        success: async (res) => {
          if (!res.confirm) return;
          const name = (res.content || '').trim();
          if (!name) {
            wx.showToast({ title: '请输入名称', icon: 'none' });
            return;
          }
          const babyId = app.globalData.currentBabyId || 'default';
          const existing = foodLibrary.getCustomFoods(babyId);
          if (existing.some(f => f.name === name)) {
            wx.showToast({ title: '已有同名食物', icon: 'none' });
            return;
          }
          // 内容安全检测(过审要求)
          const check = await security.checkText(name, { scene: 1 });
          if (!check.ok) {
            wx.showToast({ title: '名称不合规,请修改', icon: 'none' });
            return;
          }
          const newFood = {
            id: foodLibrary.generateCustomFoodId(),
            name,
            category: 'custom',
            allergyRisk: '低',
            recommendMonth: 6,
            isCustom: true,
          };
          const updated = [...existing, foodLibrary.enrichCustomFood(newFood)];
          foodLibrary.saveCustomFoods(babyId, updated);
          this.setData({
            customFoods: updated,
            currentCategory: 'custom',
          }, () => {
            this._refreshDisplayFoods();
          });
        },
      });
    },

    _toggleTabBar(hide) {
      const pages = getCurrentPages();
      const currentPage = pages[pages.length - 1];
      const tabBar = currentPage && typeof currentPage.getTabBar === 'function' && currentPage.getTabBar();
      if (tabBar) tabBar.setData({ hidden: !!hide });
    },

    noop() {},
  }
});
