---
status: draft
owner: ai
---

# yss-spec 模板初始化 CLI Build Architecture Checklist

## 1. 输入资产

| 资产 | 路径 | 状态 |
|---|---|---|
| 系统架构 | 不适用 | not-applicable |
| 数据架构 | 不适用 | not-applicable |
| ADR | 不适用 | not-applicable |
| 工程基线 | [AGENTS.md](/Users/zhudaoming/Projects/yss-spec-project-template/AGENTS.md), [README.md](/Users/zhudaoming/Projects/yss-spec-project-template/README.md) | ready |
| OpenAPI Freeze | [docs/requirements/yss-spec-cli-init-prd.md](/Users/zhudaoming/Projects/yss-spec-project-template/docs/requirements/yss-spec-cli-init-prd.md) | ready |
| 系统 / 数据架构设计 | [docs/implementation/yss-spec-cli-init-routing.md](/Users/zhudaoming/Projects/yss-spec-project-template/docs/implementation/yss-spec-cli-init-routing.md) | ready |
| 安全红线 | [AGENTS.md](/Users/zhudaoming/Projects/yss-spec-project-template/AGENTS.md) | ready |

## 2. 架构约束矩阵

| constraint | source | slice | status | evidence | follow-up |
|---|---|---|---|---|---|
| CLI 源码必须与模板源仓库同版本演进，不单独拆出 frontend / backend runtime 工程 | PRD / implementation routing | #13 | `implemented` | PRD 与 routing 文档均指定 `packages/create-yss-spec/` | 若后续出现多模板平台需求，再单独评估 ADR |
| 主验证 seam 以 CLI 公开入口和输出目录行为为主，避免实现细节耦合测试 | PRD / `tdd` skill | #13 | `implemented` | PRD 测试决策、implementation routing | 如需下探，仅补充最小纯函数测试 |
| 模板维护目录不得进入模板实例仓库 | PRD / Slice #13 / Slice #15 | #13 | `implemented` | PRD 功能需求 FR-004 / FR-005 / FR-011 | 如发现误复制，停止推广并先修正规则清单 |
| 安全红线：认证 / 授权、SQL / DDL、迁移、加密、公共基础库 API 变更必须 `TODO-HUMAN-REVIEW` | `AGENTS.md` | #13 | `not-applicable` | 本切片为本地 CLI，不涉及这些范围 | 若后续接入外部平台或公共基础能力，需升级审查 |

## 3. 当前切片回勾

| 切片 | 已落实 | seam / 延期 | 漂移 | 违反 | 是否允许继续 |
|---|---|---|---|---|---|
| #13 初始化主路径生成模板实例仓库 | PRD、Issue、implementation routing 已落实 | 测试 seam 待用户确认 | 无 | 无 | 是 |

## 4. 人工审查点

| 红线 | 是否触碰 | TODO-HUMAN-REVIEW | 人审证据 | 阻断结论 |
|---|---|---|---|---|
| SQL / DDL | 否 | 否 | 不适用 | 不阻断 |
| 数据库迁移 | 否 | 否 | 不适用 | 不阻断 |
| 认证 / 授权 | 否 | 否 | 不适用 | 不阻断 |
| 审计日志 | 否 | 否 | 不适用 | 不阻断 |
| 文件上传下载 / 临时 URL | 否 | 否 | 不适用 | 不阻断 |
| 加密算法 | 否 | 否 | 不适用 | 不阻断 |

## 5. 结论

- 是否允许继续 build：允许
- 必须先修正：无
- 可延期到后续切片：`--dry-run` / `--force` / `git init` / 完整 fresh verification 记录
- fresh verification 命令：`npm test`；`printf 'Acme Spec Repo\nInvestment Research\n12 人\n<TMP>/output\n' | node packages/create-yss-spec/bin/create-yss-spec.js`；`cd packages/create-yss-spec && npm pack --dry-run`
