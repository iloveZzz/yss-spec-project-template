# DDD 脚手架平台选择

生成前核对已有工程或用户给定的精确 Spring Boot、Java、Maven Parent 与 YSS BOM 坐标；同一 Maven Reactor 保持一致的平台组合。独立工程可沿用或明确选择不同组合，不把本机默认 Java 当作项目版本。

- 以项目 POM、实际组件源码和解析结果为依据。已有兼容记录可参考 `.template-spec/engineering/backend-platforms.md`，记录缺失只表示尚未证实，不等于官方框架不支持。
- 缺少关键版本或坐标先查询可信资料，仍不确定时澄清；解析冲突、缺失构件或已知不兼容须如实处理，不擅自替换组件、降级或声称可以运行。
- 不要求生成平台合同、登记、审批、兼容报告或资格标记。生成后按当前任务需要构建或运行，未执行的检查不声明通过。
- Spring MVC、Servlet、Validation、Jackson、starter 和处理器使用所选精确版本对应的坐标与命名空间；Jakarta 转换不包括 `javax.sql` 等 Java SE API。
- 历史样例、H2 或其他架构的记录不证明当前应用、生产数据库或所有 YSS 组件兼容；版本调整需要说明受影响依赖和调用方。
