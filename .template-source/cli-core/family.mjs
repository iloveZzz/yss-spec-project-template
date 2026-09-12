import { ensure } from './io.mjs';
export const FAMILIES = Object.freeze(Object.fromEntries(['design', 'backend', 'frontend'].map(side => [side, Object.freeze({
  side,
  packageName: `create-yss-harness-${side}`,
  profileId: side === 'design' ? 'harness.business-ddd-strategy-handoff' : `harness.${side}-delivery`,
  metadataFile: `.yss-harness-${side}.json`,
  templateName: `yss-harness-${side}-agent`,
  templateSource: `github:iloveZzz/yss-harness-${side}-agent`,
})])));
export function familyFor(side) {
  ensure(Object.hasOwn(FAMILIES, side), '未知 CLI 家族', 'IDENTITY');
  return FAMILIES[side];
}
export function preserved(ref) { return ['README.md', 'CONTEXT.md', 'DESIGN.md'].includes(ref); }
export function userOwned(ref, family) {
  if (['README.md', 'DESIGN.md'].includes(ref)) return true;
  if (ref === 'CONTEXT.md') return false;
  // Only reusable governance assets are eligible for recurring ownership.
  if (family.side === 'design') return !(/^(?:\.(?:agents|claude|codex|cursor|pi|qoder|trae)\/skills\/|scripts\/|docs\/(?:agents\/|process\/|templates\/|user-guide\/|architecture\/templates\/))/.test(ref)
    || ['.gitignore', '.nvmrc', 'AGENTS.md', 'CLAUDE.md', '.cursorrules', 'skills-lock.json', 'yss-project.yaml'].includes(ref));
  return /^(?:docs\/(?:\.scratch|reviews|releases|requirements|implementation|api|adr)(?:\/|$))/.test(ref);
}
export const CHECKS = [
  ['context', 'scripts/verify-context-contract', '--root', '.', '--json'],
  ['profile', 'scripts/verify-harness-profile'],
  ['skill-lock', 'scripts/update-skill-lock', '--check'],
];
