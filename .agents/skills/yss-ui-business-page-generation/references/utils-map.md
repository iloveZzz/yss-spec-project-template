# YSS UI Utils 速查

业务页面生成时优先从 `@yss-ui/utils` 复用工具函数，避免重复实现。

## 权限

- `getAuthBtns(): AuthBtn[]`：读取当前按钮权限列表。
- `hasAuth(code?: string): boolean`：判断权限码是否可用。
- `getBtnInfo(code?: string): AuthBtn | null`：获取权限按钮信息。
- `clearAuthInfo(): void`：清理权限信息。

## 复制

```ts
const ok = await copyToClipboard(text);
```

- `copyToClipboard(text): Promise<boolean>`：复制文本到剪贴板。

## 下载

- `downloadFileStream(stream, fileName)`：下载 Blob/二进制流。
- `getFileNameFromContentDisposition(contentDisposition?)`：从响应头解析 `filename*` 或 `filename`。
- `handleBlobResponse(data, headers)`：处理 Blob 下载响应并根据 `Content-Disposition` 自动命名；第三个参数已弃用。
- `downloadFileFromUrl(url, fileName?)`：按 URL 触发下载。

接口导出下载必须读取 `../../file-export-download/SKILL.md`，优先调用 `handleBlobResponse(res.data, res.headers)`，禁止在业务层重复解析文件名和创建下载链接。

当前微应用模板会统一解析 HTTP 4xx/5xx 的 Blob JSON 错误，但不会自动检测 HTTP 200 Blob 内的 `success === false`；发现后者时先修正后端状态码或 mutator，不在页面 Hook 重复解析与提示。

## 格式化

- `formatMoney(amount, precision?, separator?)`：金额格式化。
- `formatDate(date, format?)`：日期格式化，默认 `YYYY-MM-DD HH:mm:ss`。
- `formatFileSize(bytes, precision?)`：文件大小格式化。
- `formatDateRelative(date)`：相对时间格式化。

## 存储

- `localStorage`：封装本地存储读写。
- `sessionStorage`：封装会话存储读写。

## 主题

- `applyYssTheme(options)`：应用 YSS 主题变量。
- `lightenColor(hex, factor?)`：颜色变亮。
- `darkenColor(hex, factor?)`：颜色变暗。

## URL

- `getUrlData(url?, excludeKeys?)`：解析 URL 查询参数。
