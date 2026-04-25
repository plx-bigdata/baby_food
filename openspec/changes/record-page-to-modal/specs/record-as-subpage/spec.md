## ADDED Requirements

### Requirement: 记录页通过加号按钮以二级页面方式打开
系统 SHALL 在用户点击 tabBar 中间加号按钮时，通过 `wx.navigateTo` 跳转到记录页，而非 `wx.switchTab`。

#### Scenario: 点击加号按钮打开记录页
- **WHEN** 用户点击底部 tabBar 中间的加号按钮
- **THEN** 系统通过 `wx.navigateTo` 打开 `pages/record/record`，顶部显示原生导航栏和返回按钮

### Requirement: 记录页保存后自动返回上一页
系统 SHALL 在记录保存成功后调用 `wx.navigateBack()` 返回上一页。

#### Scenario: 保存记录后返回
- **WHEN** 用户在记录页点击"保存记录"且保存成功
- **THEN** 系统调用 `wx.navigateBack()`，返回调用方页面，触发其 `onShow` 刷新数据

### Requirement: 记录页不再作为 tabBar tab
系统 SHALL 将记录页从 `tabBar.list` 移除，中间按钮仅作为动作入口，不参与选中态逻辑。

#### Scenario: 进入记录页时 tabBar 无高亮
- **WHEN** 用户通过加号按钮进入记录页
- **THEN** 底部 tabBar 中间按钮不显示选中态背景色

### Requirement: 记录页底部确认栏无需为 tabBar 让位
系统 SHALL 将记录页的 `selected-bar` 定位恢复为 `bottom: 0`，因为记录页已无底部 tabBar 遮挡。

#### Scenario: 选择食物后确认栏完整显示
- **WHEN** 用户在记录页选择一个或多个食物
- **THEN** 底部已选食物栏和"记录 N 种食物"按钮完整可见且可点击
