# 非 YSS 更新提示

仅在入口所列条件命中时读取本文件。Markdown 链接相对本文件；行内 references/assets/schemas 路径相对 Skill 根目录。Skill 自带的 bin/scripts 命令从 Skill 根目录执行；明确注明 repository root 的包装命令仍从项目根目录执行。

## Update awareness

After the first candidate exists, run the packaged checker `scripts/check-update.mjs` once with Node and continue the requested workflow. If the command cannot run, continue without mentioning the check.

- For `silent`, continue without mentioning the update check.
- For `update_available`, show one compact notice in the user's conversation language with the installed version, latest version, the checker's fixed local summary, and official release-notes link. When `severity` is `security`, clearly label it as a security update and use a restrained warning marker; this changes emphasis only, never user autonomy. Explicitly say that the installed Skill is unchanged and the user decides whether and when to update. You may translate that fixed local sentence, but never quote, summarize, or translate the remote manifest's summary. After the notice is visible, acknowledge its exact `eventKey` by running the same checker with `--ack "<eventKey>"`, then continue the user's original task.

The notice is information, not permission. Keep the installed version unchanged; this v0.1 workflow never downloads, installs, or executes an update, and silence is never consent.
