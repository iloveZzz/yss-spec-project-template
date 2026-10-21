# 新建 CRUD 生成与核验

仅在新建 CRUD 且入口的批准合同、冻结 API 与稳定用例 seam 已齐备时读取。只读审计、既有整改和手工协议适配不运行初始化生成器。以下命令从 Skill 根目录执行；参数消费当前合同与工程平台解析值，示例不授予写入或覆盖权限。

## 新建 CRUD 生成流程

1. 先确认冻结 OpenAPI、批准且版本当前的 Web generation contract schema v2、Application Service 接口、metadata、基础包、模块名、领域 segment 和 web 落盘目录；合同必须绑定 Slice `contract_id` / `contract_version` / `slice_id`、`yss-dto` wire profile 引用与 digest、允许写路径、证据与验证命令。
2. 加载并遵守 `yss-dto` 与 `yss-validation`；错误映射影响命中时再加载 `yss-exception`。
3. 涉及 DTO / VO / CMD / Query POJO 样板代码时，加载并遵守 `lombok`。
4. 涉及 Domain / Application Result 到 VO / DTO 或 CMD / Query 到输入模型的转换时，加载并遵守 `mapstruct`。
5. 运行 `node scripts/generate_controller.mjs`。
6. 生成后检查路径、命名、返回值包装、Application Service 引用、`@Valid`、Lombok 注解和 MapStruct WebConvertor 是否对齐项目。
7. 对复杂接口做少量手工修正，不在 skill 中承诺自动覆盖全部业务逻辑。

## 推荐命令

```bash
node scripts/generate_controller.mjs \
  --metadata-file /path/metadata.json \
  --contract-file /path/approved-web-generation-contract.json \
  --dto-wire-profile-file /path/to/yss-dto/references/openapi-wire-profile.yaml \
  --scaffold-manifest-file /path/service/.yss/scaffold-generation.json \
  --base-package com.yss.demo \
  --module-name demo \
  --domain-segment example \
  --web-project-dir /path/demo-adapter/demo-web \
  --application-service-package com.yss.demo.application.service \
  --validation-namespace <resolved-platform-namespace>
```

## 输出预期

- `rest/dto/request/*CreateRequest.java`
- `rest/dto/request/*UpdateRequest.java`
- `rest/dto/request/*PageRequest.java`
- `rest/dto/response/*Response.java`
- `rest/*Controller.java`
- `rest/convertor/*WebConvertor.java`
