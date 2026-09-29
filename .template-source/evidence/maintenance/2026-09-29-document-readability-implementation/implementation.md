# 文档阅读优化实施记录

工作分支：codex/document-readability；隔离 worktree 基于 e1503a536b92b3e0a74182632f0690cc5601de62。主工作区和 dataingest 示例保持只读；本次没有 Git 提交、推送或发布。

## 已实现

- 首批四类中文 Markdown、可选来源索引、稳定 ID 差异；旧 JSON 接口与 Slice 布局兼容。
- 显式 plan-enable/apply-enable、人工导航保护、生成清单、源/schema/代码/输出漂移检查。
- 排他锁、逐文件替换与最后写 manifest、异常回滚和进程中断恢复；只恢复本轮仍匹配的派生字节。
- 源事务提交后生成，阅读失败单独返回；正式准备与流转读取检查，生命周期状态查询保持只读。
- 三个专职模板以共享工具和 wire schema 接入，不添加阶段设计或执行权限。四个 CLI 使用工作树快照做开发验证。

## 边界

P3 完成候选评估，暂不进行 schema 升级，见 structure-assessment.md。P4 已有固定材料与答案/计时记录框架，用户回复“是的”仅为试验确认，不是实测数据。尚不能判定阅读速度提升；新实例保持 manual，P5 生命周期扩面待试验结果。

本次变更触发 generation-semantics、cross-repo-contract、core-validator，按 L3 自检。模板源不适用业务 Context 对账与产品 Ticket，理由是本次只维护工具、治理和分发。采用公开 CLI/API 边界的行为回归；文档与确定性投影不用额外模拟业务 TDD。

完整门禁与主 CLI 的发布检查要求 committed 来源；在未获提交授权的工作树上保持失败边界，不把 working-tree 改写为 committed。验证日志和实际打包初始化结果在 verification-summary.json 登记。

## 本轮验证结果

- 相关公开行为回归：51/51 通过。
- 主 CLI：201/202 通过；唯一失败为发布准备要求 committed 来源，当前保持 working-tree。
- 最小实例与按需分发回归：11/11 通过。
- 三专职模板的流转、Skill 治理、共享工具锁检查均通过；四 CLI 的本地 tarball 安装、真实初始化、显式启用、幂等与人工导航保留均通过。
- 完整模板验证：98 个已执行检查记录，1 个失败；input_drift=false。失败和跳过项逐条记录在 verification-summary.json；被正式门禁截断的框架 postchecks 已单独运行并通过，未据此绕过正式门禁。

命令及日志以 [验证汇总](verification-summary.json) 为准。没有基于测试代填人工阅读答案，未切换默认策略，未进行发布。

## 示例与后续验收

对 dataingest 三份原始资产重新进行只读预览，前后字节摘要一致，见 [示例读取记录](sample-readonly.json)。domain-strategy 预览成功；stage-decision-package 与 checkpoint 仍报告来源校验问题，预览不替代资产修复或批准。

- [真实领域策略阅读预览](/Users/zhudaoming/.codex/tmp/document-readability-20260929/sample-previews/domain-strategy.md)
- [六题人工阅读试验](reading-trial/trial.md)：仍需参与者姓名或角色、每题答案及实际用时；收到数据后才能判断是否默认启用及推进 P5。
- Git 提交、合并与发布未执行。正式候选需在获授权提交并同步固定来源后重新验证；本轮结果不替代该验证。
