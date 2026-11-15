# Java 空工程 CLI 命令

先读取现装程序的接口。CLI 缺失时使用 `setup-yss-harness` 安装。

```bash
yss --version
yss scaffold catalog --json
yss scaffold ddd --help
yss scaffold mvc --help
```

输出父目录须已存在，目标工程目录须不存在。以下命令直接生成，需要预览时追加 `--dry-run`。旧 CLI 先核对实际帮助，尚不支持默认解析时使用其支持的完整显式参数。

## 五项工程参数

```bash
yss scaffold ddd \
  --project-name sample-ddd \
  --base-package com.example.sample \
  --output-dir . \
  --group-id com.example \
  --project-version 1.0.0-SNAPSHOT

yss scaffold mvc \
  --project-name sample-mvc \
  --base-package com.example.sample \
  --output-dir . \
  --group-id com.example \
  --project-version 1.0.0-SNAPSHOT
```

当前 catalog 默认补齐组件与 Parent/BOM `4.0.0-SNAPSHOT`、Boot `4.1.2`、Java `17`，`--project-version` 是工程自身版本。

## 只选组件3.2

```bash
yss scaffold ddd \
  --project-name sample-legacy \
  --base-package com.example.legacy \
  --output-dir . \
  --group-id com.example \
  --project-version 1.0.0-SNAPSHOT \
  --yss-components-version 3.2.0-SNAPSHOT
```

匹配配方补齐 Parent `com.yss.cloud:yss-cloud-microservice:3.2.0-SNAPSHOT`、Boot `3.5.16` 和 Java `17`。MVC 使用相同参数，将子命令改为 `mvc` 并选择自己的目标工程名。

## 完整自定义组合

```bash
yss scaffold ddd \
  --project-name sample-custom \
  --base-package com.example.custom \
  --output-dir . \
  --group-id com.example \
  --project-version 1.0.0-SNAPSHOT \
  --platform-profile spring-boot-4.1-jdk17 \
  --spring-boot-version 4.1.2 \
  --java-version 17 \
  --parent-group-id com.example.platform \
  --parent-artifact-id application-parent \
  --parent-version 1.0.0 \
  --yss-components-version 4.0.0-SNAPSHOT
```

自定义 Parent 须由工程实际提供。完整输入按原值校验并保留非阻断 warnings，MVC 使用相同参数。显式值优先，缺省项仅在组合唯一时补齐；歧义按提示补参数，未知组件版本需显式补齐 Parent 等缺项。

## 安装 Backend 技能

```bash
yss init --root <新目录或空目录> --profile backend --installation skills
yss attach --root <普通已有工程> --profile backend --installation skills
```

已有受管安装通过 `setup-yss-harness` 沿用原 Profile 和范围。生成后需要构建时使用工程根 `./mvnw`，沿用工程 Maven settings。
