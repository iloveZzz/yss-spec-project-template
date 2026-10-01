# 复现说明

本目录是隔离试验代码，不进入模板运行或实例分发。结果使用源 SHA `8fc0122a9e417a91c62cfe78afc1c0cb70ca56d6`。先阅读研究报告的环境/兼容限制；第三方依赖固定在tools/pnpm-lock.yaml。需要Node24.21.0、Python3.12.1及当前安装的jsonschema4.26.0、pnpm10.15.0。Python可选format依赖不同会改变结果，先比较evidence/python-format-environment.json；不要把安装完整extras后的结果冒称相同环境。

`bootstrap.py --repo <含固定提交和已初始化子模块的仓库> --output <仓库外尚不存在的目录>` 会克隆固定源码与子仓、安装隔离依赖、复制最终试点配置、下载固定官方测试套件，并仅在隔离trial创建测试Git提交。bootstrap作为复现便捷脚本只做过语法检查，未重复整套bootstrap；每个原始实验脚本和命令已实际执行。不得把隔离fixture作为真实批准数据。

在输出目录按顺序运行：

1. `python3 measure-prep.py`：三次准备；不执行测试派发。日志和第三次CLI路径存于输出目录。完整185项运行argv见evidence/prepared-tests.json，将其中cwd改为新source工具目录，环境加入prep-2-env.json中的两个YSS变量，保留正常PATH。
2. `node schema-audit.mjs` 与 `node schema-real-formats.mjs`：前者是原始配置差异扫描，后者确认真实date-time字段反例。unknown format/远程元Schema边界见报告。
3. `python3 framework-trial.py`：48个带共同摘要核验的正确性检查。任一失败不得宣称无漏检。
4. `python3 framework-trial.py benchmark`：378个串行计时样本。不要与其他本地基准同时运行。Nx缓存固定在trial/.nx/cache；每项断言实际执行计数，错误计数即中止。
5. `python3 dependency-mutation.py`：仅在隔离source中注入/恢复Schema变异，以现成语义测试证明选择遗漏；finally恢复原字节。不要与第4步并发。

最终试点配置由trial/中的实际文件提供；旧setup原型不作为复现入口。输出manifest摘要检查是试点共同保护，不是框架原生完整性保证，也不是抗恶意同时篡改产物和manifest的认证机制。

原始未加保护的48项结果、无效Nx冷缓存第一轮和正式结果分别归档，不混合样本。正式性能每个样本包含共同核验，缓存命中不称Fresh Verification。分段185项是诊断运行，不是发布验证。
