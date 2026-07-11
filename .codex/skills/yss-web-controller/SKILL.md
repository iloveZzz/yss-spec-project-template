---
name: yss-web-controller
description: 用于根据 YSS 规范生成或重构 Web Adapter Controller 层代码。当用户要求按 metadata 或领域模型生成 Controller、DTO/VO、Web Convertor，或补齐标准 CRUD 接口时调用。
---

# yss-web-controller

这是一个 Web 适配层生成型 skill。优先复用脚本 `scripts/generate_controller.py` 和模板，不手写重复 CRUD。

## 何时使用

- 用户要批量生成 Controller。
- 用户要根据 metadata 或已有 Domain Gateway 生成 `AddCmd / UpdateCmd / PageQuery / VO / Controller / WebConvertor`。
- 用户要求统一 Web Adapter 风格、返回值和接口路径。

## 不适用

- 用户只是要新增一个手写复杂接口，不一定要用脚本。
- 用户还没有稳定的领域模型或 metadata，先补 `yss-domain` 或 `yss-db2mybatis`。

## 优先流程

1. 先确认 metadata、基础包、模块名、领域 segment、domain/web 落盘目录。
2. 涉及 DTO / VO / CMD / Query POJO 样板代码时，加载并遵守 `lombok`。
3. 涉及 Domain / Application Result 到 VO / DTO 或 CMD / Query 到输入模型的转换时，加载并遵守 `mapstruct`。
4. 运行 `scripts/generate_controller.py`。
5. 生成后检查路径、命名、返回值包装、Gateway 引用、Lombok 注解和 MapStruct WebConvertor 是否对齐项目。
6. 对复杂接口做少量手工修正，不在 skill 中承诺自动覆盖全部业务逻辑。

## 推荐命令

```bash
python3 scripts/generate_controller.py \
  --metadata-file /path/metadata.json \
  --base-package com.yss.demo \
  --module-name demo \
  --domain-segment example \
  --domain-project-dir /path/demo-domain \
  --web-project-dir /path/demo-adapter/demo-web \
  --force
```

## 输出预期

- `client/dto/cmd/*AddCmd.java`
- `client/dto/cmd/*UpdateCmd.java`
- `client/dto/query/*PageQuery.java`
- `client/vo/*VO.java`
- `rest/*Controller.java`
- `rest/convertor/*WebConvertor.java`

## 约束

- 生成代码默认依赖既有 Domain Gateway，不直接穿透 Repository。
- 返回结构保持项目既有 `SingleResult`、`PageResult`、`MultiResult` 体系。
- DTO / VO / CMD / Query 默认用 Lombok 处理 getter/setter、constructor、builder 和日志样板；不要在 Controller 内部类或非约定包临时定义主要 DTO / VO。
- `WebConvertor` 默认使用 MapStruct；禁止在 Controller / Application 中大段手写字段赋值、使用 `BeanUtils.copyProperties` 或反射式通用拷贝，除非有受控例外和测试证据。
- 先跑脚本，再按项目规范做少量手调。
- 若用户只是要改单个 Controller，先看现有代码，不要盲覆盖整个目录。

## 按需读取

- 生成脚本：`scripts/generate_controller.py`
- Controller 模板：`assets/templates/Controller.java.template`
- Convertor 模板：`assets/templates/WebConvertor.java.template`
- POJO 样板代码：`lombok`
- 对象转换：`mapstruct`
