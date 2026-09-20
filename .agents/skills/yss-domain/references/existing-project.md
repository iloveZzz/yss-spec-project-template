# 既有领域工程

只对 `existing-domain-driven-maven` 或登记为 DDD 的只读盘点范围应用领域语义。读取实际 build unit、role_paths、source roots 与工程基线；不要求 target 模块名、Entity 后缀或生成 Manifest。创建/重建、不变量、端口所有权和技术依赖边界仍按 domain-layer-guide 检查。MVC 不创建聚合或 Gateway。

只读审计允许缺设计资产，但记录 missing_evidence。修改消费当前批准 Slice 和已确认行为 seam；不得从历史代码伪造业务规则批准。新增聚合、改变一致性或架构身份回设计与合同编译器。
