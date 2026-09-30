---
name: to-tickets
description: 显式按当前生命周期拆分 Ticket；Spec/Design 起草业务票，研发侧承接业务票细化实现 Slice。
disable-model-invocation: true
---

# To Tickets

本兼容入口仅由用户显式调用。写入前回交当前生命周期主控，核验仓库身份、当前输入、允许路径和适用门禁。`template-source` 不生成产品票；起草者不批准 Slice 合同、不设置 `ready-for-agent`。保留 mattpocock 上游来源与锁定记录，采用以下 YSS 阶段适配。

## 先确定输出类型

按 `.template-spec/process/business-tickets.md` 和当前工作单元选择一种输出；目录是否存在不决定路线。

| 当前范围 | 输出与依据 | 工程前置 |
|---|---|---|
| Spec / 产品设计 | 业务 Ticket 草案或校准；按用户行为、可验收结果、FR/AC、适用规则和场景拆分 | 不需要实现仓库、OpenAPI Freeze 或构建命令 |
| 研发 | 消费正式业务集合，细化窄垂直实现 Slice；保留业务 Ticket 和原始 FR/AC 引用 | 技术分析可起草；正式化仍需当前工程契约及仓库准备 |

独立 Design profile 只允许第一种输出，完成业务正式化后进入战略交接。全生命周期使用本地已确认资产，不导出再导入自己的包。

## 起草与校准

1. 读取已有 Spec、根 `CONTEXT.md`、当前决定、集合及相关设计。先复用稳定 ID，再根据真实范围增删或细化；不重新生成一套票。
2. 业务票用 `.template-spec/templates/business-ticket-template.md`，每票一个 `business-tickets/BT-<id>.md`。集合用 `business-ticket-set-template.yaml`，只保存引用、版本、摘要和覆盖处置。依赖表达业务前后置，禁止按 Controller / Service / Repository 分票，也不机械地一条 FR 一票。
3. Design 按页面流、状态、失败和恢复路径校准。无产品设计影响时记录依据；不生成空原型。未决项保留责任人、解决时点及是否阻断，延期遵守既有决定协议。
4. 研发输出用 `.template-spec/templates/vertical-slice-ticket-template.md`，放入 `issues/`；一个业务票可细化为多个 Slice。实现票保留 `kind: vertical-slice-ticket`、业务集合和业务票来源以及原始 AC 引用。

仅研发细化时按需查看已登记工程及 ADR。每个实现 Slice 贯通本次行为命中的技术层、可独立验证；不因模板枚举 schema / API / UI 就引入未命中的技术层。必要的机械重构按 expand → 分批迁移 → contract 排序；无法独立保持绿色的批次须明确共享集成验证边界，不能声称各批已独立完成。

## 审阅与回交

展示每票的业务结果、范围、验收、依赖与未决项，以及集合覆盖情况。按实际缺口提问；等义细化沿既有授权延续协议核验，范围、规则或验收实质变化返回原决定边界。拆分本身不增加常规人工批准节点。

业务草案运行 `scripts/verify-business-tickets <集合> --mode draft`；正式化使用 `--mode formal`，并消费已有 Spec / 适用产品设计批准及当前独立专业审查。结构检查不代替语义审查或真实批准。阶段工作项完成、业务正式化和实现就绪分别回报。

主 tracker 以 `.template-spec/agents/issue-tracker.md` 为准，不从 Git remote 猜测。配置缺失时回交主控处理，不自动调用其他显式 Skill。远程不可用或未获发布授权时保留本地待发布草案；远程发布需用户明确授权。业务票保持 `draft` / `ready-for-human`，实现票只有主控完成正式门禁和当前合同批准后才可 `ready-for-agent`。

Spec、map 与父 Ticket 引用同一集合，不复制正文。本入口回交证据及待同步内容，由主控维护父 Ticket 状态；不得自行关闭父票或宣布功能完成。
