# Vue 设计与组件库适配

先读取目标项目现有页面、设计规范、依赖与锁文件，再按实际安装版本查看组件配置和主题；信息缺失时标为未知，不因设计参考自动安装或升级依赖。已有规范与明确用户要求优先；风格与密度按任务调整。

## shadcn-vue

新项目高保真浏览器原型按 [Vue 原型准备](shadcn-vue-prototype.md) 使用固定组件来源；官方 Skill 可用时按需协作，不是独立复制的前提。

无其他视觉依据时可参考 shadcn-vue 的简洁层级与语义角色，但无需采用其默认颜色或组件。已有项目读取 components.json、组件源码、Tailwind 版本和实际 CSS；使用项目既有 CSS 变量或非变量方式，不擅自重装组件、覆盖代码或切换主题机制。需要具体 API 时按已安装版本核对 [主题文档](https://www.shadcn-vue.com/docs/theming) 和 [组件文档](https://www.shadcn-vue.com/docs/components)；官方技能可用时可协作，不是前提。

## Ant Design Vue

确认目标项目的 ant-design-vue 版本、ConfigProvider、组件覆盖及主题；按目标组件库版本文档核验 Token、算法和组件能力。Ant Design Vue 4.2.6 的主题配置可参考其 [4.2.6 文档](https://github.com/vueComponent/ant-design-vue/blob/4.2.6/site/src/vueDocs/customize-theme.zh-CN.md)，实际项目可能使用其他版本。React Ant Design 的 API、版本与算法输出不能直接视为 Vue 等价。保留已有主题，未经请求不修改生产配置。

两种库可表达背景、前景、主操作、状态、边框等设计角色，但映射和计算值不必相同。组件原语的无障碍能力不能代替目标页面的实际键盘、焦点、对比度及适用辅助技术检查；工具或环境不可用时说明未验证范围。
