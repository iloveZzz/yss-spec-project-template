# 实际运行准备结果

2026-09-12，消费R1–R3授权与environment-authorized-task.json；仅隔离副本生成构建输出，未改受控源码/锁文件。

**当前完整Java starter尚不能构建，真实试验S0未开始。** 全量打包在`valuatioin-outsourced-subjectmap`解析`com.yss.cloud:yss-component-text-search-core:2.0.0-20260317.052440-5`失败。离线、联网和`-U`三次exit1相同；但活跃本机Maven仓库存在精确JAR与POM，JAR SHA-256为`cf9b033e80cde2927782c3aae98fe327c3cc7dd01b313ba5664fcc63b1be3b39`。不能说依赖文件不存在，具体快照/仓库元数据解析原因尚未查明；未改全局缓存、替换版本或修改POM。

已通过的独立准备：

- file-sync独立Controller/Application/JDBC mock测试7项，exit0；不代表实库或完整starter。
- 前端根/packages均使用离线、冻结锁、忽略安装脚本安装成功；Vue standalone构建exit0，保留第三方directive、chunk告警。
- 精确预览API测试8项和弹窗源码断言3项通过。不是浏览器验证。
- desktop-linux本机Unix socket上的Docker服务29.6.2可达，已有arm64 postgres:15和redis:7.0镜像；已锁定镜像ID/RepoDigest，未启动容器。
- 结束时两隔离源码`git diff --name-only`均空。原工作区未操作。

首次`pnpm test -- <file>`的额外分隔符未达到预期过滤，实际跑到42个测试文件/211项测试，9个文件失败、8项测试失败，另含加载失败。保留该原始失败日志；正确的`pnpm exec vitest run <file>`精确复跑通过。不能宣称全部前端测试通过，也不能把无关suite失败说成预览失败。

命令、实际退出码、耗时与日志SHA见[result.json](result.json)。后端失败完整记录为[backend-update-package.log](backend-update-package.log)，窄测试见[backend-preview-tests.log](backend-preview-tests.log)，前端构建见[frontend-standalone-build.log](frontend-standalone-build.log)。未建立PG库/合成数据，没有业务HTTP或S0–S6/O1结果。下一步先澄清精确依赖解析原因；建议仅在独立Maven仓库验证已存在精确字节与POM，不更换版本或伪造来源。

## 后续：已在隔离缓存解决精确构件解析

主控明确允许独立Maven缓存修复。使用APFS copy-on-write复制缓存，未硬链接或修改共享仓库；核验精确timestamp JAR/POM与原缓存字节一致后，仅在独立`_remote.repositories`登记这两个精确文件为本地来源。`install-file`先将timestamp归一化为SNAPSHOT，单靠该步骤未解决，相关失败仍保留。精确timestamp登记后完整starter离线打包exit0，证明原阻塞与缓存来源登记有关。完整映射见[isolated-registration.json](isolated-registration.json)，成功日志见[backend-exact-timestamp-package.log](backend-exact-timestamp-package.log)，产物摘要见[backend-artifacts.json](backend-artifacts.json)。未替换依赖版本、改业务POM或回写共享Maven缓存。

这只关闭构建依赖阻塞，前述真实运行、数据库和浏览器边界仍适用。
