# Backend 完整研发能力整合与预装 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Backend 两种安装均具备 41 项完整研发能力，正确处理必需依赖、测试与构建部署手册，保持 Spec 的 16 项交付能力与边界。

**Architecture:** 复用 Go Bundle 的现有清单、按文件覆盖和依赖递归机制，不新增 CLI 接口。共享方法继续由根技能源持有，Backend 专有职责与调用政策放在覆盖层；删去 4 个重复角色，新增 1 个测试技能。安装齐备、方法调用与外部动作授权分别处理。

**Tech Stack:** Markdown、JSON、YAML、现有 Go Bundle/CLI、Git；验证使用仓外临时 Python/Node/JDK 材料，实际工程优先自身 `./mvnw`，不引入仓内测试套件或包装脚本。

**Spec:** [已批准的设计](2026-11-01-backend-skills-delivery-design.md)，执行前同时读取。用户于 2026-11-01 批准设计、计划及执行；下列源码任务与仓外验证已完成，未执行项见文末。

## Global Constraints

- Backend `project` / `skills` 的默认集合与递归安装结果均为 **41 项**，可用库 **53 项 = 41 默认 + 12 可选**。
- Spec 两种模式保持 **16 项**；产品原型、shadcn 资产与现有显式调用政策不改变。
- 技术设计统一覆盖架构、方案和详细设计，DDD 战术设计仅用于实际 DDD 工程；MVC 不生成 Domain/Gateway。
- 部署只交付构建部署手册，不执行部署、不建设 CI/CD 或云资源、不引入真实凭据。
- 沿用已有业务事实、工具和版本；不增加阶段资格、固定批准包、统一测试门禁、持久检查脚本或测试套件。
- 只修改本次授权内容；保留文件保护、所有权、事务、并发、输入校验、权限与错误处理。
- 不新增旧角色别名或专门迁移流程，不操作用户现有实例；不改现有正式标签、CLI 版本、Bundle Schema 或安装选项。
- 提交、推送、PR/MR、部署、发布和委派遵循真实授权。新方法可按任务选用不等于上述动作获准。
- 验证与中间材料放仓外；构建必须先运行 Go Bundle 生成器，再 `CGO_ENABLED=0 go build -trimpath`。未执行的验证不声称通过。
- 沿用已选的 `executing-plans` 执行方式，由当前 Agent 顺序实施；不为每项任务新建代理或平行改同一清单。完成后按执行技能进行必要的整体验收与审查。

## Review Focus

1. **只读技术分析或 MVC 小改动**：不能自动转完整研发、添加 DDD 层或对外建票；任务 1 的 R1 场景覆盖。
2. **包内依赖被全装掩盖**：commit、Web、validation、MVC 和源码定位在独立补装时必须齐全；任务 5、6 的 R2 验证覆盖。
3. **测试命令成功但没运行目标测试**：编译、单元、集成、启动与部署结果必须分开，不能凭零退出码概括；任务 2 的 R3 场景覆盖。
4. **部署环境未知、真实密钥或不可逆数据变更**：手册标明缺口与限制，不猜基础设施、不输出秘密、不承诺自动回滚；任务 3 的 R4 场景覆盖。
5. **共享内容与 Backend 覆盖漂移**：合成后的源、副本、元数据、哈希与必读资源一致，Spec 不被 Backend 调用策略覆盖；任务 4—6 的 R5 验证覆盖。

---

## 工作目录、常量与共同同步规则

路径缩写只用于本计划：`T` = `/Users/zhudaoming/.codex/worktrees/spec-skills-integration/yss-spec-project-template`；`C` = `/Users/zhudaoming/.codex/worktrees/spec-skills-cli/yss-cli`；`S` = `T/.agents/skills`；`B` = `T/profiles/backend`。模板分支现为 `codex/backend-skills-design`。使用现有隔离工作树；执行前核对工作区，保留其他修改。CLI 若仍在已合并的旧任务分支，确认干净且内容与目标主线一致后，从真实 `origin/main` 建 `codex/backend-skills-bundle`，不重置他人工作。

执行时创建一个仓外临时目录 `V`，记录实际路径；下文 `$BACKEND_VERIFY_DIR` 指向它，不能覆盖 HOME 等系统变量。临时目录中保留执行前的相关文件字节/模式摘要、两份安装清单、Spec 默认名单和原型资产摘要，供差异比较。不要把旧临时路径或历史验证结果当新一轮的输入事实。

验证中的独立期望常量固定如下；禁止从待测清单自身反推期望集合：

```python
BACKEND_DEFAULTS = set('''
setup-yss-harness implement to-tickets code-review diagnosing-bugs
yss-backend-testing tdd java-backend-commit git-commit-core i-have-adhd
handoff using-git-worktrees resolving-merge-conflicts
yss-technical-design yss-tactical-design codebase-design domain-modeling
yss-research grilling prototype alibaba-java-code-style lombok mapstruct
yss-domain yss-application yss-repository yss-mybatis yss-web-controller
yss-dto yss-openapi-governance yss-validation yss-exception
yss-ddd-scaffold-generator yss-layered-mvc-scaffold-generator
yss-cache yss-userinfo yss-audit-log yss-distributed-id yss-excel-mvc
yss-resilience4j yss-skill-source-index-refresh
'''.split())
REMOVED_ROLES = {'harness-orchestrator', 'backend-agent', 'architecture-agent', 'test-agent'}
BACKEND_OPTIONAL = set('''to-spec yss-stage-decision triage wayfinder llm-wiki
yss-backend-spec-review yss-up-springboot3 yss-security-algorithm
setup-matt-pocock-skills maintaining-skills writing-for-agents publish-skills-sh'''.split())
assert len(BACKEND_DEFAULTS) == 41 and len(BACKEND_OPTIONAL) == 12
assert not BACKEND_DEFAULTS & BACKEND_OPTIONAL
```

每项任务完成自己修改的源与副本同步，任务 5 统一发布清单与重新检查有效树：

- 共享源 `S/<id>/<file>` 同步到 `T/.workbuddy/skills/<id>/<file>`；根 Claude 保持原有指向共享源的链接，不改成普通副本。
- Backend 有效内容按相对文件合成：先共享源，再以 `B/.agents/skills/<id>/<file>` 覆盖同名文件；同步到 `B/.workbuddy/skills/<id>/`，保留本 profile 的实际排除规则和文件属性。
- Backend 现有 targets 为 `.agents/skills`、`.workbuddy/skills`，不新增 Backend Claude 目录。不能只复制 Backend 稀疏覆盖而丢掉共享的 references。
- `B/skills-lock.json` 中已有 `effectiveHash` 按 [维护约定](../agents/skills-maintenance.md) 计算整个有效树：相对路径用 Node `localeCompare` 排序，每项依次输入路径、NUL、内容、NUL；无 NUL 的 UTF-8 文本将 CRLF 归一为 LF；忽略 `.DS_Store`、`__pycache__`、`.iml/.pyc/.pyo`。不能只哈希 SKILL.md。
- 保留原始 `sourceRevision`、`upstreamHash` 和来源身份；根锁无 `effectiveHash` 时不添加。新技能采用现有 project/local 记录结构，`skillPath` 为实例中的 `.agents/skills/yss-backend-testing/SKILL.md`，哈希来自新有效树。

## 文件职责与任务顺序

| 任务 | 主要源文件 | 独立产物 |
|---|---|---|
| 1 | Backend implement/to-tickets 覆盖、technical/tactical 设计入口与参考 | 完整研发职责与按任务选用规则 |
| 2 | Backend yss-backend-testing、共享 tdd 描述 | 一般测试能力与明确的 TDD 边界 |
| 3 | Backend implement 构建部署参考、手册模板 | 有来源的构建部署说明方法 |
| 4 | 组件来源索引、来源定位与命中的旧流程正文 | 可用的来源方法，保留技术事实与安全要求 |
| 5 | Backend bundle/registry/lock、四角色目录、入口文档与平台副本 | 完整 41 项安装与依赖资源图 |
| 6 | CLI 说明、仓外 Bundle/安装与行为验证材料 | 实装验证及可审阅交付 |

顺序为 1 → 2 → 3 → 4 → 5 → 6。前四项不依赖新安装名单；任务 5 消费其最终文件，任务 6 只在任务 5 后构建。每项提交前检查只包含自己完成的源、镜像和必要元数据；允许相邻小任务合并原子提交，不能提交未解决的冲突或无效 JSON。

### Task 1：统一 Backend 实现、拆分与设计职责

**Files:**
- Create: `B/.agents/skills/implement/{SKILL.md,agents/openai.yaml}`、`B/.agents/skills/to-tickets/{SKILL.md,agents/openai.yaml}`，以当前共享版本为起点覆盖必要差异。
- Create: `B/.agents/skills/yss-technical-design/references/design-method.md`。
- Modify: `B/.agents/skills/{yss-technical-design,yss-tactical-design}/{SKILL.md,agents/openai.yaml}`；同步各自 Backend WorkBuddy 副本。
- Read: `S/implement/references/repository-scope.md`、`S/to-tickets/SKILL.md`、4 个旧角色入口及 `harness-orchestrator/references/daily-delivery.md`；暂不删除角色。

**Interfaces:** 消费真实 Spec/需求、工程边界和已有授权；产出 `implement`、`to-tickets`、`yss-technical-design`、`yss-tactical-design` 四个 Backend `both` 入口，及统一的 `design-method.md`。任务 5 将相同政策写入 registry。

- [x] **Step 1：建立 R1 基线。** 核对四个当前入口的 `disable-model-invocation: true` / `allow_implicit_invocation: false`；保留共享 implement/to-tickets 原字节。用“只读评估 MVC 分页改动”和“依据完整 Spec 实现 DDD 订单取消”各写一条具体期望：前者不实现、不补 Domain、不建票；后者复用规则，按需要设计、实现、测试与交付说明，不执行固定全技能链。当前缺少完整研发职责及 Backend 自动选择政策应被指出。
- [x] **Step 2：实现 Backend implement/to-tickets 覆盖。** frontmatter 去除 `disable-model-invocation: true`，Codex `policy.allow_implicit_invocation: true`；发现描述限定已授权研发/拆分任务。保留共享源码中的 tracker 身份与真实 ID、分页、超时回读、子模块、并发、委派和仓库范围保护。implement 按需引用设计、测试和交付方法；to-tickets 保留业务来源与 AC，细化窄垂直 Slice，不按 Controller/Service/Repository 分票，不自动远程写入。Spec 的两个共享入口不改。
- [x] **Step 3：实现设计方法。** `design-method.md` 分架构、技术方案、详细设计三种深度，覆盖设计第 6 节的确切内容、输入依据和复杂度选择；不要求三份文档。technical 入口按需指向该参考，tactical 保留 DDD 聚合/不变量/一致性边界与 MVC 排除。两者 frontmatter/Codex 政策改为 `both` 对应设置，明确设计请求不自动授予实现权限。
- [x] **Step 4：验证四种边界。** 除 R1 两例外核对“只设计 DDD 重试与幂等”和“仅修复一处空值判断”：分别只交付设计、只完成局部修改所需工作。JSON/YAML 解析后断言四个有效入口允许隐式选择；共享 implement/to-tickets 仍禁止隐式调用且字节未变。文本评估记录为文本评估，不能称真实宿主触发通过。
- [x] **Step 5：同步并提交。** 依共同规则同步 Backend 有效目录与对应已有哈希，运行 `git diff --check`，按本任务精确路径提交，消息建议 `feat: unify Backend implementation and technical design`。

### Task 2：新增一般后端测试能力

**Files:**
- Create: `B/.agents/skills/yss-backend-testing/SKILL.md`、`agents/openai.yaml`、`references/test-design.md`、`references/test-execution.md` 及对应 Backend WorkBuddy 文件。
- Modify: `S/tdd/SKILL.md` 的发现描述与必要触发说明，及对应共享/Backend 副本；仅在存在冲突描述时修改 `S/tdd/agents/openai.yaml`。

**Interfaces:** 消费 Spec 验收、实际代码、工程现有测试入口；产出一般测试方法和 `yss-backend-testing` 的 `both` 元数据。仅在明确要求测试优先时选择 `tdd`；新技能不进入共享 Spec 库。

- [x] **Step 1：建立 R3 基线。** 当前新入口不存在；tdd description 仍把普通 integration tests 列为触发。核对“补充已有接口回归测试”不等于“要求 TDD”，以及 `mvn test`/`package` 零退出码不证明 Failsafe 集成测试已执行。
- [x] **Step 2：编写新入口与参考。** `test-design.md` 覆盖正常、边界、拒绝、异常、恢复、接口与事务测试选择，独立期望与 mock 边界；`test-execution.md` 读取 POM/插件/Profile、优先 `./mvnw`、确认目标测试实际执行、解释失败/跳过及环境限制。保留生产数据和外部服务授权边界，不分发可执行测试套件或报告框架。入口 frontmatter 不禁用隐式调用，Codex 设置 `allow_implicit_invocation: true`。
- [x] **Step 3：校准 TDD。** description 和正文都限定明确测试优先/red-green-refactor 请求；一般测试回到 Backend 测试方法。共享技能里不增加对 Backend 专有技能的无条件路径引用，避免 Spec 的按需 tdd 安装产生缺失入口。
- [x] **Step 4：验证正常与失败回归方法。** 在 V 内准备最小已有缺陷 Java 样例：库存为 5，预留 2 成功后为 3；预留 4 拒绝且仍为 3。独立断言后者状态不可改变，观察故障版本失败与最小修复后通过；现成 Maven 工程优先自身 `./mvnw`，无构建系统的临时样例使用 `javac` 与 `java -ea`。这只证明 Java 行为回归方法，不称 Spring/数据库集成已验证。检查“测试跳过但命令退出 0”“只编译未测试”“缺数据库环境”三类记录不会被写为全部测试通过。
- [x] **Step 5：同步并提交。** 验证新目录只在 Backend，有效参考与元数据可读，TDD 限定不变；同步共享/Backend tdd 与新测试副本，按实际变更提交，消息建议 `feat: add Backend testing guidance`。

### Task 3：把构建部署手册纳入交付

**Files:**
- Create: `B/.agents/skills/implement/references/build-deploy-guide.md`、`B/.template-spec/templates/build-deploy-guide-template.md`。
- Modify: `B/.agents/skills/implement/SKILL.md`，同步对应 Backend WorkBuddy 文件。

**Interfaces:** 消费任务 1 的实现入口与真实构建/运行配置；产出一个明确引用 `.template-spec/templates/build-deploy-guide-template.md` 的手册方法，任务 5 在两种安装模式的 `skillReferences.implement` 加入该路径。

- [x] **Step 1：定义 R4 手册样例。** 使用 V 内样例工程已有 README 与实际构建配置；给定部署平台未知、配置中的凭据占位符、只增加数据而未给出可逆迁移。期望只增量更新已有文档，不猜 Docker/Kubernetes/systemd、不输出秘密、不生成回滚 SQL。
- [x] **Step 2：编写方法与模板。** 覆盖设计第 8 节八项内容：版本前提、构建产物、配置敏感项、部署/启动、数据兼容、健康排障、回滚、已验证/待验证。模板允许缺口或不适用，不为凑字段造事实。方法优先既有 README/运维文档；完整交付更新相应内容，局部改动只更新受影响部分。
- [x] **Step 3：接入 implement。** 只在任务包含完整研发交付或构建部署说明时读取该参考；明确手册不授予执行部署权限，只有实际运行过的构建、测试、启动才能写为已验证。
- [x] **Step 4：检查 R4 输出。** 在 V 内生成或修订手册，逐项回到实际命令、产物、配置与健康入口；未知部署环境保留未知，凭据仅保留变量名/安全注入位置，不承诺数据变更可逆。确认未创建 CI/CD、部署脚本、集群配置或运行外部操作。
- [x] **Step 5：同步并提交。** 读取每个新链接，保留已有人工作业说明，按任务路径提交；消息建议 `feat: document Backend build and deployment delivery`。

### Task 4：修复组件方法中的旧流程冲突

**Files:**
- Modify: `S/yss-mybatis/SKILL.md`、`S/yss-dto/{SKILL.md,references/README.md,references/wire-validation-checklist.md}`。
- Modify: `S/yss-skill-source-index-refresh/references/source-location.md`，以及 `S/{yss-dto,yss-audit-log,yss-excel-mvc}/SKILL.md` 中自动刷新索引的表述；`S/yss-cache/SKILL.md` 的源码定位路径。
- Modify: 以下 10 个技能的 `references/source-index.md`、`references/source-index.boot2-java8.md`、`references/source-index.boot3-java17.md`：`yss-mybatis`、`yss-dto`、`yss-validation`、`yss-exception`、`yss-cache`、`yss-userinfo`、`yss-audit-log`、`yss-distributed-id`、`yss-excel-mvc`、`yss-resilience4j`。
- Inspect/modify only if imposing a prerequisite: `S/yss-application/references/application-layer-guide.md`、`S/yss-web-controller/references/web-adapter-layer-guide.md`、`S/yss-exception/SKILL.md` 的“冻结合同”要求；保留已存在协议不可静默改变的业务约束。
- Sync: 上述实际修改文件的共享/Backend WorkBuddy，根 Claude 原链接，受影响 Backend 哈希。

**Interfaces:** 保留组件 API、版本、路径、旧索引生成时间/提交/树摘要等历史事实；只调整如何调查当前事实与何时可以写入索引。后续依赖清单消费唯一来源定位参考，不复制该方法。

- [x] **Step 1：固定 R5 反例。** 读取含未提交修改的临时组件源码与过时索引：应读取实际差异、说明时点与限制，不要求先清理工作树、刷新索引或提供批准包才能调查。另测源码完全不可读，只能报告未知，不能用旧索引伪造精确 API。保存修改前索引的事实区段，防止“清理流程”改动技术数据。
- [x] **Step 2：清理来源路由与 freshness 前置。** 10 份 router 从真实 POM/依赖和源码区分平台；20 份平台页的开头与 Freshness and Use 改为当前源码优先、索引是定位线索、差异影响结论时解释。保留现有 boot2/boot3 差异与 source metadata，不把文本编辑冒称来源已刷新。
- [x] **Step 3：清理入口冲突。** MyBatis 去掉固定 `daily/governed`、独立 Reviewer 绑定和 clean/tree 相符前置；保留 SQL、分页唯一责任、批量、事务、数据源及方言的实际验证要求。DTO 等处不再要求先 Freeze 才能描述/验证接口，但必须保留现有 wire 协议、敏感字段与内部分页字段保护。
- [x] **Step 4：统一索引写入授权。** `source-location.md` 与 DTO/审计/Excel 入口一致：读取当前源码与指出索引过时可以继续；修改技能源、受管副本或其他仓库需对应请求与授权，不由读取参考自动产生权限。MyBatis/DTO/缓存/审计/Excel 的裸技能路径改为从入口可解析的 `../yss-skill-source-index-refresh/references/source-location.md` 相对链接，不复制该方法。
- [x] **Step 5：复核与同步。** 沿本次默认入口的必读引用检查遗漏；关键词命中用于定位，不按“包含批准/blocked/冻结”机械删除合法约束。断言索引事实区段和组件 source metadata 未被凭空改写；实际观察 R5 两例并标明验证方式。同步字节/模式/哈希，提交建议 `fix: align Backend component guidance with current workflow`。

### Task 5：完成 41 项预装、依赖与角色归并

**Files:**
- Modify: `B/.template-source/distribution/bundle-profile.json`、`B/.template-spec/agents/yss-skill-registry.yaml`、`B/skills-lock.json`、`B/.template-spec/process/harness-profile.yaml`、`B/README.md`。
- Modify: `T/.template-source/distribution/entries/backend-skills-AGENTS.md`、`backend-project-README.md`，`T/.template-spec/user-guide/cli/tutorial-backend.md`，`T/.template-spec/agents/matt-skills-adaptation.md` 及其 Backend 副本中的本次适配说明。
- Delete: `B/.agents/skills/{harness-orchestrator,backend-agent,architecture-agent,test-agent}/` 及同名 Backend WorkBuddy 目录；仅迁入任务 1—3 已吸收的有效方法后删除。
- Modify if needed: `B/.template-spec/agents/skill-migrations.md` 的历史标识；已被分发排除的 `digital-human-roles.md`、`process/process-glossary.md` 只标明历史用途，不重写为现役流程或从排除项恢复。

**Interfaces:** 消费任务 1—4 的有效文件；产出 schemaVersion 6 的两种安装清单，41 项显式/闭包集合、53 项可用库，以及与实际平台一致的技能元数据和来源记录。

- [x] **Step 1：验证当前清单尚未满足目标。** 使用全局独立常量比较 `installations.project.skills` / `installations.skills.skills`；当前 4 项不等于 41 项。读取已有硬依赖并保留；先列出目前补装 commit 缺 core、MVC 缺通用资产的失败事实，不在全装实例上自证依赖齐全。
- [x] **Step 2：设置两个模式相同的 41 项默认集合。** 顺序沿设计分组，去重。新增测试技能的资源记录为空数组（其参考在技能目录内），implement 的 resources 在保留 Matt 来源说明的基础上加入手册模板。依据实际必读引用补齐架构约定与平台说明；不添加整个 `.template-spec` 目录作为笼统依赖。
- [x] **Step 3：落实硬依赖。** 精确采用下表，重复依赖去重；技术设计→战术设计、实现→组件、测试→TDD 继续是条件关系。两种模式完全相同，图无未知 ID、无循环，默认集合递归展开不增加第 42 项。

| ID | 直接 `skillDependencies` |
|---|---|
| `java-backend-commit` | `git-commit-core` |
| `yss-repository` | `alibaba-java-code-style`, `lombok`, `mapstruct`, `yss-mybatis` |
| `yss-openapi-governance` | `yss-dto` |
| `yss-web-controller` | `yss-dto`, `alibaba-java-code-style` |
| `yss-exception` | `yss-dto`, `yss-skill-source-index-refresh` |
| `yss-validation` | `yss-exception`, `yss-skill-source-index-refresh` |
| `yss-userinfo` | `yss-dto`, `yss-skill-source-index-refresh` |
| `yss-audit-log` | `yss-userinfo`, `yss-dto`, `yss-skill-source-index-refresh` |
| `yss-domain`, `yss-application`, `yss-ddd-scaffold-generator` | 各自依赖 `alibaba-java-code-style` |
| `yss-layered-mvc-scaffold-generator` | `yss-ddd-scaffold-generator`, `alibaba-java-code-style` |
| `yss-security-algorithm`（可选） | `yss-exception`, `yss-skill-source-index-refresh` |
| `yss-mybatis`, `yss-dto`, `yss-cache`, `yss-excel-mvc`, `yss-resilience4j` | 各自依赖 `yss-skill-source-index-refresh` |

源码定位必读调用者共 10 项：表中的 exception、validation、userinfo、audit、security，加最后一行 5 项。distributed-id 当前自行读取源码与平台索引，没有跨技能必读路径，不凭名称增加依赖。新增引用若改变此事实，必须同时修改依赖与相应预期。

- [x] **Step 4：重定向职责与删除角色。** registry 的 `architecture.system-data.primary_skill` 改为 `yss-technical-design`，`execution.backend-slice.primary_skill` 改为 `implement`；新增 `testing.backend-behavior` 能力归 `yss-backend-testing`。移除旧角色的 skills/dependencies/recipe/override 引用，文档输出的条件方法移到实际负责人。新测试条目采用 `layer: core`、`maturity: supported`、`impacts: [backend, quality]`；5 个入口 implement/to-tickets/technical/tactical/testing 的 override 为 `both`，触发与排除和任务 1—2 一致。默认发现除内部 `git-commit-core` 外为其余 40 项；core 保持内部显式方法。删除 4 角色源/副本/lock，保留既有 retiredSkills 诊断，不新增别名或升级迁移操作。
- [x] **Step 5：更新说明与所有平台副本。** 入口说明一次安装完成研发能力、按任务选用、测试与手册边界；Matt 适配记录说明 Backend 对 implement/to-tickets 的覆盖，保留上游身份。仓库 URL 中的 `yss-harness-backend-agent` 是来源身份，不是旧角色调用，不能按字符串误删。执行共同同步与完整有效树哈希；新技能只进 Backend 锁，公开共享清单不添加它。
- [x] **Step 6：校验结构与闭包。** JSON/YAML 可解析；两种安装默认集合等于 `BACKEND_DEFAULTS`；可用技能为 `BACKEND_DEFAULTS | BACKEND_OPTIONAL`；所有硬依赖和参考存在。按无环递归对 java-commit、Web、validation、MVC、cache 分别核对闭包，预期见任务 6。前后对照 Spec 16 项名单、共享 implement/to-tickets 调用政策及原型资产摘要不变。运行 `git diff --check` 后提交，消息建议 `feat: preload complete Backend delivery skills`。

### Task 6：实际构建、安装、补装与交付验证

**Files:**
- Modify: `C/docs/skills-discovery.md`；只改 Backend 默认集合、完整研发职责和构建部署手册范围的必要说明。
- Generate ignored: `C/internal/bundle/assets/bundles.json.gz`，不得提交。
- Temporary only: V 内新 CLI、正常安装根、缩减清单验证源/CLI、单项补装根、行为样例与检查记录。

**Interfaces:** 消费任务 5 的最终模板，使用现有 `tools/bundle`、`cmd/yss` 和 `init/skills list/skills ensure`；输出有真实来源信息的本机构建及安装结果，不新增 Go API 或变更正式发行标签。

- [x] **Step 1：生成正常 Bundle 并构建。** 在 C 执行以下命令，生成失败不得继续使用残留归档；记录真实版本和来源状态。

```sh
go run -tags yss_nobundle ./tools/bundle --source-root /Users/zhudaoming/.codex/worktrees/spec-skills-integration/yss-spec-project-template --out internal/bundle/assets
CGO_ENABLED=0 go build -trimpath -o "$BACKEND_VERIFY_DIR/yss" ./cmd/yss
"$BACKEND_VERIFY_DIR/yss" version
```

- [x] **Step 2：验证四种正常安装。** 对 backend/spec × project/skills 各使用不存在的新绝对根，先 `init --root <root> --profile <profile> --installation <mode> --dry-run --json`，断言目标仍不存在；再实际 init 与 `skills list --root <root> --json`。解析 JSON 的 `result.installed`（ID→bool）为实际安装集合，`result.skills` 为可用 ID 数组，预览文件来自 `result.changes[*].path`。Backend 断言 `installed == BACKEND_DEFAULTS`、`set(result['skills']) == BACKEND_DEFAULTS | BACKEND_OPTIONAL`；Spec installed 恰为原 16 项。核对 canonical/WorkBuddy、Spec Claude 原约定、有效覆盖、必读资源和手册模板字节，Backend 无 4 角色，无产品 UI 技能。
- [x] **Step 3：构建 R2 专用缩减验证源。** 正常安装已包含全部依赖，不能用它验证 ensure。V 内创建独立临时源码仓，复制最终受跟踪内容与本次新增内容，不复制用户数据、凭据、子模块内容或 `.git`；仅将 Backend 两个 `skills` 数组缩为 `["setup-yss-harness"]`，其依赖、资源、其余文件与正常源逐字节一致。用临时真实 Git HEAD/工作树状态生成 Bundle 至 V，再临时替换 CLI 的忽略归档构建 `yss-ensure-probe`；该二进制明确标为验证专用，不能发布或当正常 CLI。整个过程不修改模板原清单。
- [x] **Step 4：运行独立补装。** 每个案例各建一个缩减 CLI 的新安装根，只初始安装 setup；先 ensure dry-run，比较整棵目标树与 metadata 无写入，再实际 ensure。扣除 setup 后安装集合必须精确为下表，且资源与最终源一致。第 2 次 ensure 相同技能应无文件修改；不能直接删除受管文件来伪造空安装。

| 请求技能 | 扣除 setup 后的精确集合 |
|---|---|
| `java-backend-commit` | `java-backend-commit`, `git-commit-core` |
| `yss-web-controller` | `yss-web-controller`, `yss-dto`, `alibaba-java-code-style`, `yss-skill-source-index-refresh` |
| `yss-validation` | `yss-validation`, `yss-exception`, `yss-dto`, `yss-skill-source-index-refresh` |
| `yss-layered-mvc-scaffold-generator` | `yss-layered-mvc-scaffold-generator`, `yss-ddd-scaffold-generator`, `alibaba-java-code-style` |
| `yss-cache` | `yss-cache`, `yss-skill-source-index-refresh` |
| `yss-security-algorithm` | `yss-security-algorithm`, `yss-exception`, `yss-dto`, `yss-skill-source-index-refresh` |

- [x] **Step 5：恢复正常构建并检查保护。** 无论缩减验证成功与否，都从真实模板重新生成正常忽略归档；重新构建正常 CLI。将正常安装的一个受管技能在 V 内改成用户内容，预览同步并比较整个树不变；若正常 sync 报冲突，保留现场，不能使用强制覆盖。核对 `.yss.json` 的 Bundle 来源不是缩减验证源；忽略归档不能污染后续正常构建。
- [x] **Step 6：核对实际方法选择与输出。** 使用当前宿主可用的真实技能加载方式，在临时环境分别处理：完整 Spec→研发、只读技术设计、MVC 局部修改、DDD 详细设计、普通测试、明确 TDD、仅手册、明确提交/交接。记录是否真加载了技能及实际动作；只读核对或给 Agent 手工附上正文的试验不证明宿主自动发现。宿主不能重新加载时明确该项未验证，不编造“8 场景通过”。手册场景不执行部署；提交/交接场景只核对授权边界，不能对未授权远端写入。
- [x] **Step 7：更新 CLI 文档并完成自检。** 用本轮真实结果更新 Backend 41 项说明；删除旧“四项默认”表述，保留“实际由运行二进制的 Bundle 决定”。两仓 `git diff --check`、状态与差异范围检查通过后提交实际修改；CLI 只有文档，无 Go 行为变化。整体验收报告实际执行范围、剩余限制及提交状态，按现有真实授权另行处理 PR/合并，不发布 Release 或替换系统 CLI。

## 计划自检与交接

本计划按设计逐项自检：设计 §1—6、§9 对应任务 1/5；§7 对应任务 2；§8 对应任务 3；§10/12 对应任务 4/5；§11/13 对应任务 5/6；§14 的实施者自由度保留。41/53/16 集合、5 个 `both` 入口、10 个源码定位调用者、53 棵有效树哈希，以及 6 个独立补装闭包均已核对；两种 Backend/Spec 安装分别实装 41/41/16/16 项。

执行沿用 `superpowers:executing-plans`。临时 Java 库存样例观察到失败再通过；手册从实际临时构建、配置与产物整理；修改过的受管技能在 sync 中保留。现有 `profiles/_specialist` 文档覆盖按 Go Bundle 的实际合成顺序验证。宿主不能重载临时技能目录，八类方法选择仅做文本/元数据核对，不计为自动发现通过；没有运行真实 Spring/数据库集成、部署、其他操作系统或正式发行。仓内未增加脚本或测试套件。
