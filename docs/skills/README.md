# YSS 能力目录

本目录承载 YSS 能力发现与路由事实。机器可读的唯一入口是
[yss-capability-catalog.yaml](yss-capability-catalog.yaml)，它独立于
`skills-lock.json`：

| 资产 | 负责的事实 |
|---|---|
| `yss-capability-catalog.yaml` | 分类、owner、触发条件、依赖闭包、source-index、验证命令和投影边界 |
| `skills-lock.json` | 来源、版本、有效哈希、共享投影和平台专属目录清单 |
| `.agents/skills/*/SKILL.md` | 共享 skill 权威正文 |
| `.codex/skills/yss-*` | Codex root 中的共享投影与 Codex-only skill 正文、源码索引 |

catalog 的 `retired_skills` 是禁止自动重引入的退役清单；退役不等于删除外部
`yss-cloud-microservice` 中对应 runtime component，外部源码仍由项目按需直接处理。

## 路由约定

1. 先按 `category` 和 `trigger_conditions` 找到最小入口，不按 Maven module
   或目录数量机械加载全部 YSS skills。
2. 读取 `condition_vocabulary` 解释 `when` 条件，再读取入口的 `dependencies`，再使用同一条记录的
   `dependency_closure`；条件闭包由 `when` 下的可观察条件选择。
3. 后端垂直切片先使用 `backend-vertical-slice` profile，再由
   `yss-router` 根据真实影响面裁剪为 Slice Implementation Contract 草案。
4. 命中的长尾 skill 不可用时，按 catalog 的 `unavailable_skill_policy`
   阻断；只有生命周期编排器批准等价规范并留下证据后才可恢复。
5. 共享 skill 只能修改 `.agents/skills`，投影由同步脚本生成；Codex-only
   skill 不得被当作共享投影。

## Source-index

组件能力的 `source_index` 同时记录本地生成索引、统一映射文件、外部源码
路径和刷新命令。外部路径相对于 `YSS_SOURCE_ROOT`，不把本机绝对路径写入
catalog。刷新组件索引使用：

```bash
YSS_SKILLS_ROOT="$PWD/.codex/skills" \
YSS_SOURCE_ROOT=/absolute/path/to/yss-cloud-microservice \
python3 .codex/skills/yss-source-index/scripts/refresh-yss-skill-index.py
```

没有 runtime 源码对应关系的应用架构、流程和平台能力必须明确标记为
`project-reference` 或 `not-applicable`，不能伪造组件 source-index。

## 校验

```bash
ruby scripts/verify-yss-capability-catalog
```

该校验检查所有 49 个 `yss-*` entrypoint 是否登记、分类是否唯一、owner 和
触发条件是否完整、依赖闭包是否闭合、source-index 路径是否存在，以及
shared / Codex-only 投影边界是否被破坏。模板发布时由
`scripts/verify-template` 自动调用。
