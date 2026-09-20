# YSS Domain Target Profile 指南

本指南的目录和生成布局只定义新 DDD `target-domain-model`。既有 DDD 通过 [既有工程边界](existing-project.md) 应用领域语义规则；历史目录或贫血对象不能单凭名称判违规。HTTP DTO/VO 穿入领域端口仍须按登记职责检查。架构迁移不属于生成器。

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

DTO/VO 位于 `{base_package}.rest.dto`。独立 client Maven module 对当前 Target Profile 为 `unsupported`；不得放回 Domain module。

## 3. Aggregate 与行为

- Aggregate Root 是一致性边界，不按表数量机械拆分。
- Entity identity 使用明确类型；Value Object 按值相等并尽量不可变。
- 对外暴露业务动作，例如 `publish()`、`cancel()`，不要让 Application 任意修改状态字段。
- 每个批准不变量必须有 `behavior-tdd` 测试；测试通过聚合公开方法观察结果。
- 没有真实行为时保持简单模型，不为了“看起来像 DDD”制造空 Domain Service。

## 4. Gateway

Gateway 描述领域能力，只交换 Domain Model、领域值和领域标识。例如：

Gateway interface 的签名由批准战术模型决定，并由 `yss-domain` 唯一创建和维护；Infrastructure / `yss-repository` 只能实现该接口。若实现所需能力超出既有签名，返回 `new_impacts` 并重路由，不得从 DDL 反向扩写 Domain 合同。

```java
package com.yss.quality.domain.template.gateway;

import com.yss.quality.domain.template.model.QualityTemplate;
import com.yss.quality.domain.template.model.QualityTemplateId;
import java.util.Optional;

public interface QualityTemplateGateway {
    Optional<QualityTemplate> findById(QualityTemplateId id);
    void save(QualityTemplate template);
}
```

禁止在 Domain Gateway 中出现：

- `*AddCmd`、`*UpdateCmd`、HTTP request。
- `*VO`、`PageResult`、Repository PO。
- MyBatis、Spring MVC、Jackson、Swagger 类型。

展示分页、列表和投影查询由 Application Query Port 定义，Infrastructure 实现。

## 5. Domain Error

领域错误携带稳定标识和参数，不决定 HTTP 行为：

```java
public final class QualityTemplateNameConflict extends RuntimeException {
    private final String templateName;

    public QualityTemplateNameConflict(String templateName) {
        super("quality-template-name-conflict");
        this.templateName = templateName;
    }

    public String templateName() {
        return templateName;
    }
}
```

Web Exception Translator 再将它映射为批准的状态码、错误码和消毒消息。Domain 不直接依赖 YSS `BizException`。

## 6. 依赖门禁

生成工程的 ArchUnit 规则必须证明：

- Domain 不依赖 Application、Infrastructure、Repository 或 Web。
- Domain 不依赖 YSS DTO/Exception、Jackson、Swagger 或 Validation。
- 负例 fixture 中的 Domain → Web DTO 引用会使验证失败。

## 7. 生命周期证据

- 消费批准且当前的 Tactical Design 与 Slice Implementation Contract。
- 返回 YSS Skill Execution Result，包含 Domain 文件、行为测试、ArchUnit 结果及实际 `./mvnw ...` 证据。
- 新聚合、不变量、状态机或跨上下文影响进入 `new_impacts` 并暂停。
- 旧布局不走 scaffold 生成分支；既有 DDD 按登记整改。需改变架构或公开契约时单独评估并批准。

## 聚合创建与重建

- 创建入口执行当前创建规则；持久化重建入口恢复已批准状态并校验结构不变量，不重复发送创建事件、生成身份或执行外部调用。两者不得通过公开任意 setter 混为一体。
- 值对象按值相等；聚合按稳定身份相等。集合对外只读，修改经业务方法；Java 8 使用普通类与防御性复制，不从示例推导 record 等高版本语法。
- 领域错误携带稳定标识与参数；公开消息和 HTTP 状态由 Web 翻译。测试通过公开行为覆盖非法状态、重复动作和重建后语义一致性。
- 为业务决策加载一个或一组聚合仍可使用 Domain Gateway；展示列表、分页、排序、统计和投影走 Application Query Port。返回 List 本身不是违规，须按调用目的判定。
