# existing-domain-driven-maven

只用于 `source_kind=existing-registration` 且 `architecture_family=domain-driven` 的受支持身份。Application 责任以登记、工程基线、独立观测 manifest 与边界审查的实际 build unit/package 映射为准，不要求生成式 `application` 模块存在。

有批准的 Application 源码写路径时，按实际 use-case seam 组织领域与端口；没有该写路径且技术设计明确为 engineering-only 时，只核验 Web build unit 内的只读 orchestration seam 满足合同，不新建业务 Application、Domain、Gateway 或事务层。任何业务规则、持久化写入、新跨上下文协作或无法解释的责任映射都返回 `new_impacts` 或 `blocked`。
