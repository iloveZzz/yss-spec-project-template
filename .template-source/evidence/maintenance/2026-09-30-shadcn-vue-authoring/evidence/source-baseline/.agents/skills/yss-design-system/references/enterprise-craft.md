# 企业后台设计方法与示例

在已有 `DESIGN.md` 与当前行为合同内改善层级、密度和反馈。本参考不定义新的 Token、组件 API、业务规则或评分门禁。

## 三个判断

1. 主任务能否直接定位？首屏呈现当前任务、关键数据及主操作；辅助说明不与主操作竞争。
2. 数据、动作与说明的权重是否合适？用项目已有排版、间距、分组和表面角色组织信息；密集不等于挤压所有间距，清晰不等于无限增加留白。
3. 状态是否说明原因和下一步？错误靠近受影响内容，阻断和权限用明确文本，失败保留输入并说明恢复途径。装饰与动效不得延迟高频操作。

先生成完整页面，再同批检查桌面与窄屏，集中修整并复验受影响场景。记录 visual/layout/interaction/content/accessibility/cross-platform 原有六轴中的发现。预算是停止继续迭代的条件，不是通过条件；关键缺陷仍阻断。代码扫描、画面观察与真实用户证据分别报告。

局部修改先核对设计输入中的保持项：在相同视口与状态对照原页面的区域、字段顺序和操作位置。可读性修复不能顺带重排被要求保持的布局；若确有必要，先记录范围变化并按既有用户决定协议处理。该核对属于现有 layout/interaction QA，不新增评审门禁。

## 可运行示例

`assets/enterprise-craft/index.html` 提供查询列表、表单详情、审批异常三组前后对照，直接打开即可运行。它从当前仓库的派生 CSS 读取 Token；需要脱离仓库携带时运行：

```bash
node .agents/skills/yss-design-system/scripts/export-craft-examples.mjs --project-root <项目根> --output <新的空目录>
```

导出器复制当前项目 Token 并绑定 `DESIGN.md` 摘要。两侧共享数据、场景和交互实现；差异仅在内容组织、层级及反馈位置。示例使用虚构资料和固定失败/权限/冲突场景，不代表产品需求、已批准原型或生产组件能力。窄屏与键盘交互也需要实际检查。

观察重点：列表中查询/重置与业务主操作的分区；表单中字段分组和错误定位；审批中待处理项、阻断原因、恢复动作的关联。对照前态刻意保留层级问题，仅供教学，不是可复用的推荐模板。

## 来源与边界

方法参考 Impeccable [Operate](https://github.com/pbakaus/impeccable/blob/114ea1d3838fca73b253af45f873b9c4f5f213c8/.github/skills/impeccable/reference/operate.md)（Apache-2.0）与 [Interface Design](https://github.com/Dammyjay93/interface-design/blob/2f9be3206855bcb2d1d0af262c8bae25cba6658d/.claude/skills/interface-design/SKILL.md)（MIT）。示例为本项目独立编写；不复制外部字体/数值默认值，不引入第二份设计系统或第二套 QA。

## 从观察到任务模式

需要完整交互时，按需读取 `yss-prototype-stage/references/business-patterns.md`：查询层级对应查询详情，字段分组对应分步表单，阻断与恢复对应审批及冲突模式。窄屏检查必须实际定位并操作按钮；无整体溢出不能证明操作可发现。高密度分析保留必要表格时，同时提供可键盘滚动的区域和稳定的资料定位入口。
