## Why

记录页目前作为底部 tabBar 的一级页面存在，但其核心使用场景是"快速记录一次辅食"，更适合以模态页面的方式从加号按钮弹出，减少一个常驻 tab 位置，让导航结构更清晰。

## What Changes

- 将 `pages/record/record` 从 tabBar 的一级页面改为普通页面（navigateTo 跳转）
- 中间加号按钮点击后通过 `wx.navigateTo` 跳转到记录页，而非 `wx.switchTab`
- tabBar 保留加号图标但不再高亮选中态（记录页不在 tab 列表中）
- `app.json` 中将 record 从 `tabBar.list` 移除，保留在 `pages` 列表
- tabBar 组件中间按钮的跳转逻辑从 `switchTab` 改为 `navigateTo`
- 记录页顶部显示微信原生导航栏（带返回按钮），或自定义返回按钮

## Capabilities

### New Capabilities
- `record-as-subpage`: 记录页作为二级页面，通过 navigateTo 打开，保存后自动返回上一页

### Modified Capabilities
<!-- 无现有 spec 文件，无需填写 -->

## Impact

- `app.json`：tabBar.list 移除 record 条目
- `custom-tab-bar/index.js`：中间按钮改用 `wx.navigateTo`，`list` 数组移除 record 条目
- `custom-tab-bar/index.wxml`：中间按钮不参与选中态逻辑
- `pages/record/record.js`：移除 `onShow` 中的 tabBar 同步逻辑，保存成功后调用 `wx.navigateBack`
- `pages/record/record.wxss`：移除 `selected-bar` 的 tabBar 高度偏移，恢复 `bottom: 0`
