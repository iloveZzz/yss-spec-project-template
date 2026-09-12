# 已完成真实切片与接收机制查证

截至 2026-09-11；本轮仅源码与登记查证，未运行交付场景、构建、部署或服务。仓库身份 `template-source`。

## 可用候选

**在本仓已登记/关联范围未找到可证实已完成的 Java API＋Vue 页面配对切片。** `.gitmodules:1-21` 登记的都是模板/CLI 家族；根及 `submodules/yss-harness-backend-agent/yss-project.yaml:1-2`、`submodules/yss-harness-frontend-agent/yss-project.yaml:1-2` 均为 template-source。`docs/templates/implementation-repo-registry-template.md:23-61` 是带占位符的登记模板，未找到真实产品登记；根 `apps/` 不存在。排除技能、投影与依赖后，对 docs、submodules、.template-source/contracts 的 Java/Vue 文件检索无结果（rg exit 1 表示无匹配）。没有由本仓真实实现登记指向、可继续查证的外部 Java/Vue 配对仓库；因此不扫描个人其他目录。

可复用的是**合成维护 fixture**：`scripts/verify-frontend-delivery-scenarios:58-86` 临时生成 Supplier API、合同、批准和日志，构建 SHA 是重复 a/b，命令是 `synthetic-maintenance-test`；`scripts/fixtures/backend-delivery/revision-server.mjs:1-10` 是 Node 只响应 `/version` 的维护服务。它没有运行 Java 业务 API，也没有 Vue 实现。历史 GREEN 文档 `.template-source/evidence/maintenance/backend-delivery-green-2026-09-02.md:3-8` 是模板验证记录，不是产品切片证据。

## 已有检查与边界

| 边界 | 现有行为（静态查证） | 源码 |
|---|---|---|
| 包内接口与批准 | 检查文件字节摘要、来源角色政策、门禁、artifact id/version/digest；不能只写 approved | `scripts/lib/backend-delivery.mjs:12-25` |
| 切片、接口、验证 | 已批准合同身份与 slice 匹配；OpenAPI 3.1、operationId；同交付 basis 的契约/部署记录、零退出码、时间格式、日志摘要、成功/失败场景覆盖 | 同文件 `28-74` |
| 包传输完整性 | 清单摘要、文件集合/字节/大小、重建临时源并重验；导出过程前后摘要一致 | 同文件 `77-142` |
| 导入 | 同 ID/version 同内容幂等，不同内容拒绝；导入只是 pending-acceptance；战略/后端包分别原子落盘 | 同文件 `146-178`；`docs/process/frontend-backend-delivery.md:25` |
| 前端接收 | 预检/接收摘要、slice、词汇、战略版本/承接、最新已导入后端版本、operationId 和用例说明摘要 | `scripts/lib/frontend-delivery.mjs:75-133` |
| 实际部署 | GET 同 origin，5s 超时，不跟重定向；比较 deployment_id、source_commit、openapi_digest、artifact_digest、test_data_digest | 同文件 `53-72` |
| 放行含义 | 返回 inputs-verified 且 ready_for_agent:false；后续仍需实现合同 | 同文件 `134-135`；`docs/process/frontend-backend-delivery.md:47-51` |

## 已有负例与未证明的内容

源码已有负例：改接口字节、批准摘要不匹配、成功/失败覆盖缺失（场景脚本 `91-99`）；用例摘要漂移、draft 合同（`136-141`）；五项服务身份错配和 HTTP 503（`143-147`）；错误切片、旧接收摘要、缺映射、未知接口、错战略（`149-155`）；已导入新版本使旧接收 stale、额外未登记文件（`157-160`）。正例与幂等断言在 `101-104`、`125-137`。这些是现有**测试定义**，本轮未执行，不能称本轮通过。

1. “旧接口”至少分为包内文件变化、部署身份不符、身份仍正确但业务 wire shape/行为错误。前两者已有检查，第三者需要真实业务契约/联调，版本探针不能替代。
2. “旧批准”若未绑定当前摘要可被拒绝；如果源仓已撤销/更新但完整旧快照尚未同步，离线包无法得知。`docs/process/frontend-backend-delivery.md:59` 明确该限制，不能以包内自洽声称全局最新。
3. “旧版本”由接收仓**已导入**的最新版本判断（frontend-delivery.mjs:109-110），不是联网查询源仓。源版本未知的策略尚待访谈定义。
4. 时间检查只限制可解析和不超过当前时间约60秒（backend-delivery.mjs:35），没有一般最长有效期。证据与基线绑定不等同于日志真实性独立认证；须明确试验是误操作/漂移还是恶意重写整包。
5. 恢复契约允许战略包已导入、后端接收失败后保留并重试；不能设定“拒收必然整个目录零变化”作为现有行为。须核验旧有效接收不会因半成品误放行，以及重复/修复后的可恢复性。

## 供主控下一轮访谈的事实输入

先澄清本轮验证对象是否覆盖“包自洽但实际业务错误”，以及对未知上游新版本的政策。推荐候选必须具备：可定位的已完成需求、前后端各固定 commit、真实 OpenAPI/验收期望、可重复构建、隔离测试数据和可提供五项部署身份的服务；没有候选时只补充候选仓库入口，不用 fixture 冒充真实切片。现有 checks 应先作为基线，不把新增检查数量当成功指标。

可用执行入口（**未运行**）：`scripts/backend-delivery export|verify|import`（参数见 `docs/process/frontend-backend-delivery.md:19-23`）；`scripts/verify-frontend-delivery --root <frontend> --slice <slice-id> <acceptance.json>`（同文 `41-45`）；`scripts/verify-frontend-delivery-scenarios`（仅合成维护测试）。

## 查证验证

- CodeGraph 首次定位：`codegraph explore "backend-delivery exportBackendDelivery importBackendDelivery verifyBackendDelivery implementation repositories completed slices"`，exit 0。
- 读取登记、身份、当前源码和测试定义；未更新索引。
- `rg --files` 在排除技能/投影/依赖后的已登记范围查 Java/Vue，exit 1（无匹配）；早期含 `apps` 检索 exit 2（目录不存在），已去掉不存在目录重试；一次 zsh 未展开 docs/engineering* 搜索失败，已改显式存在路径复查。未由这些错误推断服务行为。
- `node -e "JSON.parse(require('fs').readFileSync('.template-source/evidence/maintenance/2026-09-11-oss-landscape/handoff-interview/discovery.json','utf8'))"`：创建后实际运行，结果另见工具记录。

本轮探索产物完成；产品试验未执行，真实候选未选定。workflow 结果保留 needs-human，不伪造 entry-triage 的产品 Plan 后继路由。


## 补充：已保存项目候选库存（2026-09-11）

主控从 Codex 已保存项目列表新增三个明确候选路径，授权只读库存查证。三仓根均实测缺少 `yss-project.yaml`；不推定仓库模式、不迁移、不接入生命周期。以下“历史通过”只引用既有记录，未复跑，也不代表当前 HEAD。

| 候选 | 找到的事实 | 是否满足已完成真实 Java＋Vue 切片 |
|---|---|---|
| `/Users/zhudaoming/yss-valuation-outsourced` | Java 聚合工程；`docs/.scratch/upload-reliability/architecture/repository-registration.json:45-83` 明确配对独立 Git 前端 `valuation-outsourced-frontend`，其 `README.md:3-14` 为 Vue3；有实际文件同步预览页面与 Java Controller | **最接近，但完成基线尚未证实**。上传可靠性父 Ticket 仍写 needs-info（`parent-ticket.md:3-26`），不可当已完成整改；现有文件同步预览可列候选，仍缺窄范围前后端固定提交与匹配验收 |
| `/Users/zhudaoming/yss-datamiddle-datamodeling` | Java MVP 历史报告记录固定提交、冻结 OpenAPI、78 tests；后续还有持久化/发布审查记录 | 不满足配对条件：`docs/requirements/issues/2026-07-03-production-human-review-closure-implementation-routing.md:50-51` 明确 frontend 未登记、not-applicable；排除技能和依赖后未发现 Vue 工程 |
| `/Users/zhudaoming/Documents/yss-project/yss-datamiddle-sysmanager` | Java Maven 多模块系统管理服务（README.md:1-7）；docs 只有协作入口和基线 ADR | 未找到前端登记、Vue 实现或配对切片验收证据 |

### 委外中可继续确认的具体切片：文件同步目标表数据预览

- API：`/Users/zhudaoming/yss-valuation-outsourced/valset-standardizer-tools/file-sync/src/main/java/com/yss/datamiddle/valuation/filesync/web/FileSyncTargetPreviewController.java:30-31`，`GET /file-sync/tasks/{taskCode}/target-data-preview`，方法 `fileSyncPreviewTargetData`。
- Java 测试：同模块 `src/test/java/com/yss/datamiddle/valuation/filesync/web/FileSyncTargetPreviewControllerTest.java:38-50` 定义默认请求和 `scope=ALL` 请求。
- Vue：`/Users/zhudaoming/yss-valuation-outsourced/valuation-outsourced-frontend/packages/src/views/FileSyncWorkbench/components/TargetDataPreviewModal.vue:17-35` 有真实预览弹窗，`FileSyncWorkbench/index.vue:69` 注册预览动作。
- 前端测试定义：`FileSyncWorkbench/fileSyncWorkbenchApi.spec.ts:68-78` 映射同一 GET 路径和 `scope=CURRENT`。
- 既有契约审查：后端 `docs/architecture/file-sync-target-data-preview-openapi-review.md:19-26,42-54` 记录 UI/API 接缝，但测试 checklist 仍未勾且 Next Action 仍指实现。该审查写“只接收 taskCode”，当前 Controller 测试和前端测试已出现 scope；不能默认历史审查直接覆盖当前基线。
- 模块历史验收：`docs/file-sync-acceptance.md:3-24` 记录截至 2026-07-28 的308项模块测试和 starter 装配通过，明确真实三库仍待复验、旧证据不证明当前 HEAD；它没有提供此预览弹窗的前端验证与本轮所需统一交付包。
- 当前只读 HEAD：委外后端 `714fd4223d202b29c410d4d5533913e44874b3f1`；模型管理 `594ac1cc576414e9474b2e7ad50a17518ea4bbbb`；系统管理 `3e62fcdf01a34de4fb8793557baf19db0c448c93`。未用父仓 HEAD 冒充独立前端 SHA，也未把当前工作区当不可变快照。

新增的独立前端通过仓内登记引用进入只读范围；已读取其 AGENTS 和 README。未读取业务数据、密钥配置，未连接业务服务。委外/模型管理 `.codegraph` 存在，均先调用 CodeGraph；系统管理/独立前端未发现该目录，未创建索引。

### 补充查证结果与限制

- 三候选入口读取与 `git rev-parse HEAD` 均 exit 0；根身份存在性检查输出 missing。
- 委外与模型管理的 `codegraph explore` 均 exit 0，未更新索引。
- 首轮 docs/implementation、docs/releases 或 .scratch 某些目录不存在，rg 提示缺目录；后续使用实际存在 docs 路径查证。某些 `rg | head` 返回的是管道末端退出码，**不把它声称为全检索成功**。
- `/Users/zhudaoming/yss-valuation-outsourced/docs/testing/upload-batch-diagnosis-20260911/report.md` 被父 Ticket 引用，但本轮读取不存在；该断链不能充当已完成验收。
- 原有“本仓登记范围无配对”的结论保留其原范围；扩大到已保存项目后找到了真实配对线索。仍没有足够证据认定一个可直接开跑的“已完成、同基线、获准”的窄切片。

建议主控向用户明确推荐**以文件同步目标表数据预览作为待核实候选**，而不是追问用户能由源码查到的路径。用户需要决定是否采用该业务范围；固定历史版本、原始批准是否存在、部署身份探针可用性须后续查证，不应因本次库存自行补批准或执行试验。


## 最后一轮：最小真实运行前提（只读，2026-09-11）

**目前不足以直接启动真实交付试验。** 三项需保留为前置缺口：未发现五项部署身份探针；后端与独立前端均有未提交改动；根身份文件缺失。依主控转达的 Q12 决定，如这些缺口需要业务改造、探针或项目接入则停下列明，不自行补齐。

### 构建和启动入口（均未执行）

- 后端根 `pom.xml:22-24` 目标 Java 8；`README.md:131-146` 给出 `./mvnw clean package -pl valuation-outsourced-starter -am -DskipTests` 和 Nacos/Eureka 构建档位；`README.md:165-180` 给出 `./mvnw spring-boot:run -pl valuation-outsourced-starter -am` 或启动生成 JAR。这里是仓库文档入口，不声称该 Maven reactor 命令本轮可运行。
- `README.md:204` 明确依赖私有组件、数据库、Redis、Nacos、文件管理服务。`README.md:230-240` 说明可选择本地 profile 避免 Nacos，Redis 要可用；是否足以让整个聚合 starter 无其他服务启动本轮未验证。
- 独立前端 `package.json:8-22,80-84` 有 pnpm dev/build/build:standalone/preview、vitest、Node>=18 和 pnpm@10.15.0；`packages/package.json:7-14` 对应 Vite。`packages/vite.config.ts:13-20,74-76` 用环境传入 API base/代理目标及 standalone 开关。可配置隔离后端代理，不需把既有共享地址写进报告；未读取 env 文件或凭据。

### 数据库、资源和最小场景

`docs/file-sync-rollout-runbook.md:11-14,28,40-60` 要求控制库、所用目标库的支持表及受管来源/目标数据源；应用与集成测试不会自动执行 DDL。它支持 Oracle/PostgreSQL/MySQL，并明确本机已有 PostgreSQL 联调配置背景。`docs/file-sync-operations.md:55-60` 表明缺 SchedulerClient 可启动但同步执行/协调不可完整运行；不能据此宣称整套依赖可省略。

对**只读预览**的直接代码链：`SyncTargetDataPreviewAppService.java:68-94,197-213` 读取已存在任务，优先已配置草稿否则已发布版本，要求目标元数据 READY，再查目标行并复查目标配置未变。最小数据需有一条能正确解析的任务配置、受管目标资源与实际目标表；不要求为了观察预览先运行整套文件同步任务。

首轮采用**单 PostgreSQL、隔离控制库和隔离目标表**有依据：上述发布文档支持 PG，`JdbcSyncTargetDataPreviewAdapterTest.java:28-37` 明确 PG 查询路径；但该测试 mock JDBC，不能称已验证实库。该选择只是降低试验范围，不代表另两数据库兼容性获验证，也不证明完整 starter 的所有依赖已经可用。

`docs/api/specs/file-sync-target-data-preview.yaml:36-43` 已包含 `scope=CURRENT`；历史模式时只选失效日期为空的当前版本，FULL/INCREMENTAL 无历史过滤（服务 `80-82`）。`rows` 允许空数组、returnedRows 最小0（schema `135-143`）；历史审查 `docs/architecture/file-sync-target-data-preview-openapi-review.md:44-45` 明确空表200、保留全部列。已有有行查询测试和空结果的应用测试定义，**尚未找到可直接使用的、同时证明空表/有数据真实数据库及Vue页面的基线验收记录**。

### 身份探针与版本冻结

对 starter/file-sync 生产 Java，以及再扩展到全仓 Java（排除生成target、前端和技能目录），检索 `deployment_id`、`openapi_digest`、`artifact_digest`、`test_data_digest`、`revision_pointers`、`BuildProperties`、`GitProperties`、固定 `/version` 映射，没有匹配，最终 rg exit1。这证明当前检索未找到，不排除由部署平台在仓外提供。不能以现有 Node 合成 `/version` 服务代替真实部署身份；若须新增探针或外置受信身份绑定，按 Q12 停止，等待前置决策。

只读 Git 摘要：独立前端 HEAD `76f2d1627f797d5b12a99c48cf49125544933b18`，8 个已跟踪文件修改、98 个未跟踪文件；后端21个已跟踪文件修改、140个未跟踪文件（读取时快照）。`git status --porcelain -uno` 与 `git ls-files --others --exclude-standard` 仅输出计数，不复制业务文件清单。当前所见候选源码不能自动等同 HEAD，需要以选定范围的精确快照固定输入；用户原有工作区不动。

### 环境选择所需结论

- 本地隔离 PostgreSQL＋真实 Java starter＋独立 Vue 是可研究的目标配置，当前尚无已验证的最小可运行装配。不能把“安装一个PG”说成全部准备工作。
- 既有测试环境也只有在能固定部署版本、隔离任务/数据并提供五项身份时才满足这次试验；本轮未连接或核实任何既有环境。
- 探针、身份接入、依赖可用性和固定工作区快照是具体前置事项。按 Q12 若需要新增业务实现或接入，应列缺口停下，不因首轮可靠性目标扩张成环境改造项目。

本轮入口读取、CodeGraph、Git摘要、构建脚本读取 exit0；探针rg exit1为无匹配；JSON parse exit0。未执行安装、构建、测试、容器、服务、数据库操作或外仓修改。
