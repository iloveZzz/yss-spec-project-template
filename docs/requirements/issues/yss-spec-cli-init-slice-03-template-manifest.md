# 垂直切片 Issue：模板规则清单与可维护渲染策略

## 同步信息

- 平台：GitHub
- Issue：[#15](https://github.com/iloveZzz/yss-spec-project-template/issues/15)
- 同步时间：2026-07-05 16:01:32 +0800

## 父级

- [#12 PRD: create-yss-spec 模板初始化 CLI](https://github.com/iloveZzz/yss-spec-project-template/issues/12)

## 要构建什么

把模板初始化规则固化为可维护的清单驱动机制，明确哪些文件属于 `render`、哪些属于 `copy`、哪些属于 `exclude`，并让关键项目元信息与可选参数能稳定地影响输出结果。

本切片不是单做“配置文件”或“工具函数”，而是要交付一条可独立验证的用户路径：维护者更新模板清单后，CLI 能按规则生成正确结果；使用者输入可选元信息后，关键文件会表现出预期变化，同时维护目录不会污染模板实例仓库。

## 覆盖的用户故事

- 8, 14, 15, 20, 21, 22, 23

## OpenAPI 影响

- [x] 无
- [ ] 基于冻结 OpenAPI：`docs/api/specs/<feature>.yaml`

受影响端点：

| 方法 | 路径 | 变更 |
|---|---|---|
| 无 | 无 | 无 |

## 验收标准

- [ ] 系统存在一个可维护的模板规则入口，用来统一管理 `render/copy/exclude` 分类
- [ ] `teamSize`、`issueTracker`、`includeExampleDocs` 等可选输入能对输出结果产生稳定且可验证的影响
- [ ] 被标记为 `exclude` 的模板维护目录不会进入模板实例仓库
- [ ] 关键 `render` 文件中的项目级元信息替换具有自动化验证，能够覆盖典型正向场景

## 测试 Seam

- 主要公共接口：CLI 端到端执行入口
- 次级公共接口：模板规则解析与渲染决策
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

- [ ] 模板规则入口与分类策略实现完成
- [ ] 可选元信息与关键渲染结果有自动化验证
- [ ] 维护目录排除逻辑有明确证据
- [ ] 已移除临时调试 / 原型代码
