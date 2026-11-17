# 工程初始化与协作配置

用户要求完整初始化、新建或接入系统工程时使用，也适用于单独要求配置 Git、远程仓库或 tracker。只安装/升级 CLI、安装用户级技能或给已有项目补装技能时，不自动进入完整接入。CLI 的 init/attach/scaffold 负责文件与技能，Git、remote、托管项目和 tracker 由 Agent 使用实际工具协同完成，不假设存在 `yss git`、`yss remote` 或 `yss tracker` 命令。

## 先复用目标与现状

从当前请求、已有配置及仓库地图确定工程目录、Profile、源码是否已有、Git 身份、远程项目和 Issues 的用途。已明确的信息直接复用；关键目标缺失时合并询问必要项，不重新询问已确定的项目、平台或授权。只缺 remote 或 tracker 目标时，继续有依据的本地准备，并报告缺口，不编造地址。

核实真实 Git 根、worktree/submodule、当前改动及 fetch/push remote。`.git` 可能是文件；目录内没有 `.git` 也可能属于父仓。monorepo 子工程沿用所属仓，不因安装不同 Profile 就建立嵌套仓。用户明确要求独立新工程且目录不属于已有仓时，将本地 Git 初始化包含在接入工作中；仅补技能不改变 Git 边界。

已知目标远程时，生成文件前先核实项目身份、访问情况及是否已有内容。远程未知、无权限和空仓分别处理；不能因读取失败按空仓生成。远程已有内容时先定位可复用 checkout 或按请求 clone 到新目录，不覆盖现有非空目录、不创建另一套历史后强推。

## 按现状安排操作

| 现状与请求 | 操作顺序 |
| --- | --- |
| 新的独立空工程，暂不生成应用源码 | 在新/空目录执行适用的 yss init，再 git init，配置已确认 remote 与 tracker |
| 新独立工程，需要脚手架和项目技能 | 先 scaffold 到不存在的目标，再 attach 对应 Profile 的 skills；然后建立 Git、remote 与 tracker |
| 已有目录或已有 `.git` | 已受管使用 sync，未受管使用 attach；不再调用要求空目录的 init |
| 已有非空远程、没有本地 checkout | clone/核实远程内容，再 attach 或 sync；已有应用按实际工程增量维护，不用脚手架覆盖 |
| monorepo、worktree 或 submodule 中的工程 | 复用实际所属仓及 remote，按安装根接入；保持既有边界与子模块保护 |

先执行 git init 会使目录不再满足 yss init 的空目录要求；若 Git 已建立就改用 attach，不删除 `.git` 迎合 init。源码、技能接入、Git 和远程配置分别核实，部分失败保留成功部分，不重建工程。

## 配置 Git 与远程

本地 Git 已存在就复用，不重新初始化或改分支历史。需要提交身份时读取现有 user.name/user.email，缺失再使用用户提供的信息；不虚构作者，不修改全局 Git 配置。分支命名沿仓库约定。共享技能和项目收据如何纳入 Git、运行时资料如何忽略，按本包 [Git 接入与 Skills 共享](project-portability.md) 处理。

用户已明确远程目标且要求工程初始化或配置 remote 时，可直接补齐缺失的本地 remote。已存在且身份相同就保留；已有不同地址、多个 remote、不同 fetch/push 目标或 fork/upstream 含混时，只澄清所需选择，不静默 set-url、删除或重命名。SSH/HTTPS 地址可指向同一项目，先核对身份，不因文本不同重复配置；URL 不含凭据，读取结果须去除凭据后展示。

远程托管项目不存在且用户要求创建时，核实平台实例、命名空间、仓库名和可见性，再按对应授权创建并回读实际项目地址。未知项目可见性不能默认公开。仅设置本地 remote 不等于创建托管项目；完整工程初始化也不自动包含提交、推送、建 Issue、改保护规则或开启平台功能。已有对应授权直接完成，不逐命令重复请求。

## 配置工程的 Issue tracker

Git remote 与 tracker 是两个配置对象，首次接入可以关联，但之后不自动互相覆盖。使用以下顺序确定持久目标：

1. 已有有效 tracker 继续沿用，包括集中项目、Local Markdown、root、历史字段与用户正文；本次明确要求更改持久配置时才改。
2. 本次已明确 tracker 的平台、项目或本地根时，按该选择配置。一次提供的 Issue URL 仅定位本次动作，不自动成为永久配置。
3. 完整新工程尚无已确认 tracker，且已核实唯一的 GitHub/GitLab 代码托管项目时，默认使用该项目的 Issues，并明确报告采用的实例和项目；空 repository 的模板占位不算已确认目标。多仓 Home、多个候选、集中管理意图或平台身份不明时，不从某个 remote 猜目标。
4. 仍无工程目标时说明缺少什么；GitHub 只可作为无偏好时的候选，不能把登录默认仓、YSS CLI 发行仓或模板仓填入业务配置。用户明确选择本地时才使用 Local Markdown，不因远程失败自动改投。

平台身份及 Web 项目地址通过用户明确资料、已有配置或托管工具核实；SSH 别名和 remote 文本本身不足以推断实例、平台及 API host。使用连接器或已配置 CLI 只读检查项目和 Issues 可访问性，工具参数先查帮助。项目存在、Issues 已启用、能读和能写分别判断；不能用创建测试 Issue 证明权限，也不为初始化自动创建标签、看板或父票。

持久配置写在目标工程 `.template-spec/agents/issue-tracker.md` 的 tracker frontmatter；该路径始终属于消费工程，不是技能安装目录。读取当前内容后增量修改、保留无关字段，写后回读。只填写已核实值，以下是字段结构，不是实际项目：

| 选择 | 必要字段 | 按需保留 |
| --- | --- | --- |
| GitHub | platform: github；repository: owner/repo | 企业实例的明确 host；本地草稿 root |
| GitLab | platform: gitlab；host: https://实例；project: group/project | 多级 group 的完整路径；本地草稿 root |
| Local Markdown | platform: local-markdown；root: 已选目录 | 既有稳定 ID、历史位置与说明 |

模板示例 root 为 `.work`，已有路径优先；不保存 token、密码、当前工作树或任务状态。独立技能在明确配置任务下可创建此本地文件，但不能将其宣称为 CLI 已受管文件，也不手造或修改 `.yss/project.json` 收据。

受管安装应随 setup 分发项目配置与 `.template-spec/agents/issue-tracker-operations.md`。后续接票、拆票、依赖、续办和写回读取目标工程的这份共享运行方法，初始化不复制整套规则到配置正文。独立或用户级技能可以仅用本参考完成 Git/remote/初始配置，不要求目标工程已存在 `.template-spec`；若运行方法尚未分发，说明该缺口，完整 Issues 接续需要采用实际包含资源的 Bundle 或既有可用方法，不能声称旧版 CLI 已提供新能力。

升级保留用户定制；双边配置冲突或已有未受管同路径文件先保持现场，按实际工具能力处理。不用默认配置覆盖、不手改收据或删除文件来绕过冲突，也不声称人工合并正文就能让不支持该行为的 CLI 自动接受。

## 回读结果与交付

分别说明实际 CLI/Bundle、源码与技能、Git 根/分支、remote 指向、tracker 平台/项目或本地根，以及已核验的访问能力。只配置本地 remote 未核验服务端时明确说明；没有提交/推送或远程创建就不报告已完成这些动作。

完整工程目标尚缺 remote、tracker 或访问核验时，说明对应缺口和影响，不把“文件安装成功”称作全部协作已就绪。Home 的仓库地图只链接稳定工程身份与实际配置入口，不复制 tracker 全量字段和当前执行状态；缺项不阻止独立已授权工作。
