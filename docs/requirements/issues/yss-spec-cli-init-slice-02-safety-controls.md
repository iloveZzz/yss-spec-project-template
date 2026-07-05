# 垂直切片 Issue：安全控制 dry-run 与目录保护

## 同步信息

- 平台：GitHub
- Issue：[#14](https://github.com/iloveZzz/yss-spec-project-template/issues/14)
- 同步时间：2026-07-05 16:01:32 +0800

## 父级

- [#12 PRD: create-yss-spec 模板初始化 CLI](https://github.com/iloveZzz/yss-spec-project-template/issues/12)

## 要构建什么

在主路径已打通的前提下，为模板初始化 CLI 补齐默认安全的操作控制：`--dry-run` 预览、非空目录默认拒绝、显式 `--force` 覆盖。

本切片必须让用户能够在真正写入前预览模板处理计划，并在目录存在内容时获得 fail-closed 的保护。同时，它也要保留受控覆盖能力，确保重复初始化和本地调试场景可用。

这是一个独立可验证的纵向路径：用户通过公开 CLI 接口触发不同运行模式，系统返回可观察的命令结果、错误提示和文件系统变化。

## 覆盖的用户故事

- 5, 6, 7, 25

## OpenAPI 影响

- [x] 无
- [ ] 基于冻结 OpenAPI：`docs/api/specs/<feature>.yaml`

受影响端点：

| 方法 | 路径 | 变更 |
|---|---|---|
| 无 | 无 | 无 |

## 验收标准

- [ ] 当用户使用 `--dry-run` 执行初始化时，CLI 只展示复制、渲染、排除计划，不进行真实写入
- [ ] 当目标目录非空且未传入 `--force` 时，CLI 明确拒绝执行，并给出可理解的错误提示
- [ ] 当用户显式传入 `--force` 时，CLI 可以在受控前提下继续完成初始化
- [ ] 上述三种模式均有可重复执行的行为测试覆盖

## 测试 Seam

- 主要公共接口：CLI 端到端执行入口
- 必需测试：
  - [x] 行为 / 领域测试
  - [ ] API / 契约测试
  - [ ] UI / 组件测试
  - [x] E2E 测试

## 阻塞关系

- [#13 Slice 1: 初始化主路径生成模板实例仓库](https://github.com/iloveZzz/yss-spec-project-template/issues/13)

## AI / 人工审查点

- [x] 未触碰安全红线
- [ ] 支付逻辑：`TODO-HUMAN-REVIEW`
- [ ] 数据库迁移：`TODO-HUMAN-REVIEW`
- [ ] 认证 / 授权：`TODO-HUMAN-REVIEW`
- [ ] 加密算法：禁止实现
- [ ] 原生 SQL：仅生成草案
- [ ] 公共基础库 API：仅生成草案

## 完成定义

- [ ] `--dry-run`、非空目录保护、`--force` 覆盖行为实现完成
- [ ] 相关失败 / 预览 / 覆盖路径均有自动化验证
- [ ] 错误提示与行为结果可被最终用户理解
- [ ] 已移除临时调试 / 原型代码
