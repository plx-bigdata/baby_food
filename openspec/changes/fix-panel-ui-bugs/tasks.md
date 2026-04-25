## 1. 首页食物列表面板关闭按钮

- [x] 1.1 修改 `pages/index/index.wxml`：三个 food-panel 的关闭按钮 `<text>×</text>` 改为 `<view><text>×</text></view>` 结构
- [x] 1.2 修改 `pages/index/index.wxss`：`.food-list-panel__close` 改为 64rpx 圆形灰底按钮，点击区域足够大

## 2. 计划页食物详情面板

- [x] 2.1 修改 `pages/plan/plan.wxss`：`.detail-panel__records` 加 `min-height: 0`，解除 flex 子元素默认 `min-height: auto` 对收缩的阻止
- [x] 2.2 修改 `pages/plan/plan.wxml` + `plan.wxss`：关闭按钮改为 64rpx 圆形灰底按钮（结构同首页）

## 3. 记录页保存面板

- [x] 3.1 修改 `pages/record/record.wxss`：`.record-panel` 的 `max-height` 缩小至 `70vh`（确保 save-btn 不被推到 overflow 区域外），`padding-bottom` 留足够底部安全区
- [x] 3.2 修改 `pages/record/record.wxml`：已选食物摘要栏改为 flex-wrap 换行布局，保存按钮始终可见
