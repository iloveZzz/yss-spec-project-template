# 参考资料

本文档详细介绍了 `yss-component-mybatis-starter` 模块中的核心类和配置类，这些类构成了通用 MyBatis 模式的基础。

## 核心类 (Core Classes)

### 1. BaseRepository.java
**位置**: `../assets/BaseRepository.java`

`BaseRepository<T, D>` 是通用 MyBatis 模式下的核心 Mapper 接口，所有业务 Repository 都应继承它。

**主要特性**:
- **继承链**: 继承了 `io.mybatis.mapper.BaseMapper` (基础 CRUD), `io.mybatis.mapper.list.ListMapper` (批量操作), 和 `com.baomidou.mybatisplus.core.mapper.Mapper` (兼容性)。
- **通用方法**:
  - `insert`, `update`, `delete`: 标准的单表操作。
  - `selectBatchIds`, `deleteBatchIds`: 批量操作。
  - `selectByMap`, `selectMaps`, `selectObjs`: 基于 Map 和 Wrapper 的查询。
- **扩展点**: 允许用户通过继承此接口，获得开箱即用的 CRUD 能力，无需编写 XML。

### 2. EntityQueryAspect.java
**位置**: `../assets/EntityQueryAspect.java`

这是一个 AOP 切面，用于实现非侵入式的自动分页功能。

**工作原理**:
- **切点**: 拦截所有 Repository 层 (`@Repository`) 和 Gateway 实现层的方法。
- **条件**: 方法参数中必须包含 `com.yss.cloud.dto.page.PageQuery` 对象。
- **逻辑**:
  1. 检查 `PageQuery` 参数是否非空。
  2. 调用 `PageHelper.offsetPage(offset, pageSize)` 开启分页。
  3. 执行目标方法。
  4. 获取分页结果的总记录数 (`page.getTotal()`)。
  5. 将总数回填到 `PageQuery.tempTotalCount` 字段中。

### 3. MybatisBaseConfiguration.java
**位置**: `../assets/MybatisBaseConfiguration.java`

MyBatis 基础配置类，负责加载核心组件。

**主要功能**:
- **导入配置**: 导入了 `PageQueryEntityConfigration`，确保分页切面生效。
- **启用属性**: 启用了 `PrimaryDataSourceProperties`, `MybatisPlusGlobalProperties`, `YssMybatisMapperProperties` 等配置属性类。

### 4. PageQueryEntityConfigration.java
**位置**: `../assets/PageQueryEntityConfigration.java`

负责注册分页查询切面。

**主要功能**:
- 定义了 `entityQueryAspect` Bean，使其受 Spring 容器管理，从而激活自动分页拦截功能。

## 使用建议

当您在开发中使用通用 MyBatis 模式时：
1. **定义 Repository**: 直接继承 `BaseRepository<Entity, ID>`。
2. **分页查询**: 在方法参数中添加 `PageQuery`，框架会自动处理分页逻辑。
3. **批量操作**: 使用 `insertList`, `updateList` 等方法进行高效的数据处理。
