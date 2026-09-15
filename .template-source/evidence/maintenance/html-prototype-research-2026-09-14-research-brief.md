# 离线 HTML 高保真原型研究简报

## Research Scope

本包采用 `technical-evidence / evidence-audited`，为 2026-09-14 的模板维护提供来源。目标是在保留 YSS 视觉的前提下，让高保真原型覆盖视觉、主流程与关键异常，并以接收方无需 Node 的 HTML 本地资源包交付。范围仅含既有技能、官方方法和浏览器限制；不生成产品生命周期资产。

采用 `yss-research` 证据合同及 `i-have-adhd` 中文规范；`maintaining-skills` 只用于判断采纳边界。事实、反向限制及访问情况以相邻 [evidence.yaml](html-prototype-research-2026-09-14-evidence.yaml) 为准。

## Executive Read

推荐补强现有原型合同的六项执行能力：Token 落地检查、场景切换与重置、语义与焦点行为、固定环境截图、离线资源完整性、代表性业务内容。继续复用状态矩阵、统一 Design QA 和 Visual Baseline，不新增第二套状态机、QA 或交接流程。

用户已在本会话确认上述方向以及 `DESIGN.md` 直出/视觉稿还原条件分派、两个 Provider 当前退役而历史只读的范围。本记录不替代原始用户回复，不另造批准记录。外部研究支持方法与边界，不证明本仓已实现收益。

## Findings

| 事实及来源 | 采纳建议与验证边界 |
|---|---|
| **claim-001**：[Google spec](https://github.com/google-labs-code/design.md/blob/main/docs/spec.md) 将 Token 作为规范值、文字作为应用解释；[README](https://github.com/google-labs-code/design.md/blob/main/README.md) 仍标记 alpha。 | 从根 `DESIGN.md` 及受控派生 Token 检查页面实际颜色、字体、间距和组件变体。格式 lint 与浏览器符合性分开记录。保留既有 YSS 视觉及主控确认的固定 `@google/design.md@0.4.0`，本研究不建议升级。 |
| **claim-002**：[GOV.UK](https://prototype-kit.service.gov.uk/pass-data/) 展示默认数据、返回保留回答、场景入口及清除数据；[Owl 状态机](https://github.com/Owl-Listener/designer-skills/blob/20e34c4a587e5eb09fcdf8351fa97b3ad761b31e/interaction-design/skills/state-machine/SKILL.md) 要求明确事件、转换、guard 和退出。 | 给主流程与关键异常提供确定数据、场景切换和重置；保留失败后的输入与恢复路径。复用既有 `case_id/data_scenario` 及状态矩阵。GOV.UK 的服务端实现只作方法参照，不复制。 |
| **claim-003**：[WAI modal](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/) 定义焦点、Tab、Escape 与关闭恢复；[APG 阅读须知](https://www.w3.org/WAI/ARIA/apg/practices/read-me-first/) 说明 role 不会自动赋予键盘行为。 | 优先语义元素；按实际控件核验键盘、焦点和标注。无障碍必须有实际浏览器证据，不能仅凭 ARIA 字段或模式引用宣布通过。 |
| **claim-004**：[Playwright](https://playwright.dev/docs/test-snapshots) 要求注意系统、浏览器和环境差异，并区分首次生成与后续比较。 | 截图绑定固定视口、状态、主题和代表数据，记录环境。首版先按设计规范与流程审查，获确认后才成为后续基线；禁止用刚生成截图自证设计正确。 |
| **claim-005**：[MDN Modules](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Modules) 说明本地模块安全限制；[localStorage](https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage) 说明 file URL 下行为未定义。 | 离线包采用经验证的普通脚本和本地资源；不可要求接收方启动 Node 或依赖服务端 session。状态存储不可成为主流程必需前提。交付验证应在实际本地入口和断网条件核验资源、导航、场景与重置，而非仅在开发服务器成功。 |
| **claim-006**：[Owl QA](https://github.com/Owl-Listener/designer-skills/blob/20e34c4a587e5eb09fcdf8351fa97b3ad761b31e/design-ops/skills/design-qa-checklist/SKILL.md) 和 [handoff](https://github.com/Owl-Listener/designer-skills/blob/20e34c4a587e5eb09fcdf8351fa97b3ad761b31e/design-ops/skills/handoff-spec/SKILL.md) 已覆盖内容、截断、状态与边界。 | 加入代表性中文业务文本、长名称、空值、数字日期和字段错误，按功能选择相关样例。将资源清单和模拟范围放入已有交付资产；不新增独立 Handoff Spec。 |

**claim-007**：本地 Product Design `0.1.42` 的 [image-to-code](../../../.codex/skills/product-design/skills/image-to-code/SKILL.md) 与 [design-qa](../../../.codex/skills/product-design/skills/design-qa/SKILL.md) 在本轮变更前要求选定图片与可比较视觉目标；其 preflight 还要求 starter 和 npm。YSS 已以根设计规范及状态语义为来源，因此建议在 YSS adapter 中按来源分派：规范直出做规范符合性和流程验收，有既定视觉稿才执行图片还原比较。两路复用同一 QA 报告与证据合同。保留已批准视觉时不重复制造三方案图片。

[Owl prototype-strategy](https://github.com/Owl-Listener/designer-skills/blob/20e34c4a587e5eb09fcdf8351fa97b3ad761b31e/prototyping-testing/skills/prototype-strategy/SKILL.md) 认可 HTML/CSS/JS 编码原型、模拟后端和可丢弃实现；这支持选择轻量方法，但不证明生成包天然离线，也不证明生产 YSS 组件兼容。

## Counter-Signals

Google 格式仍为 alpha，不能称已冻结行业标准。GOV.UK 文档使用服务端数据；Owl handoff 允许字体服务链接，两者均不能照搬为本次离线交付。MDN 对 file URL 模块与存储的限制要求专门验收；截图生成只建立比较对象，不能替代设计判断。APG 还要求针对实际浏览器与辅助技术测试。这些限制已经逐项绑定 `counter_signal_refs`，没有使用“未找到反例”虚构保证。

## Source Map

官方设计格式、浏览器文档与测试文档提供方法和限制；本地技能提供真实调用约束；Owl 四项源码采用已登记的固定 revision `20e34c4a587e5eb09fcdf8351fa97b3ad761b31e`。本轮先检查本地来源，再访问官方原文。Owl GitHub 网页读取失败后，通过官方 tree API 定位并读取同 commit 的 raw 文件，没有用二手摘要代替源码。

所有线上材料访问于 2026-09-14。Google 的 README/spec 是当日 main，未固定 revision；其余线上文档也不冒称固定版本。Owl 固定 revision 不代表最新版。

## Decision Handoff

接收方为 `maintaining-skills / yss-prototype-stage / yss-design-system`。实现应在既有事实源、生成器、验证器、角色/registry、来源锁和投影分发中同步；两个 Provider 的当前退役不得破坏历史证据只读。

本包只整理研究记录与采纳边界。主控负责模板实现、实际验证及完成判断；研究者不改产品 Spec、Slice 合同、Ticket 或批准状态。全部外部材料仅用于方法提炼，不复制第三方代码，不安装额外技能，不修改版权信息。

## Evidence Limitations

本研究未执行离线包浏览器测试、辅助技术测试或跨平台接收实测，不宣称效率、质量或维护成本已经改善。源码观察记录的是本轮迁移前行为，主控实现后需用 Fresh Verification 判断新状态。结构校验通过仅表示研究包字段、来源引用和审计状态一致，不证明原型完成、可发布或生产兼容。
