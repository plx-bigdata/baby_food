## Why

当前有 3 个 UI bug 影响核心交互体验：

1. 首页"安全/排敏中/过敏"三个弹窗的关闭按钮点击无效
2. 计划页点击食物显示的历史记录最后一行被遮挡
3. 记录页选择多种食物后保存按钮被底部栏遮挡，无法点击

这些都是纯 UI 修复，不需要新增功能。

## What Changes

- **修复首页食物列表面板关闭按钮**：右上角 × 文字按钮改为大面积圆形背景按钮，确保可点击
- **修复计划页食物详情面板高度**：记录列表区域正确可滚动，始终完整显示
- **修复记录页保存面板布局**：已选食物摘要栏和保存按钮始终可见，支持换行

## Capabilities

### New Capabilities
（无）

### Modified Capabilities
（无 — 均为 UI 布局 bug 修复，不涉及功能需求变更）

## Impact

- `pages/index/index.wxml` + `index.wxss`：食物列表面板关闭按钮结构重构
- `pages/plan/plan.wxml` + `plan.wxss`：食物详情面板 flex 布局修复
- `pages/record/record.wxml` + `record.wxss`：已选食物栏换行布局 + 保存按钮始终可见
