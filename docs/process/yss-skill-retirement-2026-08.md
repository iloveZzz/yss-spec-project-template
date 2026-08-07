---
status: active
owner: yss-engineering-governance
---

# YSS 技能退役记录（2026-08）

本次在实施分支 `codex/yss-skill-optimization` 退役以下 8 个 YSS skill：

- `yss-dir`
- `yss-domain-modeling`
- `yss-file`
- `yss-filerunner`
- `yss-mail`
- `yss-mapper-dynamic`
- `yss-quality`
- `yss-variable`

## 处理结果

- 删除 `.agents/skills` 中的 `yss-domain-modeling` 权威目录及其五个共享投影。
- 删除 `.codex/skills` 中的 7 个 Codex-only 目录。
- 从 `skills-lock.json`、capability catalog、Router 合同、Router 场景验证和
  `yss-source-index` source map 中移除这些入口。
- `yss-domain-modeling` 的领域建模职责改由已有共享 `domain-modeling` 承担；
  其余退役组件没有自动替代 skill，命中时回到实现合同并由生命周期判断是否直接
  使用 runtime component。
- 外部 `yss-cloud-microservice` 未修改；runtime component 源码不因 skill 退役而删除。

退役 skill 不得通过手工复制、平台投影或锁文件参数重新引入。若未来重新封装，
必须先由 owner 复审粒度和复用价值，建立新的 RED 基线，再进入 catalog。
