# 工程覆盖矩阵

| 检查 | 结果 | 证据与边界 |
|---|---|---|
| 规范角色投影、源摘要 | 通过 | design.log；DESIGN.md 本轮字节未改，仅投影增加角色别名 |
| 默认 compact、显式 comfortable、非法密度、旧 manifest | 通过 | unit.log；非法值在输出前拒绝，历史无 visual_preset 的包仍可读 |
| 规范值与计算样式 | 通过 | theme-computed.json，13 项记录；正文、标题、行高、控件、容器、弹窗、hover/active、选中、错误/焦点 |
| 五模式双引擎双视口 | 通过 | patterns-browser.json，104 项记录，包含声明状态、重置、交互、窄屏、文本对比度、减少动效；含原有低保真回归 |
| 原生/shadcn H1/H2 | 通过 | workbench-chromium.json、workbench-webkit.json；查询、编辑、失败、冲突确认/取消/重载/再次保存、Select 与焦点 |
| 200% 实际浏览器缩放 | 通过 | browser-zoom.json；chrome.tabs.setZoom/getZoom，五模式实际操作，不是 CSS zoom/DPR 替代 |
| 离线及便携 | 通过，有例外 | Chromium offline=true + file://；WebKit 阻断 HTTP(S)，其 offline 标志拒绝本地文件，不宣称物理断网 |
| 相同输入前后对照 | 通过 | layout-measurements.json；1440×900、390×844；同正文/数据/Token，两候选初始化及切换通过 |
| 作者构建与历史合同 | 通过 | unit.log；多文件/资源边界、失败清理、摘要、H1/H2 与原有历史兼容场景 |
| 三 CLI 新建、构建、迁移 | 通过 | cli-verification.json；干净迁移成功，定制冲突保留；新资产默认 compact 与当前角色别名；仅工作树快照 |
| 投影、profile、锁文件 | 通过 | profile-sync.json，实际 sync/update --check；设计 profile 既有适配保留 |
| 完整仓库验证 | 阻塞 | fast 自动升级 release；原始报告 full-verification/report.json，input_drift=false。隔离目录空 AntD 残留已关闭；剩既有 working-tree 交接来源不满足 require-committed。详情 verification-summary.json |
| 用户视觉确认 | 未取得 | 工程通过不代替视觉确认；不承诺普遍提效 |
| 真实 Agent 效果对照 | 未执行 | 沿用此前停止条件，不自动启动新试点 |

发现并关闭：选中行悬停时底色被 hover 规则覆盖；补充选中悬停样式及计算样式回归。初次失败保存在 initial-selected-hover-failure.log。

无独立审查或产品批准；本轮为 L3 模板维护自检。浏览器检查覆盖列明的示例和状态，不宣称完整 WCAG 认证。
