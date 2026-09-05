import test from "node:test";
import assert from "node:assert/strict";

import { renderProjectInstanceAgents } from "./envelope.mjs";

test("按章节边界把模板维护路由转换为项目实例说明", () => {
  const source = `# AGENTS.md

## 3. 上文

保留。

## 4. \`template-source\` 模板维护路由

这里的自然语言允许持续精简，不应参与匹配。

- 模板源命令也不应进入项目实例。

## 5. \`project-instance\` 产品研发路由

继续保留。
`;

  const result = renderProjectInstanceAgents(source);

  assert.match(result, /## 4\. `template-source` 模板维护路由\n\n当前仓库是 `project-instance`，模板维护只在上游 Harness 执行。/);
  assert.doesNotMatch(result, /这里的自然语言允许持续精简/);
  assert.match(result, /## 5\. `project-instance` 产品研发路由\n\n继续保留/);
});

test("模板维护章节边界缺失时明确失败", () => {
  assert.throws(
    () => renderProjectInstanceAgents("# AGENTS.md\n\n## 5. `project-instance` 产品研发路由\n"),
    /无法定位 AGENTS\.md 的模板维护章节边界/
  );
});
