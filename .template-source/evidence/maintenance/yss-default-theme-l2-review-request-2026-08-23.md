# 默认亮色主题覆盖 L2 聚焦审查请求

> 实施者不得在本文件填写审查结论。`result=pass` 只表示本请求可被 checkpoint 校验器解析。

## 范围

把用户提供的 Ant Design 5 Less / `:root` 主题裁定为项目默认亮色覆盖，写入 `docs/design/design.md`、token 快照和 `yss-design-system`。Codex `$design-qa` 只增加项目对照清单，不改上游插件。

## 请审查

1. `:root` 裁定是否合理：主色 `#3371ff`、错误色 `#f5222d`、圆角 6/4/8、系统字体，是否误把 Less 前半 `#3177ff` / `4px` 或官方 `#1677ff` / `8px` 留成默认。
2. 运行时短名 `--primary-color` 是否都指向 `--brand-*`，有没有第二套色值。
3. 暗色是否被手工反色；文档是否清楚写了「未重派生完整暗色色板」。
4. `blue` 预设里的 `#1677ff` 是否被误当成品牌主色。
5. `design-qa-theme.md` 是否足以让 `$design-qa` 用项目覆盖当 source visual truth，而不是改 `.codex/skills/product-design`。
6. utility class / 滚动条 / 原始 Less 是否被错误提升为规范正文。

## 关键路径

- `docs/design/design.md`
- `docs/design/tokens/theme.json`
- `docs/design/tokens/tokens.default.json`
- `docs/design/tokens/variables.css`
- `.agents/skills/yss-design-system/SKILL.md`
- `.agents/skills/yss-design-system/references/design-system.md`
- `.agents/skills/yss-design-system/references/design-qa-theme.md`
- `.agents/skills/yss-prototype-stage/SKILL.md`
