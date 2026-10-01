# 复现与回退

默认是 legacy，无需迁移或额外配置。试用时运行：

```sh
scripts/verify-template-fast --tooling-mode optimized --report-dir /tmp/yss-fast-trial-new
```

报告目录必须在仓库外且尚不存在；按实际变更选择验证范围。触及核心资产会升级完整串行验证，这是预期行为。显式回退：

```sh
scripts/verify-template-fast --tooling-mode legacy --report-dir /tmp/yss-fast-legacy-new
```

`--concurrency 1` 同时约束内部文件并行。`scripts/verify-template` 始终使用完整串行 legacy 路径。全量测试入口仍为 `pnpm --dir .template-source/tooling/node test`，默认 legacy；可以通过 `YSS_TOOLING_MODE=optimized` 显式诊断。

## 准备固定基准副本

从记录的源提交建立仓库外独立 checkout，按 `environment.json` 固定所有 gitlink。解包 `raw-evidence.tar.gz`，其中 `final-candidate-files.tar.gz` 和 `final-candidate-inputs.json` 保存被测的本轮文件；只向这个独立 checkout 还原，不覆盖现有开发工作区。`prepare-source.py` 和 `prepare-source.log` 记录本次准备过程。共享主工作区后续改动不属于这次测量输入。

Node 依赖在副本的 `.template-source/tooling/node` 中独立执行 `pnpm install --frozen-lockfile`。Python 使用独立 venv，再按 `python-requirements.lock` 以 `pip install --require-hashes -r <lock>` 安装；版本及可选格式检查器见 `python-environment.json`。实际运行使用 Node 24.21.0、Python 3.12.1、macOS ARM64，详见环境记录。

完整交付验证还需按仓库原说明准备 `YSS_VUE_TOOLCHAIN`，使用原型 Skill 中 shadcn-vue-authoring 的 package/lock 安装；本次命令见归档 `vue-install.log`。fresh create-yss-spec checkout 的 ignored snapshot 通过官方 `scripts/sync-template.js --require-committed` 和固定模板 SHA 生成，见 `full-cli-snapshot-preparation.log`，不能手写或放宽 gate。

## 运行成对基准

从作者仓库调用脚本，root 指向上述仓库外副本；output 必须是仓库外新目录：

```sh
PATH="/absolute/python-env/bin:$PATH" \
YSS_VUE_TOOLCHAIN=/absolute/vue-toolchain \
PYTHONDONTWRITEBYTECODE=1 \
python3 .template-source/scripts/benchmark-tooling.py \
  --root /absolute/disposable-checkout \
  --output /absolute/new-benchmark-output --pairs 21
```

开发试测用 `--pairs 3`，不能代替正式的每档 21 对。脚本检查每一条 Node/Python 测试身份、次数、结果、pins/runtime、构建和复制次数、输入漂移，并保留完整进程墙钟；输入变化档在副本的后端插件 README 追加同样的每对标记，退出时恢复。首次/重复场景均不复用跨运行产物，不控制 OS 页缓存。

当前脚本不提供断点续采；被中断的原始证据应另行保留，新验收使用新输出目录，不将部分样本拼凑成通过结论。本次用户已经要求停止，未启动重跑。性能脚本中的 `--changed-file` 只用于同场景重放，交付验证必须覆盖完整真实改动。

定向复现入口：`node --test tests/verification-selection.test.mjs tests/flow-verification-routing.test.mjs`，以及 `node --test .template-source/tooling/node/test/tooling-execution.test.mjs`。额外实际进程探针源文件和 RED/GREEN 日志均在归档，含 `check-cancel-cleanup.mjs`、`check-benchmark-cancel.py`、`check-scheduling.mjs`、`permission-probe.mjs`。探针按其位置参数传入隔离根与仓库外新输出目录；不要在正式计时期间并行运行。
