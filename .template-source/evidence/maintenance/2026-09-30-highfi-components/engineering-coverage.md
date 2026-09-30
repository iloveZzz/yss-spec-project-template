# 工程覆盖矩阵

本轮是 L3 模板维护。下列结果证明工程行为及可复验性，不构成产品批准或视觉收益确认。真实 Agent 效果试点未启动。

| 范围 | 当前结果 | 证据与实际覆盖 |
|---|---|---|
| 固定组件来源 | 通过 | `unit-final.log`：明确校验 24 个名称、固定 revision、每份源码摘要、MIT、依赖闭包；原 11 个不替换，上游文件无本地修改 |
| 构建与离线防护 | 通过 | 15 个 Node 测试：多文件、图片、缺失/远程依赖、越界、符号链接、摘要漂移、拒绝覆盖、失败清理、配置与 CLI 兼容；未跳过 |
| 五类业务模式 | 通过 | `patterns-browser.json`：104 条记录，Chromium/WebKit，1440×900 与390×844，所有声明场景、关键任务、重复重置、非法场景、只读、空/加载、对比度、减少动效、console；含原低保真演练回归 |
| 新组件专项 | 通过 | `components-browser.json`：4 组双浏览器/双视口任务 + 2 组 comfortable 构建；Field 标签/帮助/错误关联及首错；InputGroup 边框、高度与字号；Select、Menu、Tooltip、Dialog、Sheet、AlertDialog 键盘/焦点；分页/选择/空结果；菜单和侧栏在 hash 切换后清除 |
| 计算主题 | 通过 | `compact-theme-browser.json`：13 条记录，规范控件、正文、标题、Card、Sheet、选中行、hover/active、InputGroup 外层错误与焦点；comfortable 保留 |
| 目标尺寸与对比度 | 通过（已列范围） | 新组件专项检查真实目标矩形，`target-hit-area.json` 另有4组双浏览器实测：在 Checkbox 原矩形外实际点击扩展区域，并检查相邻目标无重叠；禁用项按豁免处理；从实际文本/背景计算普通文本4.5:1、大文本3:1，按可见性及豁免过滤。不是全站自动 WCAG 认证 |
| 200% 浏览器缩放 | 通过 | `zoom-browser.json`：实际 chrome.tabs.setZoom/getZoom，五模式 + 组件展示，核对几何及关键操作；没有以 CSS zoom 或 deviceScaleFactor 替代 |
| 原生/React starter | 通过 | `workbench-browser.json`：原生与 shadcn 两路线、两个视口、冲突取消保留/完整快照重载/再次保存、错误恢复、Select/Dialog；独立离线目录 |
| 比较 v2 | 通过 | `comparison-browser.log`：候选切换、同场景重置、深链接、非法入口、缺失场景、启动错误、超时与迟到消息；negativeProbeErrors 为故意注入的启动失败/缺失脚本，不能混为正常 console |
| 历史兼容 | 通过 | `run-scenarios-final.log`、`package-verification.json`：H1/H2、原生、AntD 只读路径、Evidence v4/Baseline v1、比较 v1 显式 legacy 校验/禁止重新 seal；3 CLI 共12条比较兼容检查 |
| 交付包新鲜度 | 通过 | `package-verification.json`：复制后的6个包内部完整，并与当前项目 DESIGN/Token 绑定；包内包含24组件源码清单及实际构建 provenance |
| 主题预览及 profile | 通过 | `preview-browser.json`：主仓/design/frontend 各2视口×2密度，共12组交互/计算样式/文本对比度检查；重试、筛选、完整重置、弹窗返回焦点、未模拟动作禁用。另3条记录仅证明历史暗色快照加载及“未验证”声明 |
| 设计来源与同步 | 通过 | DESIGN lint/drift 和3个 design-md 测试；`preserved-baselines.json` 证明规范 frontmatter、依赖锁、暗色快照未改；三个 canonical root 的投影/锁和 profile 同步检查 |
| 三 CLI 分发 | 通过 | `cli-verification.json`：三份实际生成产物使用包内配置构建24组件展示；clean迁移成功；自定义冲突拒绝且原字节保留；重复同步字节不变。维护区预览不随产品实例分发，已在三份 template-source 实际输出验证 |
| 模板整体验证 | 失败，未标记就绪 | `verification-final/report.json`：fast→release，串行95项，93通过、2失败。隔离依赖差异已在主仓及对齐后单项复验通过；working-tree 来源锁仍阻塞。完整报告不改写，单项复验不替代整体通过；见 verification-summary.json |
| 暗色当前规范验收 | 不适用本轮 | 用户明确只保留历史入口；未重派生、未声明完整暗色合规 |
| 真实 Agent 对照、用户视觉批准、Git/发布 | 未执行 | 本轮明确不启动效果试点；视觉确认未取得；无提交、推送或发布授权 |

Chromium 使用 offline=true。WebKit 因 offline 标志拒绝 file 导航，采用 HTTP(S) 全量拦截；差异在原始报告中记录，所有页面由独立本地目录以 file:// 打开。

首次整体验证保留失败记录：插件测试出现临时目录 ENOTEMPTY，原测试单项重跑7/7通过；隔离输入最初遗漏 profile 新增的 preview.js，随后完整同步并冻结输入重跑。调试期的 Select 等待、旧边框断言及预览低对比度失败均保留为 attempt 日志，以最终实际复验为准。
