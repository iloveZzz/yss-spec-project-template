# existing-layered-mvc-maven

只用于 `source_kind=existing-registration` 且 `architecture_family=layered-mvc` 的受支持身份。以登记、工程基线、独立观测 manifest 和边界审查中的实际 service/core/use-case build unit、source root 与 package 映射确定 Application 责任；不得要求模板模块名、数量或生成器 manifest。

有批准的 service/core 写路径时在现有公开用例 seam 内实现编排和事务。若 engineering-only 技术设计没有对应写路径，只核验已批准的只读 orchestration seam，不制造 Domain Gateway、业务 service 或持久化层。Controller 直连 Repository、越界路径或责任无法映射时返回 `blocked`。
