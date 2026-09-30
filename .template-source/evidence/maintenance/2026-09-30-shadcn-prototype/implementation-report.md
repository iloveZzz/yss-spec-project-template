# shadcn 高保真原型路线实施报告

状态：`implementation-ready`。采用用户明确选择的原版 shadcn/ui + React，移除 React AntD 的当前生成路线；尚未提交、推送或发布。

## 交付

- 高保真 H1/H2 主要使用 `build-shadcn-prototype.mjs`。简单局部修改仍可用原生 HTML；档位、六轴 QA、独立评审及当前用户确认保持既有合同。
- 内置 Button、Input、Dialog、Select、Table、Badge、Label 七个官方源码组件，固定 revision `db2db460a26fa84fb65c8d903b213925fbdee9ed`。shadcn 是源码分发方式，来源使用 revision 与逐文件摘要，而非虚构组件包版本；官方说明见 [shadcn/ui Introduction](https://ui.shadcn.com/docs)。
- 作者依赖精确锁定；Tailwind 样式预生成，项目 Token 映射根 DESIGN.md 的派生 CSS。交付包为本地 HTML/CSS/IIFE/资源，React 在浏览器运行，接收者无需 Node 或网络。
- React AntD 构建器、采集器、作者模板和目录已移除。旧证据与产物只读兼容，当前验证与封存拒绝 AntD。生产 Vue/YSS 技术栈和 Token 的既有设计来源没有随原型路线改变。
- 同步 canonical、设计源、前端 profile、Agent 投影、锁文件及 create-yss-spec / create-yss-harness-design / create-yss-harness-frontend 三份分发。旧测试入口名称保留为兼容调度入口，内容验证退役边界并运行新源码合同；通用核验配置最终无变更。

## 验证结果

| 检查 | 当前结果与证据 |
|---|---|
| Fresh fast | 17 项通过，238972 ms，`input_drift=false`；[报告](fast-final/report.json) |
| 原型合同与来源 | 原有 H1/H2、Evidence v4、比较器回归通过；固定源码摘要与 TypeScript 网络检查通过 |
| 浏览器 | Chromium 151.0.7922.34，离线 `file://`，1440×900 / 390×844；原生与 shadcn 的查询、详情、编辑、重试、权限、冲突恢复、重置通过，shadcn H1、非法入口、Tab/焦点、Select 通过；[记录](browser.json) |
| 比较工具 | shadcn 候选切换保持同场景，临时输入不继承，重置关闭弹窗，深链接恢复，无 console/远程请求；[记录](comparison-browser.json) |
| 分发实际行为 | 三份 CLI 新实例均收到固定源码与新构建器，没有旧入口，并实际构建、校验原型；[安装](cli-instances.json)、[执行](cli-behavior.json) |
| 历史兼容 | 旧 AntD 真产物显式 legacy 检查通过，当前校验及重新封存被拒；[记录](legacy-check.json) |
| 迁移保护 | 未定制 design/spec fixture 同步与 prune 通过；故意制造 canonical/投影漂移的 fixture 被阻断并回滚，修改保留；[正常迁移](migration-clean.json)、[冲突保护](migration.json) |
| 范围保护 | 捕获的范围外根文件无漂移；最终源与已验证文件一致；[保护](preservation.json)、[摘要](final-inputs.json) |

可运行维护示例：[资料维护](example/index.html)。初始视图：[桌面](preview-1440.png)、[窄屏](preview-390.png)。这是维护示例，不是已批准业务原型。

## 限制与失败记录

第一次临时更名测试入口触发 release 级验证，其失败包含验证目录缺少 CLI 生成快照、未提交工具锁；[原始报告](initial-escalated-verification/report.json) 保留。随后使用兼容测试入口、还原通用核验配置，并补齐独立目录的快照；最终按实际范围重新执行 fast 通过。不能把此结果称为 release 通过。

spec 最小实例需要先运行 `assets ensure stage.product-design --apply`，仅 `skills ensure` 不包含设计 Token；分发行为验证已通过这一正常入口补装，未手工伪造实例 Token。

有一项上游包缺失随包 MIT 文本，且 npm gitHead 无法定位；补充来源从同一上游仓库固定 revision 获取并记录在作者模板 `licenses/sources.json`，保留此溯源限制。

工程通过与视觉收益分别判断。本轮未追加此前已用完的 12 次 Agent 试点预算，也不宣称普遍视觉提升或效率比例。视觉质量仍待当前用户结合实际业务页面确认。
