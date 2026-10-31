# Maven 使用

仅在当前任务需要构建或运行时，优先目标工程根 ./mvnw。参数和目标按工程实际配置选择，不强制 validate、test、package 三步流程。

沿用工程已有 .mvn/maven.config、MAVEN_ARGS 或用户 ~/.m2/settings.xml。确需指定其他 settings 时使用标准 -s 参数；不要把私服密码、令牌或本机配置复制进仓库。

依赖无法获取、编译失败或运行环境缺失时记录实际错误，保留已生成内容，说明尚未完成的范围。文件生成不声称构建成功。
