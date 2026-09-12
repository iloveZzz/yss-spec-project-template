# 真实运行准备与HTTP结果

日期：2026-09-12。已完成本任务授权的隔离构建、数据库准备和原版Java运行验证。**真实预览API已经可用，但交付包接收S0–S6及Vue浏览器验收由主控继续，不能在此宣称整个试验通过。**

## 当前可用入口

- Java：`http://127.0.0.1:61111`；本轮进程PID34793，原版固定基线JAR，启动见[service-launch-08.json](service-launch-08.json)。源码未改。
- PostgreSQL：专用`yss-preview-0kxzmm-pg`，回环端口60050，独立卷；控制库`pilot_control`、目标库`pilot_target`。
- Redis：专用`yss-preview-0kxzmm-redis`，回环端口60054，独立卷。资源标签`yss.trial=target-preview-20260912-0kxzmm`，详见[资源记录](local-services.json)。
- 运行配置含随机密码，只保存在临时私有目录；可审阅的[脱敏配置](pilot-application.redacted.yml)不含密码。Java显式禁用Nacos/Eureka并替换默认配置，网络沙箱限制到本机；清空本机JDK SOCKS代理，避免回环请求被代理转出。

## 已执行的真实HTTP

以下均由该Java进程查询独立PG返回，完整状态、Content-Type和body保存在[第二次HTTP记录](preview-http-observations-02.json)，前次记录保留；[断言记录](http-validation.json)exit0。

| 请求 | 状态与实际结果 |
|---|---|
| PILOT_PREVIEW，不传scope | 200，默认CURRENT，只返回未失效的一行 |
| PILOT_PREVIEW，scope=CURRENT | 200，一行，与省略参数一致 |
| PILOT_PREVIEW，scope=ALL | 200，两行，含历史行 |
| PILOT_EMPTY，不传scope | 200，rows=[]、returnedRows=0，仍含全部列 |
| PILOT_UNKNOWN | 404，完整SingleResult，code=FILE_SYNC_TASK_NOT_FOUND、data=null |
| PILOT_PREVIEW，scope=INVALID | 400，独立错误体errCode=A0106、tips、message，没有success/data/code |

成功响应实际存在success=true、dataType=null、code=DM-A0001、message、tips、data；字段存在性及null已直接观察，不能只依赖DTO类推断。400参数绑定错误与404业务异常的wire shape不同，R2契约必须表达。合成输入及实库读回见[test-data-manifest.json](test-data-manifest.json)，该摘要仅覆盖预览任务/草稿和目标表，排除动态Scheduler/Ops运行数据。

## 构建与准备问题的实际处理

完整starter最初离线、联网、-U均在精确text-search-core快照解析失败。原缓存确有同版本JAR/POM；获主控授权后用APFS CoW建立独立Maven仓库，只对精确同字节文件登记本地来源，完整构建成功。未换版本、改POM或修改共享缓存。详见[构建历史](build-preparation-history.md)、[字节与登记映射](isolated-registration.json)、[成功日志](backend-exact-timestamp-package.log)。

Java预览单元测试7项通过；Vue standalone构建通过，精确API测试8项和弹窗源码断言3项通过。最初额外`--`导致全前端suite被执行，其中有失败；原结果保留，不宣称全套测试通过。

首轮Docker internal网络不发布动态host端口，已仅重建本轮容器/网络为独立bridge、保留专用PG卷。Java早期UnknownHost来自本机JDK SOCKS设置与网络沙箱交互；独立TCP/JDBC诊断和后续禁用代理参数留证。随后ops关闭仍扫描嵌套配置、关闭scheduler又缺Bean；通过现有配置启用真实本地Ops/Scheduler，安装其现有空表。未用Mock/Node假服务替代Java。

## 剩余限制与交接

当前starter仍有t_etl_workflow_instance、t_transfer_object等无关后台任务缺表日志，以及原有ProductInfoManagerRepository重复Mapper的ERROR级日志。预览HTTP六请求成功不证明整个聚合应用健康；本轮没有继续扩大为全业务schema部署或修改这些业务代码。完整启动日志[java-start-08.log](java-start-08.log)保留。

本任务仅生成构建输出、独立Maven缓存、专用运行配置/数据库和证据。两隔离源码受控文件diff为空（见[source-integrity-final.json](source-integrity-final.json)），原业务工作区未操作。资源保持运行供主控接续R2/R3与浏览器，不能按模糊名称清理其他服务；停止Java用登记PID，容器/卷/网络仅使用本轮名称和标签。

运行身份见[runtime-manifest.json](runtime-manifest.json)。安全停止脚本[stop-trial.py](stop-trial.py)默认不执行动作，显式`--stop-java`核对登记PID对应JAR/config路径后发SIGTERM；`--stop-containers`核对本轮标签后停止两容器，保留卷和证据。原版恢复脚本[restart-original-java.py](restart-original-java.py)先校验JAR/config摘要和端口空闲，恢复后仍须重采HTTP；生成的新启动记录可用stop脚本的`--launch-record`消费。本轮只做脚本语法检查，未为了验证脚本停止正在供浏览器使用的服务。
