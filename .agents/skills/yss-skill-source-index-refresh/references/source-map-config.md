# YSS Source Index Mapping

The refresh script maps component source path hints to two generated skill references: `source-index.boot2-java8.md` and `source-index.boot3-java17.md`. Paths are relative to the matching configured generation root and are not guaranteed to exist in every workspace.

中文说明：这个文件记录“哪个组件源码目录生成到哪个 skill 的引用索引”，方便你以后维护映射关系。

| Platform line | Source variable | Generated suffix |
| --- | --- | --- |
| `boot2-java8` | `YSS_SOURCE_ROOT_BOOT2_JAVA8` | `source-index.boot2-java8.md` |
| `boot3-java17` | `YSS_SOURCE_ROOT_BOOT3_JAVA17` | `source-index.boot3-java17.md` |

`references/source-index.md` only routes to these tracks. Refresh and freshness checks must keep the platform line and source root paired.

| Skill | Backend source path hints |
| --- | --- |
| `yss-cache` | `yss-microservice-components/yss-component-cache-parent` |
| `yss-mybatis` | `yss-microservice-components/yss-component-persistence` |
| `yss-dto` | `yss-microservice-components/yss-component-dto` |
| `yss-audit-log` | `yss-microservice-components/yss-component-audit-log` |
| `yss-excel-mvc` | Boot 2: `yss-microservice-components/yss-component-excel-mvc`, `yss-microservice-components/yss-component-excel-starter`; Boot 3: `yss-microservice-components/yss-component-excel-mvc` |
| `yss-distributed-id` | `yss-microservice-components/yss-component-distributed-id`, `yss-microservice-components/yss-component-leaf` |
| `yss-resilience4j` | `yss-microservice-components/yss-component-resilience4j-starter` |
| `yss-validation` | `yss-microservice-components/yss-component-validation-jsr303`；历史 `yss-component-validation-engine-parent` 在当前组件仓不存在，相关 EL/parser 路由保持 blocked |
| `yss-security-algorithm` | `yss-microservice-components/yss-component-security-algorithm` |
| `yss-userinfo` | `yss-microservice-components/yss-component-userinfo-starter` |
| `yss-exception` | `yss-microservice-components/yss-component-exception` |

Frontend docs are written to these skills:

| Skill | Frontend references |
| --- | --- |
| `yss-ui` | components, hooks, skills docs |
| `yss-hook` | hooks docs |
| `yss-use-table-height` | hooks docs |
| `yss-use-tree-height` | hooks docs |
