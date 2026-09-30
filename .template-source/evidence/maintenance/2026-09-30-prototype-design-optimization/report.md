# Design 原型技能优化维护报告

本轮完成了计划中的验证入口、两项业务能力、三个 Skill 方法增强与受影响分发。**当前尚未达到 `implementation-ready`**：完整模板验证仍有 1 项失败，详细门禁见下表。没有创建完成 checkpoint、提交、推送、发布、存量迁移或真实效果试点。

本轮为 L3 模板维护，单一推进负责人及维护者自检。仓库为 template-source；产品 Spec、Ticket、OpenAPI、产品 context_reconciliation 不适用。依据见 [实施范围](scope.md)。报告在验证结束后归档，不修改已经运行的来源或生成物。

## 已实现

1. `scripts/verify-prototype-design` 统一 `contract` / `browser` / `all`，固定作者和浏览器目录，输出到仓库外空目录。保留环境变量及原命令的兼容入口；缺工具、锁/版本不匹配、关键检查跳过、没有场景报告或输入漂移均不能通过。结果记录命令、退出码、工具版本、包/来源摘要、截图与日志。
2. 固定 shadcn-vue `67c9a3926dc0a854507b325c6337ff2210d16379`，原字节引入 Combobox、RangeCalendar、Popover，24 → 27 组；来源/许可/依赖清单同步。仅新增直接依赖 `@internationalized/date=3.12.4`，其余直接依赖及原锁解析版本保持（锁仅新增三行 importer 声明）；详见 [依赖差异](/private/var/folders/8d/60y8vj2j0nn37t4h26zbvvhw0000gn/T/yss-design-opt-20260930-jlcnh890/dependency-delta.json)。
3. 新增“组合查询”“负责人及有效期表单”维护变体，加入导出、组件目录和多页工作区。实现稳定 ID 单选、IME 提交保护、空/加载/失败/禁用/重试；纯日期闭区间、同日、空值、临时编辑、错误定位、应用/取消/清空；原五类模式回归保留。
4. 三个核心 Skill 仅补触发与导航，操作细节进入 `search-date-patterns.md`、`prototype-verification.md`、`usability-research.md`、`search-date-theme.md` 和现有六轴 QA。320 CSS px 与真正 200% 缩放分开；条件读屏和用户研究方法已交付。
5. 实际浏览器发现的 WebKit 关闭取消焦点、320 px 日历裁切、200% 短视口审批遮挡已修复并复验。[六轴 QA 与视觉观察](design-qa.md) 区分行为问题、维护者观察与未执行的真实效果。

## 验证与证据

| 检查 | 当前结果 |
|---|---|
| 专项统一入口 `--scope all` | 14 项通过，0 失败、0 未执行、0 不适用；22 个 Node 合同测试，0 跳过 |
| 专项浏览器 | 234 条场景记录通过：原模式 104、组件/密度 6、紧凑主题 13、工作区 54、新控件 36、实际缩放 9、H1/H2 工作台 4、比较工具 8 |
| 跨时区浏览器补验 | 复用同一控件场景，Los_Angeles / Kiritimati 两种 timezoneId 下72条通过；外部 runner 只改时区矩阵，源文件摘要保留在 timezone-browser-source.json |
| 打包实例 | 主/Design/Frontend 实际 npm tarball 初始化，阶段/Skill 安装、新合同入口与7模式样例构建均通过；每个实例额外复验 90 条浏览器场景，共270条。此处为重执行，非新增独立用例 |
| 分发内容 | 三套实例各核对327个核心 Skill 文件。Design/Frontend 字节一致；主 CLI 两处命令替换由既有 distribution-runtime 规则逐项核对，其余一致 |
| 投影与来源 | 77个共享 Skill 投影、锁、Design/Frontend profile 差异检查、Design 上游 revision/hash 检查、共享工具锁验证通过；source_state 保持 working-tree |
| 补充共享依赖 | 便携测试 fixture 同步到 Backend 及其 CLI 快照；Backend bundle、临时实例初始化和两份共享文件字节通过。该 CLI 既有清单排除维护锁检查命令，实例该项为有理由的不适用；源仓锁检查已通过 |
| 完整模板验证 | 实际工作区 fast 自动升级 release；稳定副本显式 release，均 `--concurrency 1`。稳定副本 102 个计划命令结果通过、1 个失败（101 次实际执行、2 次同轮复用）；输入漂移 `false`。因同组门禁失败未进入的4项已单独补跑通过，原报告保持真实未执行记录 |
| 完整计划末尾检查 | 因门禁失败未进入原后处理；单独执行同一计划103个文件语法检查、`git diff --check` 及活跃 Ruby 调用/文件禁令检查，全部通过 |
| 范围保护 | 开工主仓+7子仓、24,626文件基线；现有文件摘要/模式审计范围外改动为0；新增文件清单单独留档 |

本地工程 tarball 使用 `npm pack --ignore-scripts`，specialist 另执行 `verify-bundle.mjs`，不会据此声称正常发布 prepack 的 committed 门禁通过；发布未执行。

专项工具：Node `v24.21.0`、Playwright `1.62.1`、Chromium `151.0.7922.34`、WebKit `26.5`、Vue3.5.40、Reka UI2.10.1。所有浏览器结果来自实际包及操作，不是初始化成功或纯构建推断。

- [专项原始报告](/private/var/folders/8d/60y8vj2j0nn37t4h26zbvvhw0000gn/T/yss-design-opt-20260930-jlcnh890/all-07/report.json)：来源 `sha256:33c41f30592bb5deda3c2d65e06e0c863059a3a8986ef99262e3c13623788304`；复制包 `sha256:ec7624897f816430eef75cfe5aa1b4367f42ae357ca141266d5a124f49db5359`。
- [专项来源复核](/private/var/folders/8d/60y8vj2j0nn37t4h26zbvvhw0000gn/T/yss-design-opt-20260930-jlcnh890/specialized-source-recheck.json)：615个来源文件重新核对，无变化。
- [稳定副本完整模板报告](/private/var/folders/8d/60y8vj2j0nn37t4h26zbvvhw0000gn/T/yss-design-opt-20260930-jlcnh890/template-fixed-01/report.json)：输入摘要 `2394dba37ea383bb349811279e021faec25089bf6bf671886850ceaaf38792b3`；原始 stdout/stderr 全部在同目录 logs 下。
- [实际打包及实例命令](/private/var/folders/8d/60y8vj2j0nn37t4h26zbvvhw0000gn/T/yss-design-opt-20260930-jlcnh890/delivery-final/packed-instances.json)、[包内容初次审计](/private/var/folders/8d/60y8vj2j0nn37t4h26zbvvhw0000gn/T/yss-design-opt-20260930-jlcnh890/delivery-final/final-pack-byte-audit.json)、[已登记分发替换复核](/private/var/folders/8d/60y8vj2j0nn37t4h26zbvvhw0000gn/T/yss-design-opt-20260930-jlcnh890/delivery-final/verified-distribution-adaptations.json)；初次审计中的两处替换由后者闭合，旧失败记录保留。
- [稳定副本来源](/private/var/folders/8d/60y8vj2j0nn37t4h26zbvvhw0000gn/T/yss-design-opt-20260930-jlcnh890/fixed-copy-provenance.json)、[CodeGraph 漂移定位](/private/var/folders/8d/60y8vj2j0nn37t4h26zbvvhw0000gn/T/yss-design-opt-20260930-jlcnh890/input-drift-investigation.json)、[稳定副本4项补充检查](/private/var/folders/8d/60y8vj2j0nn37t4h26zbvvhw0000gn/T/yss-design-opt-20260930-jlcnh890/fixed-supplemental-checks.json)。
- [开工文件保护审计](/private/var/folders/8d/60y8vj2j0nn37t4h26zbvvhw0000gn/T/yss-design-opt-20260930-jlcnh890/preservation-audit-final.json)、[新增文件清单](/private/var/folders/8d/60y8vj2j0nn37t4h26zbvvhw0000gn/T/yss-design-opt-20260930-jlcnh890/added-file-inventory-final.json)、[末尾语法检查](/private/var/folders/8d/60y8vj2j0nn37t4h26zbvvhw0000gn/T/yss-design-opt-20260930-jlcnh890/verification-postlude.json)。

## 剩余门禁与固定来源动作

| 命令 | 退出码 | 原因 |
|---|---|---|
| `scripts/verify-strategic-handoff-tools-lock --require-committed` | 1 | candidate/release 要求战略交接工具来自已提交 revision；当前 lock 为 working-tree |

本轮不改变 committed 检查，也不扩大到 Git 提交。后续需要单独授权并界定脏工作区中的提交范围：形成真实已提交的共享工具/Skill 来源，按既有脚本重建锁、投影与 CLI 快照，核对完整40位 SHA，然后从稳定输入重跑完整验证。不得仅修改 source_state 或沿用当前 working-tree 报告宣称通过。

此前 `template-final-01` 的工具锁漂移、过时 Skill 锁、接收端字节不符已修复；该轮输入发生变化，旧报告保留。`template-final-02` 仅剩 committed 门禁失败，但后台 `.codegraph/codegraph.db-wal` 写入造成输入漂移；未把这一轮宣称为最终稳定验收。随后将完整工作区复制为独立副本，保留8仓原 HEAD、index 和脏文件，无新提交，也未生成独立审查候选；复制时未搬运 CodeGraph daemon socket。固定副本通过了615个专项来源的逐文件比较，并以同一完整入口重跑。副本证明工作树工程状态，不是已提交来源发布证据。首次失败及浏览器修复过程均保留于外部证据目录。

## 兼容、判断边界与后续

作者/场景 schema1、Prototype Evidence v4、Visual Baseline v1、比较工具 v2 不变；运行报告由现有证据字段引用，不增加批准字段或生命周期状态。原生 HTML、H1/H2、非空拒绝覆盖、资源边界、摘要漂移、显式 legacy 只读核验继续由合同测试覆盖。生产 Vue/YSS 组件合同、各 profile 编排差异及已有批准包不变。

工程验收已形成以上证据；维护者视觉观察只覆盖列出的规范和截图。读屏、真实操作系统 IME、用户视觉批准、真实用户与 Agent 效果对照均未执行，不宣称用户收益或完整无障碍符合性。后续试点仅准备查询维护、复杂表单、审批恢复三类共同输入/观察指标，沿用现有 research 与 skills-agent-eval 入口，待参与者、模型和预算另定。

复盘：浏览器证据确实发现了总体宽度检测遗漏的日历内部裁切，因此将浮层内部溢出检查纳入同一验证入口；精简实例实跑发现维护仓私有依赖，因此抽出便携测试 fixture 并验证实际 tarball。避免重复维护测试入口和只看源仓构建的结论。
