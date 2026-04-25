## 1. 修改 app.json

- [x] 1.1 将 `pages/record/record` 从 `tabBar.list` 中移除（保留在 `pages` 数组）

## 2. 修改 tabBar 组件

- [x] 2.1 从 `custom-tab-bar/index.js` 的 `list` 数组中移除 record 条目
- [x] 2.2 将中间加号按钮的点击逻辑从 `wx.switchTab` 改为 `wx.navigateTo`（在 `switchTab` 方法中判断 `tabbar-item--record` 或单独处理）
- [x] 2.3 更新 `custom-tab-bar/index.wxml`，中间加号按钮不再参与 `currentSelected` 选中态渲染

## 3. 修改记录页

- [x] 3.1 移除 `pages/record/record.js` 中 `onShow` 的 tabBar 同步逻辑（`getTabBar().setData`）
- [x] 3.2 在 `saveRecord()` 成功后添加 `wx.navigateBack()` 调用
- [x] 3.3 将 `pages/record/record.wxss` 中 `selected-bar` 的 `bottom` 恢复为 `0`，移除 tabBar 高度偏移
