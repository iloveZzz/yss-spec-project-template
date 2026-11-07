# 来源与许可

最小工程改编自 SCRM scrm-frontend 提交 `a5a331548bf7d2d4c46153506c4b823b4bcd14eb` 的 frontend scaffold 资源。未复制业务页面、请求演示、生成 API、mock、补丁、脚本或测试套件。

Button、Input 和 cn 工具保留 shadcn-vue 原始字节；`copied-files.json` 只登记实际保留的文件，`registry-manifest.json` 保留上游固定 revision 与组件目录信息（不是本工程已安装组件清单）。MIT 许可见 `SHADCN-LICENSE.txt`。

DESIGN 与 `src/styles/tokens.css` 来自 YSS 模板的共享标准亮色主题；必要边界 #7d8aa0、辅助文字 #62728c、新列表 48px/14/22。theme/main 只映射当前 Button/Input 所需角色和密度，未携带原型布局。YSS 许可见 `YSS-DESIGN-LICENSE.txt`。生成时只结构化修改 package.name，其他资源按 Bundle 原字节复制；准确来源由 `.yss/scaffold.json` 记录。

依赖及其许可证通过包管理器安装。请求与 OpenAPI 按任务选用，不内置于最小工程。
