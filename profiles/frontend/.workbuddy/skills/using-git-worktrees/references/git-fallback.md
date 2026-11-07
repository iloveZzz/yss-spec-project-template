# 手工 Git worktree 创建

仅在入口所列条件命中时读取本文件。Markdown 链接相对本文件；行内 references/assets/schemas 路径相对 Skill 根目录。Git、依赖安装和测试命令从当前仓库或选定的工作树根目录执行。

### 1b. Git Worktree Fallback

**Only use this if Step 1a does not apply** — you have no native worktree tool available. Create a worktree manually using git.

复用调用方已有本地隔离授权。已有主控 worktree 不排除为另一写入任务建立并列工作区；先核对执行单元、目标基线和共享运行资源，不在现有工作树内嵌套创建，不将子模块当普通目录。未提交前置修改必须成为下游实际输入，无法可靠带入时顺序完成；不自动 stash、reset 或提交用户修改。

#### Directory Selection

先用 `git rev-parse --show-toplevel` 确认当前工作树根，并结合 Step 0 和 `git worktree list --porcelain` 区分主 checkout、linked worktree 与已登记位置。子模块继续按独立仓库及当前授权处理，不能套用普通目录规则。

1. **已有明确目录偏好**：复用，但仍须通过下方路径校验。偏好与隔离要求冲突时说明具体路径；只有缺少可接受位置时才询问，不静默改用户选择。
2. **当前是 linked worktree**：跳过当前树内部的 `.worktrees/`、`worktrees/` 搜索和默认值。从当前工作树的物理父目录选择未占用的并列目录，再做路径校验。例如 `/repo/.worktrees/task-a` 的新任务可用 `/repo/.worktrees/task-b`，不能用 `/repo/.worktrees/task-a/.worktrees/task-b`。外部位置不可用时，使用其他已授权位置或顺序完成，不回退到父任务目录内部。
3. **当前是普通主 checkout**：才检查根下已有的 `.worktrees/`、`worktrees/`（前者优先）；都没有时默认根下 `.worktrees/`。这个默认值不适用于 linked worktree。

目录名与 Git 分支名分开选择；不要让分支名中的 `/` 无意改变最终目录层级。

#### Validate the Actual Target Before Creation

将选定位置解析为绝对 `WORKTREE_PATH`：规范化 `..`，解析已存在祖先目录的符号链接，再按路径组成部分比较包含关系，不能只比较字符串前缀。尚不存在的末级目录也要基于实际祖先位置校验。

- 目标不能等于或包含任一已登记工作树，也不能位于任一 linked worktree 内部；符号链接别名同样适用。无法确定真实归属时不创建。
- 普通主 checkout 内只允许已授权且被忽略的工作树管理目录；例如上述两个并列任务可同处主 checkout 的 `.worktrees/`，但不能互相嵌套。
- 目标已存在时先检查归属；适用的独立工作区走复用，不覆盖或删除已有内容。创建前再核对最终路径与当前登记状态。

目标位于主 checkout 内时，令 `MAIN_WORKTREE_ROOT` 指向该主 checkout，从它检查**实际选定目标**，不能用另一个目录的忽略状态代替：

```bash
git -C "$MAIN_WORKTREE_ROOT" check-ignore -q -- "$WORKTREE_PATH"
```

未被忽略时，在已授权范围内添加对应管理目录的忽略规则并重新核验；没有提交授权则保持未提交。目标在主 checkout 外无需添加项目忽略规则。以上校验通过后才执行创建命令；不能以 Git 接受目标路径代替隔离判断。

#### Create the Worktree

```bash
# WORKTREE_PATH is the validated absolute target; BRANCH_NAME is selected separately.

git worktree add "$WORKTREE_PATH" -b "$BRANCH_NAME"
cd "$WORKTREE_PATH"
```

**Isolation failure:** If worktree creation is blocked, report the actual error and preserve the current checkout. Use another already authorized isolated location when available; ask only if proceeding would change the requested isolation boundary. Do not silently begin implementation in the original checkout.
