---
name: yss-skill-source-index-refresh
description: 后端组件源码或前端 YSS UI 文档变化后，刷新技能来源索引并核验平台线、组件摘要与引用。
---

# YSS 技能来源索引维护

本 Skill 维护后端组件与前端文档的来源索引；索引用于定位和核验，不代替组件兼容认证。只读取或排障时使用现有索引及 freshness 门禁，不因每次调用自动刷新。

## 来源定位

- 后端源码按平台线区分，信任生成路径前读取 [源码定位策略](references/source-location.md)。
- 刷新时设置 `YSS_SOURCE_ROOT_BOOT2_JAVA8` 与 `YSS_SOURCE_ROOT_BOOT3_JAVA17`，分别指向匹配平台的干净源码树；不能使用同一 checkout 或从分支名推断平台线。
- 前端 YSS UI 组件： `http://192.168.164.27:3200/components`
- 前端 YSS UI hooks： `http://192.168.164.27:3200/hooks`
- 前端 YSS UI 技能文档： `http://192.168.164.27:3200/skills`

## 刷新

源码输入与刷新范围确定后运行：

```bash
export YSS_SKILLS_ROOT="/path/to/.agents/skills"
export YSS_SOURCE_ROOT_BOOT2_JAVA8="/path/to/boot2-java8/yss-cloud-microservice"
export YSS_SOURCE_ROOT_BOOT3_JAVA17="/path/to/boot3-java17/yss-cloud-microservice"
node "$YSS_SKILLS_ROOT/yss-skill-source-index-refresh/scripts/refresh-yss-skill-index.mjs"
```

仅后端刷新时设置 `YSS_REFRESH_FRONTEND=false`，避免无关前端时间戳变化；用 `YSS_REFRESH_BACKEND_SKILLS=yss-mybatis`（多个 ID 逗号分隔）限定组件范围。所选组件仍刷新两条平台线，因此两个源码根都必须齐备。

后端输出稳定选择页 `references/source-index.md` 与两条平台生成索引；前端输出 `references/frontend-docs.md`。需要新增或调整技能到来源的映射时读取 [映射配置](references/source-map-config.md)。

所有后端组件 Skill 共用 [平台与源码门禁](references/backend-component-platform-compatibility.md)。`references/source-index.md` 是稳定选择页；真实生成索引分别为 `source-index.boot2-java8.md` 与 `source-index.boot3-java17.md`。刷新后按共享门禁确认平台线（日常路径引用当前实际工程基线，完整治理引用批准的 `platform_configuration.component_platform_line`），运行 `scripts/check-backend-skill-source-index.mjs --skill <skill-id> --platform-line <line> --source-root <matching-root>`，确认组件 tree、组件子树状态和 v2 平台信号与所选源码行一致。

脚本不复制大段源码；通用组件生成入口索引，持久化组件另生成公开 API、配置开关和能力边界矩阵，供按需定位真实源码。

## 输出合同

生成索引保留以下来源与定位信息：

- 明确的平台线、生成时间与仅作追踪的 source Git commit
- 组件相对 tree hash 与组件子树工作区状态
- 组件目录与文档文件
- Maven 模块
- 源文件 hash 与可重定位路径
- 能力敏感组件的公开签名、配置 key/默认值、启用条件与能力边界，均从源码提取
- 其他组件的关键 Java 入口，包括注解、自动配置、属性、切面、拦截器、handler、Repository、DTO 和结果类型
- local Maven lineage、精确组件 GAV，以及继承的 Java/Spring Boot、`javax`/`jakarta` 和自动配置注册信号；这些是源码观察，不是兼容认证
- 当前实现或排障需要继续读取的来源

`SKILL.md` 保留任务入口，不粘贴完整组件源码；专项任务按需读取生成索引或对应资产。

## Freshness 门禁

提供精确类名、配置或安全结论前，必须执行 [共享平台与源码门禁](references/backend-component-platform-compatibility.md)，按共享门禁确认的平台线选择索引与干净源码根。平台缺失或错配、组件 tree 漂移、子树 dirty 返回 `stale` / `blocked`，不回退另一代；历史路径提示只能定位。仅仓库 commit 不同但组件 tree 未变，不使索引过期。

## 刷新后验证

修改刷新器或完成索引刷新后，运行现有 Node 检查：

```bash
node --test "$YSS_SKILLS_ROOT/yss-skill-source-index-refresh/scripts/refresh-yss-skill-index.test.mjs"
```

`yss-validation` 只索引当前仓库实际存在的 `yss-component-validation-jsr303`。历史 EL/parser 组件路径不存在时不得生成路径提示或宣称可接入；需要该能力时返回 `blocked` 并重新确认真实组件来源。
