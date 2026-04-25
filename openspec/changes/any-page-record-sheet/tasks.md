# Tasks: 全局记录页覆盖层

## Pre-check
- [x] 确认 record.wxml 中 `wx:if="{{selectedFoods.length > 0}}"` 改为 `hasSelected` 变量
- [x] 确认 record.js 中 `_applySelection` 设置 `hasSelected: newSelected.length > 0`

## TabBar 修改
- [x] `custom-tab-bar/index.js`: 点击"+"时用 `wx.navigateTo` 直接打开 `/pages/record/record`
- [x] 移除之前的 `wx.switchTab` + `handleShowRecordSheet` 逻辑

## Record 页面配置
- [x] `pages/record/record.json`: 确认 `navigationStyle: custom`, `backgroundColor: #00000000`, `disableScroll: true`
- [x] `pages/record/record.js` `onLoad`: 添加 `hasSelected: false` 到 data
- [x] `pages/record/record.js` `_applySelection`: 设置 `hasSelected: newSelected.length > 0`

## Record 页面 WXML 修改
- [x] `pages/record/record.wxml`: `selected-bar` 条件从 `wx:if="{{selectedFoods.length > 0}}"` 改为 `wx:if="{{hasSelected}}"`
- [x] 确认记录面板使用行内 style 绑定 transform（兼容性）

## Record 页面样式修改
- [x] `.sheet-body` 添加 `position: relative; z-index: 1010;`
- [x] `.record-panel` 使用行内 style 控制 `transform`
- [x] 确保 `.save-btn` 在可视区域内（底部留足 padding + max-height 限制）

## 测试
- [ ] 从首页点击"+" → 记录页弹出 → 关闭返回首页
- [ ] 从计划页点击"+" → 记录页弹出 → 关闭返回计划页
- [ ] 从过敏页点击"+" → 记录页弹出 → 关闭返回过敏页
- [ ] 选择食物后"记录X种"按钮显示正常
- [ ] 确认面板弹出后保存按钮可见
