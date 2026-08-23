# yss-antd-design L2 聚焦审查请求

> 实施者不得在本文件填写审查结论。`result=pass` 只表示本请求可被 checkpoint 校验器解析。

## 范围

新增共享技能 `yss-antd-design`，仅用于原型设计构建的 Ant Design v6 事实查询与证据落盘。`yss-prototype-stage` 继续做阶段合同。前端代码落地改走 `yss-ui`。

## 请审查

1. 发现面是否过宽：description 是否仍可能把实现任务吸进本技能。
2. 是否残留官方 `antd` skill / `antd setup` 双入口。
3. HTML 原型 `lint_applicable: not-applicable` 是否被误当成 `lint_passed: true`。
4. specialist + `instance_default_discoverable: false` 是否足够；物理投影仍会出现在各 Agent root。
5. 公开清单加入该技能是否把模板源专属约束泄漏到实例。

## 关键路径

- `.agents/skills/yss-antd-design/`
- `.agents/skills/yss-prototype-stage/SKILL.md`
- `.agents/skills/yss-ui/SKILL.md`
- `AGENTS.md` §8
- `docs/design/templates/prototype-evidence-template.yaml`
