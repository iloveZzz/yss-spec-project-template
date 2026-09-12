# existing-layered-mvc-maven

只用于 `source_kind=existing-registration` 且 `architecture_family=layered-mvc` 的受支持身份。以登记、工程基线、独立观测 manifest 与边界审查中的实际 build unit、source root、package 和 responsibility 映射确定 Controller/server 落点；模块名和数量可以与模板不同，不补造生成器或脚手架合同。

Controller 只调用已登记的 service/use-case seam，保持公开 DTO、私有 DTO、错误脱敏和事务责任的实际映射。批准合同若只允许现有 build unit 内的 engineering-only seam，不得为套用生成式结构新建 client/server/service 模块。映射不清、Controller 直连 Repository、越界路径或业务架构变化均返回 `blocked`。
