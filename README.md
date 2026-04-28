# 呀咪宝宝辅食

> 婴儿辅食记录 + 过敏排查 + 家庭共享的微信小程序。
> V1.0 已发布(2026-04-25),技术栈:原生小程序 + 微信云开发。

---

## 是什么

一款给 6-24 月龄宝宝家长用的辅食管理工具:

- 📝 **辅食记录**:60+ 预置食物图标 + 自定义食物,一次点选记录今日吃什么
- 🚨 **过敏排查**:三日观察期排敏计划引擎、过敏日志、自动溯源到具体食物
- 👨‍👩‍👧 **家庭共享**:夫妻或祖辈通过 4 位邀请码加入同一个宝宝档案,记录实时同步
- 📊 **报告分享**:一键生成可分享给医生/家人的辅食/过敏报告快照
- ⚙️ **跨设备**:本地优先 + 云端双写,15s 自动同步

## 当前状态

| 项 | 状态 |
|---|---|
| 版本 | V1.0(tag `v1.0.0`,2026-04-25) |
| 提审 | 已上传待审 / 灰度阶段(2026-04-26 起) |
| 客服邮箱 | 13026334211@163.com |
| 主分支 | `master` |
| GitHub | https://github.com/plx-bigdata/baby_food(remote `baby_food`,HTTPS) |

V1.0 已完成的合规事项 + 提审后热修详情 → 看 `memory/project_v1_release_workflow.md`。

## 项目身份

- **小程序 appid**: `wxaa3b7e4a3678356a`
- **云开发环境 ID**: `darcy01-9glmf7r53f72d926`(在 `app.js` / `data/food-library.js` 硬编码)
- **食物图标云存储前缀**: `cloud://darcy01-9glmf7r53f72d926.6461-darcy01-9glmf7r53f72d926-1422236596/food-icons/`

## 技术栈

- 原生小程序(WXML / WXSS / JS,**无框架**)
- 微信云开发:云函数(Node.js)+ 云数据库 + 云存储
- 开发期工具(不在小程序运行时):Node `replicate` / `jimp` / `dotenv`(用于批量生成食物图标,API key 走 `.env`)

`.env.example` 列了开发期需要的图像生成 API:`KLING_*` / `VOLC_*` / `ARK_API_KEY`。**这些不参与小程序运行**,仅用于生成 60+ 食物图标素材。

## 目录结构

```
呀咪宝宝辅食/
├── app.js                  # 全局逻辑(同步/双写/openid/familyId 入口)
├── app.json                # 4 个 tabBar(首页/食物/过敏/我的)+ 8 个 page
├── app.wxss                # 全局样式
├── pages/
│   ├── index/              # 首页:今日推荐 + 排敏看板
│   ├── plan/               # 食物 tab:食物图鉴 + 排敏计划
│   ├── allergy/            # 过敏 tab:日志 + 左滑删除 + 溯源
│   ├── settings/           # 我的 tab:家庭/分享/账号注销
│   ├── record/             # 添加辅食记录(从首页跳转)
│   ├── trace/              # 过敏溯源详情
│   ├── onboarding/         # 首次启动:协议同意 + 宝宝档案 + 头像
│   ├── history/            # 历史记录(已分包)
│   └── share-report/       # 报告分享落地页(已分包)
├── cloudfunctions/         # 12 个云函数,见下表
├── components/             # 复用组件(食物卡片/弹窗等)
├── custom-tab-bar/         # 自定义 tabBar
├── data/                   # food-library.js(60+ 食物 + 云存储 fileID)
├── utils/                  # avatar-uploader.js / security.js / plan-engine 等
├── static/                 # 图标素材(packOptions.ignore 已剔除冗余)
├── docs/SESSION_CONTEXT.md # 历史会话交接(2026-04-17,部分过时)
└── memory/                 # 项目长期记忆(权威来源)
    ├── project_basics.md
    ├── project_data_architecture.md
    └── project_v1_release_workflow.md
```

`_*.{js,py,json,log,md}` / `generate*.js` 等开发期脚本一律不进主包,详见 `project.config.json` 的 `packOptions.ignore`(63 条规则)。

## 数据架构速查

**5 个集合**:`babies` / `food_records` / `allergy_log` / `family_shares` / `report_shares`

**12 个云函数**:

| 函数 | 用途 |
|---|---|
| `login` | 拿 openid(失败兜底 `local_xxx`) |
| `syncBabies` | list / upsert / remove 宝宝档案 |
| `addRecord` / `updateRecord` / `deleteRecord` / `getRecords` | 辅食记录 CRUD |
| `addAllergyLog` / `deleteAllergyLog` / `getAllergyLogs` | 过敏日志 CRUD |
| `familyShare` | create / preview / join / createReport / getReport |
| `deleteAccount` | 注销:清空 5 个集合中当前 openid 的数据 |
| `secCheck` | UGC 内容安全检查(`security.msgSecCheck`) |

**核心同步逻辑**(`app.js`):
- `_cloudCall` — 非阻塞调云函数,失败入 `pendingCloudOps` 队列
- `syncFromCloud` — 启动 + 每 15s 轮询拉 babies + records + logs
- `_notifySyncFinished` — 调当前页面栈所有页的 `refreshFromGlobal`(plan / trace / history / index 都已实现)

完整数据流、storage key 设计、familyId 路由规则 → `memory/project_data_architecture.md`。

## 关键陷阱(必读)

1. **`db.collection().add({ data })` 强制覆盖 `_openid` 为调用者真身**——共享宝宝场景必须用自定义 `familyId` 字段串联,不能依赖 `_openid`。
2. **头像必须走 `utils/avatar-uploader.js` 的 `chooseAndUploadAvatar()`**,绝对不要直接存 `tempFilePath` 到云数据库——会跨设备失效。
3. **云存储权限规则保持「所有用户可读,仅创建者可写」**,不要改回「仅创建者可读写」(否则家人 B 看不到 owner A 上传的头像)。
4. **复合索引必建**:`food_records` 和 `allergy_log` 上 `familyId + babyId`,否则跨 openid 查询会慢。
5. **plan-engine 过敏判定** 同时看 `allergy_log.confirmedFood` 和 `record.reaction`,任一存在即算 allergy。两端时序差导致只看 log 会出现"过敏数不一致"。

更多细节看 `memory/project_data_architecture.md` 的「致命陷阱」段。

## 本地开发

1. **微信开发者工具** 打开本目录,会自动加载 `project.config.json`
2. 选择云开发环境 `darcy01-9glmf7r53f72d926`
3. 修改云函数后**右键单独上传部署**,**或**右键 `cloudfunctions/` 上传所有(8 个核心 + 4 个工具)
4. 客户端代码改完工具栏点「预览」走真机调试,iOS 上头像/共享/分享是高频回归区

`utils/security.js` 用了 `wx.cloud.callFunction`,云函数 `secCheck` 必须先部署。

## 提审 / 发布

走微信开发者工具的「上传」按钮 → `mp.weixin.qq.com` 后台「版本管理」提审。**不**走 git 仓库(`git.weixin.qq.com` 的 remote 与审核无关)。

V1.0 已合规事项、提审后热修(头像同步 / 云存储权限)、待验证项 → `memory/project_v1_release_workflow.md`。

## 待办 / 已知问题

- [ ] 共享场景下「过敏数」两端是否对齐——已修但未最终复测
- [ ] `report_shares` 集合需要在云开发控制台手动建(deleteAccount 已加进 COLLECTIONS)
- [ ] `customFoods` 跨成员同步:owner A 至少打开一次小程序触发回填,B 才能看到
- [ ] 索引建议在云开发控制台手动建:`food_records.familyId+babyId`、`allergy_log.familyId+babyId`

## 进一步资料

- `CLAUDE.md` — 给 AI 协作者的项目指令(全局约定 + 本项目特有规则)
- `AGENTS.md` — Codex / 多 Agent 协作约定
- `memory/project_basics.md` — 身份信息(appid / 云环境 / git remote)
- `memory/project_data_architecture.md` — 数据架构权威来源(5 集合 + 12 函数 + 同步逻辑 + 致命陷阱)
- `memory/project_v1_release_workflow.md` — V1.0 发布工作流 / 合规清单 / 提审待办
- `~/.claude/shared-knowledge/methodology/wechat-miniprogram-playbook.md` — 微信小程序云开发版方法论手册(本项目正是它的提炼源)

---

**License**: 私有项目,未开源。
**作者**: pengliangxing(Darcy)
