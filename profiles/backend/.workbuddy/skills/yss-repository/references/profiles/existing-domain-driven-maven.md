# existing-domain-driven-maven

读取既有 DDD 工程的源码、POM 模块、接口和调用方确定职责与落点；单模块中的包也可以承担不同职责。不要求登记、观测 Manifest 或生成目录，沿用实际包名与类名。

领域聚合经 Domain Gateway，展示读模型经 Application Query Port；Infrastructure 只实现已有端口。

遵守主 Skill 的数据映射、白名单、参数绑定和持久化往返规则；业务事务归实际用例层。Mapper 能力按 yss-mybatis 当前平台证据选择。无分页/批量需求不建空实现。职责不明确时继续调查实际调用；改变端口、数据或架构时同步相关设计和调用方，缺关键业务决定才询问。
