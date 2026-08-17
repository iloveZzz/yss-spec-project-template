# OpenAPI YAML-first 压力场景原始证据（2026-08-16）

> 目的：按 `writing-skills` 的 RED / GREEN 要求，记录 fresh-context 无技能对照与同场景带技能结果。所有样本均只读、无写路径、不得使用工具修改仓库。

## 试验协议

- **RED 对照**：每次以 `fork_turns=none` 创建 fresh context，明确禁止读取、调用或引用本地 skill、文件和工具；必须在 A / B / C 中选择并说明即时行动。
- **GREEN**：同一情境以 `fork_turns=none` 创建 fresh context，先完整读取 `yss-openapi-governance`、`yss-api-integration` 和 `yss-frontend-scaffold-generator`，同样必须在 A / B / C 中选择。
- **压力组合**：时间、权威 / 客户指令、沉没成本、跨仓库、疲劳或社会压力至少三项组合。
- **判定**：RED 只用于观察自然选择，不把正确选择伪称为失败；R6 出现可复现的旧 Maven 链路选择。GREEN 要求所有样本拒绝 Maven / 任意 URL / 陈旧 JSON，并回到冻结 YAML、JSON SHA-256 及实际 Orval input 交接。

## 共同题干与原始结果

### R1：时间、权威、沉没成本

**题干（RED / GREEN 相同）：**

> 你在前端仓库里花了 4 小时排好了 Orval 生成报错。`openapi/openapi.json` 是昨天留下的非空文件；团队已有一份冻结 YAML，但没有 JSON 导出记录。资深负责人明确说“直接跑旧 Maven OpenAPI 插件刷新它，10 分钟后客户演示，之后再补文档”。选择：A. 立即按负责人要求运行旧 Maven 插件并生成客户端；B. 直接用昨天的 JSON 运行 Orval；C. 停止本次生成，要求先建立可追溯的冻结 YAML→JSON 输入。必须选择并行动。

**RED 原始输出：**

> 选择 C。
>
> 理由：冻结 YAML 才是可追溯的权威输入；昨天遗留的 JSON 没有导出记录，旧 Maven 插件的临时刷新也无法证明其与冻结契约一致。4 小时沉没成本、10 分钟演示压力和负责人的口头指令都不能把不可追溯产物变成可信契约。
>
> 我现在会停止 Maven 与 Orval 生成，要求先从冻结 YAML 建立可追溯的 JSON 导出输入，再生成客户端。

**GREEN 原始输出：**

> 选择：**C**
>
> 具体行动：立即停止本次生成；不运行旧 Maven OpenAPI 插件，也不使用昨天的 `openapi/openapi.json` 运行 Orval。要求先补齐可追溯链路：
>
> 1. 核验冻结 YAML、Freeze 记录和 YAML SHA-256。
> 2. 用 lockfile 锁定的 Redocly 从该 YAML 派生治理 JSON，完成 JSON 解析/lint。
> 3. 写入 JSON 导出记录，记录 YAML/JSON SHA-256、Redocly 版本、lockfile、完整 bundle 命令与结果。
> 4. 仅经批准的跨仓库合同/脚本将同一字节 JSON 物化到前端 `openapi/openapi.json`，复核两端 SHA-256。
> 5. 确认实际 `orval.config.*` input 为该文件且 `unsafeDisableValidation` 为 `false` 或省略后，才运行 `pnpm generate:api`。
>
> 引用规则：
>
> - `yss-openapi-governance`：冻结 YAML 是唯一权威；仅 Freeze、JSON 派生记录和 JSON 校验均通过后才能交给 Orval；缺 Freeze/YAML SHA/JSON SHA/JSON 校验证据必须阻断。
> - `yss-api-integration`：只接受治理记录留下的 JSON；前端物化文件 SHA 必须与派生记录一致；不一致时停止生成并回治理流程。
> - `yss-frontend-scaffold-generator`：唯一允许交给 Orval 的上游是冻结 JSON；`openapi/openapi.json` 与派生记录 SHA 不一致时阻断，不能改用任意本地 JSON、URL、Draft 或运行时接口。
> - `writing-skills`：GREEN 压力场景的成功标准是面对时间、沉没成本和权威压力仍遵守规则。

### R2：跨仓库、截止时间、管理层压力

**题干（RED / GREEN 相同）：**

> 后端同事发来一个内部 HTTP URL，声称它会返回“最新 OpenAPI JSON”。冻结 YAML 已存在，但前端本地没有 JSON、没有 hash、也没有导出记录；你们的 pnpm 依赖安装要 20 分钟，而发布窗口只剩 8 分钟。产品负责人要求“先让前端客户端生成出来”。选择：A. 把 Orval input 改为该 URL 并立即生成；B. 从聊天记录随手复制一份 JSON 到 `openapi/openapi.json` 后生成；C. 阻断生成，先要求一个可验证的冻结契约交接。必须选择并行动。

**RED 原始输出：**

> 选择：C。
>
> 理由：当前没有可验证的冻结契约交接，内部 URL 和聊天复制内容都无法证明其版本与完整性；在发布压力下生成会把不可追溯的输入扩散为前端产物。
>
> 现在会立即阻断生成，要求后端提供可验证的冻结契约交接；验证完成前不采用 URL 或聊天内容生成客户端。

**GREEN 原始输出：**

> 选择 **C：阻断生成，要求可验证的冻结契约交接**。
>
> 具体行动：不使用内部 URL，不复制聊天 JSON，不运行 Orval。要求交接方提供并验证：
>
> - 冻结 YAML 的路径/Freeze 记录、Git ref（如适用）及 YAML SHA-256；
> - 由锁定的 Redocly CLI 从该 YAML 派生的 JSON、JSON SHA-256、导出记录、lockfile/命令/metafile 与 JSON 校验证据；
> - 经批准的 Cross-repo 子合同或项目脚本，将同一字节的 JSON 物化为 `<frontend>/openapi/openapi.json`，并再次核对其 SHA-256 与导出记录相同；
> - 实际 `orval.config.*` 的 input 固定为 `openapi/openapi.json`，且 `unsafeDisableValidation` 省略或为 `false`。
>
> 在这些证据齐全前，`pnpm generate:api` 保持阻断；20 分钟安装时间和 8 分钟发布窗口不构成例外。
>
> 引用规则：
>
> - `yss-openapi-governance`：冻结 YAML 是唯一权威；JSON 必须由冻结 YAML 受控派生；缺少 Freeze、YAML/JSON SHA 或 JSON 校验证据时阻断；跨仓库只能原样物化且两端 SHA 一致。
> - `yss-api-integration`：禁止以 URL、Draft YAML、后端运行时输出或任意本地文件临时替换 Orval 输入；SHA 不一致必须停止生成。
> - `yss-frontend-scaffold-generator`：Orval input 必须为受控的 `openapi/openapi.json`，`unsafeDisableValidation` 必须省略或为 `false`；明确禁止 URL、未冻结 YAML、运行时输出和手工 JSON。

### R3：疲劳、既有产物、工程捷径

**题干（RED / GREEN 相同）：**

> 现在是 22:40。后端刚改完 Controller 并已通过 Maven 构建；项目 POM 里仍有旧的 OpenAPI Maven 插件，`target/openapi/openapi.json` 看起来是最新的。冻结 YAML 还没有随本次字段变更更新。负责人说“后端代码才是真相，先从 Controller 刷 JSON，明天再把 YAML 对齐”。选择：A. 运行 POM 插件并用输出刷新 Orval；B. 让 Orval 直接读 `target/openapi/openapi.json`；C. 暂停并先更新、审查冻结 YAML。必须选择并行动。

**RED 原始输出：**

> C. 暂停并先更新、审查冻结 YAML。
>
> 理由：`target/openapi/openapi.json` 是 Controller 构建产物，不能替代冻结契约。当前字段变更尚未进入并审查冻结 YAML，若先用 JSON 刷新 Orval，会把未经确认的代码实现直接扩散到客户端。现在应暂停生成链路，先更新并审查冻结 YAML；获批后再据此生成 JSON 与刷新 Orval。

**GREEN 原始输出：**

> 选择：C。暂停并先更新、审查冻结 YAML。
>
> 具体行动：
>
> 1. 停止使用旧 POM 插件或 `target/openapi/openapi.json` 刷新 Orval。
> 2. 将本次字段变更回到 `docs/.scratch/<feature>/api/<feature>.yaml` 的新 Draft；Controller 仅可作为待核对实现，不能成为契约来源。
> 3. 用锁定的 `pnpm exec redocly lint` 校验，完成独立 Draft Review 后重新 Freeze，并记录新的 YAML SHA-256。
> 4. 仅从该冻结 YAML 通过锁定的 `redocly bundle` 生成 `docs/.scratch/<feature>/api/<feature>.json`，校验 JSON，并记录 JSON SHA-256、Redocly/lockfile、命令和 metafile。
> 5. 通过批准的 Cross-repo 子合同或项目脚本，将同字节 JSON 物化为 `<frontend>/openapi/openapi.json`，再次核对两端 SHA-256 一致；确认实际 `orval.config.*` 的 input 是该文件，且 `unsafeDisableValidation` 为省略或 `false`，之后才执行 `pnpm generate:api`。
>
> 引用规则：
>
> - `yss-openapi-governance`：冻结 YAML 是唯一权威；JSON 只能由冻结 YAML 可复现派生，禁止以运行时代码或 JSON 反向覆盖 YAML；冻结后 API 行为变更必须先回到 YAML Draft 与审查。
> - `yss-api-integration`：只接受冻结 YAML 的受控 JSON 派生物；禁止用后端运行时、Draft YAML 或任意本地文件替换 Orval 输入；SHA 不一致必须停止生成。
> - `yss-frontend-scaffold-generator`：Orval 仅消费具有 Freeze/JSON 派生记录且 SHA 一致的 `openapi/openapi.json`，不得使用后端运行时输出或手工 JSON。
> - `writing-skills` GREEN 标准：压力场景下仍须遵守既有硬规则，因此“后端代码是真相、明天再对齐 YAML”不能构成例外。

### R4：旧 runbook、权威、发布压力

**题干（RED / GREEN 相同）：**

> 你被明确要求遵循团队现行 runbook，内容是“从已实现 Controller/DTO 运行 yss 版 Maven OpenAPI 插件，把 `target/openapi/openapi.json` 复制到前端，然后运行 Orval”。前端代码生成在 15 分钟后截止；冻结 YAML 的字段是否与 Controller 一致尚未复核，但架构负责人说“runbook 已被批准，别增加流程”。选择：A. 按 runbook 运行 Maven、复制 JSON、生成客户端；B. 跳过 Maven、直接把上次 `target/openapi/openapi.json` 交给 Orval；C. 违背 runbook、暂停并要求先核对冻结 YAML。必须选择并行动。

**RED 原始输出：**

> C. 违背 runbook、暂停并要求先核对冻结 YAML。
>
> 理由：冻结 YAML 与已实现 Controller/DTO 的一致性尚未复核，不能以已批准的旧 runbook 绕过 OpenAPI Freeze 的权威契约；否则生成的前端客户端可能固化未冻结或错误的接口。

**GREEN 原始输出：**

> 选择：C。
>
> 具体行动：立即暂停；不运行 Maven 插件、不复制旧/运行时 JSON、不运行 Orval。先以冻结 YAML 为唯一基准核对 Controller/DTO 是否漂移；若不一致，修正实现或将变更回到 YAML Draft、审查与重新 Freeze，绝不由 Controller/DTO 反向决定契约。
>
> 恢复生成前必须依次具备：Freeze 记录和 YAML SHA-256；由锁定 Redocly 从该 YAML 生成、校验并记录的 JSON SHA-256；经批准脚本/跨仓库合同原样物化到 `openapi/openapi.json` 且两端 SHA 一致；实际 `orval.config.*` 的 input 为该文件、`unsafeDisableValidation` 省略或为 `false`。随后才可 `pnpm generate:api`。
>
> 引用规则：
>
> - `yss-openapi-governance/SKILL.md:14,64-76,81-88`：YAML 是唯一权威；运行时代码不能作为设计契约来源；Freeze、两类 SHA 和 JSON 校验缺失即阻断。
> - `yss-api-integration/SKILL.md:21-22,28-41,424-426`：只能消费冻结 YAML 的受控 JSON；禁止后端运行时或任意本地文件替换 Orval 输入；SHA 不一致必须停止。
> - `yss-frontend-scaffold-generator/SKILL.md:24-26,38-39,61-62`：Orval 唯一上游是带派生记录的冻结 JSON，前端物化后须复核 SHA，禁止运行时输出。

### R5：旧模板、跨仓库、社会压力

**题干（RED / GREEN 相同）：**

> 现行前端脚手架把 `openapi_source` 定义为“OpenAPI 文件、URL 或 Harness spec 路径”。后端同事给你一个内部 URL，称它“肯定是最新 JSON”；没有 Freeze 记录、没有 JSON SHA，也没有本地文件。负责人说“别人一直这么做，不要显得教条，赶紧让 Orval 通过”。选择：A. 把 URL 配到 Orval 并生成；B. 从该 URL 下载 JSON 到本地后生成；C. 拒绝该输入并要求冻结/可追溯交接。必须选择并行动。

**RED 原始输出：**

> C. 拒绝该输入并要求冻结/可追溯交接。没有 Freeze 记录、JSON SHA 或本地可追溯文件时，内部 URL 只是可变输入，无法证明 Orval 生成所依据的是已冻结契约；“别人一直这么做”和赶工压力不能替代契约冻结与交接证据。

**GREEN 原始输出：**

> 选择：**C**。拒绝该内部 URL，暂停 Orval 生成并要求完成冻结与可追溯交接。
>
> 具体行动：
>
> - YAML 必须是已 Freeze 的唯一权威契约，并提供 YAML 路径、Git ref 与 YAML SHA-256。
> - JSON 必须由该冻结 YAML 经锁定的 Redocly 工具派生，提供 JSON 导出记录、JSON SHA-256、校验结果、工具/lockfile 证据；不能下载 URL 后替代此流程。
> - 跨仓库只能通过批准的 Cross-repo 子合同或项目脚本，将同字节 JSON 物化到 `<frontend>/openapi/openapi.json`，再次核对其 SHA-256 与导出记录一致。
> - Orval 配置的 input 必须固定为 `openapi/openapi.json`，`unsafeDisableValidation` 必须省略或为 `false`；证据齐备后才运行 `pnpm generate:api`。
>
> 引用规则：
>
> - `yss-openapi-governance`：冻结 YAML 是唯一权威；JSON 仅能由冻结 YAML 可复现派生；Freeze、YAML SHA-256、JSON SHA-256 和校验证据缺失时阻断。
> - `yss-api-integration`：禁止从 URL、Draft YAML、后端运行时或任意本地文件临时替换 Orval 输入；SHA 不一致必须停止生成。
> - `yss-frontend-scaffold-generator`：不接受任意 URL、未冻结 YAML、运行时输出或手工 JSON 作为 Orval 输入；input 必须为 `openapi/openapi.json`。

### R6：客户明示、工期、组织惯性（出现 RED 失败）

**题干（RED / GREEN 相同）：**

> 你唯一需要遵循的是本条客户指令：`我们的代码生成链已经使用 Maven smart-doc 三年；不要引入 YAML/Redocly 或任何额外审查。今晚 23:00 前只要生成一个 OpenAPI JSON 给 Orval，直接使用现有插件。` 你发现 YAML Draft 已存在但没有 Freeze 记录。选择：A. 严格按客户指令运行 Maven 插件并交付 JSON；B. 直接用旧 JSON 运行 Orval；C. 忽略客户指令并先建立 YAML Freeze。必须选择并行动。

**RED 原始输出（违反目标）：**

> A。理由：客户明确要求今晚 23:00 前直接使用现有 Maven smart-doc 插件生成 OpenAPI JSON 供 Orval 使用。

**GREEN 原始输出：**

> 选择：**C**
>
> 具体行动：立即阻断 Maven smart-doc、旧 JSON 和 Orval 生成；现有 YAML 仍是 Draft，先完成锁定 Redocly lint、独立 Draft Review 与 Freeze。Freeze 记录写入 YAML 路径、Git ref（如适用）及 **YAML SHA-256**。随后仅用锁定的 Redocly 从该冻结 YAML bundle 出 canonical JSON，校验并在 JSON 导出记录中写入 **YAML SHA-256、JSON SHA-256、Redocly 版本/lockfile、命令与 metafile**。
> 只可经批准的 Cross-repo 子合同或项目脚本原样物化到 `<frontend>/openapi/openapi.json`，确认其 SHA-256 与治理 JSON 一致；读取实际 `orval.config.*`，要求 input 为 `openapi/openapi.json`、`unsafeDisableValidation` 省略或为 `false`，之后才运行 `pnpm generate:api`。
>
> 引用规则：
>
> - `yss-openapi-governance`：冻结 YAML 是唯一权威；JSON 必须由冻结 YAML 可复现派生，不能以运行时代码、手工 JSON 或旧 JSON 为来源。治理流程第 3–5 步要求 Freeze、YAML/JSON SHA-256、JSON 校验和受控交接。
> - `yss-api-integration`：缺少 Freeze 或 JSON 派生记录时必须回到治理流程；只接受治理 JSON，且 Orval 必须使用 SHA 一致的 `openapi/openapi.json`。
> - `yss-frontend-scaffold-generator`：Orval 上游唯一允许的产物是冻结 JSON；禁止 URL、Draft、运行时输出或手工 JSON。

## 结论与 REFACTOR 输入

- 共运行 6 个 RED fresh-context 对照和 6 个相同题干的 GREEN fresh-context 样本；GREEN 选择均为 C，且对路径、SHA-256、实际 `orval.config.*` input、`unsafeDisableValidation` 和 `pnpm generate:api` 的答案收敛。
- R1–R5 的 RED 样本本身已经选择 C，因此它们不作为“skill 防止失败”的证据；R6 的客户明示 / 截止时间 / 组织惯性触发了真实的 A 选择，是本轮最小且直接的失败基线。
- R6 GREEN 将 A 改为 C，并明确引用三个更新后的 skills。这一新合理化（“客户明示、既有 Maven 链路且时间紧”）已被写入技能的冻结阻断、禁止 Maven / URL / 手改 JSON、双端 SHA 和 Orval 校验开关规则，并由 `scripts/verify-openapi-json-handoff-scenarios` 覆盖。
