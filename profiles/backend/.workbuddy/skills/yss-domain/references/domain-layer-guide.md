# YSS Domain Target Profile 指南

本指南的目录和生成布局只定义新 DDD `target-domain-model`。既有 DDD 通过 [既有工程边界](existing-project.md) 应用领域语义规则，历史目录或贫血对象不能单凭名称判违规。HTTP DTO/VO 穿入领域端口按实际职责检查，架构迁移按当前授权评估范围。

## 1. Domain 所有权

Domain 只拥有：

- Aggregate Root、Entity、Value Object。
- 领域行为、不变量、状态转换和 Domain Event。
- 聚合持久化及外部领域能力所需的 Gateway/Port。
- 稳定的领域错误标识与错误参数。

Domain 不拥有：

- HTTP Cmd/Query/VO、YSS `PageQuery` / `PageResult`。
- Repository PO、Mapper、SQL、Controller。
- HTTP status、YSS Result 包装或公开错误消息。

## 2. 包结构

```text
{base_package}.domain.{segment}
├── model
├── gateway
├── service
└── event
```

HTTP DTO/VO 位于 `{base_package}.rest.dto`，领域值对象仍归 Domain。独立 client Maven module 对当前 Target Profile 为 `unsupported`；不得放回 Domain module。

## 3. Aggregate 与行为

- Aggregate Root 是一致性边界，不按表数量机械拆分。
- Entity identity 使用明确类型；Value Object 按值相等并尽量不可变。
- POJO/Lombok、中文 Javadoc 及嵌套 State/Fact/值对象遵守项目根 `.template-spec/agents/backend-architecture-profiles.md`，不从 Java 版本推导默认使用 record。
- 对外暴露业务动作，例如 `publish()`、`cancel()`，不要让 Application 任意修改状态字段。
- 没有真实行为时保持简单模型，不为了“看起来像 DDD”制造空 Domain Service。

## 4. Gateway

Gateway 描述领域能力，只交换 Domain Model、领域值和领域标识。例如：

Gateway interface 的签名由当前领域模型决定，并由 `yss-domain` 创建和维护，Infrastructure / `yss-repository` 实现该接口。实现需要扩展能力时，核实业务规则与真实调用方，在授权范围内同步接口、实现及调用方。聚合边界或业务决定有缺口时定点澄清，不能从 DDL 反向编造领域能力。

```java
package com.yss.quality.domain.template.gateway;

import com.yss.quality.domain.template.model.QualityTemplateEntity;
import com.yss.quality.domain.template.model.QualityTemplateId;
import java.util.Optional;

public interface QualityTemplateGateway {
    Optional<QualityTemplateEntity> findById(QualityTemplateId id);
    void save(QualityTemplateEntity template);
}
```

禁止在 Domain Gateway 中出现：

- `*AddCmd`、`*UpdateCmd`、HTTP request。
- HTTP `*VO`、`PageResult`、Repository PO；领域值对象不因名称相似被误判。
- MyBatis、Spring MVC、Jackson、Swagger 类型。

展示分页、列表和投影查询由 Application Query Port 定义，Infrastructure 实现。

## 5. Domain Error

领域错误携带稳定标识和参数，不决定 HTTP 行为：

```java
/** 模板名称冲突的领域错误，不携带公开 HTTP 消息。 */
@Getter
public final class QualityTemplateNameConflict extends RuntimeException {
    /** 发生冲突的模板名称，公开展示由 Web 决定。 */
    private final String templateName;

    /** 保留稳定错误标识及用于翻译的业务参数。 */
    public QualityTemplateNameConflict(String templateName) {
        super("quality-template-name-conflict");
        this.templateName = templateName;
    }
}
```

Web Exception Translator 再按现有 API 约定映射状态码、错误码和消毒消息。Domain 不直接依赖 YSS `BizException`。

## 6. 依赖参考

领域代码保持以下依赖方向：

- Domain 不依赖 Application、Infrastructure、Repository 或 Web。
- Domain 不依赖 YSS DTO/Exception、Jackson、Swagger 或 Validation。
- 负例 fixture 中的 Domain → Web DTO 引用会使验证失败。

## 7. 实现范围与验证

- 已明确规则的新聚合、不变量、状态机或跨上下文协作按当前授权实现，核实受影响调用方、持久化和公开接口。真正缺少业务决定时澄清相关问题，已知部分继续推进。
- 既有 DDD 沿用当前布局增量维护。改变架构或公开接口时评估兼容性、数据影响和验证范围，超出当前授权的部分需取得对应授权。

## 聚合创建与重建

- 创建入口执行当前创建规则，持久化重建入口恢复已保存状态并校验结构不变量，不重复发送创建事件、生成身份或执行外部调用。两者不得通过公开任意 setter 混为一体。
- 值对象按值相等；聚合按稳定身份相等。集合入参与出参防御性复制，修改经业务方法；普通类与必要 Lombok 为默认实现，既有明确约定按根规范兼容。
- 领域错误携带稳定标识与参数；公开消息和 HTTP 状态由 Web 翻译。测试通过公开行为覆盖非法状态、重复动作和重建后语义一致性。
- 为业务决策加载一个或一组聚合仍可使用 Domain Gateway；展示列表、分页、排序、统计和投影走 Application Query Port。返回 List 本身不是违规，须按调用目的判定。
