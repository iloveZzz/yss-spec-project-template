import test from 'node:test';
import assert from 'node:assert/strict';
import { compileDefaultImplementationContract } from '../../../../scripts/lib/implementation-contract-compiler.mjs';

test('existing-project audit compiles without inventing a platform or loading an implementer as Reviewer', () => {
  const result = compileDefaultImplementationContract({ recipeIds: ['backend.spec-conformance'] });
  assert.equal(result.status, 'draft');
  assert.deepEqual([...result.required_skills].sort(), ['alibaba-java-code-style', 'yss-backend-spec-review']);
  assert.equal(result.architecture_identity, undefined);
  assert.equal(result.component_bindings, undefined);
  assert.ok(result.non_expanding_dependencies.some(row => row.skill === 'code-review' && row.type === 'review-only'));
  assert.ok(result.non_expanding_dependencies.some(row => row.skill === 'yss-implementation-contract-compiler' && row.type === 'coordination-only'));
});

test('ordinary code-style capability does not silently start full-project remediation', () => {
  const result = compileDefaultImplementationContract({ requiredCapabilities: ['quality.java-code-style'] });
  assert.deepEqual(result.required_skills, ['alibaba-java-code-style']);
  assert.equal(result.required_skills.includes('yss-backend-spec-review'), false);
});
