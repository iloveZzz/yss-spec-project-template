# 领域战略审阅 · domain-strategy.supplier-admission

版本：v2；权威文件：strategy.yaml

来源 SHA-256：sha256:61670fa062e780de9e175f200c475281d27416a9494c61f9dfeaae6d5b24a782

本页为来源快照；当前有效性需重新检查。批准有效性未核验；本视图不授予执行权限。

检查范围：可读取；结构校验

## 业务责任区

- **第 1 项**：
  - **context\_id**：SupplierManagement
  - **名称**：供应商管理
  - **负责事项**：
    - 供应商申请、资料生命周期
  - **不负责事项**：
    - 合规决定、采购订单
  - **subdomain\_type**：Supporting Subdomain
  - **负责人**：requirements-manager
  - **声明状态**：confirmed
- **第 2 项**：
  - **context\_id**：ComplianceReview
  - **名称**：合规审查
  - **负责事项**：
    - 资质审查、准入决定、有效期
  - **不负责事项**：
    - 供应商主档、采购订单
  - **subdomain\_type**：Core Domain
  - **负责人**：product-manager
  - **声明状态**：confirmed
- **第 3 项**：
  - **context\_id**：ProcurementExecution
  - **名称**：采购执行
  - **负责事项**：
    - 采购选择、采购订单履行
  - **不负责事项**：
    - 合规规则、供应商申请
  - **subdomain\_type**：Supporting Subdomain
  - **负责人**：project-manager
  - **声明状态**：confirmed

## 业务板块

- **第 1 项**：
  - **subdomain\_id**：subdomain.supplier-management
  - **名称**：Supplier Management
  - **类型**：Supporting Subdomain
  - **依据**：管理申请与资料生命周期，不承载差异化合规决策。
  - **证据来源**：
    - evidence.discovery.supplier
- **第 2 项**：
  - **subdomain\_id**：subdomain.compliance-review
  - **名称**：Compliance Review
  - **类型**：Core Domain
  - **依据**：核心价值候选是企业自有的合规判断和风险规则。
  - **证据来源**：
    - evidence.discovery.compliance

## 协作与交接关系

- **第 1 项**：
  - **relationship\_id**：relationship.supplier-to-compliance
  - **from\_context**：SupplierManagement
  - **to\_context**：ComplianceReview
  - **relationship\_pattern**：Customer/Supplier
  - **规则提供方**：SupplierManagement
  - **规则使用方**：ComplianceReview
  - **业务决策权**：SupplierManagement owns applicant facts
  - **模型变更影响**：applicant schema changes require review adaptation
  - **信息方向**：SubmitSupplierForComplianceReview command
  - **口径转换负责人**：ComplianceReview ACL
  - **方向说明**：申请资料由 SupplierManagement 拥有，但技术请求方向不代表合规规则所有权。
- **第 2 项**：
  - **relationship\_id**：relationship.compliance-to-procurement
  - **from\_context**：ComplianceReview
  - **to\_context**：ProcurementExecution
  - **relationship\_pattern**：Published Language
  - **规则提供方**：ComplianceReview
  - **规则使用方**：ProcurementExecution
  - **业务决策权**：ComplianceReview owns admission validity
  - **模型变更影响**：decision validity changes invalidate procurement acceptance
  - **信息方向**：admission decision events
  - **口径转换负责人**：ProcurementExecution local projection
  - **方向说明**：合规决定是语义上游；采购侧可通过事件接收并在下单时实时校验。

## 业务场景

- **第 1 项**：
  - **scenario\_id**：scenario.supplier-submits
  - **actor**：supplier
  - **前提条件**：
    - 供应商资料可编辑
  - **操作**：
    - SubmitSupplierApplication
  - **适用规则**：
    - 申请材料必须完整
  - **业务事件**：
    - SupplierApplicationSubmitted
  - **失败结果**：
    - 被运行计划引用时不得停用；须先解绑。
  - **责任区**：SupplierManagement
  - **消费方**：
    - ComplianceReview
  - **声明状态**：confirmed
  - **成功结果**：
    - 无引用时允许停用。
- **第 2 项**：
  - **scenario\_id**：scenario.admission-expires
  - **actor**：compliance-officer
  - **前提条件**：
    - 批准决定存在
  - **操作**：
    - EvaluateAdmissionValidity
  - **适用规则**：
    - 过期决定不得支持新采购订单
  - **业务事件**：
    - SupplierAdmissionExpired
  - **失败结果**：
    - 采购下单时资格校验失败
  - **责任区**：ComplianceReview
  - **消费方**：
    - SupplierManagement
    - ProcurementExecution
  - **声明状态**：confirmed

## 关键业务对象候选

- **第 1 项**：
  - **concept\_id**：domain-concept.admission-decision
  - **名称**：AdmissionDecision
  - **context\_id**：ComplianceReview
  - **identity\_features**：
    - decision\_id、subject\_ref、rule\_version
  - **lifecycle**：
    - proposed、approved、rejected、expired、revoked
  - **possible\_tactical\_role**：Entity candidate
  - **confidence**：high
  - **声明状态**：confirmed

## 不可违反的规则

- **第 1 项**：
  - **invariant\_id**：invariant.current-admission-required
  - **规则内容**：新采购订单必须引用当前有效的准入决定。
  - **责任区**：ComplianceReview
  - **scenario\_refs**：
    - scenario.admission-expires
  - **verification\_method**：领域场景测试和事件版本校验

## 下游传播

- **第 1 项**：
  - **domain\_change**：admission-decision-validity
  - **impacts**：
    - spec
    - openapi
    - procurement-acceptance-tests
  - **propagation**：stale
  - **reapproval\_condition**：ComplianceReview 决定和有效期重新批准

## 声明状态

draft

## schema\_version

2

## domain\_strategy\_id

domain-strategy.supplier-admission

## domain\_version

v2

## 术语来源

- **context\_ref**：CONTEXT.md
- **context\_schema\_version**：1
- **document\_digest**：sha256:0000000000000000000000000000000000000000000000000000000000000000
- **referenced\_terms\_digest**：sha256:0000000000000000000000000000000000000000000000000000000000000000
- **term\_refs**：
  - Global/Supplier
  - ComplianceReview/AdmissionDecision

## 证据来源

- evidence.discovery.supplier
- evidence.discovery.compliance

## 批准记录

- **approval\_ref**：.agents/skills/yss-stage-decision/tests/fixtures/domain-strategy-approval.yaml
- **approver**：role.product-manager
- **persisted\_ref**：docs/.scratch/supplier/domain/domain-strategy-v1.yaml
- **current\_version**：v2

## extra\_constraint

- **exception**：只有负责人可以查看密钥；运维员只能轮换。
- **threshold**：0
- **enabled**：false
