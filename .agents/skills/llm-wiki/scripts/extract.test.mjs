import assert from "node:assert/strict";
import test from "node:test";
import { EXTRACT_KINDS, extractSkillNames } from "./extract.mjs";

test("skill-names lists shared and platform keys, sorted, without hashes", () => {
  const text = extractSkillNames({
    skills: {
      shared: {
        zeta: { effectiveHash: "aaa", skillPath: "hidden" },
        alpha: { effectiveHash: "bbb" },
      },
      platform: {
        ".codex/skills": {
          "product-design": { effectiveHash: "ccc" },
          "data-analytics": { effectiveHash: "ddd" },
        },
      },
    },
  });
  assert.match(text, /## shared/);
  assert.match(text, /## platform/);
  assert.ok(text.indexOf("`alpha`") < text.indexOf("`zeta`"));
  assert.ok(text.indexOf("`data-analytics`") < text.indexOf("`product-design`"));
  assert.doesNotMatch(text, /aaa|bbb|ccc|ddd|skillPath|effectiveHash/);
  assert.doesNotMatch(text, /"version"|canonicalRoot/);
});

test("skill-names rejects a whole-file dump of a non-object", () => {
  assert.throws(() => extractSkillNames("not-json-object"), /lock object/);
});

test("declared extract kinds stay the documented set", () => {
  assert.deepEqual([...EXTRACT_KINDS], ["skill-names", "heading-list", "prose-note"]);
});
