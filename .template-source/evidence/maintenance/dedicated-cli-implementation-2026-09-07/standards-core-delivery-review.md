# 专职 CLI 交付候选 Standards 独立审查

结论：本固定候选 Standards 轴 `pass`，无未关闭 finding。该结论不批准合同，不裁决整个 CLI 实施完成或可发布。

## 固定候选与范围

- `review_mode`: committed
- `review_base_ref` / `merge_base`: `5eb824d776dba30b4d39522a0555df87f877501b`
- `candidate_snapshot_ref`: `a2363847effcd1e56417dcff86e0c6967229c67f`
- `candidate_digest`: `8ecd609ff8e8f38a6d1b281f7c12fa98a2347873`
- 输入：`standards-core-delivery-task.json` 与 `core-delivery-review-candidate.json`；唯一写入本报告。
- 完整 diff：`git diff 5eb824d776dba30b4d39522a0555df87f877501b...a2363847effcd1e56417dcff86e0c6967229c67f`。
- 提交列表：`7b2c354 feat(cli): add dedicated Harness CLI core and confirmed design`、`3215ea7 fix(cli): preflight recovery boundaries and normalize update paths`、`561d878 fix(cli): isolate install roots and verify dedicated delivery instances`、`126560e fix(cli): use actual repository mode command in package smoke tests`、`26d57bb test(cli): reuse packaged instances for end-to-end delivery verification`、`c332f9f chore(skills): align unchanged design skill provenance with source revision`、`a236384 test(cli): reuse both packaged delivery instances in relay`。
- 实际核验 tree、merge-base、提交列表和 diff --check。前两次已读取的未变代码与本次完整增量构成本固定候选；测试代码由 `git show a236384:<path>` 独立导出。未以活动工作树代替候选。
- 范围：自 base 起的公共核心与薄包生成器 A–E、根执行范围 schema v2、分发验证入口、中文手册及最终接力测试适配；本次也核验 skills-lock 来源 revision 更新。来源子模板、真实薄包/tgz 和 GitHub 发布由主控另外验收；这里不声明其通过。

标准源仍为根 AGENTS.md、CONTEXT.md、tdd 技能及 tests/mocking 引用、cross-repo-implementation-routing、yss-review-standards、review-report-template 和已确认设计 v1.1.0；均已在前轮读取且没有随本次增量变化。根没有 CODING_STANDARDS.md / CONTRIBUTING.md。

## 规范核验

| 检查项 | 结论 | 证据 / 规则 |
|---|---|---|
| 原 S1：恢复必须保留身份和仓库边界 | pass | engine 在恢复前调用 recoveryIdentity；transaction 在锁变更前检查尝试目标、备份和目录，恢复期间继续检查 gitlink/嵌套仓。最终候选回归中旧身份、嵌套仓、声明 gitlink、坏备份均整树零写入拒绝 |
| CLI 安装目录保护 | pass | main 首行 path.resolve(packageRoot)，与 targetPath 的规范化绝对路径一致比较；真实 fileURLToPath 尾斜杠入口初始化包内 vendor 子目录返回失败，包树完全不变 |
| update 安装方式与降级边界 | pass | 规范化安装根/npm prefix，global 计划保留 -g；版本比较明确区分较低/相等/较高，较低版本即使 --force 也不会安装；独立套件覆盖 |
| schema v2 metadata 重复字段 | pass | JSON 解析同时使用可信 YAML parser 的 uniqueKeys 约束，重复身份字段公开 CLI 回归拒绝且零写入 |
| 根执行范围工具的身份演进 | pass（静态） | scripts/lib/harness-execution-scope.mjs 在原 legacy 分支外显式支持 metadataSchemaVersion:2，约束 profileId、templateSource、对应 cli_package，并拒绝新旧 schema 混合；仍使用既有 root profile 决定职责，不另起生命周期 |
| 原旧项目运行边界与新 CLI 拒绝接管 | pass | scope 保留旧 schema 的既有职责约束；新 CLI identity 的 LEGACY 拒绝没有放宽，两者职责不同，不等于新增旧实例迁移 |
| 根分发验证入口 | pass（静态） | .template-source/scripts/verify-delivery-harness-distribution.mjs 通过新 CLI init，核 schema v2、提交、旧入口排除、sync 预览及跨端职责约束，再调用既有接力场景验证；并未把产品部署验收混入模板验证 |
| canonical 事实源和生成物 | pass | core 权威位于 .template-source/cli-core，vendor/模板只经固定来源构建；本候选未手改 Agent 技能投影 |
| 中文文档与分发状态 | pass | 手册写首版候选、registry 状态与预览/--apply/旧实例拒绝；没有宣称已经 npm 发布 |
| TDD 公开 seam 和注入边界 | pass | 用户已确认 CLI 退出码/JSON/文件树；新增测试在真实入口及 fs/npm 系统边界，未 mock 自有内部模块 |
| RED→GREEN 历史 | 不追认 | 本报告记录独立执行结果，不从提交或 GREEN 日志推断历史顺序 |
| 工程登记及允许范围 | pass | routing 为 template-source L3 Harness-only/release-only，登记核心、模板、独立 CLI、回滚点和验证；未向产品 apps 输出代码 |
| 产品 Slice、required_skills、Build Architecture Checklist | not-applicable | 模板工具链维护，无产品 API/UI/运行时切片 |
| 实际包、源模板接力和 GitHub 发布完成 | not-applicable | 明确超出本核心候选的完成声明；主控后续形成真实分发及完整 fresh verification |

## 本次交付增量核验

相对上一候选 `561d878`，CLI 运行时字节没有变化。本次完整复核以前读取的未变核心与新增四文件差异，未把旧报告的摘要结论直接套用新候选。

| 增量 | 结论 | 证据 / 理由 |
|---|---|---|
| scaffold 的薄包测试 | pass（静态） | 使用真实计划中的 `scripts/repository-mode`，不再执行不存在的 verify-repository-mode；测试 init --dry-run 无目标写入，以及旧 metadata attach --apply --force 拒绝。实际完整初始化仍在生成 CI 的 tgz 安装步骤和主控真实包验收中，预览测试没有冒称已实际创建项目 |
| 分发测试复用已有临时实例 | pass（静态） | YSS_DEDICATED_INSTANCE_ROOT 显式选择双端 fixture；默认仍创建新实例；metadata/profile/templateCommit 核验和接力检查保留。前后端路径统一使用该根，避免混用 scratch |
| 接力夹具 profile | pass（静态） | 保存原 profile 的身份/instantiation 字段，只为场景更新 frontend_delivery，避免后续职责检查因缺身份而假失败 |
| skills-lock provenance | pass | 独立 JSON 差异确认仅七处 revision（一个 source、六个技能）更新，effectiveHash/upstreamHash 无变化；对设计源仓旧 f41c4a4 与新 5c1c982 的六个完整 Skill 目录执行 git diff --exit-code，退出码 0，确实无内容差异 |

Skill 目录比较覆盖 prototype-review、yss-antd-design、yss-antdv-next-design、yss-design-system、yss-prototype-stage、yss-stage-decision。此次未改变 Skill 内容或生成投影，不需追加业务专项 Skill 规则。根全量、实际 tgz 和源模板执行证据仍由主控闭合，静态核验不代替那些执行结果。

## Fowler 判断项

无新增气味 finding。既有标准高于气味，未因少量重复提出额外抽象或结构变更要求。

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

## 独立机器检查

实际开始时间：2026-09-07T03:08:26.962440Z。核心全部文件从固定提交导出到独立临时目录，执行后清理，未改变候选。

| 命令 / 场景 | 退出码 | 结果 |
|---|---|---|
| git diff --check 5eb824d...a236384 | 0 | 无空白错误 |
| git -C submodules/yss-harness-design-agent diff --exit-code f41c4a4 5c1c982 -- <六个 Skill 目录> | 0 | 来源技能内容未变；实际执行为两提交内容比较，不使用 merge-base |
| pnpm --dir <固定提交导出目录>/.template-source/cli-core test | 0 | 17 tests、17 pass、0 fail、20610.719667ms |
| 原 S1 的旧身份 / 嵌套仓 / 声明 gitlink / 坏备份 | 包含在上述套件 | 全部拒绝并保持目标整树字节/mode不变 |
| 真实入口向包内 vendor 子目录 init | 包含在上述套件 | 返回失败且包树不变 |
| update --force，registry 版本比当前旧 | 包含在上述套件 | status=current，无后续 npm 安装 |
| 上游核心执行记录 | 0（任务包） | core-delivery-test.txt，执行时间 2026-09-07T03:07:34.344102+00:00；另有本次独立运行 |

本报告未独立运行根完整分发/接力和真实 tgz，也未将旧 fast 日志标作最终候选 Fresh Verification。相关静态检查结论不代替主控的最终执行证据。无新 violation / drift / new_impacts。

## workflow-execution-result-v1

```json
{
  "schema": "workflow-execution-result-v1",
  "task_id": "dedicated-cli-core-standards-delivery",
  "actor_id": "reviewer.dedicated-cli-standards",
  "role_id": "role.test-engineer",
  "runtime_id": "runtime.generic",
  "execution_state": "Reviewer",
  "contract_id": "dedicated-harness-cli-v1",
  "contract_version": 1,
  "candidate_snapshot_ref": "a2363847effcd1e56417dcff86e0c6967229c67f",
  "candidate_digest": "8ecd609ff8e8f38a6d1b281f7c12fa98a2347873",
  "status": "reviewed",
  "axis_result": "pass",
  "findings": [],
  "resolved_findings": ["S1"],
  "changed_files": [".template-source/evidence/maintenance/dedicated-cli-implementation-2026-09-07/standards-core-delivery-review.md"],
  "evidence_files": [".template-source/evidence/maintenance/dedicated-cli-implementation-2026-09-07/standards-core-delivery-review.md"],
  "new_impacts": [],
  "drift": [],
  "seam_deferred": [],
  "next_action": "交主控汇总同摘要 Spec 轴，并补齐根分发、真实 tgz、子模板与完整 fresh verification 证据"
}
```
