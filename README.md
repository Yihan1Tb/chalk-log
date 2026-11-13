# Chalk Log · 攀岩训练记录

> 原名「岩迹」，2026-11-13 改名为 Chalk Log（镁粉日志）。本地存储键名未变，旧数据无需迁移。

一个移动端优先的私人攀岩日志。记录训练、看见积累，数据保存在自己的浏览器中。

**当前实现：Vite 6 + React 18 + TypeScript，H5 MVP。** 三表模型与四层结构已保留，可迁移到 Taro 4 / 微信小程序。设计依据是 [design-notes.md](docs/design-notes.md)，没有复制调研项目的代码。

## 安装与运行

已在 Node **22.11.0**、npm **10.9.0** 环境中验证。

```bash
cd ~/codex-work/climb-log
export PATH=~/.local/node/bin:$PATH   # 这台 Mac 的 Node 装在 ~/.local/node，不在系统 PATH 里
npm ci
npm run dev:h5
```

或者一行：`cd ~/codex-work/climb-log && PATH=~/.local/node/bin:$PATH npm run dev:h5`。

打开 **http://localhost:10086/**。手机与电脑连接同一局域网后，可访问终端显示的 Network 地址。不同域名、设备或浏览器的本地数据各自独立。

```bash
npm test             # 领域、仓库、关键交互测试
npm run typecheck    # TypeScript 检查
npm run build:h5     # 类型检查 + 生产构建，输出 dist/
npm run preview:h5   # 预览构建结果；先停止占用同一端口的开发服务
npm run format:check # 格式检查
```

项目 `.npmrc` 已设置 `registry=https://registry.npmmirror.com` 和 `cache=./.npm-cache`。`node_modules`、`.npm-cache`、`dist` 均在 `.gitignore` 中。

## 当前进度

第一轮（MVP）由 Codex 完成；第二轮（计时器、日历、iPhone 兼容、改名）Codex 在 2026-11-13 23:22（UTC+8）额度用尽，剩余部分由小G接手完成。

### 已完成

- [x] 简体中文页面；底部「记录 / 统计 / 我的」三个 Tab。
- [x] 系统字体、留白、大数字、等宽数字、单一暖橙点缀、细线 SVG 图表。
- [x] 跟随系统 / 浅色 / 深色，手动偏好持久化；尊重减少动态效果设置。
- [x] 六种训练：抱石、先锋、顶绳、指力板、力量、有氧。
- [x] 日期、场馆、整次训练 RPE（主观强度 1–10）、时长和备注。
- [x] 多线路录入；V / YDS / 法式难度宫格、尝试次数、线路备注。
- [x] Flash（一次完攀）/ Send（完攀）/ Attempt（尝试）/ Project（攻线）。
- [x] 指力板、力量、有氧可只记录时长与备注；可选动作、组数、每组次数、负重及每组时长。
- [x] 本周训练次数、本周最高完攀（抱石 / 绳索分开）、本周完攀数、累计训练次数。
- [x] 近 8 周训练量、难度趋势（抱石 / 先锋 / 顶绳分开）、完攀率、难度金字塔。
- [x] 历史倒序、类型筛选、分批查看更多、编辑、删除确认。
- [x] 未保存退出确认；切换不兼容难度体系时确认；保存失败保留表单。
- [x] JSON 导出下载入口；导入文件校验、预览、合并 / 覆盖；覆盖需明确确认。
- [x] 最近 8 周示例，目标水平为 V3–V4 / 先锋 5.10a / 顶绳 5.11a。
- [x] 示例清晰标记；示例参与统计时提示；一键清除只删除示例。
- [x] **指力板计时器**：悬挂 / 休息秒数、每组次数、组数、组间休息可设；大号倒计时、阶段（准备 / 悬挂 / 休息 / 组间休息）、开始 / 暂停 / 继续 / 重置；可选 Web Audio 提示音；完成后一键生成预填的指力板训练记录。计时逻辑是 `src/domain/hangboard.ts` 里的纯函数状态机，有 8 项单测。入口在「记录」页顶部。
- [x] **日历视图**：「训练记录」可在列表 / 日历间切换；月历网格，有训练的日期显示圆点（深浅表示次数 1 / 2 / 3+，跟随类型筛选）；点日期列出当天训练并可编辑；上 / 下个月、回到今天。
- [x] **iPhone Safari / 微信内置浏览器兼容**：安全区、`100dvh`、底部 Tab 避开 Home 指示条、触屏输入 ≥16px、iOS 日期输入、点按高亮、存储不可用提示与临时模式。见下文清单。
- [x] **改名为 Chalk Log**（原「岩迹」）：标题、页眉、关于、导出文件名 `Chalk-Log-训练备份-日期.json`；存储键名 `climb-log:*` 未变，旧数据直接可用。
- [x] 41 项自动测试；TypeScript 检查；H5 生产构建。

### 第二轮分工

| 项目           | Codex（额度用尽前）                                           | 小G（接手后）                                                                                                 |
| -------------- | ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| 指力板计时器   | 状态机 + 单测、计时器弹窗、提示音、生成记录、交互测试         | 核验；修正首页两个按钮错位，入口加图标                                                                        |
| 日历视图       | 日历纯函数 + 单测、月历组件、列表 / 日历切换、交互测试        | 核验；圆点可见度、日期格防长按选字                                                                            |
| iPhone 兼容    | 存储不可用提示与临时模式、`matchMedia` 旧接口兜底、部分安全区 | 全局安全区、`100vh` 兜底、触屏 16px、日期输入、点按高亮、提示条样式、`showModal` 兜底、3 项兼容测试、真机清单 |
| 改名 Chalk Log | —                                                             | 全部                                                                                                          |

### 未完成 / 后续

- [ ] 微信小程序实际构建与真机验证。
- [ ] `WxStorageAdapter`、云开发、微信登录及多设备同步（接口与迁移说明已预留）。
- [ ] 训练计划。
- [ ] iPhone Safari / 微信真机回归：已按清单做了代码适配和模拟器截图，**尚未在真机上逐项确认**，请按下方清单检查。
- [ ] 浏览器实际下载文件落盘后的人工回验；自动测试已核对下载入口、文件名、JSON Blob 和再次导入解析。

## iPhone Safari / 微信内置浏览器兼容

已做的适配（自动测试见 `src/ui/compat.test.tsx`）：

- `viewport-fit=cover` + `env(safe-area-inset-*)`：页面左右、顶部、底部 Tab 栏和弹窗避开刘海与 Home 指示条。
- `100dvh`（先写 `100vh` 兜底）：地址栏伸缩时弹窗高度不跳动、不被遮挡。
- 触屏设备上所有输入框字号 ≥ 16px，聚焦时 iOS 不会自动放大页面。
- 日期输入去掉系统外观后保持左对齐和固定高度，避免 iOS 上显示为空白小框。
- `-webkit-tap-highlight-color: transparent`、`touch-action: manipulation`：去掉灰色点按高亮和双击缩放延迟；计时数字、日期格、底部 Tab 禁止长按选字。
- 无痕模式或存储被禁用时显示提示条，可「重试本地存储」或「使用临时模式」，临时记录可导出 JSON，不会清空原数据。
- 旧版 iOS WebView 没有 `dialog.showModal` 时退回普通打开的弹窗。
- 计时器提示音只在用户点按后解锁 Web Audio（iOS 要求），默认关闭。

### 真机手动检查清单

在 iPhone Safari 和微信里各打开一次局域网地址（`npm run dev:h5` 后终端显示的 Network 地址），逐项确认：

- [ ] 竖屏：底部「记录 / 统计 / 我的」完整显示，不压住 Home 指示条；横屏时内容不被刘海遮住。
- [ ] 上下滚动、地址栏收起/展开时，底部 Tab 栏和打开的弹窗不跳动、不被裁掉。
- [ ] 点按日期、场馆、备注、计时器秒数输入框时页面不放大；日期选择器正常弹出，选中后显示日期。
- [ ] 点按按钮没有灰色闪块，快速连点不触发双击缩放。
- [ ] 指力板计时器：开始 / 暂停 / 继续 / 重置正常；打开「阶段提示音」后阶段切换有提示音；锁屏或切到后台再回来，倒计时按实际经过时间校正。
- [ ] 计时完成后「生成训练记录」能打开预填表单并保存。
- [ ] 日历：切换月份、点日期能看到当天训练并编辑。
- [ ] Safari 无痕模式：出现「本地存储不可用」提示（新版 iOS 无痕模式可能允许存储，此时不出现提示也算正常）；临时模式下能记录、导出。
- [ ] 深色模式（系统设置切换）下文字、分割线、图表都清晰。
- [ ] 微信里导出 JSON：微信可能拦截下载，如无反应，请用右上角「在浏览器打开」后再导出。

## 目录结构

```text
climb-log/
├── docs/
│   ├── design-notes.md          # 用户提供的设计依据，原样保留
│   ├── data-model.md            # 三表字段、校验与统计口径
│   └── validation.md            # 本次验证记录及边界
├── src/
│   ├── domain/                 # 纯 TypeScript，无浏览器 / Taro 依赖
│   │   ├── types.ts            # sessions / climbs / training 类型
│   │   ├── grades.ts           # 难度选项、数值排序、近似换算
│   │   ├── dates.ts            # 本地日历日期与周一周界
│   │   ├── stats.ts            # 概览、金字塔、训练量、难度趋势
│   │   ├── validation.ts       # JSON 结构和关系校验
│   │   └── examples.ts         # 可复现、带来源标记的示例
│   ├── storage/
│   │   ├── StorageAdapter.ts   # 异步接口；微信 / 云适配器注释桩
│   │   └── LocalStorageAdapter.ts
│   ├── repo/
│   │   └── TrainingRepository.ts # CRUD、级联删除、合并覆盖、导出
│   ├── ui/
│   │   ├── pages/              # Journal / Progress / Profile
│   │   ├── components/         # 训练表单、弹窗、SVG 图表、图标
│   │   ├── ClimbApp.tsx        # 注入仓库、导航、主题、操作反馈
│   │   └── styles.css          # 响应式与主题变量
│   └── main.tsx
├── tests/fixtures/             # 有效 / 无效导入验证文件
├── index.html
├── vite.config.ts
├── vitest.config.ts
└── package-lock.json
```

仓库只依赖 `StorageAdapter` 接口；平台存储 API 集中在适配器。文件选择、下载、主题监听与弹窗等 H5 行为位于 UI 层。

## 数据与统计约定

- 以本地日历的周一至周日为一周，避免 UTC 转换导致日期偏移。
- **只有 Flash 和 Send 算完攀**。Flash 必须恰好一次尝试；UI 增加尝试次数时自动改为 Send。
- 完攀率按「完攀线路条数 / 已记录线路条数」计算，不把尝试次数当作线路数。
- 训练量曲线是每周训练次数，可切换查看该周分钟数和完攀条数；时长来自整次训练，动作时长不重复累加。
- 抱石与绳索不跨体系比较。首页绳索最高值合并先锋、顶绳；难度趋势提供各自独立的切换。
- 法式难度只做**近似** YDS 对照，原始难度仍保留。不同对照表、岩馆和路线风格会有差异；不把换算结果视为精准等价。背景参考：[UIAA《Scales of Difficulty in Climbing》](https://theuiaa.org/documents/mountaineering/THESCALESOFDIFFICULTYINCLIMBING_p1b.pdf)。
- 金字塔统计所有已记录完攀，各级实际数量可能不呈规则三角形；未完攀周的难度趋势留空。
- 合并导入按训练 ID 替换整次训练和其子记录；同一文件重复导入不会增加重复训练。跨训练的子表 ID 冲突会整体拒绝，原数据保留。
- 文件不超过 5 MB，每张表不超过 50,000 条。导入会校验真实日期、枚举、范围、重复 ID、外键和难度体系。
- 本地数据读取或写入失败会明确报错，不自动清空数据库。多标签页可刷新显示变化，但不提供跨标签页同时编辑的冲突合并。

## 为什么本次使用 Vite

22:14 开始优先尝试 Taro。已安装 Taro **4.3.3** 及其 H5 / React / Vite 依赖，但构建会尝试创建项目之外的目录：

```text
EPERM: operation not permitted, mkdir '/Users/carp-yh/.taro4.0'
```

尝试官方 CLI 的 `--disable-global-config` 选项后仍有同样错误。为遵守只在项目内写文件的限制，未修改用户 HOME、未改框架内部源码，也未继续消耗安装时间；约 22:24 切换为 Vite。Taro 运行依赖已从最终项目中移除，数据层和仓库结构不受影响。

## 下一步如何转微信小程序

1. **建立 Taro 4 React TypeScript 项目配置。** 使用同一版本的 `@tarojs/cli`、`@tarojs/taro`、`@tarojs/components`、React 框架插件、H5 和 weapp 平台插件；补 `config/index.ts`、`src/app.tsx`、`app.config.ts` 与页面入口。需在允许 Taro 正常创建其配置目录的环境操作。[Taro 编译配置文档](https://docs.taro.zone/docs/config)。
2. **原样复用 `src/domain` 与 `src/repo`。** 保留数据版本、ID、统计口径及已有测试，避免在页面中重新实现业务规则。
3. **实现并注入 `WxStorageAdapter`。** 用 `Taro.getStorage / setStorage / removeStorage` 实现同一异步接口；只在确认为键不存在时返回 `null`，其他错误应抛出。H5 继续注入 `LocalStorageAdapter`。存储体积接近小程序限额时再按会话拆分或迁往云数据库。
4. **逐步转换 UI 基础组件。** 当前 UI 使用语义化 HTML；将 `div / section / button / input / textarea / dialog` 替换成 Taro 的 `View / Text / Button / Input / Textarea` 与自定义弹层；调整 `onChange` 的值读取、表单校验和焦点管理。为大点击区、浅深色变量、减少动画偏好提供小程序端实现。
5. **替换 H5 平台行为。** 文件导入改为小程序文件选择与文件系统读取；导出通过文件系统写 JSON 后提供分享 / 保存入口；主题监听改用 Taro / 微信主题 API；原生 `<dialog>` 改成遮罩弹层。文件读写需要真实设备验收，不能只替换 API 名称。
6. **迁移 SVG 图表。** 用 Canvas 或平台可用的 SVG / 图片方案绘制相同纯数据，不把统计计算搬入 Canvas 代码。
7. **配置微信工程并验证。** 增加实际 AppID 与 `project.config.json`，设置三个 Tab 的页面入口或自定义 TabBar。增加 `dev:weapp` / `build:weapp` 命令，在微信开发者工具、iOS 和 Android 真机检查表单、存储、导入导出与主题。
8. **后续接云开发。** 在登录、用户隔离、权限规则和版本冲突策略明确后实现云适配器。现有本地备份作为迁移输入，不自动把示例当成用户真实训练上传。

本项目尚不能直接执行微信小程序构建，迁移需要完成上述 UI 与平台适配。

## Git 记录

Codex 的沙盒不能写 `.git`，所以第一轮和第二轮的检查点都由小G在沙盒外代为提交（提交信息带「自动」或「小G」字样）。第二轮剩余部分由小G完成，每项一个提交，提交信息注明「Codex 额度用尽后由小G接手」。所有改动均已提交。

最新验证详情见 [docs/validation.md](docs/validation.md)。
