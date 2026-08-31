import assert from "node:assert/strict";
import test from "node:test";
import { validateFrontmatter } from "./validate-frontmatter.mjs";

test("accepts the required skill frontmatter", () => {
  assert.equal(validateFrontmatter("---\nname: yss-design-system\ndescription: Use when validating a skill.\n---\n"), "yss-design-system");
});

test("rejects missing and unsupported frontmatter fields", () => {
  assert.throws(() => validateFrontmatter("# no frontmatter"), /Invalid SKILL/);
  assert.throws(() => validateFrontmatter("---\nname: bad\nextra: x\n---"), /Expected keys/);
});
