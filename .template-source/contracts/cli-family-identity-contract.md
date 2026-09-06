# CLI 模板家族身份与同身份升级合同

状态：本轮方案已由提问者确认并授权实施；实际验证与 Git 交付另见维护证据。

本合同补充 `create-yss-spec-repository-mode-contract.md` 的跨仓身份规则。各模板的 profile 与 instantiation 仍由各自 `docs/process/harness-profile.yaml` 定义。本次属于 template-source 的 L3 分发维护，触发 `cross-repo-contract`、`generation-semantics`、`release-semantics`；产品 Spec、OpenAPI、Slice Contract 和产品 context_reconciliation 为 not-applicable。

## 入口与兼容

- `create-yss-spec` 保留 init、attach、sync；`create-yss-harness-dev` 保留同名操作；战略 `create-yss-harness-design` 只提供 init。
- 前后端专职模板继续使用 repository-local `scripts/instantiate-harness`，只初始化新目录。不新增 npm 包、模板选择参数或跨 profile 迁移。
- `update` / `upgrade` 只更新 CLI 程序；不操作实例受管文件。战略与专职实例本次不增加自动同步入口。
- 目标家族由五种 metadata 文件和已存在的 Harness profile 显式判定，不由路径、Git remote 或业务内容猜测。五种文件分别是 `.yss-template.json`、`.yss-harness-design.json`、`.yss-harness-dev.json`、`.yss-harness-backend.json`、`.yss-harness-frontend.json`。

## 写入前与写入后不变量

1. init、attach、sync 的适用入口在生成计划或创建备份前拒绝异族标记、多重身份、损坏 metadata、未知 profile 和互相矛盾的身份字段；`--force` 不得绕过，`--dry-run` 使用同一规则并返回非零退出码。
2. 同族 metadata 中已声明的 templateName、templateSource、profileId 或 profile_id 必须匹配。原有历史 schema 兼容路径保留；历史 `legacy-attach` 只在旧 metadata schema 中接受，不豁免其他矛盾字段。
3. 缺 metadata 但有 profile 的目标仍须通过家族检查；普通无家族项目按既有 attach 规则处理。profile YAML 支持正常 YAML 表达，拒绝重复键、别名扩展、非法类型及未知 schema/profile。
4. 身份文件和 profile 的中间目录不得是符号链接或特殊文件。检查仅使用 CLI 包内的解析器，不执行目标项目或交接包中的解析代码。
5. 固定快照的 templateName、templateSource、profileId 和实际 profile 必须一致；写入完成后重新核对目标身份。更新受管资产不能改变原实例家族。
6. 保留既有受管冲突、unsafe、gitlink、删除报告与回滚语义；帮助、版本查询和程序更新不受目标家族限制。

## 验收和交付

CLI 命令是本轮已确认的测试 seam：观察退出码、输出和目标文件状态。覆盖五家族矩阵、force/preview、实际写入拒绝、缺 metadata、非法声明、同族历史同步、失败回滚、真实 tgz 初始化及跨仓交接。配置与确定性快照不套用业务 TDD，用分发验证覆盖。

版本采用兼容补丁：综合 3.1.1、研发 0.4.1、战略 0.4.1；若实施时版本已占用，则使用同一 minor 下的下一个未占用 patch。快照绑定已可获取的完整源 SHA，默认引用、文档和包内快照一致。原 dev CLI 工作树的既有 snapshot 差异留在原工作区，升级在独立工作树验证，不混入提交。

验证顺序：CLI 回归完成后运行跨仓链路，再从固定快照生成并验收实际 tgz。不得将临时改写快照的测试与跨仓验收并行。GitHub 候选执行适用审查及分级验证，完整分发校验记录本轮日志；提交推送在展示具体变更及证据后取得本轮授权。先交付子仓，再更新父仓 gitlink，npm 发布不在本轮执行范围。

旧 spec/dev 实例先保存 Git 基线，再预览并执行同族 sync；失败使用事务回滚，成功后撤销使用原基线或备份。不得用旧 CLI 强制反向同步，亦不得用战略 init --force 代替升级。
