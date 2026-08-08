---
title: AI 工具集成指南（LLMs.txt）
description: 如何在 Cursor、Windsurf 等 AI 编程工具中使用 YSS UI 文档
toc: content
---

# AI 工具集成指南

YSS UI 支持通过 <a href="https://llmstxt.org/" target="_blank">LLMs.txt</a> 文件向大语言模型（LLMs）提供文档。此功能可帮助 AI 工具更好地理解我们的组件库、API 及使用模式。

## 什么是 LLMs.txt？

LLMs.txt 是一个专门为大语言模型设计的文档格式规范。通过提供结构化的组件概览和完整文档，AI 编程工具能够：

- 🤖 **自动获取组件文档** - AI 工具可以直接访问最新的组件 API 和用法
- 💡 **提供准确的代码建议** - 基于真实文档生成正确的组件使用示例
- 📚 **降低学习成本** - 开发时无需频繁切换到文档页面
- ✨ **提高代码质量** - AI 能根据最佳实践自动提供建议

## 可用资源

我们提供两个 LLMs.txt 文件来帮助 AI 工具访问文档：

### 推荐使用：llms-full.txt ⭐

**<a href="/llms-full.txt" target="_blank">llms-full.txt</a>** - 完整文档

包含所有组件的完整 API 文档、使用示例和最佳实践。**强烈推荐**作为默认配置，因为：
- ✅ **更准确的代码生成** - AI 能看到完整的 Props、Events、Slots 定义
- ✅ **真实示例参考** - 包含实际使用代码，避免 AI 猜测用法
- ✅ **完整上下文** - 现代 AI 工具（Claude 200K、GPT-4 128K）完全支持这个大小

### 轻量级索引：llms.txt

**<a href="/llms.txt" target="_blank">llms.txt</a>** - 简版索引（1.6KB，70 行）

仅包含组件列表和文档链接。适用于：
- 上下文窗口受限的旧版 AI 工具
- 只需要快速组件发现的场景
- 网络带宽受限的环境

> **建议**：优先使用 `llms-full.txt`，只有在遇到上下文限制时才降级使用 `llms.txt`。

## 在 AI 工具中的使用

### Cursor

在 Cursor 中使用 `@Docs` 功能将 LLMs.txt 文件包含到您的项目中。这有助于 Cursor 为 YSS UI 组件提供更准确的代码建议和文档。

**使用方法：**

1. 在 Cursor 聊天窗口中输入 `@Docs`
2. 输入 YSS UI 文档站点的 URL（部署后的地址）
3. Cursor 会自动加载 llms.txt 文件

**示例：**

```
@Docs http://192.168.164.27:3200
```

然后你可以直接询问：

```
如何使用 YTable 组件实现远程分页？
```

Cursor 将基于 YSS UI 的真实文档提供准确的回答和代码示例。

<a href="https://docs.cursor.com/context/@-symbols/@-docs" target="_blank">详细了解 Cursor 中的 @Docs 功能</a>

---

### Windsurf

通过 `@` 引用或在 `.windsurf/rules` 文件中配置 LLMs.txt 文件，以增强 Windsurf 对 YSS UI 组件的理解。

**使用方法 1：临时引用**

```
@ http://192.168.164.27:3200/llms-full.txt
```

**使用方法 2：持久化配置**

在项目根目录创建 `.windsurf/rules` 文件：

```markdown
# YSS UI Documentation

Always reference the YSS UI documentation when working with components:
- http://192.168.164.27:3200/llms-full.txt
```

<a href="https://docs.windsurf.com/windsurf/cascade/memories" target="_blank">详细了解 Windsurf Memories 功能</a>

---

### Claude Code

在 Claude Code 中，将 LLMs.txt 添加到工作区的知识库（Docs / Context Files）配置中，即可在代码补全与解释时引用其中的内容。

**使用方法：**

1. 打开 Claude Code 设置
2. 找到 "Docs / Context Files" 配置
3. 添加 `http://192.168.164.27:3200/llms-full.txt`

<a href="https://code.claude.com/docs" target="_blank">详细了解 Claude Code 文档上下文配置</a>

---

### Gemini CLI

在 Gemini CLI 中，可以通过 `--context` 参数或在 `.gemini/config.json` 中指定 LLMs.txt 文件路径。

**使用方法 1：命令行参数**

```bash
gemini --context http://192.168.164.27:3200/llms-full.txt "如何使用 YTable 组件？"
```

**使用方法 2：配置文件**

在项目根目录创建 `.gemini/config.json`：

```json
{
  "context": [
    "http://192.168.164.27:3200/llms-full.txt"
  ]
}
```

<a href="https://ai.google.dev/gemini-api/docs" target="_blank">详细了解 Gemini CLI 上下文配置</a>

---

### Antigravity

Antigravity（Google Gemini 官方 AI 编程助手）可以通过 `read_url_content` 工具直接读取在线文档。

**方式 1：全局规则配置（强力推荐）** 🚀

配置 `~/.gemini/GEMINI.md`，从根本上教会 AI "文档优先"，无需每次重复提示。

```markdown
## 核心原则：文档优先
在回答关于 YSS UI 问题时，必须优先读取以下文档：
http://192.168.164.27:3200/llms-full.txt
```

**方式 2：项目 README 配置**

在项目根目录 `README.md` 中添加文档链接，Antigravity 读取项目概况时会自动发现。

```markdown
## 相关文档
- YSS UI: http://192.168.164.27:3200/llms-full.txt
```

**方式 3：对话直接引用**

临时询问时，直接在对话中粘贴 URL：

```
参考文档 http://192.168.164.27:3200/llms-full.txt，帮我写一个表格。
```

> **提示**：Antigravity 不支持类似 Cursor `@Docs` 的配置，主要依靠上下文理解和工具调用。

---

### Trae

在 Trae 中，将 LLMs.txt 文件放入项目的 knowledge sources 并在设置里开启引用。

**使用方法：**

1. 打开 Trae 项目设置
2. 找到 "Knowledge Sources" 配置
3. 添加 `http://192.168.164.27:3200/llms-full.txt`
4. 启用该知识源

<a href="https://trae.ai/docs" target="_blank">详细了解 Trae 的知识源功能</a>

---

### Qoder

在 Qoder 中，可以在 `.qoder/config.yml` 中添加 LLMs.txt 作为外部知识文件，或在对话中通过 `@docs` 进行临时引用。

**使用方法 1：配置文件**

在项目根目录创建 `.qoder/config.yml`：

```yaml
knowledge:
  external_docs:
    - url: http://192.168.164.27:3200/llms-full.txt
      name: YSS UI Documentation
```

**使用方法 2：临时引用**

```
@docs http://192.168.164.27:3200/llms-full.txt
```

<a href="https://docs.qoder.com/" target="_blank">详细了解 Qoder 配置方法</a>

---

### 其他 AI 工具

任何支持 LLMs.txt 的 AI 工具均可使用以上路径来更好地理解 YSS UI。

<!-- ## 本地开发

如果你在本地开发环境中使用 AI 工具，推荐使用完整文档：

```
http://localhost:8000/llms-full.txt
```

如果遇到上下文限制，可以降级使用：
```
http://localhost:8000/llms.txt -->
```

## 最佳实践建议

### 选择合适的文件

**大多数情况：使用 llms-full.txt** ✅
- 开发新功能、编写业务代码
- 需要 AI 提供准确的 API 用法
- 学习组件库的使用方式

**特殊情况：使用 llms.txt**
- AI 工具报告上下文窗口不足
- 只需要快速查找组件名称
- 网络环境较差，需要减少传输量

### 如何验证 AI 已正确加载文档

询问 AI 一些特定的问题来验证：

```
Q: YTable 组件的 pagination 属性支持哪些配置项？
Q: YssFormily 的 mode 属性有哪些可选值？各代表什么含义？
Q: 如何使用 YTree 组件的搜索功能？
```

如果 AI 能准确回答这些问题并提供符合实际 API 的代码示例，说明文档已成功加载。

## 自动更新

LLMs.txt 文件会在每次 CI/CD 构建时自动生成和更新，确保 AI 工具始终访问到最新的文档。

如需手动重新生成，可以运行：

```bash
pnpm run generate:llms
```

## 常见问题

### Q: llms.txt 和 llms-full.txt 有什么区别？应该用哪个？

**A:** 
- **推荐使用 `llms-full.txt`**（71KB）- 包含完整的 API 文档、Props、Events、示例代码，让 AI 生成更准确的代码
- `llms.txt`（1.6KB）- 仅包含组件列表和链接，适合上下文窗口受限的场景

现代 AI 工具（Claude、GPT-4、Gemini 等）完全支持 `llms-full.txt` 的大小，优先使用它能获得更好的代码生成效果。

### Q: 如何确认 AI 工具已成功加载文档？

**A:** 
你可以直接询问 AI 工具关于 YSS UI 特定组件的问题，如果它能准确回答并提供符合实际 API 的代码示例，说明已成功加载。

### Q: 文档更新后 AI 工具没有获取到最新内容？

**A:** 
某些 AI 工具会缓存文档内容。尝试：
1. 重新加载文档引用
2. 清除 AI 工具缓存
3. 使用新的会话窗口

## 反馈与建议

如果你在使用 AI 工具集成时遇到问题，或有改进建议，欢迎：

- 提交 Issue 到项目仓库
- 联系技术支持团队
