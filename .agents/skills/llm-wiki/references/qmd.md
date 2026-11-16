# QMD 可选本地检索

用于用户明确要求 QMD，或当前任务已有可复用 QMD 启用范围的情况。普通 Wiki 查询继续使用 [文件检索方法](query.md)，工具缺失或严格要求全部派生状态零写入时沿该路径完成可做部分。

## 范围与准备

确认实际程序、安装来源、版本、知识根目录、命名索引、集合及专用状态目录，复用当前任务说明或已有 Wiki 约定。已有同范围授权直接复用，工具安装、来源文字和搜索命中保持其各自事实身份。

QMD 查询会以可写方式打开自身 SQLite，并可能初始化、迁移或同步配置。已授权使用时，Wiki、原件、人工正文和业务导航只读，SQLite、WAL、配置同步与运行缓存的写入限定选定工具工作区。集合准备、扫描更新、hook 和模型准备使用对应操作范围。

本方法以官方包 `@tobilu/qmd@2.8.3` 为操作基线。先核对实际 `--version`、`--help` 和安装来源，同版本号的 main 源码与发布包分别识别。CLI 未实现 `--readonly`、`--read-only` 或 `--no-cache`，未知参数被接受也不能证明产生了相应保护。

优先复用已确认程序。确需准备工具时使用实际授权位置，隔离测试可在临时目录安装固定发布包。核对 Node 与包管理器的支持范围，依赖安装脚本按实际包和本次目录处理。使用 pnpm 时在该工具目录按真实依赖配置构建许可，并实际核验 SQLite、sqlite-vec、语法资源和 llama.cpp 初始化，包安装成功仍需核对原生运行结果。每次调用先清除继承的 `INDEX_PATH`，再使用同一程序、进程级 `QMD_CONFIG_DIR`、`XDG_CACHE_HOME`、显式 `--index` 及集合限制，核对实际数据库位置。`INDEX_PATH` 的优先级高于命名索引，会改变数据库位置。以下 POSIX 示例使用 `env -u INDEX_PATH`，其他宿主使用等效的进程环境清除方式，保护用户全局配置。

添加集合前核对真实根目录、允许索引的 Markdown 和目录链接。发布版扫描排除符号链接与隐藏项，并核对实际路径包含性，实际索引范围仍需核验。mask 支持逗号分隔的包含和排除模式，如 `**/*.md,!private/**`。仅索引选定 Wiki，原件按已授权来源链接回查。范围无法可靠限定时使用已确认子目录或普通文件检索。

## 查询与回源

发布版命令形状如下。`wiki_qmd_bin`、`wiki_qmd_state`、`wiki_qmd_index`、`wiki_qmd_collection`、`wiki_qmd_sources` 分别来自已确认的程序、专用状态根、索引、集合及知识根。示例变量应替换为本次实际信息，每次调用均带相同目录环境。

```sh
env -u INDEX_PATH QMD_CONFIG_DIR="$wiki_qmd_state/config" XDG_CACHE_HOME="$wiki_qmd_state/cache" "$wiki_qmd_bin" --index "$wiki_qmd_index" collection add "$wiki_qmd_sources" --name "$wiki_qmd_collection" --mask '**/*.md'
env -u INDEX_PATH QMD_CONFIG_DIR="$wiki_qmd_state/config" XDG_CACHE_HOME="$wiki_qmd_state/cache" "$wiki_qmd_bin" --index "$wiki_qmd_index" search '松果 Pinecone' -c "$wiki_qmd_collection" -n 10 --format json
env -u INDEX_PATH QMD_CONFIG_DIR="$wiki_qmd_state/config" XDG_CACHE_HOME="$wiki_qmd_state/cache" "$wiki_qmd_bin" --index "$wiki_qmd_index" get "$wiki_qmd_uri" --from 1 -l 30
```

第一条会写配置并立即索引，按准备授权执行。BM25 定位先用 `search`，结果数量只控制候选读取范围。连续中文词串按连续字符短语检索，自然语言长问句可拆为关键短语后补查。英文别名和缩写也作为候选线索，缺少证据时使用当前目录检索。

搜索 JSON 返回数组，含 `docid`、`score`、`file`、`line`、`title` 及片段或正文。`file` 可能是 `qmd://wiki/page.md?index=llm-wiki`，分别核对 URI 中索引、集合和文件路径。映射到实际集合根后检查真实路径与可读范围，再读磁盘正文及原始证据。已核实 URI 才作为 `wiki_qmd_uri` 使用。

`get` 输出文本并读取索引保存的快照，传入 JSON 格式参数也不能据此假定输出为 JSON。其行号与当前文件分别核对，重复片段和派生页面按已有证据链整理。

文件缺失、移动、越界或内容已变化时，说明索引时点和定位限制，以当前可核实证据回答。普通查询使用查询入口，明确维护范围内才执行扫描更新。

## 中文与混合查询

先记录文件检索与 BM25 对实际中文问题、别名和同名对象的命中。模型已准备且当前范围允许时，可以使用混合查询。

```sh
env -u INDEX_PATH QMD_CONFIG_DIR="$wiki_qmd_state/config" XDG_CACHE_HOME="$wiki_qmd_state/cache" QMD_EMBED_MODEL="$wiki_qmd_embed_model" "$wiki_qmd_bin" --index "$wiki_qmd_index" embed -f -c "$wiki_qmd_collection"
env -u INDEX_PATH QMD_CONFIG_DIR="$wiki_qmd_state/config" XDG_CACHE_HOME="$wiki_qmd_state/cache" QMD_EMBED_MODEL="$wiki_qmd_embed_model" "$wiki_qmd_bin" --index "$wiki_qmd_index" query '离线导入上限多少' -c "$wiki_qmd_collection" -n 10 --format json
```

embedding 变更后重建向量，后续查询使用同一模型配置。官方中文模型示例为 `QMD_EMBED_MODEL=hf:Qwen/Qwen3-Embedding-0.6B-GGUF/Qwen3-Embedding-0.6B-Q8_0.gguf`。扩展和重排另有模型与缓存需求，`--no-rerank` 只跳过重排。

先读取选定索引配置中的 `models.embed`、`models.generate`、`models.rerank`，它们优先于对应的 `QMD_EMBED_MODEL`、`QMD_GENERATE_MODEL`、`QMD_RERANK_MODEL` 环境变量。CLI 会保存解析后的模型配置，已有字段时仅更换环境变量仍会沿用配置中的模型。新索引在首次调用前设置所需模型，已有索引在获授权的专用配置中修改相应字段，再用 `status` 或 `doctor` 核对实际模型与数据库位置。模型值支持完整本地 GGUF 路径，准备、向量重建、查询和 MCP 沿用同一配置。

模型缺失、下载失败、超时和无命中分别说明。对准备和调用使用宿主实际支持的整体超时或中断能力，并核对相关子进程，CLI 的 embed 会话上限不能直接证明模型准备已受同一上限约束。网络不稳时可从官方仓库固定 revision 分块续传，核对各段实际 `Content-Range`，合并后核对官方文件长度、SHA-256 及 GGUF 头，再交给 QMD。本地文件准备完成后，离线核验同时覆盖 embedding、扩展、重排和原生依赖，以网络阻断对照及无既有查询结果缓存的实际运行作为依据。

用同组问题记录必要来源的实际排名与遗漏。中文扩展可能引入偏题词，同名对象的正确来源也可能排在第二位或更后。核对组织、对象和有效时间后再取证，按实际缺口补查关键词或使用 `--intent` 提供消歧背景，候选首位和评分不能替代身份及原件核对。

实际条件受限时使用已验证的 BM25 或文件路径，离线和收益结论依实际运行与同组问题观察。

## 宿主接入

宿主需要 MCP 时可沿用同一程序和专用状态启动 `qmd mcp --index "$wiki_qmd_index"`，进程环境同样先清除 `INDEX_PATH`。核对实际宿主支持的进程级配置、启动与调用超时，按宿主能力限定本次需要的 `query`、`get`、`multi_get`、`status` 工具。`query` 显式传入 `collections`，自然语言 `query` 会自动扩展，`searches` 可指定 lex/vec/hyde，二者互斥。MCP 的只读注解与前述 SQLite 派生写入边界共同核对，命中仍回读当前磁盘与原件。

## 更新与清除

执行 update 前读取实际集合配置及 update hook，按已授权范围运行。配置中的集合 `update` 字符串可通过 shell 在集合根目录执行。正常 search 使用查询入口，扫描 update 使用下列命令形状。

```sh
env -u INDEX_PATH QMD_CONFIG_DIR="$wiki_qmd_state/config" XDG_CACHE_HOME="$wiki_qmd_state/cache" "$wiki_qmd_bin" --index "$wiki_qmd_index" update
```

集合添加和扫描更新可能清空该索引的 LLM 缓存，先核对完整作用范围。来源变化后重新检查旧路径、片段与当前文件，已授权更新完成后继续回源。

删除停用与派生清除分别核对。update 会停用缺失文档，其正文仍可能留在库中。明确清除敏感内容时盘点文档快照、SQLite/WAL、向量及 LLM 缓存。发布版 cleanup 作用于整个选定索引，会清空 LLM 缓存、清理停用与孤立数据并压缩数据库，运行前核对各集合范围与授权。

核验清除时释放读取连接与相关服务，再检查数据库和旁路文件。仍有其他活跃文档共享相同正文时，对应内容继续受该来源支撑。敏感清除同时盘点这些活跃引用，在实际授权范围处理，范围外引用保留为未清除限制。无法核实细粒度清除时，可移除已授权的专用派生状态并从剩余允许资料重建。先核对实际目录及所有权，其他集合、共享模型和用户状态按各自范围处理。

## 依据

参数和存储边界来自固定发布版源码，使用时结合实际帮助与结果核对。[发布版说明](https://github.com/tobi/qmd/blob/v2.8.3/README.md)、[CLI](https://github.com/tobi/qmd/blob/v2.8.3/src/cli/qmd.ts)、[存储](https://github.com/tobi/qmd/blob/v2.8.3/src/store.ts)、[数据库](https://github.com/tobi/qmd/blob/v2.8.3/src/db.ts)、[模型解析](https://github.com/tobi/qmd/blob/v2.8.3/src/llm.ts)、[MCP](https://github.com/tobi/qmd/blob/v2.8.3/src/mcp/server.ts)
