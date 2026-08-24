# YSS UI Utils 速查

业务页面生成时优先从 `@yss-ui/utils` 复用工具函数，避免重复实现。

## 常用工具

- 权限：`getAuthBtns`、`hasAuth`、`getBtnInfo`、`clearAuthInfo`。
- 复制：`copyToClipboard(text)`。
- 下载：`downloadFileStream`、`getFileNameFromContentDisposition`、`handleBlobResponse`、`downloadFileFromUrl`。
- 格式化：`formatMoney`、`formatDate`、`formatFileSize`、`formatDateRelative`。
- 主题：`applyYssTheme`、`lightenColor`、`darkenColor`。
- URL：`getUrlData`。

接口导出下载必须读取 `file-export-download` 专项技能，优先复用统一的 Blob 响应处理，不在页面 Hook 重复解析文件名和创建下载链接。
