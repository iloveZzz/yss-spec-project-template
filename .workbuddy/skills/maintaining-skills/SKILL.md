---
name: maintaining-skills
description: Use when creating, modifying, validating, or retiring reusable Agent skills.
---

Maintain skills that provide useful task knowledge with minimal process overhead.

Edit canonical content and the references used by its callers. Keep discovery metadata precise and preserve domain constraints, user-file protection and external-action authorization.

Update the affected platform copies and distribution lists directly, following the repository's skills maintenance notes. Do not add generators, test suites, verification plans, approval packages or mandatory review steps. Use existing CLI capabilities only when they actually support the requested operation.

Report actual changes and unresolved limitations. Testing or a separate review is optional unless explicitly part of the user's request.

When changing triggers or behavior, select representative requests, neighboring non-triggers and relevant authorization counterexamples. For actual observations and their limits, read `.agents/skills/i-have-adhd/references/pr-and-retro.md` from the project root. Use existing task records or clearly labeled rehearsals; ordinary copy edits and business tasks do not need an evaluation or report first.

For authoring and invocation boundaries, read [authoring notes](references/authoring.md). In this template source repository, follow `.template-source/agents/skills-maintenance.md` for projection and source-record maintenance; installed skill use does not require that source-only file.
