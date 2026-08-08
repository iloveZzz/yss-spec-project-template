# GitLab CI 集成说明

## 概述

本项目已配置自动化发版流程，支持在 GitLab CI 中一键发布新版本并自动生成更新日志。

## 发版流程

### 方式一：GitLab UI 手动触发（推荐）

1. **提交代码**：确保所有 commit 遵循 Conventional Commits 规范
   ```bash
   git commit -m "feat(@yss-ui/components): Table 新增虚拟滚动"
   git push origin dev
   ```

2. **触发发版**：
   - 进入 GitLab 项目页面
   - 点击 CI/CD → Pipelines
   - 找到最新的 pipeline
   - 点击 `should_run_release_ci` 阶段的手动按钮
   - 在弹出的对话框中选择发版类型（设置 `BUMP` 变量）：
     - `patch` - 补丁版本（默认）
     - `minor` - 次版本
     - `major` - 主版本
     - `auto` - 自动检测

3. **等待完成**：CI 会自动：
   - 根据 commit 历史生成更新日志
   - Bump 版本号
   - 创建 Git tag
   - 推送到仓库

### 方式二：通过 GitLab API 触发

```bash
# 使用 GitLab API 触发发版
curl -X POST \
  --form "token=$CI_TRIGGER_TOKEN" \
  --form "ref=dev" \
  --form "variables[BUMP]=minor" \
  "https://gitlab.com/api/v4/projects/$PROJECT_ID/trigger/pipeline"
```

## 环境变量说明

在 GitLab 项目设置中需要配置以下环境变量：

### 必需变量

| 变量名 | 说明 | 示例 |
|--------|------|------|
| `GITLAB_USER_NAME` | Git 提交者名称 | `GitLab CI` |
| `GITLAB_USER_EMAIL` | Git 提交者邮箱 | `ci@company.com` |
| `GIT_LAB_PUSH_TOKEN` | GitLab 个人访问令牌（需要 write_repository 权限） | `glpat-xxx` |

### 可选变量

| 变量名 | 说明 | 默认值 |
|--------|------|--------|
| `BUMP` | 发版类型 | `patch` |
| `NPM_TOKEN` | NPM 发布令牌（如果需要发布到 NPM） | - |

### 创建 Personal Access Token

1. 进入 GitLab Settings → Access Tokens
2. 创建新 Token，勾选以下权限：
   - `read_repository`
   - `write_repository`
   - `api`
3. 复制生成的 token
4. 在项目 Settings → CI/CD → Variables 中添加 `GIT_LAB_PUSH_TOKEN`

## GitLab CI 配置详解

当前 `.gitlab-ci.yml` 中的发版阶段：

```yaml
should_run_release_ci:
  stage: release
  script:
    - |
      # 在 Docker 容器中执行发版脚本
      docker run --rm \
        -e BUMP="$BUMP" \
        -e GITLAB_USER_NAME="$GITLAB_USER_NAME" \
        -e GITLAB_USER_EMAIL="$GITLAB_USER_EMAIL" \
        -e GIT_LAB_PUSH_TOKEN="$GIT_LAB_PUSH_TOKEN" \
        -v "$CI_PROJECT_DIR":/app -w /app \
        "$NODE_IMAGE" \
        sh /app/scripts/ci-release.sh
  only:
    - dev
  when: manual
  allow_failure: false
```

## 本地测试

在本地测试发版流程：

```bash
# 模拟 CI 环境
export GITLAB_USER_NAME="Your Name"
export GITLAB_USER_EMAIL="your@email.com"
export BUMP="patch"

# 执行发版脚本
sh scripts/ci-release.sh
```

## 常见问题

### Q: 发版失败，提示 "Permission denied"

A: 检查 `GIT_LAB_PUSH_TOKEN` 是否配置正确，确保 token 有 `write_repository` 权限。

### Q: 如何跳过 CI 发版？

A: 在 commit message 中添加 `[skip ci]`：
```bash
git commit -m "chore: update README [skip ci]"
```

### Q: 如何在发版后自动发布到 NPM？

A: 在 `.gitlab-ci.yml` 中添加 npm publish 步骤：

```yaml
should_run_release_ci:
  after_script:
    - |
      if [ -n "$NPM_TOKEN" ]; then
        echo "//registry.npmjs.org/:_authToken=$NPM_TOKEN" > .npmrc
        pnpm publish --filter="./packages/*" --access public --no-git-checks
      fi
```

### Q: 如何回滚错误的发版？

A: 在 GitLab 中删除错误的 tag，然后本地回退：

```bash
# 删除本地 tag
git tag -d v1.0.1

# 删除远程 tag
git push origin :refs/tags/v1.0.1

# 回退 commit
git reset --hard HEAD~1
git push -f origin dev
```

## 发版后的检查清单

- [ ] 检查新 tag 是否创建成功
- [ ] 查看更新日志是否正确生成
- [ ] 验证分包日志是否同步
- [ ] 检查文档网站是否更新
- [ ] （可选）验证 NPM 包是否发布成功

## 相关文档

- [发版工作流指南](./guide/release-workflow.md)
- [Commit 规范说明](./guide/release-workflow.md#-commit-message-规范必须遵守)
