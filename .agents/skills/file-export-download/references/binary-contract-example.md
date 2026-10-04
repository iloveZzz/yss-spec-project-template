## OpenAPI 标准代码骨架

```json
{
  "responses": {
    "200": {
      "description": "导出成功",
      "headers": {
        "Content-Disposition": {
          "schema": { "type": "string" }
        }
      },
      "content": {
        "application/octet-stream": {
          "schema": {
            "type": "string",
            "format": "binary"
          }
        }
      }
    }
  }
}
```

根据文件类型可将媒体类型换成 `text/csv`、`application/pdf` 或 Excel 对应类型。跨域请求若读取不到文件名，后端还必须暴露 `Content-Disposition` 响应头。
