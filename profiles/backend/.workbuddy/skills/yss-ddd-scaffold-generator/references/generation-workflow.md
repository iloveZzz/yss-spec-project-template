# DDD 受控生成与验证

仅在入口所列条件命中时读取本文件。Markdown 链接相对本文件；行内 references/assets/schemas 路径相对 Skill 根目录。Skill 自带的 bin/scripts 命令从 Skill 根目录执行；明确注明 repository root 的包装命令仍从项目根目录执行。

## 优先流程

   Harness 内默认以 `apps/backend/` 为输出父容器，生成器以 `project_name` 创建具体项目；其他父目录按合同中的实际项目根和写范围核验。
3. 检查生成的模块名、POM、机械启动入口、基础配置文件和包路径。
4. 受控工作流必须在生成项目根目录实际执行 `./mvnw validate`、`./mvnw test` 和 `./mvnw package`；三条命令全部返回 0 后才能报告完成。
