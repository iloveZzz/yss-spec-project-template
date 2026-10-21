# existing-domain-driven-maven

只用于 `source_kind=existing-registration` 且 `architecture_family=domain-driven` 的受支持身份。先核验登记、工程基线、独立观测 manifest 和边界审查的当前摘要，再以工程基线中的实际 build unit、source root、package 与 architecture responsibility 映射确定 Web 落点；不得要求模板模块名、数量或生成器 manifest。

Controller 只暴露冻结接口并调用合同指定的 Application 或 engineering-only orchestration seam。若批准合同将只读工程探针放在实际 Web build unit 内且没有 Application 源码写路径，保持该边界，不为满足生成式目录结构新建模块、聚合、Gateway 或业务服务。请求参数、Result 包装、错误脱敏、允许路径和真实 Maven/JAR 验证仍按共用规则执行。实际映射不清、越出登记源码根或改变业务架构时返回 `blocked`。
