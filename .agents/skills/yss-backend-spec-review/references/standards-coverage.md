# 后端规范覆盖协议

日常开发与既有整改使用同一 `scripts/backend-standards-coverage` 和 `backend-review.mjs`。本协议只派生检查输入，规范正文由工程锁定的 canonical Skill 唯一拥有，路由仍由技能注册表管理。不得浮动使用最新 Skill 替换工程锁定版本。

## 输入与只读命令

治理 root 必须提供工程实际锁定的 canonical 技能；平台、身份与职责来自登记的工程基线。`review_input.scope_kind` 明确区分 `baseline` / `change`，不与候选 `review_mode=worktree|committed` 混用。

```sh
scripts/backend-standards-coverage --root /governance --input /evidence/review-state.json
scripts/backend-standards-coverage --root /governance --input /evidence/review-state.json --verify
```

第一条只输出派生 JSON，不写工程、不执行其构建命令、不批准合同；保存输出并绑定 `standards_coverage_ref` 与 SHA-256 `standards_coverage_digest`。第二条读取 `review_result_ref`，重算覆盖并核对已有独立审查。所有证据引用相对治理 root；`code_ref` 相对被审工程。证据放在工程源码范围外，避免报告把自身纳入摘要。

- `baseline`：输入 `project_root`、`baseline_binding: {ref,digest}`，基线复用 `architecture_identity/source.roots/build_units.role_paths`；可以无 Slice、无 diff。未登记时可输出诊断，但未知身份、未解析类型和空业务范围不能声称合规。
- `change`：保留批准 Slice、执行预检、工作单元与既有候选字段。`worktree` 从不可变候选读取 merge_base；`committed` 另给 40 位 `review_base_ref`。合同漏掉实际影响返回 drift/new_impacts，不能仅补审查输入掩盖合同缺口。
- 基线盘点包括授权工程源根中的源码、测试、XML、配置和构建文件。变更模式轻量盘点完整源码，语义审查针对变更类型与依赖闭包；配置变化扩展影响。未触及的既有证据须明确复用依赖和摘要，不能只搬历史“通过”。
- 源码扫描识别已知注解、局部组合注解和接口继承，并结合角色映射与依赖配置。它不是完整 Java 编译器：不确定的外部注解/父类型必须补 `responsibility_evidence: [{ref,digest}]`，记录 `source_ref/source_digest/roles/reason/evidence_ref/evidence_digest`。roles 使用工程角色或 `data`；证据来自真实类型、编译态 ArchUnit/运行时映射或独立核实，不能借此取消扫描已发现的职责。

`skill_assessments` 必须显式评估六类职责；`issues` 与明确结构 `findings` 均保留，不能移除后伪造派生清单。输出绑定源码 HEAD、文件摘要/mode、规则文件摘要及 Skill lock 摘要；重算不一致则旧覆盖失效。`limitations` 必须随报告保留。源码和合成夹具通过不证明 HTTP wire、数据库方言或 Java 平台认证。

## 规则所有权与结果

强制条款使用同文件内 `<a id="稳定ID"></a>` 和 `<!-- yss-rule {"id":"稳定ID","when":"适用事实","level":"mandatory","evidence":"code-and-verification"} -->` 标记原文，不复制规则正文。允许条件由工具校验；新增条件先增加检测/保守处置和反例。历史 ID 不复用为另一种语义。

继续使用 `constraint_results`，每项增加 `constraint_id` 和与派生结果一致的 `applicability_basis`，并保留 `axis/skill/constraint/status/rule_ref/rule_digest/code_ref/evidence_ref/evidence_digest`。机器重新读取所有标记，拒绝漏项、重复项、未知 ID、规则归属错误、漂移和虚假不适用。

每个适用技能额外有 `<skill>.full-text` 项：Reviewer 阅读该技能和适用 references，使用 `review_notes` 记录具体判断及证据；尚未结构化的条款在原报告列出 findings。不允许把文本长度检查当作语义合规证明。结构化规则目前只是可检查的覆盖基线，全文审查仍强制。

规则级不适用不同于技能级不适用。比如 Repository 适用而分页未命中时，相关条件规则允许 `not-applicable`，必须有理由、实际代码范围及可读证据；扫描已命中的强制规则不得豁免。无分页、事务、批量或特定组件需求时不建空实现。

## 基线报告与完成边界

独立 Reviewer 始终使用 `code-review`；baseline 结果也核对 reviewer/implementer 的不同 actor 与执行 instance，以及当前覆盖摘要。`candidate_digest` 为完整派生 inventory 的 SHA-256。机器验证含 command、exit_code、executed_at、candidate_digest 和日志摘要。

`axes.Standards=passed` 必须覆盖所有适用规则。缺业务 Spec 则 `axes.Spec=missing_evidence`；要声明 Spec passed，另提供 `spec_binding.ref/digest/approval_ref`，批准必须绑定当前 Spec，并逐验收项给证据。基线成功仅返回 `status=audited, execution_allowed=false`，绝不关闭实现到交付的流转。

历史报告可以阅读，新完成门禁要求覆盖字段；不批量伪造或升级历史审查。变更报告仍只消费已批准且当前的 Slice，并使用原候选协议。只读盘点发现违规后形成 finding 与整改计划，取得必要批准后才修改；旧 finding 不能因为重编译覆盖而被抹去。
