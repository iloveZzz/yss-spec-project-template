# 探针数据准备与恢复结果

2026-09-12。已完成当前有界准备，并按主控后续指令停止PG/Redis；卷及原基线保留。没有启动旧Java或Vite，没有修改源码、原seed或原运行配置。

本轮只恢复登记的两个容器，先核验本机Unix socket、完整容器ID、镜像ID与本轮标签，PG临时映射为127.0.0.1:57977，Redis为127.0.0.1:57978。映射可能在下次恢复时再次改变，不能沿用旧端口。实际操作见[restore-commands.json](restore-commands.json)、[restored-services.json](restored-services.json)、[stop-commands.json](stop-commands.json)；两容器最终均exited。

[test-data.json](test-data.json)冻结两case及公共控制表结构，共18条固定查询。协议摘要为`sha256:ac19dbec9bfb2e280a5a4bbe060f92e36727bdd9b733438eff1914122010181d`。精确SQL、每值规范化、控制配置漂移与JDBC只读检查方案见[normalization.md](normalization.md)。[snapshot.json](snapshot.json)与[jdbc-snapshot.json](jdbc-snapshot.json)是无秘密的合成数据实际读回；两者逐项相同。

实际验证：[verification.json](verification.json)记录18条SQL字节摘要、psql/JDBC一致性；[jdbc-verification.json](jdbc-verification.json)证明每库read-only＋REPEATABLE READ＋UTC。文件摘要校验exit0，JDBC命令exit0。本轮没有实现Provider或验证其503行为，也没有执行交付S0–S6/O1。

新连接配置仅在本次临时私有目录`runtime-private/probe-connection.json`，权限0600；完整位置见restored-services.json，只供后续进程启动，不包含在test-data文件。不要输出文件内容或复用停止前端口。原pilot-application.yml未改。

主控因R3治理路由缺口停止后续实现；这些资产是可复用准备证据，不代表真实交付试验通过。后续恢复须重新核验容器身份、映射与冻结数据，任何实际变化须重新审阅/批准，不能覆盖当前baseline让检查自动通过。
