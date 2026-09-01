# 后端交付专线跨仓合同（2026-09-02）

## 范围与仓库

- Harness 模板源：当前仓库 `yss-spec-project-template`。
- 开发落地 Harness：`submodules/yss-harness-dev-agent`，独立 Git 历史，作为现有产品线唯一后端专线载体。
- CLI：继续使用外部 `create-yss-harness-dev`，本变更不新增 CLI。
- 不新增 `.gitmodules` 项，不把 Harness 模板误登记为 `apps/backend/<project>` 运行时代码。

## 允许写入路径

- 子仓允许路径：`.agents/skills/backend-agent/SKILL.md`、`docs/process/harness-profile.yaml`、`docs/process/backend-delivery-defaults.md`、`skills-lock.json` 及本次维护证据目录。
- 父仓允许路径：`.template-source/evidence/maintenance/` 与对应的子仓 gitlink 更新。
- 禁止修改：父仓 `.gitmodules`、数字人角色/运行时注册表、CLI 源码、既有 `create-yss-harness-dev/template.snapshot.json` 脏改动及任何未授权运行时代码。

## 后端交付约束

- 默认平台为 Docker；Kubernetes 只有在 Slice Contract 或实现仓登记中显式选择时才启用。
- 默认验证命令：`./mvnw validate`、`./mvnw test`、`./mvnw package`。
- Docker 证据需包含不可变镜像 tag、只读容器 smoke test、退出码和镜像摘要。
- Kubernetes 证据需包含 `kubectl diff`、服务端 dry-run、rollout status 和 smoke test。
- 凭据只来自 CI Secret、短期 OIDC token 或安全凭据代理，不进入 Git、日志、镜像层或任务包。
- 默认在非 root、只读根文件系统、最小网络权限的本地/CI 沙箱执行。
- 生产 `docker push`、`kubectl apply`、Helm upgrade、数据库迁移和真实发布必须经生物人运行时副作用审批。

## 发布与回滚顺序

1. 子仓完成验证并提交/推送后端 Harness 变更。
2. 外部 CLI 绑定不可变子仓 commit，完成固定 commit 的集成测试和打包校验（本轮不发布新 CLI）。
3. 父仓更新子仓 gitlink，并使用 `git push --recurse-submodules=check`。

Docker 默认回滚到上一不可变镜像 tag；Kubernetes 使用 `kubectl rollout undo deployment/<name> --to-revision=<revision>`，随后重新执行 rollout status 和 smoke test。任何数据库迁移必须提供 downgrade 或前向兼容策略。

## 验收与失败处理

- 子仓 `scripts/verify-template-fast`、`scripts/verify-harness-profile` 和压力场景必须通过。
- 父仓完成对应模板 fast/candidate/full 验证；跨仓任一候选、CLI 集成、独立审查或回滚证据缺失时，只能报告“实现完成，跨仓发布受阻”。
- 发现路径越界、凭据泄漏、未授权副作用、`drift`、`violation` 或 `new_impacts` 时立即停止并回 Router。
