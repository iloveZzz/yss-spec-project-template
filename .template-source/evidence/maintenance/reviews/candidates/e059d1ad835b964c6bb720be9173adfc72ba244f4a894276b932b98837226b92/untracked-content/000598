import assert from "node:assert/strict";
import test from "node:test";
import { validateFrontmatter, validateSetupBan } from "./validate-frontmatter.mjs";

const valid = `---
name: yss-antd-design
description: Use when 原型设计。不用于前端代码落地（改用 yss-ui）、安装官方 antd skill，或替代 yss-prototype-stage。
---

# body
- 禁止 \`antd setup\`、\`npx skills add ant-design/ant-design-cli\`
`;

test("accepts the required skill frontmatter", () => {
  assert.equal(validateFrontmatter(valid), "yss-antd-design");
});

test("rejects missing exclusion branches in description", () => {
  assert.throws(
    () => validateFrontmatter("---\nname: yss-antd-design\ndescription: Use when querying antd.\n---\n"),
    /exclude frontend landing/
  );
});

test("rejects a skill that does not forbid official setup", () => {
  assert.throws(() => validateSetupBan("# no setup ban"), /forbid antd setup/);
});
