---
tracker:
  platform: local-markdown
  root: .work
  legacy_roots:
    - .scratch
    - docs/requirements/tickets
  remote_mirror: false
---

# Issue tracker: Local Markdown

实际 `.template-spec/agents/issue-tracker.md` 的 frontmatter 是权威配置。以下 `.work/` 仅是新项目示例；已有项目使用 `tracker.root`，Git remote 不改变 tracker。历史目录可只读诊断；重复资产只暂停冲突写入，不自动搬迁、合并或覆盖。

按当前需求创建文件，不预建 gates、verification 或整个生命周期目录。已有规格通常为 `<root>/<feature>/spec.md`；业务票和实现 Slice 沿用项目现有目录及 ID，多个票各有文件。普通讨论无需保存。只有用户要求保存、更新或发布到本地 tracker 时写入对应文件。

评论追加在 `## Comments`，状态变化说明原因；triage 标签映射见配置的三条默认 [标签](triage-labels.md)，已有用户映射优先。外部镜像只有获授权才更新，不改变本地权威性。

## Wayfinding

- 地图沿用 `<root>/<effort>/map.md`；子问题通常为 `issues/NN-<slug>.md`。沿用已有编号，不覆盖同名文件。
- `Type:` 保存唯一的 research/prototype/grilling/task 方法类型，恢复时读取此字段，不从正文重新分类。用户明确的本次纠正可用于本次工作，写回字段仍需授权；缺失、未知或冲突且无法消歧时只澄清相关选择。Wayfinder 的 `Status: claimed/resolved` 只是决策工作状态，与 triage 分类分别解释，不强制转换为某个交付资格。
- `Blocked by:` 使用真实路径或本地图内无歧义编号；读取每个阻塞对象的实际状态，未知状态不得当作已解决。前沿是未解决、无未解决阻塞且未被认领的子问题，按地图顺序处理。
- 仅授权认领时写 claimed；文件状态不是原子锁，写前复读并协调并发。只读任务可以分析，不先写文件。
- 解决时在授权范围追加答案、更新状态及地图决策引用。解决决策不表示业务实现完成；不自动删除旧讨论或关闭其他票。
