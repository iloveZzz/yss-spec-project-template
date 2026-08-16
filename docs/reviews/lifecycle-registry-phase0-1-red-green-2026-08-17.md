# 生命周期注册表 Phase 0 / Phase 1 RED / GREEN 证据

## 范围与边界

- 仓库身份：`template-source`，仅维护可复用流程资产。
- 已授权范围：Phase 0 一致性修复与 Phase 1 生命周期注册表 shadow/check；不实施运行时 state schema v2、技能注册表或跨仓发布清单。
- 受管来源：`docs/process/lifecycle-registry.yaml`；`docs/process/lifecycle-artifact-map.md` 与 `docs/process/harness-work-unit-map.md` 的标记区为派生阅读视图。

## RED：旧门禁能放过结构漂移

执行 `scripts/verify-template && ruby scripts/test-export-yss-skills.rb` 时，旧模板发布校验和公开技能导出测试均通过；这不足以证明结构一致。随后新增 `ruby scripts/test-lifecycle-registry.rb` 并在注册表、生成器和校验器尚不存在时执行，得到 1 个失败、2 个错误：

1. `AGENTS.md` 仍声称“21 个门禁”，但原生命周期地图的条件表有 23 行，且混合了门禁、产物、工作单元和证据。
2. `scripts/verify-lifecycle-registry` 与 `docs/process/lifecycle-registry.yaml` 不存在，旧发布校验没有检测它们。
3. 负向引用校验无法执行，说明不存在跨对象引用的机器约束。

压力判断：即使旧 `verify-template` 为绿、交付期限临近，也不能把“绿色”合理化为数量、对象类型或派生产物一致；不能把表格行和门禁数量视为同一事实。

独立 RED 压力测试 Agent 因会话模型切换中断，未返回可引用的只读结果；本记录不把该中断误写为通过。RED 基线改由可重放的失败测试和旧门禁绿色输出保留。

## GREEN：本轮新增的可执行约束

1. `docs/process/lifecycle-registry.yaml` 用稳定 ID 区分 `stage.*`、`gate.*`、`artifact.*`、`work-unit.*` 与 `evidence.*`。
2. `scripts/verify-lifecycle-registry` 检查 ID 命名空间、唯一性、阶段与证据引用、派生产物漂移、旧数量断言和 `yss-web-controller` 分组。
3. `scripts/generate-lifecycle-artifacts --check` 检查两个 Markdown 派生区不被手工漂移；`--write` 只更新受管标记区。
4. `scripts/test-lifecycle-registry.rb` 包含未知引用负向测试，并验证陈旧数量不得回流到入口文档。
5. `scripts/verify-template` 已接入注册表验证、派生一致性和两组回归测试。

## 本轮已执行的 GREEN 验证

```text
scripts/generate-lifecycle-artifacts --write
scripts/verify-lifecycle-registry
ruby scripts/test-lifecycle-registry.rb
scripts/sync-skills
scripts/update-skill-lock
scripts/verify-lifecycle-scenarios
ruby scripts/test-export-yss-skills.rb
git diff --check
```

结果：均通过；公开技能导出测试为 5 runs、72 assertions、0 failures。

## REFACTOR 判断

本轮不把 runtime state、Router contract 或人工批准语义迁移到 registry；`status: shadow` 明确限制该注册表只负责结构事实及派生产物校验。后续 Phase 2 才可在双读 / 单写迁移计划、兼容 fixture 和独立批准下考虑 state schema 切换。

## 独立审查回流与修订

第一次独立审查虽确认五类对象、shadow 边界和公开技能分类正确，但拒绝发布：发布 ID 没有不可变基线，JSON Schema 未实际执行，数量防回归仅匹配两个旧文本，且派生地图仍自称事实源。

修订如下：

1. 新增 `docs/process/lifecycle-registry-baseline.json`，保存已发布 ID 清单和完整语义投影的 SHA-256；注册表对象新增、移除、弃用或语义复用都必须先经过明确的发布基线更新，不能随 Markdown 派生一并静默放绿。
2. `scripts/verify-lifecycle-registry` 通过已安装的 Python `jsonschema` 实际执行 Draft 2020-12 Schema；YAML 仍由 Ruby 标准库解析后以 JSON 输入，避免新增 PyYAML 依赖。
3. 所有核心入口与两个派生视图拒绝手工声明“若干个主阶段 / 门禁 / 工作单元 / 职责点”，只引用注册表；地图改为“派生阅读视图”。
4. 测试新增两个负向场景：删除 `stage.goal` 必须因 JSON Schema 失败；篡改已发布门禁的 `trigger` 必须因语义快照失败。

修订后 fresh 执行 `scripts/verify-template`：通过；生命周期测试为 4 runs、19 assertions、0 failures，公开技能导出测试为 5 runs、72 assertions、0 failures。第二次独立审查结论记录在本文件更新后的 review 结论中。

第二次审查还发现 Ruby 的 `\b` 不能可靠识别“8 个主阶段”中的中文词边界。已将规则收紧为不依赖词边界，并把该文本加入显式正向匹配测试；用户指南改为引用生命周期注册表。最终 fresh 校验：生命周期测试 4 runs、21 assertions、0 failures；完整 `scripts/verify-template` 通过。独立审查最终针对性复核为 PASS：六处核心入口与派生视图无手工数量断言。
