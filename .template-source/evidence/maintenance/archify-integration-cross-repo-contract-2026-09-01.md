# Archify 集成跨仓候选与发布合同（2026-09-01）

## 范围与不可变候选

所有仓库目标分支均为 `main`，远端均为 `origin`。审查时不得读取可变工作树来替代下列 commit；子仓实现字节使用 `git show <commit>` / `git diff <base>..<commit>` 从对象数据库独立复核，根候选中的 gitlink 必须与表中 commit 一致。

| 仓库 | 远端 | 基线 / 回滚点 | Round 1 固定 commit | CI / 实际验证 |
|---|---|---|---|---|
| 主模板 `yss-spec-project-template` | `https://github.com/iloveZzz/yss-spec-project-template.git` | `b62d97da2bdf6e0253e3a530179eaa8a0db924da` | 功能提交 `f4ee19614b6206e08d47d333b08e49d4f2af93c4`；聚合指针 `4725f6ab99ab819f36047b9e88aba9ff410eae75` | `.github/workflows/template-node-tooling.yml`；`scripts/verify-template` 通过 |
| 战术模板 `yss-harness-dev-agent` | `https://github.com/iloveZzz/yss-harness-dev-agent.git` | `b01665d25169d1704f1ff6f701e16419df1622a3` | `63389eba0ccd4c2490cbbc3c4fd6750e9973b97a` | `.github/workflows/template-node-tooling.yml`；`scripts/verify-template-fast` 通过 |
| 主模板 CLI `create-yss-spec` | `https://github.com/iloveZzz/create-yss-spec.git` | `72058ce7ce690980a0fd54e87f007a177c39c890` | `783b13f7b2f61f21edf6371006d7019a6043f0df` | 仓库未配置 GitHub Actions；`node --test tests/*.test.js` 56/56 通过 |
| 战术模板 CLI `create-yss-harness-dev` | `https://github.com/iloveZzz/create-yss-harness-dev.git` | `2b300e8d14077633c6934f76e0987d113065826f` | `5891b6245ffac4678b2d7ee525926639a8d4c825` | 仓库未配置 GitHub Actions；`node --test tests/*.test.js` 56/56 通过 |

Round 2 修复会在主模板与战术模板产生后续 commit；正式审查任务包必须以更新后的 commit 和新 `candidate_digest` 为准。两套 CLI 只有模板来源 commit 或生成快照变化时才追加 commit；否则保留上表固定 commit。

## 独立复核命令

```bash
git diff b62d97da2bdf6e0253e3a530179eaa8a0db924da..4725f6ab99ab819f36047b9e88aba9ff410eae75
git -C submodules/yss-harness-dev-agent diff b01665d25169d1704f1ff6f701e16419df1622a3..63389eba0ccd4c2490cbbc3c4fd6750e9973b97a
git -C submodules/create-yss-spec diff 72058ce7ce690980a0fd54e87f007a177c39c890..783b13f7b2f61f21edf6371006d7019a6043f0df
git -C submodules/create-yss-harness-dev diff 2b300e8d14077633c6934f76e0987d113065826f..5891b6245ffac4678b2d7ee525926639a8d4c825
```

根候选将子仓固定为 gitlink；Round 2 任务包额外授权读取三个 submodule Git 对象库中的上述 commit，并要求先以 `git rev-parse HEAD` / `git cat-file -e <commit>^{commit}` 验证可读性，再按固定范围审查。工作树中的未提交内容不属于候选。

## 发布顺序

1. 推送战术模板修复后的 `main`，使战术 CLI 的模板来源 commit 可取回。
2. 将主模板功能提交推送到 `main`，使 `create-yss-spec` 固定的模板来源 commit 可取回。
3. 推送 `create-yss-spec` 与 `create-yss-harness-dev` 的 `main`。
4. 推送主模板包含最终子模块指针、正式审查和最终完整门禁证据的 `main`。
5. 对四仓执行 `git ls-remote origin refs/heads/main`，并在主模板执行 `git submodule status --recursive` 与 CLI fresh test，确认远端可取回性。

所有推送仅允许 fast-forward，禁止 force。任一步失败即停止后续推送，不把部分发布描述为完整成功。

## 回滚顺序

回滚按发布顺序逆序执行：主模板聚合提交 → 两套 CLI → 主模板功能提交 → 战术模板。每仓回滚目标是表中的“基线 / 回滚点”，通过新的 revert commit 回滚；禁止改写已发布历史或 force push。若只发生部分推送，则只对已经推送的仓库创建对应 revert，并保持依赖仓先于被依赖模板回滚，避免 CLI 指向不可取回 commit。
