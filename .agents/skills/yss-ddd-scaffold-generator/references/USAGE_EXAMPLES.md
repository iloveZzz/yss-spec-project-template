# 使用示例

## 1. 快速开始

### 1.1 生成基础项目

```bash
# 进入脚手架目录
cd yss-datamiddle-scaffold

# 生成项目
python .trae/skills/yss-ddd-scaffold-generator/scripts/generate_scaffold.py \
  --project-name user-service \
  --base-package com.yss.user \
  --output-dir ./output
```

### 1.2 生成的项目结构

```
output/user-service/
├── pom.xml
├── README.md
├── user-service-domain/
├── user-service-application/
├── user-service-infrastructure/
├── user-service-adapter/
│   └── user-service-web/
└── user-service-bootstrap/
```

## 2. 编译和运行

### 2.1 编译项目

```bash
cd output/user-service
./mvnw clean compile
```

### 2.2 运行项目

```bash
# 方式1: 使用 Maven 插件
./mvnw spring-boot:run -pl user-service-bootstrap

# 方式2: 打包后运行
./mvnw clean verify
java -jar user-service-bootstrap/target/user-service-bootstrap-1.0.0-SNAPSHOT.jar
```

### 2.3 访问应用

```bash
# 健康检查
curl http://localhost:8080/actuator/health

# 查询用户列表
curl -X POST http://localhost:8080/api/users/page \
  -H "Content-Type: application/json" \
  -d '{
    "pageNum": 1,
    "pageSize": 10
  }'

# 新增用户
curl -X POST http://localhost:8080/api/users \
  -H "Content-Type: application/json" \
  -d '{
    "username": "zhangsan",
    "email": "zhangsan@example.com"
  }'

# 查询用户详情
curl http://localhost:8080/api/users/1

# 更新用户
curl -X PUT http://localhost:8080/api/users \
  -H "Content-Type: application/json" \
  -d '{
    "id": 1,
    "username": "zhangsan",
    "email": "zhangsan@yss.com",
    "status": 1
  }'

# 删除用户
curl -X DELETE http://localhost:8080/api/users/1
```

## 3. 添加新实体

### 3.1 创建 Domain 层对象

**ProductAddCmd.java**:
```java
package com.yss.user.client.dto.cmd;

import com.yss.cloud.dto.CommandDTO;
import lombok.Getter;
import lombok.Setter;
import javax.validation.constraints.NotBlank;

@Getter
@Setter
public class ProductAddCmd extends CommandDTO {
    @NotBlank(message = "产品名称不能为空")
    private String productName;

    private String description;
    private Double price;
}
```

**ProductVO.java**:
```java
package com.yss.user.client.vo;

import lombok.Getter;
import lombok.Setter;
import java.io.Serializable;

@Getter
@Setter
public class ProductVO implements Serializable {
    private Long id;
    private String productName;
    private String description;
    private Double price;
}
```

**ProductGateway.java**:
```java
package com.yss.user.domain.gateway;

import com.yss.cloud.dto.result.PageResult;
import com.yss.user.client.dto.cmd.ProductAddCmd;
import com.yss.user.client.vo.ProductVO;

public interface ProductGateway {
    Long addProduct(ProductAddCmd cmd);
    ProductVO getProductById(Long id);
    PageResult<ProductVO> pageProduct(ProductPageQuery query);
}
```

### 3.2 创建 Application 层服务

**ProductService.java**:
```java
package com.yss.user.core.service;

public interface ProductService {
    Long addProduct(ProductAddCmd cmd);
    ProductVO getProductById(Long id);
}
```

**ProductServiceImpl.java**:
```java
package com.yss.user.core.service.impl;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class ProductServiceImpl implements ProductService {

    private final ProductGateway productGateway;

    @Override
    @Transactional(rollbackFor = Exception.class)
    public Long addProduct(ProductAddCmd cmd) {
        return productGateway.addProduct(cmd);
    }

    @Override
    public ProductVO getProductById(Long id) {
        return productGateway.getProductById(id);
    }
}
```

### 3.3 创建 Infrastructure 层实现

**ProductPO.java**:
```java
package com.yss.user.repository.entity;

import com.baomidou.mybatisplus.annotation.*;
import com.yss.cloud.mybatis.entity.AuditableEntity;
import lombok.Getter;
import lombok.Setter;
import lombok.EqualsAndHashCode;

@Getter
@Setter
@EqualsAndHashCode(callSuper = true)
@TableName("t_product")
public class ProductPO extends AuditableEntity {
    @TableId(value = "id", type = IdType.ASSIGN_ID)
    private Long id;

    @TableField("product_name")
    private String productName;

    @TableField("description")
    private String description;

    @TableField("price")
    private Double price;
}
```

**ProductRepository.java**:
```java
package com.yss.user.repository;

import com.yss.cloud.mybatis.support.BasePlusRepository;
import com.yss.user.repository.entity.ProductPO;

public interface ProductRepository extends BasePlusRepository<ProductPO> {
}
```

**ProductGatewayImpl.java**:
```java
package com.yss.user.repository.gateway.impl;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Repository;

@Repository
@RequiredArgsConstructor
public class ProductGatewayImpl implements ProductGateway {

    private final ProductRepository productRepository;

    @Override
    public Long addProduct(ProductAddCmd cmd) {
        ProductPO po = ProductConvertor.INSTANCE.cmdToPO(cmd);
        productRepository.insert(po);
        return po.getId();
    }

    @Override
    public ProductVO getProductById(Long id) {
        ProductPO po = productRepository.selectById(id);
        return ProductConvertor.INSTANCE.toVO(po);
    }
}
```

### 3.4 创建 Adapter 层控制器

**ProductController.java**:
```java
package com.yss.user.rest;

import com.yss.cloud.dto.result.SingleResult;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
import javax.validation.Valid;

@RestController
@RequestMapping("/api/products")
@RequiredArgsConstructor
public class ProductController {

    private final ProductService productService;

    @PostMapping
    public SingleResult<Long> add(@Valid @RequestBody ProductAddCmd cmd) {
        return SingleResult.of(productService.addProduct(cmd));
    }

    @GetMapping("/{id}")
    public SingleResult<ProductVO> getById(@PathVariable Long id) {
        return SingleResult.of(productService.getProductById(id));
    }
}
```

### 3.5 创建数据库表

```sql
CREATE TABLE `t_product` (
  `id` bigint(20) NOT NULL COMMENT '主键ID',
  `product_name` varchar(100) NOT NULL COMMENT '产品名称',
  `description` varchar(500) DEFAULT NULL COMMENT '描述',
  `price` decimal(10,2) DEFAULT NULL COMMENT '价格',
  `deleted` tinyint(4) NOT NULL DEFAULT '0' COMMENT '删除标记',
  `created_by` varchar(50) DEFAULT NULL COMMENT '创建人',
  `created_date` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `last_modified_by` varchar(50) DEFAULT NULL COMMENT '最后修改人',
  `last_modified_date` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '最后修改时间',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='产品表';
```

## 4. 集成其他功能

### 4.1 添加 Redis 缓存

**1. 添加依赖**:
```xml
<dependency>
    <groupId>com.yss.cloud</groupId>
    <artifactId>yss-component-cache-starter</artifactId>
</dependency>
```

**2. 配置 Redis**:
```yaml
spring:
  redis:
    host: localhost
    port: 6379
    database: 0
```

**3. 使用缓存**:
```java
@Service
public class UserServiceImpl implements UserService {

    @Cacheable(value = "user", key = "#id")
    public UserVO getUserById(Long id) {
        return userGateway.getUserById(id);
    }

    @CacheEvict(value = "user", key = "#id")
    public void deleteUser(Long id) {
        userGateway.deleteUser(id);
    }
}
```

### 4.2 添加 Swagger 文档

**1. 添加依赖**:
```xml
<dependency>
    <groupId>io.springfox</groupId>
    <artifactId>springfox-boot-starter</artifactId>
    <version>3.0.0</version>
</dependency>
```

**2. 配置 Swagger**:
```java
@Configuration
@EnableOpenApi
public class SwaggerConfig {
    @Bean
    public Docket api() {
        return new Docket(DocumentationType.OAS_30)
                .select()
                .apis(RequestHandlerSelectors.basePackage("com.yss.user.rest"))
                .paths(PathSelectors.any())
                .build();
    }
}
```

**3. 访问文档**:
```
http://localhost:8080/swagger-ui/index.html
```

## 5. 常见问题

### 5.1 如何修改端口？

修改 `application.yml`:
```yaml
server:
  port: 9090
```

### 5.2 如何配置多环境？

创建多个配置文件：
- `application-dev.yml` (开发环境)
- `application-test.yml` (测试环境)
- `application-prod.yml` (生产环境)

启动时指定环境：
```bash
java -jar app.jar --spring.profiles.active=prod
```

### 5.3 如何添加全局异常处理？

```java
@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(BizException.class)
    public SingleResult<Void> handleBizException(BizException e) {
        return SingleResult.fail(e.getCode(), e.getMessage());
    }

    @ExceptionHandler(Exception.class)
    public SingleResult<Void> handleException(Exception e) {
        return SingleResult.fail("SYSTEM_ERROR", "系统异常");
    }
}
```

## 6. 性能优化建议

### 6.1 数据库优化
- 合理使用索引
- 避免 N+1 查询
- 使用分页查询
- 开启 MyBatis Plus 的性能分析插件

### 6.2 缓存优化
- 热点数据使用 Redis 缓存
- 合理设置缓存过期时间
- 使用缓存预热

### 6.3 代码优化
- 使用异步处理耗时操作
- 合理使用线程池
- 避免大事务
