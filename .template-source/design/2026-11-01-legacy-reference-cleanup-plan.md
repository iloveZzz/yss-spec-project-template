# 旧文档引用与技能收敛 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. 沿用用户此前选择的 `superpowers:executing-plans`，由主执行者顺序实施；仓库约束优先，不推导强制 TDD、逐任务审查或自动提交。

**Goal:** 清除仍影响当前工作的旧流程要求，退役 44 个孤立文件，并在保留有效方法与文件保护的前提下收敛 4 个重复技能入口。

**Architecture:** 按“有效引用修复 → 孤立文件移除 → 技能职责合并”分三批实施。每项同时处理共享源、Backend 覆盖、平台副本和分发元数据；沿用现有文件格式，不增加运行框架、兼容壳或维护脚本。

**Tech Stack:** Markdown、YAML、JSON、Git、Node/Python 标准库、已安装 YSS CLI 的帮助；最终按实际可用条件使用现有 Go Bundle 工具核对组合后的分发内容。

**Spec:** [根 AGENTS.md](../../AGENTS.md)、[Skills 维护](../agents/skills-maintenance.md)、[已批准的 Matt 适配设计](2026-10-31-matt-skills-convergence-design.md)，以及本文“本次范围与决定”保存的 2026-11-01 引用审查结论。本文明确说明对前次范围的调整，执行者不需要依赖聊天记录。

**Status:** 用户已批准执行；六项任务与收尾核对已完成。一次独立只读审查发现 1 项 Important（DDD 单技能安装缺平台 JSON），已修复并完成失败→通过核对；未提交、推送、发行或升级实例。沿用本轮 `.template-source/design` 存放位置；默认 `docs/superpowers/plans` 被本仓忽略，不修改忽略规则。

## Global Constraints

- 工作目录：`/Users/zhudaoming/.codex/worktrees/matt-skills-convergence/yss-spec-project-template`；分支：`codex/matt-skills-convergence`。在现有未提交修改上增量实施，不从 HEAD 恢复覆盖前两轮结果。
- “不要求生命周期路由、阶段门禁、检查计划、测试报告、批准包、checkpoint 或实现资格。”本文核对仅用于本次改动，不变成技能运行前置。
- “本仓不维护或分发脚本与测试套件。”不创建持久验证脚本、测试目录、生成器或 CI；使用一次性命令和代表性场景检查。文档调整不机械套用代码 TDD。
- “保留业务输入校验、错误处理、权限控制和文件保护。不覆盖无关用户工作，不把子模块当普通目录；仅修改已授权仓库和范围。”
- Skills 内容源为 `.agents/skills`，Backend 专有源为 `profiles/backend/.agents/skills`；同时处理 `_specialist` 文档覆盖，不能只修改根目录。
- 保留许可证、来源提交、上游哈希、未受影响的调用策略和元数据。Matt 原始来源 `0ab1b63a410a03d3627979a109c8695de27af954`、比较基线 `4ae2317ddb22b046e26455e4f9c9b3aaaf62212d` 不变。
- 不修改 `yss-cli` 源码或内嵌资产，不同步用户安装实例，不发布公开技能，不改全局插件。本地 CLI 源码只读，必要生成结果放在系统临时目录。
- 提交、推送、部署、发行与外部发送分别使用真实授权。本计划不安排自动 commit，不执行 `git add -A`，不改用户暂存区。
- 不按“批准”“合同”“证据”等关键词全仓替换；权限授权、API 合约、真实兼容性事实和历史记录仍有意义。

## Review Focus

| 输入或失败条件 | 必须保留的行为 | 所属核对 |
|---|---|---|
| 根文件已更新，但 Backend 覆盖仍旧；只有 skills 安装，没有完整治理目录 | 读取到有效新内容，链接在实际安装范围可用，不依赖源仓隐藏资料 | 任务 1—3；场景 S1、S2、S3 |
| 删除技能后，注册表、安装资源或公开分组仍引用旧 ID | 所有当前依赖均指向存在的入口；公开独立包不假设包含完整模板 | 任务 5—6；场景 S5、S6 |
| 清理对象出现用户新改动，或把平台证据误当旧流程文件 | 保留新改动、当前计划和真实工程证据，只删除精确清单 | 任务 4；场景 S4 |
| 只请求 API 审查，或 JSON 导出包含递归模型及越界引用 | 只读审查不改 API；转换保留可表示的 `$ref`，不擅自读取越界/远程内容 | 任务 5；场景 S5 |
| 跨仓只读调查、未授权子仓、空 gitlink、detached HEAD 或未推送子仓提交 | 保留读取/写入/发布权限差异，不当普通目录覆盖，不把父仓授权扩展到子仓 | 任务 6；场景 S6 |

这些场景按正文核对只能报告“文本推演”；实际工具执行结果另报，不能把预期响应写成 Agent 实测通过。

---

## 本次范围与决定

1. **有效引用优先。** 默认分发的审查报告模板仍要求旧合同编译；持久层、脚手架、架构参考和 OpenAPI 子文档仍恢复旧流程；Backend 手册包含当前 CLI 不支持的参数。先修复这些使用链。
2. **退役文件精确限定。** 附录 A 的 44 个文件在审查时均已跟踪、无未提交修改，合计 677,276 字节，未发现集合外的已解析显式引用。目录式读取和安装规则另行核对，不能把“无链接”当作普遍删除依据。
3. **建议合并 4 个入口。** `yss-openapi-draft-review` 并入 `yss-openapi-governance`；`yss-implementation-contract-compiler` 的任务整理并入 `to-tickets` / `implement`；`cross-repo-implementation-routing`、`implementation-repo-onboarding` 的工程识别与保护并入 `implement` 的按需参考。
4. **集合目标。** 根技能 62 → 58，Backend 有效技能 61 → 57；公开清单根 27 → 25、Backend 23 → 21。两种安装模式的默认技能数组原样保留：Spec project 7、skills 10；Backend project 4、skills 4。不增加新技能 ID。
5. **调整前次范围。** 前次“技能数量不变”限定被本次明确列出的 4 项退役替代；前次历史合同原文不改的要求仍保留，但 33 份历史合同从当前工作树退役，以 Git 历史保存，不另建 archive 副本。此前未提交设计和计划全部保留。
6. **继续保留。** `yss-backend-spec-review`、`yss-stage-decision`、`yss-technical-design`、`yss-tactical-design` 及 Backend 角色技能不在本次整项退役范围。保留 `backend-platforms.json` 与全部 engineering/evidence 字节、`spec-workflow.json`、`profile-status.yaml`、分发清单及设计资产；只删除已定位的失效 profile 引用字段。
7. **历史不冒充现行。** 迁移说明保存旧名称和历史事实；新增当前迁移表，明确旧章节不是现行命令或门禁。旧 CLI 是否自动清理/重映射技能不作承诺，本轮不升级存量项目。

### 已核对的消费者事实

- 本机 `yss` 为 3.0.2，源码提交 `20b9be9bb553722738885ff9667b0d70ddee2d9c`；`attach/sync --help` 提供 `--dry-run`，不提供旧 `--plan --out --apply --plan-file`。
- 同提交的本地 `yss-cli/internal/bundle/producer.go` 读取 `bundle-profile.json`，检查 `files`、`skills`、`skillReferences`。Backend 从共享技能/process/templates 内核开始，再按 `_specialist`、`backend` 顺序覆盖；**不会自动继承根 user-guide、agents 或 engineering 目录**。
- 该 CLI 的 `cmd`/`internal` 源码未发现读取 `delivery_path_policy_ref` 或解析技能注册表的代码；这些 YAML 仍可能被 Agent 或外部消费者读取，因此不删除整个配置或注册表。
- `profiles/_specialist/.template-spec/user-guide/unified-cli.md` 仍是大段旧 CLI 手册，不能只更新根同名文件。Backend 统一 CLI 链接需要实际投影，不能假设根目录文档自动进入 Bundle。

## 文件结构与批次

下文路径相对工作目录。`S` = `.agents/skills`，`B` = `profiles/backend`，`P` = `profiles/_specialist`。花括号表示列举的每个准确文件，不表示扩展删除范围。

| 批次 / 任务 | 文件职责 | 产出 |
|---|---|---|
| A / 1 | 当前审查与写作入口、失效 profile 引用 | 默认分发不再恢复旧审查协议 |
| A / 2 | 持久层、脚手架、架构和平台参考 | 保留技术方法，移除统一合同/资格要求 |
| A / 3 | CLI 公共文档及 Backend 指南 | 两个 Profile 都有可达、与实际帮助一致的说明 |
| B / 4 | 附录 A 的 44 个文件 | 从当前工作树移除孤立旧资产，保留 Git 历史 |
| C / 5 | OpenAPI 审查、编辑、导出 | 合并为一个有效入口，迁移实际依赖 |
| C / 6 | 实施任务整理、仓库识别与保护 | 合并三个入口，完成清单与迁移说明 |

任务按 1 → 6 顺序执行；共享清单由同一执行者整合，不并行写入。每项完成自己的内容及元数据同步，不能把副本修复全部拖到最后。

### 每项适用的同步规则

- 修改共享技能后，同步 `.workbuddy/skills/<id>/`；根 `.claude/skills/<id>` 保持正确相对链接。Backend 以共享内容叠加 `B/.agents/skills/<id>/` 的有效树同步 `B/.workbuddy/skills/<id>/`，保留合法专有差异。
- 删除技能时，同时移除其共享目录、已有 Backend 覆盖、两份 WorkBuddy 副本及根 Claude 链接；删除链接本身，不沿链接递归删除其他路径。
- 更新受影响 Backend `skills-lock.json.skills.shared[id].effectiveHash`：按 Node `localeCompare` 排序有效相对路径，逐项输入路径、NUL、内容、NUL；UTF-8 无 NUL 文本 CRLF 归一为 LF；忽略 `.DS_Store`、`__pycache__`、`.iml/.pyc/.pyo`。根锁没有该字段时不新增。保留来源字段和文件模式。
- 技能退役同时修改根及 Backend 的 `skills-lock.json`、`yss-public-skills.json`、`.template-spec/agents/yss-skill-registry.yaml`、`.template-spec/agents/skill-migrations.md`、`.template-source/distribution/bundle-profile.json`。公开 `skills` 与 `groupings[].skills` 一起修改；两种安装模式的 `skillReferences` 一起修改。
- 只更改文档时不重算无关技能哈希。默认技能数组、未受影响元数据、许可证和工程证据与执行前快照比较，预期不变。

## 任务 1：移除默认旧审查协议，修正当前写作引用

**Files:**
- Delete: `.template-spec/templates/review-report-template.md`、`B/.template-spec/templates/review-report-template.md`。
- Modify: `.template-source/distribution/bundle-profile.json` 的 `installations.project.files`；根与 `B/.template-spec/process/document-writing.md`；`B/.template-spec/process/harness-profile.yaml` 的 `business_input.delivery_path_policy_ref`。
- Verify: `S/code-review/SKILL.md`、`S/i-have-adhd/SKILL.md` 及其有效引用；不新增测试文件。

**Interfaces:** 消费现有 `code-review` 的缺陷报告方法与 `i-have-adhd` 文档类型导航；保留 `document-writing.md` 路径，产出不依赖生命周期注册表的现行说明。移除失效字段，不新增替代协议。

- [x] **Step 1：固定本轮基线。** 将 Git 状态、待改文件内容/模式及受保护目录摘要保存在系统临时目录，记录本轮新增差异的比较起点；不得用 HEAD 差异代替本轮差异，不读取或输出凭据。
- [x] **Step 2：移除审查模板与安装引用。** 从根 project 的 `files` 删除该模板路径，再删除两份旧模板。现有 `code-review` 直接输出有证据的问题；不另建报告模板或要求为审查安装全套治理资料。
- [x] **Step 3：修正文档导航。** 两份 `document-writing.md` 保留文档类型、表达、事实与授权规则；删除当前名称/状态必须来自生命周期注册表、登记角色和验证协议的要求。历史资产如需解释可按实际可读内容说明，不把编号当真实批准。
- [x] **Step 4：移除悬空 profile 字段。** 删除 `business_input.delivery_path_policy_ref`；保留相邻 `analysis_grants_opposite_side_write: false`、`terminal_claim: own-side-only` 及其他业务范围字段。
- [x] **Step 5：核对 S1。** 输入“只审查这次改动，没有合同和验证包”应能直接审查；输入“改一段说明，没有生命周期注册表”应能完成写作；输入“分析另一个仓库”不获得对方写权限。检查两份文档的有效引用均存在；`rg -n 'review-report-template|delivery_path_policy_ref' .template-source/distribution/bundle-profile.json profiles/backend/.template-spec/process/harness-profile.yaml` 预期无匹配（exit 1）。

## 任务 2：清除技术参考中的旧合同前置

**Files:**
- Modify: `S/yss-repository/SKILL.md`、`S/yss-repository/references/profiles/{target-domain-model,layered-mvc-service,existing-domain-driven-maven,existing-layered-mvc-maven,mvc-data-analysis-v1}.md`。
- Modify: `S/yss-ddd-scaffold-generator/references/platform-selection.md`。
- Modify: 根与 `P/.template-spec/agents/backend-architecture-profiles.md`；根与 `P/.template-spec/engineering/backend-platforms.md`。
- Modify: 根与 `B/.template-spec/architecture/templates/{system-overview-design-template,architecture-review-checklist,tech-design-template,data-architecture-template}.md`。
- Sync: `yss-repository`、`yss-ddd-scaffold-generator` 的适用副本及 Backend 哈希。

**Interfaces:** 消费真实工程结构、接口、POM、源码索引和既有平台事实；产出按 DDD/MVC 与任务影响选择的技术参考。既有 JSON 字段仅解释为历史/技术数据，不要求生成新的 `platform_configuration` 或合同资产。

- [x] **Step 1：修正架构参考。** 入口给出按架构选择参考的明确链接；五份 profile 改从实际源码、现有接口及当前需求确定落点，删除注册/Manifest/批准合同和回编译器要求。保留 Domain Gateway、Query Port、MVC Service 边界、事务、映射、参数绑定、字段白名单与敏感信息保护。数据分析参考只服务既有代码，不恢复已退役初始化器。
- [x] **Step 2：修正平台说明。** `platform-selection.md` 及两份平台说明以工程现有精确版本、实际解析和已有兼容事实为依据；去掉强制合同 v2/v4、生命周期重批和资格晋级流程。保留未知兼容性、不伪造验证、SNAPSHOT 与解析版本区分、摘要与来源范围；不升级版本、不改 `backend-platforms.json` 或 evidence。
- [x] **Step 3：修正共享架构及模板。** 保留类型分层、错误/DTO 约定、DDL/索引、并发和幂等的设计问题；将旧 Build Architecture Checklist 独立资产、冻结摘要、统一 Freeze 和阶段准入改为按当前任务记录必要约束与真实未决项。安全或破坏性动作仍要求其真实授权，不因删除门禁变成默认许可。
- [x] **Step 4：核对 S2。** 已有单模块 MVC 工程缺登记文件时仍能定位 Service/Repository；DDD 展示分页不进入 Domain；动态排序仍拒绝未列入白名单的输入；H2 结果不证明生产方言；未知 Boot/YSS 组合不被宣称兼容。所有技术规则有保留位置，不只检查旧词是否消失。
- [x] **Step 5：同步并比较。** 按共同规则同步两个技能及 `_specialist`/Backend 文档。确认根与 `_specialist` 的平台 JSON、全部 engineering/evidence、原有技能来源字段与 Step 1 基线字节一致；执行 `git diff --check`，预期 exit 0。

## 任务 3：合并 Backend 旧指南，补齐实际分发链接

**Files:**
- Modify: 根 `.template-spec/user-guide/{unified-cli,用户手册}.md` 与 `cli/{install-and-verify,command-reference,tutorial-spec,tutorial-backend,tutorial-maintenance}.md`。
- Modify: `P/.template-spec/user-guide/unified-cli.md`；Create: `P/.template-spec/user-guide/cli/{install-and-verify,command-reference,tutorial-spec,tutorial-backend,tutorial-maintenance}.md`，内容逐文件投影自根共享文档。
- Modify: `B/.template-spec/user-guide/{后端子项目用户手册,用户手册索引}.md`、`B/.template-source/distribution/bundle-profile.json` 的 project `files`。
- Delete: `B/.template-spec/user-guide/{CLI使用说明,产品生命周期工作流,设备借用贯穿案例}.md`。

**Interfaces:** 统一 CLI 六份文档为共享说明源，`_specialist` 是分发副本；Backend 两份专有文档只描述本 Profile 的工作方式及导航。Backend project 安装包含这八份文档；skills 安装不额外装整套手册。默认技能数组不变。

- [x] **Step 1：核对命令事实。** 分别运行 `yss version`、`yss help`、`yss attach --help`、`yss sync --help`、`yss skills ensure --help`、`yss scaffold --help`、`yss recover --help`。当前预期 3.0.2 与直接执行/`--dry-run` 语义；若版本变化，依据真实帮助调整示例，不执行安装、同步或恢复。
- [x] **Step 2：统一版本表述。** 七份根文档删除未经当前事实支持的“尚未正式发行”断言，统一说明“命令支持以所装版本帮助为准；模板更新不改变旧二进制能力”。保留首次安装、文件保护和来源核对，不宣称 3.0.2 是最新发行。
- [x] **Step 3：压缩专有指南。** 后端手册只保留实际工程入口、DDD/MVC 边界、`./mvnw`、按影响使用 YSS 技能与权限保护；CLI 命令链接统一指南。索引删除旧阶段/案例/旧命令链接，链接保留的后端手册、统一 CLI 与实际存在的 CLI 子文档；然后移除三份重复旧指南。
- [x] **Step 4：补齐有效分发。** 用根统一 CLI 及五份子文档更新/创建对应 `_specialist` 副本；将六份有效 CLI 路径与两份 Backend 手册路径加入 Backend project `files`。这不是新增默认技能或生成器，不能只写源仓链接而漏装文档。
- [x] **Step 5：核对 S3。** 对 Spec/Backend 的 project 和 skills 四种组合检查：project 所有本次导航链接可解析；skills 不依赖全套手册；旧手册路径不再作为当前链接；旧 `--plan/--apply/--plan-file/--out` 不再作为操作示例。七份命令说明逐条与帮助对应，只读核对不得创建项目或改用户实例。六份共享 CLI 与 `_specialist` 副本逐字节一致。

## 任务 4：按精确清单退役 44 个孤立文件

**Files:** Delete 附录 A；保留当前 `.template-source/design` 的全部设计/计划、HTML/CSS/JS 与同步配置。不新增归档目录或历史索引。

**Interfaces:** 消费附录 A 的固定清单、当前文件状态和任务 1—3 后的引用；产出当前工作树不再维护这些文件，原文仍可由 Git 历史取得。删除原因已记录于本计划，不另建批准包。

- [x] **Step 1：重新确认集合。** 核对清单为 44 个文件、全部有 Git 历史；检查执行前后是否出现新改动。若某文件有用户新修改，只暂停该文件，保留原文并说明差异，不用强制删除或回退命令；其他已确认项继续。
- [x] **Step 2：复查依赖。** 搜索精确路径、basename 和可能的目录式读取；核对两份 bundle 的 `files`、`skillReferences`、`entries`。本计划的删除清单、迁移说明和明确历史记录属于允许的历史提及，不伪装成运行依赖。发现真实新调用时先在其所有者处迁移，不能制造悬空引用。
- [x] **Step 3：移除清单文件。** 只删除附录 A 的路径，空目录可自然消失；不使用扩大范围的通配删除，不改暂存区，不重写历史内容，不把 `.template-source` 或 `.template-spec` 整目录删除。
- [x] **Step 4：核对 S4。** 清单路径均不存在，Git 中仍可追溯；此前未提交的三份 Matt 设计/计划与所有 engineering JSON/evidence 和设计资产保持基线字节。仓外历史案例、根用户指南历史案例不随此清单删除。出现新改动的例外要明确计入未完成数量，不宣称 44 项全部完成。

## 任务 5：合并 OpenAPI 审查与维护入口

**Files:**
- Modify: `S/yss-openapi-governance/{SKILL.md,agents/openai.yaml,references/governance-workflow.md}`；`B/.agents/skills/yss-openapi-governance/{SKILL.md,references/governance-workflow.md}`。
- Delete: `S/yss-openapi-draft-review/` 全目录；`S/yss-openapi-governance/references/{governance-output,locked-toolchain}.md`；根与 `B/.template-spec/api/templates/openapi-draft-review-checklist.md`。
- Modify/Sync: 共同规则所列两套元数据、退役技能副本；存续 `yss-openapi-governance` 的副本和 Backend 哈希。

**Interfaces:** 保留唯一 ID `yss-openapi-governance`；支持“只读审查”“编辑 YAML”“按需导出 JSON”三种当前请求。技术设计的 `api-impact`、`review-only` 依赖转向该 ID，依赖类型和条件不扩大成编辑授权。

- [x] **Step 1：迁移独有方法。** 将 draft 技能及 `semantic-review.md` 的参数来源、必填/null、create/update、默认值、枚举、分页、幂等、权限与调用方兼容检查合入现有 `governance-workflow.md`，在主入口按请求链接。描述和显示元数据明确支持审查；主入口明确只读请求不改 API 文件。
- [x] **Step 2：保留安全导出方法。** 在同一参考保留可用工具按需 lint/bundle、递归模型保留 `$ref`、相对路径与输出保护。工具参数先按项目实际帮助选用，不强装/锁定 Redocly，不把锁文件或 Freeze 当资格；未授权的绝对路径、越界或远程引用不自动读取，共享组件按已明确读取范围处理。
- [x] **Step 3：迁移注册表和资源。** 两份注册表将 `yss-technical-design` / `yss-tactical-design` 下实际存在的旧 `review-only` 依赖改为 `yss-openapi-governance`，保留 `when: api-impact`；删除旧技能本体、调用覆盖与依赖键。两套 bundle 的两种模式删除旧 `skillReferences` 键；两份公开清单删除旧 ID 及分组条目。
- [x] **Step 4：删除旧入口与协议。** 删除 draft 技能及适用投影、两份 checklist、governance 的两个旧协议参考；先确认任何有效调用已迁移。新迁移表记录旧 ID → governance，只说明当前替代，不承诺 CLI 返回特定退休码或自动升级。
- [x] **Step 5：核对 S5 并同步。** 请求“只审查这份 OpenAPI”只返回定位问题；导出递归 schema 保留引用；越界 `$ref` 不被自动读取；缺 pnpm/Redocly 时不伪报 lint 通过；技术设计的 API 审查依赖可找到新入口；公开包仅含治理技能也能读内部参考。阶段结束集合为根 61、Backend 60、公开根 26/Backend 22。

## 任务 6：收敛任务整理与跨仓入口

**Files:**
- Modify: `S/implement/SKILL.md`、`S/to-tickets/SKILL.md`、`.template-spec/process/implementation-repo-integration.md`。
- Create: `S/implement/references/repository-scope.md`，只承接实际仓库定位与读写保护。
- Delete: `S/{yss-implementation-contract-compiler,cross-repo-implementation-routing,implementation-repo-onboarding}/`；`B/.agents/skills/yss-implementation-contract-compiler/`；根与 `B/.template-spec/templates/implementation-repo-registry-template.md`；`.template-spec/templates/cross-repo-slice-template.md`。
- Modify/Sync: 两套共同元数据与迁移说明；`implement`、`to-tickets` 的平台副本及 Backend 哈希；三个退役入口的适用副本。

**Interfaces:** `to-tickets` 继续持有显式任务拆分，`implement` 承接已有任务并按实际架构选技能；新参考仅在多仓、子模块或仓库位置不明确时读取。保持两个技能原有显式调用策略。跨仓交付继续使用显式 `handoff`，不引入自动发布。

- [x] **Step 1：承接任务整理。** 在研发拆分和实施入口保留目标行为、真实仓库/路径、接口依赖及适用技能；按 DDD/MVC 分别选择 Domain/Application 或 Service，复用原 Ticket 和验收。已有内容足够时只补缺失决策，不复制编译器正文或创建新的任务合同。
- [x] **Step 2：承接仓库保护。** 新参考根据实际 Git 根、remote、目录和构建文件识别工程；按需核对 `git ls-files --stage` 与 `.gitmodules`。mode `160000` 按子模块处理；只读调查不创建登记文件或写子仓；未初始化/空挂载点不普通 clone/复制覆盖。detached HEAD 不直接进行持久修改，先在已授权范围明确安全分支；父仓授权不自动包含子仓。
- [x] **Step 3：承接跨仓交付边界。** 明确每仓目标、读写范围、接口依赖和实际状态；已有需求足够时不要求 Freeze/onboarding/登记。涉及子模块交付时先确认子仓提交可由目标远端取得，再在相应授权内更新父仓 gitlink，不能把未推送对象称为可交付。保留用户改动、秘密保护及提交/推送各自动作授权。
- [x] **Step 4：迁移元数据后删除入口。** 两份注册表删除三技能定义、调用覆盖、所属域映射及对应依赖键；删除 `governance.implementation-contract` capability，不把它重命名成通用 implement 能力。`yss-backend-spec-review` 对旧编译器的 `coordination-only` 边直接删除，保留其 code-review/Java 依赖。两套 bundle 删除三项 `skillReferences`；公开清单删除 compiler；锁和投影同步删除。精简保留 `implementation-repo-integration.md`，去掉指向退役入口的要求，不增加新安装依赖。
- [x] **Step 5：整理迁移说明。** 两份迁移说明顶部提供本轮四 ID 的当前去向，旧章节标为历史而非现行命令/门禁；说明当前存续技能不受旧阶段退役措辞限制。用户提及旧 ID 时依据当前目标解释替代，不自动执行显式技能。公开独立包不保证带 `implement/to-tickets`：缺少时按当前请求直接整理，或按真实安装能力接入；不新增公开 wrapper、不扩大公开名单，不宣称安装实例已自动清理。
- [x] **Step 6：核对 S6 并同步。** 输入“只分析外部仓”不写文件；输入“修改 A，B 只作接口参考”不写 B；空 gitlink 不被覆盖；detached HEAD 不被当正常分支交付；子仓 SHA 未在远端可取得时不能宣称父仓交付完成；只有公开 YSS 包的用户不被要求调用不存在的技能。最终根 58、Backend 57、公开根 25/Backend 21，默认技能数组与基线完全一致。

## 收尾核对与交付

- [x] **本轮差异。** 与执行开始的临时快照比较，新增/修改/删除均属于上述任务及其明确副本；已存在的 Matt 修改、用户暂存区和受保护资产不被回退。运行 `git diff --check`，预期 exit 0；不将整个分支原有差异算成本轮成果。
- [x] **资源闭合。** 用现有 JSON/YAML 读取能力核对两套 `skills.shared`、注册表、公开 `skills/groupings`、四种安装集合的每个技能/文件引用。当前技能 ID 必须存在；退役四 ID 仅允许出现在本计划、迁移历史或不可变事实中。Markdown 的历史删除清单、模板占位符和故意反例分别处理，不能用全仓“零命中”伪造正确性。
- [x] **有效树。** 对本轮变更技能逐文件比较共享、Claude 链接和两份 WorkBuddy 有效副本；核验 Backend 覆盖优先级及 `effectiveHash`。对六份 CLI 投影逐字节比较；不引入未经修改的锁字段漂移。
- [x] **实际 Bundle 消费。** 若当前本机 CLI 源码与 Go 可用，在其目录使用下面已存在的工具生成临时 Bundle；不写 CLI 的 `internal/bundle/assets`。预期 exit 0、输出 `storageFormatVersion: 6` 和真实归档摘要，证明四种安装资源可由真实生产器组合。工具/源码不可用时明确未执行，不重新实现生产器。

```sh
# 工作目录：/Users/zhudaoming/Projects/yss-cli；只读源码，输出到系统临时目录。
cleanup_bundle_dir=$(python3 -c 'import os,tempfile; print(os.path.realpath(tempfile.mkdtemp(prefix="yss-cleanup-bundle-")))')
go run -tags yss_nobundle ./tools/bundle \
  --source-root /Users/zhudaoming/.codex/worktrees/matt-skills-convergence/yss-spec-project-template \
  --out "$cleanup_bundle_dir"
```

归档内容核对 Spec/Backend 的最终技能集合、已删除文件不再分发、Backend 导航文件已进入 project、skills 安装没有新增全量手册；输出来源须如实记录 working-tree。验证结束只清理本次创建的临时目录。Bundle 生成不等于已安装 CLI 已升级，也不等于存量实例迁移验证完成。

- [x] **报告实际结果。** 说明每批实际完成项、实际删除数量、保留例外、技能集合变化、静态/文本场景/Bundle 各自结果；未运行 Maven、未发布、未升级实例均不宣称成功。若执行中发现清单外的新问题，保留定位与影响，不借清理扩展到整仓重写。

## 附录 A：44 个固定删除候选

以下是退役对象的历史路径，不是供执行者继续读取的现行依赖。执行时不得把目录通配扩展到后来新增的文件。

### A1：`.template-source/contracts/` 下 33 个历史文件

```text
2026-10-21-stage-gates-design.md
2026-10-21-stage-gates-plan.md
2026-10-21-stage-gates-verification.md
2026-10-22-matt-method-optimization-design.md
2026-10-22-matt-method-optimization-plan.md
2026-10-23-skill-first-optimization-design.md
2026-10-25-lightweight-iteration-design.md
2026-10-26-lightweight-iteration-plan.md
2026-10-29-matt-skills-integration-closure-design.md
2026-10-29-matt-skills-integration-closure-plan.md
2026-10-30-template-5-cli-3-cleanup-execution-plan.md
2026-10-30-template-5-cli-3-cleanup-plan.md
README.md
architecture-iteration-v1-approval-adapter-design.md
architecture-iteration-v1-ar09-summary.md
architecture-iteration-v1-ar10-summary.md
architecture-iteration-v1-ar11-summary.md
architecture-iteration-v1-ar12-summary.md
architecture-iteration-v1-ar12b-frontend-inventory.md
architecture-iteration-v1-ar12c-summary.md
architecture-iteration-v1-plan.md
architecture-iteration-v1.md
cli-family-identity-contract.md
codex-backend-delivery-plugin-design.md
codex-product-design-plugin-design.md
create-yss-spec-repository-mode-contract.md
dedicated-harness-cli-design.md
governance-core-layering-design.md
harness-hardening-v1-plan.md
harness-hardening-v1.md
skill-first-task-cases.md
spec-backend-direct-consumption-design.md
spec-delta-rebaseline-design.md
```

### A2：11 个空索引、旧协议和模板

```text
.template-source/derived/harness-work-unit-map.md
profiles/backend/.template-source/derived/harness-work-unit-map.md
profiles/backend/.template-source/process/MATT-POCOCK-ENGINEERING-SKILLS.md
.template-spec/plan/entry-review.md
.template-spec/process/existing-ui-baseline.md
.template-spec/process/existing-backend-architecture.md
.template-spec/templates/subagent-task-package-template.md
profiles/backend/.template-spec/templates/subagent-task-package-template.md
.template-spec/templates/business-ticket-set-template.yaml
.template-spec/templates/business-ticket-review-template.yaml
.template-spec/templates/spec-lite-template.md
```

## 计划自审

编写时已按 writing-plans 自审范围覆盖、步骤可执行性、路径/字段一致性、五类 Review Focus 及篇幅比例。六项任务分别承接有效旧引用、CLI 与覆盖层问题、固定删除清单和四技能职责迁移；安全方法与事实证据均有保留位置。执行使用文档和元数据的实际检查替代不适用的代码测试模板，未新增长期验证框架。

## 实际执行记录（2026-11-01）

- 附录 A 的 44 项全部移除，无保留例外；连同退役技能、投影和其他旧模板，本轮实际删除 99 个文件/链接、修改 75 个文件、新增 8 个 Markdown 文件。此前未提交的设计及资产保留，Git 暂存区未改变。
- 根 / Backend 技能为 58 / 57，公开清单为 25 / 21；两 Profile、两模式默认技能数组保持原样。五项存续技能的共享源、有效 Backend 树、WorkBuddy 副本、Claude 链接与 Backend 哈希核对通过；来源元数据未漂移。
- 206 个工程 JSON/evidence 文件保持原始字节；连同此前计划和设计资产，214 个保护文件摘要一致。44 项旧文件仍可从执行前 HEAD 追溯。
- 本机 CLI 3.0.2 的 13 条只读版本/帮助查询成功，没有执行安装或同步。Go Bundle 使用 CLI 源码提交 `8c5e1a90ff83ac83a0640a64b8c8109c3fc5a5e6`；相关生产器与计划核对的 `20b9be9bb553722738885ff9667b0d70ddee2d9c` 无差异，未修改 CLI 源码或资产。
- Bundle 生产器不递归文档链接。独立审查发现 DDD 的平台 Markdown 新链接在单技能安装缺 JSON；先观察四组合缺失断言失败，再在两份分发清单的两种模式补充 JSON，重新构建后四组合全部通过。没有因此扩装全部历史日志。
- 最终临时 Bundle：schema 6，来源 `working-tree`，压缩 2,949,612 字节，SHA-256 `0db038c5cfcf0b0c4730aac37a2c53dbd175ec9b9f485bd3a4942fe3172bc5ad`。四种安装组合、Backend 指南链接、DDD JSON 选择和退役资源缺席均已核对；`git diff --check` 通过。
- 执行调整：按仓库约束用临时快照、一次性断言与文本场景代替持久脚本/测试套件；macOS `/var` 符号链接触发 CLI 路径保护后，使用同一临时目录的真实 `/private/var` 路径，不放宽保护。两项调整均未修改业务行为或授权边界。
- 独立审查的未判断项：真实 Agent 执行轨迹、存量实例升级、公开包发布后的行为。本轮仅完成静态核对、S1—S6 文本推演及实际 Bundle 生成，不把这些未执行事项称为通过。既有 repository→架构说明→平台说明文本参考未新增强制读取条件，不扩展为本轮整仓依赖重写。
