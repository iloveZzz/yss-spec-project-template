# AGENTS.md — YSS 产品设计入口

用简体中文。先读根 `yss-project.yaml` 与唯一的 `CONTEXT.md`；身份缺失、非法或 schema 不支持时停止受影响写入，不猜身份。只读调查不创建 Ticket、checkpoint、批准或回归任务。

## 当前任务

项目实例先消费 `.template-spec/process/orchestration-contract.yaml` 的当前 Profile 政策。已有任务复用原记录、有效授权与证据；新风险停止受影响工作，保留用户修改。日常路由使用支持该能力的 `yss lifecycle route --root <治理仓> --task <Ticket> --implementation-root <实现仓> --base <完整SHA> --view agent --json`；未知事实先调查。旧 CLI、政策缺失、未启用 Profile 或已有正式任务不得自行转入日常路径。Design Profile 不启用 daily。

日常任务只维护同一 Ticket/PR，记录范围、验收、工程基线、Skills、实际验证、独立审查及回滚；正式任务按当前工作单元加载下述详细政策。任何实际执行遵循用户当前限制；未执行项如实报告，不声明通过。

## 不可省略的边界

- 不覆盖、清理、重置或恢复用户已有工作；只修改已授权仓库与范围。进入独立实现仓先读其本地入口，不把子模块当普通目录。
- 稳定业务术语先登记根 `CONTEXT.md`；阶段、门禁、角色及 ID 来自当前注册表，流程词汇按需读 `process-glossary.md`。
- 实现优先适用 YSS 技能；后端优先根 `./mvnw`，前端优先 `pnpm`。仅生成后端脚手架时使用 DDD/MVC 生成技能，无需产品阶段资产；显式正式合同仍须完整消费。
- 正式实现需要批准且当前的实现合同；API 按 Draft、审查、Freeze、实现的现行合同执行。编译器与查询不授予批准或执行资格。
- 复用有效授权，不把批准延伸到未知范围。提交、推送、发布与外部副作用须有用户授权。协作者写范围不重叠，实施者不得自审。
- 验证只覆盖当前改动、触发合同与依赖；记录实际范围和未覆盖边界。局部交付不等于可合并、可发布或生产认证。

## 按任务加载

正式阶段、Profile 交付、工程接入、专业开发、协作或模板维护：先读取 `.template-spec/process/agent-entry-policy.md` 对应章节，再加载其引用。授权延续消费当前编排技能的 `references/user-decisions.md`。项目职责以 `.template-spec/process/harness-profile.yaml` 为准。

<!-- YSS_TEMPLATE_SOURCE_ONLY_START -->
模板源维护按 `.template-spec/process/agent-entry-policy.md` 的模板源章节执行，不生成产品阶段资产。
<!-- YSS_TEMPLATE_SOURCE_ONLY_END -->
