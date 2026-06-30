---
name: yss-ddd-scaffold-generator
description: 用于生成完整的 YSS DDD 多模块后端脚手架。当用户要求从零创建符合 YSS 规范的 Domain、Application、Infrastructure、Adapter、Bootstrap 工程骨架时调用。
---

# yss-ddd-scaffold-generator

这是一个脚手架生成型 skill。优先运行脚本和模板，不要手工拼装整套多模块工程。

在产品生命周期中，本 skill 属于 Engineering Baseline / YSS DDD Review 阶段：用于从零创建后端服务骨架，或为架构设计提供标准模块边界输入。它不是业务实现阶段的替代品。

## 何时使用

- 用户要求从零创建新的 YSS 后端服务。
- 用户要求一次性生成完整多模块工程骨架。
- 用户需要标准的 Domain、Application、Infrastructure、Adapter、Bootstrap 目录和基础模板。

## 不适用

- 只补单个领域模型时，优先 `yss-domain`。
- 只补持久层时，优先 `yss-db2mybatis` 或 `yss-repository`。
- 只补 Web 层时，优先 `yss-web-controller`。

## 优先流程

1. 确认项目名、基础包名、输出目录、数据库类型。
2. 运行 `scripts/generate_scaffold.py` 生成骨架。
3. 检查生成的模块名、POM、配置文件和包路径。
4. 如需继续细化，再追加其他 YSS skill 补全领域、仓储和 Web。

## 推荐命令

```bash
python3 scripts/generate_scaffold.py \
  --project-name my-service \
  --base-package com.yss.myservice \
  --output-dir ./output \
  --database mysql
```

## 生成结果应包含

- 父工程 POM
- `*-domain`
- `*-application`
- `*-infrastructure`
- `*-adapter`
- `*-bootstrap`
- 基础配置、模板代码、构建脚本

## 使用约束

- 先生成骨架，再做业务化定制，不要直接把脚手架当最终代码交付。
- 若仓库已经存在相同工程，先核对覆盖范围。
- 不要在 skill 里硬编码用户业务字段或真实连接信息。
- 生成后要检查依赖关系是否仍符合分层约束。
- 生成后必须继续使用 `yss-backend-scaffold-parent` 校验工程基线，再按垂直切片加载 `yss-domain`、`yss-repository`、`yss-web-controller` 等局部技能。
- 涉及 API 契约时，先确认 `docs/api/specs/` 中的 OpenAPI Draft / Freeze 状态；不要用脚手架生成结果反向替代产品契约设计。

## 按需读取

- 主脚本：`scripts/generate_scaffold.py`
- 模板目录：`assets/templates/`
- 分层细化参考：`references/yss-backend-scaffold-parent/` 及其子 skill
