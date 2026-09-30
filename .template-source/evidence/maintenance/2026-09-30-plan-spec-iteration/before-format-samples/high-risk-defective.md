# 前版格式对照

> 虚构输入的表达兼容试验。原表字段内容全部保留在前版正文；不是历史批准或真实产品基线。

## 功能需求

| ID | 需求 | 优先级 | 备注 |
|---|---|---|---|
| FR-001 | 具有审批权限的审核员可查看本部门单据 | P0 | 来源：.template-spec/templates/examples/plan-spec/high-risk-source.md :: id:H1；验收：AC-001；未决项：无 |
| FR-002 | 撤销审批权限后的后续查看请求拒绝且不显示单据内容 | P0 | 来源：.template-spec/templates/examples/plan-spec/high-risk-source.md :: id:H2；验收：AC-002；未决项：无 |

## 非功能需求

ID：NFR-001；需求：权限撤销传播时效；适用条件/负载：；指标及单位：传播延迟 / 毫秒；目标：未知；确认状态：已确认；验证方法：；来源引用：.template-spec/templates/examples/plan-spec/high-risk-source.md :: id:H4；验收引用：AC-002；未决项：无

ID：NFR-002；需求：日志不包含单据正文；适用条件/负载：本次拒绝路径日志；指标及单位：检查：不存在单据正文；目标：日志无单据正文；确认状态：已确认；验证方法：检查拒绝日志样本；来源引用：.template-spec/templates/examples/plan-spec/high-risk-source.md :: id:H5；验收引用：AC-003；未决项：无


## 验收标准

ID：AC-001；需求引用：FR-001；前提：具有权限且单据属于本部门；触发：查看单据；可观察结果：可见单据内容；场景类型：成功；未决项：无

ID：AC-002；需求引用：FR-002, NFR-001；前提：当前服务已读到撤销后的权限状态；触发：发起后续查看；可观察结果：拒绝且不返回单据内容；传播窗口仍待确认；场景类型：拒绝 / 状态变化；未决项：Q-001

ID：AC-003；需求引用：NFR-002；前提：请求被拒绝；触发：检查该请求的日志；可观察结果：日志不存在单据正文；场景类型：拒绝；未决项：无


## 未决项

ID：Q-001；问题：权限传播延迟目标未知；采集传播记录后由负责人确认；判断依据：.template-spec/templates/examples/plan-spec/high-risk-source.md :: id:H4；冻结前补齐，不补造阈值；责任人：安全负责人（虚构角色）；解决时点：Spec 冻结前；接收方 / 解决证据：工程契约 / 待确认目标


## 原始范围与限制



不主动清除已返回客户端的历史内容。来源：.template-spec/templates/examples/plan-spec/high-risk-source.md :: id:H3。不承诺即时全局失效；当前行为候选，按既有决定协议确认。
