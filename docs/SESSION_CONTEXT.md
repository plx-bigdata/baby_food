# 会话上下文交接文档

> 最后更新:2026-04-17
> 用途:改目录名后,下一个 Claude Code session 开局读这份文档即可接上完整上下文。

---

## 项目基本信息

- 中文名:啊呜一口宝宝辅食
- 目录路径:`/Users/pengliangxing/啊呜一口宝宝辅食`
- 小程序 appid:`wxaa3b7e4a3678356a`
- 微信云开发环境 ID:`darcy01-9glmf7r53f72d926`
- 云存储 bucket(食物图标):
  `cloud://darcy01-9glmf7r53f72d926.6461-darcy01-9glmf7r53f72d926-1422236596/food-icons/`
- Git 主分支:`master`(上游 PR 分支:`main`)
- Git 用户:plx-bigdata

---

## 近期已完成的关键修复(上线前审查)

1. **sitemap.json**:`action` 由 `disallow` 改为 `allow`,允许微信索引
2. **清理生产代码 console.log**:移除 8 处调试日志
3. **小程序主包体积优化**:
   - `project.config.json` 的 `packOptions.ignore` 加了大量规则:
     - glob:`_*.js`, `_*.py`, `_*.json`, `_*.log`, `_*.md`, `generate*.js`, `*.md`, `*.py`
     - folder:`pages/history`, `static/food-images/emoji-icons`, `openspec`, `.claude`, `output`, `pages/share-report`, `_preview_icons*`, `node_modules`
     - file:`.DS_Store`, `**/.DS_Store`, `food_image_map.json`, `allergyFoods.json`, 各类 `_gen_*` / `_compress_*` 脚本,`CLAUDE.md`, `AGENTS.md` 等
     - static 残留:`static/icons/food-*.png/svg`, `record.png`, `record-active.png`
4. **57 个食物图标迁移到云存储**:
   - `data/food-library.js` 中 `FOOD_ICON_URL` 改为 `cloud://...` 形式
   - `ICON_CLOUD_PREFIX` + `FOOD_ICON_FILES` 数组动态拼接
   - 主包减少约 270KB
5. **Onboarding 顶部安全区修复**:
   - `pages/onboarding/onboarding.wxss` `.ob-progress-wrap` 的 padding
     改为 `calc(24rpx + env(safe-area-inset-top)) 24rpx 16rpx`
     解决「上一步」按钮与 iPhone 状态栏时间重叠
6. **过敏排查页 —— 历史排序 & 左滑删除**:
   - `pages/allergy/allergy.js`:
     - 排序:`occurredAt` 倒叙为主,`createdAt` 倒叙为辅(同一时间按录入先后)
     - 历史数据自动补 `_id`(兼容旧记录)
     - 展示日期追加 `HH:MM`
     - 新增 `onItemTouchStart/Move/End`:左滑 >40px 展开删除按钮,右滑/空白点击收起
     - 新增 `onDeleteAllergy`:`wx.showModal` 二次确认 → `app.deleteAllergyLog`
   - `pages/allergy/allergy.wxml`:timeline-content 外包 `.swipe-wrap`,右侧绝对定位 `.swipe-delete`
   - `pages/allergy/allergy.wxss`:新增 `.swipe-wrap / .swipe-content--open / .swipe-delete`,左滑位移 `-160rpx`
   - `app.js`:`saveAllergyLog` 自动补 `_id`;新增 `deleteAllergyLog(id)`

---

## 尚未完成(待用户操作)

1. **微信云存储权限**:
   - 当前默认「仅创建者可读写」→ 导致预览/真机图标加载不出
   - 需在微信开发者工具 → 云开发 → 存储 → 权限设置,改为
     **「所有用户可读,仅创建者可读写」**
   - 用户原话:「我等会来改权限」

2. **改目录名**:
   - 已从 `宝宝辅食排敏` → `啊呜一口宝宝辅食`(本文档生效时)

---

## 关键代码位置索引

| 文件 | 关键位置 |
|------|---------|
| `app.js` | `saveAllergyLog`(自动加 `_id`),`deleteAllergyLog`,云环境初始化 |
| `app.json` | 全局配置、页面路由、tabBar |
| `pages/allergy/allergy.js` | 过敏排查逻辑、排序、左滑删除 |
| `pages/onboarding/onboarding.wxss:17` | 顶部 safe-area 适配 |
| `data/food-library.js` | `FOOD_ICON_URL` 云路径映射 |
| `project.config.json` | 主包 ignore 规则 |
| `sitemap.json` | SEO 允许规则 |
| `CLAUDE.md`(根目录) | 完整项目 PRD/技术栈说明 |

---

## 本地用户偏好(重要)

- 回复用中文
- Git commit 中文,格式 `type(scope): 描述`
- 不用 emoji 装饰
- 简洁直接,不套话开头
- 一次只做一件事,不要攒到最后集中汇报
- 修改文件必须先读再改,不凭记忆
- 不主动 git push
- 所有本地路径以纯文本展示,不要用 Markdown 链接包裹
- 更多细节见 `~/.claude/CLAUDE.md`(全局规则)
