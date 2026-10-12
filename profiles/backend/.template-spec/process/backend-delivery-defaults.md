# 后端交付专线默认约束

本文是 `role.backend-agent` 在编译、测试、部署计划和发布回滚环节的默认约束。它不授予生产环境写权限，也不替代实现仓库登记、Slice Implementation Contract 或发布门禁。

## 平台选择

- 默认部署平台：Docker。
- Kubernetes（`kubectl` / Helm）为显式选择的可选平台；未在合同中声明时不得自动切换。
- 平台选择必须写入实现仓库登记、Slice Contract 或发布说明，并绑定实际验证命令。

## 默认命令与证据

Docker 路径至少记录：

```bash
./mvnw validate
./mvnw test
./mvnw package
docker build --pull --tag <image>:<immutable-tag> .
docker run --rm --read-only <image>:<immutable-tag> <smoke-command>
```

实际项目可调整命令，但必须保留 `./mvnw` 优先级、不可变镜像 tag、退出码和产物摘要。默认不执行 `docker push` 或生产 `docker run`。

Kubernetes 路径仅在合同显式启用时记录：

```bash
kubectl diff --filename <manifest>
kubectl apply --dry-run=server --filename <manifest>
kubectl rollout status deployment/<name> --timeout=<duration>
```

生产集群的 `kubectl apply`、Helm upgrade、镜像推送和数据库迁移属于运行时副作用，必须经生物人审批后执行。

## 凭据与沙箱

- 凭据只允许来自 CI Secret、短期 OIDC token 或本地安全凭据代理；禁止写入仓库、日志、镜像层、任务包和验证证据。
- 默认在本地隔离容器或 CI 沙箱执行构建和 smoke test，使用非 root、只读根文件系统和最小网络权限。
- 未声明网络需求时，构建优先使用锁定依赖和缓存；需要拉取基础镜像或依赖时记录来源、摘要和失败原因。
- 发现凭据泄漏、沙箱逃逸、未授权网络或命令越界时，立即返回 `violation` 并停止交付。

## 回滚

- Docker 默认回滚：保留上一不可变镜像 tag，停止新容器并重新部署上一 tag；记录镜像 digest、时间和健康检查结果。
- Kubernetes 回滚：使用 `kubectl rollout undo deployment/<name> --to-revision=<revision>`，随后重新执行 rollout status 和 smoke test。
- 数据库迁移必须提供独立 downgrade 或前向兼容策略；没有可验证回滚路径时不得标记发布完成。
- 回滚证据写入 `evidence.backend-verification` 或 `evidence.checkpoint-and-rollback`，不把“命令已计划”记为已执行。
