# 专职 CLI 核心 Standards 修复复审

结论：本固定候选的 Standards 轴未发现未关闭的规范违反；原 S1 已通过公开 CLI 反例复测。不批准合同，不裁决整体实施完成或发布。

## 固定候选与范围

- `review_mode`: committed
- `review_base_ref` / `merge_base`: `5eb824d776dba30b4d39522a0555df87f877501b`
- `candidate_snapshot_ref`: `3215ea7b31a2dc0efa73ec76849c08ed7eb32a5f`
- `candidate_digest`: `5954297c4ae15d5c7a713bad46c27ad4bb06bd5b`
- 输入：`core-fix-review-candidate.json`、`standards-core-fix-task.json`，任务包唯一允许写本报告。
- 完整范围：`git diff 5eb824d776dba30b4d39522a0555df87f877501b...3215ea7b31a2dc0efa73ec76849c08ed7eb32a5f`。提交列表为 `7b2c354 feat(cli): add dedicated Harness CLI core and confirmed design`、`3215ea7 fix(cli): preflight recovery boundaries and normalize update paths`。
- 已实际核验 commit tree、merge-base 和 diff --check。消费固定提交源码；原审阅未变文件与修复差异组成完整核心候选，不把活动工作树作为候选。
- 覆盖共享核心及薄包生成器 A–E；来源模板、真实薄包/tgz、F 生态兼容由主控随后验收，不在本轴结论内。
- 标准源沿用首轮已经读取的根 `AGENTS.md`、`CONTEXT.md`、tdd 技能及 tests/mocking、cross-repo-implementation-routing、yss-review-standards、review-report-template 和已确认设计 v1.1.0；这些标准未随修复改变。根无 CODING_STANDARDS.md / CONTRIBUTING.md。

## S1 修复核验

`engine.mjs` 的 pending 恢复现在先调用 `recoveryIdentity`；身份校验允许可解释的半初始化状态，但拒绝旧 metadata、foreign/mixed/矛盾身份，并将已有身份字节与事务前后描述比较。`recover` 在触碰 stale lock 前预检全部已尝试目标、必要备份和创建目录；实际恢复每条路径再次验证 gitlink / 嵌套仓边界。自动失败回滚也使用路径保护。

独立复测使用 `git show 3215ea7:<path>` 导出的完整固定核心及其离线包 fixture，在临时目录通过公开 CLI 和 fs 系统边界注入 SIGKILL；没有改候选实现。2026-09-07T02:46:56.402737Z 开始运行。

| 场景 | 结果 | 判定 |
|---|---|---|
| sync 在 docs/new.md 写入后中断，随后新增 docs/.git，再 sync --apply | exit 1，PROTECTED，docs/new.md 仍存在 | 原反例已关闭 |
| 同上，随后把本家族 metadata 改为 schema_version:1 旧格式 | exit 1，LEGACY，docs/new.md 仍存在 | 原反例已关闭 |
| init 在 docs/new.md 写入后中断，尚无 metadata，再 sync --apply | exit 0，recovered，新增文件已撤回 | 合法半初始化仍可恢复 |
| 新增套件四种恢复输入：旧身份、嵌套仓、声明 gitlink、损坏备份 | 均 exit 1，目标整树字节/mode 未变化 | 拒绝路径零写入 |

独立反例脚本退出码 0；临时文件已清理。原报告是旧摘要的历史记录，S1 只在本新摘要下关闭。

## Standards 其他核验

| 项目 | 结论 | 证据 / 原因 |
|---|---|---|
| template-source / L3 / Harness-only / release-only 路由 | pass | 固定 routing 登记工程、分支、回滚点、CI 和验证边界；没有生成产品资产 |
| 公共核心单一事实来源与生成物 | pass | core 权威目录与 vendor 同步模式保持；未手改 Skill 投影 |
| 测试 seam 和 mock | pass | CLI 退出码/JSON/目标树为已确认 seam；新增 fs 故障与 npm 安装识别测试在系统边界注入 |
| 历史 RED→GREEN 顺序 | 本报告不追认 | 单一固定提交不能单独证明历史顺序；本报告只记录实际独立 GREEN 与反例验证 |
| 原 S1 的身份、gitlink、嵌套仓和备份边界 | pass | 固定提交独立复测与 15 场景套件结果 |
| 全局 update 路径与尾斜杠 | pass | packageRoot/npm prefix 经 path.resolve；公开入口测试确认 global 计划使用 -g |
| metadata 重复字段拒绝 | pass | JSON 格式解析之后由可信 YAML parser 检查 uniqueKeys；重复 schema 字段测试拒绝且零写入 |
| 生成包许可证声明 | pass | 沿用既有 CLI 的 UNLICENSED；第三方 NOTICE 与许可证保留，没有无依据授予新的 MIT 许可 |
| 产品 Slice / required_skills / Build Architecture Checklist | not-applicable | Node 模板工具，不是产品前后端切片 |
| 实际 tgz、五家族矩阵、源模板退役 | not-applicable | 本候选明确不包含后续薄包和生态验收；本结论不能代替这些证据 |

## Fowler 判断项

没有新增气味 finding。修复将恢复身份与路径检查集中为明确函数，未要求额外抽象或架构变化；保持仓库标准高于气味判断。

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

| 命令 | 退出码 | 时间 / 执行来源 | 结果 |
|---|---|---|---|
| `git diff --check 5eb824d...3215ea7` | 0 | 本次独立执行 | 无空白错误 |
| `pnpm --dir <固定提交导出的临时目录>/.template-source/cli-core test` | 0 | 2026-09-07T02:46:56.402737Z 开始，本次独立执行 | 15 tests，15 pass，0 fail，27214.172583ms |
| 固定提交公开 CLI 原反例及半初始化恢复 | 0 | 同次独立执行 | 两拒绝场景保留文件；合法恢复成功 |
| 上游 `pnpm --dir .template-source/cli-core test` | 0 | `core-fix-test.txt` | 上游 15 场景记录；不依赖复制的旧任务包时间证明本次新鲜度 |
| `scripts/verify-template-fast` | 0 | 首轮上游证据 `/tmp/yss-dedicated-root-fast.log` | 属修复前证据，不冒充本新候选最终 full verification |

本轴没有新 `violation` / `drift` / `new_impacts`。根完整验证、真实薄包分发及整体验收由主控继续进行；本报告不是可发布结论。

## workflow-execution-result-v1

```json
{
  "schema": "workflow-execution-result-v1",
  "task_id": "dedicated-cli-core-standards-fix",
  "actor_id": "reviewer.dedicated-cli-standards",
  "role_id": "role.test-engineer",
  "runtime_id": "runtime.generic",
  "execution_state": "Reviewer",
  "contract_id": "dedicated-harness-cli-v1",
  "contract_version": 1,
  "candidate_snapshot_ref": "3215ea7b31a2dc0efa73ec76849c08ed7eb32a5f",
  "candidate_digest": "5954297c4ae15d5c7a713bad46c27ad4bb06bd5b",
  "status": "reviewed",
  "axis_result": "pass",
  "findings": [],
  "resolved_findings": ["S1"],
  "changed_files": [".template-source/evidence/maintenance/dedicated-cli-implementation-2026-09-07/standards-core-fix-review.md"],
  "evidence_files": [".template-source/evidence/maintenance/dedicated-cli-implementation-2026-09-07/standards-core-fix-review.md"],
  "new_impacts": [],
  "drift": [],
  "seam_deferred": [],
  "next_action": "交主控汇总同摘要的 Spec 轴及后续真实包、模板生态和 fresh verification 证据"
}
```
