# 既有工程跨仓交付闭环修复

本维护工作消费当前任务中用户明确提交的 `PLEASE IMPLEMENT THIS PLAN` 及其完整方案。范围授权仅覆盖方案实施，不替代未来产品资产的当前字节批准、Git 提交/推送或发布授权。

仓库身份：template-source，schema v1。维护强度 L3。context_reconciliation：not-applicable，因为本目录只保存模板维护资产，不创建产品词汇或产品 Spec/Ticket。

## 实施合同

1. 保留生成式身份与原脚手架合同；新增既有 Java/Maven 的 DDD、layered-mvc 架构身份 v2，依据登记、工程基线、观测 manifest 三方原始引用核验。数据库声明与实库验证分离。固定输入变化失效，正常授权输出增量不使原输入自相矛盾。
2. 新增只读 `preflight-delivery --input <file> --stage prepare|build|export|accept --json`，汇总缺失、冲突、过期、不支持、依赖尚不可判断；按阶段阻断，退出码 0/1/2。不得启动服务、生成批准或修改接收状态。
3. 新增无 UI 改动的 existing-ui-baseline v1、Strategic Handoff v5、Frontend Strategic Preflight v2 / Acceptance v3；保留旧原型规则与版本。现有截图须由真实基线确认承接，不能冒充历史原型批准。
4. 恢复固定 Java 714fd4223d202b29c410d4d5533913e44874b3f1、Vue 76f2d1627f797d5b12a99c48cf49125544933b18 和隔离 PostgreSQL 样本；沿用已授权 R3 探针边界，经正常设计、审查及必要批准后实现。
5. 先真实 S0/S1，再 S2/S3a/S3b/S4/S5/S6/O1。若自洽错仓包实测误收，保留首次证据后新增本地目标授权、后端交付 v2 与收据绑定；不能先用坏包冒充场景成功。
6. 同步 canonical skills、投影、战略/后端/前端接收模板及四个现存 CLI 工作树快照；本轮自检、Fresh Verification 和真实矩阵全部满足才称完成。

## 已确认测试 seam

实现合同编译/新鲜度/执行结果；身份原始引用核验；预检 CLI；战略 export/verify/import；前端预检及接收；真实 Java 同进程身份 API、最终 JAR、数据库只读读回和 Vue 页面动作。机制测试与真实试验分别记账。

## 工作区与授权边界

原历史证据 `.template-source/evidence/maintenance/2026-09-11-oss-landscape/` 不修改。原 `.gitmodules` 暂存变更及两个旧 dev 子模块移除不改、不恢复。共享技能仅修改 `.agents/skills`，投影由工具生成。原业务工作区只读，运行时新增代码仅在已登记隔离副本。本地候选标记 working-tree 并绑定真实内容摘要，不伪称已提交版本。

## 汇合与当前状态

主控负责架构身份、跨模块集成、证据、同步与总验收；独立维护任务只写各自任务包的路径。任何子任务成功不等同整体完成。初始状态：实施中；真实接收矩阵尚未执行。需要真实新资产确认时，先准备完整可审阅资产再请求，不自签批准。
