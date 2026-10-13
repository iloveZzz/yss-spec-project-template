---
name: prototype
description: Build a throwaway backend logic experiment to test a state model, algorithm, or interface assumption; use before committing to an implementation design.
---

# 后端技术试验

用于回答一个明确的后端技术问题，例如状态转换是否完备、算法行为是否符合预期、接口方案能否覆盖关键输入。保留 `ask-matt` 与 `wayfinder` 的 `/prototype` 调用，但不构建产品页面、视觉设计或 H1/H2 产品原型。

## 输入与执行

1. 写明待验证假设、已批准业务规则、代表性成功/失败输入和判定标准。若需要修改业务规则，先回交其权威方。
2. 使用当前获准的试验路径，明确标注 throwaway。优先独立脚本、内存模型或现有测试工具；不得自动写入生产实现路径或接通真实外部副作用。
3. 用最小模型重现状态、算法或接口行为，输出输入、状态变化、结果与限制。需要数据库时使用明确登记的临时环境。
4. 实际运行成功、失败和边界案例，保留命令与退出码；运行后记录假设成立、被否定或仍不确定，以及剩余风险。
5. 回交当前设计或技术决策工作单元。正式代码仍须当前已批准的 Slice Implementation Contract、适用 TDD 与实现验证；试验通过不能自行升级状态或放行实现。

## 边界

- 这是维护/专项入口，非默认生产实现技能，不要求页面或可视化 UI。
- 试验记录引用权威 Spec、接口与业务词汇，不产生第二套业务规则。
- 不把试验直接合入生产，不自动提交、推送或发布；清理与保留范围随当前任务交接。
