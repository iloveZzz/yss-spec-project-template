# 专职 CLI 核心 Standards 独立审查

结论：`changes-requested`；发现 1 项 `violation`（P1）。不批准合同，不裁决整体实施完成或发布。

## 固定候选与范围

- `review_mode`: committed
- `review_base_ref` / `merge_base`: `5eb824d776dba30b4d39522a0555df87f877501b`
- `candidate_snapshot_ref`: `7b2c35411c877b80e606f387a3175d42063441e7`
- `candidate_digest`: `6458dff5080dd25d54279deb3d7da07ae820845a`
- 输入：`core-review-candidate.json`、`standards-core-task.json`。
- 固定 diff：`git diff 5eb824d776dba30b4d39522a0555df87f877501b...7b2c35411c877b80e606f387a3175d42063441e7`；提交列表：`git log 5eb824d776dba30b4d39522a0555df87f877501b..7b2c35411c877b80e606f387a3175d42063441e7 --oneline`，仅 `7b2c354 feat(cli): add dedicated Harness CLI core and confirmed design`。
- 覆盖共享核心和薄包生成器 A–E，读取固定提交文件；不将活动工作树、随后源模板修改、真实薄包构建视为本候选。
- 标准源：根 `AGENTS.md`、`CONTEXT.md`、`.agents/skills/tdd/SKILL.md` 及 tests/mocking 引用、`.agents/skills/cross-repo-implementation-routing/SKILL.md`、`.agents/skills/code-review/references/yss-review-standards.md`、`docs/templates/review-report-template.md`、已确认设计 v1.1.0。根无 `CODING_STANDARDS.md` / `CONTRIBUTING.md`。

## 必须修复项

### S1 / P1 / violation：中断事务恢复绕过身份和仓库边界预检

位置：`.template-source/cli-core/engine.mjs:16-28`（提前调用 `recover`），`.template-source/cli-core/transaction.mjs:268-278`（只比较文件描述便恢复或删除）；固定候选 `7b2c354`。

规范依据：根 `AGENTS.md` §9 禁止把 gitlink 等挂载点视作普通目录；已确认设计 §4 明确不接管 submodule 内容、不得覆盖受保护 gitlink，且 init/attach/sync 共同拒绝矛盾身份；§6.2–3 要求旧 metadata 无写入拒绝，`--apply` 不可绕过。恢复也是 CLI 写入路径，不能省略这些边界。

`execute` 发现 pending 日志后仅检查是否存在其他家族 metadata，即在正常 `identity()`、`gitlinks()`、`guardNestedRepository()` 前返回。恢复只看路径形式和当前摘要，没有确认中断后仓库所有权或身份是否变化。因此用户在中断后把治理目录变成嵌套仓库，或将本家族身份改回旧格式，下一次 `sync --apply` 仍会删除/恢复该目录文件并返回成功。

公开 CLI 反例：将固定提交完整核心导出到隔离临时目录，使用现有测试的离线包 fixture，经 Node 文件系统边界注入 SIGKILL；不改候选。步骤为 init → 上游新增 `docs/new.md` → sync 写该文件后 SIGKILL → 改变目标边界 → sync --apply。

| 中断后的变化 | 恢复前 docs/new.md | 恢复后 docs/new.md | CLI 结果 |
|---|---|---|---|
| 新建 `docs/.git`，内容 `gitdir: elsewhere` | 存在 | 被删除 | exit 0，`status: recovered` |
| 本家族 metadata 改为 `{schema_version:1, profile_id:"harness.backend-delivery"}` | 存在 | 被删除 | exit 0，`status: recovered` |

复现脚本退出码 0，两种情况均真实发生，临时目录已清理。当前套件虽然有“跨家族恢复保持零写入”的标题，该用例循环实际仅为 gitlink/hardlink/state，没有覆盖上述恢复分支。

建议：在任何恢复写入（包括状态日志变更）前，校验事务可解释的前/后身份状态，以及每条恢复路径当前 gitlink、嵌套仓和路径所有权。对无法解释的身份或保护边界变化返回诊断且零写入。应为半完成 init 保留合法恢复能力，不直接套用要求完整 metadata 的正常 sync 身份检查。自动失败回滚和下次进程恢复都应复用边界策略；增加上述公开 CLI 回归。

## Fowler 判断项

未提出额外气味 finding。当前核心已按包、身份、计划、事务、构建和升级职责分文件；没有为普通简短重复增加抽象要求。S1 是具体已证实的规范违反，不以气味或个人风格替代。

## 维护合同与 TDD 检查

| 检查项 | 结论 | 证据 / 理由 |
|---|---|---|
| 仓库身份及影响路由 | pass | 根 template-source，routing 登记 Harness-only / release-only；不生成产品资产 |
| 公共核心权威与生成投影边界 | pass | core 在 `.template-source/cli-core/`，scaffold 生成 vendor 同步入口，没有手改 canonical skill 投影 |
| 允许路径、登记仓库与回滚点 | pass | 固定实现 diff 在登记 core 与合同/证据路径；routing 保存独立仓库、分支和回滚点 |
| 产品 Slice 合同、required_skills、Build Architecture Checklist | not-applicable | 当前为模板工具链维护，无产品切片；不虚构产品合同 |
| 公共测试 seam 与 mock 边界 | pass | 设计 §9 已确认 CLI 退出码/JSON/文件树；测试运行 CLI 子进程，注入 fs 与 npm 系统边界，未 mock 自有内部模块 |
| RED→GREEN 执行历史 | 本报告不追认 | 固定提交和已提供 GREEN 日志不能单独证明历史执行顺序；由主控原实施证据承担，不以猜测记录通过 |
| 状态/事务及恢复边界 | violation | S1，需原合同路径修复后捕获新候选并重跑轴审查 |
| 薄包真实 tgz、来源模板及 F 生态兼容 | not-applicable | 上游明确本候选范围不包含随后真实薄包/来源模板验收；不是整体已通过 |
| API Freeze、产品语汇登记、UI fidelity | not-applicable | 无产品 API、业务类型或用户界面 |

## YSS 后端门禁审查

| 检查项 | 结论 | 原因 |
|---|---|---|
| Backend Slice 合同、allowed paths / seam / evidence | not-applicable | Node 模板工具，无后端产品切片 |
| yss-domain 分层及依赖 | not-applicable | 没有 Java Domain |
| yss-application 用例与事务边界 | not-applicable | CLI 文件事务不属于 YSS Application 用例层 |
| yss-repository、PO / Repository / Convertor / GatewayImpl | not-applicable | 没有业务持久化 |
| yss-web-controller / yss-dto、CMD / Query / VO / Result | not-applicable | 没有 HTTP Controller 或 Java DTO |
| MapStruct 转换 | not-applicable | 没有 Java 对象映射 |
| Lombok POJO | not-applicable | 没有 Java POJO |
| Alibaba Java、ORM/MyBatis、Maven、注解处理器 | not-applicable | 改动不是 Java 工程，无对应机器检查 |
| 根 ./mvnw 后端构建 / OpenAPI / CI / Release | not-applicable | 验证为 Node CLI，执行 pnpm；npm pack 是授权分发格式验收 |
| 持久化中文文档 | not-applicable（后端专项） | 无后端文档；本审查及新增设计说明使用中文 |
| 业务类型 / 字段 / OpenAPI property 对齐 CONTEXT | not-applicable | 未增加业务实体、DTO 或 API property |
| Build Architecture Checklist | not-applicable | 无产品后端构建合同 |
| 后端 smoke / Controller 内部 DTO / BeanUtils / InMemoryGateway 压力场景 | not-applicable | 本候选没有 apps/backend 或 Java 文件 |

## YSS 前端门禁审查

| 检查项 | 结论 | 原因 |
|---|---|---|
| yss-ui YTable / YTree / YFormily 组件路由 | not-applicable | 无前端组件或页面 |
| yss-ui-business-page-generation 页面编排 | not-applicable | 无 Vue 页面 |
| required_skills Formily / 表格 / 树 / 高度 / 主题 / API | not-applicable | 无产品前端 Slice |
| 前端 pnpm 工程验证与还原证据 | not-applicable | Node CLI 使用 pnpm，但并非 UI 工程验收 |
| pnpm lint / type-check | not-applicable | 本候选 package.json 无 lint/type-check 脚本；存在的 test 已有结果 |
| 前端 smoke / UI fidelity / 原型状态矩阵 | not-applicable | 无 apps/frontend、视觉或交互界面变化 |

## 机器检查与证据

| 命令 | 退出码 | 时间 / 来源 | 结论 |
|---|---|---|---|
| pnpm --dir .template-source/cli-core test | 0 | 2026-09-07T02:32:54.462Z，上游任务包与本目录 core-test.log；12 tests / 12 pass | pass（不覆盖 S1） |
| scripts/verify-template-fast | 0 | 上游执行记录，/tmp/yss-dedicated-root-fast.log 末尾确认 fast 通过 | pass |
| git diff --check | 0 | 上游候选机器检查声明 | pass |
| 固定提交导出后的公开 CLI 中断恢复反例 | 0 | 2026-09-07 本审查实际运行，结果表见 S1 | 检出 violation |

本报告没有修改实现、Git 提交/推送或合同审批。原合同内修复后须重新冻结摘要并全轴复核；整项结果仍由主控裁决。

## workflow-execution-result-v1

```json
{
  "schema": "workflow-execution-result-v1",
  "task_id": "dedicated-cli-core-standards",
  "actor_id": "reviewer.dedicated-cli-standards",
  "role_id": "role.test-engineer",
  "runtime_id": "runtime.generic",
  "execution_state": "Reviewer",
  "contract_id": "dedicated-harness-cli-v1",
  "contract_version": 1,
  "candidate_snapshot_ref": "7b2c35411c877b80e606f387a3175d42063441e7",
  "candidate_digest": "6458dff5080dd25d54279deb3d7da07ae820845a",
  "status": "changes-requested",
  "findings": [{"id":"S1","priority":1,"classification":"violation","axis":"Standards","file":".template-source/cli-core/engine.mjs","line":16}],
  "changed_files": [".template-source/evidence/maintenance/dedicated-cli-implementation-2026-09-07/standards-core-review.md"],
  "evidence_files": [".template-source/evidence/maintenance/dedicated-cli-implementation-2026-09-07/standards-core-review.md"],
  "new_impacts": [],
  "drift": [],
  "seam_deferred": [],
  "next_action": "原合同路径修复 S1，捕获新候选并重跑独立轴审查与 fresh verification"
}
```
