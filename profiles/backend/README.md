# YSS 后端专职 Harness 模板

本仓库是 Harness Agent 的 `template-source`。入口见 [AGENTS.md](AGENTS.md)，职责见 [profile](.template-spec/process/harness-profile.yaml)，接力合同见 [战略交接](.template-spec/process/strategic-handoff-package.md)与[后端交付约定](.template-spec/process/backend-delivery-defaults.md)。

本仓从通用研发 Harness 分出，继续共享校验工具和技能来源；运行时代码通过登记的实现仓接入。后端按业务切片交付已验证的冻结接口、构建与部署身份。

可按需协作于一个 Spec 综合研发主控；主控必须绑定明确的同功能 checkpoint 与当前 Receipt。后端职责完成不等于整个业务验收，不改变本端实现范围。新增 Backend Delivery 的 `strategic_bundle_ref` 使用批准后的完整 v5 delivery wrapper；裸 package 仅作历史兼容读取。

## 初始化

只需开发脚手架时，直接使用 `yss-layered-mvc-scaffold-generator`（MVC）或 `yss-ddd-scaffold-generator`（DDD）。提供工程名、包名、输出目录、精确平台和 Maven 坐标即可，无需需求合同、原型或设计审批，也无需先初始化治理实例；命令见[直接生成说明](.agents/skills/yss-ddd-scaffold-generator/references/standalone-generation.md)。以下步骤用于创建治理项目。

统一 CLI `yss` 使用 `backend` Profile 创建 `harness.backend-delivery` 实例。使用已验收的固定二进制，先运行 `yss bundle inspect --profile backend --json` 核对模板提交和 Bundle 来源。

```bash
yss init --profile backend --root /absolute/path/to/project --plan --out /absolute/path/to/init-plan.json --json
yss init --profile backend --root /absolute/path/to/project --apply --plan-file /absolute/path/to/init-plan.json --json
```

初始化只接受不存在或空目录，新实例元数据为 `.yss.json`。attach / sync 先保存计划，再用 `--apply --plan-file` 应用同一计划；不会把另一家族实例转换 Profile。工作树候选只供维护验证，不能当作已发布固定快照。

历史 `create-yss-harness-backend`、`create-yss-harness-dev` 及 `.yss-harness-backend.json` 只用于旧实例识别和匹配固定执行器恢复。旧实例先显式 `yss migrate plan`，通过来源和冲突检查后应用保存的计划。命令和恢复步骤见 [CLI 使用说明](.template-spec/user-guide/CLI使用说明.md)。

## 维护与验收

本 Profile 由根仓内核与 `profiles/_specialist`、`profiles/backend` 覆盖层组合。共享技能在根仓 `.agents/skills` 维护，专有内容在覆盖层维护；在模板仓根运行以下仅供模板源使用的命令，入口会组合完整 canonical 技能源并安全回写覆盖层投影与锁，随后按影响面执行定向检查：

```bash
node .template-source/scripts/manage-profile-skills.mjs sync --profile backend
node .template-source/scripts/manage-profile-skills.mjs lock --profile backend
```

实例携带 `.agents/skills` 和受管的 `.workbuddy/skills` 普通文件投影；投影与锁由模板供应链生成，实例更新使用 CLI 保存计划与事务，不运行源码准备或直接生成投影。锁保留有效哈希校验。

同一业务切片须由统一管理方汇总战略、接口、部署及前端版本的端到端证据；本端完成不能替代整体业务验收。

原生实例使用同家族 yss sync；历史实例通过显式迁移接入。跨家族和无法证明身份来源的旧 repository-local 实例不自动转换。

## 用户手册

首次使用请从[本仓手册](.template-spec/user-guide/后端子项目用户手册.md)开始；练习见[设备借用职责案例](.template-spec/user-guide/设备借用贯穿案例.md)，全部入口见[索引](.template-spec/user-guide/用户手册索引.md)。

CLI 创建、接入、诊断、同步及恢复见 [CLI 使用说明](.template-spec/user-guide/CLI使用说明.md)。

## 本地业务分析与本端交付

原始需求可在本项目完成目标与验收、Plan、业务边界和规则、Spec，再进入本端设计、实现、测试与适用复核；无需先创建独立 Spec/Design 工程。已有上游批准输入时复用当前来源，冲突回交权威方确认，禁止静默改写。小任务按主控合同 `request_triage.delivery_path` 与 `yss lifecycle route` 选择 daily；高风险或已正式绑定任务保留 governed。分析活动不授予前端代码写入；本端交付完成不等于跨端业务验收。纯 UI 记录后端不适用的原因和当前依据；真实 API、数据与跨仓依赖必须对齐。独立脚手架只生成机械结构，不授予业务实施。

## 生命周期分歧

本 Profile 的生命周期注册表与根内核存在少量显式分歧，例如保留仓库身份门禁与 Agent 可执行 Slice 门禁。所有分歧登记在 `.template-source/process/profile-lifecycle-divergences.json`，由 `tests/profile-consistency.test.mjs` 校验；新增或删除分歧必须先更新声明和原因，不能静默漂移。

## WorkBuddy 接入

WorkBuddy 代码适配使用项目级 `.workbuddy/skills`，与 canonical 技能源保持一致。首次会话显式要求读取根 `AGENTS.md` 和 `CONTEXT.md`；自动入口、技能发现及刷新行为仍需按实际桌面版本验证。调用前运行 `yss skills resolve <id> --agent-runtime workbuddy --root <项目根> --json`，文件 `ready` 不代表桌面发现已验证。已有实例先核对并应用显式 `sync` 计划，保留冲突与用户修改。
