---
title: JSP 项目接入（UMD + CDN/本地）
description: 在 JSP/Servlet 项目中通过 UMD 形式集成 Vue 3 + YSS UI，并支持将 CDN 资源一键下载到本地离线部署
order: 20
toc: content
---

## 适用场景

- 现有单体/多模块 Java 应用（Spring MVC、Spring Boot、SSM 等）仍以 JSP 渲染页面。
- 需要在 JSP 中直接使用 Vue 3 与 YSS UI，而暂时无法引入打包构建链路（Vite/Webpack）。

方案采用 UMD 全局构建：通过 `<link>`/`<script>` 标签按顺序引入依赖，在页面里创建并挂载 Vue 应用。

## 依赖关系与加载顺序

必须保证以下顺序（同 Demo）：

```38:63:/Users/wangyancong/Downloads/guangda/Sonorus/yss-ui-demo/index.html
  <!-- 依赖顺序：Vue3 -> xe-utils -> vxe-pc-ui -> vxe-table -> dayjs(+plugins) -> antd -> Formily -> yss-ui -->
  <script src="../resources/vue3/vue.global.js" defer></script>
  <script src="../resources/xe-utils/xe-utils.umd.min.js" defer></script>
  <script src="../resources/vxe-pc-ui/index.umd.min.js" defer></script>
  <script src="../resources/vxe-table/index.umd.min.js" defer></script>
  <script src="../resources/dayjs/dayjs.min.js" defer></script>
  <script src="../resources/dayjs/plugin/advancedFormat.js" defer></script>
  <script src="../resources/dayjs/plugin/customParseFormat.js" defer></script>
  <script src="../resources/dayjs/plugin/localeData.js" defer></script>
  <script src="../resources/dayjs/plugin/quarterOfYear.js" defer></script>
  <script src="../resources/dayjs/plugin/weekOfYear.js" defer></script>
  <script src="../resources/dayjs/plugin/weekYear.js" defer></script>
  <script src="../resources/dayjs/plugin/weekday.js" defer></script>
  <script src="../resources/ant-design-vue/antd.js" defer></script>
  <script src="../resources/formily/formily.core.umd.js" defer></script>
  <script src="../resources/formily/formily.vue.umd.js" defer></script>
  <script src="../resources/formily/formily.antdv.umd.js" defer></script>
  <script src="../resources/formily/formily.validator.umd.js" defer></script>
  <script src="../resources/yss-ui/yss-ui.umd.js" defer></script>
```

## 本地目录建议

将静态资源统一放在服务器可直接访问的路径（例如 `src/main/resources/static/vendor` 或 Nginx 的根目录 `static/vendor`）：

```
static/
  vendor/
    ant-design-vue/
    dayjs/
      plugin/
    formily/
    vue3/
    vxe-pc-ui/
    vxe-table/
    xe-utils/
    yss-ui/
```

## 一键下载：使用 curl 将 CDN 资源落地

以下脚本可直接在 macOS/Linux 终端执行。会创建目录并下载相应 UMD/CSS 文件到 `static/vendor`。

```bash
#!/usr/bin/env bash
set -euo pipefail

# 版本可按需调整（建议与后续生产依赖保持一致）
VUE_VERSION=3.5.12
XE_UTILS_VERSION=3.5.21
VXE_UI_VERSION=3.7.18
VXE_TABLE_VERSION=4.6.18
DAYJS_VERSION=1.11.11
ANTDV_VERSION=4.2.6
FORMILY_VERSION=2.4.14
YSSUI_VERSION=latest   # 如走私有 npm，可改为具体发布号

BASE=static/vendor
mkdir -p "$BASE"/{vue3,xe-utils,vxe-pc-ui,vxe-table,dayjs/plugin,ant-design-vue,formily,yss-ui}

# Vue 3（全局构建）
curl -L "https://cdn.jsdelivr.net/npm/vue@${VUE_VERSION}/dist/vue.global.prod.js" -o "$BASE/vue3/vue.global.js"

# xe-utils
curl -L "https://cdn.jsdelivr.net/npm/xe-utils@${XE_UTILS_VERSION}/dist/xe-utils.umd.min.js" -o "$BASE/xe-utils/xe-utils.umd.min.js"

# vxe-pc-ui 与 vxe-table（注意顺序）
curl -L "https://cdn.jsdelivr.net/npm/vxe-pc-ui@${VXE_UI_VERSION}/lib/index.umd.min.js" -o "$BASE/vxe-pc-ui/index.umd.min.js"
curl -L "https://cdn.jsdelivr.net/npm/vxe-table@${VXE_TABLE_VERSION}/lib/index.umd.min.js" -o "$BASE/vxe-table/index.umd.min.js"

# dayjs 及常用插件
curl -L "https://cdn.jsdelivr.net/npm/dayjs@${DAYJS_VERSION}/dayjs.min.js" -o "$BASE/dayjs/dayjs.min.js"
for p in advancedFormat customParseFormat localeData quarterOfYear weekOfYear weekYear weekday; do
  curl -L "https://cdn.jsdelivr.net/npm/dayjs@${DAYJS_VERSION}/plugin/${p}.js" -o "$BASE/dayjs/plugin/${p}.js"
done

# Ant Design Vue（UMD + 样式）
curl -L "https://cdn.jsdelivr.net/npm/ant-design-vue@${ANTDV_VERSION}/dist/antd.min.js" -o "$BASE/ant-design-vue/antd.js"
curl -L "https://cdn.jsdelivr.net/npm/ant-design-vue@${ANTDV_VERSION}/dist/antd.min.css" -o "$BASE/ant-design-vue/antd.min.css"

# Formily（yss-ui 的 UMD 工厂会解构 Formily.*，需先定义）
curl -L "https://cdn.jsdelivr.net/npm/@formily/core@${FORMILY_VERSION}/dist/formily.core.umd.js" -o "$BASE/formily/formily.core.umd.js"
curl -L "https://cdn.jsdelivr.net/npm/@formily/vue@${FORMILY_VERSION}/dist/formily.vue.umd.js" -o "$BASE/formily/formily.vue.umd.js"
# 不同生态包名可能为 @formily/antdv 或 @formily/antdv-x，任选其一可用即可
curl -L "https://cdn.jsdelivr.net/npm/@formily/antdv-x@${FORMILY_VERSION}/dist/formily.antdv.umd.js" -o "$BASE/formily/formily.antdv.umd.js" || true
curl -L "https://cdn.jsdelivr.net/npm/@formily/validator@${FORMILY_VERSION}/dist/formily.validator.umd.js" -o "$BASE/formily/formily.validator.umd.js"

# YSS UI（UMD + 样式）
curl -L "https://cdn.jsdelivr.net/npm/@yss-ui/components@${YSSUI_VERSION}/dist-umd/yss-ui.umd.js" -o "$BASE/yss-ui/yss-ui.umd.js"
curl -L "https://cdn.jsdelivr.net/npm/@yss-ui/components@${YSSUI_VERSION}/dist-umd/yss-ui.css" -o "$BASE/yss-ui/yss-ui.css"

echo "\n下载完成：请将 ${BASE} 目录发布到 Web 服务器可访问路径。"
```

> 无公网/私有 npm 的环境：可以直接从内部仓库复制 `packages/components/dist-umd/yss-ui.umd.js` 与 `yss-ui.css` 到 `static/vendor/yss-ui/`。

## JSP 页面模板（完整可复制）

以下示例演示如何在 JSP 中引入上述静态资源，并挂载一个最小应用。建议保留 `defer`，保证脚本按顺序解析后在 DOM 可用时执行。

```html
<%@ page contentType="text/html; charset=UTF-8" pageEncoding="UTF-8" %>
<%@ taglib prefix="c" uri="http://java.sun.com/jsp/jstl/core" %>
<c:set var="ctx" value="${pageContext.request.contextPath}" />
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>YSS UI - JSP 集成示例</title>

  <!-- 样式（YSS UI + Ant Design Vue） -->
  <link rel="stylesheet" href="${ctx}/static/vendor/yss-ui/yss-ui.css" />
  <link rel="stylesheet" href="${ctx}/static/vendor/ant-design-vue/antd.min.css" />

  <!-- 依赖顺序：Vue3 -> xe-utils -> vxe-pc-ui -> vxe-table -> dayjs(+plugins) -> antd -> Formily -> yss-ui -->
  <script src="${ctx}/static/vendor/vue3/vue.global.js" defer></script>
  <script src="${ctx}/static/vendor/xe-utils/xe-utils.umd.min.js" defer></script>
  <script src="${ctx}/static/vendor/vxe-pc-ui/index.umd.min.js" defer></script>
  <script src="${ctx}/static/vendor/vxe-table/index.umd.min.js" defer></script>
  <script src="${ctx}/static/vendor/dayjs/dayjs.min.js" defer></script>
  <script src="${ctx}/static/vendor/dayjs/plugin/advancedFormat.js" defer></script>
  <script src="${ctx}/static/vendor/dayjs/plugin/customParseFormat.js" defer></script>
  <script src="${ctx}/static/vendor/dayjs/plugin/localeData.js" defer></script>
  <script src="${ctx}/static/vendor/dayjs/plugin/quarterOfYear.js" defer></script>
  <script src="${ctx}/static/vendor/dayjs/plugin/weekOfYear.js" defer></script>
  <script src="${ctx}/static/vendor/dayjs/plugin/weekYear.js" defer></script>
  <script src="${ctx}/static/vendor/dayjs/plugin/weekday.js" defer></script>
  <script src="${ctx}/static/vendor/ant-design-vue/antd.js" defer></script>
  <script src="${ctx}/static/vendor/formily/formily.core.umd.js" defer></script>
  <script src="${ctx}/static/vendor/formily/formily.vue.umd.js" defer></script>
  <script src="${ctx}/static/vendor/formily/formily.antdv.umd.js" defer></script>
  <script src="${ctx}/static/vendor/formily/formily.validator.umd.js" defer></script>
  <script src="${ctx}/static/vendor/yss-ui/yss-ui.umd.js" defer></script>
</head>
<body>
  <div id="app">
    <a-config-provider :wave="{ disabled: true }">
      <y-button type="primary">Hello JSP + YSS UI</y-button>
    </a-config-provider>
  </div>

  <script defer>
    const { createApp } = Vue;
    const app = createApp({});
    [window.VXETable, window.antd, window.YssUI].forEach(p => { try { p && app.use(p); } catch (e) { console.warn(e); } });
    app.mount('#app');
  </script>
</body>
</html>
```

> 插件注册方式与 Demo 一致：

```90:95:/Users/wangyancong/Downloads/guangda/Sonorus/yss-ui-demo/main.js
  const plugins = [window.VXETable, window.antd, window.YssUI];
  plugins.forEach(p => { try { p && app.use(p); } catch (e) { console.warn('plugin use failed:', e); } });
  app.mount('#app');
```

## 常见问题

- **脚本一定要用 defer 吗？** 推荐使用。UMD 均无需模块系统，`defer` 可保证元素已解析再执行，同时保持加载顺序。
- **Formily 是不是必须？** 目前 UMD 版本的 yss-ui 在工厂函数中会解构 `Formily.*`，因此需先定义。如果没有使用表单相关能力，也可在后续版本优化此约束。
- **如何离线部署？** 将 `static/vendor` 目录随应用一起打包发布或由 Nginx 统一托管；JSP 通过 `${ctx}` 引用静态资源上下文。
- **如何更新版本？** 只需替换对应文件即可，注意 vxe-pc-ui 与 vxe-table 的兼容矩阵，优先成对升级。

### DOM 模板中的插槽命名

HTML/JSP 等 DOM 模板会将属性名统一转为小写，这会影响具名插槽与指令参数的大小写匹配：

- 请统一使用中划线（kebab-case）插槽名，例如：`#toolbar-left`、`#toolbar-right`、`#action-more-icon`、`#name-header`、`#name-filter`。
- 对应地，组件内部已兼容旧的 camelCase 写法（如 `#toolbarLeft`），但在 DOM 模板中会被浏览器转为 `toolbarleft` 导致不匹配，建议尽快切换到 kebab-case。
- 临时兼容方案：可使用动态参数写法避免浏览器改写（不推荐长期使用）：

```html
<!-- 动态 v-slot 名称在运行时计算，避免被浏览器转小写 -->
<template v-slot:[slotName]>...</template>
<script>
  const slotName = 'toolbarLeft';
</script>
```


## 进阶：拆分业务脚本

当页面逻辑变复杂，建议将 `main.js` 独立到 `static/js/main.js`，JSP 只负责引入：

```html
<script src="${ctx}/static/js/main.js" defer></script>
```

脚本内容可参考 Demo：

```75:95:/Users/wangyancong/Downloads/guangda/Sonorus/yss-ui-demo/main.js
      return { columns, tableData, formState, roleOptions, statusOptions, handleSearch, handleReset };
    },
  });
  const plugins = [window.VXETable, window.antd, window.YssUI];
  plugins.forEach(p => { try { p && app.use(p); } catch (e) { console.warn('plugin use failed:', e); } });
  app.mount('#app');
```

---

如需示例静态资源与完整页面，可参考仓库中的 Demo 目录 `Sonorus/yss-ui-demo/`。


