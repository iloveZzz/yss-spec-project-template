# 真实 Vue 预览基线

固定前端源码与原版 Java/PG：浏览器中打开CURRENT为1行、切ALL为2行、刷新ALL仍2行、空表0行、关闭换任务后重新打开CURRENT为1行。五次预览HTTP均200，原始请求/响应、console和五张稳定截图均保留。脚本实际退出0。

已目视核对ALL与空表截图。截图等待动画完成；第三次中间动画截图仍保留，不把它作为最终视觉证据。

无console warning。唯一console error来自测试隔离主动阻止外部模板头像；业务请求没有该错误。第一次定位过宽与第二次tooltip遮挡关闭的失败均保留，详见verification.json。没有force click、DOM改写、业务源码修改或mock响应。这里通过的是既有预览基线，不是跨仓接收或完整UI覆盖率。
