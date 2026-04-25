# Proposal: 全局记录页覆盖层

## What

将记录辅食功能改为全局覆盖层，可从任意 Tab 页面通过底部"+"按钮唤起，关闭后返回原页面。

## Why

当前实现中，点击"+"按钮会通过 `wx.switchTab` 先切换到首页，再通过首页的 `record-sheet` 组件显示记录层。用户从非首页页面触发时体验差，需要等待页面切换。

## Goals

1. 任意 Tab 页面点击"+" → 立即弹出记录层（无需页面跳转）
2. 记录层从底部滑入/滑出（符合用户习惯）
3. 关闭记录层 → 返回原 Tab 页面
4. 记录层覆盖在 TabBar 之上

## Key Constraints

- 微信小程序不支持从非首页 Tab 页面直接 `wx.navigateTo` 弹出覆盖层（会被 TabBar 遮挡）
- 透明背景 `navigationStyle: custom` + `backgroundColor: transparent` 可实现全屏覆盖
- 底部弹窗动画需使用 CSS `transform` + `transition`，微信的 `animationType` 对透明背景页面无效
- 微信 WXML 不支持 `>` `<` 运算符，`wx:if` 中比较需用预计算变量

## Technical Approach

### 方案：独立页面 + 全屏透明背景

1. **TabBar 改造**：点击"+"时使用 `wx.navigateTo` 打开 `record` 页面（带透明背景）
2. **Record 页面改造**：
   - `app.json` 中 record 页面配置 `"navigationStyle": "custom"`, `"backgroundColor": "#00000000"`
   - 页面全屏覆盖，底部弹窗样式，背景半透明遮罩
   - 关闭时 `wx.navigateBack` 返回原页面
3. **动画**：使用 CSS `transform: translateY()` + `transition` 实现底部滑入/滑出
4. **兼容性**：
   - `selectedFoods.length > 0` 在 WXML 中无效 → 使用 `hasSelected: Boolean` 替代
   - 确认面板 transform 需用行内 `style` 绑定（类选择器方式有时不生效）

## Status

- [x] Proposal created
- [ ] Tasks created
- [ ] Implementation
- [ ] Testing
