# 垂直切片 Issue：dry-run 预演与本地改动保护

## 同步信息

- 平台：GitHub
- Issue：[#21](https://github.com/iloveZzz/yss-spec-project-template/issues/21)
- 同步时间：2026-07-05 20:47:53 +0800

## 父级

- [#18 PRD: yss-spec 模板同步 CLI](https://github.com/iloveZzz/yss-spec-project-template/issues/18)

## 要构建什么

在模板同步主路径已打通的前提下，为 `sync` 命令补齐默认安全的执行控制：支持 `--dry-run` 预演同步计划，并对本地已修改的受管文件采用 fail-closed 的跳过与提示策略。

本切片必须让用户在真正落盘前看到本次同步会处理哪些文件、跳过哪些文件、原因是什么；当受管文件已经在实例仓库中被本地修改时，CLI 不自动覆盖，而是明确报告冲突并继续保护其余安全可更新的文件。

## 覆盖的用户故事

- 13, 14, 15, 17, 18, 28

## OpenAPI 影响

- [x] 无
- [ ] 基于冻结 OpenAPI：`docs/api/specs/<feature>.yaml`

受影响端点：

| 方法 | 路径 | 变更 |
|---|---|---|
| 无 | 无 | 无 |

## 验收标准

- [ ] 当用户执行 `sync --dry-run` 时，CLI 只展示同步计划，不进行真实写入，也不更新模板元数据
- [ ] 当受管文件存在本地修改时，CLI 会将其识别为需跳过项，并给出可理解的原因提示
- [ ] 正式执行同步时，CLI 不会自动覆盖本地已修改的受管文件，但仍会继续处理安全可更新的部分
- [ ] 上述预演与保护路径具备可重复执行的 CLI 行为测试覆盖

## 测试 Seam

- 主要公共接口：CLI 端到端执行入口
- 必需测试：
  - [x] 行为 / 领域测试
  - [ ] API / 契约测试
  - [ ] UI / 组件测试
  - [x] E2E 测试

## 阻塞关系

- [#19 Slice 1: 模板元数据门禁与 sync 成功主路径](https://github.com/iloveZzz/yss-spec-project-template/issues/19)

## AI / 人工审查点

- [x] 未触碰安全红线
- [ ] 支付逻辑：`TODO-HUMAN-REVIEW`
- [ ] 数据库迁移：`TODO-HUMAN-REVIEW`
- [ ] 认证 / 授权：`TODO-HUMAN-REVIEW`
- [ ] 加密算法：禁止实现
- [ ] 原生 SQL：仅生成草案
- [ ] 公共基础库 API：仅生成草案

## 完成定义

- [ ] `--dry-run` 预演行为实现完成
- [ ] 本地已修改受管文件的跳过与提示逻辑实现完成
- [ ] 安全路径均有自动化验证
- [ ] 已移除临时调试 / 原型代码
