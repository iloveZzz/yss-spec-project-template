# existing-domain-driven-maven

复用注册表中的既有 DDD 身份及当前工程基线、观测 Manifest、build_units/role_paths。实际源码根和端口责任决定落点，不要求生成目录、类名或脚手架 Manifest。

领域聚合经 Domain Gateway，展示读模型经 Application Query Port；Infrastructure 只实现已有端口。

遵守主 Skill 的数据映射、白名单、参数绑定和持久化往返规则；业务事务归已批准用例层。Mapper 能力按 yss-mybatis 当前平台证据选择。无分页/批量需求不建空实现。角色无法映射记录 missing_evidence；改变端口、数据或架构回合同编译器。
