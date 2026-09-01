# 后端 Bot Harness 范围决策记录（2026-09-01）

## 决策状态

- 状态：已完成设计访谈，尚未进入实现。
- 仓库身份：`template-source`。
- 影响面：`Harness-only`、`cross-repo-contract`、`release-semantics`；预计维护强度为 L3。
- 本记录不是 Spec、OpenAPI、Ticket、架构批准或发布结论。

## 已确认决策

1. 不新增第四条独立后端 Harness 产品线；扩展现有 `submodules/yss-harness-dev-agent`。
2. 不新增 Git submodule。现有子模块继续作为唯一开发落地 Harness 载体。
3. 不新增 `create-yss-backend-agent` CLI；第一阶段通过现有 Harness 的模板/配置扩展验证价值。
4. 复用父模板的 `role.backend-engineer`、`runtime.skill-projection` 与现有后端技能闭包；不新增数字人角色或运行时注册项。
5. 能力增量限定为后端专线，以及部署/发布的计划、执行证据、验证和回滚闭环；不复制已有 Tactical Design、Slice Contract、TDD 和验证链路。
6. 生产环境写入、凭据使用、数据库迁移和真实发布必须经过生物人运行时副作用审批；该审批不等同于生命周期 `gate.release-ready`。
7. 采用跨仓库先子仓、后父仓 gitlink 的发布顺序；本轮不提交、不推送，不改变既有 Git checkpoint。

## 事实依据

- 根目录 `yss-project.yaml` 声明 `repository_mode: template-source`。
- `docs/agents/digital-human-roles.yaml` 已有 `role.backend-engineer`，覆盖后端架构、实现、TDD 和 `./mvnw` 验证。
- `submodules/yss-harness-dev-agent` 已有 `role.backend-agent`、`role.architecture-agent`、`role.test-agent`，并包含 Tactical Design、Slice Contract、实现、验证及 release-and-rollback 工作单元。
- `docs/process/implementation-repo-integration.md` 将 `apps/backend/<project>` 的 `git-submodule` 规则限定于 `project-instance` 的运行时代码接入；本决策不把 Harness 模板误登记为该类实现仓。
- 当前存在既有用户修改：`submodules/create-yss-harness-dev/template.snapshot.json`。本轮明确保留，不覆盖、不重置。

## 未决假设

- 现有 `yss-harness-dev-agent` 的远端仓库、默认分支和当前工作树改动仍由后续实施者/维护者确认；本记录不替代跨仓库合同。
- 部署/发布适配的具体平台、凭据类型、沙箱策略和回滚命令尚未定义；在定义前只能产出计划和证据，不得执行真实外部副作用。
- 是否需要在现有 Harness 内新增专属 skill、任务包 schema 字段或运行时适配，留待实施阶段依据真实缺口判断；不得预先复制技能。
- 部署平台已确认：Docker 为默认，Kubernetes 仅在合同显式选择时启用。
- 凭据、沙箱和具体回滚默认约束已落在子仓 `docs/process/backend-delivery-defaults.md`；具体项目仍需在实现仓库登记中补齐镜像、集群、Secret/OIDC 和回滚 revision。

## 下一授权动作

在用户确认本记录后，按 L3 模板维护流程创建正式 maintenance checkpoint，编写跨仓合同与压力场景，随后由非实施者执行正式独立审查和最终 Fresh Verification。实施阶段只允许修改现有 Harness 明确授权的路径，并保留上述脏工作树变更。

## 文档变更

- 新增本记录；未修改 `CONTEXT.md`（本轮未形成新的稳定业务术语）。
- 未修改 `.gitmodules`、角色/运行时注册表、CLI 或任何运行时代码；后续实现已修改现有子仓的后端 skill、Harness profile 与 lock，并新增后端交付默认约束文档。
- L3 候选已绑定子仓 commit `34a1e4380f43e161f8694efb6cb7a47d7ced38ef`；正式独立审查无开放 finding，最终 `scripts/verify-template` Fresh Verification 通过。该状态仍不包含生产部署或外部发布批准。
