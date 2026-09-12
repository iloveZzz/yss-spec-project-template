# 固定查询与规范化合同

版本：`postgresql15-jsonb-array-text-v1`。本文件为已批准R3设计的准备输入；不是Provider实现或其批准。固定SQL全集见[fixed-queries.json](fixed-queries.json)，每条原字节另存`sql/<id>.sql`。协议身份是[test-data.json](test-data.json)原字节SHA-256，不是SQL文件hash或查询结果hash。

## 校验对象

整个test-data.json冻结两个独立case：PILOT_PREVIEW与PILOT_EMPTY。两者分别有任务记录、草稿、版本、目标列结构、主键和数据行检查；六个公共检查固定三个控制表的列结构及主键。总计18条查询。任一case/公共检查变化、缺失、增加或读取失败，使整份身份不可用。

- 控制库只选择两个已命名任务；task字段覆盖id、编码、名称、状态、已发布版本、owner、retention及创建/修改时间。
- draft覆盖id、任务id、revision、config_json原始字符串、两个验证摘要、验证/过期/创建/修改时间。保留config_json原字符串意味着语义相同但字节不同的配置也会失效，不能只比较config_digest字段。
- version覆盖选中任务的全部版本行及config_digest、config_json；当前预期为空，新增已发布版本也会被发现。
- 目标分别为public.pilot_preview_rows、public.pilot_preview_empty；数据行包含id、label、start_date、end_date。
- 列结构覆盖物理列序号、名称、类型/长度、NOT NULL、默认表达式及注释；主键覆盖约束名和按顺序排列的列名。控制表结构也覆盖，防止列类型被改变后仅比较数据仍误通过。

## 每种值如何固定

| 值 | 规则 |
|---|---|
| 行容器 | 每条SQL返回唯一TEXT列canonical_value，内容由PostgreSQL jsonb_build_array生成；数组位置由固定SQL定义，不依赖对象key顺序 |
| 整数/主键/版本 | SQL显式`::text`后进入JSON字符串，不经过JavaScript双精度数字，保留bigint精度 |
| 业务字符串 | 直接进入JSON字符串；保留大小写、Unicode、前后空白，不trim、不替换换行、不做Unicode归一化 |
| 配置JSON | 作为原始TEXT字符串进入数组，不重新parse/stringify；任何配置字节变化均改变canonical_value |
| SQL NULL | 进入JSON null，与字符串"null"、空字符串区别；ResultSet.getString(1)的整行NULL则直接失败 |
| 布尔 | 结构检查的attnotnull保持JSON true/false；nullable语义由NOT NULL反向判读，不混用0/1 |
| timestamp without time zone | `to_char(value,'YYYY-MM-DD"T"HH24:MI:SS.US')`，固定6位小数，无时区后缀；NULL保持NULL；不假称本地时间为UTC instant |
| 类型/默认值/注释 | pg_catalog.format_type、pg_get_expr、col_description按PG15文本结果固定；不同输出视为结构漂移 |
| 排序 | 目标行按bigint id；控制行按id或version_number/id；列按attnum；主键列按conkey ordinality，约束名按C排序 |
| 空集合 | expected_rows=[]，不是NULL、缺失检查或零列；空表仍必须通过列结构/主键检查 |
| 行数上限 | SQL LIMIT1001，JDBC setMaxRows(1001)，逐项且条数精确匹配；本基线最大单查询10行以内，超过预期必失败，不能只比较前N行 |

Provider取`ResultSet.getString(1)`，转换为普通Java String后按列表顺序逐项等值比较expected_rows。不要解析canonical_value再交给Jackson重新序列化，也不要对PG输出trim；换行仅属于传输记录分隔，不是JSON字符串内容。SQL JSONB文本格式依PG major15冻结；实例版本不同应先重建/审阅基线，而非静默接受新格式。

## JDBC执行顺序与权限

1. 校验test-data文件原字节摘要与已冻结说明一致；固定checks ID全集、datasource、phase、SQL SHA必须与实现中受审阅注册表一致。不得从HTTP参数或任意文件加载自由SQL。推荐把18个固定SQL以编译常量或已绑定资源提供；JSON里的sql_ref用于定位与审计，不是可任意执行的路径。
2. 两个明确登记的连接分别指向pilot_control、pilot_target；凭据仅由本次私有连接配置提供，不出现在test-data.json或HTTP响应。
3. 每个连接设置autoCommit=false、readOnly=true、TRANSACTION_REPEATABLE_READ；显式执行`SET LOCAL TIME ZONE 'UTC'`。核验current_setting(transaction_read_only/transaction_isolation/TimeZone)为on/repeatable read/UTC。仅传JDBC options不足以证明会话状态，本次第一轮诊断即未满足，已保留失败并在显式SET后通过。
4. 先执行phase=structure，再content；每条queryTimeout=2秒、socket/connect timeout=3秒，所有结果完整消费、关闭ResultSet/Statement，结束rollback并close。不执行DDL、seed、触发文件同步或调度业务。
5. 两库各有自己的REPEATABLE READ快照，不能宣称跨库全局原子快照。试验冻结业务写入；两库所有检查均等于冻结基线才成功。此设计不证明并发业务写入下的原子一致性。
6. 任一读取异常、超时、结构/数据失配、缺失/额外check或行数不一致返回503，不返回旧摘要，也不自动刷新baseline。整份test-data.json的hash才是成功时test_data_digest。

## 已执行证据与边界

psql与真实PostgreSQL JDBC42.7.8已分别读取18条固定查询，结果完全一致。JDBC实际观测两个事务均readOnly/on、repeatable read、UTC；[jdbc-verification.json](jdbc-verification.json)与[jdbc-command.json](jdbc-command.json)退出0。第一次会话合同检查失败保留在jdbc-attempt-01.*，未修改数据解决。

本次没有在数据库注入变化；“任务/配置/schema/行变化必须503”仍是Provider后续实现与故障试验的验收要求，不能把准备脚本一致性检查写成该运行行为已实现。verify-jdbc.js只是只读诊断，不替代Java同进程Provider。
