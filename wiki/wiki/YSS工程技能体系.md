# YSS 工程技能体系

YSS skills 是项目内置的 YSS 工程规范技能，用于 DDD、UI、OpenAPI、Repository、Controller、DTO、组件和编码规范，与 Matt Pocock 的轻量流程技能互补（见 [[Matt技能体系]]）。

按领域划分：后端脚手架（`yss-ddd-scaffold-generator` 及 Domain / Application / Infrastructure / Web / Adapter 分层技能）、领域建模（`yss-domain`）、持久层（`yss-repository`、`yss-mybatis`、`yss-db2mybatis`）、Web 契约（`yss-web-controller`、`yss-dto`、`yss-openapi`）、前端（`yss-ui`、`yss-components`、`yss-formily`、`yss-hook`、`yss-page-module-development`）、以及横切组件（`yss-cache`、`yss-exception`、`yss-log`、`yss-userinfo`、`yss-distributed-id`、`yss-security-algorithm`、`yss-resilience4j` 等）。

技能路由纪律：核心 YSS skills 必须消费批准合同并返回 YSS Skill Execution Result（见 [[切片实现合同]]）；路径越界、证据缺失、未执行验证、`drift`、`violation` 或 `new_impacts` 阻断继续实现或触发重路由。禁止绕过合同与检查清单直接在 `AGENTS.md` 中自行发明细则。

技能治理：`yss-router` 选择最小技能集合（见 [[YSS路由与合同编译]]）；技能来源、版本、哈希与投影目标登记在 `skills-lock.json`（见 [[技能投影与锁定]]）；技能内容变更遵循 `writing-skills` 的 RED / GREEN / REFACTOR 思路（见 [[模板维护流程]]）。
