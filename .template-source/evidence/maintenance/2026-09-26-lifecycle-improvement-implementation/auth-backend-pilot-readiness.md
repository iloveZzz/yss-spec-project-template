# auth-backend 试点接入核验与恢复方案

日期：2026-09-26。状态：真实项目已指定，准入诊断与定向回归已执行；正式窄切片接收尚未完成。

用户指定项目：`/Users/zhudaoming/Documents/antigravity/peaceful-hubble/auth-backend`。根 `yss-project.yaml` 为 `project-instance`。本轮对项目执行只读规则 / 合同核验与现有测试，未修改业务源代码、批准、checkpoint 或目录布局。测试可生成其正常的本地构建输出；不视作业务变更或发布。

## 建议窄路径

以既有“匿名访问受保护页面 → 登录后回到目标页面 → 会话失效重新登录”为试点主线，BFF Cookie/Token 代理作为后端接缝；扫码轮询停止 / 恢复仅纳入现有定向回归。此处是待确认的具体试点范围，不新增身份提供方、权限模型、用户注册、OAuth 客户端管理或门户动效需求。

本路径已有来源：`docs/.scratch/auth-channel-gateway-optimization/issues/01-portal-route-guard-and-auth-isolation.md`、同目录 Task 07，以及 `docs/slices/slice-implementation-contract.slice.bff-cookie-token-proxy.json`。这些既有文档中历史“closed / verified”结论只用来定位资产，不充当本次新鲜证据。

## 本次实际结果

| 核验 | 结果与解释 | 当前证据 |
|---|---|---|
| 既有阶段 8 checkpoint 校验 | exit 1；`scaffold-architecture-decisions.yaml` 依据摘要过期。该记录不能直接作为当前执行或发布依据 | [原始日志](auth-legacy-checkpoint.log) |
| BFF Slice 合同只读校验 | exit 1；文件可读，但结构缺项，后续批准与新鲜度没有执行；`execution_allowed=false`。该合同 `schema_version=2`，不能靠把版本号改为 3 或重新计算摘要修复 | [原始日志](auth-slice-preflight.log) |
| 路由守卫与 SmartPoller 定向测试 | `pnpm ... exec node --experimental-strip-types --test ...`，exit 0，18/18 通过 | [运行清单](auth-readiness.json)、[前端日志](auth-frontend-recovery.log) |
| BFF 代理控制器定向测试 | 首次默认 JDK 8 被项目 `[17,18)` 要求拦截；使用已安装 Corretto 17 和根 `./mvnw` 后 exit 0，4/4 通过。未改全局 Java 配置 | [JDK 17 记录](auth-backend-bff-jdk17.json)、[日志](auth-backend-bff-jdk17.log) |

这些测试只覆盖现有本地逻辑与控制器测试接缝，未证明真实浏览器登录、身份提供方、Redis/MySQL 拓扑、网关联调或生产部署成功。旧合同的批准 / 新鲜度为 `not-checked`，不能写成批准被否决，也不能写成有效。

## 具体恢复顺序

1. 确认上述窄路径及真实负责人。开始时重新保存当前工作树清单和范围摘要；当前已有 129 条修改 / 未跟踪记录，包含业务代码与新需求，不能 reset、clean 或批量纳入此次试点。
2. 生成显式实例迁移计划：先核对当前 `.yss-template.json` 与工具能力，使用既有 `check → plan` 入口，列出 `docs/process` 到当前治理布局、消费者版本、stage tracking 与绑定证据的影响。计划写入单独证据目录，不 apply，也不重写历史批准。
3. 在所选路径建立当前资产关联：复用可确认的 Spec / API / 设计事实，列出相对现有代码的真实差异。针对已过期依据重新核验影响；仅机械变化且符合原协议时使用有独立等价证据的延续，否则提交当前审阅资产取得新决定。不能把本次选择试点项目当作 Slice 合同批准。
4. 编译当前 Slice 合同候选并做只读校验，明确前后端写范围、实际 `pnpm` / 根 `./mvnw` 命令、JDK 17、允许的联调环境与回滚点。通过适用决定和独立审查后才进入正式实现；编译器不批准自己的产物。
5. 正式试点执行至少一次磁盘恢复：保存任务身份和已完成证据，重启后复验输入及合同，再继续未完成工作；有实际执行结果时不重派。验证匿名 / 有效会话 / 过期会话、拒绝、恢复及必要 API 状态，记录浏览器、console、网络和实际前后端运行结果。
6. 完成同一候选前后端接收与 Fresh Verification，再形成阶段结论。未部署明确写未部署，发布须另有真实决定。

第 2 步之后的真实迁移 / 当前 Slice 准入目前未执行。原因来自本仓 `AGENTS.md` 的存量显式迁移、当前已批准合同和真实决定规则，以及上述实际验证失败；不是新增一轮模板维护审批。

### 已执行的迁移预览

使用本地 create-yss-spec 3.5.1 的 `sync --json --migrate-layout` 生成了[完整只读计划](auth-layout-migration-plan.json)。命令 exit 0 表示计划生成成功，计划自身为 `blocked: true`：34 项冲突、0 项 unsafe；预计更新 368、新增 158、移除差异 225，这些均为计划数量，实际未写入。运行前后比较 6,081 个项目文件，差异为 0，见[执行记录](auth-layout-migration-verification.json)。此预览针对当前 CLI bundled 快照，不冒充本次优化最终固定提交版本。

冲突分为 20 项“缺可信摘要或已被项目修改”、10 项“目标阶段没有对应资产”、2 项受管修改、2 项需手工处理的可定制文件。逐文件摘要与建议在[冲突处理清单](auth-migration-conflict-triage.json)，所有建议尚未批准。项目 `CONTEXT.md`、`DESIGN.md` 和 tokens 保留其事实；两个历史 checkpoint 属于动态阶段资产，不能把它们当静态模板迁进 `.template-spec`；配置保留本地差异；技能锁在来源确定后重新生成。其余退出 / 缺基线文件先确认所有者与当前用途，不能强制删除或假填受管摘要。

因此当前没有安全可直接 apply 的整仓迁移计划。正式试点应先收敛这些冲突，再生成同一当前候选的可审阅差异；本次先完成的本地回归测试不能解锁此迁移。

### 迁移前还需澄清的来源冲突

逐文件阅读发现，`docs/user-guide/CLI使用说明.md`、`产品生命周期工作流.md` 和 `后端子项目用户手册.md` 使用 `harness.backend-delivery` 专职说明；真实 `.yss-template.json` 标识为 `create-yss-spec`，`.yss-harness-backend.json` 不存在，手册引用的 `docs/process/harness-profile.yaml` 与当前布局下同名文件均不存在。见[只读摘要记录](auth-profile-evidence.json)。这是说明与接入来源的不一致，不能据手册推断本仓已完成 profile 转换。应先确定当前目标消费者，再生成正确导航候选。

`docs/process/manifests/implementation-scope.json` 还绑定真实 `auth-core-composite-login` 合同、工程目录与摘要，属于动态实现范围。它与历史 checkpoint 一样保留原路径和引用，不能作为静态规则搬入 `.template-spec`。这些建议只更新本轮证据区的处理清单，没有写入 auth-backend。

## 回退与保护

原始工作树清单见 [auth-backend-inventory.json](auth-backend-inventory.json)。迁移必须重新核验计划输入摘要并备份其写范围；冲突即停止受影响项，不覆盖另一项正在进行的开发。历史合同与批准保持可追溯，不复活过期批准。现阶段无需回滚业务修改，因为本轮没有写入业务或治理资产。
