# 子仓候选差异证据

候选对应的子仓为 `submodules/yss-harness-dev-agent`，当前工作树状态：

```text
 M .agents/skills/backend-agent/SKILL.md
 M docs/process/harness-profile.yaml
 M skills-lock.json
?? docs/process/backend-delivery-defaults.md
```

子仓改动范围仅限后端 Agent skill、Harness profile、skills lock 和后端交付默认约束文档；未修改角色注册表、运行时、CLI 或运行时代码。子仓 fast 验证已通过。

## 可重放的精确变更

以下 patch 相对子仓基线 `2fc7a3e47bd747eeb136e269eac57ba4a4c655dd`，包含全部已授权文件变更；审查者可在独立工作树中使用 `git apply` 重放并核对字节。

```diff
diff --git a/.agents/skills/backend-agent/SKILL.md b/.agents/skills/backend-agent/SKILL.md
@@
-description: 根据批准的 DDD 战术设计和 Slice Contract 实现后端垂直切片、API、数据访问和后端测试。
+description: 根据批准的 DDD 战术设计和 Slice Contract 完成后端垂直切片、API、数据访问、测试以及可审查的交付验证。
@@
 - Domain / Application / Repository / API 测试以及实际 Maven 验证证据。
+- 交付验证：使用项目根 `./mvnw` 执行 validate、test、package（按项目实际脚本选择），记录退出码、产物和环境。
+- 部署与发布：只在合同授权范围内生成部署计划、发布检查、观察信号和回滚步骤；沙箱/测试环境可执行验证，生产副作用必须交由运行时副作用审批。
@@
 - 不为自己实现的切片担任独立 Reviewer / Verifier。
+- 不把“构建成功”当作发布批准；`gate.merge-approved` / `gate.release-ready` 仍由独立验证和人类门禁裁决。
diff --git a/docs/process/harness-profile.yaml b/docs/process/harness-profile.yaml
@@
-name: 四角色开发落地 Harness
+name: 四角色开发落地 Harness（含后端交付专线）
@@
-  细化为 DDD 战术设计、统一 Slice Implementation Contract、垂直切片实现和独立验证。
+  细化为 DDD 战术设计、统一 Slice Implementation Contract、垂直切片实现、后端交付验证和独立验证。
@@
-    全生命周期规格作为默认第一阶段。grill-with-docs、to-spec、to-tickets 只作为显式兼容入口。
+    全生命周期规格作为默认第一阶段。后端交付专线复用 `role.backend-agent` 与既有
+    Slice Contract；部署/发布仅产生可审查计划、验证和回滚证据，不绕过运行时副作用审批。
+    grill-with-docs、to-spec、to-tickets 只作为显式兼容入口。Docker 是默认部署平台，
+    Kubernetes 需在合同中显式选择；凭据、沙箱和回滚约束见
+    `docs/process/backend-delivery-defaults.md`。
diff --git a/skills-lock.json b/skills-lock.json
@@
-        "effectiveHash": "642827175f89a9758a406037b0d888bbe331010b48c8bc179c85e3d993305ee8",
+        "effectiveHash": "da5cce9ea8abe05a31070100026d9f1ac3583646669b42b0968281d32979a5f3",
diff --git a/docs/process/backend-delivery-defaults.md b/docs/process/backend-delivery-defaults.md
new file mode 100644
--- /dev/null
+++ b/docs/process/backend-delivery-defaults.md
@@
+# 后端交付专线默认约束
+
+本文是 `role.backend-agent` 在编译、测试、部署计划和发布回滚环节的默认约束。它不授予生产环境写权限，也不替代实现仓库登记、Slice Implementation Contract 或发布门禁。
+
+## 平台选择
+
+- 默认部署平台：Docker。
+- Kubernetes（`kubectl` / Helm）为显式选择的可选平台；未在合同中声明时不得自动切换。
+- 平台选择必须写入实现仓库登记、Slice Contract 或发布说明，并绑定实际验证命令。
+
+## 默认命令与证据
+
+Docker 路径至少记录：
+
+```bash
+./mvnw validate
+./mvnw test
+./mvnw package
+docker build --pull --tag <image>:<immutable-tag> .
+docker run --rm --read-only <image>:<immutable-tag> <smoke-command>
+```
+
+实际项目可调整命令，但必须保留 `./mvnw` 优先级、不可变镜像 tag、退出码和产物摘要。默认不执行 `docker push` 或生产 `docker run`。
+
+Kubernetes 路径仅在合同显式启用时记录：
+
+```bash
+kubectl diff --filename <manifest>
+kubectl apply --dry-run=server --filename <manifest>
+kubectl rollout status deployment/<name> --timeout=<duration>
+```
+
+生产集群的 `kubectl apply`、Helm upgrade、镜像推送和数据库迁移属于运行时副作用，必须经生物人审批后执行。
+
+## 凭据与沙箱
+
+- 凭据只允许来自 CI Secret、短期 OIDC token 或本地安全凭据代理；禁止写入仓库、日志、镜像层、任务包和验证证据。
+- 默认在本地隔离容器或 CI 沙箱执行构建和 smoke test，使用非 root、只读根文件系统和最小网络权限。
+- 未声明网络需求时，构建优先使用锁定依赖和缓存；需要拉取基础镜像或依赖时记录来源、摘要和失败原因。
+- 发现凭据泄漏、沙箱逃逸、未授权网络或命令越界时，立即返回 `violation` 并停止交付。
+
+## 回滚
+
+- Docker 默认回滚：保留上一不可变镜像 tag，停止新容器并重新部署上一 tag；记录镜像 digest、时间和健康检查结果。
+- Kubernetes 回滚：使用 `kubectl rollout undo deployment/<name> --to-revision=<revision>`，随后重新执行 rollout status 和 smoke test。
+- 数据库迁移必须提供独立 downgrade 或前向兼容策略；没有可验证回滚路径时不得标记发布完成。
+- 回滚证据写入 `evidence.backend-verification` 或 `evidence.checkpoint-and-rollback`，不把“命令已计划”记为已执行。
```
