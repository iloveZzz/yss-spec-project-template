# 非技术规格与完整交付

读取当前目标、来源、已确认决定及既有规格；存在 Context 时沿用稳定词汇，缺失不阻断综合，不自动创建 Context、ADR 或计划。普通查询仅回答问题；局部改稿仅修订受影响范围。

事实缺口使用 `.agents/skills/yss-research/SKILL.md`，业务分析使用 `.agents/skills/yss-stage-decision/SKILL.md`，真实取舍与词义问题分别使用 `.agents/skills/grilling/SKILL.md` 和 `.agents/skills/domain-modeling/SKILL.md`。可调查事实先调查；复用有效确认，多个来源冲突不静默改范围。

## 完整产品 Spec 的三类内容

1. **完整规格**：按 `.template-spec/templates/spec-template.md` 或当前适用结构说明问题、目标、角色场景、范围、规则、权限、状态异常、非目标、业务质量约束、可观察验收、重要来源和决定。量词、数值、边界保持来源一致；未知值列未决项。
2. **原型设计**：有 UI 的需求用 `.agents/skills/yss-design-system/SKILL.md` 表达用户如何完成任务；核心场景涉及操作/状态变化时可实际操作，纯展示可交静态设计。无 UI 使用 `.agents/skills/prototype/SKILL.md` 的业务逻辑或状态原型，不虚构页面，不以文字声明“原型不适用”省略它。
3. **原型及交互说明**：规则和 AC 与页面/状态的对应、查看/运行方法、入口与退出、动作结果、校验与权限、失败/恢复、模拟范围、实际检查和未覆盖项。可与规格共用文件，不强制三个文件或额外包。

选择的是原型形式、覆盖范围和精度，不是是否交付原型。有 UI 时限定规则试验可辅助，但不替代产品 UI 原型。原型框架不是生产技术选型；技术架构、接口、数据库和实现切片留给研发。

## 综合与检查

设计发现回写同一份规则与 AC，避免第二规格。按 `.agents/skills/prototype-review/references/review-method.md` 检查实际产物及承诺路径，覆盖影响任务的成功、拒绝、边界、状态变化和恢复。静态图不证明交互，代码存在不证明运行，Agent 自检不等于真实用户研究。

缺工具时继续完成独立内容并记录具体未验证项；关键规则未定、必需原型缺失或所需验证未执行，仍是未完整交付。非关键延期项说明影响和解决条件。使用 `.agents/skills/i-have-adhd/SKILL.md` 改善表达，不改变事实。

保存/发布遵循 [tracker 操作](spec-tracker.md)。没有 tracker 时继续授权的本地或对话草稿；实际发布前确认目标与权限。按 [用户决定](user-decisions.md) 复用授权，不额外增加阶段确认。返回主规格与原型引用、实际结果及下游限制，不自动创建 PR、关闭 Issue 或启动研发。
