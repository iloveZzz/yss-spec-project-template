# ADR-0012：YSS DTO 与 OpenAPI wire contract 采用共享映射 profile

- 状态：accepted
- 日期：2026-08-18
- 范围：`template-source` 的共享技能、OpenAPI 模板与校验工具

## 背景

YSS 中台同时保留 `com.yss.cloud.dto.result` 与 `com.yss.cloud.dto.response` 两组同名结果包装类；前者是当前新契约应采用的 canonical 包，后者只保留兼容线索。Java 泛型约束、Lombok getter、`@JsonIgnore` 和计算 getter 不能直接等同于 HTTP/JSON wire shape。若 `yss-dto`、OpenAPI Governance 和 Draft Review 各自维护字段表，就会把 `SingleResult<T>` 当成 OAS 泛型、机械暴露 `offset` / 内部分页字段，或无证据把 `totalPages` 固化进公共响应。

## 决策

1. `.agents/skills/yss-dto/references/openapi-wire-profile.yaml` 是共享 DTO 到公开 HTTP/JSON 的唯一可复用映射源；Governance、Draft Review 和模板清单只消费并引用它。
2. 新契约 canonical 为 `com.yss.cloud.dto.result`，`com.yss.cloud.dto.response` 标记为 legacy / compatibility，不得在新契约中引入。
3. OpenAPI 使用 `YssResultMeta` 表达公共响应字段，endpoint-specific schema 通过 `allOf` 叠加具体 `data` / page 字段，并在响应上声明 `x-yss-response-wrapper: SingleResult|MultiResult|PageResult`。Java generic notation 仅作语义说明，不能成为 OAS type 或 `$ref`。
4. 公共 wire 类型收窄为：`success:boolean`、`dataType:string|null`、`code:string|integer|null`，并显式表达 nullability；全局 `code` 不放宽为 arbitrary object。PageQuery 客户端只接受 `pageIndex/pageSize/orderBy/orderDirection/groupBy`，`orderDirection` 为 `ASC|DESC`，`offset`、`needTotalCount`、`tempTotalCount` 排除。
5. `totalPages` 与其他 computed getter 只有在目标 HTTP mapper identity、代表性序列化 fixture 和 contract-test / 等价 HTTP evidence 齐备后，才能进入具体 endpoint 契约；不把默认 Jackson probe 当成普遍事实。
6. OpenAPI 继续 YAML-first；profile 校验是模板侧 machine check，JSON 只能在 Freeze 后由锁定工具从 YAML 派生。

## 取舍与影响

- 需要在 endpoint 级别写具体 schema，不能依赖 Java 泛型文字或一个过宽的通用 wrapper；这增加了 Draft 初期建模工作，但避免客户端生成和运行时 wire contract 漂移。
- `result` / `response` 双包不会被静默合并；兼容项目仍可显式记录例外，但必须承担目标 wire evidence 和审查成本。
- 计算属性的处理可能暂时让 schema 少于某些本地 ObjectMapper 的默认输出；这是有意的 fail-closed 策略，待真实 HTTP 证据后再扩大契约。
- profile、校验器、技能投影和 `skills-lock.json` 必须一起同步；未同步时不能声明模板治理变更完成。

## 验证

- `scripts/verify-yss-dto-openapi-profile`
- `scripts/sync-skills --check`
- `scripts/update-skill-lock --check`
- `scripts/verify-template`
