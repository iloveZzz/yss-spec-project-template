# 垂直切片 Issue：交付闭环 git init 与端到端验证

## 同步信息

- 平台：GitHub
- Issue：[#16](https://github.com/iloveZzz/yss-spec-project-template/issues/16)
- 同步时间：2026-07-05 16:01:32 +0800

## 父级

- [#12 PRD: create-yss-spec 模板初始化 CLI](https://github.com/iloveZzz/yss-spec-project-template/issues/12)

## 要构建什么

在主路径、规则清单和安全控制都具备后，补齐最终交付闭环：`git init` 可选执行、目标 npm create 入口收尾校验，以及面向最终使用者的端到端验证与交付说明。

本切片要交付的是“可实际推广使用”的完整体验，而不是单一内部能力。用户应能通过约定入口执行初始化，在成功后得到可继续工作的本地 Git 仓库和明确的下一步提示；维护者应能拿到覆盖关键主路径的 fresh verification 证据。

## 覆盖的用户故事

- 10, 12, 16, 17, 24

## OpenAPI 影响

- [x] 无
- [ ] 基于冻结 OpenAPI：`docs/api/specs/<feature>.yaml`

受影响端点：

| 方法 | 路径 | 变更 |
|---|---|---|
| 无 | 无 | 无 |

## 验收标准

- [ ] 用户可选择启用 `git init`，且初始化成功后目标目录表现为本地 Git 仓库
- [ ] CLI 以目标 npm create 入口完成一次完整端到端演练，并输出清晰的完成摘要与下一步建议
- [ ] 工具明确保持非目标范围：不自动安装依赖、不创建远端仓库、不初始化外部平台资源
- [ ] 存在可复用的 fresh verification 记录或命令，覆盖主路径、安全控制和模板规则关键场景

## 测试 Seam

- 主要公共接口：CLI 端到端执行入口
- 必需测试：
  - [x] 行为 / 领域测试
  - [ ] API / 契约测试
  - [ ] UI / 组件测试
  - [x] E2E 测试

## 阻塞关系

- [#14 Slice 2: 安全控制 dry-run 与目录保护](https://github.com/iloveZzz/yss-spec-project-template/issues/14)
- [#15 Slice 3: 模板规则清单与可维护渲染策略](https://github.com/iloveZzz/yss-spec-project-template/issues/15)

## AI / 人工审查点

- [x] 无高风险变更或需人工确认项
- [ ] 支付逻辑：记录验证证据和责任人
- [ ] 数据库迁移：记录验证证据和责任人
- [ ] 认证 / 授权：记录验证证据和责任人
- [ ] 加密算法：记录替代方案、验证证据和责任人
- [ ] 原生 SQL：记录验证证据和责任人
- [ ] 公共基础库 API：记录验证证据和责任人

## 完成定义

- [ ] `git init` 可选行为与最终成功提示实现完成
- [ ] 存在可重复执行的完整 E2E 验证路径
- [ ] 已明确非目标范围仍被遵守
- [ ] 已移除临时调试 / 原型代码
