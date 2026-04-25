## Context

当前记录页（`pages/record/record`）是 tabBar 的第三个 tab，通过 `wx.switchTab` 跳转。这意味着它常驻底部导航，占用了一个 tab 位置。实际上记录行为是一次性操作，不需要常驻入口；加号按钮已经表达了"新建"语义，更适合用 `wx.navigateTo` 打开二级页面。

## Goals / Non-Goals

**Goals:**
- 中间加号按钮点击后以二级页面方式打开记录页
- 记录页保留完整功能，保存后自动返回
- tabBar 减少一个 tab，布局更紧凑

**Non-Goals:**
- 记录页 UI 或功能的任何改动
- tabBar 动画或过渡效果的改进

## Decisions

**1. 跳转方式：navigateTo 而非 showModal**
用 `wx.navigateTo` 打开完整页面，而非在当前页面叠加半屏弹窗。理由：记录页内容（食物网格 + 分类 tab + 已选底栏）高度较大，全屏页面体验更好，且现有代码无需大改。

**2. tabBar 中间按钮保留加号图标，不参与选中态**
record 条目从 `tabBar.list` 移除后，中间位置改为一个"动作按钮"（navigateTo），不再有选中/未选中的状态切换。tabBar 组件对中间按钮单独处理跳转逻辑。

**3. 记录页顶部导航**
使用微信原生导航栏（默认带返回箭头），不需要自定义。`app.json` 中 record 页保留默认 `navigationBar` 配置。

**4. 保存后返回**
`saveRecord()` 成功后调用 `wx.navigateBack()`，回到调用方页面（首页或计划页），触发对方的 `onShow` 自动刷新数据。

## Risks / Trade-offs

- [tabBar 从 5 个变 4 个] → 布局会重新分配宽度，中间加号按钮需要保持视觉突出（已有 `tabbar-item--record` 特殊样式）
- [record 页的 selected-bar bottom 偏移] → 移除 tabBar 高度偏移，恢复 `bottom: 0`，因为记录页不再有底部 tabBar 遮挡
