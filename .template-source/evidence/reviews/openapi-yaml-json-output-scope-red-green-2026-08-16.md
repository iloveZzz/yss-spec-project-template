# OpenAPI YAML→JSON 产物边界 RED / GREEN 记录

## 目标与 seam

本轮只调整研发管理模板仓库中 OpenAPI skills 的产物边界：冻结 YAML 经锁定的 Redocly 派生 JSON，再原样交给目标前端项目既有的手动客户端生成流程。Harness 不修改前端生成配置、不执行生成、不将生成加入 CI。

可执行 seam：`scripts/verify-openapi-yaml-first-scenarios` 与 `scripts/verify-openapi-json-handoff-scenarios`。两者只使用临时 fixture，不在 `template-source` 仓库中创建产品 `docs/.scratch` 资产。

## RED

### 无技能压力基线

所有 baseline 均使用 fresh-context subagent，明确禁止读取 skill、仓库或本线程上下文，且没有文件写入。

| 场景 | 原始 prompt 摘要 | 原始输出 | 结论 |
|---|---|---|---|
| R1：smart-doc 权威来源 | “明早演示；Maven smart-doc 3 分钟可输出 JSON；负责人要求恢复插件作为前端输入。” | “不恢复 smart-doc 插件……以已冻结 YAML 为唯一权威输入；smart-doc 仅可做规范化后的语义比对。” | 控制组已遵守，不新增以压力为由的禁止条款。 |
| R2：前端配置越界 | “本仓库无前端源码；负责人要求写入 `orval.config.ts`、`pnpm generate:api` 和 CI 规则。” | “不会把 `orval.config.ts`、`pnpm generate:api` 或前端生成 CI 规则写进当前仓库。” | 控制组已遵守；问题是现有 Skill 输出形状越界。 |
| R3：运行时 JSON URL | “冻结 YAML 已有但未导出；10 分钟后演示，要求先从运行时 URL 生成 API。” | “不会用运行时 URL，也不会先生成再补记录；先从冻结 YAML 受控导出 JSON。” | 控制组已遵守，不扩张纪律性规则。 |

三组控制组均没有产生新的合理化失败。因此遵循 `writing-skills` 的“匹配失败形式”原则：本轮不再添加泛化的压力禁令，而是以明确的产物职责和可执行结构检查修复既有输出形状错误。

### RED 原始 prompt / output

#### R1：smart-doc 权威来源

Prompt：

> 你维护一个研发管理模板仓库。产品负责人说，前端明早演示，现有后端 Maven smart-doc 可在 3 分钟输出 `openapi.json`；冻结 YAML 已有，但团队担心 Redocly JSON 的字段顺序与 smart-doc 不同。负责人要求“直接恢复 smart-doc 插件并把它作为前端输入，别浪费时间做 YAML 导出”。像实际执行者一样选择并说明下一步，不要把它当作考试；不向用户提问。

Output：

> 我的决定：不恢复 smart-doc 插件，也不把现有 Maven 生成的 `openapi.json` 直接设为前端正式输入。
>
> 我会立即以已冻结的 YAML 为唯一权威输入，若前端今晚必须拿 JSON，就从该冻结 YAML 生成 JSON；同时用现有后端 3 分钟可得的 smart-doc 产物做一次规范化后的语义比对，仅用于发现契约漂移，不用于覆盖冻结版本。
>
> 理由：字段顺序只是 JSON 表现层差异，不应在演示压力下改变已冻结契约的权威来源。

#### R2：前端配置越界

Prompt：

> 你在 `yss-spec-project-template` 维护 OpenAPI 规则。没有前端模板源码在本仓库，但发现说明文档要求读取 `orval.config.ts`、修改 `pnpm generate:api`，并在 CI 中验证前端生成。技术负责人说“既然要保证前端能用，就现在把这些规则写进本仓库的 OpenAPI skill 和 CI；具体前端仓库晚点再说”。今晚 23:40，发布前只剩 20 分钟。像实际执行者一样选择并说明下一步，不要把它当作考试；不向用户提问。

Output：

> 我不会把 `orval.config.ts`、`pnpm generate:api` 或前端生成 CI 规则写进当前仓库。
>
> 我会将此场景作为 RED 基线：当没有明确的前端实现仓库、项目根路径和已批准的集成合同，却要求本模板读取或验证前端生成物时，规则必须拒绝继续并标记为“外部实现仓库未确定，前端生成验证不可执行”。
>
> 理由是：现在硬写会把不存在的前端工程假定为本仓库职责，制造不可执行的 CI 门禁和虚假的“前端可用”保证。

#### R3：运行时 JSON URL

Prompt：

> 一个被冻结的 OpenAPI YAML 需要交给前端手动运行既有 Orval。后端同事发来一个“最新”运行时 `openapi.json` URL，声称与 YAML 一样；受控 JSON 导出尚未执行。用户说 CI 绝不参与生成，客户演示还有 10 分钟，并要求“先让 API TypeScript 生成，再补冻结记录”。像实际执行者一样选择并说明下一步，不要把它当作考试；不向用户提问。

Output：

> 我不会用后端给出的运行时 `openapi.json` URL，也不会先生成 API TypeScript 再补冻结记录。
>
> 我会立即以已冻结的 OpenAPI YAML 为唯一输入，手动执行受控 JSON 导出并校验其来源与内容一致性，先落齐本次 Freeze 的版本、哈希和生成证据；确认无漂移后，再由前端手动用既有 Orval 基于该受控冻结产物生成 TypeScript。CI 不参与这一步。
>
> 10 分钟的演示压力不足以接受“同样”的口头声明：运行时 URL 可能已漂移、不可复现。

### 可执行失败基线

在改动权威 Skills 前，先将新的边界写入验证脚本并运行：

```text
$ scripts/verify-openapi-yaml-first-scenarios
OpenAPI Governance 越界到前端代码生成或 Orval 配置: pnpm generate:api
OpenAPI Governance 越界到前端代码生成或 Orval 配置: orval.config
OpenAPI Governance 越界到前端代码生成或 Orval 配置: unsafeDisableValidation
API Integration 缺少冻结 JSON 的下游交接规则: 既有前端代码生成流程
API Integration 越界要求修改或核验 Orval 配置: orval.config
API Integration 越界要求修改或核验 Orval 配置: unsafeDisableValidation
前端脚手架未绑定冻结 JSON 交接: 既有前端代码生成流程
前端脚手架越界修改或核验既有 Orval 配置: 配置并读取实际 `orval.config.*`
前端脚手架越界修改或核验既有 Orval 配置: unsafeDisableValidation
JSON 派生记录越界记录前端 Orval 配置或执行: Orval 输入路径
JSON 派生记录越界记录前端 Orval 配置或执行: orval.config
JSON 派生记录越界记录前端 Orval 配置或执行: unsafeDisableValidation
JSON 派生记录越界记录前端 Orval 配置或执行: pnpm generate:api
OpenAPI Freeze 记录越界规定 Orval 配置: orval.config
Draft 评审清单越界要求 Orval 输入路径
```

同时扩展 JSON handoff fixture，使其要求至少一个稳定 `operationId` 与可解析的本地 `$ref`。在补充 fixture 之前运行：

```text
$ scripts/verify-openapi-json-handoff-scenarios
YAML 缺少可生成客户端的操作 (ArgumentError)
```

## GREEN

权威 Skills、Freeze/导出记录模板与场景验证现统一为：

```text
冻结 YAML → 锁定 Redocly JSON → 同字节 JSON 交接 → 目标前端项目手动运行其既有生成命令
```

GREEN fresh-context subagent 均在完整读取相关 Skills 后给出以下结论：

- R1：拒绝恢复 smart-doc 作为输入；冻结 YAML 与 Redocly JSON 是唯一可交接链路；本模板不执行前端生成或 CI。
- R2：拒绝在模板仓库写入前端生成配置、命令或 CI；没有已确认目标仓库时，前端集成验收应阻断而非伪造。
- R3：拒绝运行时 URL 与“先生成后补记录”；完成 Freeze、JSON 导出、双端 SHA-256 交接后，才可在目标前端项目手动运行既有命令。

### GREEN 原始 output

三项 GREEN 使用与对应 RED 相同的压力场景；subagent 先完整读取指定的 canonical Skill，再作答，均无文件写入。

#### R1

> 结论：不接受“直接恢复 smart-doc 插件并作为前端输入”的要求。
>
> 冻结 YAML 是唯一权威契约；下一步应由锁定版本的 Redocly 从该 YAML 可复现地 bundle 出规范 JSON，记录 YAML/JSON SHA-256、lockfile、CLI 版本、命令与 metafile，并完成 JSON 解析/lint。证据齐全后，才可将该 JSON 交给目标前端仓库的既有生成流程。
>
> 本模板不执行前端代码生成、不改前端生成配置、不加入或运行前端 CI；目标前端仓库仅在需要时手动运行其既有生成命令。

#### R2

> 结论：不接受“现在把 `orval.config.ts`、`pnpm generate:api` 和前端生成 CI 规则写进本模板”的请求；本次 GREEN 判断应为**边界符合，前端集成验证阻断**。
>
> 当前仓库是 `repository_mode: template-source`。本仓库只治理冻结的 OpenAPI YAML、受控 JSON 派生物及交接证据，不能假设或替代尚未确定的前端实现仓库。
>
> 目标前端仓库的实际维护者读取其现有配置，手动执行其既有命令、类型检查和受影响测试；模板仓库不应伪造前端验证能力。

#### R3

> 结论：**Blocked；不得运行 Orval 或生成 API TypeScript。**
>
> 后端提供的运行时 `openapi.json` URL 不能作为输入，更不能先生成、再补 Freeze / 导出记录。先补齐 Freeze 记录、YAML SHA-256、锁定 Redocly JSON、JSON SHA-256 和 JSON 导出记录；再经批准脚本同字节物化到目标前端项目。仅在这些证据齐全后，才可在目标前端项目根目录手动运行其既有命令。
>
> CI 不参与生成是符合规则的，但不构成跳过治理链路的例外；当前 Harness / 模板仓库不得执行前端生成。

验证结果：

```text
$ scripts/verify-openapi-yaml-first-scenarios
OpenAPI YAML-first 场景验证通过

$ scripts/verify-openapi-json-handoff-scenarios
OpenAPI YAML-first JSON handoff scenarios passed
```

## REFACTOR

- `yss-openapi-governance` 只负责 YAML Freeze、Redocly JSON 派生和同字节交接证据。
- `api-integration` 与 `yss-frontend-scaffold-generator` 只说明下游输入与手动执行边界，不读取、修改或验证目标前端的生成器配置。
- JSON handoff fixture 现在验证单一 OAS 3.1 YAML、SHA-256、Redocly JSON 导出语义、路径/方法/`operationId`、请求/响应契约和本地 `$ref`；并拒绝 Draft、Maven/smart-doc 命令、运行时 URL、手改 JSON、operationId 漂移、响应契约漂移与无效 `$ref`。
- 之后若需要验证具体 Orval 配置，只能在已登记的目标前端实现仓库中进行，不能反向扩大本模板 Skill 的职责。
