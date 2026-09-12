# 原版 Vue 初次浏览器检查

独立测试 Chromium 153.0.8010.12，视口 1440×1000，已构建 production.standalone；未加载开发 mock，不修改组件。页面真实渲染文件同步工作台；Java 尚未启动时，任务列表请求返回 500，页面展示加载失败与重试提示。

这次运行只证明页面可加载和初始失败状态可观察，不是预览正例、交付接收或 S0。当前浏览器没有会话凭据。唯一非本地请求是模板 Admin 头像，测试网络隔离主动阻止它，相关 console 错误归为试验隔离影响；另一错误来自尚未就绪的 API。没有观察到 console warning。

文件 evidence.json 保存实际网络/页面/console，page.png 为本次截图。API 目标由启动命令显式覆盖为 127.0.0.1:61111，不能使用源 .env.production.standalone 中的共享目标。
