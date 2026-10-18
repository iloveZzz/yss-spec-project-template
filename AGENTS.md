# YSS 入口

用简体中文。先读根 `yss-project.yaml`、唯一 `CONTEXT.md`；身份缺失、非法或 schema 不支持则停受影响写入，不猜身份。只读不建 Ticket、checkpoint、批准或回归任务。

## 任务

项目实例先读 `.template-spec/process/orchestration-contract.yaml` 现行 Profile 政策。已有任务复用记录、有效授权及证据；新风险停受影响工作并保留修改。日常用支持此命令的 CLI：`yss lifecycle route --root <治理仓> --task <Ticket> --implementation-root <实现仓> --base <完整SHA> --view agent --json`；未知先查。旧 CLI、缺政策、未启用 Profile 或已有正式任务不得自行转日常。新项目只用 Spec、Backend；旧 Design 显式迁移保留历史。

日常仅维护同一 Ticket/PR，记范围、验收、工程基线、Skills、实际验证、适用复核、回滚；正式按当前单元加载政策。遵循用户限制；未执行如实报告，不声明通过。

## 边界

- 不覆盖、清理、重置、恢复用户工作；仅改授权仓库及范围。独立实现仓先读本地入口；子模块不作普通目录。
- 稳定业务词先登记根 `CONTEXT.md`；阶段、门禁、职责及 ID 用当前注册表，流程词按需读 `process-glossary.md`。
- 优先适用 YSS 技能；后端优先根 `./mvnw`；前端属独立规格与 CLI。仅生成后端脚手架用 DDD/MVC 技能，无需产品阶段资产；显式正式合同须完整消费。
- 正式实现须当前、已批准实现合同；API 按现行 Draft、审查、Freeze、实现合同执行。编译器与查询不授予批准或执行资格。
- 复用有效授权，不延伸未知范围。提交、推送、发布及外部副作用须用户授权；协作写范围不重叠。默认同一 Agent 诚实自检；独立复核须可核验独立上下文，冻结审查只读。
- 只验证当前改动、触发合同及依赖，记录实际范围与未覆盖边界。局部交付不等于可合并、发布或生产认证。

## 加载

正式阶段、Profile 交付、工程接入、专业开发、协作、模板维护：读 `.template-spec/process/agent-entry-policy.md` 对应章节及引用。授权延续读当前编排技能 `references/user-decisions.md`；职责见 `.template-spec/process/harness-profile.yaml`。

<!-- YSS_TEMPLATE_SOURCE_ONLY_START -->
模板源不建产品阶段资产；维护事实源、消费者、分发；Skill 仅改 canonical `.agents/skills`，由现有生成器更新投影与锁。强度按 `.template-source/process/maintenance-intensity.yaml`；用户验证范围优先；本地未执行项不作发布证据。
<!-- YSS_TEMPLATE_SOURCE_ONLY_END -->
