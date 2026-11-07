# 来源与裁剪

参考 SCRM scrm-frontend 提交 `a5a331548bf7d2d4c46153506c4b823b4bcd14eb` 的前端脚手架和应用技能。来源只读；本版重写为 Rust CLI 调用说明，不复制 Node 生成器、业务页面、检查脚本或测试套件。

静态资源由 Frontend Bundle 的 `.template-spec/templates/frontend-starter/` 提供；技能包不携带资源副本。只保留实际工程配置、Button/Input、cn 工具、最小入口、页面目录、锁与许可。请求、API 客户端、mock、测试依赖和 useRequest 补丁均不进入默认工程；后续按应用技能的现有参考接入。

保留 shadcn-vue 固定上游摘要和 MIT 许可，copied-files 只登记实际保留文件；根 DESIGN 与 tokens 消费模板共享主题，自有 CSS 只映射当前组件。生成收据记录实际 Bundle 来源，不依赖 SCRM 路径。

原同名技能曾因旧实现退役；此次是独立原生入口，不恢复旧 capability/recipe 或迁移协议。生成命令从 CLI 3.3.0 起支持，正式可用性仍以所选来源的实际 Release、二进制帮助和 Bundle 为准。

2026-11-08 增加 YSS 自有 `components.json` 与说明，描述已有 new-york-v4/Tailwind 4、CSS 入口和 hooks 别名。配置不冒充上游复制源码，不加入 copied-files；Button/Input、utils、运行依赖与主题仍使用原基线。组件按需接入复用应用技能方法，源码生成仍不安装依赖或访问 registry；模板变化须进入实际构建的 Bundle 才能由候选程序验证，不代表旧内嵌资源已更新。
