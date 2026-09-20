# 全仓 Skills 优化审计（2026-09-20）

## Research Scope

研究模式：`technical-evidence / evidence-audited`。目标是给维护者一份可执行的技能调整清单；本报告不批准技能修改、提交、发布或任何业务Slice。
覆盖主仓与7个git submodule：4个技能源项目、4个CLI分发项目。个人目录和会话外插件不在范围。生成投影按来源去重；纳入仓内Product Design/Data Analytics平台扩展。读取所有选定SKILL入口，关键引用/脚本按问题追踪；未全量递归审计每个资产和脚本实现。历史备份不作为当前入口。

| 技能源 | 共享入口 | 平台扩展叶入口 | 合计 |
|---|---:|---:|---:|
| 主仓 | 81 | 29 | 110 |
| 后端Agent | 63 | 0 | 63 |
| 战略Agent | 24 | 11 | 35 |
| 前端Agent | 58 | 29 | 87 |
| 合计 | 226 | 69 | 295 |

按相同技能相对路径去重得到 **117项**；这是审计身份，不表示114个裸name可以唯一标识平台包。`index`/`user-context`等必须保留包命名空间。相同ID在不同profile可有合法变体。完整路径、hash、description及metadata见 [inventory.json](inventory.json)。

## Executive Read

建议 **25项优先修正、50项优化、42项保留**。按同一技能在所有覆盖profile中的最高优先级统计；不意味着每个副本都有该问题，也不是OpenAI官方合规评级。P1是本报告建议的先修顺序，不表示已发生生产事故。
当前基础结构成熟：全部295个入口可解析name/description，已有canonical、投影、Registry、脚本、引用和显式调用策略。主要缺口是同文/跨技能语义冲突、子仓旧适配、工具和输出模式移植，以及结构检查未覆盖真实Agent行为。无需把所有技能重写或合并，也不应为了简短删除权限、源码真实性、平台兼容和发布证据门禁。

官方依据（2026-09-20实际打开核对）：
- [OpenAI Build skills](https://learn.chatgpt.com/docs/build-skills)
- [OpenAI Rethinking skills and prompts](https://developers.openai.com/blog/rethinking-skills-and-prompts-for-gpt-6-astra)
- [OpenAI Testing Agent Skills Systematically with Evals](https://developers.openai.com/blog/eval-skills)

对照标准：①name/description支持发现，关键任务和触发条件前置；②多流程按需加载references/scripts/assets；③保留不可从一般能力推知的领域规则，避免无条件剧本；④可用依赖与诚实结果边界；⑤用prompt→实际轨迹/产物→评分验证效果。`agents/openai.yaml`是可选元数据，并非每个技能必须有。官方发现列表有预算并可能截短description，因此“Use when…”后很晚才出现区别词不利于选择。没有把本仓8KB、150行偏好写成OpenAI统一硬标准。

建议短描述示例（仅提案，未修改）：
- `code-review`：审查分支、PR或未提交改动，报告有证据的缺陷与规范偏差。
- `alibaba-java-code-style`：实现或审查Java代码时应用项目采纳的阿里规范；按当前平台和规则级别判断。
- `yss-domain`：按已批准DDD模型实现或重构领域行为、聚合和Gateway；设计任务交给技术设计。

## Findings

### F01 · P1 · Git 技能越过提交范围

`claim-001`。**观察：** resolving-merge-conflicts 要求 Stage everything and commit，worktree 要求提交 .gitignore，prototype 要求折入真实代码并提交原型。它们会与本仓已有授权约束同时进入上下文。尚未执行越权行为测试。
**建议：** 仅处理本任务文件；冲突解决、原型交付和 Git 提交分别以真实用户范围判断。
**定位：** [.agents/skills/resolving-merge-conflicts/SKILL.md](/Users/zhudaoming/Projects/yss-spec-project-template/.agents/skills/resolving-merge-conflicts/SKILL.md:14)；[.agents/skills/using-git-worktrees/SKILL.md](/Users/zhudaoming/Projects/yss-spec-project-template/.agents/skills/using-git-worktrees/SKILL.md:86)；[.agents/skills/prototype/SKILL.md](/Users/zhudaoming/Projects/yss-spec-project-template/.agents/skills/prototype/SKILL.md:26)

### F02 · P1 · 前端 API 规则与示例相反

`claim-002`。**观察：** 前端子仓第64行禁止重复 message.error / if(res.success)，187–204及306–317又给出这种实现；251–268无条件要求useRequest。
**建议：** 统一 mutator、局部异常处理和 useRequest 准入；用失败只提示一次的行为场景验证。
**定位：** [submodules/yss-harness-frontend-agent/.agents/skills/yss-api-integration/SKILL.md](/Users/zhudaoming/Projects/yss-spec-project-template/submodules/yss-harness-frontend-agent/.agents/skills/yss-api-integration/SKILL.md:64)；[submodules/yss-harness-frontend-agent/.agents/skills/yss-api-integration/SKILL.md](/Users/zhudaoming/Projects/yss-spec-project-template/submodules/yss-harness-frontend-agent/.agents/skills/yss-api-integration/SKILL.md:306)

### F03 · P1 · 前端同仓组件命名冲突

`claim-003`。**观察：** 前端子仓 yss-ui 把 YssFormily 声明为新代码名称，formily-foundation/yss-formily要求YFormily。主仓 yss-ui 已修正；主仓 schema-generator仍允许两个名字。
**建议：** 按安装版本和导出事实统一入口、示例与验收，不能让模型自行猜哪个规则优先。
**定位：** [submodules/yss-harness-frontend-agent/.agents/skills/yss-ui/SKILL.md](/Users/zhudaoming/Projects/yss-spec-project-template/submodules/yss-harness-frontend-agent/.agents/skills/yss-ui/SKILL.md:51)；[submodules/yss-harness-frontend-agent/.agents/skills/formily-foundation/SKILL.md](/Users/zhudaoming/Projects/yss-spec-project-template/submodules/yss-harness-frontend-agent/.agents/skills/formily-foundation/SKILL.md:27)；[.agents/skills/yss-formily-schema-generator/SKILL.md](/Users/zhudaoming/Projects/yss-spec-project-template/.agents/skills/yss-formily-schema-generator/SKILL.md:123)

### F04 · P1 · 子仓保留旧 Context 和 Ticket 语义

`claim-004`。**观察：** 前/后端 domain-modeling/setup 仍支持嵌套Context；三个子仓triage旧版的ready-for-human/ready-for-agent语义与当地治理不同。主仓domain-modeling和triage已修正。
**建议：** 将这些本地遗留适配纳入受控同步；状态仍由当前合同与门禁决定。
**定位：** [submodules/yss-harness-frontend-agent/.agents/skills/domain-modeling/SKILL.md](/Users/zhudaoming/Projects/yss-spec-project-template/submodules/yss-harness-frontend-agent/.agents/skills/domain-modeling/SKILL.md:24)；[submodules/yss-harness-frontend-agent/AGENTS.md](/Users/zhudaoming/Projects/yss-spec-project-template/submodules/yss-harness-frontend-agent/AGENTS.md:31)；[submodules/yss-harness-design-agent/.agents/skills/triage/SKILL.md](/Users/zhudaoming/Projects/yss-spec-project-template/submodules/yss-harness-design-agent/.agents/skills/triage/SKILL.md:35)

### F05 · P1 · 战略路由指向不存在或退役入口

`claim-005`。**观察：** 战略ask-matt默认yss-product-lifecycle，实际主控是yss-strategic-design，并保留implement/tdd等缺失入口；设计系统仍调用退役组件/高度技能。
**建议：** 按战略profile生成/核对可用路由；实现能力交接给研发端。
**定位：** [submodules/yss-harness-design-agent/.agents/skills/ask-matt/SKILL.md](/Users/zhudaoming/Projects/yss-spec-project-template/submodules/yss-harness-design-agent/.agents/skills/ask-matt/SKILL.md:13)；[submodules/yss-harness-design-agent/.agents/skills/yss-design-system/SKILL.md](/Users/zhudaoming/Projects/yss-spec-project-template/submodules/yss-harness-design-agent/.agents/skills/yss-design-system/SKILL.md:29)

### F06 · P1 · 原型证据版本和检查ID漂移

`claim-006`。**观察：** 主仓prototype-review允许新建pending v3，当前模板只允许新建v4；部分子仓仍用旧gate.prototype-*。
**建议：** 从模板/Registry消费当前版本和ID，并增加创建证据用例。
**定位：** [.agents/skills/prototype-review/SKILL.md](/Users/zhudaoming/Projects/yss-spec-project-template/.agents/skills/prototype-review/SKILL.md:22)；[docs/design/templates/prototype-evidence-template.yaml](/Users/zhudaoming/Projects/yss-spec-project-template/docs/design/templates/prototype-evidence-template.yaml:2)；[submodules/yss-harness-design-agent/.agents/skills/prototype-review/SKILL.md](/Users/zhudaoming/Projects/yss-spec-project-template/submodules/yss-harness-design-agent/.agents/skills/prototype-review/SKILL.md:71)

### F07 · P1 · 显式兼容入口与主控合同冲突

`claim-007`。**观察：** to-tickets默认ready-for-agent，但主控合同要求ready-for-human；主控正文与机器合同对Matt正式资产所有者表述不同。四个显式入口已有allow_implicit_invocation:false，因此这里不认定为自动触发缺陷。
**建议：** 先统一机器合同与责任边界，再做薄适配器；保留显式调用策略。
**定位：** [.agents/skills/to-tickets/SKILL.md](/Users/zhudaoming/Projects/yss-spec-project-template/.agents/skills/to-tickets/SKILL.md:63)；[.agents/skills/yss-product-lifecycle/references/orchestration-contract.yaml](/Users/zhudaoming/Projects/yss-spec-project-template/.agents/skills/yss-product-lifecycle/references/orchestration-contract.yaml:549)；[.agents/skills/yss-product-lifecycle/SKILL.md](/Users/zhudaoming/Projects/yss-spec-project-template/.agents/skills/yss-product-lifecycle/SKILL.md:70)

### F08 · P1 · 特定业务测试被泛化为全部OpenAPI门禁

`claim-008`。**观察：** Draft Review第54行把import/mapping/review/publish/export/optimistic locking列成无条件阻断；未表达按当前Spec是否命中。
**建议：** 按真实API影响选择seam；下载/特殊协议按已批准合同处理，保留真实lint、字段追踪与冻结。
**定位：** [.agents/skills/yss-openapi-draft-review/SKILL.md](/Users/zhudaoming/Projects/yss-spec-project-template/.agents/skills/yss-openapi-draft-review/SKILL.md:54)

### F09 · P1 · 后端子仓平台知识没有完整继承

`claim-009`。**观察：** 后端audit-log仍讲旧中文SpEL keys；audit-log/excel-mvc/distributed-id缺主仓平台与源码门禁。主仓audit-log直接引用的assets仍含javax和旧中文keys。同步检查通过并不说明excluded/local副本语义一致。
**建议：** 明确各变体的平台范围，修复旧适配；历史源码样本标注平台或改按当前索引定位，不删除真正的兼容门禁。
**定位：** [submodules/yss-harness-backend-agent/.agents/skills/yss-audit-log/SKILL.md](/Users/zhudaoming/Projects/yss-spec-project-template/submodules/yss-harness-backend-agent/.agents/skills/yss-audit-log/SKILL.md:37)；[.agents/skills/yss-audit-log/SKILL.md](/Users/zhudaoming/Projects/yss-spec-project-template/.agents/skills/yss-audit-log/SKILL.md:37)；[.agents/skills/yss-audit-log/assets/AuditLogAspect.java](/Users/zhudaoming/Projects/yss-spec-project-template/.agents/skills/yss-audit-log/assets/AuditLogAspect.java:111)；[.template-source/profile-skill-sync.json](/Users/zhudaoming/Projects/yss-spec-project-template/.template-source/profile-skill-sync.json:1)

### F10 · P1 · TDD和后端角色的职责不一致

`claim-010`。**观察：** tdd把重构放在code-review阶段，但未明确重构执行者如何满足Reviewer只读约束，属于职责表述缺口；backend-agent称架构Agent已批准，但architecture-agent明确不自行批准，且backend/test描述仍只DDD。
**建议：** 绿灯重构由实施者完成；明确批准来自主控/真实审批记录，角色按已确认DDD/MVC和本端范围执行。
**定位：** [.agents/skills/tdd/SKILL.md](/Users/zhudaoming/Projects/yss-spec-project-template/.agents/skills/tdd/SKILL.md:38)；[.agents/skills/code-review/SKILL.md](/Users/zhudaoming/Projects/yss-spec-project-template/.agents/skills/code-review/SKILL.md:122)；[submodules/yss-harness-backend-agent/.agents/skills/backend-agent/SKILL.md](/Users/zhudaoming/Projects/yss-spec-project-template/submodules/yss-harness-backend-agent/.agents/skills/backend-agent/SKILL.md:8)；[submodules/yss-harness-backend-agent/.agents/skills/architecture-agent/SKILL.md](/Users/zhudaoming/Projects/yss-spec-project-template/submodules/yss-harness-backend-agent/.agents/skills/architecture-agent/SKILL.md:14)

### F11 · P1 · Data Analytics移植与交付模式冲突

`claim-011`。**观察：** 18个入口主仓与前端bundle一致，但user-context文档和脚本状态路径不同；index把KPI等推成报告而专项允许inline；spreadsheets含旧插件ID与Sheets/XLSX矛盾；DOCX触发包含本地输出但流程要求上传。
**建议：** 修正能力发现和状态定位，统一inline/report/native/local交付模式；本地转换与云端写入分支明确。
**定位：** [.codex/skills/data-analytics/skills/user-context/SKILL.md](/Users/zhudaoming/Projects/yss-spec-project-template/.codex/skills/data-analytics/skills/user-context/SKILL.md:77)；[.codex/skills/data-analytics/skills/user-context/scripts/data_analytics_preflight.py](/Users/zhudaoming/Projects/yss-spec-project-template/.codex/skills/data-analytics/skills/user-context/scripts/data_analytics_preflight.py:100)；[.codex/skills/data-analytics/skills/index/SKILL.md](/Users/zhudaoming/Projects/yss-spec-project-template/.codex/skills/data-analytics/skills/index/SKILL.md:66)；[.codex/skills/data-analytics/skills/build-report/report-to-google-doc/SKILL.md](/Users/zhudaoming/Projects/yss-spec-project-template/.codex/skills/data-analytics/skills/build-report/report-to-google-doc/SKILL.md:3)

### F12 · P1/P2 · Product Design范围和重复加载问题

`claim-012`。**观察：** get-context允许静态模式，image-to-code却要求所有控件全交互；共享critical-overrides要求每第二次用户可见消息前重读。index固定三个方案还与ideate可覆盖数量不一致。
**建议：** 传递并消费已确认的交互范围；共享规则首次加载、源变更或上下文失效时重读；集中方案数量规则。
**定位：** [.codex/skills/product-design/skills/get-context/SKILL.md](/Users/zhudaoming/Projects/yss-spec-project-template/.codex/skills/product-design/skills/get-context/SKILL.md:63)；[.codex/skills/product-design/skills/image-to-code/SKILL.md](/Users/zhudaoming/Projects/yss-spec-project-template/.codex/skills/product-design/skills/image-to-code/SKILL.md:66)；[.codex/skills/product-design/references/critical-overrides.md](/Users/zhudaoming/Projects/yss-spec-project-template/.codex/skills/product-design/references/critical-overrides.md:37)

### F13 · P2 · 精准发现与渐进披露仍可改进

`claim-013`。**观察：** code-review和Alibaba description分别328/394字符且混入内部规则；yss-domain描述触发设计而正文只负责实现；业务页面必读清单加载所有专项又在后文要求按需加载。字数只是定位信号，不是违规判据。
**建议：** 前置区别性任务、触发/排除条件；多流程入口只保留分流、必要输入、不变量和验收，细节进入现有reference。
**定位：** [.agents/skills/alibaba-java-code-style/SKILL.md](/Users/zhudaoming/Projects/yss-spec-project-template/.agents/skills/alibaba-java-code-style/SKILL.md:3)；[.agents/skills/code-review/SKILL.md](/Users/zhudaoming/Projects/yss-spec-project-template/.agents/skills/code-review/SKILL.md:3)；[.agents/skills/yss-domain/SKILL.md](/Users/zhudaoming/Projects/yss-spec-project-template/.agents/skills/yss-domain/SKILL.md:3)；[.agents/skills/yss-ui-business-page-generation/SKILL.md](/Users/zhudaoming/Projects/yss-spec-project-template/.agents/skills/yss-ui-business-page-generation/SKILL.md:21)

### F14 · P2 · 提交技能存在不可解析的本地依赖

`claim-014`。**观察：** 主仓java-backend-commit引用不存在的commit-linting；前端子仓还直接引用不存在的java-backend-commit，后端反向引用不存在的frontend-commit。
**建议：** 改成本profile拥有的能力或明确跨职责回交；不要新增空技能只为让链接通过。
**定位：** [.agents/skills/java-backend-commit/SKILL.md](/Users/zhudaoming/Projects/yss-spec-project-template/.agents/skills/java-backend-commit/SKILL.md:18)；[submodules/yss-harness-frontend-agent/.agents/skills/frontend-commit/SKILL.md](/Users/zhudaoming/Projects/yss-spec-project-template/submodules/yss-harness-frontend-agent/.agents/skills/frontend-commit/SKILL.md:17)

### F15 · P1/P2 · 供应链检查与语义覆盖存在缺口

`claim-015`。**观察：** 本轮主仓5项检查通过；三个Agent子仓注册表、治理和投影通过，但各自锁文件检查失败。三个薄CLI bundle验证通过且SKILL副本与当前Agent源一致；说明旧语义也可一致分发。
**建议：** 先修根因及profile所有权，再更新派生、锁和CLI；把语义冲突/失效路由纳入检查，并增加真实agent行为评测。
**定位：** [scripts/lib/skill-governance.mjs](/Users/zhudaoming/Projects/yss-spec-project-template/scripts/lib/skill-governance.mjs:14)；[.template-source/profile-skill-sync.json](/Users/zhudaoming/Projects/yss-spec-project-template/.template-source/profile-skill-sync.json:1)

## 117项完整判定矩阵

“保留”仅表示这次静态审计未找到需独立立项的入口问题；不等于业务验证或模型评测通过。表格按最高受影响profile归类，详细副本见inventory。

| 技能（点开为代表入口） | 优先级 | 判断与调整 |
|---|---|---|
| [alibaba-java-code-style](/Users/zhudaoming/Projects/yss-spec-project-template/.agents/skills/alibaba-java-code-style/SKILL.md) | P2 | description 394字符含宽泛技术清单；缩为 Java 实现/审查规范触发。高风险 TODO-HUMAN-REVIEW 应只在真实批准缺口时触发，不能阻止已授权修复。 |
| [archify](/Users/zhudaoming/Projects/yss-spec-project-template/.agents/skills/archify/SKILL.md) | P2 | 入口约 18KB；几何、renderer 和视口细则按编辑/新建分支下沉。next tool action 必须写文件不宜阻止必要核查。 |
| [architecture-agent](/Users/zhudaoming/Projects/yss-spec-project-template/submodules/yss-harness-backend-agent/.agents/skills/architecture-agent/SKILL.md) | 保留 | 入口职责和条件路由可保留；共享依赖修复后执行相应回归。静态审计未发现需单独立项的入口问题。 |
| [ask-matt](/Users/zhudaoming/Projects/yss-spec-project-template/submodules/yss-harness-design-agent/.agents/skills/ask-matt/SKILL.md) | P1 | 战略子仓默认路由指向不存在的 yss-product-lifecycle，并列出已移除实现技能；改成当前战略 profile 路由。 |
| [backend-agent](/Users/zhudaoming/Projects/yss-spec-project-template/submodules/yss-harness-backend-agent/.agents/skills/backend-agent/SKILL.md) | P1 | 后端本地角色入口仍仅 DDD；backend-agent 称架构 Agent 已批准，与 architecture-agent 不自行批准冲突；test-agent 还宣称跨前后端验证。按已确认 DDD/MVC 与本端职责修正。 |
| [code-review](/Users/zhudaoming/Projects/yss-spec-project-template/.agents/skills/code-review/SKILL.md) | P2 | description 328字符包含内部执行规则；前置审查任务，把 Standards 加载细则和候选快照协议下沉。 |
| [codebase-design](/Users/zhudaoming/Projects/yss-spec-project-template/.agents/skills/codebase-design/SKILL.md) | P2 | 限制词汇和双适配器规则应明确分析模型适用范围，不覆盖 CONTEXT 的项目术语。 |
| [competitive-intelligence](/Users/zhudaoming/Projects/yss-spec-project-template/.agents/skills/competitive-intelligence/SKILL.md) | P2 | 主仓下游仍偏向显式兼容入口；前端变体还有 Discovery 旧术语。回交当前主控/资产所有者。 |
| [cross-repo-implementation-routing](/Users/zhudaoming/Projects/yss-spec-project-template/.agents/skills/cross-repo-implementation-routing/SKILL.md) | 保留 | 入口职责和条件路由可保留；共享依赖修复后执行相应回归。静态审计未发现需单独立项的入口问题。 |
| [data-analytics/skills/analyze-data-quality](/Users/zhudaoming/Projects/yss-spec-project-template/.codex/skills/data-analytics/skills/analyze-data-quality/SKILL.md) | P2 | 工作流和检查目录重复，按风险下沉；notebook按复杂度触发。 |
| [data-analytics/skills/build-dashboard](/Users/zhudaoming/Projects/yss-spec-project-template/.codex/skills/data-analytics/skills/build-dashboard/SKILL.md) | 保留 | 入口职责和条件路由可保留；共享依赖修复后执行相应回归。静态审计未发现需单独立项的入口问题。 |
| [data-analytics/skills/build-report](/Users/zhudaoming/Projects/yss-spec-project-template/.codex/skills/data-analytics/skills/build-report/SKILL.md) | P2 | 共享范围workspace_all、英文固定输出和详细布局需按用户/宿主profile；保持来源与可读性验证。 |
| [data-analytics/skills/build-report/report-to-google-doc](/Users/zhudaoming/Projects/yss-spec-project-template/.codex/skills/data-analytics/skills/build-report/report-to-google-doc/SKILL.md) | P1 | description包含本地DOCX而流程强制Drive上传；本地DOCX/托管DOCX/native Docs分流并按明确目标执行。 |
| [data-analytics/skills/build-report/report-to-google-slides](/Users/zhudaoming/Projects/yss-spec-project-template/.codex/skills/data-analytics/skills/build-report/report-to-google-slides/SKILL.md) | P2 | 固定导入/outline/thumbnail工具需能力探测；本地PPTX与native导入完成分开。 |
| [data-analytics/skills/build-report/report-to-pdf](/Users/zhudaoming/Projects/yss-spec-project-template/.codex/skills/data-analytics/skills/build-report/report-to-pdf/SKILL.md) | 保留 | 入口职责和条件路由可保留；共享依赖修复后执行相应回归。静态审计未发现需单独立项的入口问题。 |
| [data-analytics/skills/design-kpis](/Users/zhudaoming/Projects/yss-spec-project-template/.codex/skills/data-analytics/skills/design-kpis/SKILL.md) | 保留 | 入口职责和条件路由可保留；共享依赖修复后执行相应回归。静态审计未发现需单独立项的入口问题。 |
| [data-analytics/skills/gather-business-context](/Users/zhudaoming/Projects/yss-spec-project-template/.codex/skills/data-analytics/skills/gather-business-context/SKILL.md) | 保留 | 入口职责和条件路由可保留；共享依赖修复后执行相应回归。静态审计未发现需单独立项的入口问题。 |
| [data-analytics/skills/index](/Users/zhudaoming/Projects/yss-spec-project-template/.codex/skills/data-analytics/skills/index/SKILL.md) | P1 | router把KPI/诊断/产品分析一律推到报告，和inline/slides分支冲突；移除不存在的仓库命令路径。 |
| [data-analytics/skills/jupyter-notebooks](/Users/zhudaoming/Projects/yss-spec-project-template/.codex/skills/data-analytics/skills/jupyter-notebooks/SKILL.md) | 保留 | 入口职责和条件路由可保留；共享依赖修复后执行相应回归。静态审计未发现需单独立项的入口问题。 |
| [data-analytics/skills/kpi-reporting](/Users/zhudaoming/Projects/yss-spec-project-template/.codex/skills/data-analytics/skills/kpi-reporting/SKILL.md) | P1 | 允许inline/report/slides的本地规则应成为router一致的输出合同；非必要不强制问格式。 |
| [data-analytics/skills/market-sizing](/Users/zhudaoming/Projects/yss-spec-project-template/.codex/skills/data-analytics/skills/market-sizing/SKILL.md) | 保留 | 入口职责和条件路由可保留；共享依赖修复后执行相应回归。静态审计未发现需单独立项的入口问题。 |
| [data-analytics/skills/metric-diagnostics](/Users/zhudaoming/Projects/yss-spec-project-template/.codex/skills/data-analytics/skills/metric-diagnostics/SKILL.md) | 保留 | 入口职责和条件路由可保留；共享依赖修复后执行相应回归。静态审计未发现需单独立项的入口问题。 |
| [data-analytics/skills/product-business-analysis](/Users/zhudaoming/Projects/yss-spec-project-template/.codex/skills/data-analytics/skills/product-business-analysis/SKILL.md) | 保留 | 入口职责和条件路由可保留；共享依赖修复后执行相应回归。静态审计未发现需单独立项的入口问题。 |
| [data-analytics/skills/spreadsheets](/Users/zhudaoming/Projects/yss-spec-project-template/.codex/skills/data-analytics/skills/spreadsheets/SKILL.md) | P1 | 旧插件ID和固定工具名需能力发现；Sheets链接与最终只XLSX交付冲突，按用户目标选择。 |
| [data-analytics/skills/user-context](/Users/zhudaoming/Projects/yss-spec-project-template/.codex/skills/data-analytics/skills/user-context/SKILL.md) | P1 | 文档namespaced state与脚本state/plugins/data-analytics不一致；修正仓库命令路径、固定25000输出和无条件权限提升/Setup CTA。 |
| [data-analytics/skills/validate-data](/Users/zhudaoming/Projects/yss-spec-project-template/.codex/skills/data-analytics/skills/validate-data/SKILL.md) | P2 | 详细方法清单与报告模板下沉；保留阻断/非阻断区分。 |
| [data-analytics/skills/visualize-data](/Users/zhudaoming/Projects/yss-spec-project-template/.codex/skills/data-analytics/skills/visualize-data/SKILL.md) | P2 | 四张以上折线图一律失败与blossom品牌残留应改条件化启发式/profile。 |
| [diagnosing-bugs](/Users/zhudaoming/Projects/yss-spec-project-template/.agents/skills/diagnosing-bugs/SKILL.md) | P2 | 宽触发对应固定最小化与 3–5 假设流程；增加简单问题分支，保留复杂故障复现和回归证据。 |
| [domain-modeling](/Users/zhudaoming/Projects/yss-spec-project-template/.agents/skills/domain-modeling/SKILL.md) | P1 | 主要问题在子仓旧适配：嵌套 CONTEXT 布局或 ready-for-agent/ready-for-human 状态语义与当地治理冲突；主仓 domain-modeling/triage 可保留。 |
| [file-export-download](/Users/zhudaoming/Projects/yss-spec-project-template/.agents/skills/file-export-download/SKILL.md) | 保留 | 入口职责和条件路由可保留；共享依赖修复后执行相应回归。静态审计未发现需单独立项的入口问题。 |
| [formily-foundation](/Users/zhudaoming/Projects/yss-spec-project-template/.agents/skills/formily-foundation/SKILL.md) | P2 | 必填字符串示例与 whitespace:true 规则对齐；150行限制降为职责拆分建议。 |
| [formily-linkage-effects](/Users/zhudaoming/Projects/yss-spec-project-template/.agents/skills/formily-linkage-effects/SKILL.md) | 保留 | 入口职责和条件路由可保留；共享依赖修复后执行相应回归。静态审计未发现需单独立项的入口问题。 |
| [formily-mode-slot-detail](/Users/zhudaoming/Projects/yss-spec-project-template/.agents/skills/formily-mode-slot-detail/SKILL.md) | 保留 | 入口职责和条件路由可保留；共享依赖修复后执行相应回归。静态审计未发现需单独立项的入口问题。 |
| [formily-step-flow](/Users/zhudaoming/Projects/yss-spec-project-template/.agents/skills/formily-step-flow/SKILL.md) | P2 | 必填字符串示例与 whitespace:true 规则对齐；150行限制降为职责拆分建议。 |
| [frontend-agent](/Users/zhudaoming/Projects/yss-spec-project-template/submodules/yss-harness-frontend-agent/.agents/skills/frontend-agent/SKILL.md) | 保留 | 入口职责和条件路由可保留；共享依赖修复后执行相应回归。静态审计未发现需单独立项的入口问题。 |
| [frontend-commit](/Users/zhudaoming/Projects/yss-spec-project-template/.agents/skills/frontend-commit/SKILL.md) | P2 | commitlint/中文/72字符要求必须服从已存在仓库配置；修复不存在的 ../commit-linting/SKILL.md 与跨 profile 直接链接。保留用户提交授权边界。 |
| [grill-me](/Users/zhudaoming/Projects/yss-spec-project-template/.agents/skills/grill-me/SKILL.md) | 保留 | 入口职责和条件路由可保留；共享依赖修复后执行相应回归。静态审计未发现需单独立项的入口问题。 |
| [grill-with-docs](/Users/zhudaoming/Projects/yss-spec-project-template/.agents/skills/grill-with-docs/SKILL.md) | P2 | 引用共用 Context 合同，避免重复；前后端子仓旧版缺 reconciliation 说明需同步。 |
| [grilling](/Users/zhudaoming/Projects/yss-spec-project-template/.agents/skills/grilling/SKILL.md) | P2 | 每个环境事实都派 subagent、遍历所有分支过强；按独立并行收益及当前决策停止条件执行。 |
| [handoff](/Users/zhudaoming/Projects/yss-spec-project-template/.agents/skills/handoff/SKILL.md) | 保留 | 入口职责和条件路由可保留；共享依赖修复后执行相应回归。静态审计未发现需单独立项的入口问题。 |
| [harness-orchestrator](/Users/zhudaoming/Projects/yss-spec-project-template/submodules/yss-harness-backend-agent/.agents/skills/harness-orchestrator/SKILL.md) | 保留 | 入口职责和条件路由可保留；共享依赖修复后执行相应回归。静态审计未发现需单独立项的入口问题。 |
| [i-have-adhd](/Users/zhudaoming/Projects/yss-spec-project-template/.agents/skills/i-have-adhd/SKILL.md) | 保留 | 入口职责和条件路由可保留；共享依赖修复后执行相应回归。静态审计未发现需单独立项的入口问题。 |
| [implement](/Users/zhudaoming/Projects/yss-spec-project-template/.agents/skills/implement/SKILL.md) | P2 | 保留 allow_implicit_invocation:false；显式入口改为当前生命周期薄适配器，复用已有决定和合同。 |
| [implementation-repo-onboarding](/Users/zhudaoming/Projects/yss-spec-project-template/.agents/skills/implementation-repo-onboarding/SKILL.md) | P2 | backend 一律检查 DDD 基线应改为已登记架构对应基线；工具对象 API 细节下沉。 |
| [improve-codebase-architecture](/Users/zhudaoming/Projects/yss-spec-project-template/.agents/skills/improve-codebase-architecture/SKILL.md) | P2 | HTML、CDN、subagent 和指定术语改为按用户交付需求选择，保留结构分析方法。 |
| [java-backend-commit](/Users/zhudaoming/Projects/yss-spec-project-template/.agents/skills/java-backend-commit/SKILL.md) | P2 | commitlint/中文/72字符要求必须服从已存在仓库配置；修复不存在的 ../commit-linting/SKILL.md 与跨 profile 直接链接。保留用户提交授权边界。 |
| [llm-wiki](/Users/zhudaoming/Projects/yss-spec-project-template/.agents/skills/llm-wiki/SKILL.md) | 保留 | 入口职责和条件路由可保留；共享依赖修复后执行相应回归。静态审计未发现需单独立项的入口问题。 |
| [lombok](/Users/zhudaoming/Projects/yss-spec-project-template/.agents/skills/lombok/SKILL.md) | 保留 | 入口职责和条件路由可保留；共享依赖修复后执行相应回归。静态审计未发现需单独立项的入口问题。 |
| [maintaining-skills](/Users/zhudaoming/Projects/yss-spec-project-template/.agents/skills/maintaining-skills/SKILL.md) | 保留 | 入口职责和条件路由可保留；共享依赖修复后执行相应回归。静态审计未发现需单独立项的入口问题。 |
| [mapstruct](/Users/zhudaoming/Projects/yss-spec-project-template/.agents/skills/mapstruct/SKILL.md) | 保留 | 入口职责和条件路由可保留；共享依赖修复后执行相应回归。静态审计未发现需单独立项的入口问题。 |
| [product-design/skills/audit](/Users/zhudaoming/Projects/yss-spec-project-template/.codex/skills/product-design/skills/audit/SKILL.md) | P2 | 输出位置非必要不强问；Figma布局细则按需。 |
| [product-design/skills/design-qa](/Users/zhudaoming/Projects/yss-spec-project-template/.codex/skills/product-design/skills/design-qa/SKILL.md) | P2 | 所有SVG/code-native asset一律失败需限定为未经批准的来源替换。 |
| [product-design/skills/get-context](/Users/zhudaoming/Projects/yss-spec-project-template/.codex/skills/product-design/skills/get-context/SKILL.md) | P2 | 复用已有brief确认，并把static/full选择传给下游。 |
| [product-design/skills/ideate](/Users/zhudaoming/Projects/yss-spec-project-template/.codex/skills/product-design/skills/ideate/SKILL.md) | P2 | 固定模板与维度表下沉，保留用户数量覆盖与真实来源图。 |
| [product-design/skills/image-to-code](/Users/zhudaoming/Projects/yss-spec-project-template/.codex/skills/product-design/skills/image-to-code/SKILL.md) | P1 | 无条件所有控件全交互与get-context静态选项冲突；用户既有素材不应一律重新ImageGen。 |
| [product-design/skills/index](/Users/zhudaoming/Projects/yss-spec-project-template/.codex/skills/product-design/skills/index/SKILL.md) | P2 | exactly-three不可豁免与ideate允许数量覆盖冲突；集中路由。 |
| [product-design/skills/prototype](/Users/zhudaoming/Projects/yss-spec-project-template/.codex/skills/product-design/skills/prototype/SKILL.md) | P2 | 集中重复守门规则，明确已有视觉源可复用。 |
| [product-design/skills/research](/Users/zhudaoming/Projects/yss-spec-project-template/.codex/skills/product-design/skills/research/SKILL.md) | 保留 | 入口职责和条件路由可保留；共享依赖修复后执行相应回归。静态审计未发现需单独立项的入口问题。 |
| [product-design/skills/share](/Users/zhudaoming/Projects/yss-spec-project-template/.codex/skills/product-design/skills/share/SKILL.md) | 保留 | 入口职责和条件路由可保留；共享依赖修复后执行相应回归。静态审计未发现需单独立项的入口问题。 |
| [product-design/skills/url-to-code](/Users/zhudaoming/Projects/yss-spec-project-template/.codex/skills/product-design/skills/url-to-code/SKILL.md) | P2 | every single interaction/state收敛为约定范围与关键状态。 |
| [product-design/skills/user-context](/Users/zhudaoming/Projects/yss-spec-project-template/.codex/skills/product-design/skills/user-context/SKILL.md) | P2 | 脚本明确从解析后的skill目录执行；共享preflight按工作流复用。 |
| [prototype](/Users/zhudaoming/Projects/yss-spec-project-template/.agents/skills/prototype/SKILL.md) | P1 | 自动提交或扩大暂存/生产写入指令与仓库授权边界冲突；worktree 还硬编码 npm install。按用户范围执行，提交独立判断。 |
| [prototype-review](/Users/zhudaoming/Projects/yss-spec-project-template/.agents/skills/prototype-review/SKILL.md) | P1 | 主仓新建 pending v3 与模板 v4 冲突；战略/前端变体另有旧 gate.* ID，统一当前模板和 Registry。 |
| [resolving-merge-conflicts](/Users/zhudaoming/Projects/yss-spec-project-template/.agents/skills/resolving-merge-conflicts/SKILL.md) | P1 | 自动提交或扩大暂存/生产写入指令与仓库授权边界冲突；worktree 还硬编码 npm install。按用户范围执行，提交独立判断。 |
| [setup-matt-pocock-skills](/Users/zhudaoming/Projects/yss-spec-project-template/.agents/skills/setup-matt-pocock-skills/SKILL.md) | P1 | 主要问题在子仓旧适配：嵌套 CONTEXT 布局或 ready-for-agent/ready-for-human 状态语义与当地治理冲突；主仓 domain-modeling/triage 可保留。 |
| [tdd](/Users/zhudaoming/Projects/yss-spec-project-template/.agents/skills/tdd/SKILL.md) | P2 | 重构归 review 阶段但未说明执行者，易与 Reviewer 只读规则混淆；明确由实施者完成必要重构，再由 Reviewer 只读复审。 |
| [test-agent](/Users/zhudaoming/Projects/yss-spec-project-template/submodules/yss-harness-backend-agent/.agents/skills/test-agent/SKILL.md) | P1 | 后端本地角色入口仍仅 DDD；backend-agent 称架构 Agent 已批准，与 architecture-agent 不自行批准冲突；test-agent 还宣称跨前后端验证。按已确认 DDD/MVC 与本端职责修正。 |
| [theme-token-usage](/Users/zhudaoming/Projects/yss-spec-project-template/.agents/skills/theme-token-usage/SKILL.md) | 保留 | 入口职责和条件路由可保留；共享依赖修复后执行相应回归。静态审计未发现需单独立项的入口问题。 |
| [to-questionnaire](/Users/zhudaoming/Projects/yss-spec-project-template/.agents/skills/to-questionnaire/SKILL.md) | P2 | 接收者/目标已知时直接起草，固定问答只用于缺失输入。 |
| [to-spec](/Users/zhudaoming/Projects/yss-spec-project-template/.agents/skills/to-spec/SKILL.md) | P2 | 保留 allow_implicit_invocation:false；显式入口改为当前生命周期薄适配器，复用已有决定和合同。 |
| [to-tickets](/Users/zhudaoming/Projects/yss-spec-project-template/.agents/skills/to-tickets/SKILL.md) | P1 | 显式兼容入口默认 ready-for-agent 与主控 ready-for-human/资产所有权合同冲突；统一唯一状态裁决。 |
| [triage](/Users/zhudaoming/Projects/yss-spec-project-template/.agents/skills/triage/SKILL.md) | P1 | 主要问题在子仓旧适配：嵌套 CONTEXT 布局或 ready-for-agent/ready-for-human 状态语义与当地治理冲突；主仓 domain-modeling/triage 可保留。 |
| [using-git-worktrees](/Users/zhudaoming/Projects/yss-spec-project-template/.agents/skills/using-git-worktrees/SKILL.md) | P1 | 自动提交或扩大暂存/生产写入指令与仓库授权边界冲突；worktree 还硬编码 npm install。按用户范围执行，提交独立判断。 |
| [wait-what](/Users/zhudaoming/Projects/yss-spec-project-template/.agents/skills/wait-what/SKILL.md) | P2 | 按用户语言重述；子仓版本不再跟随 CONTEXT-MAP。 |
| [wayfinder](/Users/zhudaoming/Projects/yss-spec-project-template/.agents/skills/wayfinder/SKILL.md) | P2 | 去除固定 100K token 等运行时假设；决策图回交主控，保留显式调用策略。 |
| [writing-for-agents](/Users/zhudaoming/Projects/yss-spec-project-template/.agents/skills/writing-for-agents/SKILL.md) | P2 | 约11KB入口以通用理论为主；保留有判别力的原则，详细理论/示例下沉并用真实评测确认价值。 |
| [yedit-table-usage](/Users/zhudaoming/Projects/yss-spec-project-template/.agents/skills/yedit-table-usage/SKILL.md) | 保留 | 入口职责和条件路由可保留；共享依赖修复后执行相应回归。静态审计未发现需单独立项的入口问题。 |
| [yss-api-integration](/Users/zhudaoming/Projects/yss-spec-project-template/.agents/skills/yss-api-integration/SKILL.md) | P1 | 前端子仓示例反复 message.error/if(res.success)，与同文 canonical mutator 规则冲突；主仓只读配置检查边界也需明确。 |
| [yss-application](/Users/zhudaoming/Projects/yss-spec-project-template/.agents/skills/yss-application/SKILL.md) | 保留 | 入口职责和条件路由可保留；共享依赖修复后执行相应回归。静态审计未发现需单独立项的入口问题。 |
| [yss-audit-log](/Users/zhudaoming/Projects/yss-spec-project-template/.agents/skills/yss-audit-log/SKILL.md) | P1 | 后端子仓仍为旧中文 SpEL keys 且没有双平台门禁；主仓按需读取的 assets 仍含 javax/旧 keys，须标记平台并避免当成 Boot 3 模板。 |
| [yss-backend-spec-review](/Users/zhudaoming/Projects/yss-spec-project-template/.agents/skills/yss-backend-spec-review/SKILL.md) | 保留 | 入口职责和条件路由可保留；共享依赖修复后执行相应回归。静态审计未发现需单独立项的入口问题。 |
| [yss-cache](/Users/zhudaoming/Projects/yss-spec-project-template/.agents/skills/yss-cache/SKILL.md) | 保留 | 入口职责和条件路由可保留；共享依赖修复后执行相应回归。静态审计未发现需单独立项的入口问题。 |
| [yss-ddd-scaffold-generator](/Users/zhudaoming/Projects/yss-spec-project-template/.agents/skills/yss-ddd-scaffold-generator/SKILL.md) | P2 | 约14KB，CLI完整示例、Manifest历史兼容与脚本内部函数要求下沉；入口保留已批准输入、非覆盖和完成证据。 |
| [yss-design-system](/Users/zhudaoming/Projects/yss-spec-project-template/.agents/skills/yss-design-system/SKILL.md) | P1 | 战略子仓引用退役 yss-components/height 技能；主仓 description 和 tokens 全读规则需条件化。 |
| [yss-distributed-id](/Users/zhudaoming/Projects/yss-spec-project-template/.agents/skills/yss-distributed-id/SKILL.md) | P1 | 后端子仓变体缺主仓已增加的平台/源码门禁；明确 profile 适配与有意平台范围，不让 excluded 掩盖旧正文。 |
| [yss-domain](/Users/zhudaoming/Projects/yss-spec-project-template/.agents/skills/yss-domain/SKILL.md) | P2 | description/何时使用仍覆盖设计聚合、页面/DDL沉淀模型，但正文只消费已批准模型；前置领域实现并把设计交给 technical/tactical-design。 |
| [yss-dto](/Users/zhudaoming/Projects/yss-spec-project-template/.agents/skills/yss-dto/SKILL.md) | P2 | wire字段表在规则、检查、禁令重复；保留核心边界，细则由现有 wire profile/reference 承载。 |
| [yss-excel-mvc](/Users/zhudaoming/Projects/yss-spec-project-template/.agents/skills/yss-excel-mvc/SKILL.md) | P1 | 后端子仓变体缺主仓已增加的平台/源码门禁；明确 profile 适配与有意平台范围，不让 excluded 掩盖旧正文。 |
| [yss-exception](/Users/zhudaoming/Projects/yss-spec-project-template/.agents/skills/yss-exception/SKILL.md) | P2 | Boot 3行为有分支限定，但通用 Checklist 无条件要求上传413/trace等所有seam；按平台、接口类型和影响条件验收。 |
| [yss-formily](/Users/zhudaoming/Projects/yss-spec-project-template/.agents/skills/yss-formily/SKILL.md) | 保留 | 入口职责和条件路由可保留；共享依赖修复后执行相应回归。静态审计未发现需单独立项的入口问题。 |
| [yss-formily-schema-generator](/Users/zhudaoming/Projects/yss-spec-project-template/.agents/skills/yss-formily-schema-generator/SKILL.md) | P2 | YssFormily or YFormily 示例与新代码 canonical-only 冲突；Figma workflow 增加能力发现和不可用回退。 |
| [yss-frontend-scaffold-generator](/Users/zhudaoming/Projects/yss-spec-project-template/.agents/skills/yss-frontend-scaffold-generator/SKILL.md) | 保留 | 入口职责和条件路由可保留；共享依赖修复后执行相应回归。静态审计未发现需单独立项的入口问题。 |
| [yss-hook](/Users/zhudaoming/Projects/yss-spec-project-template/.agents/skills/yss-hook/SKILL.md) | P2 | 分页示例的两个位置参数与 YTable 对象事件不一致，明确适配器；useRequest 细节按条件加载。 |
| [yss-implementation-contract-compiler](/Users/zhudaoming/Projects/yss-spec-project-template/.agents/skills/yss-implementation-contract-compiler/SKILL.md) | P2 | 多分支 UI/后端/脚手架/交接细则按需加载，保留编译不等于批准及越界/失效处理。 |
| [yss-layered-mvc-scaffold-generator](/Users/zhudaoming/Projects/yss-spec-project-template/.agents/skills/yss-layered-mvc-scaffold-generator/SKILL.md) | P2 | 平台候选清单与DDD入口重复维护；精确版本只查询平台目录，细节移共享reference。 |
| [yss-mybatis](/Users/zhudaoming/Projects/yss-spec-project-template/.agents/skills/yss-mybatis/SKILL.md) | 保留 | 入口职责和条件路由可保留；共享依赖修复后执行相应回归。静态审计未发现需单独立项的入口问题。 |
| [yss-openapi-draft-review](/Users/zhudaoming/Projects/yss-spec-project-template/.agents/skills/yss-openapi-draft-review/SKILL.md) | P1 | 把 import/publish/export 等特定场景 seam 写成全局阻断；按实际 Spec 影响选择。后端变体还缺当前 lint record 前置。 |
| [yss-openapi-governance](/Users/zhudaoming/Projects/yss-spec-project-template/.agents/skills/yss-openapi-governance/SKILL.md) | P2 | 主仓 wire 细则/输出模板下沉；前端 description 仍写维护/冻结但正文仅可消费，前置 profile 权限边界。 |
| [yss-product-lifecycle](/Users/zhudaoming/Projects/yss-spec-project-template/.agents/skills/yss-product-lifecycle/SKILL.md) | P1 | 显式兼容入口默认 ready-for-agent 与主控 ready-for-human/资产所有权合同冲突；统一唯一状态裁决。 |
| [yss-prototype-stage](/Users/zhudaoming/Projects/yss-spec-project-template/.agents/skills/yss-prototype-stage/SKILL.md) | P2 | 按现有/新设计、DDD/跨仓交接等实际分支加载详细合同，减少重复展开；不删除真实用户决定与证据门禁。 |
| [yss-repository](/Users/zhudaoming/Projects/yss-spec-project-template/.agents/skills/yss-repository/SKILL.md) | 保留 | 入口职责和条件路由可保留；共享依赖修复后执行相应回归。静态审计未发现需单独立项的入口问题。 |
| [yss-research](/Users/zhudaoming/Projects/yss-spec-project-template/.agents/skills/yss-research/SKILL.md) | 保留 | 入口职责和条件路由可保留；共享依赖修复后执行相应回归。静态审计未发现需单独立项的入口问题。 |
| [yss-resilience4j](/Users/zhudaoming/Projects/yss-spec-project-template/.agents/skills/yss-resilience4j/SKILL.md) | 保留 | 入口职责和条件路由可保留；共享依赖修复后执行相应回归。静态审计未发现需单独立项的入口问题。 |
| [yss-security-algorithm](/Users/zhudaoming/Projects/yss-spec-project-template/.agents/skills/yss-security-algorithm/SKILL.md) | 保留 | 入口职责和条件路由可保留；共享依赖修复后执行相应回归。静态审计未发现需单独立项的入口问题。 |
| [yss-skill-source-index-refresh](/Users/zhudaoming/Projects/yss-spec-project-template/.agents/skills/yss-skill-source-index-refresh/SKILL.md) | 保留 | 入口职责和条件路由可保留；共享依赖修复后执行相应回归。静态审计未发现需单独立项的入口问题。 |
| [yss-stage-decision](/Users/zhudaoming/Projects/yss-spec-project-template/.agents/skills/yss-stage-decision/SKILL.md) | P2 | 按现有/新设计、DDD/跨仓交接等实际分支加载详细合同，减少重复展开；不删除真实用户决定与证据门禁。 |
| [yss-strategic-design](/Users/zhudaoming/Projects/yss-spec-project-template/submodules/yss-harness-design-agent/.agents/skills/yss-strategic-design/SKILL.md) | P2 | 按现有/新设计、DDD/跨仓交接等实际分支加载详细合同，减少重复展开；不删除真实用户决定与证据门禁。 |
| [yss-tactical-design](/Users/zhudaoming/Projects/yss-spec-project-template/.agents/skills/yss-tactical-design/SKILL.md) | P2 | 按现有/新设计、DDD/跨仓交接等实际分支加载详细合同，减少重复展开；不删除真实用户决定与证据门禁。 |
| [yss-technical-design](/Users/zhudaoming/Projects/yss-spec-project-template/.agents/skills/yss-technical-design/SKILL.md) | 保留 | 入口职责和条件路由可保留；共享依赖修复后执行相应回归。静态审计未发现需单独立项的入口问题。 |
| [yss-ui](/Users/zhudaoming/Projects/yss-spec-project-template/.agents/skills/yss-ui/SKILL.md) | P1 | 主仓可保留；前端子仓把 YssFormily 定为新代码名称，与同仓 Formily 专项规则相反，并提及退役原型入口。 |
| [yss-ui-business-page-generation](/Users/zhudaoming/Projects/yss-spec-project-template/.agents/skills/yss-ui-business-page-generation/SKILL.md) | P2 | 必读列表无条件加载表格/编辑表格/树/表单/导出，与后文按需加载矛盾；150行绝对限制改结果/职责约束。 |
| [yss-up-springboot3](/Users/zhudaoming/Projects/yss-spec-project-template/.agents/skills/yss-up-springboot3/SKILL.md) | 保留 | 入口职责和条件路由可保留；共享依赖修复后执行相应回归。静态审计未发现需单独立项的入口问题。 |
| [yss-userinfo](/Users/zhudaoming/Projects/yss-spec-project-template/.agents/skills/yss-userinfo/SKILL.md) | 保留 | 入口职责和条件路由可保留；共享依赖修复后执行相应回归。静态审计未发现需单独立项的入口问题。 |
| [yss-validation](/Users/zhudaoming/Projects/yss-spec-project-template/.agents/skills/yss-validation/SKILL.md) | P2 | Workflow要求先读README，后文又注明README为空；直接路由到POM/消息资源/实际Advice证据。 |
| [yss-web-controller](/Users/zhudaoming/Projects/yss-spec-project-template/.agents/skills/yss-web-controller/SKILL.md) | 保留 | 入口职责和条件路由可保留；共享依赖修复后执行相应回归。静态审计未发现需单独立项的入口问题。 |
| [ytable-usage](/Users/zhudaoming/Projects/yss-spec-project-template/.agents/skills/ytable-usage/SKILL.md) | P2 | 清除选择的或/且指导不一致；基于真实受控状态统一为结果约束和必要动作。 |
| [ytree-usage](/Users/zhudaoming/Projects/yss-spec-project-template/.agents/skills/ytree-usage/SKILL.md) | 保留 | 入口职责和条件路由可保留；共享依赖修复后执行相应回归。静态审计未发现需单独立项的入口问题。 |

## 建议实施批次与验收

1. **先修确定冲突。** 处理F01–F12中实际影响授权、组件代码、schema、状态和平台的部分；先确定canonical、profile-local、upstream/excluded的所有者。兼容入口保留显式策略，移除的是错误行为，不是直接删除兼容身份。
2. **再改善加载。** 将入口缩为任务边界、输入、分支路由、关键不变量、完成证据；按实际场景加载已有references，避免为每条规则另造一层router。修正description后先验证相邻任务不误触发。
3. **补真实Agent评测。** 对优先技能先建小而代表性的正例、改写表达、邻近负例、显式兼容与权限边界测试。记录实际选中技能、加载文件、命令、产物、违反边界情况；对比修改前后，才声明收益。结构检查仍保留但不冒充模型评测。
4. **完成受影响分发。** 后续获准实施时，按仓库强度政策同步canonical→profile适配→runtime投影→锁→CLI快照并执行适用检查。提交、推送、发布另按真实授权；本次未修改这些内容。

| 代表任务 | 预期行为 |
|---|---|
| 只解决冲突，工作区还有其他未提交文件 | 只处理授权文件，不自动全部暂存/提交 |
| 显式to-tickets但未通过实现就绪门禁 | 形成待审资产/建议，不越权ready-for-agent |
| 普通查询API，没有导入发布 | 不因未提供import/publish/export seam误阻断 |
| 前端JSON业务失败 | mutator/页面合计一次错误反馈，loading恢复 |
| 静态视觉稿、只改一处表单 | 尊重静态范围，按需加载专项，不强制全交互/树表导出 |
| Boot 2与Boot 3同名组件 | 选择正确平台源码；不混用旧样本 |
| KPI只需inline / HTML只转本地DOCX | 按目标交付，不强制报告、上传或扩大共享 |
| 缺某MCP/插件、未初始化分析上下文 | 按宿主能力回退或给出具体缺口，不调用不存在工具 |

## 本轮实际验证

- 主仓：Registry、技能治理、runtime投影、锁文件、三profile同步检查均退出0；profile changes/issues为空。
- 三个Agent子仓：各自Registry、治理、投影退出0；各自`update-skill-lock --check`退出1，提示锁过期。未修复或推测其具体字段根因。
- 后端/前端/战略三个薄CLI：`pnpm run verify-bundle`退出0；快照中的SKILL条目分别252/261/107（包括投影），所检查file项的blob摘要与当前来源均一致，来源HEAD匹配。
- 综合create-yss-spec：只读比较141个当前.agents/.codex路径副本未发现差异；此rglob比较未完全展开全部符号链接叶节点，不等于完整bundle验证。快照标记committed但根仓HEAD已不同；未据此单独认定技能快照过期。
- Data Analytics主仓/前端对应bundle的175个文件一致。所有来源及记录见[verification.json](verification.json)。未运行完整模板发布门禁、业务生成测试或模型A/B。

## Counter-Signals

好的既有设计应保留：lombok/mapstruct已有短入口和条件reference；yss-cache明确场景分流；yss-formily是窄路由；源码freshness、平台边界和统一错误/授权规则有实际领域价值。显式兼容入口的false策略已经存在。所有这些反证都说明问题不是“技能越少越好”或“门禁越少越好”。
同步与bundle校验通过是分发一致性的正证据，不能反证正文相互矛盾。文件字数与description长度只作人工复核线索，不作自动失败阈值。没有真实Agent运行，不能断言实际误触发率、token节省、正确率或时间改善。

## Source Map

官方页面负责定义推荐实践；本地SKILL/Registry/模板/脚本是当前静态事实；实际只读检查提供结构与分发证据。历史记忆仅用于定位canonical/投影及以前研究路径，当前计数、状态和问题重新核对。未采用第三方转载作为规范依据。

## Decision Handoff

接收者：用户/模板维护者。建议先按P1确定问题启动一批维护，再以评测结果决定P2范围。报告只是分析建议；没有批准Slice、改变Ticket、提交、推送或发布。仅新增本目录审计产物，未修改任何Skill。无需为了审计结果另生成产品Spec/Ticket。

## Evidence Limitations

- 全读入口不等于审计了所有references、scripts和assets；仅围绕发现追踪关键依赖。没有执行后端/前端生产任务。
- 当前工作区已有未提交/未跟踪内容，审计未清理和覆盖；其他任务后续变更会使路径hash或行号失效。
- 扫描历史备份时遇到一个不可读备份目录，已排除；当前来源和CLI快照的上述检查没有依赖该备份。
- 只读检查失败/通过均按实际记录。模型效果、插件服务可用性、远端源码和发布完整性不在本次验证结论内。
- 117项按最高风险变体分类，具体实施仍需核对每个profile的合法差异，不可全仓盲目替换。
