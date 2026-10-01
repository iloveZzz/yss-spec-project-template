# 执行效率试点范围

用户于2026-10-01确认顺序：核验依赖和测试准备耗时、Ajv兼容对照、现有runner与Nx/moon小范围比较。验收目标：代表性日常验证中位耗时减少至少20%，试点反例无漏检，p95不回退。

模板源身份，消费根CONTEXT.md；无业务词汇变化，context_reconciliation为not-applicable。此次仅隔离实验与研究资产，L1 textual-only；不切换生产验证器、不修改权威路由、不授予框架采纳或发布。后续实际维护另按影响面判定。

源码固定为 8fc0122a9e417a91c62cfe78afc1c0cb70ca56d6；隔离Git副本与依赖位于/tmp/yss-execution-pilot-20261001。先记录工作负载与判定方法，再执行样本；不同方案执行相同真实命令。缓存命中仅代表可重用纯结果，不称Fresh Verification。

可写仓库路径仅本目录；保留上一轮研究目录。不得提交/推送/发布或更新批准。正式产物使用yss-research technical-evidence/evidence-audited，文档使用i-have-adhd。
