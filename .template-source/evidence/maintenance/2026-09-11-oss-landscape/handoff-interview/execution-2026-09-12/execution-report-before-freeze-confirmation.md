# 已授权准备执行报告

当前结论：**真实 Java＋PostgreSQL＋Vue 预览基线已跑通；跨仓接收/拒收恢复试验尚未完成。** R1–R3授权已消费，不再等待重复范围确认。当前停在新形成的OpenAPI v3人工Freeze决定，审阅包见下方。

## 已完成的真实工作

| 工作 | 结果与证据 |
|---|---|
| R1 | 三独立治理实例init退出0；前后端外部源码已登记；三仓词汇对账通过 |
| 固定源码 | 后端714fd4223d202b29c410d4d5533913e44874b3f1，前端76f2d1627f797d5b12a99c48cf49125544933b18；33个范围文件字节保持一致 |
| Java | 精确版本依赖在隔离Maven缓存完成本地登记后，原版完整starter构建退出0；7项预览测试通过 |
| Vue | frozen-lockfile离线安装、独立构建通过；API测试8项通过，弹窗源码断言3项通过，两者不冒充浏览器 |
| 真正运行 | 独立PG/Redis、原版JAR、两合成任务；两轮各6项HTTP：默认/CURRENT各1行、ALL2行、空表0行、非法scope400、未知任务404 |
| 真正页面 | 五次预览请求全部200；打开1行、切ALL2行、刷新2行、空表0行、重开CURRENT1行；网络、console、五张稳定截图保留 |
| R2 | OpenAPI1.0.0-pilot.3、字段追踪、行为校准规格、锁定Redocly2.0.0与validation verifier通过；独立API设计Review Approved |
| R3 | 真实同进程探针的来源/打包/运行/数据/503设计已形成并接受设计审查；代码未实现，当前API尚未人工Freeze |

## 发现与处置

1. 源接口文档存在scope必填性、空值和错误包装差异。真实非法scope为errCode/tips/message，业务错误是SingleResult；候选保留兼容分支，未改业务实现。
2. 私有精确构件本机存在，Maven识别失败；只改隔离缓存登记、未换依赖版本或修改共享缓存/POM。失败链和摘要映射保留。
3. 原版starter最小装配涉及PG、Redis、Ops和调度配置。预览可运行，仍有无关后台缺表和重复Mapper日志；不宣称全应用健康。
4. 浏览器首次定位过宽、随后tooltip遮挡关闭两次失败均保留。通过精确任务行定位、正常移开鼠标和等待提示消失恢复，无force click、DOM改写或业务修复。
5. 唯一最终console error为测试网络隔离阻止外部模板头像；无console warning。该错误不算API故障或产品修改理由。

## 证据入口

- [运行准备与原失败链](runtime-preparation/report.md)
- [浏览器最终基线](browser-preparation/preview-interactions-04/report.md)、[机器证据](browser-preparation/preview-interactions-04/verification.json)
- [33文件/Context核验](authorized-preparation-verification.json)
- [11项审查依据当前摘要](current-review-binding-verification.json)
- [当前checkpoint](execution-checkpoint.json)
- [当前冻结审阅包](/private/var/folders/8d/60y8vj2j0nn37t4h26zbvvhw0000gn/T/yss-preview-pilot-20260912-0k_x_zmm/backend-governance/docs/.scratch/target-preview-pilot/architecture/freeze-decision.md)

## 剩余工作与暂停

当前OpenAPI SHA-256：`sha256:8d696f69a62bee50545d418a458f848941e4e84647fea465b524779c8708259b`。独立设计审查不代替生物人Freeze。已经展示当前规格、候选、风险和摘要并发出一次确认请求，尚未收到此请求的真实回复；原R1–R3范围授权仍有效。

待回复后核验资产未变，按正常批准与实现合同执行探针、战略/后端交付和独立前端接收，再运行S0–S6/O1。**这些场景本轮全部未执行**，不能把API正例或模板9项合成场景写成跨仓机制通过。

等待期间已停止本次Java、Vue预览和专用PG/Redis，保留数据卷、私有配置和停止/恢复记录。恢复必须核验端口、JAR/config/data当前身份；不假定旧部署仍在线。未改原业务仓、未提交/推送/发布。
