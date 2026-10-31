# 原型浏览器与临时输入

`browser-session.mjs` 提供独立 Node 命令用的 `withBrowserSession`。它创建系统临时配置目录，只终止 `session.spawn` 创建并持有的浏览器进程；成功、异常和 SIGINT / SIGTERM / SIGHUP 均清理。SIGKILL、系统断电无法执行清理，失败时报告遗留路径；不按进程名结束浏览器，不使用用户 profile。

```js
import { withBrowserSession } from './browser-session.mjs';
await withBrowserSession(async session => {
  const browser = session.spawn(chromePath, [
    '--headless=new', `--user-data-dir=${session.profileDir}`,
    '--remote-debugging-port=0', 'about:blank'
  ], {stdio: 'ignore'});
  // 使用本次浏览器采集；截图和详细结果写入既有正式证据目录。
  // await verify(browser);
  // console.log(JSON.stringify(summary));
});
```

仅传入真正的浏览器可执行文件；不通过 shell 或会脱离控制的启动器。证据路径不得位于 `session.profileDir`。每条独立命令仅使用一个会话；不要在嵌入宿主服务中安装这些进程级信号处理器。关闭调试连接也应使用 finally。只读查看既有基线无需启动新浏览器。
