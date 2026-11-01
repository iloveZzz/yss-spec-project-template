# Backend 完整研发能力整合与预装设计

日期：2026-11-01
状态：方案 B 与本文已于 2026-11-01 获用户批准，独立实施者视角审阅无关键待决问题；进入实施计划阶段，尚未实施。
适用范围：YSS 模板的 Backend profile、相关技能与分发资源，以及 CLI 的必要说明。

## 1. 用户目标与设计边界

用户要求 Backend 覆盖对 Spec 的拆分、技术设计、架构设计、详细设计、脚手架、开发、测试以及部署等技术实现工作；随后明确部署目前只需构建部署手册。用户已选择 **B：按职责整合后完整预装**。

上游 Spec 负责产品规格、产品原型与说明。Backend 消费这些已确认的业务决定和验收，负责技术实现；发现真正业务缺口时定点澄清，不重新组织整套产品设计。用户直接提供明确需求时仍可开展相应研发工作，不要求补建 Spec 工程身份或阶段记录。

本设计的目标是一次安装具备完整研发能力，按当前任务使用其中适用部分。全流程请求完成对应技术交付；局部修复只处理受影响范围，不每次生成架构文档、测试报告和部署手册。

### 用户已经决定

- Backend 覆盖完整技术实现工作，包括测试。
- 部署的交付范围是构建部署手册。
- 按职责整合技能，再完整预装。
- 产品设计与技术实现分工沿用前述 Spec 决定。

### 本文提出、现已批准的设计选择

- 两种 Backend 安装模式使用相同的 **41 项**默认集合；40 项复用现有技能，新增 1 项 `yss-backend-testing`。
- 删除 Backend 中 4 个职责重复的角色入口，把其有效方法并入实际能力负责人。
- Backend 侧允许在已授权任务内按需选择实现、拆分与技术设计方法；外部动作与显式工具类入口保留各自调用边界。
- 构建部署手册由 `implement` 的专用参考负责，不新增自动部署技能。
- 常用 YSS 组件能力预装；实际使用仍取决于工程及需求，不自动添加组件依赖。
- 保留 12 项专项技能为按需安装，维护工具、平台迁移和历史组件不加入默认集合。

### 非目标与不接受的结果

本次不执行用户服务部署，不创建 CI/CD、镜像仓库、集群、云资源或凭据，不改数据库或发布版本。不引入工作流引擎、阶段资格、固定批准包、统一测试门禁或持久检查脚本。没有实际执行时不能声称测试、启动或部署成功。

不以预装数量替代职责整合；不把 DDD 强加给 MVC；不为架构、技术方案、详细设计分别建立重复技能或三份必交文档。不把预装当成隐式提交、推送、创建 PR/MR、发布、部署或委派授权。

本轮以新安装与按需补装能力为目标，不建设旧入口别名或专门迁移流程，不操作既有用户实例。既有 CLI 的文件保护、所有权、事务、并发和退役诊断能力保持现状。

## 2. 当前事实与问题

分析基于模板 main `7ecea45485f66c2d64355cb137f153e8e9acbcda` 的内容，以及 CLI 已合入 main `a902c4bc17f109b29351edc3359aa89e80e99c31` 的实现。此前构建的临时 CLI 与这些提交的代码/技能内容一致，用于本轮只读安装预览；未操作系统 CLI。

- Backend `project` 与 `skills` 默认都是 `setup-yss-harness`、`implement`、`code-review`、`handoff`，实际 Bundle 有 56 项可选技能。
- 实际依赖来自 `installations.*.skillDependencies`；注册表的关系和技能正文提及不会自动安装。目前清单只给 `yss-repository` 与 `yss-openapi-governance` 配置了依赖。
- `skills ensure --dry-run` 确认：`yss-technical-design`、`yss-web-controller`、`java-backend-commit` 分别只计划安装自身；`yss-repository` 则连同 Java 规范、Lombok、MapStruct、MyBatis 共安装 5 项。
- `java-backend-commit` 要求读取 `git-commit-core/SKILL.md`，但独立补装不包含它；MVC 脚手架正文还依赖 DDD 脚手架的通用资产，需要纳入资源依赖核对。
- 技术设计和战术设计要求显式调用。只修改安装名单，不能解决研发任务内按需使用设计方法的问题。
- `architecture-agent`、`backend-agent`、`harness-orchestrator` 大部分内容分别重复技术设计、实现与任务组织；`test-agent` 只是简短测试指令，缺少完整测试方法。
- `tdd` 只覆盖测试优先方法，不能代表测试设计、已有功能补测、集成验证和回归分析。当前技能库没有独立的服务部署能力；构建部署手册也没有明确负责人。
- `yss-mybatis` 等现役组件正文仍包含 `daily/governed`、固定结果协议、独立 Reviewer 或来源清洁度前置，与当前入口约定冲突。扩大预装时须清理命中路径，不仅改 SKILL.md 的标题。

关键来源：Backend 分发清单、Backend 注册表、相关 SKILL.md，以及 CLI `internal/bundle/producer.go` 的 `skillDependencies` 读取与 `Bundle.SkillFiles` 递归选择实现。

## 3. 方案比较

| 方案 | 做法 | 取舍与结论 |
|---|---|---|
| A：扩充预装 | 保留现有角色和能力入口，增加默认技能，补测试与手册参考 | 修改少，但重复职责与调用冲突继续存在 |
| **B：按职责整合后完整预装** | 明确能力负责人，归并重复角色，补依赖与缺失方法，再一次安装 | 涉及正文、元数据和平台副本；工作入口清楚，符合用户已选择方向 |

本设计不新增安装选项、架构子 profile 或自动探测安装器。沿用已有 `--profile backend --installation project|skills`；不同架构在使用时选择方法。

## 4. 默认集合：41 项

下表每个 ID 恰好出现一次。两种安装模式的显式名单相同，递归依赖展开后也必须是这 41 项，不允许出现名单 41 项、实际安装额外若干项的情况。

| 能力组 | 数量 | 默认技能 |
|---|---:|---|
| 研发任务与协作 | 13 | `setup-yss-harness`、`implement`、`to-tickets`、`code-review`、`diagnosing-bugs`、`yss-backend-testing`、`tdd`、`java-backend-commit`、`git-commit-core`、`i-have-adhd`、`handoff`、`using-git-worktrees`、`resolving-merge-conflicts` |
| 设计与调查 | 7 | `yss-technical-design`、`yss-tactical-design`、`codebase-design`、`domain-modeling`、`yss-research`、`grilling`、`prototype` |
| 分层实现与规范 | 12 | `alibaba-java-code-style`、`lombok`、`mapstruct`、`yss-domain`、`yss-application`、`yss-repository`、`yss-mybatis`、`yss-web-controller`、`yss-dto`、`yss-openapi-governance`、`yss-validation`、`yss-exception` |
| 脚手架 | 2 | `yss-ddd-scaffold-generator`、`yss-layered-mvc-scaffold-generator` |
| 常用 YSS 组件 | 6 | `yss-cache`、`yss-userinfo`、`yss-audit-log`、`yss-distributed-id`、`yss-excel-mvc`、`yss-resilience4j` |
| 组件来源维护 | 1 | `yss-skill-source-index-refresh` |

`git-commit-core` 是随专项提交技能安装的内部方法，不作为第二个面向用户的提交入口。来源维护技能预装是为了让组件引用的源码定位方法可用；更新索引仍需要对应请求和写入授权，不自动修改其他仓库或受管技能。

以下 12 项仍在 Backend 可用库中，但不默认安装：

- `to-spec`、`yss-stage-decision`：独立业务规格整理或业务方案工作，正常研发复用上游结果。
- `triage`、`wayfinder`、`llm-wiki`：工单分诊、复杂决策地图、知识库专项。
- `yss-backend-spec-review`：既有工程整体规范审查；普通改动由 `code-review` 负责。
- `yss-up-springboot3`：平台升级专项。
- `yss-security-algorithm`：既有组件审查与迁移；保留禁止新生产接入的现有边界。
- `setup-matt-pocock-skills`、`maintaining-skills`、`writing-for-agents`、`publish-skills-sh`：配置或技能维护专项。

归并 4 个角色并新增 1 项后，基于当前库存 Backend 可用集合为 **53 项：41 默认 + 12 可选**。这些数字用于验证本次明确集合，不作为未来扩展的固定额度。

## 5. 唯一职责与归并

| 负责人 | 职责与交付 | 与相邻技能的边界 |
|---|---|---|
| `implement` | 承接当前 Spec/任务、读取实际工程、组织适用设计与实现、处理调用方，汇总实际交付；负责构建部署手册内容方法 | 不复制设计、测试或审查正文；不把完整能力集合变成固定流水线 |
| `to-tickets` | 从业务验收细化可观察的研发 Slice、仓库/路径范围、接口依赖和实现顺序 | 保留来源和原 AC，不改变业务规则；技术层不分别生成横向票 |
| `yss-technical-design` | 统一技术方案、架构设计和详细设计；解释选型及取舍 | 系统/模块方案归此处；DDD 聚合内部建模交给战术设计；业务取舍仍来自用户 |
| `yss-tactical-design` | DDD 聚合、实体、值对象、行为、不变量、事件、Gateway 与一致性边界 | MVC 不调用；不重复整个系统架构或产品分析 |
| `codebase-design` | 模块接口、封装、可测试性和重构取舍方法 | 为技术设计与局部重构提供方法，不建立另一套技术方案 |
| 分层实现技能 | 按已选架构实现 Domain、用例、持久化和 Web 边界 | DDD 与 MVC 选择已有对应参考；组件技能持有实际组件 API 与限制 |
| `yss-openapi-governance` | 接口行为、语义、兼容性和 YAML/JSON 维护 | wire 包装由 `yss-dto` 唯一持有，不复制字段协议 |
| `yss-backend-testing` | 测试设计、实现、执行、结果解释及回归范围 | 测试优先时才采用 `tdd`；故障根因分析归 `diagnosing-bugs` |
| `code-review` | 对具体改动报告有证据的问题 | 测试结果是证据之一，测试未运行本身不是自动拒绝理由；不宣称业务批准 |
| `i-have-adhd` | 改善技术文档、手册、测试结果和 PR/MR 的表达 | 不改变技术事实、验收和操作授权 |
| `java-backend-commit` / `handoff` | 明确请求下提交或交接实际材料 | 各自读取现有方法并遵守目标仓授权；普通完成不自动对外发送 |

删除 Backend 的 `harness-orchestrator`、`backend-agent`、`architecture-agent`、`test-agent` 入口及其运行时元数据、平台副本、锁/注册表和现役引用。有效方法分别并入 `implement`、`yss-technical-design`、`yss-backend-testing`；只保留历史材料中的明确历史说明，不提供别名或自动转调用入口。

四者目前是 Backend 专有内容。实施时先核对实际源与覆盖层，不能从共享目录删除名称相似但不属本次范围的能力。新测试技能也放在 Backend 专有源，不加入 Spec 默认或公开共享技能清单。

## 6. 技术设计应覆盖的深度

技术设计使用同一份权威内容，按任务展开；可以是已有设计文档、任务中的简明说明或代码附近的必要注释，不要求三份固定文件。

1. **架构层**：实际工程与外部系统边界、模块职责、依赖方向、DDD/MVC 选择依据、技术约束、运行环境及重要质量要求。已有工程优先沿用，不借普通需求重新选框架或数据库。
2. **技术方案层**：核心路径、数据模型、API 与外部集成、事务和一致性、权限与校验、错误处理、兼容性、幂等及并发策略。选型以真实代码、依赖和可读资料为依据。
3. **详细设计层**：复杂行为落到对象职责、关键接口/签名、状态转换、数据映射、查询或索引影响、失败恢复与验证要点。简单修改不制造空类图或机械逐行说明。

设计应说明哪些是已确认业务约束、哪些是工程事实、哪些是本次技术决定；不能用技术实现静默改写 Spec。性能或容量没有测量依据时说明假设，不制造精确承诺。

技术试验由 Backend `prototype` 完成，验证限定的状态、算法或接口假设。它不制作产品 UI；试验产物不会自动迁入生产。

## 7. 测试能力

新增 `profiles/backend/.agents/skills/yss-backend-testing/`，入口简短，具体方法按需读参考。按用户任务与实际风险覆盖：

- 从 Spec 的可观察验收和实际代码找正常、边界、拒绝、异常、恢复场景；列清本次覆盖与未覆盖，不另建统一追踪台账。
- 单元测试关注规则、状态与公开行为，避免复制实现生成期望值。
- 集成测试核对真实涉及的装配、MapStruct、持久化、事务及外部边界；选择工程已有工具，mock 真实外部系统，不 mock 被验证的核心逻辑。
- 接口测试关注请求校验、认证授权、序列化、分页、错误响应和兼容性；不拿 DTO 字段或单纯编译当 HTTP 行为证据。
- 缺陷回归验证原复现路径与受影响调用方；性能、并发或真实数据库方言有明确要求时采用对应环境验证。
- 优先工程现有 `./mvnw` 和配置，不硬编码 Maven test/package 等价于集成测试都执行，也不自动引入测试框架或依赖。
- 区分“编写了测试”“执行了哪些测试”“测试通过”“服务启动成功”；记录真实命令、范围和失败。环境缺失时指出影响，继续独立可做工作。

TDD 只在用户要求测试优先时采用；普通测试工作不要求重新走红绿重构。同步校准 `tdd` 的发现描述与正文，去掉把普通集成测试请求直接等同于测试优先的触发说明；一般测试归 `yss-backend-testing`。已有明确缺陷先修根因，必要复现和回归按风险选择。测试不会自动操作生产数据或外部付费服务。

本模板仓只分发技能说明与必要参考，不增加可执行测试套件、包装脚本或测试报告模板体系。实际业务仓内编写测试属于对应研发任务范围。

## 8. 构建部署手册

方法放在 Backend `implement/references/build-deploy-guide.md`；通用内容结构放在 Backend `.template-spec/templates/build-deploy-guide-template.md`，通过两种安装模式的 `skillReferences.implement` 分发。已有 README 或运维手册优先增量维护，不强制新路径或重复文件。

完整技术交付在适用位置说明：

| 内容 | 要求 |
|---|---|
| 适用版本与前提 | 实际源码版本/工作树状态、Java/Maven 与必要外部服务；不把本机绝对路径写成全员前提 |
| 构建与产物 | 实际命令、模块、Profile、产物名称/位置；区分执行过与待执行 |
| 配置与敏感项 | 环境变量、配置项、用途及安全注入位置；示例不含真实密钥、生产地址或用户数据 |
| 部署/启动步骤 | 依据既有运行方式描述安装、启动、停止与配置步骤；未知环境明确列缺口，不自行选 Kubernetes、Docker 或 systemd |
| 数据与兼容性 | 变更涉及时说明迁移顺序、备份需求和不可逆限制；不伪造回滚 SQL |
| 健康检查与排障 | 实际健康入口、日志位置、代表性检查与常见失败定位；没有现成探针不编造 URL |
| 回滚说明 | 旧产物/配置恢复条件与步骤，说明数据兼容性限制；不承诺任何变更都能一键回滚 |
| 已验证与待验证 | 编译、测试、启动与部署分别说明；没有部署操作时写明未实际部署 |

本次能力只编写手册。执行构建或本地测试依据实际研发任务；手册中的部署命令不构成执行许可。未来用户要求真实部署属于新的明确范围，不能从本设计推导授权。

## 9. 调用政策与共享边界

以下是 Backend 的拟议政策变化，需要 frontmatter、`agents/openai.yaml`、注册表及所有平台副本一致：

| 技能 | Backend 政策 |
|---|---|
| `implement` | `both`；在明确开发、修复、实现或完整研发交付请求下可选用，只读分析不自动转实现 |
| `to-tickets` | `both`；请求拆分或完整交付确需拆分时可使用，普通小改动不强制建票；远程保存仍用真实授权 |
| `yss-technical-design`、`yss-tactical-design` | `both`；任务包含设计或实现确需设计判断时选用，DDD 方法只对实际 DDD 任务适用 |
| `yss-backend-testing` | `both`；明确测试工作或研发任务所需验证时选用，执行范围服从工程规则 |
| `tdd` | 保留明确要求测试优先才使用的正文条件，不因预装改为全局测试流程 |
| `java-backend-commit`、`git-commit-core`、`handoff`、`yss-skill-source-index-refresh` | 保留显式政策；读取方法不等于执行外部动作或索引写入 |
| 其他技能 | 保留现有触发与安全边界，按当前任务需要加载 |

共享 `implement`、`to-tickets` 的 Spec 侧调用政策保持不变。Backend 使用专有覆盖保存差异，并继承共享有效的仓库保护与 tracker 方法，不能复制旧版正文丢失后续能力。所有覆盖按文件合成，不只比较目录数量。

“安装”“读取方法”“执行任务”“向外写入”分别处理。技术任务中合理的本地步骤沿用当前授权；提交、推送、PR/MR、部署、发布和委派不能由技能互相授予权限。不新增统一开工审批，也不自动执行所有预装技能。

## 10. 依赖与参考资源

两种 Backend 安装模式保持相同的必需依赖。已有两条边保留，补齐实际方法不可缺少的引用。注册表用于描述关系，CLI 清单用于安装，不能继续互相矛盾。

| 技能 | 本设计要求的直接安装依赖 |
|---|---|
| `java-backend-commit` | `git-commit-core` |
| `yss-repository` | `alibaba-java-code-style`、`lombok`、`mapstruct`、`yss-mybatis`（已有） |
| `yss-openapi-governance` | `yss-dto`（已有） |
| `yss-web-controller` | `yss-dto`、`alibaba-java-code-style` |
| `yss-exception` | `yss-dto` |
| `yss-validation` | `yss-exception` |
| `yss-userinfo` | `yss-dto` |
| `yss-audit-log` | `yss-userinfo`、`yss-dto` |
| `yss-domain`、`yss-application`、`yss-ddd-scaffold-generator` | `alibaba-java-code-style` |
| `yss-layered-mvc-scaffold-generator` | `yss-ddd-scaffold-generator`、`alibaba-java-code-style`；前者提供其实际引用的通用工程资产，不授予生成 DDD 的权限 |
| `yss-security-algorithm`（可选） | `yss-exception`；保留其禁止新生产接入的限制 |

Backend 组件中要求读取 `yss-skill-source-index-refresh/references/source-location.md` 的技能，也须声明该技能为必需依赖，或改为完整随本技能分发的同一权威资源；本设计选择前者，保持唯一来源，不复制方法。实施计划须由当前引用逐项列出这类调用者，默认计数仍为 41。

技术设计到战术设计、实现到组件、测试到 TDD 是场景关系，不把全部 41 项绑定成 `implement` 的硬依赖。独立补装一个技能应只带真实必需项，不扫描正文把所有提及都自动安装。

`skillReferences` 补齐实际读取的架构约定、平台说明、手册模板和来源说明。技能目录内相对链接必须可达；跨技能必需入口必须实际安装；可选方法明确使用条件。修复当前 MVC 资产引用与提交公共方法等缺口。

## 11. 文件与分发影响

| 位置 | 改动 |
|---|---|
| Backend `.agents/skills/implement`、`to-tickets` | 必要专有覆盖，保留共享方法和来源；实现职责、调用政策与构建部署参考 |
| Backend `.agents/skills/yss-technical-design`、`yss-tactical-design` | 设计深度、方法分工、调用政策，清理直接消费的冲突参考 |
| Backend `.agents/skills/yss-backend-testing` | 新增入口、运行时元数据与按需参考 |
| 四个重复角色目录 | 迁出有效方法后删除专有源及分发入口 |
| 默认集合内相关共享技能与 references | 修复真实依赖、角色引用、来源事实与旧流程冲突；不全仓机械替换历史词语 |
| Backend `.template-source/distribution/bundle-profile.json` | 两份 41 项名单、依赖、资源，以及移除重复角色的相关条目 |
| Backend registry、`harness-profile.yaml`、入口 README/AGENTS、当前使用说明 | 默认发现、职责与调用约定一致，删除现役角色路由 |
| Backend `skills-lock.json`、`.workbuddy/skills` | 新增/删除记录，按有效树计算已有哈希，同步真实文件和属性 |
| 共享源对应的根 WorkBuddy/Claude | 仅同步本次实际修改的共享内容；Backend 不新增不存在的 Claude 分发约定 |
| CLI `docs/skills-discovery.md` 等直接相关说明 | 将 Backend 默认 4 项更新为经实装验证的完整集合与手册范围；无需改安装接口 |

Spec 默认集合保持 16 项，产品原型资产与 shadcn 方案保持不变。Backend 专有新技能与调用政策不泄漏到 Spec。共享参考确需修复时只同步该内容，不改变 Spec 的已确认职责或安装数量。公开共享清单不加入 Backend 专有技能；本次不发布公开技能仓。

Bundle 仍由现有 Go 生成器读取真实模板工作树，先生成再 `CGO_ENABLED=0 go build -trimpath`。记录真实 HEAD、工作树状态与摘要，不改写现有正式标签，不提交生成归档。不需要新的 CLI 命令、Schema 或安装分组机制。

## 12. 清理现役冲突的边界

从 41 项入口与必读引用向下检查实际消费路径，删除或改写旧阶段准入、固定 `daily/governed` 结果协议、无条件独立审查、强制冻结/批准包，以及仅为取证要求干净 checkout 的表述。普通工程保护、业务输入、权限、SQL、事务、兼容性和凭据处理要求继续保留。

实际来源决定精确 API 结论：索引过时或源码不可读时说明未知，不能虚构签名；读不到资料也不等于禁止所有独立工作。组件事实调查不自动授权修改技能源或用户受管安装；源码定位参考中关于修订索引的表述须与显式维护政策一致。不恢复旧刷新脚本、合同编译器或已退役命令。历史目录只作历史，不为消灭关键词而全量改写。

## 13. 必要验证与可观察结果

实施计划只选择与本次变更有关的检查，使用并清理或保留仓外临时验证材料，不把本节变成新增的仓内测试系统。

1. **分发**：两个 Backend 模式无写入 dry-run 后实际初始化；安装入口恰为 41 项、来源与副本一致、资源可达，4 个角色不再可用。Spec 两种模式仍为 16 项，产品原型资产内容保持不变。
2. **独立补装**：在合法临时安装根验证 commit/core、Web/DTO、validation/exception/DTO、MVC/通用资产和来源定位的传递依赖；不能用全装后的文件存在掩盖补装缺口。必要时使用仓外缩减清单构建验证 Bundle，不增加对外安装模式。
3. **职责与调用**：分别观察完整 Spec→研发任务、仅技术设计、MVC 局部修改、DDD 详细设计、仅测试、测试优先、仅手册、明确提交/交接等输入。确认是否选用了适用方法，未借方法阅读扩大写权限；无真实宿主运行时只报告文本核对。
4. **测试能力**：使用临时已有小型工程或可用工程，在授权范围验证至少正常与失败/回归场景；记录实际运行。模板本身不新增长期测试套件，无法取得真实工程时标记尚未运行，不把技能文案视为测试执行成功。
5. **手册**：从实际可读工程生成或更新临时手册，检查命令、产物、配置和健康检查都有来源；未知部署环境、密钥、不可逆迁移与未运行步骤不会被伪造。整个验证不执行部署。
6. **源与保护**：JSON/YAML 解析、入口/资源闭包、frontmatter/宿主元数据一致性、镜像字节与文件属性、有效树哈希、Git diff 范围与空白检查。验证 Bundle 构建和本机运行，其他平台不冒称已运行。

合并或发布不是上述验证的自动后续。交付说明区分源码修改、CLI 构建、临时安装、实际宿主行为、测试与远程操作的真实完成状态。

## 14. 留给实施者的决定

实施者可以选择最少必要的参考文件拆分、示例组织、临时验证方式和实施任务顺序；沿用现有工具与目录。可以用已有 README 表达手册，或按项目约定保存独立文档。

不能自行改变 41 项默认集合、恢复重复角色、扩大为真实部署、改 Spec 职责、把 MVC 改为 DDD，或让提交/发布变成隐式动作。发现这些选择不能满足实际资源闭包或已有工程约束时，先说明具体矛盾并修订设计，不暗中换方案。

本文获批后进入实施计划阶段；当前仅交付设计，不修改技能、依赖清单或 CLI 行为。
