# 脚本执行与依赖说明

本文件说明已有操作的调用方式。阶段与门禁仍来自生命周期注册表，执行策略来自 `yss-product-lifecycle/references/orchestration-contract.yaml.execution_efficiency`，分发文件来自当前 manifest、Skill 依赖与 CLI 快照。这里不登记第二套脚本权威。

## 使用固定入口

先核对本地 Profile、CLI 版本、快照和入口的 `--help`。表中工具只有已经安装且适用于当前工作单元时才能使用；专职 Profile 不保证拥有综合模板全部命令。

| 操作 | 已有入口 | 写入与证据 |
|---|---|---|
| 规则与技能查询 | `scripts/query-lifecycle-context --mode route --stage stage.plan --work-unit work-unit.plan-requirements --include execution_efficiency --check-skills --agent-runtime codex` | 只读；示例 runtime 按当前安装改为 codex/cursor/pi；预检成功不批准阶段 |
| 进度与恢复诊断 | `scripts/lifecycle-status --root <项目根> --checkpoint <根相对引用> --format json` | 只写 stdout；需要当前证据复验时显式 `--preflight` |
| 当前 Slice 准备 | `scripts/slice-contract prepare <Ticket> --input <细化.yaml> --output <新合同.yaml>` | 起草新 YAML，来源摘要和依赖闭包由准备器生成；不批准 |
| 当前 Slice 验证 | `scripts/slice-contract verify <合同.yaml> --root <项目根> --unit <工作单元>` | 校验当前来源；批准记录按当前合同参数传入 |
| 合同阅读 | `scripts/contract view <合同.yaml> --kind slice --profile task --unit <工作单元>` | 只读派生视图；需追溯时展开 `full`，不要重复整读后自行重建 |
| checkpoint 检查 | `scripts/verify-lifecycle-checkpoint <checkpoint>` | 核验显式资产；场景测试不替代项目校验 |
| 技能投影与锁 | `scripts/sync-skills --check`、`scripts/update-skill-lock --check` | 默认先检查；更新用各仓已有生成器，保留项目扩展 |
| 模板维护回归 | `scripts/verify-template-fast`、`scripts/verify-template-candidate --base <SHA>`、`scripts/verify-template` | 仅模板维护或显式回归任务；全量发布门禁保留 |
| 实例依赖与补装 | 当前 CLI 的 `doctor`、`skills ensure --plan` 或 `assets ensure --plan`（以该家族 help 为准） | plan 不写项目；审阅缺口、文件纳入原因与固定来源后按既有授权补装 |

参数与退出码以当前工具输出为准。Shell 包装器按 shebang 直接执行，例如 `scripts/verify-template-fast`；不能一律给入口加 `node`。调用失败时保留命令、退出码、时间和日志，先分清参数错误、依赖缺失、合同阻断与实际验证失败。

## 为什么同时有 JS、MJS 和 Python

Node 负责已有 CLI、资产编排和共享库；`.mjs` 是这里的模块文件，部分 CLI 的 `.js` 按包的模块约定执行。文件后缀不代表每个任务都需重新生成脚本。

部分校验通过 `python3` 调用 JSON Schema 引擎，部分交接工具使用固定 Python 脚本处理归档。其消费者、Schema 与资源必须随当前依赖闭包完整提供。解释器可用不代表第三方包可用；例如 Schema 路径还依赖 `jsonschema` / `referencing`。按实际分发内容和 doctor 输出核对，不把专项依赖强加给所有项目。

项目运行代码与治理工具分别验证：前端使用登记的 `pnpm` 命令，后端优先根 `./mvnw`。治理脚本通过不能代替业务构建、交互验收或项目批准。

## 临时分析与诊断

已有入口覆盖的机械操作直接复用；确实缺少能力时先补现有入口参数或固定适配器。范围清晰的一次性分析可以在工具会话或仓外新目录运行，记录输入摘要、来源身份、允许写范围和实际输出。重复出现且有多个消费者时再收敛为可复用工具，不按扩展名批量删除。

诊断和测试的合成资产由固定 fixture builder 生成，绑定当前来源并在结束后清理。模板维护工具 `node .template-source/scripts/diagnose-python-schema.mjs --output <仓外新目录>` 对照未插桩和插桩结果；诊断日志保留摘要与阻断信号，不记录真实业务或批准正文，也不分发到产品实例。

计时分别记录脚本执行、Agent 编排和人工等待；不可观察项标为未知。现有 batch/validation-phase 只在本次操作与完整绑定范围内复用，结束时复核漂移；恢复、交接、实现、合并与发布重新校验。shadow 的观察结果不自动取得裁剪资格。
