# YSS Source Index Mapping

The refresh script maps component source path hints to skill references. These paths are relative to the detected or configured `YSS_SOURCE_ROOT`; they are not guaranteed to exist in every workspace.

中文说明：这个文件记录“哪个组件源码目录生成到哪个 skill 的引用索引”，方便你以后维护映射关系。

| Skill | Backend source path hints |
| --- | --- |
| `yss-cache` | `yss-microservice-components/yss-component-cache-parent` |
| `yss-mybatis` | `yss-microservice-components/yss-component-persistence` |
| `yss-dto` | `yss-microservice-components/yss-component-dto` |
| `yss-audit-log` | `yss-microservice-components/yss-component-audit-log` |
| `yss-excel-mvc` | `yss-microservice-components/yss-component-excel-mvc`, `yss-microservice-components/yss-component-excel-starter` |
| `yss-distributed-id` | `yss-microservice-components/yss-component-distributed-id`, `yss-microservice-components/yss-component-leaf` |
| `yss-jdbc` | `yss-microservice-components/yss-component-jdbc` |
| `yss-dictionary` | `yss-microservice-components/yss-component-dictionary-parent` |
| `yss-dir` | `yss-microservice-components/yss-component-dir-parent` |
| `yss-file` | `yss-microservice-components/yss-component-file`, `yss-microservice-components/yss-component-file-parser`, `yss-microservice-components/yss-component-filemanager-common` |
| `yss-log` | `yss-microservice-components/yss-component-log-starter` |
| `yss-liquibase` | `yss-microservice-components/yss-component-liquibase-starter` |
| `yss-resilience4j` | `yss-microservice-components/yss-component-resilience4j-starter` |
| `yss-sql-condition` | `yss-microservice-components/yss-component-sql-condition` |
| `yss-sql-tpl` | `yss-microservice-components/yss-component-sql-tpl-parent` |
| `yss-taskflow` | `yss-microservice-components/yss-component-taskflow` |
| `yss-validation` | `yss-microservice-components/yss-component-validation-engine-parent`, `yss-microservice-components/yss-component-validation-jsr303` |
| `yss-security-algorithm` | `yss-microservice-components/yss-component-security-algorithm` |
| `yss-userinfo` | `yss-microservice-components/yss-component-userinfo-starter` |
| `yss-variable` | `yss-microservice-components/yss-component-variable` |
| `yss-quality` | `yss-microservice-components/yss-component-quality-starter` |
| `yss-anti-scheduler` | `yss-microservice-components/yss-component-anti-corrosion/yss-component-anti-scheduler` |
| `yss-exception` | `yss-microservice-components/yss-component-exception` |
| `yss-mail` | `yss-microservice-components/yss-component-mail-starter` |
| `yss-filerunner` | `yss-microservice-components/yss-component-filerunner-parent` |
| `yss-valuation` | `yss-microservice-components/yss-component-valuation` |
| `yss-duckdb` | `yss-microservice-components/yss-component-duckdb` |
| `yss-mapper-dynamic` | `yss-microservice-components/yss-component-mapper-dynamic` |

Frontend docs are written to these skills:

| Skill | Frontend references |
| --- | --- |
| `yss-ui` | components, hooks, skills docs |
| `yss-components` | components docs |
| `yss-hook` | hooks docs |
| `yss-page-module-development` | components and hooks docs |
| `yss-use-table-height` | hooks docs |
| `yss-use-tree-height` | hooks docs |
