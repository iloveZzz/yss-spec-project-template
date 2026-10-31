# Issue tracker: GitLab

用户当前明确的 Ticket URL 或 HTTPS host/完整 project 决定本次目标；与已存配置不同时说明差异即可，不重复确认、不改持久配置，也不扩大动作授权。当前请求未明确目标时沿用配置；仅在多个候选确实无法消歧时询问。访问失败报告缺口，不回退到默认项目找同号条目。CLI 使用 `--repo https://HOST/GROUP/PROJECT`；API 使用 `--hostname HOST` 和明确项目数字 ID 或 URL 编码项目路径，不依赖默认实例/remote 或 `:id` 隐式解析。优先能力足够的连接器，命令先核对实际帮助。

## 读取

- Issue：`glab issue view IID --repo https://HOST/GROUP/PROJECT --output json` 读取正文/标签；评论单独分页读取 `glab api --hostname HOST --paginate projects/PROJECT_ID/issues/IID/notes`。
- Issue 列表：`glab issue list --repo https://HOST/GROUP/PROJECT --output json`。
- MR：`glab mr view IID --repo https://HOST/GROUP/PROJECT --output json`；notes 用 `projects/PROJECT_ID/merge_requests/IID/notes`；需要代码讨论时再读 discussions，diff 使用 mr diff 并明确 repo。
- MR 列表：`glab mr list --repo https://HOST/GROUP/PROJECT --output json`。不要跨子命令复用短参数：本次 glab 1.126.0 的 issue list `-F` 是 output-format，mr list `-F` 才是 output；统一长参数。
- 列表默认有限页。全量前沿/分类需要用各命令的 page/per-page 逐页读完，或明确项目的分页 API；区分空结果、无权限和请求失败。
- Issue IID 与 MR IID 是不同编号空间，URL 与请求决定类型；含混时只问定位问题。外部 MR 分类须核对作者成员身份（含继承成员），未知身份不能当作非成员。

## 写入

发布、标签、评论、关闭分别遵循真实授权；查询和分析不会自行认领或发消息。

创建 Issue 可用 `glab issue create --repo https://HOST/GROUP/PROJECT --title TITLE --description-file BODY_FILE`；`--description -` 打开编辑器，不代表从 stdin 读取。其他写入优先结构化连接器；没有安全文件参数时，将 JSON 用标准库序列化到临时文件，再用当前帮助支持的 `glab api --hostname HOST --method METHOD ENDPOINT --input BODY_FILE`。不得把多行正文拼接进 shell。

解释评论与关闭分开：确认 note 写入后才执行所授权关闭；分别回读结果。创建超时先查真实目标与返回标识，无法判定则保留未知，不能盲目重试。更新前复读最新内容并处理并发修改。写入后报告实际 URL/IID 与状态，不把进程退出成功等同完整业务结果。

## MRs as a request surface

**MRs as a request surface: no.** 只有配置或当前请求包含 MR 时才扩展 triage 范围。

## Wayfinding

子票的方法类型沿用明确的既有映射，新约定保存单一 `wayfinder:<type>` 标签，取值 research/prototype/grilling/task。恢复时读取标签，不从正文重新分类，也不与平台类型或 triage 分类混用。用户明确的本次纠正可用于本次工作，持久修改仍需授权；类型缺失、未知或冲突且无法消歧时只澄清相关选择。标签不存在且无创建授权时说明未保存，不自动创建。

地图与子票使用当前实例已支持的真实父子关系；无原生能力时写明确 `Part of #IID`，跨项目引用包含项目路径。能用原生 blocking link 时优先使用，读取 `projects/PROJECT_ID/issues/IID/links` 并核对关系方向和阻塞票状态；能力不足才用 `Blocked by` 文本。已有原生关系不重复维护独立列表。[GitLab Issues API](https://docs.gitlab.com/api/issues/) 与实例实际版本共同确定能力，不从安装 CLI 推断服务端支持。

分页读取地图的全部子票与阻塞关系后计算前沿。获授权才认领，分配不是原子锁，先复读协调并发；只读权限可继续分析但不能声称认领。解决决策票时分别记录答案、授权关闭和地图更新，不把决策答案当实现交付。
