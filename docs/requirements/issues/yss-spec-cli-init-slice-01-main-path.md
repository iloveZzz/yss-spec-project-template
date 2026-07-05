# 垂直切片 Issue：初始化主路径生成模板实例仓库

## 同步信息

- 平台：GitHub
- Issue：[#13](https://github.com/iloveZzz/yss-spec-project-template/issues/13)
- 同步时间：2026-07-05 16:01:32 +0800

## 父级

- [#12 PRD: create-yss-spec 模板初始化 CLI](https://github.com/iloveZzz/yss-spec-project-template/issues/12)

## 要构建什么

交付第一个可演示的模板初始化主路径：用户可以通过 `npm create yss-spec@latest` 对应的 CLI 入口，在一个空目录中输入最小必要参数，生成一个可用的模板实例仓库。

本切片只关注“成功路径”打通，不包含 `--dry-run`、`--force` 或复杂覆盖逻辑。它必须端到端覆盖：参数收集、模板清单识别、`render/copy/exclude` 基本执行、关键元信息文件渲染成功，以及初始化完成提示。

实现边界：CLI 源码承载在当前模板源仓库内，优先按 `packages/create-yss-spec/` 组织；本切片不引入独立实现仓库，也不生成前端 / 后端 runtime scaffold。

## 覆盖的用户故事

- 1, 2, 3, 4, 9, 11, 13, 18, 19, 20

## OpenAPI 影响

- [x] 无
- [ ] 基于冻结 OpenAPI：`docs/api/specs/<feature>.yaml`

受影响端点：

| 方法 | 路径 | 变更 |
|---|---|---|
| 无 | 无 | 无 |

## 验收标准

- [ ] 用户可以通过目标 npm create 入口启动 CLI，并被提示输入最小必要参数：`projectName`、`businessDomain`、`targetDir`
- [ ] 在空目录中执行成功后，CLI 会生成一个新的模板实例仓库，且关键元信息文件已完成项目级变量替换
- [ ] 模板维护目录不会被误复制到输出目录，输出结构可被视为一个干净的初始化结果
- [ ] CLI 在成功结束时输出完成摘要与下一步提示

## 测试 Seam

- 主要公共接口：CLI 端到端执行入口
- 必需测试：
  - [x] 行为 / 领域测试
  - [ ] API / 契约测试
  - [ ] UI / 组件测试
  - [x] E2E 测试

## 阻塞关系

- 无，可立即开始

## AI / 人工审查点

- [x] 未触碰安全红线
- [ ] 支付逻辑：`TODO-HUMAN-REVIEW`
- [ ] 数据库迁移：`TODO-HUMAN-REVIEW`
- [ ] 认证 / 授权：`TODO-HUMAN-REVIEW`
- [ ] 加密算法：禁止实现
- [ ] 原生 SQL：仅生成草案
- [ ] 公共基础库 API：仅生成草案

## 完成定义

- [ ] 端到端主路径实现完成
- [ ] 已新增最小行为测试与 E2E 验证
- [ ] 生成结果可人工检查为有效模板实例仓库
- [ ] 已移除临时调试 / 原型代码
