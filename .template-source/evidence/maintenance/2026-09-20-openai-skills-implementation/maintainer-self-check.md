# 维护者自检记录

维护强度按当前 maintenance-intensity.yaml 计算为 L3：permission-boundary、ticket-state、cross-repo-contract、core-validator。计算证据为 intensity-check.json；本记录是实施者自检，不冒充独立审查或业务批准。

- 117 项审计身份保持：25 项 P1、50 项 P2 全部有逐项处理说明、来源路径、实际差异和回滚范围；42 项保留技能没有职责性重写。通用 preflight 的消费同步及 llm-wiki 失效链接修复单独列入 retained-skill-accounting.json。
- 四个技能源遵循 canonical 与平台包所有权。共享投影由脚本生成；合法 profile 职责用 patch/local_only 保存；四个战略公共技能仍由战略源仓向父模板集成。
- 每个实际入口已分类，活跃 excluded、未分类相同副本、平台包漏登记、引用缺失、patch 漂移与脏文件覆盖均受检查约束。第二次同步无差异。
- 显式兼容入口继续禁止隐式调用；15 份实际 openai.yaml 元数据已验证。资产和状态由当前合同及主控持有，未引入数字人替代批准。
- 后端平台选择不改变 compatibility 清单、业务 API 或 Slice schema。历史 AuditLog assets 仅标明适用平台；当前源码与批准合同仍为准。
- 本地文档转换、inline 分析、静态原型与云端/交互交付分开。平台工具的生成提示和计划也同步修正；没有调用真实外部发布、上传或安装。
- 295 个入口 frontmatter 均可读，实际入口 Markdown 本地链接全部可解析。检查未声称递归审计每个第三方资产或全部外部链接。
- 八仓 HEAD 未变化，diff --check 通过。原有未跟踪证据仍保留；仅本轮 source、生成投影、锁、受影响分发快照和新维护证据被修改。
- 冲突、平台、状态、输出模式等真实行为结果独立保留在 agent-evaluations；自动断言不等于完整语义审阅。基线评分修正保留原始结果，未重跑挑选成功样本。
- 全量模板检查的战略 upstream hash 阻断保留。没有更新来源 SHA 来伪装已提交，也没有签发 release-ready 或把本地开发快照当作固定版本交付。固定来源动作见 fixed-source-delivery.md。

复盘：跨仓同步只更新正文而不更新消费锁，会造成 effectiveHash 过期；正文优化若漏查 helper 产物，旧工具名和默认共享范围仍可能回流。为此补充了实际入口覆盖、planned-tree 引用验证、输出计划反例，以及维护说明中的“投影→锁→稳定快照→测试”顺序。快照重建与读取同一快照的测试不应并发；两次受输入竞争影响的失败保留在 verification-input-races.json，稳定输入下重新验证。
