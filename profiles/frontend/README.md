# YSS 前端专职 Harness 模板

可按需协作于一个 Spec 综合研发主控；主控通过显式同功能 checkpoint 与当前 Receipt 汇总。前端验收是本端职责完成，整个业务仍由综合主控核验；无生产 UI 的功能显示前端项不适用，不生成空验收证据。

本仓库是 Harness Agent 的 `template-source`。入口见 [AGENTS.md](AGENTS.md)，职责见 [profile](.template-spec/process/harness-profile.yaml)，接力合同见 [战略与后端交付](.template-spec/process/frontend-backend-delivery.md)。

本仓从通用研发 Harness 分出，继续共享校验工具和技能来源；运行时代码通过登记的实现仓接入。涉及后端的正式任务须具备批准战略与当前后端交付，并重验真实服务版本；纯 UI 按当前合同记录后端不适用。日常任务按 AGENTS.md 中的政策核验与证据要求推进。

## 初始化

统一 CLI `yss` 使用 `frontend` Profile 创建 `harness.frontend-delivery` 实例。使用已验收的固定二进制，先运行 `yss bundle inspect --profile frontend --json` 核对模板提交和 Bundle 来源。

```bash
yss init --profile frontend --root /absolute/path/to/project --plan --out /absolute/path/to/init-plan.json --json
yss init --profile frontend --root /absolute/path/to/project --apply --plan-file /absolute/path/to/init-plan.json --json
```

初始化只接受不存在或空目录，新实例元数据为 `.yss.json`。attach / sync 先保存计划，再用 `--apply --plan-file` 应用同一计划；不会把另一家族实例转换 Profile。工作树候选只供维护验证，不能当作已发布固定快照。

历史 `create-yss-harness-frontend`、`create-yss-harness-dev` 及 `.yss-harness-frontend.json` 只用于旧实例识别和匹配固定执行器恢复。旧实例先显式 `yss migrate plan`，通过来源和冲突检查后应用保存的计划。命令和恢复步骤见 [CLI 使用说明](.template-spec/user-guide/CLI使用说明.md)。

## 维护与验收

仅在本模板源码仓使用：共享技能与适配由 Spec 模板的 Profile 清单维护，本仓只维护专有技能。独立克隆后运行 `node scripts/prepare-skills --source <来源锁指定提交的Spec源码目录> --apply`；以后用 `node scripts/prepare-skills --check` 离线核验。准备过程中拒绝覆盖修改或未知占用，重复执行不写入。CLI 创建的业务实例已携带完整技能，不执行源码准备。

修改本端专有 `.agents/skills` 后运行 `scripts/sync-skills`、`scripts/update-skill-lock` 和 `scripts/verify-template-fast`。共享接力工具由综合模板源同步，避免分别维护。同一业务切片须由统一管理方汇总战略、接口、部署及前端版本的端到端证据；本端完成不能替代整体业务验收。

原生实例使用同家族 yss sync；历史实例通过显式迁移接入。跨家族和无法证明身份来源的旧 repository-local 实例不自动转换。

## 用户手册

首次使用请从[本仓手册](.template-spec/user-guide/前端子项目用户手册.md)开始；练习见[设备借用职责案例](.template-spec/user-guide/设备借用贯穿案例.md)，全部入口见[索引](.template-spec/user-guide/用户手册索引.md)。

CLI 创建、接入、诊断、同步及恢复见 [CLI 使用说明](.template-spec/user-guide/CLI使用说明.md)。

## 本地业务分析与本端交付

原始需求可在本项目完成目标与验收、Plan、业务边界和规则、Spec，再进入本端设计、实现、测试与独立审查；无需先创建独立 Spec/Design 工程。已有上游批准输入时复用当前来源，冲突回交权威方确认，禁止静默改写。小任务按主控合同 `request_triage.delivery_path` 与 `yss lifecycle route` 选择 daily；高风险或已正式绑定任务保留 governed。分析角色不授予另一端代码写入；本端交付完成不等于跨端业务验收。纯 UI 记录后端不适用的原因和当前依据；真实 API、数据与跨仓依赖必须对齐。独立脚手架只生成机械结构，不授予业务实施。
