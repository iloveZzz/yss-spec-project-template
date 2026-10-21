# YSS Skill Execution Result

先消费生命周期 `request_triage.delivery_path` 的路由结论。政策启用的本端日常路径的技术 Skill 使用同一张 Ticket / PR 中的范围、验收、工程基线和适用技术规则；把实际修改、测试命令与退出码、独立审查、风险和回滚方式补回该记录。日常路径不生成下面的正式 Execution Result，也不调用编译器授予实现资格。测试失败、独立审查缺失或阻断问题未关闭时不得宣布完成；发现新风险时保留修改和证据，停止受影响工作并恢复完整治理。

以下结构和校验要求仅适用于已经绑定正式工作单元 / Slice 的完整治理路径。该路径的核心 YSS skill 必须消费已批准合同版本，并返回：

后端结果顶层带与当前 resolution 完全一致的 `architecture_identity`；每条验证记录还须有整数 `exit_code`。身份缺失、Profile 未 supported、验证非零或没有执行时间均不得 accepted。

以下为当前 Slice v3 的填写结构。后端身份复制当前 resolution；`project_root`、`dependency_roots` 仅按跨仓及来源解析合同填写。历史 Slice v2 使用末节所述兼容路径，不能把此示例当作自动迁移指令。

```yaml
execution_result:
  schema_version: 2
  evidence_binding_version: 1
  architecture_identity: # 后端必须与当前 resolution 完全一致
  skill:
  slice_id:
  work_unit_id:
  status: implemented
  consumed_contract:
    contract_ref:
    contract_id:
    contract_version:
    contract_digest: # 已批准 Slice 文件原始字节 SHA-256
    registry_digest:
    compiler_contract_digest:
  changed_files:
    - path:
      contract_area: common | frontend | backend | contract | cross_repo
  evidence_files:
    - path:
      digest: # 证据文件原始字节 SHA-256
      evidence_type: code | test | generated | review | verification
      behavior_ref:
  source_bindings:
    - path:
      digest: # 实际消费的来源原始字节 SHA-256；删除使用 deleted: true, digest: null
  verification_results:
    - verification_id:
      acceptance_refs: [] # 对应验证项的完整稳定验收 ID
      evidence_refs: [] # 覆盖全部关联验收及预期文件
      command:
      cwd:
      exit_code: # 实际整数退出码
      result:
      executed_at:
  constraint_results:
    - constraint_id: # 后端审查时为 canonical 稳定 ID
      applicability_basis: [] # 后端覆盖工具派生依据
      constraint:
      status: passed | failed | not-applicable
      evidence_ref:
  seam_deferred:
    - risk:
      owner:
      follow_up_ticket:
      verification_plan:
      target_version_or_release_date:
  deviations:
    - rule:
      reason:
      approval_ref:
  new_impacts:
    - impact_type:
      evidence_ref:
  not_applicable_reason:
```

允许状态：`implemented`、`seam-deferred`、`drift`、`violation`、`not-applicable`。

实现合同编译器必须验证：

1. `consumed_contract.contract_version` 与当前批准版本一致，两个 resolution digest 与批准合同一致且保持 current。
2. `changed_files` 全部位于工作单元和切片允许路径内。
3. `expected_evidence_files` 全部存在并能回指行为。
4. 验证命令包含实际结果和时间；计划命令不算证据。
5. `seam_deferred` 有风险、责任人、补齐 Ticket、验证计划和目标版本 / 发布日期。
6. `new_impacts` 非空时暂停并重路由。
7. `drift` 触发 Architecture Re-check；`violation` 阻断 build。
8. `status: not-applicable` 必须填写 `not_applicable_reason`；其他状态保留字段但可为空。

专项 skill 自报 `implemented` 不等于最终通过，生命周期编排器和独立 Reviewer 必须复核。

## Slice v3 的当前证据绑定

Execution Result 保持 schema v2，新增 `evidence_binding_version: 1`，`consumed_contract.contract_digest` 为已批准 Slice 文件的原始字节 SHA-256。每条 `verification_results` 记录唯一 `verification_id`、对应验证项的完整 `acceptance_refs`、`evidence_refs`，以及实际 `command`、`cwd`、整数 `exit_code`、`executed_at`。跨仓继续携带原有 `dependency_roots`。

每个 `evidence_files` 对象携带 `path`、原字节 `digest` 和稳定验收 ID `behavior_ref`；跨仓必须保留 `project_root`。同一文件覆盖多个验收时，分别登记各验收关联。验证记录引用的证据必须覆盖其全部验收和原合同的预期文件，不能用无关文件替换。

`source_bindings` 记录本次验证实际消费的来源：`{path, digest, project_root?}`，至少覆盖本轮 `changed_files`。已删除文件使用 `{path, deleted: true, digest: null, project_root?}` 并核对当前不存在。未声明依赖不在此检查的覆盖范围内，执行者须完整登记测试输入，交付边界仍执行 Fresh Verification。采集当前摘要不能把旧运行变成新运行；结果必须来自本次实际验证。

未写 `project_root` 时来源路径以当前工作单元的实现目录解析；显式目录必须是该工作单元或验证项登记的依赖仓库。证据文件继续遵循既有单仓 Harness 根、跨仓实现根约定。

当前验收重读合同、证据和来源字节；缺少绑定返回 `legacy-evidence-binding-missing`。历史记录可读取，不批量修改；恢复时先复验原合同与批准，再重新运行适用验证并另存结果。旧 Slice v2 仍走既有兼容路径，不自动迁移合同。

绑定检查只证明关联、覆盖与字节一致性；真实 API 行为、浏览器交互、截图与 console、业务规则仍由对应测试和专项审查判断。UI 构建通过不替代前端实现还原验证。

`verification_results` 不得为空，每项必须包含非空 `command`、`result` 和 `executed_at`。路径校验按完整目录边界判断，`apps/backend/project1-escape` 不属于 `apps/backend/project1/`；Harness 内路径还必须通过项目路径策略。完整重路由时旧合同必须标记 `stale`，新合同版本递增并保留旧合同引用、失效原因和触发器。

后端独立审查在既有 constraint_results 中消费稳定规则 ID、规则/代码/证据摘要与完整适用性集合；输入增加 scope_kind 与 standards_coverage_ref/digest。见 yss-backend-spec-review/references/standards-coverage.md。实现者结果不代替独立 code-review；历史未携带新字段的报告只读兼容。
