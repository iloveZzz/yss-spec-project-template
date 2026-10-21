# 内容规划与方案比较

用于存在信息架构、交互或视觉方向不确定性的任务。已有页面模式足够时说明依据即可，不为满足数量而探索。产物写入现有交互说明的对应章节，不另建需求、状态机或批准记录。

## 先回答问题

用一小段说明用户要完成什么、哪些必须保持、什么可以变化、哪个风险需要通过原型回答。先列内容与来源，再分配区域；标出主要/辅助信息、长中文/空值和动作结果。灰度草图也应让评审者找到主任务，不能靠颜色补救结构。

信息架构/交互比较在独立低保真评审前完成。三个候选可沿步骤组织、逐项/批量粒度、人与系统分工、入口、承诺时点形成差异；每个候选写明假设、适用情况及代价。它们都必须满足已确认业务规则，不能通过删功能或隐藏异常制造优势。高保真阶段只比较尚未确定的视觉层级与布局，行为变化返回受影响的低保真评审。

## 公平比较

- 先引用 Spec 的硬约束，再列可权衡项；不编造点击数或完成时间门槛，不看完候选后改标准。
- 保持同一任务、代表数据、状态、文案长度、保真度与制作深度。不得一个候选精修、另外两个充当陪衬。
- 原尺寸逐个查看；交互比较使用相同场景并重置。比较工具的场景声明和数据摘要不证明页面实际消费正确，必须实际操作。
- 记录可定位的观察、选择代价、落选理由、重新考虑条件。用户选择沿用现有决定记录；工具选项、Agent 推荐和截图不是批准。

例如审批工作台可以探索逐项处理、批量处理后单独处理异常、引导队列，但只有 Spec 允许这些行为时才成立。若批量处理未获需求授权，不能作为“更高效”的候选。三个同布局不同颜色的页面不算三个交互方案。

## 来源与采用边界

方法参考 Owl [parallel-concepts](https://github.com/Owl-Listener/designer-skills/blob/9a6930cf84a822eb458624bd11c61aac5bbdf224/prototyping-testing/skills/parallel-concepts/SKILL.md)、[concept-selection](https://github.com/Owl-Listener/designer-skills/blob/9a6930cf84a822eb458624bd11c61aac5bbdf224/prototyping-testing/skills/concept-selection/SKILL.md)（MIT），以及 [wireframe 内容规划](https://github.com/yhassy/wireframe-skill/blob/948d4331343b18d913d5bc502da72ed0c5f19101/wireframe-designer.md)（MIT）。独立改写方法，未复制上游实现；不采用未经验证的经验阈值。原尺寸比较参考 [Emil prototype](https://github.com/emilkowalski/skills/blob/d16ebe60d09a5ba2afcb7054ede9d0a10c9f6128/skills/prototype/SKILL.md)（MIT），不采用自动转生产或删除旧原型。

## 完整演练

需要把标准转成可执行观察时，读取 [资料审批演练](low-fidelity-exercise.md)：同一任务脚本覆盖三个组织方式及失败恢复。将观察写回现有比较表，不把教学推荐当成用户选择。
