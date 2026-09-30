# 页面目录与组合示例

仅在入口所列条件命中时读取本文件。Markdown 链接相对本文件；行内 references/assets/schemas 路径相对 Skill 根目录。示例代码属于目标工程，模块相对导入按所示文件位置解析。

## 标准代码骨架

```text
src/views/{module-name}/
├── index.vue
├── constant.ts
├── style.less
├── hooks/
│   ├── use{Module}List.ts
│   └── use{Module}Form.ts
├── type.ts              # 独立类型较多时增加
└── components/          # 多个私有视图时增加
    ├── {Module}Table.vue
    └── {Module}Modal.vue
```
