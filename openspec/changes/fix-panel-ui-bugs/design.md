## Context

三个纯 UI 布局 bug，均为 CSS flex 布局或元素结构问题：

1. **关闭按钮不生效**：当前 WXML 结构为 `<text bindtap="closeFn">×</text>`，点击区域仅覆盖文字本身（约 20rpx），实际体验几乎无法点中
2. **记录显示不全**：`max-height` 固定值 + `overflow: hidden` 导致最后一行被切
3. **保存按钮被挡**：`.record-panel` 有 `max-height: 85vh` + `overflow-y: auto`，但 `save-btn` 在 overflow 区域之外时无法滚动触达

## Goals / Non-Goals

**Goals:**
- 关闭按钮点击区域扩大（至少 60rpx × 60rpx）
- 计划页食物详情面板记录区域正确可滚动，始终完整显示
- 记录页保存面板：内容自适应高度，保存按钮始终可见可点击

**Non-Goals:**
- 不改变任何功能逻辑
- 不修改面板的动画效果
- 不改变现有 UI 视觉风格（仅修复结构）

## Decisions

**1. 关闭按钮：改用 view 包裹 text，view 加背景色扩大点击区域**

```html
<!-- 之前 -->
<text class="close-btn" bindtap="close">×</text>

<!-- 之后 -->
<view class="close-btn" bindtap="close"><text>×</text></view>
```

`.close-btn { width: 64rpx; height: 64rpx; border-radius: 50%; background: var(--color-bg); }`

**2. 计划页详情面板：flex column + min-height: 0 解除 flex 收缩限制**

`.detail-panel` 已是 `display: flex; flex-direction: column`，但 `.detail-panel__records`（flex 子元素）默认 `min-height: auto`，阻止 `flex: 1` 收缩。修复：`min-height: 0` 显式允许收缩。

**3. 记录页保存面板：max-height 限制 + padding-bottom 保证 save-btn 在可视区**

`.record-panel` 的 `overflow-y: auto` 已设置，但 `max-height: 85vh` 相对视口固定。需确保 save-btn 不在 overflow 区域外：
- 方案 A（采用）：`.record-panel { max-height: 70vh }` + `padding-bottom` 给 save-btn 留底部固定空间，底部栏 fixed 定位
- 方案 B：save-btn position: sticky — 小程序 wxss 不支持 sticky，不采用

## Risks / Trade-offs

- [关闭按钮样式改变] → 从纯文字改为圆形背景，略有视觉变化但更易用
- [面板高度调整] → 不同的屏幕高度下表现可能略有差异，实测在主流机型应无问题
